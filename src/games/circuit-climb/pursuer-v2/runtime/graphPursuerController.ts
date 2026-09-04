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

import {
  GraphPursuerV2, DEFAULT_GRAPH_PURSUER_CONFIG, LANE_BAND_FRACTION, TARGET_EPSILON,
  type GraphEvidence,
} from '../graph/graphPursuerV2';
import { nearestNode } from '../graph/graphRouting';
import { graphActorRadiusFor } from '../graph/graphActorRadius';
import { GroundTruthTrail } from '../contracts/trailRecorder';
import { buildBrainObservation, deriveTrailSenseRadius, SPARK_SENSE_RADIUS } from '../brain/sensors';
import { createBrainState, updateBrain } from '../brain/graphBrainV1';
import type {
  BrainState, BrainEvidence, PursuitIntent, SensedSpark, RunStartOrigin, BrainMode,
} from '../brain/observation';
import { graphWorldChanged, type GraphWorld } from './graphWorld';
import type { PursuitGraph, TrunkId } from '../graph/pursuitGraph';
import {
  ARRIVAL_EPSILON, LOSS_CONFIRMATION_TICKS, ACQUIRE_CONFIRMATION_TICKS,
  TRAIL_EXHAUSTION_CONFIRMATION_TICKS, LEAD_PREEMPTION_CONFIRMATION_TICKS,
  MAX_REMEMBERED_FRAGMENTS,
} from '../brain/graphBrainV1';
import {
  resolveBaselineConfiguration, describeDerivedValues,
  type ResolvedPursuerConfiguration,
} from '../config/resolvePursuerConfiguration';
import type { ResolvedDerivedValues } from '../config/pursuerConfigurationSchema';

/**
 * Connector levels below row 0 the pursuer may start on. The accepted Lab
 * value, carried across unchanged.
 */
export const GROUND_LEVELS = 2;

/**
 * The admitted trunk FURTHEST from the learner's opening column — the accepted
 * Lab spawn rule, applied to the live production graph.
 */
export function spawnTrunkFor(graph: PursuitGraph, learnerStartX: number): TrunkId {
  let best = graph.trunks[0];
  for (const trunk of graph.trunks) {
    if (Math.abs(trunk.x - learnerStartX) > Math.abs(best.x - learnerStartX)) best = trunk;
  }
  return best.id;
}

/**
 * THE FROZEN-LAYER GUARD.
 *
 * `commitment` and `chassis` are behaviour-affecting, carried in every
 * configuration payload for reproducibility, and NOT threaded into the Brain
 * or the chassis — those constants live where they were derived, in
 * `brain/graphBrainV1.ts` and `graph/graphPursuerV2.ts`, and 04C does not
 * reopen the accepted 03A-R2 decision seam to make them adjustable.
 *
 * The hazard that creates is silence: a configuration could name a different
 * confirmation window and the run would ignore it, producing evidence
 * attributed to parameters that were never applied. So the guard is loud
 * instead. The one validator already refuses any deviation from the baseline
 * in these layers; this is the second line, and it catches the case the
 * validator cannot — a caller that legitimately passed `allowFrozenEdits` for
 * a spawn A/B and then changed something this build does not implement.
 *
 * If this ever throws, the fix is to thread the parameter properly, not to
 * relax the check.
 */
function assertFrozenLayersAreImplemented(resolved: ResolvedPursuerConfiguration): void {
  const { commitment, chassis } = resolved.configuration;
  const mismatches: string[] = [];
  const check = (path: string, configured: number, compiled: number) => {
    if (configured !== compiled) mismatches.push(`${path}: configuration says ${configured}, this build runs ${compiled}`);
  };
  check('commitment.lossConfirmationTicks', commitment.lossConfirmationTicks, LOSS_CONFIRMATION_TICKS);
  check('commitment.acquireConfirmationTicks', commitment.acquireConfirmationTicks, ACQUIRE_CONFIRMATION_TICKS);
  check('commitment.trailExhaustionConfirmationTicks', commitment.trailExhaustionConfirmationTicks, TRAIL_EXHAUSTION_CONFIRMATION_TICKS);
  check('commitment.leadPreemptionConfirmationTicks', commitment.leadPreemptionConfirmationTicks, LEAD_PREEMPTION_CONFIRMATION_TICKS);
  check('commitment.maxRememberedFragments', commitment.maxRememberedFragments, MAX_REMEMBERED_FRAGMENTS);
  check('chassis.laneBandFraction', chassis.laneBandFraction, LANE_BAND_FRACTION);
  check('chassis.targetEpsilon', chassis.targetEpsilon, TARGET_EPSILON);
  check('chassis.arrivalEpsilon', chassis.arrivalEpsilon, ARRIVAL_EPSILON);
  if (mismatches.length) {
    throw new Error(
      'This configuration changes values GRAPH_PURSUER_V2 does not yet read, so the run would not '
      + 'be the pursuer the configuration describes:\n  ' + mismatches.join('\n  '),
    );
  }
}

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
   * How the pursuer is placed at the start of a run.
   *
   * `authority` reproduces the accepted Lab spawn: the admitted trunk
   * FURTHEST from the learner's opening column, at the lowest ground level.
   * `integration` is the 04A placement — one row gap directly below the
   * learner — kept only so the reproduction harness can A/B the two.
   */
  spawn?: 'authority' | 'integration';
  /**
   * Whether the chassis may use the safe capture rail to close the last units.
   * Production adjudicates capture itself; this only governs how the actor
   * physically approaches.
   *
   * Superseded by `configuration.spawnCapture.captureRail` when a
   * configuration is supplied; retained for the harness paths that construct a
   * controller without one.
   */
  captureRail?: boolean;
  /**
   * THE configuration this run uses, already validated and frozen.
   *
   * Deliberately a `ResolvedPursuerConfiguration` and not a raw object: the
   * type is only obtainable from `resolvePursuerConfiguration`, so there is no
   * way to hand the pursuer parameters that have not been through the one
   * validator. Omitted means the 04B-R1 authority baseline.
   *
   * Note what this type does NOT carry: any account of why this configuration
   * was selected. The controller cannot branch on the reason because the
   * reason is not reachable from here — see `ConfigurationSelection`, which
   * the diagnostic export reads and this module never imports.
   */
  configuration?: ResolvedPursuerConfiguration;
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
  /** Frozen for the whole run. Replaced only by building a new controller. */
  private readonly resolvedConfiguration: ResolvedPursuerConfiguration;

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
    this.resolvedConfiguration = options.configuration
      ?? resolveBaselineConfiguration({ logicalWidth: options.world.logicalWidth });
    assertFrozenLayersAreImplemented(this.resolvedConfiguration);

    this.pursuer = this.buildPursuer(options.world, options.rowCount, options.learnerStart);
    this.trail = new GroundTruthTrail(
      { x: options.learnerStart.x, y: options.learnerStart.y }, 0, options.world.rowGap,
      this.resolvedConfiguration.configuration.perception.trailRowRetention,
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
    const { locomotion, spawnCapture } = this.resolvedConfiguration.configuration;
    // The configuration is the authority for everything it names. The two
    // legacy option fields below still win where a harness set them
    // explicitly, so the A/B reproduction paths keep working, but nothing in
    // production sets either.
    const groundLevels = this.options.groundLevels ?? spawnCapture.groundLevels;
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
      actorRadius,
      groundLevels,
      captureRail: this.options.captureRail ?? spawnCapture.captureRail,
    };

    const spawnRule = this.options.spawn
      ?? (spawnCapture.spawnRule === 'INTEGRATION_BELOW_LEARNER' ? 'integration' : 'authority');
    if (spawnRule === 'integration') {
      // The rejected 04A placement, retained only for A/B in the harness.
      return new GraphPursuerV2(
        world, rowCount, { x: learnerStart.x, y: learnerStart.y + world.rowGap }, config,
      );
    }

    // AUTHORITY SPAWN. The accepted Lab candidate started on the admitted
    // trunk FURTHEST from the learner's opening column, at the lowest ground
    // level — horizontally distant and below. 04A instead started it one row
    // gap directly beneath the learner, which is a materially different game:
    // the human's first problem was over before it could be read.
    //
    // The mapping is exact rather than approximate. `spawnTrunkFor` reproduces
    // the Lab's own "furthest admitted trunk from the opening column" rule
    // against the LIVE production graph, so it follows the board rather than
    // assuming the Lab's four-trunk geometry.
    const probe = new GraphPursuerV2(world, rowCount, { x: learnerStart.x, y: learnerStart.y }, config);
    const trunk = spawnTrunkFor(probe.graph, learnerStart.x);
    return new GraphPursuerV2(world, rowCount, { trunk, level: -groundLevels }, config);
  }

  get position() { return this.pursuer.position; }
  get radius() { return this.pursuer.radius; }
  get mode(): BrainMode { return this.brainState.mode; }
  get graphExtensionCount() { return this.counters.graphExtensions; }
  get diagnostics() { return { ...this.counters }; }
  get state() { return this.brainState; }
  /** The one configuration this run is using. Frozen; read by the export. */
  get configuration(): ResolvedPursuerConfiguration { return this.resolvedConfiguration; }

  /**
   * The values this run computed for itself rather than being told.
   *
   * `frameMs` is the run's own mean frame time, which the controller cannot
   * know — it is given a `dtMs` per step and has no wall clock. Pass it in from
   * whoever does, and the commitment windows come back in milliseconds. That
   * conversion is the one that explains the 04B report: these windows are
   * counted in frames, so the same configuration reacts in 40% of the
   * wall-clock time on a 144Hz display.
   */
  derivedValues(frameMs?: number | null): ResolvedDerivedValues {
    return describeDerivedValues({
      actorRadius: this.pursuer.radius,
      trailSenseRadius: deriveTrailSenseRadius(this.pursuer.graph),
      trunkCount: this.pursuer.graph.trunks.length,
      frameMs,
      configuration: this.resolvedConfiguration.configuration,
    });
  }

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
    this.trail = new GroundTruthTrail(
      { x: learnerStart.x, y: learnerStart.y }, 0, this.world.rowGap,
      this.resolvedConfiguration.configuration.perception.trailRowRetention,
    );
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
      directSenseRadius: this.resolvedConfiguration.configuration.perception.directSenseRadius,
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
