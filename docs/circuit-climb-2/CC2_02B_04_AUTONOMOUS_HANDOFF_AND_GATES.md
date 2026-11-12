# Circuit Climb 2.0 — CC2-02B through CC2-04 autonomous engineering handoff

**Project:** Circuit Climb 2.0 (MathForge vertical mathematical escape game).  
**Date:** 2026-11-11 local (CI uses November 12 UTC).  
**Purpose:** Record completed engineering work, immutable authority, actual evidence and the remaining gates before another PM session or surface switch.

## 1. Authority and branch graph

Original accepted SOT-02 was **not edited** in the successor work:
- **Original governing source:** `paulanerj/Mathforge-Platform-Circuit-Chaser`, preserved prior production state `c8838c30947c2a561bfc8322a6159e4f28fef61a`; SOT source integrity guarded against `0a6f138f229119bc6b6c15ee1f658046c7075f50`.
- **CC2 design branch:** `circuit-climb-2-production`, parent CC2 design commit `fe3f88c629548ce0f21540ef3fc5a748b16000c8`.
- **CC2-02A:** `feature/cc2-02a-core-world-math` — PR #1 draft, source-derived math/world/learner.
- **CC2-02A-Q1:** `feature/cc2-02a-q1-visual-interaction` — PR #2 draft, legible touch interface.
- **CC2-02B:** `feature/cc2-02b-intelligent-pursuer` — PR #3 draft, real finite-sense physical pursuer.
- **CC2-03:** `feature/cc2-03-pulse-special-rows` — PR #4 draft, earned Pulse, Capacitor and Relay.
- **CC2-04:** `feature/cc2-04-results-sdk` — derived from CC2-03, source-authoritative results, achievements, host-neutral evidence, and portable delivery.

All the successor branches are **qualification candidates**. They are intentionally not merged into the governing CC2 branch, original SOT-02 or `main`. Maintain this custody hierarchy and review gates.

## 2. CC2-02B — real intelligent pursuit, what is proven

A new physically legal rail/trunk graph, finite sensing firewall, observed-only Brain, expanding reachable search, collision-constrained chassis, source-owned capture and deterministic replay are implemented.

[CI run 43143379113](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43143379113) **passed** including original product regressions. The 100-case F08-style test population had 100 legitimate observations, 100 losses, **100 reacquisitions** and zero reported route failures. The real Chromium chase tests showed legitimate sensor acquisition, grounded capture, reset and pause.

**Limits:** 100 controlled encounters are not a general proof of perfect intelligence, real learner pleasure, obstacle handling at unlimited height or tuning. Device observation and prolonged climb remain open. The original experimental 07A/07B1/Graph V2 evidence is historical context, not imported acceptance.

## 3. CC2-03 — gameplay expansion, what is proven

[CI run 43158451306](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43158451306) **passed** original + successor unit/browser checks.

- First four rows normal. From row five, authored deterministic **Capacitor** rows at multiples of six and **Relay** rows at multiples of four, with Relay priority on overlaps. All three candidate platforms visibly receive the *same* modifier; no exclusive correct-answer artwork.
- Correct physical landing yields +1 earned Pulse charge, or +2 on Capacitor rows, clamped to capacity four. Wrong options never yield charge.
- In Climb/Challenge, **Circuit Pulse** is READY/grounded-only, spends the full meter, is bounded in range, and for an affected bot multiplies body speed by 0.65 for exactly 150 fixed simulation ticks. It does not disable the AI's sensing/Brain or issue fake capture/math decisions.
- Out-of-range activation still spends charge but honestly reports no affected target. This prevents a UI from implying an imaginary hit.
- Separate CC2 feature event log and replay capture maintain identical source outcome on reconstruction.
- The playable source lab is `src/games/circuit-climb-2/devtools/cc2-03.html`.

## 4. CC2-04 — truthful results, achievement evidence and SDK contract

[CI run 43159422971](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43159422971) **passed** source, unit/browser, previous successor and protected original checks **before optional portable packaging was added**.

- `results/runResult.ts` derives status, score, accuracy, 4-row cells, earned stages, and a list of **completed correct landing equations only**. An accepted correct selection still traveling may count as an accepted attempt, but NOT a solved equation.
- `FIRST_CELL`, `THREE_CELLS`, `PERFECT_CELL`, `CIRCUIT_PULSE_USED`, `BEAT_CHALLENGE` are game milestone evidence, never educational mastery.
- `sdk/learningBridge.ts` projects source event payloads into versioned host-neutral learning messages. It neither evaluates correctness nor depends on a host account. Subscribers have independent delivery/dedup ledgers; failures do not block other subscribers and preserve order for retries.
- `devtools/cc2-04.html` has independently selectable Climb/Practice/Challenge and a run-summary modal that shows source-correct equations, not failed or overshot choices. Source and browser tests include a deliberately wrong + four-correct Practice run: **5 accepted attempts / 4 solved rows / 80% accuracy**, with FIRST_CELL but not PERFECT_CELL.
- `devtools/buildPortable.mjs` and `cc2-04-portable-smoke.mjs` additionally target **one self-contained offline HTML artifact**, built from the same source with bundled inline JS/CSS and tested on `file://` with HTTP blocked. Treat this portability subgate as **pending until its exact-head CI is green and the artifact is present**. Do not assume a live Vercel preview or public deployment.

## 5. Explicit release blockers

1. **Physical-device acceptance:** actual iPhone Safari and Galaxy Tab S6 Lite, rotation, reduced motion and accessible controls remain unverified even with Chromium phone/tablet CI.
2. **Long-run Pursuer graph:** the current controller builds a graph from the bot row and published tower. Graph size and retained-world geometry need high-altitude, lagged-bot, and repeated rebuilt-graph proofs; the graph's hard 140-row window ceiling makes endless-run qualification especially important.
3. **Performance:** sustained 30-minute Climb, 60Hz simulation cost, renderer frame time, heap and path-planner growth have not been measured on low-spec devices.
4. **Audio and complete suite visual identity:** musical optimism, cue hierarchy, MathForge Monument Valley-style geometry, high-contrast settings and tactile/haptic tuning are not yet owner-qualified.
5. **Curriculum:** CC2 implementation currently supports add20; subtraction, higher bands and mixed arithmetic must be separate solver/transaction packs without changing pursuer correctness.
6. **Additional enemies/platforms:** Scout, Sentry Arc, Interceptor, Warden and advanced special rows are future opt-in expansions. **Do not add them before standard pursuer balance and long-run stability**.
7. **SDK:** host-neutral projector exists; actual host SDK adapter handshake, event subscription wiring, and host-null/host-present parity are not yet tested in a MathForge SDK application.
8. **Dependency/release security:** inherited `npm ci` reports upstream vulnerabilities. No unreviewed dependency changes were applied to protected SOT-02.

## 6. Next autonomous engineering sequence

**CC2-05A — Endless-world/retention proof.** Bounded rolling pursuit graph, reconstruct older collision geometry without exposing unseen future Spark positions, 150+ row rapid-climb tests, no teleport and zero false capture. Preserve the CC2-02B reacquisition fixture.

**CC2-05B — Real runtime/performance.** CPU/heap/frame budgets on 320px/390px/tablet, replay signatures at different display FPS, fixed 60Hz tick determinism, long-run memory/graph soak, and browser screenshots after 30/60/90+ row samples. Benchmark first; change code only under measured evidence.

**CC2-06 — Learner polish.** Final gameplay HUD, summary/achievement animation, electrical construction visuals, audio/haptic contract, color contrast, reduced motion and SDK settings/preset authority. Maintain the compact screen-tested arrangement and don't reveal correct options.

**CC2-07 — Curriculum packs.** Subtract20, Add50 and explicitly selected mixed packs; generate physically valid mathematical problems and proof-grade progress. No silent difficulty escalation based on bot pressure.

**CC2-08 — Optional advanced worlds.** Scout/relay mechanics or Sentry prototypes only after base chase safety qualifies. Each enemy must have independent perception/collision evidence.

**CC2-09 — Host integration and production release gate.** Standalone/embedded parity, source-owned accepted math, bounded bridge events, save/resume protection, device owner signoff and an explicit production/release decision.

## 7. Switch-surface handoff instruction

A later ChatGPT PM can resume directly from `feature/cc2-04-results-sdk` without re-deriving the game. It must inspect the latest CI status, trace source SHA, preserve parent draft PR chain, and **not** mistake automated proof for owner approval. If a portable HTML artifact is green, it is the preferred phone-testing deliverable. Never merge the old Pursuer R&D or bypass the SOT-02 protection gates.
