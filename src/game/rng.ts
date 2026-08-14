// Shared seeded RNG + roll helpers used by every procedural generator
// (unicorn traits, monsters, items, dungeon floors) so they stay deterministic
// and consistent from a single seed without duplicating this code per system.

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function range(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

export function rangeInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(range(rng, lo, hi + 1));
}

export function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}
