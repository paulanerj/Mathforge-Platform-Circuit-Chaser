# CC2-01 — Mathematical Generation, Transaction and Run-State Contract v1.0

**Status:** Normative CC2 design baseline; implementation unstarted. Inherited behavior is distinguished from explicit CC2 changes. **No mathematical rules may be inferred from rendering.**

## 1. Mathematical model and D15 resolution

**CC2 design decision D15:** the Spark carries its actual solved total through a **four-row power cell**. After four correct landings, a **visible, explicitly labelled voltage rebase** establishes the next cell's opening value. This replaces SOT-02's silent independent random number on every row. The reset is a world mechanic, *not* a mathematical claim that `a+b` equals the new starting value.

For addition every row requires `a + b = target`, with `a` the current displayed Spark value; `b` is the selected platform operand. After correct landing `SparkValueNext = target = a+b`. The next row may be prepared early, but its `a` MUST exactly equal this computed result unless a checkpoint rebase is explicitly queued and completed.

**Starter pack `add20` v1:**
- Four correct rows per power cell; initial `a` is seeded in integer range 2–4 inclusive.
- For each row, draw correct positive `b` from 1–4 inclusive, set `target=a+b`. The four-row maximum is 4 + 4*4 = 20, so all valid targets remain within 20 without emergency clipping.
- Two distinct wrong options are drawn deterministically without replacement from `{1,2,3,4} \ {b}`. There is exactly one correct displayed `b` and all choices remain positive.
- Shuffle choices by the **math RNG stream** with uniform seed-based permutation, not `Math.random`.
- The score and row number are unaffected by where the correct option appears.
- After fourth correct landing, `CELL_COMPLETED` occurs and the next cell is created with a **new seeded a = 2..4**. A visible `VOLTAGE_REBASE(oldTarget, newStart, cause=CELL_RECHARGE)` occurs exactly once before next READY; its transition cannot be mistaken for a new equation. Checkpoint changes cannot modify a row already answered.
- If an old row is revisited in a replay, its exact options, target, identity and result are immutable.
- Recommended generator guard: validate all generated choices and all three route feasibilities before publishing the row. Fail closed with a typed generation error in development; never manufacture an undetected impossible option.

**Example:** `4+3=7` → `7+4=11` → `11+2=13` → `13+4=17` → visible “Cell recharged; Spark now starts at 3” → `3+…`. No hidden `17 → 3` jump.

**Future packs:**
- `add50`: same four-row cell, initial/operands constrained so maximum bound is not exceeded.
- `subtract20`: starting range and candidate values must prevent unintended negative answers unless signed arithmetic is explicitly enabled.
- `mixed20`: operation symbol and result sign visible; never reuse an addition-only validator for subtraction.
- `multiply/divide`: not launch-default; validation must enforce allowed tables, integral quotients (where required), nonzero divisors and a one-correct-choice guarantee.
- Problem scheduler receives `curriculumId`, `cellIndex`, `rowWithinCell`, `previousResult`, `seed`, `difficultyBand`. It returns a frozen `ProblemV1` record and never takes chase-state inputs.

## 2. Mathematical and geometry invariants

1. Exactly three live numbered options at initial READY, and exactly one satisfies the frozen equation.
2. Each option has a unique stable platform ID, unique answer value and *legal* route (regardless of correctness).
3. Correctness equals mathematical equality, not `correctChoiceIndex` alone; frozen index is audited against actual operation.
4. Wrong options are selectable and remain disabled only for the active row after their own short/return.
5. At least one correct option remains after any number of wrong attempts.
6. Current Spark value can change only on correct landing or explicit cell rebase, never during selection, wrong transit, pause, resize, host event or visual effect.
7. `next.a == prior.target` within a cell after correct landing. The only exception has explicit `VOLTAGE_REBASE` with old/new values and reason.
8. No retry regenerates options; no wrong attempt regenerates a question or moves the camera past a row.
9. The game must never grant `ROW_COMPLETED` solely because a correct option was selected; physical arrival is a separate event.
10. Layout and render settings do not change the generated problem or its assessment status.

## 3. Frozen domain record shapes (conceptual TypeScript, not existing SDK API)

```ts
type OperationV1 = 'add' | 'subtract';
type ProblemV1 = {
  problemId: string; // stable seed/session/row address
  curriculumId: string;
  cellIndex: number;
  rowIndex: number;
  rowInCell: number; // 0..3
  operation: OperationV1;
  incomingValue: number;
  targetValue: number;
  options: readonly { platformId: string; value: number; ordinal: 0|1|2 }[];
  correctPlatformId: string;
  correctValue: number;
  generationRevision: 1;
};
type AttemptEvaluatedV1 = {
  eventType: 'attempt_evaluated';
  schemaVersion: 1;
  runId: string; attemptId: string; ordinal: number;
  problemId: string; rowIndex: number; platformId: string;
  operation: OperationV1; incomingValue: number;
  selectedValue: number; targetValue: number; correctValue: number;
  correctness: 'correct'|'incorrect';
  supportUsed: boolean; acceptedAtTick: number;
};
type RowCompletedV1 = {
  eventType: 'row_completed';
  schemaVersion: 1;
  runId: string; problemId: string; attemptId: string;
  rowIndex: number; resultValue: number; landedAtTick: number;
};
```

IDs are source-generated and stable under deterministic replay. The schema registry has one concrete definition; adapters cannot recompute correctness. These examples define conceptual payloads; actual code is authored only after CC2-02 authorization.

## 4. Explicit run and turn states

**Run lifecycle:** `IDLE -> READY -> ACTIVE -> (PAUSED) -> ENDED`; restart returns to a fresh `READY` with a new `runId` and retained persisted best-height only. Pause is an orthogonal frozen flag, not a mathematical transition. A captured/ended run cannot resume or accept choices. `DISPOSED` is a terminal unmount state.

**Turn lifecycle:** `READY -> ROUTE_ACCEPTED -> OUTBOUND_TRAVEL -> CORRECT_LANDING -> ROW_COMMIT -> (CELL_REBASE if due) -> READY`, or `READY -> ROUTE_ACCEPTED -> OUTBOUND_TRAVEL -> WRONG_LANDING -> SHORT -> RETURN_TRAVEL -> READY`.

**Selection errors:** `BUSY`, `PAUSED`, `NOT_STARTED`, `CAPTURED`, `DEAD_OPTION`, `WRONG_ROW`, `UNKNOWN_PLATFORM`, `NO_DESTINATION_ROW`, `NO_LEGAL_ROUTE`, `DEGENERATE_ROUTE`, `GENERATION_INVALID`. Invalid input creates no `AttemptEvaluated`, no trace credit, no movement and no platform short. An impossible route is a **system defect** and immediately records a failure artifact, not an incorrect learner answer.

**Accepted attempt:** physical route valid first; then the mathematical attempt is irrevocably evaluated once and an outbound travel is created. During travel the core may publish `TRAVEL_STARTED` and deterministic geometric milestones, but only a landing may create a row completion.

## 5. Exact event order and collision precedence

**Fixed tick order, unless PAUSED/ENDED:**

1. Apply run-control input (pause/restart/exit) before advancing any world subsystem. Pause freezes this tick.
2. Check any vulnerable *pre-existing grounded actor overlap* from the previous committed snapshot. A valid overlap captures before a fresh math selection; the same tick cannot erase an already established collision by beginning shielded travel.
3. Read and order player inputs by assigned tick + monotonic sequence. Accept at most one selection; validate path. Queue Pulse only when READY (not in transit).
4. If accepted, publish `attempt_evaluated` exactly once and start outbound movement; begin transit protection now. Only an explicit `PULSE_ACTIVATED` consumes charge.
5. Advance deterministic world/sensors/brain/navigation/actor movement and effect durations once per tick.
6. Advance Spark travel. If landing, resolve **correct or wrong**, emit named landing; correct commits height/number/event one time, wrong shorts and prepares return.
7. Perform post-movement capture adjudication for **vulnerable grounded** Spark only; an arriving Spark receives the explicit landing grace for the configured number of ticks. During protected outbound/return travel and grace, contact has no capture effect.
8. Update world retention/camera suggestions, stage goals and derived score; freeze a terminal `RUN_ENDED` snapshot exactly once. A final goal-row completion at step 6 takes precedence over same-tick capture; this is explicit.
9. Emit one immutable batch of events in order and create the next rendered snapshot. Audio/haptics subscribe afterward and cannot decide logic.

If a correct landing and Pulse activation are both pressed at a tick boundary, only inputs valid in the READY state at step 3 are honored. No queued or retroactive ability after leaving READY. Restart clears every pending attempt, scheduled effect, landing, hint and input; no late callback may alter the new run.

**Transit/capture policy D04:** `transitShieldDefault = true` for CC2, including wrong-answer outbound and mandatory return. **Provisional post-landing grace:** 250 ms at fixed 60Hz (15 ticks), visible in a restrained bubble and configurable only in Developer with a named preset. This number is an initial design target; fairness tuning and regression may change it through a versioned decision, never silently.

## 6. Attempts, scoring and evidence

A single mathematically incorrect, physically accepted selection yields **one** incorrect attempt at selection acceptance, even though it triggers wrong landing and return. A correct accepted selection yields **one** correct attempt. Completed row increments only when that correct attempt actually lands. No duplicated credit from repeated UI events, route callbacks, timeouts or screen rerender.

**Raw educational evidence:** attempted problem count, correct attempts, wrong attempts, operation/curriculum, elapsed active decision time, support/hint flag, row completions and exact solved equation list. Accuracy = correct attempts / accepted attempts (0/0 displayed `—`, not 100%). If wrong then right on one row, there are two attempts, one solved equation, one completed row. `supportUsed=true` is inherited by any attempt after a hint on that problem.

**Game score (provisional transparent formula):** 100 × completed rows + 20 × correct-first-attempt rows + checkpoint bonus 50 × completed cells. Abilities and enemies cannot change accuracy or answer evaluation; cosmetic score effects are separate. Incorrect attempts carry no additional arbitrary score subtraction and consume chase time while standing. Persist best row and best score independently per mode/curriculum/version.

**Result:** `RUN_ENDED` includes explicit reason `CAPTURED`, `PRACTICE_GOAL`, `CHALLENGE_GOAL`, `QUIT`, `RESTARTED` (for closing previous run) or `SYSTEM_ABORT`; reason is not inferred from visual overlays. Challenge win takes precedence over capture at the goal landing tick; no accidental mastery is derived.

## 7. Determinism, snapshots and generation

Create a canonical integer or string seed at run start. Derive independent streams `math`, `world`, `pursuer`, `special`, `vfx`; drawing extra particles can never change the next equation. Use versioned PRNG and stable integer arithmetic where practical. Store `runId`, seed, config schema/version/hash, initial state and ordered player input events with ticks.

A replay on the same core version and identical seed/config/input sequence must produce identical state/event digests at specified ticks independent of display FPS, pause/re-render behavior and machine. Replays compare world snapshots, not raw pixels. A config import with unknown schema/keys fails validation (no partial mutation); Settings can export/import/reset to defaults in Development. Production user presets contain only reviewed safe parameters.

Pre-generate rows as needed, but generate row `r+1` from **the committed correct result** of row `r`, never speculative unknown branches. Since exactly one answer is mathematically correct, the next result is deterministic, but it is still invalid to advance the rendered Spark number before landing. The world may prepare candidate geometry ahead independently of the mathematical content.

## 8. Test examples required before gate

- Addition chain and rebase: `4+3=7`, `7+4=11`, `11+2=13`, `13+4=17`, then visible reset to a seeded 2–4; **never** silent random `17→3`.
- Attempt accepted while target correct but route fails => no accepted attempt, no row, explicit `NO_LEGAL_ROUTE`.
- Wrong then wrong then correct => 3 attempts, 1 row completion, 2 dead options, frozen target, correct last option still live.
- Pause halfway through outbound/return/landing grace => exact tick/effect duration unchanged until resume.
- Capture during shielded transit => no capture; vulnerable grounded capture => one end event; restart => no stale end.
- Retry click, double pointer+keyboard input and repeated animation callback => at most one accepted attempt per valid distinct selection.
- Same seed + same input ticks across 30/60/90/120/144fps => equal hashes and score/learning record.
- At every row in 1000+ seeds, exact one mathematically correct choice, three unique candidate values, target in allowed range and legal route to each.
- All `RowCompleted` events point to a prior accepted correct attempt with same problem/row ID; each accepted attempt has exactly one corresponding mathematical assessment and never more than one completed-row event.

The 2.0 mathematical contract is a deliberate, documented departure from the source's independent next-row number. The original SOT-02 files must remain unmodified.
