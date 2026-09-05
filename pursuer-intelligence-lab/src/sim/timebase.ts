/**
 * THE TIMEBASE — simulation time, separated from render refresh.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 *
 * Production's pursuer counts its confirmation windows in TICKS, and a tick is
 * a rendered frame. On the 144Hz display the 04B tester used, every one of
 * those windows elapsed in about 40% of the wall-clock time it was derived at:
 * a "50ms" loss confirmation was really 21ms. The pursuer a tester played was
 * therefore not quite the pursuer anyone had measured, and nothing in the
 * evidence said so.
 *
 * The lab must not reproduce that by accident in new candidates. So:
 *
 *   SIMULATION TIME advances in FIXED steps. Every Brain, every perception
 *   model and every cadence sees exactly the same dt regardless of what the
 *   display is doing. A run is therefore deterministic and, more importantly,
 *   IDENTICAL at 60Hz, 120Hz and 144Hz.
 *
 *   RENDER REFRESH only decides how often the fixed steps are drained and how
 *   often the screen is painted. A slow frame drains several steps; a fast one
 *   may drain none.
 *
 * `RENDER_COUPLED` is offered for one purpose: reproducing production's own
 * refresh-dependence when that is the thing under study. Any result produced
 * under it is labelled, because it is a result about a display as much as
 * about a pursuer.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type TimebaseMode = 'FIXED' | 'RENDER_COUPLED';

/**
 * The fixed simulation step, in milliseconds.
 *
 * 120Hz rather than 60: it divides both 60Hz and 120Hz display refresh evenly,
 * it is fine enough that the chassis never steps over a corridor at the
 * baseline speed of 0.19 u/ms (1.6 units per step against a 6-unit minimum
 * lane), and it is coarse enough that a 60-second run is 7,200 steps rather
 * than something a browser tab struggles to replay.
 */
export const SIM_STEP_MS = 1000 / 120;

/** Never drain more than this many steps for one rendered frame. */
const MAX_STEPS_PER_FRAME = 12;

export class Timebase {
  private accumulator = 0;
  private simMs = 0;
  private steps = 0;

  constructor(
    public mode: TimebaseMode = 'FIXED',
    public stepMs: number = SIM_STEP_MS,
  ) {}

  get elapsedMs(): number { return this.simMs; }
  get tickCount(): number { return this.steps; }

  reset(): void {
    this.accumulator = 0;
    this.simMs = 0;
    this.steps = 0;
  }

  /**
   * Advance the simulation clock by one step that has actually been run.
   *
   * Deliberately separate from `drain`: `drain` only decides HOW MANY steps a
   * rendered frame owes, and the clock moves when a step is genuinely
   * executed. Keeping them apart is what lets a headless runner call `step`
   * directly, in a loop, with no display at all — which is how every fixture
   * and every test drives this lab.
   */
  commit(dtMs: number): void {
    this.simMs += dtMs;
    this.steps += 1;
  }

  /**
   * Turn a rendered frame's elapsed wall-clock into simulation steps.
   *
   * In FIXED mode a frame contributes time to an accumulator and whole steps
   * are drained from it; the leftover carries to the next frame, so no time is
   * invented or lost and the sequence of dt values is independent of the
   * display. In RENDER_COUPLED mode the frame IS the step, which is what
   * production does.
   *
   * The step cap stops a backgrounded tab from returning and simulating
   * thirty seconds in one frame — a spiral that would look, to a tester, like
   * the pursuer teleporting.
   */
  drain(frameMs: number): number[] {
    if (this.mode === 'RENDER_COUPLED') {
      const dt = Math.max(0, Math.min(frameMs, 34));
      return dt > 0 ? [dt] : [];
    }

    this.accumulator += Math.max(0, Math.min(frameMs, 250));
    const steps: number[] = [];
    while (this.accumulator >= this.stepMs && steps.length < MAX_STEPS_PER_FRAME) {
      this.accumulator -= this.stepMs;
      steps.push(this.stepMs);
    }
    // A very long stall would otherwise leave the accumulator holding seconds
    // of debt and run fast for the next several frames.
    if (this.accumulator > this.stepMs * MAX_STEPS_PER_FRAME) this.accumulator = 0;
    return steps;
  }
}
