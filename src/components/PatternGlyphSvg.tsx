import React from 'react';
import type { PatternShape } from '../game/types';

export const PATTERN_MODES: {
  id: PatternShape;
  keyNum: string;
  cbSymbol: string;
}[] = [
  { id: 'triangle', keyNum: '1', cbSymbol: '▲' },
  { id: 'star', keyNum: '2', cbSymbol: '✦' },
  { id: 'circle', keyNum: '3', cbSymbol: '●' },
  { id: 'decoy', keyNum: '4', cbSymbol: '◈' },
];

export const PatternGlyphSvg: React.FC<{
  shape: PatternShape;
  active?: boolean;
  className?: string;
}> = ({ shape, active = false, className = 'h-4 w-4' }) => {
  const stroke = active ? '#eef4ff' : '#89ceff';
  const accent = shape === 'decoy' ? '#e8b85b' : shape === 'circle' ? '#6cc997' : '#89ceff';
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {shape === 'triangle' && (
        <>
          <polygon
            points="12,3 21,19 3,19"
            stroke={stroke}
            strokeWidth="1.5"
            fill={active ? 'rgba(137,206,255,0.22)' : 'none'}
          />
          <path d="M12 3V14M12 14L21 19M12 14L3 19" stroke={accent} strokeWidth="0.9" strokeOpacity="0.7" />
        </>
      )}
      {shape === 'star' && (
        <>
          <polygon
            points="12,2 14.8,8.5 21.8,9.2 16.4,13.8 18.1,20.8 12,17 5.9,20.8 7.6,13.8 2.2,9.2 9.2,8.5"
            stroke={stroke}
            strokeWidth="1.4"
            fill={active ? 'rgba(137,206,255,0.22)' : 'none'}
          />
          <circle cx="12" cy="12" r="2.2" fill={accent} fillOpacity="0.75" />
        </>
      )}
      {shape === 'circle' && (
        <>
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke={stroke}
            strokeWidth="1.5"
            fill={active ? 'rgba(108,201,151,0.18)' : 'none'}
          />
          <circle cx="12" cy="12" r="4.5" stroke={accent} strokeWidth="1" strokeDasharray="2 2" />
          <path d="M12 3.5V20.5M3.5 12H20.5" stroke={accent} strokeWidth="0.8" strokeOpacity="0.65" />
        </>
      )}
      {shape === 'decoy' && (
        <>
          <polygon
            points="12,2.5 20.5,8.5 17.5,19.5 6.5,19.5 3.5,8.5"
            stroke={stroke}
            strokeWidth="1.45"
            fill={active ? 'rgba(232,184,91,0.22)' : 'none'}
          />
          <circle cx="12" cy="12" r="3.2" stroke="#e8b85b" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="1.2" fill="#e8b85b" />
        </>
      )}
    </svg>
  );
};
