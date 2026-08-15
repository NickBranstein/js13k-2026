// Procedural flat-2D-sprite unicorn renderer.
// Rebuilt from scratch around a recognizable equine side-profile silhouette.
// The original trait model, palettes, seeded randomness, animation, mane/tail,
// and horn concepts are retained as the template for the new renderer.

import { mulberry32, pick } from '../game/rng';
import { INK_OUTLINE, PATTERN_COLORS, ACCENT_HUES, fillStroke, drawGroundShadow, hslToHex } from './shared';

export interface Coat {
  name: string;
  hue: number;
  lightSat: number;
  lightL: number;
  darkSat: number;
  darkL: number;
}

export interface ManeMood {
  name: string;
  hue: number;
  step: number;
  sat: number;
  light: number;
  count: number;
}

export interface UnicornTraits {
  seed: number;
  coat: Coat;
  style: string;
  strandCount: number;
  hornPalette: string[];
  pattern: string;
  patternColor: string;
  eye: string;
  maneStops: string[];
  maneSeed: number;
  glowColor: string;
  glowCount: number;
  glowShape: string;
}

// ---------- curated palettes ----------
// hue/lightSat/lightL/darkSat/darkL reverse-engineered from the original
// hand-picked hex pairs (same hue for both, saturation/lightness varying) so
// the generated colors land as close to the original look as an HSL formula
// can get — light and dark are derived via hslToHex() at shade-set time
// instead of being stored as hex strings.
export const COATS: Coat[] = [
  { name: 'Lavender Cream', hue: 265, lightSat: 100, lightL: 96, darkSat: 75, darkL: 80 },
  { name: 'Buttercream', hue: 42, lightSat: 100, lightL: 94, darkSat: 77, darkL: 74 },
  { name: 'Blush Coral', hue: 347, lightSat: 100, lightL: 96, darkSat: 76, darkL: 80 },
  { name: 'Seafoam Mint', hue: 154, lightSat: 100, lightL: 95, darkSat: 51, darkL: 72 },
  { name: 'Periwinkle', hue: 225, lightSat: 100, lightL: 96, darkSat: 75, darkL: 80 },
  { name: 'Peach Sorbet', hue: 27, lightSat: 100, lightL: 95, darkSat: 81, darkL: 75 },
  { name: 'Iris Violet', hue: 267, lightSat: 100, lightL: 96, darkSat: 56, darkL: 66 },
  { name: 'Moonlight Grey', hue: 254, lightSat: 56, lightL: 96, darkSat: 26, darkL: 75 },
];

// Base palettes only — rollManeStops() combines two random ones together at
// roll time for much more effective variety than a fixed catalog would give.
// Each mood is 4 numbers, not a hex list — moodStops() walks hue in `step`
// increments from `hue` at fixed saturation/lightness, so the palette is
// genuinely generated from a formula (see hslToHex below) rather than
// picked from a table of pre-computed colors.
export const MANE_MOODS: ManeMood[] = [
  { name: 'Pastel Rainbow', hue: 340, step: 55, sat: 85, light: 80, count: 6 },
  { name: 'Jewel Rainbow', hue: 350, step: 60, sat: 80, light: 55, count: 5 },
  { name: 'Sunset Rainbow', hue: 355, step: 12, sat: 85, light: 65, count: 5 },
  { name: 'Aurora Rainbow', hue: 160, step: 28, sat: 75, light: 65, count: 6 },
  { name: 'Ember Glow', hue: 10, step: -75, sat: 95, light: 48, count: 3 },
];

export function moodStops(m: ManeMood): string[] {
  const out: string[] = [];
  for (let i = 0; i < m.count; i++) out.push(hslToHex(m.hue + i * m.step, m.sat, m.light));
  return out;
}

export const MANE_STYLES = ['Flowing', 'Curly', 'Braided', 'Wispy'];

// Rainbow Nectar paints a coat pattern over the body barrel, colored from
// this pool — '' means no pattern (the default for a freshly-generated
// unicorn that hasn't picked one up yet).
export const PATTERNS = ['Stripes', 'Spots', 'Stars'];

// Horn banding pulls two colors from a random mane mood, sharing the color
// pool instead of maintaining a separate hardcoded palette list — the mood
// rolled here is independent of the unicorn's own mane, so the horn doesn't
// have to match its mane theme.
export function rollHornPalette(rng: () => number): string[] {
  const stops = moodStops(pick(rng, MANE_MOODS));
  const i = Math.floor(rng() * stops.length);
  let j = Math.floor(rng() * (stops.length - 1));
  if (j >= i) j++;
  return [stops[i], stops[j]];
}
const HORN_TURNS = 4;
// Reuses the same accent hues as PATTERN_COLORS, just deeper/more saturated
// (irises need to read as a rich color, not a pastel one) — 7 options
// instead of the original 4 hardcoded ones, at no extra data cost.
export const EYE_COLORS = ACCENT_HUES.map((h) => hslToHex(h, 62, 52));

// Comet Shard's orbiting particles reuse the PATTERN_COLORS pool — no glow
// ('' on traits.glowColor) is the default for a freshly-generated unicorn
// that hasn't picked one up yet.
export const GLOW_SHAPES = ['Dot', 'Star', 'Streak'];

// Rotates a mood's color stops by a random offset so two unicorns sharing a
// mood don't render with the exact same starting color.
export function rollManeStops(rng: () => number): string[] {
  const a = pick(rng, MANE_MOODS);
  const b = pick(rng, MANE_MOODS);
  const merged = a === b ? moodStops(a) : moodStops(a).concat(moodStops(b));
  const offset = Math.floor(rng() * merged.length);
  return merged.slice(offset).concat(merged.slice(0, offset));
}

export function generateUnicornTraits(seed: number): UnicornTraits {
  const rng = mulberry32(seed >>> 0);
  const coat = pick(rng, COATS);
  const style = pick(rng, MANE_STYLES);
  const strandCount = style === 'Wispy' ? 4 : style === 'Braided' ? 5 : 7;
  const hornPalette = rollHornPalette(rng);
  const eye = pick(rng, EYE_COLORS);
  const maneStops = rollManeStops(rng);

  return {
    seed: seed >>> 0,
    coat,
    style,
    strandCount,
    hornPalette,
    pattern: '',
    patternColor: '',
    eye,
    maneStops,
    maneSeed: rng() * 1000,
    glowColor: '',
    glowCount: 3,
    glowShape: 'Dot',
  };
}

// ---------- color helpers ----------
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(hex: string, a: number): string {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function mixHex(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bl})`;
}

interface Shades {
  base: string;
  light: string;
  dark: string;
  outline: string;
}

function shadeSet(coat: Coat): Shades {
  const light = hslToHex(coat.hue, coat.lightSat, coat.lightL);
  const dark = hslToHex(coat.hue, coat.darkSat, coat.darkL);
  return {
    base: mixHex(light, dark, 0.2),
    light: mixHex(light, '#ffffff', 0.28),
    dark: mixHex(dark, '#000000', 0.14),
    outline: mixHex(dark, '#140a22', 0.65),
  };
}

function contactShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number) {
  ctx.save();
  ctx.fillStyle = `rgba(26,15,40,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}


// ---------- reusable path helpers ----------
function horseLeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  upperLen: number,
  lowerLen: number,
  width: number,
  angle: number,
  coat: Coat,
  front: boolean,
  phase = 0
) {
  const shades = shadeSet(coat);
  const kneeX = x + Math.sin(angle) * upperLen;
  const kneeY = y + Math.cos(angle) * upperLen;
  const fetlockAngle = angle * 0.45 + phase;
  const fetlockX = kneeX + Math.sin(fetlockAngle) * lowerLen;
  const fetlockY = kneeY + Math.cos(fetlockAngle) * lowerLen;

  // Upper leg / shoulder or thigh.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - width * 0.48, y);
  ctx.quadraticCurveTo(x - width * 0.8, y + upperLen * 0.35, kneeX - width * 0.45, kneeY);
  ctx.lineTo(kneeX + width * 0.42, kneeY + 3);
  ctx.quadraticCurveTo(x + width * 0.8, y + upperLen * 0.42, x + width * 0.48, y);
  ctx.closePath();
  fillStroke(ctx, front ? shades.base : shades.dark, shades.outline, 4);

  // Narrow cannon bone.
  ctx.beginPath();
  ctx.moveTo(kneeX - width * 0.38, kneeY - 1);
  ctx.lineTo(fetlockX - width * 0.24, fetlockY - 1);
  ctx.lineTo(fetlockX + width * 0.24, fetlockY + 2);
  ctx.lineTo(kneeX + width * 0.38, kneeY + 5);
  ctx.closePath();
  fillStroke(ctx, front ? shades.base : shades.dark, shades.outline, 3.5);

  // Fetlock + hoof.
  const hoofW = width * 0.9;
  const hoofH = width * 0.58;
  ctx.beginPath();
  ctx.moveTo(fetlockX - hoofW * 0.45, fetlockY - 1);
  ctx.quadraticCurveTo(fetlockX - hoofW * 0.52, fetlockY + hoofH * 0.65, fetlockX - hoofW * 0.35, fetlockY + hoofH);
  ctx.quadraticCurveTo(fetlockX + hoofW * 0.15, fetlockY + hoofH * 1.15, fetlockX + hoofW * 0.55, fetlockY + hoofH * 0.48);
  ctx.lineTo(fetlockX + hoofW * 0.46, fetlockY);
  ctx.closePath();
  fillStroke(ctx, front ? '#7a5540' : '#5c3f30', shades.outline, 3);

  contactShadow(ctx, fetlockX + hoofW * 0.1, fetlockY + hoofH * 0.82, hoofW * 0.42, hoofH * 0.16, 0.13);
  ctx.restore();
}

// ---------- mane / tail ----------
function strokeCurve(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sway: number,
  width: number,
  color: string,
  outline: string
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x1 + sway, y1, x2 + sway * 0.45, y2);
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x1 + sway, y1, x2 + sway * 0.45, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawMane(
  ctx: CanvasRenderingContext2D,
  neckX: number,
  neckTopY: number,
  neckBottomY: number,
  neckLen: number,
  traits: UnicornTraits,
  t: number
) {
  const stops = traits.maneStops;
  const n = traits.strandCount;
  const curl = traits.style === 'Curly' ? 2.4 : traits.style === 'Braided' ? 1 : traits.style === 'Wispy' ? 0.3 : 0;

  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const phase = traits.maneSeed + i * 1.9;
    const sway = Math.sin(t * 0.0015 + phase) * (6 + curl * 16) + Math.sin(t * 0.004 + phase * 2) * curl * 7;
    const x0 = neckX + 8 + f * 7;
    const y0 = neckTopY + f * 12;
    const x1 = neckX - 23 - f * 8;
    const y1 = neckTopY + neckLen * 0.35 + f * 8;
    const x2 = neckX - 26 - f * 5;
    const y2 = neckBottomY - 6 + f * 24;
    strokeCurve(ctx, x0, y0, x1, y1, x2, y2, sway, 11 - f * 4, stops[i % stops.length], INK_OUTLINE);
  }
}

function drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, traits: UnicornTraits, t: number) {
  const stops = traits.maneStops;
  const n = Math.max(5, traits.strandCount);
  const curl = traits.style === 'Curly' ? 2.4 : traits.style === 'Braided' ? 1 : traits.style === 'Wispy' ? 0.3 : 0;

  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const phase = traits.maneSeed + 30 + i * 2.3;
    const sway = Math.sin(t * 0.0014 + phase) * (9 + curl * 16) + Math.sin(t * 0.0038 + phase * 2) * curl * 7;
    strokeCurve(
      ctx,
      x,
      y - 15 + f * 8,
      x - 42 - f * 12,
      y + 2 + f * 10,
      x - 64 - f * 13,
      y + 34 + f * 18,
      sway,
      10 - f * 3.5,
      stops[(i + 2) % stops.length],
      INK_OUTLINE
    );
  }
}

// ---------- equine head ----------
function drawEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  w: number,
  lean: number,
  shades: Shades,
  inner = '#ff9fc0'
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);

  ctx.beginPath();
  ctx.moveTo(-w * 0.5, 4);
  ctx.quadraticCurveTo(-w * 0.25, -h * 0.72, 0, -h);
  ctx.quadraticCurveTo(w * 0.38, -h * 0.7, w * 0.5, 4);
  ctx.closePath();
  fillStroke(ctx, shades.base, shades.outline, 4);

  ctx.beginPath();
  ctx.moveTo(-w * 0.25, -1);
  ctx.quadraticCurveTo(-w * 0.1, -h * 0.52, 0, -h * 0.78);
  ctx.quadraticCurveTo(w * 0.18, -h * 0.52, w * 0.24, -1);
  ctx.closePath();
  ctx.fillStyle = inner;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEquineHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  traits: UnicornTraits,
  shades: Shades,
  t: number
) {
  // The head is deliberately constructed as an elongated side-profile path.
  // There is no ellipse anywhere in the skull/muzzle silhouette.
  const headLen = 67 * scale;
  const skullH = 54 * scale;

  // Back of skull -> forehead -> nasal bridge -> nose -> jaw -> throat -> cheek.
  ctx.beginPath();
  ctx.moveTo(x - headLen * 0.42, y - skullH * 0.42); // poll
  ctx.quadraticCurveTo(x - headLen * 0.10, y - skullH * 0.56, x + headLen * 0.02, y - skullH * 0.28); // forehead
  ctx.quadraticCurveTo(x + headLen * 0.24, y - skullH * 0.10, x + headLen * 0.50, y - skullH * 0.02); // bridge
  ctx.quadraticCurveTo(x + headLen * 0.70, y + skullH * 0.01, x + headLen * 0.92, y + skullH * 0.14); // nose top
  ctx.quadraticCurveTo(x + headLen * 1.00, y + skullH * 0.23, x + headLen * 0.94, y + skullH * 0.35); // nose tip
  ctx.quadraticCurveTo(x + headLen * 0.83, y + skullH * 0.47, x + headLen * 0.60, y + skullH * 0.42); // lower muzzle
  ctx.quadraticCurveTo(x + headLen * 0.44, y + skullH * 0.39, x + headLen * 0.31, y + skullH * 0.51); // jaw
  ctx.quadraticCurveTo(x + headLen * 0.04, y + skullH * 0.64, x - headLen * 0.18, y + skullH * 0.43); // throat
  ctx.quadraticCurveTo(x - headLen * 0.43, y + skullH * 0.20, x - headLen * 0.50, y - skullH * 0.08); // cheek
  ctx.quadraticCurveTo(x - headLen * 0.53, y - skullH * 0.30, x - headLen * 0.42, y - skullH * 0.42); // poll
  ctx.closePath();
  fillStroke(ctx, shades.base, shades.outline, 5);

  // Subtle cheek plane reinforces the horse skull rather than a round cartoon face.
  ctx.beginPath();
  ctx.moveTo(x - headLen * 0.34, y - skullH * 0.15);
  ctx.quadraticCurveTo(x - headLen * 0.10, y - skullH * 0.02, x - headLen * 0.18, y + skullH * 0.28);
  ctx.quadraticCurveTo(x - headLen * 0.32, y + skullH * 0.18, x - headLen * 0.34, y - skullH * 0.15);
  ctx.fillStyle = shades.dark;
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ears sit on the back/top of the skull.
  drawEar(ctx, x - headLen * 0.28, y - skullH * 0.38, 25 * scale, 15 * scale, -0.16, shades);
  drawEar(ctx, x - headLen * 0.02, y - skullH * 0.40, 29 * scale, 16 * scale, 0.10, shades, '#ffb0ca');

  // Eye: small, high, and toward the rear of the skull.
  const eyeX = x - headLen * 0.18;
  const eyeY = y - skullH * 0.18;
  ctx.fillStyle = '#2a1f3a';
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, 5.5 * scale, 7 * scale, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = traits.eye;
  ctx.beginPath();
  ctx.ellipse(eyeX + 0.5 * scale, eyeY + 0.5 * scale, 3.6 * scale, 5.2 * scale, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX - 1.5 * scale, eyeY - 2.2 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Nostril at the end of the long muzzle.
  const nostrilX = x + headLen * 0.77;
  const nostrilY = y + skullH * 0.20;
  ctx.fillStyle = rgba('#3a2a4a', 0.62);
  ctx.beginPath();
  ctx.ellipse(nostrilX, nostrilY, 4.5 * scale, 2.7 * scale, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Simple mouth line and chin highlight.
  ctx.strokeStyle = rgba(INK_OUTLINE, 0.7);
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + headLen * 0.62, y + skullH * 0.38);
  ctx.quadraticCurveTo(x + headLen * 0.78, y + skullH * 0.41, x + headLen * 0.90, y + skullH * 0.35);
  ctx.stroke();

  // Blush is retained, but placed on the cheek rather than near the muzzle.
  ctx.fillStyle = 'rgba(255,140,170,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - headLen * 0.02, y + skullH * 0.18, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Forelock gives the forehead a strong unicorn silhouette.
  const stops = traits.maneStops;
  for (let i = 0; i < 3; i++) {
    const sway = Math.sin(t * 0.0017 + traits.maneSeed + i) * 3;
    strokeCurve(
      ctx,
      x - headLen * 0.18 + i * 4,
      y - skullH * 0.43,
      x - headLen * 0.03 + i * 3 + sway,
      y - skullH * 0.62,
      x + headLen * 0.12 + i * 4 + sway,
      y - skullH * 0.30,
      sway,
      7 * scale - i,
      stops[i % stops.length],
      INK_OUTLINE
    );
  }

  return {
    hornX: x + headLen * 0.28,
    hornY: y - skullH * 0.10,
  };
}

// ---------- horn ----------
function drawHorn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  palette: string[],
  angle: number
) {
  const w = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const hornPath = () => {
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, -h);
    ctx.closePath();
  };

  ctx.fillStyle = INK_OUTLINE;
  ctx.beginPath();
  ctx.moveTo(-w - 2, 2);
  ctx.lineTo(w + 2, 2);
  ctx.lineTo(0, -h - 3);
  ctx.closePath();
  ctx.fill();

  hornPath();
  ctx.fillStyle = '#fff2cf';
  ctx.fill();

  ctx.save();
  hornPath();
  ctx.clip();
  for (let i = 0; i < HORN_TURNS * 2; i++) {
    const f = i / (HORN_TURNS * 2);
    const yy = -f * h;
    const ww = w * (1 - f) + 1;
    ctx.strokeStyle = rgba(palette[i % palette.length], 0.9);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-ww, yy + 5);
    ctx.lineTo(ww, yy - 3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ---------- new horse/unicorn body ----------
// Returns a Path2D instead of drawing onto ctx's current path, so drawBody
// can build the barrel shape once and reuse it for both the fill/stroke and
// the pattern clip below, instead of reconstructing the same curves twice.
function bodyPath(bodyX: number, bodyY: number, bodyRx: number, bodyRy: number): Path2D {
  const p = new Path2D();
  p.moveTo(bodyX - bodyRx * 0.95, bodyY + bodyRy * 0.05);
  p.quadraticCurveTo(bodyX - bodyRx * 0.94, bodyY - bodyRy * 0.68, bodyX - bodyRx * 0.30, bodyY - bodyRy * 0.94);
  p.quadraticCurveTo(bodyX + bodyRx * 0.34, bodyY - bodyRy * 0.98, bodyX + bodyRx * 0.87, bodyY - bodyRy * 0.54);
  p.quadraticCurveTo(bodyX + bodyRx * 1.05, bodyY - bodyRy * 0.08, bodyX + bodyRx * 0.91, bodyY + bodyRy * 0.44);
  p.quadraticCurveTo(bodyX + bodyRx * 0.68, bodyY + bodyRy * 0.83, bodyX + bodyRx * 0.15, bodyY + bodyRy * 0.92);
  p.quadraticCurveTo(bodyX - bodyRx * 0.52, bodyY + bodyRy * 0.88, bodyX - bodyRx * 0.91, bodyY + bodyRy * 0.48);
  p.quadraticCurveTo(bodyX - bodyRx * 1.02, bodyY + bodyRy * 0.25, bodyX - bodyRx * 0.95, bodyY + bodyRy * 0.05);
  p.closePath();
  return p;
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  bodyX: number,
  bodyY: number,
  bodyRx: number,
  bodyRy: number,
  shades: Shades,
  traits: UnicornTraits
) {
  // Barrel with a slightly deeper chest and lifted rump.
  const barrel = bodyPath(bodyX, bodyY, bodyRx, bodyRy);
  fillStroke(ctx, shades.base, shades.outline, 5, barrel);

  // Chest plane.
  ctx.beginPath();
  ctx.moveTo(bodyX - bodyRx * 0.84, bodyY - bodyRy * 0.25);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.65, bodyY + bodyRy * 0.02, bodyX - bodyRx * 0.64, bodyY + bodyRy * 0.52);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.78, bodyY + bodyRy * 0.44, bodyX - bodyRx * 0.84, bodyY - bodyRy * 0.25);
  ctx.fillStyle = shades.dark;
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rainbow Nectar: a coat pattern clipped to the body barrel.
  if (traits.pattern) {
    ctx.save();
    ctx.clip(barrel);
    ctx.fillStyle = traits.patternColor;
    ctx.strokeStyle = traits.patternColor;
    ctx.globalAlpha = 1;

    if (traits.pattern === 'Stripes') {
      ctx.lineWidth = bodyRy * 0.16;
      for (let i = -2; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(bodyX - bodyRx + i * bodyRx * 0.4, bodyY - bodyRy * 1.2);
        ctx.lineTo(bodyX - bodyRx + i * bodyRx * 0.4 - bodyRx * 0.5, bodyY + bodyRy * 1.2);
        ctx.stroke();
      }
    } else if (traits.pattern === 'Spots') {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        const px = bodyX + Math.cos(a) * bodyRx * 0.6 * ((i % 3) * 0.4 + 0.3);
        const py = bodyY + Math.sin(a) * bodyRy * 0.7 * ((i % 2) * 0.5 + 0.4);
        ctx.beginPath();
        ctx.arc(px, py, bodyRy * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const a = i * 3.1;
        const px = bodyX + Math.cos(a) * bodyRx * 0.65 * ((i % 3) * 0.35 + 0.3);
        const py = bodyY + Math.sin(a) * bodyRy * 0.75 * ((i % 2) * 0.5 + 0.35);
        const r = bodyRy * 0.16;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const sa = -Math.PI / 2 + (k / 5) * Math.PI * 2;
          const ox = px + Math.cos(sa) * r;
          const oy = py + Math.sin(sa) * r;
          const ia = sa + Math.PI / 5;
          const ix = px + Math.cos(ia) * r * 0.42;
          const iy = py + Math.sin(ia) * r * 0.42;
          if (k === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/**
 * Draws a procedural unicorn using a horse-first silhouette, feet landing at
 * the caller's already-translated (0,0) origin. t is an animation clock in
 * milliseconds.
 */
export function drawUnicorn(ctx: CanvasRenderingContext2D, traits: UnicornTraits, t: number) {
  const s = 1;
  const bob = Math.sin(t * 0.0018) * 2.2 * s;
  const groundY = 0;

  // Horse proportions: long body, high shoulder, elevated head, substantial neck.
  const bodyX = 0;
  const bodyY = groundY - 108 * s + bob;
  const bodyRx = 83 * s;
  const bodyRy = 49 * s;
  const neckBaseX = bodyX + 54 * s;
  const neckBaseY = bodyY - 25 * s;
  const neckTopX = bodyX + 84 * s;
  const neckTopY = bodyY - 105 * s;
  const neckLen = 92 * s;

  const shades = shadeSet(traits.coat);

  drawGroundShadow(ctx, 110 * s, bodyX + 8 * s, groundY + 5, 110 * s, 110 * s * 0.25, 'rgba(20,10,30,0.24)');

  // Tail behind the body.
  drawTail(ctx, bodyX - bodyRx * 0.82, bodyY - bodyRy * 0.25, traits, t);

  // Rear legs first so the near legs can overlap them.
  horseLeg(ctx, bodyX - 48 * s, bodyY + bodyRy * 0.34, 43 * s, 43 * s, 18 * s, -0.10, traits.coat, false, 0.02);
  horseLeg(ctx, bodyX - 18 * s, bodyY + bodyRy * 0.40, 45 * s, 42 * s, 17 * s, 0.08, traits.coat, false, -0.03);

  // Body barrel.
  drawBody(ctx, bodyX, bodyY, bodyRx, bodyRy, shades, traits);

  // Prominent neck drawn OVER the body. This is intentionally a separate,
  // unmistakable mass rather than an invisible line between head and torso.
  ctx.beginPath();
  ctx.moveTo(neckBaseX - 28 * s, neckBaseY + 18 * s);
  ctx.quadraticCurveTo(neckBaseX - 18 * s, neckBaseY - 25 * s, neckTopX - 17 * s, neckTopY + 18 * s);
  ctx.quadraticCurveTo(neckTopX - 6 * s, neckTopY - 5 * s, neckTopX + 15 * s, neckTopY + 5 * s);
  ctx.quadraticCurveTo(neckBaseX + 16 * s, neckBaseY - 1 * s, neckBaseX + 34 * s, neckBaseY + 32 * s);
  ctx.quadraticCurveTo(neckBaseX + 19 * s, neckBaseY + 62 * s, neckBaseX - 28 * s, neckBaseY + 18 * s);
  ctx.closePath();
  fillStroke(ctx, shades.base, shades.outline, 5);

  // Neck highlight plane.
  ctx.beginPath();
  ctx.moveTo(neckBaseX - 12 * s, neckBaseY + 12 * s);
  ctx.quadraticCurveTo(neckTopX - 13 * s, neckTopY + 20 * s, neckTopX + 2 * s, neckTopY + 12 * s);
  ctx.quadraticCurveTo(neckBaseX + 7 * s, neckBaseY + 20 * s, neckBaseX + 4 * s, neckBaseY + 42 * s);
  ctx.quadraticCurveTo(neckBaseX - 10 * s, neckBaseY + 31 * s, neckBaseX - 12 * s, neckBaseY + 12 * s);
  ctx.fillStyle = shades.light;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Mane is attached to the crest of this actual neck.
  drawMane(ctx, neckTopX - 12 * s, neckTopY + 4 * s, neckBaseY + 15 * s, neckLen, traits, t);

  // Front legs, set beneath the shoulder/chest.
  horseLeg(ctx, bodyX + 35 * s, bodyY + bodyRy * 0.42, 48 * s, 43 * s, 18 * s, -0.10, traits.coat, true, 0.03);
  horseLeg(ctx, bodyX + 62 * s, bodyY + bodyRy * 0.34, 45 * s, 45 * s, 17 * s, 0.12, traits.coat, true, -0.02);

  // Head is deliberately separated from the barrel by the long neck.
  const head = drawEquineHead(
    ctx,
    neckTopX + 8 * s,
    neckTopY + 2 * s,
    s,
    traits,
    shades,
    t
  );

  // Horn on the forehead, projecting forward/upward.
  const hornAngle = Math.PI / 9;
  const hornH = 51 * s;
  const hornX = head.hornX + 2 * s;
  const hornY = head.hornY + 2 * s;
  drawHorn(ctx, hornX, hornY, hornH, traits.hornPalette, hornAngle);

  // Comet Shard: bright orbiting particles drawn last (on top of everything)
  // so they're never obscured — motion reads far more clearly than a static
  // glow would against the pastel backdrop.
  if (traits.glowColor) {
    const orbitCX = bodyX + 10 * s;
    const orbitCY = bodyY - 50 * s;
    const orbitRx = bodyRx * 1.5;
    const orbitRy = bodyRy * 2.2;
    const count = traits.glowCount;
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const a = t * 0.0016 + phase;
      const px = orbitCX + Math.cos(a) * orbitRx;
      const py = orbitCY + Math.sin(a) * orbitRy;
      const r = (4 + Math.sin(t * 0.005 + phase) * 1.8) * s;

      if (traits.glowShape === 'Star') {
        ctx.strokeStyle = traits.glowColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - r, py);
        ctx.lineTo(px + r, py);
        ctx.moveTo(px, py - r);
        ctx.lineTo(px, py + r);
        ctx.stroke();
        ctx.strokeStyle = INK_OUTLINE;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (traits.glowShape === 'Streak') {
        const aPrev = a - 0.35;
        ctx.strokeStyle = traits.glowColor;
        ctx.lineWidth = Math.max(1.5, r * 0.9);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(orbitCX + Math.cos(aPrev) * orbitRx, orbitCY + Math.sin(aPrev) * orbitRy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.lineCap = 'butt';
      } else {
        ctx.fillStyle = traits.glowColor;
        ctx.strokeStyle = INK_OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}
