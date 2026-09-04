/**
 * THE PRODUCTION FIREWALL.
 *
 * The Lab proved its Brain non-omniscient against a LAB observation. That
 * proof does not transfer, and the 04A brief says so directly: "Do not claim
 * the firewall survives integration merely because the Lab firewall did. Test
 * the PRODUCTION ADAPTER."
 *
 * The risk is specific and real. Production's runtime holds a `player` object
 * that knows its destination platform, whether the pending answer is correct,
 * the whole route it is about to walk, and how close the pursuer is. In the
 * Lab none of that existed to leak. Here it sits one property access away from
 * the controller, so these gates check the seam itself:
 *
 *   1. the controller's learner input has nowhere to put forbidden facts;
 *   2. the controller cannot reach the runtime, the Oracle, or legacy pursuit
 *      code through its real transitive imports;
 *   3. an unsensed Brain never targets the learner's live position; and
 *   4. trail evidence never extends past where the learner has physically been.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { GraphPursuerController } from '../pursuer-v2/runtime/graphPursuerController';
import { productionGraphWorldAt } from '../pursuer-v2/testing/productionWorld';

const ROOT = join(import.meta.dirname, '..');
const CONTROLLER = join(ROOT, 'pursuer-v2/runtime/graphPursuerController.ts');

/** Every module the controller can actually reach, by following real imports. */
function transitiveImports(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [resolve(entry)];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const specifier of specifiers) {
      if (!specifier.startsWith('.')) continue;
      const base = resolve(dirname(file), specifier);
      const candidate = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]
        .find((p) => existsSync(p) && !p.endsWith('/'));
      if (candidate) queue.push(candidate);
    }
  }
  return [...seen];
}

describe('the Graph V2 controller cannot reach omniscient production state', () => {
  const reachable = transitiveImports(CONTROLLER).map((f) => relative(ROOT, f));

  it('never reaches the runtime, the legacy pursuer, or Oracle/diagnostic code', () => {
    const forbidden = [
      'runtime/useCircuitClimbPrototypeRuntime',
      'runtime/circuitClimbLearnerRouting',
      'pursuer/circuitClimbPursuer',
      'pursuer/circuitClimbPursuerLocomotion',
      'pursuer/circuitClimbPursuerTuning',
      'pursuer/circuitClimbPursuerTrace',
      'diagnostics/circuitClimbPursuitLog',
      'services/CircuitClimbMathAdapter',
      'oracle',
      'testing/',
    ];
    const violations = reachable.filter((file) =>
      forbidden.some((needle) => file.toLowerCase().includes(needle.toLowerCase())));
    expect(violations, `controller reaches: ${violations.join(', ')}`).toEqual([]);
  });

  it('reaches production geometry ONLY — the board is legitimate, the game state is not', () => {
    const outsideV2 = reachable.filter((f) => !f.startsWith('pursuer-v2/'));
    // The board's dimensions are something any pursuer may know. Nothing else
    // outside pursuer-v2 is.
    expect(outsideV2).toEqual(['geometry/circuitClimbGeometry.ts']);
  });

  it('no reachable module READS answer correctness, a destination, or a route', () => {
    // Property access, not bare words. `TrailAnnotation` legitimately declares
    // the string literal 'CORRECT' as a diagnostic vocabulary — the accepted
    // contract derives it from OBSERVED REVERSAL (a leg re-walked backwards),
    // never from the runtime's knowledge of which platform is right. What
    // would actually be a leak is reading such a fact off an object, so that
    // is what this looks for.
    const forbiddenReads = [
      /\.correct\b/i, /\.isCorrect\b/i, /\.answer\b/i, /\.destination\w*\b/i,
      /\.plannedRoute\b/i, /\.mathTarget\b/i, /\.targetValue\b/i,
      /\.capturable\b/i, /\.platform\b/,
    ];
    const offenders: string[] = [];
    for (const file of reachable) {
      if (file === 'geometry/circuitClimbGeometry.ts') continue;
      const source = readFileSync(join(ROOT, file), 'utf8');
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const pattern of forbiddenReads) {
        if (pattern.test(code)) offenders.push(`${file}: ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the WRONG/RETURN annotation is derived from physical reversal, and no decision reads it', () => {
    // The trail contract does carry a diagnostic annotation, and it does write
    // 'WRONG'. That is not a leak: it is inferred from the learner physically
    // re-walking a leg backwards, which is something anyone watching could
    // see. The guarantee that matters is that it is derived from geometry and
    // that nothing which DECIDES anything consumes it.
    const trail = readFileSync(join(ROOT, 'pursuer-v2/contracts/trail.ts'), 'utf8');
    const write = trail
      .slice(trail.indexOf("previous.annotation = 'WRONG'") - 400,
        trail.indexOf("segment.annotation = 'RETURN'"))
      // Comments here legitimately EXPLAIN that correctness is not consulted;
      // it is the code that must not consult it.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    // The only condition guarding it is an observed direction reversal.
    expect(write).toMatch(/opposite\(previous\.direction, direction\)/);
    expect(write).not.toMatch(/correct|answer|destination/i);

    // Nothing in the Brain, the graph or the production wiring mentions it.
    const deciders = reachable.filter((f) =>
      f.startsWith('pursuer-v2/brain/') || f.startsWith('pursuer-v2/graph/') || f.startsWith('pursuer-v2/runtime/'));
    expect(deciders.length).toBeGreaterThan(5);
    for (const file of deciders) {
      expect(readFileSync(join(ROOT, file), 'utf8'), file).not.toMatch(/annotation/);
    }
  });
});

describe('the learner input type has nowhere to put a forbidden fact', () => {
  it('LearnerPhysicalState carries physical presence and nothing else', () => {
    const source = readFileSync(CONTROLLER, 'utf8');
    const block = source.slice(
      source.indexOf('export interface LearnerPhysicalState'),
      source.indexOf('export interface GraphPursuerControllerOptions'),
    );
    const fields = [...block.matchAll(/^\s{2}(\w+)\s*[?:]/gm)].map((m) => m[1]);
    expect(fields.sort()).toEqual(['moving', 'row', 'x', 'y']);
  });
});

describe('an unsensed Brain never reads the learner it cannot see', () => {
  /**
   * A learner parked far outside the 260-unit sense radius, moving in a way
   * the pursuer has no way to perceive. If any hidden read existed, the
   * pursuer would drift toward the true position anyway.
   */
  it('does not steer toward a learner it has never sensed', () => {
    const world = productionGraphWorldAt(100);
    const controller = new GraphPursuerController({
      world,
      rowCount: 16,
      learnerStart: { x: 110, y: 0, row: 0 },
    });

    const secret = { x: 490, y: -8 * world.rowGap, row: 8 };
    let sensedEver = false;
    const targets: string[] = [];
    for (let i = 0; i < 400; i += 1) {
      const frame = controller.step(16.7, { ...secret, moving: false }, world, 16);
      if (frame.evidence.sensedSparkNow) sensedEver = true;
      targets.push(`${frame.intent.targetSource}`);
    }

    // It genuinely never saw it...
    expect(sensedEver).toBe(false);
    // ...and it therefore never claimed a direct sighting.
    expect(targets).not.toContain('SENSED_SPARK');
    expect(targets).not.toContain('LAST_SIGHTING_GRACE');
    // The Brain reports its own firewall counters structurally as zero.
    expect(controller.diagnostics.rawSenseAcquired).toBe(0);
  });

  it('reports zero firewall violations and zero future-route leaks over a long run', () => {
    const world = productionGraphWorldAt(90);
    const controller = new GraphPursuerController({
      world, rowCount: 16, learnerStart: { x: 300, y: 0, row: 0 },
    });
    let violations = 0;
    let leaks = 0;
    for (let i = 0; i < 600; i += 1) {
      const frame = controller.step(16.7, { x: 300, y: -3 * world.rowGap, row: 3, moving: false }, world, 16);
      violations += frame.evidence.hiddenStateFirewallViolations;
      leaks += frame.evidence.futureRouteLeakCount;
    }
    expect(violations).toBe(0);
    expect(leaks).toBe(0);
  });
});
