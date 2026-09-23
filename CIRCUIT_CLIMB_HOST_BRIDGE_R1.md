# CIRCUIT CLIMB — HOST-NEUTRAL EMBED BRIDGE R1

**Status:** PRODUCT-SIDE ADDITIVE CANDIDATE  
**Parent semantic seam:** `f186fe211bc6427bf59f0216254e78071f9c4046`  
**Gameplay authority remains:** `c8838c30947c2a561bfc8322a6159e4f28fef61a`

## Purpose

Provide a narrow external-host mounting/control seam on top of the already accepted
`attempt_evaluated` semantic event without changing protected gameplay files.

## Exposed host controls

- `start()` -> existing `beginGame()`;
- `pause()` -> existing `togglePause(true)`;
- `resume()` -> existing `togglePause(false)`;
- `restart()` -> existing `restartGame()`;
- `onAttemptEvaluated(callback)` -> existing accepted source subscription.

React mount/unmount remains external-host ownership.

## Explicit non-goals

The bridge does not expose or infer:

- host completion;
- local result;
- mastery;
- score;
- best row;
- capture verdict;
- pursuer state;
- correctness recomputation;
- route failure as wrong learner math;
- navigation decisions.

The only educational event remains the source-owned `attempt_evaluated` event.

## Protected product files

This transaction must not modify:

- `CircuitClimbSurface.tsx`;
- `CircuitClimbMathAdapter.ts`;
- `circuitClimbGeometry.ts`;
- `circuitClimbLearnerRouting.ts`;
- `circuitClimbPursuer.ts`;
- `circuit-climb.css`;
- the already accepted semantic event helper/runtime publication code.

## Gen2 implication

Once this bridge is validated, Gen2 may build a bounded adapter over the explicit
host-control + attempt-event contract. Until a separately accepted source result seam
exists, a Gen2 Circuit Climb adapter must advertise learner evidence but **must not**
invent `output.result`, completion or mastery from capture/score/presentation.
