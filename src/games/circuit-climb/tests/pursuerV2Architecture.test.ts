/**
 * TWO PURSUERS, ONE SEAM.
 *
 * The 04A brief is specific about shape as well as behaviour: Graph V2 must
 * be an independent implementation rather than the legacy pursuer gradually
 * mutated, the legacy engine must remain intact as rollback authority, and
 * implementation-selection conditionals must not spread through the app.
 * Those are architectural claims, so they get architectural tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  resolvePursuerController,
  DEFAULT_PURSUER_CONTROLLER,
  PURSUER_CONTROLLER_STORAGE_KEY,
} from '../pursuer-v2/pursuerControllerKind';

const ROOT = join(import.meta.dirname, '..');
const RUNTIME = join(ROOT, 'runtime/useCircuitClimbPrototypeRuntime.ts');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

describe('the candidate is the normal launch on this integration branch', () => {
  it('defaults to GRAPH_PURSUER_V2 with no toggle to remember', () => {
    expect(DEFAULT_PURSUER_CONTROLLER).toBe('GRAPH_PURSUER_V2');
    expect(resolvePursuerController('', null)).toBe('GRAPH_PURSUER_V2');
  });

  it('a developer can still put the legacy pursuer back, by query or by stored key', () => {
    expect(resolvePursuerController('?pursuer=legacy', null)).toBe('LEGACY_PURSUER');
    expect(resolvePursuerController('?pursuer=LEGACY_PURSUER', null)).toBe('LEGACY_PURSUER');
    expect(resolvePursuerController('?pursuer=v1', null)).toBe('LEGACY_PURSUER');
    const storage = { getItem: (k: string) => (k === PURSUER_CONTROLLER_STORAGE_KEY ? 'LEGACY_PURSUER' : null) };
    expect(resolvePursuerController('', storage)).toBe('LEGACY_PURSUER');
    // ...and the query wins over the stored preference.
    expect(resolvePursuerController('?pursuer=v2', storage)).toBe('GRAPH_PURSUER_V2');
  });

  it('never throws, whatever it is handed — a diagnostic switch cannot break launch', () => {
    const hostile = { getItem: () => { throw new Error('storage disabled'); } };
    expect(resolvePursuerController('?pursuer=nonsense', hostile)).toBe('GRAPH_PURSUER_V2');
    expect(resolvePursuerController('%%%not a query%%%', hostile)).toBe('GRAPH_PURSUER_V2');
    expect(resolvePursuerController(undefined, null)).toBe('GRAPH_PURSUER_V2');
  });
});

describe('implementation selection happens in exactly one place', () => {
  const appFiles = walk(join(ROOT))
    .filter((f) => !f.includes('/tests/') && !f.includes('/pursuer-v2/testing/'));

  it('no file outside the seam and the runtime SELECTS on the controller kind', () => {
    // A file may NAME the engine — `readonly kind = 'GRAPH_PURSUER_V2'` and
    // the graph's own version label both do, legitimately. What must not
    // spread is a COMPARISON that branches behaviour on which pursuer is
    // running, because that is how a two-implementation seam turns into
    // implementation-selection scattered across an application.
    const selection = /(===|!==|==|!=)\s*'(GRAPH_PURSUER_V2|LEGACY_PURSUER)'|'(GRAPH_PURSUER_V2|LEGACY_PURSUER)'\s*(===|!==|==|!=)/;
    const offenders: string[] = [];
    for (const file of appFiles) {
      const rel = relative(ROOT, file);
      if (rel === 'pursuer-v2/pursuerControllerKind.ts') continue;      // the seam itself
      if (rel === 'runtime/useCircuitClimbPrototypeRuntime.ts') continue; // the one consumer
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (selection.test(code)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('the runtime tests the kind in a single branch', () => {
    const runtime = readFileSync(RUNTIME, 'utf8');
    const comparisons = [...runtime.matchAll(/pursuerKind\s*===/g)];
    // One at create/restart, one in the frame update. Not scattered.
    expect(comparisons.length).toBeLessThanOrEqual(2);
  });
});

describe('the legacy pursuer remains intact as rollback authority', () => {
  it('every legacy module is still present and still exports its entry points', () => {
    const legacy = readFileSync(join(ROOT, 'pursuer/circuitClimbPursuer.ts'), 'utf8');
    expect(legacy).toMatch(/export function createPursuer/);
    expect(legacy).toMatch(/export function updatePursuer/);
    expect(legacy).toMatch(/export function getPursuerCaptureDistance/);
    for (const file of [
      'pursuer/circuitClimbPursuerLocomotion.ts',
      'pursuer/circuitClimbPursuerTuning.ts',
      'pursuer/circuitClimbPursuerTrace.ts',
    ]) {
      expect(readFileSync(join(ROOT, file), 'utf8').length).toBeGreaterThan(0);
    }
  });

  it('Graph V2 is a separate implementation, not the legacy engine mutated', () => {
    // Nothing under pursuer-v2 may import the legacy pursuer, and nothing in
    // the legacy pursuer may import pursuer-v2. They are peers.
    for (const file of walk(join(ROOT, 'pursuer-v2'))) {
      expect(readFileSync(file, 'utf8'), relative(ROOT, file)).not.toMatch(/from '.*\/pursuer\/circuitClimbPursuer/);
    }
    for (const file of walk(join(ROOT, 'pursuer'))) {
      expect(readFileSync(file, 'utf8'), relative(ROOT, file)).not.toMatch(/pursuer-v2/);
    }
  });
});

describe('test-support code cannot become application architecture', () => {
  it('no production runtime file imports from pursuer-v2/testing', () => {
    const offenders: string[] = [];
    for (const file of walk(join(ROOT))) {
      const rel = relative(ROOT, file);
      if (rel.includes('/tests/') || rel.startsWith('tests/')) continue;
      if (rel.startsWith('pursuer-v2/testing/')) continue;
      if (/from '[^']*pursuer-v2\/testing/.test(readFileSync(file, 'utf8'))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('no Oracle test driver was transplanted', () => {
    // The accepted Brain's own comments DISCUSS the Oracle, at length, to
    // record that they deliberately do not use it. Code is what matters.
    for (const file of walk(join(ROOT, 'pursuer-v2'))) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(code, relative(ROOT, file)).not.toMatch(/oracleTestDriver|ORACLE_TEST_DRIVER/);
    }
    // Belt and braces: the Oracle source was never copied into production.
    const copied = walk(join(ROOT, 'pursuer-v2')).filter((f) => /oracle/i.test(f));
    expect(copied).toEqual([]);
  });
});
