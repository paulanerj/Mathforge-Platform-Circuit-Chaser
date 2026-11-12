/**
 * CC2-02A — deterministic mathematical learner state-machine core.
 *
 * This is the new source of truth for arithmetic, world progression, accepted
 * attempts, wrong-return behavior and run lifecycle. No React, browser API,
 * host SDK, Math.random or wall-clock time is used here.
 *
 * The absent pursuer is intentional: CC2-02B may pass a verified contact
 * position into attemptCaptureAt() without being allowed to judge math.
 */
import { defaultRunConfig, RunConfigV1, validateRunConfig, configHash } from '../config/runConfig';
import { makeRandomStreams, SeededRandom } from '../config/prng';
import {
  freshCellValue, generateAdd20Problem, ProblemV1, ROWS_PER_CELL,
} from '../math/add20';
import { generateMakeTarget20Problem } from '../math/makeTarget20';
import { generateSkip2To10Problem, initialSkipValue } from '../math/skip2to10';
import {
  addProblemRow, createWorld, findPlatform, landingFor, planRoute,
  pointAlongRoute, pointOnHop, retainRecentRows, WorldV1,
} from '../world/world';
import { RoutePoint } from '../world/legacyLearnerRouting';

export type TurnPhaseV1 = 'ready' | 'outbound' | 'return' | 'ended';
export type EndReasonV1 =
  | 'CAPTURED' | 'PRACTICE_GOAL' | 'CHALLENGE_GOAL'
  | 'QUIT' | 'RESTARTED' | 'SYSTEM_ABORT';

export type SelectionRejectionV1 =
  | 'PAUSED' | 'CAPTURED' | 'BUSY' | 'UNKNOWN_PLATFORM'
  | 'WRONG_ROW' | 'DEAD_OPTION' | 'NO_DESTINATION_ROW'
  | 'NO_LEGAL_ROUTE' | 'DEGENERATE_ROUTE';

export type SelectionResultV1 =
  | { ok: true; attemptId: string; correct: boolean }
  | { ok: false; reason: SelectionRejectionV1 };

export interface GameEventV1 {
  readonly schemaVersion: 'cc2-event/v1';
  readonly id: string;
  readonly runId: string;
  readonly tick: number;
  readonly type:
    | 'RUN_STARTED' | 'RUN_PAUSED' | 'RUN_RESUMED' | 'RUN_ENDED'
    | 'ATTEMPT_EVALUATED' | 'TRAVEL_STARTED' | 'LANDING_CONFIRMED'
    | 'PLATFORM_SHORTED' | 'RETURN_FINISHED' | 'ROW_COMPLETED'
    | 'CELL_COMPLETED' | 'VOLTAGE_REBASE';
  readonly detail: Readonly<Record<string, string | number | boolean>>;
}

export interface SolvedEquationV1 {
  readonly problemId: string;
  readonly attemptId: string;
  readonly incoming: number;
  readonly operand: number;
  readonly result: number;
  readonly rowIndex: number;
}

export interface TravelV1 {
  kind: 'outbound' | 'return';
  movement: 'circuit' | 'hop';
  points: RoutePoint[];
  from: RoutePoint;
  to: RoutePoint;
  distance: number;
  total: number;
  attemptId: string;
  platformId: string;
  correct: boolean;
  firstTry: boolean;
}

export interface EngineStateV1 {
  runId: string;
  seed: string;
  tick: number;
  paused: boolean;
  phase: TurnPhaseV1;
  world: WorldV1;
  currentProblem: ProblemV1;
  spark: {
    x: number;
    y: number;
    value: number;
    row: number;
    sourcePlatformId: string;
  };
  travel: TravelV1 | null;
  attemptsOnCurrentRow: number;
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  completedRows: number;
  completedCells: number;
  score: number;
  solved: SolvedEquationV1[];
  landingGraceTicks: number;
  endReason: EndReasonV1 | null;
}

export type ReplayCommandV1 = {
  readonly tick: number;
  readonly ordinal: number;
  readonly command: 'SELECT' | 'PAUSE' | 'RESUME' | 'QUIT' | 'RESTART' | 'CAPTURE_TEST';
  readonly platformId?: string;
  readonly x?: number;
  readonly y?: number;
  readonly radius?: number;
};

export type ReplayV1 = {
  schemaVersion: 'cc2-replay/v1';
  seed: string;
  config: RunConfigV1;
  configHash: string;
  commands: ReplayCommandV1[];
  finalTick: number;
};

/** Stable state digest for comparisons across FPS and repeated runs. */
export function digestState(value: unknown): string {
  let hash = 2166136261;
  const json = JSON.stringify(value);
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const clone = <T>(value: T): T => structuredClone(value);
const CIRCUIT_SPEED_PER_TICK = 16;
const HOP_TICKS = 18;
const RETURN_TICKS = 14;

export class CircuitClimbCore {
  readonly config: RunConfigV1;
  readonly seed: string;

  private state: EngineStateV1;
  private mathRng: SeededRandom;
  private runNumber = 0;
  private eventNumber = 0;
  private events: GameEventV1[] = [];
  private commands: ReplayCommandV1[] = [];

  constructor(seed: string, config: RunConfigV1 = defaultRunConfig()) {
    if (typeof seed !== 'string' || seed.length === 0 || seed.length > 256) {
      throw new Error('INVALID_RUN_SEED');
    }
    this.seed = seed;
    this.config = Object.freeze(validateRunConfig(config));
    this.mathRng = makeRandomStreams(seed).math;
    this.state = this.newRunState();
  }

  private newRunState(): EngineStateV1 {
    this.runNumber += 1;
    const runId = `cc2/${this.seed}/run-${this.runNumber}`;
    this.mathRng = makeRandomStreams(`${this.seed}:run-${this.runNumber}`).math;
    const world = createWorld(this.config);
    const basePlatform = world.rows[0].platforms[1];
    const startValue = this.config.curriculum === 'skip2to10'
      ? initialSkipValue() : freshCellValue(this.mathRng);
    const problem = this.generateProblem(runId, 1, startValue);
    addProblemRow(world, problem);
    const start = landingFor(world, basePlatform);
    const state: EngineStateV1 = {
      runId,
      seed: this.seed,
      tick: 0,
      paused: false,
      phase: 'ready',
      world,
      currentProblem: problem,
      spark: { ...start, value: startValue, row: 0, sourcePlatformId: basePlatform.id },
      travel: null,
      attemptsOnCurrentRow: 0,
      attempts: 0,
      correctAttempts: 0,
      wrongAttempts: 0,
      completedRows: 0,
      completedCells: 0,
      score: 0,
      solved: [],
      landingGraceTicks: 0,
      endReason: null,
    };
    this.state = state;
    this.emit('RUN_STARTED', { seed: this.seed, configHash: configHash(this.config) });
    return state;
  }

  /** One deterministic curriculum boundary; world, AI, renderers never decide math. */
  private generateProblem(runId: string, rowIndex: number, incoming: number): ProblemV1 {
    switch (this.config.curriculum) {
      case 'add20': return generateAdd20Problem(runId, rowIndex, incoming, this.mathRng);
      case 'makeTarget20': return generateMakeTarget20Problem(runId, rowIndex, incoming, this.mathRng);
      case 'skip2to10': return generateSkip2To10Problem(runId, rowIndex, incoming, this.mathRng);
    }
  }

  private emit(type: GameEventV1['type'], detail: Record<string, string | number | boolean>): void {
    this.eventNumber += 1;
    this.events.push({
      schemaVersion: 'cc2-event/v1',
      id: `event-${this.eventNumber}`,
      runId: this.state.runId,
      tick: this.state.tick,
      type,
      detail: { ...detail },
    });
  }

  private record(command: ReplayCommandV1['command'], data: Omit<ReplayCommandV1, 'tick' | 'ordinal' | 'command'> = {}): void {
    this.commands.push({
      tick: this.state.tick,
      ordinal: this.commands.length + 1,
      command,
      ...data,
    });
  }

  snapshot(): EngineStateV1 {
    return clone(this.state);
  }

  eventLog(): GameEventV1[] {
    return clone(this.events);
  }

  replayExport(): ReplayV1 {
    return {
      schemaVersion: 'cc2-replay/v1',
      seed: this.seed,
      config: clone(this.config),
      configHash: configHash(this.config),
      commands: clone(this.commands),
      finalTick: this.state.tick,
    };
  }

  stateDigest(): string {
    return digestState(this.state);
  }

  /** The selected tile and the route must both be valid before an attempt exists. */
  selectPlatform(platformId: string): SelectionResultV1 {
    this.record('SELECT', { platformId });
    if (this.state.paused) return { ok: false, reason: 'PAUSED' };
    if (this.state.phase === 'ended') return { ok: false, reason: 'CAPTURED' };
    if (this.state.phase !== 'ready') return { ok: false, reason: 'BUSY' };

    const platform = findPlatform(this.state.world, platformId);
    if (!platform) return { ok: false, reason: 'UNKNOWN_PLATFORM' };
    const problem = this.state.currentProblem;
    if (platform.row !== problem.rowIndex) return { ok: false, reason: 'WRONG_ROW' };
    if (platform.dead) return { ok: false, reason: 'DEAD_OPTION' };
    const source = findPlatform(this.state.world, this.state.spark.sourcePlatformId);
    if (!source) return { ok: false, reason: 'NO_DESTINATION_ROW' };

    const route = planRoute(this.state.world, source, platform);
    if (route.ok === false) return { ok: false, reason: route.reason };
    const from = { x: this.state.spark.x, y: this.state.spark.y };
    const to = route.landing;
    const attemptId = `${problem.problemId}/attempt-${this.state.attemptsOnCurrentRow + 1}`;
    const correct = problem.operation === 'skip-count-by-2'
      ? platform.value === problem.targetValue
      : problem.incomingValue + (platform.value ?? Number.NaN) === problem.targetValue;
    const firstTry = this.state.attemptsOnCurrentRow === 0;

    platform.selected = true;
    this.state.phase = 'outbound';
    this.state.travel = {
      kind: 'outbound',
      movement: this.config.movement,
      points: route.points,
      from,
      to,
      total: this.config.movement === 'circuit' ? route.totalLength : 1,
      distance: 0,
      attemptId,
      platformId,
      correct,
      firstTry,
    };
    this.state.attempts += 1;
    this.state.attemptsOnCurrentRow += 1;
    if (correct) this.state.correctAttempts += 1;
    else this.state.wrongAttempts += 1;

    this.emit('ATTEMPT_EVALUATED', {
      attemptId,
      problemId: problem.problemId,
      rowIndex: problem.rowIndex,
      platformId,
      operation: problem.operation,
      incomingValue: problem.incomingValue,
      selectedValue: platform.value!,
      targetValue: problem.targetValue,
      correctValue: problem.correctValue,
      correct,
      correctness: correct ? 'correct' : 'incorrect',
      supportUsed: false,
      acceptedAtTick: this.state.tick,
    });
    this.emit('TRAVEL_STARTED', { attemptId, platformId, movement: this.config.movement });
    return { ok: true, attemptId, correct };
  }

  /**
   * Drive the simulation by an integer count of deterministic ticks.
   * A paused or ended run does not consume simulation time.
   */
  advanceTicks(ticks: number): void {
    if (!Number.isInteger(ticks) || ticks < 0 || ticks > 100000) {
      throw new Error('INVALID_ADVANCE_TICKS');
    }
    for (let step = 0; step < ticks; step += 1) {
      if (this.state.paused || this.state.phase === 'ended') return;
      this.state.tick += 1;
      if (this.state.phase === 'ready' && this.state.landingGraceTicks > 0) {
        this.state.landingGraceTicks -= 1;
      }
      const travel = this.state.travel;
      if (!travel) continue;

      if (travel.movement === 'circuit') {
        travel.distance = Math.min(travel.total, travel.distance + CIRCUIT_SPEED_PER_TICK);
        const point = pointAlongRoute(travel.points, travel.distance);
        this.state.spark.x = point.x;
        this.state.spark.y = point.y;
      } else {
        const stepSize = travel.kind === 'return' ? 1 / RETURN_TICKS : 1 / HOP_TICKS;
        travel.distance = Math.min(1, travel.distance + stepSize);
        const point = pointOnHop(travel.from, travel.to, travel.distance);
        this.state.spark.x = point.x;
        this.state.spark.y = point.y;
      }
      if (travel.distance + 1e-9 >= travel.total) {
        if (travel.kind === 'outbound') this.finishOutbound(travel);
        else this.finishReturn(travel);
      }
    }
  }

  private finishOutbound(travel: TravelV1): void {
    const platform = findPlatform(this.state.world, travel.platformId);
    if (!platform) throw new Error('ARRIVAL_PLATFORM_MISSING');
    const problem = this.state.currentProblem;
    this.state.spark.x = travel.to.x;
    this.state.spark.y = travel.to.y;
    platform.selected = false;
    this.emit('LANDING_CONFIRMED', { platformId: platform.id, attemptId: travel.attemptId, correct: travel.correct });

    if (!travel.correct) {
      platform.dead = true;
      this.emit('PLATFORM_SHORTED', { platformId: platform.id, attemptId: travel.attemptId });
      const source = findPlatform(this.state.world, this.state.spark.sourcePlatformId);
      if (!source) throw new Error('RETURN_SOURCE_MISSING');
      const home = landingFor(this.state.world, source);
      const from = { x: this.state.spark.x, y: this.state.spark.y };
      this.state.phase = 'return';
      this.state.travel = {
        ...travel,
        kind: 'return',
        movement: 'hop',
        from,
        to: home,
        points: [from, home],
        total: 1,
        distance: 0,
      };
      return;
    }

    platform.powered = true;
    this.state.spark.row = platform.row;
    this.state.spark.sourcePlatformId = platform.id;
    this.state.spark.value = problem.targetValue;
    this.state.completedRows += 1;
    this.state.score += 100 + (travel.firstTry ? 20 : 0);
    this.state.solved.push({
      problemId: problem.problemId,
      attemptId: travel.attemptId,
      incoming: problem.incomingValue,
      operand: platform.value!,
      result: problem.targetValue,
      rowIndex: platform.row,
    });
    this.emit('ROW_COMPLETED', {
      rowIndex: platform.row,
      attemptId: travel.attemptId,
      problemId: problem.problemId,
      resultValue: problem.targetValue,
    });

    this.state.travel = null;
    this.state.phase = 'ready';
    this.state.attemptsOnCurrentRow = 0;
    this.state.landingGraceTicks = this.config.landingGraceTicks;

    const completedCell = this.state.completedRows % ROWS_PER_CELL === 0;
    if (completedCell) {
      this.state.completedCells += 1;
      this.state.score += 50;
      this.emit('CELL_COMPLETED', { cellIndex: this.state.completedCells - 1, rowIndex: platform.row });
    }

    if (this.config.mode === 'practice' && this.state.completedRows === 4) {
      this.endRun('PRACTICE_GOAL');
      return;
    }
    if (this.config.mode === 'challenge' && this.state.completedRows === 12) {
      this.endRun('CHALLENGE_GOAL');
      return;
    }

    let nextIncoming = problem.targetValue;
    // In make-target mode every problem has its own source value. Never
    // silently turn a solved 10 into a new 2–4: emit an explicit rebase.
    const needsRebase = completedCell || this.config.curriculum === 'makeTarget20';
    if (needsRebase) {
      nextIncoming = this.config.curriculum === 'skip2to10'
        ? initialSkipValue() : freshCellValue(this.mathRng);
      this.emit('VOLTAGE_REBASE', {
        oldValue: problem.targetValue,
        newValue: nextIncoming,
        completedCell: this.state.completedCells,
        cause: completedCell ? 'CELL_RECHARGE' : 'NEXT_TARGET_PROBLEM',
      });
      this.state.spark.value = nextIncoming;
    }
    const nextIndex = platform.row + 1;
    const nextProblem = this.generateProblem(this.state.runId, nextIndex, nextIncoming);
    addProblemRow(this.state.world, nextProblem);
    this.state.currentProblem = nextProblem;
    retainRecentRows(this.state.world, platform.row);
  }

  private finishReturn(travel: TravelV1): void {
    this.state.spark.x = travel.to.x;
    this.state.spark.y = travel.to.y;
    this.state.travel = null;
    this.state.phase = 'ready';
    this.state.landingGraceTicks = this.config.landingGraceTicks;
    this.emit('RETURN_FINISHED', { attemptId: travel.attemptId, platformId: travel.platformId });
  }

  pause(): void {
    this.record('PAUSE');
    if (this.state.phase === 'ended' || this.state.paused) return;
    this.state.paused = true;
    this.emit('RUN_PAUSED', {});
  }

  resume(): void {
    this.record('RESUME');
    if (this.state.phase === 'ended' || !this.state.paused) return;
    this.state.paused = false;
    this.emit('RUN_RESUMED', {});
  }

  private endRun(reason: EndReasonV1): void {
    if (this.state.phase === 'ended') return;
    this.state.phase = 'ended';
    this.state.paused = false;
    this.state.endReason = reason;
    this.state.travel = null;
    this.emit('RUN_ENDED', {
      reason,
      completedRows: this.state.completedRows,
      attempts: this.state.attempts,
      score: this.state.score,
    });
  }

  quit(): void {
    this.record('QUIT');
    this.endRun('QUIT');
  }

  restart(): void {
    this.record('RESTART');
    this.endRun('RESTARTED');
    this.newRunState();
  }

  /**
   * CC2-02A-only contact seam, with no pursuer decision logic. CC2-02B must
   * supply a collision-resolved actor body and cannot override protection.
   */
  attemptCaptureAt(x: number, y: number, radius: number): boolean {
    this.record('CAPTURE_TEST', { x, y, radius });
    return this.adjudicatePursuerCapture(x, y, radius);
  }

  /**
   * Internal 02B physical contact seam: no replay command is recorded for
   * autonomous per-tick capture checks. Otherwise an endless chase would
   * append 60 fake user inputs each second and corrupt replay semantics.
   * This method is the SAME source-owned capture adjudicator as the old probe.
   */
  adjudicatePursuerCapture(x: number, y: number, radius: number): boolean {
    if (this.state.paused || this.state.phase === 'ended') return false;
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
        !Number.isFinite(radius) || radius <= 0) throw new Error('INVALID_CAPTURE_PROBE');
    if (this.config.transitShield && this.state.phase !== 'ready') return false;
    if (this.state.landingGraceTicks > 0) return false;
    const distance = Math.hypot(x - this.state.spark.x, y - this.state.spark.y);
    if (distance > radius + this.state.world.geometry.playerRadius) return false;
    this.endRun('CAPTURED');
    return true;
  }
}

/** Replays inputs at their original simulation ticks, never wall-clock frames. */
export function replayCore(trace: ReplayV1): CircuitClimbCore {
  if (trace.schemaVersion !== 'cc2-replay/v1') throw new Error('INVALID_REPLAY_SCHEMA');
  if (configHash(validateRunConfig(trace.config)) !== trace.configHash) {
    throw new Error('REPLAY_CONFIG_DIGEST_MISMATCH');
  }
  const core = new CircuitClimbCore(trace.seed, trace.config);
  let lastOrdinal = 0;
  for (const item of trace.commands) {
    if (item.ordinal <= lastOrdinal || item.tick < core.snapshot().tick) {
      throw new Error('REPLAY_COMMAND_ORDER_INVALID');
    }
    lastOrdinal = item.ordinal;
    core.advanceTicks(item.tick - core.snapshot().tick);
    if (item.command === 'SELECT') core.selectPlatform(item.platformId ?? '');
    else if (item.command === 'PAUSE') core.pause();
    else if (item.command === 'RESUME') core.resume();
    else if (item.command === 'QUIT') core.quit();
    else if (item.command === 'RESTART') core.restart();
    else if (item.command === 'CAPTURE_TEST') {
      core.attemptCaptureAt(item.x ?? NaN, item.y ?? NaN, item.radius ?? NaN);
    }
  }
  if (!Number.isInteger(trace.finalTick) || trace.finalTick < core.snapshot().tick) {
    throw new Error('REPLAY_FINAL_TICK_INVALID');
  }
  core.advanceTicks(trace.finalTick - core.snapshot().tick);
  return core;
}
