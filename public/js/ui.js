export const els = {
  form: document.getElementById('task-form'),
  name: document.getElementById('task-name'),
  time: document.getElementById('task-time'),
  location: document.getElementById('task-location'),
  deadline: document.getElementById('task-deadline'),
  addBtn: document.getElementById('add-task'),
  resetBtn: document.getElementById('reset-session'),
  list: document.getElementById('task-list'),
  count: document.getElementById('task-count'),
  spinBtn: document.getElementById('spin'),
  result: document.getElementById('result'),
  canvas: document.getElementById('wheel'),
};
export function clearForm() {
  els.name.value = '';
  els.time.value = '';
  els.location.value = 'any';
  els.deadline.value = '';
  els.name.focus();
}
export function renderTasks(tasks, onEdit, onDelete) {
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
    const parts = [];
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
export function announceResult(name) {
  els.result.textContent = `Selected: ${name}`;
}
