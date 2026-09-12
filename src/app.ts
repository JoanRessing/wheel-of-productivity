import { Task } from './types.js';
import { uid } from './util.js';
import { loadState, saveState, getOrCreateSessionId, clearSession } from './storage.js';
import { els, clearForm, renderTasks, announceResult, openModal, closeModal } from './ui.js';
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
    // Confetti bursts around the chosen segment
    const confettiCanvas = document.getElementById('confetti') as HTMLCanvasElement | null;
    if (confettiCanvas) {
      const geom = wheel.getGeometry();
      const n = Math.max(tasks.length, 1);
      const anglePer = (Math.PI * 2) / n;
      // Compute the mid-angle of selected segment now under the indicator: top is -PI/2
      // Convert to Cartesian point slightly outside the wheel rim
      const mid = -Math.PI / 2; // at the indicator
      const r = geom.radius + 12; // just outside the rim
      const xMid = geom.cx + Math.cos(mid) * r;
      const yMid = geom.cy + Math.sin(mid) * r;
      // Place two side bursts offset by +/- 20 degrees
      const off = 20 * Math.PI / 180;
      const xL = geom.cx + Math.cos(mid - off) * r;
      const yL = geom.cy + Math.sin(mid - off) * r;
      const xR = geom.cx + Math.cos(mid + off) * r;
      const yR = geom.cy + Math.sin(mid + off) * r;
      burstConfetti(confettiCanvas, prefers, [ { x: xL, y: yL }, { x: xMid, y: yMid }, { x: xR, y: yR } ]);
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

// Drawer and modal interactions
if (els.drawerToggle) {
  els.drawerToggle.addEventListener('click', () => {
    const isOpen = els.drawer.classList.toggle('open');
    els.drawerToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
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
