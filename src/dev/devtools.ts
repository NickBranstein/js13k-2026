// All dev/test-only tooling lives here, in one place, so it's easy to find
// and easy to confirm is fully gated behind __DEV__. Every export here is
// dead-code-eliminated from the production build (see tools/build.mjs and
// src/global.d.ts) — none of this ships.
//
// Two panels:
//  - Mutation panel (` to toggle, outside Title): instantly grants any
//    mutation item or a potion, for testing mutation effects without
//    grinding for drops.
//  - Unicorn Lab (L to toggle, works on Title too): lets you dial in any
//    combination of the unicorn's randomized traits directly and see the
//    result live on the preview sprite.

import { drawMenu } from '../render/ui';
import {
  COATS,
  MANE_MOODS,
  MANE_STYLES,
  PATTERNS,
  PATTERN_COLORS,
  EYE_COLORS,
  GLOW_SHAPES,
  type UnicornTraits,
} from '../render/unicorn';
import { MUTATION_ITEMS } from '../game/item';
import type { Combatant } from '../game/battle';

export interface DevToolsHost {
  state: string;
  traits: UnicornTraits;
  player: Combatant | undefined;
  grantPotion: () => void;
}

// ---------- mutation panel ----------
// Lazily built (inside a function, not at module top-level) so terser can
// prove the whole thing dead and drop it when unreferenced — a top-level
// const built from .map() calls survives in production even when unused,
// because ES module semantics preserve a module's top-level side effects
// just from being imported, regardless of whether its exports are read.
let debugLabelsCache: string[] | null = null;
function debugLabels(): string[] {
  if (!debugLabelsCache) debugLabelsCache = [...MUTATION_ITEMS.map((m) => m.name), 'Rainbow Potion +1'];
  return debugLabelsCache;
}
let debugOpen = false;
let debugSelected = 0;

function applyDebugMutation(index: number, host: DevToolsHost): void {
  if (!host.player) return;
  if (index < MUTATION_ITEMS.length) {
    const item = MUTATION_ITEMS[index];
    const detail = item.apply(host.player, host.traits, Math.random);
    console.log(`[debug] ${item.name}: ${detail}`);
  } else {
    host.grantPotion();
    console.log('[debug] +1 Rainbow Potion');
  }
}

// ---------- unicorn lab ----------
interface LabCategory {
  name: string;
  values: string[];
  apply: (traits: UnicornTraits, index: number) => void;
}

let labCategoriesCache: LabCategory[] | null = null;
function labCategories(): LabCategory[] {
  if (labCategoriesCache) return labCategoriesCache;
  labCategoriesCache = [
    {
      name: 'Coat',
      values: COATS.map((c) => c.name),
      apply: (t, i) => {
        t.coat = COATS[i];
      },
    },
    {
      name: 'Mane Mood',
      values: MANE_MOODS.map((m) => m.name),
      apply: (t, i) => {
        t.maneStops = MANE_MOODS[i].stops;
      },
    },
    {
      name: 'Mane Style',
      values: MANE_STYLES,
      apply: (t, i) => {
        t.style = MANE_STYLES[i];
        t.strandCount = t.style === 'Wispy' ? 4 : t.style === 'Braided' ? 5 : 7;
      },
    },
    {
      name: 'Horn Mood',
      values: MANE_MOODS.map((m) => m.name),
      apply: (t, i) => {
        const stops = MANE_MOODS[i].stops;
        t.hornPalette = [stops[0], stops[1] ?? stops[0]];
      },
    },
    {
      name: 'Pattern',
      values: ['None', ...PATTERNS],
      apply: (t, i) => {
        t.pattern = i === 0 ? '' : PATTERNS[i - 1];
      },
    },
    {
      name: 'Pattern Color',
      values: PATTERN_COLORS,
      apply: (t, i) => {
        t.patternColor = PATTERN_COLORS[i];
      },
    },
    {
      name: 'Eye',
      values: EYE_COLORS,
      apply: (t, i) => {
        t.eye = EYE_COLORS[i];
      },
    },
    {
      name: 'Glow Shape',
      values: ['None', ...GLOW_SHAPES],
      apply: (t, i) => {
        t.glowShape = i === 0 ? 'Dot' : GLOW_SHAPES[i - 1];
        t.glowColor = i === 0 ? '' : t.glowColor || PATTERN_COLORS[0];
      },
    },
    {
      name: 'Glow Color',
      values: PATTERN_COLORS,
      apply: (t, i) => {
        t.glowColor = PATTERN_COLORS[i];
      },
    },
  ];
  return labCategoriesCache;
}

let labOpen = false;
let labCategoryIndex = 0;
let labValueIndexCache: number[] | null = null;
function labValueIndex(): number[] {
  if (!labValueIndexCache) labValueIndexCache = labCategories().map(() => 0);
  return labValueIndexCache;
}

function cycleLabValue(dir: number, host: DevToolsHost): void {
  const cats = labCategories();
  const idx = labValueIndex();
  const cat = cats[labCategoryIndex];
  const n = cat.values.length;
  idx[labCategoryIndex] = (idx[labCategoryIndex] + dir + n) % n;
  cat.apply(host.traits, idx[labCategoryIndex]);
}

// ---------- input ----------
// Returns true if the key was consumed by a dev panel, so main.ts's own
// keydown handling knows to stop (matches the pre-refactor behavior).
export function handleDevKeydown(e: KeyboardEvent, host: DevToolsHost): boolean {
  if (e.key === '`' && host.state !== 'Title') {
    debugOpen = !debugOpen;
    labOpen = false;
    return true;
  }
  if (debugOpen) {
    const n = debugLabels().length;
    if (e.key === 'ArrowUp' || e.key === 'w') {
      debugSelected = (debugSelected + n - 1) % n;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      debugSelected = (debugSelected + 1) % n;
    } else if (e.key === 'Enter' || e.key === ' ') {
      applyDebugMutation(debugSelected, host);
    } else if (e.key === 'Escape') {
      debugOpen = false;
    }
    return true;
  }
  if (e.key === 'l' || e.key === 'L') {
    labOpen = !labOpen;
    debugOpen = false;
    return true;
  }
  if (labOpen) {
    const n = labCategories().length;
    if (e.key === 'ArrowUp' || e.key === 'w') {
      labCategoryIndex = (labCategoryIndex + n - 1) % n;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      labCategoryIndex = (labCategoryIndex + 1) % n;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
      cycleLabValue(-1, host);
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      cycleLabValue(1, host);
    } else if (e.key === 'Escape') {
      labOpen = false;
    }
    return true;
  }
  return false;
}

// ---------- render ----------
export function drawDevTools(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
  if (debugOpen) {
    const labels = debugLabels();
    drawMenu(ctx, canvasWidth - 260, 60, 240, labels.length * 34, labels, debugSelected);
  }
  if (labOpen) {
    const cats = labCategories();
    const idx = labValueIndex();
    const x = 20;
    const y = 60;
    const w = 320;
    const rowH = 26;
    const h = cats.length * rowH + 46;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fillStyle = 'rgba(30,20,50,0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,240,250,0.85)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 15px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('Unicorn Lab — arrows to dial, L to close', x + 14, y + 12);

    ctx.font = '600 14px sans-serif';
    cats.forEach((cat, i) => {
      const rowY = y + 38 + i * rowH;
      const active = i === labCategoryIndex;
      ctx.fillStyle = active ? '#ffd166' : '#f4ecff';
      const val = cat.values[idx[i] % cat.values.length];
      ctx.fillText(`${active ? '> ' : '  '}${cat.name}: ${val}`, x + 14, rowY);
    });
    ctx.textBaseline = 'alphabetic';
  }
}
