/**
 * NEW PRODUCTION WIRING — GRAPH_PURSUER_V2 as a production pursuer.
 *
 * This is the LAB's `sim/brainDriver.ts` grown up into a production
 * controller. The decision seam it wraps is unchanged and transplanted
 * verbatim; what is new here is everything a real game needs and a lab
 * harness did not: building the graph from live geometry, extending it as the
 * learner climbs, recording the learner's real traversal as trail evidence,
 * and surviving pause and restart.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE FIREWALL, RESTATED FOR PRODUCTION
 *
 * The Lab proved its Brain non-omniscient against a lab observation. That
 * proof does NOT transfer by itself: in production the runtime holds a
 * `player` object that knows its destination platform, whether the pending
 * answer is correct, the route it is going to walk, and how far the pursuer
 * is from catching it. Any of those reaching the Brain would make the
 * acceptance evidence meaningless.
 *
 * So this controller takes a deliberately impoverished input —
 * `LearnerPhysicalState` — carrying position, the row that height corresponds
 * to, and whether the learner is currently moving. There is no field for a
 * destination, a route, correctness, a math target, or a capture distance;
 * not "those are left unset", there is nowhere to put them. The runtime
 * cannot pass what the type will not carry, and `pursuerV2Firewall.test.ts`
 * checks that by walking this module's real transitive imports.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { GraphPursuerV2, DEFAULT_GRAPH_PURSUER_CONFIG, type GraphEvidence } from '../graph/graphPursuerV2';
import { nearestNode } from '../graph/graphRouting';
import { graphActorRadiusFor } from '../graph/graphActorRadius';
import { GroundTruthTrail } from '../contracts/trailRecorder';
import { buildBrainObservation, SPARK_SENSE_RADIUS } from '../brain/sensors';
import { createBrainState, updateBrain } from '../brain/graphBrainV1';
import type {
  BrainState, BrainEvidence, PursuitIntent, SensedSpark, RunStartOrigin, BrainMode,
} from '../brain/observation';
import { graphWorldChanged, type GraphWorld } from './graphWorld';

/**
 * EVERYTHING the controller is allowed to know about the learner.
 *
 * Physical presence only. See the firewall note above: this type is the
 * production firewall, and it is narrow on purpose.
 */
export interface LearnerPhysicalState {
  x: number;
  y: number;
  /** Row index this height corresponds to. Board topology, not intent. */
  row: number;
  /** Whether the learner is physically in motion. Not WHERE it is going. */
  moving: boolean;
}

export interface GraphPursuerControllerOptions {
  world: GraphWorld;
  /** Rows the board currently has, so the graph can span them. */
  rowCount: number;
  /** Where the learner physically starts — the one-time run-start cue. */
  learnerStart: { x: number; y: number; row: number };
  /** Connector levels below row 0, so the pursuer can start beneath the learner. */
  groundLevels?: number;
  /**
   * Whether the chassis may use the safe capture rail to close the last units.
   * Production adjudicates capture itself; this only governs how the actor
   * physically approaches.
   */
  captureRail?: boolean;
}

/** One frame of controller output, for rendering, logging and capture tests. */
export interface GraphPursuerFrame {
  x: number;
  y: number;
  radius: number;
  mode: BrainMode;
  intent: PursuitIntent;
  evidence: BrainEvidence;
  graph: GraphEvidence;
  /** The node the chassis was actually commanded to, when it was re-targeted. */
  commandedNode: string | null;
  retargeted: boolean;
  /** False only when the graph could not route to the commanded node. */
  routeFound: boolean | null;
  /** Wake path for presentation. Presentation only — no decision reads it. */
  wakePath: readonly { x: number; y: number }[];
  /** True on frames the chassis changed travel axis, for the existing turn seam. */
  turnEvent: boolean;
  graphExtended: boolean;
}

export class GraphPursuerController {
  readonly kind = 'GRAPH_PURSUER_V2' as const;

  private pursuer: GraphPursuerV2;
  private trail: GroundTruthTrail;
  private brainState: BrainState;
  private previousSensedSpark: SensedSpark | null = null;
  private lastCommandedNode: string | null = null;
  private lastGraphEvidence: { node: string; arrived: boolean } | null = null;
  private runStartOrigin: RunStartOrigin;
  private world: GraphWorld;
  private tMs = 0;
  private rowCount: number;
  private options: GraphPursuerControllerOptions;

  /** Diagnostic counters. Read by the debug export; no decision reads them. */
  private counters = {
    modeChanges: 0,
    commitmentEnds: 0,
    rawSenseAcquired: 0,
    rawSenseLost: 0,
    trailFragmentsDetected: 0,
    graphExtensions: 0,
    targetChanges: 0,
    lostRoutes: 0,
    diagonalFrames: 0,
    frames: 0,
    /**
     * Longest unbroken run of frames the actor did not move. The legacy
     * pursuer has its own tracer for this; Graph V2 is a different chassis, so
     * it counts its own. Diagnostic only.
     */
    longestStallFrames: 0,
  };
  private stallRun = 0;
  private previousMode: BrainMode | null = null;
  private previousSensedPresent = false;
  private knownFragmentIds = new Set<string>();

  constructor(options: GraphPursuerControllerOptions) {
    this.options = options;
    this.world = options.world;
    this.rowCount = options.rowCount;

    this.pursuer = this.buildPursuer(options.world, options.rowCount, options.learnerStart);
    this.trail = new GroundTruthTrail(
      { x: options.learnerStart.x, y: options.learnerStart.y }, 0, options.world.rowGap,
    );
    this.brainState = createBrainState();
    this.runStartOrigin = Object.freeze({
      x: options.learnerStart.x,
      y: options.learnerStart.y,
      row: options.learnerStart.row,
      tMs: 0,
    });
  }

  private buildPursuer(world: GraphWorld, rowCount: number, learnerStart: { x: number; y: number }) {
    const actorRadius = graphActorRadiusFor(world);
    return new GraphPursuerV2(
      world,
      rowCount,
      // Start beneath the learner's column, as production's legacy pursuer
      // does — the graph resolves this to the nearest real node.
      { x: learnerStart.x, y: learnerStart.y + world.rowGap },
      {
        ...DEFAULT_GRAPH_PURSUER_CONFIG,
        actorRadius,
        groundLevels: this.options.groundLevels ?? 2,
        captureRail: this.options.captureRail ?? true,
      },
    );
  }

  get position() { return this.pursuer.position; }
  get radius() { return this.pursuer.radius; }
  get mode(): BrainMode { return this.brainState.mode; }
  get graphExtensionCount() { return this.counters.graphExtensions; }
  get diagnostics() { return { ...this.counters }; }
  get state() { return this.brainState; }

  /**
   * RESTART. Everything the accepted contract says must not survive a run:
   * position, Brain memory, the consumed-trail watermark, the search episode,
   * the strategic commitment, sensor confirmation counters, cadence, wake and
   * the trail itself. Implemented by rebuilding rather than by resetting
   * fields one at a time — a field added later cannot be forgotten here.
   */
  restart(learnerStart: { x: number; y: number; row: number }, world?: GraphWorld, rowCount?: number) {
    if (world) this.world = world;
    if (rowCount !== undefined) this.rowCount = rowCount;
    this.options = { ...this.options, learnerStart };
    this.pursuer = this.buildPursuer(this.world, this.rowCount, learnerStart);
    this.trail = new GroundTruthTrail({ x: learnerStart.x, y: learnerStart.y }, 0, this.world.rowGap);
    this.brainState = createBrainState();
    this.previousSensedSpark = null;
    this.lastCommandedNode = null;
    this.lastGraphEvidence = null;
    this.tMs = 0;
    this.previousMode = null;
    this.previousSensedPresent = false;
    this.knownFragmentIds = new Set();
    this.counters = {
      modeChanges: 0, commitmentEnds: 0, rawSenseAcquired: 0, rawSenseLost: 0,
      trailFragmentsDetected: 0, graphExtensions: 0, targetChanges: 0,
      lostRoutes: 0, diagonalFrames: 0, frames: 0, longestStallFrames: 0,
    };
    this.stallRun = 0;
    this.runStartOrigin = Object.freeze({
      x: learnerStart.x, y: learnerStart.y, row: learnerStart.row, tMs: 0,
    });
  }

  /**
   * ONE FRAME.
   *
   * Not called at all while the game is paused, which is what freezes
   * locomotion, the cadence clock, Brain progression and the wake together:
   * the controller has no wall-clock of its own, only the `dtMs` the runtime
   * chooses to give it.
   */
  step(dtMs: number, learner: LearnerPhysicalState, liveWorld: GraphWorld, rowCount: number): GraphPursuerFrame {
    this.tMs += dtMs;
    this.counters.frames += 1;

    // A view-scale change moves every column and row: the graph the actor is
    // standing on no longer describes the board, so rebuild against the live
    // geometry rather than pursuing on a stale lattice.
    if (graphWorldChanged(this.world, liveWorld)) {
      this.world = liveWorld;
      const previous = this.pursuer.position;
      this.pursuer = this.buildPursuer(liveWorld, rowCount, { x: previous.x, y: previous.y - liveWorld.rowGap });
      this.lastCommandedNode = null;
      this.lastGraphEvidence = null;
    }

    // DYNAMIC EXTENSION. The learner climbs; the graph must span where it has
    // gone, or the frontier has nowhere left to search.
    const extension = this.pursuer.ensureLevelsThrough(Math.max(rowCount, learner.row + 4));
    if (extension.extended) this.counters.graphExtensions += 1;
    this.rowCount = rowCount;

    // The learner's PHYSICAL history. Position only — the recorder infers
    // direction and row transitions from movement, and has no way to be told
    // whether an answer was right.
    this.trail.observe({ x: learner.x, y: learner.y }, this.tMs);

    const before = this.pursuer.position;

    const observation = buildBrainObservation({
      nowMs: this.tMs,
      dtMs,
      pursuerPosition: before,
      pursuerNode: this.lastGraphEvidence
        ? this.lastGraphEvidence.node
        : nearestNode(this.pursuer.graph, before).id,
      pursuerArrivedAtIntent: this.lastGraphEvidence ? this.lastGraphEvidence.arrived : false,
      graph: this.pursuer.graph,
      hiddenLearnerPosition: { x: learner.x, y: learner.y },
      groundTruthTrail: this.trail.snapshot(this.tMs),
      previousSensedSpark: this.previousSensedSpark,
      runStartOrigin: this.runStartOrigin,
    });

    const { state, intent, evidence } = updateBrain(this.brainState, observation);
    this.brainState = state;
    this.previousSensedSpark = observation.sensedSpark;

    // THE RETARGET GATE, transplanted intact. Re-issuing a drifting evidence
    // point every frame would redraw the chassis's entry-leg lane offset every
    // frame and reproduce the on-rails wobble LAB 02A fixed.
    const projectedNode = nearestNode(this.pursuer.graph, intent.targetPoint).id;
    const arrived = this.lastGraphEvidence ? this.lastGraphEvidence.arrived : false;
    const firstTick = this.lastCommandedNode === null;
    let retargeted = false;
    let routeFound: boolean | null = null;
    if (firstTick || projectedNode !== this.lastCommandedNode || arrived) {
      const route = this.pursuer.setTarget(intent.targetPoint);
      this.lastCommandedNode = projectedNode;
      retargeted = true;
      routeFound = route !== null;
      this.counters.targetChanges += 1;
      if (route === null) this.counters.lostRoutes += 1;
    }

    const graphEvidence = this.pursuer.step(dtMs);
    this.lastGraphEvidence = { node: graphEvidence.node, arrived: graphEvidence.arrived };

    const after = this.pursuer.position;
    // Right angles only. Counted rather than assumed, so a regression shows up
    // as evidence instead of as a claim.
    if (Math.abs(after.x - before.x) > 1e-9 && Math.abs(after.y - before.y) > 1e-9) {
      this.counters.diagonalFrames += 1;
    }

    // A frame that moved the actor nowhere. Cadence hesitation makes short
    // runs of these entirely normal; a long one would not be.
    if (Math.hypot(after.x - before.x, after.y - before.y) < 1e-9) {
      this.stallRun += 1;
      this.counters.longestStallFrames = Math.max(this.counters.longestStallFrames, this.stallRun);
    } else {
      this.stallRun = 0;
    }

    // --- diagnostic counters, kept strictly separate from decisions --------
    if (this.previousMode !== null && this.previousMode !== state.mode) this.counters.modeChanges += 1;
    this.previousMode = state.mode;
    if (evidence.commitmentEndReason) this.counters.commitmentEnds += 1;
    const sensedNow = observation.sensedSpark !== null;
    if (sensedNow && !this.previousSensedPresent) this.counters.rawSenseAcquired += 1;
    if (!sensedNow && this.previousSensedPresent) this.counters.rawSenseLost += 1;
    this.previousSensedPresent = sensedNow;
    for (const fragment of observation.sensedTrailFragments) {
      if (!this.knownFragmentIds.has(fragment.id)) {
        this.knownFragmentIds.add(fragment.id);
        this.counters.trailFragmentsDetected += 1;
      }
    }

    return {
      x: after.x,
      y: after.y,
      radius: this.pursuer.radius,
      mode: state.mode,
      intent,
      evidence,
      graph: graphEvidence,
      commandedNode: this.lastCommandedNode,
      retargeted,
      routeFound,
      wakePath: this.pursuer.wakePath,
      turnEvent: graphEvidence.turnEvent,
      graphExtended: extension.extended,
    };
  }
}

export { SPARK_SENSE_RADIUS };
