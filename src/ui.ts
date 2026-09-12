import { Task } from './types.js';

export const els = {
  form: document.getElementById('task-form') as HTMLFormElement,
  name: document.getElementById('task-name') as HTMLInputElement,
  time: document.getElementById('task-time') as HTMLInputElement,
  location: document.getElementById('task-location') as HTMLSelectElement,
  deadline: document.getElementById('task-deadline') as HTMLInputElement,
  addBtn: document.getElementById('add-task') as HTMLButtonElement,
  resetBtn: document.getElementById('reset-session') as HTMLButtonElement,
  list: document.getElementById('task-list') as HTMLUListElement,
  count: document.getElementById('task-count') as HTMLElement,
  spinBtn: document.getElementById('spin') as HTMLButtonElement,
  result: document.getElementById('result') as HTMLElement,
  canvas: document.getElementById('wheel') as HTMLCanvasElement,
};

export function clearForm() {
  els.name.value = '';
  els.time.value = '';
  els.location.value = 'any';
  els.deadline.value = '';
  els.name.focus();
}

export function renderTasks(tasks: Task[], onEdit: (id: string, patch: Partial<Task>) => void, onDelete: (id: string) => void) {
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
    meta.textContent = parts.join(' • ');

    const left = document.createElement('div');
    left.append(name, meta);

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

export function announceResult(name: string) {
  els.result.textContent = `Selected: ${name}`;
}
