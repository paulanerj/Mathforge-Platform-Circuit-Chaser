import React from 'react';
import { ModeConfigProps } from './ModeConfigProps';

export const PatternLogicConfig: React.FC<ModeConfigProps> = ({ config, update }) => {
  const families = [
    { id: 'arithmetic', label: 'Arithmetic' },
    { id: 'skip', label: 'Skip' },
    { id: 'geometric', label: 'Geometric' },
    { id: 'alternating', label: 'Alternating' },
  ];

  const currentFamilies = config.patternFamilies || ['arithmetic', 'skip'];

  const toggleFamily = (id: string) => {
    if (currentFamilies.includes(id)) {
      const next = currentFamilies.filter(f => f !== id);
      if (next.length > 0) update('patternFamilies', next);
    } else {
      update('patternFamilies', [...currentFamilies, id]);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 animate-pop">
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-3">
          Pattern Families
        </label>
        <div className="grid grid-cols-2 gap-2">
          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFamily(f.id)}
              className={`py-3 rounded-lg font-black text-sm border-2 transition-all ${
                currentFamilies.includes(f.id)
                  ? 'bg-[var(--sa-primary)] text-white border-[var(--sa-primary)] shadow-md'
                  : 'bg-white text-[var(--sa-text)] border-[var(--sa-ui-border)] hover:border-[var(--sa-primary-soft)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold text-[var(--sa-ui-text-muted)] uppercase block mb-2">
          Sequence Length
        </label>
        <select
          value={config.patternLength || 4}
          onChange={(e) => update('patternLength', Number(e.target.value))}
          className="sa-input w-full text-center text-lg"
        >
          {[3, 4, 5, 6].map((len) => (
            <option key={len} value={len}>
              {len}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
