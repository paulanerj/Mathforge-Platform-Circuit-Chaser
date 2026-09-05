/**
 * WHAT A RUN ACTUALLY DID.
 *
 * These metrics exist to answer the human's complaint, not to score a
 * leaderboard. The complaint is that the pursuit feels blind and accidental:
 *
 *   "it seems to be bumping around with its eyes closed"
 *   "at one point it is right next to the player's Spark but does not attack"
 *   "more like tag where the chaser has its eyes closed and may happen to run
 *    into you by sheer luck"
 *
 * Every number below is a way of asking that question of a trace. None of them
 * is acceptance: a Brain that scores well and still feels stupid has told you
 * the metrics are wrong, not that the tester is. Human ratings are recorded
 * separately and are never blended with these.
 *
 * ── ON MEASURING PROGRESS ───────────────────────────────────────────────
 * Straight-line distance is the wrong yardstick on this board. The world is a
 * set of corridors and the pursuer may only travel legal right-angled legs, so
 * a route that opens the Euclidean gap while closing the legal one is doing
 * exactly the right thing. Everything here that says "closing" means LEGAL
 * GRAPH DISTANCE, and where a Euclidean number is reported it is labelled as
 * such and used only for the threat bands a player actually feels.
 * ────────────────────────────────────────────────────────────────────────
 */

import type { LabSample } from '../../sim/simulation';
import type { LabEvent } from '../../sim/events';

export interface ThreatBands {
  /** Simulation ms spent within each straight-line band of the learner. */
  within100: number;
  within200: number;
  within400: number;
  beyond400: number;
}

export interface RunMetrics {
  brainId: string;
  perceptionModelId: string;
  oracleUsed: boolean;

  durationMs: number;
  captured: boolean;
  captureTimeMs: number | null;

  /** Straight-line, because these are about how close it FELT. */
  averageDistance: number;
  minDistance: number;
  maxDistance: number;
  finalDistance: number;
  threatBands: ThreatBands;

  /** Fraction of the run the learner was directly perceivable. */
  directPerceptionUptime: number;
  reacquisitions: number;
  /** Mean ms from losing perception to regaining it. Null if never regained. */
  meanTimeToReacquireMs: number | null;

  /** Turns that LOST legal ground. Detours that kept closing are excluded. */
  trueReversals: number;
  expectedDetours: number;
  strategicReplans: number;
  routeReplans: number;
  modeChanges: number;

  /**
   * Ms spent ACTUALLY MOVING and not closing, while the learner was perceived.
   *
   * Pauses are excluded and reported separately. The cadence pauses on purpose
   * — 62% of finished bursts are followed by one — so folding stillness into
   * "moving away" would blame the Brain for the locomotion layer's rhythm and
   * would make every candidate look equally bad at it.
   */
  timeMovingAwayWhileVisibleMs: number;
  /** Ms spent deliberately paused while the learner was perceived. */
  timePausedWhileVisibleMs: number;
  /** Ms the body did not move at all. */
  timeIdleMs: number;
  timeSearchingMs: number;
  captureRangeEntriesBeforeCapture: number;

  /** THE CORE INVARIANT (§11): what happens when it can see a still learner. */
  visibleStationary: {
    /** Ms the learner was both perceived and stationary. */
    totalMs: number;
    /** Ms of that spent in DIRECT_PURSUIT. Should be nearly all of it. */
    directPursuitMs: number;
    /** Target revisions during it. Should be low. */
    targetRevisions: number;
    /** True reversals during it. Should be zero. */
    trueReversals: number;
    /** Legal ground closed over it, as a fraction of where it started. */
    graphDistanceClosedFraction: number | null;
    /** Ms from first perceiving the still learner to committing to pursuit. */
    timeToCommitMs: number | null;
  };
}

const isSearch = (mode: string) => mode === 'SEARCH';

export function computeRunMetrics(input: {
  samples: readonly LabSample[];
  events: readonly LabEvent[];
  durationMs: number;
  captured: boolean;
  capturedAtMs: number | null;
}): RunMetrics {
  const { samples, events } = input;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const sampleMs = samples.length > 1 ? samples[1].tMs - samples[0].tMs : 0;

  const distances = samples.map((s) => s.pursuer.distanceToLearner);
  const bands: ThreatBands = { within100: 0, within200: 0, within400: 0, beyond400: 0 };
  for (const distance of distances) {
    if (distance <= 100) bands.within100 += sampleMs;
    else if (distance <= 200) bands.within200 += sampleMs;
    else if (distance <= 400) bands.within400 += sampleMs;
    else bands.beyond400 += sampleMs;
  }

  const perceivedSamples = samples.filter((s) => s.pursuer.perceptionActive).length;

  // Time to reacquire: paired LOST -> ACQUIRED. A loss never followed by an
  // acquisition is excluded rather than counted as zero, because "never found
  // them again" is not a fast reacquisition.
  const gaps: number[] = [];
  let lostAt: number | null = null;
  let reacquisitions = 0;
  for (const event of events) {
    if (event.kind === 'DIRECT_PERCEPTION_LOST') lostAt = event.tMs;
    else if (event.kind === 'DIRECT_PERCEPTION_ACQUIRED' && lostAt !== null) {
      gaps.push(event.tMs - lostAt);
      reacquisitions += 1;
      lostAt = null;
    }
  }

  let movingAwayWhileVisible = 0;
  let pausedWhileVisible = 0;
  let idle = 0;
  let searching = 0;
  for (const sample of samples) {
    if (sample.pursuer.perceptionActive) {
      if (!sample.pursuer.moved) pausedWhileVisible += sampleMs;
      else if (!sample.pursuer.closedUsefulDistance) movingAwayWhileVisible += sampleMs;
    }
    if (!sample.pursuer.moved) idle += sampleMs;
    if (isSearch(sample.pursuer.mode)) searching += sampleMs;
  }

  // ── the core invariant window ───────────────────────────────────────────
  const window = samples.filter((s) => s.pursuer.perceptionActive && !s.learner.moving);
  let directPursuitMs = 0;
  let windowTargetRevisions = 0;
  let windowReversals = 0;
  let previousTarget: string | null = null;
  for (const sample of window) {
    if (sample.pursuer.mode === 'DIRECT_PURSUIT') directPursuitMs += sampleMs;
    if (sample.pursuer.reversal) windowReversals += 1;
    const key = sample.pursuer.targetNode
      ?? (sample.pursuer.target ? `${Math.round(sample.pursuer.target.x / 8)},${Math.round(sample.pursuer.target.y / 8)}` : 'none');
    if (previousTarget !== null && key !== previousTarget) windowTargetRevisions += 1;
    previousTarget = key;
  }
  const windowStart = window[0]?.pursuer.graphDistanceToLearner ?? null;
  const windowEnd = window[window.length - 1]?.pursuer.graphDistanceToLearner ?? null;

  // Time from first perceiving a stationary learner to actually committing to
  // direct pursuit. This is the number behind "it is right next to the Spark
  // but does not attack".
  let timeToCommit: number | null = null;
  if (window.length) {
    const start = window[0].tMs;
    const committed = window.find((s) => s.pursuer.mode === 'DIRECT_PURSUIT');
    timeToCommit = committed ? committed.tMs - start : null;
  }

  const count = (kind: LabEvent['kind']) => events.filter((event) => event.kind === kind).length;

  return {
    brainId: last?.pursuer.brainId ?? 'unknown',
    perceptionModelId: last?.pursuer.perceptionModelId ?? 'unknown',
    oracleUsed: last?.pursuer.perceptionModelId === 'P3_ORACLE',
    durationMs: input.durationMs,
    captured: input.captured,
    captureTimeMs: input.capturedAtMs,
    averageDistance: distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
    minDistance: distances.length ? Math.min(...distances) : 0,
    maxDistance: distances.length ? Math.max(...distances) : 0,
    finalDistance: last?.pursuer.distanceToLearner ?? 0,
    threatBands: bands,
    directPerceptionUptime: samples.length ? perceivedSamples / samples.length : 0,
    reacquisitions,
    meanTimeToReacquireMs: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    trueReversals: count('TRUE_DIRECTION_REVERSAL'),
    expectedDetours: count('EXPECTED_ROUTE_DETOUR'),
    strategicReplans: count('STRATEGIC_TARGET_CHANGED'),
    routeReplans: count('NAVIGATION_ROUTE_CHANGED'),
    modeChanges: count('MODE_CHANGED'),
    timeMovingAwayWhileVisibleMs: movingAwayWhileVisible,
    timePausedWhileVisibleMs: pausedWhileVisible,
    timeIdleMs: idle,
    timeSearchingMs: searching,
    captureRangeEntriesBeforeCapture: count('CAPTURE_RANGE_ENTERED'),
    visibleStationary: {
      totalMs: window.length * sampleMs,
      directPursuitMs,
      targetRevisions: windowTargetRevisions,
      trueReversals: windowReversals,
      graphDistanceClosedFraction: windowStart && windowEnd !== null && windowStart > 0
        ? (windowStart - windowEnd) / windowStart : null,
      timeToCommitMs: timeToCommit,
    },
  };
}

/** A compact table row, for the A/B/C comparison view and the fixture runner. */
export function metricsRow(metrics: RunMetrics): Record<string, string> {
  const ms = (value: number | null) => (value === null ? '—' : `${(value / 1000).toFixed(1)}s`);
  return {
    brain: metrics.brainId,
    perception: metrics.perceptionModelId,
    captured: metrics.captured ? `yes ${ms(metrics.captureTimeMs)}` : 'no',
    avgDist: metrics.averageDistance.toFixed(0),
    minDist: metrics.minDistance.toFixed(0),
    uptime: `${(metrics.directPerceptionUptime * 100).toFixed(0)}%`,
    reacq: String(metrics.reacquisitions),
    toReacq: ms(metrics.meanTimeToReacquireMs),
    trueRev: String(metrics.trueReversals),
    detour: String(metrics.expectedDetours),
    replans: String(metrics.strategicReplans),
    awayVisible: ms(metrics.timeMovingAwayWhileVisibleMs),
    pausedVisible: ms(metrics.timePausedWhileVisibleMs),
    idle: ms(metrics.timeIdleMs),
    search: ms(metrics.timeSearchingMs),
    visStatDirect: metrics.visibleStationary.totalMs
      ? `${((metrics.visibleStationary.directPursuitMs / metrics.visibleStationary.totalMs) * 100).toFixed(0)}%`
      : '—',
    visStatClosed: metrics.visibleStationary.graphDistanceClosedFraction === null
      ? '—' : `${(metrics.visibleStationary.graphDistanceClosedFraction * 100).toFixed(0)}%`,
    toCommit: ms(metrics.visibleStationary.timeToCommitMs),
  };
}
