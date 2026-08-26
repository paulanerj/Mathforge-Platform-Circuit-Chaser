/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DifficultyLevel, DifficultyPlan, DifficultyVector, RampPhase } from './difficultyTypes';
import { DIFFICULTY_LEVELS } from './difficultyLevels';
import { RandomService } from '../randomService';
import { AppConfig } from '../../types';

const JUMP_SIZE_MAP: Record<string, number> = { small: 5, medium: 15, large: 40 };
const OPERAND_MAGNITUDE_MAP: Record<number, number> = { 1: 20, 2: 50, 3: 100, 4: 250, 5: 500 };

export const DifficultyEngine = {
  resolveDifficultyPlan(level: number, rampPhase: RampPhase, config?: AppConfig): DifficultyPlan {
    const safeLevel = Math.max(1, Math.min(10, Math.round(level)));
    const blueprint = DIFFICULTY_LEVELS[safeLevel];

    let timerSeconds = blueprint.timerPeak;
    if (rampPhase === 'intro') {
      timerSeconds = blueprint.timerIntro;
    } else if (rampPhase === 'build') {
      timerSeconds = blueprint.timerIntro - (blueprint.timerIntro - blueprint.timerPeak) * 0.5;
    } else if (rampPhase === 'relief') {
      timerSeconds = blueprint.timerIntro - (blueprint.timerIntro - blueprint.timerPeak) * 0.25;
    }

    const jumpSize = this.rollDistribution(blueprint.jumpSizeDistribution) as DifficultyVector['jumpSize'];
    const jumpMax = JUMP_SIZE_MAP[jumpSize] || 15;

    const modifierCount = parseInt(this.rollDistribution(blueprint.modifierCountDistribution));
    
    const magStr = this.rollDistribution(blueprint.modifierMagnitudeDistribution);
    let modifierMagnitude = 1;
    if (magStr === '1-2') modifierMagnitude = RandomService.getInt(1, 2);
    else if (magStr === '3') modifierMagnitude = 3;
    else if (magStr === '4') modifierMagnitude = 4;
    else if (magStr === '4-5') modifierMagnitude = RandomService.getInt(4, 5);
    else modifierMagnitude = parseInt(magStr);

    const distractorCount = parseInt(this.rollDistribution(blueprint.distractorCountDistribution));
    const distractorSimilarity = this.rollDistribution(blueprint.distractorSimilarityDistribution) as DifficultyVector['distractorSimilarity'];
    
    const operandMagStr = this.rollDistribution(blueprint.operandMagnitudeDistribution);
    const operandMagnitude = parseInt(operandMagStr);
    const opMagMax = OPERAND_MAGNITUDE_MAP[operandMagnitude] || 50;
    const rangeMax = config ? Math.min(config.rangeMax, opMagMax) : opMagMax;

    const memoryPressure = RandomService.chance(blueprint.memoryPressureProbability);

    const difficultyVector: DifficultyVector = {
      jumpSize,
      jumpMax,
      modifierCount,
      modifierMagnitude,
      distractorCount,
      distractorSimilarity,
      operandMagnitude,
      rangeMax,
      memoryPressure,
      timerSeconds
    };

    return {
      globalLevel: safeLevel,
      rampPhase,
      difficultyVector,
      source: 'system'
    };
  },

  rollDistribution(distribution: Record<string, number>): string {
    const roll = RandomService.next();
    let cumulative = 0;
    for (const [key, probability] of Object.entries(distribution)) {
      cumulative += probability;
      if (roll <= cumulative) {
        return key;
      }
    }
    // Fallback to the last key if floating point math causes issues
    return Object.keys(distribution).pop() || '';
  },

  getRampPhase(stepIndex: number, totalSteps: number): RampPhase {
    // Phase duration doubled (2x slower progression)
    // Original thresholds: 0.2, 0.5, 0.8
    // To slow down by 2x, we divide the progress by 2
    const progress = stepIndex / (totalSteps * 2);
    
    if (progress < 0.2) return 'intro';
    if (progress < 0.5) return 'build';
    if (progress < 0.8) return 'peak';
    return 'relief';
  }
};
