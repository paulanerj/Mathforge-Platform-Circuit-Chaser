/**
 * 🔒 STABLE BASELINE FILE
 * Do not modify without explicit architecture change approval.
 * Changes here can break the entire app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { VisualStep } from '../contracts/visualStep';
import { DifficultyColorMapper } from '../ui/difficultyColorMap';
import { RendererProps } from './RendererProps';
import { SkinLayer } from '../components/UI/SkinLayer';
import { CenterCoin, Clock } from './components/CenterCoin';
import { ModifierBadge, ModifierPosition } from './components/ModifierBadge';

const EnergyRing = ({ active, color }: { active: boolean; color: string }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-[-16px] rounded-full border-[3px] border-dashed opacity-40 animate-slow-spin-subtle pointer-events-none"
         style={{ borderColor: color }} />
  );
};

export const CircleRenderer: React.FC<RendererProps> = ({
  visualStep,
  flashState,
  streakTier = 0,
  onCenterClick,
  uiSkin
}) => {
  const pulseRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);

  if (!visualStep) {
    return null;
  }
  
  const [scaleFactor, setScaleFactor] = useState(1);
  const currentModeStr = visualStep?.mode ?? 'NM';
  const isDark = visualStep?.mode === 'DM';
  
  useEffect(() => {
    const updateScale = () => {
      const containerWidth = rendererRef.current?.offsetWidth || 390;
      setScaleFactor(Math.min(Math.max(containerWidth / 390, 1), 1.6));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      if (isDark) {
        // Removed dark-mode-specific filter down to normal because it hurt contrast on the stopwatch
        rendererRef.current.style.filter = 'none';
      } else {
        rendererRef.current.style.filter = 'none';
      }
    }
  }, [isDark]);

  const currentLevel = visualStep?.currentLevel || 5;
  const levelColor = DifficultyColorMapper.getHexForLevel(currentLevel);
  const baseGlowColor = DifficultyColorMapper.getColorForLevel(currentLevel);
  
  const shake = flashState === 'incorrect';
  const currentStreakTier = streakTier || 0;
  const isQMM = currentModeStr === 'QMM';
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    if (!visualStep.stepId) return;
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 260);
    return () => clearTimeout(timer);
  }, [visualStep.stepId]);

  const getGlowStyles = () => {
    if (flashState === 'incorrect') return `0 0 30px rgba(239, 68, 68, 0.6)`;
    const baseBlur = 15 + (currentLevel * 3);
    const baseSpread = currentLevel - 1;
    const baseGlow = `0 0 ${baseBlur}px ${baseSpread}px ${baseGlowColor}`;
    
    if (isQMM) return baseGlow;
    
    if (currentStreakTier === 3) {
      return `0 0 40px rgba(59, 130, 246, 0.55), 0 0 80px rgba(59, 130, 246, 0.45), 0 0 120px rgba(59, 130, 246, 0.35), ${baseGlow}`;
    }
    if (currentStreakTier === 2) {
      return `0 0 28px rgba(59, 130, 246, 0.45), 0 0 56px rgba(59, 130, 246, 0.35), ${baseGlow}`;
    }
    if (currentStreakTier === 1) {
      return `0 0 24px rgba(59, 130, 246, 0.35), 0 0 42px rgba(59, 130, 246, 0.25), ${baseGlow}`;
    }
    return `0 0 16px rgba(59, 130, 246, 0.25), 0 0 32px rgba(59, 130, 246, 0.15), ${baseGlow}`;
  };

  const getBackgroundStyle = () => {
    if (flashState === 'correct') return 'rgba(34, 197, 94, 0.15)';
    if (flashState === 'incorrect') return 'rgba(239, 68, 68, 0.15)';
    if (isDark) return '#1e293b';
    if (currentStreakTier === 3 && !isQMM) return 'radial-gradient(circle at 35% 30%, #ffffff, #bfdbfe)';
    if (currentStreakTier >= 1 && !isQMM) return 'radial-gradient(circle at 35% 30%, #ffffff, #dbeafe)';
    return 'radial-gradient(circle at 35% 30%, #ffffff, #e6eef5)';
  };

  const isIdling = !visualStep.isPaused && !flashState && !isTransitioning;
  const shouldSuppressAtmosphere = isTransitioning;
  const isIdlingActive = isIdling && !isQMM && !shouldSuppressAtmosphere;

  const CIRCLE_SIZE = 200 * scaleFactor; 
  const RADIUS_RATIO = 110 / 200;
  const RING_RADIUS = Math.round(CIRCLE_SIZE * RADIUS_RATIO);

  const momentumScaleClass = currentStreakTier === 3 ? 'scale-[1.07]' : 
                             currentStreakTier === 2 ? 'scale-[1.06]' :
                             currentStreakTier === 1 ? 'scale-[1.05]' : 'scale-[1.04]';

  const modifierOrder: ModifierPosition[] = ['top', 'right', 'bottom', 'left'];
  const visibleModifiers = visualStep.modifiers ? visualStep.modifiers.map(m => m.position as ModifierPosition) : [];
  
  // Animation Orchestration logic: 
  // Any visible modifier that changes values will animate internally in the ModifierBadge.
  const animatedModifiers: ModifierPosition[] = visibleModifiers;

  return (
    <div ref={rendererRef} className={`relative flex items-center justify-center shrink-0 w-full h-full ${shake ? 'animate-shake' : ''}`}>
      <SkinLayer skin={uiSkin} className={`center-skin flex items-center justify-center ${flashState ? `flash-${flashState}` : ''} ${isQMM ? 'qmm-mode' : ''}`}>
        
        {/* Assembly Container ensuring spatial coupling without rotational leakage */}
        <div className="relative flex items-center justify-center" style={{ width: `${CIRCLE_SIZE}px`, height: `${CIRCLE_SIZE}px` }}>

          {/* COIN BODY LAYER (Z: 10) */}
          <div
            className={`mf-motion-base absolute inset-0 flex items-center justify-center ${isIdlingActive ? 'animate-idle-drift' : ''}`}
            style={{ zIndex: 'var(--mf-z-coin, 10)' }}
          >
            {!isQMM && currentStreakTier > 0 && <EnergyRing active={true} color={levelColor} />}
            
            <CenterCoin
              visualStep={visualStep}
              scaleFactor={scaleFactor}
              levelColor={levelColor}
              glowStyles={getGlowStyles()}
              backgroundStyle={getBackgroundStyle()}
              pulseRef={pulseRef}
              flashState={flashState}
              onCenterClick={onCenterClick}
              uiSkin={uiSkin}
              isIdling={isIdling}
              momentumScaleClass={momentumScaleClass}
              isDark={isDark}
              isQMM={isQMM}
              streakCount={visualStep.streakCount || 0}
              isTransitioning={isTransitioning}
            />
          </div>
          
          {/* TIMER LAYER (Z: 20) - Isolated from structural rotation */}
          {visualStep.usesRingTimer && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 'var(--mf-z-timer, 20)' }}
            >
              <div className="absolute inset-0 -m-2">
                <Clock
                  duration={visualStep.timerSeconds || 0}
                  isPaused={visualStep.isPaused || false}
                  stepId={visualStep.stepId}
                  pulseRef={pulseRef}
                  isQMM={isQMM}
                  containerRef={rendererRef}
                />
              </div>
            </div>
          )}

          {/* MODIFIER LAYER (Z: 30) - Shares structural rotation */}
          <div
            className={`mf-motion-base absolute inset-0 flex items-center justify-center pointer-events-none ${isIdlingActive ? 'animate-idle-drift' : ''}`}
            style={{ zIndex: 'var(--mf-z-modifier, 30)' }}
          >
            {modifierOrder.map((position) => {
              const mod = visualStep.modifiers?.find(m => m.position === position);
              return (
                <ModifierBadge
                  key={position}
                  position={position}
                  value={mod?.value?.toString()}
                  operation={mod?.operation}
                  text={mod?.text}
                  isVisible={visibleModifiers.includes(position)}
                  shouldAnimate={animatedModifiers.includes(position)}
                  uiSkin={uiSkin}
                  isDark={isDark}
                  levelColor={levelColor}
                  ringRadius={RING_RADIUS}
                />
              );
            })}
          </div>
        </div>
      </SkinLayer>
    </div>
  );
};
