// Lifetime cross-run stats, persisted in localStorage. Only ever read/merged/
// written to our own prefixed key — this is a competition entry sharing an
// origin's storage with other people's code, so we never touch anything not
// under our own prefix, and we never call localStorage.clear() or
// removeItem() on anything, ours or otherwise.

export interface LifetimeStats {
  bestFloor: number;
  monstersDefeated: number;
  bossesDefeated: number;
  treasuresFound: number;
  trapsFound: number;
  rainbowFruitsFound: number;
}

const KEY = 'rainbowDepths-stats';

const EMPTY: LifetimeStats = {
  bestFloor: 0,
  monstersDefeated: 0,
  bossesDefeated: 0,
  treasuresFound: 0,
  trapsFound: 0,
  rainbowFruitsFound: 0,
};

export function loadLifetimeStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

// Folds one finished run's counters into the lifetime totals and persists
// the result. Called once, when a run ends.
export function recordRun(prev: LifetimeStats, run: Omit<LifetimeStats, 'bestFloor'> & { floor: number }): LifetimeStats {
  const next: LifetimeStats = {
    bestFloor: Math.max(prev.bestFloor, run.floor),
    monstersDefeated: prev.monstersDefeated + run.monstersDefeated,
    bossesDefeated: prev.bossesDefeated + run.bossesDefeated,
    treasuresFound: prev.treasuresFound + run.treasuresFound,
    trapsFound: prev.trapsFound + run.trapsFound,
    rainbowFruitsFound: prev.rainbowFruitsFound + run.rainbowFruitsFound,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — stats just
    // won't persist this session, not worth surfacing to the player.
  }
  return next;
}
