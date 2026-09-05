/**
 * THE FIXTURES — the twelve situations this lab exists to examine.
 *
 * Each one is a question about the human's report, arranged so that the answer
 * is measurable. They run headlessly, against any Brain and any perception
 * model, and their results are comparable across candidates because the
 * learner does exactly the same thing every time.
 *
 * A fixture PASSES or FAILS against expectations where an expectation is
 * genuinely defensible, and otherwise merely REPORTS. That distinction is
 * deliberate: inventing a threshold so a fixture can have a green tick is how
 * a suite stops telling you anything.
 */

import type { SimulationOptions } from './simulation';
import { runScript, type ScriptRunResult } from './scriptRunner';
import { LEARNER_SCRIPTS, scriptById, type LearnerScript } from '../learner/scripts';
import { graphWorldAt } from '../world/graphWorld';
import { SIM_STEP_MS } from './timebase';

export interface FixtureCheck {
  label: string;
  /** Null where the fixture reports rather than judges. */
  passed: boolean | null;
  detail: string;
}

export interface FixtureResult {
  id: string;
  label: string;
  question: string;
  checks: FixtureCheck[];
  run: ScriptRunResult;
  /** True when the pursuer was placed diagnostically rather than spawned. */
  placedDiagnostically: boolean;
}

export interface FixtureDefinition {
  id: string;
  label: string;
  /** What this fixture is actually asking. Printed above its results. */
  question: string;
  run(options: SimulationOptions): FixtureResult;
}

/** A stationary learner on the centre platform of row 0, at 100% framing. */
function stationaryScript(stationaryMs: number): LearnerScript {
  return {
    id: 'STATIONARY', label: 'Stationary learner',
    description: 'The learner does nothing at all.',
    steps: [], stationaryMs,
  };
}

/** Where the learner stands at rest on row 0, centre. */
function learnerRestPoint() {
  const world = graphWorldAt(100);
  return { x: world.columns[1], y: -world.platformHeight / 2 - world.playerRadius, world };
}

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
const secs = (value: number | null) => (value === null ? '—' : `${(value / 1000).toFixed(1)}s`);

function fixture(
  id: string, label: string, question: string,
  build: (options: SimulationOptions) => { script: LearnerScript; options: SimulationOptions; placed: boolean },
  judge: (run: ScriptRunResult) => FixtureCheck[],
): FixtureDefinition {
  return {
    id, label, question,
    run(options) {
      const built = build(options);
      const run = runScript(built.script, built.options);
      return { id, label, question, checks: judge(run), run, placedDiagnostically: built.placed };
    },
  };
}

/** F01 / F02 place the pursuer at a chosen distance to the LEFT or RIGHT. */
function placedAt(options: SimulationOptions, offsetX: number, offsetY: number, stationaryMs: number) {
  const rest = learnerRestPoint();
  return {
    script: stationaryScript(stationaryMs),
    options: { ...options, pursuerStart: { x: rest.x + offsetX, y: rest.y + offsetY }, captureArmed: options.captureArmed ?? true },
    placed: true,
  };
}

export const FIXTURES: readonly FixtureDefinition[] = [
  fixture('F01', 'Stationary visible learner',
    'When the learner is standing still and can be seen, does the pursuer commit to it and close?',
    (options) => placedAt(options, -200, 0, 30000),
    (run) => {
      const window = run.metrics.visibleStationary;
      return [
        { label: 'perceived it at all', passed: run.metrics.directPerceptionUptime > 0,
          detail: `perception uptime ${pct(run.metrics.directPerceptionUptime)}` },
        { label: 'committed to direct pursuit', passed: window.totalMs > 0 && window.directPursuitMs / window.totalMs > 0.8,
          detail: window.totalMs ? `${pct(window.directPursuitMs / window.totalMs)} of the visible-stationary window` : 'never both visible and stationary' },
        { label: 'time to commit', passed: null, detail: secs(window.timeToCommitMs) },
        { label: 'no true reversals while visible', passed: window.trueReversals === 0,
          detail: `${window.trueReversals} reversals that lost legal ground` },
        { label: 'closed legal distance', passed: (window.graphDistanceClosedFraction ?? 0) > 0.5,
          detail: window.graphDistanceClosedFraction === null ? '—' : pct(window.graphDistanceClosedFraction) },
        { label: 'captured', passed: null, detail: run.metrics.captured ? secs(run.metrics.captureTimeMs) : 'no' },
      ];
    }),

  fixture('F02', 'Near-Spark Marco Polo',
    'Right next to a still learner, does it attack — or turn away, circle, and arrive by accident?',
    (options) => placedAt(options, -150, 0, 20000),
    (run) => {
      const window = run.metrics.visibleStationary;
      return [
        { label: 'perceived from 150u', passed: run.metrics.directPerceptionUptime > 0.5,
          detail: `uptime ${pct(run.metrics.directPerceptionUptime)}` },
        { label: 'did not enter search', passed: run.metrics.timeSearchingMs === 0,
          detail: `${secs(run.metrics.timeSearchingMs)} spent searching` },
        { label: 'did not turn away', passed: window.trueReversals === 0,
          detail: `${window.trueReversals} unhelpful reversals` },
        { label: 'time moving away while visible', passed: null,
          detail: secs(run.metrics.timeMovingAwayWhileVisibleMs) },
        { label: 'capture verdict', passed: null, detail: run.capture.verdict },
        { label: 'capture-range entries before contact', passed: null,
          detail: String(run.metrics.captureRangeEntriesBeforeCapture) },
      ];
    }),

  fixture('F03', 'Cross-board loss',
    'After the learner crosses the board and stops, is the pursuer closing or drifting?',
    (options) => ({ script: scriptById('CROSS_BOARD')!, options, placed: false }),
    (run) => [
      { label: 'ended closer than its worst', passed: run.metrics.finalDistance < run.metrics.maxDistance,
        detail: `final ${run.metrics.finalDistance.toFixed(0)}u, worst ${run.metrics.maxDistance.toFixed(0)}u` },
      { label: 'reacquired at least once', passed: run.metrics.reacquisitions > 0,
        detail: `${run.metrics.reacquisitions} reacquisitions, mean ${secs(run.metrics.meanTimeToReacquireMs)}` },
      { label: 'search time', passed: null, detail: secs(run.metrics.timeSearchingMs) },
    ]),

  fixture('F04', 'Zigzag climb',
    'Against a learner crossing the board every row, does it keep contact at all?',
    (options) => ({ script: scriptById('ZIGZAG')!, options, placed: false }),
    (run) => [
      { label: 'perception uptime', passed: null, detail: pct(run.metrics.directPerceptionUptime) },
      { label: 'average distance', passed: null, detail: `${run.metrics.averageDistance.toFixed(0)}u` },
      { label: 'true reversals', passed: null, detail: String(run.metrics.trueReversals) },
    ]),

  fixture('F05', 'Slow human climb',
    'At the pace the accepted human session actually ran at, is the pursuer a threat?',
    (options) => ({ script: scriptById('SLOW_CLIMBER')!, options, placed: false }),
    (run) => [
      { label: 'time within 200u', passed: null,
        detail: secs(run.metrics.threatBands.within100 + run.metrics.threatBands.within200) },
      { label: 'captured', passed: null, detail: run.metrics.captured ? secs(run.metrics.captureTimeMs) : 'no' },
      { label: 'capture verdict', passed: null, detail: run.capture.verdict },
    ]),

  fixture('F06', 'Fast human climb',
    'Against a learner who barely pauses, does the pursuer fall behind or keep the pressure on?',
    (options) => ({ script: scriptById('FAST_CLIMBER')!, options, placed: false }),
    (run) => [
      { label: 'final distance', passed: null, detail: `${run.metrics.finalDistance.toFixed(0)}u` },
      { label: 'perception uptime', passed: null, detail: pct(run.metrics.directPerceptionUptime) },
      { label: 'time beyond 400u', passed: null, detail: secs(run.metrics.threatBands.beyond400) },
    ]),

  fixture('F07', 'Long thinking pause',
    'While the learner spends twenty-five seconds on a problem, what is the pursuer doing?',
    (options) => ({ script: scriptById('LONG_THINK')!, options, placed: false }),
    (run) => [
      { label: 'closed rather than drifted', passed: run.metrics.finalDistance < run.metrics.averageDistance,
        detail: `final ${run.metrics.finalDistance.toFixed(0)}u vs mean ${run.metrics.averageDistance.toFixed(0)}u` },
      { label: 'idle time', passed: null, detail: secs(run.metrics.timeIdleMs) },
      { label: 'strategic replans', passed: null, detail: String(run.metrics.strategicReplans) },
    ]),

  fixture('F08', 'Lose then stand still',
    'The classic complaint: the learner breaks away, stops, and waits. Is it ever found?',
    (options) => ({ script: scriptById('MOVE_STOP_MOVE')!, options, placed: false }),
    (run) => [
      { label: 'reacquired after losing', passed: run.metrics.reacquisitions > 0,
        detail: `${run.metrics.reacquisitions} reacquisitions` },
      { label: 'mean time to reacquire', passed: null, detail: secs(run.metrics.meanTimeToReacquireMs) },
      { label: 'closest approach', passed: null, detail: `${run.metrics.minDistance.toFixed(0)}u` },
    ]),

  fixture('F09', 'Reacquire near the player',
    'Placed just outside perception of a still learner, how long until it notices?',
    (options) => placedAt(options, -330, 0, 30000),
    (run) => [
      { label: 'acquired at all', passed: run.metrics.directPerceptionUptime > 0,
        detail: `uptime ${pct(run.metrics.directPerceptionUptime)}` },
      { label: 'time to first commit', passed: null, detail: secs(run.metrics.visibleStationary.timeToCommitMs) },
      { label: 'search time before contact', passed: null, detail: secs(run.metrics.timeSearchingMs) },
    ]),

  fixture('F10', 'Wrong-direction detector',
    'How often does it turn back in a way that loses legal ground, rather than routing around?',
    (options) => ({ script: scriptById('WAIT_THEN_MOVE')!, options, placed: false }),
    (run) => [
      { label: 'true reversals', passed: null, detail: String(run.metrics.trueReversals) },
      { label: 'expected route detours', passed: null, detail: String(run.metrics.expectedDetours) },
      { label: 'reversals per detour', passed: null,
        detail: run.metrics.expectedDetours ? (run.metrics.trueReversals / run.metrics.expectedDetours).toFixed(2) : '—' },
      { label: 'time moving away while visible', passed: null, detail: secs(run.metrics.timeMovingAwayWhileVisibleMs) },
    ]),

  fixture('F11', 'High-refresh comparison',
    'Does this candidate decide the same things at 60Hz, 120Hz and 144Hz?',
    (options) => ({ script: scriptById('ZIGZAG')!, options, placed: false }),
    // The comparison itself is done by `runRefreshComparison` below; this
    // entry runs the reference leg so the fixture list is complete.
    (run) => [
      { label: 'reference leg (fixed 120Hz sim)', passed: null,
        detail: `${run.simulation.samples.length} samples, ${run.metrics.modeChanges} mode changes` },
    ]),

  fixture('F12', 'Capture deliberateness',
    'When it does catch the learner, did it hunt — or did it bump into them?',
    (options) => ({ script: scriptById('SLOW_CLIMBER')!, options: { ...options, captureArmed: true }, placed: false }),
    (run) => [
      { label: 'verdict', passed: null, detail: run.capture.verdict },
      { label: 'perception in the last 5s', passed: null, detail: pct(run.capture.perceptionUptime) },
      { label: 'direct pursuit in the last 5s', passed: null, detail: pct(run.capture.directPursuitFraction) },
      { label: 'closing in the last 5s', passed: null, detail: pct(run.capture.closingFraction) },
      { label: 'summary', passed: null, detail: run.capture.summary },
    ]),
];

/**
 * F11's real work: run the same script under three render rates and compare
 * what the pursuer DECIDED.
 *
 * Under the lab's fixed timebase this must come out identical, because the
 * display is not part of the simulation. Under RENDER_COUPLED it will not, and
 * that difference is the finding — it is production's behaviour, reproduced.
 */
export function runRefreshComparison(options: SimulationOptions) {
  const script = scriptById('ZIGZAG')!;
  const rates = [60, 120, 144];
  return rates.map((hz) => {
    const frameMs = 1000 / hz;
    const run = runScript(script, {
      ...options,
      stepMs: options.timebase === 'RENDER_COUPLED' ? frameMs : (options.stepMs ?? SIM_STEP_MS),
    });
    // A decision fingerprint: the sequence of strategic postures and reasons,
    // sampled on simulation time rather than on frames, so two runs at
    // different rates are compared on what they decided and not on how often
    // they were asked.
    const fingerprint = run.simulation.samples
      .filter((sample) => Math.round(sample.tMs) % 250 === 0)
      .map((sample) => `${sample.pursuer.mode}:${sample.pursuer.reasonCode}`)
      .join('|');
    return {
      hz,
      frameMs,
      timebase: options.timebase ?? 'FIXED',
      modeChanges: run.metrics.modeChanges,
      trueReversals: run.metrics.trueReversals,
      finalDistance: run.metrics.finalDistance,
      fingerprint,
    };
  });
}

export { LEARNER_SCRIPTS };
