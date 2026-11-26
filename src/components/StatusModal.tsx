import React, { useState } from 'react';
import { getTranslations, isRtlLanguage } from '../game/i18n';
import { LORE_ENTRY_IDS } from '../game/rules';
import { getTrackDisplay, SOUNDTRACK_TRACKS } from '../game/soundtrack';
import type { FlySpecies, HudSnapshot } from '../game/types';
import {
  playUiGramophoneClick,
  playUiLeafHover,
  playUiSilkClick,
} from '../game/uiAudio';

interface StatusModalProps {
  hud: HudSnapshot;
  isFullscreen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleMusic: () => void;
}

const SPECIES_ORDER: FlySpecies[] = ['fatbelly', 'nimble', 'greenie', 'tearbearer'];

export const StatusModal: React.FC<StatusModalProps> = ({
  hud,
  isFullscreen,
  onResume,
  onRestart,
  onTitle,
  onOpenSettings,
  onToggleFullscreen,
  onPrevTrack,
  onNextTrack,
  onToggleMusic,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'journal'>('overview');

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

  const track = SOUNDTRACK_TRACKS[hud.musicTrackIndex] || SOUNDTRACK_TRACKS[0];
  const display = getTrackDisplay(track, hud.language);
  const dewStepsDone =
    Number(hud.dewQuest.fatbellyTriangle) +
    Number(hud.dewQuest.nimbleStar) +
    Number(hud.dewQuest.greenieCircle);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8, 7, 20, 0.74)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="dew-reveal w-full max-w-lg rounded-[22px_8px_24px_10px] border border-[#89ceff]/30 bg-[#0e0c21]/95 p-6 sm:p-7 shadow-[0_24px_60px_rgba(6,5,16,0.9)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs tracking-[0.16em] text-[#89ceff] uppercase">
            {badge}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-[#89ceff]/20 bg-[#12102a] p-0.5">
            <button
              type="button"
              data-testid="status-tab-overview"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                setActiveTab('overview');
              }}
              className={`btn-jelly rounded-full px-3 py-1 text-xs font-medium ${
                activeTab === 'overview'
                  ? 'bg-[#1f2c52] text-[#eef4ff]'
                  : 'text-[#9bb2d4] hover:text-[#eef4ff]'
              }`}
            >
              {t.tabOverview}
            </button>
            <button
              type="button"
              data-testid="status-tab-journal"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                setActiveTab('journal');
              }}
              className={`btn-jelly rounded-full px-3 py-1 text-xs font-medium ${
                activeTab === 'journal'
                  ? 'bg-[#1f2c52] text-[#eef4ff]'
                  : 'text-[#9bb2d4] hover:text-[#eef4ff]'
              }`}
            >
              {t.tabJournal} ({hud.unlockedLoreIds.length}/{LORE_ENTRY_IDS.length})
            </button>
          </div>
        </div>

        <h2
          id="status-modal-title"
          className="font-display mt-2 text-2xl sm:text-3xl font-semibold text-[#eef4ff]"
        >
          {title}
        </h2>

        {activeTab === 'overview' ? (
          <>
            <p className="font-hand mt-2 text-xl leading-snug text-[#c5d7f0]">
              {subtitle}
            </p>

            {/* Mastery / Progress Metrics */}
            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#89ceff]/16 py-4">
              <div>
                <div className="text-[11px] text-[#8098b8] uppercase">{t.silkLabel}</div>
                <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef4ff]">
                  {hud.silk}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8098b8] uppercase">
                  {t.patternsFliesLabel}
                </div>
                <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef4ff]">
                  {hud.patternsCount} / {hud.fliesCaught}
                  {hud.aerialCatches > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-[#6cc997]">
                      (+{hud.aerialCatches} ✦)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#8098b8] uppercase">{t.timeLabel}</div>
                <div className="font-mono-num mt-0.5 text-xl font-semibold text-[#eef4ff]">
                  {mins}:{secs}
                </div>
              </div>
            </div>

            {/* Antique Gramophone Soundtrack Bar */}
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#89ceff]/18 bg-[#12102a] px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.12em] text-[#89ceff] uppercase">
                  {hud.musicTrackIndex + 1}/{SOUNDTRACK_TRACKS.length} · {t.tabMusic}
                </div>
                <div className="truncate font-display text-sm font-semibold text-[#eef4ff]">
                  {display.title}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label={t.musicPrevBtn}
                  onClick={() => {
                    playUiGramophoneClick();
                    onPrevTrack();
                  }}
                  className="btn-jelly flex h-7 w-7 items-center justify-center rounded-full border border-[#89ceff]/25 bg-[#171535] text-[#dce6f5] hover:text-[#eef4ff]"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={hud.musicPaused ? t.musicPlayBtn : t.musicPauseBtn}
                  onClick={() => {
                    playUiGramophoneClick();
                    onToggleMusic();
                  }}
                  className="btn-jelly flex h-7 w-7 items-center justify-center rounded-full border border-[#e8b85b]/45 bg-[#1e2547] text-[#eef4ff]"
                >
                  {hud.musicPaused ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={t.musicNextBtn}
                  onClick={() => {
                    playUiGramophoneClick();
                    onNextTrack();
                  }}
                  className="btn-jelly flex h-7 w-7 items-center justify-center rounded-full border border-[#89ceff]/25 bg-[#171535] text-[#dce6f5] hover:text-[#eef4ff]"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4 max-h-[48vh] space-y-4 overflow-y-auto pr-1">
            {/* Three Drops of Moon Dew Quest */}
            <div className="rounded-xl border border-[#89ceff]/20 bg-[#12102a] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] tracking-[0.12em] text-[#89ceff] uppercase">
                  {t.questSectionTitle}
                </div>
                <div className="font-mono-num text-xs font-semibold text-[#6cc997]">
                  {hud.dewQuest.completed ? t.dewQuestDoneTag : `${dewStepsDone}/3`}
                </div>
              </div>
              <div className="mt-1 font-display text-base font-semibold text-[#eef4ff]">
                {t.dewQuestTitle}
              </div>
              <div className="mt-2.5 space-y-1.5 text-xs">
                <div className={hud.dewQuest.fatbellyTriangle ? 'text-[#6cc997]' : 'text-[#b5c7e0]'}>
                  {hud.dewQuest.fatbellyTriangle ? '✓' : '○'} {t.dewQuestSteps.fatbellyTriangle}
                </div>
                <div className={hud.dewQuest.nimbleStar ? 'text-[#6cc997]' : 'text-[#b5c7e0]'}>
                  {hud.dewQuest.nimbleStar ? '✓' : '○'} {t.dewQuestSteps.nimbleStar}
                </div>
                <div className={hud.dewQuest.greenieCircle ? 'text-[#6cc997]' : 'text-[#b5c7e0]'}>
                  {hud.dewQuest.greenieCircle ? '✓' : '○'} {t.dewQuestSteps.greenieCircle}
                </div>
              </div>
              <div className="mt-2.5 text-[11px] text-[#8ca4c7]">
                {t.dewQuestRewardHint}
              </div>
            </div>

            {/* Hollow Bestiary */}
            <div className="rounded-xl border border-[#89ceff]/20 bg-[#12102a] p-3.5">
              <div className="text-[11px] tracking-[0.12em] text-[#89ceff] uppercase">
                {t.bestiaryTitle}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {SPECIES_ORDER.map((sp) => (
                  <div
                    key={sp}
                    className="flex items-center justify-between rounded-lg border border-[#89ceff]/12 bg-[#0b0a1b] px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-[#dce6f5]">{t.speciesLabels[sp]}</span>
                    <span className="font-mono-num font-semibold text-[#6cc997]">
                      {hud.caughtSpecies[sp] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chronicles of the Hollow */}
            <div className="rounded-xl border border-[#89ceff]/20 bg-[#12102a] p-3.5">
              <div className="text-[11px] tracking-[0.12em] text-[#89ceff] uppercase">
                {t.loreSectionTitle}
              </div>
              <div className="mt-2.5 space-y-2.5">
                {LORE_ENTRY_IDS.map((loreId) => {
                  const unlocked = hud.unlockedLoreIds.includes(loreId);
                  const entry = t.loreEntries[loreId];
                  if (!entry) return null;
                  return (
                    <div
                      key={loreId}
                      className={`rounded-xl border p-2.5 ${
                        unlocked
                          ? 'border-[#89ceff]/20 bg-[#0b0a1b]'
                          : 'border-[#89ceff]/10 bg-[#090817] opacity-65'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#eef4ff]">
                        {unlocked ? entry.title : '•••'}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#9db3d1]">
                        {unlocked ? entry.body : t.loreLockedHint}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {hud.screen === 'paused' && (
            <button
              type="button"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                onResume();
              }}
              className="leaf-cocoon-btn border border-[#89ceff]/60 bg-[#1c294f] px-5 py-2.5 text-sm font-semibold text-[#eef4ff] hover:bg-[#273a6b] whitespace-nowrap shrink-0"
            >
              {t.resumeBtn}
            </button>
          )}

          <button
            type="button"
            data-start={hud.screen === 'gameover' ? 'true' : undefined}
            onMouseEnter={() => playUiLeafHover()}
            onClick={() => {
              playUiSilkClick();
              onRestart();
            }}
            className="leaf-cocoon-btn border border-[#89ceff]/40 bg-[#161c38] px-5 py-2.5 text-sm font-semibold text-[#dce6f5] hover:bg-[#202950] whitespace-nowrap shrink-0"
          >
            {isVictory ? t.playAgainBtn : isRetreat ? t.tryAgainBtn : t.restartBtn}
          </button>

          <button
            type="button"
            onMouseEnter={() => playUiLeafHover()}
            onClick={() => {
              playUiSilkClick();
              onOpenSettings();
            }}
            className="btn-jelly rounded-full border border-[#89ceff]/25 bg-[#12102a] px-4 py-2.5 text-sm font-medium text-[#dce6f5] hover:border-[#89ceff]/55 whitespace-nowrap shrink-0"
          >
            {t.settingsBtn}
          </button>

          <button
            type="button"
            onMouseEnter={() => playUiLeafHover()}
            onClick={() => {
              playUiSilkClick();
              onToggleFullscreen();
            }}
            className="btn-jelly rounded-full border border-[#89ceff]/25 bg-[#12102a] px-4 py-2.5 text-sm font-medium text-[#dce6f5] hover:border-[#89ceff]/55 whitespace-nowrap shrink-0"
          >
            {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          </button>

          <button
            type="button"
            onMouseEnter={() => playUiLeafHover()}
            onClick={() => {
              playUiSilkClick();
              onTitle();
            }}
            className="btn-jelly rounded-full border border-transparent px-4 py-2.5 text-sm font-medium text-[#9bb1cf] hover:text-[#eef4ff] whitespace-nowrap shrink-0"
          >
            {t.mainMenuBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
