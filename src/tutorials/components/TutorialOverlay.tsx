import React, { useState, useEffect, useCallback } from 'react';
import { TutorialSpotlight } from './TutorialSpotlight';
import { TutorialTooltip } from './TutorialTooltip';

interface TutorialOverlayProps {
  targetId: string;
  title?: string;
  message: string;
  onClose: () => void;
  stepIndex?: number;
  totalSteps?: number;
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isRealActionStep?: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  targetId,
  title,
  message,
  onClose,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isRealActionStep = false,
}) => {
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  const updateBounds = useCallback(() => {
    // Locate the matching target element by data-guide-id attribute
    const el = document.querySelector(`[data-guide-id="${targetId}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      // Only keep bounds if width & height are non-zero
      if (rect.width > 0 && rect.height > 0) {
        setBounds(rect);
        return;
      }
    }
    setBounds(null);
  }, [targetId]);

  useEffect(() => {
    updateBounds();

    window.addEventListener('resize', updateBounds, { passive: true });
    window.addEventListener('scroll', updateBounds, { passive: true });

    // Microtick buffer to ensure layout finishes adjusting before calculation
    const timer = setTimeout(updateBounds, 120);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds);
      clearTimeout(timer);
    };
  }, [targetId, updateBounds]);

  return (
    <div 
      // During interactive steps, allow clicks to pass through overlay backdrop to hit target
      className={`fixed inset-0 z-[115] overflow-hidden ${
        isRealActionStep ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
      onClick={(e) => {
        // Only block clicks if we are in an informational step
        if (!isRealActionStep) {
          e.stopPropagation();
        }
      }}
    >
      {/* 1. Draw Spotlight */}
      <TutorialSpotlight bounds={bounds} />

      {/* 2. Draw Tooltip with active pointer-events so buttons remain clickable */}
      <div className="pointer-events-auto">
        <TutorialTooltip
          title={title}
          message={message}
          onClose={onClose}
          bounds={bounds}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          isRealActionStep={isRealActionStep}
        />
      </div>
    </div>
  );
};
