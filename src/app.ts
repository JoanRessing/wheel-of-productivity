import { Task } from './types.js';
import { uid } from './util.js';
import { loadState, saveState, getOrCreateSessionId, clearSession } from './storage.js';
import { els, clearForm, renderTasks, announceResult } from './ui.js';
import { Wheel } from './wheel.js';
import { burstConfetti } from './confetti.js';

// Ensure session id cookie exists
getOrCreateSessionId();

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
  if (confirm('Reset session and clear all tasks?')) {
    clearSession();
    tasks = [];
    getOrCreateSessionId();
    sync();
  }
});

els.spinBtn.addEventListener('click', async () => {
  if (tasks.length === 0) return;
  const prefers = mediaReduced.matches;
  await wheel.spin(tasks, (idx) => {
    const t = tasks[idx];
    if (t) announceResult(t.name);
    // Confetti burst on result
    const confettiCanvas = document.getElementById('confetti') as HTMLCanvasElement | null;
    if (confettiCanvas) burstConfetti(confettiCanvas, prefers);
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
