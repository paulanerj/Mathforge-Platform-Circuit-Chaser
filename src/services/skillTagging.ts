import { GameStep, AppConfig } from '../types';
import { isValidSkillKey } from './utils/skillKeyUtils';

export const getSkillTags = (step: GameStep, config: AppConfig): { skillKey: string; subSkill?: string } => {
  const mode = step.mode === 'normal' ? (config.learningMode || 'standard') : (step.mode || config.learningMode || 'standard');
  
  if (mode === 'multiplication' || mode === 'multiplication_linear' || mode === 'multiplication_pattern') {
    const factor1 = step.startNumber;
    const factor2 = step.value;
    const configuredTable = config.multBase || config.selectedTables?.[0];
    
    // Attempt to determine which is the table and which is the multiplier
    let actualTable = factor1;
    let actualFactor = factor2;
    
    if (configuredTable !== undefined && (configuredTable === factor2 || config.selectedTables?.includes(factor2))) {
      actualTable = factor2;
      actualFactor = factor1;
    }

    const clampedTable = Math.max(2, Math.min(actualTable, 12));
    
    let skillKey = `multiplication.table.${clampedTable}`;
    let subSkill = `multiplication.table.${clampedTable}.factor.${actualFactor}`;

    if (!isValidSkillKey(skillKey)) {
      console.warn('[SkillKey] Invalid generated:', skillKey);
      skillKey = 'multiplication.general';
      subSkill = undefined;
    }

    return { skillKey, subSkill };
  }

  if (mode === 'skipcount') { // Also handle other skip modes
    let stepSize = step.value || config.skipBase || 'unknown';
    
    // clamp skip sizes to 2..12
    if (typeof stepSize === 'number') {
      stepSize = Math.max(2, Math.min(stepSize, 12));
    }
    
    let skillKey = `skipcount.step.${stepSize}`;
    if (!isValidSkillKey(skillKey)) {
      console.warn('[SkillKey] Invalid generated:', skillKey);
      skillKey = 'skipcount.general';
    }

    return { skillKey };
  }

  if (mode === 'skip_rhythm') {
    let stepSize = step.value || config.skipBase || 'unknown';
    // clamp skip sizes to 2..12
    if (typeof stepSize === 'number') {
      stepSize = Math.max(2, Math.min(stepSize, 12));
    }

    const patternType = 'standard';
    return {
      skillKey: `skip_rhythm.step.${stepSize}.${patternType}`
    };
  }

  if (mode === 'pattern') {
    const patternType = step.meta?.patternType || 'arithmetic';
    const rule = step.meta?.patternRule || `+${step.value}`;
    const length = step.meta?.sequenceLength || config.patternLength || 4;
    return {
      skillKey: `pattern.${patternType}.${rule}`,
      subSkill: `pattern.${patternType}.${rule}.length.${length}`
    };
  }

  // fallback to standard arithmetic
  const op = step.operation || 'mixed';
  return {
    skillKey: `arithmetic.${op}`
  };
};
