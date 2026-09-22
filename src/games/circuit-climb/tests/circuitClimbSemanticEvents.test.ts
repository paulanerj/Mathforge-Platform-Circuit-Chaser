import { describe, expect, it, vi } from 'vitest';
import {
  buildCircuitClimbAttemptEvaluatedEvent,
  publishCircuitClimbAttemptEvaluatedEvent,
} from '../runtime/circuitClimbSemanticEvents';
import type { CircuitClimbProblemSnapshot } from '../services/CircuitClimbMathAdapter';

const snapshot: CircuitClimbProblemSnapshot = {
  problemId: 'circuit-climb-problem-7',
  operation: 'addition',
  rowIndex: 7,
  targetEventId: 3,
  playerValue: 8,
  targetValue: 14,
  choices: [5, 6, 7],
  correctChoiceIndex: 1,
  correctPlatformValue: 6,
};

describe('Circuit Climb semantic attempt seam R1', () => {
  it('serializes a correct source-owned platform selection', () => {
    const event = buildCircuitClimbAttemptEvaluatedEvent({
      attemptOrdinal: 4,
      snapshot,
      selectedPlatformValue: 6,
      selectedChoiceIndex: 1,
      isCorrect: true,
    });

    expect(event).toEqual({
      schemaVersion: '1.0.0',
      kind: 'attempt_evaluated',
      attemptId: 'circuit-climb-attempt-4',
      attemptOrdinal: 4,
      problemId: snapshot.problemId,
      rowIndex: 7,
      targetEventId: 3,
      playerValue: 8,
      targetValue: 14,
      selectedPlatformValue: 6,
      selectedChoiceIndex: 1,
      correctPlatformValue: 6,
      status: 'correct',
    });
  });

  it('serializes an incorrect source-owned platform selection without inferring from row progression', () => {
    const event = buildCircuitClimbAttemptEvaluatedEvent({
      attemptOrdinal: 5,
      snapshot,
      selectedPlatformValue: 5,
      selectedChoiceIndex: 0,
      isCorrect: false,
    });

    expect(event.status).toBe('incorrect');
    expect(event.selectedPlatformValue).toBe(5);
    expect(event.correctPlatformValue).toBe(6);
    expect(event.rowIndex).toBe(7);
  });

  it('gives each subscriber an isolated event object and contains subscriber failure', () => {
    const event = buildCircuitClimbAttemptEvaluatedEvent({
      attemptOrdinal: 6,
      snapshot,
      selectedPlatformValue: 6,
      selectedChoiceIndex: 1,
      isCorrect: true,
    });
    const first = vi.fn((received) => {
      received.selectedPlatformValue = 999;
    });
    const second = vi.fn();

    expect(() => publishCircuitClimbAttemptEvaluatedEvent(
      [first, () => { throw new Error('consumer failure'); }, second],
      event,
    )).not.toThrow();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(event.selectedPlatformValue).toBe(6);
    expect(second.mock.calls[0][0].selectedPlatformValue).toBe(6);
    expect(first.mock.calls[0][0]).not.toBe(second.mock.calls[0][0]);
  });

  it('publishes nothing when there are no subscribers', () => {
    const event = buildCircuitClimbAttemptEvaluatedEvent({
      attemptOrdinal: 7,
      snapshot,
      selectedPlatformValue: 5,
      selectedChoiceIndex: 0,
      isCorrect: false,
    });

    expect(() => publishCircuitClimbAttemptEvaluatedEvent([], event)).not.toThrow();
  });

  it('does not invent host completion, mastery or capture semantics', () => {
    const event = buildCircuitClimbAttemptEvaluatedEvent({
      attemptOrdinal: 8,
      snapshot,
      selectedPlatformValue: 6,
      selectedChoiceIndex: 1,
      isCorrect: true,
    });

    expect('completed' in event).toBe(false);
    expect('mastery' in event).toBe(false);
    expect('captured' in event).toBe(false);
    expect('score' in event).toBe(false);
  });
});
