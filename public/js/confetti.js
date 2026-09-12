export function burstConfetti(canvas, prefersReducedMotion, bursts) {
  if (prefersReducedMotion) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const COLORS = ['#22d3ee', '#f59e0b', '#34d399', '#a78bfa', '#f472b6', '#f43f5e', '#60a5fa'];
  const pieces = [];
  for (const b of bursts) {
    for (let i = 0; i < 60; i++) {
      pieces.push({
        x: b.x,
        y: b.y,
        vx: (Math.cos((b.dir ?? -Math.PI / 2)) * (2 + Math.random() * 2)) + (Math.random() - 0.5) * 2.5,
        vy: (Math.sin((b.dir ?? -Math.PI / 2)) * (2 + Math.random() * 2)) + (Math.random() - 0.5) * 2.5,
        w: 6 + Math.random() * 4,
        h: 10 + Math.random() * 6,
        r: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.5,
        color: COLORS[i % COLORS.length],
        life: 1,
      });
    }
  }
  const start = performance.now();
  const duration = 1800;
  (function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = 0.16;
    for (const p of pieces) {
      p.vy += g;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life = 1 - t;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color + Math.floor(255 * p.life).toString(16).padStart(2, '0');
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })(start);
}
