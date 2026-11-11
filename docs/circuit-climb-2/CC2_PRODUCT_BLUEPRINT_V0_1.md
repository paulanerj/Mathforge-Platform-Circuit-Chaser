# CC2 — Production product blueprint v0.1

**Owner:** Circuit Climb 2.0 PM | **Date:** 2026-11-11 | **Status:** PROPOSAL (not implemented/accepted)

## 1. Product thesis

Circuit Climb is a *mathematical vertical chase*: choose the platform that solves the displayed equation, watch the blue Spark travel along a legible right-angled circuit, light up the tower, and climb while a capable red pursuer closes the distance. The player should feel that **correct reasoning powers escape**. The core is a decision under gentle but real temporal pressure, not a free-steering platform game.

Audience: arithmetic learners, initially approximately grades 3–6, with configurable curriculum and a MathForge host that may supply assignments, profiles and accessibility preferences. A good two-minute session is a complete game. A longer session is several increasingly interesting runs.

### Non-negotiable inherited loop

1. Present a target equation with player current value and three numbered platforms.
2. Guarantee **exactly one mathematically correct choice** and **all three physically selectable** within the supported world layout.
3. Player taps a destination; input yields a named acceptance/rejection transaction.
4. An incorrect selection shorts the chosen platform for that row, communicates the math, returns Spark safely, and leaves a retry opportunity per accepted behavior.
5. A correct selection produces travel along a legal blue orthogonal circuit path, a correct landing, a green powered platform, an updated Spark value/row, and the next solvable decision.
6. Red pursuer remains an independent physical opponent; capture terminates the run. Pause suspends all simulation.
7. The route is computed by the game. The learner never steers a path and is not punished for a collision in transit they cannot control.

**Explicit events:** `CHOICE_SELECTED`, `CHOICE_EVALUATED`, `TRAVEL_STARTED`, `TRAVEL_FINISHED`, `LANDING_CONFIRMED`, `ROW_COMPLETED`, `PURSUER_CAPTURED`, `RUN_ENDED`. Event shape/names to be validated against existing SDK contracts; these are semantic placeholders for design, not finalized API names.

## 2. Goals and anti-goals

**Goals:** immediately comprehensible arithmetic; visible cause/effect; satisfying ascent and power-on; a fair adversary; independent run modes and difficulty controls; strong phone/tablet support; reproducibility; content designed for replay and student learning evidence.

**Anti-goals:** secret bot omniscience; unsolvable rows; new abilities that reveal the answer or invalidate math; asking the child to steer a route; reflex-only deaths during fixed transit; untelegraphed instant loss; overwhelming currency/economy; extensive permanent upgrades that change assessment accuracy; multiplying unrelated mechanics before the core is proven.

## 3. Three-stage release feature ladder

### Launch core — must ship

- Correct/wrong route and short-out loop; stable movement/landing and progression.
- One strong pursuer with perceptual limitations, purposeful search/reacquire, fair capture.
- Special platform overlays from a bounded catalog, introduced one at a time.
- One carefully bounded player ability, earned by mathematical play rather than purchased.
- Three gameplay profiles: **Practice** (low pressure/strong scaffolds), **Climb** (standard pursuit), **Challenge** (higher temporal pressure). The mathematics curriculum is selected independently.
- Clear HUD: current value, target/equation, row progress, threat indication, ability meter. Home / pause / restart / settings and suite-consistent controls where behavior exists.
- End-of-run review: rows climbed, correct/incorrect selections, solved equations, accuracy, cause of termination, optional review of mistakes.
- Accessibility, music/SFX/haptics controls, reduced-motion and high-contrast settings.

### Post-core — candidate, not automatic launch scope

- Additional non-boss enemy families.
- A multi-stage Pursuer Encounter or boss variation.
- A carefully tested second ability and expanded platform catalog.
- Curated challenge routes and daily seeded challenges (online account services NOT required).
- Personalization based on measured gameplay evidence, with learner consent/host policy.

### Future — explicitly deferred

- Multiplayer, procedural campaign story, cosmetic economy, social leaderboards, monetization, online-only functionality, AI-generated math without deterministic validation.

## 4. Special platforms: proposed catalog

**Rule:** All special platforms preserve the same number-choice question and legal route to each option. Effects activate *after a valid landing*, unless the mechanic is explicitly a visible wrong-answer consequence. Every active modifier is telegraphed before selection. A special platform never changes mathematical correctness.

| Platform | Candidate behavior | Gameplay purpose | Proposed gate |
|---|---|---|---|
| **Capacitor** | A correct landing adds a bounded charge to the ability meter. | Reward correct sequences. | Launch core candidate |
| **Relay** | A correct landing sends a visible lighting wave along previously powered circuit nodes; score/combo visual only. | Strong math-to-world feedback. | Launch core candidate |
| **Stabilizer** | A correct landing briefly slows the pursuer by an explicit fixed-duration effect, never freezing the whole game. | A perceivable relief beat. | Prototype then decide |
| **Overload** | Clearly marked wrong choice has an intensified *visual* short, but cannot introduce an extra hidden penalty. | Variation and teaching clarity. | Prototype |
| **Switchback** | A route presentation variant that remains legal, orthogonal and destination-driven; player still chooses number, not route. | Visual variety only. | Post-core |

**Spawn policy:** no more than one new platform behavior introduced per early progression band; no special platform on a row until base loop proficiency is demonstrated. Exact frequency and tuning are not final. All modifiers are placed *after* math candidates are generated, never in the math solver. Do not make the correct platform identifiable from its modifier.

## 5. Player abilities: proposed catalog

**First launch ability: Circuit Pulse** (candidate). Earn charge from a defined number of correct landings. A tap triggers a short visible disruption field that **temporarily reduces the pursuer's movement capability** within a fixed graph-distance/radius. It may not teleport, remove geometry, cancel an unavoidable capture retroactively, change the correct answer, or bypass a learning decision. The pursuer returns to its prior evidence-aware behavior when the effect ends. Cooldown, charges, timing, and accessibility remain to be tuned.

**Second ability: Echo Decoy** (post-core candidate). Places a limited false observable trace into the pursuer's *ordinary perception* pipeline. Because the bot does not know the player's future route or equation, it can investigate the trace and eventually reject it based on evidence. The trace cannot force a guaranteed escape and must not work through omniscient scripting.

**Third concept: Insulation** (defer). A bounded idle/capture grace after a correct landing, distinct from the accepted *in-transit* shield. Only consider after measuring whether extra shielding makes the chase toothless.

No pay-to-win progression. Consumables and abilities are earned within a run; permanent modifiers cannot contaminate comparable learning metrics.

## 6. Enemy roster and encounters

**The red Pursuer is the lead character of the opposing system.** Launch cannot depend on extra enemies to cover up weaknesses in its intelligence.

- **Pursuer (launch):** physically navigates the authoritative world, senses only admissible observations and player traces, switches between search/alert/chase states, and produces fair capture outcomes.
- **Sentry Arc (post-core candidate):** a short-range, visible, platform-attached hazard that periodically energizes a predictable nearby region. It must never eliminate the offered destination or force a penalty on an unsteerable route.
- **Scout Node (post-core candidate):** slow, bounded patrol that may create an observable cue for the pursuer if it detects Spark; never an invisible global position feed.
- **Interceptor (future):** an agile but physically constrained secondary pursuer with a different role and strict spawn/CPU budget; only add after one-bot quality is proven.
- **Boss/overload encounter (future):** a periodic authored behavioral change, not arbitrary speed inflation or impossible route closure.

Any enemy may alter *pressure*, never the mathematical truth, and every contact priority must be specified. Capture cannot happen in protected transit in the accepted rule set.

## 7. Progression, pedagogy, scoring

- **Curriculum:** configurable integer addition/subtraction to start, with multiplication/division and multi-step pathways as separately validated packs. Never assume the current runtime already supports every pack.
- **Difficulty axes stay independent:** arithmetic, decision-time pressure, route/world complexity, pursuer aggression, hazard density. Mode presets combine them but never make math correctness dependent on pursuer speed.
- **Progression:** gentle onboarding, early mastery with base rows, one new modifier after demonstrated competence, deeper route/pressure combinations later; seeded generation and deterministic replay.
- **Scoring proposal:** rows completed + correctness/consistency bonuses + progress milestones; no opaque mathematical penalty hidden in movement. Wrong attempts remain recorded. Raw accuracy always available independent of score.
- **Feedback:** show `current value + selected number = result` against target (or the actual configured operation) before world advances; the visual circuit should explain the computation, not merely flash.
- **Win/lose:** capture ends a run (accepted); optional goals/chapters can end successfully. A continuing endless-climb profile is allowed if the terminal semantics are explicit.

## 8. Presentation system

- Visual grammar: blue Spark, green/cyan powered circuitry, red pursuer, warm/amber hazard warnings, clear high-contrast numbers. Restrained Monument Valley-like geometry with translucent depth and subtle internal light; avoid visually noisy plasma.
- Top: one compact row for mathematical status and important run data. The board owns the primary screen. Bottom: one consistent controls row; move tutorial, statistics, tuning, QA and provenance to Help/Settings > Developer.
- Correct choice: subtle path construction -> mathematical value explanation -> smooth landing -> powering wave -> next row without unnecessary full-screen celebration.
- Wrong choice: short-out shown *on the chosen platform*, explicit equation and return; maintain useful pace and no confusing extra loss animation.
- Threat readability: bot intent and distance conveyed through fair animation/audio cues, not privileged telemetry in learner mode.
- Responsive: prioritize iPhone portrait and common Android tablets, then landscape and desktop. Test 320/360/390/428 widths and tablet widths; guard safe areas, pointer/touch, reduced motion, page-scroll suppression inside play, adequate hit targets, readable numerical contrast.

## 9. SDK and architectural principles

A standalone, deterministic `CircuitClimbCore` owns mathematical generation/evaluation, physical route admissibility, state transitions, pursuer and local special-effect rules. Rendering does not adjudicate answers. A thin MathForge adapter translates approved semantic events and consumes optional host services (curriculum, sound, identity/context, persistence, telemetry policy). It may not rewrite mathematical truth or introduce hidden gameplay changes.

Every designer-tunable value must have one named authority and schema, validation, versioned presets, import/export, reset-to-defaults, deterministic seeds, and an explicit resolved configuration digest per run. Support an offline local experience; connected features must degrade gracefully.

## 10. Release definition

A 'production-ready surface' means: fun and comprehensible learner play, no known mathematical integrity or reachability failures, validated fair pursuit, clear UI on actual devices, accessibility and audio controls, complete start/pause/resume/end lifecycle, learner-evidence integrity, stability/performance budgets, content verification, complete automated and human acceptance evidence, and a documented SDK adapter boundary.

**This document is a design candidate.** CC2-01 must convert each candidate launch mechanic into a precise testable contract; nothing here authorizes unreviewed changes to accepted SOT-02 gameplay.
