import React from 'react';
import { RendererProps } from '../RendererProps';
import { RigidCenterCoin } from './RigidCenterCoin';
import { RigidModifier } from './RigidModifier';
import './rigidRenderer.css';

export const RigidRenderer: React.FC<RendererProps> = ({ visualStep, config, isDark, state, uiSkin, flashState, timerState }) => {
  const rendererRef = React.useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = React.useState(1);

  React.useEffect(() => {
    const updateScale = () => {
      const containerWidth = rendererRef.current?.offsetWidth || 390;
      setScaleFactor(Math.min(Math.max(containerWidth / 390, 1), 1.6));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!visualStep) return null;

  const CIRCLE_SIZE = 220 * scaleFactor;
  const MOD_WIDTH = 140 * scaleFactor;
  const MOD_HEIGHT = 56 * scaleFactor;
  // Deep tuck: modifiers overlap the coin physically
  const MOD_OFFSET = (CIRCLE_SIZE / 2) + Math.max(8, 8 * scaleFactor);

  return (
    <div ref={rendererRef} className="relative flex items-center justify-center shrink-0 w-full h-full">
      <div 
        className="rigid-renderer-root"
        style={{
          ['--mf-coin-size' as any]: `${CIRCLE_SIZE}px`,
          ['--mf-modifier-width' as any]: `${MOD_WIDTH}px`,
          ['--mf-modifier-height' as any]: `${MOD_HEIGHT}px`,
          ['--mf-modifier-offset' as any]: `${MOD_OFFSET}px`,
        }}
      >
        <RigidCenterCoin visualStep={visualStep} isDark={isDark} />
        
        {/* Modifiers */}
        {visualStep.modifiers && visualStep.modifiers.map((mod, i) => (
          <RigidModifier key={`${mod.position}-${i}`} modifier={mod} position={mod.position as any} />
        ))}
      </div>
    </div>
  );
};
