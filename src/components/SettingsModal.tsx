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
} from '../game/settings';
import { getTrackDisplay, SOUNDTRACK_TRACKS } from '../game/soundtrack';
import type {
  DifficultyLevel,
  GraphicsQuality,
  InputAction,
  LanguageCode,
  UserSettings,
} from '../game/types';

type SettingsTab = 'language' | 'music' | 'controls' | 'difficulty' | 'graphics';

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
const GRAPHICS_TIERS: GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];

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
    onChange({ ...settings, language });
  };

  const setDifficulty = (difficulty: DifficultyLevel) => {
    onChange({ ...settings, difficulty });
  };

  const setGraphics = (graphics: GraphicsQuality) => {
    onChange({ ...settings, graphics });
  };

  const setTouchMode = (touchControlsMode: UserSettings['touchControlsMode']) => {
    onChange({ ...settings, touchControlsMode });
  };

  const handleResetBindings = () => {
    setCapturing(null);
    onChange({
      ...settings,
      bindings: cloneBindings(DEFAULT_BINDINGS),
    });
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(4, 7, 13, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={() => {
        if (!capturing) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded border border-[#9ec5ff]/30 bg-[#0b1220] shadow-[0_24px_64px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#9ec5ff]/15 px-5 py-4 sm:px-6">
          <h2
            id="settings-modal-title"
            className="font-display text-2xl font-semibold text-[#f0f6ff]"
          >
            {t.settingsTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="cursor-pointer rounded border border-[#9ec5ff]/30 bg-[#121e33] px-3 py-1.5 text-xs font-medium text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/65 hover:text-white"
            >
              {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeBtn}
              className="cursor-pointer rounded border border-[#9ec5ff]/25 bg-[#121e33] px-3 py-1.5 text-xs font-medium text-[#cfe2ff] transition-colors hover:border-[#9ec5ff]/60 hover:text-white"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-[#9ec5ff]/15 bg-[#080e1a] px-4 py-2 sm:px-6">
          {(
            [
              ['language', t.tabLanguage],
              ['music', t.tabMusic],
              ['controls', t.tabControls],
              ['difficulty', t.tabDifficulty],
              ['graphics', t.tabGraphics],
            ] as [SettingsTab, string][]
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`settings-tab-${id}`}
                onClick={() => {
                  setCapturing(null);
                  setTab(id);
                }}
                className={`cursor-pointer rounded px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#22395e] text-white border border-[#9ec5ff]/55'
                    : 'text-[#8ea6c9] border border-transparent hover:text-white hover:bg-[#111b2e]'
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
                    onClick={() => setLanguage(opt.code)}
                    className={`cursor-pointer flex flex-col items-start rounded border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-[#9ec5ff] bg-[#1b2e4d] text-white'
                        : 'border-[#9ec5ff]/18 bg-[#0f1829] text-[#b9cbe4] hover:border-[#9ec5ff]/45 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-semibold leading-tight">
                      {opt.nativeName}
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#7f98ba]">
                      {opt.englishName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'music' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#9ec5ff]/25 bg-[#0f1829] p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] tracking-[0.12em] text-[#8db5e6] uppercase">
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
                    onClick={onPrevTrack}
                    className="cursor-pointer rounded border border-[#9ec5ff]/25 bg-[#121e33] px-3 py-1.5 text-xs font-medium text-[#cfe2ff] hover:border-[#9ec5ff]/60 hover:text-white"
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    onClick={onToggleMusic}
                    className="cursor-pointer rounded border border-[#9ec5ff]/45 bg-[#203557] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2a4570]"
                  >
                    {musicPaused ? `▶ ${t.musicPlayBtn}` : `⏸ ${t.musicPauseBtn}`}
                  </button>
                  <button
                    type="button"
                    aria-label={t.musicNextBtn}
                    onClick={onNextTrack}
                    className="cursor-pointer rounded border border-[#9ec5ff]/25 bg-[#121e33] px-3 py-1.5 text-xs font-medium text-[#cfe2ff] hover:border-[#9ec5ff]/60 hover:text-white"
                  >
                    ⏭
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded border border-[#9ec5ff]/20 bg-[#0d1626]/90 px-3.5 py-2.5 text-xs text-[#abc2df]">
                <span className="min-w-0 flex-1 leading-relaxed">
                  {t.musicPendingFiles}
                </span>
                {onImportMusicFiles && (
                  <label className="cursor-pointer shrink-0 rounded border border-[#9ec5ff]/35 bg-[#162742] px-3 py-1.5 text-[11px] font-medium text-[#dcebff] transition-colors hover:border-[#9ec5ff]/70 hover:text-white">
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

              <div className="divide-y divide-[#9ec5ff]/10 rounded border border-[#9ec5ff]/18 bg-[#0f1829]">
                {SOUNDTRACK_TRACKS.map((track, idx) => {
                  const active = idx === musicTrackIndex;
                  const display = getTrackDisplay(track, settings.language);
                  return (
                    <button
                      key={track.id}
                      type="button"
                      data-track-id={track.id}
                      onClick={() => onSelectTrack(idx)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        active
                          ? 'bg-[#1b2e4d] text-white'
                          : 'text-[#c2d4ea] hover:bg-[#142036] hover:text-white'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="font-mono-num text-xs text-[#7ea7e0]">
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
                              ? 'text-[#f2c97d]'
                              : 'text-[#9effdb]'
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#9ec5ff]/18 bg-[#0f1829] px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#cfe0f5]">
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
                      className={`cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                        settings.touchControlsMode === mode
                          ? 'bg-[#253e66] text-white border border-[#9ec5ff]/55'
                          : 'bg-[#090f1a] text-[#8fa7c9] border border-[#9ec5ff]/15 hover:text-white'
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
                  className="cursor-pointer shrink-0 rounded border border-[#9ec5ff]/25 bg-[#121e33] px-2.5 py-1 text-xs text-[#cfe2ff] hover:border-[#9ec5ff]/60 hover:text-white"
                >
                  {t.resetDefaultsBtn}
                </button>
              </div>

              {capturing && (
                <div className="rounded border border-[#9effdb]/60 bg-[#0e2420] px-4 py-2.5 text-center text-xs font-medium text-[#9effdb]">
                  {t.pressKeyPrompt}
                </div>
              )}

              <div className="divide-y divide-[#9ec5ff]/10 rounded border border-[#9ec5ff]/18 bg-[#0f1829]">
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
                              onClick={() => setCapturing({ action, slot: slotIdx })}
                              className={`min-w-[74px] cursor-pointer rounded border px-2.5 py-1 text-center font-mono-num text-xs transition-colors ${
                                isCap
                                  ? 'border-[#9effdb] bg-[#163830] text-[#9effdb]'
                                  : 'border-[#9ec5ff]/25 bg-[#080e1a] text-[#d5e5fa] hover:border-[#9ec5ff]/65'
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
                    onClick={() => setDifficulty(diff)}
                    className={`cursor-pointer flex flex-col items-start rounded border p-4 text-left transition-colors ${
                      active
                        ? 'border-[#9ec5ff] bg-[#1b2e4d] text-white'
                        : 'border-[#9ec5ff]/18 bg-[#0f1829] text-[#c2d2e8] hover:border-[#9ec5ff]/45'
                    }`}
                  >
                    <div className="text-base font-semibold text-[#eef5ff]">
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
                    onClick={() => setGraphics(tier)}
                    className={`cursor-pointer flex flex-col items-start rounded border p-4 text-left transition-colors ${
                      active
                        ? 'border-[#9ec5ff] bg-[#1b2e4d] text-white'
                        : 'border-[#9ec5ff]/18 bg-[#0f1829] text-[#c2d2e8] hover:border-[#9ec5ff]/45'
                    }`}
                  >
                    <div className="text-base font-semibold text-[#eef5ff]">
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
        </div>
      </div>
    </div>
  );
};
