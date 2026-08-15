// Drawing helpers and color constants shared across the unicorn, monster,
// event, and UI renderers — pulled out into their own module so they have
// one home instead of being re-exported piecemeal through whichever file
// happened to define them first.

export const INK_OUTLINE = '#241a38';
export const TEXT_COLOR = '#f4ecff';
export const GOLD_TEXT = '#4a2f1f';
export const PANEL_BORDER = 'rgba(255,240,250,0.85)';

// Shared by every procedurally-generated color pool (unicorn coats/manes,
// monster palettes) so each new pool that reuses it costs nothing extra —
// the derivation code is only paid for once.
export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Rainbow Nectar / Comet Shard color pool, and reused elsewhere as a generic
// decorative sparkle palette (treasure chest, title screen). All 100%
// saturation, near-constant lightness (81, one outlier at 77) — hues/
// lightness reverse-engineered from the original hex, then generated via
// hslToHex rather than stored as hex. The 7th entry (hue 99, a green filling
// the widest gap in the other six hues' spread) replaces what used to be a
// fixed white literal, so every entry is generated rather than hardcoded.
const PATTERN_HSL: [number, number][] = [
  [332, 81],
  [37, 77],
  [144, 81],
  [210, 81],
  [263, 81],
  [54, 81],
  [99, 81],
];
export const PATTERN_COLORS = PATTERN_HSL.map(([h, l]) => hslToHex(h, 100, l));

// Same hue pool reused elsewhere (e.g. unicorn eye colors) at a different
// saturation/lightness — one shared set of accent hues rendered through
// whichever "lens" a given use needs, instead of a second hardcoded list.
export const ACCENT_HUES = PATTERN_HSL.map(([h]) => h);

// path, if given, fills/strokes a Path2D instead of the current path — lets
// a caller build a path once and reuse it (e.g. also as a clip region)
// instead of redrawing the same curves a second time.
export function fillStroke(ctx: CanvasRenderingContext2D, fill: string, outline: string = INK_OUTLINE, width = 4, path?: Path2D): void {
  ctx.fillStyle = fill;
  path ? ctx.fill(path) : ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path ? ctx.stroke(path) : ctx.stroke();
}

// Defaults match monster.ts's 9 call sites exactly (all just pass r), so
// only unicorn.ts's one differently-shaped call needs to override anything.
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  r: number,
  cx = 0,
  cy = r * 0.95,
  rx = r * 0.8,
  ry = r * 0.22,
  color = 'rgba(20,10,10,0.18)'
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
