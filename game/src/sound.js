// Warung Kilat — bunyi-bunyian dapur, disintesis langsung dengan WebAudio.
// Tanpa file suara: semua bunyi dibuat dari osilator dan noise di sini.

let audioContext = null;
let muted = false;
let sizzleNodes = null;

export function setMuted(value) {
  muted = value;
  if (muted) stopSizzle();
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (muted) return null;
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(frequency, durationSeconds, type = 'sine', volume = 0.12, when = 0) {
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSeconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSeconds + 0.05);
}

export function playClick() {
  tone(620, 0.07, 'triangle', 0.08);
}

export function playPop() {
  tone(440, 0.08, 'sine', 0.1);
  tone(880, 0.1, 'sine', 0.08, 0.05);
}

export function playDing() {
  tone(1046, 0.25, 'sine', 0.12);
  tone(1568, 0.3, 'sine', 0.08, 0.08);
}

export function playCoin() {
  tone(988, 0.09, 'square', 0.05);
  tone(1319, 0.16, 'square', 0.05, 0.07);
}

export function playFail() {
  tone(220, 0.25, 'sawtooth', 0.07);
  tone(165, 0.35, 'sawtooth', 0.07, 0.12);
}

export function playLevelUp() {
  [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.14, 'triangle', 0.1, index * 0.09));
}

// Desis wajan: noise putih yang difilter, menyala selama ada masakan di kompor.
export function startSizzle() {
  const ctx = ensureContext();
  if (!ctx || sizzleNodes) return;
  const length = ctx.sampleRate * 1;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5200;
  filter.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.value = 0.035;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  sizzleNodes = { source, gain };
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try {
    sizzleNodes.source.stop();
  } catch {
    // sudah berhenti
  }
  sizzleNodes = null;
}
