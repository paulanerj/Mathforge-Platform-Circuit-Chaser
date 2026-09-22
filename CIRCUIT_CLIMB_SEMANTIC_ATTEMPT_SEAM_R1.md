# CIRCUIT CLIMB — SOURCE SEMANTIC ATTEMPT SEAM R1

**Status:** PRODUCT-SIDE SUCCESSOR CANDIDATE — NOT PRODUCT AUTHORITY  
**Accepted gameplay authority:** `c8838c30947c2a561bfc8322a6159e4f28fef61a`  
**Accepted QA authority:** `eac8d8337a30d22cd41f09b6d78f0e73474cb390`  
**Successor base:** `circuit-climb-successor-sot-02@0a6f138f229119bc6b6c15ee1f658046c7075f50`

## Purpose

Expose the learner's already-source-owned platform answer as a neutral semantic event without inferring correctness from canvas state, row score, arrival effects, pursuer state or presentation.

## Attempt boundary

A learner attempt is published only when all of the following are true:

1. the run is started;
2. the run is not paused or captured;
3. no prior learner travel is in flight;
4. the selected platform is alive and belongs to the next row;
5. the source has accepted the physical realization:
   - circuit mode: `planLearnerSelection(...)` returned a valid routed travel;
   - hop mode: the source constructed the hop travel;
6. the row still owns its `problemSnapshot`.

The event is published immediately after that acceptance and before arrival/feedback consequences.

## Non-attempts

The seam does not publish for:

- pointer movement/hover;
- invalid row input;
- dead platform input;
- selection while paused/captured/in-flight;
- `NO_DESTINATION_ROW`;
- `NO_LEGAL_ROUTE`;
- `DEGENERATE_ROUTE`;
- route animation;
- arrival animation;
- pursuer movement;
- capture;
- score/best-row changes.

A routing failure is a system defect, not wrong learner math.

## Source-owned correctness

Correctness comes from the row's existing mathematical state:

- `CircuitClimbProblemSnapshot.correctChoiceIndex`;
- `CircuitClimbProblemSnapshot.correctPlatformValue`;
- the runtime-owned `platform.correct` assigned from that snapshot.

The semantic helper does not regenerate or re-evaluate the mathematics.

## Event

`attempt_evaluated` contains:

- schema version;
- source-owned attempt ID / ordinal;
- problem ID;
- row index;
- target-event ID;
- incoming player value;
- target value;
- selected platform value;
- selected choice index;
- correct platform value;
- source-owned status: `correct` / `incorrect`.

## Attempt identity

The runtime owns a monotonic attempt ordinal in a React ref.

Restart resets gameplay but does not reset the attempt ordinal while the mounted source instance remains alive.

Unmount/remount creates a new source instance and a new identity sequence.

## Subscription boundary

`runtime.onAttemptEvaluated(callback)` registers an observer and returns an unsubscribe function.

Each observer receives a cloned event object.

Observer mutation or exceptions cannot alter gameplay or another observer's payload.

## Completion / mastery exclusions

This event does not contain:

- host completion;
- assignment completion;
- mastery;
- score;
- best row;
- capture verdict;
- pursuer state.

Local capture remains a source-local run terminal event and requires a later explicit host policy before promotion.

## Frozen non-goals

This transaction must not change:

- `CircuitClimbMathAdapter.ts`;
- `circuitClimbGeometry.ts`;
- `circuitClimbLearnerRouting.ts`;
- `circuitClimbPursuer.ts`;
- `CircuitClimbSurface.tsx`;
- `circuit-climb.css`;
- target generation;
- route feasibility;
- wrong-answer consequences;
- transit shield;
- capture policy;
- pursuer tuning or R&D architecture.

## Required validation

Fresh acceptance requires:

1. exact SOT-02 ancestry;
2. bounded successor diff;
3. protected gameplay blob identities;
4. TypeScript/lint;
5. full unit suite;
6. semantic seam tests;
7. production build;
8. supported Circuit Climb browser smoke;
9. static semantic exclusions.

GitHub Actions capacity is currently exhausted, so the candidate remains unaccepted until those checks actually execute.
