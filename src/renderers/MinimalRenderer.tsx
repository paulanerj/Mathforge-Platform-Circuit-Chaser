import React from 'react';
import { RendererProps } from './RendererProps';

export const MinimalRenderer: React.FC<RendererProps> = ({
  visualStep,
  flashState,
  chainLength = 0,
  onCenterClick,
  uiSkin
}) => {
  if (!visualStep) return null;

  const getFeedbackClass = () => {
    if (flashState === 'correct') return 'bg-green-500/12 text-green-600 scale-[1.06]';
    if (flashState === 'incorrect') return 'bg-red-500/12 text-red-600';
    return '';
  };

  const shake = flashState === 'incorrect';
  const streakClass = 
    chainLength >= 5 ? 'shadow-[0_0_18px_rgba(59,130,246,0.35),0_0_32px_rgba(59,130,246,0.25)]' :
    chainLength >= 3 ? 'shadow-[0_0_12px_rgba(59,130,246,0.25)]' :
    '';

  const isMystery = visualStep.isMystery;

  return (
    <div 
      onClick={onCenterClick}
      className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-120 ease-in-out cursor-pointer ${getFeedbackClass()} ${streakClass} ${shake ? 'animate-shake' : ''}`}
    >
      <div className="flex items-center justify-center gap-6 select-none font-black tracking-tight" style={{ fontSize: 'clamp(48px, 15vw, 120px)' }}>
        {isMystery ? (
          <span className="text-[var(--sa-warning)] animate-pulse">?</span>
        ) : (
          <>
            <span>{visualStep.currentValue}</span>
            {visualStep.operation && (
              <span className="text-[var(--sa-text-muted)] opacity-50">{visualStep.operation}</span>
            )}
            {visualStep.modifier !== undefined && (
              <span>{visualStep.modifier}</span>
            )}
          </>
        )}
      </div>
      
      {/* Small metadata indicators hidden by default in minimal mode, but keeping structure */}
      <div className="absolute bottom-12 flex gap-4">
        {visualStep.activeTable && (
          <div className="text-xs font-bold uppercase tracking-widest opacity-30">
            Table {visualStep.activeTable}
          </div>
        )}
      </div>
    </div>
  );
};
