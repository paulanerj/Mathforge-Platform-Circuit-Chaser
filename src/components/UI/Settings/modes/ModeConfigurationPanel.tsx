import React from 'react';
import { AppConfig } from '../../../../types';
import { ArithmeticConfig } from './ArithmeticConfig';
import { MultiplicationFluencyConfig } from './MultiplicationFluencyConfig';
import { MultiplicationPatternConfig } from './MultiplicationPatternConfig';
import { SkipCountingConfig } from './SkipCountingConfig';
import { SkipRhythmConfig } from './SkipRhythmConfig';
import { PatternLogicConfig } from './PatternLogicConfig';
import { MixedArithmeticConfig } from './MixedArithmeticConfig';

interface Props {
  config: AppConfig;
  update: (key: keyof AppConfig, value: any) => void;
  updateOp: (op: string, value: boolean) => void;
}

export const ModeConfigurationPanel: React.FC<Props> = ({ config, update, updateOp }) => {
  const renderConfig = () => {
    switch (config.learningMode) {
      case 'standard':
        return <ArithmeticConfig config={config} update={update} updateOp={updateOp} />;
      case 'multiplication_linear':
        return <MultiplicationFluencyConfig config={config} update={update} updateOp={updateOp} />;
      case 'multiplication_pattern':
        return <MultiplicationPatternConfig config={config} update={update} updateOp={updateOp} />;
      case 'skipcount':
        return <SkipCountingConfig config={config} update={update} updateOp={updateOp} />;
      case 'skip_rhythm':
        return <SkipRhythmConfig config={config} update={update} updateOp={updateOp} />;
      case 'pattern':
        return <PatternLogicConfig config={config} update={update} updateOp={updateOp} />;
      case 'mixed':
        return <MixedArithmeticConfig config={config} update={update} updateOp={updateOp} />;
      default:
        return null;
    }
  };

  return (
    <div className="sa-settings-panel h-full border-t-4 border-t-[var(--sa-ui-accent)]">
      <h3 className="text-[10px] font-black tracking-widest text-[var(--sa-ui-text-muted)] uppercase mb-4 opacity-60 flex items-center gap-2 border-b border-[var(--sa-ui-border)] pb-3">
        <span className="text-lg">⚙️</span> Layer 2 — Context Config
      </h3>
      {renderConfig()}
    </div>
  );
};
