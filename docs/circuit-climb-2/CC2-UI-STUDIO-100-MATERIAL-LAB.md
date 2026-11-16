# MathForge Circuit Climb — UI Studio 100 + Materials Laboratory

**Status:** Experimental independent design studio; owner approval pending.
**Branch:** `feature/cc2-ui-studio-100-geometry-lab`
**Parent:** `3d2aa0d6bc5a8c18ee442f10bd17c63a8f79db8b`
**Standalone entrypoint:** `public/cc2-ui-studio/index.html`
**UI preset schema:** `mathforge-cc2-ui-studio/v2`
**Feature proposal schema:** `mathforge-feature-proposal/v1`
**Math and chase engine changes:** NONE.

## 1. Why the initial 50-concept demonstration failed

The original demonstration was mathematically and visually ambiguous:
a Spark could appear to touch an upper platform before a landing,
and different compositions could crowd equation and choices. In addition,
the Pursuer approached the bottom threat-meter HUD on some variants, while
narrow layouts could shrink the board too far.

These are semantic communication defects, not subjective aesthetic choices.
An apparent collision with no actual collision event lies to the player.

### The hard spatial contracts

1. Spark cannot overlap its next upper platform before real landing.
2. In the READY visual state it must rest on its current supporting ledge.
3. The Pursuer cannot obscure the threat meter, Spark, or current ledge.
4. Answer cards must not overlap the ledges, math equation, or one another.
5. Actions must remain reachable, readable and non-overlapping on phones.
6. Idle, warning, capture and outcome visuals must communicate actual states.
7. Do not pre-reveal correct answers using styling before a selection.
8. UI treatments must never modify correctness, world geometry, bots, audio or replay.
9. Never infer authority over collisions or achievement awards from a presentation layer.
10. A design can only be called visually accepted after owner and learner playtests.

The scene has a shared coordinate authority: equation at ~14px, choices
at 96px, target ledges at ~182px, Spark center at 255px, current ledge
at 280px. At the standard scene size this produces ~46px clearance
between Spark and overhead platform, ~5px support clearance to its own
ledge, and ~34px clearance between math cards and target ledges.
The pursuer is placed outside the current-ledge footprint and away from
the bottom threat indicator. These dimensions are prototype standards, not
the authoritative physics model of the game.

## 2. The actual 100 concepts and qualification

Twenty independent color/material families × five composition systems:
- Mineral, Porcelain, Midnight, Sage, Obsidian, Sandstone, Arctic,
  Amethyst, Slate, Dawn.
- Copper, Linen, Boreal, Cobalt, Ember, Cloud, Quartz, Nocturne,
  Terracotta, Verdigris.

The five composition systems remain Horizon, Tower, Focus, Tactical,
Floating. Every option uses exactly the same demonstration equation,
three answers, current platform, next platform, Spark, Pursuer and
bottom actions. Across variants, the drawing composition, text hierarchy,
material language, color tokens, and controls can differ.

**Actual local Chromium evidence:** All 100 designs were rendered at
390px; all 100 were automatically measured at 320, 390, 428, 768 and
1280px. Total 500 layout/viewport comparisons.
- Initial geometric audit caught 200 failures, concentrated in
  Tower equation crowding and compressed board widths.
- After corrections, an additional manual contact-sheet review found the
  Pursuer close to the bottom threat meter; added a bounding-rectangle check.
- Final repeat: 500 of 500 geometric scenarios pass the codified constraints.
- Full evidence package includes all 100 rendered PNGs, 10 group contact
  sheets, a 100-design overview, geometric metrics/JSON and capture snapshots.

These are **only the encoded spatial checks**. They cannot prove the taste,
learning value, artistic quality, accurate physiology of plasma, or
actual gameplay fairness. The 100 designs are candidates, not 100
commercially accepted products.

## 3. Studio material controls

The app has a **sticky miniature scene** at the top of its inspector so
the selected object remains visible while the user scrolls through controls.
Editable descriptors include Spark diameter, Pursuer diameter, plasma
intensity, trail persistence, warning emphasis, tempo, surface language,
and a visual behavior sample. All changes update the real preview and
the miniature without refreshing the document.

Six deterministic sampled visual stages:
READY -> APPROACH -> WARNING -> CONTACT -> CONTAINED -> SETTLED.

The slider can move forward or backward to any point. Playback is controlled
by a reusable step clock, with loop/restart controls and reduced-motion
support. The final visual state has one outer red shell and a centrally
enclosed blue eye. This is a preview, not a real collision or victory.

Color tokens (12), layout, material, font, radius, contrast, grid,
atmospheric depth, motion, character materials and current feature
proposal are exported in versioned JSON and validated on re-import.
Favorites and side-by-side A/B remain available.

## 4. Proposed special-element contract builder

Six feature ideas may be explored without activating real gameplay:
- Scout: DORMANT -> SPAWNED -> SENSING -> TELEGRAPH -> SIGNAL -> COOLDOWN.
- Sentry: DORMANT -> SPAWNED -> SWEEP -> TELEGRAPH -> ALERT -> COOLDOWN.
- Overload: INACTIVE -> TELEGRAPH -> ACTIVE -> RESOLVE -> RECOVER.
- Capacitor: SPAWNED -> ELIGIBLE -> LANDED -> ENERGY_GRANTED -> EXPIRED.
- Relay: SPAWNED -> ELIGIBLE -> LANDED -> RELAYED -> EXPIRED.
- Insulation: LOCKED -> AVAILABLE -> ARMED -> CONSUMED -> EXPIRED.

The owner can edit proposed sensing radius, warning ticks, active ticks,
cooldown and earliest completed row. Export is an **unapproved feature
proposal**, not a command to change live math, AI, collision or achievements.
The studio does not simulate complete gameplay interactions for these
proposed features, and their displayed transitions are design proposals,
not evidence of solved difficulty balancing.

## 5. Long-term shared MathForge production toolchain

The cross-game vision is practical if built as shared infrastructure,
not as one enormous game-editing control panel:

```text
Authoring studio
   | versioned proposed config, schema + guardrails
   v
Configuration compiler / validator
   | approved presentation vs gameplay vs pedagogy scopes
   v
Deterministic core adapter (per-game)
   | seeded commands, authoritative collisions, outcomes
   v
Read-only event stream
   +--> Playback / timeline / screenshot / sound/visual sampling
   +--> Test-case generator / flight recorder / property checks
   +--> Comparison: baseline engine vs candidate flags
   v
Promotion gates: tested preset -> owner accepted -> release candidate
```

### Separation of authority

**Presentation:** palettes, materials, depth, camera, motion, HUD and
character treatment. Hot-reload permitted only when it cannot alter
tap geometry, math visibility, collision or scoring.

**Gameplay:** bot sensors, movement, encounter scheduling, hazards,
collision precedence, abilities and difficulty. Runs must explicitly
restart from a seeded simulation and carry a versioned config receipt.

**Learning:** problem generation, solvability, correctness, feedback
and evidence. Not writable by cosmetic editors; pedagogical experiments
require their own qualifications.

**Host / economy:** achievements, persistence, rewards, results,
accessibility and MathForge Gen2 integration. No feature may award or
spend currency or claim learning without core-owned receipts.

### Four essential adapter ports

1. `validate(config, sourceVersion)`: rejects unsupported combinations,
   unknown keys, unsafe ranges and changing game semantics mid-run.
2. `reset(seed, config)`: returns a new authoritative session.
3. `step(tick, command)`: applies the same simulation to all replay runs,
   independent of browser frames or animations.
4. `observe()`: returns a bounded public projection with snapshot, events,
   input trace, math receipts and performance diagnostics.

The editor cannot directly mutate private engine state. Features must
declare their event subscriptions and effects. Use independent seeded RNG
streams so visual variations never perturb math sequence generation.

### One shared lab, multiple per-game adapters

Implement MathForge Studio Shell once: inspector, sticky preview,
comparison, JSON and schema versioning, presets, timeline, event diff,
recorder, screenshot gallery, device frames, export, import, reset.
Per-game adapters own domain-specific commands, geometry, tests and
the authoritative source of truth. Cross-game consistency comes
from common contracts, not shared mutable objects or copied gameplay
internals.

## 6. Production phases and hard stops

1. **STUDIO-01: UI geometry & evidence** — completed as a prototype; 500
   measured scenarios and 100 actual rendered images.
2. **STUDIO-02: Parameter schemas** — typed, versioned, validated and
   capability-scoped. Prototype JSON exists, runtime authority pending.
3. **STUDIO-03: State-machine adapter** — connect a selected game via
   pure reset/step/observe, no render authority over the engine.
4. **STUDIO-04: Deterministic recorder** — full event causality and
   reproducible mid-run command sequence.
5. **STUDIO-05: Scenario composer** — real sequence builder for correct,
   wrong, rapid moves, close chase, power-ups and capture.
6. **STUDIO-06: Material / motion explorer** — GPU bounded effects,
   audio event coupling and parameter guardrails.
7. **STUDIO-07: Secondary encounters** — Scout and Sentry finite sensing,
   actual spawn/effect precedence, session invariants.
8. **STUDIO-08: Abilities and hazards** — inventory, collision,
   resource and solvability checks with valid earned receipts.
9. **STUDIO-09: Cross-suite adapters** — Speed Grid, MathQuest,
   Plasma Invaders, FactorForge and Sequence Tiles incrementally.
10. **STUDIO-10: Release qualification** — device farm, accessibility,
    performance, regression, security and owner approval gates.

Only STUDIO-01 is an implemented independent lab now. The remaining
modules need individual acceptance and actual source-backed adapters.

## 7. Industry and platform grounding

Apple HIG currently emphasizes unobtrusive hierarchy, context preservation,
readable touch controls, consistent system patterns, intentional motion and
adaptability. Apple game design guidance recommends ~44x44 pt hit regions
on touch devices, unobstructed central playfield, and avoiding gestures
that conflict with system UI.

Sources:
- https://developer.apple.com/design/human-interface-guidelines/design-principles/
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/videos/play/wwdc2024/10085/

These sources support interface design principles but do not determine
one optimal color palette or one objectively best UI variant.

## 8. Owner acceptance and repository protection

The accepted game remains in its own protected reference branches. This
studio branch changes ONLY independent public studio HTML and its own
documentation/tests. No real CC2 math, Pursuer, Spark, capture VFX, audio,
gameplay and summary files were changed. Do not merge this lab into the
actual production game merely to use it.

Owner may choose one or two exported UI concepts. Next step is a
separate candidate integration with actual replay equivalence and
first-click/capture regression. **No owner acceptance has been inferred.**
