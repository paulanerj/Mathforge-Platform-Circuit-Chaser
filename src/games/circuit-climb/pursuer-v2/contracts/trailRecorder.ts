/**
 * SIMULATION-OWNED PHYSICAL TRAIL — the source of truth a Brain later senses.
 *
 * Wraps `contracts/trail.ts`'s `TrailRecorder`, which already carries the one
 * invariant that matters (knowledge stops at the learner's present physical
 * position, never one unit beyond it). What this file adds is retention shape:
 * LAB 03A asks for "approximately the most recent 6 learner row transitions,
 * including the currently-traversing partial path" — a bound about ROW
 * TRANSITIONS, not about elapsed time or a fixed point count, so the
 * underlying recorder is configured with generous point/segment/age bounds
 * (they must not bite first) and this module does the row-transition trim
 * itself, every time a snapshot is taken.
 *
 * This is still Simulation-side. A Brain never touches a `GroundTruthTrail`
 * directly — it only ever sees what `brain/sensors.ts` has spatially clipped
 * out of a snapshot taken here.
 */
import { TrailRecorder, type PlayerTrail, type TrailBounds, type TrailSegment, type TrailPoint } from '../contracts/trail';

/** Row transitions to retain, including the one currently underway. */
export const DEFAULT_ROW_RETENTION = 6;

/**
 * Bounds for the UNDERLYING recorder: large enough that point/segment/age
 * pruning never fires before the row-transition trim gets a chance to run.
 * A real session can spend well over 20s per row transition, so the
 * recorder's own defaults (tuned for a live-prefix presentation trail) are
 * far too tight for a 6-row-transition retention target.
 */
const GENEROUS_BOUNDS: TrailBounds = {
  maxPoints: 200_000,
  maxSegments: 20_000,
  maxAgeMs: 24 * 60 * 60 * 1000,
  sampleDistance: 6,
};

export class GroundTruthTrail {
  private recorder: TrailRecorder;
  private rowRetention: number;

  constructor(
    start: { x: number; y: number },
    tMs: number,
    rowGap: number,
    rowRetention: number = DEFAULT_ROW_RETENTION,
  ) {
    this.recorder = new TrailRecorder(start, tMs, rowGap, GENEROUS_BOUNDS);
    this.rowRetention = rowRetention;
  }

  /** The ONLY way in — a position and a clock, exactly as `TrailRecorder.observe`. */
  observe(position: { x: number; y: number }, tMs: number) {
    this.recorder.observe(position, tMs);
  }

  /**
   * A frozen view, trimmed to the row-transition retention bound.
   *
   * Walks backward from the newest segment counting `rowTransition` segments;
   * once `rowRetention` of them have been counted, every segment from that
   * point on is kept (row-transition or not — a horizontal leg between two
   * kept climbs is part of the retained trail too), and points are trimmed to
   * match. The open segment underway is always included regardless of its own
   * direction, since it is the "currently-traversing partial path" the brief
   * requires.
   */
  snapshot(nowMs: number): PlayerTrail {
    const full = this.recorder.snapshot(nowMs);
    if (full.segments.length === 0) return full;

    let rowTransitionsSeen = 0;
    let keepFrom = 0;
    for (let i = full.segments.length - 1; i >= 0; i -= 1) {
      if (full.segments[i].rowTransition) {
        rowTransitionsSeen += 1;
        if (rowTransitionsSeen > this.rowRetention) break;
      }
      keepFrom = i;
    }

    const segments: TrailSegment[] = full.segments.slice(keepFrom);
    const horizon = segments[0].tStartMs;
    const points: TrailPoint[] = full.points.filter((p) => p.tMs >= horizon);
    // The head is the recorder's own present position; always retained even
    // if, degenerately, no point survived the horizon filter (a run with no
    // motion yet).
    if (points.length === 0) points.push(full.head);

    return Object.freeze({
      points: Object.freeze(points),
      segments: Object.freeze(segments),
      totalDistance: full.totalDistance,
      oldestAgeMs: nowMs - points[0].tMs,
      head: full.head,
    }) as PlayerTrail;
  }
}
