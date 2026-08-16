// Battle chrome: HP bars, action menu, text log. Rounded, soft-gradient
// panels to match the "unicorns and rainbows" theme rather than flat boxes.

import type { Combatant } from '../game/battle';
import type { LifetimeStats } from '../game/stats';
import { PATTERN_COLORS as TITLE_SPARKLE_COLORS, INK_OUTLINE, TEXT_COLOR, GOLD_TEXT, PANEL_BORDER } from './shared';

const SELECT_GOLD = '#ffd166';
const PANEL_RADIUS = 16;
const HP_LOW_THRESHOLD = 0.5;

function panelPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = PANEL_RADIUS): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// rightX is the panel's right edge, so it stays flush against that edge
// regardless of the text width (which changes slightly with muted state).
// Exported so main.ts's click handler can hit-test the exact same rect
// drawMuteToggle draws, instead of duplicating the width math.
export function muteToggleBounds(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  y: number,
  muted: boolean
): { x: number; y: number; w: number; h: number } {
  ctx.font = '600 16px sans-serif';
  const textW = ctx.measureText(`[M]ute [${muted ? 'X' : ' '}]`).width;
  const w = textW + 28;
  return { x: rightX - w, y, w, h: 34 };
}

export function drawMuteToggle(ctx: CanvasRenderingContext2D, rightX: number, y: number, muted: boolean): void {
  const { x, w, h } = muteToggleBounds(ctx, rightX, y, muted);
  const text = `[M]ute [${muted ? 'X' : ' '}]`;

  panelPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(53,32,84,0.85)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PANEL_BORDER;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Small round "?" button, same visual family as the mute toggle — gives
// mouse/touch users a way to open the how-to-play panel (Escape-only
// otherwise, which touch devices can't send).
export function drawHelpButton(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(53,32,84,0.85)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PANEL_BORDER;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 16px sans-serif';
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText('?', x + r, y + r + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Shared soft pastel-gradient panel background + border + a gentle top sheen,
// used by every UI box so they read as one cohesive, rounded style.
function drawPanelBg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = PANEL_RADIUS,
  stops: [number, string][] = [
    [0, 'rgba(122,58,112,0.9)'],
    [0.55, 'rgba(88,52,132,0.9)'],
    [1, 'rgba(53,32,84,0.92)'],
  ],
  borderColor = PANEL_BORDER
): void {
  panelPath(ctx, x, y, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  stops.forEach(([stop, color]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  ctx.save();
  panelPath(ctx, x, y, w, h, r);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();
}

export function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  combatant: Combatant,
  displayHp: number,
  level?: number
): void {
  const shown = Math.round(displayHp);
  const pct = Math.max(0, shown / combatant.maxHp);
  const r = h / 2;

  ctx.save();
  panelPath(ctx, x, y, w, h, r);
  ctx.clip();

  const trackGrad = ctx.createLinearGradient(x, y, x, y + h);
  trackGrad.addColorStop(0, '#5c4a73');
  trackGrad.addColorStop(1, '#3d2f52');
  ctx.fillStyle = trackGrad;
  ctx.fillRect(x, y, w, h);

  const fillW = w * pct;
  if (fillW > 0) {
    const fillGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (pct > HP_LOW_THRESHOLD) {
      fillGrad.addColorStop(0, '#b8f7c2');
      fillGrad.addColorStop(1, '#4fd67a');
    } else {
      fillGrad.addColorStop(0, '#ffc2b8');
      fillGrad.addColorStop(1, '#e8564f');
    }
    ctx.fillStyle = fillGrad;
    ctx.fillRect(x, y, fillW, h);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, fillW, h * 0.42);
  }
  ctx.restore();

  panelPath(ctx, x, y, w, h, r);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PANEL_BORDER;
  ctx.stroke();

  ctx.font = '600 19px sans-serif';
  ctx.textBaseline = 'bottom';
  const label = level === undefined ? combatant.name : `${combatant.name}  Lv.${level}`;
  ctx.fillStyle = INK_OUTLINE;
  ctx.fillText(label, x + 4, y - 8);

  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const hpText = `${shown} / ${combatant.maxHp}`;
  const onGreen = pct > HP_LOW_THRESHOLD;
  ctx.fillStyle = onGreen ? 'rgba(255,255,255,0.8)' : INK_OUTLINE;
  ctx.fillText(hpText, x + w / 2 + 1, y + h / 2 + 1);
  ctx.fillStyle = onGreen ? '#1c3d24' : TEXT_COLOR;
  ctx.fillText(hpText, x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
}

// Gold-toned, gently pulsing badge showing the player's level — meant to
// stand out from the purple panel family as a small "achievement" moment.
export function drawLevelBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number, t: number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  drawGoldPanel(ctx, cx, cy, w, h, t, 16, 2, 0.85, 0.45, 0.25, 2.5, 0.35);

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_TEXT;
  ctx.font = '700 10px sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText('LEVEL', cx, cy - 1);
  ctx.font = '800 26px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(String(level), cx, cy - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Vertical strip of label/value rows (3-letter label, value) — sized to
// align with another panel (the combat log) so it can sit beside it along
// the canvas edge, clear of the player sprite above. Label left-aligned,
// value right-aligned, so the fixed-width labels keep every row lined up
// regardless of how many digits the value has.
export function drawStatsPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stats: [string, number][]
): void {
  drawPanelBg(ctx, x, y, w, h, 14);

  ctx.font = '700 15px sans-serif';
  ctx.textBaseline = 'middle';
  const rowH = h / stats.length;
  stats.forEach(([label, val], i) => {
    const rowCenterY = y + rowH * i + rowH / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_COLOR;
    ctx.globalAlpha = 0.7;
    ctx.fillText(label, x + 12, rowCenterY);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.fillText(String(val), x + w - 12, rowCenterY);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

const BOSS_BADGE_STOPS: [number, string][] = [
  [0, 'rgba(168,58,58,0.9)'],
  [0.55, 'rgba(138,42,52,0.9)'],
  [1, 'rgba(92,28,44,0.92)'],
];

export function drawFloorBadge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  floor: number,
  boss: boolean
): void {
  const w = boss ? 220 : 160;
  const h = boss ? 58 : 42;
  const x = centerX - w / 2;

  if (boss) {
    drawPanelBg(ctx, x, y, w, h, h / 2, BOSS_BADGE_STOPS, 'rgba(255,214,208,0.9)');
  } else {
    drawPanelBg(ctx, x, y, w, h, h / 2);
  }

  ctx.textAlign = 'center';
  ctx.font = '600 20px sans-serif';
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = boss ? 'alphabetic' : 'middle';
  ctx.fillText(`Floor ${floor}`, centerX, boss ? y + 26 : y + h / 2);

  if (boss) {
    ctx.font = '600 14px sans-serif';
    ctx.fillStyle = '#fff0ee';
    ctx.fillText('⚡ BOSS FLOOR ⚡', centerX, y + 46);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Left-anchored (title screen keeps this in a corner, clear of the unicorn
// preview) rainbow-gradient title with a soft glow, gentle pulse, and
// orbiting sparkles — meant to read as a "wow" moment, not just a label.
export function drawTitleCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  subtitle: string,
  t: number
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 46px sans-serif';
  const titleWidth = ctx.measureText(title).width;

  const pulse = 1 + Math.sin(t / 500) * 0.03;
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 18 + Math.sin(t / 300) * 6;

  const gradient = ctx.createLinearGradient(0, 0, titleWidth, 0);
  gradient.addColorStop(0, '#ff6b9e');
  gradient.addColorStop(0.2, '#ffb36b');
  gradient.addColorStop(0.4, '#fff36b');
  gradient.addColorStop(0.6, '#6bffa3');
  gradient.addColorStop(0.8, '#6bb8ff');
  gradient.addColorStop(1, '#c26bff');
  ctx.fillStyle = gradient;
  ctx.fillText(title, 0, 0);

  ctx.shadowBlur = 0;
  ctx.font = '600 16px sans-serif';
  ctx.fillStyle = '#5c4a73';
  ctx.fillText(subtitle, 2, 58);
  ctx.restore();

  for (let i = 0; i < 6; i++) {
    const phase = (i / 6) * Math.PI * 2;
    const sx = x + titleWidth * 0.5 + Math.cos(t / 600 + phase) * (titleWidth * 0.55 + 12);
    const sy = y + 20 + Math.sin(t / 600 + phase) * 32;
    const r = 2.5 + Math.sin(t / 250 + phase) * 1.5;
    ctx.fillStyle = TITLE_SPARKLE_COLORS[i % TITLE_SPARKLE_COLORS.length];
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface RunStats {
  floorReached: number;
  level: number;
  monstersDefeated: number;
  bossesDefeated: number;
  treasuresFound: number;
  trapsFound: number;
  rainbowFruitsFound: number;
}

// Large gold "achievement" panel (matches drawLevelBadge's palette/glow),
// centered on screen, summarizing the whole run rather than a small
// off-to-the-side box.
// Gold gradient panel + radial glow + sheen, shared by every "achievement
// moment" UI element (level badge, run summary, mutation reveal) so they
// read as one family. The optional params let drawLevelBadge reuse this with
// a tighter radius/glow instead of duplicating the whole block.
function drawGoldPanel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  w: number,
  h: number,
  t: number,
  radius = 22,
  glowR0 = 10,
  glowScale = 0.65,
  glowA0 = 0.3,
  glowA1 = 0.15,
  strokeW = 3,
  sheenA = 0.32
): void {
  const x = centerX - w / 2;
  const y = centerY - h / 2;
  const pulse = 0.5 + Math.sin(t / 500) * 0.5;

  ctx.save();
  const glow = ctx.createRadialGradient(centerX, centerY, glowR0, centerX, centerY, w * glowScale);
  glow.addColorStop(0, `rgba(255,214,102,${glowA0 + pulse * glowA1})`);
  glow.addColorStop(1, 'rgba(255,214,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, w * glowScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  panelPath(ctx, x, y, w, h, radius);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#ffe08a');
  grad.addColorStop(0.5, '#ffb36b');
  grad.addColorStop(1, '#ff8fa3');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  ctx.save();
  panelPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  sheen.addColorStop(0, `rgba(255,255,255,${sheenA})`);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.5);
  ctx.restore();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Gold panel + a rainbow-cycling border ring on top — shared by every
// "mutation moment" screen (reveal, transform) so they read as one sequence.
export function drawTransformPanel(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, w: number, h: number, t: number): void {
  drawGoldPanel(ctx, centerX, centerY, w, h, t);
  panelPath(ctx, centerX - w / 2, centerY - h / 2, w, h, 22);
  ctx.lineWidth = 4;
  ctx.strokeStyle = `hsl(${(t / 8) % 360}, 90%, 65%)`;
  ctx.stroke();
}

export function drawMutationReveal(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  w: number,
  h: number,
  name: string,
  detail: string,
  t: number
): void {
  drawTransformPanel(ctx, centerX, centerY, w, h, t);
  const y = centerY - h / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_TEXT;
  ctx.textBaseline = 'top';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('✨ Rainbow Fruit Found! ✨', centerX, y + 26);

  ctx.font = '800 28px sans-serif';
  ctx.fillText(name, centerX, y + 68);

  ctx.font = '600 17px sans-serif';
  const lines = wrapText(ctx, detail, w - 80);
  lines.forEach((line, i) => ctx.fillText(line, centerX, y + 122 + i * 25));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawRunSummary(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  w: number,
  h: number,
  stats: RunStats,
  lifetime: LifetimeStats,
  t: number
): void {
  drawGoldPanel(ctx, centerX, centerY, w, h, t);
  const x = centerX - w / 2;
  const y = centerY - h / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_TEXT;
  ctx.font = '800 30px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Run Over', centerX, y + 22);

  const colRunX = x + w - 150;
  const colLifeX = x + w - 40;
  ctx.font = '700 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('This Run', colRunX, y + 62);
  ctx.fillText('Lifetime', colLifeX, y + 62);

  const rows: [string, number, number][] = [
    ['Floor Reached', stats.floorReached, lifetime.bestFloor],
    ['Level', stats.level, lifetime.bestLevel],
    ['Monsters Defeated', stats.monstersDefeated, lifetime.monstersDefeated],
    ['Bosses Defeated', stats.bossesDefeated, lifetime.bossesDefeated],
    ['Treasures Found', stats.treasuresFound, lifetime.treasuresFound],
    ['Traps Found', stats.trapsFound, lifetime.trapsFound],
    ['Rainbow Fruits Found', stats.rainbowFruitsFound, lifetime.rainbowFruitsFound],
  ];

  const rowH = 34;
  const startY = y + 90;
  ctx.font = '600 16px sans-serif';
  rows.forEach(([label, val, lifeVal], i) => {
    const rowY = startY + i * rowH;
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD_TEXT;
    ctx.fillText(label, x + 30, rowY);

    ctx.textAlign = 'right';
    ctx.font = '700 16px sans-serif';
    ctx.fillText(String(val), colRunX, rowY);
    ctx.font = '600 16px sans-serif';
    ctx.fillText(String(lifeVal), colLifeX, rowY);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawMenu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: string[],
  selected: number,
  centered = false,
  glowIndex = -1,
  t = 0
): void {
  drawPanelBg(ctx, x, y, w, h);

  ctx.font = '600 22px sans-serif';
  ctx.textBaseline = 'middle';
  const rowH = h / options.length;
  options.forEach((label, i) => {
    const rowY = y + rowH * i;
    const textY = rowY + rowH / 2;
    ctx.fillStyle = i === selected ? SELECT_GOLD : TEXT_COLOR;
    const text = i === selected ? `> ${label}` : `  ${label}`;
    const prefixW = ctx.measureText('> ').width;
    const labelW = ctx.measureText(label).width;
    const textX = centered ? x + w / 2 - (prefixW + labelW) / 2 : x + 20;

    if (i === glowIndex) {
      const pulse = 0.5 + Math.sin(t / 200) * 0.5;
      ctx.shadowColor = SELECT_GOLD;
      ctx.shadowBlur = 12 + pulse * 10;
    }
    ctx.fillText(text, textX, textY);
    ctx.shadowBlur = 0;

    if (i === selected) {
      ctx.strokeStyle = SELECT_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(textX + prefixW, textY + 15);
      ctx.lineTo(textX + prefixW + labelW, textY + 15);
      ctx.stroke();
    }
  });
}

const LOG_LINE_HEIGHT = 19;
const LOG_PADDING = 14;

function logVisibleLines(h: number): number {
  return Math.max(1, Math.floor((h - LOG_PADDING * 2) / LOG_LINE_HEIGHT));
}

// Letters sit at normal size; a single narrow pulse sweeps left to right
// once per loop (only the letters near the pulse grow larger, then settle
// back as it passes) — used for the one-off "charm vulnerable" log line so
// it reads as a special moment rather than a normal combat message.
const GROW_MS_PER_CHAR = 45;
const GROW_PAUSE_MS = 400;

function drawGrowLine(ctx: CanvasRenderingContext2D, line: string, x: number, y: number, animStart: number, t: number): void {
  let cx = x;
  const cycle = line.length * GROW_MS_PER_CHAR + GROW_PAUSE_MS;
  const local = ((t - animStart) % cycle + cycle) % cycle;
  const pulsePos = local / GROW_MS_PER_CHAR;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const chW = ctx.measureText(ch).width;
    const scale = 1 + Math.max(0, 1 - Math.abs(i - pulsePos) / 6) * 0.4;
    ctx.save();
    ctx.translate(cx + chW / 2, y + 7);
    ctx.scale(scale, scale);
    ctx.fillText(ch, -chW / 2, -7);
    ctx.restore();
    cx += chW;
  }
}

// Always shows the most recent lines that fit (no scrolling) — the log
// panel is a rolling tail of combat history, not a browsable transcript.
export function drawLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lines: string[],
  growIndex = -1,
  growStart = 0,
  t = 0
): void {
  drawPanelBg(ctx, x, y, w, h);

  const visible = logVisibleLines(h);
  const offset = Math.max(0, lines.length - visible);
  const shown = lines.slice(offset);

  ctx.save();
  panelPath(ctx, x, y, w, h);
  ctx.clip();

  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';
  shown.forEach((line, i) => {
    const lineY = y + LOG_PADDING + i * LOG_LINE_HEIGHT;
    if (offset + i === growIndex) {
      ctx.fillStyle = SELECT_GOLD;
      drawGrowLine(ctx, line, x + 16, lineY, growStart, t);
    } else {
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(line, x + 16, lineY, w - 16);
    }
  });
  ctx.restore();
}
