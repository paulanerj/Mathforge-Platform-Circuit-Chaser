/**
 * THE SIMULATION — one run, deterministic, fully observed.
 *
 * Owns the world truth: the board, the learner, the learner's physical trail,
 * and capture adjudication. Hands the pursuer rig exactly what a perception
 * model is allowed to look at, and records everything either of them did.
 *
 * Capture is decided HERE and nowhere else. A Brain never learns how far away
 * the learner is, and never gets to declare that it has caught anything.
 */

import { Board, ROWS_AHEAD, type Platform } from '../world/board';
import { graphWorldAt, type GraphWorld } from '../world/graphWorld';
import { computePlatformCollisionRects } from '../world/circuitClimbGeometry';
import { Learner, ROUTE_SPEED, routingConfigFor } from '../learner/learner';
import { GroundTruthTrail } from '../pursuer/graph/trailRecorder';
import { PursuerRig, type RigOptions, type RigTick } from '../pursuer/rig';
import { Timebase, SIM_STEP_MS, type TimebaseMode } from './timebase';
import { RunRecorder, type RecordedRun } from './recording';
import type { LabEvent, LabEventKind } from './events';
import type { PursuerBrainDefinition } from '../pursuer/contract/brain';
import type { PerceptionModelDefinition } from '../pursuer/perception/perceptionModels';

/** How often a full diagnostic sample is retained. Every 4th tick = 30Hz. */
export const SAMPLE_EVERY_TICKS = 4;

export type PlayMode = 'REALISTIC' | 'PURSUIT_TEST';

export interface SimulationOptions {
  framingPercent?: number;
  mode?: PlayMode;
  timebase?: TimebaseMode;
  stepMs?: number;
  brain: PursuerBrainDefinition;
  brainConfig?: any;
  perception: PerceptionModelDefinition;
  perceptionConfig?: any;
  locomotion?: RigOptions['locomotion'];
  /** Production lets the Spark steer around the bot. Zero decouples them. */
  avoidance?: number;
  /** Capture ends the run. Disarm for long observation. */
  captureArmed?: boolean;
  /** Replay this exact learner run instead of taking live selections. */
  replay?: RecordedRun | null;
  /** DIAGNOSTIC placement for fixtures. See `RigOptions.pursuerStart`. */
  pursuerStart?: { x: number; y: number } | null;
}

/**
 * ONE RETAINED DIAGNOSTIC SAMPLE.
 *
 * `pursuer` is never null. That is the entire reason this type is written out
 * in full rather than being whatever happened to be in scope.
 */
export interface LabSample {
  tMs: number;
  tick: number;
  learner: { x: number; y: number; row: number; moving: boolean };
  pursuer: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    node: string;
    edge: string | null;
    /** Travel direction this tick, as a unit-ish vector. */
    direction: { x: number; y: number };
    cadencePhase: 'MOVING' | 'HESITATING';
    brainId: string;
    perceptionModelId: string;
    perceptionActive: boolean;
    perceptionLive: boolean;
    mode: string;
    modeLabel: string;
    commitmentId: string;
    reasonCode: string;
    confidence: number;
    explanation: string;
    target: { x: number; y: number } | null;
    targetNode: string | null;
    routeNodes: readonly string[];
    beliefNodes: readonly string[];
    /** DIAGNOSTIC ONLY. Never reaches any Brain. */
    distanceToLearner: number;
    /** DIAGNOSTIC ONLY. Legal graph distance, which is the honest measure. */
    graphDistanceToLearner: number | null;
    distanceToTarget: number | null;
    /** Did this interval reduce the legal distance to the learner? */
    closedUsefulDistance: boolean;
    /**
     * Did the body move at all this interval?
     *
     * Recorded separately because the cadence pauses by design — at the
     * baseline `pauseChance` of 0.62 the pursuer is standing still a large
     * fraction of the time — and counting a deliberate pause as "failed to
     * close" would blame the Brain for the locomotion layer's rhythm.
     */
    moved: boolean;
    reversal: boolean;
    targetChanged: boolean;
    modeChanged: boolean;
  };
}

export interface SimulationSnapshot {
  tMs: number;
  tick: number;
  learner: { x: number; y: number; row: number; moving: boolean };
  pursuer: { x: number; y: number; radius: number };
  captured: boolean;
}

export class Simulation {
  readonly board: Board;
  readonly world: GraphWorld;
  readonly learner: Learner;
  readonly rig: PursuerRig;
  readonly timebase: Timebase;
  readonly recorder = new RunRecorder();

  readonly events: LabEvent[] = [];
  readonly samples: LabSample[] = [];

  captured = false;
  capturedAtMs: number | null = null;
  private trail: GroundTruthTrail;
  private options: SimulationOptions;
  private routingConfig;
  private previous: {
    mode: string; commitment: string; target: string; perception: boolean;
    cadence: 'MOVING' | 'HESITATING'; inCaptureRange: boolean; near: boolean;
    commandedNode: string | null;
    graphDistance: number | null; direction: { x: number; y: number };
    fragmentIds: Set<string>; routeKey: string;
  };
  private replayIndex = 0;
  private pendingRefusal = false;

  constructor(options: SimulationOptions) {
    this.options = options;
    this.world = graphWorldAt(options.framingPercent ?? 100);
    this.board = new Board(this.world);
    this.routingConfig = routingConfigFor(this.world);
    this.learner = new Learner(this.board, this.routingConfig, options.replay?.speed ?? ROUTE_SPEED);
    this.trail = new GroundTruthTrail({ x: this.learner.x, y: this.learner.y }, 0, this.world.rowGap);
    this.timebase = new Timebase(options.timebase ?? 'FIXED', options.stepMs ?? SIM_STEP_MS);
    this.rig = new PursuerRig({
      world: this.world,
      rowCount: this.board.rowCount,
      learnerStart: { x: this.learner.x, y: this.learner.y, row: 0 },
      brain: options.brain,
      brainConfig: options.brainConfig,
      perception: options.perception,
      perceptionConfig: options.perceptionConfig,
      locomotion: options.locomotion,
      pursuerStart: options.pursuerStart,
    });
    this.previous = {
      mode: '', commitment: '', target: '', perception: false, cadence: 'MOVING',
      inCaptureRange: false, near: false, commandedNode: null, graphDistance: null, direction: { x: 0, y: 0 },
      fragmentIds: new Set(), routeKey: '',
    };
    this.emit('RUN_STARTED', `${options.brain.id} under ${options.perception.id}`, {
      brain: options.brain.id, perception: options.perception.id,
      timebase: this.timebase.mode, stepMs: this.timebase.stepMs,
    });
  }

  private emit(kind: LabEventKind, reason: string, ids?: Record<string, string | number | null>) {
    this.events.push({
      kind,
      tMs: this.timebase.elapsedMs,
      tick: this.timebase.tickCount,
      wallSeconds: this.timebase.elapsedMs / 1000,
      reason,
      ids,
    });
  }

  get snapshot(): SimulationSnapshot {
    return {
      tMs: this.timebase.elapsedMs,
      tick: this.timebase.tickCount,
      learner: this.learner.state,
      pursuer: { ...this.rig.position, radius: this.rig.radius },
      captured: this.captured,
    };
  }

  /**
   * The direct-perception radius the running model is using, for the overlay.
   * Read from the last observation rather than from a config, so a model that
   * varies it (P1's retain radius, say) is drawn honestly.
   */
  get perceptionRadius(): number {
    const last = this.lastPerceptionRadius;
    return Number.isFinite(last) ? last : 260;
  }
  private lastPerceptionRadius = 260;

  /** Inflated platform rects, for line-of-sight perception. */
  private occluders() {
    return computePlatformCollisionRects(
      this.board.activePlatforms().filter((platform) => platform.row > 0),
      this.world.playerRadius, this.world.routePlatformPadding,
    );
  }

  /**
   * Ask the learner to climb to a column.
   *
   * In REALISTIC mode the caller has already decided the answer was right; the
   * simulation's job is only routing. A refusal here means the board offered
   * no legal path, which is a real state and is recorded as one rather than
   * being papered over by teleporting the Spark.
   */
  select(column: number, rowDelta: 1 | -1 = 1): boolean {
    if (this.captured || this.learner.moving || this.options.replay) return false;
    const threat = this.options.avoidance ? this.rig.position : null;
    const travel = this.learner.begin(
      column, this.timebase.elapsedMs, threat, this.options.avoidance ?? 0, rowDelta,
    );
    if (!travel) {
      this.pendingRefusal = true;
      this.emit('PLAYER_SELECTION_REFUSED', `no legal route to column ${column}`, { column });
      return false;
    }
    this.recorder.record({
      atMs: this.timebase.elapsedMs, column, path: travel.path, fromRow: this.learner.row,
    });
    this.emit('PLAYER_ROUTE_STARTED', `climbing to column ${column}`, {
      column, points: travel.path.length, lengthUnits: Math.round(travel.total),
    });
    return true;
  }

  /** Advance by one rendered frame's worth of wall-clock. */
  advance(frameMs: number): void {
    for (const dt of this.timebase.drain(frameMs)) this.step(dt);
  }

  /** ONE fixed simulation step. Everything deterministic happens here. */
  step(dtMs: number): void {
    if (this.captured) return;
    this.timebase.commit(dtMs);

    // ── replay: start the next recorded walk when its moment arrives ─────
    const replay = this.options.replay;
    if (replay && !this.learner.moving && this.replayIndex < replay.selections.length) {
      const next = replay.selections[this.replayIndex];
      if (this.timebase.elapsedMs >= next.atMs) {
        this.board.ensureRows(this.learner.row);
        const destinationRow = this.board.getRow(this.learner.row + 1);
        const destination = destinationRow?.platforms[next.column];
        if (destination) {
          this.learner.follow(next.path, destination, next.column, this.timebase.elapsedMs);
          this.emit('PLAYER_ROUTE_STARTED', `replaying selection ${this.replayIndex}`, {
            column: next.column, index: this.replayIndex,
          });
        }
        this.replayIndex += 1;
      }
    }

    // ── learner ─────────────────────────────────────────────────────────
    const arrived = this.learner.advance(dtMs);
    this.trail.observe({ x: this.learner.x, y: this.learner.y }, this.timebase.elapsedMs);
    if (arrived) {
      this.emit('PLAYER_ROUTE_COMPLETED', `landed on row ${this.learner.row}`, { row: this.learner.row });
    }
    this.board.ensureRows(this.learner.row);

    // ── pursuer ─────────────────────────────────────────────────────────
    const before = { ...this.rig.position };
    const tick = this.rig.tick({
      dtMs,
      learner: { x: this.learner.x, y: this.learner.y, row: this.learner.row },
      trail: this.trail.snapshot(this.timebase.elapsedMs),
      occluders: this.occluders(),
      world: this.world,
      rowCount: Math.max(this.board.rowCount, this.learner.row + ROWS_AHEAD + 2),
    });

    this.lastPerceptionRadius = tick.observation.perception.directRadius;
    this.observe(tick, before, dtMs);

    // ── capture: adjudicated here, by the simulation, and nowhere else ──
    const distance = Math.hypot(this.learner.x - tick.position.x, this.learner.y - tick.position.y);
    const captureRange = tick.radius + this.world.playerRadius;
    if (distance <= captureRange) {
      if (!this.previous.inCaptureRange) {
        this.emit('CAPTURE_RANGE_ENTERED', `within ${captureRange.toFixed(0)}u`, { distance: Math.round(distance) });
        this.previous.inCaptureRange = true;
      }
      if (this.options.captureArmed !== false) {
        this.captured = true;
        this.capturedAtMs = this.timebase.elapsedMs;
        this.emit('CAPTURE', tick.decision.reasonCode, {
          mode: tick.decision.mode, commitment: tick.decision.commitmentId,
        });
      }
    } else {
      if (this.previous.inCaptureRange) {
        this.previous.inCaptureRange = false;
        this.emit('CAPTURE_RANGE_EXITED', `${distance.toFixed(0)}u`, { distance: Math.round(distance) });
      }
      // Edge-triggered, like the range events. A per-tick NEAR_CONTACT would
      // bury the timeline it is supposed to make readable.
      const near = distance <= captureRange * 2.5;
      if (near && !this.previous.near) {
        this.emit('NEAR_CONTACT', `came within ${distance.toFixed(0)}u without contact`, { distance: Math.round(distance) });
      }
      this.previous.near = near;
    }
  }

  /**
   * Turn one tick into events and, every `SAMPLE_EVERY_TICKS`, a full sample.
   *
   * Events are emitted on CHANGE, so the timeline is readable; samples are
   * emitted on a cadence, so the trace is complete. Both always carry the
   * pursuer.
   */
  private observe(tick: RigTick, before: { x: number; y: number }, dtMs: number): void {
    const decision = tick.decision;
    const perception = tick.observation.perception;
    const nowPerceived = perception.directContact !== null;
    const distance = Math.hypot(this.learner.x - tick.position.x, this.learner.y - tick.position.y);
    const graphDistance = this.rig.graphDistanceTo({ x: this.learner.x, y: this.learner.y });

    if (nowPerceived !== this.previous.perception) {
      this.emit(nowPerceived ? 'DIRECT_PERCEPTION_ACQUIRED' : 'DIRECT_PERCEPTION_LOST',
        nowPerceived ? `at ${distance.toFixed(0)}u` : `last seen ${distance.toFixed(0)}u away`,
        { distance: Math.round(distance) });
      this.previous.perception = nowPerceived;
    }

    for (const fragment of perception.trailFragments) {
      if (!this.previous.fragmentIds.has(fragment.id)) {
        this.previous.fragmentIds.add(fragment.id);
        this.emit('TRAIL_EVIDENCE_ACQUIRED', `fragment ${fragment.id}`, { fragment: fragment.id });
      }
    }

    if (decision.mode !== this.previous.mode) {
      this.emit('MODE_CHANGED', `${this.previous.mode || 'start'} -> ${decision.mode}: ${decision.reasonCode}`,
        { from: this.previous.mode || null, to: decision.mode, reason: decision.reasonCode });
      this.previous.mode = decision.mode;
    }

    if (decision.commitmentId !== this.previous.commitment) {
      if (this.previous.commitment) {
        this.emit('COMMITMENT_ENDED', decision.reasonCode, { commitment: this.previous.commitment });
      }
      this.emit('COMMITMENT_STARTED', decision.explanation, { commitment: decision.commitmentId });
      this.previous.commitment = decision.commitmentId;
    }

    const targetPoint = decision.target.kind === 'NODE'
      ? tick.observation.graph.nodes.get(decision.target.node) ?? null
      : decision.target.point;
    const targetKey = targetPoint ? `${targetPoint.x.toFixed(1)},${targetPoint.y.toFixed(1)}` : 'none';
    const targetChanged = targetKey !== this.previous.target;
    this.previous.target = targetKey;
    // The EVENT fires on a navigationally meaningful change — the node the
    // chassis was actually re-commanded to. Chasing a moving learner moves the
    // target point every tick by definition, and an event per tick would bury
    // the timeline this is supposed to make readable. The fine-grained change
    // is still recorded on every sample.
    if (tick.commandedNode && tick.commandedNode !== this.previous.commandedNode) {
      this.emit('STRATEGIC_TARGET_CHANGED', decision.reasonCode, {
        node: tick.commandedNode, target: targetKey, confidence: decision.confidence,
      });
      this.previous.commandedNode = tick.commandedNode;
    }

    const routeKey = tick.routeNodes.join('>');
    if (routeKey !== this.previous.routeKey) {
      this.emit('NAVIGATION_ROUTE_CHANGED', `${tick.routeNodes.length} nodes`, { route: routeKey || null });
      this.previous.routeKey = routeKey;
    }

    if (tick.cadencePhase !== this.previous.cadence) {
      this.emit(tick.cadencePhase === 'HESITATING' ? 'CADENCE_PAUSE_STARTED' : 'CADENCE_PAUSE_ENDED', 'cadence');
      this.previous.cadence = tick.cadencePhase;
    }

    // ── direction reversal, classified rather than merely counted ───────
    const direction = { x: tick.position.x - before.x, y: tick.position.y - before.y };
    const moved = Math.hypot(direction.x, direction.y) > 1e-6;
    const previousDirection = this.previous.direction;
    const wasMoving = Math.hypot(previousDirection.x, previousDirection.y) > 1e-6;
    let reversal = false;
    if (moved && wasMoving) {
      const dot = direction.x * previousDirection.x + direction.y * previousDirection.y;
      if (dot < 0) {
        // A reversal that REDUCES the legal graph distance is the route doing
        // its job — the board is corridors, and going around is not going
        // wrong. Only a reversal that also loses legal ground is a candidate
        // for the human's "travels in the opposite direction" complaint.
        const lostGround = this.previous.graphDistance !== null && graphDistance !== null
          && graphDistance > this.previous.graphDistance;
        reversal = lostGround;
        this.emit(lostGround ? 'TRUE_DIRECTION_REVERSAL' : 'EXPECTED_ROUTE_DETOUR',
          lostGround
            ? `turned back and lost ${(graphDistance! - this.previous.graphDistance!).toFixed(0)}u of legal ground`
            : 'turned back, but the legal route is still closing',
          { reason: decision.reasonCode, mode: decision.mode });
      }
    }
    if (moved) this.previous.direction = direction;

    const closed = this.previous.graphDistance !== null && graphDistance !== null
      && graphDistance < this.previous.graphDistance;

    if (this.timebase.tickCount % SAMPLE_EVERY_TICKS === 0) {
      const belief = this.rig.brain.inspect?.().belief ?? [];
      this.samples.push({
        tMs: this.timebase.elapsedMs,
        tick: this.timebase.tickCount,
        learner: { x: this.learner.x, y: this.learner.y, row: this.learner.row, moving: this.learner.moving },
        pursuer: {
          x: tick.position.x, y: tick.position.y,
          vx: direction.x / dtMs, vy: direction.y / dtMs,
          node: tick.observation.self.node,
          edge: tick.observation.self.edge,
          direction,
          cadencePhase: tick.cadencePhase,
          brainId: this.options.brain.id,
          perceptionModelId: perception.modelId,
          perceptionActive: nowPerceived,
          perceptionLive: perception.directContact?.live ?? false,
          mode: decision.mode,
          modeLabel: decision.modeLabel ?? decision.mode,
          commitmentId: decision.commitmentId,
          reasonCode: decision.reasonCode,
          confidence: decision.confidence,
          explanation: decision.explanation,
          target: targetPoint ? { x: targetPoint.x, y: targetPoint.y } : null,
          targetNode: decision.target.kind === 'NODE' ? decision.target.node : null,
          routeNodes: tick.routeNodes,
          beliefNodes: belief.map((entry) => entry.node),
          distanceToLearner: distance,
          graphDistanceToLearner: graphDistance,
          distanceToTarget: targetPoint
            ? Math.hypot(targetPoint.x - tick.position.x, targetPoint.y - tick.position.y) : null,
          closedUsefulDistance: closed,
          moved,
          reversal,
          targetChanged,
          modeChanged: decision.mode !== this.previous.mode,
        },
      });
    }

    this.previous.graphDistance = graphDistance;
  }

  /** Finish a recording of what the learner just did. */
  finishRecording(options: { id: string; label: string; notes?: string; createdAt?: string | null }): RecordedRun {
    return this.recorder.finish({
      ...options,
      framingPercent: this.world.percent,
      speed: ROUTE_SPEED,
      durationMs: this.timebase.elapsedMs,
    });
  }
}
