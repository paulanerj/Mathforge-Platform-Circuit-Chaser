# CC2-30H — Dual-Renderer Root-Cause Audit and Visible-Tower Acceptance

## Trigger and observed failure

Owner iPhone CC2-30G screenshot (2026-11-17 at 12:25 local):
- Three correct-choice numbered buttons and live Spark/Pursuer are visible.
- A pale grid and decorative circle pattern fill the stage.
- The new three-tier lookahead platforms are **absent**, giving a one-row-at-a-time pop-in appearance.
- Intro says “Green Guardian arrives after your first climb.” Its absence on row zero is **expected by design** in this particular screenshot and must not be conflated with the missing tower.

## Confirmed root cause

There are TWO world presentation owners in the same page:

1. `src/games/circuit-climb-2/devtools/cc2-02a.ts` draws the game-world geometry on `#worldCanvas`, including CC2-30F `previewRowsRendered` and new unlabeled platforms for rows three ahead. However the owner-accepted original pale surface explicitly sets `#worldCanvas { opacity:0!important }` in the inline Heritage adapter styles of `cc2-16a.html`.
2. CC2-09B’s `#cc209b-heritage-canvas` is the VISIBLE surface. Its `render()` function paints pale parallax, known source `state.world.rows`, Spark and Pursuer but **never painted the not-yet-generated tiers**. The completed world initially contains only start and the next valid problem, so the visible renderer had only one mathematical row.

The camera correctly reports `minimumRowsEachSide=3` (a viewport projection), but the visible renderer has no corresponding future structural objects. Raising the opacity/width of the hidden painter’s silhouettes does nothing. The existing assertions checked the hidden `previewRowsRendered` count and source camera framing, which is not evidence of actual player-visible pixels.

A separate CC2-30F regression was HTML assembly corruption from unsafe JavaScript string replacement. That was repaired in PR #45 and confirmed by the actual assembled-HTML load gate. It was NOT the reason for the invisible tiers after the board returned.

## Minimal change in this phase

Inside the existing Heritage painter, `drawFutureStructuralTiers()` projects three source-mathematics-neutral platform silhouettes per prospective tier through the same read-only camera `pt()` function as actual source platforms. Draw them between pale background and real source-platform records so real answer geometry takes precedence. Keep choice generation and collision ownership unchanged. Only activate when `renderer.flowRowsEachSide===3` and retain old Heritage behavior when the feature is off.

Unknown numbers are never displayed or made selectable; the authoritative engine determines the next mathematical row after the previous choice. At row zero, there are no real historical rows below the initial platform, and architecture is not misrepresented as an already solved past. At deeper levels, actual historical rows provide the three-row trailing context.

## Release gate: visible not theoretical

CC2-30H adds `cc2-30h-heritage-visible-smoke.mjs` to the existing all-suite CI. It runs on the packaged `dist/cc2-30.html` (the EXACT user-facing HTML), not the modular development source. At 320×700, 390×844 and 768×1024, it must:
- Read `getComputedStyle(#worldCanvas).opacity` and confirm it is **zero** in approved Heritage mode.
- Inspect the **actual visible** `#cc209b-heritage-canvas` and confirm opacity, dimensions and no painter exceptions.
- Confirm at least six structural cells in two or more visible future rows and that they project *ahead* of the Spark.
- Sample canvas pixels **inside** all future platforms versus adjacent pale background to require real, nonzero visual contrast.
- Save initial and gameplay screenshots from the assembled HTML as repeatable CI artifacts.
- Verify explicit no-flow (`?cc2Flow=0&cc230=0`) still has no experimental future tiers.
- Continue full math tests, source/Spark-Pursuer invariants, real-pointer 320/390/768, Guardian, Molasses blanket, source Studio, historical CC2-27/28 regressions and zero-parameter launch tests.

## Remaining acceptance gates

1. CI green against exact candidate source.
2. Inspect GitHub screenshot artifacts for true visible platforms (not merely automated counters).
3. READY hosted deployment whose exact git SHA matches qualified runtime source.
4. Physical iPhone screenshot and owner confirmation that the same rows are visible, readable, consistently scroll, and do not obstruct answer buttons.
5. Do not merge to the accepted baseline or start additional creature features before this closes.

## Systemic prevention / architectural follow-up

The hidden canvas is still simulated and is still a second drawing pipeline. This dual rendering remains a source of visual drift and waste. A later isolated architecture phase should consolidate **presentation state definitions** (rows, projections, materials) into one rendering plan consumed by the accepted Heritage painter, or delete unused hidden painter work behind a formally qualified feature boundary. **Not in CC2-30H:** do not replace the accepted painter or refactor engine physics while a mobile regression is open.
