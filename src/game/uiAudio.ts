/**
 * Organic Nocturnal UI Audio Synthesizer (Zero External Files):
 * - Delicate leaf-rustle hover (soft filtered white noise puff)
 * - Silk-pluck / chitin tap button click (short resonant harmonic pluck + subtle wooden tick)
 * - Antique gramophone / wooden gear click for soundtrack carousel controls
 * - Soft spider-claw scratch on bark when new narrative whispers appear
 */

let uiCtx: AudioContext | null = null;
let uiNoiseBuf: AudioBuffer | null = null;
let uiMuted = false;
let lastHoverMs = 0;

export function setUiAudioMuted(muted: boolean): void {
  uiMuted = muted;
}

function ensureUiCtx(): AudioContext | null {
  if (uiMuted || typeof window === 'undefined') return null;
  try {
    if (!uiCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      uiCtx = new Ctx();

      const len = Math.floor(uiCtx.sampleRate * 0.14);
      const buf = uiCtx.createBuffer(1, len, uiCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.4);
      }
      uiNoiseBuf = buf;
    }
    if (uiCtx.state === 'suspended') {
      void uiCtx.resume();
    }
    return uiCtx;
  } catch {
    return null;
  }
}

export function playUiLeafHover(): void {
  const now = performance.now();
  if (now - lastHoverMs < 75) return;
  lastHoverMs = now;

  const ctx = ensureUiCtx();
  if (!ctx || !uiNoiseBuf || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = uiNoiseBuf;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1850 + Math.random() * 420;
  bp.Q.value = 2.1;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0005, t);
  g.gain.linearRampToValueAtTime(0.016, t + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0004, t + 0.09);

  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.1);
}

export function playUiSilkClick(bright = false): void {
  const ctx = ensureUiCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const base = bright ? 520 : 390;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.045);

  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.048, t + 0.007);
  g.gain.exponentialRampToValueAtTime(0.0006, t + 0.14);

  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);

  // Micro chitin tap transient
  const tick = ctx.createOscillator();
  const tg = ctx.createGain();
  tick.type = 'sine';
  tick.frequency.setValueAtTime(bright ? 1180 : 940, t);
  tick.frequency.exponentialRampToValueAtTime(320, t + 0.024);
  tg.gain.setValueAtTime(0.025, t);
  tg.gain.exponentialRampToValueAtTime(0.0006, t + 0.028);
  tick.connect(tg);
  tg.connect(ctx.destination);
  tick.start(t);
  tick.stop(t + 0.032);
}

export function playUiGramophoneClick(): void {
  const ctx = ensureUiCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Mechanical brass latch click + warm wooden resonance
  const clack = ctx.createOscillator();
  const cg = ctx.createGain();
  clack.type = 'square';
  clack.frequency.setValueAtTime(760, t);
  clack.frequency.exponentialRampToValueAtTime(190, t + 0.035);
  cg.gain.setValueAtTime(0.032, t);
  cg.gain.exponentialRampToValueAtTime(0.0006, t + 0.042);
  clack.connect(cg);
  cg.connect(ctx.destination);
  clack.start(t);
  clack.stop(t + 0.045);

  if (uiNoiseBuf) {
    const src = ctx.createBufferSource();
    src.buffer = uiNoiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 950;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.022, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.065);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.07);
  }
}

export function playUiBarkWhisper(): void {
  const ctx = ensureUiCtx();
  if (!ctx || !uiNoiseBuf || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.048;
    const src = ctx.createBufferSource();
    src.buffer = uiNoiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1150 + i * 240;
    bp.Q.value = 3.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0006, start);
    g.gain.linearRampToValueAtTime(0.015, start + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0005, start + 0.042);
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + 0.048);
  }
}
