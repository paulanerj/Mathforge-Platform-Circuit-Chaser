/**
 * THE DIAGNOSTIC THE SANDBOX WAS BUILT FOR.
 *
 *   npx tsx tools/compareBrains.mts
 *   npm run compare
 *
 * Runs every Brain against every perception model on the same scripted learner
 * runs, and prints the comparison. The two rows that matter most are the ones
 * the brief calls out:
 *
 *   GRAPH V2 + ORACLE       if this still looks stupid, the problem is
 *                           navigation, locomotion or route selection — not
 *                           what the pursuer is being told.
 *   DIRECT HUNTER + P0      if this looks much better on the same information,
 *                           the problem is Graph V2's strategic Brain.
 */
import { runScript } from '../src/sim/scriptRunner';
import { scriptById } from '../src/learner/scripts';
import { BRAINS, PERCEPTION_MODELS, productionEligible } from '../src/pursuer/registry';
import { metricsRow } from '../src/pursuer/metrics/runMetrics';

const SCRIPTS = ['CROSS_BOARD', 'LONG_THINK', 'MOVE_STOP_MOVE'];
const COLUMNS = ['captured', 'avgDist', 'minDist', 'uptime', 'reacq', 'toReacq',
  'trueRev', 'replans', 'awayVisible', 'search', 'visStatDirect', 'toCommit'];

for (const scriptId of SCRIPTS) {
  const script = scriptById(scriptId)!;
  console.log(`\n${script.label.toUpperCase()}  —  ${script.description}`);
  console.log('─'.repeat(150));
  console.log(['brain'.padEnd(22), 'perception'.padEnd(18), ...COLUMNS.map((c) => c.padStart(12)), '  verdict'].join(''));
  for (const brain of BRAINS) {
    for (const perception of PERCEPTION_MODELS) {
      const run = runScript(script, { brain, perception, captureArmed: true });
      const row = metricsRow(run.metrics);
      const flag = productionEligible(brain.id, perception.id) ? '' : '  [CHEATING REFERENCE]';
      console.log([
        brain.id.padEnd(22), perception.id.padEnd(18),
        ...COLUMNS.map((c) => String(row[c] ?? '—').padStart(12)),
        '  ', run.capture.verdict, flag,
      ].join(''));
    }
  }
}
