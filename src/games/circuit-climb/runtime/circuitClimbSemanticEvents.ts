import type { CircuitClimbProblemSnapshot } from '../services/CircuitClimbMathAdapter';

export interface CircuitClimbAttemptEvaluatedEvent {
  schemaVersion: '1.0.0';
  kind: 'attempt_evaluated';
  attemptId: string;
  attemptOrdinal: number;
  problemId: string;
  rowIndex: number;
  targetEventId: number;
  playerValue: number;
  targetValue: number;
  selectedPlatformValue: number;
  selectedChoiceIndex: number;
  correctPlatformValue: number;
  status: 'correct' | 'incorrect';
}

export type CircuitClimbAttemptEvaluatedCallback = (event: CircuitClimbAttemptEvaluatedEvent) => void;

export function buildCircuitClimbAttemptEvaluatedEvent(input: {
  attemptOrdinal: number;
  snapshot: CircuitClimbProblemSnapshot;
  selectedPlatformValue: number;
  selectedChoiceIndex: number;
  isCorrect: boolean;
}): CircuitClimbAttemptEvaluatedEvent {
  return {
    schemaVersion: '1.0.0',
    kind: 'attempt_evaluated',
    attemptId: `circuit-climb-attempt-${input.attemptOrdinal}`,
    attemptOrdinal: input.attemptOrdinal,
    problemId: input.snapshot.problemId,
    rowIndex: input.snapshot.rowIndex,
    targetEventId: input.snapshot.targetEventId,
    playerValue: input.snapshot.playerValue,
    targetValue: input.snapshot.targetValue,
    selectedPlatformValue: input.selectedPlatformValue,
    selectedChoiceIndex: input.selectedChoiceIndex,
    correctPlatformValue: input.snapshot.correctPlatformValue,
    status: input.isCorrect ? 'correct' : 'incorrect',
  };
}

export function publishCircuitClimbAttemptEvaluatedEvent(
  listeners: Iterable<CircuitClimbAttemptEvaluatedCallback>,
  event: CircuitClimbAttemptEvaluatedEvent,
): void {
  for (const listener of listeners) {
    try {
      listener(structuredClone(event));
    } catch (error) {
      console.error('[Circuit Climb semantic seam] attempt callback failed', error);
    }
  }
}
