import { easeOutCubic } from './util.js';
export class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = { angle: 0, spinning: false };
    this.colors = [
        '#ff3b3b',
        '#ff7a00',
        '#ffd400',
        '#26e5ff',
        '#00d084',
        '#a64dff',
        '#ff4d94',
    ];
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.radius = Math.min(canvas.width, canvas.height) / 2 - 8;
    this.draw([]);
  }
  draw(tasks, highlightIndex = null) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const n = Math.max(tasks.length, 1);
    const anglePer = (Math.PI * 2) / n;
    const fontSize = n <= 6 ? 18 : n <= 10 ? 14 : 12;
    for (let i = 0; i < n; i++) {
      const start = this.state.angle + i * anglePer;
      const end = start + anglePer;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, this.radius, start, end);
      ctx.closePath();
      const color = this.colors[i % this.colors.length];
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (tasks[i]) {
        const mid = start + anglePer / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);
        ctx.textAlign = 'right';
        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 2;
        const label = tasks[i].name.length > 22 ? tasks[i].name.slice(0, 21) + '…' : tasks[i].name;
        ctx.fillText(label, this.radius - 10, 5);
        ctx.restore();
      }
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1220';
    ctx.fill();
  }
  getGeometry() {
    const { canvas } = this;
    return {
      cx: canvas.width / 2,
      cy: canvas.height / 2,
      radius: this.radius,
      canvas,
    };
  }
  async spin(tasks, onSelected, prefersReducedMotion) {
    if (this.state.spinning || tasks.length === 0) return;
    this.state.spinning = true;
    const n = tasks.length;
    const anglePer = (Math.PI * 2) / n;
    const selected = Math.floor(Math.random() * n);
    const targetAngleForSelectedMid = -Math.PI / 2;
    const currentSelectedMid = this.state.angle + selected * anglePer + anglePer / 2;
    let delta = targetAngleForSelectedMid - currentSelectedMid;
    const extraTurns = prefersReducedMotion ? 0 : 3 + Math.random() * 2;
    delta += extraTurns * Math.PI * 2;
    const duration = prefersReducedMotion ? 350 : 3400;
    const startAngle = this.state.angle;
    const startTime = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(t);
        this.state.angle = startAngle + delta * eased;
        this.draw(tasks);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.state.spinning = false;
          this.state.angle = ((this.state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const theta = ((-Math.PI / 2 - this.state.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          const indexAtTop = Math.floor(theta / anglePer) % n;
          this.draw(tasks, indexAtTop);
          onSelected(indexAtTop);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }
}
