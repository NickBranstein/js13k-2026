// Minimal WebAudio-generated sound effects — no sample files, just oscillators
// with a short gain envelope. Every call here happens inside a keydown
// handler, which counts as a user gesture, so no separate "unlock audio" step
// is needed.

let ctx: AudioContext | null = null;
let muteGain: GainNode | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Every sound (one-shots and the ambient track) routes through this single
// gain node, so muting is one gain ramp rather than tracking every voice.
function getMasterOut(): GainNode {
  const c = getCtx();
  if (!muteGain) {
    muteGain = c.createGain();
    muteGain.gain.value = muted ? 0 : 1;
    muteGain.connect(c.destination);
  }
  return muteGain;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
  const c = getCtx();
  const g = getMasterOut();
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setValueAtTime(g.gain.value, c.currentTime);
  g.gain.linearRampToValueAtTime(muted ? 0 : 1, c.currentTime + 0.1);
}

function tone(freq: number, delay: number, duration: number, type: OscillatorType, volume: number): void {
  const c = getCtx();
  const start = c.currentTime + Math.max(0, delay);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(getMasterOut());
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playMenuMove(): void {
  tone(520, 0, 0.05, 'square', 0.05);
}

export function playConfirm(): void {
  tone(660, 0, 0.07, 'square', 0.07);
}

export function playHit(delay = 0): void {
  tone(140, delay, 0.09, 'sawtooth', 0.09);
}

export function playVictory(): void {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.14, 'square', 0.07));
}

export function playCharm(): void {
  [784, 988, 1318].forEach((f, i) => tone(f, i * 0.07, 0.12, 'triangle', 0.07));
}

export function playLevelUp(delay = 0): void {
  [392, 523, 659, 784, 988].forEach((f, i) => tone(f, delay + i * 0.06, 0.12, 'triangle', 0.08));
}

export function playDefeat(): void {
  [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.22, 'sawtooth', 0.08));
}

// Soothing ambient music played while exploring the dungeon: a slowly
// wandering pentatonic melody (a random walk over a fixed scale, not a fixed
// loop) so it reads as an evolving tune. No sustained drone underneath —
// just the melody notes fading in and out on their own.
let ambientOn = false;

const MELODY_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
let melodyIndex = 3;
let melodyTimer: number | null = null;

function scheduleMelodyNote(): void {
  if (!ambientOn) return;
  if (Math.random() > 0.2) {
    const step = Math.floor(Math.random() * 5) - 2;
    melodyIndex = Math.max(0, Math.min(MELODY_SCALE.length - 1, melodyIndex + step));
    tone(MELODY_SCALE[melodyIndex], 0, 1.1, 'triangle', 0.06);
  }
  melodyTimer = window.setTimeout(scheduleMelodyNote, 550 + Math.random() * 450);
}

export function startAmbient(): void {
  if (ambientOn) return;
  ambientOn = true;
  melodyIndex = 3;
  scheduleMelodyNote();
}

export function stopAmbient(): void {
  ambientOn = false;
  if (melodyTimer !== null) {
    clearTimeout(melodyTimer);
    melodyTimer = null;
  }
}
