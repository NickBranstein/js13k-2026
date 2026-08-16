// Linear floor sequence generation. No map/graph — advancing a floor *is* the
// exploration step (see PLAN.md section 3.1 / decisions log).

import { mulberry32, chance } from './rng';

export const ROOM_MONSTER = 0;
export const ROOM_TREASURE = 1;
const ROOM_TRAP = 2;

export type RoomType = typeof ROOM_MONSTER | typeof ROOM_TREASURE | typeof ROOM_TRAP;

/**
 * Compact encounter code: -1 is a boss monster; 0/1/2 are the normal room
 * constants above. The negative sentinel is safe because normal room IDs are
 * non-negative, and it avoids a separate object and boolean.
 */
export type FloorEncounter = RoomType | -1;

const TREASURE_CHANCE = 0.25;
const TRAP_CHANCE = 0.1;
const BOSS_INTERVAL = 10;

export function generateFloorEncounter(runSeed: number, floor: number): FloorEncounter {
  if (floor % BOSS_INTERVAL === 0) {
    return -1;
  }

  // deterministic per (run, floor) — same run seed always produces the same sequence
  const rng = mulberry32((runSeed ^ (floor * 0x9e3779b1)) >>> 0);
  const roll = rng();
  let type: RoomType;
  if (roll < TRAP_CHANCE) type = ROOM_TRAP;
  else if (roll < TRAP_CHANCE + TREASURE_CHANCE) type = ROOM_TREASURE;
  else type = ROOM_MONSTER;

  return type;
}

// Traps can hurt, but never end a run outright — damage is capped so the player
// always survives with at least 1 HP. The caller formats the message from this
// value, avoiding a one-use result object.
export function resolveTrap(runSeed: number, floor: number, floorDepth: number, currentHp: number): number {
  const rng = mulberry32((runSeed ^ (floor * 0x85ebca6b)) >>> 0);
  const rolled = Math.round(4 + floorDepth * 1.5 + rng() * 6);
  return Math.max(0, Math.min(rolled, currentHp - 1));
}

/**
 * Returns a signed heal amount: abs(result) is always the 8..20 HP reward,
 * while a negative result also signals a mutation item. Healing can never be
 * zero, so the sign carries the flag without an ambiguous edge case.
 */
export function resolveTreasure(runSeed: number, floor: number, mutationChance: number): number {
  const rng = mulberry32((runSeed ^ (floor * 0xc2b2ae35)) >>> 0);
  const heal = Math.round(8 + rng() * 12);
  const foundMutationItem = chance(rng, mutationChance);
  return foundMutationItem ? -heal : heal;
}
