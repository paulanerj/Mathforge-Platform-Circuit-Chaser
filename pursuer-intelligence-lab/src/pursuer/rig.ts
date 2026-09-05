/**
 * THE PURSUER RIG — the six layers, assembled.
 *
 *   World truth
 *      |                    (only the perception model may see this)
 *      v
 *   PERCEPTION      selectable: P0 / P1 / P2 / P3
 *      |
 *      v
 *   PursuerObservation
 *      |
 *      v
 *   BELIEF + STRATEGY   the Brain. Selectable, and the point of the lab.
 *      |
 *      v
 *   PursuerDecision
 *      |
 *      v
 *   NAVIGATION      Graph V2's chassis: a strategic target becomes a legal
 *      |            right-angled route through the board's corridors.
 *      v
 *   LOCOMOTION      Graph V2's cadence: how much of that route gets walked
 *      |            this tick, in bursts and pauses.
 *      v
 *   PURSUER BODY
 *      |
 *      v
 *   CAPTURE         adjudicated by the SIMULATION, never by the Brain.
 *
 * Navigation and locomotion are shared by every Brain on purpose. Two Brains
 * compared here differ in judgement and not in driving ability, so a
 * difference in how the pursuit FEELS is attributable to the thinking. That
 * also makes the oracle diagnostic meaningful: same chassis, perfect
 * information, and the question "is the chassis the problem?" gets a clean
 * answer.
 */

import { GraphPursuerV2, DEFAULT_GRAPH_PURSUER_CONFIG } from './graph/graphPursuerV2';
import { graphActorRadiusFor } from './graph/graphActorRadius';
import { nearestNode, shortestPath } from './graph/graphRouting';
import type { PursuitGraph, TrunkId } from './graph/pursuitGraph';
import type { PlayerTrail } from './graph/trail';
import type { GraphWorld } from '../world/graphWorld';
import { graphWorldChanged } from '../world/graphWorld';
import type { PursuerBrainDefinition, BrainInstance } from './contract/brain';
import type { PursuerObservation, PerceptionSnapshot, RunStartOrigin } from './contract/observation';
import type { PursuerDecision } from './contract/decision';
import type { PerceptionModelDefinition } from './perception/perceptionModels';

/** Connector levels below row 0, so the pursuer can start beneath the learner. */
export const GROUND_LEVELS = 2;

/** The production spawn rule: the admitted trunk furthest from the opening column. */
export function spawnTrunkFor(graph: PursuitGraph, learnerStartX: number): TrunkId {
  let best = graph.trunks[0];
  for (const trunk of graph.trunks) {
    if (Math.abs(trunk.x - learnerStartX) > Math.abs(best.x - learnerStartX)) best = trunk;
  }
  return best.id;
}

export interface LocomotionConfig {
  speed: number;
  minBurstMs: number;
  maxBurstMs: number;
  minPauseMs: number;
  maxPauseMs: number;
  pauseChance: number;
  cadenceSeed: number;
  laneSeed: number;
}

export const BASELINE_LOCOMOTION: LocomotionConfig = Object.freeze({
  speed: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.speed,
  minBurstMs: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.minBurstMs,
  maxBurstMs: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.maxBurstMs,
  minPauseMs: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.minPauseMs,
  maxPauseMs: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.maxPauseMs,
  pauseChance: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.pauseChance,
  cadenceSeed: DEFAULT_GRAPH_PURSUER_CONFIG.cadence.seed,
  laneSeed: DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed,
});

export interface RigOptions {
  world: GraphWorld;
  rowCount: number;
  learnerStart: { x: number; y: number; row: number };
  brain: PursuerBrainDefinition;
  brainConfig?: any;
  perception: PerceptionModelDefinition;
  perceptionConfig?: any;
  locomotion?: LocomotionConfig;
  groundLevels?: number;
  captureRail?: boolean;
  /**
   * DIAGNOSTIC PLACEMENT. Start the body at a given point instead of at the
   * production spawn.
   *
   * Fixtures need this — "put the pursuer 150 units from a stationary learner
   * and see what it does" cannot be arranged by playing normally, and that is
   * exactly the situation the human described. It is never used by the
   * playable sandbox, and any run that sets it is marked, because a pursuer
   * that began somewhere a real run could not have put it is not evidence
   * about a real run.
   */
  pursuerStart?: { x: number; y: number } | null;
}

/** Everything one tick of the pursuer produced. */
export interface RigTick {
  observation: PursuerObservation;
  decision: PursuerDecision;
  /** The node the chassis was actually commanded to, when it was re-targeted. */
  commandedNode: string | null;
  retargeted: boolean;
  /** False only when the graph could not route to the commanded target. */
  routeFound: boolean | null;
  routeNodes: readonly string[];
  turnEvent: boolean;
  graphExtended: boolean;
  position: { x: number; y: number };
  radius: number;
  wakePath: readonly { x: number; y: number }[];
  cadencePhase: 'MOVING' | 'HESITATING';
  stepDistance: number;
}

export class PursuerRig {
  private body: GraphPursuerV2;
  private brainInstance: BrainInstance;
  private world: GraphWorld;
  private rowCount: number;
  private tMs = 0;
  private tickIndex = 0;
  private runStartOrigin: RunStartOrigin;
  private previousPerception: PerceptionSnapshot | null = null;
  private lastCommandedNode: string | null = null;
  private lastPosition = { x: 0, y: 0 };
  private lastGraph: { node: string; arrived: boolean } | null = null;

  constructor(private options: RigOptions) {
    this.world = options.world;
    this.rowCount = options.rowCount;
    this.body = this.buildBody(options.world, options.rowCount, options.learnerStart);
    this.brainInstance = options.brain.create(options.brainConfig ?? options.brain.defaultConfig);
    this.runStartOrigin = Object.freeze({
      x: options.learnerStart.x, y: options.learnerStart.y, row: options.learnerStart.row, tMs: 0,
    });
    this.lastPosition = { ...this.body.position };
  }

  get position() { return this.body.position; }
  get radius() { return this.body.radius; }
  get graph() { return this.body.graph; }
  get brain() { return this.brainInstance; }
  get elapsedMs() { return this.tMs; }

  private buildBody(world: GraphWorld, rowCount: number, learnerStart: { x: number; y: number }) {
    const locomotion = this.options.locomotion ?? BASELINE_LOCOMOTION;
    const groundLevels = this.options.groundLevels ?? GROUND_LEVELS;
    const config = {
      ...DEFAULT_GRAPH_PURSUER_CONFIG,
      cadence: {
        speed: locomotion.speed,
        minBurstMs: locomotion.minBurstMs,
        maxBurstMs: locomotion.maxBurstMs,
        minPauseMs: locomotion.minPauseMs,
        maxPauseMs: locomotion.maxPauseMs,
        pauseChance: locomotion.pauseChance,
        seed: locomotion.cadenceSeed,
      },
      laneSeed: locomotion.laneSeed,
      actorRadius: graphActorRadiusFor(world),
      groundLevels,
      captureRail: this.options.captureRail ?? true,
    };
    if (this.options.pursuerStart) {
      // Diagnostic placement. Projected onto the graph by the chassis, so the
      // body still starts somewhere it could legally stand.
      return new GraphPursuerV2(world, rowCount, { ...this.options.pursuerStart }, config);
    }

    // The production spawn: the admitted trunk furthest from the learner's
    // opening column, at the lowest ground level — horizontally distant and
    // below. A probe body is built first only to obtain the admitted trunks
    // for this framing, exactly as production does.
    const probe = new GraphPursuerV2(world, rowCount, { x: learnerStart.x, y: learnerStart.y }, config);
    const trunk = spawnTrunkFor(probe.graph, learnerStart.x);
    return new GraphPursuerV2(world, rowCount, { trunk, level: -groundLevels }, config);
  }

  /** Everything a run must not carry into the next one. */
  reset(learnerStart: { x: number; y: number; row: number }, world?: GraphWorld, rowCount?: number) {
    if (world) this.world = world;
    if (rowCount !== undefined) this.rowCount = rowCount;
    this.body = this.buildBody(this.world, this.rowCount, learnerStart);
    this.brainInstance.reset();
    this.tMs = 0;
    this.tickIndex = 0;
    this.previousPerception = null;
    this.lastCommandedNode = null;
    this.lastGraph = null;
    this.runStartOrigin = Object.freeze({
      x: learnerStart.x, y: learnerStart.y, row: learnerStart.row, tMs: 0,
    });
    this.lastPosition = { ...this.body.position };
  }

  tick(input: {
    dtMs: number;
    learner: { x: number; y: number; row: number };
    trail: PlayerTrail;
    occluders: ReadonlyArray<{ left: number; right: number; top: number; bottom: number }>;
    world: GraphWorld;
    rowCount: number;
  }): RigTick {
    this.tMs += input.dtMs;
    this.tickIndex += 1;

    // A framing change moves every column and row, so the graph the pursuer is
    // standing on stops describing the board and must be rebuilt.
    if (graphWorldChanged(this.world, input.world)) {
      this.world = input.world;
      const carriedBrain = this.brainInstance;
      const position = this.body.position;
      this.body = this.buildBody(input.world, input.rowCount, position as any);
      this.brainInstance = carriedBrain;
      this.lastCommandedNode = null;
    }
    this.rowCount = input.rowCount;
    const extension = this.body.ensureLevelsThrough(input.rowCount);

    // ── PERCEPTION ───────────────────────────────────────────────────────
    const perception = this.options.perception.perceive({
      nowMs: this.tMs,
      dtMs: input.dtMs,
      pursuerPosition: this.body.position,
      graph: this.body.graph,
      learnerPosition: { x: input.learner.x, y: input.learner.y },
      learnerRow: input.learner.row,
      groundTruthTrail: input.trail,
      occluders: input.occluders,
      previous: this.previousPerception,
    }, this.options.perceptionConfig ?? this.options.perception.defaultConfig);
    this.previousPerception = perception;

    const here = this.body.position;
    const observation: PursuerObservation = {
      nowMs: this.tMs,
      dtMs: input.dtMs,
      tick: this.tickIndex,
      self: {
        x: here.x, y: here.y, radius: this.body.radius,
        node: nearestNode(this.body.graph, here).id,
        edge: this.lastGraph ? this.lastGraph.node : null,
        arrivedAtTarget: this.lastGraph?.arrived ?? false,
        routeNodes: this.body.currentRoute?.nodes ?? [],
        cadencePhase: 'MOVING',
        lastStepDistance: Math.hypot(here.x - this.lastPosition.x, here.y - this.lastPosition.y),
      },
      perception,
      graph: this.body.graph,
      runStartOrigin: this.runStartOrigin,
      ...(perception.oracleTruth
        ? { oracle: { x: input.learner.x, y: input.learner.y, row: input.learner.row } }
        : {}),
    };

    // ── BELIEF + STRATEGY ────────────────────────────────────────────────
    const decision = this.brainInstance.decide(observation);

    // ── NAVIGATION ───────────────────────────────────────────────────────
    // The retarget gate, carried across from production: re-commanding the
    // chassis every tick redraws its entry-leg lane offset every tick, which
    // is visible as jitter and was one source of the sensor-boundary feedback
    // loop. A target is issued on the first tick, when the projected node
    // changes, or when the chassis reports arriving.
    const targetPoint = this.targetPointFor(decision);
    const projected = nearestNode(this.body.graph, targetPoint);
    const arrived = this.lastGraph?.arrived ?? false;
    const retarget = this.lastCommandedNode === null
      || projected.id !== this.lastCommandedNode
      || arrived;

    let routeFound: boolean | null = null;
    if (retarget) {
      const route = this.body.setTarget(targetPoint);
      routeFound = route !== null;
      this.lastCommandedNode = projected.id;
    }

    // ── LOCOMOTION + BODY ────────────────────────────────────────────────
    const before = { ...this.body.position };
    const evidence = this.body.step(input.dtMs);
    const after = this.body.position;
    this.lastPosition = before;
    this.lastGraph = { node: evidence.node, arrived: evidence.arrived };

    return {
      observation, decision,
      commandedNode: retarget ? this.lastCommandedNode : null,
      retargeted: retarget,
      routeFound,
      routeNodes: evidence.routeNodes,
      turnEvent: evidence.turnEvent,
      graphExtended: extension.extended,
      position: { ...after },
      radius: this.body.radius,
      wakePath: this.body.wakePath,
      cadencePhase: evidence.cadenceState,
      stepDistance: Math.hypot(after.x - before.x, after.y - before.y),
    };
  }

  /** A decision target, resolved to a point the chassis can be sent to. */
  private targetPointFor(decision: PursuerDecision): { x: number; y: number } {
    if (decision.target.kind === 'NODE') {
      const node = this.body.graph.nodes.get(decision.target.node);
      if (node) return { x: node.x, y: node.y };
      // A Brain naming a node the graph does not have is a Brain bug, not a
      // reason to stop the game. Standing still is the honest response, and
      // the run record shows the unresolvable target.
      return this.body.position;
    }
    return decision.target.point;
  }

  /**
   * Legal graph route length from the pursuer to a point, in units.
   *
   * This is what "is it actually getting closer?" has to be measured against.
   * Euclidean distance answers a different question: the board is a set of
   * corridors, and a route that opens the straight-line gap while closing the
   * legal one is doing exactly the right thing. Returns null when no route
   * exists at all.
   */
  graphDistanceTo(point: { x: number; y: number }): number | null {
    const from = nearestNode(this.body.graph, this.body.position);
    const to = nearestNode(this.body.graph, point);
    const path = shortestPath(this.body.graph, from.id, to.id);
    if (!path) return null;
    // Manhattan between consecutive nodes, because every legal leg is
    // axis-aligned: the graph has no diagonals, so this is the true walked
    // length rather than an approximation of it.
    let total = Math.abs(this.body.position.x - from.x) + Math.abs(this.body.position.y - from.y);
    for (let i = 1; i < path.length; i += 1) {
      const a = this.body.graph.nodes.get(path[i - 1])!;
      const b = this.body.graph.nodes.get(path[i])!;
      total += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    return total + Math.abs(point.x - to.x) + Math.abs(point.y - to.y);
  }
}
