# CC2-09B — Original Surface Fidelity (owner playtest handoff)

Date: 2026-11-13
Branch: `feature/cc2-09b-original-surface-fidelity`
Parent: CC2-09A offline presentation candidate; source-owned 07E executable unchanged.
Status: **local standalone owner candidate only**. No source integration/CI promotion, merge, SDK registration or deployment.

## Owner request
The previous 09A download link failed. Deliver a fresh, robust offline game with an alternative Windows ZIP; restore original Circuit Climb rendering/animation/sound while preserving modern finite-sensing Pursuer, mathematical and replay authority. Add extensive error/event instrumentation and real browser qualification.

## Original protected source audited
- `src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts` at protected original `0a6f138f229119bc6b6c15ee1f658046c7075f50`.
- `src/games/circuit-climb/styles/circuit-climb.css` at same commit.
- Old game palette: pale `#f0f6fc` background, `#2563eb` Spark, blue/cyan multilayer glowing traces, emerald powered platforms, particle blooms, faint big target text, layered parallax. Enemy AI NOT restored.
- Original synthesizer signatures: launch sine 310Hz/triangle 465Hz, each corner triangle 1300Hz, correct sine 392/494/659Hz, wrong sawtooth 230Hz + triangle 174Hz.

## Delivered offline candidate
`PLAY-CircuitClimb-CC2-09B-ORIGINAL-FIDELITY.html`, 177,697 bytes, SHA-256 `65460f79d0a06113154da2a9aaee70ba3489d6c26f2bc6ed232d1b23f2d8eecf`.

- Exact inline 07E minified gameplay script is **byte-identical** to the last CC2-09A standalone artifact: core SHA-256 `a9743c7a8560673bfaf8cdfae263865375af52f4cb6171797effcef8019c216f` in both.
- Read-only canvas painter creates original-inspired platform surfaces, blue-white conductive trail, animated green powered platform electrical accents, faint large target and layered parallax, breathing Spark and finite-sensing bot state indicators.
- Restored four sound signatures from original numerical tone values; event mixer retains newer pause/resume/pulse/stage/achievement reporting and avoids duplicate source audio. Player-facing sound toggle is in Settings.
- The 09A first-choice start, Help/Settings placement, compact in-board math, 15% expanded camera framing, row spacing **576.5625**, game pace and pre-summary transition remain.
- New `cc2-09b-heritage-diagnostics/v1` local download includes exact source-ledger/report references and bounded observed events, errors, audio history, renderer failures, and dimensions.
- This is a source-*informed* restoration, not a pixel-for-pixel React rendering port. No authoritative game logic changes.

## Verified qualifications
Local Chromium, identical downloadable HTML bytes loaded through `set_content`:
- **392/392 assertions passed, 11 test groups.**
- 320×568, 390×844, 768×1024, 826×680: no page errors, no horizontal overflow; real hit target/camera alignment, actual math and first-choice gate, Help/Settings/audio mute.
- 18 seeded mathematical runs across Warm-up/Energetic/Intense: correct-only accounting, solved equations, real replay digest, zero new Pursuer route failures.
- Wrong first answer starts pursuit and returns without a fabricated solve; two independent seeded replays have matching source state digest and event ticks.
- End-before-summary order, original raw playtest JSON download, CC2-09B diagnostic JSON download, source digest parity.
- Exact original motif event scheduling including **6 real corner events**, and simulated error recorder injection.
- 12 additional seeded restart/selection runs with zero captured new runtime/paint errors.
- Complete test harness and evidence are packaged in the owner's playtest ZIP.

## Unproven gates
- Direct `file://` or localhost browser navigation blocked by the testing environment administrator. The offline HTML contains no network dependencies and the exact bytes were tested; physical Windows double-click acceptance remains OPEN.
- No human difficulty verdict, cross-device audio hearing, real iPhone Safari / Galaxy hardware pass, sustained 60 fps or exact original visual pixel-parity claim.
- The source TypeScript branch is **not updated with the new standalone presentation adapter**; that must be ported, tested and source-built on a separate integration step.

## Next action
Owner should extract `CC2-09B-Original-Surface-Fidelity-Offline-Playtest.zip` and double-click `START-CIRCUIT-CLIMB.cmd` if the direct HTML download link is inaccessible. Review visuals, original sound signature and camera. Then source-integrate the new adapter under this isolated branch, rerun protected source custody and all full-suite CI, test actual hardware and explicitly accept the presentation before merge.
