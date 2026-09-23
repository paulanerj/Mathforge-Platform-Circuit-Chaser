import { describe, expect, it, vi } from 'vitest';
import {
  createCircuitClimbHostBridgeApi,
} from '../runtime/CircuitClimbHostBridge';
import type {
  CircuitClimbAttemptEvaluatedCallback,
} from '../runtime/circuitClimbSemanticEvents';

describe('Circuit Climb host bridge R1', () => {
  it('maps only existing source-owned lifecycle controls', () => {
    const beginGame = vi.fn();
    const restartGame = vi.fn();
    const togglePause = vi.fn();
    const onAttemptEvaluated = vi.fn(() => vi.fn());

    const api = createCircuitClimbHostBridgeApi({
      beginGame,
      restartGame,
      togglePause,
      onAttemptEvaluated,
    });

    api.start();
    api.pause();
    api.resume();
    api.restart();

    expect(beginGame).toHaveBeenCalledTimes(1);
    expect(togglePause).toHaveBeenNthCalledWith(1, true);
    expect(togglePause).toHaveBeenNthCalledWith(2, false);
    expect(restartGame).toHaveBeenCalledTimes(1);
  });

  it('passes the accepted attempt subscription through without re-evaluating math', () => {
    const unsubscribe = vi.fn();
    const onAttemptEvaluated = vi.fn(() => unsubscribe);
    const api = createCircuitClimbHostBridgeApi({
      beginGame: vi.fn(),
      restartGame: vi.fn(),
      togglePause: vi.fn(),
      onAttemptEvaluated,
    });
    const callback: CircuitClimbAttemptEvaluatedCallback = vi.fn();

    expect(api.onAttemptEvaluated(callback)).toBe(unsubscribe);
    expect(onAttemptEvaluated).toHaveBeenCalledWith(callback);
  });

  it('does not expose completion, mastery, score, capture, pursuer or math evaluation controls', () => {
    const api = createCircuitClimbHostBridgeApi({
      beginGame: vi.fn(),
      restartGame: vi.fn(),
      togglePause: vi.fn(),
      onAttemptEvaluated: vi.fn(() => vi.fn()),
    });

    for (const forbidden of [
      'complete',
      'mastery',
      'score',
      'capture',
      'pursuer',
      'evaluate',
      'setCorrectness',
      'result',
    ]) {
      expect(forbidden in api).toBe(false);
    }
  });
});
