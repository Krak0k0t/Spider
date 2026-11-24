import {
  getNextCarouselIndex,
  getPrevCarouselIndex,
  normalizeTrackIndex,
  SOUNDTRACK_TRACKS,
  type SoundtrackTrack,
} from './soundtrack';
import type { LocationZone } from './types';

export interface MusicCarouselStatus {
  trackIndex: number;
  trackId: string;
  isPlaying: boolean;
  paused: boolean;
  availableCount: number;
}

const CUSTOM_DB_NAME = 'orb_weaver_custom_music_v1';
const CUSTOM_STORE_NAME = 'tracks';

function openCustomMusicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(CUSTOM_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_STORE_NAME)) {
        db.createObjectStore(CUSTOM_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function matchTrackIndexForFilename(filename: string): number {
  const clean = filename.trim().toLowerCase();
  const exact = SOUNDTRACK_TRACKS.findIndex((t) => t.file.toLowerCase() === clean);
  if (exact !== -1) return exact;
  return SOUNDTRACK_TRACKS.findIndex((t) =>
    clean.includes(t.file.replace(/\.ogg$/i, '').toLowerCase()),
  );
}

/**
 * Spatial SFX + Muffled Nocturnal Soundtrack Carousel for Orb Weaver:
 * - Synthesized music completely removed; replaced by 7-track .ogg carousel playback
 * - Supports user's exact 7 .ogg tracks (via /public/music/ or IndexedDB import)
 *   and immediately plays verified GitHub open-source nocturnal .ogg tracks as active fallback
 * - Routes soundtrack through a soft muffled low-pass filter (~1150 Hz) at subdued gain
 * - Auto-starts cleanly and unlocks on first pointer/key gesture anywhere on window
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundtrackFilter: BiquadFilterNode | null = null;
  private soundtrackGain: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private audioRouted = false;

  private availableFiles = new Set<string>();
  private ambientFiles = new Set<string>();
  private customBlobUrls = new Map<string, string>();
  private manifestLoaded = false;
  private manifestPromise: Promise<void> | null = null;
  private currentTrackIndex = 0;
  private userPaused = false;
  private wantsAutoplay = true;
  private onMusicChange?: () => void;

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
  private disposed = false;

  constructor(onMusicChange?: () => void) {
    this.onMusicChange = onMusicChange;
    this.bindGestureUnlock();
    this.initMusicManifest();
  }

  private onUserGestureUnlock = (): void => {
    if (this.disposed) return;
    this.ensureStarted();
    if (this.wantsAutoplay && !this.userPaused) {
      void this.tryStartCurrentTrack();
    }
  };

  private bindGestureUnlock(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('pointerdown', this.onUserGestureUnlock, { passive: true });
    window.addEventListener('keydown', this.onUserGestureUnlock, { passive: true });
  }

  private unbindGestureUnlock(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointerdown', this.onUserGestureUnlock);
    window.removeEventListener('keydown', this.onUserGestureUnlock);
  }

  private initMusicManifest(): void {
    if (typeof window === 'undefined') return;
    const manifestTask =
      typeof fetch === 'function'
        ? fetch('/music/manifest.json', { cache: 'no-cache' })
            .then(async (res) => {
              if (!res.ok) return;
              const data = (await res.json()) as {
                available?: unknown;
                ambient?: unknown;
              };
              if (Array.isArray(data?.available)) {
                data.available.forEach((f) => {
                  if (typeof f === 'string' && f.trim()) {
                    this.availableFiles.add(f.trim());
                  }
                });
              }
              if (Array.isArray(data?.ambient)) {
                data.ambient.forEach((f) => {
                  if (typeof f === 'string' && f.trim()) {
                    this.ambientFiles.add(f.trim());
                  }
                });
              }
            })
            .catch(() => {
              // Ignore fetch errors cleanly
            })
        : Promise.resolve();

    const idbTask = this.loadCustomTracksFromDb();

    this.manifestPromise = Promise.all([manifestTask, idbTask]).then(() => {
      this.manifestLoaded = true;
      if (!this.disposed && this.wantsAutoplay && !this.userPaused) {
        void this.tryStartCurrentTrack();
      }
      this.onMusicChange?.();
    });
  }

  private async loadCustomTracksFromDb(): Promise<void> {
    try {
      const db = await openCustomMusicDb();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(CUSTOM_STORE_NAME, 'readonly');
        const store = tx.objectStore(CUSTOM_STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          const key = String(cursor.key);
          const val = cursor.value;
          if (val instanceof Blob && !this.disposed) {
            const prev = this.customBlobUrls.get(key);
            if (prev) URL.revokeObjectURL(prev);
            this.customBlobUrls.set(key, URL.createObjectURL(val));
          }
          cursor.continue();
        };
        req.onerror = () => resolve();
      });
      db.close();
    } catch {
      // IndexedDB unavailable in private contexts — ignore
    }
  }

  public async importCustomMusicFiles(files: FileList | File[]): Promise<number> {
    const arr = Array.from(files);
    if (arr.length === 0) return 0;

    let imported = 0;
    let db: IDBDatabase | null = null;
    try {
      db = await openCustomMusicDb();
    } catch {
      db = null;
    }

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const matchedIdx = matchTrackIndexForFilename(file.name);
      const targetTrack =
        matchedIdx !== -1
          ? SOUNDTRACK_TRACKS[matchedIdx]
          : SOUNDTRACK_TRACKS[i % SOUNDTRACK_TRACKS.length];
      if (!targetTrack) continue;

      const prevUrl = this.customBlobUrls.get(targetTrack.file);
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      this.customBlobUrls.set(targetTrack.file, URL.createObjectURL(file));
      imported++;

      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db!.transaction(CUSTOM_STORE_NAME, 'readwrite');
          tx.objectStore(CUSTOM_STORE_NAME).put(file, targetTrack.file);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    }

    db?.close();
    if (imported > 0) {
      this.userPaused = false;
      this.wantsAutoplay = true;
      await this.tryStartCurrentTrack(true);
      this.onMusicChange?.();
    }
    return imported;
  }

  private resolveTrackPlaybackUrl(track: SoundtrackTrack): string | null {
    const blobUrl = this.customBlobUrls.get(track.file);
    if (blobUrl) return blobUrl;
    if (this.availableFiles.has(track.file)) return track.url;
    if (this.ambientFiles.has(track.fallbackFile)) return track.fallbackUrl;
    return null;
  }

  private hasPlayableSource(track: SoundtrackTrack): boolean {
    return this.resolveTrackPlaybackUrl(track) !== null;
  }

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.loop = false;
      el.volume = 0.22; // subdued fallback level if Web Audio node routing isn't active yet
      el.addEventListener('ended', () => {
        if (this.disposed) return;
        this.advanceCarousel(1, true);
      });
      el.addEventListener('play', () => {
        this.unbindGestureUnlock();
        this.onMusicChange?.();
      });
      el.addEventListener('pause', () => this.onMusicChange?.());
      el.addEventListener('error', () => {
        if (this.disposed) return;
        this.onMusicChange?.();
      });
      this.audioEl = el;
    }
    return this.audioEl;
  }

  private routeAudioElementThroughMuffledBus(): void {
    if (this.audioRouted || !this.ctx || !this.soundtrackGain || !this.audioEl) return;
    try {
      const src = this.ctx.createMediaElementSource(this.audioEl);
      src.connect(this.soundtrackGain);
      this.audioEl.volume = 1.0; // muffled level controlled smoothly via Web Audio soundtrackGain
      this.audioSourceNode = src;
      this.audioRouted = true;
    } catch {
      // Fallback to native HTMLAudioElement volume if media routing fails
    }
  }

  private async tryStartCurrentTrack(forceRestart = false): Promise<void> {
    if (this.disposed || this.userPaused) return;
    if (!this.manifestLoaded && this.manifestPromise) {
      await this.manifestPromise;
    }
    const track = SOUNDTRACK_TRACKS[this.currentTrackIndex];
    if (!track) return;
    const rawUrl = this.resolveTrackPlaybackUrl(track);
    if (!rawUrl) return;

    const el = this.ensureAudioElement();
    if (!el) return;
    this.routeAudioElementThroughMuffledBus();

    const resolvedHref = rawUrl.startsWith('blob:')
      ? rawUrl
      : new URL(rawUrl, window.location.origin).href;

    if (forceRestart || el.src !== resolvedHref) {
      el.src = rawUrl;
    }
    el.muted = this.muted;
    try {
      await el.play();
    } catch {
      // Browser autoplay restriction: queued and unlocks automatically on first gesture
    }
    this.onMusicChange?.();
  }

  public getMusicStatus(): MusicCarouselStatus {
    const track = SOUNDTRACK_TRACKS[this.currentTrackIndex] || SOUNDTRACK_TRACKS[0];
    const isPlaying = Boolean(
      this.audioEl &&
        !this.audioEl.paused &&
        !this.audioEl.ended &&
        this.hasPlayableSource(track),
    );
    const playableCount = SOUNDTRACK_TRACKS.filter((t) => this.hasPlayableSource(t)).length;
    return {
      trackIndex: this.currentTrackIndex,
      trackId: track.id,
      isPlaying,
      paused: this.userPaused,
      availableCount: playableCount,
    };
  }

  public selectTrack(index: number, autoplay = true): void {
    this.ensureStarted();
    this.currentTrackIndex = normalizeTrackIndex(index, SOUNDTRACK_TRACKS.length);
    if (autoplay) {
      this.userPaused = false;
      this.wantsAutoplay = true;
      void this.tryStartCurrentTrack(true);
    }
    this.onMusicChange?.();
  }

  public advanceCarousel(delta: -1 | 1, fromAutoEnd = false): void {
    const nextIdx =
      delta >= 0
        ? getNextCarouselIndex(this.currentTrackIndex, SOUNDTRACK_TRACKS.length)
        : getPrevCarouselIndex(this.currentTrackIndex, SOUNDTRACK_TRACKS.length);

    if (fromAutoEnd) {
      let candidate = nextIdx;
      for (let i = 0; i < SOUNDTRACK_TRACKS.length; i++) {
        if (this.hasPlayableSource(SOUNDTRACK_TRACKS[candidate])) {
          this.selectTrack(candidate, true);
          return;
        }
        candidate = getNextCarouselIndex(candidate, SOUNDTRACK_TRACKS.length);
      }
    }
    this.selectTrack(nextIdx, !this.userPaused || !fromAutoEnd);
  }

  public nextTrack(): void {
    this.ensureStarted();
    this.userPaused = false;
    this.advanceCarousel(1, false);
  }

  public prevTrack(): void {
    this.ensureStarted();
    this.userPaused = false;
    this.advanceCarousel(-1, false);
  }

  public toggleMusicPlayback(): void {
    this.ensureStarted();
    if (this.userPaused) {
      this.userPaused = false;
      this.wantsAutoplay = true;
      void this.tryStartCurrentTrack();
    } else {
      this.userPaused = true;
      this.audioEl?.pause();
    }
    this.onMusicChange?.();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.audioEl) {
      this.audioEl.muted = mute;
    }
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
      if (
        this.wantsAutoplay &&
        !this.userPaused &&
        (!this.audioEl || this.audioEl.paused)
      ) {
        void this.tryStartCurrentTrack();
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

      // Muffled nocturnal bus for soundtrack carousel playback (~1150 Hz soft low-pass, subdued level)
      const soundtrackFilter = ctx.createBiquadFilter();
      soundtrackFilter.type = 'lowpass';
      soundtrackFilter.frequency.value = 1150;
      soundtrackFilter.Q.value = 0.65;

      const soundtrackGain = ctx.createGain();
      soundtrackGain.gain.value = 0.2;
      soundtrackGain.connect(soundtrackFilter);
      soundtrackFilter.connect(master);

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
        const grain =
          Math.random() > 0.86
            ? (Math.random() * 2 - 1) * 1.45
            : (Math.random() * 2 - 1) * 0.45;
        stepData[i] = grain * env;
      }

      this.ctx = ctx;
      this.masterGain = master;
      this.soundtrackFilter = soundtrackFilter;
      this.soundtrackGain = soundtrackGain;
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

      if (this.wantsAutoplay && !this.userPaused) {
        void this.tryStartCurrentTrack();
      }
    } catch {
      // Headless or blocked audio context — fail silently
    }
  }

  public updateAmbience(params: {
    active: boolean;
    isTitle: boolean;
    zone: LocationZone;
    isGusty: boolean;
    hiddenInNettle: boolean;
  }): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Gentle dynamic muffling when hidden inside nettles or on paused/title screen
    if (this.soundtrackGain && this.soundtrackFilter) {
      const targetGain = !params.active ? 0.12 : params.isTitle ? 0.17 : 0.21;
      const targetCut = params.hiddenInNettle ? 740 : params.isTitle ? 1050 : 1220;
      this.soundtrackGain.gain.setTargetAtTime(targetGain, t, 0.25);
      this.soundtrackFilter.frequency.setTargetAtTime(targetCut, t, 0.25);
    }

    if (this.windGain && this.windFilter) {
      if (!params.active) {
        this.windGain.gain.setTargetAtTime(0, t, 0.2);
      } else {
        const targetWind = params.isGusty
          ? 0.115
          : params.zone === 'field'
            ? 0.042
            : 0.016;
        this.windGain.gain.setTargetAtTime(targetWind, t, 0.35);
        this.windFilter.frequency.setTargetAtTime(params.isGusty ? 760 : 380, t, 0.4);
      }
    }
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
    if (
      !this.ctx ||
      !this.flyGain ||
      !this.flyFilter ||
      !this.flyOsc1 ||
      !this.flyOsc2
    ) {
      return;
    }
    const t = this.ctx.currentTime;
    if (
      !params.active ||
      !Number.isFinite(params.nearestDistance) ||
      params.nearestDistance > 13.5
    ) {
      this.flyGain.gain.setTargetAtTime(0, t, 0.14);
      return;
    }

    const proximity = Math.max(
      0,
      Math.min(1, 1 - (params.nearestDistance - 1.1) / 12.4),
    );
    const flutter =
      1 + Math.sin(params.elapsed * (params.isCaught ? 36 : 19)) * 0.18;
    const gain =
      proximity * proximity * (params.isCaught ? 0.068 : 0.048) * flutter;
    const baseFreq =
      (params.isCaught ? 242 : 212) +
      proximity * 26 +
      Math.sin(params.elapsed * 14) * 6;

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
    this.disposed = true;
    this.unbindGestureUnlock();
    try {
      this.customBlobUrls.forEach((u) => URL.revokeObjectURL(u));
      this.customBlobUrls.clear();
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      }
      this.audioSourceNode?.disconnect();
      this.waspOsc?.stop();
      this.waspSubOsc?.stop();
      this.flyOsc1?.stop();
      this.flyOsc2?.stop();
      this.windSource?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.initialized = false;
  }
}
