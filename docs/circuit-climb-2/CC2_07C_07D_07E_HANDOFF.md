# CC2-07C / 07D / 07E — Pace Measurement, Pursuer Readability and Long-Tower Qualification

Date: 2026-11-13
Parent: CC2-07B qualified source `a6c8766f3cb1dcc8bc3a35d2d21d23aad95dfb29`
Isolated branch: `feature/cc2-07c-07e-balance-feedback-qualification`
Status: engineering/test candidate; no main merge, production deployment or SDK registration.

## Owner authority and objective

Owner authorized three further major phases and requested reliable access to a new playable demo. The earlier CC2-07B game enabled Warm-up/Energetic/Intense A/B profiles, and passed 301/301 unit tests, 107/107 browser assertions and 44/44 offline assertions. This phase does **not** claim the prior delivery/access failure was independently explained. We provide a fresh one-file offline HTML and Windows ZIP with a batch launcher and source-qualified SHA so the owner can open the game independently of the conversation preview.

## 07C — Calibration / Playtest Evidence

- New `SessionTelemetry07C` receives live source-owned learner and finite-sensing bot snapshots; 15-tick sampling at fixed 60 Hz; retains at most 1,200 records.
- Captures positions, simulation ticks, mathematical rows completed, bot mode, legitimate sensing status, route failure counters, physical separation and aggregate ranges.
- Every session can be downloaded with an obvious `Download playtest report` control **without Developer Tools or PowerShell**. Report schema `cc2-playtest-report/v1` contains the exact seeded replay, applied profile, session samples and metrics, run event ledger, final state and digest.
- The recording is read-only; UI/camera and sample collection never feed the Pursuer Brain or change math.
- The previous 6-seed, 3-profile scripted 40-second matrix remains reproducible. Previous results: Warm-up 0/6 captures; Energetic 3/6; Intense 6/6. Synthetic perfect answers with 45-tick reaction are NOT representative human trials. The owner will use downloadable real-session data to choose the production balance.

## 07D — Visual Threat Communication and Continuous Motion

- Compact bar above the actual board displays **physical distance in actual platform-tier units**, with accessible status labels from real finite world coordinates. Four levels: distant, approaching, near and contact-imminent. A human-facing range indicator is not an AI sensing state.
- Separate `LOCKED` and `SEARCH` labels show whether the bot legitimately has sensing contact; seeing a threat on screen does not give the AI the player's coordinates.
- The rendered bot is interpolated between two real consecutive 60-Hz state positions, matching the existing Spark interpolation and never extrapolating a future route or applying any physics movement.
- Existing sound/mood cues and 1.5x physically expanded tower stay intact. Control/status flow must not cover the board. Reduced-motion users see stable feedback.

## 07E — Bounded Long-Session Navigation and Qualification

- Source `pursuerController.ensureGraph` previously pinned navigation to the initial spawn row indefinitely. After roughly 140+ floors the graph range hit `PURSUER_INVALID_GRAPH_RANGE`. The candidate activates a bounded bot-centered **PUBLIC** graph after 60 tiers, retaining current and in-progress destination nodes with ~28 levels ahead.
- The Pursuer still selects real admitted graph edges; no hidden learner coordinates, future routes, correct answers or teleporting.
- Test synthetic 180-tier public tower with 110 live pursuer ticks, limited graph node count and zero route failures; no claim yet of a full 180-row player-completed qualification.
- Real Chromium test runs 320x568, 390x844, 768x1024, 826x680 and verifies threat physical parity, button-world alignment, 2+2 tower rows, profile switching, browser download JSON, and no overlap.
- Existing mathematical regression / original SOT custody / full CC2 unit tests / original-browser regression / file-protocol HTTP-blocked standalone smoke remain CI release gates.
- True iPhone Safari/Galaxy Tab physical-device acceptance and 60fps sustained profiling are **unproven** until real devices are tested; don't infer acceptance from Chromium sizes.

## Qualification and handoff

A passing exact-commit GitHub Actions run is required before packaging. Deliver two separately identified variants only if both tested:
1. Direct standalone **source-qualified offline game** with built-in report control (preferred).
2. Windows ZIP containing this exact HTML, SHA-256 manifest, one-click `.cmd` launcher, explicit no-CDN assurance and readme; same build, not an unqualified regenerated game.

Owner test: extract ZIP; open game; pick Energ*etic*, climb; press `Download playtest report`; compare Warm-up/Intense using same seed; upload the JSON. The next production balance gate uses real human capture rate, rows, reaction intervals and distance trends without optimizing blindly to perfect-answer scripts.
