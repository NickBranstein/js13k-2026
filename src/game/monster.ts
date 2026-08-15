// Procedural monster generation. Same seed -> trait pattern as unicorn.ts,
// generalized so it can be reused by the dungeon encounter system later.

import { mulberry32, pick, range, rangeInt } from './rng';

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
  moves: string[];
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

const NAME_PREFIXES: Record<Archetype, string[]> = {
  Blob: ['Shade', 'Murk', 'Gloom', 'Sludge'],
  Quadruped: ['Bramble', 'Ash', 'Iron', 'Storm'],
  Avian: ['Feather', 'Sky', 'Crow', 'Gale'],
  Arachnid: ['Web', 'Cave', 'Widow', 'Dust'],
  Crystal: ['Prism', 'Quartz', 'Geode', 'Shard'],
  SeaCreature: ['Tide', 'Coral', 'Brine', 'Abyss'],
  Flora: ['Thorn', 'Moss', 'Petal', 'Root'],
  Robot: ['Rust', 'Spark', 'Gear', 'Copper'],
  Swarm: ['Gnat', 'Pixie', 'Motes', 'Buzz'],
};

const NAME_SUFFIXES: Record<Archetype, string[]> = {
  Blob: ['Blob', 'Ooze', 'Glob'],
  Quadruped: ['Lynx', 'Boar', 'Stag'],
  Avian: ['Roc', 'Harpy', 'Jay'],
  Arachnid: ['Spinner', 'Crawler', 'Weaver'],
  Crystal: ['Golem', 'Sentinel', 'Warden'],
  SeaCreature: ['Ray', 'Crab', 'Pike'],
  Flora: ['Bloom', 'Fungling', 'Bramblekin'],
  Robot: ['Automaton', 'Drone', 'Sentrybot'],
  Swarm: ['Swarm', 'Cloud', 'Flurry'],
};

// Color theme keyed by name prefix, so a monster's palette is a direct
// consequence of its rolled name rather than an independent random pick —
// "Ember Wyrm" always reads warm/orange, "Venom Viper" always reads green, etc.
const PALETTE_BY_PREFIX: Record<string, MonsterPalette> = {
  Shade: { base: '#6a4f8c', light: '#8a6fc2', dark: '#4a3566' },
  Murk: { base: '#3f5c4f', light: '#5c8272', dark: '#2a3f36' },
  Gloom: { base: '#4a5566', light: '#6f7d8c', dark: '#333d47' },
  Sludge: { base: '#6f6a4f', light: '#a39c72', dark: '#4a4635' },
  Bramble: { base: '#4f7d5c', light: '#6fa87f', dark: '#355a40' },
  Ash: { base: '#7a7a7a', light: '#a3a3a3', dark: '#525252' },
  Iron: { base: '#5c6670', light: '#8a97a3', dark: '#3d444d' },
  Storm: { base: '#4f6f8c', light: '#72a0c2', dark: '#354d66' },
  Feather: { base: '#5c8ac2', light: '#8ab0d9', dark: '#3d5c85' },
  Sky: { base: '#6fa3d9', light: '#9cc4e8', dark: '#4a7099' },
  Crow: { base: '#3a3a42', light: '#5c5c66', dark: '#26262c' },
  Gale: { base: '#7d94a3', light: '#a8bcc7', dark: '#556670' },
  Web: { base: '#6b6b73', light: '#93939c', dark: '#48484f' },
  Cave: { base: '#5c4a3a', light: '#8a725c', dark: '#3d3026' },
  Widow: { base: '#5c2f3a', light: '#8a4f5c', dark: '#3d1f26' },
  Dust: { base: '#a38a5c', light: '#c7b285', dark: '#7d6640' },
  Prism: { base: '#a35cc2', light: '#c78ae0', dark: '#7d3d99' },
  Quartz: { base: '#d9a3c2', light: '#e8c7d9', dark: '#a3728a' },
  Geode: { base: '#5c8a8c', light: '#7fb0b2', dark: '#3d5f61' },
  Shard: { base: '#7fc2d9', light: '#a8dce8', dark: '#4f8fa3' },
  Tide: { base: '#3f8c8c', light: '#5cb2b2', dark: '#2a5c5c' },
  Coral: { base: '#e07a6f', light: '#f0a89f', dark: '#a34f47' },
  Brine: { base: '#4f8c6f', light: '#72b294', dark: '#355c47' },
  Abyss: { base: '#2f3f5c', light: '#4f6685', dark: '#1f293d' },
  Thorn: { base: '#3f5c2f', light: '#5c8247', dark: '#2a3d1f' },
  Moss: { base: '#5c7040', light: '#82995c', dark: '#3d4a2a' },
  Petal: { base: '#d97fa3', light: '#e8a8c2', dark: '#a35272' },
  Root: { base: '#6f5940', light: '#997a5c', dark: '#4a3a2a' },
  Rust: { base: '#a3623f', light: '#c78a5c', dark: '#7d452a' },
  Spark: { base: '#c2a33f', light: '#e0c25c', dark: '#997f2a' },
  Gear: { base: '#7a828c', light: '#a3aab2', dark: '#525860' },
  Copper: { base: '#b2724f', light: '#d99a72', dark: '#8a5537' },
  Gnat: { base: '#a3b25c', light: '#c7d982', dark: '#7d8a40' },
  Pixie: { base: '#c25ca3', light: '#e082c7', dark: '#993d7d' },
  Motes: { base: '#d9c27f', light: '#eddba3', dark: '#a38f52' },
  Buzz: { base: '#d99a3f', light: '#eab35c', dark: '#a3712a' },
};

const MOVE_POOL: Record<Archetype, string[]> = {
  Blob: ['Ooze Slam', 'Corrosive Spit', 'Body Press'],
  Quadruped: ['Bite', 'Charge', 'Claw Swipe'],
  Avian: ['Wing Slash', 'Dive Peck', 'Screech'],
  Arachnid: ['Venom Bite', 'Web Snare', 'Skitter Strike'],
  Crystal: ['Shard Slam', 'Prism Beam', 'Stone Guard'],
  SeaCreature: ['Tail Slap', 'Riptide', 'Pincer Crush'],
  Flora: ['Vine Whip', 'Spore Cloud', 'Thorn Barrage'],
  Robot: ['Laser Zap', 'Piston Punch', 'Overcharge'],
  Swarm: ['Swarm Bite', 'Buzz Frenzy', 'Sting Cloud'],
};

// Base stat blocks per archetype before floor-depth scaling.
const BASE_STATS: Record<Archetype, { hp: number; atk: number; def: number }> = {
  Blob: { hp: 46, atk: 8, def: 9 },
  Quadruped: { hp: 38, atk: 11, def: 6 },
  Avian: { hp: 30, atk: 11, def: 4 },
  Arachnid: { hp: 26, atk: 12, def: 5 },
  Crystal: { hp: 52, atk: 9, def: 14 },
  SeaCreature: { hp: 42, atk: 10, def: 7 },
  Flora: { hp: 44, atk: 7, def: 10 },
  Robot: { hp: 40, atk: 10, def: 11 },
  Swarm: { hp: 24, atk: 9, def: 3 },
};

export function generateMonsterTraits(seed: number, depth = 1, isBoss = false): MonsterTraits {
  const rng = mulberry32(seed >>> 0);
  const archetype = pick(rng, ARCHETYPES);
  const namePrefix = pick(rng, NAME_PREFIXES[archetype]);
  const nameSuffix = pick(rng, NAME_SUFFIXES[archetype]);
  const name = isBoss ? `Ferocious ${namePrefix} ${nameSuffix}` : `${namePrefix} ${nameSuffix}`;
  const palette = PALETTE_BY_PREFIX[namePrefix];
  const bossStatMul = isBoss ? 1.4 : 1;
  const scale = range(rng, 0.9, 1.3) * (isBoss ? 1.35 : 1);

  const base = BASE_STATS[archetype];
  const depthMul = (1 + (depth - 1) * 0.08) * bossStatMul;
  const hp = Math.round(base.hp * depthMul * range(rng, 0.9, 1.1));
  const atk = Math.round(base.atk * depthMul * range(rng, 0.9, 1.1));
  const def = Math.round(base.def * depthMul * range(rng, 0.9, 1.1));

  const movePool = MOVE_POOL[archetype];
  const moveCount = rangeInt(rng, 1, Math.min(2, movePool.length));
  const moves: string[] = [];
  while (moves.length < moveCount) {
    const move = pick(rng, movePool);
    if (!moves.includes(move)) moves.push(move);
  }

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
    moves,
    isBoss,
  };
}
