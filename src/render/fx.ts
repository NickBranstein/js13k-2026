// Shared combat-feedback helpers: timed animation offsets/progress (pure,
// no canvas) plus a small impact-burst effect used on hit.

// Returns a lunge-style offset (0 -> magnitude -> 0) over [start, start+duration],
// or 0 if the animation hasn't started, has finished, or isn't active.
export function animOffset(start: number | null, now: number, duration: number, magnitude: number): number {
  if (start === null) return 0;
  const p = (now - start) / duration;
  if (p < 0 || p > 1) return 0;
  return Math.sin(p * Math.PI) * magnitude;
}

// Returns 0..1 progress through the animation window, or null if inactive.
export function animProgress(start: number | null, now: number, duration: number): number | null {
  if (start === null) return null;
  const p = (now - start) / duration;
  if (p < 0 || p > 1) return null;
  return p;
}

export function drawImpactBurst(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number): void {
  const alpha = 1 - progress;
  const r = 22 + progress * 60;

  ctx.save();

  // bright core flash, strongest right at impact and fading fast
  const flashAlpha = Math.max(0, 1 - progress * 2.2);
  if (flashAlpha > 0) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 0.9);
    glow.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
    glow.addColorStop(0.5, `rgba(255,140,90,${flashAlpha * 0.6})`);
    glow.addColorStop(1, 'rgba(255,140,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // radiating impact lines, warm/high-contrast against the pastel backdrop
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ff5a3c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}
