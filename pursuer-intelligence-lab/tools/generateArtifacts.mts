/**
 * Generate the shipped fixtures and sample runs.
 *
 *   npx tsx tools/generateArtifacts.mts
 *
 * These are the "here is what it looks like when it works" files an external
 * model receives with the archive: a recorded learner run it can replay, a
 * complete run export it can read, and the baseline's fixture results to beat.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Simulation } from '../src/sim/simulation';
import { SIM_STEP_MS } from '../src/sim/timebase';
import { runScript } from '../src/sim/scriptRunner';
import { scriptById, LEARNER_SCRIPTS } from '../src/learner/scripts';
import { FIXTURES, runRefreshComparison } from '../src/sim/fixtures';
import { BRAINS, PERCEPTION_MODELS, productionEligible } from '../src/pursuer/registry';
import { P0_PRODUCTION } from '../src/pursuer/perception/perceptionModels';
import { BRAIN_GRAPH_V2_BASELINE } from '../src/pursuer/brains/graphV2/index';
import { baselineLabConfiguration, labConfigurationHash } from '../src/pursuer/config/labConfiguration';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = (relative: string, value: unknown) => {
  const path = resolve(ROOT, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value, null, 1));
  console.log(`wrote ${relative}`);
};

// ── a recorded learner run, for replay and A/B/C ──────────────────────────
const source = new Simulation({ brain: BRAIN_GRAPH_V2_BASELINE, perception: P0_PRODUCTION, captureArmed: false });
for (const column of [0, 2, 0, 2, 1]) {
  for (let i = 0; i < 360; i += 1) source.step(SIM_STEP_MS);   // 3s of thinking
  source.select(column);
  while (source.learner.moving) source.step(SIM_STEP_MS);
}
for (let i = 0; i < 2400; i += 1) source.step(SIM_STEP_MS);     // 20s standing still
const recording = source.finishRecording({
  id: 'sample/zigzag-then-wait',
  label: 'Zigzag climb, then twenty seconds of standing still',
  notes: 'The shape the human was watching when they concluded the bot was lost. Replay this against any candidate.',
  createdAt: null,
});
write('sample-runs/zigzag-then-wait.learner-run.json', recording);

// ── a complete run export ─────────────────────────────────────────────────
const example = runScript(scriptById('LONG_THINK')!, {
  brain: BRAIN_GRAPH_V2_BASELINE, perception: P0_PRODUCTION, captureArmed: true,
});
const configuration = baselineLabConfiguration(BRAIN_GRAPH_V2_BASELINE.id, BRAIN_GRAPH_V2_BASELINE.defaultConfig as any);
write('sample-runs/baseline-long-think.run.json', {
  schema: 'circuit-climb-lab/run/v1',
  configuration,
  configurationHash: labConfigurationHash(configuration),
  productionEligible: true,
  metrics: example.metrics,
  capture: example.capture,
  ratings: {},
  ratingNotes: 'Not rated — this is a shipped example, not a tester\'s session.',
  events: example.simulation.events,
  samples: example.simulation.samples,
});

// ── fixture results for every built-in Brain under P0 ─────────────────────
const fixtureReport: any = { generatedFrom: 'npm run fixtures', brains: {} };
for (const brain of BRAINS) {
  const rows: any[] = [];
  for (const fixture of FIXTURES) {
    const result = fixture.run({ brain, perception: P0_PRODUCTION });
    rows.push({
      id: result.id, label: result.label, question: result.question,
      placedDiagnostically: result.placedDiagnostically,
      checks: result.checks,
      metrics: result.run.metrics,
      captureVerdict: result.run.capture.verdict,
    });
  }
  fixtureReport.brains[brain.id] = rows;
}
fixtureReport.refresh = {
  FIXED: runRefreshComparison({ brain: BRAIN_GRAPH_V2_BASELINE, perception: P0_PRODUCTION, timebase: 'FIXED' })
    .map(({ hz, modeChanges, trueReversals, finalDistance, fingerprint }) =>
      ({ hz, modeChanges, trueReversals, finalDistance, fingerprintSha: fingerprint.length })),
  RENDER_COUPLED: runRefreshComparison({ brain: BRAIN_GRAPH_V2_BASELINE, perception: P0_PRODUCTION, timebase: 'RENDER_COUPLED' })
    .map(({ hz, modeChanges, trueReversals, finalDistance }) => ({ hz, modeChanges, trueReversals, finalDistance })),
};
write('fixtures/baseline-results.json', fixtureReport);

// ── the oracle diagnostic, which is the headline finding ──────────────────
const diagnostic: any[] = [];
for (const scriptId of ['CROSS_BOARD', 'LONG_THINK', 'MOVE_STOP_MOVE']) {
  for (const brain of BRAINS) {
    for (const perception of PERCEPTION_MODELS) {
      const run = runScript(scriptById(scriptId)!, { brain, perception, captureArmed: true });
      diagnostic.push({
        script: scriptId, brain: brain.id, perception: perception.id,
        productionEligible: productionEligible(brain.id, perception.id),
        captured: run.metrics.captured,
        captureTimeMs: run.metrics.captureTimeMs,
        perceptionUptime: Number(run.metrics.directPerceptionUptime.toFixed(3)),
        trueReversals: run.metrics.trueReversals,
        strategicReplans: run.metrics.strategicReplans,
        searchMs: Math.round(run.metrics.timeSearchingMs),
        captureVerdict: run.capture.verdict,
      });
    }
  }
}
write('fixtures/oracle-diagnostic.json', diagnostic);

write('fixtures/README.md', `# Fixtures and shipped results

\`baseline-results.json\` — all twelve fixtures for every built-in Brain under
P0, plus the 60/120/144Hz comparison under both timebases. Regenerate with
\`npx tsx tools/generateArtifacts.mts\`.

\`oracle-diagnostic.json\` — every Brain against every perception model on three
scripts. This is the file to read first: it is the evidence that the shipped
chassis reaches DELIBERATE_PURSUIT_CAPTURE under P3 ORACLE on scripts where it
scores LIKELY_SEARCH_COLLISION under P0 PRODUCTION.

The scripted learner behaviours these run against are in
\`src/learner/scripts.ts\`: ${LEARNER_SCRIPTS.map((s) => s.id).join(', ')}.
`);
console.log('\ndone');
