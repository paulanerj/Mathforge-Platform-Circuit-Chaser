# CC2-09A — Clean Surface, First-Choice Pursuit and Vertical View

Date: 2026-11-13
Parent: CC2-08C physical geometry owner-candidate (576.5625 world units).
Branch: feature/cc2-08-balance-qualification (documentation only).
Status: independently playable offline UI experiment; source TypeScript and protected SOT-02 unchanged.

## Owner directions
- Remove entire metadata HUD row: equation / rows / points / bot status / stage / mode / curriculum / cell progress.
- Remove all developer settings below main board; game should resemble original's compact production UI, with extra information in Help/Settings.
- Increase visible world above and below 15% apiece.
- First platform selection begins pursuit, whether mathematically correct or incorrect.
- Give a short transition before final summary splash.
- Prioritize original look, animation and sound baseline around newer source-authoritative Spark/Pursuer movement.

## Delivered CC2-09A offline HTML
- Removed top HUD and instructional disclaimer from visible layout (not source DOM).
- Added compact in-board equation (read-only current actual problem) to preserve mathematical choice at first click without restoring the deleted HUD.
- Reparented existing pace controls, audio, seed/framing/curriculum, developer lab, event diagnostics and balance panel into a Settings dialog. Technical tools are collapsed. Help dialog gives gameplay instructions and current math.
- Expanded board height; altered presentation-only camera's yScale by 1/1.15, giving ~15% additional vertical coverage on either side relative to the same frame size; all canvas and DOM hit targets use source projection.
- Explicit first-choice game gate in the built frame loop: draws static source state until any enabled .choice click, then normal source simulation resumes; correct and wrong options equally launch. Game restart, pace apply, tuning and summary restart rearm the first-choice gate.
- Short 1450ms pre-summary overlay communicates capture or completion, then original source summary displays. No score/capture/event changes.
- Kept CC2-08C rowGapScale 2.8125, physical row gap 576.5625, Spark speed 24, Pursuer search/chase 4.8/6.
- Browser testing using actual bundled offline HTML in Chromium at 320x568, 390x844, 768x1024 and 826x680: script initialization, 0 source ticks preselection, 3 enabled options, first-choice source ticking, restart rearm, hidden HUD, settings/help, no horizontal overflow, no page errors. Explicit end-run test: pre-summary visible at 90ms, source summary visible at 1.67sec. Runtime source phase remains ended.
- Caveat: file:// loading was blocked by the tool environment administrator, so local tests load the exact HTML bytes via set_content; ordinary offline file opening has not been independently re-proven in this pass.
- Source TypeScript repository is NOT modified or CI-validated; this owner-facing HTML is a local presentation candidate.

## Follow-on source integration and visual audit
1. Replace the inline frame gating with an engine-owned started/armed state and replay input contract; do not allow developer/QA bypass to corrupt telemetry.
2. Source-integrate the 15% camera configuration and explicitly test previous 2+2 sightline compatibility, platform target positions, and Pursuer offscreen indicators.
3. Compare original protected game sprites, platform lighting, animation choreography, transition duration and event sounds against CC2-09A screenshot and source; preserve new finite-sensing Pursuer authority.
4. Inspect physical-device controls/landscape usability and bottom HUD before finalizing art.
5. End-of-run presentation must test capture vs practice/challenge completion, rapid restart and settings closing; no overlay may obscure summary.
6. Package a source-built HTML and re-run all protected original + mathematical + Pursuer + replay regression suites prior to merge.

The owner requested up to 3 phases at PM discretion; only this first production-UI phase is delivered as a playable build. Original-game animation/audio restoration remains an explicitly unverified next phase, not claimed complete.