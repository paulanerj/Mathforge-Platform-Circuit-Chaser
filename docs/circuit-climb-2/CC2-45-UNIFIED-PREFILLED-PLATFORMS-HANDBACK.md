# CC2-45 — Unified, Source-Prefilled Numeric Platform System

**Date:** 2026-11-19
**Parent:** completed but unmerged CC2-44 branch `feature/cc2-44-three-up-one-down-row-slider-20261118` at `b61112c5785327fb9572139bb8420e992aee8df4`
**Working branch:** `feature/cc2-45-unified-prefilled-platforms-20261119`
**Scope:** purely experimental platform visual presentation plus READ-ONLY source-authentic mathematical future-row projection. Not merged with owner-accepted Slate/Focus 43 or historical main.

## Owner rules addressed

1. **All answer platforms and future platforms use the SAME footprint.** In the visible Heritage painter, all are identical `height=46 CSS px`, with responsive width `clamp(70px, 23.7% of canvas CSS width, 110px)`. No more giant independent answer cards versus 70%-sized structural tiers.
2. **Thicker, substantial mineral body:** all source-generated platforms use the same shaded ceramic/crystal volume with consistent edge and base thickness. Correct, future and current differ by authenticated state styling, not by arbitrary size.
3. **All three visible upcoming math rows have real numbers before interaction.** The accepted learner core generates its next row only after the previous correct landing; it would be wrong to invent three future numbers in the renderer. The new `projectFutureNumberedRows45` strictly clones and replays the REAL source core, follows authentic correct landings on the detached copy, and presents the three option values for up to three visible rows. No `correct` indicator is exposed to the painter; only existing CURRENT row targets are clickable.
4. **Landed/powered platform loses the prior printed value.** The visible painter suppresses platform text once source says `powered && !dead`, leaving the number carried by Spark as the current operand. All future and current unpowered platforms retain source-owned numerals.
5. **No reflow jump:** current platform numbers are now painted by the same visible canvas as future numbers; DOM `button.choice` keeps exact real hit targets and accessible text but does not create a second giant visible card. When `#board[data-cc223-renderer-fallback]` is set, the current-row buttons become opaque and legible again to survive canvas loss.
6. **CC2-44 framed sightline remains three above / one below.** The live 80–140px row-pitch slider still controls both the source geometry projector and visible uniform platforms. Physical world and Pursuer movement remain unchanged.

## Source-of-truth / forecast safety

- The forecast clones a `CircuitClimbCore` from its exact replay and checks state-digest parity BEFORE making any simulated choices.
- Future problems use the actual curriculum-specific math PRNG and the actual source `selectPlatform` + `advanceTicks`, not renderer-generated numbers.
- The renderer caches forecast per `runId/currentProblem.problemId`, so it does not replay expensive source math every animation frame. It invalidates when the real problem advances. If the source forecast cannot be proven, the renderer withholds future labels and retains safe plain architecture, never fake numbers.
- Forecasts are observable (not scoring), avoid authority crossover, and do not alter the live mathematical ledger, score, pursuit, or replay export.
- `cc245=1` enables this in the branch's standalone owner-test `/cc2-30.html`. Explicit `?cc245=0` preserves prior CC2-44 visuals.

## Automated validation

GitHub Actions workflow `.github/workflows/cc2-45-unified-future-platforms.yml`:
- TypeScript typecheck and 21 source tests across future math, previous 3+1 geometry, and core transactions passed on first qualification CI.
- Chromium packaged-game tests at 320/390/428/768/988 validated three generated source-backed future rows, six future numbered platforms visible before choice, precisely equal footprint to the current three interactive buttons, no visual second-card, actual source math parity after a real landing, no JS/painter faults and no regression when the feature is explicitly opted out.
- The full original CC2-44 56-assertion browser slider test also passed.
- A follow-up added canvas-loss accessible answer fallback and explicit browser checks for fallback; final gate should be rechecked on latest head before promotion.

Prior qualification run on pre-fallback code:
https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44535124731
Screenshots artifact:
https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44535124731/artifacts/14536110781

## Out of scope, pending

- CC2-46: stronger connected platform internal liquid-crystal electrical plasma and conductor path identity, with noise and energy budget.
- CC2-47: deterministic authored left/right/center stagger formations, no clipping.
- CC2-48: mathematically viable two-option five-row corridors and strategic sectional rhythm.
- Performance qualification on actual Android tablet / iPhone, including source forecast generation cadence and low-end device frame timings.
- Owner final visual/touch acceptance.

## Stop conditions

Never merge into accepted source without owner evaluation. Never alter the 3-up/1-down policy, current mathematical answer values, or current click target authority merely to make source forecasts look nicer. If a preview unexpectedly drops all future numerals, inspect replay parity and forecast exceptions; do not replace missing source data with arbitrary labels.
