import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const SkipCountingConfig: React.FC<ModeConfigProps> = ({ config, update }) => {
  return (
    <div className="grid grid-cols-2 gap-5 animate-pop">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">Step Size</label>
        <select
          value={config.skipBase || 7}
          onChange={(e) => update('skipBase', Number(e.target.value))}
          className="sa-input w-full text-center text-lg"
        >
          {[2, 3, 4, 5, 6, 7, 8, 9].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="row-span-2">
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">Number Range</label>
        <div className="flex flex-col gap-3">
          <input
            type="number"
            placeholder="Start"
            value={config.rangeMin}
            onChange={(e) => update('rangeMin', Number(e.target.value))}
            className="sa-input w-full text-center text-lg"
            min="1"
            max="100"
          />
          <input
            type="number"
            placeholder="End"
            value={config.rangeMax}
            onChange={(e) => update('rangeMax', Number(e.target.value))}
            className="sa-input w-full text-center text-lg"
            min="1"
            max="100"
          />
        </div>
      </div>
    </div>
  );
};
