import { Task, WheelState } from './types.js';
import { easeOutCubic } from './util.js';

export class Wheel {
  private ctx: CanvasRenderingContext2D;
  private radius: number;
  private state: WheelState = { angle: 0, spinning: false };
  private colors: string[] = ['#22d3ee', '#f59e0b', '#34d399', '#a78bfa', '#f472b6', '#f43f5e', '#60a5fa'];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.radius = Math.min(canvas.width, canvas.height) / 2 - 8;
    this.draw([]);
  }

  draw(tasks: Task[], highlightIndex: number | null = null) {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const n = Math.max(tasks.length, 1);
    const anglePer = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const start = this.state.angle + i * anglePer;
      const end = start + anglePer;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, this.radius, start, end);
      ctx.closePath();
      const color = this.colors[i % this.colors.length];
      ctx.fillStyle = color + (highlightIndex === i ? 'cc' : '88');
      ctx.fill();

      // Labels
      if (tasks[i]) {
        const mid = start + anglePer / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0b1220';
        ctx.font = 'bold 14px system-ui';
        const label = tasks[i].name.length > 22 ? tasks[i].name.slice(0, 21) + '…' : tasks[i].name;
        ctx.fillText(label, this.radius - 12, 4);
        ctx.restore();
      }
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1220';
    ctx.fill();
  }

  async spin(tasks: Task[], onSelected: (index: number) => void, prefersReducedMotion: boolean): Promise<void> {
    if (this.state.spinning || tasks.length === 0) return;
    this.state.spinning = true;

    const n = tasks.length;
    const anglePer = (Math.PI * 2) / n;
    const selected = Math.floor(Math.random() * n);

    // We want the selected segment to end up under the indicator at the top (angle = -PI/2)
    const targetAngleForSelectedMid = -Math.PI / 2; // top center
    const currentSelectedMid = this.state.angle + selected * anglePer + anglePer / 2;
    let delta = targetAngleForSelectedMid - currentSelectedMid;

    // Add some extra full rotations for flair
    const extraTurns = prefersReducedMotion ? 0 : 3 + Math.random() * 2; // 3-5 turns
    delta += extraTurns * Math.PI * 2;

    const duration = prefersReducedMotion ? 350 : 3400; // ms (a touch longer)
    const startAngle = this.state.angle;
    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(t);
        this.state.angle = startAngle + delta * eased;
        this.draw(tasks);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.state.spinning = false;
          // Normalize angle to [0, 2PI)
          this.state.angle = ((this.state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          // Compute which index actually sits under the indicator at the top
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
