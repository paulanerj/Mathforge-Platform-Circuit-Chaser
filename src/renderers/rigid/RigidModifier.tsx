import React, { useState, useEffect, useRef } from 'react';
// Removed unused import ModifierState

type RigidModifierProps = {
  key?: string;
  modifier: any;
  position: 'top' | 'right' | 'bottom' | 'left';
};

export const RigidModifier = ({ modifier, position }: RigidModifierProps) => {
  const [displayValue, setDisplayValue] = useState(modifier.value);
  const [displayOperation, setDisplayOperation] = useState(modifier.operation);
  const [rotation, setRotation] = useState(0);

  // Guard against React Strict Mode double-invocation & rapid re-renders
  const processedRef = useRef({ val: modifier.value, op: modifier.operation });

  useEffect(() => {
    const needsUpdate = modifier.value !== processedRef.current.val || modifier.operation !== processedRef.current.op;

    if (needsUpdate) {
      processedRef.current = { val: modifier.value, op: modifier.operation };
      setRotation(prev => prev + 180);
      
      // Swap exactly at 50% of the 260ms transition duration
      const timeout = setTimeout(() => {
        setDisplayValue(modifier.value);
        setDisplayOperation(modifier.operation);
      }, 130);
      
      return () => clearTimeout(timeout);
    }
  }, [modifier.value, modifier.operation]);

  const THICKNESS_LAYERS = 16;
  const LAYER_DEPTH = 1; // px per layer

  // Pushing modifiers slightly back in true Z space creates a real mount illusion
  const getTransform = () => {
    const offset = 'var(--mf-modifier-offset, 160px)';
    const depth = 'translateZ(-12px)'; // mounts securely behind the central hub
    switch(position) {
      case 'top': return `${depth} translateY(calc(${offset} * -1))`;
      case 'bottom': return `${depth} translateY(${offset})`;
      case 'right': return `${depth} translateX(${offset})`;
      case 'left': return `${depth} translateX(calc(${offset} * -1))`;
      default: return `${depth} translateY(calc(${offset} * -1))`;
    }
  };

  return (
    <div className="rigid-perspective z-10" style={{ transform: getTransform() }}>
      <div 
        className="rigid-modifier-wrapper"
        style={{ transform: `rotateX(${rotation}deg)` }}
      >
        {/* Edge / Thickness Layers */}
        {Array.from({ length: THICKNESS_LAYERS }).map((_, i) => {
          const zOffset = (i - THICKNESS_LAYERS / 2) * LAYER_DEPTH;
          return (
            <div 
              key={i} 
              className="rigid-modifier-layer" 
              style={{ transform: `translateZ(${zOffset}px)` }} 
            />
          );
        })}

        {/* Front Face */}
        <div className="rigid-modifier-face" style={{ transform: `translateZ(${(THICKNESS_LAYERS / 2) * LAYER_DEPTH}px)` }}>
          {displayOperation} {displayValue}
        </div>

        {/* Back Face */}
        <div className="rigid-modifier-face" style={{ transform: `translateZ(${-(THICKNESS_LAYERS / 2) * LAYER_DEPTH}px) rotateX(180deg)` }}>
          {displayOperation} {displayValue}
        </div>
      </div>
    </div>
  );
};
