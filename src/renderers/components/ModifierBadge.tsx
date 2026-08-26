import React from 'react';

type FlipPhase = 'idle' | 'out' | 'in';

export type ModifierPosition = 'top' | 'right' | 'bottom' | 'left';

export type ModifierBadgeProps = {
  position: ModifierPosition;
  value?: string;
  isVisible?: boolean;
  shouldAnimate?: boolean;
  uiSkin?: string;
  isDark?: boolean;
  levelColor?: string;
  ringRadius: number;
  operation?: string;
  text?: string;
};

export const ModifierBadge: React.FC<ModifierBadgeProps> = ({
  position,
  value,
  isVisible = true,
  shouldAnimate = false,
  uiSkin,
  isDark = false,
  levelColor = '#0284c7',
  ringRadius,
  operation,
  text,
}) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const [displayOperation, setDisplayOperation] = React.useState(operation);
  const [displayText, setDisplayText] = React.useState(text);
  const [flipPhase, setFlipPhase] = React.useState<FlipPhase>('idle');
  const [flipKey, setFlipKey] = React.useState(0);

  const isFlipAnimating = flipPhase !== 'idle';
  const badgeFlipClass  = flipPhase === 'out' ? 'animate-badge-flip-out'
                        : flipPhase === 'in'  ? 'animate-badge-flip-in'
                        : '';

  const MATHFORGE_FLIP_DURATION_MS = 260;
  const MATHFORGE_FLIP_MIDPOINT_MS = 130;

  React.useEffect(() => {
    const hasChanged = value !== displayValue || operation !== displayOperation || text !== displayText;
    
    if (shouldAnimate && hasChanged) {
      setFlipPhase('out');
      setFlipKey((prev) => prev + 1);

      const midpointTimeout = setTimeout(() => {
        setDisplayValue(value);
        setDisplayOperation(operation);
        setDisplayText(text);
        setFlipPhase('in');
      }, MATHFORGE_FLIP_MIDPOINT_MS);

      const endTimeout = setTimeout(() => {
        setFlipPhase('idle');
      }, MATHFORGE_FLIP_DURATION_MS);

      return () => {
        clearTimeout(midpointTimeout);
        clearTimeout(endTimeout);
      };
    } else if (hasChanged) {
      // Snap update if not animating or visibility just appeared
      setDisplayValue(value);
      setDisplayOperation(operation);
      setDisplayText(text);
      setFlipPhase('idle');
    }
  }, [value, operation, text, shouldAnimate, position]);

  if (!isVisible) return null;

  const MODIFIER_MIN_WIDTH = 80;
  const BORDER_WIDTH = 4;

  // The overlap logic: overlap toward the center.
  // Original distance was ringRadius. We subtract the overlap amount to move it closer to center.
  const overlapVar = 'var(--mf-modifier-overlap, -16px)';
  
  const anchors: Record<ModifierPosition, React.CSSProperties> = {
    left: {
      transform: `translate(calc(-50% - ${ringRadius}px - ${overlapVar}), -50%)`,
    },
    right: {
      transform: `translate(calc(-50% + ${ringRadius}px + ${overlapVar}), -50%)`,
    },
    top: {
      transform: `translate(-50%, calc(-50% - ${ringRadius}px - ${overlapVar}))`,
    },
    bottom: {
      transform: `translate(-50%, calc(-50% + ${ringRadius}px + ${overlapVar}))`,
    },
  };

  return (
    <div
      key={`${position}-flip-${flipKey}`}
      data-guide-id="modifier-zone"
      className={`mf-modifier mf-modifier--${position} is-visible ${isFlipAnimating ? 'should-animate' : ''} absolute left-1/2 top-1/2 z-30 flex items-center justify-center pointer-events-none transition-transform`}
      style={anchors[position]}
    >
      {/* Mechanical Edge Layer */}
      {isFlipAnimating && (
        <div 
          className="mf-modifier-edge animate-badge-edge-flash"
          style={{
            borderColor: isDark ? '#64748b' : levelColor,
            borderWidth: `${BORDER_WIDTH}px`,
          }}
        />
      )}

      <div
        className={`mf-modifier-body ${badgeFlipClass} px-5 py-2 sm:px-6 sm:py-3 bg-[var(--sa-card)] shadow-xl rounded-[2rem] text-3xl sm:text-4xl font-black text-center whitespace-nowrap ${
          isDark ? '!bg-slate-700 !text-white' : 'text-[var(--sa-text)]'
        } ${uiSkin === 'forge' ? 'modifier-forge' : ''}`}
        style={{
          minWidth: `${MODIFIER_MIN_WIDTH}px`,
          borderColor: isDark ? '#64748b' : levelColor,
          borderWidth: `${BORDER_WIDTH}px`,
          textShadow: uiSkin === 'forge' ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 1px rgba(0,0,0,0.15)',
        }}
      >
        <span className="mf-modifier-value">
          {displayOperation} {displayText ? <span className="font-serif italic">{displayText}</span> : displayValue}
        </span>
      </div>
    </div>
  );
};
