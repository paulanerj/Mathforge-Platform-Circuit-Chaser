import React, { forwardRef, useImperativeHandle } from 'react';
import { CircuitClimbSurface } from '../CircuitClimbSurface';
import {
  useCircuitClimbPrototypeRuntime,
} from './useCircuitClimbPrototypeRuntime';
import type {
  CircuitClimbAttemptEvaluatedCallback,
} from './circuitClimbSemanticEvents';

export interface CircuitClimbHostBridgeApi {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  onAttemptEvaluated(callback: CircuitClimbAttemptEvaluatedCallback): () => void;
}

export interface CircuitClimbHostBridgeProps {
  onExitRequest?: () => void;
}

export type CircuitClimbHostControllableRuntime = Pick<
  ReturnType<typeof useCircuitClimbPrototypeRuntime>,
  'beginGame' | 'restartGame' | 'togglePause' | 'onAttemptEvaluated'
>;

export function createCircuitClimbHostBridgeApi(
  runtime: CircuitClimbHostControllableRuntime,
): CircuitClimbHostBridgeApi {
  return {
    start() {
      runtime.beginGame();
    },
    pause() {
      runtime.togglePause(true);
    },
    resume() {
      runtime.togglePause(false);
    },
    restart() {
      runtime.restartGame();
    },
    onAttemptEvaluated(callback) {
      return runtime.onAttemptEvaluated(callback);
    },
  };
}

/**
 * Additive host-neutral embed seam.
 *
 * This component does not alter Circuit Climb gameplay or infer educational
 * semantics from presentation. It exposes only source-owned lifecycle controls
 * already present on the runtime and the accepted attempt_evaluated event seam.
 *
 * Mount/unmount ownership remains with the external host. No completion,
 * mastery, capture, pursuer, score, or navigation verdict is emitted here.
 */
export const CircuitClimbHostBridge = forwardRef<
  CircuitClimbHostBridgeApi,
  CircuitClimbHostBridgeProps
>(function CircuitClimbHostBridge({ onExitRequest }, ref) {
  const runtime = useCircuitClimbPrototypeRuntime();

  useImperativeHandle(
    ref,
    () => createCircuitClimbHostBridgeApi(runtime),
    [runtime.beginGame, runtime.restartGame, runtime.togglePause, runtime.onAttemptEvaluated],
  );

  return (
    <CircuitClimbSurface
      runtime={runtime}
      onExit={onExitRequest ?? (() => {})}
    />
  );
});

export default CircuitClimbHostBridge;
