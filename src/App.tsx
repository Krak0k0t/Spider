import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { SettingsModal } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchControls } from './components/TouchControls';
import { OrbWeaverEngine } from './game/engine';
import { isRtlLanguage } from './game/i18n';
import { loadUserSettings, saveUserSettings } from './game/settings';
import { SOUNDTRACK_TRACKS } from './game/soundtrack';
import type { HudSnapshot, PatternShape, UserSettings } from './game/types';

function buildInitialHud(settings: UserSettings): HudSnapshot {
  return {
    screen: 'title',
    outcome: null,
    chapter: 'prologue',
    zone: 'log',
    silk: 44,
    maxSilk: 160,
    composure: 3,
    maxComposure: 3,
    fear: 0,
    hiddenInNettle: false,
    isGrounded: true,
    selectedMode: 'triangle',
    hasGrapple: false,
    waspState: 'absent',
    waspDistance: 20,
    weather: 'calm',
    windStrength: 0.14,
    patternsCount: 0,
    fliesCaught: 0,
    caughtSpecies: { fatbelly: 0, nimble: 0, greenie: 0, tearbearer: 0 },
    greatStrandsDone: 0,
    greatStrandsTotal: 6,
    greatAnchorsDone: { stump: false, leftBirch: false, rightBirch: false },
    whisperId: 'prologue_intro',
    whisperSpeaker: 'pavutin',
    moonRestored: 0.35,
    elapsedSeconds: 0,
    muted: false,
    nearAnchorId: null,
    nearAnchorLabel: null,
    activeThreadFromId: null,
    activeThreadFromLabel: null,
    canClosePattern: false,
    canHarvestFly: false,
    combatStance: false,
    canGrappleId: null,
    canGrappleLabel: null,
    musicTrackIndex: 0,
    musicTrackId: SOUNDTRACK_TRACKS[0].id,
    musicIsPlaying: false,
    musicPaused: false,
    musicAvailableCount: 0,
    difficulty: settings.difficulty,
    graphics: settings.graphics,
    language: settings.language,
  };
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<OrbWeaverEngine | null>(null);

  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings());
  const [hud, setHud] = useState<HudSnapshot>(() => buildInitialHud(settings));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [cinemaFullscreen, setCinemaFullscreen] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const isFullscreen = nativeFullscreen || cinemaFullscreen;

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setCinemaFullscreen(false);
        return;
      }
      if (cinemaFullscreen) {
        setCinemaFullscreen(false);
        return;
      }
      const rootEl = document.documentElement;
      if (typeof rootEl.requestFullscreen === 'function') {
        await rootEl.requestFullscreen();
        return;
      }
      setCinemaFullscreen(true);
    } catch {
      // Sandbox iframes or headless browsers may disallow native Fullscreen API;
      // toggle in-app cinema fullscreen state cleanly so UX always responds.
      setCinemaFullscreen((prev) => !prev);
    }
  }, [cinemaFullscreen]);

  const toggleFullscreenRef = useRef(handleToggleFullscreen);
  useEffect(() => {
    toggleFullscreenRef.current = handleToggleFullscreen;
  }, [handleToggleFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setNativeFullscreen(active);
      if (!active) setCinemaFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.language === 'elv' || settings.language === 'orc'
      ? 'en'
      : settings.language;
    document.documentElement.dir = isRtlLanguage(settings.language) ? 'rtl' : 'ltr';
    saveUserSettings(settings);
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    engineRef.current?.setInputSuspended(settingsOpen);
  }, [settingsOpen]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    try {
      const initialSettings = loadUserSettings();
      const engine = new OrbWeaverEngine(
        container,
        (snapshot) => setHud(snapshot),
        autostart,
        initialSettings,
        () => {
          void toggleFullscreenRef.current();
        },
      );
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglError(true);
    }
  }, []);

  const handleStart = useCallback(() => engineRef.current?.startGame(), []);
  const handlePause = useCallback(() => engineRef.current?.pauseGame(), []);
  const handleResume = useCallback(() => engineRef.current?.resumeGame(), []);
  const handleRestart = useCallback(() => engineRef.current?.restartGame(), []);
  const handleTitle = useCallback(() => engineRef.current?.returnToTitle(), []);
  const handleToggleMute = useCallback(() => engineRef.current?.toggleMute(), []);
  const handleSelectMode = useCallback(
    (mode: PatternShape) => engineRef.current?.setPatternMode(mode),
    [],
  );
  const handleSelectTrack = useCallback(
    (index: number) => engineRef.current?.selectMusicTrack(index),
    [],
  );
  const handleNextTrack = useCallback(() => engineRef.current?.nextMusicTrack(), []);
  const handlePrevTrack = useCallback(() => engineRef.current?.prevMusicTrack(), []);
  const handleToggleMusic = useCallback(
    () => engineRef.current?.toggleMusicPlayback(),
    [],
  );
  const handleImportMusicFiles = useCallback((files: FileList) => {
    void engineRef.current?.importCustomMusicFiles(files);
  }, []);

  const handleTouchMove = useCallback((x: number, y: number) => {
    engineRef.current?.setTouchMove(x, y);
  }, []);
  const handleTouchJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);
  const handleTouchWeave = useCallback(() => {
    engineRef.current?.triggerPrimaryInteract();
  }, []);
  const handleTouchHarvest = useCallback(() => {
    engineRef.current?.tryHarvestNearbyFly();
  }, []);
  const handleTouchGrapple = useCallback(() => {
    engineRef.current?.triggerGrapple();
  }, []);

  return (
    <main
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      className={`relative h-screen w-screen overflow-hidden bg-[#070b12] ${
        cinemaFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        data-testid="orb-weaver-canvas"
        className="fixed inset-0 h-full w-full"
      />

      {webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070b12] p-6 text-center">
          <div className="max-w-md rounded border border-[#9ec5ff]/25 bg-[#0b1220] p-6">
            <h1 className="font-display text-2xl font-semibold text-white">
              Unable to initialize 3D WebGL scene
            </h1>
            <p className="mt-2 text-sm text-[#9cb2cf]">
              Please refresh the page or enable hardware acceleration in your browser.
            </p>
          </div>
        </div>
      )}

      {hud.screen === 'title' && (
        <TitleOverlay
          settings={settings}
          muted={hud.muted}
          isFullscreen={isFullscreen}
          musicTrackIndex={hud.musicTrackIndex}
          musicPaused={hud.musicPaused}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleFullscreen={handleToggleFullscreen}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          onToggleMusic={handleToggleMusic}
        />
      )}

      {hud.screen === 'playing' && (
        <>
          <GameHUD
            hud={hud}
            settings={settings}
            isFullscreen={isFullscreen}
            onSelectMode={handleSelectMode}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onRestart={handleRestart}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleFullscreen={handleToggleFullscreen}
            onReturnToTitle={handleTitle}
          />
          <TouchControls
            hud={hud}
            mode={settings.touchControlsMode}
            onMove={handleTouchMove}
            onJump={handleTouchJump}
            onWeave={handleTouchWeave}
            onHarvest={handleTouchHarvest}
            onGrapple={handleTouchGrapple}
          />
        </>
      )}

      <StatusModal
        hud={hud}
        isFullscreen={isFullscreen}
        onResume={handleResume}
        onRestart={handleRestart}
        onTitle={handleTitle}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleFullscreen={handleToggleFullscreen}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onToggleMusic={handleToggleMusic}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        isFullscreen={isFullscreen}
        musicTrackIndex={hud.musicTrackIndex}
        musicPaused={hud.musicPaused}
        musicAvailableCount={hud.musicAvailableCount}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onToggleFullscreen={handleToggleFullscreen}
        onSelectTrack={handleSelectTrack}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        onToggleMusic={handleToggleMusic}
        onImportMusicFiles={handleImportMusicFiles}
      />
    </main>
  );
}
