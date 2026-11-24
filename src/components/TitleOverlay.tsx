import React from 'react';
import { getTranslations, isRtlLanguage } from '../game/i18n';
import type { UserSettings } from '../game/types';

interface TitleOverlayProps {
  settings: UserSettings;
  muted: boolean;
  isFullscreen: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  settings,
  muted,
  isFullscreen,
  onStart,
  onToggleMute,
  onOpenSettings,
  onToggleFullscreen,
}) => {
  const t = getTranslations(settings.language);
  const rtl = isRtlLanguage(settings.language);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none"
      style={{
        background: rtl
          ? 'linear-gradient(265deg, rgba(6, 10, 18, 0.9) 0%, rgba(6, 10, 18, 0.56) 46%, rgba(6, 10, 18, 0.08) 100%)'
          : 'linear-gradient(95deg, rgba(6, 10, 18, 0.9) 0%, rgba(6, 10, 18, 0.56) 46%, rgba(6, 10, 18, 0.08) 100%)',
      }}
    >
      {/* Top-right compact utility controls */}
      <div className="flex justify-end gap-2 p-4 sm:p-6">
        <button
          type="button"
          tabIndex={-1}
          aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleFullscreen();
          }}
          className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#0a111e]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#9ec5ff]"
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
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenSettings();
          }}
          className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#0a111e]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#9ec5ff]"
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
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-[#9ec5ff]/25 bg-[#0a111e]/85 text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#9ec5ff]"
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

      {/* Left negative-space hero lockup */}
      <div className="my-auto max-w-xl px-6 sm:px-14 pointer-events-auto">
        <div className="mb-4 flex items-center gap-4">
          <svg
            viewBox="0 0 64 64"
            className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 text-[#cde2ff]"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="18" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="10" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.2" />
            <path
              d="M32 4V60M4 32H60M12 12L52 52M52 12L12 52"
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <path
              d="M38 14A14 14 0 1 0 50 38A11 11 0 1 1 38 14Z"
              fill="#e6f1ff"
              fillOpacity="0.9"
            />
          </svg>
          <div className="text-xs tracking-[0.2em] text-[#9ec5ff] uppercase">
            {t.actBadge}
          </div>
        </div>

        <h1 className="font-display text-3xl font-semibold leading-tight text-[#f2f6fc] sm:text-5xl md:text-6xl text-balance hud-text-stroke">
          {t.gameTitle}
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-[#b9c7db]">
          {t.gameSubtitle}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="cursor-pointer rounded border border-[#cde2ff]/55 bg-[#1b2c47] px-7 py-3 text-base font-semibold text-[#f4f8ff] shadow-[0_8px_28px_rgba(6,12,24,0.75)] transition-colors hover:border-[#e6f2ff] hover:bg-[#253c61] focus-visible:outline-2 focus-visible:outline-[#cde2ff] whitespace-nowrap shrink-0"
          >
            {t.startBtn}
          </button>

          <button
            type="button"
            data-testid="title-settings-btn"
            onClick={onOpenSettings}
            className="cursor-pointer rounded border border-[#9ec5ff]/30 bg-[#0d1627]/90 px-5 py-3 text-sm font-medium text-[#d4e4f7] transition-colors hover:border-[#9ec5ff]/60 hover:text-white whitespace-nowrap shrink-0"
          >
            {t.settingsBtn}
          </button>
        </div>
      </div>

      {/* Flat borderless bottom control hint */}
      <div className="px-6 pb-5 text-xs text-[#9cb0cc]/85 sm:px-14">
        {t.controlsHint}
      </div>
    </div>
  );
};
