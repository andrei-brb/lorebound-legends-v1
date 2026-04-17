/**
 * Synthesised sound effects using the Web Audio API.
 * No external files needed — everything is generated on the fly.
 * All sounds route through a single master gain node so volume can be
 * adjusted globally via setSfxVolume().
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVolume = 0.8;

export function setSfxVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = masterVolume;
}

export function getSfxVolume(): number {
  return masterVolume;
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = masterVolume;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function out(): AudioNode {
  // Always lazily ensure ctx is built so master exists.
  getCtx();
  return master!;
}

/* ── helpers ── */

function noise(ac: AudioContext, duration: number, gain: number): { node: AudioBufferSourceNode; gain: GainNode } {
  const buf = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g);
  return { node: src, gain: g };
}

/* ── public API ── */

/** Fast airy whoosh — used on shatter / particle burst */
export function playWhoosh() {
  const ac = getCtx();
  const t = ac.currentTime;
  const { node, gain: g } = noise(ac, 0.35, 0.25);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(800, t);
  bp.frequency.exponentialRampToValueAtTime(3000, t + 0.15);
  bp.frequency.exponentialRampToValueAtTime(400, t + 0.35);
  bp.Q.value = 1.5;
  g.gain.setValueAtTime(0.25, t);
  g.gain.linearRampToValueAtTime(0, t + 0.35);
  g.connect(bp).connect(out());
  node.start(t);
  node.stop(t + 0.35);
}

/** Bright chime — used on card flip reveal */
export function playChime() {
  const ac = getCtx();
  const t = ac.currentTime;
  [880, 1320, 1760].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t + i * 0.06);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.5);
    osc.connect(g).connect(out());
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.5);
  });
}

/** Triumphant fanfare — used on legendary card reveal */
export function playFanfare() {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ac.createGain();
    const start = t + i * 0.1;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.18, start + 0.03);
    g.gain.setValueAtTime(0.18, start + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
    osc.connect(g).connect(out());
    osc.start(start);
    osc.stop(start + 1.2);
  });
  const { node, gain: ng } = noise(ac, 1.4, 0.04);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6000;
  ng.gain.linearRampToValueAtTime(0, t + 1.4);
  ng.connect(hp).connect(out());
  node.start(t);
  node.stop(t + 1.4);
}

/** Crystal shatter — used on sacrifice */
export function playShatter() {
  const ac = getCtx();
  const t = ac.currentTime;
  const { node, gain: g } = noise(ac, 0.2, 0.3);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  g.connect(hp).connect(out());
  node.start(t);
  node.stop(t + 0.2);
  [4000, 3200, 2400].forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const og = ac.createGain();
    og.gain.setValueAtTime(0.08, t + i * 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
    osc.connect(og).connect(out());
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.25);
  });
}

/** Soft collect / pickup sound — stardust arriving */
export function playCollect() {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(1400, t + 0.15);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(g).connect(out());
  osc.start(t);
  osc.stop(t + 0.3);
}
