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
export async function startAmbience() {
  if (!soundEnabled() || typeof window === "undefined") return;
  if (!ambience) {
    ambience = new Audio(AMBIENCE_SRC);
    ambience.loop = true;
    ambience.preload = "auto";
    ambience.volume = 0;
  }
  try {
    await ambience.play();
  } catch {
    /* the visitor can click again */
    return;
  }
  // Fade in, so the room does not arrive with a bump.
  const target = AMBIENCE_VOLUME;
  const step = target / 24;
  const fade = window.setInterval(() => {
    if (!ambience) return window.clearInterval(fade);
    const next = ambience.volume + step;
    if (next >= target) {
      ambience.volume = target;
      window.clearInterval(fade);
    } else {
      ambience.volume = next;
    }
  }, 50);
}

export function stopAmbience() {
  if (!ambience) return;
  const element = ambience;
  const fade = window.setInterval(() => {
    const next = element.volume - 0.05;
    if (next <= 0) {
      element.volume = 0;
      element.pause();
      element.currentTime = 0;
      window.clearInterval(fade);
    } else {
      element.volume = next;
    }
  }, 40);
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
