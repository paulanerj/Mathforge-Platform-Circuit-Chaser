/**
 * THE OBSERVATION CONTRACT — everything a Brain is allowed to know.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IF YOU ARE AN EXTERNAL MODEL WRITING A NEW BRAIN, READ THIS FIRST.
 *
 * A Brain receives a `PursuerObservation` and returns a `PursuerDecision`.
 * That is the whole interface. You cannot reach the learner, the board
 * generator, the renderer or the simulation from inside a Brain, because
 * nothing in this type gives you a handle on any of them.
 *
 * What you get:
 *   - the clock, and this tick's step
 *   - your own body's state
 *   - whatever the SELECTED PERCEPTION MODEL decided you may perceive
 *   - the pursuit graph: the board's topology, which is not secret
 *   - the one-time run-start cue
 *
 * What you do NOT get, under every perception model except the oracle:
 *   the learner's live position, its row, its platform, whether its pending
 *   answer is right, the route it is about to walk, its destination, or how
 *   far away it is. Not "these are unset" — there is nowhere to put them.
 *
 * The single exception is `oracle`, which is populated ONLY by the P3 ORACLE
 * perception model. A Brain that reads it is permanently non-production
 * eligible, and the lab marks any run using it. See PERCEPTION_CONTRACT.md.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { TrailDirection } from '../graph/trail';
import type { PursuitGraph } from '../graph/pursuitGraph';

/** The learner's one-time launch cue. Captured at t=0, never refreshed. */
export interface RunStartOrigin {
  x: number;
  y: number;
  row: number | null;
  tMs: number;
}

/**
 * The learner, perceived directly RIGHT NOW.
 *
 * `vx`/`vy` are derived from consecutive AUTHORIZED samples only — this
 * tick's perceived position minus the previous tick's, when that previous
 * sample was itself legitimate and recent. A contact that has just begun
 * carries a zero vector rather than one computed from a sample taken before
 * the learner became perceivable.
 *
 * `ageMs` is 0 for a live contact. A perception model that RETAINS a lock
 * through a brief occlusion (P1) reports the age of the sample it is
 * retaining, so a Brain can tell a live sighting from a held one and is never
 * misled into thinking stale information is fresh.
 */
export interface DirectContact {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** When this position was actually true. */
  sightingTMs: number;
  /** How old that is, this tick. Zero for a live contact. */
  ageMs: number;
  /** False when a perception model is holding a lock through an occlusion. */
  live: boolean;
}

/**
 * A physically-traversed trail fragment, clipped to what the pursuer can
 * currently sense of it.
 *
 * `id` is derived from the underlying segment's own start time and never
 * changes, so the same fragment keeps its identity from the tick it is first
 * sensed through every later tick that re-senses a growing portion of it.
 * That stability is what lets a Brain recognise "I have followed this before"
 * rather than treating each tick's clip as a new, unrelated observation.
 *
 * A trail is HISTORY. It never extends past where the learner physically is.
 */
export interface TrailFragment {
  id: string;
  /** Oldest first. Always ground physically walked, never a destination. */
  points: ReadonlyArray<{ x: number; y: number; tMs: number }>;
  direction: TrailDirection;
  tStartMs: number;
  tEndMs: number;
  rowTransition: boolean;
  /** This tick's clock, at the moment the fragment was (re-)sensed. */
  observedAtMs: number;
}

/** What the selected perception model decided the pursuer may know. */
export interface PerceptionSnapshot {
  /** Which model produced this. Recorded in every run's evidence. */
  modelId: PerceptionModelId;
  /**
   * True ONLY for the oracle. A Brain may read it and refuse to run; the lab
   * reads it to mark the run non-production-eligible.
   */
  oracleTruth: boolean;
  /** Non-null while the learner is perceivable under this model's rules. */
  directContact: DirectContact | null;
  /** Freshly clipped this tick, around the pursuer. */
  trailFragments: readonly TrailFragment[];
  /** The radius this model used for direct perception, for the overlay. */
  directRadius: number;
  /** The radius this model used for trail sensing, for the overlay. */
  trailRadius: number;
}

export type PerceptionModelId =
  | 'P0_PRODUCTION'
  | 'P1_STABLE_LOCK'
  | 'P2_LINE_OF_SIGHT'
  | 'P3_ORACLE';

/** The pursuer's own body, which it is naturally allowed to know about. */
export interface SelfState {
  x: number;
  y: number;
  radius: number;
  /** Nearest graph node. */
  node: string;
  /** The leg being travelled as `from->to`, or null when idle. */
  edge: string | null;
  /** Whether the chassis reports arriving at the last commanded target. */
  arrivedAtTarget: boolean;
  /** Nodes of the route currently being followed. */
  routeNodes: readonly string[];
  /** MOVING or HESITATING. */
  cadencePhase: 'MOVING' | 'HESITATING';
  /** Units travelled last tick. */
  lastStepDistance: number;
}

/** THE ENTIRE INTERFACE between hidden simulation truth and a Brain. */
export interface PursuerObservation {
  /** Simulation clock, in milliseconds. Never a wall clock. */
  nowMs: number;
  /** This tick's step, in milliseconds. FIXED in the lab's default timebase. */
  dtMs: number;
  /** Tick index since the run started. */
  tick: number;
  self: SelfState;
  perception: PerceptionSnapshot;
  /** Board topology. Not secret: a pursuer can see the platforms. */
  graph: PursuitGraph;
  runStartOrigin: RunStartOrigin;
  /**
   * TRUE LEARNER POSITION. Present ONLY under P3_ORACLE.
   *
   * Reading this makes a Brain a cheating diagnostic reference and NOT a
   * production candidate, permanently. It exists to answer one question: if
   * the same graph and locomotion still look stupid when the pursuer always
   * knows exactly where the learner is, perception is not the problem.
   */
  oracle?: { x: number; y: number; row: number };
}
