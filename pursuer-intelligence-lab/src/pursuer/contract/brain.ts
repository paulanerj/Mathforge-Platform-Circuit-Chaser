/**
 * THE BRAIN CONTRACT.
 *
 * Implement this and register it, and the whole lab — rendering, learner
 * modes, replay, overlays, metrics, fixtures, A/B comparison — works with your
 * Brain without another line of change. That is the entire purpose of this
 * sandbox.
 *
 * A Brain must be:
 *
 *   DETERMINISTIC. Given the same observations it must produce the same
 *   decisions. Use the supplied clock, never `Date.now()`; if you need
 *   randomness, seed it from your configuration. A non-deterministic Brain
 *   cannot be compared against another Brain on the same learner run, which is
 *   the only fair comparison this lab offers.
 *
 *   STATELESS ACROSS RUNS. `reset()` must return you to exactly your starting
 *   condition. State that survives a restart is the classic source of "it
 *   behaved differently the second time and nobody knows why".
 *
 *   HONEST ABOUT INFORMATION. Read only what is on the observation. Do not
 *   import the simulation, the learner, or the board generator. The lab has a
 *   test that walks your module's real imports and fails you if you do.
 */

import type { PursuerObservation } from './observation';
import type { PursuerDecision, BrainInspection } from './decision';

/** A single tunable parameter a Brain exposes. */
export interface BrainParameter {
  /** Dot path inside the Brain's config object, e.g. `search.breadth`. */
  path: string;
  label: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
  unit?: string;
  /** Why the bound is where it is. Shown on hover in the tuning panel. */
  reason: string;
}

export interface BrainInstance {
  decide(observation: PursuerObservation): PursuerDecision;
  reset(): void;
  /** Optional. Drawn by the SHOW WHAT THE BOT KNOWS overlay. */
  inspect?(): BrainInspection;
}

export interface PursuerBrainDefinition<Config = any> {
  /** Stable id. Appears in every configuration, run record and report. */
  id: string;
  label: string;
  description: string;
  /**
   * The perception models this Brain is willing to run under. A Brain that
   * declares `P3_ORACLE` here is declaring itself a diagnostic reference.
   */
  supportedPerception: readonly string[];
  /** The starting configuration. Cloned per run; never mutated in place. */
  defaultConfig: Config;
  /** The parameters the tuning panel may offer. Only ones you actually read. */
  parameters: readonly BrainParameter[];
  /**
   * True when this Brain can never be promoted to production, whatever it
   * scores — the oracle reference is the example.
   */
  productionEligible: boolean;
  create(config: Config): BrainInstance;
}
