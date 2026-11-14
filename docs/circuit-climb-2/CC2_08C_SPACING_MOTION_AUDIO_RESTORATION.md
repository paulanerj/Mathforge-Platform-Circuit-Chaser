# CC2-08C — Spacing acceptance candidate and baseline-restoration design

Date: 2026-11-13
Source parent: isolated `feature/cc2-08-balance-qualification`.
Status: geometry-only offline candidate available to owner; no source merge, deployment or release.

## Accepted owner feedback and request
CC2-08B spacing 461.25 world units looks substantially better. Owner requests an additional 25%, plus subtle Spark overshoot/recovery, occasional additional stair-step turns, at least four distinct Spark chase movement behaviors, visual and sound event coverage, and careful restoration of the original non-Pursuer game-feel baseline. Preserve CC2 Pursuer's finite sensing and authoritative math.

## Delivered geometry-only playable artifact
- True `rowGapScale=2.8125`; 205 × 2.8125 = **576.5625 world units**. This is exactly +25% over 461.25, not +25% over 205.
- Expanded allowed configuration values: 1, 1.5, 2.25, 2.8125, with the latest selected for the Energetic experimental default. All configuration remains run-boundary authoritative.
- Rendering camera keeps previous 307.5 gap as fitting reference (576.5625/1.875), so expanded spacing actually looks farther apart instead of automatically shrinking back. Less than 2+2 tier coverage may be visible; owner visual acceptance required.
- Spark=24 units/tick, Pursuer search=4.8/chase=6.0; no rule, math or sensing changes.
- Chromium browser PASS at 320×568, 390×844, 768×1024, 826×680; expected physical row gap, replay config, default speeds, 3 real options, valid report, no JS error, no horizontal overflow.
- Chromium manual simulation on a correct selected platform: 35 unique sequential Spark positions, max distance 24 per tick, landed on row 1 without teleport; game source still controls destination.

## Original source sound audit (real legacy source)
`src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts` at protected SOT-02 baseline:
- `sound.launch()`: 310Hz sine 0.12s + 465Hz triangle 0.18s after 0.05s.
- `sound.corner()`: 1300Hz triangle 0.04s.
- `sound.correct()`: 392Hz sine 0.36s, 494Hz sine 0.38s after .07s, 659Hz sine 0.48s after .15s.
- `sound.wrong()`: 230Hz sawtooth 0.28s plus 174Hz triangle 0.35s after .08s.
- All voices use a short gain envelope; toggled by engineSoundEnabled; resume AudioContext on user gesture.
- Actual original call sites include launch (line 1024), wrong (1035,1117), correct (1110), corner (1138). No basis yet for claiming any more original sound IDs.

New `src/games/circuit-climb-2/presentation/feedback.ts` already declares 24 event cue IDs and event-driven mappings, including start/select/travel/land/wrong/return/solve/cell/rebase/pause/resume/capture/pulse and Pursuer emotional cues. The current new cues use largely different tones/durations from the original. Important gaps to examine include distinct per-corner sound, original launch/correct/wrong motif, duplicated sounds firing per combined event, mobile AudioContext policy and mute/volume parity. The old AI/Pursuer behavior is explicitly NOT a restoration target.

## Four Spark movement behavior proposals (NOT IMPLEMENTED YET)
All four are source-owned trajectory classifications on actual mathematically valid existing routes. They must not fabricate visual offsets from collision geometry or change destination correctness.

1. **Focused sprint:** original 6–12 corner route, normal speed, compact steady cyan core and thin organized trail. Common default.
2. **Lively weave:** route adds small legal sideways double-corners within approved free corridors; slightly elastic but no unearned shortcut, cyan segmented trailing arc.
3. **Feint:** briefly leans away from the target then recovers, one localized extra orthogonal detour, flickering gold accent, no gameplay decision altered.
4. **Overshoot & recover:** when legally clear, crosses the target's projected approach line by a small bounded amount then visibly returns to exact platform center; blue-white head bloom briefly extends, followed by a brief settling ripple. Never leave navigable corridor, never fake landing or make selection impossible.

### Proposed variance semantics (decision pending source QA)
At most **25% of eligible outbound route selections** use a deviation. On such a route choose **one or two localized route segments** seeded from a dedicated route-style random stream; up to twice the number of small stair-step turns in those localized windows. Do **not** double the entire route and do not roll random deviation every frame. Overshoot is independently capped to a fraction of platform width, requires clearance, and must finish at the same authoritative landing point. Downweight feints while Pursuer is very close so player cannot blame an involuntary detour for unavoidable capture.

Do not silently repurpose existing `routeTurns` in existing replay schema: historical replays, core digests and tests must remain bit-identical. Add optional `cc2-spark-motion/v2` style config and deterministic seeded stream in a separate, versioned new behavior gate. Full route geometry legality must be checked for EVERY segment; no illegal edge, platform clipping or AI knowledge leak. Use the same actual Spark coordinates for collision, bot sensing, replay and render; no presentation-only false movement.

## Source-qualification gates for follow-on phase
- Solve route constructor separation from geometry engine: planner produces legal candidate routes, style modifier only admits geometry-validated alternatives.
- Distinguish accepted route, segment count and run elapsed simulation ticks; test on at least 50 deterministic seeds per mode and target lane, across prior and new spacing.
- Track min separation, Pursuer contact, fairness outcome and style frequencies; verify 25% variation statistical tolerance, 1–2 windows, zero invalid route, no long-session graph overflow.
- Define per-event sounds (selection, launch, every corner, close Pursuer, lose contact, wrong, correct, row complete, reward, return, pulse, capture, pause) with priority limits and mix budget. Use original melody intervals and rhythm as starting comparison; retain expanded new sound coverage.
- Preserve no-network one-file playable build, two physical mobile device acceptance, and reduced-motion/mute.
- Original runtime original-bot AI must not overwrite current finite-sensing CC2 pursuer.

## Release boundary
The downloadable CC2-08C offline HTML is an independent owner candidate patched from the exact previously recovered CC2-08B HTML. The authoritative TypeScript source branch remains unchanged except these audit/design documents. A proper source-integrated, CI-qualified V2 routing build remains future work.
