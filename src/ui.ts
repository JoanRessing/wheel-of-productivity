import { Task, TaskFilters } from './types.js';

export const els = {
  form: document.getElementById('task-form') as HTMLFormElement,
  name: document.getElementById('task-name') as HTMLInputElement,
  time: document.getElementById('task-time') as HTMLInputElement,
  location: document.getElementById('task-location') as HTMLSelectElement,
  deadline: document.getElementById('task-deadline') as HTMLInputElement,
  addBtn: document.getElementById('add-task') as HTMLButtonElement,
  resetBtn: document.getElementById('reset-session') as HTMLButtonElement,
  drawerToggle: document.getElementById('drawer-toggle') as HTMLButtonElement,
  drawer: document.getElementById('drawer') as HTMLElement,
  drawerOverlay: document.getElementById('drawer-overlay') as HTMLElement,
  drawerClose: document.getElementById('drawer-close') as HTMLButtonElement,
  openAddTask: document.getElementById('open-add-task') as HTMLButtonElement,
  modal: document.getElementById('task-modal') as HTMLElement,
  overlay: document.getElementById('modal-overlay') as HTMLElement,
  closeModal: document.getElementById('close-task-modal') as HTMLButtonElement,
  list: document.getElementById('task-list') as HTMLUListElement,
  count: document.getElementById('task-count') as HTMLElement,
  spinBtn: document.getElementById('spin') as HTMLButtonElement,
  result: document.getElementById('result') as HTMLElement,
  canvas: document.getElementById('wheel') as HTMLCanvasElement,
  filterTime: document.getElementById('filter-time') as HTMLInputElement,
  filterIndoor: document.getElementById('filter-indoor') as HTMLInputElement,
  filterOutdoor: document.getElementById('filter-outdoor') as HTMLInputElement,
  clearFilters: document.getElementById('clear-filters') as HTMLButtonElement,
  filterSummary: document.getElementById('filter-summary') as HTMLElement,
  dependencies: document.getElementById('task-dependencies') as HTMLElement,
};

export function clearForm() {
  els.name.value = '';
  els.time.value = '';
  els.location.value = 'any';
  els.deadline.value = '';
  clearDependencySelections(els.dependencies);
  els.name.focus();
}

export function renderTasks(
  tasks: Task[],
  onEdit: (id: string, patch: Partial<Task>) => void,
  onDelete: (id: string) => void,
  getBlockedBy: (task: Task) => Task[],
) {
  els.list.innerHTML = '';
  els.count.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
  for (const t of tasks) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = t.id;

    const name = document.createElement('input');
    name.type = 'text';
    name.value = t.name;
    name.maxLength = 120;
    name.addEventListener('change', () => onEdit(t.id, { name: name.value.trim() || t.name }));

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const parts: string[] = [];
    if (t.time != null) parts.push(`${t.time}m`);
    parts.push(t.location);
    if (t.deadline) parts.push(`due ${t.deadline}`);
    const blockers = getBlockedBy(t);
    if (blockers.length > 0) parts.push(`blocked by ${blockers.map((task) => task.name).join(', ')}`);
    meta.textContent = parts.join(' • ');

    const left = document.createElement('div');
    const dependencyDetails = document.createElement('details');
    dependencyDetails.className = 'dependency-editor';

    const dependencySummary = document.createElement('summary');
    dependencySummary.textContent = 'Dependencies';

    const dependencyOptions = document.createElement('div');
    dependencyOptions.className = 'dependency-options';
    renderDependencyOptions(dependencyOptions, tasks, t.prerequisiteIds ?? [], t.id, () => {
      onEdit(t.id, { prerequisiteIds: getSelectedDependencyIds(dependencyOptions) });
    });

    dependencyDetails.append(dependencySummary, dependencyOptions);
    left.append(name, meta, dependencyDetails);

    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.type = 'button';
    del.title = 'Delete task';
    del.textContent = 'Delete';
    del.addEventListener('click', () => onDelete(t.id));

    const right = document.createElement('div');
    right.className = 'task-actions';
    right.append(del);

    li.append(left, right);
    els.list.append(li);
  }
}

export function getSelectedDependencyIds(container: HTMLElement = els.dependencies): string[] {
  const checked = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'));
  return checked.map((input) => input.value);
}

export function clearDependencySelections(container: HTMLElement = els.dependencies): void {
  for (const input of Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) {
    input.checked = false;
  }
}

export function renderDependencyOptions(
  container: HTMLElement,
  tasks: Task[],
  selectedIds: readonly string[] = [],
  excludedTaskId?: string,
  onChange?: () => void,
): void {
  container.innerHTML = '';
  const candidates = tasks.filter((task) => task.id !== excludedTaskId);
  if (candidates.length === 0) {
    container.textContent = excludedTaskId ? 'No other tasks available.' : 'No existing tasks to depend on yet.';
    container.classList.add('muted');
    return;
  }

  container.classList.remove('muted');
  const selected = new Set(selectedIds);
  for (const task of candidates) {
    const label = document.createElement('label');
    label.className = 'check-option dependency-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = task.id;
    input.checked = selected.has(task.id);
    if (onChange) input.addEventListener('change', onChange);

    const text = document.createElement('span');
    text.textContent = task.name;

    label.append(input, text);
    container.append(label);
  }
}

export function getFilters(): TaskFilters {
  const rawTime = Number(els.filterTime.value);
  const maxTime = els.filterTime.value && Number.isFinite(rawTime)
    ? Math.max(0, Math.round(rawTime))
    : undefined;
  return {
    maxTime,
    includeIndoor: els.filterIndoor.checked,
    includeOutdoor: els.filterOutdoor.checked,
  };
}

export function clearFilters(): void {
  els.filterTime.value = '';
  els.filterIndoor.checked = true;
  els.filterOutdoor.checked = true;
}

export function renderFilterSummary(matching: number, total: number): void {
  if (total === 0) {
    els.filterSummary.textContent = 'Add tasks to start building your wheel.';
    return;
  }
  const taskLabel = matching === 1 ? 'task is' : 'tasks are';
  els.filterSummary.textContent = `${matching} of ${total} ${taskLabel} rollable with the current filters and dependencies.`;
}

export function announceResult(name: string) {
  els.result.textContent = `Selected: ${name}`;
}

export function announceMessage(message: string): void {
  els.result.textContent = message;
}

export function openModal() {
  els.overlay.hidden = false;
  els.modal.hidden = false;
  els.name.focus();
}

export function closeModal() {
  els.overlay.hidden = true;
  els.modal.hidden = true;
}
