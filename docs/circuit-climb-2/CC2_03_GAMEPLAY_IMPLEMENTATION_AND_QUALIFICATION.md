# Circuit Climb 2.0 — CC2-03 Earned Gameplay Systems

**PM status:** engineering gameplay qualification candidate; not a production release  
**Source branch:** `feature/cc2-03-pulse-special-rows`  
**Parent:** certified pursuer engineering branch `feature/cc2-02b-intelligent-pursuer`, SHA `5d15f394e6a0f32272e21350c5d12720b62ccad9`  
**Protected baseline:** original SOT-02 historical gameplay/source must remain byte-identical  
**Date:** 2026-11-12 UTC CI / 2026-11-11 Colombia local

## 1. Implemented gameplay, not just planned

CC2-03 is source-owned and runs against the exact CC2-02B deterministic Learner + Pursuer simulation, with NO new answer grading rules and NO change to the accepted source-original.

1. **Earned Circuit Pulse.** Correct physical landings earn a 0–4 integer charge. At four, a READY, unpaused learner in Climb/Challenge can choose to spend all charge. If the red Pursuer is within the configured 220-world-unit radius at activation, its BODY speed is multiplied by 0.65 for 150 simulation ticks (2.5s at 60Hz). It still sees, remembers, plans and moves along the original collision-checked graph. A remote bot is not slowed; the ability can be spent anyway, so the button shows an explicit **IN RANGE / OUT OF RANGE** warning before spending. Automatic second activation while active is prohibited. Practice intentionally disables real Pulse activation.
2. **Capacitor Row.** Rows 6,18,30,... award up to +2 total charge only on accepted correct landing. Overflow is clamped to 4. Wrong and rejected attempts award nothing.
3. **Relay Row.** Rows 8,12,16,20,... create a visible wave over already solved nodes, and one source-owned `RELAY_CHAIN` event. Its presentation is visual-only. On overlap, Relay takes priority over Capacitor; the same row-wide marker appears on all three mathematical choices, never just on the correct answer.
4. **Progression.** The first four rows are explicitly NORMAL. A four-dot Power Cell progress readout shows real correct landings; the fourth landing closes one cell and shows a distinct numerical recharge. Stages advance at 12 genuine completed rows; the 12th emits exactly one `STAGE_REACHED`, and the next HUD reads **STAGE 2** without pausing the run.
5. **VFX/readability.** Reduced-motion-respecting, 60Hz-tick-driven Pulse ring; goal-dependent distinct cyan/amber wave, dynamic Relay illumination, consistent Capacitor/Relay border motifs and text. These visuals read source events and cannot independently award a row, charge, or success.
6. **Replay & QA.** Versioned feature config is exported with the chase replay. Pulse actions are explicitly recorded/replayed; stage, charge, expiry and math accounting are reconstructible from input sequence. A browser-only manual fixed-tick mode is gated behind an explicit developer query flag.

## 2. Source of truth

| Owner | File | Authority |
|---|---|---|
| Math, problems, correct/wrong landings | `core/CircuitClimbCore.ts` | Completely unchanged from 02B except the prior source-owned capture seam |
| Perception, belief and physical movement | `pursuer/pursuerController.ts` | Adds **only** bounded body speed multiplier, never extra knowledge |
| Feature rules/config/event ledger | `features/progression.ts` | Exactly-once charge, modifier schedule, ability activate/expiry, stage milestone |
| Integrated gameplay | `pursuer/CircuitClimbChaseCore.ts` | Binds mathematical events to features, capture authority, Pause/Restart/Quit, replay |
| Presentation | `devtools/cc2-03.html` and `cc2-02a.ts` | UI reflects source facts, never determines correctness |
| Source qualification | `tests/featureProgression.test.ts`, `featuresNoLeak.test.ts`, `featureFairness.test.ts` | Invariants and replay |
| Real-browser qualification | `devtools/cc2-03-browser-smoke.mjs` | Real DOM actions, fixed-tick math, three viewport sizes and 12-row stage run |
| CI | `.github/workflows/cc2-03-gameplay.yml` | Full old+new regression, browser play, screenshots, source custody |

## 3. Hard gameplay constraints protected

- The three candidate platforms always retain unique numerical operands with exactly one correct option. A row modifier labels all THREE equally; it cannot signal the answer.
- Wrong landing: travel to wrong platform, short, return, no charge, same mathematical problem.
- Correct landing: commit row ONCE, earn charge from the resulting authoritative `ROW_COMPLETED`.
- Charge cannot increase twice from an event reread. All charges are integer and capped.
- Pulse requires grounded READY. It cannot outrank already-valid physical capture. Transit shield and postlanding grace are owned by the unchanged core.
- Pulse cannot be reactivated during an earlier active duration, even if four new rows recharge the meter in that time. A rejected action spends nothing.
- Paused simulation freezes effect expiry. Quit and CAPTURED immediately terminalize the feature state; Restart resets charge, effects and progress.
- Target range is computed for the LEARNER UI from the physical bot/Spark position but is NOT forwarded to the pursuer Brain.
- The three route/collision choices and source mathematical correctness remain unchanged at 80–120% framing; 100-case adversarial cross-board pursuer reacquisition remains load-bearing.
- One canonical event ledger owns mathematical attempts, distinct from a second ledger for feature events; neither can manufacture the other's evidence.

## 4. Test evidence and final code qualification

**First complete working gameplay CI:** [Actions run 43158451306](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43158451306), SHA `73861ba6f348ac26080325578e9bf266da181e5c`, ran:
- 49 new CC2 math, pursuit and feature tests: PASS.
- 255 inherited and new Vitest cases: PASS.
- CC2-03 browser smoke: 45 assertions PASS.
- CC2-02B playable chase browser smoke: 28 assertions PASS.
- CC2-02A and Q1 browser smoke: PASS.
- Original SOT-02 browser regression, TypeScript and production build: PASS.

**Subsequent refinements:** no-overlap and terminal capture/quit, four-step HUD, event-based Pulse/Relay VFX, visible out-of-range warning, 12-landed-row Stage 2 browser run, and adversarial `featureFairness` tests.

**Final executable SHA and CI:** verify the latest workflow at [Actions branch CC2-03](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/workflows/cc2-03-gameplay.yml) before merging/promoting. Earlier green results do not automatically qualify the newest branch HEAD. Once fully green, preserve the source SHA, all screenshots and exact assertion counts in the PR.

## 5. Browser playback (local test candidate)

From a checkout of `feature/cc2-03-pulse-special-rows`:

```bash
npm ci
npm run dev
```

Navigate to:

```text
http://localhost:3000/src/games/circuit-climb-2/devtools/cc2-03.html
```

Operate the blue Spark by selecting the operand that completes the equation. Watch the red bot's real pursuit, earn four charges, press **Pulse** or **P**, and observe whether it is in range. After six successful rows see Capacitor, after eight see Relay, after twelve see Stage 2.

For deterministic browser QA, the `?manual=1` query flag removes autonomous wall-time stepping and permits `window.__CC2_02A__.advanceForQA(ticks)`. Do not expose that developer-only automation surface in a commercial build.

**No publicly deployed preview URL is claimed.** This Vite development-page URL requires a local server and is not the same as an eventual production build.

## 6. Remaining production work and prioritization

| Priority | Gate | Remaining evidence |
|---|---|---|
| P0 | CC2-03 owner interaction acceptance | Real iPhone Safari + Galaxy Tab S6 Lite physical play; is Pulse useful and visible, especially when bot is in range? |
| P0 | Chase tuning | Compare challenge vs climb difficulty in real human sessions, look for fair interception and recovery, not just 100 controlled fixtures |
| P1 | CC2-04 gameplay presentation | Replace development labels with MathForge-standard HUD/settings/bottom row; clear instructions and a detailed solved-equations-only summary |
| P1 | CC2-04 evidence & achievements | Source-owned non-mastering achievements for first cell, three cells, perfect cell, pulse used, challenge completed |
| P1 | CC2-05 SDK separation | Host-neutral typed config/events, null-host parity, import/export, preset resets, renderer adapter |
| P2 | CC2-06 expansion | Candidate Sentry/Scout/Stabilizer only AFTER primary bot/player fairness and ability comprehension qualify |
| P2 | CC2-07 release QA | Long-run performance, low-spec tablet 30-min soak, 30/60/120 FPS replay parity, accessibility/haptics/audio, deployment and release checklist |

## 7. PM disposition

**CC2-03 = implementation completed, automated review candidate pending final exact-head CI and owner device approval.** Branch must remain separate and draft/unmerged from original SOT-02 and the governed 2.0 branch. Do not treat earning progression as academic mastery or replace mathematical learning evidence with combat score.

The next high-value implementation pass is **CC2-04: learner-facing production presentation, equation review and verified achievements**, while keeping the proven pursuer and math core frozen. Do not add extra enemy types until the primary red bot is accepted in physical gameplay.
