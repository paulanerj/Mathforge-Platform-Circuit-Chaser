/**
 * RUN THE FIXTURES.
 *
 *   npx tsx tools/runFixtures.mts [brainId] [perceptionId]
 *   npm run fixtures
 *
 * Headless, deterministic, and the same code path the browser drives.
 */
import { FIXTURES, runRefreshComparison } from '../src/sim/fixtures';
import { BRAINS, brainById, PERCEPTION_MODELS, perceptionModelById, productionEligible } from '../src/pursuer/registry';

const brainId = process.argv[2] ?? 'A_GRAPH_V2_BASELINE';
const perceptionId = process.argv[3] ?? 'P0_PRODUCTION';
const brain = brainById(brainId);
const perception = perceptionModelById(perceptionId);

if (!brain) {
  console.error(`Unknown Brain "${brainId}". Registered: ${BRAINS.map((b) => b.id).join(', ')}`);
  process.exit(1);
}
if (!perception) {
  console.error(`Unknown perception model "${perceptionId}". Registered: ${PERCEPTION_MODELS.map((m) => m.id).join(', ')}`);
  process.exit(1);
}

console.log(`\n${brain.label}   under   ${perception.label}`);
if (!productionEligible(brainId, perceptionId)) {
  console.log('*** NOT PRODUCTION ELIGIBLE — this pairing cannot be proposed for integration. ***');
}
console.log('='.repeat(78));

let failures = 0;
for (const fixture of FIXTURES) {
  const result = fixture.run({ brain, perception });
  console.log(`\n${result.id} — ${result.label}${result.placedDiagnostically ? '   [pursuer placed diagnostically]' : ''}`);
  console.log(`   ${result.question}`);
  for (const check of result.checks) {
    const mark = check.passed === null ? ' · ' : check.passed ? ' ✓ ' : ' ✗ ';
    if (check.passed === false) failures += 1;
    console.log(`  ${mark} ${check.label.padEnd(38)} ${check.detail}`);
  }
}

console.log('\nF11 — refresh-rate comparison');
for (const mode of ['FIXED', 'RENDER_COUPLED'] as const) {
  const legs = runRefreshComparison({ brain, perception, timebase: mode });
  const identical = legs.every((leg) => leg.fingerprint === legs[0].fingerprint);
  console.log(`   ${mode.padEnd(15)} decisions identical across 60/120/144Hz: ${identical ? 'YES' : 'NO'}`);
  for (const leg of legs) {
    console.log(`      ${String(leg.hz).padStart(3)}Hz  modeChanges ${String(leg.modeChanges).padStart(4)}`
      + `  trueReversals ${String(leg.trueReversals).padStart(4)}`
      + `  finalDistance ${leg.finalDistance.toFixed(0).padStart(5)}u`);
  }
}

console.log(`\n${'='.repeat(78)}`);
console.log(failures ? `${failures} expectation(s) not met` : 'every stated expectation met');
