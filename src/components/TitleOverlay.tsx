import React from 'react';
import { getTranslations, isRtlLanguage } from '../game/i18n';
import { getTrackDisplay, SOUNDTRACK_TRACKS } from '../game/soundtrack';
import type { UserSettings } from '../game/types';
import {
  playUiGramophoneClick,
  playUiLeafHover,
  playUiSilkClick,
} from '../game/uiAudio';

interface TitleOverlayProps {
  settings: UserSettings;
  muted: boolean;
  isFullscreen: boolean;
  musicTrackIndex: number;
  musicPaused: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleMusic: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  settings,
  muted,
  isFullscreen,
  musicTrackIndex,
  musicPaused,
  onStart,
  onToggleMute,
  onOpenSettings,
  onToggleFullscreen,
  onPrevTrack,
  onNextTrack,
  onToggleMusic,
}) => {
  const t = getTranslations(settings.language);
  const rtl = isRtlLanguage(settings.language);
  const track = SOUNDTRACK_TRACKS[musicTrackIndex] || SOUNDTRACK_TRACKS[0];
  const display = getTrackDisplay(track, settings.language);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between overflow-hidden pointer-events-none"
      style={{
        // Edgeless misty whisper fade so Pavutin & the nocturnal birches remain organically visible
        background: rtl
          ? 'radial-gradient(ellipse 68% 85% at 86% 52%, rgba(10, 9, 24, 0.44) 0%, rgba(10, 9, 24, 0.14) 55%, transparent 100%)'
          : 'radial-gradient(ellipse 68% 85% at 14% 52%, rgba(10, 9, 24, 0.44) 0%, rgba(10, 9, 24, 0.14) 55%, transparent 100%)',
      }}
    >
      {/* Delicate nocturnal SVG cobweb corner tracery */}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 220"
        className="pointer-events-none fixed left-0 top-0 h-32 w-32 sm:h-44 sm:w-44 opacity-28 text-[#89ceff]"
        fill="none"
      >
        <path
          d="M0 0 L210 38 M0 0 L175 112 M0 0 L118 175 M0 0 L42 212"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeOpacity="0.6"
        />
        <path
          d="M44 8 Q36 32 10 44 M94 17 Q76 66 20 96 M148 27 Q118 102 32 148 M194 35 Q150 132 40 194"
          stroke="#dce6f5"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none fixed bottom-0 right-0 h-28 w-28 sm:h-40 sm:w-40 opacity-24 text-[#89ceff]"
        fill="none"
      >
        <path
          d="M200 200 L14 162 M200 200 L54 96 M200 200 L114 42 M200 200 L172 12"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeOpacity="0.55"
        />
        <path
          d="M156 192 Q165 168 190 156 M108 182 Q125 132 180 104 M58 172 Q86 96 168 58"
          stroke="#dce6f5"
          strokeWidth="0.8"
          strokeOpacity="0.42"
        />
      </svg>

      {/* Top-right organic utility buttons */}
      <div className="relative z-10 flex shrink-0 justify-end gap-2 sm:gap-2.5 p-3 sm:p-6 [@media(max-height:540px)]:p-2 [transform:translateZ(0)]">
        <button
          type="button"
          tabIndex={-1}
          aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          onMouseEnter={() => playUiLeafHover()}
          onClick={(e) => {
            e.currentTarget.blur();
            playUiSilkClick();
            onToggleFullscreen();
          }}
          className="btn-jelly moth-wing-panel pointer-events-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#f2f6ff] focus-visible:outline-2 focus-visible:outline-[#89ceff]"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label={t.settingsBtn}
          title={t.settingsBtn}
          onMouseEnter={() => playUiLeafHover()}
          onClick={(e) => {
            e.currentTarget.blur();
            playUiSilkClick();
            onOpenSettings();
          }}
          className="btn-jelly moth-wing-panel pointer-events-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#f2f6ff] focus-visible:outline-2 focus-visible:outline-[#89ceff]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label={muted ? t.unmuteLabel : t.muteLabel}
          title={muted ? t.unmuteLabel : t.muteLabel}
          onMouseEnter={() => playUiLeafHover()}
          onClick={(e) => {
            e.currentTarget.blur();
            playUiSilkClick();
            onToggleMute();
          }}
          className="btn-jelly moth-wing-panel pointer-events-auto flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#f2f6ff] focus-visible:outline-2 focus-visible:outline-[#89ceff]"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
        </button>
      </div>

      {/* Hero Lockup: responsive single-column on desktop/portrait, compact 2-column on horizontal phones */}
      <div className="relative z-10 my-auto flex w-full flex-col gap-4 px-5 sm:px-14 [@media(max-height:540px)]:flex-row [@media(max-height:540px)]:items-end [@media(max-height:540px)]:justify-between [@media(max-height:540px)]:gap-4 [@media(max-height:540px)]:px-5">
        <div className="max-w-xl pointer-events-auto [transform:translateZ(0)] [@media(max-height:540px)]:flex-1 [@media(max-height:540px)]:min-w-0 [@media(max-height:540px)]:overflow-hidden">
          <div className="mb-3 flex items-center gap-3 [@media(max-height:540px)]:mb-1 [@media(max-height:540px)]:gap-2">
            <svg
              viewBox="0 0 64 64"
              className="ui-breathe h-11 w-11 sm:h-14 sm:w-14 [@media(max-height:540px)]:h-7 [@media(max-height:540px)]:w-7 shrink-0 text-[#89ceff]"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeOpacity="0.36" strokeWidth="1.15" />
              <circle cx="32" cy="32" r="18" stroke="currentColor" strokeOpacity="0.56" strokeWidth="1.15" />
              <circle cx="32" cy="32" r="10" stroke="#dce6f5" strokeOpacity="0.78" strokeWidth="1.15" />
              <path
                d="M32 4V60M4 32H60M12 12L52 52M52 12L12 52"
                stroke="currentColor"
                strokeOpacity="0.44"
                strokeWidth="0.95"
              />
              <path
                d="M38 14A14 14 0 1 0 50 38A11 11 0 1 1 38 14Z"
                fill="#dce6f5"
                fillOpacity="0.9"
              />
            </svg>
            <div className="text-[11px] sm:text-xs tracking-[0.22em] text-[#89ceff] uppercase hud-text-stroke">
              {t.actBadge}
            </div>
          </div>

          <h1 className="font-display text-3xl font-semibold leading-[1.06] text-[#eef4ff] sm:text-5xl md:text-6xl [@media(max-height:540px)]:text-[24px] [@media(max-height:540px)]:leading-[1.04] text-balance hud-text-stroke">
            {t.gameTitle}
          </h1>

          <p className="font-hand mt-3 max-w-md [@media(max-height:540px)]:max-w-full text-lg sm:text-2xl leading-snug text-[#dce6f5] [@media(max-height:540px)]:mt-1 [@media(max-height:540px)]:text-[15px] [@media(max-height:540px)]:line-clamp-2 hud-text-stroke">
            {t.gameSubtitle}
          </p>

          {/* Cocoon & Torn-Leaf CTA Buttons */}
          <div className="mt-6 [@media(max-height:540px)]:mt-2.5 flex flex-wrap items-center gap-3 [@media(max-height:540px)]:gap-2.5">
            <button
              type="button"
              data-start="true"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                onStart();
              }}
              className="group leaf-cocoon-btn relative overflow-hidden border border-[#89ceff]/60 bg-[#172342]/86 px-7 py-3 sm:px-8 sm:py-3.5 [@media(max-height:540px)]:px-5 [@media(max-height:540px)]:py-2 text-sm sm:text-base font-semibold text-[#eef4ff] shadow-[0_8px_28px_rgba(8,7,20,0.7)] hover:border-[#b7e2ff] hover:bg-[#1e3159]/90 focus-visible:outline-2 focus-visible:outline-[#89ceff] whitespace-nowrap shrink-0"
            >
              {/* Delicate hover spiderweb filament accent */}
              <svg
                aria-hidden="true"
                viewBox="0 0 60 28"
                className="pointer-events-none absolute right-0 top-0 h-7 w-14 opacity-0 transition-opacity duration-200 group-hover:opacity-65 text-[#b7e2ff]"
                fill="none"
              >
                <path d="M60 0 L18 14 M60 0 L34 26 M40 7 Q42 15 48 18" stroke="currentColor" strokeWidth="1" />
              </svg>
              {t.startBtn}
            </button>

            <button
              type="button"
              data-testid="title-settings-btn"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                onOpenSettings();
              }}
              className="leaf-cocoon-btn moth-wing-panel px-4 py-2.5 sm:px-5 sm:py-3 [@media(max-height:540px)]:px-3.5 [@media(max-height:540px)]:py-2 text-xs sm:text-sm font-medium text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#f2f6ff] whitespace-nowrap shrink-0"
            >
              {t.settingsBtn}
            </button>
          </div>
        </div>

        {/* Antique Gramophone / Singing Firefly Nocturnal Music Carousel */}
        <div
          data-testid="title-music-carousel"
          className="moth-wing-panel pointer-events-auto w-full max-w-md [@media(max-height:540px)]:w-[270px] [@media(max-height:540px)]:shrink-0 px-4 py-3 [@media(max-height:540px)]:px-3 [@media(max-height:540px)]:py-2 [transform:translateZ(0)]"
        >
          <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.16em] text-[#89ceff] uppercase">
            <span className="flex items-center gap-1.5">
              {/* Miniature snail-shell gramophone horn + firefly */}
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#e8b85b]" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 17h10v2H4z" />
                <path d="M9 17v-4c0-3 4-7 10-8-1 5-4 8-8 8" />
                <circle cx="19" cy="6" r="1.5" fill="#89ceff" stroke="none" className="ui-breathe" />
              </svg>
              {t.musicCarouselBadge}
            </span>
            <span className="font-mono-num text-[#a8cef2]">
              {musicTrackIndex + 1}/{SOUNDTRACK_TRACKS.length}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-display text-base font-semibold text-[#eef4ff]">
                {display.title}
              </div>
              <div className="truncate text-[11px] text-[#9cb3d4]">
                {display.mood} · <span className="font-mono-num text-[#7693b8]">{track.file}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                data-testid="music-prev-btn"
                aria-label={t.musicPrevBtn}
                title={t.musicPrevBtn}
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiGramophoneClick();
                  onPrevTrack();
                }}
                className="btn-jelly flex h-8 w-8 items-center justify-center rounded-full border border-[#89ceff]/28 bg-[#121632]/75 text-[#dce6f5] hover:border-[#89ceff]/65 hover:text-[#f2f6ff]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                type="button"
                data-testid="music-toggle-btn"
                aria-label={musicPaused ? t.musicPlayBtn : t.musicPauseBtn}
                title={musicPaused ? t.musicPlayBtn : t.musicPauseBtn}
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiGramophoneClick();
                  onToggleMusic();
                }}
                className="btn-jelly flex h-8 w-8 items-center justify-center rounded-full border border-[#e8b85b]/45 bg-[#1d2247]/85 text-[#eef4ff] shadow-[0_0_12px_rgba(232,184,91,0.2)] hover:border-[#e8b85b]/80"
              >
                {musicPaused ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                data-testid="music-next-btn"
                aria-label={t.musicNextBtn}
                title={t.musicNextBtn}
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiGramophoneClick();
                  onNextTrack();
                }}
                className="btn-jelly flex h-8 w-8 items-center justify-center rounded-full border border-[#89ceff]/28 bg-[#121632]/75 text-[#dce6f5] hover:border-[#89ceff]/65 hover:text-[#f2f6ff]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Borderless bark-whisper bottom controls hint */}
      <div className="relative z-10 shrink-0 px-5 pb-3.5 sm:px-14 sm:pb-5 [@media(max-height:540px)]:px-5 [@media(max-height:540px)]:pb-1.5 text-[11px] sm:text-xs text-[#b5c7e3]/88 hud-text-stroke [transform:translateZ(0)]">
        {t.controlsHint}
      </div>
    </div>
  );
};
