// Treasure/trap room visuals — drawn where the monster sprite would otherwise
// sit, so non-combat floors still have something to look at.

import { INK_OUTLINE as OUTLINE, drawGroundShadow } from './shared';

// main.ts positions both event sprites at the canvas origin and brackets each
// call with save/restore, so these terminal renderers can draw in caller space.
export function drawTreasureChest(ctx: CanvasRenderingContext2D, t: number): void {
  const r = 44;
  const lidOpen = 0.35 + Math.sin(t / 600) * 0.05;

  drawGroundShadow(ctx, r, r * 0.85);

  // chest base
  ctx.fillStyle = '#8a5537';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-r, -r * 0.1, r * 2, r * 0.85, 8);
  ctx.fill();
  ctx.stroke();

  // gold trim bands
  ctx.strokeStyle = '#e0b45c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.32);
  ctx.lineTo(r, r * 0.32);
  ctx.stroke();

  // lid (hinged open at the back-top)
  ctx.save();
  ctx.translate(0, -r * 0.1);
  ctx.rotate(-lidOpen);
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(-r, -r * 0.9, 0, -r * 0.95);
  ctx.quadraticCurveTo(r, -r * 0.9, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#a3663f';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // glow spilling from the open chest
  const glow = ctx.createRadialGradient(0, -r * 0.15, 2, 0, -r * 0.15, r * 0.9);
  glow.addColorStop(0, 'rgba(255,245,190,0.9)');
  glow.addColorStop(1, 'rgba(255,245,190,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -r * 0.15, r * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // gold latch/lock
  ctx.fillStyle = '#e0b45c';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-r * 0.14, r * 0.18, r * 0.28, r * 0.24, 4);
  ctx.fill();
  ctx.stroke();
}

export function drawTrapFloor(ctx: CanvasRenderingContext2D, t: number): void {
  const r = 48;
  const pulse = 0.5 + Math.sin(t / 260) * 0.5;

  drawGroundShadow(ctx, r, r * 0.85);

  // stone floor plate
  ctx.fillStyle = '#5c5560';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.5, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // warning glow ring
  ctx.strokeStyle = `rgba(224,87,95,${0.3 + pulse * 0.4})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.5, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  // spikes, alternating heights, glinting
  const spikeCount = 7;
  for (let i = 0; i < spikeCount; i++) {
    const sx = (i / (spikeCount - 1) - 0.5) * r * 1.7;
    const tall = i % 2 === 0;
    const h = (tall ? 1 : 0.65) * r * (0.9 + pulse * 0.08);
    const baseY = r * 0.5;

    ctx.beginPath();
    ctx.moveTo(sx - r * 0.09, baseY);
    ctx.lineTo(sx, baseY - h);
    ctx.lineTo(sx + r * 0.09, baseY);
    ctx.closePath();
    ctx.fillStyle = '#8a8a94';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // glinting tip
    ctx.fillStyle = `rgba(255,236,236,${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(sx, baseY - h, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
