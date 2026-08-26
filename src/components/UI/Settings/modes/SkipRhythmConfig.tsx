import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const SkipRhythmConfig: React.FC<ModeConfigProps> = ({ config, update }) => {
  return (
    <div className="grid grid-cols-2 gap-5 animate-pop">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">Pattern Types</label>
        <select
          value={config.skipPresentationStyle || 'linear'}
          onChange={(e) => update('skipPresentationStyle', e.target.value)}
          className="sa-input w-full text-center text-lg"
        >
          <option value="linear">Linear</option>
          <option value="oscillating">Oscillating</option>
          <option value="elastic">Elastic</option>
        </select>
      </div>
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">Step Size</label>
        <select
          value={config.skipBase || 2}
          onChange={(e) => update('skipBase', Number(e.target.value))}
          className="sa-input w-full text-center text-lg"
        >
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
