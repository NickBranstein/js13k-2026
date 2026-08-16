// Tiny localStorage-backed archetype+prefix+variant-discovery tracker — the
// game's second persistence mechanism after game/stats.ts. Every archetype
// has exactly 4 name prefixes (game/monster.ts's NAME_PREFIXES) and exactly
// 3 variants (NAME_SUFFIXES), so all 9*4*3 = 108 discoverable combos are
// compacted into one number via variantKey() instead of storing an
// [archetypeIndex, prefixIndex, variant] triple. The encoding is
// archetype-major (archetypeIndex * 12 + prefixIndex * 3 + variant), so
// each archetype's 12 combos land in one contiguous block, 0-11 for
// archetype 0, 12-23 for archetype 1, etc. — the Bestiary UI's one-page-
// per-archetype pagination relies on that grouping directly (page N is
// exactly archetype N, no separate page-to-archetype lookup needed).
// Archetype order is already baked into several lockstep tables
// (NAME_PREFIXES, NAME_SUFFIXES, BASE_STATS, MONSTER_DRAWERS) so reordering
// archetypes would require updating all of them together anyway; there's no
// independent "just the bestiary" reordering risk to guard against the way
// there might be for a standalone string key.
//
// Unlike game/stats.ts's LifetimeStats, this persisted value is a bare array
// of numbers (JSON.stringify([...seen])), not an object with named
// properties — so it's naturally immune to the Terser property-mangling
// hazard that stats.ts's tools/build.mjs PERSISTED_KEYS list guards against
// (mangling only ever touches object property *names*, and there are none
// here). Nothing needs to be added to PERSISTED_KEYS for this file.

const KEY = 'rainbowDepths-bestiary';
const PREFIXES_PER_ARCHETYPE = 4;
const VARIANTS_PER_ARCHETYPE = 3;
export const COMBOS_PER_ARCHETYPE = PREFIXES_PER_ARCHETYPE * VARIANTS_PER_ARCHETYPE;

// Packs an (archetypeIndex, prefixIndex, variant) triple into one number.
export function variantKey(archetypeIndex: number, prefixIndex: number, variant: number): number {
  return archetypeIndex * COMBOS_PER_ARCHETYPE + prefixIndex * VARIANTS_PER_ARCHETYPE + variant;
}

export function loadEncountered(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markEncountered(seen: Set<number>, archetypeIndex: number, prefixIndex: number, variant: number): void {
  const key = variantKey(archetypeIndex, prefixIndex, variant);
  if (seen.has(key)) return;
  seen.add(key);
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — discovery
    // just won't persist this session, not worth surfacing to the player.
  }
}
