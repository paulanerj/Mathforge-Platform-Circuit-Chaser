/**
 * CC2-04-Q2 — skip-counting by two, from 2 to 10.
 *
 * Platform numbers represent DESTINATION TOTALS (4, 6, 8, 10), not
 * addends. An offered 3 is impossible in this curriculum. All displayed
 * options are from the valid even-number solution set, so a distractor is
 * a wrong NEXT STEP rather than a mathematically foreign number.
 *
 * The core must evaluate the selected destination against targetValue,
 * and the UI and summary must say "count by 2", not fake an addition.
 */
import type { ProblemV1 } from './add20';
import { cellIndexForRow } from './add20';
import type { SeededRandom } from '../config/prng';

export const SKIP_SET = [2, 4, 6, 8, 10] as const;

export function initialSkipValue(): number { return 2; }

export function generateSkip2To10Problem(
  runId: string, rowIndex: number, incomingValue: number, rng: SeededRandom,
): ProblemV1 {
  if (!Number.isInteger(rowIndex) || rowIndex < 1) throw Error('INVALID_ROW_INDEX');
  const expectedIncoming = 2 + 2 * ((rowIndex - 1) % 4);
  if (incomingValue !== expectedIncoming) throw Error('SKIP_COUNT_CONTINUITY_INVALID');
  const targetValue = incomingValue + 2;
  const others = rng.shuffle(
    SKIP_SET.filter(value => value !== targetValue && value !== incomingValue),
  ).slice(0, 2);
  const values = rng.shuffle([targetValue, ...others]);
  const options: ProblemV1['options'] = values.map((value, ordinal) => ({
    platformId: `row-${rowIndex}-column-${ordinal}`,
    value, ordinal: ordinal as 0 | 1 | 2,
  }));
  const problem: ProblemV1 = {
    problemId: `${runId}/row-${rowIndex}`,
    rowIndex,
    cellIndex: cellIndexForRow(rowIndex),
    rowInCell: ((rowIndex - 1) % 4) as 0 | 1 | 2 | 3,
    operation: 'skip-count-by-2',
    incomingValue, targetValue, options,
    correctValue: targetValue,
    correctPlatformId: options.find(option => option.value === targetValue)!.platformId,
  };
  validateSkip2To10Problem(problem);
  return problem;
}

export function validateSkip2To10Problem(problem: ProblemV1): void {
  if (problem.operation !== 'skip-count-by-2' ||
      problem.incomingValue !== 2 + 2 * ((problem.rowIndex - 1) % 4) ||
      problem.targetValue !== problem.incomingValue + 2 ||
      problem.correctValue !== problem.targetValue ||
      problem.options.length !== 3 ||
      new Set(problem.options.map(option => option.value)).size !== 3 ||
      problem.options.some(option => !SKIP_SET.includes(option.value as typeof SKIP_SET[number])) ||
      problem.options.some(option => option.value === problem.incomingValue) ||
      problem.options.filter(option => option.value === problem.targetValue).length !== 1 ||
      problem.options.find(option => option.platformId === problem.correctPlatformId)?.value !== problem.targetValue) {
    throw Error('SKIP_COUNT_MATH_INVALID');
  }
}
