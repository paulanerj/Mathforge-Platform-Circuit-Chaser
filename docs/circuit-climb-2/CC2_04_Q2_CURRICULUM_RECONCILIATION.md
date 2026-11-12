# CC2-04-Q2 — Mathematical Curriculum Reconciliation and Demo Integrity

**Branch:** `feature/cc2-04-q2-curriculum-integrity`  
**Parent:** immutable passing CC2-04 executable `14d8f7820c2aaad4d23d32779cb7d6d59abd077e`  
**Status:** isolated engineering candidate; owner review and production promotion NOT authorized.

## Problem and source distinction

The owner observed Spark 2 with platform candidates 2, 4, 3. This is impossible if the stated goal is "make 10" because no candidate equals 8. The previous CC2-04 demo actually used the **separately valid add20** contract, not the older source's first-six-row target ceiling of 10. The screenshot alone does not show the HUD target, so the defect is a **curriculum-presentation mismatch**, not proof the add20 arithmetic evaluator was incorrect.

The owner also used the phrase "skip count to 10." A true skip-counting game has a different platform meaning than make-10 complements. This phase separates three operations rather than pretending the same platform tile means both "add this" and "go to this total."

## Canonical curricula

1. `makeTarget20`: incoming Spark 2..4 (seeded); targets are 10 for rows 1–6, 12 for 7–12, 14 for 13–18, 16 for 19–24, 18 for 25–30, 20 thereafter. Three distinct positive **addend** options, exactly one equal to target minus Spark; e.g. Spark 2 and target 10 MUST offer platform 8. The resulting target is briefly carried, then the core emits named `VOLTAGE_REBASE(cause=NEXT_TARGET_PROBLEM)` to introduce the next independent problem's seeded Spark. At four-row checkpoints the reset uses `CELL_RECHARGE`.
2. `skip2to10`: Spark begins 2 and visits 4, 6, 8, 10 in strict +2 steps. Platform values represent **destination totals**, not addends. All displayed candidates belong to {2,4,6,8,10}; the current value is excluded; exactly one is the correct next value. The core evaluates `selectedValue === targetValue`, not `incoming + selectedValue`. After 10, a visible four-row cell rebase establishes Spark 2 for another cycle.
3. `add20`: existing proven four-row running-addition pack unchanged. Spark carries actual solved target each row, then `VOLTAGE_REBASE(cause=CELL_RECHARGE)`. The existing typed config default stays `add20` for backward-compatible programmatic use; the **CC2-04-Q2 demonstration page** explicitly defaults to `makeTarget20`.

In every curriculum: three unique selectable routes, one mathematically correct option, wrong selections short and return without changing the problem, and no completion event before physically landing. Solver, result and replay remain the authoritative source; AI, renderer and SDK may not decide mathematical correctness.

## UI and review truth

The CC2-04-Q2 HTML entry exposes Mathematics in Developer settings with explicit labels and starts a new run when changed. Its default equation is `Spark + ? = 10` on row 1. A curriculum label in the HUD identifies the active rule. Skip counting displays `Count by 2: N → ?` and uses accessible destination labels, skip-specific transit/wrong/correct feedback and result review e.g. `2 → 4 (count by 2)`.

For make-target, an independent source reset is explicitly displayed as a **new question**, not as a solved equation. The core's `VOLTAGE_REBASE` is the only accepted cross-row source discontinuity. Summary review uses accepted `ATTEMPT_EVALUATED.operation` to verify correct physical landings, and never converts a skip destination into a fictional `a+b=c`.

## Proof and release gates

- Unit: 36,000 independently validated make-target generated questions, 4,000 skip-count questions, source reproduction of Spark 2 + 8 = 10, real physical wrong/short/return, all four skip count landings and legitimate row and summary ledgers, deterministic replay.
- Browser: actual Q2 HUD and platform options at 320/390/768px, both curricula, original source-backed end summaries and chase regression.
- Offline: build the same TS/HTML into one file `cc2-standalone/CC2-04-Q2-Playable.html` using `buildPortableQ2.mjs`. Use Chromium `file://` tests with HTTP requests blocked before publishing the GitHub Actions artifact `CC2-04-Q2-Offline-Playable-HTML`.
- CI: `.github/workflows/cc2-04-q2-math.yml`; must pass original source blob custody, TypeScript, all inherited source tests, project build, owner-candidate browser checks, original SOT-02 browser smoke, and offline file-protocol smoke.
- Human: not yet owner-qualified on actual devices. Do not merge this branch until owner confirms that the target and skip-count rules match the desired game, that resets are understandable, and that the Pursuer pacing still works.

## PM isolation

Do not merge or overwrite `main`, `circuit-climb-2-production`, `feature/cc2-04-achievements-summary`, or the accepted original `src/games/circuit-climb/`. Preserve prior immutable branch as rollback and keep any future curriculum packs isolated and solver-backed. No new enemies, graphical overhaul or SDK-host coupling is authorized in this narrow mathematical repair gate.
