# Circuit Climb 2.0 — Living Creature Strategy & Layered Objective Contract
**PM design authority, 2026-11-16 local. Status: DESIGN ONLY, NOT AN IMPLEMENTED BUILD.**

## Product pivot
Stop treating CC2 as an endless Doodle Jump-like arithmetic ladder with stationary power-up badges. Preserve the real physically moving Spark, the bounded sensing Pursuer and the verified mathematical row engine. Make the player solve the primary curriculum while choosing optional *creature-originated micro-challenges* that have visible, timed consequences to the world, path, personal abilities and future pursuit. The result should be **mathematics as tactical agency** rather than two unrelated problem sets or unavoidable drills.

## Protected actual baseline
- Parent exact SHA `441f74c4fdc5dcb6ea5f4bf1045e08647a43515c`, experimental CC2-28 PR #38, never merged to the old `main`.
- CC2-28 currently has **STATIC identical row-wide special sigils** and source-receipted Capacitor, Relay, Surge and existing Pulse. It does NOT implement roaming creatures, a second puzzle, drop-row penalties, decaying platforms or an adaptive strategic Pursuer. **Those are new requested systems, not completed features.**
- The original mathematical state machine (`CircuitClimbCore.ts`) owns primary math, route validity, physical landing, wrong-choice return, solved equations, score and end. The Pursuer controller alone owns sensed belief, movement and legitimate capture. Existing `specialDirector28.ts` reads core/feature receipts and cannot pick answers.
- Existing `cc2-02a.ts` uses `?cc228=1` as an optional experimental feature flag. New work must be separately versioned, disabled on normal URLs, reproducible by seed, and materially slower on neither iPhone nor tablet.
- The shared Speed Grid reference music and living red Pursuer appearance are owner-positive and must not be replaced in this feature design.

## 01 — Objective three-layer stack (next executable CC2-29)
1. The **back layer** has a large persistent session target or interval numeral (e.g. 10, 12, 3), roughly +25% contrast over current presentation *measured in UI context*, never making platform answers harder to see. It is behind main objective copy, NOT a DOM overlay that blocks taps.
2. The **middle layer** has the curriculum phrase very close to that numeral (SUM TO / SKIP BY / MAKE TARGET). Reuse existing math area instead of creating two competing H1 banners. Keep other current information accessible.
3. The **front layer** is a modest current example (e.g. 6 + ? = 10 or 3,6,9,?) derived from the REAL current problem, never a synthetic incorrect equation.
4. When the session target actually changes, animate the *transition* visibly: old target fades/recedes, new target emphasizes once; brief accessible “New target: 12” announcement. Ordinary row-to-row changes must not trigger a fake target-change if the governing target remains 10. For the skip2to10 lineage, distinguish **skip interval** from **terminal number**; don't label it SKIP BY 3 without a genuine configured skip-by-3 curriculum.
5. Keep the objective stack stable at mobile 320/360/390/428 and tablet 768px portrait/landscape. Respect reduced motion and high-contrast modes.

## 02 — Dual-track choice, not dual mandatory grading
At any READY row the three primary mathematical platforms still have source-correct answers and normal route selection. Creatures are genuinely independent moving entities; **an encounter may be pursued without pausing, slowing or rewriting the primary curriculum**, but cannot override a mathematical wrong answer. Extra creature challenges require a deliberate action (tap an unmistakable creature target / optional target control, not accidentally tapping an obscured number).
- **Natural platform landing:** source validates normal primary answer -> physical landing receipt -> sample actual creature position and its platform-bound residue at that tick -> apply explicitly documented passive contact effects, if any, with warning, immunity, and source receipt. Correct/incorrect math stays solely under primary math core.
- **Deliberate creature interception:** user chooses creature target while it is targetable -> interaction bubble **originates visually from the creature**, shows a short *skip-counting variation*, and offers 2–3 large touch choices with a short fair timer. The Spark is not “frozen for a free puzzle”: the source Pursuer keeps moving unless a versioned accessibility mode grants a disclosed temporary slow effect. No requirement to complete an optional creature problem to choose the next normal platform.
- **Success:** validate creature puzzle through a separate seeded `CreatureChallengeDirector` -> issue idempotent `CREATURE_CHALLENGE_SOLVED` receipt -> apply exact type/timing and duration of world modifier, visual trail, and musical motif. The creature may be captured, relocated, transformed, linked, or consumed according to its species. **No free score from a wrong attempt or decorative preview.**
- **Failure / expiry:** mark `CREATURE_CHALLENGE_FAILED` or `EXPIRED`, release target immediately and preserve primary math controls. Some creature types intentionally attach a communicated disadvantage; initial failure must not instantly terminate a novice run. No double-spend or double-hit.
- Each creature may be present and visible while **not currently safe to target**. Use explicit availability/hostility signifiers, never color alone. At least one safe path remains on the normal row.

## 03 — Seeded moving creature physics and persistent platform residue
Introduce isolated `CreatureEcologyDirector` that owns discrete `worldTick`, creature state, targetable positions, seeded hop plans, mood, energy, encounter state, visible effect and platform residue.
- Creature phase: SPAWN -> OBSERVE -> HOP_PREP -> HOP -> OCCUPY -> INTERCEPTED/QUESTION -> CONTACT/ESCAPE -> RESOLVE -> COOLDOWN or RETIRE.
- Hops use visible eased arcs with mass/inertia and trailing energy; no teleports or detached full-board textures. Current platform occupancy and outgoing residue must be physically positioned via the actual platform geometry and camera, not guessed screen coordinates.
- On departure write a **finite-duration residue ledger** `{platformId,kind,startedTick,expiresTick,sourceCreatureId,priority}`; existing tile graphics show charged, grounded, sticky or unstable aftereffects. Residue never changes answer correctness without a separately accepted gameplay contract.
- Creatures obey max simultaneously active count, 60-Hz deterministic plan, seeded encounter budget, early-run safety and predictable targeting/hitboxes. No player needs to tap a creature visually underneath a platform. Reduce-motion variant uses clear discrete states rather than animation.
- State is serialized in replay with creature seed, encounter decisions, timer, target and interactions. No \u201cclient UI recomputes reward\u201d semantics.

## 04 — Four first-generation creature species
| Species | Movement/character | Optional micro-puzzle grammar | Successful choice | Natural landing / unfavorable timing | Residue |
| --- | --- | --- | --- | --- | --- |
| **Capacitor Sprite** | Light, curious, skips ahead and bounces across nearby safe platforms, flickering/growing with charge | Extend a skip sequence like 3,6,9,?; fill a missing term | +1 earned charge or brief Spark acceleration, capped; rewards only from solved receipt | Touching charged plate normally may earn existing earned charge on true primary completion; missed interception expires harmlessly | Luminous charge decays |
| **Relay Weaver** | Intentional, hops along linked edges, draws an observable circuit filament, cooperative | What number follows this step in a skip-by-2/3/4 cycle? | Grounds short hazard, protects one next row or reconnects/extends platform lifetime | Passive contact may ground only if source criteria satisfied; wrong optional answer breaks the temporary chain, *not the math row* | Conductive/grounded trace |
| **Drag Slug** | Heavy, visible pre-hop compression, slow viscous smoke that trails behind | “Jump by 3: 6,9,?,15” or deliberately ignore it | Cleanse sticky field / gain inertia break, earn a temporary anti-slow boost | Clearly telegraphed contact slows *Spark travel speed* (initially 12–18% for finite ticks) rather than secretly changing answer | Sticky/damped surface expires |
| **Drop Wisp** | Restless, volatile, flickers above an unstable platform, distinct non-red warning | Tiny skip-count escape sequence; must be solvable within a fair budget | Stabilize platform, cancel drop event, brief evasive hop bonus | Unavoided direct contact can trigger an explicit **one-row displacement** after a warning and landing-grace check, using a newly qualified source movement action; do not pretend the existing wrong-answer return is the same physics operation | Unstable platform scar then expires |

These names and numerical thresholds are **candidate balancing defaults**, not owner-accepted tuning. For first playable experiment, implement Capacitor Sprite and Drag Slug fully before enabling Relay Weaver or Drop Wisp. The Drop Wisp cannot ship until source-owned row-drop preserves solvability, score, camera, capture and replay.

## 05 — Platform lifetime and speed-pressure modes
The user requests strategies where platforms may decay quickly unless a creature is captured. Design *separate, visible rule sets*:
- **Classic Climb (default protected):** existing durable platforms, no creature ecology.
- **Encounter Climb (opt-in):** roaming creatures, normal platform lifetime, optional bonuses and temporary penalties.
- **Fading Circuit (opt-in after QA):** platform stability has a discrete visible meter; after a row is actually entered, platforms degrade from 100% -> <30% warnings -> expire at configured ticks. Correct math option must remain physically reachable until legal travel can complete, or the core must enter a specified and recoverable failure action. A creature success can restore lifetime; failure can reduce it by a bounded amount. No unavoidable dead boards.
- **Pursuit Tactics:** Pursuer stays somewhat closer while player gets multiple agency modifiers (Spark speed, safe-hop grace, obstacle diversion, Pursuer delay, concealment) that should matter more than tapping faster. Protect no unavoidable catches and no permanent disengagement.

The player chooses *risk* for advantage, not arbitrary forced homework.

## 06 — Pursuer intelligence as modular policies, not 50 arbitrary speed sliders
The user asked for roughly 5x the current parameters because new world rules should affect the chase. Use **10 independently versioned decision domains** of ~5 meaningful controls each, including observables and tests, but do not confuse 50 numbers with intelligence:
1. Sensing: visible cone, acquisition latency, loss tolerance, uncertainty growth, false-signal skepticism.
2. Movement: pursue acceleration, braking/inertia, turn-rate, retreat bound, vertical preference.
3. Prediction: horizon, confidence decay, intercept cost, path-change penalty, stale-belief budget.
4. Creature attention: reward scent weight, hazard aversion, distraction duration, live sensor verification, return-to-hunt cooldown.
5. Platform awareness: decay detection, expected lifetime, route feasibility, instability penalty, safe bypass preference.
6. Player ability response: temporary boost recognition, lock recovery, slow-effect awareness, countersteer reaction, bounded compensation.
7. Pressure pacing: desired proximity range, urgency curve, chase commitment, escape window, frustration timeout.
8. Fairness: first-row protection, guaranteed telegraph, max catch pressure, no forced wrong answers, post-drop grace.
9. Personality: curiosity, persistence, impatience, risk tolerance, reaction expressiveness.
10. Balancing/diagnostics: seeded difficulty profile, beginner adaptation, advanced adaptation, authoritative receipts, reproducible scenario tracing.

All input features must be **observed source-world events** or physically sensed entities. Pursuer cannot read correct answer IDs, user intent, future random draws, hidden optional-creature math, or graphics-only state. Personality changes *observable* movement, not cheating. Every new modifier has min/max, ownership and neutral default. **Never multiply unlimited boosts:** use priority/bounded composition and matched-seed automated tests.

## 07 — Creature's own music, subordinate to existing score
Implement `CreatureMusicalVoice` instances as scheduled, lightweight motifs/channels mixed into the currently approved Speed Grid-derived adaptive score with beat-grid alignment:
- Capacitor: high/quick rising, an upper-register answered motif;
- Relay: call/response and repeated connective metallic tones;
- Drag: filtered descending legato, rhythmic drag;
- Drop: dissonant tremolo/tension before landing, short descending resolution on drop.
Each species owns spawn/seek/hop/offer/answer-success/failure/departure musical states, with duplicate-event suppression, seed synchronization, voice budget, side-chain/ducking against primary score and device audio settings. No new AudioContext per creature. The music must signal actual *source events*; screenshots/visual previews cannot trigger real earned game effects. Muted/reduced-sensory remains predictable and accessible.

## 08 — Requirements and exit gates
**Before playable owner candidate:**
- First 4 rows uncluttered and demonstrably solvable; a nearby creature appears by a deterministic test threshold, not hidden at row 8 by accident.
- Every normal answer remains legitimately graded before effects. Optional quiz can never replace a wrong primary answer with a correct landing. Multiple source receipts per platform are idempotent.
- Creature puzzle generator: exhaustive seeded enumeration of 1-4 step skip-counting variants, one uniquely correct answer among 2–3 choices, age appropriate, answer never trivially color-coded or leaked.
- A creature visually originates its own speech bubble and music and hops between actual platforms; it leaves measurable residue; source collision runs on physical platform/tick state and not DOM overlap.
- Player may ignore a creature; there must be a meaningful safe default route. Explicit consent via touch to target, optional puzzle cancel/recover, no tappable obstruction. Target change primary objective UI remains clear despite creature question.
- Stop/fail/reset/pause/capture cannot duplicate/ghost effects or awards. Simultaneous core row landing + creature collision + Pursuer capture has a **single ordered deterministic arbitration policy**; capture must not be silently bypassed by a delayed creature reward.
- 320/360/390/428 iPhone and 768 tablet portrait/landscape first taps, source input latency/60 Hz budgets, no full-board dark canvas; reduced-motion/sound and landscape; source-vs-visual QA.
- Seeded long-run tests for 1,000 encounters, liveness, zero unresolvable options, correct 1-row drop handling and 50-policy Pursuer matrix; individual policy changes must not yield an obviously omniscient Pursuer.
- Compare 30-s matched-seed test sessions (Classic, Creature, Fading, Tactics) for skill-dependent capture, time pressure and reward decisions. User device acceptance separately required.

## Work sequencing / split
**CC2-29** Layered Objective Stack with REAL curriculum authority, contrast +25%, readable transition.
**CC2-30A** Creature Director & minimal physically positioned hopping/runnable replay; first encounter only (no harmful world effects).
**CC2-30B** Optional mini-skip puzzle with fast/cancellable touch input, source-adjudicated outcome; Capacitor full reward.
**CC2-30C** Drag Slug full source penalty, residue and pressure contract.
**CC2-30D** Relay Weaver and Drop Wisp under explicit fairness/row-drop qualification.
**CC2-31** Fading Circuit + tactical Pursuer with modular sensing/decision controls, all bounded.
**CC2-32** Creature musical voices + adaptive score scheduling.
**CC2-33** physical-device game balance, tutorials, achievements, finite missions, Gen2 commercial acceptance.

**PM non-negotiable:** Do not implement all 50 parameters at once and call the Pursuer smart. Protect accepted bot pathfinding until a matched-seed outcome matrix demonstrates real strategy and fairness. For this pivot, source-owned mathematical integrity and deterministic replay are acceptance gates, not post-launch cleanup.
