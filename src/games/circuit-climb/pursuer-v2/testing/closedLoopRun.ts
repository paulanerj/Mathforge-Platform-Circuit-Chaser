/**
 * CLOSED-LOOP REGRESSION RUNNER — PARITY HARNESS. TEST SUPPORT ONLY.
 *
 * Transplanted from Lab f22acf6 `src/sim/closedLoopRun.ts`. The only semantic
 * change: the board now comes from LIVE PRODUCTION GEOMETRY via
 * `productionWorld.ts` instead of the Lab's standalone `sim/framing.ts`
 * reimplementation. Those two agree to the last floating-point bit at every
 * supported framing (`pursuerV2Geometry.test.ts` proves it), which is what
 * makes exact stream-level parity with the accepted Lab behaviour possible
 * rather than merely approximate.
 *
 * ── original header ──
 * CLOSED-LOOP BRAIN REGRESSION RUNNER.
 *
 * The 03A-R1 suite tested Brain transitions against hand-fed observation
 * sequences: the pursuer's position was whatever the test said it was, so the
 * Brain's own target choice could never change what it would sense next. That
 * blind spot let a 19-second live strategic oscillation through a suite of
 * 285 passing tests.
 *
 * This runner closes the loop. Every tick:
 *
 *      Brain intent -> retarget gate -> GraphPursuerV2 route + step
 *          -> new pursuer position -> new sensor geometry
 *              -> next observation -> next Brain intent
 *
 * The pursuer's own chosen target is therefore free to alter its future
 * sensing distance, which is precisely the feedback the defect lives in. The
 * wiring is `sim/brainDriver.ts`, shared verbatim with the live Human
 * Sandbox, so a regression here is a regression of the real product path.
 *
 * The metrics it reports are the PM's own pathology list: strategic mode
 * transitions separated from RAW sensor edges (raw perception is allowed to
 * flutter; strategic intent is not), episode-duration histograms, target
 * reversals, same-node dwell, and A->B->A cycle density per two-second
 * window.
 */

import { productionGraphWorldAt, type GraphWorld } from './productionWorld';
import { GraphPursuerV2, DEFAULT_GRAPH_PURSUER_CONFIG } from '../graph/graphPursuerV2';
import type { TrunkId } from '../graph/pursuitGraph';
import { solveGraphActorRadius } from '../graph/graphActorRadius';
import { GroundTruthTrail } from '../contracts/trailRecorder';
import { createBrainDriver, driveBrainOnce } from './brainDriver';
import type {
  BrainState, BrainEvidence, BrainObservation, RunStartOrigin,
} from '../brain/observation';

export interface ClosedLoopOptions {
  framingPercent?: number;
  rowCount?: number;
  groundLevels?: number;
  dtMs?: number;
  frames: number;
  /** The learner's physical position over time. A constant function is a stationary Spark. */
  learnerAt: (tMs: number) => { x: number; y: number };
  pursuerStart: { x: number; y: number } | { trunk: TrunkId; level: number };
  /**
   * Physical path already walked before the loop opens, fed to the ground
   * truth trail in order. This is how a terminal-condition reproduction gets
   * the trail evidence the human run actually had.
   */
  priorTrail?: Array<{ x: number; y: number; tMs: number }>;
  startTMs?: number;
  captureRail?: boolean;
  /**
   * Per-tick diagnostic hook. Receives the Brain's own post-tick state and
   * this tick's evidence, so a regression can assert on the commitment layer
   * itself rather than only on its downstream symptoms.
   */
  onTick?: (info: {
    frame: number;
    tMs: number;
    brainState: BrainState;
    evidence: BrainEvidence;
    observation: BrainObservation;
    pursuerPosition: { x: number; y: number };
  }) => void;
}

export interface ClosedLoopSample {
  frame: number;
  tMs: number;
  mode: string;
  targetSource: string;
  projectedNode: string;
  pursuerX: number;
  pursuerY: number;
  pursuerNode: string;
  /** RAW perception this tick — allowed to flutter. */
  rawSensed: boolean;
  /** True on ticks a fragment id never seen before was sensed. */
  newFragmentEvidence: boolean;
  /** DIAGNOSTIC_HIDDEN_TRUTH_NOT_BRAIN_INPUT. */
  distanceToLearner: number;
  retargeted: boolean;
  /** Strategic-commitment telemetry, reported alongside (never instead of) raw perception. */
  commitmentEndReason: string | null;
  commitmentHeld: boolean;
  commitmentAgeMs: number;
  trailLeadConsumed: boolean;
  sensedFragmentCount: number;
}

export interface ClosedLoopMetrics {
  frames: number;
  durationMs: number;
  /** Strategic mode changes. The number that must stay small. */
  modeTransitions: number;
  /** RAW sensor bit toggles. Allowed to be large; never hidden. */
  rawDirectSensorEdges: number;
  /** Strategic entries into VISIBLE_PURSUIT. */
  strategicDirectAcquisitions: number;
  /** Strategic exits from VISIBLE_PURSUIT. */
  confirmedDirectLosses: number;
  /** Re-entries into VISIBLE_PURSUIT after a previous confirmed loss. */
  stableReacquisitions: number;
  /** Strategic episodes that lasted exactly one tick. */
  oneTickModeEpisodes: number;
  /** Strategic episodes of 60ms or less. */
  episodesUnder60ms: number;
  /** Commanded-node A -> B -> A reversals. */
  targetReversals: number;
  /** Longest unbroken run of frames on the same graph node. */
  maxSameNodeDwellFrames: number;
  /** Longest stretch with no new fragment id and no stable reacquisition. */
  maxMsWithoutNewEvidence: number;
  /** Worst A->B->A strategic cycle count inside any 2-second window. */
  maxABACyclesIn2s: number;
  /**
   * Worst REDUNDANT mode revisits inside any 2-second window carrying no new
   * evidence — transitions beyond the minimum needed to visit each mode once.
   *
   * `maxABACyclesIn2s` is the PM's stated gate, but it only sees two-mode
   * reversals. The R2 work surfaced a THREE-mode limit cycle (TRAIL_TRACK ->
   * GRAPH_SEARCH -> VISIBLE_PURSUIT -> TRAIL_TRACK) that scored ABA=2 while
   * pacing for 1.2 seconds, so this catches a repeating cycle of any length.
   * A healthy window that simply sweeps through modes once scores 0.
   */
  maxRedundantModeRevisitsIn2s: number;
  /** Whether the pursuer ever left the x-band it started oscillating in. */
  pursuerXRange: { min: number; max: number };
  distinctNodesVisited: number;
  finalDistanceToLearner: number;
  minDistanceToLearner: number;
  modeEpisodeMedianMs: number;
}

export interface ClosedLoopResult {
  samples: ClosedLoopSample[];
  metrics: ClosedLoopMetrics;
  brainState: BrainState;
  world: GraphWorld;
  finalPursuer: { x: number; y: number };
}

export function runClosedLoop(options: ClosedLoopOptions): ClosedLoopResult {
  const dtMs = options.dtMs ?? 16.7;
  const percent = options.framingPercent ?? 90;
  const world = productionGraphWorldAt(percent);
  const actorRadius = solveGraphActorRadius(world).chosen;
  const groundLevels = options.groundLevels ?? 2;
  const rowCount = options.rowCount ?? 20;

  const pursuer = new GraphPursuerV2(world, rowCount, options.pursuerStart, {
    ...DEFAULT_GRAPH_PURSUER_CONFIG,
    actorRadius,
    groundLevels,
    captureRail: options.captureRail ?? true,
  });

  let tMs = options.startTMs ?? 0;
  const firstLearner = options.learnerAt(tMs);
  const trailSeed = options.priorTrail && options.priorTrail.length
    ? options.priorTrail[0]
    : { x: firstLearner.x, y: firstLearner.y, tMs: 0 };
  const trail = new GroundTruthTrail({ x: trailSeed.x, y: trailSeed.y }, trailSeed.tMs, world.rowGap);
  for (const point of options.priorTrail ?? []) trail.observe({ x: point.x, y: point.y }, point.tMs);

  const runStartOrigin: RunStartOrigin = Object.freeze({
    x: trailSeed.x, y: trailSeed.y, row: null, tMs: trailSeed.tMs,
  });

  const driver = createBrainDriver();
  let lastGraphEvidence: { node: string; arrived: boolean } | null = null;
  const samples: ClosedLoopSample[] = [];
  const seenFragmentIds = new Set<string>();
  let rawSensedPrevious: boolean | null = null;
  let rawDirectSensorEdges = 0;

  for (let frame = 0; frame < options.frames; frame += 1) {
    tMs += dtMs;
    const learner = options.learnerAt(tMs);
    trail.observe(learner, tMs);

    const result = driveBrainOnce(driver, {
      nowMs: tMs,
      dtMs,
      pursuer,
      lastGraphEvidence,
      hiddenLearnerPosition: learner,
      groundTruthTrail: trail.snapshot(tMs),
      runStartOrigin,
    });

    let newFragmentEvidence = false;
    for (const fragment of result.observation.sensedTrailFragments) {
      if (!seenFragmentIds.has(fragment.id)) { seenFragmentIds.add(fragment.id); newFragmentEvidence = true; }
    }

    const rawSensed = result.observation.sensedSpark !== null;
    if (rawSensedPrevious !== null && rawSensed !== rawSensedPrevious) rawDirectSensorEdges += 1;
    rawSensedPrevious = rawSensed;

    const evidence = pursuer.step(dtMs);
    lastGraphEvidence = { node: evidence.node, arrived: evidence.arrived };
    const position = pursuer.position;

    samples.push({
      frame,
      tMs,
      mode: result.intent.mode,
      targetSource: result.intent.targetSource,
      projectedNode: result.projectedNode,
      pursuerX: position.x,
      pursuerY: position.y,
      pursuerNode: evidence.node,
      rawSensed,
      newFragmentEvidence,
      distanceToLearner: Math.hypot(learner.x - position.x, learner.y - position.y),
      retargeted: result.retargeted,
      commitmentEndReason: result.evidence.commitmentEndReason,
      commitmentHeld: result.evidence.commitmentHeld,
      commitmentAgeMs: result.evidence.commitmentAgeMs,
      trailLeadConsumed: result.evidence.trailLeadConsumedThisTick,
      sensedFragmentCount: result.evidence.sensedFragmentCount,
    });

    options.onTick?.({
      frame,
      tMs,
      brainState: driver.brainState,
      evidence: result.evidence,
      observation: result.observation,
      pursuerPosition: position,
    });
  }

  return {
    samples,
    metrics: measureClosedLoop(samples, rawDirectSensorEdges, dtMs),
    brainState: driver.brainState,
    world,
    finalPursuer: pursuer.position,
  };
}

/** The PM's pathology list, computed from a closed-loop sample stream. */
export function measureClosedLoop(
  samples: readonly ClosedLoopSample[],
  rawDirectSensorEdges: number,
  dtMs: number,
): ClosedLoopMetrics {
  const episodes: Array<{ mode: string; ticks: number; startTMs: number }> = [];
  let modeTransitions = 0;
  let strategicDirectAcquisitions = 0;
  let confirmedDirectLosses = 0;
  let stableReacquisitions = 0;
  let hadAConfirmedLoss = false;
  let targetReversals = 0;
  let maxSameNodeDwellFrames = 0;
  let sameNodeRun = 0;
  let maxMsWithoutNewEvidence = 0;
  let msSinceNewEvidence = 0;

  const commandedHistory: string[] = [];
  const nodesVisited = new Set<string>();
  let minDistance = Infinity;
  let xMin = Infinity;
  let xMax = -Infinity;

  samples.forEach((sample, index) => {
    const previous = index > 0 ? samples[index - 1] : null;

    if (previous && sample.mode !== previous.mode) {
      modeTransitions += 1;
      episodes.push({ mode: previous.mode, ticks: 0, startTMs: previous.tMs });
      if (sample.mode === 'VISIBLE_PURSUIT') {
        strategicDirectAcquisitions += 1;
        if (hadAConfirmedLoss) stableReacquisitions += 1;
      }
      if (previous.mode === 'VISIBLE_PURSUIT') {
        confirmedDirectLosses += 1;
        hadAConfirmedLoss = true;
      }
    } else if (!previous && sample.mode === 'VISIBLE_PURSUIT') {
      strategicDirectAcquisitions += 1;
    }

    if (previous && sample.pursuerNode === previous.pursuerNode) sameNodeRun += 1;
    else sameNodeRun = 1;
    maxSameNodeDwellFrames = Math.max(maxSameNodeDwellFrames, sameNodeRun);

    if (!previous || sample.projectedNode !== previous.projectedNode) {
      commandedHistory.push(sample.projectedNode);
      const n = commandedHistory.length;
      if (n >= 3 && commandedHistory[n - 1] === commandedHistory[n - 3]) targetReversals += 1;
    }

    if (sample.newFragmentEvidence) msSinceNewEvidence = 0;
    else msSinceNewEvidence += dtMs;
    maxMsWithoutNewEvidence = Math.max(maxMsWithoutNewEvidence, msSinceNewEvidence);

    nodesVisited.add(sample.pursuerNode);
    minDistance = Math.min(minDistance, sample.distanceToLearner);
    xMin = Math.min(xMin, sample.pursuerX);
    xMax = Math.max(xMax, sample.pursuerX);
  });

  // Episode durations, measured between strategic transitions.
  const episodeMs: number[] = [];
  let episodeStart = samples.length ? samples[0].tMs : 0;
  samples.forEach((sample, index) => {
    const previous = index > 0 ? samples[index - 1] : null;
    if (previous && sample.mode !== previous.mode) {
      episodeMs.push(sample.tMs - episodeStart);
      episodeStart = sample.tMs;
    }
  });
  const oneTickModeEpisodes = episodeMs.filter((ms) => ms <= dtMs + 1e-6).length;
  const episodesUnder60ms = episodeMs.filter((ms) => ms <= 60).length;
  const sortedEpisodes = [...episodeMs].sort((a, b) => a - b);
  const modeEpisodeMedianMs = sortedEpisodes.length
    ? sortedEpisodes[Math.floor(sortedEpisodes.length / 2)] : 0;

  return {
    frames: samples.length,
    durationMs: samples.length ? samples[samples.length - 1].tMs - samples[0].tMs : 0,
    modeTransitions,
    rawDirectSensorEdges,
    strategicDirectAcquisitions,
    confirmedDirectLosses,
    stableReacquisitions,
    oneTickModeEpisodes,
    episodesUnder60ms,
    targetReversals,
    maxSameNodeDwellFrames,
    maxMsWithoutNewEvidence,
    maxABACyclesIn2s: worstABACycleDensity(samples, 2000),
    maxRedundantModeRevisitsIn2s: worstRedundantModeRevisits(samples, 2000),
    pursuerXRange: { min: xMin, max: xMax },
    distinctNodesVisited: nodesVisited.size,
    finalDistanceToLearner: samples.length ? samples[samples.length - 1].distanceToLearner : 0,
    minDistanceToLearner: minDistance === Infinity ? 0 : minDistance,
    modeEpisodeMedianMs,
  };
}

/**
 * The PM's pathology gate: how many A->B->A strategic cycles occur inside the
 * worst window of `windowMs`, counting only windows in which NO genuinely new
 * evidence arrived. A stationary Spark with nothing new to learn must not
 * make the Brain reverse itself repeatedly.
 */
export function worstABACycleDensity(samples: readonly ClosedLoopSample[], windowMs: number): number {
  const transitions: Array<{ tMs: number; from: string; to: string }> = [];
  samples.forEach((sample, index) => {
    if (index === 0) return;
    const previous = samples[index - 1];
    if (sample.mode !== previous.mode) transitions.push({ tMs: sample.tMs, from: previous.mode, to: sample.mode });
  });

  let worst = 0;
  for (let start = 0; start < transitions.length; start += 1) {
    const windowStart = transitions[start].tMs;
    const windowEnd = windowStart + windowMs;
    const inWindow = transitions.filter((t) => t.tMs >= windowStart && t.tMs <= windowEnd);

    const sawNewEvidence = samples.some(
      (s) => s.tMs >= windowStart && s.tMs <= windowEnd && s.newFragmentEvidence,
    );
    if (sawNewEvidence) continue;

    let cycles = 0;
    for (let i = 0; i + 1 < inWindow.length; i += 1) {
      // A -> B followed by B -> A is one complete reversal cycle.
      if (inWindow[i].to === inWindow[i + 1].from && inWindow[i].from === inWindow[i + 1].to) cycles += 1;
    }
    worst = Math.max(worst, cycles);
  }
  return worst;
}

/**
 * Cycle detection that does not assume the cycle has length two.
 *
 * Inside each window that saw NO new fragment evidence, a Brain that changed
 * its mind for good reasons visits each mode at most once, needing
 * (distinct modes - 1) transitions. Everything beyond that is the Brain
 * returning to a mode it had already left with nothing new to justify it.
 */
export function worstRedundantModeRevisits(samples: readonly ClosedLoopSample[], windowMs: number): number {
  const transitions: Array<{ tMs: number; to: string; from: string }> = [];
  samples.forEach((sample, index) => {
    if (index === 0) return;
    const previous = samples[index - 1];
    if (sample.mode !== previous.mode) transitions.push({ tMs: sample.tMs, from: previous.mode, to: sample.mode });
  });

  let worst = 0;
  for (let start = 0; start < transitions.length; start += 1) {
    const windowStart = transitions[start].tMs;
    const windowEnd = windowStart + windowMs;
    const inWindow = transitions.filter((t) => t.tMs >= windowStart && t.tMs <= windowEnd);
    if (!inWindow.length) continue;

    const sawNewEvidence = samples.some(
      (s) => s.tMs >= windowStart && s.tMs <= windowEnd && s.newFragmentEvidence,
    );
    if (sawNewEvidence) continue;

    const distinct = new Set<string>([inWindow[0].from, ...inWindow.map((t) => t.to)]);
    worst = Math.max(worst, inWindow.length - (distinct.size - 1));
  }
  return worst;
}
