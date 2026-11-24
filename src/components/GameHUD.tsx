import React from 'react';
import {
  formatPromptText,
  formatWhisperText,
  getTranslations,
  isRtlLanguage,
} from '../game/i18n';
import { formatInputCode } from '../game/settings';
import type { HudSnapshot, PatternShape, UserSettings } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  settings: UserSettings;
  isFullscreen: boolean;
  onSelectMode: (mode: PatternShape) => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onReturnToTitle: () => void;
}

const PATTERN_MODES: { id: PatternShape; keyNum: string }[] = [
  { id: 'triangle', keyNum: '1' },
  { id: 'star', keyNum: '2' },
  { id: 'circle', keyNum: '3' },
  { id: 'decoy', keyNum: '4' },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  settings,
  isFullscreen,
  onSelectMode,
  onToggleMute,
  onPause,
  onRestart,
  onOpenSettings,
  onToggleFullscreen,
  onReturnToTitle,
}) => {
  const t = getTranslations(hud.language);
  const rtl = isRtlLanguage(hud.language);

  const silkPct = Math.min(100, Math.round((hud.silk / hud.maxSilk) * 100));
  const fearOpacity = Math.min(0.65, (hud.fear / 100) * 0.65);

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

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-10 pointer-events-none"
    >
      {/* Peripheral Fear & Tremor Vignette */}
      {hud.fear > 10 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: fearOpacity,
            boxShadow: 'inset 0 0 110px rgba(212, 128, 34, 0.58)',
          }}
        />
      )}

      {/* Top Perimeter Row: Left Readouts & Right Utility Controls */}
      <div className="flex items-start justify-between p-2.5 sm:p-5 gap-2 sm:gap-4">
        {/* Top-Left Cluster: Silk, Composure, Active Objective */}
        <div className="max-w-[172px] sm:max-w-sm rounded border border-[#9ec5ff]/20 bg-[#080d17]/84 px-2.5 py-2 sm:px-4 sm:py-3 shadow-[0_10px_28px_rgba(3,6,12,0.72)]">
          <div className="flex items-baseline gap-3 sm:gap-5">
            <div>
              <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.1em] text-[#8fa9cc] uppercase">
                {t.silkLabel}
              </div>
              <div className="font-mono-num text-lg sm:text-2xl font-semibold leading-none text-[#eef5ff] hud-text-stroke">
                {hud.silk}
                <span className="text-xs sm:text-sm font-normal text-[#7c94b8]">
                  /{hud.maxSilk}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-[#9ec5ff]/15" aria-hidden="true" />

            <div>
              <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.1em] text-[#8fa9cc] uppercase">
                {t.composureLabel}
              </div>
              <div className="mt-1 flex items-center gap-1 sm:gap-1.5">
                {Array.from({ length: hud.maxComposure }).map((_, idx) => {
                  const full = idx < hud.composure;
                  return (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      aria-hidden="true"
                    >
                      <polygon
                        points="12,2 22,12 12,22 2,12"
                        fill={full ? '#d8ebff' : 'rgba(15, 23, 38, 0.8)'}
                        stroke={full ? '#8bb8ff' : '#4a5f80'}
                        strokeWidth="1.8"
                      />
                    </svg>
                  );
                })}
              </div>
            </div>

            <div className="hidden sm:block h-6 w-px bg-[#9ec5ff]/15" aria-hidden="true" />

            <div className="hidden sm:block">
              <div className="text-[11px] font-medium tracking-[0.1em] text-[#8fa9cc] uppercase">
                {t.patternsFliesLabel}
              </div>
              <div className="font-mono-num text-lg font-semibold leading-tight text-[#d8e7fa]">
                {hud.patternsCount}
                <span className="mx-1 text-[#637a9c]">/</span>
                {hud.fliesCaught}
              </div>
            </div>
          </div>

          {/* Slim Silk Gauge */}
          <div className="mt-1.5 sm:mt-2 h-1 w-full overflow-hidden rounded-full bg-[#131d2e]">
            <div
              className="h-full bg-[#8fc0ff] transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${silkPct / 100})` }}
            />
          </div>

          {/* Chapter Objective & Current Location Zone */}
          <div className="mt-2 border-t border-[#9ec5ff]/12 pt-1.5 sm:pt-2">
            <div className="flex items-center justify-between gap-2 text-[11px] sm:text-sm">
              <span className="font-display font-semibold text-[#dbe9fc] truncate">
                {chapterText.title}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-[#8cb6eb]">
                {zoneLabel}
              </span>
            </div>
            <p className="hidden sm:block mt-0.5 text-xs leading-snug text-[#9cb2cf]">
              {objectiveDetail}
            </p>
          </div>

          {/* Ch3 Great Anchor Progress & Wind */}
          {hud.chapter === 'ch3_great_pattern' && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-[#9ec5ff]/12 pt-1.5 text-[11px] text-[#9eb5d4]">
              <span className={hud.greatAnchorsDone.stump ? 'text-[#9effdb]' : ''}>
                {hud.greatAnchorsDone.stump ? '✓' : '○'} {t.stumpLabel}
              </span>
              <span className={hud.greatAnchorsDone.leftBirch ? 'text-[#9effdb]' : ''}>
                {hud.greatAnchorsDone.leftBirch ? '✓' : '○'} {t.leftBirchLabel}
              </span>
              <span className={hud.greatAnchorsDone.rightBirch ? 'text-[#9effdb]' : ''}>
                {hud.greatAnchorsDone.rightBirch ? '✓' : '○'} {t.rightBirchLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className={hud.weather === 'gusty' ? 'text-[#ffcf70]' : 'text-[#b5d4ff]'}>
                {hud.weather === 'gusty' ? t.windGusty : t.windCalm}
              </span>
            </div>
          )}

          {/* Live Stealth / Fear Status Text */}
          {(hud.hiddenInNettle || hud.fear > 12 || !hud.isGrounded) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11px]">
              {hud.hiddenInNettle && (
                <span className="font-medium text-[#8be3b5]">
                  {t.hiddenInNettle}
                </span>
              )}
              {!hud.isGrounded && (
                <span className="font-medium text-[#b5d4ff]">
                  {t.airborneTag}
                </span>
              )}
              {hud.fear > 12 && (
                <span className="font-medium text-[#f2b35e] font-mono-num">
                  {t.tremorLabel}: {hud.fear}% ({hud.waspDistance}{t.waspDistUnit})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Buttons: Menu, Settings, Fullscreen, Mute, Restart, Pause */}
        <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-menu-btn"
            aria-label={t.mainMenuBtn}
            title={t.mainMenuBtn}
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnToTitle();
            }}
            className="flex h-7 w-7 sm:h-9 sm:w-auto cursor-pointer items-center justify-center gap-1.5 rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 sm:px-2.5 text-xs font-medium text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
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
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="flex h-7 w-7 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
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
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFullscreen();
            }}
            className="flex h-7 w-7 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
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
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="flex h-7 w-7 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
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
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="hidden sm:flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
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
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="flex h-7 w-7 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#080d17]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="5" x2="9" y2="19" />
              <line x1="15" y1="5" x2="15" y2="19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top-Center Contextual Proximity Action Prompt (leaves Pavutin & center sky clear) */}
      {(hud.nearAnchorLabel ||
        hud.canHarvestFly ||
        hud.canGrappleLabel ||
        hud.activeThreadFromLabel) && (
        <div
          data-testid="hud-action-prompt"
          className="fixed top-[122px] sm:top-5 left-1/2 -translate-x-1/2 max-w-[min(410px,92vw)] sm:max-w-[min(420px,38vw)] pointer-events-none"
        >
          <div className="rounded bg-[#080d17]/88 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs text-[#e6f2ff] border border-[#9ec5ff]/25 shadow-md text-center">
            {hud.canHarvestFly ? (
              <span>
                {formatPromptText(t.promptHarvest, {
                  k: `${harvestKey} / ${interactKey}`,
                })}
              </span>
            ) : hud.canClosePattern ? (
              <span className="text-[#9effdb]">
                {formatPromptText(t.promptClosePattern, {
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
              <span className="text-[#b8dcff]">
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

      {/* Narrative Whisper Card: bottom-left on desktop, high dark treetop sky on mobile so Pavutin stays 100% open */}
      {whisperText && (
        <div
          data-testid="hud-whisper"
          className="fixed top-[168px] sm:top-auto sm:bottom-5 left-2.5 sm:left-5 max-w-[min(340px,92vw)] sm:max-w-sm pointer-events-none"
        >
          <div className="rounded border border-[#9ec5ff]/18 bg-[#070b14]/78 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs italic text-[#d5e3f5] shadow-[0_8px_22px_rgba(3,6,12,0.72)] line-clamp-2 sm:line-clamp-3">
            <span className="not-italic font-semibold text-[#9ec5ff]">
              {speakerLabel}:{' '}
            </span>
            {whisperText}
          </div>
        </div>
      )}

      {/* Pattern Weaving Dock: compact 2x2 top-right below buttons on mobile, bottom-right row on desktop */}
      <div
        data-testid="hud-pattern-dock"
        className="fixed top-[44px] right-2.5 sm:top-auto sm:bottom-5 sm:right-5 flex flex-col items-end gap-1.5 max-w-[196px] sm:max-w-lg pointer-events-none"
      >
        <div className="pointer-events-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-end gap-1 sm:gap-1.5 rounded border border-[#9ec5ff]/20 bg-[#080d17]/88 p-1 sm:p-1.5 shadow-[0_8px_24px_rgba(3,6,12,0.8)]">
          {PATTERN_MODES.map((m) => {
            const active = hud.selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectMode(m.id);
                }}
                className={`cursor-pointer rounded px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-left sm:text-center ${
                  active
                    ? 'bg-[#253c61] text-white border border-[#9ec5ff]/55'
                    : 'text-[#a3b8d4] border border-transparent hover:text-white hover:bg-[#121d30]'
                }`}
              >
                <span className="font-mono-num mr-1 text-[#7ea7e0]">
                  [{m.keyNum}]
                </span>
                {t.patterns[m.id].label}
              </button>
            );
          })}

          {hud.hasGrapple && (
            <div className="hidden sm:block px-2 py-1 text-xs text-[#9effdb] whitespace-nowrap shrink-0 border-l border-[#9ec5ff]/15">
              [{grappleKey}] {t.grappleBtnLabel}
            </div>
          )}
        </div>

        <div className="hidden sm:block rounded bg-[#070b12]/72 px-2.5 py-0.5 text-[11px] text-[#abc0df] text-right">
          {t.patterns[hud.selectedMode].hint}
        </div>
      </div>
    </div>
  );
};
