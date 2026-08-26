import { useState, useRef, useCallback } from 'react';

export interface UseTutorialFreezeAdapterArgs {
  isGamePaused: boolean;
  togglePause: () => void;
}

export interface TutorialFreezeAdapter {
  isFrozenByOverlay: boolean;
  beginOverlayFreeze: () => void;
  endOverlayFreeze: () => void;
  wasGamePausedBeforeOverlay: boolean;
}

/**
 * A custom hook to safely manage freeze & resume operations for help and tutorial overlays.
 * Ensures the overlay records the pre-existing pause state of the game and restores it
 * accurately upon exit, preventing accidental double-toggles.
 */
export function useTutorialFreezeAdapter({
  isGamePaused,
  togglePause,
}: UseTutorialFreezeAdapterArgs): TutorialFreezeAdapter {
  const [isFrozenByOverlay, setIsFrozenByOverlay] = useState(false);
  const wasGamePausedBeforeOverlayRef = useRef(false);

  const beginOverlayFreeze = useCallback(() => {
    // Record previous pause state
    wasGamePausedBeforeOverlayRef.current = isGamePaused;
    
    // Freeze gameplay under overlay if not already paused
    if (!isGamePaused) {
      togglePause();
    }
    
    setIsFrozenByOverlay(true);
  }, [isGamePaused, togglePause]);

  const endOverlayFreeze = useCallback(() => {
    setIsFrozenByOverlay(false);
    
    // Only resume if the game was NOT paused before we opened the overlay
    if (!wasGamePausedBeforeOverlayRef.current && isGamePaused) {
      togglePause();
    }
  }, [isGamePaused, togglePause]);

  return {
    isFrozenByOverlay,
    beginOverlayFreeze,
    endOverlayFreeze,
    wasGamePausedBeforeOverlay: wasGamePausedBeforeOverlayRef.current,
  };
}
