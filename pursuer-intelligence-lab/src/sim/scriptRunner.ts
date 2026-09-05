/**
 * RUN A SCRIPT HEADLESSLY.
 *
 * The same code path the browser uses, driven by a loop instead of a display.
 * That is deliberate: a fixture that exercised a different code path from the
 * one a tester plays would be measuring something else.
 */

import { Simulation, type SimulationOptions } from './simulation';
import type { LearnerScript } from '../learner/scripts';
import { scriptDurationMs } from '../learner/scripts';
import { computeRunMetrics, type RunMetrics } from '../pursuer/metrics/runMetrics';
import { analyseCapture, type CaptureAnalysis } from '../pursuer/metrics/captureDeliberateness';

export interface ScriptRunResult {
  simulation: Simulation;
  metrics: RunMetrics;
  capture: CaptureAnalysis;
  /** Selections the board refused. A non-zero count is a finding, not noise. */
  refusedSelections: number;
}

export function runScript(script: LearnerScript, options: SimulationOptions): ScriptRunResult {
  const simulation = new Simulation(options);
  const stepMs = simulation.timebase.stepMs;
  const duration = scriptDurationMs(script);

  let index = 0;
  let waitedMs = 0;
  let refused = 0;

  while (simulation.timebase.elapsedMs < duration && !simulation.captured) {
    if (!simulation.learner.moving && index < script.steps.length) {
      const step = script.steps[index];
      if (waitedMs >= step.waitMs) {
        const started = simulation.select(step.column, step.rowDelta ?? 1);
        if (!started) refused += 1;
        index += 1;
        waitedMs = 0;
      } else {
        waitedMs += stepMs;
      }
    }
    simulation.step(stepMs);
  }

  return {
    simulation,
    metrics: computeRunMetrics({
      samples: simulation.samples,
      events: simulation.events,
      durationMs: simulation.timebase.elapsedMs,
      captured: simulation.captured,
      capturedAtMs: simulation.capturedAtMs,
    }),
    capture: analyseCapture(simulation.samples, simulation.capturedAtMs),
    refusedSelections: refused,
  };
}
