/**
 * Procedural library sounds, composed for Bibliotheca Vacua and dedicated to
 * the public domain under CC0 1.0. No recordings or third-party audio ship.
 * Audio is created only after the visitor explicitly enables it.
 */
const SOUND_KEY = "bv-sound";

let context: AudioContext | null = null;
let ambience: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

export function soundEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(SOUND_KEY) === "1";
}

export function setSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("bv-sound-change", { detail: enabled }));
  if (enabled) startAmbience();
  else stopAmbience();
}

function audioContext() {
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
    data[i] = last;
  }
  return buffer;
}

export function startAmbience() {
  if (!soundEnabled() || ambience) return;
  const ctx = audioContext();
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = noiseBuffer(ctx, 8);
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = 520;
  filter.Q.value = 0.35;
  gain.gain.value = 0.018;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  ambience = { source, gain };
}

export function stopAmbience() {
  if (!ambience) return;
  ambience.source.stop();
  ambience = null;
}

function noiseGesture(duration: number, volume: number, frequency: number) {
  if (!soundEnabled()) return;
  const ctx = audioContext();
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = noiseBuffer(ctx, duration);
  filter.type = "highpass";
  filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export function playPageTurn() {
  noiseGesture(0.24, 0.045, 1350);
}

export function playStamp() {
  if (!soundEnabled()) return;
  const ctx = audioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.setValueAtTime(88, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.07, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.14);
}

export function playLampClick() {
  noiseGesture(0.055, 0.055, 2100);
}