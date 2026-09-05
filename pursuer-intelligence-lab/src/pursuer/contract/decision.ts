/**
 * THE DECISION CONTRACT — everything a Brain says.
 *
 * A Brain decides WHAT TO INVESTIGATE. It does not decide how to get there
 * and it does not move the body: navigation and locomotion are separate,
 * shared layers, so two Brains compared in this lab differ in judgement and
 * not in driving ability. That separation is the point — the human complaint
 * ("it bumps around with its eyes closed") could be a thinking failure or a
 * driving failure, and tangling the two is how the previous architecture made
 * that question unanswerable.
 */

/** The canonical strategic postures. A Brain may report its own beyond these. */
export type CanonicalMode = 'DIRECT_PURSUIT' | 'EVIDENCE_TRACK' | 'SEARCH' | 'IDLE';

/**
 * Where the Brain wants the body to go.
 *
 * `NODE` is the honest form for a graph pursuer: navigation is graph-legal,
 * so naming a node says exactly what will happen. `POINT` is accepted and
 * projected onto the graph by the navigator. `REGION` says "somewhere around
 * here, radius r" and lets a belief-based Brain express uncertainty without
 * pretending to a precision it does not have.
 */
export type DecisionTarget =
  | { kind: 'NODE'; node: string }
  | { kind: 'POINT'; point: { x: number; y: number } }
  | { kind: 'REGION'; point: { x: number; y: number }; radius: number };

/**
 * A short, stable, machine-readable statement of WHY.
 *
 * The canonical codes below cover the behaviours the lab measures. A Brain may
 * emit its own codes; the overlay renders whatever it is given, and unknown
 * codes are displayed verbatim rather than dropped.
 */
export type CanonicalReasonCode =
  | 'DIRECT_TARGET_VISIBLE'
  | 'DIRECT_TARGET_HELD'
  | 'NEWER_TRAIL_SUPERSEDES_SIGHTING'
  | 'DIRECT_LOCK_LOST'
  | 'FOLLOW_NEWEST_TRAIL'
  | 'SEARCH_LAST_SIGHTING'
  | 'SEARCH_FRONTIER_ADVANCE'
  | 'TARGET_REACHED'
  | 'EVIDENCE_EXHAUSTED'
  | 'REPLAN_ROUTE'
  | 'REACQUIRED'
  | 'CAPTURE_APPROACH'
  | 'RUN_START_CUE'
  | 'HOLDING_COMMITMENT';

export interface PursuerDecision {
  /** The strategic posture, for comparison across Brains. */
  mode: CanonicalMode;
  /** The Brain's own name for its posture, if it has a finer vocabulary. */
  modeLabel?: string;
  target: DecisionTarget;
  /**
   * How sure the Brain is that pursuing this target will find the learner.
   * 0..1. Not a probability the lab checks — a self-report the overlay shows
   * and the metrics correlate against outcomes.
   */
  confidence: number;
  reasonCode: CanonicalReasonCode | string;
  /**
   * Stable while one strategic intent is in flight, changing when the Brain
   * genuinely changes its mind. The lab counts commitment changes; a Brain
   * that bumps this every tick will look exactly as indecisive as it is.
   */
  commitmentId: string;
  /** One sentence, for the human reading the overlay. */
  explanation: string;
}

/** Optional Brain introspection, drawn by the fog-of-war overlay. */
export interface BrainInspection {
  /**
   * Where the Brain currently believes the learner may be, as graph node ids
   * with a weight each. A Brain with no belief model may return an empty list.
   */
  belief: ReadonlyArray<{ node: string; weight: number }>;
  /** Evidence the Brain is holding on to, in its own words. */
  evidence: ReadonlyArray<{ label: string; ageMs: number; consumed: boolean }>;
  /** Anything else worth showing, as short lines. */
  notes: readonly string[];
}
