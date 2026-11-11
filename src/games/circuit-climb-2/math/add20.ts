/**
 * CC2-02A — four-row, source-verified addition-cell contract.
 *
 * Correct answers are never inferred from the tile's index or visual skin.
 * Each accepted correct landing changes the next row's incoming number to
 * the actual previous sum. The only other source of a new number is an
 * explicitly recorded CELL_REBASE after four correct landings.
 */
import { SeededRandom } from '../config/prng';

export interface ProblemOptionV1 {
  platformId: string;
  ordinal: 0 | 1 | 2;
  value: number;
}

export interface ProblemV1 {
  problemId: string;
  rowIndex: number;
  cellIndex: number;
  rowInCell: 0 | 1 | 2 | 3;
  operation: 'add';
  incomingValue: number;
  targetValue: number;
  options: readonly ProblemOptionV1[];
  correctValue: number;
  correctPlatformId: string;
}

export const ROWS_PER_CELL = 4;

export function cellIndexForRow(rowIndex: number): number {
  if (!Number.isInteger(rowIndex) || rowIndex < 1) throw new Error('INVALID_ROW_INDEX');
  return Math.floor((rowIndex - 1) / ROWS_PER_CELL);
}

export function freshCellValue(rng: SeededRandom): number {
  return rng.integer(2, 4);
}

export function generateAdd20Problem(
  runId: string,
  rowIndex: number,
  incomingValue: number,
  rng: SeededRandom,
): ProblemV1 {
  if (!Number.isInteger(rowIndex) || rowIndex < 1 ||
      !Number.isInteger(incomingValue) || incomingValue < 2 ||
      incomingValue > 16) {
    throw new Error('INVALID_INCOMING_VALUE_OR_ROW');
  }

  const correctValue = rng.integer(1, 4);
  const incorrectValues = rng.shuffle([1, 2, 3, 4].filter(value => value !== correctValue)).slice(0, 2);
  const operandValues = rng.shuffle([correctValue, ...incorrectValues]);
  const options: ProblemOptionV1[] = operandValues.map((value, ordinal) => ({
    platformId: `row-${rowIndex}-column-${ordinal}`,
    ordinal: ordinal as 0 | 1 | 2,
    value,
  }));

  const problem: ProblemV1 = {
    problemId: `${runId}/row-${rowIndex}`,
    rowIndex,
    cellIndex: cellIndexForRow(rowIndex),
    rowInCell: ((rowIndex - 1) % ROWS_PER_CELL) as 0 | 1 | 2 | 3,
    operation: 'add',
    incomingValue,
    targetValue: incomingValue + correctValue,
    options,
    correctValue,
    correctPlatformId: options.find(option => option.value === correctValue)!.platformId,
  };
  validateAdd20Problem(problem);
  return problem;
}

export function validateAdd20Problem(problem: ProblemV1): void {
  if (problem.options.length !== 3) throw new Error('MATH_OPTIONS_NOT_THREE');
  if (new Set(problem.options.map(option => option.value)).size !== 3) {
    throw new Error('MATH_DUPLICATE_VALUES');
  }
  if (problem.options.some(option => !Number.isInteger(option.value) || option.value < 1 || option.value > 4)) {
    throw new Error('MATH_INVALID_OPERAND');
  }
  if (problem.options.filter(option => problem.incomingValue + option.value === problem.targetValue).length !== 1) {
    throw new Error('MATH_NOT_EXACTLY_ONE_CORRECT');
  }
  if (problem.targetValue > 20 || problem.targetValue < 3) throw new Error('MATH_TARGET_OUT_OF_RANGE');
  const actual = problem.options.find(option => option.platformId === problem.correctPlatformId);
  if (!actual || actual.value !== problem.correctValue ||
      problem.incomingValue + actual.value !== problem.targetValue) {
    throw new Error('MATH_CORRECT_ID_MISMATCH');
  }
}
