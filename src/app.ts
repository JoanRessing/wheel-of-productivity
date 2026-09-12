import { Task, TaskFilters } from './types.js';
import { uid } from './util.js';
import { loadState, saveState, clearStoredTasks } from './storage.js';
import { els, clearFilters, clearForm, getFilters, getSelectedDependencyIds, renderDependencyOptions, renderFilterSummary, renderTasks, announceMessage, announceResult, openModal, closeModal } from './ui.js';
import { Wheel } from './wheel.js';
import { burstConfetti } from './confetti.js';

let tasks: Task[] = sanitizeTaskDependencies(loadState().tasks);

const wheel = new Wheel(els.canvas);
const mediaReduced = matchMedia('(prefers-reduced-motion: reduce)');

function taskMatchesFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.maxTime != null && task.time != null && task.time > filters.maxTime) {
    return false;
  }

  if (!filters.includeIndoor && !filters.includeOutdoor) {
    return false;
  }

  if (task.location === 'any') {
    return filters.includeIndoor || filters.includeOutdoor;
  }

  if (task.location === 'indoor') {
    return filters.includeIndoor;
  }

  return filters.includeOutdoor;
}

function getFilteredTasks(): Task[] {
  const filters = getFilters();
  return tasks.filter((task) => taskMatchesFilters(task, filters) && getBlockingTasks(task).length === 0);
}

function getBlockingTasks(task: Task): Task[] {
  const prerequisiteIds = task.prerequisiteIds ?? [];
  if (prerequisiteIds.length === 0) return [];
  const activeTasks = new Map(tasks.map((item) => [item.id, item]));
  return prerequisiteIds.map((id) => activeTasks.get(id)).filter((item): item is Task => item != null);
}

function normalizePrerequisites(taskId: string, prerequisiteIds: readonly string[]): string[] | undefined {
  const activeIds = new Set(tasks.map((task) => task.id));
  activeIds.delete(taskId);
  const normalized = [...new Set(prerequisiteIds.filter((id) => activeIds.has(id)))];
  return normalized.length > 0 ? normalized : undefined;
}

function wouldCreateCycle(taskId: string, prerequisiteIds: readonly string[]): boolean {
  const dependencyMap = new Map<string, string[]>();
  for (const task of tasks) {
    dependencyMap.set(task.id, task.prerequisiteIds ?? []);
  }
  dependencyMap.set(taskId, [...prerequisiteIds]);

  const visited = new Set<string>();
  const stack = new Set<string>();

  function visit(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;

    visited.add(id);
    stack.add(id);
    for (const dependencyId of dependencyMap.get(id) ?? []) {
      if (visit(dependencyId)) return true;
    }
    stack.delete(id);
    return false;
  }

  return visit(taskId);
}

function sanitizeTaskDependencies(nextTasks: Task[]): Task[] {
  const ids = new Set(nextTasks.map((task) => task.id));
  return nextTasks.map((task) => {
    const prerequisiteIds = [...new Set((task.prerequisiteIds ?? []).filter((id) => id !== task.id && ids.has(id)))];
    return prerequisiteIds.length > 0 ? { ...task, prerequisiteIds } : { ...task, prerequisiteIds: undefined };
  });
}

function applyTaskPatch(id: string, patch: Partial<Task>): void {
  const current = tasks.find((task) => task.id === id);
  if (!current) return;

  const nextPatch = { ...patch };
  if ('prerequisiteIds' in patch) {
    const prerequisiteIds = normalizePrerequisites(id, patch.prerequisiteIds ?? []);
    if (wouldCreateCycle(id, prerequisiteIds ?? [])) {
      announceMessage('That dependency would create a loop, so it was not saved.');
      sync();
      return;
    }
    nextPatch.prerequisiteIds = prerequisiteIds;
  }

  tasks = sanitizeTaskDependencies(tasks.map((task) => (task.id === id ? { ...task, ...nextPatch } : task)));
  sync();
}

function sync() {
  const filteredTasks = getFilteredTasks();
  saveState({ tasks });
  renderTasks(tasks, applyTaskPatch, (id) => {
    tasks = sanitizeTaskDependencies(tasks.filter(t => t.id !== id));
    sync();
  }, getBlockingTasks);
  renderFilterSummary(filteredTasks.length, tasks.length);
  els.spinBtn.disabled = tasks.length === 0;
  wheel.draw(filteredTasks);
  renderDependencyOptions(els.dependencies, tasks);
}

function addTaskFromForm(ev: SubmitEvent) {
  ev.preventDefault();
  const name = els.name.value.trim();
  if (!name) return;
  const time = els.time.value ? Math.max(0, Math.round(Number(els.time.value))) : undefined;
  const location = (els.location.value as Task['location']) || 'any';
  const deadline = els.deadline.value || undefined;
  const prerequisiteIds = normalizePrerequisites('', getSelectedDependencyIds());
  const t: Task = { id: uid(), name, time, location, deadline, prerequisiteIds };
  tasks = [...tasks, t];
  sync();
  clearForm();
}

els.form.addEventListener('submit', addTaskFromForm);
els.resetBtn.addEventListener('click', () => {
  if (confirm('Clear all saved tasks from this browser?')) {
    clearStoredTasks();
    tasks = [];
    sync();
  }
});

els.spinBtn.addEventListener('click', async () => {
  const filteredTasks = getFilteredTasks();
  if (filteredTasks.length === 0) {
    announceMessage(tasks.length === 0 ? 'Add a task before spinning.' : 'No tasks are rollable right now. Try allowing more time or locations, or finish a prerequisite task.');
    return;
  }
  const prefers = mediaReduced.matches;
  await wheel.spin(filteredTasks, (idx) => {
    const t = filteredTasks[idx];
    if (t) announceResult(t.name);
    // Confetti bursts around the chosen segment
    const confettiCanvas = document.getElementById('confetti') as HTMLCanvasElement | null;
    if (confettiCanvas) {
      const geom = wheel.getGeometry();
      const wheelRect = els.canvas.getBoundingClientRect();
      const scaleX = wheelRect.width / els.canvas.width;
      const scaleY = wheelRect.height / els.canvas.height;
      const toViewport = (x: number, y: number): { x: number; y: number } => ({
        x: wheelRect.left + x * scaleX,
        y: wheelRect.top + y * scaleY,
      });
      const n = Math.max(filteredTasks.length, 1);
      const anglePer = (Math.PI * 2) / n;
      // Compute edges of the selected partition on the rim and burst outward from those edges
      const base = -Math.PI / 2; // top
      const start = base - anglePer / 2;
      const end = base + anglePer / 2;
      const rOuter = geom.radius + 2; // right at edge
      const rOuter2 = geom.radius + 14; // slightly outside
      // Edge points
      const xStart = geom.cx + Math.cos(start) * rOuter;
      const yStart = geom.cy + Math.sin(start) * rOuter;
      const xEnd = geom.cx + Math.cos(end) * rOuter;
      const yEnd = geom.cy + Math.sin(end) * rOuter;
      // Midpoint slightly outside for central burst
      const xMid = geom.cx + Math.cos(base) * rOuter2;
      const yMid = geom.cy + Math.sin(base) * rOuter2;
      const startPoint = toViewport(xStart, yStart);
      const midPoint = toViewport(xMid, yMid);
      const endPoint = toViewport(xEnd, yEnd);
      burstConfetti(confettiCanvas, prefers, [
        { ...startPoint, dir: start },
        { ...midPoint, dir: base },
        { ...endPoint, dir: end },
      ]);
    }
  }, prefers);
});

els.filterTime.addEventListener('input', sync);
els.filterIndoor.addEventListener('change', sync);
els.filterOutdoor.addEventListener('change', sync);
els.clearFilters.addEventListener('click', () => {
  clearFilters();
  sync();
});

// Keyboard accessibility: Space/Enter on spin button triggers click
els.spinBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.spinBtn.click();
  }
});

// Initial render
sync();

(window as Window & typeof globalThis & { __appLoaded?: boolean }).__appLoaded = true;

// Drawer and modal interactions
if (els.drawerToggle) {
  els.drawerToggle.addEventListener('click', () => {
    const isOpen = els.drawer.classList.toggle('open');
    els.drawerToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (els.drawerOverlay) els.drawerOverlay.hidden = !isOpen;
  });
}

if (els.drawerClose) {
  els.drawerClose.addEventListener('click', () => {
    els.drawer.classList.remove('open');
    els.drawerToggle.setAttribute('aria-expanded', 'false');
    els.drawerToggle.focus();
    if (els.drawerOverlay) els.drawerOverlay.hidden = true;
  });
}

if (els.drawerOverlay) {
  els.drawerOverlay.addEventListener('click', () => {
    els.drawer.classList.remove('open');
    els.drawerToggle.setAttribute('aria-expanded', 'false');
    els.drawerToggle.focus();
    els.drawerOverlay.hidden = true;
  });
}

if (els.openAddTask) {
  els.openAddTask.addEventListener('click', () => openModal());
}
if (els.closeModal) {
  els.closeModal.addEventListener('click', () => closeModal());
}
if (els.overlay) {
  els.overlay.addEventListener('click', () => closeModal());
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modal.hidden) closeModal();
});
