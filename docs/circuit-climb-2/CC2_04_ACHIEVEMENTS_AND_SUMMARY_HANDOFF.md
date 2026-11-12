# CC2-04 — Verified Achievements, Mode Control and Solved-Only Result Review

**Status:** engineering qualification candidate; human-play and commercial-release approval OPEN  
**Branch:** `feature/cc2-04-achievements-summary`  
**Parent:** CC2-03 verified gameplay branch `feature/cc2-03-pulse-special-rows` (commit `04380bee9c307cae4fd4ec010b0202e276d00c3d`)  
**Original SOT-02:** protected and unmodified  
**Local browser test file:** `src/games/circuit-climb-2/devtools/cc2-04.html`

## 1. What is implemented

A new **source-owned result projection** and a completely separate, playable CC2-04 browser HTML entry now support the three existing modes:

| Mode | Completion rule | Reviewer outcome |
|---|---|---|
| Practice | 4 physically correct landings | Practice circuit completed; real equation list |
| Climb | Pursuer contact or player's End run | Captured or ended; true solved height and choices |
| Challenge | 12 physically correct landings before capture | Authored Challenge Complete milestone |

Mode is selected from the **developer-controlled test setup**, not inferred from math difficulty. Practice's pursuer remains a non-capturing ghost; Pulse is not real-activatable there. All modes preserve the three distinct numerical options, transit shield, wrong-answer return and the same physical route geometry.

### Summary accounting

`progression/runSummary.ts` reads the precise active `runId`, `EngineStateV1.solved` and the genuine source event ledgers. Its output is versioned `cc2-run-summary/v1`.

- **Solved equations:** ONLY completed correct landings. A wrong choice cannot become a solved equation; a correct accepted selection that was interrupted before arrival cannot become a solved equation either.
- **Choices:** Accepted attempts, correct attempts, wrong attempts and choice accuracy are separate from completed height. A rejected/dead/paused/busy choice is not an attempt.
- **Progress:** completed rows, four-row power cells, score and fixed-tick simulation time; no fake mastery or external grade.
- **Consistency:** explicit errors on disagreement between source attempts and counters, completed landings and solved list, cell progression, equation arithmetic or terminal event. It refuses to assemble a misleading summary.
- **Restart:** only events for the active `runId` are included, despite the core retaining older event history.

### Achievements

`progression/achievements.ts` derives *non-mastering* achievements from the authoritative core + feature ledgers. Unlocks require real events:

| Badge | Evidence required |
|---|---|
| First Circuit | First `CELL_COMPLETED` (row 4) |
| Tower Builder | Third `CELL_COMPLETED` (row 12) |
| Clean Current | One genuinely completed four-row cell with NO wrong accepted attempts in that cell |
| Circuit Pulse | `ABILITY_ACTIVATED` from earned charge; an out-of-range Pulse still counts as usage but does not claim a pursuer hit |
| Challenge Complete | `RUN_ENDED` with exact `CHALLENGE_GOAL` |

The projection is pure, repeatable, sorted by source tick and run-filtered. No localStorage, coins, purchasable boosts, hidden learner profile or SDK mastery is introduced.

### Learner-facing review

The isolated `cc2-04.html` exposes a readable end-of-run dialog with exactly sourced metrics, achievement chips, a scrollable equation review, clear outcome, close/reopen and fresh-run actions. A short source-driven toast appears when an achievement unlocks. The tabbed MathForge production HUD, final splash and final UX art remain downstream; this is an engineering-grade playable candidate.

## 2. Test strategy

**Direct Vitest source tests** in `tests/achievementsSummary.test.ts` check:
- Perfect four-row Practice; First Circuit and Clean Current once each.
- A wrong accepted option prevents Clean Current, while First Circuit and four actual equations still appear.
- 12 actual Challenge landings produce Third Cell and Challenge Complete exactly once.
- A correct selection interrupted mid-travel has **zero** solved equations even if counted as a correct accepted choice.
- Earned, out-of-range Pulse activates an achievement without claiming a hit.
- Restart filters old events; doctored accounting throws rather than generating a fraudulent result.

**Real Chromium tests** in `devtools/cc2-04-browser-smoke.mjs` run the SAME game engine via explicit fixed-tick development mode:
- 320×568, 390×844, 768×1024 initial display, mode badge, first-screen Pause and three source numerical options.
- Perfect four-row Practice summary, closing/reopening, restart isolation.
- Wrong choice then four landed equations: five accepted choices, exactly four in review, 80% choice accuracy, no perfect badge.
- Twelve-row Challenge with visual Stage/Challenge badges and twelve landed equation entries.
- Quit while correct travel is still in progress: accepted choice accounted but zero displayed solved equations.
- Screenshots uploaded as the `cc2-04-verified-summary-review` workflow artifact.

CI also runs TypeScript checks, the complete inherited original + new unit suite, all prior CC2-02A/Q1/02B/03 browser checks, original SOT-02 browser regression and protected source custody guard.

**CI:** [CC2-04 GitHub Actions workflow](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/workflows/cc2-04-achievements.yml). Confirm a successful run at the exact executable SHA before promoting this candidate.

## 3. How to play the candidate locally

From a checkout of `feature/cc2-04-achievements-summary`:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/src/games/circuit-climb-2/devtools/cc2-04.html`. Expand Developer settings and select Practice, Climb or Challenge; the selected mode starts a new run. Solve to completion or use End run. The new summary appears automatically and can be reopened from Developer settings. Export replay also contains the authoritative source summary.

The fixed-tick `?manual=1` tool is an intentionally isolated QA/debug mechanism and must not be exposed in a final shipped client.

## 4. Next gates, in order

1. **CC2-04-Q1**: owner plays exact UI on iPhone Safari and Galaxy Tab S6 Lite; correct summary comprehension, readability and overlay fit. Real-device capture fairness and Pulse utility remain open.
2. **CC2-05**: production presentation architecture and shared MathForge HUD, bottom action row, Settings/Developer segregation, reduced-motion, accessibility, audio and quality tuning. Surface should still run in null-host standalone mode.
3. **CC2-06**: host-neutral MathForge adapter and SDK events/config/presets with contract tests and source-owned correctness authority. No speculative SDK import or disguised legacy coupling.
4. **CC2-07**: release/performance hardening including 30-minute low-spec device run, replay determinism at many frame rates, security/dependency audit, and deployment/release qualification.
5. **CC2-08**: additional enemies/special platforms only if the main Pursuer and the earned Pulse mechanic first pass human-play fairness gates.

No new mathematical operations, Scout/Sentry, persistent account achievements, purchases or online profile are introduced in CC2-04. Those remain separate deliberate scope decisions.

**PM disposition:** keep the full CC2 stack in hierarchical, draft/unmerged PRs; do not overwrite the original SOT-02 or prematurely call this production.
