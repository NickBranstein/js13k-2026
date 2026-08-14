// Linear floor sequence generation. No map/graph — advancing a floor *is* the
// exploration step (see PLAN.md section 3.1 / decisions log).

import { mulberry32, chance } from './rng';

export type RoomType = 'Monster' | 'Treasure' | 'Trap';

export interface FloorEncounter {
  floor: number;
  type: RoomType;
  boss: boolean;
}

const TREASURE_CHANCE = 0.25;
const TRAP_CHANCE = 0.1;
const BOSS_INTERVAL = 10;

export function generateFloorEncounter(runSeed: number, floor: number): FloorEncounter {
  if (floor % BOSS_INTERVAL === 0) {
    return { floor, type: 'Monster', boss: true };
  }

  // deterministic per (run, floor) — same run seed always produces the same sequence
  const rng = mulberry32((runSeed ^ (floor * 0x9e3779b1)) >>> 0);
  const roll = rng();
  let type: RoomType;
  if (roll < TRAP_CHANCE) type = 'Trap';
  else if (roll < TRAP_CHANCE + TREASURE_CHANCE) type = 'Treasure';
  else type = 'Monster';

  return { floor, type, boss: false };
}

export interface TrapResult {
  damage: number;
  message: string;
}

// Traps can hurt, but never end a run outright — damage is capped so the player
// always survives with at least 1 HP.
export function resolveTrap(runSeed: number, floor: number, floorDepth: number, currentHp: number): TrapResult {
  const rng = mulberry32((runSeed ^ (floor * 0x85ebca6b)) >>> 0);
  const rolled = Math.round(4 + floorDepth * 1.5 + rng() * 6);
  const damage = Math.max(0, Math.min(rolled, currentHp - 1));
  return { damage, message: `A hidden trap triggers! You take ${damage} damage.` };
}

export interface TreasureResult {
  heal: number;
  foundMutationItem: boolean;
}

export function resolveTreasure(runSeed: number, floor: number, mutationChance: number): TreasureResult {
  const rng = mulberry32((runSeed ^ (floor * 0xc2b2ae35)) >>> 0);
  const heal = Math.round(8 + rng() * 12);
  const foundMutationItem = chance(rng, mutationChance);
  return { heal, foundMutationItem };
}
