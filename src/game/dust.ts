// Permanent cross-run progression via 4 "Mysterious" items — a set-
// collection loop instead of a flat banked currency: every run that ends
// drops one random item. Once at least one of every kind is held, the set
// is immediately cashed in for a fixed permanent stat boost — exactly one
// of each kind is removed (not the whole collection), so any surplus
// duplicates carry over toward the next set. Cashed-in sets keep
// compounding (dustBonusTotals scales with how many times the set has ever
// been completed), so the boost is truly permanent, not just held on the
// collection itself. This is the deliberate step beyond the MVP's "pure
// roguelike, nothing persists between runs" decision (see PLAN.md
// section 8).
//
// Two persisted values, both bare (an array of per-kind held counts, and a
// plain count of completed sets) — not an object with named properties —
// so, like game/bestiary.ts, they're naturally immune to the Terser
// property-mangling hazard that game/stats.ts's tools/build.mjs
// PERSISTED_KEYS list guards against.

const HELD_KEY = 'rainbowDepths-dust';
const CASHED_KEY = 'rainbowDepths-dustSets';

export const ITEM_NAMES = ['Dust', 'Dew', 'Essence', 'Fragment'];

// Fixed permanent stat boost granted every time a full set is cashed in:
// [maxHp, atk, def, charisma].
const SET_BONUS = [6, 1, 1, 2];

export function loadHeld(): number[] {
  try {
    const raw = localStorage.getItem(HELD_KEY);
    return raw ? JSON.parse(raw) : ITEM_NAMES.map(() => 0);
  } catch {
    return ITEM_NAMES.map(() => 0);
  }
}

export function loadCashedIns(): number {
  try {
    const raw = localStorage.getItem(CASHED_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

// [kind, cashedIn, cashedIns] — the item kind that dropped, whether it
// completed the set, and the updated cashed-in count.
export type DropResult = [number, boolean, number];

// Grants one random item for a just-finished run and persists the result.
// If every kind is now held at least once, the set is cashed in
// immediately — exactly one of each kind is removed and cashedIns
// increments — the caller re-derives its bonus totals from the returned
// cashedIns via dustBonusTotals().
export function grantDust(held: number[], cashedIns: number): DropResult {
  const kind = Math.floor(Math.random() * ITEM_NAMES.length);
  held[kind] += 1;
  const cashedIn = held.every((n) => n >= 1);
  if (cashedIn) {
    for (let i = 0; i < held.length; i++) held[i] -= 1;
    cashedIns += 1;
  }
  try {
    localStorage.setItem(HELD_KEY, JSON.stringify(held));
    localStorage.setItem(CASHED_KEY, String(cashedIns));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — this run's
    // progress just won't persist, not worth surfacing to the player.
  }
  return [kind, cashedIn, cashedIns];
}

// [maxHp, atk, def, charisma] permanent bonus totals for the given
// cashed-in count.
export function dustBonusTotals(cashedIns: number): [number, number, number, number] {
  return [SET_BONUS[0] * cashedIns, SET_BONUS[1] * cashedIns, SET_BONUS[2] * cashedIns, SET_BONUS[3] * cashedIns];
}
