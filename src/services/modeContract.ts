/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMode, LearningMode } from '../types';

/*
AI_CONTEXT:
This module defines the behavioral identity of each mode as a cognitive world.
It serves as the source of truth for:
- cognitive purpose
- allowed pressure types
- answer visibility rules
- distractor philosophy
- timing philosophy

Do not simplify these contracts. 
Future engine layers (Cognitive Load Modeling) will depend on these definitions.
*/

export interface ModeContract {
  id: GameMode | LearningMode;
  purpose: string;
  pressure: 'time' | 'interference' | 'concealment' | 'none';
  answerVisibility: 'visible' | 'hidden' | 'delayed';
  distractorPhilosophy: 'standard' | 'interference' | 'neighbor' | 'table' | 'sequence';
  timingPhilosophy: 'pressure' | 'concealment' | 'interruption' | 'continuity';
  notGoal: string;
}

export const MODE_CONTRACTS: Record<string, ModeContract> = {
  normal: {
    id: 'normal',
    purpose: 'Baseline arithmetic fluency and symbolic manipulation.',
    pressure: 'time',
    answerVisibility: 'visible',
    distractorPhilosophy: 'standard',
    timingPhilosophy: 'pressure',
    notGoal: 'Not trying to disrupt mental state tracking.'
  },
  qmm: {
    id: 'qmm',
    purpose: 'Mental state tracking and predictive reasoning under interference.',
    pressure: 'interference',
    answerVisibility: 'hidden',
    distractorPhilosophy: 'interference',
    timingPhilosophy: 'concealment',
    notGoal: 'Not trying to be a simple "guess the number" gimmick.'
  },
  dark: {
    id: 'dark',
    purpose: 'Temporal decision pressure and memory retention under concealment.',
    pressure: 'concealment',
    answerVisibility: 'delayed',
    distractorPhilosophy: 'standard',
    timingPhilosophy: 'interruption',
    notGoal: 'Not trying to be a permanent blackout mode.'
  },
  multiplication: {
    id: 'multiplication',
    purpose: 'Symbolic retrieval and factor-neighbor discrimination.',
    pressure: 'none',
    answerVisibility: 'visible',
    distractorPhilosophy: 'table',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to be a rote-memorization drill.'
  },
  multiplication_pattern: {
    id: 'multiplication_pattern',
    purpose: 'Symbolic retrieval and factor-neighbor discrimination.',
    pressure: 'none',
    answerVisibility: 'visible',
    distractorPhilosophy: 'table',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to be a rote-memorization drill.'
  },
  multiplication_linear: {
    id: 'multiplication_linear',
    purpose: 'Pure multiplication table fluency through strictly linear progression.',
    pressure: 'none',
    answerVisibility: 'visible',
    distractorPhilosophy: 'table',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to disrupt mental state tracking.'
  },
  skipcount: {
    id: 'skipcount',
    purpose: 'Sequence anticipation and directional mental modeling.',
    pressure: 'none',
    answerVisibility: 'visible',
    distractorPhilosophy: 'sequence',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to be a simple addition drill.'
  },
  pattern: {
    id: 'pattern',
    purpose: 'Structural pattern recognition and predictive arithmetic flow.',
    pressure: 'none',
    answerVisibility: 'visible',
    distractorPhilosophy: 'neighbor',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to be a random number sequence.'
  },
  skip_rhythm: {
    id: 'skip_rhythm',
    purpose: 'Train multiplication intuition and number rhythm through structured skip-count sequences.',
    pressure: 'time',
    answerVisibility: 'visible',
    distractorPhilosophy: 'sequence',
    timingPhilosophy: 'continuity',
    notGoal: 'Not trying to be a simple worksheet drill.'
  }
};

export const getModeContract = (mode: string): ModeContract => {
  return MODE_CONTRACTS[mode] || MODE_CONTRACTS.normal;
};
