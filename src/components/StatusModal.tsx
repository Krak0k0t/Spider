import React from 'react';
import { getTranslations, isRtlLanguage } from '../game/i18n';
import type { HudSnapshot } from '../game/types';

interface StatusModalProps {
  hud: HudSnapshot;
  isFullscreen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  hud,
  isFullscreen,
  onResume,
  onRestart,
  onTitle,
  onOpenSettings,
  onToggleFullscreen,
}) => {
  if (hud.screen !== 'paused' && hud.screen !== 'gameover') {
    return null;
  }

  const t = getTranslations(hud.language);
  const rtl = isRtlLanguage(hud.language);

  const isVictory = hud.screen === 'gameover' && hud.outcome === 'victory';
  const isRetreat = hud.screen === 'gameover' && hud.outcome === 'retreat';

  const badge = isVictory
    ? t.victoryBadge
    : isRetreat
      ? t.retreatBadge
      : t.pauseBadge;
  const title = isVictory
    ? t.victoryTitle
    : isRetreat
      ? t.retreatTitle
      : t.pauseTitle;
  const subtitle = isVictory
    ? t.victorySubtitle
    : isRetreat
      ? t.retreatSubtitle
      : t.pauseSubtitle;

  const mins = Math.floor(hud.elapsedSeconds / 60);
  const secs = String(hud.elapsedSeconds % 60).padStart(2, '0');

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 9, 16, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-md rounded border border-[#9ec5ff]/30 bg-[#0b1220] p-6 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
        <div className="text-xs tracking-[0.16em] text-[#8cb3e8] uppercase">
          {badge}
        </div>

        <h2
          id="status-modal-title"
          className="font-display mt-1 text-2xl sm:text-3xl font-semibold text-[#f0f6ff]"
        >
          {title}
        </h2>

        <p className="mt-2.5 text-sm leading-relaxed text-[#a8bdd9]">
          {subtitle}
        </p>

        {/* Mastery / Progress Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#9ec5ff]/15 py-4">
          <div>
            <div className="text-[11px] text-[#8098b8] uppercase">{t.silkLabel}</div>
            <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef5ff]">
              {hud.silk}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8098b8] uppercase">
              {t.patternsFliesLabel}
            </div>
            <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef5ff]">
              {hud.patternsCount} / {hud.fliesCaught}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#8098b8] uppercase">{t.timeLabel}</div>
            <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef5ff]">
              {mins}:{secs}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {hud.screen === 'paused' && (
            <button
              type="button"
              onClick={onResume}
              className="cursor-pointer rounded border border-[#cde2ff]/55 bg-[#203557] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b4673] whitespace-nowrap shrink-0"
            >
              {t.resumeBtn}
            </button>
          )}

          <button
            type="button"
            data-start={hud.screen === 'gameover' ? 'true' : undefined}
            onClick={onRestart}
            className="cursor-pointer rounded border border-[#9ec5ff]/40 bg-[#142238] px-5 py-2.5 text-sm font-semibold text-[#e6f0ff] transition-colors hover:bg-[#1d3150] whitespace-nowrap shrink-0"
          >
            {isVictory ? t.playAgainBtn : isRetreat ? t.tryAgainBtn : t.restartBtn}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="cursor-pointer rounded border border-[#9ec5ff]/25 bg-[#0f1a2d] px-4 py-2.5 text-sm font-medium text-[#c8daf2] transition-colors hover:border-[#9ec5ff]/55 hover:text-white whitespace-nowrap shrink-0"
          >
            {t.settingsBtn}
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="cursor-pointer rounded border border-[#9ec5ff]/25 bg-[#0f1a2d] px-4 py-2.5 text-sm font-medium text-[#c8daf2] transition-colors hover:border-[#9ec5ff]/55 hover:text-white whitespace-nowrap shrink-0"
          >
            {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="cursor-pointer rounded border border-transparent px-4 py-2.5 text-sm font-medium text-[#9bb1cf] transition-colors hover:text-white whitespace-nowrap shrink-0"
          >
            {t.mainMenuBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
