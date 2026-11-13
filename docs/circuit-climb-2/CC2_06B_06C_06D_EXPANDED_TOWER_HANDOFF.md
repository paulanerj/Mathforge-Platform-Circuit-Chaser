# Circuit Climb 2.0 — CC2-06B / 06C / 06D parallel phase handoff

Date: 2026-11-12
Parent: CC2-06A, feature/cc2-06a-production-visual-pass @ 70bba6c4ac5ebed40755629ec2e96bef38463e82
Candidate branch: feature/cc2-06b-06d-spacing-motion-qualification
**Engineering candidate — no acceptance, merge, or deployment authority exercised.**

## Owner feedback captured

- R2 Direct Chase confirmed Pursuer TRACKED Spark: keep faster 2.20 SEARCH / 3.10 CHASE and no random delays or side detours.
- Tier spacing is insufficient. Requested **exactly 1.5×** the previous platform-to-platform spacing.
- Spark's 26 world-units/tick traversal is too quick/choppy; requested **25% slower**, maintain a legible purposeful path rather than apparent hyperjump.
- Progress autonomously through the next three development phases; provide new playable offline HTML and test evidence.

## CC2-06B — Authoritative geometry, movement and safe compatibility

- Optional `RunConfigV1.rowGapScale` supports strictly 1 or 1.5. Existing V1 runs lacking the extension retain exact historical behavior. No unknown extension fields accepted; expanded runs include rowGapScale in deterministic replay hash.
- `resolveWorldGeometry` multiplies the authentic world rowGap (base 205) by `rowGapScale`. At 100% framing expanded rowGap = **307.5**. This influences all true platform rows, learner route planning, Pursuer graph, landing and collision geometry consistently.
- Fresh built-in `spacedDirectChaseDevLabPreset()`: circuit speed **19.5** vs accepted R2 **26** (=0.75 exactly), hop duration 19 vs14, return 16 vs12; preserves original R2 Direct Chase search2.2 / pursuit3.1; detection230/380; memory480 ticks; zero personality hesitations/detours; 5-tick notice.
- New controls import/export exact authored `rowGapScale`. Old import without extension stays at 1×; no silent rewriting of historical mathematical runs.
- Crucially: **changing world rowGap alone without enlarging the physical display would be optically cancelled by auto-fit**. CC2-06C addresses that.

## CC2-06C — Visible player movement / production framing

- The displayed board is taller at 320/390/tablet/desktop breakpoints, with native page scrolling allowed on small screens and sticky accessible bottom gameplay actions.
- Camera horizontally maintains the three 22/50/78% lanes; vertical auto-fit still guarantees 2 world rows above/below Spark.
- `productionCamera` adds 0.8× a tier of extra tracking headroom and clamps follow within two-row guarantees. Previously the camera always locked directly to Spark, visually moving platforms instead of the player.
- `cc2-02a.ts` linearly interpolates between the two latest actual 60Hz **physical** Spark snapshots at render time. Changes no authoritative physics, route, destination, sensing, capture or ledger data.
- A rendered intermediate segment of the actual source path can be inspected and compared against replay; reduced motion remains available.

## CC2-06D — Source/browser/device qualification and portable deliverable

- Unit tests for true 307.5/205 ratio, 19.5/26, old vs expanded replay hashes, complete route legality and physical 19.5 per tick speed bound, AI deterministic replay at new spacing.
- Chromium tests for 320×568, 390×844, 768×1024 and 826×680 viewport coverage, actual DOM/Canvas destination center parity, no overflow, no render errors and real intermediate Spark motion after ten ticks.
- Inherited original-source custody, full unit test suite, Q2 math, CC2-04 summary, protected original browser regression, offline HTTP-blocked `file://` game test, original sound cues.
- Single full self-contained HTML is emitted by `buildPortable06D.mjs`, no external packages or CDNs at runtime.
- **Physical Safari/iPhone/Samsung-device validation remains unproven** unless explicitly owner-tested; Chromium emulation is not a substitute. The 60 FPS performance target likewise requires sustained profiling, not just passing functional tests.
- Post-run automated trace can remain a read-only QA accessory; no intrusive controls belong permanently in the accepted gameplay surface.

## Acceptance / risks

- 1.5× rowGap means ~2× the overall *time* per rise when combined with 0.75× Spark speed, so Pursuer difficulty may change. Do not infer a balanced final game from passing route tests; capture ratio and multi-seed playtests required.
- A strict 2+2 row visual guarantee and a substantially taller visible screen area have an inherent tradeoff: some very small devices need vertical page scroll. A true full-screen immersive gameplay shell is proposed as a later UX choice, not falsely claimed completed.
- Continue balancing against the user's actual play experience while protecting source-owned math/pursuit contracts.
