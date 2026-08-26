/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RampPhase = 'intro' | 'build' | 'peak' | 'relief';

export interface DifficultyLevel {
  level: number;
  timerIntro: number;
  timerPeak: number;
  jumpSizeDistribution: Record<string, number>;
  modifierCountDistribution: Record<string, number>;
  modifierMagnitudeDistribution: Record<string, number>;
  distractorCountDistribution: Record<string, number>;
  distractorSimilarityDistribution: Record<string, number>;
  operandMagnitudeDistribution: Record<string, number>;
  memoryPressureProbability: number;
}

export interface DifficultyVector {
  jumpSize: 'small' | 'medium' | 'large';
  jumpMax: number;
  modifierCount: number;
  modifierMagnitude: number;
  distractorCount: number;
  distractorSimilarity: 'low' | 'medium' | 'high' | 'very high' | 'extreme';
  operandMagnitude: number;
  rangeMax: number;
  memoryPressure: boolean;
  timerSeconds: number;
}

export interface DifficultyPlan {
  globalLevel: number;
  rampPhase: RampPhase;
  difficultyVector: DifficultyVector;
  source: string;
}
