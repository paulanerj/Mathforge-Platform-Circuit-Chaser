import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const MixedArithmeticConfig: React.FC<ModeConfigProps> = ({ config, updateOp }) => {
  return (
    <div className="space-y-6 animate-pop">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-3">
          Allowed Operations
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['+', '-', '×', '÷'].map((op) => (
            <button
              key={op}
              onClick={() => updateOp(op, !config.opsEnabled[op])}
              className={`px-4 py-3 rounded-xl font-black text-xs transition-all text-center ${
                config.opsEnabled[op] ? 'op-enabled' : 'op-disabled hover:border-[var(--sa-ui-accent-soft)]'
              }`}
            >
              {op === '+' ? '+ Add' : op === '-' ? '− Subtract' : op === '×' ? '× Multiply' : '÷ Divide'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
