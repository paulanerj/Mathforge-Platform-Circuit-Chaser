/**
 * GRAPH BRAIN V1 — the observation firewall's TYPES.
 *
 * `BrainObservation` is the entire interface between hidden simulation truth
 * and the Brain. Every field on it is something a non-omniscient pursuer could
 * legitimately know: its own position, the graph topology, a Spark sensed
 * within an authorized radius right now, trail evidence sensed within a local
 * radius right now, and a one-time run-start cue. There is no field for the
 * hidden learner's live coordinate, row, platform, correctness, planned
 * route, or future destination — not "these are not filled in", there is no
 * place to put them. `brain/sensors.ts` is the only code allowed to see both
 * sides of this boundary; `graphBrainV1.ts` sees only what is defined here.
 *
 * This file shares two kinds of neutral type from elsewhere in the lab, per
 * the phase brief's explicit allowance: `TrailDirection` from
 * `contracts/trail.ts` (physical-history vocabulary, not pursuer behaviour)
 * and `PursuitGraph`/`TrunkId` from `graph/pursuitGraph.ts` (board topology,
 * not a pursuer). Nothing here imports the Oracle Test Driver or any legacy
 * pursuer module.
 */
import type { TrailDirection } from '../contracts/trail';
import type { PursuitGraph, TrunkId } from '../graph/pursuitGraph';

export type BrainMode = 'VISIBLE_PURSUIT' | 'TRAIL_TRACK' | 'GRAPH_SEARCH';

export type TargetSource =
  | 'SENSED_SPARK'
  | 'SENSED_TRAIL'
  | 'REMEMBERED_TRAIL'
  | 'SEARCH_FRONTIER'
  | 'RUN_START_CUE'
  /**
   * A single-frame (or few-frame) direct-sensing dropout right at the
   * 260-unit boundary — the pursuer's own approach naturally crosses that
   * line back and forth for a few ticks — is being ridden out on the last
   * legitimately sensed sample, rather than treated as a confirmed loss.
   * No hidden truth is read to produce this; it is exactly `lastSighting`,
   * frozen, reused verbatim for up to `LOSS_CONFIRMATION_TICKS`.
   */
  | 'LAST_SIGHTING_GRACE';

/** The learner's one-time launch cue. Captured at t=0, never refreshed. */
export interface RunStartOrigin {
  x: number;
  y: number;
  row: number | null;
  tMs: number;
}

/**
 * A Spark sensed RIGHT NOW, within the authorized direct-perception radius.
 *
 * `vx`/`vy` are derived from consecutive AUTHORIZED samples only — this
 * tick's sensed position minus the previous tick's, when that previous
 * sample was itself inside the radius and recent. A sighting that just
 * began carries a zero vector rather than one computed from a hidden sample
 * taken before the Spark entered range.
 */
export interface SensedSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sightingTMs: number;
}

/**
 * A physically-traversed trail fragment, spatially clipped to what a sensor
 * centred on the pursuer can currently see.
 *
 * `id` is derived from the underlying trail segment's own start time, which
 * never changes for that segment's lifetime — so the same fragment keeps the
 * same id from the tick it is first sensed through every later tick that
 * re-senses (a growing) portion of it. That stability is what lets a Brain
 * recognise "I have smelled this trail before and it went this way" rather
 * than treating every tick's clip as a brand new, unrelated observation.
 */
export interface TrailFragment {
  id: string;
  /** Oldest first. Always the portion physically walked, never a destination. */
  points: ReadonlyArray<{ x: number; y: number; tMs: number }>;
  direction: TrailDirection;
  tStartMs: number;
  tEndMs: number;
  rowTransition: boolean;
  /** This tick's clock, at the moment this fragment was (re-)sensed. */
  observedAtMs: number;
}

/**
 * The ENTIRE interface between hidden truth and the Brain.
 *
 * Every field here is either: (a) the pursuer's own state, (b) static or
 * dynamic board topology, (c) something legitimately sensed right now within
 * an authorized radius, or (d) the one-time run-start cue. There is no field
 * for the hidden learner's live position, row, platform, correctness,
 * untraversed route, or future destination.
 */
export interface BrainObservation {
  nowMs: number;
  pursuerPosition: { x: number; y: number };
  pursuerNode: string;
  /** Whether the chassis reports having arrived at the Brain's last target. */
  pursuerArrivedAtIntent: boolean;
  graph: PursuitGraph;
  /** Non-null only while a Spark is within `SPARK_SENSE_RADIUS` right now. */
  sensedSpark: SensedSpark | null;
  /** Freshly (re-)computed this tick; spatially clipped around the pursuer. */
  sensedTrailFragments: readonly TrailFragment[];
  /** Captured once at t=0. The same object, every tick, until a restart. */
  runStartOrigin: RunStartOrigin;
}

export interface PursuitIntent {
  mode: BrainMode;
  targetPoint: { x: number; y: number };
  targetSource: TargetSource;
  /** Timestamp of the evidence driving this intent. */
  evidenceTMs: number;
  /** Age of the last direct sighting, or null if none has ever occurred. */
  lastDirectSightingAgeMs: number | null;
  trailFragmentId: string | null;
  trailFragmentAgeMs: number | null;
  searchTier: number | null;
  searchFrontierIndex: number | null;
}

export interface RememberedTrailFragment extends TrailFragment {
  firstDetectedAtMs: number;
  lastSensedAtMs: number;
}

export interface LastSighting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sightingTMs: number;
}

export interface SearchCursorState {
  /** The node the current search episode is anchored at. */
  anchorNodeId: string;
  /** Flat frontier position to resume scanning FROM on the next advance. */
  index: number;
  episodeStartMs: number;
  trunksVisited: readonly TrunkId[];
  levelsVisited: readonly number[];
  targetsIssued: number;
  lastTargetNode: string | null;
  /** The ring step and flat frontier position the last issued target came from. */
  lastTargetTier: number;
  lastFrontierIndex: number;
  consecutiveRepeats: number;
}

/**
 * What the Brain is currently COMMITTED to pursuing — LAB 03A-R2's central
 * addition, and the layer the 03A/03A-R1 Brain did not have.
 *
 * Perception truth may flutter frame to frame; a strategic commitment may
 * not. A commitment ends only at a named DECISION BOUNDARY (see
 * `CommitmentEndReason`), never because a sensor bit toggled.
 */
export interface StrategicCommitment {
  mode: BrainMode;
  targetPoint: { x: number; y: number };
  targetSource: TargetSource;
  /**
   * What evidence this commitment answers: a trail fragment id, the literal
   * 'SPARK' for direct pursuit, or a search frontier node id. Used to tell
   * "the same lead, still being pursued" from "a genuinely different lead".
   */
  evidenceKey: string;
  committedAtMs: number;
  committedTick: number;
}

/** Why a commitment ended this tick. Null while one is simply being held. */
export type CommitmentEndReason =
  | 'DIRECT_LOSS_CONFIRMED'
  | 'STABLE_DIRECT_REACQUISITION'
  | 'TRAIL_LEAD_CONSUMED'
  | 'NEWER_TRAIL_LEAD'
  | 'SEARCH_TARGET_REACHED'
  | 'TARGET_INVALIDATED';

export interface BrainState {
  mode: BrainMode;
  lastSighting: LastSighting | null;
  rememberedFragments: readonly RememberedTrailFragment[];
  /**
   * Per-fragment watermark: the tEndMs already targeted-and-investigated.
   * MONOTONIC — never lowered, so an investigated lead cannot be resurrected
   * by a smaller clipped extent seen from a different position.
   */
  consumedUntilMsByFragment: Readonly<Record<string, number>>;
  search: SearchCursorState | null;
  /** The strategic intent currently held. Null only before the first decision. */
  commitment: StrategicCommitment | null;
  /** Consecutive ticks the raw direct sensor has read true / false. */
  sensedRunTicks: number;
  unsensedRunTicks: number;
  /**
   * Consecutive ticks the CURRENTLY COMMITTED trail lead has offered nothing
   * actionable. The trail-side twin of `unsensedRunTicks`: a lead is declared
   * exhausted only after this run confirms it, never on a single frame.
   */
  trailExhaustionTicks: number;
  /**
   * Consecutive ticks the SAME candidate trail fragment has looked
   * actionable. The trail-side twin of `sensedRunTicks`: a lead may PREEMPT
   * a commitment already in flight only after this run confirms it.
   */
  actionableLeadId: string | null;
  actionableLeadRunTicks: number;
  /**
   * Consecutive ticks since direct sensing was last actually true, counted
   * only while riding out a loss-confirmation grace from VISIBLE_PURSUIT.
   * Zero whenever a Spark is currently sensed, or once loss is confirmed and
   * the Brain has moved on to TRAIL_TRACK/GRAPH_SEARCH.
   */
  directLossGraceTicks: number;
  /** Bookkeeping for the stale-lock health metric: the last issued target point, and how long it has repeated. */
  lastIssuedTargetKey: string | null;
  consecutiveIdenticalTargetTicks: number;
  ticks: number;
}

export interface BrainEvidence {
  mode: BrainMode;
  sensedSparkNow: boolean;
  sensedFragmentCount: number;
  rememberedFragmentCount: number;
  searchTrunksVisited: readonly TrunkId[];
  searchLevelsVisited: readonly number[];
  searchTargetsIssued: number;
  searchConsecutiveRepeats: number;
  /** Structurally always 0 — see brain/sensors.ts's firewall boundary. */
  hiddenStateFirewallViolations: 0;
  /** Structurally always 0 — the Brain never receives a future route. */
  futureRouteLeakCount: 0;
  /** True while riding out a direct-sensing dropout on the frozen last sighting. */
  sensingGraceActive: boolean;
  /** Consecutive ticks the committed trail lead has looked exhausted, pending confirmation. */
  trailExhaustionTicks: number;
  /** Consecutive ticks the best candidate lead has looked actionable, pending confirmation. */
  actionableLeadRunTicks: number;
  /** Whether this tick just marked a trail lead exhausted (chassis reported arrival, nothing newer sensed). */
  trailLeadConsumedThisTick: boolean;
  /** How many consecutive prior ticks issued the exact same target point — a stale-lock symptom if it grows without bound. */
  consecutiveIdenticalTargetTicks: number;
  // --- LAB 03A-R2 strategic-commitment telemetry -------------------------
  /** RAW perception this tick. Allowed to flutter; never conflated with the strategic mode. */
  rawSensedNow: boolean;
  /** True while a commitment made on an earlier tick is being held unchanged. */
  commitmentHeld: boolean;
  /** How long the current commitment has been held, in ms. */
  commitmentAgeMs: number;
  /** Named decision boundary that ended a commitment this tick, or null. */
  commitmentEndReason: CommitmentEndReason | null;
  /** True on ticks the strategic mode actually changed — the number that must stay small. */
  strategicModeChanged: boolean;
}

export interface BrainUpdateResult {
  state: BrainState;
  intent: PursuitIntent;
  evidence: BrainEvidence;
}
