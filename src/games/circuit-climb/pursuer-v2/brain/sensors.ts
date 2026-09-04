/**
 * THE FIREWALL BOUNDARY.
 *
 * `buildBrainObservation` is the only function in this lab allowed to hold
 * the hidden learner's true position and the Simulation's full physical
 * trail in its hands at the same time as it builds what the Brain is allowed
 * to see. Everything it returns is deep-frozen and shaped exactly like
 * `BrainObservation` — there is no back door, because there is no other
 * field on the returned object to smuggle one through.
 *
 * Two derivations live here rather than being imported, on purpose:
 *
 *   - `halfSmallestTrunkSpacing` reproduces the geometry
 *     `sandbox/oracleTestDriver.ts`'s `transitMarginFor` already computes,
 *     but independently — the Brain must not import Oracle Test Driver code
 *     for ANY reason, even a neutral geometric fact it happens to share.
 *   - `SPARK_SENSE_RADIUS` and the trail-sense radius derivation are this
 *     lab's own authorized values, not the legacy engine's sensor model.
 */
import type { PursuitGraph } from '../graph/pursuitGraph';
import type { PlayerTrail, TrailPoint, TrailSegment } from '../contracts/trail';
import type {
  BrainObservation, SensedSpark, TrailFragment, RunStartOrigin, LastSighting,
} from './observation';

/**
 * Electrical-proximity direct-perception radius. LAB 03A's own value, and the
 * default whenever a caller does not name one.
 *
 * Since 04C it is also `perception.directSenseRadius` in the pursuer
 * configuration contract, which is why `buildBrainObservation` now takes a
 * radius rather than only reading this. The constant remains the authority
 * baseline value and the default, so a caller that names nothing gets exactly
 * the accepted behaviour.
 */
export const SPARK_SENSE_RADIUS = 260;

/** Half the smallest gap between adjacent trunk centrelines. */
function halfSmallestTrunkSpacing(graph: PursuitGraph): number {
  if (graph.trunks.length < 2) return 0;
  let smallest = Infinity;
  for (let i = 0; i < graph.trunks.length - 1; i += 1) {
    smallest = Math.min(smallest, graph.trunks[i + 1].x - graph.trunks[i].x);
  }
  return smallest / 2;
}

/**
 * Local trail-sensing radius: half the smallest trunk spacing plus the
 * graph actor's own radius. Derived from the LIVE graph every call — never
 * hard-coded, so a differently-framed board gets its own correct radius.
 */
export function deriveTrailSenseRadius(graph: PursuitGraph): number {
  return halfSmallestTrunkSpacing(graph) + graph.actorRadius;
}

function isInside(p: { x: number; y: number }, center: { x: number; y: number }, r: number) {
  return Math.hypot(p.x - center.x, p.y - center.y) <= r + 1e-9;
}

/** Where a straight segment a->b crosses the circle, as a point with interpolated tMs. */
function crossingPoint(a: TrailPoint, b: TrailPoint, center: { x: number; y: number }, r: number, t: number): TrailPoint {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * clamped,
    y: a.y + (b.y - a.y) * clamped,
    tMs: a.tMs + (b.tMs - a.tMs) * clamped,
    row: null,
  };
}

/** Real roots of |a + t(b-a) - center| = r, in ascending order, or null if none. */
function circleRoots(a: TrailPoint, b: TrailPoint, center: { x: number; y: number }, r: number): [number, number] | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const fx = a.x - center.x, fy = a.y - center.y;
  const A = dx * dx + dy * dy;
  if (A < 1e-12) return null;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (-B - sq) / (2 * A);
  const t2 = (-B + sq) / (2 * A);
  return t1 <= t2 ? [t1, t2] : [t2, t1];
}

/**
 * The single contiguous portion of a polyline inside the sensor circle, or
 * null if none of it is. Every segment in this lab's trail is one straight,
 * axis-aligned run, so a circle can only ever clip it in one place — this
 * does not need to handle multiple disjoint runs within one segment.
 */
function clipPolylineToCircle(points: readonly TrailPoint[], center: { x: number; y: number }, r: number): TrailPoint[] | null {
  const inside: TrailPoint[] = [];
  let entered = false;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const pIn = isInside(p, center, r);
    if (i > 0) {
      const prev = points[i - 1];
      const prevIn = isInside(prev, center, r);
      if (prevIn !== pIn) {
        const roots = circleRoots(prev, p, center, r);
        // Inside the circle is the t-RANGE between the two roots (not outside
        // it) for a line that crosses the circle at all. So leaving the
        // circle (prevIn -> !pIn) exits at the LARGER root, and entering
        // (!prevIn -> pIn) enters at the SMALLER one.
        if (roots) {
          const t = prevIn ? roots[1] : roots[0];
          if (Number.isFinite(t)) inside.push(crossingPoint(prev, p, center, r, t));
        }
      } else if (!prevIn && !pIn) {
        // Both endpoints outside: a chord could still pass through the
        // circle. Only possible for a long single-edge polyline, but the
        // fine sampling elsewhere in this file means this is a defensive
        // branch, not the common case.
        const roots = circleRoots(prev, p, center, r);
        if (roots && roots[0] >= -1e-9 && roots[1] <= 1 + 1e-9 && roots[0] < roots[1]) {
          inside.push(crossingPoint(prev, p, center, r, roots[0]));
          inside.push(crossingPoint(prev, p, center, r, roots[1]));
        }
      }
    }
    if (pIn) { inside.push(p); entered = true; }
  }
  if (!entered || inside.length < 1) return null;
  return inside;
}

/** The physical points belonging to one segment: its own endpoints plus any interior samples. */
function polylineForSegment(trail: PlayerTrail, segment: TrailSegment): TrailPoint[] {
  const mid = trail.points.filter((p) => p.tMs > segment.tStartMs && p.tMs < segment.tEndMs);
  return [segment.from, ...mid, segment.head];
}

/**
 * Spatially clip the Simulation's physical trail to what a sensor centred on
 * the pursuer can see right now.
 *
 * Per segment, never per whole-trail: a segment whose FAR endpoint happens to
 * sit near the pursuer must not reveal the near endpoint just because the two
 * are connected — only points geometrically inside the circle survive.
 */
export function senseTrail(trail: PlayerTrail, pursuerPosition: { x: number; y: number }, radius: number, nowMs: number): TrailFragment[] {
  const fragments: TrailFragment[] = [];
  for (const segment of trail.segments) {
    const polyline = polylineForSegment(trail, segment);
    const clipped = clipPolylineToCircle(polyline, pursuerPosition, radius);
    if (!clipped || clipped.length < 1) continue;
    fragments.push({
      id: `seg:${segment.tStartMs}`,
      points: Object.freeze(clipped.map((p) => Object.freeze({ x: p.x, y: p.y, tMs: p.tMs }))),
      direction: segment.direction,
      tStartMs: clipped[0].tMs,
      tEndMs: clipped[clipped.length - 1].tMs,
      rowTransition: segment.rowTransition,
      observedAtMs: nowMs,
    });
  }
  return fragments;
}

/**
 * Build the sensed Spark this tick, if the hidden truth falls within radius.
 *
 * `previousSensed` is last tick's SENSED value — already an authorized
 * quantity, not hidden truth — so deriving velocity from the delta between
 * it and this tick's sensed value never touches anything the Brain could not
 * already see. A sighting that just began (no recent previous sample) gets a
 * zero vector rather than a velocity computed across a gap that may include
 * time the Spark was unsensed.
 */
function senseSpark(
  pursuerPosition: { x: number; y: number },
  hiddenLearnerPosition: { x: number; y: number },
  nowMs: number,
  previousSensed: SensedSpark | null,
  maxContinuityGapMs: number,
  senseRadius: number,
): SensedSpark | null {
  const distance = Math.hypot(hiddenLearnerPosition.x - pursuerPosition.x, hiddenLearnerPosition.y - pursuerPosition.y);
  if (distance > senseRadius) return null;

  const dtMs = previousSensed ? nowMs - previousSensed.sightingTMs : Infinity;
  const continuous = previousSensed !== null && dtMs > 0 && dtMs <= maxContinuityGapMs;
  const vx = continuous ? (hiddenLearnerPosition.x - previousSensed!.x) / dtMs : 0;
  const vy = continuous ? (hiddenLearnerPosition.y - previousSensed!.y) / dtMs : 0;
  return { x: hiddenLearnerPosition.x, y: hiddenLearnerPosition.y, vx, vy, sightingTMs: nowMs };
}

/**
 * WeakSet-based deep freeze for the parts of an observation that are freshly
 * built each tick (sensed spark, sensed trail fragments, the pursuer's own
 * position). Deliberately does NOT recurse into `graph`: that object is
 * owned and never mutated by the chassis, shared by reference for every
 * tick it is unchanged, and walking its whole topology sixty times a second
 * to freeze objects that are already effectively immutable buys nothing.
 */
function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  if (!Object.isFrozen(value)) Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    const child = (value as any)[key];
    if (child && typeof child === 'object') deepFreeze(child, seen);
  }
  return value;
}

export interface BuildObservationInput {
  nowMs: number;
  dtMs: number;
  pursuerPosition: { x: number; y: number };
  pursuerNode: string;
  pursuerArrivedAtIntent: boolean;
  graph: PursuitGraph;
  /** SIMULATION-ONLY. Never returned, never closed over past this call. */
  hiddenLearnerPosition: { x: number; y: number };
  /** SIMULATION-ONLY, full retention. Clipped down before it reaches the observation. */
  groundTruthTrail: PlayerTrail;
  previousSensedSpark: SensedSpark | null;
  runStartOrigin: RunStartOrigin;
  /**
   * Direct-perception radius for this run, from the resolved configuration.
   * Omitted means `SPARK_SENSE_RADIUS` — the authority baseline value.
   */
  directSenseRadius?: number;
}

/**
 * THE firewall gate. Everything downstream of this function's return value
 * is the Brain's whole world — nothing else is passed to `updateBrain`.
 */
export function buildBrainObservation(input: BuildObservationInput): BrainObservation {
  const trailRadius = deriveTrailSenseRadius(input.graph);
  // A direct sighting is continuous across one frame's dt, with slack for a
  // slower or catch-up frame; a genuine gap (the Spark left and came back)
  // exceeds this easily and correctly resets the velocity derivation.
  const maxContinuityGapMs = Math.max(input.dtMs * 3, 50);

  const sensedSpark = senseSpark(
    input.pursuerPosition, input.hiddenLearnerPosition, input.nowMs,
    input.previousSensedSpark, maxContinuityGapMs,
    input.directSenseRadius ?? SPARK_SENSE_RADIUS,
  );
  const sensedTrailFragments = senseTrail(input.groundTruthTrail, input.pursuerPosition, trailRadius, input.nowMs);

  // Freeze the freshly built, observation-only pieces deeply — they are new
  // objects every tick and small. `graph` and `runStartOrigin` are shared,
  // already-immutable-by-convention references and are left alone; the
  // top-level observation itself is frozen shallowly right after, which is
  // enough to stop a Brain from replacing one field with another.
  if (sensedSpark) deepFreeze(sensedSpark);
  deepFreeze(sensedTrailFragments);

  const observation: BrainObservation = {
    nowMs: input.nowMs,
    pursuerPosition: Object.freeze({ x: input.pursuerPosition.x, y: input.pursuerPosition.y }),
    pursuerNode: input.pursuerNode,
    pursuerArrivedAtIntent: input.pursuerArrivedAtIntent,
    graph: input.graph,
    sensedSpark,
    sensedTrailFragments,
    runStartOrigin: input.runStartOrigin,
  };
  return Object.freeze(observation);
}

export type { LastSighting };
