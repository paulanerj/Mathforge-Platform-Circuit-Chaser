/**
 * Circuit Climb — pursuit log.
 *
 * Evidence, and nothing else. Every value here is written BY gameplay and read
 * only by a human; nothing in this module is consulted by the learner's
 * routing, the pursuer's targeting, collision, cadence or capture. If a future
 * change makes gameplay read from a PursuitLog, that change has turned a
 * diagnostic into a mechanic and should be rejected on that ground alone.
 *
 * Two things this exists to make possible that the step tracer cannot:
 *
 *   - explaining a pursuit DECISION, not just a movement. The tracer answers
 *     "which link stopped producing movement"; this answers "what was it
 *     chasing, and why that".
 *   - getting the evidence off the machine it was produced on, through the
 *     normal game UI, with no devtools and no file download.
 *
 * PLANNED vs TRAVERSED
 *
 * The learner's router knows its whole route the moment a destination is
 * chosen. The pursuer must never inherit that — a bot that knows where the
 * spark is going before it goes there is not pursuing, it is precognitive. So
 * the planned route is recorded ONLY on the route-started event, under a key
 * that says what it is, and what has actually been physically traversed is
 * tracked separately and independently. A future trail-based pursuer may read
 * the traversed side. It may never read `plannedRoute`.
 */

export interface PursuitLogPoint { x: number; y: number }

/** What the pursuer was steering at, named for what the code actually does. */
export type PursuerTargetSource =
  /** CHASE: the learner's current coordinates, exactly. */
  | 'PLAYER_CURRENT'
  /** SEARCH/ALERT: the frozen last sighting, unswept. */
  | 'LAST_KNOWN'
  /** SEARCH: the last sighting plus the lateral patrol offset. */
  | 'SEARCH_SWEEP'
  /** Either state, while committed to a corridor through the row above. */
  | 'CORRIDOR_COMMITMENT'
  /** The frame spent leaving an inflated rect it had become embedded in. */
  | 'OBSTACLE_RECOVERY';

export type PursuitEventName =
  | 'PLAYER_ROUTE_STARTED'
  | 'PLAYER_ROUTE_SEGMENT_ENTERED'
  | 'PLAYER_ROUTE_COMPLETED'
  | 'PLAYER_WRONG_RETURN_STARTED'
  | 'PLAYER_WRONG_RETURN_COMPLETED'
  | 'PURSUER_BEHAVIOUR_CHANGED'
  | 'PURSUER_TARGET_SOURCE_CHANGED'
  | 'PURSUER_DIRECTION_CHANGED'
  | 'PURSUER_STALLED'
  | 'PURSUER_NOT_CLOSING'
  | 'CAPTURE';

export interface PursuitEvent {
  name: PursuitEventName;
  /** Runtime elapsed ms, so events and frames share one clock. */
  at: number;
  frame: number;
  data?: Record<string, any>;
}

export interface PursuitPlayerSample {
  x: number;
  y: number;
  row: number;
  platformId: string | null;
  destinationId: string | null;
  travelType: 'CIRCUIT' | 'RETURN' | 'HOP' | 'NONE';
  settled: boolean;
  correct: boolean | null;
  segment: number | null;
  progress: number | null;
  /** Sign of movement on each axis since the previous sample, or 0. */
  dx: number;
  dy: number;
}

export interface PursuitPursuerSample {
  x: number;
  y: number;
  row: number;
  behaviour: string;
  targetSource: PursuerTargetSource;
  desired: PursuitLogPoint;
  lastKnown: PursuitLogPoint;
  distance: number;
  mode: string;
  targetX: number;
  chosenCorridor: number | null;
  cadence: string;
  direction: { axis: string; sign: number; changed: boolean };
  budget: number;
  hBlocked: boolean;
  vBlocked: boolean;
  stalled: boolean;
  stallReason: string | null;
}

/**
 * A run of consecutive motionless frames, and what ended it.
 *
 * `stalledFrames = 208` cannot distinguish 208 isolated blocks from one
 * 208-frame freeze, and those are completely different behaviours — the first
 * is a bot routing around obstacles, the second is a bot that has stopped
 * playing. An episode is the unit that tells them apart.
 */
export interface PursuitStallEpisode {
  startFrame: number;
  endFrame: number;
  frames: number;
  durationMs: number;
  /** The stall reason held for the majority of the episode. */
  reason: string;
  /**
   * TRANSIENT  — shorter than the runtime's own 45-frame alert threshold. A
   *              blocked axis while the bot reroutes; normal.
   * SUSTAINED  — 45 frames or more, but movement resumed. Worth reading.
   * DEADLOCK   — sustained, and the run ended still stalled. Never recovered.
   */
  severity: 'TRANSIENT' | 'SUSTAINED' | 'DEADLOCK';
  startPosition: PursuitLogPoint;
  endPosition: PursuitLogPoint;
  /** Displacement over the whole episode; ~0 confirms it really was stuck. */
  displacement: number;
  /** True when every frame of the episode asked for the same target x. */
  repeatedTarget: boolean;
  targetAtStart: number;
  modeAtStart: string;
  modeAtRecovery: string | null;
  behaviourAtStart: string;
  /** What differed on the first moving frame after it. */
  recoveryCause:
    | 'TARGET_X_CHANGED' | 'CORRIDOR_CHANGED' | 'MODE_CHANGED'
    | 'BEHAVIOUR_CHANGED' | 'PLAYER_MOVED' | 'UNCHANGED_INPUTS' | null;
  recovered: boolean;
}

export interface PursuitStallSummary {
  stallFrames: number;
  stallEpisodes: number;
  transientEpisodes: number;
  sustainedEpisodes: number;
  recoveredEpisodes: number;
  unrecoveredEpisodes: number;
  maximumConsecutiveStallFrames: number;
  maximumStallDurationMs: number;
  /** The threshold separating TRANSIENT from SUSTAINED, so the log is self-describing. */
  sustainedThresholdFrames: number;
}

export interface PursuitFrame {
  frame: number;
  at: number;
  player: PursuitPlayerSample;
  pursuer: PursuitPursuerSample | null;
}

export interface PursuitRunIdentity {
  build: string;
  branch: string;
  startedAt: string;
  viewScalePercent: number | null;
  routeTurnCount: number | null;
  sparkAvoidance: number | null;
  sparkShielded: boolean | null;
  geometry: Record<string, number> | null;
  tuning: Record<string, any> | null;
}

export interface PursuitLogExport {
  schema: 'circuit-climb-pursuit-log/1';
  identity: PursuitRunIdentity;
  counts: {
    /** Frames the game ran. */
    framesObserved: number;
    /** Frames sampled into the buffer, before any were dropped. */
    framesRecorded: number;
    /** Frames the export actually carries. */
    framesRetained: number;
    frameStride: number;
    eventsRecorded: number;
    eventsRetained: number;
    routesRecorded: number;
    routesRetained: number;
  };
  /** Derived, never a substitute for the raw frames below. */
  stalls: PursuitStallSummary;
  stallEpisodes: PursuitStallEpisode[];
  routes: PursuitRouteRecord[];
  events: PursuitEvent[];
  frames: PursuitFrame[];
}

/**
 * One learner route. `plannedRoute` is the whole thing, known in advance;
 * `traversedPoints` grows only as the spark physically passes each vertex, and
 * `traversedDistance` only as it physically covers ground.
 */
export interface PursuitRouteRecord {
  id: number;
  startedAt: number;
  completedAt: number | null;
  destinationId: string | null;
  correct: boolean | null;
  outcome: 'IN_PROGRESS' | 'ARRIVED' | 'ABANDONED';
  plannedRoute: PursuitLogPoint[];
  plannedTotal: number;
  traversedPoints: PursuitLogPoint[];
  traversedDistance: number;
}

/**
 * Coordinates are doubles, and a double printed in full is about seventeen
 * characters of which four carry any meaning here — the world is 600 units
 * wide and a hundredth of a unit is far below a rendered pixel. Rounding on
 * EXPORT only, never in the stored sample, is what takes a run from something
 * the PM has to be sent as a file to something they can be handed in a message.
 */
function round2(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : value;
}

function roundPoint(point: PursuitLogPoint): PursuitLogPoint {
  return { x: round2(point.x), y: round2(point.y) };
}

const DEFAULT_FRAME_CAPACITY = 1200;
const DEFAULT_EVENT_CAPACITY = 600;
const DEFAULT_ROUTE_CAPACITY = 40;

/**
 * Keep one frame in three.
 *
 * A pursuit DECISION changes on the order of a hundred milliseconds — a
 * behaviour transition, a corridor commitment, a leg turning — so twenty
 * samples a second is a generous record of one. Sixty is three times the bytes
 * for no more meaning, and bytes matter here: the log has to survive being
 * pasted into a message by a person.
 *
 * Nothing semantic is sampled away. Events are recorded on the exact frame they
 * happen whatever the stride, and per-frame movement and collision forensics
 * still live in the PursuerTracer at full rate, untouched by this phase.
 */
const DEFAULT_FRAME_STRIDE = 3;

/**
 * Where a stall stops being routing and starts being worth reading.
 *
 * 45 frames is not a new number: it is the runtime's own PursuerTracer
 * threshold, the point at which it already raises CIRCUIT_CLIMB_PURSUER_STALLED.
 * Reusing it keeps one definition of "stuck" in the project rather than two
 * that can drift.
 */
const SUSTAINED_STALL_FRAMES = 45;

const EPISODE_CAPACITY = 120;

/**
 * A ring buffer that also remembers how much it has thrown away, so an export
 * can never quietly look like a complete run when it is a tail.
 */
class Bounded<T> {
  private items: T[] = [];
  private total = 0;

  constructor(readonly capacity: number) {}

  push(item: T) {
    this.items.push(item);
    this.total += 1;
    if (this.items.length > this.capacity) this.items.shift();
  }

  get retained() { return this.items.length; }
  get recorded() { return this.total; }
  get last(): T | undefined { return this.items[this.items.length - 1]; }
  all(): T[] { return this.items.slice(); }
  clear() { this.items = []; this.total = 0; }
}

export class PursuitLog {
  private frames: Bounded<PursuitFrame>;
  private events: Bounded<PursuitEvent>;
  private routes: Bounded<PursuitRouteRecord>;

  private identity: PursuitRunIdentity;
  private frameCounter = 0;
  private nextRouteId = 1;
  private openRoute: PursuitRouteRecord | null = null;

  // Last-seen values, so a transition fires once and holding steady is silent.
  private lastBehaviour: string | null = null;
  private lastTargetSource: PursuerTargetSource | null = null;
  private lastPlayer: { x: number; y: number } | null = null;

  // Stall episodes are accumulated on EVERY frame, never on the sampled ones:
  // a duration measured off one frame in three would be wrong by a factor of
  // three, which is exactly the kind of quietly-wrong number this log exists
  // to stop producing.
  private episodes: Bounded<PursuitStallEpisode>;
  private openEpisode: PursuitStallEpisode | null = null;
  private episodeReasons = new Map<string, number>();
  private stallFrameTotal = 0;

  constructor(
    frameCapacity = DEFAULT_FRAME_CAPACITY,
    eventCapacity = DEFAULT_EVENT_CAPACITY,
    routeCapacity = DEFAULT_ROUTE_CAPACITY,
    private readonly frameStride = DEFAULT_FRAME_STRIDE,
  ) {
    this.frames = new Bounded(frameCapacity);
    this.events = new Bounded(eventCapacity);
    this.routes = new Bounded(routeCapacity);
    this.episodes = new Bounded(EPISODE_CAPACITY);
    this.identity = {
      build: 'unknown',
      branch: 'unknown',
      startedAt: new Date(0).toISOString(),
      viewScalePercent: null,
      routeTurnCount: null,
      sparkAvoidance: null,
      sparkShielded: null,
      geometry: null,
      tuning: null,
    };
  }

  reset(identity: Partial<PursuitRunIdentity> = {}) {
    this.frames.clear();
    this.events.clear();
    this.routes.clear();
    this.episodes.clear();
    this.openEpisode = null;
    this.episodeReasons.clear();
    this.stallFrameTotal = 0;
    this.frameCounter = 0;
    this.nextRouteId = 1;
    this.openRoute = null;
    this.lastBehaviour = null;
    this.lastTargetSource = null;
    this.lastPlayer = null;
    this.identity = { ...this.identity, ...identity, startedAt: new Date().toISOString() };
  }

  describeRun(identity: Partial<PursuitRunIdentity>) {
    this.identity = { ...this.identity, ...identity };
  }

  event(name: PursuitEventName, at: number, data?: Record<string, any>) {
    this.events.push({ name, at, frame: this.frameCounter, data });
  }

  // --- learner route lifecycle ------------------------------------------------

  /**
   * A route has been chosen and travel is beginning. This is the ONE place the
   * planned route is written, and it is written under a key that says so.
   */
  routeStarted(at: number, plannedRoute: PursuitLogPoint[], plannedTotal: number, destinationId: string | null, correct: boolean | null) {
    if (this.openRoute && this.openRoute.outcome === 'IN_PROGRESS') {
      this.openRoute.outcome = 'ABANDONED';
      this.openRoute.completedAt = at;
    }
    const record: PursuitRouteRecord = {
      id: this.nextRouteId,
      startedAt: at,
      completedAt: null,
      destinationId,
      correct,
      outcome: 'IN_PROGRESS',
      plannedRoute: plannedRoute.map((point) => ({ x: point.x, y: point.y })),
      plannedTotal,
      // The spark is standing at the first point, so that much is already true.
      traversedPoints: plannedRoute.length ? [{ x: plannedRoute[0].x, y: plannedRoute[0].y }] : [],
      traversedDistance: 0,
    };
    this.nextRouteId += 1;
    this.openRoute = record;
    this.routes.push(record);
    this.event('PLAYER_ROUTE_STARTED', at, {
      routeId: record.id,
      destinationId,
      correct,
      plannedTotal,
      plannedSegments: Math.max(0, plannedRoute.length - 1),
    });
  }

  /**
   * The spark has physically reached a vertex. Only now does that vertex join
   * the traversed route — which is why a trail reader can never see ahead.
   */
  routeSegmentEntered(at: number, segment: number, point: PursuitLogPoint, travelledDistance: number) {
    if (!this.openRoute) return;
    const planned = this.openRoute.plannedRoute[segment];
    const vertex = planned ? { x: planned.x, y: planned.y } : { x: point.x, y: point.y };
    this.openRoute.traversedPoints.push(vertex);
    this.openRoute.traversedDistance = travelledDistance;
    this.event('PLAYER_ROUTE_SEGMENT_ENTERED', at, {
      routeId: this.openRoute.id,
      segment,
      traversedDistance: travelledDistance,
    });
  }

  routeCompleted(at: number, arrivedPoint: PursuitLogPoint, travelledDistance: number, correct: boolean | null) {
    if (!this.openRoute) return;
    this.openRoute.traversedPoints.push({ x: arrivedPoint.x, y: arrivedPoint.y });
    this.openRoute.traversedDistance = travelledDistance;
    this.openRoute.completedAt = at;
    this.openRoute.outcome = 'ARRIVED';
    this.openRoute.correct = correct;
    this.event('PLAYER_ROUTE_COMPLETED', at, {
      routeId: this.openRoute.id,
      correct,
      traversedDistance: travelledDistance,
      plannedTotal: this.openRoute.plannedTotal,
    });
    this.openRoute = null;
  }

  wrongReturnStarted(at: number, from: PursuitLogPoint, to: PursuitLogPoint, durationMs: number) {
    this.event('PLAYER_WRONG_RETURN_STARTED', at, { from, to, durationMs });
  }

  wrongReturnCompleted(at: number, to: PursuitLogPoint) {
    this.event('PLAYER_WRONG_RETURN_COMPLETED', at, { to });
  }

  capture(at: number, where: PursuitLogPoint, player: PursuitLogPoint) {
    this.event('CAPTURE', at, { pursuer: where, player });
  }

  // --- per-frame --------------------------------------------------------------

  /**
   * One frame of evidence. Transitions are derived here rather than by the
   * caller, so a behaviour or target-source change produces exactly one event
   * however many frames it then holds for.
   */
  frame(at: number, player: Omit<PursuitPlayerSample, 'dx' | 'dy'>, pursuer: PursuitPursuerSample | null) {
    this.frameCounter += 1;

    const dx = this.lastPlayer ? Math.sign(player.x - this.lastPlayer.x) : 0;
    const dy = this.lastPlayer ? Math.sign(player.y - this.lastPlayer.y) : 0;
    this.lastPlayer = { x: player.x, y: player.y };

    if (pursuer) {
      if (this.lastBehaviour !== null && pursuer.behaviour !== this.lastBehaviour) {
        this.event('PURSUER_BEHAVIOUR_CHANGED', at, {
          from: this.lastBehaviour,
          to: pursuer.behaviour,
          distance: pursuer.distance,
          playerSettled: player.settled,
          // The reason is read off the state that produced it, not guessed.
          reason: behaviourTransitionReason(this.lastBehaviour, pursuer.behaviour, player.settled),
        });
      }
      this.lastBehaviour = pursuer.behaviour;

      if (this.lastTargetSource !== null && pursuer.targetSource !== this.lastTargetSource) {
        this.event('PURSUER_TARGET_SOURCE_CHANGED', at, {
          from: this.lastTargetSource,
          to: pursuer.targetSource,
          desired: pursuer.desired,
        });
      }
      this.lastTargetSource = pursuer.targetSource;

      if (pursuer.direction.changed) {
        this.event('PURSUER_DIRECTION_CHANGED', at, {
          axis: pursuer.direction.axis,
          sign: pursuer.direction.sign,
        });
      }
    }

    if (pursuer) this.accumulateStall(at, pursuer);

    // Transitions above were evaluated on EVERY frame, so no event can be
    // sampled away; only the routine context between them is thinned.
    if (this.frameCounter % this.frameStride === 0) {
      this.frames.push({ frame: this.frameCounter, at, player: { ...player, dx, dy }, pursuer });
    }
  }

  /**
   * Grow, or close, the current run of motionless frames.
   *
   * A stall frame is one the pursuer itself reported as stalled — which already
   * excludes a deliberate cadence hesitation, so a nervous bot standing still on
   * purpose never inflates these numbers.
   */
  private accumulateStall(at: number, pursuer: PursuitPursuerSample) {
    if (pursuer.stalled) {
      this.stallFrameTotal += 1;
      if (!this.openEpisode) {
        this.episodeReasons.clear();
        this.openEpisode = {
          startFrame: this.frameCounter,
          endFrame: this.frameCounter,
          frames: 0,
          durationMs: 0,
          reason: pursuer.stallReason || 'NONE',
          severity: 'TRANSIENT',
          startPosition: { x: pursuer.x, y: pursuer.y },
          endPosition: { x: pursuer.x, y: pursuer.y },
          displacement: 0,
          repeatedTarget: true,
          targetAtStart: pursuer.targetX,
          modeAtStart: pursuer.mode,
          modeAtRecovery: null,
          behaviourAtStart: pursuer.behaviour,
          recoveryCause: null,
          recovered: false,
        };
        (this.openEpisode as any).__startedAt = at;
        (this.openEpisode as any).__corridorAtStart = pursuer.chosenCorridor;
        (this.openEpisode as any).__playerAtStart = null;
      }
      const episode = this.openEpisode;
      episode.endFrame = this.frameCounter;
      episode.frames += 1;
      episode.durationMs = at - (episode as any).__startedAt;
      episode.endPosition = { x: pursuer.x, y: pursuer.y };
      episode.displacement = Math.hypot(
        pursuer.x - episode.startPosition.x, pursuer.y - episode.startPosition.y);
      if (pursuer.targetX !== episode.targetAtStart) episode.repeatedTarget = false;
      const reason = pursuer.stallReason || 'NONE';
      this.episodeReasons.set(reason, (this.episodeReasons.get(reason) || 0) + 1);
      episode.severity = episode.frames >= SUSTAINED_STALL_FRAMES ? 'SUSTAINED' : 'TRANSIENT';
      return;
    }

    if (!this.openEpisode) return;

    // Movement resumed. What is different about this frame is the answer to
    // "why did it get out", and it is read rather than guessed.
    const episode = this.openEpisode;
    episode.recovered = true;
    episode.modeAtRecovery = pursuer.mode;
    episode.recoveryCause =
      pursuer.targetX !== episode.targetAtStart ? 'TARGET_X_CHANGED'
      : pursuer.chosenCorridor !== (episode as any).__corridorAtStart ? 'CORRIDOR_CHANGED'
      : pursuer.mode !== episode.modeAtStart ? 'MODE_CHANGED'
      : pursuer.behaviour !== episode.behaviourAtStart ? 'BEHAVIOUR_CHANGED'
      : this.lastPlayer && (episode as any).__playerAtStart
        && (this.lastPlayer.x !== (episode as any).__playerAtStart.x
          || this.lastPlayer.y !== (episode as any).__playerAtStart.y) ? 'PLAYER_MOVED'
      : 'UNCHANGED_INPUTS';
    // The majority reason, not the first: an episode that starts
    // HORIZONTAL_BLOCKED and spends 40 frames VERTICAL_BLOCKED is the latter.
    let top = episode.reason;
    let best = -1;
    this.episodeReasons.forEach((count, reason) => { if (count > best) { best = count; top = reason; } });
    episode.reason = top;
    delete (episode as any).__startedAt;
    delete (episode as any).__corridorAtStart;
    delete (episode as any).__playerAtStart;
    this.episodes.push(episode);
    this.openEpisode = null;
  }

  /**
   * Episodes, including one still open at export time — a run that ended while
   * the pursuer was still stuck is precisely the case worth seeing, so it is
   * reported as DEADLOCK rather than omitted for being unfinished.
   */
  private episodeList(): PursuitStallEpisode[] {
    const closed = this.episodes.all();
    if (!this.openEpisode) return closed;
    const open = { ...this.openEpisode };
    delete (open as any).__startedAt;
    delete (open as any).__corridorAtStart;
    delete (open as any).__playerAtStart;
    open.recovered = false;
    open.severity = open.frames >= SUSTAINED_STALL_FRAMES ? 'DEADLOCK' : 'TRANSIENT';
    return [...closed, open];
  }

  private stallSummary(episodes: PursuitStallEpisode[]): PursuitStallSummary {
    return {
      stallFrames: this.stallFrameTotal,
      stallEpisodes: episodes.length,
      transientEpisodes: episodes.filter((e) => e.severity === 'TRANSIENT').length,
      sustainedEpisodes: episodes.filter((e) => e.severity !== 'TRANSIENT').length,
      recoveredEpisodes: episodes.filter((e) => e.recovered).length,
      unrecoveredEpisodes: episodes.filter((e) => !e.recovered).length,
      maximumConsecutiveStallFrames: episodes.reduce((m, e) => Math.max(m, e.frames), 0),
      maximumStallDurationMs: round2(episodes.reduce((m, e) => Math.max(m, e.durationMs), 0)),
      sustainedThresholdFrames: SUSTAINED_STALL_FRAMES,
    };
  }

  // --- export -----------------------------------------------------------------

  toExport(): PursuitLogExport {
    return {
      schema: 'circuit-climb-pursuit-log/1',
      identity: { ...this.identity },
      counts: {
        framesObserved: this.frameCounter,
        frameStride: this.frameStride,
        framesRecorded: this.frames.recorded,
        framesRetained: this.frames.retained,
        eventsRecorded: this.events.recorded,
        eventsRetained: this.events.retained,
        routesRecorded: this.routes.recorded,
        routesRetained: this.routes.retained,
      },
      stalls: this.stallSummary(this.episodeList()),
      stallEpisodes: this.episodeList().map((episode) => ({
        ...episode,
        durationMs: round2(episode.durationMs),
        displacement: round2(episode.displacement),
        startPosition: roundPoint(episode.startPosition),
        endPosition: roundPoint(episode.endPosition),
        targetAtStart: round2(episode.targetAtStart),
      })),
      routes: this.routes.all().map((route) => ({
        ...route,
        plannedTotal: round2(route.plannedTotal),
        traversedDistance: round2(route.traversedDistance),
        plannedRoute: route.plannedRoute.map(roundPoint),
        traversedPoints: route.traversedPoints.map(roundPoint),
      })),
      events: this.events.all(),
      frames: this.frames.all().map((frame) => ({
        ...frame,
        at: round2(frame.at),
        player: { ...frame.player, x: round2(frame.player.x), y: round2(frame.player.y),
                  progress: frame.player.progress === null ? null : round2(frame.player.progress) },
        pursuer: frame.pursuer
          ? {
              ...frame.pursuer,
              x: round2(frame.pursuer.x),
              y: round2(frame.pursuer.y),
              desired: roundPoint(frame.pursuer.desired),
              lastKnown: roundPoint(frame.pursuer.lastKnown),
              distance: round2(frame.pursuer.distance),
              budget: round2(frame.pursuer.budget),
              chosenCorridor: frame.pursuer.chosenCorridor === null ? null : round2(frame.pursuer.chosenCorridor),
            }
          : null,
      })),
    };
  }

  /**
   * Compact by default. A person pasting this into a message is the primary
   * consumer, and indentation is roughly a third of the bytes without adding
   * anything a reader of a 2000-frame log will use.
   */
  toJSON(space = 0): string {
    return JSON.stringify(this.toExport(), null, space);
  }

  get frameCount() { return this.frames.recorded; }
  get eventCount() { return this.events.recorded; }
}

/**
 * Why the lifecycle moved, in the words of the code that moves it.
 *
 * `reacquireOnPlayerMove` makes a travelling spark break the lock, so a drop to
 * SEARCH while the spark is mid-route is that rule firing and nothing else —
 * distinguishing it from losing the spark at distance is the difference between
 * a bot that was shaken off and one that was never allowed to hold on.
 */
export function behaviourTransitionReason(from: string, to: string, playerSettled: boolean): string {
  if (to === 'SEARCH' && !playerSettled) return 'PLAYER_TRAVELLING_BREAKS_LOCK';
  if (to === 'SEARCH') return 'LOST_AT_DISTANCE';
  if (to === 'ALERT') return 'SENSED_WITHIN_RADIUS';
  if (to === 'CHASE' && from === 'ALERT') return 'ALERT_DWELL_ELAPSED';
  if (to === 'CHASE') return 'SENSED_WITH_NO_DWELL';
  return 'UNKNOWN';
}

/**
 * Name the point the pursuer actually steered at this frame, from the trace it
 * already emits. Derived, never decided: this function cannot change what the
 * pursuer does, and reads only fields the pursuer had already computed.
 */
export function classifyTargetSource(step: {
  mode: string;
  behaviour: string;
  mustCrossRow: boolean;
  desired: { x: number; y: number };
  lastKnown: { x: number; y: number };
  player: { x: number; y: number };
}): PursuerTargetSource {
  if (step.mode === 'ESCAPE') return 'OBSTACLE_RECOVERY';
  if (step.mustCrossRow) return 'CORRIDOR_COMMITMENT';
  if (step.behaviour === 'CHASE') return 'PLAYER_CURRENT';
  // Searching: the sweep is the only thing that separates the point it heads
  // for from the sighting itself.
  return step.desired.x === step.lastKnown.x ? 'LAST_KNOWN' : 'SEARCH_SWEEP';
}
