/**
 * CC2-04-Q2 source-backed qualification:
 * - independently valid make-target versus skip-count semantics
 * - the user-reported "Spark 2, none of the choices completes 10" fixture
 * - visible, logged number rebases rather than phantom addition
 * - actual physical correct landing and wrong-short/return
 * - source-faithful solved-equation review for every operation
 * - deterministic replay and 1,000-seed generation coverage
 */
import { describe, expect, it } from 'vitest';
import { SeededRandom, makeRandomStreams } from '../config/prng';
import { generateMakeTarget20Problem, targetForMakeRow, validateMakeTarget20Problem } from '../math/makeTarget20';
import { generateSkip2To10Problem, initialSkipValue, SKIP_SET, validateSkip2To10Problem } from '../math/skip2to10';
import { CircuitClimbCore, replayCore } from '../core/CircuitClimbCore';
import { defaultRunConfig } from '../config/runConfig';
import { buildRunSummary } from '../progression/runSummary';

function coreFor(curriculum: 'makeTarget20' | 'skip2to10', mode: 'practice' | 'climb' = 'practice') {
  return new CircuitClimbCore('q2-sourced-run', { ...defaultRunConfig(), curriculum, mode });
}
function landCorrect(core: CircuitClimbCore): void {
  const before = core.snapshot();
  expect(core.selectPlatform(before.currentProblem.correctPlatformId)).toMatchObject({ ok: true, correct: true });
  core.advanceTicks(300);
  const after = core.snapshot();
  expect(after.completedRows).toBe(before.completedRows + 1);
  expect(after.solved.at(-1)?.result).toBe(before.currentProblem.targetValue);
}
function travelBack(core: CircuitClimbCore): void {
  for (let i = 0; i < 350 && core.snapshot().phase !== 'ready'; i += 1) core.advanceTicks(1);
  expect(core.snapshot().phase).toBe('ready');
}

describe('CC2-04-Q2: make-target arithmetic is independent of skip counting', () => {
  it('Spark 2 to target 10 MUST offer 8 and only 8 as the correct platform', () => {
    const problem = generateMakeTarget20Problem('user-fixture', 1, 2, new SeededRandom('screenshot'));
    expect(problem.targetValue).toBe(10);
    expect(problem.correctValue).toBe(8);
    expect(problem.options.filter(o => 2 + o.value === 10).map(o => o.value)).toEqual([8]);
    expect(problem.options.map(o => o.value)).toContain(8);
    expect(problem.options.map(o => o.value)).toHaveLength(3);
    // The reported 2,4,3 candidate set cannot be published for Spark 2 -> 10.
    expect([2, 4, 3].some(value => 2 + value === 10)).toBe(false);
  });

  it('applies the original explicit 6-row target bands up to 20', () => {
    expect([1, 6, 7, 12, 13, 18, 19, 24, 25, 30, 31, 100].map(targetForMakeRow))
      .toEqual([10, 10, 12, 12, 14, 14, 16, 16, 18, 18, 20, 20]);
  });

  it('generates 36,000 uniquely soluble make-target problems from 1,000 seeds', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const rng = makeRandomStreams('make-target-'+seed).math;
      for (let row = 1; row <= 36; row += 1) {
        const incoming = rng.integer(2, 4);
        const problem = generateMakeTarget20Problem('q2-'+seed, row, incoming, rng);
        expect(() => validateMakeTarget20Problem(problem)).not.toThrow();
        expect(problem.options.filter(o => incoming + o.value === problem.targetValue)).toHaveLength(1);
        expect(new Set(problem.options.map(o => o.value)).size).toBe(3);
      }
    }
  }, 30000);

  it('uses real correct landings and a named reset for each independent target problem', () => {
    const core = coreFor('makeTarget20');
    const first = core.snapshot().currentProblem;
    expect(first.targetValue).toBe(10);
    expect(first.correctValue).toBe(10 - first.incomingValue);
    landCorrect(core);
    const next = core.snapshot();
    expect(next.currentProblem.targetValue).toBe(10);
    expect(next.currentProblem.incomingValue).toBe(next.spark.value);
    expect(next.currentProblem.incomingValue).toBeGreaterThanOrEqual(2);
    expect(next.currentProblem.incomingValue).toBeLessThanOrEqual(4);
    const rebases = core.eventLog().filter(e => e.type === 'VOLTAGE_REBASE');
    expect(rebases).toHaveLength(1);
    expect(rebases[0].detail).toMatchObject({
      oldValue: 10, newValue: next.spark.value, cause: 'NEXT_TARGET_PROBLEM',
    });
    expect(next.solved[0]).toMatchObject({
      incoming: first.incomingValue, operand: first.correctValue, result: 10,
    });
  });
});

describe('CC2-04-Q2: skip by 2 to 10 uses destination totals, not operands', () => {
  it('begins at 2 and offers one correct 4, without any odd candidate', () => {
    const first = generateSkip2To10Problem('skip', 1, initialSkipValue(), new SeededRandom('ui'));
    expect(first.incomingValue).toBe(2);
    expect(first.targetValue).toBe(4);
    expect(first.correctValue).toBe(4);
    expect(first.operation).toBe('skip-count-by-2');
    expect(first.options).toHaveLength(3);
    expect(first.options.map(o => o.value)).toContain(4);
    expect(first.options.every(o => SKIP_SET.includes(o.value as typeof SKIP_SET[number]))).toBe(true);
    expect(first.options.every(o => o.value !== 3)).toBe(true);
  });

  it('generates 4,000 valid steps across 1,000 deterministic seeded four-row cycles', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const rng = makeRandomStreams('skip-'+seed).math;
      let incoming = initialSkipValue();
      for (let row = 1; row <= 4; row += 1) {
        const p = generateSkip2To10Problem('q2-'+seed, row, incoming, rng);
        expect(() => validateSkip2To10Problem(p)).not.toThrow();
        expect(p.options.filter(o => o.value === incoming+2)).toHaveLength(1);
        expect(p.options.every(o => o.value % 2 === 0 && o.value >= 2 && o.value <= 10)).toBe(true);
        incoming = p.targetValue;
      }
      expect(incoming).toBe(10);
    }
  });

  it('correctly shorts and returns a wrong even destination, then completes 2,4,6,8,10', () => {
    const core = coreFor('skip2to10');
    const before = core.snapshot();
    const wrong = before.currentProblem.options.find(o =>
      o.platformId !== before.currentProblem.correctPlatformId)!;
    expect(core.selectPlatform(wrong.platformId)).toMatchObject({ ok:true, correct:false });
    travelBack(core);
    expect(core.snapshot().spark.value).toBe(2);
    expect(core.snapshot().currentProblem).toEqual(before.currentProblem);
    expect(core.eventLog().filter(e => e.type === 'PLATFORM_SHORTED')).toHaveLength(1);
    for (let row = 1; row <= 4; row += 1) {
      const problem = core.snapshot().currentProblem;
      expect(problem.incomingValue).toBe(row*2);
      expect(problem.targetValue).toBe(row*2+2);
      landCorrect(core);
    }
    const end = core.snapshot();
    expect(end.phase).toBe('ended');
    expect(end.endReason).toBe('PRACTICE_GOAL');
    expect(end.solved.map(eq => eq.result)).toEqual([4,6,8,10]);
    const review = buildRunSummary(end, core.eventLog(), []);
    expect(review.equations.map(eq => eq.equation)).toEqual([
      '2 → 4 (count by 2)', '4 → 6 (count by 2)',
      '6 → 8 (count by 2)', '8 → 10 (count by 2)',
    ]);
    expect(review.attempts).toBe(5);
    expect(review.wrongAttempts).toBe(1);
    expect(review.rowsSolved).toBe(4);
  });

  it('resets explicitly at 10 during endless climb; replay is exact', () => {
    const core = coreFor('skip2to10', 'climb');
    for(let row=1;row<=4;row+=1)landCorrect(core);
    const next = core.snapshot();
    expect(next.spark.value).toBe(2);
    expect(next.currentProblem.incomingValue).toBe(2);
    expect(next.currentProblem.targetValue).toBe(4);
    expect(core.eventLog().filter(e=>e.type==='VOLTAGE_REBASE').at(-1)?.detail)
      .toMatchObject({oldValue:10,newValue:2,cause:'CELL_RECHARGE'});
    const replayed = replayCore(core.replayExport());
    expect(replayed.stateDigest()).toBe(core.stateDigest());
    expect(replayed.eventLog()).toEqual(core.eventLog());
  });
});
