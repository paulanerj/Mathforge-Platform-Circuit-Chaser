import React from 'react';
import { VisualStep } from '../../contracts/visualStep';

type FlipPhase = 'idle' | 'out' | 'in';

export const Clock = ({ duration, isPaused, stepId, pulseRef, isQMM, containerRef }: { duration: number; isPaused: boolean; stepId?: string; pulseRef?: React.RefObject<HTMLDivElement | null>; isQMM?: boolean; containerRef?: React.RefObject<HTMLElement | null> }) => {
  const circleRef = React.useRef<SVGCircleElement>(null);
  const progressRef = React.useRef(0);
  
  React.useEffect(() => {
    progressRef.current = 0;
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = '282.743';
      const root = containerRef?.current || circleRef.current.closest('.center-skin') as HTMLElement;
      if (root) root.style.setProperty('--mf-pressure', '0');
    }
    if (pulseRef?.current) pulseRef.current.style.transform = 'scale(1)';
  }, [stepId, duration]);

  React.useEffect(() => {
    if (duration <= 0 || isPaused) return;
    
    let start: number | null = null;
    let reqId: number;

    const animate = (timestamp: number) => {
      if (!circleRef.current) {
        reqId = requestAnimationFrame(animate);
        return;
      }

      if (!start) start = timestamp - progressRef.current * duration * 1000;
      
      const tRaw = (timestamp - start) / (duration * 1000);
      let t = Math.max(0, Math.min(1, tRaw));
      
      if (t > 0.8) {
        const extra = (t - 0.8) / 0.2;
        t = 0.8 + extra * extra * 0.2;
      }
      
      progressRef.current = t;
      circleRef.current.style.strokeDashoffset = (282.743 - t * 282.743).toString();
      
      // Update pressure variable on the shared root wrapper instead of motion base
      const root = containerRef?.current || circleRef.current.closest('.center-skin') as HTMLElement;
      if (root) {
        root.style.setProperty('--mf-pressure', t.toString());
      }

      if (isQMM) {
        circleRef.current.style.stroke = '#e5e7eb';
        circleRef.current.style.strokeWidth = '8';
        if (pulseRef?.current) {
          pulseRef.current.style.transform = 'scale(1)';
        }
      } else {
        circleRef.current.style.stroke = 'url(#timerGradient)';
        const thickness = 8 + (t * 2);
        circleRef.current.style.strokeWidth = `${thickness}`;
        if (pulseRef?.current) {
          const eased = 1 - Math.pow(1 - t, 2);
          const baseScale = 1 + eased * 0.05;
          const wobble = Math.sin(performance.now() * 0.005) * 0.002;
          const finalScale = baseScale + wobble;
          pulseRef.current.style.transform = `scale(${Math.min(finalScale, 1.052)})`;
        }
      }

      if (tRaw < 1) {
        reqId = requestAnimationFrame(animate);
      }
    };
    
    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [duration, isPaused, pulseRef, isQMM]);

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none w-full h-full text-[var(--sa-primary)]`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 block">
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
        <circle
          ref={circleRef}
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="8"
          strokeDasharray="282.743"
          strokeDashoffset="282.743"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const StopwatchSVG = ({ duration = 5, isRunning = false, stepId }: { duration?: number; isRunning?: boolean; stepId?: string }) => {
  const ringRef = React.useRef<SVGCircleElement>(null);
  const handRef = React.useRef<SVGLineElement>(null);
  const progressRef = React.useRef(0);
  const [timeLeft, setTimeLeft] = React.useState(duration);
  const CIRCUMFERENCE = 339.292;

  React.useEffect(() => {
    setTimeLeft(duration);
    progressRef.current = 0;
    if (ringRef.current) ringRef.current.style.strokeDashoffset = '0';
    if (handRef.current) {
      handRef.current.setAttribute('x2', '60');
      handRef.current.setAttribute('y2', '15');
    }
  }, [duration, stepId]);

  React.useEffect(() => {
    if (!isRunning || duration <= 0) return;
    let start: number | null = null;
    let reqId: number;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp - progressRef.current * duration * 1000;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / (duration * 1000), 1);
      progressRef.current = p;
      setTimeLeft(Math.ceil(duration - duration * p));
      if (ringRef.current) ringRef.current.style.strokeDashoffset = (p * CIRCUMFERENCE).toString();
      if (handRef.current) {
        const angle = p * Math.PI * 2;
        handRef.current.setAttribute('x2', (60 + Math.sin(angle) * 45).toString());
        handRef.current.setAttribute('y2', (60 - Math.cos(angle) * 45).toString());
      }
      if (p < 1) reqId = requestAnimationFrame(animate);
    };
    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [isRunning, duration]);

  return (
    <div className="absolute inset-0 w-full h-full drop-shadow-xl pointer-events-none flex items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
        <circle cx="60" cy="60" r="54" fill="var(--sa-overlay)" stroke="var(--sa-border)" strokeWidth="6" />
        <circle
          ref={ringRef}
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--sa-primary)"
          strokeWidth="6"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset="0"
          transform="rotate(-90 60 60)"
          strokeLinecap="round"
        />
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1={60 + Math.sin((i * Math.PI) / 6) * 44}
            y1={60 - Math.cos((i * Math.PI) / 6) * 44}
            x2={60 + Math.sin((i * Math.PI) / 6) * 50}
            y2={60 - Math.cos((i * Math.PI) / 6) * 50}
            stroke="var(--sa-border)"
            strokeWidth={i % 3 === 0 ? 3 : 1}
          />
        ))}
        <line ref={handRef} x1="60" y1="60" x2="60" y2="15" stroke="var(--sa-focus)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="60" cy="60" r="4" fill="var(--sa-focus)" />
      </svg>
      <div className="relative z-10 text-3xl font-black text-[var(--sa-text)] mt-12 drop-shadow-sm">{timeLeft}</div>
    </div>
  );
};

export type CenterCoinProps = {
  visualStep: VisualStep;
  scaleFactor: number;
  levelColor: string;
  glowStyles: string;
  backgroundStyle: string;
  pulseRef: React.RefObject<HTMLDivElement | null>;
  flashState: string | null;
  onCenterClick?: () => void;
  uiSkin?: 'default' | 'forge';
  isIdling?: boolean;
  momentumScaleClass: string;
  isDark: boolean;
  isQMM: boolean;
  streakCount: number;
  isTransitioning?: boolean;
};

const MATHFORGE_FLIP_DURATION_MS = 260;
const MATHFORGE_FLIP_MIDPOINT_MS = 130;

export const CenterCoin: React.FC<CenterCoinProps> = ({
  visualStep,
  scaleFactor,
  levelColor,
  glowStyles,
  backgroundStyle,
  pulseRef,
  flashState,
  onCenterClick,
  uiSkin,
  isIdling,
  momentumScaleClass,
  isDark,
  isQMM,
  streakCount,
  isTransitioning,
}) => {
  const [displayValue, setDisplayValue] = React.useState(visualStep.currentValue);
  const [isDisplayMystery, setIsDisplayMystery] = React.useState(visualStep.isMystery);
  const [flipPhase, setFlipPhase] = React.useState<FlipPhase>('idle');
  const [flipKey, setFlipKey] = React.useState(0);

  const isAnimating = flipPhase !== 'idle';
  const coinFlipClass = flipPhase === 'out' ? 'animate-coin-flip-out'
                      : flipPhase === 'in'  ? 'animate-coin-flip-in'
                      : '';

  const shouldSuppressAtmosphere = isAnimating || isTransitioning;

  React.useEffect(() => {
    if (visualStep.currentValue !== displayValue || visualStep.isMystery !== isDisplayMystery) {
      setFlipPhase('out');
      setFlipKey((prev) => prev + 1); // remount only at start

      const midpointTimeout = setTimeout(() => {
        setDisplayValue(visualStep.currentValue);
        setIsDisplayMystery(visualStep.isMystery);
        setFlipPhase('in'); // class change triggers arrival animation — no remount
      }, MATHFORGE_FLIP_MIDPOINT_MS);

      const endTimeout = setTimeout(() => {
        setFlipPhase('idle');
      }, MATHFORGE_FLIP_DURATION_MS);

      return () => {
        clearTimeout(midpointTimeout);
        clearTimeout(endTimeout);
      };
    }
  }, [visualStep.currentValue, visualStep.isMystery]);

  const CIRCLE_SIZE = 200 * scaleFactor;
  const BORDER_WIDTH = 8 * scaleFactor;
  const NUMERAL_ZONE_SIZE = '100%';
  
  const timerSeconds = visualStep.timerSeconds || 0;
  const isPaused = visualStep.isPaused || false;
  const activeTable = visualStep.activeTable;
  const rhythmState = visualStep.rhythm;

  return (
    <div
      className="mf-center-coin relative flex items-center justify-center p-4"
      style={{
        width: `${CIRCLE_SIZE}px`,
        height: `${CIRCLE_SIZE}px`,
      }}
    >
      <div 
        ref={pulseRef} 
        key={`flip-${flipKey}`}
        className={`mf-coin-face absolute inset-0 ${coinFlipClass}`}
      >
        {/* Mechanical Edge Layer */}
        {isAnimating && (
          <div 
            className="mf-coin-edge animate-coin-edge-flash"
            style={{
              borderColor: isDark ? '#475569' : levelColor,
              borderWidth: `${BORDER_WIDTH}px`,
            }}
          />
        )}

        <div
          onClick={onCenterClick}
          data-guide-id={isDark ? "dark-mode-center-action" : "center-coin"}
          className={`mf-coin-inner central-circle absolute inset-0 rounded-full flex items-center justify-center z-20 pointer-events-auto transition-all duration-[100ms] ease-out hover:scale-[1.02] active:scale-[0.98] active:brightness-95 cursor-pointer ${
            isDark ? '!border-slate-600' : ''
          } ${flashState === 'correct' ? momentumScaleClass : (isIdling ? 'animate-pulse-subtle' : 'scale-100')} ${
            flashState === 'incorrect' ? 'animate-glow-spike-red scale-[0.96]' : ''
          }`}
          style={{
            borderWidth: `${BORDER_WIDTH}px`,
            borderColor: isQMM ? 'var(--sa-warning)' : (isDark ? '#475569' : levelColor),
            boxShadow: glowStyles,
            background: backgroundStyle,
          }}
        >
          {/* Active Table Indicator */}
          {activeTable && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--sa-primary)] text-white px-4 py-1 rounded-full text-xs font-black shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-50">
              TABLE: {activeTable}
            </div>
          )}

          {/* Micro Streak Signal */}
          {!isQMM && streakCount >= 3 && (
            <div className="absolute -top-6 right-0 translate-x-1/4 bg-[var(--sa-focus)] text-white px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm animate-in zoom-in fade-in duration-300 z-50 border border-white/20">
              {streakCount}x
            </div>
          )}

          {/* Momentum Chain Indicator */}
          {rhythmState && rhythmState.chainLength > 0 && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[var(--sa-focus)] text-white px-4 py-1 rounded-full text-xs font-black shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-50 flex items-center gap-2">
              <span>CHAIN {rhythmState.chainLength}</span>
              <span className="bg-white text-[var(--sa-focus)] px-2 py-0.5 rounded-full text-[10px]">
                x{rhythmState.chainMultiplier}
              </span>
            </div>
          )}

          {/* Ring Slot removed: timer logic handled by CircleRenderer */}

          {/* Main Numeral Slot */}
          <div className="mf-coin-number absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className="flex items-center justify-center text-center px-4"
              style={{ width: NUMERAL_ZONE_SIZE, height: NUMERAL_ZONE_SIZE }}
            >
              {isDark ? (
                <div className="absolute inset-0 z-50 text-[var(--sa-focus)] animate-darkfade">
                  <StopwatchSVG
                    duration={timerSeconds}
                    isRunning={!isPaused}
                    stepId={visualStep.stepId}
                  />
                </div>
              ) : (
                <div
                  className="relative font-black tracking-tighter text-[var(--sa-text)] flex flex-col items-center justify-center w-full"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                  {isDisplayMystery ? (
                    <span className="text-[var(--sa-warning)]" style={{ fontSize: `${Math.min(64 * scaleFactor, 112)}px` }}>?</span>
                  ) : (
                    <span className="whitespace-nowrap" style={{ fontSize: `${Math.min(64 * scaleFactor, 112)}px` }}>{displayValue ?? 0}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
