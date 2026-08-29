/**
 * Circuit Climb — pursuer step trace.
 *
 * A real diagnostic, not decoration: every field below is read directly from the
 * decision the pursuer actually made on that frame. Nothing here is synthesised,
 * and nothing here influences pursuer behaviour.
 *
 * The trace exists to answer one question when the pursuer misbehaves:
 * "which link in the chain stopped producing movement, and why?"
 */

export type PursuerMode = 'NO_ROW' | 'DIRECT' | 'CORRIDOR';

export interface PursuerAxisStep {
  /** Signed distance the pursuer wanted to cover on this axis. */
  intent: number;
  /** Signed distance it tried to cover this frame, after budget clamping. */
  attempted: number;
  /** True when pathIsClear rejected the attempted segment. */
  blocked: boolean;
  /** Signed distance actually applied to the pursuer. */
  applied: number;
}

export interface PursuerStep {
  /** Monotonic frame counter since the pursuer was created. */
  frame: number;
  /** Frame time in ms, as handed to updatePursuer. */
  delta: number;
  /** Total movement budget for this frame (speed * delta). */
  budget: number;

  from: { x: number; y: number };
  to: { x: number; y: number };
  player: { x: number; y: number };

  /** World y of the first platform row above the pursuer, or null if none. */
  nextRowY: number | null;
  /** Top edge of that row's actor-inflated collision band. */
  rowTop: number | null;
  /** Bottom edge of that row's actor-inflated collision band. */
  rowBottom: number | null;
  /** Whether the pursuer decided it must cross that row via a corridor. */
  mustCrossRow: boolean;

  mode: PursuerMode;
  rowPlatformCount: number;
  corridors: Array<{ left: number; right: number; center: number }>;
  chosenCorridor: number | null;
  targetX: number;

  horizontal: PursuerAxisStep;
  vertical: PursuerAxisStep;
  budgetAfterHorizontal: number;

  /** True when the pursuer ended the frame exactly where it started. */
  stalled: boolean;
  /** Machine-readable explanation of a stalled frame. */
  stallReason: PursuerStallReason | null;
}

export type PursuerStallReason =
  | 'NONE'
  | 'NO_BUDGET'
  | 'ALREADY_AT_TARGET_AND_PLAYER_LEVEL'
  | 'HORIZONTAL_BLOCKED'
  | 'VERTICAL_BLOCKED'
  | 'HORIZONTAL_BLOCKED_CONSUMED_BUDGET'
  | 'NO_VERTICAL_INTENT';

export interface PursuerStallReport {
  frames: number;
  durationMs: number;
  reason: PursuerStallReason;
  /**
   * Straight-line distance to the player while stalled. A pursuer held up
   * against the platform the player is standing on is a legitimate
   * close-quarters hold; a pursuer motionless a row or more away is a jam.
   */
  distanceToPlayer: number;
  at: { x: number; y: number };
  player: { x: number; y: number };
  mode: PursuerMode;
  nextRowY: number | null;
  rowTop: number | null;
  rowBottom: number | null;
  mustCrossRow: boolean;
  targetX: number;
  corridors: Array<{ left: number; right: number; center: number }>;
  lastStep: PursuerStep;
}

/**
 * Ring buffer plus stall detector. The buffer is bounded so leaving the trace on
 * during a long session cannot grow without limit.
 */
export class PursuerTracer {
  private buffer: PursuerStep[] = [];
  private capacity: number;
  private frameCounter = 0;
  private stallFrames = 0;
  private stallMs = 0;
  private reported = false;

  /** Consecutive stalled frames before a stall is reported. */
  readonly stallFrameThreshold: number;

  constructor(capacity = 900, stallFrameThreshold = 45) {
    this.capacity = capacity;
    this.stallFrameThreshold = stallFrameThreshold;
  }

  nextFrame(): number {
    this.frameCounter += 1;
    return this.frameCounter;
  }

  /**
   * Records a step. Returns a stall report the first time the pursuer has been
   * motionless for stallFrameThreshold consecutive frames, otherwise null.
   */
  record(step: PursuerStep): PursuerStallReport | null {
    this.buffer.push(step);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }

    if (!step.stalled) {
      this.stallFrames = 0;
      this.stallMs = 0;
      this.reported = false;
      return null;
    }

    this.stallFrames += 1;
    this.stallMs += step.delta;

    if (this.stallFrames < this.stallFrameThreshold || this.reported) {
      return null;
    }

    this.reported = true;
    return {
      frames: this.stallFrames,
      durationMs: Math.round(this.stallMs),
      reason: step.stallReason || 'NONE',
      distanceToPlayer: Math.hypot(step.player.x - step.to.x, step.player.y - step.to.y),
      at: step.to,
      player: step.player,
      mode: step.mode,
      nextRowY: step.nextRowY,
      rowTop: step.rowTop,
      rowBottom: step.rowBottom,
      mustCrossRow: step.mustCrossRow,
      targetX: step.targetX,
      corridors: step.corridors,
      lastStep: step,
    };
  }

  steps(): PursuerStep[] {
    return this.buffer.slice();
  }

  reset() {
    this.buffer = [];
    this.frameCounter = 0;
    this.stallFrames = 0;
    this.stallMs = 0;
    this.reported = false;
  }

  /** Compact one-line rendering of a step, for console output. */
  static format(step: PursuerStep): string {
    const n = (v: number | null) => (v === null ? '—' : v.toFixed(1));
    return [
      `f${step.frame}`,
      `${step.mode}`,
      `pos(${n(step.from.x)},${n(step.from.y)})->(${n(step.to.x)},${n(step.to.y)})`,
      `player(${n(step.player.x)},${n(step.player.y)})`,
      `row y=${n(step.nextRowY)} band[${n(step.rowTop)},${n(step.rowBottom)}]`,
      `mustCross=${step.mustCrossRow}`,
      `targetX=${n(step.targetX)}`,
      `dx a=${n(step.horizontal.attempted)}${step.horizontal.blocked ? ' BLOCKED' : ''}`,
      `dy a=${n(step.vertical.attempted)}${step.vertical.blocked ? ' BLOCKED' : ''}`,
      step.stalled ? `STALLED:${step.stallReason}` : 'moved',
    ].join(' | ');
  }
}
