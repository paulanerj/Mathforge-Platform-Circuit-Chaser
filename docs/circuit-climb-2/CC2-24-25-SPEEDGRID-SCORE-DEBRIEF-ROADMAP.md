# MathForge Circuit Climb — Gameplay Completeness & Ten-Phase Production Roadmap

**PM candidate date:** 2026-11-16
**Baseline accepted by owner:** Slate / Focus 43 at `feature/cc2-ui-slate-focus-43-integration`, commit `66a3ab972be05cdc52cff88d712abc151c8a5e40`.
**Candidate:** `feature/cc2-24-25-speedgrid-score-run-debrief`.
**Status:** Isolated owner review; no merge, no production promotion.

## Product assessment: why a good surface is not yet a complete game

Circuit Climb already has real, solver-backed mathematical platforms, physically
landed equations, the Spark/Pursuer chase, honest terminal events, source-backed
score/achievements, Pulse, Capacitor and Relay, difficulty tuning and a
reproducible engine. This is a strong playable **core**, not yet a
complete release game.

The gaps are material:

1. **Narrative stakes and payoff:** Capture is visually recognized, but the
   old results screen did not turn a run into a memorable achievement.
2. **Musical identity and adaptive feedback:** CC2 had its own procedural
   score. The real Speed Grid reference roles, event mappings, and future
   recorded-stem pipeline were not present.
3. **Opposition ecosystem:** Scout/Sentry are opt-in prototypes; the
   original Pursuer remains the only authoritative catcher, which is right
   until fairness and collision precedence are specified.
4. **Strategic consequences:** Pulse/Capacitor/Relay exist, but they are
   not yet a rounded choice economy with planning, risk and earned rewards.
5. **Campaign and return motivation:** A single chase lacks compelling
   missions, persistent unlocks, difficulty curves and reasons to retry.
6. **Pursuer identity:** Bot shape exists but plasma momentum, aggressive
   close approach, emotional sensing cues, sound and material coherence
   need a cohesive art/performance pass on actual hardware.
7. **Learning progression:** Correct arithmetic is audited, but skill
   sequencing, onboarding and source-verified instructional feedback
   across modes need a separately governed pedagogy lane.
8. **Release infrastructure:** Accessibility, motion, native input,
   memory/performance stress, iPhone Safari/Chrome, Android, Gen2
   authority/persistence, host lifecycle and release gates are open.

Do not misclassify the game as commercially complete because it has a
functional mathematical engine and one well-animated capture.

## First two phases in this candidate

### CC2-24 — Speed Grid Reference Score & Sound Integration (implemented)

- Import the **actual code-generated reference music** from
  `paulanerj/mathgrid-07-28`, commit
  `152451fed271f46a80d1a522298f7dca83017384`,
  `src/games/speed-grid/SpeedGridMusicReference.ts`. That source
  defines five phase-aligned stems `pulse`, `foundation`, `rhythm`,
  `energy`, `tension`, exactly 112 BPM, 16 bars, 4 beats/bar. Its
  note generation is preserved, not replaced by a vaguely similar tune.
- A CC2-only playback adapter attaches to the **existing** score audio
  context and owner-controlled master volume; it never adds a second
  context and never changes math or pursuit rules.
- The existing `CircuitScoreDirector13` maps **real** solved rows,
  mistakes, energy, Relay, stage, Pulse and terminal receipts to a
  seven-stage orchestration; the adapter crossfades aligned stems and
  plays bounded local accents only from authentic events.
- The original `Circuit Ascending` score remains available through
  `?cc2Music=legacy`, and settings offers a comparison control.
- This is **not** the recorded Speed Grid commercial soundtrack. The
  recorded six-stem `calculated-ascent-v1` set previously auditioned
  in Speed Grid and the shared professional multitrack assets are a
  distinct source/rights and deployment workstream. This candidate uses
  the authentic, code-generated five-stem **reference** that is actually
  available in the GitHub source.
- Audio autoplay is never assumed; initiation requires a user gesture.
  Source events, single-context lifecycle and memory caps are tested.

### CC2-25 — Living Circuit Debrief & Earned Run Recognition (implemented)

- Replace the generic visual results layout with a cinematic but
  restrained, mobile-first Slate / Focus debrief.
- A red shell with a fully enclosed blue Spark eye communicates capture;
  for completed goals the portrait is blue. The overlay appears after
  the existing capture/terminal transition; it does not override the
  real capture observer, create a new end state or change score.
- Four emphasized source-backed metrics: completed rows, actual choice
  accuracy, score and powered cells.
- A circuit ribbon lights only **physically landed correct equations**,
  with one warm checkpoint for every fourth completed row.
- Keep full actual receipt-backed achievements, power-up highlights,
  complete equation review and a meaningful **Climb again** CTA.
- No inferred mastery, fabricated medals, rewarded wrong choice, fake
  capture or decoration that reveals correct math ahead of time.
- New preview has clear reduced-motion behavior and two accessible
  source-untouched controls for restart and equation review.
- Existing `cc2-run-summary/v1` remains the only summary authority.

## The remaining eight planned major phases

### CC2-26 — Living Pursuer: Matter, Inertia and Menacing Intent
**Objective:** The red organism must behave like a creature with mass,
momentum and perception, not a flat moving disk or detached fog cloak.

Use a bounded GPU/Canvas/2D material field with speed-dependent membrane
displacement, delayed wake, acceleration/inertia, topological shell
cohesion, attack compression and finite energy budget. Distinguish
patrol/search, detection, pursuit, imminent catch, interception and
capture. Musical/foley cues are driven by authoritative bot events, not
arbitrary animation timing. QA: shell stays attached, no opaque black
canvas, stable FPS/heap, captured eye fully enclosed, Android/iPhone,
reduced motion, and zero core-state changes. **No speed or AI changes
hidden inside visuals.**

### CC2-27 — Enemy Ecology: Scout, Sentry and Encounter Readability
**Objective:** Two meaningful, complementary threats, rather than
decorative extra bodies. Refine Scout mobility and Sentry perception,
telegraphs, recovery windows, spawn sequencing and safe limits.
Distinct silhouettes, roles, threat sounds and warning grammar.
Introduce the first source-owned encounter director capable of
independent seeded replay; explicit owner acceptance required before
activating defaults. The red Pursuer stays the only lethal capture
source until collision precedence and design policy are qualified.

### CC2-28 — Special Platforms, Hazards and Ability Strategy
**Objective:** Player decisions have strategic consequences beyond
choosing the right arithmetic answer. Deepen Capacitor and Relay; test
Overload, Insulation, Circuit Shields and risky route opportunities.
Define all features as explicit state machines with spawn, telegraph,
activation, hit/reward, cooldown and cancellation semantics.
Preserve mathematical solvability, player input and truthful score;
never introduce situations where every choice is unwinnable due to
an undisclosed hazard.

### CC2-29 — Scoring, Combo Chains, Achievements and Reward Economy
**Objective:** A clearly understood reason to pursue skillful runs.
Source-backed bonuses for uninterrupted landed solutions, safe timely
decisions, efficient energy use, risk management and clever special
combinations. No bonus for wrong/overshot answers or hidden inputs.
Implement durable mission receipts, achievements, personal-best
comparisons, difficulty-aware fairness and transparent reward rules.
A real replay/review page explains **why** points and badges were earned.
Only then consider upgrades with explicit cost, benefit and balance.

### CC2-30 — Missions, Campaign, Difficulty and Meaningful Replay
**Objective:** The game should have a beginning, a trajectory, a goal and
a reason to return tomorrow. Level/world themes, stage milestones,
multiple chase variants, bounded encounter escalation and authored
short missions. Session length, successful goal completion and capture
are distinct honest endings. Use a deliberate difficulty curve and
difficulty-specific records. No endless no-win sessions.

### CC2-31 — Mathematical & Pedagogical Qualification Lane
**Objective:** Real math learning without treating correctness as
evidence of mastery. Audit solvable routes, skip counting, addition,
choice ambiguity, feedback timing, spaced return and error review.
Assess progress with source-backed evidence. Child testing and future
curriculum/content adapters remain separate from the presentation layer.
Difficulty may adapt only when there is enough real evidence, and
adaptation cannot contaminate answer validity.

### CC2-32 — Unified MathForge Studio/SDK & Host Integration
**Objective:** Versioned, reproducible game authoring, not entangled
magic settings. Adopt cross-suite Studio interfaces:
`validate(config)`, `reset(seed,config)`,
`step(command,tick)`, `observe()`, and `exportReplay()`.
Source-own all gameplay decisions; material/audio editors may only
observe. Build first-class sandbox, deterministic scenario builder,
event recorder, A/B baseline comparison, import/export and reset.
Integrate canonical Gen2 game identity/authority, pause/resume,
results, achievements, persistence and navigation with exactly-once
terminal records. No premature irreversible main merge.

### CC2-33 — Mobile, Accessibility and Production Release Qualification
**Objective:** A commercial-quality, repeatable release process.
Test phones 320/360/390/428, Safari/Chrome, Galaxy tablet, desktop,
orientation, touch conflict, sound-on/sound-off, reduced motion, low
power, low memory, overlays and frame latency. Run extended seed
replays, race/Undo/input/terminal invariants, browser crash recovery,
security advisories, run ledger audits, no black screens, long-session
resource caps and authorizing host checks. Freeze exact source,
presets, assets and release manifest; only owner-accepted candidate
is promoted. No unsupported claims about visual/audio approval.

## Source-of-truth protection & acceptance

- Owner-playtested Slate / Focus 43 commit
  `66a3ab972be05cdc52cff88d712abc151c8a5e40` remains unchanged.
- Only `CC2-24/25` experimental audio, read-only finale, tests and
  portable-file packaging are in this branch.
- No real math, input, character position, Pursuer state/AI, world,
  Scout/Sentry gameplay, score, achievements or captured eye physics
  source has been modified.
- Quality gates: source diff, deterministic math tests, five-stem
  reference checks, user-gesture audio unlock, sound engine comparison,
  real quit/capture summary, restart, responsive mobile screenshots,
  previous capture/blackout/input regressions and portable play.
- This is an owner-review candidate, not an accepted production release.
