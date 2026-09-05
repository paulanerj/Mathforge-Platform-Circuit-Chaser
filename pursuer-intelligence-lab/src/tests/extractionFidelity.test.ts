/**
 * EXTRACTION FIDELITY.
 *
 * The lab is a COPY of production code. A copy that has quietly drifted is
 * worse than no copy at all: every conclusion drawn here would be about a
 * pursuer nobody ships.
 *
 * So this compares the lab's copies against the production tree, line by line,
 * and fails on any difference that is not one of the documented adaptations.
 * When the lab has been extracted on its own — which is how an external model
 * receives it — the production tree is absent and these checks skip with a
 * note rather than failing, because "no production tree here" is the expected
 * state of a portable archive.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRODUCTION_ROOT = resolve(__dirname, '../../../src/games/circuit-climb');
const LAB_ROOT = resolve(__dirname, '..');
const available = existsSync(PRODUCTION_ROOT);

/** Files copied with no change but their import paths. */
const VERBATIM: Array<[production: string, lab: string]> = [
  ['geometry/circuitClimbGeometry.ts', 'world/circuitClimbGeometry.ts'],
  ['runtime/circuitClimbLearnerRouting.ts', 'learner/circuitClimbLearnerRouting.ts'],
  ['pursuer-v2/graph/pursuitGraph.ts', 'pursuer/graph/pursuitGraph.ts'],
  ['pursuer-v2/graph/graphRouting.ts', 'pursuer/graph/graphRouting.ts'],
  ['pursuer-v2/graph/graphCadence.ts', 'pursuer/graph/graphCadence.ts'],
  ['pursuer-v2/graph/graphActorRadius.ts', 'pursuer/graph/graphActorRadius.ts'],
  ['pursuer-v2/graph/plasmaWake.ts', 'pursuer/graph/plasmaWake.ts'],
  ['pursuer-v2/graph/graphPursuerV2.ts', 'pursuer/graph/graphPursuerV2.ts'],
  ['pursuer-v2/contracts/trail.ts', 'pursuer/graph/trail.ts'],
  ['pursuer-v2/contracts/trailRecorder.ts', 'pursuer/graph/trailRecorder.ts'],
];

/** Import lines differ by construction; nothing else may. */
const withoutImports = (source: string) =>
  source.split('\n').filter((line) => !/^\s*import\b/.test(line) && !/^\s*\} from '/.test(line)
    && !/^\s+[A-Za-z{}, ]+$/.test(line)).join('\n');

describe.skipIf(!available)('the lab is a faithful copy of production', () => {
  for (const [productionPath, labPath] of VERBATIM) {
    it(`${labPath} matches ${productionPath} apart from its imports`, () => {
      const production = readFileSync(resolve(PRODUCTION_ROOT, productionPath), 'utf8');
      const lab = readFileSync(resolve(LAB_ROOT, labPath), 'utf8');
      expect(withoutImports(lab)).toBe(withoutImports(production));
    });
  }

  it('the Graph V2 brain differs from production ONLY by the tuning threading', () => {
    const production = readFileSync(resolve(PRODUCTION_ROOT, 'pursuer-v2/brain/graphBrainV1.ts'), 'utf8');
    const lab = readFileSync(resolve(LAB_ROOT, 'pursuer/brains/graphV2/graphBrainV1.ts'), 'utf8');

    // Undo the documented adaptation, then the two bodies must be identical.
    const restored = lab
      .replace(/\/\*\*\n \* EXTRACTED from production[\s\S]*?\n \* ── the original production header ──\n \* /, '/**\n * ')
      .replace(/\/\*\*\n \* The six quantities Brain B may move[\s\S]*?\n\}\);\n\n/, '')
      .replace(/,\n  tuning: GraphV2Tuning = GRAPH_V2_BASELINE_TUNING,\n\)/, '\n)')
      .replace('export function updateBrain(\n  prev: BrainState,\n  obs: BrainObservation\n): BrainUpdateResult {',
        'export function updateBrain(prev: BrainState, obs: BrainObservation): BrainUpdateResult {')
      .replace('tuning.lossConfirmationTicks', 'LOSS_CONFIRMATION_TICKS')
      .replace('tuning.acquireConfirmationTicks', 'ACQUIRE_CONFIRMATION_TICKS')
      .replace('tuning.trailExhaustionConfirmationTicks', 'TRAIL_EXHAUSTION_CONFIRMATION_TICKS')
      .replace('tuning.leadPreemptionConfirmationTicks', 'LEAD_PREEMPTION_CONFIRMATION_TICKS')
      .replace('obs.nowMs, tuning.maxRememberedFragments);', 'obs.nowMs);')
      .replace('  maxRememberedFragments: number,\n', '')
      .replace('return all.slice(0, maxRememberedFragments);', 'return all.slice(0, MAX_REMEMBERED_FRAGMENTS);')
      .replace('tuning.arrivalEpsilon', 'ARRIVAL_EPSILON');

    expect(withoutImports(restored)).toBe(withoutImports(production));
  });

  it('the search frontier matches production, having only moved file', () => {
    const production = readFileSync(resolve(PRODUCTION_ROOT, 'pursuer-v2/brain/search.ts'), 'utf8');
    const lab = readFileSync(resolve(LAB_ROOT, 'pursuer/graph/frontierSearch.ts'), 'utf8');
    // The lab copy gained the module header explaining the move and the cursor
    // type that moved with it; the algorithm below must be untouched.
    const algorithm = (source: string) => source.slice(source.indexOf('export function nextSearchTarget'));
    expect(algorithm(lab)).toBe(algorithm(production));
  });
});

describe('the lab does not depend on production at runtime', () => {
  it('no lab source imports anything outside the lab', () => {
    const { execSync } = require('node:child_process');
    const hits = execSync(
      `grep -rn "from '\\.\\./\\.\\./\\.\\./" ${LAB_ROOT} --include=*.ts --include=*.tsx || true`,
      { encoding: 'utf8' },
    ).trim();
    const offenders = hits.split('\n').filter((line: string) => line && !line.includes('.test.ts'));
    expect(offenders, `these files reach outside the lab:\n${offenders.join('\n')}`).toEqual([]);
  });
});
