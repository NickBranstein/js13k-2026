// Battle chrome: HP bars, action menu, text log. Rounded, soft-gradient
// panels to match the "unicorns and rainbows" theme rather than flat boxes.

import type { Combatant } from '../game/battle';

const PANEL_BORDER = 'rgba(255,240,250,0.85)';
const TEXT_COLOR = '#f4ecff';
const PANEL_RADIUS = 16;
const HP_LOW_THRESHOLD = 0.5;

function panelPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = PANEL_RADIUS): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// rightX is the panel's right edge, so it stays flush against that edge
// regardless of the text width (which changes slightly with muted state).
export function drawMuteToggle(ctx: CanvasRenderingContext2D, rightX: number, y: number, muted: boolean): void {
  ctx.font = '600 16px sans-serif';
  const text = `[M]ute [${muted ? 'X' : ' '}]`;
  const textW = ctx.measureText(text).width;
  const padX = 14;
  const w = textW + padX * 2;
  const h = 34;
  const x = rightX - w;

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

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '600 19px sans-serif';
  ctx.textBaseline = 'bottom';
  const label = level === undefined ? combatant.name : `${combatant.name}  Lv.${level}`;
  ctx.fillText(label, x + 4, y - 8);

  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const hpText = `${shown} / ${combatant.maxHp}`;
  const onGreen = pct > HP_LOW_THRESHOLD;
  ctx.fillStyle = onGreen ? 'rgba(255,255,255,0.8)' : '#241a38';
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
  const pulse = 0.5 + Math.sin(t / 450) * 0.5;

  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.85);
  glow.addColorStop(0, `rgba(255,214,102,${0.45 + pulse * 0.25})`);
  glow.addColorStop(1, 'rgba(255,214,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  panelPath(ctx, x, y, w, h, 16);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#ffe08a');
  grad.addColorStop(0.5, '#ffb36b');
  grad.addColorStop(1, '#ff8fa3');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  ctx.save();
  panelPath(ctx, x, y, w, h, 16);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.55);
  sheen.addColorStop(0, 'rgba(255,255,255,0.35)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a2f1f';
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
    ctx.fillStyle = 'rgba(244,236,255,0.7)';
    ctx.fillText(label, x + 12, rowCenterY);

    ctx.textAlign = 'right';
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(String(val), x + w - 12, rowCenterY);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawNameTag(ctx: CanvasRenderingContext2D, centerX: number, y: number, name: string): void {
  ctx.font = '600 16px sans-serif';
  const textW = ctx.measureText(name).width;
  const w = textW + 32;
  const h = 32;
  const x = centerX - w / 2;
  drawPanelBg(ctx, x, y, w, h, h / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(name, centerX, y + h / 2);
  ctx.textAlign = 'left';
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

const TITLE_SPARKLE_COLORS = ['#ff9ecb', '#ffd28a', '#fff59e', '#9effc4', '#9ecfff', '#c39eff'];

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
export function drawRunSummary(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  w: number,
  h: number,
  stats: RunStats,
  t: number
): void {
  const x = centerX - w / 2;
  const y = centerY - h / 2;
  const pulse = 0.5 + Math.sin(t / 500) * 0.5;

  ctx.save();
  const glow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, w * 0.65);
  glow.addColorStop(0, `rgba(255,214,102,${0.3 + pulse * 0.15})`);
  glow.addColorStop(1, 'rgba(255,214,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, w * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  panelPath(ctx, x, y, w, h, 22);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#ffe08a');
  grad.addColorStop(0.5, '#ffb36b');
  grad.addColorStop(1, '#ff8fa3');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  ctx.save();
  panelPath(ctx, x, y, w, h, 22);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  sheen.addColorStop(0, 'rgba(255,255,255,0.32)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.5);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a2f1f';
  ctx.font = '800 30px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Run Over', centerX, y + 22);

  const rows: [string, number][] = [
    ['Floor Reached', stats.floorReached],
    ['Level', stats.level],
    ['Monsters Defeated', stats.monstersDefeated],
    ['Bosses Defeated', stats.bossesDefeated],
    ['Treasures Found', stats.treasuresFound],
    ['Traps Found', stats.trapsFound],
    ['Rainbow Fruits Found', stats.rainbowFruitsFound],
  ];

  const rowH = 34;
  const startY = y + 82;
  ctx.font = '600 18px sans-serif';
  rows.forEach(([label, val], i) => {
    const rowY = startY + i * rowH;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a2f1f';
    ctx.fillText(label, x + 40, rowY);
    ctx.textAlign = 'right';
    ctx.font = '700 18px sans-serif';
    ctx.fillText(String(val), x + w - 40, rowY);
    ctx.font = '600 18px sans-serif';
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
  selected: number
): void {
  drawPanelBg(ctx, x, y, w, h);

  ctx.font = '600 22px sans-serif';
  ctx.textBaseline = 'middle';
  const rowH = h / options.length;
  options.forEach((label, i) => {
    const rowY = y + rowH * i;
    const textY = rowY + rowH / 2;
    ctx.fillStyle = i === selected ? '#ffd166' : TEXT_COLOR;
    const text = i === selected ? `> ${label}` : `  ${label}`;
    ctx.fillText(text, x + 20, textY);

    if (i === selected) {
      const prefixW = ctx.measureText('> ').width;
      const labelW = ctx.measureText(label).width;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 20 + prefixW, textY + 15);
      ctx.lineTo(x + 20 + prefixW + labelW, textY + 15);
      ctx.stroke();
    }
  });
}

const LOG_LINE_HEIGHT = 19;
const LOG_PADDING = 14;
const LOG_SCROLLBAR_W = 8;

function logVisibleLines(h: number): number {
  return Math.max(1, Math.floor((h - LOG_PADDING * 2) / LOG_LINE_HEIGHT));
}

export function maxLogScroll(totalLines: number, h: number): number {
  return Math.max(0, totalLines - logVisibleLines(h));
}

export function drawLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lines: string[],
  scroll: number
): void {
  drawPanelBg(ctx, x, y, w, h);

  const visible = logVisibleLines(h);
  const maxScroll = maxLogScroll(lines.length, h);
  const clampedScroll = Math.min(Math.max(0, scroll), maxScroll);
  const shown = lines.slice(clampedScroll, clampedScroll + visible);

  const hasScrollbar = lines.length > visible;
  const textW = hasScrollbar ? w - LOG_SCROLLBAR_W - 12 : w - 16;

  ctx.save();
  panelPath(ctx, x, y, w, h);
  ctx.clip();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';
  shown.forEach((line, i) => {
    ctx.fillText(line, x + 16, y + LOG_PADDING + i * LOG_LINE_HEIGHT, textW);
  });
  ctx.restore();

  if (hasScrollbar) {
    const trackX = x + w - LOG_SCROLLBAR_W - 6;
    const trackY = y + 6;
    const trackH = h - 12;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, LOG_SCROLLBAR_W, trackH, LOG_SCROLLBAR_W / 2);
    ctx.fillStyle = 'rgba(36,26,56,0.3)';
    ctx.fill();

    const thumbH = Math.max(20, (visible / lines.length) * trackH);
    const thumbY = trackY + (maxScroll === 0 ? 0 : (clampedScroll / maxScroll) * (trackH - thumbH));
    ctx.beginPath();
    ctx.roundRect(trackX, thumbY, LOG_SCROLLBAR_W, thumbH, LOG_SCROLLBAR_W / 2);
    ctx.fillStyle = PANEL_BORDER;
    ctx.fill();
  }
}
