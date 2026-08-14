// Monster rendering. One draw function per archetype, dispatched from drawMonster().
// Flat shapes + outline, matching the unicorn renderer's visual language.
//
// Archetypes are drawn assuming a right-facing pose; drawMonster() flips them to
// face left (toward the player). Name suffix drives a shape accessory and name
// prefix drives the palette (see game/monster.ts) so a monster's look follows its
// rolled name instead of being independently randomized.

import type { MonsterTraits } from '../game/monster';
import { INK_OUTLINE as OUTLINE } from './unicorn';
import { TEXT_COLOR } from './ui';

function fillStroke(ctx: CanvasRenderingContext2D, fill: string): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();
}

function drawGroundShadow(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = 'rgba(20,10,10,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, spread: number, r: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(cx - spread, cy, r, 0, Math.PI * 2);
  ctx.arc(cx + spread, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlob(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const bob = Math.sin(t / 400) * 4 * s;
  const r = 46 * s;

  drawGroundShadow(ctx, r);

  ctx.save();
  ctx.translate(0, bob);

  if (traits.nameSuffix === 'Ooze') {
    // drippy protrusions hanging from the underside
    ctx.fillStyle = traits.palette.base;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    [-0.5, 0, 0.5].forEach((dx) => {
      ctx.beginPath();
      ctx.ellipse(dx * r, r * 0.7 + Math.sin(t / 300 + dx * 4) * 2 * s, r * 0.14, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  ctx.beginPath();
  if (traits.nameSuffix === 'Glob') {
    // lumpy outline instead of a smooth ellipse
    const bumps = 8;
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * 3 + traits.seed) * 0.08;
      const px = Math.cos(a) * r * wobble;
      const py = Math.sin(a) * r * 0.85 * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
  }
  fillStroke(ctx, traits.palette.base);

  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.35, r * 0.25, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = traits.palette.light;
  ctx.fill();

  drawEyes(ctx, 0, -r * 0.05, r * 0.28, r * 0.1);
  ctx.restore();
}

function drawQuadrupedTail(ctx: CanvasRenderingContext2D, bodyR: number, suffix: string, palette: MonsterTraits['palette'], t: number): void {
  const sway = Math.sin(t / 320) * 0.15;
  const baseX = -bodyR * 0.85;
  const baseY = -bodyR * 0.05;

  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = palette.dark;

  if (suffix === 'Hound') {
    // slim whip tail
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(
      baseX - bodyR * 0.6,
      baseY - bodyR * (0.3 + sway),
      baseX - bodyR * 0.95,
      baseY - bodyR * (0.05 + sway)
    );
    ctx.stroke();
  } else if (suffix === 'Boar') {
    // short curly tail
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(baseX - bodyR * 0.18, baseY - bodyR * 0.12, bodyR * 0.16, 0.2 + sway, Math.PI * 1.6 + sway);
    ctx.stroke();
  } else {
    // Stag: short tail with a tufted tip
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX - bodyR * 0.3, baseY - bodyR * (0.35 + sway), baseX - bodyR * 0.4, baseY - bodyR * (0.5 + sway));
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(baseX - bodyR * 0.4, baseY - bodyR * (0.5 + sway), bodyR * 0.1, bodyR * 0.14, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawQuadrupedHeadAccessory(ctx: CanvasRenderingContext2D, bodyR: number, suffix: string, palette: MonsterTraits['palette']): void {
  ctx.fillStyle = palette.dark;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;

  if (suffix === 'Hound') {
    // floppy ears drooping from the sides of the head
    [bodyR * 0.68, bodyR * 1.02].forEach((ex) => {
      ctx.beginPath();
      ctx.ellipse(ex, -bodyR * 0.1, bodyR * 0.14, bodyR * 0.26, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (suffix === 'Boar') {
    // short pointed ears
    ctx.beginPath();
    ctx.moveTo(bodyR * 0.72, -bodyR * 0.48);
    ctx.lineTo(bodyR * 0.65, -bodyR * 0.72);
    ctx.lineTo(bodyR * 0.85, -bodyR * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // tusks
    ctx.fillStyle = TEXT_COLOR;
    ctx.beginPath();
    ctx.moveTo(bodyR * 1.15, -bodyR * 0.08);
    ctx.quadraticCurveTo(bodyR * 1.3, -bodyR * 0.02, bodyR * 1.22, bodyR * 0.12);
    ctx.lineTo(bodyR * 1.12, bodyR * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Stag: branching antlers (main beam + one fork per side)
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.dark;
    [bodyR * 0.75, bodyR * 1.0].forEach((ax) => {
      ctx.beginPath();
      ctx.moveTo(ax, -bodyR * 0.5);
      ctx.lineTo(ax - bodyR * 0.05, -bodyR * 0.95);
      ctx.moveTo(ax - bodyR * 0.03, -bodyR * 0.8);
      ctx.lineTo(ax - bodyR * 0.2, -bodyR * 0.9);
      ctx.stroke();
    });
    ctx.strokeStyle = OUTLINE;
  }
}

function drawQuadruped(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const bob = Math.sin(t / 350) * 3 * s;
  const bodyR = 40 * s;
  const suffix = traits.nameSuffix;

  drawGroundShadow(ctx, bodyR * 1.1);

  ctx.save();
  ctx.translate(0, bob);

  drawQuadrupedTail(ctx, bodyR, suffix, traits.palette, t);

  // legs
  ctx.fillStyle = traits.palette.dark;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  const legY = bodyR * 0.55;
  [-0.7, -0.25, 0.25, 0.7].forEach((lx, i) => {
    const stride = Math.sin(t / 250 + i * 1.6) * 4 * s;
    ctx.beginPath();
    ctx.roundRect(lx * bodyR - 5 * s, legY - 4 * s + stride, 10 * s, 26 * s, 4 * s);
    ctx.fill();
    ctx.stroke();
  });

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyR, bodyR * 0.62, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.base);

  // head
  ctx.beginPath();
  ctx.ellipse(bodyR * 0.85, -bodyR * 0.25, bodyR * 0.38, bodyR * 0.32, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.light);

  drawQuadrupedHeadAccessory(ctx, bodyR, suffix, traits.palette);

  drawEyes(ctx, bodyR * 0.95, -bodyR * 0.3, bodyR * 0.12, bodyR * 0.06);
  ctx.restore();
}

function drawWing(ctx: CanvasRenderingContext2D, bodyR: number, flap: number, color: string, big: boolean): void {
  const span = big ? 1.5 : 1.0;
  ctx.save();
  ctx.translate(-bodyR * 0.1, -bodyR * 0.1);
  ctx.rotate(flap);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-bodyR * 0.5 * span, -bodyR * 0.3 * span, -bodyR * 0.9 * span, bodyR * 0.15 * span);
  ctx.quadraticCurveTo(-bodyR * 0.4 * span, bodyR * 0.1 * span, 0, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAvian(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const bob = Math.sin(t / 380) * 4 * s;
  const bodyR = 32 * s;
  const suffix = traits.nameSuffix;
  const flap = Math.sin(t / 170) * (suffix === 'Roc' ? 0.7 : 0.5);
  const wingSpan = suffix === 'Roc';

  drawGroundShadow(ctx, bodyR * 1.1);

  ctx.save();
  ctx.translate(0, bob);

  drawWing(ctx, bodyR, flap - 0.3, traits.palette.dark, wingSpan);

  // tail feathers
  const tailFan = suffix === 'Roc' ? 3 : 2;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = traits.palette.dark;
  ctx.lineWidth = 2;
  for (let i = 0; i < tailFan; i++) {
    const a = (i / (tailFan - 1 || 1) - 0.5) * 0.8;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.7, 0);
    ctx.lineTo(-bodyR * (1.3 + tailFan * 0.1), Math.sin(a) * bodyR * 0.5);
    ctx.lineTo(-bodyR * 0.9, bodyR * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // legs
  ctx.strokeStyle = traits.palette.dark;
  ctx.lineWidth = 3;
  [-0.15, 0.15].forEach((lx) => {
    ctx.beginPath();
    ctx.moveTo(lx * bodyR, bodyR * 0.6);
    ctx.lineTo(lx * bodyR, bodyR * 1.0);
    ctx.stroke();
  });
  if (suffix === 'Harpy') {
    // small clawed feet
    ctx.fillStyle = traits.palette.dark;
    [-0.15, 0.15].forEach((lx) => {
      ctx.beginPath();
      ctx.moveTo(lx * bodyR - bodyR * 0.1, bodyR * 1.0);
      ctx.lineTo(lx * bodyR + bodyR * 0.1, bodyR * 1.0);
      ctx.lineTo(lx * bodyR, bodyR * 1.15);
      ctx.closePath();
      ctx.fill();
    });
  }

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyR, bodyR * 0.8, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.base);

  // head
  ctx.beginPath();
  ctx.ellipse(bodyR * 0.85, -bodyR * 0.4, bodyR * 0.3, bodyR * 0.27, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.light);

  if (suffix === 'Jay') {
    // crest feather
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bodyR * 0.75, -bodyR * 0.65);
    ctx.lineTo(bodyR * 0.65, -bodyR * 0.95);
    ctx.stroke();
  }

  // beak
  ctx.beginPath();
  ctx.moveTo(bodyR * 1.1, -bodyR * 0.4);
  ctx.lineTo(bodyR * 1.4, -bodyR * 0.33);
  ctx.lineTo(bodyR * 1.1, -bodyR * 0.25);
  ctx.closePath();
  ctx.fillStyle = '#f0c05c';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  drawWing(ctx, bodyR, flap, traits.palette.base, wingSpan);
  drawEyes(ctx, bodyR * 0.9, -bodyR * 0.45, bodyR * 0.1, bodyR * 0.05);
  ctx.restore();
}

function drawArachnid(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const bodyR = suffix === 'Crawler' ? 26 * s : 20 * s;
  const legLen = suffix === 'Weaver' ? 1.3 : 1.0;
  const bob = Math.sin(t / 260) * 2 * s;

  drawGroundShadow(ctx, bodyR * 2.4 * legLen);

  ctx.save();
  ctx.translate(0, bob);

  // legs: 4 per side, bent at a knee point
  ctx.strokeStyle = traits.palette.dark;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const spread = (i - 1.5) * 0.5;
      const phase = Math.sin(t / 200 + i * 1.3 + side) * 0.12;
      const kneeX = side * bodyR * (1.1 + i * 0.15) * legLen;
      const kneeY = -bodyR * 0.3 + spread * bodyR * 0.4;
      const footX = side * bodyR * (1.8 + i * 0.2) * legLen;
      const footY = bodyR * 0.9 + phase * bodyR;
      ctx.beginPath();
      ctx.moveTo(0, -bodyR * 0.1);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  // abdomen (rear) + cephalothorax (front)
  ctx.beginPath();
  ctx.ellipse(-bodyR * 0.5, 0, bodyR * (suffix === 'Weaver' ? 0.9 : 0.7), bodyR * 0.6, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.base);

  ctx.beginPath();
  ctx.ellipse(bodyR * 0.5, -bodyR * 0.1, bodyR * 0.45, bodyR * 0.4, 0, 0, Math.PI * 2);
  fillStroke(ctx, traits.palette.light);

  if (suffix === 'Spinner') {
    // trailing web line
    ctx.strokeStyle = 'rgba(244,236,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 1.1, -bodyR * 0.2);
    ctx.lineTo(-bodyR * 2.2, -bodyR * 0.6);
    ctx.stroke();
  }

  drawEyes(ctx, bodyR * 0.6, -bodyR * 0.15, bodyR * 0.16, bodyR * 0.06);
  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const r = 42 * s;
  const bob = Math.sin(t / 450) * 2 * s;
  const glow = 0.5 + Math.sin(t / 220) * 0.5;

  drawGroundShadow(ctx, r);

  ctx.save();
  ctx.translate(0, bob);

  // angular gem body — straight-line polygon, no curves
  const points: [number, number][] =
    suffix === 'Sentinel'
      ? [
          [0, -r * 1.3],
          [r * 0.4, -r * 0.4],
          [r * 0.3, r * 0.9],
          [0, r * 1.1],
          [-r * 0.3, r * 0.9],
          [-r * 0.4, -r * 0.4],
        ]
      : [
          [0, -r],
          [r * 0.75, -r * 0.3],
          [r * 0.55, r * 0.8],
          [-r * 0.55, r * 0.8],
          [-r * 0.75, -r * 0.3],
        ];

  ctx.beginPath();
  points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  fillStroke(ctx, traits.palette.base);

  // facet line for depth
  ctx.strokeStyle = traits.palette.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, points[0][1]);
  ctx.lineTo(0, points[Math.floor(points.length / 2)][1]);
  ctx.stroke();

  if (suffix === 'Warden') {
    // jagged spike crown
    ctx.fillStyle = traits.palette.light;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.35, -r * 0.85);
      ctx.lineTo(i * r * 0.35 - r * 0.1, -r * (1.2 + Math.abs(i) * 0.2));
      ctx.lineTo(i * r * 0.35 + r * 0.1, -r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // glowing eye/core
  ctx.fillStyle = `rgba(244,236,255,${0.4 + glow * 0.6})`;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSeaCreature(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const bob = Math.sin(t / 420) * 3 * s;
  const len = 60 * s;
  const swim = Math.sin(t / 280) * 0.15;

  drawGroundShadow(ctx, len * 0.7);

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(swim * 0.15);

  if (suffix === 'Crab') {
    // round shell body + pincers + short legs
    const scuttle = Math.sin(t / 200) * 3 * s;
    ctx.strokeStyle = traits.palette.dark;
    ctx.lineWidth = 3 * s;
    for (let i = 0; i < 3; i++) {
      const lx = (i - 1) * len * 0.35;
      ctx.beginPath();
      ctx.moveTo(lx, len * 0.3);
      ctx.lineTo(lx + scuttle, len * 0.55);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.55, len * 0.4, 0, 0, Math.PI * 2);
    fillStroke(ctx, traits.palette.base);
    // pincers
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(side * len * 0.6, -len * 0.15, len * 0.2, len * 0.14, side * 0.4, 0, Math.PI * 2);
      fillStroke(ctx, traits.palette.light);
    });
    drawEyes(ctx, 0, -len * 0.35, len * 0.14, len * 0.05);
  } else if (suffix === 'Ray') {
    // flat wide body with sweeping wing fins
    ctx.beginPath();
    ctx.moveTo(len * 0.7, 0);
    ctx.quadraticCurveTo(len * 0.1, -len * (0.55 + swim), -len * 0.4, -len * 0.15);
    ctx.quadraticCurveTo(-len * 0.65, 0, -len * 0.4, len * 0.15);
    ctx.quadraticCurveTo(len * 0.1, len * (0.55 - swim), len * 0.7, 0);
    ctx.closePath();
    fillStroke(ctx, traits.palette.base);
    // tail
    ctx.strokeStyle = traits.palette.dark;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(-len * 0.55, 0);
    ctx.lineTo(-len * 0.95, swim * len * 0.3);
    ctx.stroke();
    drawEyes(ctx, len * 0.35, -len * 0.06, len * 0.08, len * 0.04);
  } else {
    // Pike: elongated fish body with pointed snout + dorsal fin
    ctx.beginPath();
    ctx.moveTo(len * 0.75, 0);
    ctx.quadraticCurveTo(len * 0.2, -len * 0.3, -len * 0.55, -len * 0.12 + swim * len);
    ctx.quadraticCurveTo(-len * 0.75, 0, -len * 0.55, len * 0.12 - swim * len);
    ctx.quadraticCurveTo(len * 0.2, len * 0.3, len * 0.75, 0);
    ctx.closePath();
    fillStroke(ctx, traits.palette.base);
    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-len * 0.05, -len * 0.22);
    ctx.lineTo(len * 0.15, -len * 0.5);
    ctx.lineTo(len * 0.3, -len * 0.22);
    ctx.closePath();
    fillStroke(ctx, traits.palette.dark);
    drawEyes(ctx, len * 0.45, -len * 0.02, len * 0.07, len * 0.035);
  }

  ctx.restore();
}

function drawFlora(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const sway = Math.sin(t / 500) * 0.08;
  const stemH = 60 * s;

  drawGroundShadow(ctx, stemH * 0.5);

  ctx.save();
  ctx.rotate(sway);

  // roots
  ctx.strokeStyle = traits.palette.dark;
  ctx.lineWidth = 3 * s;
  [-0.3, 0, 0.3].forEach((rx) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(rx * stemH * 0.4, stemH * 0.05, rx * stemH * 0.6, stemH * 0.15);
    ctx.stroke();
  });

  // stem
  ctx.strokeStyle = traits.palette.base;
  ctx.lineWidth = 8 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(stemH * 0.1, -stemH * 0.5, 0, -stemH);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.translate(0, -stemH);

  if (suffix === 'Fungling') {
    // mushroom dome + gills
    ctx.beginPath();
    ctx.arc(0, 0, stemH * 0.45, Math.PI, 0);
    fillStroke(ctx, traits.palette.light);
    ctx.strokeStyle = traits.palette.dark;
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * stemH * 0.06, 0);
      ctx.lineTo(i * stemH * 0.05, stemH * 0.06);
      ctx.stroke();
    }
  } else if (suffix === 'Bramblekin') {
    // jagged thorny crown
    const spikes = 7;
    ctx.beginPath();
    for (let i = 0; i <= spikes; i++) {
      const a = Math.PI + (i / spikes) * Math.PI;
      const rad = i % 2 === 0 ? stemH * 0.35 : stemH * 0.5;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    fillStroke(ctx, traits.palette.dark);
  } else {
    // Bloom: flower petal cap
    const petals = 6;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -stemH * 0.32, stemH * 0.16, stemH * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? traits.palette.light : traits.palette.base;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, stemH * 0.14, 0, Math.PI * 2);
    fillStroke(ctx, traits.palette.dark);
  }

  drawEyes(ctx, 0, stemH * 0.02, stemH * 0.1, stemH * 0.04);
  ctx.restore();
}

function drawRobot(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const r = 34 * s;
  const glow = 0.5 + Math.sin(t / 260) * 0.5;

  if (suffix === 'Drone') {
    const hover = Math.sin(t / 300) * 6 * s;
    drawGroundShadow(ctx, r * 0.7);
    ctx.save();
    ctx.translate(0, hover - r * 0.3);

    // ring
    ctx.strokeStyle = traits.palette.dark;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    fillStroke(ctx, traits.palette.base);

    ctx.fillStyle = `rgba(127,224,224,${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.arc(r * 0.15, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  drawGroundShadow(ctx, r * 1.3);

  ctx.save();

  if (suffix === 'Sentrybot') {
    // wheeled/treaded base + rotating turret top
    const rot = t / 900;
    ctx.fillStyle = traits.palette.dark;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-r * 1.1, r * 0.3, r * 2.2, r * 0.5, r * 0.15);
    ctx.fill();
    ctx.stroke();
    [-0.75, -0.25, 0.25, 0.75].forEach((wx) => {
      ctx.beginPath();
      ctx.arc(wx * r, r * 0.8, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.save();
    ctx.translate(0, r * 0.1);
    ctx.rotate(Math.sin(rot) * 0.5);
    ctx.beginPath();
    ctx.roundRect(-r * 0.6, -r * 0.5, r * 1.2, r * 0.7, r * 0.1);
    fillStroke(ctx, traits.palette.base);
    // turret barrel
    ctx.fillStyle = traits.palette.dark;
    ctx.fillRect(r * 0.5, -r * 0.12, r * 0.5, r * 0.24);
    ctx.strokeRect(r * 0.5, -r * 0.12, r * 0.5, r * 0.24);
    ctx.fillStyle = `rgba(224,180,92,${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Automaton: boxy biped
    const stride = Math.sin(t / 260) * 4 * s;
    ctx.fillStyle = traits.palette.dark;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    [-0.3, 0.3].forEach((lx, i) => {
      ctx.beginPath();
      ctx.roundRect(lx * r - r * 0.15, r * 0.5 + (i === 0 ? stride : -stride) * 0.3, r * 0.3, r * 0.7, r * 0.06);
      ctx.fill();
      ctx.stroke();
    });
    // arms
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.roundRect(side * r * 1.0 - r * 0.12, -r * 0.2, r * 0.24, r * 0.65, r * 0.06);
      ctx.fill();
      ctx.stroke();
    });
    // torso
    ctx.beginPath();
    ctx.roundRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.0, r * 0.1);
    fillStroke(ctx, traits.palette.base);
    // head
    ctx.beginPath();
    ctx.roundRect(-r * 0.32, -r * 1.05, r * 0.64, r * 0.55, r * 0.08);
    fillStroke(ctx, traits.palette.light);
    // antenna
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.lineTo(0, -r * 1.3);
    ctx.stroke();
    ctx.fillStyle = `rgba(224,180,92,${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, -r * 1.3, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // eye lens
    ctx.fillStyle = `rgba(127,224,224,${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.arc(r * 0.05, -r * 0.78, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSwarm(ctx: CanvasRenderingContext2D, traits: MonsterTraits, t: number): void {
  const s = traits.scale;
  const suffix = traits.nameSuffix;
  const count = suffix === 'Cloud' ? 8 : suffix === 'Flurry' ? 5 : 6;
  const spread = suffix === 'Cloud' ? 46 * s : 30 * s;
  const speed = suffix === 'Flurry' ? 260 : 420;
  const alpha = suffix === 'Cloud' ? 0.75 : 1;

  drawGroundShadow(ctx, spread * 0.8);

  for (let i = 0; i < count; i++) {
    const phase = (i / count) * Math.PI * 2 + traits.seed;
    const orbit = spread * (0.4 + 0.3 * Math.sin(phase * 2));
    const px = Math.cos(t / speed + phase) * orbit;
    const py = Math.sin(t / (speed * 0.8) + phase * 1.3) * orbit * 0.6 - spread * 0.2;
    const r = (5 + 2 * Math.sin(phase * 3)) * s;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? traits.palette.base : traits.palette.light;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawMonster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  traits: MonsterTraits,
  t: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1); // archetypes are drawn facing right by convention; flip to face the player on the left

  switch (traits.archetype) {
    case 'Blob':
      drawBlob(ctx, traits, t);
      break;
    case 'Quadruped':
      drawQuadruped(ctx, traits, t);
      break;
    case 'Avian':
      drawAvian(ctx, traits, t);
      break;
    case 'Arachnid':
      drawArachnid(ctx, traits, t);
      break;
    case 'Crystal':
      drawCrystal(ctx, traits, t);
      break;
    case 'SeaCreature':
      drawSeaCreature(ctx, traits, t);
      break;
    case 'Flora':
      drawFlora(ctx, traits, t);
      break;
    case 'Robot':
      drawRobot(ctx, traits, t);
      break;
    case 'Swarm':
      drawSwarm(ctx, traits, t);
      break;
  }

  ctx.restore();
}
