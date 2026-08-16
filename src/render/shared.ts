// Drawing helpers and color constants shared across the unicorn, monster,
// event, and UI renderers — pulled out into their own module so they have
// one home instead of being re-exported piecemeal through whichever file
// happened to define them first.

export const INK_OUTLINE = '#241a38';
export const TEXT_COLOR = '#f4ecff';
export const GOLD_TEXT = '#4a2f1f';
export const PANEL_BORDER = 'rgba(255,240,250,0.85)';

// Rainbow Nectar / Comet Shard color pool, reused elsewhere for decorative
// sparkles. These literals preserve the exact former runtime-generated colors.
export const PATTERN_COLORS = ['#ff9ecb', '#ffd28a', '#9effc5', '#9ecfff', '#c39eff', '#fff59e', '#c0ff9e'];

export function fillStroke(ctx: CanvasRenderingContext2D, fill: string, outline: string = INK_OUTLINE, width = 4): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// Defaults match monster.ts's 9 call sites exactly (all just pass r). rx is
// the first override because event.ts is the only other caller that changes
// one shadow dimension; unicorn.ts supplies the remaining geometry explicitly.
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  r: number,
  rx = r * 0.8,
  cx = 0,
  cy = r * 0.95,
  ry = r * 0.22,
  color = 'rgba(20,10,10,0.18)'
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
