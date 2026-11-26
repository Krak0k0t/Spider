import React, { useEffect, useRef, useState } from 'react';
import {
  formatPromptText,
  formatWhisperText,
  getTranslations,
  isRtlLanguage,
} from '../game/i18n';
import {
  computeSilkThreadGauge,
  LORE_ENTRY_IDS,
} from '../game/rules';
import { formatInputCode } from '../game/settings';
import type {
  FlySpecies,
  HudSnapshot,
  PatternShape,
  UserSettings,
} from '../game/types';
import {
  playUiBarkWhisper,
  playUiLeafHover,
  playUiSilkClick,
} from '../game/uiAudio';
import { PatternGlyphSvg } from './PatternGlyphSvg';

interface GameHUDProps {
  hud: HudSnapshot;
  settings: UserSettings;
  isFullscreen: boolean;
  showMobileControls?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onReturnToTitle: () => void;
}

const SPECIES_ORDER: FlySpecies[] = ['fatbelly', 'nimble', 'greenie', 'tearbearer'];

const SHATTER_VECTORS: [number, number][] = [
  [-16, -14],
  [14, -18],
  [-12, 14],
  [16, 12],
];

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  settings,
  isFullscreen,
  showMobileControls = false,
  onToggleMute,
  onPause,
  onRestart,
  onOpenSettings,
  onToggleFullscreen,
  onReturnToTitle,
}) => {
  const t = getTranslations(hud.language);
  const rtl = isRtlLanguage(hud.language);

  const [journalOpen, setJournalOpen] = useState(false);
  const [shatteredSlot, setShatteredSlot] = useState<number | null>(null);
  const prevComposureRef = useRef(hud.composure);

  const [patternFlash, setPatternFlash] = useState<{
    mode: PatternShape;
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const prevModeRef = useRef<PatternShape>(hud.selectedMode);
  const pointerPosRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.5 : 420,
  });
  const prevWhisperKeyRef = useRef<string>('');

  // Track pointer coords for transient holographic pattern cursor feedback
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // [Tab] key toggles collapsible Spider Journal Drawer cleanly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab' && hud.screen === 'playing') {
        e.preventDefault();
        playUiSilkClick();
        setJournalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.screen]);

  // Trigger hit shatter particles when Nature Composure drops
  useEffect(() => {
    if (hud.composure < prevComposureRef.current && !settings.reducedEffects) {
      setShatteredSlot(hud.composure);
      const timer = setTimeout(() => setShatteredSlot(null), 620);
      prevComposureRef.current = hud.composure;
      return () => clearTimeout(timer);
    }
    prevComposureRef.current = hud.composure;
  }, [hud.composure, settings.reducedEffects]);

  // Transient holographic pattern preview beside cursor on switching 1..4
  useEffect(() => {
    if (hud.selectedMode !== prevModeRef.current) {
      prevModeRef.current = hud.selectedMode;
      if (!settings.reducedEffects && !showMobileControls) {
        setPatternFlash({
          mode: hud.selectedMode,
          x: pointerPosRef.current.x,
          y: pointerPosRef.current.y,
          key: Date.now(),
        });
        const flashTimer = setTimeout(() => setPatternFlash(null), 1050);
        return () => clearTimeout(flashTimer);
      }
    }
  }, [hud.selectedMode, settings.reducedEffects, showMobileControls]);

  const silkGauge = computeSilkThreadGauge(hud.silk, hud.maxSilk);
  const fearOpacity = settings.reducedEffects
    ? Math.min(0.28, (hud.fear / 100) * 0.28)
    : Math.min(0.58, (hud.fear / 100) * 0.58);

  const chapterText = t.chapters[hud.chapter];
  const objectiveDetail = chapterText.detail
    .replace('{silk}', String(hud.silk))
    .replace('{count}', String(hud.greatStrandsDone));

  const whisperText = formatWhisperText(
    hud.language,
    hud.whisperId,
    hud.whisperParams,
  );
  const speakerLabel = t.speakers[hud.whisperSpeaker];
  const zoneLabel = t.zones[hud.zone] || hud.zone;

  useEffect(() => {
    const key = `${hud.whisperId}:${JSON.stringify(hud.whisperParams || {})}`;
    if (whisperText && key !== prevWhisperKeyRef.current) {
      prevWhisperKeyRef.current = key;
      playUiBarkWhisper();
    }
  }, [hud.whisperId, hud.whisperParams, whisperText]);

  const anchorLabel = (id: string | null, fallback: string | null) =>
    (id && t.anchors[id]) || fallback || '';

  const nearAnchorText = anchorLabel(hud.nearAnchorId, hud.nearAnchorLabel);
  const activeFromText = anchorLabel(
    hud.activeThreadFromId,
    hud.activeThreadFromLabel,
  );
  const grappleText = anchorLabel(hud.canGrappleId, hud.canGrappleLabel);

  const interactKey = formatInputCode(settings.bindings.interact[0] || 'KeyE');
  const harvestKey = formatInputCode(settings.bindings.harvest[0] || 'KeyF');
  const grappleKey = formatInputCode(settings.bindings.grapple[0] || 'KeyQ');
  const dashKey = formatInputCode(settings.bindings.dash[0] || 'ShiftLeft');

  const waspAlertText =
    hud.waspState !== 'absent' && hud.waspState !== 'departed'
      ? t.waspAlerts[hud.waspState]
      : '';

  let edgeGlowStyle: React.CSSProperties | undefined;
  if (
    !settings.reducedEffects &&
    hud.waspBearingDeg !== null &&
    hud.waspAlertLevel > 0.2
  ) {
    const rad = (hud.waspBearingDeg * Math.PI) / 180;
    const cx = Math.round(50 + Math.sin(rad) * 48);
    const cy = Math.round(50 - Math.cos(rad) * 46);
    const rgba =
      hud.waspState === 'dive'
        ? 'rgba(240, 108, 62, 0.36)'
        : hud.waspState === 'investigate'
          ? 'rgba(232, 184, 91, 0.24)'
          : 'rgba(216, 178, 96, 0.14)';
    edgeGlowStyle = {
      background: `radial-gradient(circle 42% at ${cx}% ${cy}%, ${rgba} 0%, transparent 72%)`,
    };
  }

  const dewStepsDone =
    Number(hud.dewQuest.fatbellyTriangle) +
    Number(hud.dewQuest.nimbleStar) +
    Number(hud.dewQuest.greenieCircle);

  // Curved Silk SVG path values: sag between left anchor and rotating spool
  const silkStrokeW = 1.4 + silkGauge.ratio * 2.2;
  const silkMidY = 12 + silkGauge.sagPx;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-10 pointer-events-none"
    >
      {/* Peripheral Fear & Spider-Sense Vignette */}
      {hud.fear > 10 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: fearOpacity,
            boxShadow: 'inset 0 0 115px rgba(232, 184, 91, 0.52)',
          }}
        />
      )}

      {/* Atmospheric Directional Spider-Sense Buzz Shimmer */}
      {edgeGlowStyle && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={edgeGlowStyle}
        />
      )}

      {/* Transient Holographic Pattern Glyph beside Mouse Cursor */}
      {patternFlash && (
        <div
          key={patternFlash.key}
          data-testid="hud-pattern-flash"
          aria-hidden="true"
          className="dew-reveal pointer-events-none fixed z-30 flex items-center gap-1.5 rounded-full border border-[#89ceff]/55 bg-[#121026]/82 px-3 py-1 shadow-[0_0_22px_rgba(137,206,255,0.38)]"
          style={{
            left: Math.min(
              window.innerWidth / settings.uiScale - 140,
              patternFlash.x / settings.uiScale + 18,
            ),
            top: Math.max(16, patternFlash.y / settings.uiScale - 26),
          }}
        >
          <PatternGlyphSvg shape={patternFlash.mode} active className="h-5 w-5" />
          <span className="font-hand text-base text-[#eef4ff]">
            {t.patterns[patternFlash.mode].label}
          </span>
        </div>
      )}

      {/* Top Perimeter Row: Organic Moth-Wing Stats & Utility Controls */}
      <div className="flex items-start justify-between p-2.5 sm:p-5 gap-2 sm:gap-4">
        {/* Top-Left Organic Torn-Edge Dissolving Stats Area: Curved Silk Thread + Nature Composure */}
        <div className="relative max-w-[188px] sm:max-w-sm px-3 py-2.5 sm:px-4 sm:py-3.5">
          <div
            aria-hidden="true"
            className="silk-hud-dissolve pointer-events-none absolute inset-0 -z-10"
          />
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Curved Silk Thread + Rotating Spool */}
            <div className="min-w-[82px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-medium tracking-[0.12em] text-[#89ceff] uppercase">
                  {t.silkLabel}
                </span>
                <span className="font-mono-num text-sm sm:text-base font-semibold text-[#eef4ff] hud-text-stroke">
                  {hud.silk}
                  <span className="text-[10px] font-normal text-[#7f96ba]">
                    /{hud.maxSilk}
                  </span>
                </span>
              </div>

              <svg
                viewBox="0 0 116 26"
                className="mt-0.5 h-5 w-full overflow-visible"
                aria-hidden="true"
              >
                {/* Faint backing guide thread */}
                <path
                  d="M4 11 Q54 22 96 11"
                  stroke="rgba(137,206,255,0.16)"
                  strokeWidth="1.4"
                  fill="none"
                />
                {/* Live taut/sagging luminous silk strand */}
                <path
                  d={`M4 11 Q54 ${silkMidY} 96 11`}
                  stroke="#89ceff"
                  strokeWidth={silkStrokeW}
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Dewdrop bead gliding along strand */}
                <circle
                  cx={14 + silkGauge.ratio * 72}
                  cy={11 + (silkMidY - 11) * 0.45}
                  r={1.7 + silkGauge.ratio * 1.1}
                  fill="#dce6f5"
                />
                {/* Tiny rotating wooden/chitin spool */}
                <g
                  transform={`translate(104, 11) rotate(${silkGauge.spoolTurnsDeg})`}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="6.2"
                    fill="rgba(26,23,52,0.85)"
                    stroke="#89ceff"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M-4 0H4M0 -4V4"
                    stroke="#dce6f5"
                    strokeOpacity="0.65"
                    strokeWidth="1"
                  />
                  <circle cx="0" cy="0" r="1.8" fill="#6cc997" />
                </g>
              </svg>
            </div>

            <div className="h-7 w-px bg-[#89ceff]/18" aria-hidden="true" />

            {/* Nature Composure Icons (Serene moonflower blooms + shatter particles) */}
            <div>
              <div className="text-[10px] font-medium tracking-[0.1em] text-[#89ceff] uppercase">
                {t.composureLabel}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {Array.from({ length: hud.maxComposure }).map((_, idx) => {
                  const full = idx < hud.composure;
                  const trembling = full && hud.fear > 35 && !settings.reducedEffects;
                  const shattering = shatteredSlot === idx;
                  return (
                    <div key={idx} className="relative flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 sm:h-[18px] sm:w-[18px] transition-all duration-200 ${
                          trembling ? 'silk-tremor' : full ? 'ui-breathe' : 'opacity-45'
                        }`}
                        aria-hidden="true"
                      >
                        {/* Organic moonflower petal + dew eye */}
                        <path
                          d="M12 2.5 C15.2 6.2 19.5 8.8 19.5 13 C19.5 17.5 16.2 21 12 21 C7.8 21 4.5 17.5 4.5 13 C4.5 8.8 8.8 6.2 12 2.5 Z"
                          fill={full ? 'rgba(137, 206, 255, 0.34)' : 'rgba(18, 16, 36, 0.7)'}
                          stroke={full ? '#dce6f5' : '#526282'}
                          strokeWidth="1.4"
                        />
                        <circle
                          cx="12"
                          cy="13.2"
                          r={full ? 3.2 : 1.8}
                          fill={full ? '#6cc997' : '#3a4661'}
                        />
                      </svg>
                      {shattering &&
                        SHATTER_VECTORS.map(([sx, sy], pIdx) => (
                          <span
                            key={pIdx}
                            className="shatter-particle pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#89ceff]"
                            style={
                              {
                                '--sx': `${sx}px`,
                                '--sy': `${sy}px`,
                              } as React.CSSProperties
                            }
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden sm:block h-7 w-px bg-[#89ceff]/18" aria-hidden="true" />

            {/* Trapped-Fly Organic Counter */}
            <div className="hidden sm:flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#6cc997]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <ellipse cx="12" cy="14" rx="3.4" ry="4.5" fill="rgba(108,201,151,0.22)" />
                <path d="M9 11 C4 6 3 11 8 13 M15 11 C20 6 21 11 16 13" />
                <circle cx="12" cy="8.5" r="1.5" fill="#dce6f5" stroke="none" />
              </svg>
              <div>
                <div className="text-[10px] font-medium tracking-[0.1em] text-[#89ceff] uppercase">
                  {t.patternsFliesLabel}
                </div>
                <div className="font-mono-num text-sm font-semibold leading-tight text-[#dce6f5]">
                  {hud.patternsCount}
                  <span className="mx-1 text-[#687ea3]">/</span>
                  {hud.fliesCaught}
                </div>
              </div>
            </div>
          </div>

          {/* Concise Chapter Objective & Zone */}
          <div className="mt-1.5 border-t border-[#89ceff]/14 pt-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
              <span className="font-display text-sm font-semibold text-[#eef4ff] truncate">
                {chapterText.title}
              </span>
              <span className="shrink-0 rounded-full border border-[#6cc997]/30 bg-[#132425]/60 px-2 py-0.5 text-[10px] font-medium text-[#8be3b5]">
                {zoneLabel}
              </span>
            </div>
            <p className="hidden sm:block mt-0.5 text-[11px] leading-snug text-[#a7bcdb]">
              {objectiveDetail}
            </p>
          </div>

          {/* Live Stealth / Tightrope / Wasp Alert / Dash Status */}
          {(hud.hiddenInNettle ||
            hud.fear > 12 ||
            !hud.isGrounded ||
            hud.onSilkBridge ||
            Boolean(waspAlertText) ||
            hud.dashCooldownSec > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
              {hud.hiddenInNettle && (
                <span className="font-medium text-[#6cc997]">
                  {t.hiddenInNettle}
                </span>
              )}
              {hud.onSilkBridge && (
                <span className="font-medium text-[#89ceff]">
                  {t.silkBridgeTag}
                </span>
              )}
              {!hud.isGrounded && (
                <span className="font-medium text-[#b5d4ff]">
                  {t.airborneTag}
                </span>
              )}
              {waspAlertText && (
                <span
                  data-testid="hud-wasp-alert"
                  className={`font-medium ${
                    hud.waspState === 'dive'
                      ? 'text-[#f59273]'
                      : hud.waspState === 'investigate'
                        ? 'text-[#e8b85b]'
                        : hud.waspState === 'perch'
                          ? 'text-[#6cc997]'
                          : hud.waspState === 'lured'
                            ? 'text-[#f2d085]'
                            : 'text-[#9ec5ff]'
                  }`}
                >
                  {waspAlertText}
                  {hud.fear > 12 ? ` (${hud.waspDistance}${t.waspDistUnit})` : ''}
                </span>
              )}
              {!waspAlertText && hud.fear > 12 && (
                <span className="font-medium text-[#e8b85b] font-mono-num">
                  {t.tremorLabel}: {hud.fear}% ({hud.waspDistance}{t.waspDistUnit})
                </span>
              )}
              {(Boolean(waspAlertText) || hud.dashCooldownSec > 0) && (
                <span
                  className={`font-mono-num ${
                    hud.dashCooldownSec > 0 ? 'text-[#7c94b8]' : 'text-[#6cc997]'
                  }`}
                >
                  [{dashKey}] {hud.dashCooldownSec > 0 ? `${hud.dashCooldownSec}s` : t.dashReadyTag}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Controls + [Tab] Journal Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-1 sm:gap-2 max-w-[144px] sm:max-w-none shrink-0 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-journal-toggle"
            aria-expanded={journalOpen}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              setJournalOpen((prev) => !prev);
            }}
            className={`btn-jelly moth-wing-panel flex h-7 sm:h-9 items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[11px] sm:text-xs font-medium transition-colors ${
              journalOpen
                ? 'border-[#6cc997]/70 text-[#eef4ff]'
                : 'text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]'
            }`}
          >
            <span className="hidden sm:inline font-mono-num text-[10px] text-[#89ceff]">[Tab]</span>
            <span className="hidden md:inline">{t.journalToggleBtn}</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:hidden text-[#89ceff]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="font-mono-num text-[10px] text-[#6cc997]">
              {hud.unlockedLoreIds.length}/{LORE_ENTRY_IDS.length}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-menu-btn"
            aria-label={t.mainMenuBtn}
            title={t.mainMenuBtn}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onReturnToTitle();
            }}
            className="btn-jelly moth-wing-panel flex h-7 w-7 sm:h-9 sm:w-auto items-center justify-center gap-1.5 sm:px-2.5 text-xs font-medium text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
            </svg>
            <span className="hidden md:inline">{t.menuShortBtn}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-settings-btn"
            aria-label={t.settingsBtn}
            title={t.settingsBtn}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onOpenSettings();
            }}
            className="btn-jelly moth-wing-panel flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-fullscreen-btn"
            aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onToggleFullscreen();
            }}
            className="btn-jelly moth-wing-panel flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={hud.muted ? t.unmuteLabel : t.muteLabel}
            title={hud.muted ? t.unmuteLabel : t.muteLabel}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onToggleMute();
            }}
            className="btn-jelly moth-wing-panel flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            {hud.muted ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={t.restartBtn}
            title={t.restartBtn}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onRestart();
            }}
            className="btn-jelly moth-wing-panel hidden sm:flex h-9 w-9 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-pause-btn"
            aria-label={t.pauseShortBtn}
            title={t.pauseShortBtn}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onPause();
            }}
            className="btn-jelly moth-wing-panel flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="5" x2="9" y2="19" />
              <line x1="15" y1="5" x2="15" y2="19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible [Tab] Spider Journal Slide-Out Moth-Wing Drawer */}
      {journalOpen && (
        <aside
          data-testid="hud-journal-drawer"
          className={`dew-reveal moth-wing-panel pointer-events-auto fixed top-[74px] sm:top-20 ${
            rtl ? 'left-3 sm:left-5' : 'right-3 sm:right-5'
          } z-20 max-h-[68vh] w-[min(340px,92vw)] overflow-y-auto p-4`}
        >
          <div className="flex items-center justify-between border-b border-[#89ceff]/18 pb-2">
            <span className="font-display text-lg font-semibold text-[#eef4ff]">
              {t.tabJournal}
            </span>
            <button
              type="button"
              onClick={() => {
                playUiSilkClick();
                setJournalOpen(false);
              }}
              className="btn-jelly rounded-full border border-[#89ceff]/25 px-2 py-0.5 text-[11px] text-[#dce6f5] hover:border-[#89ceff]/60"
            >
              {t.closeBtn}
            </button>
          </div>

          {/* Chapter 3 Great Pattern Anchors & Wind */}
          {hud.chapter === 'ch3_great_pattern' && (
            <div className="mt-3 rounded-xl border border-[#89ceff]/20 bg-[#0d0c1d]/70 p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-[#b8cee8]">
                <span className={hud.greatAnchorsDone.stump ? 'text-[#6cc997]' : ''}>
                  {hud.greatAnchorsDone.stump ? '✓' : '○'} {t.stumpLabel}
                </span>
                <span className={hud.greatAnchorsDone.leftBirch ? 'text-[#6cc997]' : ''}>
                  {hud.greatAnchorsDone.leftBirch ? '✓' : '○'} {t.leftBirchLabel}
                </span>
                <span className={hud.greatAnchorsDone.rightBirch ? 'text-[#6cc997]' : ''}>
                  {hud.greatAnchorsDone.rightBirch ? '✓' : '○'} {t.rightBirchLabel}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-[#89ceff]">
                {hud.weather === 'gusty'
                  ? t.windGusty
                  : hud.windWarning
                    ? t.windRising
                    : t.windCalm}
              </div>
            </div>
          )}

          {/* Three Drops of Moon Dew Side-Quest */}
          <div className="mt-3 rounded-xl border border-[#89ceff]/18 bg-[#0d0c1d]/65 p-3">
            <div className="flex items-center justify-between text-[10px] tracking-[0.14em] text-[#89ceff] uppercase">
              <span>{t.questSectionTitle}</span>
              <span className="font-mono-num text-[#6cc997]">
                {hud.dewQuest.completed ? t.dewQuestDoneTag : `${dewStepsDone}/3`}
              </span>
            </div>
            <div className="mt-1 font-display text-base font-semibold text-[#eef4ff]">
              {t.dewQuestTitle}
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className={hud.dewQuest.fatbellyTriangle ? 'text-[#6cc997]' : 'text-[#b8cee8]'}>
                {hud.dewQuest.fatbellyTriangle ? '✓' : '○'} {t.dewQuestSteps.fatbellyTriangle}
              </div>
              <div className={hud.dewQuest.nimbleStar ? 'text-[#6cc997]' : 'text-[#b8cee8]'}>
                {hud.dewQuest.nimbleStar ? '✓' : '○'} {t.dewQuestSteps.nimbleStar}
              </div>
              <div className={hud.dewQuest.greenieCircle ? 'text-[#6cc997]' : 'text-[#b8cee8]'}>
                {hud.dewQuest.greenieCircle ? '✓' : '○'} {t.dewQuestSteps.greenieCircle}
              </div>
            </div>
          </div>

          {/* Hollow Bestiary */}
          <div className="mt-3 rounded-xl border border-[#89ceff]/18 bg-[#0d0c1d]/65 p-3">
            <div className="text-[10px] tracking-[0.14em] text-[#89ceff] uppercase">
              {t.bestiaryTitle}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {SPECIES_ORDER.map((sp) => (
                <div
                  key={sp}
                  className="flex items-center justify-between rounded-lg border border-[#89ceff]/14 bg-[#121028]/70 px-2 py-1 text-[11px]"
                >
                  <span className="truncate text-[#dce6f5]">{t.speciesLabels[sp]}</span>
                  <span className="font-mono-num font-semibold text-[#6cc997]">
                    {hud.caughtSpecies[sp] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chronicles of the Hollow */}
          <div className="mt-3 space-y-2">
            <div className="text-[10px] tracking-[0.14em] text-[#89ceff] uppercase">
              {t.loreSectionTitle}
            </div>
            {LORE_ENTRY_IDS.map((loreId) => {
              const unlocked = hud.unlockedLoreIds.includes(loreId);
              const entry = t.loreEntries[loreId];
              if (!entry) return null;
              return (
                <div
                  key={loreId}
                  className={`rounded-xl border p-2.5 text-xs ${
                    unlocked
                      ? 'border-[#89ceff]/22 bg-[#121028]/75'
                      : 'border-[#89ceff]/10 bg-[#0d0c1d]/50 opacity-65'
                  }`}
                >
                  <div className="font-semibold text-[#eef4ff]">
                    {unlocked ? entry.title : '•••'}
                  </div>
                  <p className="mt-0.5 leading-relaxed text-[#a8bedb]">
                    {unlocked ? entry.body : t.loreLockedHint}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Top-Center Contextual Proximity Action Prompt (leaves center viewport clear) */}
      {(hud.nearAnchorLabel ||
        hud.canHarvestFly ||
        hud.canGrappleLabel ||
        hud.activeThreadFromLabel) && (
        <div
          data-testid="hud-action-prompt"
          className="fixed top-[128px] sm:top-5 left-1/2 -translate-x-1/2 max-w-[min(410px,92vw)] sm:max-w-[min(420px,38vw)] pointer-events-none"
        >
          <div className="dew-reveal moth-wing-panel px-3.5 py-1.5 text-[11px] sm:text-xs text-[#eef4ff] text-center">
            {hud.canHarvestFly ? (
              <span>
                {formatPromptText(t.promptHarvest, {
                  k: `${harvestKey} / ${interactKey}`,
                })}
              </span>
            ) : hud.canClosePattern ? (
              <span className="text-[#6cc997]">
                {formatPromptText(t.promptClosePattern, {
                  k: interactKey,
                  anchor: nearAnchorText,
                })}
              </span>
            ) : hud.canRepairPattern ? (
              <span className="text-[#89ceff]">
                {formatPromptText(t.promptRepairWeb, {
                  k: interactKey,
                  anchor: nearAnchorText,
                })}
              </span>
            ) : hud.nearAnchorLabel ? (
              <span>
                {formatPromptText(
                  hud.activeThreadFromLabel ? t.promptExtendTo : t.promptAttachFrom,
                  { k: interactKey, anchor: nearAnchorText },
                )}
              </span>
            ) : hud.canGrappleLabel ? (
              <span className="text-[#89ceff]">
                {formatPromptText(t.promptGrapple, {
                  k: grappleKey,
                  anchor: grappleText,
                })}
              </span>
            ) : (
              <span>
                {formatPromptText(t.promptThreadActive, {
                  anchor: activeFromText,
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Organic Resin / Dewdrop Narrative Whisper Bubble anchored cleanly away from controls */}
      {whisperText && (
        <div
          data-testid="hud-whisper"
          className={`fixed z-10 pointer-events-none ${
            showMobileControls
              ? 'bottom-[152px] left-3 max-w-[min(238px,64vw)]'
              : 'bottom-[106px] left-2.5 sm:bottom-5 sm:left-[124px] max-w-[min(320px,82vw)] sm:max-w-xs'
          }`}
        >
          <div
            className="dew-reveal px-3.5 py-2 text-sm sm:text-lg leading-tight font-hand text-[#dce6f5] shadow-[0_8px_22px_rgba(8,7,20,0.68)]"
            style={{
              background:
                'linear-gradient(135deg, rgba(24, 21, 48, 0.72) 0%, rgba(14, 13, 30, 0.6) 100%)',
              border: '1px solid rgba(137, 206, 255, 0.34)',
              borderRadius: '18px 20px 18px 4px',
            }}
          >
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#89ceff]">
              {speakerLabel}:{' '}
            </span>
            <span>{whisperText}</span>
          </div>
        </div>
      )}

      {/* Circular Spider-Web Radar SVG (bottom-center on mobile between stick and primary button; bottom-left on desktop) */}
      <div
        data-testid="hud-web-radar"
        title={t.radarTitle}
        className={`fixed pointer-events-none flex items-center gap-2.5 ${
          showMobileControls
            ? 'bottom-3 left-1/2 -translate-x-1/2'
            : 'bottom-3.5 left-3.5 sm:bottom-5 sm:left-5'
        }`}
      >
        <div
          className={`moth-wing-panel relative flex items-center justify-center rounded-full p-1 ${
            showMobileControls
              ? 'h-[62px] w-[62px]'
              : 'h-[80px] w-[80px] sm:h-[94px] sm:w-[94px]'
          } ${
            hud.waspAlertLevel > 0.55 && !settings.reducedEffects ? 'silk-tremor' : ''
          }`}
          style={{
            borderRadius: '9999px',
            background:
              'radial-gradient(circle at 50% 45%, rgba(28, 36, 70, 0.84) 0%, rgba(12, 16, 36, 0.88) 100%)',
            borderColor: 'rgba(110, 224, 255, 0.42)',
          }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
            {/* Concentric orb-web rings with crisp legibility */}
            <circle cx="50" cy="50" r="44" stroke="#74d8ff" strokeOpacity="0.34" strokeWidth="1.05" fill="none" />
            <circle cx="50" cy="50" r="29" stroke="#74d8ff" strokeOpacity="0.32" strokeWidth="0.95" fill="none" />
            <circle cx="50" cy="50" r="14" stroke="#8fffa8" strokeOpacity="0.34" strokeWidth="0.95" fill="none" />
            {/* Radial silk threads */}
            <path
              d="M50 4V96M4 50H96M18 18L82 82M82 18L18 82"
              stroke={hud.waspAlertLevel > 0.45 ? '#ffae52' : '#74d8ff'}
              strokeOpacity={hud.waspAlertLevel > 0.45 ? 0.52 : 0.28}
              strokeWidth="0.95"
            />
            {/* Pavutin center node */}
            <circle cx="50" cy="50" r="5.5" fill="rgba(137, 206, 255, 0.25)" />
            <circle cx="50" cy="50" r="3.4" fill="#f2f8ff" />

            {/* Vivid neon-bioluminescent radar blips */}
            {(hud.radarBlips || []).map((b, i) => {
              const px = 50 + b.x * 40;
              const py = 50 + b.z * 40;
              if (b.kind === 'wasp') {
                return (
                  <g key={`w-${i}`} transform={`translate(${px}, ${py})`}>
                    <circle r="7.5" fill="rgba(255, 102, 70, 0.36)" />
                    <polygon points="0,-5 4.5,4 -4.5,4" fill="#ff6646" stroke="#ffffff" strokeWidth="0.9" />
                  </g>
                );
              }
              if (b.kind === 'anchor') {
                return (
                  <g key={`a-${i}`} transform={`translate(${px}, ${py})`}>
                    <circle r="5.2" fill="rgba(72, 224, 255, 0.28)" />
                    <circle
                      r={b.active ? '3.5' : '3'}
                      fill="#4ae4ff"
                      stroke="#ffffff"
                      strokeWidth="0.85"
                    />
                  </g>
                );
              }
              if (b.kind === 'nettle') {
                return (
                  <rect
                    key={`n-${i}`}
                    x={px - 2.6}
                    y={py - 2.6}
                    width="5.2"
                    height="5.2"
                    rx="1.2"
                    fill="#34ff9a"
                    stroke="#d4ffea"
                    strokeWidth="0.55"
                  />
                );
              }
              if (b.kind === 'decoy') {
                return (
                  <polygon
                    key={`d-${i}`}
                    points={`${px},${py - 3.8} ${px + 3.8},${py} ${px},${py + 3.8} ${px - 3.8},${py}`}
                    fill="#ffd454"
                    stroke="#fff6d1"
                    strokeWidth="0.6"
                  />
                );
              }
              return (
                <circle
                  key={`f-${i}`}
                  cx={px}
                  cy={py}
                  r={b.active ? '2.8' : '2.3'}
                  fill={b.active ? '#ffdf6b' : '#7aff8c'}
                  stroke="#f4fff7"
                  strokeWidth="0.55"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

