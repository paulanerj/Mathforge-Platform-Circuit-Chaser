import React, { useState, useEffect, useRef } from 'react';
import { VisualStep } from '../../contracts/visualStep';

export const RigidCenterCoin = ({ visualStep, isDark = false }: { visualStep: VisualStep, isDark?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(visualStep.currentValue);
  const [isDisplayMystery, setIsDisplayMystery] = useState(visualStep.isMystery);
  const [rotation, setRotation] = useState(0);

  // Guard against React Strict Mode double-invocation & rapid re-renders
  const processedRef = useRef({ val: visualStep.currentValue, myst: visualStep.isMystery });

  useEffect(() => {
    const needsUpdate = visualStep.currentValue !== processedRef.current.val || visualStep.isMystery !== processedRef.current.myst;
    
    if (needsUpdate) {
      processedRef.current = { val: visualStep.currentValue, myst: visualStep.isMystery };
      setRotation(prev => prev + 180);
      
      // Swap exactly at 50% of the 320ms transition duration
      // If a new solve occurs before this fires, clearTimeout correctly drops this intermediate update 
      // and snaps processing to the newest state, preventing queue flooding.
      const timeout = setTimeout(() => {
        setDisplayValue(visualStep.currentValue);
        setIsDisplayMystery(visualStep.isMystery);
      }, 160);
      
      return () => clearTimeout(timeout);
    }
  }, [visualStep.currentValue, visualStep.isMystery]);

  const THICKNESS_LAYERS = 24;
  const LAYER_DEPTH = 1; // px per layer

  return (
    <div className="rigid-perspective z-20">
      <div className="rigid-coin-wrapper" style={{ transform: `rotateY(${rotation}deg)` }}>
        
        {/* Edge / Thickness Layers */}
        {Array.from({ length: THICKNESS_LAYERS }).map((_, i) => {
          const zOffset = (i - THICKNESS_LAYERS / 2) * LAYER_DEPTH;
          return (
            <div 
              key={i} 
              className="rigid-coin-layer" 
              style={{ transform: `translateZ(${zOffset}px)` }} 
            />
          );
        })}

        {/* Front Face */}
        <div className="rigid-coin-face" style={{ transform: `translateZ(${(THICKNESS_LAYERS / 2) * LAYER_DEPTH}px)` }}>
          <div className="rigid-coin-enamel">
            {isDisplayMystery ? '?' : displayValue}
          </div>
        </div>

        {/* Back Face */}
        <div className="rigid-coin-face" style={{ transform: `translateZ(${-(THICKNESS_LAYERS / 2) * LAYER_DEPTH}px) rotateY(180deg)` }}>
          <div className="rigid-coin-enamel">
            {isDisplayMystery ? '?' : displayValue}
          </div>
        </div>

      </div>
    </div>
  );
};
