// Shared combat-feedback helpers: timed animation offsets/progress (pure,
// no canvas), used for attack lunges and hit-shake.

// Returns a lunge-style offset (0 -> magnitude -> 0) over [start, start+duration],
// or 0 if the animation hasn't started, has finished, or isn't active.
export function animOffset(start: number | null, now: number, duration: number, magnitude: number): number {
  if (start === null) return 0;
  const p = (now - start) / duration;
  if (p < 0 || p > 1) return 0;
  return Math.sin(p * Math.PI) * magnitude;
}

// Returns 0..1 progress through the animation window, or null if inactive.
export function animProgress(start: number | null, now: number, duration: number): number | null {
  if (start === null) return null;
  const p = (now - start) / duration;
  if (p < 0 || p > 1) return null;
  return p;
}
