// Island Hopper — audio.js
// One job: all sound, made with WebAudio oscillators only. No audio files,
// no network. Sound starts only after the player presses a button or key.

let audioContext = null;
let engineOscillator = null;
let engineGain = null;
let windOscillator = null;
let windGain = null;
let muted = false;

function ensureContext() {
  if (audioContext) return audioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  audioContext = new AudioCtx();
  return audioContext;
}

export function initAudio() {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (engineOscillator) return;

  engineOscillator = ctx.createOscillator();
  engineOscillator.type = 'sawtooth';
  engineOscillator.frequency.value = 55;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.0;
  engineOscillator.connect(engineGain);
  engineGain.connect(ctx.destination);
  engineOscillator.start();

  windOscillator = ctx.createOscillator();
  windOscillator.type = 'triangle';
  windOscillator.frequency.value = 220;
  windGain = ctx.createGain();
  windGain.gain.value = 0.0;
  windOscillator.connect(windGain);
  windGain.connect(ctx.destination);
  windOscillator.start();
}

// Engine hum + wind follow throttle and speed; call every frame.
export function updateEngineSound(throttle, speed, flying) {
  if (!audioContext || !engineOscillator || muted) return;
  const target = flying ? 0.05 + throttle * 0.06 : throttle * 0.05;
  engineGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.1);
  engineOscillator.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.4, audioContext.currentTime, 0.1);
  windGain.gain.setTargetAtTime(Math.min(0.05, speed * 0.0006), audioContext.currentTime, 0.2);
}

function beep(frequency, duration, type, volume) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playRingChime() {
  beep(880, 0.18, 'sine', 0.14);
  setTimeout(() => beep(1318, 0.28, 'sine', 0.14), 90);
}

export function playClick() {
  beep(660, 0.06, 'square', 0.06);
}

export function playLandingFanfare() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((note, i) => setTimeout(() => beep(note, 0.3, 'triangle', 0.12), i * 130));
}

export function playCrashThud() {
  beep(90, 0.5, 'sawtooth', 0.2);
  setTimeout(() => beep(55, 0.6, 'sawtooth', 0.16), 120);
}

export function playWarningBeep() {
  beep(440, 0.12, 'square', 0.08);
}

// Short two-tone alert when fuel drops below a quarter tank.
export function playLowFuelAlert() {
  beep(392, 0.15, 'square', 0.09);
  setTimeout(() => beep(311, 0.2, 'square', 0.09), 160);
}

export function toggleMute() {
  muted = !muted;
  if (engineGain) engineGain.gain.value = 0;
  if (windGain) windGain.gain.value = 0;
  return muted;
}

export function isMuted() {
  return muted;
}
