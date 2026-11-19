# CC2-46C — Green Honey Molasses Signature Choreography

**MathForge Circuit Climb 2.0 · 2026-11-19 · candidate, owner review pending**

## Source of truth and branch protection

- Historical/owner-accepted CC2-45 source remains `0a905c57e0f46c8165f036dd5e334731ed05a9ab`, branch `preservation/cc2-45-owner-accepted-20261119`.
- Parent CC2-46B (qualified) is commit `e20f5fbb79d25bc4343237519cc915004b7c48aa`, `feature/cc2-46b-molasses-smear-surface-20261119`, draft PR #60.
- CC2-46C development in `feature/cc2-46c-molasses-activation-choreography-20261119` branches from that qualified parent. Do NOT merge or promote over prior accepted builds without owner physical test.
- The strict mathematical core, scoring/receipts, Pursuer world position/sensors, platform dimensions, future authentic numbered rows, 3-up/1-down camera, live row-spacing and plasma-conductor work remain unchanged.

## Owner's problem statement

The baseline CC2-46B 20%-speed syrup is functional, but its material is too subtle and the interaction lacks a through-line. Tapping the special opens a genuine skip-count puzzle, but the material should visibly originate from the Guardian once solved, travel, spread and then *visibly impact the bot*. The creature should change after releasing its charge. The bot should audibly squelch and demonstrate heavier, struggling motion while the source truthfully slows it. All of this must retain the restrained, strongly readable 2D MathForge look, not cover the bot or equations with green film.

## Deterministic causal sequence

**Trigger:** Tapping source-authored Guardian invokes `offerCreature` and `GATE_OPEN`. This does not cast the ability or award points. The independent skip-count question must be answered correctly.

**Genuine cast:** A correct challenge emits `GATE_SOLVED` and `FIELD_CAST` from the source engine. The new presentation uses exactly the real cast receipt's `tick`, `platformId` and active field's WORLD coordinates. It never casts from a guessed screen coordinate.

**Visual choreography, source-relative ticks:**

| Source ticks after cast | Phase | Visual |
| --- | --- | --- |
| 0–7 | GATHER | Guardian concentrates and bulges; cast anchor established |
| 8–19 | EJECT | One large cohesive green-honey bolus is expelled with an elastic translucent tether |
| 20–31 | STRETCH | A short, cohesive tether extends locally from the source Guardian toward the source field boundary; no diagonal rope through Spark or the math board |
| 32–49 | SPLAT | Source-local impact flattens into viscous honey and a source-authorized band spreads along the field boundary |
| 50–74 | SETTLE | Surface rebounds and levels; Guardian visibly shrinks and drains |
| 75+ | FIELD_LIVE / BOT_STUCK | Thick emerald pool and source-derived stuck motion remain while the *real* field/contact are active |

The field remains source-owned and the 20%-speed bot effect starts when source contact is true; the visual animation does NOT delay physical authority. Screenshot inspection revealed that the bot is often three tiers below the accepted 3-above/1-below camera. The initial long green tether cut diagonally across the equation and hid the actual bot interaction, so this has been corrected: the launch is source-local (bounded to under 90 CSS pixels), the meniscus progressively spreads at the real world-field boundary, and the existing offscreen Pursuer warning gains a small clearly labeled red-bot-in-green-syrup reaction. This does NOT relocate the true Pursuer or violate the camera geometry; it hides the redundant Molasses status banner while the remote indicator is active. If the source lacks a valid active field, no bolus or fake contact is drawn. A rejected/incorrect optional math answer does not produce the launch sequence.

**Spent creature:** While the actual source field remains active and gate is in cooldown, the Guardian's own source-positioned, 54×44px tappable element changes to a smaller, duller, depleted silhouette. It returns to ready only under source lifecycle authority, never by an arbitrary frontend timer.

**Material:** The syringe-like bolus and tether are rendered on the actual visible Heritage 2D canvas, below the actual Pursuer actor. The old green full-screen DOM overlay remains suppressed. The revised surface is thicker, distinctly green, glossy with highlights and drawn-out liquid strings but still leaves platform numbers and Spark dominant.

**Bot reaction:** The real Pursuer retains exactly the same world body and physically validated 0.20 multiplier while contacting the blanket. The drawn red silhouette undergoes slow visible push–recoil, compression and stretch, with a source-tick-derived phase and reduced-motion support. It is never covered by an opaque green sprite.

## Sound and settings

New code-generated WebAudio Foley is triggered by source-verified creature receipt IDs, with per-run de-duplication:

- `FIELD_CAST` — damp, descending liquid-launch squelch
- `FIELD_CONTACT_ENTER` — distinct low suction/adhesion cue
- `FIELD_CONTACT_EXIT` — a shorter upward suction-release sound
- Periodic `SQUELCH` — sparse, low-percussion sticky motion voice under verified source contact **and actual source-body displacement of at least five world units**, no more often than one per 22 source ticks; it also plays while the Pursuer is honestly offscreen, and stays quiet if the bot is stationary.

No external assets or recorded copyrighted music. The `AudioContext` unlocks only after a real pointer gesture. The sound-volume slider and existing Creature Studio `sound` switch are honored. In an environment that blocks audio playback, the source receipt log stays accurate, but we must not claim the sound was physically audible.

The existing CC2-46B Studio's five controls (slow strength/source restart, smear length, wake persistence, bow-wave size, recovery) remain present. A nested **Green Honey — Signature Effect Lab** adds five visual/audio controls: liquid thickness, golden-green wet sheen, ejection/splat size, Pursuer struggle deformation and sticky Foley volume, all 0–100 and resettable. They never alter math, score, source velocity or replays.

## Code and isolation

- New `src/games/circuit-climb-2/devtools/cc2-46c-molasses-choreography.js` owns read-only receipt projection, green honey painter and sound.
- New `src/games/circuit-climb-2/devtools/cc2-46c-molasses-choreography.css` styles Guardian GATHER/EJECT/DRAIN/SPENT states and the developer subpanel.
- `cc2-16a.html` invokes the painter AFTER CC2-46B's old underlay and BEFORE the source-positioned actors. No independent overlay, random game state or extra hitbox.
- `buildPortable16A.mjs` inlines both assets into the existing self-contained `dist/cc2-30.html` and opts the standalone `cc2-30.html` preview into `cc246c=1`. Explicit `?cc246c=0` restores CC2-46B exactly, with the original source-owned 20% slowdown.
- All historical non-preview routes remain unchanged.

## Verification

The final gameplay candidate at source commit `b64092a17ae0cd82dab79fa541aecb767cae6cb2` on CI run
https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44605112121
passed:

- TypeScript and **25 source tests**
- **62 CC2-46C** browser assertions from real first-row answer, independent skip-count challenge, `GATE_SOLVED`/`FIELD_CAST`, visual EJECT and SPLAT, source BOT_STUCK at 20%, source receipt de-duplicated CAST/TRAP audio events, controls and opt-out
- **61 CC2-46B** slowdown/wake regression assertions
- **47 CC2-46** connected plasma checks
- **46 CC2-45** uniform/pre-numbered platform checks
- **56 CC2-44** camera/row-gap regression assertions
- **5 viewport sizes:** 320, 390, 428, 768, 988 CSS pixels
- All tests completed without painter or browser exceptions. Four authored stage screenshots per viewport.

CI asset artifact for that run: 
https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44605112121/artifacts/14568468635

The final source at `b64092a` includes visual framing and movement-triggered audio refinements. The same fully green CI artifact includes both the exact built `dist/cc2-30.html` standalone game and fifty browser screenshots in a download ZIP; the owner can test without PowerShell while Vercel's project quota is blocked.

## Deployment / owner-test gate

Attempting explicit Vercel deployment of verified gameplay commit `e4b40fe5dd315424d8f1c1a1bcf8044c51cc91b7` returned `HTTP 402 / api-deployments-free-per-day` (100 deployments in 24h). Do not call earlier CC2-46B Vercel URLs a new CC2-46C preview. The owner preference is Vercel HTTPS; try the exact latest qualified source after the limit resets. A one-time automation has been scheduled for November 20, 2026 at 15:52 America/Bogota to check matching READY previews before making at most one Git-source deployment attempt. The CLI is not installed in this runtime and the container has no linked local Vercel project. Do not change team billing/security settings or present READY without exact matching SHA.

## Remaining acceptance on actual iPhone/tablet

- Subjective timing, viscosity, color, material realism, cast-to-splat storytelling and click-to-effect clarity
- Confirm WebAudio output levels, creature/source audio mute and lack of unpleasant repetitive squelches
- Check 60fps-ish target and monitor FPS in heavy packet overlap
- Check no full-screen tint, no hidden target numerals and no collision/scoring authority changed

**Next visual review**, before adding unrelated new creatures or platform mechanics, should compare the previous CC2-46B and new CC2-46C sequence side-by-side.
