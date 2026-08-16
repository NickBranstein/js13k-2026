// Procedural monster generation. Same seed -> trait pattern as unicorn.ts,
// generalized so it can be reused by the dungeon encounter system later.

import { mulberry32, range } from './rng';
import { hslToHex } from '../render/shared';

export interface MonsterPalette {
  base: string;
  light: string;
  dark: string;
}

// Raw generation params for a MonsterPalette — one hue, one shared across
// base/light/dark (reverse-engineered from the original hand-picked hex
// triples, which always shared a hue and varied only in saturation/
// lightness), derived into real hex via derivePalette() at roll time.
interface PaletteSeed {
  hue: number;
  sB: number;
  lB: number;
  sL: number;
  lL: number;
  sD: number;
  lD: number;
}

function derivePalette(p: PaletteSeed): MonsterPalette {
  return {
    base: hslToHex(p.hue, p.sB, p.lB),
    light: hslToHex(p.hue, p.sL, p.lL),
    dark: hslToHex(p.hue, p.sD, p.lD),
  };
}

// Archetype is the same numeric identity as MONSTER_DRAWERS' index in
// render/monster.ts. variant's meaning depends on which archetype it belongs
// to (e.g. 1 means Ooze for Blob but Boar for Quadruped) — see the per-
// archetype *Variant enums below, used by render/monster.ts's draw functions
// instead of bare numbers, matching NAME_SUFFIXES' order exactly.
export const enum Archetype { Blob, Quadruped, Avian, Arachnid, Crystal, SeaCreature, Flora, Robot, Swarm }
export const enum BlobVariant { Blob, Ooze, Glob }
export const enum QuadrupedVariant { Lynx, Boar, Stag }
export const enum AvianVariant { Roc, Harpy, Jay }
export const enum ArachnidVariant { Spinner, Crawler, Weaver }
export const enum CrystalVariant { Golem, Sentinel, Warden }
export const enum SeaCreatureVariant { Ray, Crab, Pike }
export const enum FloraVariant { Bloom, Fungling, Bramblekin }
export const enum RobotVariant { Automaton, Drone, Sentrybot }
export const enum SwarmVariant { Swarm, Cloud, Flurry }

export interface MonsterTraits {
  seed: number;
  archetypeIndex: Archetype;
  prefixIndex: number;
  variant: number;
  name: string;
  namePrefix: string;
  palette: MonsterPalette;
  scale: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  isBoss: boolean;
}

// These tables and render/monster.ts's drawer table are indexed in lockstep
// (0 = Blob, 1 = Quadruped, ...). Keeping that index numeric avoids shipping
// an archetype-name table and a string-based renderer switch.

// Each entry pairs a name prefix with its palette directly (previously a
// separate PALETTE_BY_PREFIX lookup keyed by prefix name) — the two were
// always 1:1, so pairing them removes a second table that had to be kept in
// sync by hand whenever a prefix was added.
const NAME_PREFIXES: [string, PaletteSeed][][] = [
  /* Blob */ [
    ['Shade', { hue: 267, sB: 28, lB: 43, sL: 40, lL: 60, sD: 32, lD: 30 }],
    ['Murk', { hue: 153, sB: 19, lB: 30, sL: 17, lL: 44, sD: 20, lD: 21 }],
    ['Gloom', { hue: 216, sB: 16, lB: 35, sL: 12, lL: 49, sD: 16, lD: 24 }],
    ['Sludge', { hue: 51, sB: 17, lB: 37, sL: 21, lL: 54, sD: 17, lD: 25 }],
  ],
  /* Quadruped */ [
    ['Bramble', { hue: 137, sB: 23, lB: 40, sL: 25, lL: 55, sD: 26, lD: 28 }],
    ['Ash', { hue: 0, sB: 0, lB: 48, sL: 0, lL: 64, sD: 0, lD: 32 }],
    ['Iron', { hue: 210, sB: 10, lB: 40, sL: 12, lL: 59, sD: 12, lD: 27 }],
    ['Storm', { hue: 209, sB: 28, lB: 43, sL: 40, lL: 60, sD: 32, lD: 30 }],
  ],
  /* Avian */ [
    ['Feather', { hue: 213, sB: 46, lB: 56, sL: 51, lL: 70, sD: 37, lD: 38 }],
    ['Sky', { hue: 211, sB: 58, lB: 64, sL: 62, lL: 76, sD: 35, lD: 45 }],
    ['Crow', { hue: 240, sB: 6, lB: 24, sL: 5, lL: 38, sD: 7, lD: 16 }],
    ['Gale', { hue: 204, sB: 17, lB: 56, sL: 22, lL: 72, sD: 14, lD: 39 }],
  ],
  /* Arachnid */ [
    ['Web', { hue: 240, sB: 4, lB: 44, sL: 4, lL: 59, sD: 5, lD: 30 }],
    ['Cave', { hue: 28, sB: 23, lB: 29, sL: 20, lL: 45, sD: 23, lD: 19 }],
    ['Widow', { hue: 345, sB: 32, lB: 27, sL: 27, lL: 43, sD: 33, lD: 18 }],
    ['Dust', { hue: 39, sB: 28, lB: 50, sL: 37, lL: 65, sD: 32, lD: 37 }],
  ],
  /* Crystal */ [
    ['Prism', { hue: 282, sB: 46, lB: 56, sL: 58, lL: 71, sD: 43, lD: 42 }],
    ['Quartz', { hue: 326, sB: 42, lB: 75, sL: 42, lL: 85, sD: 21, lD: 54 }],
    ['Geode', { hue: 183, sB: 21, lB: 45, sL: 25, lL: 60, sD: 23, lD: 31 }],
    ['Shard', { hue: 195, sB: 54, lB: 67, sL: 58, lL: 78, sD: 35, lD: 47 }],
  ],
  /* SeaCreature */ [
    ['Tide', { hue: 180, sB: 38, lB: 40, sL: 36, lL: 53, sD: 37, lD: 26 }],
    ['Coral', { hue: 6, sB: 65, lB: 66, sL: 73, lL: 78, sD: 39, lD: 46 }],
    ['Brine', { hue: 151, sB: 28, lB: 43, sL: 29, lL: 57, sD: 27, lD: 28 }],
    ['Abyss', { hue: 219, sB: 32, lB: 27, sL: 25, lL: 42, sD: 33, lD: 18 }],
  ],
  /* Flora */ [
    ['Thorn', { hue: 99, sB: 32, lB: 27, sL: 29, lL: 39, sD: 33, lD: 18 }],
    ['Moss', { hue: 85, sB: 27, lB: 35, sL: 25, lL: 48, sD: 28, lD: 23 }],
    ['Petal', { hue: 336, sB: 54, lB: 67, sL: 58, lL: 78, sD: 33, lD: 48 }],
    ['Root', { hue: 32, sB: 27, lB: 34, sL: 25, lL: 48, sD: 28, lD: 23 }],
  ],
  /* Robot */ [
    ['Rust', { hue: 21, sB: 44, lB: 44, sL: 49, lL: 57, sD: 50, lD: 33 }],
    ['Spark', { hue: 46, sB: 52, lB: 50, sL: 68, lL: 62, sD: 57, lD: 38 }],
    ['Gear', { hue: 213, sB: 7, lB: 51, sL: 9, lL: 67, sD: 8, lD: 35 }],
    ['Copper', { hue: 21, sB: 39, lB: 50, sL: 58, lL: 65, sD: 43, lD: 38 }],
  ],
  /* Swarm */ [
    ['Gnat', { hue: 70, sB: 36, lB: 53, sL: 53, lL: 68, sD: 37, lD: 40 }],
    ['Pixie', { hue: 318, sB: 46, lB: 56, sL: 60, lL: 69, sD: 43, lD: 42 }],
    ['Motes', { hue: 45, sB: 54, lB: 67, sL: 67, lL: 78, sD: 33, lD: 48 }],
    ['Buzz', { hue: 35, sB: 67, lB: 55, sL: 77, lL: 64, sD: 59, lD: 40 }],
  ],
];

const NAME_SUFFIXES: string[][] = [
  /* Blob */ ['Blob', 'Ooze', 'Glob'],
  /* Quadruped */ ['Lynx', 'Boar', 'Stag'],
  /* Avian */ ['Roc', 'Harpy', 'Jay'],
  /* Arachnid */ ['Spinner', 'Crawler', 'Weaver'],
  /* Crystal */ ['Golem', 'Sentinel', 'Warden'],
  /* SeaCreature */ ['Ray', 'Crab', 'Pike'],
  /* Flora */ ['Bloom', 'Fungling', 'Bramblekin'],
  /* Robot */ ['Automaton', 'Drone', 'Sentrybot'],
  /* Swarm */ ['Swarm', 'Cloud', 'Flurry'],
];

// Base stat blocks per archetype before floor-depth scaling.
const BASE_STATS: { hp: number; atk: number; def: number }[] = [
  /* Blob */ { hp: 46, atk: 8, def: 9 },
  /* Quadruped */ { hp: 38, atk: 11, def: 6 },
  /* Avian */ { hp: 30, atk: 11, def: 4 },
  /* Arachnid */ { hp: 26, atk: 12, def: 5 },
  /* Crystal */ { hp: 52, atk: 9, def: 14 },
  /* SeaCreature */ { hp: 42, atk: 10, def: 7 },
  /* Flora */ { hp: 44, atk: 7, def: 10 },
  /* Robot */ { hp: 40, atk: 10, def: 11 },
  /* Swarm */ { hp: 24, atk: 9, def: 3 },
];

// A fixed, non-random representative of one (archetype, prefix, variant)
// combo — used for the Bestiary's portraits.
export function archetypePreview(archetypeIndex: number, prefixIndex: number, variant: number): MonsterTraits {
  const [namePrefix, paletteSeed] = NAME_PREFIXES[archetypeIndex][prefixIndex];
  const nameSuffix = NAME_SUFFIXES[archetypeIndex][variant];
  const base = BASE_STATS[archetypeIndex];
  return {
    seed: 0,
    archetypeIndex,
    prefixIndex,
    variant,
    name: `${namePrefix} ${nameSuffix}`,
    namePrefix,
    palette: derivePalette(paletteSeed),
    scale: 1,
    hp: base.hp,
    maxHp: base.hp,
    atk: base.atk,
    def: base.def,
    isBoss: false,
  };
}

export function generateMonsterTraits(seed: number, depth = 1, isBoss = false): MonsterTraits {
  const rng = mulberry32(seed >>> 0);
  const archetypeIndex = Math.floor(rng() * 9) as Archetype;
  // Rolled by index (not pick()) so the index survives onto MonsterTraits for
  // the Bestiary to track — behaviorally identical rng() consumption to
  // pick(), since pick() does exactly this internally.
  const prefixIndex = Math.floor(rng() * 4);
  const [namePrefix, paletteSeed] = NAME_PREFIXES[archetypeIndex][prefixIndex];
  const palette = derivePalette(paletteSeed);
  const variant = Math.floor(rng() * 3);
  const nameSuffix = NAME_SUFFIXES[archetypeIndex][variant];
  const name = isBoss ? `Ferocious ${namePrefix} ${nameSuffix}` : `${namePrefix} ${nameSuffix}`;
  const bossStatMul = isBoss ? 1.4 : 1;
  const scale = range(rng, 0.9, 1.3) * (isBoss ? 1.35 : 1);

  const base = BASE_STATS[archetypeIndex];
  const depthMul = (1 + (depth - 1) * 0.08) * bossStatMul;
  const hp = Math.round(base.hp * depthMul * range(rng, 0.9, 1.1));
  const atk = Math.round(base.atk * depthMul * range(rng, 0.9, 1.1));
  const def = Math.round(base.def * depthMul * range(rng, 0.9, 1.1));

  return {
    seed,
    archetypeIndex,
    prefixIndex,
    variant,
    name,
    namePrefix,
    palette,
    scale,
    hp,
    maxHp: hp,
    atk,
    def,
    isBoss,
  };
}
