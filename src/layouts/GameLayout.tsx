import React from 'react';

/**
 * GameLayout
 * Pure structural component that defines the "bands" of the game screen.
 * It does NOT track game state or handle rendering logic.
 */

interface GameLayoutProps {
  topBar?: React.ReactNode;
  centerArea: React.ReactNode;
  answerArea: React.ReactNode;
  footer?: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  topBar,
  centerArea,
  answerArea,
  footer,
}) => {
  return (
    <div 
      className="flex flex-col w-full h-full max-w-4xl mx-auto px-4 overflow-hidden select-none"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      {/* Top Bar Section (Status, Progress, Health) */}
      {topBar && (
        <div className="shrink-0 flex items-center justify-center h-20">
          {topBar}
        </div>
      )}

      {/* Center Zone (Cognitive / Problem Area) */}
      <div className="flex-1 relative flex flex-col items-center justify-start pt-14 min-h-0 overflow-visible">
        {centerArea}
      </div>

      {/* Answer Region (Interaction) */}
      <div className="shrink-0 flex items-center justify-center py-4">
        {answerArea}
      </div>

      {/* System Controls (Exit, Pause, Options) */}
      {footer && (
        <div className="shrink-0 h-16 pb-4 flex items-center justify-center">
          {footer}
        </div>
      )}
    </div>
  );
};
