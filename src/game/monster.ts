// Procedural monster generation. Same seed -> trait pattern as unicorn.ts,
// generalized so it can be reused by the dungeon encounter system later.

import { mulberry32, pick, range } from './rng';

export type Archetype =
  | 'Blob'
  | 'Quadruped'
  | 'Avian'
  | 'Arachnid'
  | 'Crystal'
  | 'SeaCreature'
  | 'Flora'
  | 'Robot'
  | 'Swarm';

export interface MonsterPalette {
  base: string;
  light: string;
  dark: string;
}

export interface MonsterTraits {
  seed: number;
  archetype: Archetype;
  name: string;
  namePrefix: string;
  nameSuffix: string;
  palette: MonsterPalette;
  scale: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  isBoss: boolean;
}

const ARCHETYPES: Archetype[] = [
  'Blob',
  'Quadruped',
  'Avian',
  'Arachnid',
  'Crystal',
  'SeaCreature',
  'Flora',
  'Robot',
  'Swarm',
];

// The four tables below are indexed positionally in lockstep with
// ARCHETYPES (index 0 = Blob, 1 = Quadruped, ...) rather than keyed by the
// archetype's name string. That's deliberate: Terser's build-time property
// mangling can't tell a fixed-schema object apart from a string-keyed
// lookup table, so keying by a name that's also picked at runtime as plain
// data (see generateMonsterTraits below) would silently desync the two.
// Indexing by array position sidesteps the problem entirely — no property
// name is ever looked up by a runtime string, so there's nothing to keep in
// sync with the mangler's reserved list in tools/build.mjs.

// Each entry pairs a name prefix with its palette directly (previously a
// separate PALETTE_BY_PREFIX lookup keyed by prefix name) — the two were
// always 1:1, so pairing them removes a second table that had to be kept in
// sync by hand whenever a prefix was added.
const NAME_PREFIXES: [string, MonsterPalette][][] = [
  /* Blob */ [
    ['Shade', { base: '#6b4f8c', light: '#9570c2', dark: '#4a3465' }],
    ['Murk', { base: '#3e5b4e', light: '#5d8372', dark: '#2b4037' }],
    ['Gloom', { base: '#4b5668', light: '#6e7a8c', dark: '#333b47' }],
    ['Sludge', { base: '#6e6a4e', light: '#a29b71', dark: '#4b4735' }],
  ],
  /* Quadruped */ [
    ['Bramble', { base: '#4f7d5c', light: '#70a980', dark: '#355a3f' }],
    ['Ash', { base: '#7a7a7a', light: '#a3a3a3', dark: '#525252' }],
    ['Iron', { base: '#5c6670', light: '#8a96a3', dark: '#3d454d' }],
    ['Storm', { base: '#4f6f8c', light: '#709ac2', dark: '#344d65' }],
  ],
  /* Avian */ [
    ['Feather', { base: '#5b8ac2', light: '#8bafda', dark: '#3d5d85' }],
    ['Sky', { base: '#6ea1d8', light: '#9cc1e8', dark: '#4b719b' }],
    ['Crow', { base: '#3a3a41', light: '#5c5c66', dark: '#26262c' }],
    ['Gale', { base: '#7c93a2', light: '#a8bbc7', dark: '#566671' }],
  ],
  /* Arachnid */ [
    ['Web', { base: '#6c6c75', light: '#92929b', dark: '#494950' }],
    ['Cave', { base: '#5b4939', light: '#8a715c', dark: '#3c3025' }],
    ['Widow', { base: '#5b2f3a', light: '#8b505f', dark: '#3d1f26' }],
    ['Dust', { base: '#a38a5c', light: '#c7b085', dark: '#7d6740' }],
  ],
  /* Crystal */ [
    ['Prism', { base: '#a35bc2', light: '#c68ae0', dark: '#7e3d99' }],
    ['Quartz', { base: '#daa4c3', light: '#e9c9db', dark: '#a2718d' }],
    ['Geode', { base: '#5b888b', light: '#80b0b3', dark: '#3d5f61' }],
    ['Shard', { base: '#7dc2d8', light: '#a6d7e7', dark: '#4e8da2' }],
  ],
  /* SeaCreature */ [
    ['Tide', { base: '#3f8d8d', light: '#5cb2b2', dark: '#2a5b5b' }],
    ['Coral', { base: '#e17b70', light: '#f0a69e', dark: '#a35148' }],
    ['Brine', { base: '#4f8c6f', light: '#72b192', dark: '#345b48' }],
    ['Abyss', { base: '#2f3e5b', light: '#506386', dark: '#1f293d' }],
  ],
  /* Flora */ [
    ['Thorn', { base: '#3e5b2f', light: '#5b8047', dark: '#293d1f' }],
    ['Moss', { base: '#5d7141', light: '#80995c', dark: '#3d4b2a' }],
    ['Petal', { base: '#d87da2', light: '#e7a6c0', dark: '#a35272' }],
    ['Root', { base: '#6e583f', light: '#997c5c', dark: '#4b3c2a' }],
  ],
  /* Robot */ [
    ['Rust', { base: '#a2613f', light: '#c7815c', dark: '#7e482a' }],
    ['Spark', { base: '#c2a33d', light: '#e0c15c', dark: '#987e2a' }],
    ['Gear', { base: '#79818b', light: '#a3aab2', dark: '#525960' }],
    ['Copper', { base: '#b1714e', light: '#da9672', dark: '#8b5437' }],
  ],
  /* Swarm */ [
    ['Gnat', { base: '#a4b25c', light: '#cad982', dark: '#7f8c40' }],
    ['Pixie', { base: '#c25ba3', light: '#df81c3', dark: '#993d7e' }],
    ['Motes', { base: '#d8c27d', light: '#ecdaa1', dark: '#a38f52' }],
    ['Buzz', { base: '#d9993f', light: '#eaaf5d', dark: '#a2702a' }],
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

export function generateMonsterTraits(seed: number, depth = 1, isBoss = false): MonsterTraits {
  const rng = mulberry32(seed >>> 0);
  const archetypeIndex = Math.floor(rng() * ARCHETYPES.length);
  const archetype = ARCHETYPES[archetypeIndex];
  const [namePrefix, palette] = pick(rng, NAME_PREFIXES[archetypeIndex]);
  const nameSuffix = pick(rng, NAME_SUFFIXES[archetypeIndex]);
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
    archetype,
    name,
    namePrefix,
    nameSuffix,
    palette,
    scale,
    hp,
    maxHp: hp,
    atk,
    def,
    isBoss,
  };
}
