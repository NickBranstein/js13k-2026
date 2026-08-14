// Procedural flat-2D-sprite unicorn renderer.
// Rebuilt from scratch around a recognizable equine side-profile silhouette.
// The original trait model, palettes, seeded randomness, animation, mane/tail,
// horn, and aura concepts are retained as the template for the new renderer.

import { mulberry32, pick, range } from '../game/rng';

export interface Coat {
  name: string;
  light: string;
  dark: string;
}

export interface ManeMood {
  name: string;
  stops: string[];
}

export interface UnicornTraits {
  seed: number;
  coat: Coat;
  mood: ManeMood;
  style: string;
  strandCount: number;
  hornTurns: number;
  aura: string;
  eye: string;
  sizeClass: string;
  scale: number;
  headRatio: number;
  maneStops: string[];
  maneSeed: number;
  earFlop: number;
  earStyle: string;
  earScale: number;
}

// ---------- curated palettes ----------
export const COATS: Coat[] = [
  { name: 'Lavender Cream', light: '#f4ecff', dark: '#c6a9f2' },
  { name: 'Buttercream', light: '#fff6df', dark: '#f0cf8a' },
  { name: 'Blush Coral', light: '#ffe9ee', dark: '#f3a6b6' },
  { name: 'Seafoam Mint', light: '#e8fff5', dark: '#93dcbb' },
  { name: 'Periwinkle', light: '#eaf0ff', dark: '#a6b6f2' },
  { name: 'Peach Sorbet', light: '#fff0e4', dark: '#f3b98a' },
  { name: 'Iris Violet', light: '#f2e9ff', dark: '#a778d9' },
  { name: 'Moonlight Grey', light: '#f3f1fb', dark: '#b7aecf' },
];

export const MANE_MOODS: ManeMood[] = [
  { name: 'Pastel Rainbow', stops: ['#ffb3c6', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff'] },
  { name: 'Jewel Rainbow', stops: ['#ff2e63', '#ff9f1c', '#ffd23f', '#2ec4b6', '#3a86ff', '#7b2ff7', '#c724b1'] },
  { name: 'Sunset Rainbow', stops: ['#ff5e5b', '#ff9b42', '#ffd166', '#f6c453', '#ef476f', '#c93b78', '#7d3ac1'] },
  { name: 'Aurora Rainbow', stops: ['#38f9d7', '#43e97b', '#a1ffce', '#5ee7df', '#66a6ff', '#a06cff', '#f7797d'] },
];

const MANE_STYLES = ['Flowing', 'Curly', 'Braided', 'Wispy'];
export const AURA_TYPES = ['Halo Ring', 'Sparkle Trail', 'Comet Arc'];
const EYE_COLORS = ['#6b4bd6', '#d68b3f', '#3f9fd6', '#2fae76'];
const SIZE_CLASSES = ['Foal', 'Yearling', 'Adult'];
const EAR_STYLES = ['Petite', 'Rounded', 'Tall', 'Pixie'];
const EAR_SCALES: Record<string, number> = { Petite: 0.75, Rounded: 0.95, Tall: 1.35, Pixie: 1.1 };
const INK_OUTLINE = '#241a38';

export function generateUnicornTraits(seed: number): UnicornTraits {
  const rng = mulberry32(seed >>> 0);
  const coat = pick(rng, COATS);
  const mood = pick(rng, MANE_MOODS);
  const style = pick(rng, MANE_STYLES);
  const strandCount = style === 'Wispy' ? 4 : style === 'Braided' ? 5 : 7;
  const hornTurns = Math.round(range(rng, 3, 6));
  const aura = pick(rng, AURA_TYPES);
  const eye = pick(rng, EYE_COLORS);
  const sizeIdx = Math.floor(range(rng, 0, 3));
  const sizeClass = SIZE_CLASSES[sizeIdx];
  const scale = [0.78, 0.92, 1.06][sizeIdx];

  // Kept for compatibility with the original trait contract. The renderer now
  // uses headRatio as a modest head-size variation rather than a round-head ratio.
  const headRatio = [0.92, 0.98, 1.04][sizeIdx];

  const offset = Math.floor(rng() * mood.stops.length);
  const maneStops = mood.stops.slice(offset).concat(mood.stops.slice(0, offset));
  const earStyle = pick(rng, EAR_STYLES);

  return {
    seed: seed >>> 0,
    coat,
    mood,
    style,
    strandCount,
    hornTurns,
    aura,
    eye,
    sizeClass,
    scale,
    headRatio,
    maneStops,
    maneSeed: rng() * 1000,
    earFlop: range(rng, -0.08, 0.08),
    earStyle,
    earScale: EAR_SCALES[earStyle],
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
  return {
    base: mixHex(coat.light, coat.dark, 0.2),
    light: mixHex(coat.light, '#ffffff', 0.28),
    dark: mixHex(coat.dark, '#000000', 0.14),
    outline: mixHex(coat.dark, '#140a22', 0.65),
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

function drawGroundShadow(ctx: CanvasRenderingContext2D, cx: number, groundY: number, rx: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,30,0.24)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, rx, rx * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- reusable path helpers ----------
function fillStroke(ctx: CanvasRenderingContext2D, fill: string, outline: string, width = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

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
  const curl = traits.style === 'Curly' ? 1 : traits.style === 'Braided' ? 0.45 : traits.style === 'Wispy' ? 0.2 : 0.12;

  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const phase = traits.maneSeed + i * 1.9;
    const sway = Math.sin(t * 0.0015 + phase) * (7 + curl * 12);
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
  const curl = traits.style === 'Curly' ? 1 : traits.style === 'Braided' ? 0.45 : 0.15;

  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const phase = traits.maneSeed + 30 + i * 2.3;
    const sway = Math.sin(t * 0.0014 + phase) * (11 + curl * 12);
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
  const headLen = 67 * scale * traits.headRatio;
  const skullH = 54 * scale * traits.headRatio;
  const muzzleLen = 47 * scale;
  const muzzleDrop = 13 * scale;

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
  const es = traits.earScale;
  drawEar(ctx, x - headLen * 0.28, y - skullH * 0.38, 25 * scale * es, 15 * scale * es, -0.16 + traits.earFlop, shades);
  drawEar(ctx, x - headLen * 0.02, y - skullH * 0.40, 29 * scale * es, 16 * scale * es, 0.10 + traits.earFlop, shades, '#ffb0ca');

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
    muzzleX: x + headLen * 0.92,
    muzzleY: y + skullH * 0.23 + muzzleDrop * 0.15,
    headBottom: y + skullH * 0.51,
    headTop: y - skullH * 0.56,
    headLen,
  };
}

// ---------- horn / aura ----------
function drawHorn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  turns: number,
  mood: ManeMood,
  angle: number
) {
  const w = 8;
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
  for (let i = 0; i < turns * 2; i++) {
    const f = i / (turns * 2);
    const yy = -f * h;
    const ww = w * (1 - f) + 1;
    ctx.strokeStyle = rgba(mood.stops[i % mood.stops.length], 0.9);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-ww, yy + 5);
    ctx.lineTo(ww, yy - 3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

function drawAura(ctx: CanvasRenderingContext2D, x: number, y: number, traits: UnicornTraits, t: number) {
  const mood = traits.maneStops;
  ctx.save();

  if (traits.aura === 'Halo Ring') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.0012;
      ctx.fillStyle = mood[i % mood.length];
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 25, y + Math.sin(a) * 14 - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (traits.aura === 'Sparkle Trail') {
    for (let j = 0; j < 10; j++) {
      const phase = (t * 0.00028 + j / 10) % 1;
      ctx.fillStyle = mood[j % mood.length];
      ctx.globalAlpha = Math.max(0, (1 - phase) * 0.9);
      ctx.beginPath();
      ctx.arc(x + Math.sin(j * 12.9) * 10, y - phase * 60 - 6, 2.6 * (1 - phase * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const swing = Math.sin(t * 0.0011) * 0.5;
    for (let k = 0; k < mood.length; k++) {
      ctx.strokeStyle = mood[k];
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y + 10, 22 + k * 3, Math.PI * 1.1 + swing, Math.PI * 1.7 + swing);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ---------- new horse/unicorn body ----------
function drawBody(
  ctx: CanvasRenderingContext2D,
  bodyX: number,
  bodyY: number,
  bodyRx: number,
  bodyRy: number,
  shades: Shades
) {
  // Barrel with a slightly deeper chest and lifted rump.
  ctx.beginPath();
  ctx.moveTo(bodyX - bodyRx * 0.95, bodyY + bodyRy * 0.05);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.94, bodyY - bodyRy * 0.68, bodyX - bodyRx * 0.30, bodyY - bodyRy * 0.94);
  ctx.quadraticCurveTo(bodyX + bodyRx * 0.34, bodyY - bodyRy * 0.98, bodyX + bodyRx * 0.87, bodyY - bodyRy * 0.54);
  ctx.quadraticCurveTo(bodyX + bodyRx * 1.05, bodyY - bodyRy * 0.08, bodyX + bodyRx * 0.91, bodyY + bodyRy * 0.44);
  ctx.quadraticCurveTo(bodyX + bodyRx * 0.68, bodyY + bodyRy * 0.83, bodyX + bodyRx * 0.15, bodyY + bodyRy * 0.92);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.52, bodyY + bodyRy * 0.88, bodyX - bodyRx * 0.91, bodyY + bodyRy * 0.48);
  ctx.quadraticCurveTo(bodyX - bodyRx * 1.02, bodyY + bodyRy * 0.25, bodyX - bodyRx * 0.95, bodyY + bodyRy * 0.05);
  ctx.closePath();
  fillStroke(ctx, shades.base, shades.outline, 5);

  // Chest plane.
  ctx.beginPath();
  ctx.moveTo(bodyX - bodyRx * 0.84, bodyY - bodyRy * 0.25);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.65, bodyY + bodyRy * 0.02, bodyX - bodyRx * 0.64, bodyY + bodyRy * 0.52);
  ctx.quadraticCurveTo(bodyX - bodyRx * 0.78, bodyY + bodyRy * 0.44, bodyX - bodyRx * 0.84, bodyY - bodyRy * 0.25);
  ctx.fillStyle = shades.dark;
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Draws a procedural unicorn using a horse-first silhouette.
 * Feet land at (originX, originY). t is an animation clock in milliseconds.
 */
export function drawUnicorn(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  traits: UnicornTraits,
  t: number,
  reduceMotion = false
) {
  const s = traits.scale;
  const bob = reduceMotion ? 0 : Math.sin(t * 0.0018) * 2.2 * s;
  const groundY = originY;

  // Horse proportions: long body, high shoulder, elevated head, substantial neck.
  const bodyX = originX;
  const bodyY = groundY - 108 * s + bob;
  const bodyRx = 83 * s;
  const bodyRy = 49 * s;
  const neckBaseX = bodyX + 54 * s;
  const neckBaseY = bodyY - 25 * s;
  const neckTopX = bodyX + 84 * s;
  const neckTopY = bodyY - 105 * s;
  const neckLen = 92 * s;

  const shades = shadeSet(traits.coat);

  drawGroundShadow(ctx, bodyX + 8 * s, groundY + 5, 110 * s);

  // Tail behind the body.
  drawTail(ctx, bodyX - bodyRx * 0.82, bodyY - bodyRy * 0.25, traits, t);

  // Rear legs first so the near legs can overlap them.
  horseLeg(ctx, bodyX - 48 * s, bodyY + bodyRy * 0.34, 43 * s, 43 * s, 18 * s, -0.10, traits.coat, false, 0.02);
  horseLeg(ctx, bodyX - 18 * s, bodyY + bodyRy * 0.40, 45 * s, 42 * s, 17 * s, 0.08, traits.coat, false, -0.03);

  // Body barrel.
  drawBody(ctx, bodyX, bodyY, bodyRx, bodyRy, shades);

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
  const hornH = 34 * s;
  const hornX = head.hornX + 2 * s;
  const hornY = head.hornY + 2 * s;
  const hornTipX = hornX + Math.sin(hornAngle) * hornH;
  const hornTipY = hornY - Math.cos(hornAngle) * hornH;
  drawAura(ctx, hornTipX, hornTipY, traits, t);
  drawHorn(ctx, hornX, hornY, hornH, traits.hornTurns, traits.mood, hornAngle);
}
