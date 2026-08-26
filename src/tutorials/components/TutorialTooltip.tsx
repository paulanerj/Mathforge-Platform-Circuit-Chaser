import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface TutorialTooltipProps {
  title?: string;
  message: string;
  onClose: () => void;
  bounds: DOMRect | null;
  // Step-by-step navigation enhancements
  stepIndex?: number;
  totalSteps?: number;
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  isRealActionStep?: boolean;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  title = "Tutorial Step",
  message,
  onClose,
  bounds,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isRealActionStep = false,
}) => {
  const [viewportDims, setViewportDims] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportDims({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tooltipWidth = 320;
  const marginOffset = 16;

  // 1. Determine Placement (Above vs Below target)
  let placement: 'top' | 'bottom' | 'center' = 'bottom';
  if (bounds) {
    const spaceBelow = viewportDims.height - bounds.bottom;
    const spaceAbove = bounds.top;
    // If there is not enough room below (e.g. less than 160px), and more room above, flip
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      placement = 'top';
    }
  } else {
    placement = 'center';
  }

  // 2. Position tooltip relative to the screen bounds with safety clamps
  let tooltipStyle: React.CSSProperties = {};

  if (placement === 'center') {
    tooltipStyle = {
      position: 'fixed' as const,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${marginOffset * 2}px)`,
      zIndex: 130,
    };
  } else {
    // Math to center the tooltip horizontal center and clamp it so it doesn't bleed out of screen
    let leftCoord = bounds ? bounds.left + bounds.width / 2 : viewportDims.width / 2;
    const minLeft = tooltipWidth / 2 + marginOffset;
    const maxLeft = viewportDims.width - (tooltipWidth / 2 + marginOffset);

    if (viewportDims.width > (tooltipWidth + marginOffset * 2)) {
      leftCoord = Math.max(minLeft, Math.min(maxLeft, leftCoord));
    } else {
      leftCoord = viewportDims.width / 2;
    }

    if (placement === 'bottom') {
      tooltipStyle = {
        position: 'fixed' as const,
        left: `${leftCoord}px`,
        top: `${bounds!.bottom + 16}px`,
        transform: 'translateX(-50%)',
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${marginOffset * 2}px)`,
        zIndex: 130,
      };
    } else {
      tooltipStyle = {
        position: 'fixed' as const,
        left: `${leftCoord}px`,
        top: `${bounds!.top - 16}px`,
        transform: 'translate(-50%, -100%)',
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${marginOffset * 2}px)`,
        zIndex: 130,
      };
    }
  }

  const showPagination = typeof stepIndex === 'number' && typeof totalSteps === 'number' && totalSteps > 1;

  return (
    <div
      style={tooltipStyle}
      className="bg-white dark:bg-slate-900 border-4 border-indigo-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 z-[130] animate-in zoom-in-95 fade-in duration-200"
    >
      {/* Tooltip Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
          <h4 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight truncate">
            {title} {showPagination && `(${stepIndex! + 1}/${totalSteps})`}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          aria-label="Close tutorial step"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tooltip Body */}
      <div className="space-y-2.5">
        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-semibold">
          {message}
        </p>
        {isRealActionStep && (
          <div className="bg-indigo-50 dark:bg-slate-800 border-l-4 border-indigo-500 p-2 rounded-r-lg">
            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-widest animate-pulse">
              👉 Action required below to advance!
            </p>
          </div>
        )}
      </div>

      {/* Tooltip Footer Actions */}
      <div className="flex items-center justify-between pt-1 shrink-0">
        {onSkip && showPagination ? (
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-indigo-500 font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
          >
            Skip Guide
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {onPrev && showPagination && stepIndex! > 0 && (
            <button
              onClick={onPrev}
              className="p-2 text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg border border-indigo-100 dark:border-slate-850"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {isRealActionStep ? (
            <button
              onClick={onClose}
              className="sa-btn text-white bg-slate-400 dark:bg-slate-700 font-extrabold uppercase tracking-wider rounded-xl py-2 px-3.5 text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Got it
            </button>
          ) : (
            <button
              onClick={onNext || onClose}
              className="sa-btn text-white bg-indigo-500 hover:bg-indigo-600 font-extrabold uppercase tracking-wider rounded-xl py-2 px-4 text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              {showPagination && stepIndex! + 1 < totalSteps! ? (
                <>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                "Finish"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
