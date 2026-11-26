import React, { useEffect, useRef, useState } from 'react';
import type { HudSnapshot, PatternShape, UserSettings } from '../game/types';
import { DesktopControls } from './DesktopControls';
import { GameHUD } from './GameHUD';
import { MobileControls } from './MobileControls';

interface HUDProps {
  hud: HudSnapshot;
  settings: UserSettings;
  isFullscreen: boolean;
  isMobile: boolean;
  onSelectMode: (mode: PatternShape) => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onReturnToTitle: () => void;
  onMove: (x: number, y: number) => void;
  onJump: () => void;
  onDash: () => void;
  onWeave: () => void;
  onHarvest: () => void;
  onGrapple: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  settings,
  isFullscreen,
  isMobile,
  onSelectMode,
  onToggleMute,
  onPause,
  onRestart,
  onOpenSettings,
  onToggleFullscreen,
  onReturnToTitle,
  onMove,
  onJump,
  onDash,
  onWeave,
  onHarvest,
  onGrapple,
}) => {
  const prevModeRef = useRef<PatternShape>(hud.selectedMode);
  const [recentModeBoost, setRecentModeBoost] = useState(false);

  useEffect(() => {
    if (hud.selectedMode !== prevModeRef.current) {
      prevModeRef.current = hud.selectedMode;
      setRecentModeBoost(true);
      const timer = setTimeout(() => setRecentModeBoost(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [hud.selectedMode]);

  const showMobileControls =
    settings.touchControlsMode === 'on'
      ? true
      : settings.touchControlsMode === 'off'
        ? false
        : isMobile;

  const dockHighlighted =
    Boolean(hud.nearAnchorId) ||
    Boolean(hud.activeThreadFromId) ||
    recentModeBoost;

  return (
    <>
      <GameHUD
        hud={hud}
        settings={settings}
        isFullscreen={isFullscreen}
        showMobileControls={showMobileControls}
        onToggleMute={onToggleMute}
        onPause={onPause}
        onRestart={onRestart}
        onOpenSettings={onOpenSettings}
        onToggleFullscreen={onToggleFullscreen}
        onReturnToTitle={onReturnToTitle}
      />
      {showMobileControls ? (
        <MobileControls
          hud={hud}
          settings={settings}
          onMove={onMove}
          onSelectMode={onSelectMode}
          onWeave={onWeave}
          onHarvest={onHarvest}
          onJump={onJump}
          onDash={onDash}
          onGrapple={onGrapple}
        />
      ) : (
        <DesktopControls
          hud={hud}
          settings={settings}
          dockHighlighted={dockHighlighted}
          onSelectMode={onSelectMode}
          onWeave={onWeave}
          onHarvest={onHarvest}
          onJump={onJump}
          onDash={onDash}
          onGrapple={onGrapple}
        />
      )}
    </>
  );
};
