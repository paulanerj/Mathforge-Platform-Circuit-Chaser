/**
 * The semantic player trail — PHYSICAL HISTORY ONLY.
 *
 * One invariant governs this whole file, and it is temporal rather than
 * structural: knowledge may extend up to the learner's PRESENT physical
 * position and never one unit beyond it. That is stricter than "complete
 * vertices only" (a Brain may legitimately see the part of a leg the Spark has
 * already walked) and far stricter than the route object the runtime holds
 * (which knows the whole answer in advance and must never be handed over).
 *
 * The representation therefore stores what happened, timestamped, and the
 * partial prefix of the leg currently underway. It has no field that could
 * carry the remainder, so leaking the future is not a discipline problem here —
 * there is nowhere to put it.
 */

export type TrailDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** Diagnostic annotation. Physical evidence first; this is commentary on it. */
export type TrailAnnotation = 'CORRECT' | 'WRONG' | 'RETURN' | 'UNKNOWN';

export interface TrailPoint {
  x: number;
  y: number;
  /** Simulation clock at the moment the learner was physically here. */
  tMs: number;
  /** Row index this height corresponds to, or null off-lattice. */
  row: number | null;
}

export interface TrailSegment {
  from: TrailPoint;
  /**
   * The learner's position now, for the leg underway — NOT the leg's
   * destination. For a closed segment this is where the leg actually ended.
   */
  head: TrailPoint;
  /** True once the learner has left this leg behind. */
  closed: boolean;
  direction: TrailDirection;
  /** Units physically covered on this leg so far. Never the leg's full length. */
  traversedLength: number;
  tStartMs: number;
  tEndMs: number;
  /** Whether this leg carried the learner between platform rows. */
  rowTransition: boolean;
  /**
   * Diagnostic only. Derived from observed reversal — a leg re-walked backwards
   * marks the outgoing leg WRONG and the incoming one RETURN — never from the
   * runtime's knowledge of which platform holds the right answer.
   */
  annotation: TrailAnnotation;
  /** Route-space distance from the trail's origin to this leg's start. */
  cumulativeDistance: number;
}

export interface PlayerTrail {
  /** Oldest first. Bounded. */
  points: readonly TrailPoint[];
  /** Oldest first. The last entry is open while the learner is moving. */
  segments: readonly TrailSegment[];
  /** Total route-space distance physically covered, in units. */
  totalDistance: number;
  /** Age of the oldest retained point, in ms. */
  oldestAgeMs: number;
  /**
   * The learner's present physical position — the temporal horizon itself.
   * A Brain reading the trail may reason up to here and no further.
   */
  head: TrailPoint;
}

/** How much history the trail keeps. Whichever bound bites first wins. */
export interface TrailBounds {
  maxPoints: number;
  maxSegments: number;
  maxAgeMs: number;
  /** Minimum physical travel before the open leg's head is re-sampled. */
  sampleDistance: number;
}

export const DEFAULT_TRAIL_BOUNDS: TrailBounds = {
  maxPoints: 96,
  maxSegments: 64,
  maxAgeMs: 20_000,
  // Continuous enough to be a live prefix, coarse enough that a 60fps run does
  // not spend the whole buffer on one leg.
  sampleDistance: 6,
};

const AXIS_EPSILON = 0.5;

function directionOf(from: { x: number; y: number }, to: { x: number; y: number }): TrailDirection | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < AXIS_EPSILON && Math.abs(dy) < AXIS_EPSILON) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy < 0 ? 'UP' : 'DOWN';
}

function opposite(a: TrailDirection, b: TrailDirection) {
  return (a === 'UP' && b === 'DOWN') || (a === 'DOWN' && b === 'UP')
    || (a === 'LEFT' && b === 'RIGHT') || (a === 'RIGHT' && b === 'LEFT');
}

/**
 * Builds a trail from observed motion, one sample at a time.
 *
 * `observe` is the ONLY way in. It takes a position and a clock and nothing
 * else — no route, no destination, no platform correctness. Anything the Brain
 * later reads was therefore, by construction, somewhere the Spark had already
 * physically been at the moment it was written.
 */
export class TrailRecorder {
  private points: TrailPoint[] = [];
  private segments: TrailSegment[] = [];
  private total = 0;
  private head: TrailPoint;
  private bounds: TrailBounds;
  private rowGap: number;

  constructor(start: { x: number; y: number }, tMs: number, rowGap: number, bounds: TrailBounds = DEFAULT_TRAIL_BOUNDS) {
    this.bounds = bounds;
    this.rowGap = rowGap;
    this.head = { x: start.x, y: start.y, tMs, row: this.rowOf(start.y) };
    this.points.push(this.head);
  }

  private rowOf(y: number): number | null {
    if (this.rowGap <= 0) return null;
    const row = -y / this.rowGap;
    return Math.abs(row - Math.round(row)) < 0.35 ? Math.round(row) : null;
  }

  observe(position: { x: number; y: number }, tMs: number) {
    const moved = Math.hypot(position.x - this.head.x, position.y - this.head.y);
    if (moved < 1e-9) return;

    const direction = directionOf(this.head, position);
    const open = this.segments.length ? this.segments[this.segments.length - 1] : null;
    const openIsLive = open && !open.closed;

    if (openIsLive && direction && direction !== open!.direction) {
      // The leg turned. Close it where the learner actually is, and let the new
      // leg begin from that same physically-visited point.
      open!.closed = true;
      open!.tEndMs = tMs;
      this.pushPoint({ ...this.head });
      this.openSegment(this.head, position, tMs, direction);
    } else if (openIsLive && direction) {
      open!.head = { x: position.x, y: position.y, tMs, row: this.rowOf(position.y) };
      open!.traversedLength = Math.hypot(position.x - open!.from.x, position.y - open!.from.y);
      open!.tEndMs = tMs;
      if (Math.hypot(position.x - this.lastPoint().x, position.y - this.lastPoint().y) >= this.bounds.sampleDistance) {
        this.pushPoint({ x: position.x, y: position.y, tMs, row: this.rowOf(position.y) });
      }
    } else if (direction) {
      this.openSegment(this.head, position, tMs, direction);
    }

    this.total += moved;
    this.head = { x: position.x, y: position.y, tMs, row: this.rowOf(position.y) };
    this.prune(tMs);
  }

  private lastPoint() { return this.points[this.points.length - 1]; }

  private pushPoint(p: TrailPoint) { this.points.push(p); }

  private openSegment(from: TrailPoint, to: { x: number; y: number }, tMs: number, direction: TrailDirection) {
    const head: TrailPoint = { x: to.x, y: to.y, tMs, row: this.rowOf(to.y) };
    const previous = this.segments.length ? this.segments[this.segments.length - 1] : null;
    const segment: TrailSegment = {
      from: { ...from },
      head,
      closed: false,
      direction,
      traversedLength: Math.hypot(to.x - from.x, to.y - from.y),
      tStartMs: from.tMs,
      tEndMs: tMs,
      rowTransition: direction === 'UP' || direction === 'DOWN',
      annotation: 'UNKNOWN',
      cumulativeDistance: this.total,
    };
    // Retrospective annotation, from geometry alone: a leg walked back the way
    // it came says the previous leg did not pay off. Nothing here consults the
    // maths, the answer, or the route.
    if (previous && opposite(previous.direction, direction) && previous.rowTransition) {
      previous.annotation = 'WRONG';
      segment.annotation = 'RETURN';
    }
    this.segments.push(segment);
  }

  private prune(nowMs: number) {
    while (this.points.length > this.bounds.maxPoints) this.points.shift();
    while (this.segments.length > this.bounds.maxSegments) this.segments.shift();
    while (this.points.length > 1 && nowMs - this.points[0].tMs > this.bounds.maxAgeMs) this.points.shift();
    while (this.segments.length > 1 && nowMs - this.segments[0].tEndMs > this.bounds.maxAgeMs) this.segments.shift();
  }

  /** A frozen view. Callers get copies, so a Brain cannot write history. */
  snapshot(nowMs: number): PlayerTrail {
    return Object.freeze({
      // The arrays are frozen too, not just the objects inside them. Freezing
      // only the elements leaves `push` working, which is a Brain writing
      // history it never observed.
      points: Object.freeze(this.points.map((p) => Object.freeze({ ...p }))),
      segments: Object.freeze(this.segments.map((s) => Object.freeze({
        ...s, from: Object.freeze({ ...s.from }), head: Object.freeze({ ...s.head }),
      }))),
      totalDistance: this.total,
      oldestAgeMs: this.points.length ? nowMs - this.points[0].tMs : 0,
      head: Object.freeze({ ...this.head }),
    }) as PlayerTrail;
  }
}
