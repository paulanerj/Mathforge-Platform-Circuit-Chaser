/**
 * CC2-04-Q2 — explicit make-target curriculum.
 *
 * The original game's first six rows target 10, then advance to 12, 14,
 * 16, 18 and 20 in six-row bands. The displayed platforms are ADDENDS:
 * with Spark 2 and goal 10 the one correct platform is 8.
 *
 * Unlike add20's accumulating totals, each new make-target question has
 * a newly seeded starting value. The core must emit VOLTAGE_REBASE so this
 * reset can never masquerade as arithmetic continuity.
 */
import type { ProblemV1 } from './add20';
import { cellIndexForRow } from './add20';
import type { SeededRandom } from '../config/prng';

export function targetForMakeRow(rowIndex: number): number {
  if (!Number.isInteger(rowIndex) || rowIndex < 1) throw Error('INVALID_ROW_INDEX');
  return Math.min(20, 10 + 2 * Math.floor((rowIndex - 1) / 6));
}

export function generateMakeTarget20Problem(
  runId: string, rowIndex: number, incomingValue: number, rng: SeededRandom,
): ProblemV1 {
  const targetValue = targetForMakeRow(rowIndex);
  if (!Number.isInteger(incomingValue) || incomingValue < 2 ||
      incomingValue > 4 || incomingValue >= targetValue) {
    throw Error('MAKE_TARGET_INVALID_START');
  }
  const correctValue = targetValue - incomingValue;
  const others = rng.shuffle(
    Array.from({ length: targetValue - 1 }, (_, index) => index + 1)
      .filter(value => value !== correctValue),
  ).slice(0, 2);
  const values = rng.shuffle([correctValue, ...others]);
  const options: ProblemV1['options'] = values.map((value, ordinal) => ({
    platformId: `row-${rowIndex}-column-${ordinal}`,
    value, ordinal: ordinal as 0 | 1 | 2,
  }));
  const problem: ProblemV1 = {
    problemId: `${runId}/row-${rowIndex}`,
    rowIndex,
    cellIndex: cellIndexForRow(rowIndex),
    rowInCell: ((rowIndex - 1) % 4) as 0 | 1 | 2 | 3,
    operation: 'add',
    incomingValue, targetValue, options, correctValue,
    correctPlatformId: options.find(option => option.value === correctValue)!.platformId,
  };
  validateMakeTarget20Problem(problem);
  return problem;
}

export function validateMakeTarget20Problem(problem: ProblemV1): void {
  if (problem.operation !== 'add' ||
      problem.targetValue !== targetForMakeRow(problem.rowIndex) ||
      problem.incomingValue < 2 || problem.incomingValue > 4 ||
      !Number.isInteger(problem.incomingValue) ||
      problem.options.length !== 3 ||
      new Set(problem.options.map(option => option.value)).size !== 3 ||
      problem.options.some(option =>
        !Number.isInteger(option.value) || option.value < 1 ||
        option.value >= problem.targetValue) ||
      problem.correctValue !== problem.targetValue - problem.incomingValue ||
      problem.options.filter(option =>
        problem.incomingValue + option.value === problem.targetValue).length !== 1 ||
      problem.options.find(option => option.platformId === problem.correctPlatformId)?.value !== problem.correctValue) {
    throw Error('MAKE_TARGET_MATH_INVALID');
  }
}
