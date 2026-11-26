import React, { useEffect, useState } from 'react';
import {
  getTranslations,
  isRtlLanguage,
  LANGUAGE_OPTIONS,
} from '../game/i18n';
import {
  cloneBindings,
  DEFAULT_BINDINGS,
  formatInputCode,
  mouseButtonToCode,
  rebindActionSlot,
  VALID_UI_SCALES,
} from '../game/settings';
import { getTrackDisplay, SOUNDTRACK_TRACKS } from '../game/soundtrack';
import type {
  DifficultyLevel,
  GraphicsQuality,
  InputAction,
  LanguageCode,
  UserSettings,
} from '../game/types';
import {
  playUiGramophoneClick,
  playUiLeafHover,
  playUiSilkClick,
} from '../game/uiAudio';

type SettingsTab =
  | 'language'
  | 'music'
  | 'controls'
  | 'difficulty'
  | 'graphics'
  | 'accessibility';

interface SettingsModalProps {
  open: boolean;
  settings: UserSettings;
  isFullscreen: boolean;
  musicTrackIndex: number;
  musicPaused: boolean;
  musicAvailableCount: number;
  onChange: (next: UserSettings) => void;
  onClose: () => void;
  onToggleFullscreen: () => void;
  onSelectTrack: (index: number) => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleMusic: () => void;
  onImportMusicFiles?: (files: FileList) => void;
}

const ACTION_ORDER: InputAction[] = [
  'jump',
  'dash',
  'interact',
  'harvest',
  'grapple',
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'pause',
  'mute',
  'fullscreen',
];

const DIFFICULTIES: DifficultyLevel[] = ['story', 'normal', 'hard', 'eclipse'];
const GRAPHICS_TIERS: GraphicsQuality[] = [
  'lowest',
  'low',
  'medium',
  'high',
  'ultra',
  'cinematic',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  isFullscreen,
  musicTrackIndex,
  musicPaused,
  musicAvailableCount,
  onChange,
  onClose,
  onToggleFullscreen,
  onSelectTrack,
  onPrevTrack,
  onNextTrack,
  onToggleMusic,
  onImportMusicFiles,
}) => {
  const [tab, setTab] = useState<SettingsTab>('language');
  const [capturing, setCapturing] = useState<{
    action: InputAction;
    slot: 0 | 1;
  } | null>(null);

  const t = getTranslations(settings.language);
  const rtl = isRtlLanguage(settings.language);

  useEffect(() => {
    if (!open) {
      setCapturing(null);
      return;
    }
    if (!capturing) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setCapturing(null);
        return;
      }
      const nextBindings = rebindActionSlot(
        settings.bindings,
        capturing.action,
        capturing.slot,
        e.code,
      );
      onChange({ ...settings, bindings: nextBindings });
      setCapturing(null);
    };

    const handleMouse = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code = mouseButtonToCode(e.button);
      if (!code) return;
      const nextBindings = rebindActionSlot(
        settings.bindings,
        capturing.action,
        capturing.slot,
        code,
      );
      onChange({ ...settings, bindings: nextBindings });
      setCapturing(null);
    };

    const handleCtx = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('mousedown', handleMouse, true);
    window.addEventListener('contextmenu', handleCtx, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('mousedown', handleMouse, true);
      window.removeEventListener('contextmenu', handleCtx, true);
    };
  }, [open, capturing, settings, onChange]);

  if (!open) return null;

  const setLanguage = (language: LanguageCode) => {
    playUiSilkClick();
    onChange({ ...settings, language });
  };

  const setDifficulty = (difficulty: DifficultyLevel) => {
    playUiSilkClick();
    onChange({ ...settings, difficulty });
  };

  const setGraphics = (graphics: GraphicsQuality) => {
    playUiSilkClick();
    onChange({ ...settings, graphics });
  };

  const setTouchMode = (touchControlsMode: UserSettings['touchControlsMode']) => {
    playUiSilkClick();
    onChange({ ...settings, touchControlsMode });
  };

  const handleResetBindings = () => {
    playUiSilkClick();
    setCapturing(null);
    onChange({
      ...settings,
      bindings: cloneBindings(DEFAULT_BINDINGS),
    });
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(8, 7, 20, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={() => {
        if (!capturing) onClose();
      }}
    >
      <div
        className="dew-reveal flex max-h-[86%] w-full max-w-2xl flex-col overflow-hidden rounded-[20px_8px_22px_10px] border border-[#89ceff]/30 bg-[#0e0c21]/95 shadow-[0_24px_64px_rgba(6,5,16,0.92)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#89ceff]/16 px-5 py-4 sm:px-6">
          <h2
            id="settings-modal-title"
            className="font-display text-2xl font-semibold text-[#eef4ff]"
          >
            {t.settingsTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                onToggleFullscreen();
              }}
              className="btn-jelly rounded-full border border-[#89ceff]/30 bg-[#171535] px-3.5 py-1.5 text-xs font-medium text-[#dce6f5] hover:border-[#89ceff]/65 hover:text-[#eef4ff]"
            >
              {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            </button>
            <button
              type="button"
              onMouseEnter={() => playUiLeafHover()}
              onClick={() => {
                playUiSilkClick();
                onClose();
              }}
              aria-label={t.closeBtn}
              className="btn-jelly rounded-full border border-[#89ceff]/25 bg-[#171535] px-3.5 py-1.5 text-xs font-medium text-[#dce6f5] hover:border-[#89ceff]/60 hover:text-[#eef4ff]"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#89ceff]/16 bg-[#0a0918]/85 px-4 py-2.5 sm:px-6">
          {(
            [
              ['language', t.tabLanguage],
              ['music', t.tabMusic],
              ['controls', t.tabControls],
              ['difficulty', t.tabDifficulty],
              ['graphics', t.tabGraphics],
              ['accessibility', t.tabAccessibility],
            ] as [SettingsTab, string][]
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`settings-tab-${id}`}
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiSilkClick();
                  setCapturing(null);
                  setTab(id);
                }}
                className={`btn-jelly rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap border ${
                  active
                    ? 'border-[#89ceff]/65 bg-[#1f294d] text-[#eef4ff]'
                    : 'border-transparent text-[#98add0] hover:bg-[#161432] hover:text-[#eef4ff]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === 'language' && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = settings.language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    data-lang={opt.code}
                    onMouseEnter={() => playUiLeafHover()}
                    onClick={() => setLanguage(opt.code)}
                    className={`btn-jelly flex flex-col items-start rounded-xl border px-3 py-2.5 text-left ${
                      active
                        ? 'border-[#89ceff] bg-[#1b2747] text-[#eef4ff]'
                        : 'border-[#89ceff]/18 bg-[#12102a] text-[#b9cbe4] hover:border-[#89ceff]/48 hover:text-[#eef4ff]'
                    }`}
                  >
                    <span className="text-sm font-semibold leading-tight">
                      {opt.nativeName}
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#839abd]">
                      {opt.englishName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'music' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#89ceff]/25 bg-[#12102a] p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] tracking-[0.12em] text-[#89ceff] uppercase">
                    {t.musicCarouselBadge} · {musicAvailableCount}/{SOUNDTRACK_TRACKS.length}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#9cb2cf]">
                    {t.musicMuffledHint}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={t.musicPrevBtn}
                    onClick={() => {
                      playUiGramophoneClick();
                      onPrevTrack();
                    }}
                    className="btn-jelly rounded-full border border-[#89ceff]/28 bg-[#171535] px-3 py-1.5 text-xs font-medium text-[#dce6f5] hover:border-[#89ceff]/60"
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playUiGramophoneClick();
                      onToggleMusic();
                    }}
                    className="btn-jelly rounded-full border border-[#e8b85b]/50 bg-[#1e2448] px-3.5 py-1.5 text-xs font-semibold text-[#eef4ff]"
                  >
                    {musicPaused ? `▶ ${t.musicPlayBtn}` : `⏸ ${t.musicPauseBtn}`}
                  </button>
                  <button
                    type="button"
                    aria-label={t.musicNextBtn}
                    onClick={() => {
                      playUiGramophoneClick();
                      onNextTrack();
                    }}
                    className="btn-jelly rounded-full border border-[#89ceff]/28 bg-[#171535] px-3 py-1.5 text-xs font-medium text-[#dce6f5] hover:border-[#89ceff]/60"
                  >
                    ⏭
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#89ceff]/20 bg-[#110f26]/90 px-3.5 py-2.5 text-xs text-[#abc2df]">
                <span className="min-w-0 flex-1 leading-relaxed">
                  {t.musicPendingFiles}
                </span>
                {onImportMusicFiles && (
                  <label className="btn-jelly cursor-pointer shrink-0 rounded-full border border-[#89ceff]/35 bg-[#1b2647] px-3.5 py-1.5 text-[11px] font-medium text-[#dcebff] hover:border-[#89ceff]/70">
                    {t.musicImportBtn}
                    <input
                      type="file"
                      accept=".ogg,audio/ogg"
                      multiple
                      className="hidden"
                      data-testid="music-import-input"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          onImportMusicFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="divide-y divide-[#89ceff]/12 rounded-xl border border-[#89ceff]/18 bg-[#12102a] overflow-hidden">
                {SOUNDTRACK_TRACKS.map((track, idx) => {
                  const active = idx === musicTrackIndex;
                  const display = getTrackDisplay(track, settings.language);
                  return (
                    <button
                      key={track.id}
                      type="button"
                      data-track-id={track.id}
                      onClick={() => {
                        playUiGramophoneClick();
                        onSelectTrack(idx);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        active
                          ? 'bg-[#1d284b] text-[#eef4ff]'
                          : 'text-[#c2d4ea] hover:bg-[#171535] hover:text-[#eef4ff]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="font-mono-num text-xs text-[#89ceff]">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {display.title}
                          </div>
                          <div className="truncate text-xs text-[#8ea6c9]">
                            {display.mood} ·{' '}
                            <span className="font-mono-num text-[#6f8ab0]">
                              {track.file}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-medium ${
                          active
                            ? musicPaused
                              ? 'text-[#e8b85b]'
                              : 'text-[#6cc997]'
                            : 'text-[#6c83a6]'
                        }`}
                      >
                        {active
                          ? musicPaused
                            ? t.musicTrackPaused
                            : t.musicTrackPlaying
                          : '○'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#89ceff]/18 bg-[#12102a] px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#dce6f5]">
                  {t.touchControlsLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      ['auto', t.touchAuto],
                      ['on', t.touchOn],
                      ['off', t.touchOff],
                    ] as [UserSettings['touchControlsMode'], string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTouchMode(mode)}
                      className={`btn-jelly rounded-full px-3 py-1 text-xs font-medium border ${
                        settings.touchControlsMode === mode
                          ? 'bg-[#1f2c52] text-[#eef4ff] border-[#89ceff]/60'
                          : 'bg-[#0b0a1b] text-[#8fa7c9] border-[#89ceff]/15 hover:text-[#eef4ff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-[#8ea5c4]">
                <span>{t.controlsTip}</span>
                <button
                  type="button"
                  onClick={handleResetBindings}
                  className="btn-jelly shrink-0 rounded-full border border-[#89ceff]/25 bg-[#171535] px-3 py-1 text-xs text-[#dce6f5] hover:border-[#89ceff]/60"
                >
                  {t.resetDefaultsBtn}
                </button>
              </div>

              {capturing && (
                <div className="rounded-xl border border-[#6cc997]/60 bg-[#0e2221] px-4 py-2.5 text-center text-xs font-medium text-[#6cc997]">
                  {t.pressKeyPrompt}
                </div>
              )}

              <div className="divide-y divide-[#89ceff]/10 rounded-xl border border-[#89ceff]/18 bg-[#12102a] overflow-hidden">
                {ACTION_ORDER.map((action) => {
                  const codes = settings.bindings[action] || [];
                  const slot0 = codes[0] || '';
                  const slot1 = codes[1] || '';
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <span className="text-xs sm:text-sm font-medium text-[#dce8f8]">
                        {t.actions[action]}
                      </span>
                      <div className="flex items-center gap-2">
                        {([0, 1] as const).map((slotIdx) => {
                          const code = slotIdx === 0 ? slot0 : slot1;
                          const isCap =
                            capturing?.action === action && capturing?.slot === slotIdx;
                          return (
                            <button
                              key={slotIdx}
                              type="button"
                              data-bind={`${action}-${slotIdx}`}
                              onClick={() => {
                                playUiSilkClick();
                                setCapturing({ action, slot: slotIdx });
                              }}
                              className={`min-w-[74px] cursor-pointer rounded-lg border px-2.5 py-1 text-center font-mono-num text-xs transition-colors ${
                                isCap
                                  ? 'border-[#6cc997] bg-[#132f2a] text-[#6cc997]'
                                  : 'border-[#89ceff]/25 bg-[#0b0a1b] text-[#dce6f5] hover:border-[#89ceff]/65'
                              }`}
                            >
                              {isCap ? '...' : formatInputCode(code)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'difficulty' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DIFFICULTIES.map((diff) => {
                const active = settings.difficulty === diff;
                const info = t.difficulties[diff];
                return (
                  <button
                    key={diff}
                    type="button"
                    data-difficulty={diff}
                    onMouseEnter={() => playUiLeafHover()}
                    onClick={() => setDifficulty(diff)}
                    className={`btn-jelly flex flex-col items-start rounded-xl border p-4 text-left ${
                      active
                        ? 'border-[#89ceff] bg-[#1c274a] text-[#eef4ff]'
                        : 'border-[#89ceff]/18 bg-[#12102a] text-[#c2d2e8] hover:border-[#89ceff]/48'
                    }`}
                  >
                    <div className="text-base font-semibold text-[#eef4ff]">
                      {info.name}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#9cb2cf]">
                      {info.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'graphics' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GRAPHICS_TIERS.map((tier) => {
                const active = settings.graphics === tier;
                const info = t.graphics[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    data-graphics={tier}
                    onMouseEnter={() => playUiLeafHover()}
                    onClick={() => setGraphics(tier)}
                    className={`btn-jelly flex flex-col items-start rounded-xl border p-4 text-left ${
                      active
                        ? 'border-[#89ceff] bg-[#1c274a] text-[#eef4ff]'
                        : 'border-[#89ceff]/18 bg-[#12102a] text-[#c2d2e8] hover:border-[#89ceff]/48'
                    }`}
                  >
                    <div className="text-base font-semibold text-[#eef4ff]">
                      {info.name}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#9cb2cf]">
                      {info.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'accessibility' && (
            <div className="space-y-4">
              {/* UI Scale Selector */}
              <div className="rounded-xl border border-[#89ceff]/22 bg-[#12102a] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#eef4ff]">
                    {t.uiScaleLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {VALID_UI_SCALES.map((scaleVal) => {
                      const active = settings.uiScale === scaleVal;
                      return (
                        <button
                          key={scaleVal}
                          type="button"
                          data-testid={`ui-scale-${scaleVal}`}
                          onMouseEnter={() => playUiLeafHover()}
                          onClick={() => {
                            playUiSilkClick();
                            onChange({ ...settings, uiScale: scaleVal });
                          }}
                          className={`btn-jelly rounded-full px-3 py-1 font-mono-num text-xs font-semibold border ${
                            active
                              ? 'border-[#89ceff] bg-[#1f2d54] text-[#eef4ff]'
                              : 'border-[#89ceff]/20 bg-[#0b0a1b] text-[#9eb5d4] hover:border-[#89ceff]/55'
                          }`}
                        >
                          {Math.round(scaleVal * 100)}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Colorblind Pattern Symbols Toggle */}
              <button
                type="button"
                data-testid="toggle-colorblind"
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiSilkClick();
                  onChange({ ...settings, colorblindMode: !settings.colorblindMode });
                }}
                className={`btn-jelly flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left ${
                  settings.colorblindMode
                    ? 'border-[#6cc997]/65 bg-[#122629]'
                    : 'border-[#89ceff]/20 bg-[#12102a] hover:border-[#89ceff]/48'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#eef4ff]">
                    {t.colorblindLabel}
                  </div>
                  <p className="mt-0.5 text-xs text-[#9cb2cf]">{t.colorblindDesc}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border ${
                    settings.colorblindMode
                      ? 'border-[#6cc997]/65 bg-[#183836] text-[#6cc997]'
                      : 'border-[#89ceff]/20 bg-[#0b0a1b] text-[#8ea5c4]'
                  }`}
                >
                  {settings.colorblindMode ? t.enabledTag : t.disabledTag}
                </span>
              </button>

              {/* Reduced Shake & Flashes Toggle */}
              <button
                type="button"
                data-testid="toggle-reduced-effects"
                onMouseEnter={() => playUiLeafHover()}
                onClick={() => {
                  playUiSilkClick();
                  onChange({ ...settings, reducedEffects: !settings.reducedEffects });
                }}
                className={`btn-jelly flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left ${
                  settings.reducedEffects
                    ? 'border-[#6cc997]/65 bg-[#122629]'
                    : 'border-[#89ceff]/20 bg-[#12102a] hover:border-[#89ceff]/48'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#eef4ff]">
                    {t.reducedEffectsLabel}
                  </div>
                  <p className="mt-0.5 text-xs text-[#9cb2cf]">{t.reducedEffectsDesc}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border ${
                    settings.reducedEffects
                      ? 'border-[#6cc997]/65 bg-[#183836] text-[#6cc997]'
                      : 'border-[#89ceff]/20 bg-[#0b0a1b] text-[#8ea5c4]'
                  }`}
                >
                  {settings.reducedEffects ? t.enabledTag : t.disabledTag}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
