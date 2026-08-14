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

// Soothing ambient music played while exploring the dungeon: a soft detuned
// pad for sustain, plus a slowly wandering pentatonic melody on top (a random
// walk over a fixed scale, not a fixed loop) so it reads as an evolving tune
// rather than a static chord. Faded in/out rather than cut.
let ambient: { osc: OscillatorNode[]; gain: GainNode } | null = null;

const MELODY_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
let melodyIndex = 3;
let melodyTimer: number | null = null;

function scheduleMelodyNote(): void {
  if (!ambient) return;
  if (Math.random() > 0.2) {
    const step = Math.floor(Math.random() * 5) - 2;
    melodyIndex = Math.max(0, Math.min(MELODY_SCALE.length - 1, melodyIndex + step));
    tone(MELODY_SCALE[melodyIndex], 0, 1.1, 'triangle', 0.05);
  }
  melodyTimer = window.setTimeout(scheduleMelodyNote, 550 + Math.random() * 450);
}

export function startAmbient(): void {
  if (ambient) return;
  const c = getCtx();
  const master = c.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.05, c.currentTime + 2.5);
  master.connect(getMasterOut());

  const osc = [130.81, 164.81, 196.0].map((freq, i) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.detune.value = (i - 1) * 5;
    const g = c.createGain();
    g.gain.value = 0.34;
    o.connect(g);
    g.connect(master);
    o.start();
    return o;
  });

  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();
  osc.push(lfo);

  ambient = { osc, gain: master };
  melodyIndex = 3;
  scheduleMelodyNote();
}

export function stopAmbient(): void {
  if (!ambient) return;
  const c = getCtx();
  const { osc, gain } = ambient;
  gain.gain.cancelScheduledValues(c.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, c.currentTime);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + 1);
  setTimeout(() => osc.forEach((o) => o.stop()), 1100);
  ambient = null;
  if (melodyTimer !== null) {
    clearTimeout(melodyTimer);
    melodyTimer = null;
  }
}
