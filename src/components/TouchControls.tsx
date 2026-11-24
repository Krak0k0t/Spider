import React, { useEffect, useRef, useState } from 'react';
import { getTranslations } from '../game/i18n';
import type { HudSnapshot, UserSettings } from '../game/types';

interface TouchControlsProps {
  hud: HudSnapshot;
  mode: UserSettings['touchControlsMode'];
  onMove: (x: number, y: number) => void;
  onJump: () => void;
  onWeave: () => void;
  onHarvest: () => void;
  onGrapple: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  hud,
  mode,
  onMove,
  onJump,
  onWeave,
  onHarvest,
  onGrapple,
}) => {
  const [autoShow, setAutoShow] = useState(false);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const stickRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    const check = () => {
      const coarse =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;
      const narrow = window.innerWidth < 960;
      setAutoShow(coarse || narrow);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const visible =
    hud.screen === 'playing' &&
    (mode === 'on' || (mode === 'auto' && autoShow));

  useEffect(() => {
    if (!visible) {
      onMove(0, 0);
      setKnobOffset({ x: 0, y: 0 });
      activePointerId.current = null;
    }
  }, [visible, onMove]);

  if (!visible) return null;

  const t = getTranslations(hud.language);
  const maxR = 36;

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

  return (
    <div
      data-testid="touch-controls"
      className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-4 pointer-events-none select-none"
    >
      {/* Left Virtual Thumbstick */}
      <div
        ref={stickRef}
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
        className="pointer-events-auto relative flex h-24 w-24 touch-none items-center justify-center rounded-full border border-[#9ec5ff]/35 bg-[#080f1c]/78 shadow-[0_6px_22px_rgba(0,0,0,0.65)]"
        aria-label="Move stick"
      >
        <div
          className="h-10 w-10 rounded-full border border-[#cde2ff]/65 bg-[#1e3559]/90 shadow-md"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="pointer-events-auto flex items-end gap-2.5 touch-none">
        {hud.hasGrapple && (
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              onGrapple();
            }}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[#9effdb]/55 bg-[#102b27]/90 text-[11px] font-semibold text-[#9effdb] shadow-lg active:scale-95"
          >
            {t.grappleBtnLabel}
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (hud.canHarvestFly) onHarvest();
            else onWeave();
          }}
          className={`flex h-13 w-13 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold shadow-lg active:scale-95 ${
            hud.canHarvestFly
              ? 'border-[#ffcf70]/75 bg-[#332610]/92 text-[#ffdf94]'
              : hud.nearAnchorLabel || hud.canClosePattern
                ? 'border-[#9effdb]/70 bg-[#14332d]/92 text-[#9effdb]'
                : 'border-[#9ec5ff]/40 bg-[#122038]/90 text-[#e4f0ff]'
          }`}
        >
          {hud.canHarvestFly ? t.harvestBtnLabel : t.weaveBtnLabel}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => {
            e.stopPropagation();
            onJump();
          }}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#cde2ff]/60 bg-[#1c3257]/92 text-xs font-semibold text-white shadow-lg active:scale-95"
        >
          {t.jumpBtnLabel}
        </button>
      </div>
    </div>
  );
};
