/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorWeights } from './types/learning';
import { DifficultyVector, RampPhase } from './services/difficulty/difficultyTypes';

export type GameMode = 'normal' | 'qmm' | 'dark' | 'survival' | 'hidden' | 'none' | 'multiplication' | 'pattern' | 'skipcount';
export type LearningMode = 'standard' | 'skipcount' | 'multiplication' | 'multiplication_linear' | 'multiplication_pattern' | 'pattern' | 'skip_rhythm' | 'mixed';
export type ProgressionMode = 'curriculum' | 'adaptive';

export interface Phase {
  mode: GameMode;
  count: number;
}

export interface AppConfig {
  learningMode: LearningMode;
  skipBase: number;
  skipMaxStep: number;
  skipPresentationStyle: string;
  skipOscillation: boolean;
  multBase: number;
  multMaxFactor: number;
  multMaxStep: number;
  multAllowReverse: boolean;
  patternStep: number;
  patternMaxValue: number;
  patternLength: number;
  patternAllowReverse: boolean;
  patternFamilies?: string[];
  patternComplexity?: 'basic' | 'standard' | 'advanced';
  presentationMode: string;
  progressionMode: ProgressionMode;
  scriptId: string;
  rangeMin: number;
  rangeMax: number;
  totalSteps: number;
  targetNumber: number;
  targetFlex: number;
  opsEnabled: Record<string, boolean>;
  isMuted: boolean;
  timerOn: boolean;
  quickMindInterval: number;
  darkModeInterval: number;
  modifiersPerStep: number;
  activeMode: 'normal' | 'survival';
  enableVariables: boolean;
  stopwatchSkin: string;
  phaseSequence: Phase[];
  errorWeights?: ErrorWeights;
  difficultyLevel?: number;
  selectedTables?: number[];
  targetResponseTime?: number;
  answerChoices?: number; // Total number of choices (default 4)
  strictValidation?: boolean;
  forcedQuestion?: {
    questionLabel: string;
    correctAnswer: number | string;
    startNumber?: number | null;
    value?: number | null;
    operation?: string;
  };
  pedagogicalFailSafe?: boolean;
}

export interface Modifier {
  operation: string;
  value: number | string;
  text?: string;
  position: 'left' | 'right' | 'bottom' | 'top';
}

export interface GameStep {
  startNumber: number;
  operation: string;
  value: number;
  modifiers: Modifier[];
  mode: GameMode;
  variable?: { name: string; value: number };
  correctAnswer: number;
  distractorCount: number;
  distractors: number[];
  timerSeconds: number;
  meta?: any;
  _curriculumBlock?: CurriculumBlock | null;
  difficultyMeta?: {
    level: number;
    rampPhase: RampPhase;
    difficultyVector: DifficultyVector;
  };
}

export interface CurriculumBlock {
  start: number;
  end: number;
  rangeMax: number;
  modifiers: number;
  operations: string;
  timer: number;
  distractors: number;
  variables: boolean;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'finished';
  currentNumber: number;
  stepIndex: number;
  steps: GameStep[];
  errorCount: number;
  elapsedTime: number;
  virtualTime: number; // Deterministic tick-based time
  seed: string;        // PRNG seed for session
  matrix?: any;        // Serialized CognitiveMatrix
  activeMasks?: any[]; // Active BonusMasks
  isPaused: boolean;
  lives: number;
  distractors: number[];
  flashState: 'correct' | 'incorrect' | null;
  shake: boolean;
  opUpdateAnim: boolean;
  lastEvent: string;
  initError: string | null;
  timedOutLocked: boolean;
  currentMode?: GameMode;
  streakCount: number;
  failedCurrentStep?: boolean;
}
