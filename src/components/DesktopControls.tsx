import React, { useEffect, useRef, useState } from 'react';
import { getTranslations, isRtlLanguage } from '../game/i18n';
import { formatInputCode } from '../game/settings';
import type { HudSnapshot, PatternShape, UserSettings } from '../game/types';
import { playUiLeafHover, playUiSilkClick } from '../game/uiAudio';
import { PATTERN_MODES, PatternGlyphSvg } from './PatternGlyphSvg';

interface DesktopControlsProps {
  hud: HudSnapshot;
  settings: UserSettings;
  dockHighlighted: boolean;
  onSelectMode: (mode: PatternShape) => void;
  onWeave: () => void;
  onHarvest: () => void;
  onJump: () => void;
  onDash: () => void;
  onGrapple: () => void;
}

const SPARK_VECTORS: [number, number][] = [
  [-18, -16],
  [0, -22],
  [18, -15],
  [-22, 4],
  [21, 5],
  [-12, 16],
  [14, 15],
];

export const DesktopControls: React.FC<DesktopControlsProps> = ({
  hud,
  settings,
  dockHighlighted,
  onSelectMode,
  onWeave,
  onHarvest,
  onJump,
  onDash,
  onGrapple,
}) => {
  const t = getTranslations(hud.language);
  const rtl = isRtlLanguage(hud.language);

  const [switchBurst, setSwitchBurst] = useState<{
    mode: PatternShape;
    key: number;
  } | null>(null);
  const prevModeRef = useRef<PatternShape>(hud.selectedMode);

  useEffect(() => {
    if (hud.selectedMode !== prevModeRef.current) {
      prevModeRef.current = hud.selectedMode;
      const key = Date.now();
      setSwitchBurst({ mode: hud.selectedMode, key });
      const timer = setTimeout(() => {
        setSwitchBurst((cur) => (cur?.key === key ? null : cur));
      }, 520);
      return () => clearTimeout(timer);
    }
  }, [hud.selectedMode]);

  const interactKey = formatInputCode(settings.bindings.interact[0] || 'KeyE');
  const harvestKey = formatInputCode(settings.bindings.harvest[0] || 'KeyF');
  const grappleKey = formatInputCode(settings.bindings.grapple[0] || 'KeyQ');
  const jumpKey = formatInputCode(settings.bindings.jump[0] || 'Space');
  const dashKey = formatInputCode(settings.bindings.dash[0] || 'ShiftLeft');

  const isWeaveContext = Boolean(
    hud.nearAnchorLabel ||
      hud.canClosePattern ||
      hud.canRepairPattern ||
      hud.activeThreadFromLabel,
  );
  const dockExpanded = dockHighlighted || Boolean(switchBurst);

  return (
    <div
      data-testid="desktop-controls"
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-10 pointer-events-none"
    >
      {/* Bottom-Right Auto-Hide PC Dock: 30% serene idle when roaming, glides to 100% near twigs/webs */}
      <div
        data-testid="hud-pattern-dock"
        className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-5 flex flex-col items-end gap-1.5 max-w-xl pointer-events-auto transition-[opacity,transform] duration-300 ease-out ${
          dockExpanded
            ? 'opacity-100 translate-y-0'
            : 'opacity-30 translate-y-1.5 hover:opacity-100 hover:translate-y-0'
        }`}
      >
        {/* Full PC Pattern Selector Bar (1-4) */}
        <div className="moth-wing-panel relative flex flex-wrap items-center justify-end gap-1.5 px-2.5 py-2">
          {/* Glowing constellation filament behind medallions */}
          <svg
            aria-hidden="true"
            viewBox="0 0 280 20"
            preserveAspectRatio="none"
            className="pointer-events-none hidden sm:block absolute left-4 right-4 top-1/2 -translate-y-1/2 h-4 opacity-30 text-[#89ceff]"
            fill="none"
          >
            <path
              d="M0 10 Q70 2 140 10 T280 10"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </svg>

          {PATTERN_MODES.map((m) => {
            const active = hud.selectedMode === m.id;
            const justSwitched = switchBurst?.mode === m.id && !settings.reducedEffects;
            const syncedWithWorldWeb =
              hud.gazeWebShape === m.id && !settings.reducedEffects;

            return (
              <button
                key={m.id}
                type="button"
                tabIndex={-1}
                data-world-synced={syncedWithWorldWeb ? 'true' : 'false'}
                onMouseEnter={() => playUiLeafHover()}
                onClick={(e) => {
                  e.currentTarget.blur();
                  playUiSilkClick();
                  onSelectMode(m.id);
                }}
                className={`btn-jelly relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 border ${
                  active
                    ? 'border-[#89ceff]/80 bg-[#1e2d54]/92 text-[#f2f7ff] shadow-[0_0_16px_rgba(137,206,255,0.32)]'
                    : syncedWithWorldWeb
                      ? 'border-[#6cc997]/75 bg-[#152d36]/86 text-[#dcfaf0]'
                      : 'border-[#89ceff]/22 bg-[#121028]/78 text-[#b8cce8] hover:border-[#89ceff]/52 hover:text-[#eef4ff]'
                }`}
              >
                <span className="relative inline-flex items-center justify-center">
                  <PatternGlyphSvg
                    shape={m.id}
                    active={active || syncedWithWorldWeb}
                    className={`h-4 w-4 shrink-0 ${
                      justSwitched
                        ? 'silk-icon-pop'
                        : syncedWithWorldWeb
                          ? 'web-sync-pulse'
                          : ''
                    }`}
                  />
                  {justSwitched &&
                    SPARK_VECTORS.map(([sx, sy], idx) => (
                      <span
                        key={`${switchBurst.key}-${idx}`}
                        aria-hidden="true"
                        className="silk-spark-particle pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#a8e6ff] shadow-[0_0_6px_#6cc997]"
                        style={
                          {
                            '--sp-x': `${sx}px`,
                            '--sp-y': `${sy}px`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                </span>

                {settings.colorblindMode && (
                  <span className="font-mono-num text-xs font-bold text-[#e8b85b]">
                    {m.cbSymbol}
                  </span>
                )}
                <span className="font-mono-num rounded border border-[#89ceff]/48 bg-[#182c52] px-1.5 py-0.5 text-xs font-bold leading-none text-[#f4f9ff]">
                  {m.keyNum}
                </span>
                <span>{t.patterns[m.id].label}</span>
              </button>
            );
          })}
        </div>

        {/* Full PC Action & Ability Keycap Strip */}
        <div className="moth-wing-panel flex flex-wrap items-center justify-end gap-1.5 px-2.5 py-1.5 text-xs">
          <button
            type="button"
            tabIndex={-1}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onWeave();
            }}
            className={`btn-jelly flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
              isWeaveContext
                ? 'border-[#6cc997]/85 bg-[#13322b]/94 text-[#ccffea] shadow-[0_0_14px_rgba(108,201,151,0.34)]'
                : 'border-[#89ceff]/22 bg-[#110f26]/78 text-[#c2d6f0] hover:border-[#89ceff]/52'
            }`}
          >
            <span className="font-mono-num text-[11px] font-bold text-[#9de3ff]">
              [{interactKey}]
            </span>
            <span>{t.weaveBtnLabel}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onHarvest();
            }}
            className={`btn-jelly flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
              hud.canHarvestFly
                ? 'border-[#e8b85b]/80 bg-[#2e2412]/92 text-[#ffe5a8] shadow-[0_0_14px_rgba(232,184,91,0.3)]'
                : 'border-[#89ceff]/22 bg-[#110f26]/78 text-[#c2d6f0] hover:border-[#89ceff]/52'
            }`}
          >
            <span className="font-mono-num text-[11px] font-bold text-[#9de3ff]">
              [{harvestKey}]
            </span>
            <span>{t.harvestBtnLabel}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onJump();
            }}
            className="btn-jelly flex items-center gap-1.5 rounded-full border border-[#89ceff]/22 bg-[#110f26]/78 px-2.5 py-1 font-medium text-[#c2d6f0] hover:border-[#89ceff]/52"
          >
            <span className="font-mono-num text-[11px] font-bold text-[#9de3ff]">
              [{jumpKey}]
            </span>
            <span>{t.jumpBtnLabel}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onMouseEnter={() => playUiLeafHover()}
            onClick={(e) => {
              e.currentTarget.blur();
              playUiSilkClick();
              onDash();
            }}
            className={`btn-jelly flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
              hud.dashCooldownSec > 0
                ? 'border-[#6d85a8]/28 bg-[#0c0e1c]/72 text-[#7288ab]'
                : hud.waspState === 'dive'
                  ? 'border-[#f59273]/85 bg-[#321814]/92 text-[#ffd8cc]'
                  : 'border-[#89ceff]/22 bg-[#110f26]/78 text-[#c2d6f0] hover:border-[#89ceff]/52'
            }`}
          >
            <span className="font-mono-num text-[11px] font-bold text-[#9de3ff]">
              [{dashKey}]
            </span>
            <span>
              {hud.dashCooldownSec > 0
                ? `${hud.dashCooldownSec}s`
                : t.dashBtnLabel}
            </span>
          </button>

          {hud.hasGrapple && (
            <button
              type="button"
              tabIndex={-1}
              onMouseEnter={() => playUiLeafHover()}
              onClick={(e) => {
                e.currentTarget.blur();
                playUiSilkClick();
                onGrapple();
              }}
              className={`btn-jelly flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                hud.canGrappleLabel
                  ? 'border-[#6cc997]/85 bg-[#13322c]/92 text-[#9effdb]'
                  : 'border-[#6cc997]/32 bg-[#111e26]/82 text-[#8ad9b5]'
              }`}
            >
              <span className="font-mono-num text-[11px] font-bold text-[#6cc997]">
                [{grappleKey}]
              </span>
              <span>{t.grappleBtnLabel}</span>
            </button>
          )}
        </div>

        {/* Active Pattern Tactical Tip */}
        <div className="rounded-full border border-[#89ceff]/20 bg-[#0e0c1f]/74 px-3 py-0.5 text-[11px] text-[#bfd2ee] text-right">
          {t.patterns[hud.selectedMode].hint}
        </div>
      </div>
    </div>
  );
};
