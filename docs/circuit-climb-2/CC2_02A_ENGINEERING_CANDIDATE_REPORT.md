# CC2-02A — Isolated Math, World and Learner Engine: Engineering Candidate Report

**Date:** 2026-11-11 (Colombia local) / 2026-11-12 UTC CI  
**Authority:** Circuit Climb 2.0 project-management workstream  
**Gate:** CC2-02A source-backed engineering; **candidate built and tested, not yet merged or accepted into the 2.0 governing branch**  
**Working branch:** `feature/cc2-02a-core-world-math`  
**Parent production-design SHA:** `fe3f88c629548ce0f21540ef3fc5a748b16000c8`  
**Protected SOT-02 game SHA:** `c8838c30947c2a561bfc8322a6159e4f28fef61a`  
**Protected SOT-02 transfer SHA:** `0a6f138f229119bc6b6c15ee1f658046c7075f50`  
**Draft review PR:** [#1: CC2-02A isolated learner core](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/pull/1)

## 1. Executive result

**A genuinely new, source-owned and separately playable learner engine now exists.** This is not merely a new design document, nor a copy of the old React hook. The new engine uses its own deterministic arithmetic generator and source-ledger/state machine. It inherits the *proven pure routing and collision functions* as audited isolated ports, avoiding changes to the accepted old product. It runs without a Pursuer, SDK host, WebAudio or React UI and can be driven entirely from a headless test.

No accepted gameplay files have been edited. A GitHub comparison from the CC2 design baseline lists only added files in `src/games/circuit-climb-2/` and one dedicated CI workflow.

## 2. Implementation inventory

| Area | Implemented file | Proven behavior |
|---|---|---|
| Config and provenance | `config/runConfig.ts` | Versioned, validated, export/import/reset, full integer 80–120% framing; per-run hash |
| Independent reproducible RNG | `config/prng.ts` | One seed derived into independent math/world/pursuer/special/VFX streams |
| Mathematical core | `math/add20.ts` | Exactly three distinct operands, one correct, stable IDs; four-row cell, valid sums ≤20 |
| Shared geometry | `world/legacyGeometry.ts` | Audit port of original SOT-02 pure actor clearance and collision; original import independent |
| Accepted route planner | `world/legacyLearnerRouting.ts` | Audit port of pure orthogonal route selection with explicit failure reasons |
| Typed world service | `world/world.ts` | Geometry, row/platform IDs, 80–120% zoom, legal routes, Hop samples, bounded row retention |
| New transaction engine | `core/CircuitClimbCore.ts` | Accepted attempts, outbound, correct landing, wrong short/return, Pause/Resume, Restart/Quit/Capture seam, scoring, event log |
| Actual UI demo | `devtools/cc2-02a.html`, `cc2-02a.ts` | Responsive three-choice buttons, live Canvas world, correct/wrong feedback, Pause/New Run, settings and replay export |
| Headless golden run | `devtools/exportGolden.mts` | Drives 20 complete rows with wrong retries; proves same-seed replay and emits JSON evidence |
| Browser proof | `devtools/cc2-02a-browser-smoke.mjs` | Real Chromium at 320/390/428/768, interaction, pause, restart, 120% all-three routes, four-row recharge |
| CI | `.github/workflows/cc2-02a-isolated-core.yml` | Protects SOT source, typechecks, runs new/old tests, produces golden trace, checks new/old browser surfaces |

**No new AI, special platform, Pulse gameplay, host SDK adapter, full production UI or commercial scoring system has been imported.** This phase is the authoritative *core* foundation only.

## 3. Mathematical progression contract confirmed in code

- The current displayed Spark value remains stable during a wrong outbound, short and mandatory return.
- At an accepted correct *landing*, the new Spark value becomes the exact arithmetic total, and this value is the incoming number for the next row.
- After four successful landings, the engine publishes `CELL_COMPLETED` and then a distinct, source-owned `VOLTAGE_REBASE` with old/new values. This is an explicit **CC2 successor change** from SOT-02's independent random number every row; the original remains intact.
- Each accepted selection emits one `ATTEMPT_EVALUATED` with problem ID, operation, submitted operand, mathematical truth, and accepted tick.
- `ROW_COMPLETED` exists only after a physically completed correct landing. If wrong then right, attempt count and completed row remain separate.
- Invalid/dead/busy/paused/no-route selections do not create a mathematical attempt.

## 4. Evidence — verified runs and next CI

**First integrated new-browser+old-browser success:** [GitHub Actions 43125375950](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43125375950). Source-integrity, npm install, typecheck, direct-core unit tests, inherited original tests, production build, **new 02A browser** and **old SOT-02 browser** all completed successfully.

**Full 23-test suite success (after added 30-row/20-row tests and ID-regex fix):** [GitHub Actions 43126225518](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43126225518). New tests include 4,000 seeded mathematics examples, 41 world framing settings and a 30×30-row soak with wrong retries.

**Latest golden-run verification:** [GitHub Actions 43126321110](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43126321110) includes a successful headless 20-row replay export step and the `cc2-02a-20-row-golden-replay` artifact uploaded from actual execution. The run's full browser and old-regression status must be checked at current SHA before promotion.

**Latest follow-up workflow:** [GitHub Actions 43126560664](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43126560664) is source-identical except dedicated workflow path filters. It should be treated as the most recent complete qualification when finished.

**Important:** The new CC2 CI workflow is configured to execute only on code or workflow changes. This report is documentation-only and does not fabricate fresh executable evidence.

## 5. Original 21 capability locks — exact status

The original named test set contains 21 effective cases (19 declarations, with three cases generated from the LEFT/CENTER/RIGHT parameterization). Do not conflate the preserved original's 21/21 PASS with the new core having a working Pursuer.

| Original lock IDs | Group | New CC2-02A status |
|---|---|---|
| 1–4 | Original physical constants, columns, safe interior corridors, supported framing | **COVERED** in new source-backed geometry tests and preserved port |
| 5–8 | Stable platform identity, collision crossing altitude, inter-row crossing band, source collision exception | **COVERED** in new source-backed geometry tests |
| 9–14 | Pursuer obstacle recognition, row crossing, no penetration, actual capture, physical overlap, postcapture freeze | **DEFERRED to CC2-02B**; no eligible new pursuer yet |
| 15–17 | LEFT/CENTER/RIGHT choice yields legal travel | **COVERED** in new routing tests and real-browser selections |
| 18–21 | Wrong remains selectable; no-route explicit, no degenerate paths; threat never vetoes | **COVERED** in new route/transaction tests |

**Summary:** 15 non-pursuer original-capability cases have new direct counterparts or stronger coverage. Six pursuer-specific cases remain legitimately open for CC2-02B. Original SOT-02's full 21/21 remain protected.

## 6. Test coverage and conditions

- Source-backed new unit tests: **23 direct cases** across math/config, route, transaction and long-run files. These test the real `CircuitClimbCore`, not mocked gameplay.
- Generator sample: 1,000 deterministic 4-row cells = 4,000 problems.
- Endurance: 30 distinct seeded runs × 30 correct rows each, interleaved with wrong attempts = **900 solved rows plus wrong-return cases**; `world.rows` retention kept bounded.
- Golden replay: 20 correct rows, deliberate wrong returns, replay reconstructs identical state/event digest.
- Routes: all 41 integer 80–120% settings and all three start/end combinations for the first two rows; threat points cannot veto routes.
- Browser: real DOM buttons and Canvas render at 320,390,428,768px; correct/wrong, pause/resume/restart, 120% framing all lanes, four-row cell progression.
- Preserved SOT-02: old unit suite and 61-check browser smoke run in the same workflow.

**Performance and device coverage are not claimed:** CI Chromium is not iPhone Safari or a Galaxy Tab S6 Lite. Human-owner playback and low-spec device profiling remain open.

## 7. Specific limitations and liabilities

1. **Pursuer absent by design:** no meaningful chase, perception, search, capture tuning or intelligent bot. Only a neutral `attemptCaptureAt` physical contact seam exists; it is not an AI qualification.
2. **Legacy port type debt:** the proven pure SOT-02 geometry/routing modules were intentionally copied into independent CC2 files with their loose `any` boundary types. The new core and world wrapper use explicit types; a later audited type-hardening pass must preserve every route lock.
3. **Demo is a dev surface, not product skin:** the compact responsive mini-board is meant for validation. Final MathForge visuals, mathematical construction VFX, special platform art and learner accessibility need CC2-03/04.
4. **Host adapter intentionally absent:** semantic event fields are source-owned but exact MathForge Gen2 SDK integration requires contract review; no mastery is inferred from score.
5. **Gameplay tuning preliminary:** route speed per simulation tick, postlanding grace and curriculum default are design parameters, not yet calibrated with the owner.
6. **Security/dependency audit outstanding:** inherited `npm ci` reports third-party dependency vulnerabilities. These belong in dependency/release qualification, not an opportunistic unreviewed old-source update.
7. **CC2-00B human/real-source observations remain outstanding:** old source default-shield and random-next-value discrepancies are verified from source, but real-device recordings and pursue-bot loss-of-contact footage still need a gate.
8. **QA evidence must remain source-scoped:** a green 02A mathematical/browser build does not establish pursuer intelligence or production readiness.

## 8. Local playback — developer instructions

From a checkout of `feature/cc2-02a-core-world-math` in the private repository:

```bash
npm ci
npm run dev
```

Then open:

```
http://localhost:3000/src/games/circuit-climb-2/devtools/cc2-02a.html
```

Play using the three on-screen numbered buttons or keyboard 1/2/3. Switch Circuit/Hop, world framing, pause/resume, restart, and export an exact JSON replay. The interface intentionally says **Pursuer intentionally absent**.

A local server address is **not** a public preview or deployed URL. The code resides in GitHub; use the source tree and draft PR for review and developer handoff.

## 9. PM gate disposition and next safe action

**CC2-02A engineering is a QUALIFICATION CANDIDATE.** The functioning core, new browser harness and reproducible trace exist. Keep [PR #1](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/pull/1) **draft/unmerged** until the latest branch CI is complete, the owner checks the mathematical flow, and the gate evidence is reviewed.

Then run **CC2-02A-Q1**: human visual verification of correct/wrong/return, four-row rebasing and narrow device layout, while recording the unresolved CC2-00B real-source facts.

After mathematical/world acceptance, authorize **CC2-02B** as a separate pursuer research+implementation branch using the same typed world topology, the original experimental Graph V2/07A/07B1 evidence and deterministic capture contract. No arbitrary AI rewrite or hidden oracle is allowed.

**Do not merge 02A directly into the original SOT-02 or `main`.**
