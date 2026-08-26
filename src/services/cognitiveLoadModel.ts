/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameStep, AppConfig, GameMode } from '../types';

/*
COGNITIVE PURPOSE:
This module provides internal cognitive difficulty inference.
It computes a multi-dimensional "Cognitive Load Score" for any given game step.
This is the foundational layer for future adaptive pacing, fatigue modeling, 
and mastery inference.

ARCHITECTURAL INVARIANTS:
- Deterministic (same input = same load object)
- Side-effect free
- UI-agnostic (does not read DOM or window state)
*/

export interface CognitiveLoad {
  /** 
   * 1. Structural Complexity: 
   * Measures the "weight" of the symbolic transformation.
   * Factors: number of ops, decomposition depth, operator difficulty.
   */
  structural: number;

  /** 
   * 2. Interference Density: 
   * Measures the "noise" or "confusion" potential.
   * Factors: distractor proximity, operator ambiguity, symbolic similarity.
   */
  interference: number;

  /** 
   * 3. Working Memory Demand: 
   * Measures the "mental state tracking" requirement.
   * Factors: hidden states (QMM), carry tracking, sequence continuity.
   */
  workingMemory: number;

  /** 
   * 4. Timing Pressure: 
   * Measures the temporal stress context.
   * Factors: mode-specific speed requirements, response windows.
   */
  timing: number;

  /** Aggregate scalar for quick reference (0.0 to 1.0 range recommended) */
  aggregate: number;
}

export const CognitiveLoadModel = {
  /**
   * Computes the cognitive load for a specific step within a given session context.
   */
  computeLoadForStep(step: GameStep, config: AppConfig, context: { 
    stepIndex: number; 
    totalSteps: number;
    prevStepCorrect?: boolean;
    latencyMs?: number;
  }): CognitiveLoad {
    
    // 1. Structural Complexity
    let structural = 0;
    // Base complexity from operation
    const opWeights: Record<string, number> = { '+': 0.1, '-': 0.15, '×': 0.4, '÷': 0.5, 'pattern': 0.3 };
    structural += opWeights[step.operation] || 0.1;
    
    // Complexity from decomposition (modifiers)
    if (step.modifiers && step.modifiers.length > 1) {
      structural += (step.modifiers.length - 1) * 0.15;
    }
    
    // Complexity from variables
    if (step.variable) {
      structural += 0.3;
    }

    // 2. Interference Density
    let interference = 0;
    // Distractor count increases interference
    interference += (step.distractorCount || 0) * 0.1;
    
    // Mode-specific interference
    if (step.mode === 'qmm') {
      interference += 0.25; // QMM distractors are intentionally closer/more confusing
    }
    
    // Learning mode specific interference
    if (config.learningMode === 'multiplication' || config.learningMode === 'skipcount') {
      interference += 0.15; // Table/Sequence neighbor confusion
    }

    // 3. Working Memory Demand
    let workingMemory = 0;
    // Hidden state tracking (QMM) is the primary driver
    if (step.mode === 'qmm') {
      workingMemory += 0.6;
    }
    
    // Dark mode requires memory retention
    if (step.mode === 'dark') {
      workingMemory += 0.3;
    }
    
    // Sequence continuity (Pattern/Skipcount)
    if (['pattern', 'skipcount'].includes(config.learningMode)) {
      workingMemory += 0.2;
    }
    
    // Carry tracking / Magnitude
    if (step.correctAnswer > 50) workingMemory += 0.1;
    if (step.correctAnswer > 100) workingMemory += 0.1;

    // 4. Timing Pressure
    let timing = 0;
    if (step.timerSeconds > 0) {
      // Inverse relationship: less time = more pressure
      // Assuming 10s is "relaxed" (0.1) and 2s is "intense" (0.9)
      timing = Math.max(0.1, Math.min(1.0, 1 - (step.timerSeconds / 12)));
    }
    
    // Mode-specific temporal stress
    if (step.mode === 'dark') timing += 0.2; // Concealment adds temporal stress

    // Normalize and Aggregate
    structural = Math.min(1.0, structural);
    interference = Math.min(1.0, interference);
    workingMemory = Math.min(1.0, workingMemory);
    timing = Math.min(1.0, timing);

    const aggregate = (structural * 0.3) + (interference * 0.2) + (workingMemory * 0.3) + (timing * 0.2);

    return {
      structural,
      interference,
      workingMemory,
      timing,
      aggregate: Math.round(aggregate * 100) / 100
    };
  }
};
