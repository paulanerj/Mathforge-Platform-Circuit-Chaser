# CC2-34 / CC2-39A — Relay Foundation and Browser QA Handback

Date: 2026-11-17 local (CI 2026-11-18 UTC)
Branch: `feature/cc2-33-34-relay-ecology-foundation-20261117`
Parent: CC2-32 `905fdf36ccdf4b78e27cd17d3ac939b46d8b0ea5`

## Owner-locked product direction
1. First active roster target: Molasses Guardian and Relay Weaver. Relay's earned power illuminates four genuinely source-valid math platforms, and Spark must still physically tap and traverse them. It is *earned assistance*, not automatic solving.
2. Default policy: one interactive creature encounter at a time; source-owned lingering effects in separate authorities may persist (Guardian Pursuer field vs Relay visual math guidance), never two simultaneous creature gates.
3. Tether Slug exploratory. Prism Shuffler parked. Fracture Wisp is the next preferred hostile species: four landing-specific soft platforms; support normally dissolves after 120 source ticks (2 sec), adjustable; actual falling/recovery physics not yet implemented.
4. Keep accepted Slate/Focus 43 and math/score/movement/pursuer/audio authoritative.

## Implemented on isolated branch (NOT merged)
- `CreatureEncounterArbiter`: one-source encounter policy; rejects stale run, end-state, reserved species and simultaneous competing creature offers.
- `RelayGuidanceDirector`: four-row allowance counts ONLY genuine source completed-row events, never animation frames; cannot invent score or receipts.
- `projectRelayFutureRows`: four future correct platform positions from a cloned `CircuitClimbCore` replay, proven identical to actual later landings in tests; original state digest stays intact.
- `projectChaseRelayRows`: future projection from cloned integrated `CircuitClimbChaseCore`, including legitimate Pursuer early-terminal behavior, without touching live Chase state.
- Source game's `__CC2_02A__.relayForecast` is dev-gated by `?cc234=1`; ordinary game URLs cannot invoke it.
- Opt-in `cc2-34-relay-preview.js/.css`: conductive cyan world-space path projected over actual game board, 4 target circles, Energy and Movement sliders in Developer Settings; no player input intercepted, no creature reward, no score change, no play-mode default change.
- `creatureMaterials39A.ts`: six distinct silhouette/material families with full 0..1 designer range and reduced-motion/low-quality projection. This is visual-foundation code; not all six material renderers integrated in active game.
- Entire preview remains fully inline with real source game `dist/cc2-30.html` via callback asset insertion, no external CDNs or overlay prototype.

## Automated qualification
**GitHub Actions** run `44228149715`: SUCCESS.
- TypeScript validation: PASS
- Full Vite + actual standalone packaging: PASS
- Original and embedded optional JavaScript syntax: PASS
- Browser actual packaged game: 25 assertions PASS at 320/390/768 px
- Source forecast preview and mathematical core isolation: PASS
- Platform hit-testing under overlay: PASS
- No JavaScript exceptions: PASS
- Flag-off ordinary game UI unchanged: PASS
- Vitest Relay domain, materials, roster registry, Creature SDK and core transaction suites: PASS.

## Known limitations — no false release claims
- Relay guidance & preview is source-backed **experimental Developer Studio work** only. Relay creature actor, independent optional micro-math gate, source-earned activation/reward and main-player power inventory are NOT implemented or accepted yet.
- Four-row source lookahead is speculative if subsequent legitimate player decisions, new topological powers, or Pursuer captures alter the future. Preview must be invalidated/recomputed on later game-changing events before production.
- Browser screenshots, perceptual material review, 360/428 widths, physical iPhone/Tab S6 Lite, endurance, and mobile FPS are open. Do not confuse CI Chromium with device acceptance.
- Fracture Wisp soft support, two-second drop physics, recovery, and duplicate-score prevention are designed but NOT implemented.
- Vercel create preview returned HTTP 402 `api-deployments-free-per-day`. No valid new HTTPS preview URL. The accepted game and existing Vercel release aliases remain unchanged.
- Single interactive creature arbiter currently exists as a separate domain module; full integrated ecology scheduler across real creatures is next work.
- Prism remains disabled/unimplemented; Tether reserved pending math/gameplay balance.

## Next phase
CC2-34C: integrate a source-authoritative Relay Weaver actor and math gate into `CircuitClimbChaseCore`, with replay commands and ability receipts, then connect Dev hologram to earned production effect only. Add event reconciliation, four-forecast invalidation, device input tests.
CC2-38A: source scheduler for exclusivity plus physical residue policy.
CC2-39B: premium in-game creature renderer materials, sound cues and visual studio previews.
CC2-37: Fracture Wisp fall/return engine after mathematical and scoring contracts.
No merging to accepted branch until full tests and owner playtest.
