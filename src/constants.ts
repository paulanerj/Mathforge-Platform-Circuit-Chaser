/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, CurriculumBlock } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  learningMode: 'standard',
  skipBase: 7,
  skipMaxStep: 2,
  skipPresentationStyle: 'mixed',
  skipOscillation: true,
  multBase: 4,
  selectedTables: [4],
  multMaxFactor: 10,
  multMaxStep: 2,
  multAllowReverse: true,
  patternStep: 3,
  patternMaxValue: 60,
  patternLength: 4,
  patternAllowReverse: true,
  presentationMode: 'standard',
  progressionMode: 'curriculum',
  scriptId: 'beginner_addition_10',
  rangeMin: 2,
  rangeMax: 70,
  totalSteps: 50,
  targetNumber: 20,
  targetFlex: 0,
  opsEnabled: { '+': true, '-': true, '×': true, '÷': true },
  isMuted: false,
  timerOn: true,
  quickMindInterval: 10,
  darkModeInterval: 5,
  modifiersPerStep: 2,
  activeMode: 'normal',
  enableVariables: false,
  stopwatchSkin: 'cinnamoroll',
  phaseSequence: [
    { mode: 'normal', count: 3 },
    { mode: 'qmm', count: 3 },
    { mode: 'dark', count: 3 },
    { mode: 'qmm', count: 5 },
  ],
  pedagogicalFailSafe: true,
};

export const INITIAL_CURRICULUM_BLOCKS: CurriculumBlock[] = [
  { start: 1, end: 5, rangeMax: 5, modifiers: 1, operations: "+-", timer: 10, distractors: 1, variables: false },
  { start: 6, end: 10, rangeMax: 7, modifiers: 1, operations: "+-", timer: 10, distractors: 2, variables: false },
  { start: 11, end: 15, rangeMax: 8, modifiers: 2, operations: "+-", timer: 8, distractors: 2, variables: false },
  { start: 16, end: 20, rangeMax: 10, modifiers: 2, operations: "+-", timer: 5, distractors: 3, variables: false },
  { start: 21, end: 25, rangeMax: 10, modifiers: 2, operations: "+-×", timer: 8, distractors: 2, variables: false },
  { start: 26, end: 30, rangeMax: 5, modifiers: 2, operations: "+-", timer: 10, distractors: 2, variables: false },
  { start: 31, end: 35, rangeMax: 8, modifiers: 2, operations: "+-", timer: 8, distractors: 2, variables: false },
  { start: 36, end: 40, rangeMax: 10, modifiers: 2, operations: "+-×", timer: 8, distractors: 2, variables: false },
  { start: 41, end: 45, rangeMax: 12, modifiers: 2, operations: "+-×", timer: 7, distractors: 3, variables: false },
  { start: 46, end: 50, rangeMax: 10, modifiers: 4, operations: "+-", timer: 10, distractors: 3, variables: true }
];

export const STORAGE_KEYS = {
  SETTINGS: 'speedMathSettings',
  SCORES: 'speedMathHighScores',
  XP: 'sa_xp_data',
  PROGRESS: 'speedMathProgress',
  CURRICULUM: 'speedmath_curriculum',
  LESSON_PLANS: 'speedmath_lesson_plans',
  ACTIVE_SESSION: 'speedmath_active_session'
};
