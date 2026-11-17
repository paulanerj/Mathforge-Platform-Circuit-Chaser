# CC2-CREATURE-DESIGN-01 — Six Powers, Physical Rules and Fairness
**Status:** DESIGN / candidate values only — no gameplay code has been deployed.
**Date:** 2026-11-16, Barranquilla local. **Parent contract:** `CC2-29-33-LIVING-CREATURE-STRATEGY-CONTRACT.md`. **Accepted playable reference remains unchanged.**

## Owner direction preserved
The owner asks to complete the **story and exact power** of every creature *before* new code: at least three helpful and three harmful, each with personality, autonomous movement, platform changes, optional very short skip-count “passkey,” activation condition, correct/wrong consequences, timed state, distinctive physics-inspired animation/audio/music and meaningful Pursuer reaction. In particular: helpful thick translucent green viscous plasma (side-firing firehose-like slow field for the Pursuer), its harmful tethering opposite (Spark slowdown lasting <= two rows), creature that noticeably distorts or accelerates pressure on near-future rows (avoid incoherent auto-solving), and creature that scrambles future visible answer positions without violating math correctness. Owner explicitly calls these **ideas to test**, not a locked roster.

## Governing experience
1. **Primary platform choice** is real math; it remains correct/incorrect according to the existing source problem and physically valid movement.
2. **Passive contact** may activate a creature or residue when Spark *really lands* on its platform. Contact is always telegraphed, with a safe decision path, no surprise unavoidable loss and no arbitrary hit from graphics alone.
3. **Active interception** is a deliberate optional target action on a real visible creature, opening a brief organic bubble with an independently solved micro-puzzle. It never silently replaces the primary curriculum or exposes the main answer.
4. Beneficial challenge success grants a **bounded reward**; failure gives **no reward**, not a hidden extra punishment. Harmful challenge success **cancels/cleanses** a telegraphed hazard; failure allows **the previously announced bounded hazard**, not a harsher surprise penalty.
5. If the player ignores a beneficial creature: it roams on, potentially leaving visible passive residue but **no mandatory quiz**. If ignored a harmful creature: it leaves a *previously announced* hazard in its permitted territory; cannot teleport into a chosen platform retroactively.
6. A wrong primary answer is **never rescued into a mathematically correct row** by a creature; a correct primary answer is never regraded wrong by a harmful creature. The extra micro-puzzle is a separate assessment receipt.

## Model inspiration and honesty
Physics provides **motion vocabulary**, not scientific claims about real lava:
- Viscous material: Maxwell-type stress relaxation / lag and advected finite-volume filaments. Qualitative law `stress[n+1] = stress[n]*exp(-dt/tau) + impulse`, discretized fixed-tick and strictly clamped. Flow velocity can have viscosity-like decay and trail advection; fluid field stops expanding at a bounded collision polygon. This is a **stylized approximation** of viscoelastic behavior; not full Navier–Stokes nor a physically accurate Maxwell fluid simulator.
- Elastic tether: Kelvin–Voigt-inspired finite spring-dashpot law `F = -k*x - c*v`, interpreted visually as stretch and energy loss; bound gameplay travel modifier separately. The user can SEE how increasing displacement stretches tether and its own recovery lag. Not the same fluid as the Guardian's slow gel.
- Charge: bounded first-order energy integration `qNext=clamp(q + gain - leakage,0,capacity)`.
- Conductive network: source graph edges have bounded lifetime and propagate a visual energy packet one edge per configurable beat/tick.
- Shuffle: a seeded bijective permutation of **complete option identities**, not digits decoupled from core platform IDs.
- Instability: time-to-live / linear or exponential hazard curve with explicit prewarning; never physical sink or teleport until authoritative row-drop semantics qualify.

Sources for model concepts (research contextual, not code proof):
- Heidelberg continuum mechanics notes (Kelvin–Voigt spring/dashpot);
- University of Washington contact mechanics / viscoelasticity; Maxwell versus Kelvin–Voigt;
- e.g. recent review at PMC discussing limits of the simple rheological models.
None of these sources validates specific game effect numbers; those are PM-owned proposed tuning values.

## Six creature contracts

### P1 — VISCOUS GUARDIAN (GOOD, teal / clear pale-green)
**Narrative:** a protective semi-liquid organism stores drag in its body and sends a heavy, transparent plasma stream from the side it faces. Thick globules move as a contiguous slug; rounded head, high clarity, controlled edge, low external glow. A temporary slowing field takes real time to fill the intervening space, pools on or across a platform/route, leaves visible residual viscosity for a bounded interval and then pulls back.
**Personality & movement:** protective/territorial, slow buoyant hop with elastic hold; aims its nozzle toward *a legitimately seen approaching Pursuer* (not global omniscience). Stops on a platform and compresses before a side-directed discharge.
**Physical field:** origin=(actual creature.x,y), aim=clamped sensed Pursuer direction or a platform-normal direction in the last known observation. A pressure-driven flow advances a leading front with viscosity-like lag; its tube width increases smoothly, length caps at <= one row-gap (candidate), short pooling then exponential collapse. No fuzzy full-screen cloud. Visual cannot create nonvisual collision.
**Passive contact:** any legitimate player landing in a harmless preview zone can see Guardian's readiness; passive automatic slowing field ONLY if separately configured (default: no effect until intentional challenge to preserve strategy).
**Micro-gate:** extend `2, 4, 6, ?` -> `8`; or next in `3,6,9,?` -> `12`. Correct unlocks directional field with 1.5–2.5 s candidate lifetime or crossing-window. Wrong/no answer: fails quietly and Guardian relocates; no Spark penalty.
**Source effect:** existing Pursuer step gains a single bounded slow-field multiplier, initially candidate 0.65–0.85, only when its **physical body** intersects the **authoritative field polygon**. The Pursuer visibly tries to push through, deforms the stream, compresses/strains, loses momentum, then recovers after exit. It can reason about bypass on subsequent observations.
**Residue:** finite pale green film exactly over intersected platform surfaces, not invisible until learned; default visual brightness >= contrast test. No main-platform answer change.
**Audio/music:** soft low fluid intake, slightly sticky bubble-break/gurgle (dry enough to be distinct), a descending-time-stretched rhythmic figure while occupied; a high release accent on disengagement. Dedicated musical voice must duck not overpower accepted score.
**Tuning knobs:** hopPeriodTicks, aimArcDeg, streamTravelTicks, streamMaxLengthRowGaps, streamWidthPx, gelRelaxationTicks, fieldLifetimeTicks, pursuerSlowMultiplier, residueTicks, hue/alpha/edgeTightness, audioGain, musicVoicePriority.

### P2 — CAPACITOR SPRITE (GOOD, gold)
**Narrative:** a nimble charge collector; springs between upper safe platforms, stores angular oscillations and flashes in discreet energy segments.
**Movement:** impatient leap + bounded recharge; prefers empty targetable platforms within 1–2 rows but cannot choose correct math option based on source answer.
**Gate:** one missing term `4,8,?,16` -> `12`. Success: grant **one** source-earned charge if capacity exists OR **one finite Spark boost** (never both unless explicitly selected by future balancing). Player should know which before answering.
**Wrong:** no bonus; sprite discharges harmlessly and leaves a dim remnant. **Passive:** ordinary platform may hold decorative charge, but no additional charge receipt without source-defined reward.
**Aftereffect:** a short-lived amber luminous charge footprint; source ledger states whether it is passive decorative or actually collectible.
**Sound/music:** crisp high oscillating syncopation and gated arpeggio (avoid repeated ascending beep pile).
**Tuning:** chargeGain, capacityGuard, boostMultiplier candidate 1.10–1.18, boostMaxRows 1, jumpDistanceRows, hopSpeed, availabilityTicks, residueTicks, rechargeTicks, phraseBars, brightness.

### P3 — RELAY WEAVER (GOOD, cyan)
**Narrative:** cooperative bridge engineer weaving a finite electric link between nearby physically connected platforms.
**Movement:** methodical clockwise/anti-clockwise search with pause-before-hop, call-response filament trail, graph-target limited to legal adjacency.
**Gate:** `5,10,15,?` -> `20`; alternative identify missing interval from two given terms. Success: reinforce 1–2 upcoming row platforms **or** cancel one visible hazard, chosen from a clear single power preset; no multiple invisible benefits.
**Wrong:** filament snaps with no penalty; no free points. **Passive:** aesthetic contact if not gated; never silently lengthen a platform.
**World effect:** add source `REINFORCED` state and TTL to selected platform IDs. Fading Circuit mode can extend expiry, preserving fair alternative routes.
**Music:** measured two-part question–answer motif; each link produces one real rhythmic note on source `EDGE_CONNECTED`.
**Knobs:** linkCount<=3, edgeLifetimeTicks, protectionRows<=2, choosePolicy, meshOpacity, chainSpeedTicks, soundTimbre, pulseGapTicks.

### N1 — TETHER SLUG (HARMFUL, olive-jade / graphite elastic filament)
**Narrative:** sticky leech that feels heavy, has drag, and anchors an elastic tether between Spark and a temporarily contaminated platform.
**Movement:** slow compress/wait/lunge; lays a visibly substantial tacky filament aligned with actual origin direction; distinct from Guardian's *flowing* stream.
**Gate:** `3,6,?,12` -> `9`. Correct: sever tether before attaching, neutralizing this specific hazard and its finite residue. Wrong, ignored after clearly announced contact, or timed out: attach.
**Effect:** Spark **travel speed** multiplier candidate 0.72–0.85, and at most **two actual row transitions or a finite max tick cap, whichever first**. It MUST NOT delay UI pointer recognition, math evaluation or the 60-Hz simulation; slow the **physical travel clock** only, with clear visible strain. Never stack multiple tethers to immobilize Spark.
**Bot behavior:** notices Spark slowing only through real movement observations (no direct hidden creature-puzzle result), may close the gap at original speed; may adjust pursue acceleration within configured bounds, **not magically speed up because a player answered wrong**. After tether release, body returns to normal readable chase. Danger also depends on separation and available escape.
**Residue:** thin nonopaque sticky footprint, fading per platform; no invisible timebomb on first implementation. Orange/dotted danger sign beyond color.
**Audio/music:** low descending rubbing scrape, interrupted offbeat kick, short tension in the score; release has snapped-pluck resolution.
**Knobs:** attachWarningTicks, pullStiffness, damping, anchorLifetimeTicks, slowMultiplier, maxAffectedRows=2, maxTicks, immunityTicks, postReleaseGraceTicks, visibleStrain, audioGain.

### N2 — PRISM SHUFFLER (HARMFUL, violet-grey crystalline)
**Narrative:** trickster permutes the locations of the *next* mathematical answer options. Its power is spatial, NOT arithmetical.
**Movement:** abrupt but signaled lateral sidestep, short facet twist, throws a prismatic band onto the **future row**, leaves a briefly refracted platform surface.
**Gate:** `2,4,6,?` -> `8`. Correct: prevent a **pending** option move. Wrong/ignore: cue then relocate entire option records by a deterministic bijection.
**Critical math contract:** once a learner has tapped a platform, its complete `platformId,value,correctness,worldPosition,hitbox` association is FROZEN for that attempt. A shuffle may happen only when the source core reports a future row not yet actionable or while the current row is READY with an explicit warn, at least 500ms / configured ticks before activation, no accepted click, no in-flight travel. Source problem options and platform records must be permuted *together* in one transaction and the replay must record the resulting permutation. An animated SVG swap alone is **forbidden** because it would lie about the actual answer; changing which numeric value belongs to the option at an occupied location must be atomic and accessible.
**Alternative simpler v1:** visually shuffle **the order of next-row answer cards before they become tappable** using the seeded row constructor; no mid-row rearrangement. Prefer this for first acceptance.
**Wrong:** shuffled once, **never shuffles again repeatedly**; primary arithmetic unaffected and still one correct choice.
**Audio/music:** glassy short reverse notes and chirp glissandos; clear end-of-shuffle confirmation so player knows the layout is now final.
**Knobs:** futureRowLead, telegraphTicks>=30, permutationSeed, shuffleDurationTicks, maxPerRun, slowSensoryFallback, labelStability, audioMix.

### N3 — FRACTURE WISP (HARMFUL, rust/copper cracks)
**Narrative:** jittering pressure creature that briefly fractures future platforms and reduces safe decision time. It must NEVER auto-select the correct answer or silently “do the math” for the player—that contradictory proposal removes agency. Make it **tighten the decision window**, not solve math.
**Movement:** ascending dart into unoccupied future platform, crack branching under the surface then retracting. Warns audibly and visually before unstable state begins.
**Gate:** `4,8,12,?` -> `16`. Correct: cancel fracture and restore stability; wrong/time out/ignored after visible countdown: finite instability occurs.
**First eligible effect:** visibly shorten the safe `READY` platform window for **one future row** with explicit countdown and at least a tested minimum reading+travel budget, but keep the mathematically correct option reachable. If that timer expires, enter deterministic recovery / reroute; do not fabricate wrong answer or arbitrary forced Pursuer catch.
**Deferred advanced effect:** actual one-row Spark drop only after a NEW source-authoritative `DROP_ONE_ROW` action with replay-exact physical trajectory, preserved score/solved ledger, legal landing destination, capture precedence, and postdrop grace. Must not misuse `PLATFORM_SHORTED` without a real wrong selection.
**Wrong:** cannot cause immediate death. Incorrect optional skip passkey -> announced fracture only.
**Audio/music:** unstable rapidly subdividing rhythmic click, restrained low falling motif for collapse, clear release/resolve motif on dispel.
**Knobs:** telegraphTicks, unstableTTL, safeDecisionMinTicks, crackPropagation, dropEnabled=false by default, dropGraceTicks, maxFracturesPerRun, immunity, soundDynamic, visualStabilityMeter.

## Standard puzzle-gate contract
- 1 operation, 1 missing value or immediate next value, **2–3 distinct choices**, one and only one correct answer. Source-based seeded generation, readable for ages ~9–10. No nested operators or equations that demand a second worksheet. Creature's caption and bubble are attached to its physically projected body (but UI is guaranteed touchable).
- Suggested progress: step sizes 2,3,4,5 in early tier; later signed direction or alternating skip step only after independently tested unique answer and instructional unlock. Answer ID does not leak into text patterns, color, creature movement, option position, or countdown.
- Timing is adjusted by difficulty and play state. Candidate 2.5–4.5s initial answer window; validate real iPhone/tablet latency and reading speed before finalizing. **No countdown while a gameplay menu is open.**
- Result contract: success = source event `MICRO_PASSKEY_SOLVED` and applied power receipt; incorrect = source event `MICRO_PASSKEY_FAILED` and pre-announced consequence **only for hostile creature**; skipped = source event `MICRO_PASSKEY_DECLINED` and original passive/active behavior, not a hidden punishment.
- Player can continue primary climb without touching popup (no blocking modal); current primary target stays visible. A correct primary landing and a creature challenge submission in the same tick resolve under a documented deterministic priority; capture has physical priority.
- Failure at a helpful creature cannot take away progress or existing energy. Success against a harmful one should materially prevent the actual spell, not merely change cosmetic visuals.

## Encounter comparison/choice design
- A player **ahead of the Pursuer** (physically observed safe distance) can rationally spend an additional 1–4s solving a helpful puzzle to earn a boost. If the Pursuer is close, best choice may be to ignore it.
- Hostile gate is not always rational: when it would cost more time to solve than the hazard would cost, player may skip it. Tune effect duration/likelihood so *sometimes* defense is worth it.
- End outcome should be measured by real survival/rows/accuracy and source-earned power usage, not raw creature capture count.
- Not every row has a creature; opening four rows establish core task before layering. Limit first release to one prominent creature near the learner and max two globally; never six simultaneous puzzles.
- Maintain **three separate ledgers**: (A) primary math and source routes, (B) optional creature math, (C) world power effects; a presentation may summarize but never forge a ledger event.

## Never ship without
- Exhaustive seeded gate uniqueness; 1000+ mixed encounters; pause/restart/capture/tie precedence; same source digest across export/replay; no double-active timer on old run.
- Proven ratio of helpful/harmful and ability to ignore; no unavoidable trap; 1 viable correct mathematical option regardless of residues.
- Tether never freezes input or blocks the only safe route; shuffle is atomic over complete option identity or future-row construction; fracture cannot run a secret automatic answer.
- The first actual prototype is `Viscous Guardian` vs `Tether Slug`: same physical phenomenon in opposite target direction, distinguishable at a glance, distinct sonic and musical voices, observable Pursuer/Spark motion proof.
- Owner approval is required separately for final creature visual language, color palette, power economy and hard difficulty. This document is **not** authorization to replace the CC2-28 accepted preview.
