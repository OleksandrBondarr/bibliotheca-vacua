/**
 * Procedural library sounds, composed for Bibliotheca Vacua and dedicated to
 * the public domain under CC0 1.0.
 *
 * NOTE ON SOURCES: no audio files ship with this project and none ever have.
 * Every sound below is synthesised in the browser with the Web Audio API
 * (filtered noise and short oscillator gestures), so the download weight is
 * zero. Freesound.org downloads require an authenticated API token, which this
 * project does not hold; if recorded CC0 material is ever added, put the files
 * in /public/sound/ and record the freesound.org URLs here.
 *
 * Audio is created only after the visitor explicitly enables it, on their own
 * click, so no autoplay policy is ever violated.
 */
const SOUND_KEY = "bv-sound";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: { sources: AudioBufferSourceNode[]; gain: GainNode; timer: number } | null = null;

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

/** A quiet room: air, distant floorboards, the odd chair. Loops seamlessly. */
export async function startAmbience() {
  if (!soundEnabled() || ambience) return;
  const ctx = await ensureRunning();
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.connect(master!);
  out.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.2);

  const sources: AudioBufferSourceNode[] = [];

  // Room air: broad, very low band of noise.
  const air = ctx.createBufferSource();
  const airFilter = ctx.createBiquadFilter();
  const airGain = ctx.createGain();
  air.buffer = noiseBuffer(ctx, 12);
  air.loop = true;
  airFilter.type = "lowpass";
  airFilter.frequency.value = 420;
  airGain.gain.value = 0.42;
  air.connect(airFilter).connect(airGain).connect(out);
  air.start();
  sources.push(air);

  // A thin high layer, so the room is not only rumble.
  const hiss = ctx.createBufferSource();
  const hissFilter = ctx.createBiquadFilter();
  const hissGain = ctx.createGain();
  hiss.buffer = noiseBuffer(ctx, 9, 0.6);
  hiss.loop = true;
  hissFilter.type = "bandpass";
  hissFilter.frequency.value = 2600;
  hissFilter.Q.value = 0.7;
  hissGain.gain.value = 0.05;
  hiss.connect(hissFilter).connect(hissGain).connect(out);
  hiss.start();
  sources.push(hiss);

  // Occasional life in the room: a footstep, a chair, a page somewhere.
  const timer = window.setInterval(() => {
    if (!soundEnabled() || !context) return;
    const roll = Math.random();
    if (roll < 0.4) footstep();
    else if (roll < 0.7) playPageTurn();
    else chair();
  }, 6500);

  ambience = { sources, gain: out, timer };
}

export function stopAmbience() {
  if (!ambience) return;
  window.clearInterval(ambience.timer);
  for (const s of ambience.sources) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  ambience.gain.disconnect();
  ambience = null;
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

function footstep() {
  noiseGesture(0.16, 0.09, 180, "lowpass");
}

function chair() {
  noiseGesture(0.4, 0.05, 900, "bandpass");
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
