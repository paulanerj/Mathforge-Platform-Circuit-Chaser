# CC2-30F — Flowing World (3+3) & Pursuer-Only Molasses

## Owner feedback and observed root cause
The tower looks as though platforms spring into existence on the next jump. In current code the authoritative math engine generates only the next solvable answer row; the camera reserves a maximum two neighboring levels and shows generic skeletal rails for unpublished levels. The first experience is therefore a camera/architectural continuity problem as well as a consequence of truthful on-demand mathematical generation.

The Molasses field is already source-owned exclusively by the Pursuer controller: `CircuitClimbChaseCore.advanceTicks()` multiplies only `this.pursuer.step(..., featureMultiplier*pressure*viscosity)`. The learner simulation `this.core.advanceTicks(1)` executes BEFORE the Pursuer's viscosity calculation and is not passed the field multiplier. The visual blanket can nevertheless obscure the Spark and falsely communicate that it is slowed.

## Implementation
1. New opt-in **`?cc2Flow=1`** camera with guaranteed **3-tier headroom above and 3-tier history below the Spark** (once actual world history exists), based on the physical row gap instead of the old pre-expansion reference. Horizontal lane sizing and mathematical hitbox correspondence remain unchanged.
2. Three structural platform silhouettes above the next authoritative math row and up to three below the learner, built as continuous world-space geometry. They are **not fake answer choices**: future numerical contents, correctness and available interactions cannot be known without speculative branching from earlier selections. The MathForge primary solver still generates the next honest row only when its input becomes known.
3. Stronger continuous metal/stone material and cross-lane rails ahead, reducing pop-in. No new procedural math RNG calls, replay fields, altered world topology or collision objects.
4. Persistent Molasses demarcation now uses the actual `productionCamera` output to project its immutable source world Y, including after the source platform leaves the current viewport; no ad hoc guessed offset or stale platform geometry.
5. **Player protection is explicit:** the Molasses modifier remains applied ONLY in `Pursuer.step`. The decorative full-width layer has `pointer-events:none` and a circular soft transparent mask centered on the rendered Spark, keeping the player number vivid and readable.
6. Existing source gameplay is unchanged on URLs without `cc2Flow=1`. Blanket still requires the independent `cc230Blanket=1` opt-in. Full candidate URL: `/cc2-30.html?cc2Ui=slate-focus&cc230=1&cc230Blanket=1&cc2Flow=1`.

## Qualification
- Source unit regression comparing deterministic learner move paths, timing, current math problem, solved records and score with and without the active Guardian. Pursuer-only rule must remain verified.
- Real browser startup/taps at 320,390,768 px; `rendererStats.viewportCoverage` must show >=3 rows each side, with visible future structural silhouettes and actual next correct answer controls.
- Verify same source boundary within render projection when scrolling and that blanket remains `pointer-events:none`, Spark is visibly cleared, Pursuer 0.5 movement modifier is unchanged.
- Run historical CC2-30C and 30E browser tests, source tests, and CC2-28 / CC2-27 regressions before linking the new exact SHA Vercel candidate.
- Physical-device owner acceptance remains separate from automated browser CI.

## Next architecture decision
If the owner wants fully **numbered future rows**, that is not merely a camera adjustment: candidate problems depend on the learner's actual incoming number, solved choices and mode. A mathematical lookahead branching generator must be designed to preserve truthful solvability, deterministic seed/replay, teaching value and no early answer leakage. For this phase, persistent visually solid but **unlabeled** future platforms provide the scrolling tower without falsifying source content.
