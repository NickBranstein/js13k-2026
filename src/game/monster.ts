// Procedural monster generation. Same seed -> trait pattern as unicorn.ts,
// generalized so it can be reused by the dungeon encounter system later.

import { mulberry32, pick, range } from './rng';

export type MonsterPalette = [namePrefix: string, base: string, light: string, dark: string];

export interface MonsterTraits {
  seed: number;
  archetypeIndex: number;
  variant: number;
  name: string;
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
const NAME_PREFIXES: MonsterPalette[][] = [
  /* Blob */ [
    ['Shade', '#6b4f8c', '#9570c2', '#4a3465'],
    ['Murk', '#3e5b4e', '#5d8372', '#2b4037'],
    ['Gloom', '#4b5668', '#6e7a8c', '#333b47'],
    ['Sludge', '#6e6a4e', '#a29b71', '#4b4735'],
  ],
  /* Quadruped */ [
    ['Bramble', '#4f7d5c', '#70a980', '#355a3f'],
    ['Ash', '#7a7a7a', '#a3a3a3', '#525252'],
    ['Iron', '#5c6670', '#8a96a3', '#3d454d'],
    ['Storm', '#4f6f8c', '#709ac2', '#344d65'],
  ],
  /* Avian */ [
    ['Feather', '#5b8ac2', '#8bafda', '#3d5d85'],
    ['Sky', '#6ea1d8', '#9cc1e8', '#4b719b'],
    ['Crow', '#3a3a41', '#5c5c66', '#26262c'],
    ['Gale', '#7c93a2', '#a8bbc7', '#566671'],
  ],
  /* Arachnid */ [
    ['Web', '#6c6c75', '#92929b', '#494950'],
    ['Cave', '#5b4939', '#8a715c', '#3c3025'],
    ['Widow', '#5b2f3a', '#8b505f', '#3d1f26'],
    ['Dust', '#a38a5c', '#c7b085', '#7d6740'],
  ],
  /* Crystal */ [
    ['Prism', '#a35bc2', '#c68ae0', '#7e3d99'],
    ['Quartz', '#daa4c3', '#e9c9db', '#a2718d'],
    ['Geode', '#5b888b', '#80b0b3', '#3d5f61'],
    ['Shard', '#7dc2d8', '#a6d7e7', '#4e8da2'],
  ],
  /* SeaCreature */ [
    ['Tide', '#3f8d8d', '#5cb2b2', '#2a5b5b'],
    ['Coral', '#e17b70', '#f0a69e', '#a35148'],
    ['Brine', '#4f8c6f', '#72b192', '#345b48'],
    ['Abyss', '#2f3e5b', '#506386', '#1f293d'],
  ],
  /* Flora */ [
    ['Thorn', '#3e5b2f', '#5b8047', '#293d1f'],
    ['Moss', '#5d7141', '#80995c', '#3d4b2a'],
    ['Petal', '#d87da2', '#e7a6c0', '#a35272'],
    ['Root', '#6e583f', '#997c5c', '#4b3c2a'],
  ],
  /* Robot */ [
    ['Rust', '#a2613f', '#c7815c', '#7e482a'],
    ['Spark', '#c2a33d', '#e0c15c', '#987e2a'],
    ['Gear', '#79818b', '#a3aab2', '#525960'],
    ['Copper', '#b1714e', '#da9672', '#8b5437'],
  ],
  /* Swarm */ [
    ['Gnat', '#a4b25c', '#cad982', '#7f8c40'],
    ['Pixie', '#c25ba3', '#df81c3', '#993d7e'],
    ['Motes', '#d8c27d', '#ecdaa1', '#a38f52'],
    ['Buzz', '#d9993f', '#eaaf5d', '#a2702a'],
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
const BASE_STATS: [hp: number, atk: number, def: number][] = [
  /* Blob */ [46, 8, 9],
  /* Quadruped */ [38, 11, 6],
  /* Avian */ [30, 11, 4],
  /* Arachnid */ [26, 12, 5],
  /* Crystal */ [52, 9, 14],
  /* SeaCreature */ [42, 10, 7],
  /* Flora */ [44, 7, 10],
  /* Robot */ [40, 10, 11],
  /* Swarm */ [24, 9, 3],
];

export function generateMonsterTraits(seed: number, depth = 1, isBoss = false): MonsterTraits {
  const rng = mulberry32(seed >>> 0);
  const archetypeIndex = Math.floor(rng() * 9);
  const palette = pick(rng, NAME_PREFIXES[archetypeIndex]);
  const namePrefix = palette[0];
  const variant = Math.floor(rng() * 3);
  const nameSuffix = NAME_SUFFIXES[archetypeIndex][variant];
  const name = isBoss ? `Ferocious ${namePrefix} ${nameSuffix}` : `${namePrefix} ${nameSuffix}`;
  const bossStatMul = isBoss ? 1.4 : 1;
  const scale = range(rng, 0.9, 1.3) * (isBoss ? 1.35 : 1);

  const base = BASE_STATS[archetypeIndex];
  const depthMul = (1 + (depth - 1) * 0.08) * bossStatMul;
  const hp = Math.round(base[0] * depthMul * range(rng, 0.9, 1.1));
  const atk = Math.round(base[1] * depthMul * range(rng, 0.9, 1.1));
  const def = Math.round(base[2] * depthMul * range(rng, 0.9, 1.1));

  return {
    seed,
    archetypeIndex,
    variant,
    name,
    palette,
    scale,
    hp,
    maxHp: hp,
    atk,
    def,
    isBoss,
  };
}
