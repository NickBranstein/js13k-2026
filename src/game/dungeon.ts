// Linear floor sequence generation. No map/graph — advancing a floor *is* the
// exploration step (see PLAN.md section 3.1 / decisions log).

import { mulberry32, chance } from './rng';

export const enum RoomType { Monster, Treasure, Trap }

// A floor encounter is compacted into a single number instead of an object:
//   -1            -> boss monster room (always RoomType.Monster, always boss)
//   RoomType.*     -> a normal, non-boss room of that type (0/1/2)
// This works because RoomType.Monster is already 0, so "boss" just needs one
// value outside the normal 0..2 range, not a whole extra boolean field. The
// call sites below (main.ts) compare against RoomType.Monster/.Treasure or
// check `< RoomType.Monster` (i.e. `=== -1`) to recover "is this a boss".
// generateFloorEncounter() also no longer takes/returns a `floor` field —
// every caller already has its own `floor` variable in scope, so storing a
// second copy on the encounter was dead data no one ever read.
export type FloorEncounter = RoomType | -1;

const TREASURE_CHANCE = 0.25;
const TRAP_CHANCE = 0.1;
const BOSS_INTERVAL = 10;

export function generateFloorEncounter(runSeed: number, floor: number): FloorEncounter {
  if (floor % BOSS_INTERVAL === 0) return -1;

  // deterministic per (run, floor) — same run seed always produces the same sequence
  const rng = mulberry32((runSeed ^ (floor * 0x9e3779b1)) >>> 0);
  const roll = rng();
  if (roll < TRAP_CHANCE) return RoomType.Trap;
  if (roll < TRAP_CHANCE + TREASURE_CHANCE) return RoomType.Treasure;
  return RoomType.Monster;
}

// Traps can hurt, but never end a run outright — damage is capped so the player
// always survives with at least 1 HP. Returns just the damage number; the one
// caller (main.ts) rebuilds the flavor message itself since it was always a
// fixed template around this same value, not worth a whole result object.
export function resolveTrap(runSeed: number, floor: number, floorDepth: number, currentHp: number): number {
  const rng = mulberry32((runSeed ^ (floor * 0x85ebca6b)) >>> 0);
  const rolled = Math.round(4 + floorDepth * 1.5 + rng() * 6);
  return Math.max(0, Math.min(rolled, currentHp - 1));
}

// Healing is always a positive 8..20 (never 0), so its sign is free to carry
// a second bit of information: a NEGATIVE result means "also found a
// mutation item," a positive result means "heal only." The caller recovers
// the real heal amount via Math.abs() and checks `result < 0` for the flag.
// This only works because heal can never legitimately be 0 or negative on
// its own — if that range ever changes, this encoding breaks silently.
export function resolveTreasure(runSeed: number, floor: number, mutationChance: number): number {
  const rng = mulberry32((runSeed ^ (floor * 0xc2b2ae35)) >>> 0);
  const heal = Math.round(8 + rng() * 12);
  const foundMutationItem = chance(rng, mutationChance);
  return foundMutationItem ? -heal : heal;
}
