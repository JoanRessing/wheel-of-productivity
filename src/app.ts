import { Task } from './types.js';
import { uid } from './util.js';
import { loadState, saveState, clearStoredTasks } from './storage.js';
import { els, clearForm, renderTasks, announceResult, openModal, closeModal } from './ui.js';
import { Wheel } from './wheel.js';
import { burstConfetti } from './confetti.js';

let tasks: Task[] = loadState().tasks;

const wheel = new Wheel(els.canvas);
const mediaReduced = matchMedia('(prefers-reduced-motion: reduce)');

function sync() {
  saveState({ tasks });
  renderTasks(tasks, (id, patch) => {
    tasks = tasks.map(t => (t.id === id ? { ...t, ...patch } : t));
    sync();
    wheel.draw(tasks);
  }, (id) => {
    tasks = tasks.filter(t => t.id !== id);
    sync();
    wheel.draw(tasks);
  });
  els.spinBtn.disabled = tasks.length === 0;
  wheel.draw(tasks);
}

function addTaskFromForm(ev: SubmitEvent) {
  ev.preventDefault();
  const name = els.name.value.trim();
  if (!name) return;
  const time = els.time.value ? Math.max(0, Math.round(Number(els.time.value))) : undefined;
  const location = (els.location.value as Task['location']) || 'any';
  const deadline = els.deadline.value || undefined;
  const t: Task = { id: uid(), name, time, location, deadline };
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
  if (tasks.length === 0) return;
  const prefers = mediaReduced.matches;
  await wheel.spin(tasks, (idx) => {
    const t = tasks[idx];
    if (t) announceResult(t.name);
    // Confetti bursts around the chosen segment
    const confettiCanvas = document.getElementById('confetti') as HTMLCanvasElement | null;
    if (confettiCanvas) {
      const geom = wheel.getGeometry();
      const n = Math.max(tasks.length, 1);
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
      burstConfetti(confettiCanvas, prefers, [
        { x: xStart, y: yStart, dir: start },
        { x: xMid, y: yMid, dir: base },
        { x: xEnd, y: yEnd, dir: end },
      ]);
    }
  }, prefers);
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
