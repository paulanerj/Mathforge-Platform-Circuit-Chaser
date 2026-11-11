# Circuit Climb 2.0 — Production successor project

**PM workstream created:** 2026-11-11  
**Current phase:** `CC2-01 — COMPLETE DESIGN BASELINE`; **implementation not yet authorized for production promotion**.  
**Work branch:** `circuit-climb-2-production` in `paulanerj/Mathforge-Platform-Circuit-Chaser`.  
**Read-only accepted game:** product SHA `c8838c30947c2a561bfc8322a6159e4f28fef61a`, QA SHA `eac8d8337a30d22cd41f09b6d78f0e73474cb390`, transfer/fork SHA `0a6f138f229119bc6b6c15ee1f658046c7075f50`.  
**Do not merge into main, mutate accepted SOT-02, or treat later R&D pursuers as approved product code.**

## 1. What this game is

A three-lane, vertical arithmetic escape game. The learner selects one of three numbered platforms to complete the equation and a blue Spark travels automatically along orthogonal blue circuitry (or optional Hop presentation). A correct landing powers the tower; a wrong destination shorts, then returns; a red Pursuer applies fair pressure. Learner mathematics and Pursuer intelligence must operate through deterministic, testable state machines.

**CC2 changes from SOT-02:** explicitly chained number values in four-row power cells with a visible checkpoint reset; capture shielding during automatic outbound and return routes; a finite-perception purposeful Pursuer; Capacitor/Relay special rows; an earned Circuit Pulse; expanded accessible MathForge presentation; and a standalone core with neutral SDK event boundaries.

## 2. CC2-01 governing design package (read in this order)

| Document | Purpose |
|---|---|
| **[01 — Master product spec](./CC2_01_MASTER_PRODUCT_SPEC_V1_0.md)** | Product vision, canonical turn, modes, progression, UX, sound, results and launch scope |
| **[02 — Math and transaction contract](./CC2_01_MATH_AND_TRANSACTION_CONTRACT_V1_0.md)** | Exact four-row arithmetic, attempts/rows, collision precedence, run state and fixed-tick processing |
| **[03 — Pursuer and enemy design](./CC2_01_PURSUER_AND_ENEMY_DESIGN_V1_0.md)** | Perception firewall, belief/search, navigation, capture fairness, proof fixtures, future enemy roster |
| **[04 — Platform, ability and progression catalog](./CC2_01_PLATFORM_ABILITIES_AND_PROGRESSION_V1_0.md)** | Capacitor, Relay, Pulse, power-cell stage schedule, deferred hazards and economy boundaries |
| **[05 — Architecture, SDK and config](./CC2_01_ARCHITECTURE_SDK_CONFIG_V1_0.md)** | Pure headless core, proposed module layout, versioned schemas, replay, standalone/host bridge, performance |
| **[06 — QA and delivery qualification](./CC2_01_QA_ACCEPTANCE_AND_DELIVERY_V1_0.md)** | Mechanical, curriculum, pursuits, browser, device and human evidence gates |
| **[07 — Decision register and design freeze](./CC2_01_DECISION_LOG_AND_FREEZE_V1_0.md)** | Locked design semantics, new SOT divergences, tuning risks, promotion/stop authority |
| **[08 — CC2-02A coder handoff](./CC2_01_CODER_HANDOFF_02A.md)** | Isolated first implementation tranche with exact permitted paths and tests |

**Do not use** the older v0.1 proposal as a competing product authority. It remains preserved for historical planning:
- [Product blueprint v0.1](./CC2_PRODUCT_BLUEPRINT_V0_1.md)
- [Pursuer/engineering proposal v0.1](./CC2_PURSUER_AND_ENGINEERING_CONTRACT_V0_1.md)
- [Parity and decisions v0.1](./CC2_PARITY_AND_DECISIONS_V0_1.md)

## 3. Source and executable evidence

- **[CC2-00 source reconstruction](./CC2_00_SOURCE_RECONSTRUCTION_AND_FEATURE_INVENTORY.md)** — inspected source and historical/R&D provenance.
- **[CC2-00 executable evidence](./CC2_00_EXECUTABLE_EVIDENCE.md)** — actual fresh baseline and experimental CI logs.
- **Frozen SOT-02 original:** 206/206 tests, 21 capability locks, 61/61 Chromium browser checks: **PASS**, including verified protected gameplay blob identities. [CI run](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43115779305).
- **Pursuer 07B1:** 351/351 tests and 61/61 browser checks: **ENGINEERING PASS**; important lateral reacquisition defect **still known**.
- **Graph V2 04C:** 487/487 engineering tests: **PASS**; real chase quality unapproved.
- **Pursuer lab:** unit/build can pass while fixtures report **two failed behavioral expectations**; separate browser verifier has unresolved harness issue. It is **NOT QUALIFIED** as a gameplay solution.

## 4. Gate status

| Gate | Current status | Next proof |
|---|---|---|
| CC2-00 | Source reconstruction and original CI **PASS**; full observed-product acceptance **HELD** | Instrumented real play demonstrating shield and number transition, human chase recording |
| **CC2-01** | **DESIGN PACKAGE COMPLETED — PM baseline, not shipped** | Owner review of product feel/launch scope as needed; no foundational rules left unspecified |
| CC2-02A | **READY AS CODER BRIEF; NOT IMPLEMENTED** | Separate new pure world/math/learner core and headless proof |
| CC2-02B | NOT STARTED | Fair purposeful Pursuer in real graph/perception lab with 07A/F08 fixed |
| CC2-03 | NOT STARTED | Integrated independently playable surface |
| CC2-04 | NOT STARTED | UX, accessibility, sound, SDK adapter and devices |
| CC2-05 | NOT STARTED | Product release evidence and owner approval |

The design can be finished without falsely closing outstanding source-trace and pursuit acceptance gates. New engineering must be isolated in `src/games/circuit-climb-2/` and controlled through the coder handoff. **Never overwrite** `src/games/circuit-climb/`.

## 5. Core design invariants

1. Exactly three choices and one mathematically correct; all three physically reachable.
2. Destination selection, no player path steering or Pursuer veto over routes.
3. Wrong choice travels, shorts and returns; the correct option remains.
4. Correct landing, not initial selection, powers/advances the world.
5. Four-row arithmetic carries the actual resulting value, followed by an explicit checkpoint rebase.
6. Automatic Spark transit shielded; grounded capture requires physical overlap and declared grace/timing.
7. AI sees only legitimate sensed evidence; never future routes, answers or oracle truth.
8. Special effects do not reveal an answer or silently modify correctness.
9. Source owns attempt/result events; score and mastery are separate concepts.
10. Deterministic fixed-tick runtime; seed/config/replay and source hashes qualify every candidate.
11. A renderable board must actually accept every live choice on real devices.
12. No new branch or passing test count automatically confers production acceptance.

## 6. Immediate work queue

**First,** run/finish CC2-00B instrumented browser/human source observations without changing the old product. **Second,** implement the explicitly bounded CC2-02A headless core on a new child branch using the already-written coder brief; build only math, geometry and learner transaction seams. **Third,** bring the independently tested Pursuer into the core in CC2-02B after demonstrated reacquisition and purposeful search.

PM controls phase scope, rollback, QA, code provenance, and any revision to fundamental gameplay rules.
