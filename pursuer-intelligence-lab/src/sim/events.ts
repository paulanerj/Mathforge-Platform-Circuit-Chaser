/**
 * THE EVENT TIMELINE.
 *
 * The pursuit log this lab replaces recorded 3,604 frames, retained 1,200 of
 * them, and had `pursuer: null` in every retained sample — the bot appeared
 * exactly once, in the terminal CAPTURE event. Nothing about the human's
 * complaint could be diagnosed from it.
 *
 * So: every event carries the time in three forms a person actually needs
 * (simulation ms, tick index, and the wall-clock equivalent at the run's own
 * step), a reason, and the ids involved.
 */

export type LabEventKind =
  | 'RUN_STARTED'
  | 'PLAYER_ROUTE_STARTED'
  | 'PLAYER_ROUTE_COMPLETED'
  | 'PLAYER_SELECTION_REFUSED'
  | 'DIRECT_PERCEPTION_ACQUIRED'
  | 'DIRECT_PERCEPTION_LOST'
  | 'TRAIL_EVIDENCE_ACQUIRED'
  | 'TRAIL_EVIDENCE_CONSUMED'
  | 'BELIEF_CHANGED'
  | 'MODE_CHANGED'
  | 'COMMITMENT_STARTED'
  | 'COMMITMENT_ENDED'
  | 'STRATEGIC_TARGET_CHANGED'
  | 'NAVIGATION_ROUTE_CHANGED'
  | 'TRUE_DIRECTION_REVERSAL'
  | 'EXPECTED_ROUTE_DETOUR'
  | 'CADENCE_PAUSE_STARTED'
  | 'CADENCE_PAUSE_ENDED'
  | 'NEAR_CONTACT'
  | 'CAPTURE_RANGE_ENTERED'
  | 'CAPTURE_RANGE_EXITED'
  | 'CAPTURE';

export interface LabEvent {
  kind: LabEventKind;
  /** Simulation clock. The only clock any decision ever saw. */
  tMs: number;
  /** Simulation tick index. */
  tick: number;
  /** The same moment in wall-clock seconds, for talking to a human about it. */
  wallSeconds: number;
  reason: string;
  /** Ids involved: a fragment, a node, a commitment, a route. */
  ids?: Record<string, string | number | null>;
}
