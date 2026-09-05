/**
 * SENSOR GEOMETRY — the clipping arithmetic every perception model shares.
 *
 * EXTRACTED from production `pursuer-v2/brain/sensors.ts` at commit d7a8115.
 * ADAPTED: production's single hard-coded sensing policy is split from the
 * geometry that implements it. The circle-clipping of a physical trail, the
 * derived trail radius and the direct-contact sampling all live here and are
 * unchanged; WHICH radius, WHETHER a lock is retained, and WHETHER line of
 * sight matters are now decisions of a selectable perception model.
 *
 * ── the original production note, kept because it still applies ──
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
import type { PlayerTrail, TrailPoint, TrailSegment } from '../graph/trail';
import type { TrailFragment } from '../contract/observation';

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
 * Deep freeze for the parts built fresh each tick. Deliberately does NOT
 * recurse into `graph`, which is owned and never mutated by the chassis.
 */
export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
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

/** How stale a previous sample may be and still yield a continuous velocity. */
export function continuityGapFor(dtMs: number): number {
  return Math.max(dtMs * 3, 50);
}
