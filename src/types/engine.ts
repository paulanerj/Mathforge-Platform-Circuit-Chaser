/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMode, GameStep, AppConfig } from '../types';

/**
 * 1. REDUCER CONTRACT SCHEMA
 * Defines the strict interface for all state transitions.
 * 
 * REPLAY_INTEGRITY: This schema constitutes the canonical record of the session.
 */
export type CognitiveActionType = 
  | 'INITIALIZE_SIMULATION'
  | 'COMMIT_SYMBOLIC_STATE'
  | 'INJECT_INTERFERENCE'
  | 'PROCESS_TEMPORAL_TICK'
  | 'TRANSITION_COGNITIVE_MODE'
  | 'RECORD_PERFORMANCE_SIGNAL';

export interface CognitiveAction {
  type: CognitiveActionType;
  payload: any;
  timestamp: number; // Deterministic virtual time
  sequenceIndex: number;
}

/**
 * 2. PARALLEL MATRIX EXTENSION PATTERNS
 * Allows the engine to track multiple cognitive streams.
 */
export interface CognitiveTrack {
  id: string;
  type: 'arithmetic' | 'memory' | 'interference' | 'rhythm';
  load: number;
  active: boolean;
  state: Record<string, any>;
}

export interface ParallelMatrixState {
  tracks: Record<string, CognitiveTrack>;
  interferenceDensity: number;
  globalMomentum: number;
}

/**
 * 3. DETERMINISTIC REPLAY COMPATIBILITY RULES
 * - R1: No non-deterministic calls (Math.random, Date.now) in reducer.
 * - R2: All state must be serializable.
 * - R3: Randomness must use the provided SeededPRNG.
 * - R4: Temporal drift must be corrected via Tick Synchronization.
 */
export interface ReplayTape {
  seed: string;
  config: AppConfig;
  actions: CognitiveAction[];
  finalChecksum: string;
}

/**
 * 4. MULTI-MODULE COEXISTENCE STRATEGY
 * Defines the execution pipeline for a single "Cognitive Tick".
 */
export enum EnginePipelinePhase {
  SENSATION = 'SENSATION',     // Input processing
  PERCEPTION = 'PERCEPTION',   // Load & Fatigue analysis
  COGNITION = 'COGNITION',     // State mutation logic
  INTERVENTION = 'INTERVENTION', // Pedagogical adjustment
  PROJECTION = 'PROJECTION'    // Animation & UI triggers
}

/**
 * 5. ANIMATION CONTRACT BOUNDARIES
 * Animations are "Temporal Projections" of state.
 */
export interface AnimationTrigger {
  id: string;
  type: 'flash' | 'shake' | 'transition' | 'reveal';
  startTime: number;
  duration: number;
  params: Record<string, any>;
}
