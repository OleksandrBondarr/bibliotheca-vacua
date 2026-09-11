/**
 * Sound for Bibliotheca Vacua.
 *
 * The room ambience is a recorded loop shipped at /room-tone.mp3 (40 s,
 * seamless, quiet rain and fire in a study). Small gestures — the stamp, a
 * page turn, the lamp chain — are still synthesised in the browser with the
 * Web Audio API, so they cost nothing to download.
 *
 * Audio is created only after the visitor explicitly enables it, on their own
 * click, so no autoplay policy is ever violated.
 */
const SOUND_KEY = "bv-sound";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: HTMLAudioElement | null = null;
const AMBIENCE_SRC = "/room-tone.mp3";
const AMBIENCE_VOLUME = 0.45;

export function soundEnabled() {
  return typeof window !== "undefined" && window.localStorage.getItem(SOUND_KEY) === "1";
}

export function setSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("bv-sound-change", { detail: enabled }));
  if (enabled) void startAmbience();
  else stopAmbience();
}

function audioContext() {
  const Ctor: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!context) context = new Ctor();
  if (!master) {
    master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);
    // Handle for automated sound checks; harmless in production.
    (window as unknown as { __bvAudio?: unknown }).__bvAudio = { ctx: context, master };
  }
  return context;
}


/** Must be called from inside a user gesture; browsers start contexts suspended. */
async function ensureRunning() {
  const ctx = audioContext();
  if (ctx.state !== "running") {
    try {
      await ctx.resume();
    } catch {
      /* the visitor can click again */
    }
  }
  return ctx;
}

function noiseBuffer(ctx: AudioContext, seconds: number, smoothing = 0.985) {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = last * smoothing + (Math.random() * 2 - 1) * (1 - smoothing);
    data[i] = last * 3.2;
  }
  return buffer;
}

/** A quiet room, from a recorded loop. Must be started from a user gesture. */
let fade: number | null = null;

function fadeTo(target: number, done?: () => void) {
  if (fade !== null) window.clearInterval(fade);
  const element = ambience;
  if (!element) return;
  const step = target > element.volume ? 0.02 : -0.06;
  fade = window.setInterval(() => {
    if (!ambience) {
      if (fade !== null) window.clearInterval(fade);
      fade = null;
      return;
    }
    const next = ambience.volume + step;
    const finished = step > 0 ? next >= target : next <= target;
    ambience.volume = finished ? target : Math.min(1, Math.max(0, next));
    if (finished) {
      if (fade !== null) window.clearInterval(fade);
      fade = null;
      done?.();
    }
  }, 40);
}

export async function startAmbience() {
  if (!soundEnabled() || typeof window === "undefined") return;
  if (!ambience) {
    ambience = new Audio(AMBIENCE_SRC);
    ambience.loop = true;
    ambience.preload = "auto";
    ambience.volume = 0;
  }
  if (!ambience.paused && ambience.volume >= AMBIENCE_VOLUME) return;
  try {
    await ambience.play();
  } catch {
    /* the visitor can tap again */
    return;
  }
  fadeTo(AMBIENCE_VOLUME);
}

export function stopAmbience() {
  if (fade !== null) {
    window.clearInterval(fade);
    fade = null;
  }
  const element = ambience;
  if (!element) return;
  fadeTo(0, () => {
    element.pause();
    element.currentTime = 0;
  });
  // If the fade cannot run for any reason, silence it outright.
  window.setTimeout(() => {
    if (!soundEnabled() && element) {
      element.volume = 0;
      element.pause();
    }
  }, 600);
}

function noiseGesture(duration: number, volume: number, frequency: number, type: BiquadFilterType = "highpass") {
  if (!soundEnabled() || typeof window === "undefined") return;
  const ctx = audioContext();
  if (ctx.state !== "running") void ctx.resume();
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = noiseBuffer(ctx, duration, 0.55);
  filter.type = type;
  filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter).connect(gain).connect(master!);
  source.start();
}

export function playPageTurn() {
  noiseGesture(0.26, 0.3, 1200);
}

export function playStamp() {
  if (!soundEnabled()) return;
  const ctx = audioContext();
  if (ctx.state !== "running") void ctx.resume();
  noiseGesture(0.08, 0.35, 1500);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.setValueAtTime(96, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(46, ctx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
  oscillator.connect(gain).connect(master!);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.17);
}

export function playLampClick() {
  noiseGesture(0.05, 0.4, 2000);
}
