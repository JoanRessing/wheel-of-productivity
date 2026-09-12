// Prebuilt minimal runtime to allow opening index.html without compilation.
// This file is generated from src/*.ts; the version here is kept in sync manually.
import { getOrCreateSessionId, loadState, saveState, clearSession } from './storage.js';
import { uid } from './util.js';
import { els, clearForm, renderTasks, announceResult, openModal, closeModal } from './ui.js';
import { Wheel } from './wheel.js';
import { burstConfetti } from './confetti.js';

getOrCreateSessionId();
let tasks = loadState().tasks;
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
function addTaskFromForm(ev) {
  ev.preventDefault();
  const name = els.name.value.trim();
  if (!name) return;
  const time = els.time.value ? Math.max(0, Math.round(Number(els.time.value))) : undefined;
  const location = els.location.value || 'any';
  const deadline = els.deadline.value || undefined;
  const t = { id: uid(), name, time, location, deadline };
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
    const confettiCanvas = document.getElementById('confetti');
    if (confettiCanvas) {
      const geom = wheel.getGeometry();
      const n = Math.max(tasks.length, 1);
      const anglePer = (Math.PI * 2) / n;
      const mid = -Math.PI / 2;
      const r = geom.radius + 12;
      const xMid = geom.cx + Math.cos(mid) * r;
      const yMid = geom.cy + Math.sin(mid) * r;
      const off = 20 * Math.PI / 180;
      const xL = geom.cx + Math.cos(mid - off) * r;
      const yL = geom.cy + Math.sin(mid - off) * r;
      const xR = geom.cx + Math.cos(mid + off) * r;
      const yR = geom.cy + Math.sin(mid + off) * r;
      burstConfetti(confettiCanvas, prefers, [{ x: xL, y: yL }, { x: xMid, y: yMid }, { x: xR, y: yR }]);
    }
  }, prefers);
});
els.spinBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.spinBtn.click();
  }
});
sync();
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
