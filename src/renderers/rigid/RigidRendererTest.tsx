import React, { useState, useEffect } from 'react';
import { RigidRenderer } from './RigidRenderer';
import { VisualStep } from '../../contracts/visualStep';

export const RigidRendererTest = () => {
  const [step, setStep] = useState<VisualStep>({
    currentValue: 10,
    isMystery: false,
    options: [10, 20, 30, 40],
    mode: 'NM',
    modifiers: [
      { position: 'top', value: 2, operation: '×', text: 'x2' }
    ]
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => ({
        ...prev,
        currentValue: prev.currentValue === 10 ? 20 : 10,
        modifiers: [
          {
            position: 'top',
            value: prev.currentValue === 10 ? 3 : 2,
            operation: prev.currentValue === 10 ? '+' : '×',
            text: 'mod'
          }
        ]
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 20, color: 'white', fontFamily: 'monospace', fontSize: 14 }}>
        <strong>Rigid Renderer Test Harness (Isolated)</strong>
        <p>This is a completely isolated test environment for the rigid renderer geometry. It will cycle values every 2 seconds.</p>
        <p>Currently cycling between: {step.currentValue === 10 ? "State 1" : "State 2"}</p>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <RigidRenderer visualStep={step} config={{} as any} isDark={true} state={{} as any} />
      </div>
    </div>
  );
};
