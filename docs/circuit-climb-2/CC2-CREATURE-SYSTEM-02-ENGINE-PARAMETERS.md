# CC2-CREATURE-SYSTEM-02 — Encounter State, Effect Composition, Pursuer & Parameter Registry
**Design only | applies after CC2-CREATURE-DESIGN-01 | no gameplay implementation.**

## 1. Formal authority and receipts
Existing core controls primary problem answer, physical route, actual landing, wrong-answer return, source score and capture arbitration. New subsystem is proposed and separate:
- `CreatureEcologyDirector`: seeded spawn, 3D-free 2D world-position creature movement, occupancy, bounded finite residue. Never reads `correctPlatformId`.
- `CreatureGateDirector`: per-encounter seeded **independent** micro-math with a uniquely correct option and separate user submission/cancel/expire; never edits the primary problem.
- `WorldEffectDirector`: receives accepted gate/contact receipts and makes source-owned finite effect scopes. No visual-only effect can write here.
- `PursuerResponsePolicy`: projects **observed body/field/platform signals** to existing Pursuer API within validated bounds. No access to micro-answer correctness unless in-world visible behavior exposes it.
- `CreatureMusicDirector`: translates source creature event IDs into short beat-synchronized voices within existing score and muted/quiet controls; zero source gameplay authority.

Required source event envelope:
`schema:'cc2-creature-event/v1', runId, tick, ordinal, eventId, creatureId, species, phase, platformId?, reason?, location?, targetKind?, challengeId?, effectId?, scope?, expiresTick?, parentEventIds[]`.
Event IDs are monotonic per run. Applying the same ID twice is an identity no-op. All transient effects must be reconstructable from replay commands and event log.

Proposed user commands: `TARGET_CREATURE(creatureId)`, `ANSWER_CREATURE_CHALLENGE(challengeId, optionId)`, `DECLINE_CREATURE(challengeId)`. Commands record their tick and ordinal alongside the normal `SELECT` / `PULSE`. Browser cannot generate an effect by dispatching a decorative action. Programmatic replay must reach the same final digest and exact receipt stream.

## 2. Creature encounter state diagram
`DORMANT -> TELEGRAPH_SPAWN -> HOP_PREP -> HOPPING -> OCCUPY -> TELEGRAPH_POWER -> (TARGETABLE -> OFFER_PASSKEY -> SUCCESS|FAIL|EXPIRED|DECLINED) OR PASSIVE_CONTACT -> POWER_APPLY|POWER_CANCEL -> RESIDUE -> COOLDOWN -> RELOCATE|RETIRE`.

Each state includes an entry tick, max dwell, permitted interaction set and visual/audio cue. No transient status persists when `runId` changes or phase becomes ended. Creature may already occupy a future platform but must not move to current selected destination after a click in a way that changes its just-accepted contact. A creature target command can be accepted only if it is actually visible/targetable in physical world range, on the current row or one reachable prospective row. The user sees an explicit target affordance (minimum 44 px touch target without obstructing math platform; dedicated small secondary control when narrow).

## 3. Arbitration on the same tick (single source of truth)
1. **Run-end / confirmed physical contact capture** from existing Pursuer adjudicator has precedence. No late successful micro-puzzle reverses a capture.
2. Existing core accepts/rejects primary platform selection and completes real physical route state.
3. At a confirmed landing, freeze the actual landing receipt and source world snapshot; evaluate creature occupancy/residue **at that exact tick** with an explicit creature contact tolerance.
4. Consume pending creature gate selection only if its challenge is still open and current run/encounter matches; register source math receipt before effect calculation.
5. Apply *at most one* world effect per creature encounter; if success cancels an ongoing hostile power, emit `POWER_CANCELLED` + `EFFECT_REMOVED` once.
6. Advance source timers and movement; project bounded Pursuer response from already-observed sources. Render after authoritative updates; music schedules from the resulting event IDs.
7. If a run ended mid-sequence, cancel all later non-terminal effects with `RUN_TERMINATED`; no postmortem awards.

A timing-edge test must explicitly define precedence if a passkey is solved at the exact expiration tick: **expires first if `tick >= deadlineTick`** (chosen policy) and user input is rejected, with a distinctly readable window; then source replay is unambiguous. Platform-choice acceptance is never delayed by creature animations. A paused run freezes source tick; online/host inactivity transitions must follow accepted game pause policy.

## 4. Effect composition, priority and lifetime

### Shared categories
- Spark movement modifier `sparkTravelMultiplier` (candidate hard [0.70,1.20]); **affects physical route progression only**, not pointer response, source ticks, math correctness or hop target.
- Pursuer speed multiplier `botTravelMultiplier` (candidate hard [0.60,1.12], but later tuning may narrow); effect only when actual Pursuer body intersects the field polygon. It may find a different route if it legitimately sees the obstacle.
- Platform stability: `stability` [0,1], finite `expiresTick`, `shieldRowsRemaining` with **at least one reachable correct answer until a new source-defined recovery outcome**.
- Position/route change: discrete source action `RELOCATE_OPTIONS_BEFORE_ACTIVATION` or `DROP_ONE_ROW`, never a numerical speed multiplier and never art-only.
- Charge/score: all increments come from **one economy authority**. Score cannot be independently issued from both core and creature director. New creature bonuses must be explicit `BONUS_AWARDED` line items in verified debrief, with anti-farming / one-per-encounter bounds.

### Priority
- Primary input and accepted math validity outrank every world effect. A power can make travel harder, but not render a selected answer false.
- Effect identity `(runId, creatureId, effectType, sourceEventId)` is unique, applying duplicates is forbidden.
- Same-class repeats **refresh** a timer up to a maximum, do not multiply power. Two Spark slow effects use the more restrictive single bound, not `0.8*0.8`.
- Helpful Spark boost and harmful slowdown: choose one explicit public rule (proposed **weighted cancel**: stronger percentage wins; e.g. +15% and -15% cancel to baseline). Source must record composite result; no surprise negative speed.
- Pursuer slowing Guardian field + CC2-28 Pulse: avoid multiplicative stacking of slows; choose min of eligible multipliers subject to validated lower cap; existing Scout/Sentry pressure and Surge continue to compose via max (not multiply).
- Actual area entry/exit use source geometry; if a Pursuer clips only the tail of Guardian gel, slow begins from that exact tick, visually shows deforming field; it does not freeze midair or change body position discontinuously.
- A continuous effect has **both max tick and max row extent** where applicable. Harmful Tether = expire at **min(start+maxTicks, after second completed row transition)**. Timer end must visibly detach.
- Platform scars have source-confirmed start and expiry; rendering may interpolate but cannot linger in a way that communicates an expired gameplay penalty.

## 5. Configuration registry and presets
All parameters **have version, unit, legal min/max, recommended candidate default, reset to defaults, import/export, and a seed**. Do not attach arbitrary user-editable JS. A preset includes `schema:'cc2-creature-config/v1'`, seed, species overrides, encounter caps, balancing policy and optional `enabled` flag. Validation rejects missing/unknown fields and NaN/infinity. All game authority is resolved **before run start**; live visual-only material tweaks can be changed without altering existing replay.

### Source effect parameters (candidate—not owner locked)
| Config key | Unit | Candidate | Range | Meaning |
|---|---|---:|---:|---|
| ecology.maxActive | creatures | 2 | 0–3 | Total simultaneously alive |
| ecology.firstEligibleRow | row | 5 | 3–10 | First spawn after introductory plain rows |
| ecology.minSpawnGapRows | rows | 2 | 1–6 | Prevent excessive creature encounters |
| ecology.maxHostileConsecutive | count | 1 | 0–2 | Avoid punishing streaks |
| ecology.maxHostilesPerTenRows | count | 3 | 0–5 | Pressure budget |
| ecology.hopPrepTicks | ticks | 18 | 6–90 | Audible wind-up before jump |
| ecology.hopDurationTicks | ticks | 24 | 8–80 | Physical hop animation |
| ecology.occupyTicks | ticks | 150 | 60–360 | Chance to intercept |
| ecology.residueTicks | ticks | 210 | 30–600 | Aftereffect visibility |
| micro.maxVisibleChoiceCount | choices | 3 | 2–3 | Tap economy, no clutter |
| micro.initialWindowTicks | ticks | 210 | 120–360 | Candidate 3.5s at 60Hz |
| micro.stepValues | integer set | 2,3,4,5 | explicit whitelisted values | Validate grades/curriculum |
| micro.maxQuestionsPerEncounter | questions | 1 | 1–1 | One quick passkey, not a quiz chain |
| guardian.fieldLengthRowGaps | row gaps | 0.85 | 0.3–1.0 | Bound stream coverage |
| guardian.flowFrontTicks | ticks | 30 | 10–90 | Directed blob spread |
| guardian.fieldTicks | ticks | 140 | 60–220 | Protective field duration |
| guardian.botSlowMultiplier | fraction | 0.75 | 0.60–1.00 | Impact only at collision |
| guardian.viscosityRelaxTicks | ticks | 48 | 12–100 | Fluid memory/lag |
| capacitor.chargeReward | units | 1 | 0–2 | Only if not full |
| capacitor.sparkBoostMultiplier | fraction | 1.15 | 1.00–1.20 | Alternate boost ability |
| capacitor.boostRows | rows | 1 | 1–2 | Max affected rows |
| relay.protectRows | rows | 1 | 1–2 | One future route protection |
| relay.maxEdges | count | 2 | 1–3 | Conductive links |
| tether.attachWarningTicks | ticks | 45 | 24–100 | Pre-attachment notice |
| tether.sparkSlowMultiplier | fraction | 0.80 | 0.70–1.00 | Only physical movement |
| tether.maxAffectedRows | rows | 2 | 1–2 | Explicit owner's max |
| tether.maxTicks | ticks | 240 | 60–420 | Hard maximum even without row advance |
| shuffler.telegraphTicks | ticks | 45 | 30–150 | Advance warning |
| shuffler.maxShufflePerEncounter | times | 1 | 1–1 | No slot-machine loop |
| fracture.warningTicks | ticks | 60 | 40–150 | Mark impending instability |
| fracture.minDecisionWindowTicks | ticks | 180 | 120–300 | Absolute fair floor |
| fracture.dropEnabled | boolean | false | false/true (dev only) | Disallow until actual engine qualification |
| fairness.postContactGraceTicks | ticks | 45 | 30–120 | Prevent insta-loss |
| fairness.maxCreatureScorePerRun | points | TBD | set by source score policy | Not yet defined; no invented award |
| movement.playerInputBudgetMs | milliseconds | TBD | device-tested | Empirical budget before acceptance |

Any unfamiliar parameter not validated must be rejected. UI must show dimensions/units and a reset. A developer's VFX preset and a gameplay authority preset are separate files and cannot be mixed.

### Pursuer observation and behavior registry
Retain source Pursuer controller authority. Introduce a separate `PursuerCreatureAwarenessPreset` with ten groups, each explicitly observable, using the prior ~10x5 structure. Candidate group keys: `sense,locomotion,belief,creatureAttention,platformRisk,abilityResponse,proximityFairness,escapeGrace,personality,diagnostics`. Prioritize only 2–3 meaningful observed actions at first (physically intersect gel -> slow; visually observes slow Spark -> closes gap normally; platform stability hazard -> route detour) before expanding to 50 controls. No hidden answer, no reading puzzle success directly, no clock hacks or omniscient body snaps.

## 6. Visual material and creature personality registry
For every species define, separately and with a default preset:
- **Character asset shape** and distinguishing silhouette; pupils/face optional, no over-cutesy forced personality.
- **Mass, inertia, acceleration/deceleration, squash/stretch limits, hop path curvature**.
- **Facing/aim direction**, reactive speed/pose and behavior on encounter success/failure.
- **Material family** (glass/plasma/viscous translucent/slate mineral/faceted), hue/saturation/brightness/alpha, edge crispness, turbulence rate/scale, internal illumination, trail length and lifetime.
- **Platform occupation** transform and expiry state (GLOWING/CHARGED/GROUNDED/STICKY/SHUFFLE_PENDING/CRACKED).
- **Audio event** slots (spawn, windup, hop, occupy, offer, passkey success, fail, apply, expire) + note/timbre/rhythm/ducking budget and read-only receipts.

Production policy: **character must remain identifiable at 50–75 CSS pixel size on phone**, and Spark/player and math labels must maintain contrast. Avoid a giant opaque field that covers upcoming options. Green translucent Guardian must be bounded and readable over light Slate surface; N1 Tether must not resemble same power because both are green.

## 7. Test suites / objective evidence
Required deterministic source tests:
- Generators: >= 10,000 unique seeded micro-puzzles checked for exactly one answer and no unintentional alternate solutions; covers every allowed step pattern.
- 1,000 seed mixed ecology sessions: stable max active, fair hostile budget, no unresolved correct answer, exact replay.
- 1,000 Tether cases: max two completed rows or tick cap, whichever first; no UI tap latency effect; finite recovery.
- 1,000 Guardian field cases: entering/exiting actual body geometry vs residue and sensor constraints, no instant Pursuer disappear/teleport.
- 1,000 Shuffler trials: one-to-one platform/value/correct identity mapping before and after; no in-flight remap; no wrong-as-right.
- 1,000 Fracture cases: near-expiry always preserves a mathematical legal route or explicit recoverable outcome; no silent capture.
- All same-tick conflicts: capture vs gate solve; platform select vs gate timeout; pause vs timer expiry; restart vs delayed effect; physical contact vs jump windup.
- Matched-seed counterfactuals comparing no-creature baseline vs each power to quantify actual benefit/harm on survival/rows, Pursuer separation and math performance.
- Five-device-size physical browser input 320/360/390/428/768, real taps, touch controls >44 CSS px, reduced-motion and sound off, no full-board canvas, no blackouts, frame time profiling.

**No creature is acceptable solely because its animation looks impressive.** It must produce a distinct, *replay-provable*, beneficial or harmful impact that is observable to the learner and consistent with its sound and visual representation.

## 8. Open PM decisions — before code
1. Is Guardian's field a Pursuer-only **line** hazard or a patch on a platform? Proposed: originate side-directed stream, spread into a short bounded corridor, detect real Pursuer body overlap; visually stain exactly traversed surface.
2. For Capacitor, should reward choose charge or speed? Proposed: one clearly displayed power per preset and prevent stacking until user physically tests which is strategically meaningful.
3. When a Shuffler appears, is reshuffling already visible cards too disruptive? Proposed first implementation: **next row only**, before options become selectable, with one announced reorder.
4. For Fracture, should expiry trigger one-row drop or force immediate decision? Proposed first: visibly unstable next row; postpone any forced drop to a separate engine-qualification phase.
5. Should Guardian/Tether fields affect other creatures? Proposed first: **no**, only Spark/Pursuer as explicitly named. Cross-creature interactions follow after clarity/fairness tests.
6. Should helpful creature failure cost time? The chase time itself already incurs opportunity cost; proposed **no extra penalty**.
7. Should hostile passkey failure create a stronger hazard? Proposed **no**; only the already telegraphed hazard.
8. Should puzzle challenge halt the Pursuer? Proposed **no in normal chase**; separately author accessibility assist as a named mode, never hidden.
9. Should creature music start on a visual preview? Proposed audio preview permitted under explicit studio action but cannot record a gameplay receipt.
10. Should source score reward a mini-passkey? Proposed separate future `CREATURE_BONUS_AWARDED` ledger and anti-farm policy; no scores in first physics proof.
