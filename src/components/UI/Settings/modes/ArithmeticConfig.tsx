import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const ArithmeticConfig: React.FC<ModeConfigProps> = ({ config, updateOp, update }) => {
  return (
    <div className="space-y-6 animate-pop">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-3">
          Operations
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['+', '-'].map((op) => (
            <button
              key={op}
              onClick={() => updateOp(op, !config.opsEnabled[op])}
              className={`px-4 py-3 rounded-xl font-black text-sm transition-all text-center ${
                config.opsEnabled[op] ? 'op-enabled' : 'op-disabled hover:border-[var(--sa-ui-accent-soft)]'
              }`}
            >
              {op === '+' ? '+ Addition' : '− Subtraction'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">
            Min Step
          </label>
          <input
            type="number"
            value={config.rangeMin}
            onChange={(e) => update('rangeMin', Number(e.target.value))}
            className="sa-input w-full text-center text-lg"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">
            Max Step
          </label>
          <input
            type="number"
            value={config.rangeMax}
            onChange={(e) => update('rangeMax', Number(e.target.value))}
            className="sa-input w-full text-center text-lg"
          />
        </div>
      </div>
    </div>
  );
};
