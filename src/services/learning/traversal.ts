/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, GameStep, GameMode } from '../../types';
import { RandomService } from '../randomService';

/**
 * 3. GENERATOR REPLACEMENT ARCHITECTURE
 * Topology-Aware Deterministic Traversal Engine
 */

export enum TraversalRegion {
  WARMUP = 'WARMUP',         // Low entropy, rhythm establishment
  COMPRESSION = 'COMPRESSION', // Pattern formation, heuristic building
  TENSION = 'TENSION',       // Interference spike, memory pressure
  RESOLUTION = 'RESOLUTION'  // Stability restoration
}

export interface SymbolicState {
  value: number;
  momentum: number;          // Rate of change or pattern consistency
  interference: number;      // Current noise level
  registers: Record<string, number>; // Hidden variables
}

export interface TraversalNode {
  id: string;
  region: TraversalRegion;
  state: SymbolicState;
  load: number;
}

export class TraversalEngine {
  /**
   * Generates a "Cognitive Arc" of steps.
   */
  static generateArc(startValue: number, totalSteps: number, config: AppConfig): GameStep[] {
    const steps: GameStep[] = [];
    let currentState: SymbolicState = {
      value: startValue,
      momentum: 0,
      interference: 0,
      registers: {}
    };

    // Divide total steps into regions (Warmup 20%, Compression 30%, Tension 30%, Resolution 20%)
    const regionCounts = {
      [TraversalRegion.WARMUP]: Math.floor(totalSteps * 0.2),
      [TraversalRegion.COMPRESSION]: Math.floor(totalSteps * 0.3),
      [TraversalRegion.TENSION]: Math.floor(totalSteps * 0.3),
      [TraversalRegion.RESOLUTION]: totalSteps - (Math.floor(totalSteps * 0.2) + Math.floor(totalSteps * 0.3) * 2)
    };

    let stepIndex = 0;
    for (const region of [TraversalRegion.WARMUP, TraversalRegion.COMPRESSION, TraversalRegion.TENSION, TraversalRegion.RESOLUTION]) {
      const count = (regionCounts as any)[region];
      for (let i = 0; i < count; i++) {
        const step = this.generateStepForRegion(region, currentState, config, stepIndex++);
        steps.push(step);
        currentState = this.updateSymbolicState(currentState, step);
      }
    }

    return steps;
  }

  private static generateStepForRegion(region: TraversalRegion, state: SymbolicState, config: AppConfig, index: number): GameStep {
    // This is the "Topology Navigation" logic
    // Different regions have different "Modulation Laws"
    
    let mode: GameMode = 'normal';
    let interference = 0;
    let complexity = 0;

    switch (region) {
      case TraversalRegion.WARMUP:
        mode = 'normal';
        interference = 0.1;
        complexity = 0.2;
        break;
      case TraversalRegion.COMPRESSION:
        mode = RandomService.chance(0.5) ? 'normal' : 'dark';
        interference = 0.3;
        complexity = 0.4;
        break;
      case TraversalRegion.TENSION:
        mode = 'qmm';
        interference = 0.8;
        complexity = 0.7;
        break;
      case TraversalRegion.RESOLUTION:
        mode = 'normal';
        interference = 0.2;
        complexity = 0.3;
        break;
    }

    // Use existing math logic but with region-specific constraints
    // (Simplified for now, will be hardened in future steps)
    const op = '+';
    const val = RandomService.getInt(1, 10);
    const nextVal = state.value + val;

    return {
      startNumber: state.value,
      operation: op,
      value: val,
      modifiers: [{ operation: op, value: val, position: 'bottom' }],
      mode,
      correctAnswer: nextVal,
      distractorCount: Math.floor(2 + interference * 2),
      distractors: [], // Placeholder to satisfy type, will be populated by generator if needed
      timerSeconds: Math.max(3, 10 - complexity * 7),
      meta: { region, symbolicState: { ...state } }
    };
  }

  private static updateSymbolicState(state: SymbolicState, step: GameStep): SymbolicState {
    return {
      ...state,
      value: step.correctAnswer,
      momentum: step.value, // Simple momentum for now
      interference: step.distractorCount / 5,
      registers: { ...state.registers }
    };
  }
}
