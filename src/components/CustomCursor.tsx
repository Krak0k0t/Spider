import React, { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  enabled: boolean;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ enabled }) => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('custom-cursor-active');
      setVisible(false);
      return;
    }

    const mq = window.matchMedia?.('(pointer: fine)');
    if (mq && !mq.matches) {
      return;
    }

    document.documentElement.classList.add('custom-cursor-active');

    let rafId = 0;
    let x = -100;
    let y = -100;

    const update = () => {
      rafId = 0;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      x = e.clientX;
      y = e.clientY;
      setVisible(true);
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[100] transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ willChange: 'transform', transform: 'translate3d(-100px, -100px, 0)' }}
    >
      {/* Glowing firefly-dewdrop + delicate spider tarsus tip */}
      <svg
        viewBox="0 0 36 36"
        className={`-translate-x-1 -translate-y-1 h-7 w-7 transition-transform duration-100 ${
          pressed ? 'scale-90' : 'scale-100'
        }`}
        fill="none"
      >
        {/* Firefly ambient halo */}
        <circle cx="8" cy="8" r="6.5" fill="rgba(137, 206, 255, 0.22)" />
        {/* Delicate spider tarsus claw pointing to hotspot (4,4) */}
        <path
          d="M4 4 C10 7, 16 14, 24 26 M4 4 C8 12, 13 18, 19 29"
          stroke="#dce6f5"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        {/* Hanging moon-dewdrop */}
        <path
          d="M8 7 C10.5 11, 10.5 14, 8 15.5 C5.5 14, 5.5 11, 8 7 Z"
          fill="#89ceff"
          fillOpacity="0.88"
        />
        <circle cx="4" cy="4" r="2.2" fill="#dce6f5" />
      </svg>
    </div>
  );
};
