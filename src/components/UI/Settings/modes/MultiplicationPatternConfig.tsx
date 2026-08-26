import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const MultiplicationPatternConfig: React.FC<ModeConfigProps> = ({ config, update }) => {
  return (
    <div className="grid grid-cols-1 gap-5 animate-pop relative">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-3">
          Table selection
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((b) => {
            const currentTables = config.selectedTables || [config.multBase || 4];
            const isSelected = currentTables.includes(b);
            return (
              <button
                key={b}
                onClick={() => {
                  let newTables;
                  if (isSelected) {
                    newTables = currentTables.filter(t => t !== b);
                    if (newTables.length === 0) newTables = [b];
                  } else {
                    newTables = [...currentTables, b].sort((x, y) => x - y);
                  }
                  update('selectedTables', newTables);
                  update('multBase', newTables[0]);
                }}
                className={`py-3 rounded-lg font-black text-lg border-2 transition-all ${
                  isSelected 
                    ? 'bg-[var(--sa-primary)] text-white border-[var(--sa-primary)] shadow-md scale-105' 
                    : 'bg-white text-[var(--sa-text)] border-[var(--sa-ui-border)] hover:border-[var(--sa-primary-soft)]'
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">
          Factor Range
        </label>
        <select
          value={config.multMaxFactor || 10}
          onChange={(e) => update('multMaxFactor', Number(e.target.value))}
          className="sa-input w-full text-center text-lg"
        >
          <option value={10}>×1–10</option>
          <option value={12}>×1–12</option>
        </select>
      </div>
    </div>
  );
};
