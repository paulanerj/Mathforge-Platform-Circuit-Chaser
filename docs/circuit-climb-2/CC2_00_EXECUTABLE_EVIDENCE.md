# CC2-00 — Fresh executable QA evidence

**Date:** 2026-11-11  
**Authority status:** Verification evidence only; no production source changes.

## 1. Frozen original baseline — PASS

- Workflow: [SOT-02 baseline CI 43115779305](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43115779305) at commit `e2ecee53c4a9a23885b0fffa592fad1f902c3442`.
- Additional source-identical, doc/workflow-only commits: [43117078801](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43117078801), PASS.
- `git merge-base --is-ancestor` frozen transfer SHA: PASS.
- Seven protected gameplay blob SHAs checked against accepted product SHA `c8838c3...`: PASS, no gameplay edits.
- `npm ci`: PASS. `npm run lint`: PASS.
- `npm test`: **20 test files / 206 tests passed**. 21 locked-capability tests included.
- `npm run build`: PASS, with nonblocking Vite chunking/deprecation notices.
- `npm run test:circuit-climb:browser`: **61/61 PASS in 65.6 seconds**. Widths 320/390/430/590/768 and framing 80/100/120 (430 viewport), render/nonblank checks, playability and each destination, correct landing, wrong short, Pause/Resume, Restart, zero route failures or page errors.

## 2. Later Classic/Alive pursuer R&D 07B1 — ENGINEERING PASS, HUMAN CHASE QUALITY OPEN

- Workflow: [experimental pursuer audit 43117078717](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43117078717), R&D 07B1 checkout exact `dba9e59ddd1ad9976aa9364d2c0713f2a56aa6bc`.
- `npm ci`, lint, unit tests **26 files / 351 passed**, build, and real browser **61/61**: PASS.
- That candidate's commit explicitly preserves the lateral absorbing reacquisition defect recorded by 07A. A passing regression suite does not prove purposeful reacquisition after cross-board loss.

## 3. Graph V2 PURSUER-04C — ENGINEERING PASS, PRODUCT EVALUATION OPEN

- Same workflow run, Graph 04C exact `d7a8115ac03672c10ec1f060c8cf9d57b2422bc3`.
- `npm ci`, typecheck, **33 files / 487 tests passed**, production build: PASS.
- This is evidence of engineering integrity, not acceptance of non-omniscient chasing as fun and effective.

## 4. Standalone pursuer intelligence lab — NOT QUALIFIED

- Branch at exact `06beebb2ec309fe24527b9b45bebb6e69a8caeed`.
- Same [experimental audit workflow](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43117078717).
- `npm ci`, lint, `npm test`, `npm run fixtures`, and build commands returned success, **but `npm run fixtures` itself prints `2 expectation(s) not met` and returns process exit code zero**. These are gameplay behavioral failures, not warnings.
- **F01: stationary visible learner:** expectation `closed legal distance` failed; measured 39% despite 93% perception uptime. The bot can be aware but still fail purposeful closing criteria.
- **F08: lose then stand still:** expectation `reacquired after losing` failed with **0 reacquisitions**. This is the central observed chase-quality failure and must remain a red gate.
- Other diagnostic indicators: F05/F12 capture classified `LIKELY_SEARCH_COLLISION`; fast learner F06 had 0% perception and ended 668 units distant. These are observations, not necessarily independent failed expectations.
- Fixed-timebase simulation made decisions identical at 60/120/144Hz; the render-coupled reference did not. This supports adopting fixed simulation steps in CC2.
- First CI lab-browser attempt failed `ERR_MODULE_NOT_FOUND: playwright-core`; historical lab's own package.json lacks the devDependency imported by `tools/browserVerify.mjs`.
- The first CI-only `npm install` workaround failed because npm's documented optional-peer `edgesOut` resolver defect. With `--legacy-peer-deps`, dependency installation succeeded and the historical browser script started, **but then timed out after 60 seconds waiting to detect its own Vite dev-server URL** (`Error: dev server did not start`); see [workflow 43117478864](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43117478864). This is a **lab harness/browser-verification failure** separate from the two real gameplay fixture failures. The historical lab source and package-lock remain **untouched**. Lab browser verification remains **NOT QUALIFIED**.
- A future CI gate must treat nonzero expectation count as FAILURE even when CLI exits success. Do **not** suppress F01 or F08 to obtain green status.

## 5. Outstanding, not hidden by any green check

- **Mathematical continuity discrepancy**: pre-generated next row starts a new random player value. The supplied unit tests simulate independent contracts, not production's exact runtime value transition.
- **Shield default discrepancy**: handoff says ON; clean source runtime defaults OFF.
- **Live video/human play** with same-source replay and full diagnostics is not yet performed.
- **Device acceptance** on actual iPhone/tablet is not yet performed.
- **Ability/platform/enemy systems** exist as 2.0 proposals, not executable features.

## 6. PM disposition

The SOT-02 executable preservation gate is **PASS**. The 07B1 and Graph 04C engineering test tranches are **PASS**, but the intelligent pursuit *product* gate remains **FAIL/OPEN**. The standalone lab is specifically **NOT QUALIFIED** due to two reproducible unmet gameplay expectations and incomplete browser verification.

Thus CC2-00 source-custody and documentation investigation is complete, but the **full product-reconstruction gate is HELD** pending the two foundational decisions and real-gameplay reproduction of those discrepancies and chase behavior. CC2-01 can advance as design work; CC2-02 successor engine replacement remains unauthorized.
