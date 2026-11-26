import React, { useEffect, useRef, useState } from 'react';
import { getTranslations } from '../game/i18n';
import type { HudSnapshot, PatternShape, UserSettings } from '../game/types';
import { playUiSilkClick } from '../game/uiAudio';
import { PATTERN_MODES, PatternGlyphSvg } from './PatternGlyphSvg';

interface MobileControlsProps {
  hud: HudSnapshot;
  settings: UserSettings;
  onMove: (x: number, y: number) => void;
  onSelectMode: (mode: PatternShape) => void;
  onWeave: () => void;
  onHarvest: () => void;
  onJump: () => void;
  onDash: () => void;
  onGrapple: () => void;
}

/**
 * Tailwind position & transition-transform offsets for the 4 radial web-pattern items
 * fanning out smoothly above and left of the circular pattern trigger button.
 */
const RADIAL_OFFSETS: Record<PatternShape, string> = {
  triangle: 'translate-x-0 -translate-y-[82px]',
  star: '-translate-x-[58px] -translate-y-[66px]',
  circle: '-translate-x-[86px] -translate-y-[20px]',
  decoy: '-translate-x-[80px] translate-y-[30px]',
};

export const MobileControls: React.FC<MobileControlsProps> = ({
  hud,
  settings,
  onMove,
  onSelectMode,
  onWeave,
  onHarvest,
  onJump,
  onDash,
  onGrapple,
}) => {
  const t = getTranslations(hud.language);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [wheelOpen, setWheelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switchKey, setSwitchKey] = useState<number | null>(null);

  const prevModeRef = useRef<PatternShape>(hud.selectedMode);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    if (hud.selectedMode !== prevModeRef.current) {
      prevModeRef.current = hud.selectedMode;
      const k = Date.now();
      setSwitchKey(k);
      const timer = setTimeout(() => {
        setSwitchKey((cur) => (cur === k ? null : cur));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hud.selectedMode]);

  useEffect(() => {
    return () => {
      onMove(0, 0);
    };
  }, [onMove]);

  const maxR = 42;
  const updateFromClient = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    onMove(dx / maxR, -dy / maxR);
  };

  const handleDrawerSwipeStart = (clientX: number) => {
    swipeStartX.current = clientX;
  };

  const handleDrawerSwipeEnd = (clientX: number) => {
    if (swipeStartX.current === null) return;
    const dx = clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx < -22) {
      playUiSilkClick();
      setDrawerOpen(true);
    } else if (dx > 22) {
      playUiSilkClick();
      setDrawerOpen(false);
    }
  };

  const isHarvestAction = hud.canHarvestFly;

  return (
    <div
      data-testid="mobile-controls"
      className="fixed inset-0 z-20 pointer-events-none select-none"
    >
      {/* Left: Large Virtual Thumbstick */}
      <div className="fixed bottom-4 left-4 pointer-events-auto touch-none">
        <div
          ref={stickRef}
          data-testid="mobile-thumbstick"
          onPointerDown={(e) => {
            e.stopPropagation();
            activePointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromClient(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            e.stopPropagation();
            updateFromClient(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            e.stopPropagation();
            activePointerId.current = null;
            setKnobOffset({ x: 0, y: 0 });
            onMove(0, 0);
          }}
          onPointerCancel={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            activePointerId.current = null;
            setKnobOffset({ x: 0, y: 0 });
            onMove(0, 0);
          }}
          className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#89ceff]/35 bg-[#0c1124]/82 shadow-[0_8px_28px_rgba(4,5,14,0.75)]"
          aria-label="Movement thumbstick"
        >
          {/* Crosshair guide inside stick */}
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-[#89ceff]/20" />
          <div
            className="h-12 w-12 rounded-full border border-[#dcebff]/70 bg-[#1e355e]/92 shadow-[0_0_16px_rgba(137,206,255,0.38)]"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right: Swipeable Secondary Abilities Drawer (Jump, Dash, Grapple) */}
      <div
        data-testid="mobile-swipe-drawer"
        onTouchStart={(e) => {
          if (e.touches[0]) handleDrawerSwipeStart(e.touches[0].clientX);
        }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0]) handleDrawerSwipeEnd(e.changedTouches[0].clientX);
        }}
        className={`fixed right-0 bottom-[268px] z-30 flex items-center pointer-events-none transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-32px)]'
        }`}
      >
        {/* Pull / Swipe Edge Tab */}
        <button
          type="button"
          tabIndex={-1}
          data-testid="mobile-drawer-toggle"
          aria-expanded={drawerOpen}
          aria-label={t.abilitiesMenuLabel}
          onClick={(e) => {
            e.stopPropagation();
            e.currentTarget.blur();
            playUiSilkClick();
            setDrawerOpen((prev) => !prev);
          }}
          className="pointer-events-auto flex h-16 w-8 items-center justify-center rounded-l-2xl border border-r-0 border-[#89ceff]/38 bg-[#121633]/92 text-[#89ceff] shadow-[-4px_4px_18px_rgba(5,6,18,0.7)]"
        >
          <span className="text-sm font-bold leading-none">
            {drawerOpen ? '›' : '‹'}
          </span>
        </button>

        {/* Tucked Ability Buttons */}
        <div
          className={`moth-wing-panel flex items-center gap-2 rounded-l-2xl rounded-r-none border-r-0 px-2.5 py-2 shadow-[0_8px_24px_rgba(4,5,16,0.8)] transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              playUiSilkClick();
              onJump();
            }}
            className="btn-jelly flex h-12 w-12 items-center justify-center rounded-full border border-[#cde2ff]/55 bg-[#1b2f54]/92 text-[11px] font-semibold text-[#eef4ff] active:scale-95"
          >
            {t.jumpBtnLabel}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              playUiSilkClick();
              onDash();
            }}
            className={`btn-jelly flex h-12 w-12 items-center justify-center rounded-full border text-[11px] font-semibold active:scale-95 ${
              hud.dashCooldownSec > 0
                ? 'border-[#6d85a8]/35 bg-[#0c1422]/82 text-[#7892b5]'
                : hud.waspState === 'dive'
                  ? 'border-[#ff8e6b]/85 bg-[#361712]/94 text-[#ffd8cc]'
                  : 'border-[#89ceff]/48 bg-[#13223e]/92 text-[#dcebff]'
            }`}
          >
            {hud.dashCooldownSec > 0 ? `${hud.dashCooldownSec}s` : t.dashBtnLabel}
          </button>

          {hud.hasGrapple && (
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.stopPropagation();
                playUiSilkClick();
                onGrapple();
              }}
              className="btn-jelly flex h-12 w-12 items-center justify-center rounded-full border border-[#6cc997]/60 bg-[#112f2a]/92 text-[11px] font-semibold text-[#9effdb] active:scale-95"
            >
              {t.grappleBtnLabel}
            </button>
          )}
        </div>
      </div>

      {/* Bottom-Right: Radial Pattern Wheel + One Large Primary Action Button */}
      <div
        className={`fixed bottom-4 right-4 flex flex-col items-end pointer-events-none transition-opacity duration-300 ${
          wheelOpen ||
          hud.nearAnchorLabel ||
          hud.canHarvestFly ||
          hud.canClosePattern ||
          hud.activeThreadFromLabel ||
          hud.gazeWebShape
            ? 'opacity-100'
            : 'opacity-72'
        }`}
      >
        {/* Radial Pattern Switcher Button + Fanned Wheel */}
        <div
          data-testid="radial-pattern-wheel"
          className="relative mb-3 mr-2 h-12 w-12 pointer-events-none"
        >
          {PATTERN_MODES.map((m) => {
            const active = hud.selectedMode === m.id;
            const syncedWithWorld =
              hud.gazeWebShape === m.id && !settings.reducedEffects;
            const expandedOffset = RADIAL_OFFSETS[m.id];
            return (
              <button
                key={m.id}
                type="button"
                tabIndex={-1}
                aria-label={t.patterns[m.id].label}
                data-pattern-wheel-item={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.currentTarget.blur();
                  playUiSilkClick();
                  onSelectMode(m.id);
                  setWheelOpen(false);
                }}
                className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-300 ease-out shadow-[0_6px_18px_rgba(5,7,18,0.82)] ${
                  wheelOpen
                    ? `${expandedOffset} scale-100 opacity-100 pointer-events-auto`
                    : 'translate-x-0 translate-y-0 scale-0 opacity-0 pointer-events-none'
                } ${
                  active
                    ? 'border-[#89ceff]/85 bg-[#1e315c]/95 text-[#eef4ff]'
                    : syncedWithWorld
                      ? 'border-[#6cc997]/80 bg-[#143038]/94 text-[#d6fff0]'
                      : 'border-[#89ceff]/35 bg-[#12162e]/92 text-[#b8cee8]'
                }`}
              >
                <PatternGlyphSvg
                  shape={m.id}
                  active={active || syncedWithWorld}
                  className={`h-5 w-5 ${syncedWithWorld ? 'web-sync-pulse' : ''}`}
                />
                {settings.colorblindMode && (
                  <span className="absolute -bottom-1 right-0 text-[10px] font-bold text-[#e8b85b]">
                    {m.cbSymbol}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            tabIndex={-1}
            data-testid="radial-pattern-btn"
            aria-expanded={wheelOpen}
            aria-label={t.patternWheelLabel}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.blur();
              playUiSilkClick();
              setWheelOpen((prev) => !prev);
            }}
            className={`btn-jelly pointer-events-auto relative z-10 flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_6px_20px_rgba(6,8,20,0.82)] ${
              wheelOpen
                ? 'border-[#6cc997]/80 bg-[#15313a]/95 text-[#eef4ff]'
                : hud.gazeWebShape === hud.selectedMode
                  ? 'border-[#6cc997]/75 bg-[#172c46]/92 text-[#eef4ff]'
                  : 'border-[#89ceff]/50 bg-[#141b36]/90 text-[#dcebff]'
            }`}
          >
            <PatternGlyphSvg
              shape={hud.selectedMode}
              active
              className={`h-5 w-5 ${
                switchKey && !settings.reducedEffects
                  ? 'silk-icon-pop'
                  : hud.gazeWebShape === hud.selectedMode && !settings.reducedEffects
                    ? 'web-sync-pulse'
                    : ''
              }`}
            />
            {switchKey &&
              !settings.reducedEffects &&
              [
                [-16, -16],
                [16, -16],
                [-20, 4],
                [20, 4],
                [0, -22],
              ].map(([sx, sy], idx) => (
                <span
                  key={`${switchKey}-${idx}`}
                  aria-hidden="true"
                  className="silk-spark-particle pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#9ce6ff]"
                  style={
                    {
                      '--sp-x': `${sx}px`,
                      '--sp-y': `${sy}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
          </button>
        </div>

        {/* One Large Primary Weave / Catch Button ("Огонь") */}
        <button
          type="button"
          tabIndex={-1}
          data-testid="mobile-primary-btn"
          onPointerDown={(e) => {
            e.stopPropagation();
            if (isHarvestAction) {
              onHarvest();
            } else {
              onWeave();
            }
          }}
          className={`btn-jelly pointer-events-auto flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-full border-2 text-xs font-semibold tracking-wide shadow-[0_10px_30px_rgba(4,5,16,0.85)] active:scale-95 ${
            isHarvestAction
              ? 'border-[#e8b85b]/85 bg-[#332512]/94 text-[#ffe4a6]'
              : hud.nearAnchorLabel || hud.canClosePattern
                ? 'border-[#6cc997]/85 bg-[#12332c]/94 text-[#b8ffe2]'
                : 'border-[#89ceff]/60 bg-[#142242]/92 text-[#eef4ff]'
          }`}
        >
          <PatternGlyphSvg
            shape={hud.selectedMode}
            active
            className="h-6 w-6"
          />
          <span>{isHarvestAction ? t.harvestBtnLabel : t.weaveBtnLabel}</span>
        </button>
      </div>
    </div>
  );
};
