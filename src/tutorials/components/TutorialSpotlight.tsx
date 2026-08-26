import React from 'react';

interface TutorialSpotlightProps {
  bounds: DOMRect | null;
}

export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({ bounds }) => {
  if (!bounds) return null;

  const padding = 8;
  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;

  return (
    <div
      className="fixed z-[120] pointer-events-none rounded-2xl border-2 border-dashed border-indigo-500 dark:border-indigo-400 animate-pulse transition-all duration-300"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
      }}
    />
  );
};
