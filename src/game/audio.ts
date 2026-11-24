import type { ChapterPhase, LocationZone, WaspState, WeatherState } from './types';

export interface MusicContext {
  active: boolean;
  isTitle: boolean;
  zone: LocationZone;
  chapter: ChapterPhase;
  waspState: WaspState;
  fear: number; // 0..100
  hiddenInNettle: boolean;
  weather: WeatherState;
}

/**
 * Procedural Web Audio soundscape & adaptive nocturnal forest score for Orb Weaver:
 * - Adaptive music scheduler varying harmony, instrumentation, tempo & filter by zone and threat
 * - Violin-like silk string plucks, pattern chords, jump/land thuds, grapple zip, fly chime
 * - Spatialized wasp buzz modulated by distance and nettle cover + wind noise bed
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padGain: GainNode | null = null;

  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;

  private waspOsc: OscillatorNode | null = null;
  private waspSubOsc: OscillatorNode | null = null;
  private waspFilter: BiquadFilterNode | null = null;
  private waspGain: GainNode | null = null;

  private flyOsc1: OscillatorNode | null = null;
  private flyOsc2: OscillatorNode | null = null;
  private flyFilter: BiquadFilterNode | null = null;
  private flyGain: GainNode | null = null;
  private grassStepBuffer: AudioBuffer | null = null;

  private muted = false;
  private initialized = false;
  private musicStepAccum = 0;
  private musicBeatIdx = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        mute ? 0 : 0.44,
        this.ctx.currentTime,
        0.06,
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public ensureStarted(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.44;
      master.connect(ctx.destination);

      // Adaptive Music Bus with dynamic warmth filter
      const musicFilter = ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.value = 1800;
      musicFilter.Q.value = 0.8;

      const musicBus = ctx.createGain();
      musicBus.gain.value = 0.24;
      musicBus.connect(musicFilter);
      musicFilter.connect(master);

      // Continuous nocturnal harmonic pad drone (gentle sine + warm triangle)
      const padGain = ctx.createGain();
      padGain.gain.value = 0.08;
      padGain.connect(musicBus);

      const padOsc1 = ctx.createOscillator();
      padOsc1.type = 'sine';
      padOsc1.frequency.value = 146.83; // D3

      const padOsc2 = ctx.createOscillator();
      padOsc2.type = 'triangle';
      padOsc2.frequency.value = 220.0; // A3

      padOsc1.connect(padGain);
      padOsc2.connect(padGain);
      padOsc1.start();
      padOsc2.start();

      // Filtered wind shimmer bed
      const bufLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      let b0 = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.96 * b0 + white * 0.04;
        ch[i] = b0 * 1.4;
      }
      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuf;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 1.6;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.0;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();

      // Continuous spatial wasp hum
      const waspFilter = ctx.createBiquadFilter();
      waspFilter.type = 'lowpass';
      waspFilter.frequency.value = 320;
      waspFilter.Q.value = 2.4;

      const waspGain = ctx.createGain();
      waspGain.gain.value = 0;

      const waspOsc = ctx.createOscillator();
      waspOsc.type = 'sawtooth';
      waspOsc.frequency.value = 132;

      const waspSubOsc = ctx.createOscillator();
      waspSubOsc.type = 'triangle';
      waspSubOsc.frequency.value = 66;

      waspOsc.connect(waspFilter);
      waspSubOsc.connect(waspFilter);
      waspFilter.connect(waspGain);
      waspGain.connect(master);

      waspOsc.start();
      waspSubOsc.start();

      // Quiet spatial fly wing buzz (scales smoothly when approaching a fly)
      const flyFilter = ctx.createBiquadFilter();
      flyFilter.type = 'bandpass';
      flyFilter.frequency.value = 640;
      flyFilter.Q.value = 2.6;

      const flyGain = ctx.createGain();
      flyGain.gain.value = 0;

      const flyOsc1 = ctx.createOscillator();
      flyOsc1.type = 'sawtooth';
      flyOsc1.frequency.value = 216;

      const flyOsc2 = ctx.createOscillator();
      flyOsc2.type = 'triangle';
      flyOsc2.frequency.value = 434;

      flyOsc1.connect(flyFilter);
      flyOsc2.connect(flyFilter);
      flyFilter.connect(flyGain);
      flyGain.connect(master);

      flyOsc1.start();
      flyOsc2.start();

      // Organic short noise buffer with sparse micro-crackles for grass/foliage footsteps
      const stepLen = Math.floor(ctx.sampleRate * 0.085);
      const stepBuf = ctx.createBuffer(1, stepLen, ctx.sampleRate);
      const stepData = stepBuf.getChannelData(0);
      for (let i = 0; i < stepLen; i++) {
        const env = Math.pow(1 - i / stepLen, 1.8);
        const grain = Math.random() > 0.86 ? (Math.random() * 2 - 1) * 1.45 : (Math.random() * 2 - 1) * 0.45;
        stepData[i] = grain * env;
      }

      this.ctx = ctx;
      this.masterGain = master;
      this.musicBus = musicBus;
      this.musicFilter = musicFilter;
      this.padOsc1 = padOsc1;
      this.padOsc2 = padOsc2;
      this.padGain = padGain;
      this.windSource = windSource;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.waspOsc = waspOsc;
      this.waspSubOsc = waspSubOsc;
      this.waspFilter = waspFilter;
      this.waspGain = waspGain;
      this.flyOsc1 = flyOsc1;
      this.flyOsc2 = flyOsc2;
      this.flyFilter = flyFilter;
      this.flyGain = flyGain;
      this.grassStepBuffer = stepBuf;
      this.initialized = true;
    } catch {
      // Headless or blocked audio context — fail silently
    }
  }

  public updateAdaptiveMusic(dt: number, mc: MusicContext): void {
    if (!this.ctx || !this.musicBus || !this.musicFilter || !this.padOsc1 || !this.padOsc2 || !this.padGain) {
      return;
    }
    const t = this.ctx.currentTime;

    if (!mc.active) {
      this.musicBus.gain.setTargetAtTime(0.04, t, 0.25);
      if (this.windGain) this.windGain.gain.setTargetAtTime(0, t, 0.2);
      return;
    }

    // Determine mood: tension vs stealth vs open field vs snag calm vs victory
    const isDanger =
      !mc.isTitle &&
      (mc.waspState === 'investigate' || mc.waspState === 'dive' || mc.fear > 45);
    const isStealth = !mc.isTitle && mc.hiddenInNettle;
    const isGusty = !mc.isTitle && mc.weather === 'gusty';

    // Pad harmonic root per location & state
    let rootHz = 146.83; // D3 (Snag / Title)
    let fifthHz = 220.0; // A3
    let filterHz = 1750;
    let stepInterval = 0.62;

    if (mc.chapter === 'victory') {
      rootHz = 174.61; // F3 luminous lunar major
      fifthHz = 261.63; // C4
      filterHz = 2600;
      stepInterval = 0.48;
    } else if (isDanger) {
      rootHz = 138.59; // C#3 tense
      fifthHz = 196.0; // G3 tritone tension
      filterHz = 2200;
      stepInterval = 0.28;
    } else if (isStealth) {
      rootHz = 110.0; // A2 hushed
      fifthHz = 164.81; // E3
      filterHz = 620; // Muffled leaf cover acoustic
      stepInterval = 0.72;
    } else if (mc.zone === 'field' || mc.zone === 'left_birch' || mc.zone === 'right_birch') {
      rootHz = 174.61; // F3 open Lydian clearing
      fifthHz = 261.63; // C4
      filterHz = 2100;
      stepInterval = 0.54;
    } else if (mc.zone === 'stump' || mc.zone === 'hollow') {
      rootHz = 130.81; // C3 deep hollow resonance
      fifthHz = 196.0; // G3
      filterHz = 1150;
      stepInterval = 0.68;
    }

    this.musicBus.gain.setTargetAtTime(mc.isTitle ? 0.18 : 0.26, t, 0.2);
    this.musicFilter.frequency.setTargetAtTime(filterHz, t, 0.22);
    this.padOsc1.frequency.setTargetAtTime(rootHz, t, 0.45);
    this.padOsc2.frequency.setTargetAtTime(fifthHz, t, 0.45);
    this.padGain.gain.setTargetAtTime(isDanger ? 0.12 : 0.08, t, 0.2);

    // Wind ambient volume
    if (this.windGain && this.windFilter) {
      const targetWind = isGusty ? 0.12 : mc.zone === 'field' ? 0.045 : 0.018;
      this.windGain.gain.setTargetAtTime(targetWind, t, 0.35);
      this.windFilter.frequency.setTargetAtTime(isGusty ? 760 : 380, t, 0.4);
    }

    // Trigger next melodic note
    this.musicStepAccum += dt;
    if (this.musicStepAccum >= stepInterval) {
      this.musicStepAccum = 0;
      this.playAdaptiveNote(mc, isDanger, isStealth);
    }
  }

  private playAdaptiveNote(
    mc: MusicContext,
    isDanger: boolean,
    isStealth: boolean,
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    const step = this.musicBeatIdx++;

    // Scale palettes per location & state
    const scales: Record<string, number[]> = {
      calmLog: [293.66, 349.23, 440.0, 523.25, 659.25, 587.33, 440.0, 392.0], // D Dorian harp
      fieldLydian: [349.23, 440.0, 523.25, 659.25, 783.99, 659.25, 493.88, 440.0], // F Lydian starlight
      stumpHollow: [261.63, 311.13, 392.0, 466.16, 392.0, 311.13, 293.66, 261.63], // C Dorian hollow
      stealthNettle: [220.0, 261.63, 329.63, 293.66, 220.0, 246.94, 329.63, 261.63], // Soft A minor
      waspDanger: [277.18, 293.66, 392.0, 277.18, 415.3, 392.0, 293.66, 261.63], // Tense ostinato
      victory: [349.23, 440.0, 523.25, 698.46, 880.0, 783.99, 659.25, 523.25], // Lunar triumph
    };

    let key = 'calmLog';
    if (mc.chapter === 'victory') key = 'victory';
    else if (isDanger) key = 'waspDanger';
    else if (isStealth) key = 'stealthNettle';
    else if (mc.zone === 'field' || mc.zone === 'left_birch' || mc.zone === 'right_birch')
      key = 'fieldLydian';
    else if (mc.zone === 'stump' || mc.zone === 'hollow') key = 'stumpHollow';

    const scale = scales[key];
    const freq = scale[step % scale.length];

    // Skip sparse rests for natural breathing phrasing
    if (!isDanger && step % 5 === 4) return;

    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = isDanger ? 'sawtooth' : isStealth ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * (isDanger ? 1.5 : 2.0), t);

    const peak = isDanger ? 0.095 : isStealth ? 0.07 : 0.12;
    const decay = isDanger ? 0.26 : isStealth ? 0.45 : 0.85;

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + decay);

    const overGain = this.ctx.createGain();
    overGain.gain.value = 0.22;

    osc.connect(g);
    overtone.connect(overGain);
    overGain.connect(g);
    g.connect(this.musicBus);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + decay + 0.04);
    overtone.stop(t + decay + 0.04);
  }

  public updateWaspBuzz(params: {
    active: boolean;
    distance: number;
    hiddenInNettle: boolean;
    hearingMultiplier: number;
    isDiving: boolean;
  }): void {
    if (!this.ctx || !this.waspGain || !this.waspFilter || !this.waspOsc) {
      return;
    }
    const t = this.ctx.currentTime;
    if (!params.active || params.distance > 22) {
      this.waspGain.gain.setTargetAtTime(0, t, 0.12);
      return;
    }

    const proximity = Math.max(0, Math.min(1, 1 - (params.distance - 2) / 20));
    const gain = proximity * proximity * 0.18 * Math.min(1.8, params.hearingMultiplier);
    const cutoff = params.hiddenInNettle
      ? 240 + proximity * 280
      : 420 + proximity * 950;
    const freq = params.isDiving ? 176 : 126 + proximity * 24;

    this.waspGain.gain.setTargetAtTime(gain, t, 0.08);
    this.waspFilter.frequency.setTargetAtTime(cutoff, t, 0.08);
    this.waspOsc.frequency.setTargetAtTime(freq, t, 0.06);
  }

  public updateFlyBuzz(params: {
    active: boolean;
    nearestDistance: number;
    isCaught: boolean;
    elapsed: number;
  }): void {
    if (!this.ctx || !this.flyGain || !this.flyFilter || !this.flyOsc1 || !this.flyOsc2) {
      return;
    }
    const t = this.ctx.currentTime;
    if (!params.active || !Number.isFinite(params.nearestDistance) || params.nearestDistance > 13.5) {
      this.flyGain.gain.setTargetAtTime(0, t, 0.14);
      return;
    }

    const proximity = Math.max(0, Math.min(1, 1 - (params.nearestDistance - 1.1) / 12.4));
    const flutter = 1 + Math.sin(params.elapsed * (params.isCaught ? 36 : 19)) * 0.18;
    const gain = proximity * proximity * (params.isCaught ? 0.068 : 0.048) * flutter;
    const baseFreq = (params.isCaught ? 242 : 212) + proximity * 26 + Math.sin(params.elapsed * 14) * 6;

    this.flyGain.gain.setTargetAtTime(gain, t, 0.07);
    this.flyFilter.frequency.setTargetAtTime(480 + proximity * 520, t, 0.08);
    this.flyOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.flyOsc2.frequency.setTargetAtTime(baseFreq * 2.02, t, 0.05);
  }

  public playGrassStep(hiddenInNettle: boolean, zone: LocationZone): void {
    if (!this.ctx || !this.masterGain || !this.grassStepBuffer || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.grassStepBuffer;
    src.playbackRate.value = 0.88 + Math.random() * 0.28;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = zone === 'log' ? 580 : 820;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = hiddenInNettle
      ? 1450 + Math.random() * 450
      : zone === 'log'
        ? 1150 + Math.random() * 380
        : 2200 + Math.random() * 750;
    bp.Q.value = 1.75;

    const gain = this.ctx.createGain();
    const peak = hiddenInNettle ? 0.072 : 0.052;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.065);

    src.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.08);
  }

  public silenceLoops(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.waspGain?.gain.setTargetAtTime(0, t, 0.05);
    this.flyGain?.gain.setTargetAtTime(0, t, 0.05);
    this.windGain?.gain.setTargetAtTime(0, t, 0.05);
    this.musicBus?.gain.setTargetAtTime(0.03, t, 0.08);
  }

  public playJump(): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.12);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playLand(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  public playSilkPluck(strandLength: number): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const baseFreq = Math.max(220, Math.min(740, 680 - strandLength * 36));
    const osc = this.ctx.createOscillator();
    const harm = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.008, t + 0.18);

    harm.type = 'sine';
    harm.frequency.setValueAtTime(baseFreq * 2, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 2.2, t);
    filter.Q.value = 1.6;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);

    osc.connect(filter);
    harm.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    harm.start(t);
    osc.stop(t + 0.44);
    harm.stop(t + 0.44);
  }

  public playPatternClosed(isDecoy: boolean): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const notes = isDecoy ? [392, 466.16, 587.33] : [329.63, 493.88, 659.25];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.72);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  }

  public playFlyCapture(): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.14);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playGrappleZip(): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.22);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.34);
  }

  public playSnapWarning(): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(72, t + 0.25);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playLunarTriumph(): void {
    this.ensureStarted();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const chord = [220, 329.63, 440, 554.37, 659.25];
    chord.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * 0.09;
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 2.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 2.25);
    });
  }

  public dispose(): void {
    try {
      this.waspOsc?.stop();
      this.waspSubOsc?.stop();
      this.flyOsc1?.stop();
      this.flyOsc2?.stop();
      this.padOsc1?.stop();
      this.padOsc2?.stop();
      this.windSource?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.initialized = false;
  }
}
