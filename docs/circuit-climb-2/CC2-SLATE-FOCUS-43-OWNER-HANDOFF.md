# CC2 — Slate / Focus (Owner-Selected Concept 43)

**Status:** Isolated playable UI integration candidate; not accepted into production.
**Protected game parent:** `876907daed183ff3c52b35b626f4d3afa08fe80b`
**Branch:** `feature/cc2-ui-slate-focus-43-integration`
**Selected source:** `mathforge-cc2-ui-studio/v2`
**Exact owner preset:** `src/games/circuit-climb-2/devtools/presets/cc2-ui-slate-focus-43.json`

## Scope

This phase applies the **selected Slate / Focus** palette, squared 5px edges,
balance, compact top chrome, clearer choice contrast, Focus-prioritized board
and compact accessible bottom actions to the **actual playable source**.

The unchanged original game appears at its normal URL.
Use `?cc2Ui=slate-focus` to opt in to the experimental visual presentation.

The presentation stylesheet is intentionally separated:
`src/games/circuit-climb-2/devtools/cc2-ui-slate-focus-43.css`.
The CSS file does not change canvas pixel coordinates, authoritative
simulation geometry, Spark movement, collision geometry, or canvas
compositing mode. Main board layout still uses source responsive camera.

## Owner preset mapping

- Background #e7ecef, surface #fdfefe, text #243540,
  secondary text #617480 and border #b5c5ce.
- Accent #4c7e96, path #469dbe, success #3b987a,
  danger #a73e58, Pursuer #b43668, tile #f5f9fb,
  grid #b8cad4.
- Focus composition, metal material family, balanced density.
- Corner radius 5px, font scale 100%, grid 50, ambient 18.
- Actual Spark and Pursuer characters are preserved exactly at this gate.
  Values for sparkSize, enemySize, plasma, trail, warning and captureSpeed
  are preserved verbatim in the configuration but **not automatically
  applied to the real game's collision physics or accepted material system**.
  Applying them must have separate material/replay/capture qualification.
- Proposed Scout radius 180, warning 40, active 88, cooldown 230, spawn
  after four rows: preserved in source data as an **unapproved experimental
  feature proposal**. The UI-only choice does not activate, tune, or award
  anything connected to Scout or Sentry.

## Acceptance requirements

1. URL without `cc2Ui` retains accepted historical visual baseline.
2. URL with `cc2Ui=slate-focus` shows new palette and composition.
3. Actual first mathematical click moves Spark; valid physical landing
   precedes any row or score increment.
4. Same seed gives identical source math questions/choice IDs across skins.
5. Existing primary/secondary Pursuer state, sensing and capture outcomes
   unaffected; no new active Scout unless explicitly selected with the
   separate `cc223` feature configuration.
6. Correct/wrong selections, UI modals, special-platform colors,
   Pulse, Pause, Restart and summaries remain functional.
7. 320, 360, 390, 428px phone, 768px tablet and 1008px desktop tests.
8. Alpha-transparent Heritage canvas, pale board CSS fallback and
   bounded plasma painting remain intact, including during first click.
9. Existing reduced-motion, source-owned game event ledger and audio remain.
10. Portable single-file build includes the opt-in style; source source
    remains unchanged in every protected engine module.

## Decision and future UI tooling

Slate / Focus is the **chosen design direction**, not yet an accepted
commercial implementation. A true locked preset is possible after owner
playtest. The external Studio 100 remains a research and authoring surface;
it is not authorized to write directly to game state, the MathForge host or
a release branch. Reintegrating material size or Scout behavior requires
explicitly scoped, source-digest-qualified engineering phases.

No automatic merge or production deployment is authorized.
