# CC2-01 — Coder-Ready Handoff for CC2-02A (Isolated Math/World/Learner Core)

**Issue:** CC2-02A. **Phase:** First new executable contract implementation, not complete game.  
**Important:** This is a ready-to-issue assignment and design artifact. CC2-00B recorded gameplay/human traces remain an open verification tranche; **do not claim CC2-02 or CC2-01 production acceptance based on this document**.

## 0. Authority to read

1. [CC2-01 master product specification](./CC2_01_MASTER_PRODUCT_SPEC_V1_0.md).
2. [CC2-01 math and transaction contract](./CC2_01_MATH_AND_TRANSACTION_CONTRACT_V1_0.md).
3. [CC2-01 pursuer and enemy contract](./CC2_01_PURSUER_AND_ENEMY_DESIGN_V1_0.md) (only for interface boundaries at this phase; do not implement AI).
4. [CC2-01 architecture and SDK boundaries](./CC2_01_ARCHITECTURE_SDK_CONFIG_V1_0.md).
5. [CC2-01 QA](./CC2_01_QA_ACCEPTANCE_AND_DELIVERY_V1_0.md).
6. [CC2-00 executable evidence](./CC2_00_EXECUTABLE_EVIDENCE.md).
7. Protected historical source under `src/games/circuit-climb/`; SOT gameplay SHA `c8838c3`, transfer `0a6f138`.
8. This assignment is controlled by [CC2-01 decision register](./CC2_01_DECISION_LOG_AND_FREEZE_V1_0.md).

## 1. Branching and prohibited scope

**Work branch:** Create `feature/cc2-02a-core-world-math` from the current `circuit-climb-2-production` HEAD. Do not develop on `main`, `circuit-climb-successor-sot-02`, experimental 07B1/Graph V2, or the accepted product source. Do not modify or delete any path under `src/games/circuit-climb/` in this tranche.

**New implementation scope** limited to:
- `src/games/circuit-climb-2/core/`
- `src/games/circuit-climb-2/math/`
- `src/games/circuit-climb-2/world/`
- `src/games/circuit-climb-2/learner/`
- `src/games/circuit-climb-2/config/`
- `src/games/circuit-climb-2/tests/`
- A standalone minimal test runner or dev harness *inside* `src/games/circuit-climb-2/devtools/` if necessary.
- The dedicated CI workflow and CC2-02A evidence report under `docs/circuit-climb-2/`.

Do not import the old React hook as the new engine. Old code can inform a pure geometry helper port, but keep a single new authority. No pursuer brain, power-ups, extra enemies, production UI skin, SDK adapters, or SOT source rewrite in 02A.

## 2. Required feature order

**02A.0 — Reconfirm custody and tests.** Record exact parent SHA and compare protected SOT gameplay file blob identities against `c8838c3`. Run untouched baseline test/build/browser to prove no source regression before introducing new code.

**02A.1 — Immutable domain/config.** Implement versioned `RunConfigV1`, `ProblemV1`, `PlatformV1`, `RowV1`, `RunStateV1`, `AttemptEvaluatedV1`, `RowCompletedV1`, `VoltageRebaseV1`, explicit command/result unions and deterministic run seed/PRNG stream splitter. Validate/reject unknown config and impossible ranges; export/import/reset defaults. Separate mathematical inputs from visual preferences. No `any` in core domain.

**02A.2 — The four-row addition cell.** Implement exact `add20` math contract: seeded start in 2–4, addends 1–4, exactly one correct among 3, target at most 20, next problem starts at previous **committed** result, explicit seed-based rebase after every fourth correct landing. Problem identity/options don't change on wrong retry or resize.

**02A.3 — Shared physical world and routes.** Port only evidenced geometry/collision invariants into a pure world service. Maintain 600 logical width reference, 104×62 base platforms, 32 actor radius, row gap 205 and 80–120% framing with derived columns and clear corridors. One route planner validates all offered choices and returns typed failure. No zero-length fallback or accidental platform-penetration exception. Derive renderer projection separately, but no React needed yet.

**02A.4 — Learner state machine and ledger.** Implement route accepted → evaluated once → outbound → correct landing/row commit or wrong short/return → READY. Add ability and pursuer *interfaces* only (inert/null placeholder ports), not functionality. Shield state and landing grace must be representable. Implement PAUSE/RESUME/RESTART/CAPTURE/QUIT lifecycle and exact terminal-event accounting without a live bot.

**02A.5 — Headless scenario runner.** Allow a test script to supply seed/config/commands/ticks and inspect event stream, replay hashes and world positions. The runner must be enough to produce seeded reproducible math/route/landing sequences without Canvas or a browser. Create source-backed snapshots and invariant checks; do not write tests against fabricated local mocks instead of the actual core.

**02A.6 — Minimal standalone demo.** Optional development-only visual surface showing current equation, 3 choices, physical Circuit path, wrong return, green power and cell rebase with a `No pursuer — CC2-02A` clearly visible label. It must not be presented as the finished 2.0 game.

## 3. Mandatory tests and evidence

- 1,000 seeded four-row cells (4,000+ problems) have unique correct option, correct target, 2 distinct distractors, exact chained values and explicit rebase after 4.
- A wrong choice does not change the Spark number or regenerate the row. Wrong-wrong-correct yields 3 attempts, 1 correct landing, 1 row completion, 2 disabled wrong candidates.
- Every option has legal, nondegenerate route at 80/90/100/110/120% framing, left/center/right, and across supported layout widths. Hop can be a separate positive route result but cannot skip math ledger.
- All 21 accepted legacy capability locks are catalogued, then implemented as equivalent new source-backed tests. If one is legitimately pursuer-specific and not testable before 02B, record it as **DEFERRED/RED** with a precise planned test, not as PASS.
- SELECT on dead option, wrong row, paused/terminal, or when busy yields named reject and no mathematical attempt.
- Pause in middle of outbound and return produces identical state on repeated ticks until resume; restart clears stale return, aftereffects, pending inputs and event streams.
- Correct row completion issued once and only after landing; host/renderer cannot initiate it. `RUN_ENDED` issued once with explicit reason when headless test triggers termination.
- Same seed/config/input tick script results in byte-identical event digests across many repeated runs and independent render refresh schedules (runner can feed ticks directly).
- No default or generated platform collider is penetrated by Spark; route validity must not depend on the red Pursuer's future position.
- Zero console errors in preview. CI steps explicitly fail on unmet expectation count (no diagnostic command fake green).

**Artifacts required:** precise parent/base/HEAD SHAs, file-change list, frozen original file hashes, lint/unit/build results, generated golden fixture sample, 10–20 row replay JSON showing rebase/attempts, geometry coverage table and a minimal demo URL if available. Include a before/after behavior parity note; do not claim unexecuted tests.

## 4. Acceptance matrix for PM

| Gate | Acceptance |
|---|---|
| CUSTODY | Original gameplay code and accepted SOT/QA branches unchanged |
| MATHEMATICAL | All packs/fixtures correct; no hidden number rewrite |
| ROUTING | Every offered destination has legal path at all permitted framings |
| TRANSACTIONS | Exactly-once attempts and row completions; wrong travel/short/return preserved |
| REPLAY | Same seed/config/input => identical hashes independent of render FPS |
| STATE | Pause/restart/end deterministic and observable |
| SCOPE | No AI/ability/SDK/visual integration drift |
| EVIDENCE | Source-backed tests, fresh logs, decision/deviation report, reviewable demo |

An unplayable board or a green test suite built from simulated mocks is a **FAIL**.

## 5. Explicit stop and rollback

If any original protected blob changes: revert, disclose SHA and stop. If a live option has no route: do not auto-select, teleport or change the answer; emit `NO_LEGAL_ROUTE`, failing fixture and stop. If a mathematical value discontinuity appears without `VOLTAGE_REBASE`: stop. If event duplication occurs: stop. If the new engine cannot function independently of React/host, correct architecture before layering a pursuer.

Do not weaken existing capability locks. Do not edit Graph V2 R&D in place to squeeze it into the core. Do not attempt 02B until 02A core and the CC2-00B recorded source discrepancies are both reviewed.

## 6. Required response from the coder

Return in one report:
1. GitHub branch URL, parent/head commit, clean status and changed files.
2. Requirement-by-requirement **PASS/FAIL/NOT RUN**, with test output and hash-linked artifacts.
3. Any divergence from SOT-02 clearly labelled “accepted new CC2 contract” vs “unintended regression.”
4. Clickable standalone demo instructions and at least one replay trace with named event IDs.
5. Unresolved defects, performance risks, assumptions, and the exact next safe action.
6. Explicit statement that the old product, R&D bot and SDK were untouched.

**PM must not accept a green implementation solely from code review.** The coder must prove it through executable source-backed tests and a playable mini-demo.
