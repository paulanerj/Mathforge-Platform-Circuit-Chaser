/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phase, GameMode } from '../types';

import { RandomService } from './randomService';

/*
AI_CONTEXT:
PhaseScheduler manages the temporal sequencing of game modes.
It ensures that the transition between cognitive environments (normal, dark, qmm) 
follows a deterministic loop defined in the phaseSequence.

QMM =
• continuity burden
• mental state persistence pressure
• interference-resistant arithmetic execution
• predictive traversal load
• symbolic working memory compression

QMM is NOT concealment mode
QMM is NOT UI difficulty gimmick
QMM is NOT hidden answer mechanic

Do not randomize this sequence; cognitive training relies on predictable environment shifts.
*/
export const PhaseScheduler = {
  getModeForStep(stepIndex: number, phaseSequence: Phase[]): GameMode {
    if (!phaseSequence || phaseSequence.length === 0) return 'normal';
    const loopLength = phaseSequence.reduce((acc, p) => acc + p.count, 0);
    if (loopLength === 0) return 'normal';
    let pos = stepIndex % loopLength;
    for (const phase of phaseSequence) {
      if (pos < phase.count) return phase.mode;
      pos -= phase.count;
    }
    return 'normal';
  },
};

/*
AI_CONTEXT:
DifficultyOrchestrator manages the "Cognitive Resistance" scaling.
It uses a combination of performance tracking (skill) and logistic progress 
to adjust rangeMax, modifiers, and distractor counts.
The "Spike" interval introduces controlled difficulty surges to test 
interference resistance and mental load tolerance.
This is now deterministic via RandomService.
*/
export class DifficultyOrchestrator {
  lastMode: GameMode = 'normal';
  skill: number = 0.5;
  last10Results: number[] = [];
  stepsSinceLastSpike: number = 0;
  nextSpikeInterval: number = 0;

  constructor() {
    this.reset();
  }

  getRandomSpikeInterval() {
    return RandomService.getInt(7, 10);
  }

  reset() {
    this.lastMode = 'normal';
    this.skill = 0.5;
    this.last10Results = [];
    this.stepsSinceLastSpike = 0;
    this.nextSpikeInterval = this.getRandomSpikeInterval();
  }

  recordStepResult(correct: boolean) {
    const performance = correct ? 1 : 0;
    this.skill = this.skill * 0.9 + performance * 0.1;
    this.last10Results.push(performance);
    if (this.last10Results.length > 10) this.last10Results.shift();
  }

  getNextStepProfile(stepIndex: number, totalSteps: number, phaseSequence: Phase[]) {
    const mode = PhaseScheduler.getModeForStep(stepIndex, phaseSequence);
    const progress = totalSteps > 0 ? Math.max(0, Math.min(1, stepIndex / totalSteps)) : 0;
    const k = 8,
      midpoint = 0.65;
    const logisticProgress = 1 / (1 + Math.exp(-k * (progress - midpoint)));
    let accuracy = 0.5;
    if (this.last10Results.length > 0) {
      const sum = this.last10Results.reduce((a, b) => a + b, 0);
      accuracy = sum / this.last10Results.length;
    }
    const skillAdjustment = 0.7 + accuracy * 0.6;
    let difficulty = Math.max(0, Math.min(1, logisticProgress * skillAdjustment));
    this.stepsSinceLastSpike++;
    if (this.stepsSinceLastSpike >= this.nextSpikeInterval) {
      difficulty += 0.1;
      this.stepsSinceLastSpike = 0;
      this.nextSpikeInterval = this.getRandomSpikeInterval();
    }
    difficulty = Math.max(0, Math.min(1, difficulty));
    const timerSeconds = Math.max(5, 12 - difficulty * 7);
    this.lastMode = mode;
    return {
      mode,
      tier: {
        startStep: stepIndex,
        allowVariables: difficulty > 0.8,
        allowComplexOps: difficulty > 0.6,
        recommendedDarkTimer: timerSeconds,
      },
    };
  }
}

export const orchestrator = new DifficultyOrchestrator();
