# Circuit Climb — Graph V2 parameter authority (04C)

**GENERATED.** Run `npx tsx src/games/circuit-climb/tools/circuitClimbPursuerAuthorityDoc.mts`.
Do not edit by hand — the code is the authority and this is a rendering of it.

Schema: `circuit-climb-pursuer-config/v1`
Baseline: `04B-R1 BASELINE` · behaviour hash `b0736220ef40d56f05141437f925efdfa99512581596c6c408596e0c1c03d6f4`
Authority commit: `99fc81456c7c3c7b1f39aadf86101aaa8f444cf6`

## What the audit was for

Before 04C, every number that shaped GRAPH_PURSUER_V2 lived wherever it was first written, and
there was no single answer to "what is the pursuer set to?". The audit walked the code to build
one. It found three quantities whose declared default is **not** what production runs, and two
quantities a configuration brief naturally asks for that **do not exist**.

## Authority conflicts

| symbol | declares | production runs | resolved by |
| --- | --- | --- | --- |
| `DEFAULT_GRAPH_PURSUER_CONFIG.captureRail` | `false` | `true` | GraphPursuerController.buildPursuer, `this.options.captureRail ?? true` |
| `DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels` | `0` | `2` | GraphPursuerController.buildPursuer, `this.options.groundLevels ?? GROUND_LEVELS` |
| `DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius` | `null (size like the learner)` | `graphActorRadiusFor(world)` | GraphPursuerController.buildPursuer, derived per world |

Anyone reading `DEFAULT_GRAPH_PURSUER_CONFIG` to describe the shipped pursuer would have been
wrong on all three. That is the argument for the configuration contract, stated as evidence.

## Parameters a brief asks for that do not exist

| requested | the real quantity | why |
| --- | --- | --- |
| `perception.lastSightingGraceMs` | commitment.lossConfirmationTicks (3 ticks) | There is no millisecond grace anywhere in the Brain. The grace is counted in frames, which is why its effective length changed on the tester's 144Hz display. |
| `perception.trailSenseRadius` | deriveTrailSenseRadius(graph), computed live | It is a function of the framing-dependent trunk spacing and the derived actor radius. A stored value would disagree with the board. |
| `locomotion.chaseSpeed / searchSpeed (separate speeds)` | locomotion.speed, one speed for all modes | Graph V2 has a single cadence. Separate per-mode speeds are the LEGACY pursuer's model and do not exist in this chassis. |

## Every behaviour-affecting parameter

`SETTABLE` a human may change it here · `FROZEN` in the payload, not editable in this build ·
`DERIVED` computed from the live board · `RESERVED` a layer exists, nothing authorized into it.

| path | declared | production | authority | unit | where | note |
| --- | --- | --- | --- | --- | --- | --- |
| `locomotion.speed` | `0.19` | `0.19` | SETTABLE | units/ms while moving | `DEFAULT_GRAPH_CADENCE.speed` | The learner walks its route at 0.62 u/ms, so the pursuer is slower outright and closes only because the learner stops to think. |
| `locomotion.minBurstMs` | `180` | `180` | SETTABLE | ms | `DEFAULT_GRAPH_CADENCE.minBurstMs` | Lower bound of the burst draw. |
| `locomotion.maxBurstMs` | `620` | `620` | SETTABLE | ms | `DEFAULT_GRAPH_CADENCE.maxBurstMs` | Upper bound of the burst draw. |
| `locomotion.minPauseMs` | `90` | `90` | SETTABLE | ms | `DEFAULT_GRAPH_CADENCE.minPauseMs` | A pause spends no distance and touches nothing else. |
| `locomotion.maxPauseMs` | `380` | `380` | SETTABLE | ms | `DEFAULT_GRAPH_CADENCE.maxPauseMs` | Upper bound of the pause draw. |
| `locomotion.pauseChance` | `0.62` | `0.62` | SETTABLE | probability 0..1 | `DEFAULT_GRAPH_CADENCE.pauseChance` | Whether a finished burst is followed by a pause at all. Drives how staggered the motion reads. |
| `locomotion.cadenceSeed` | `42` | `42` | SETTABLE | integer seed | `DEFAULT_GRAPH_CADENCE.seed` | Behaviour-affecting: it selects a stream, and a different stream is a different run. |
| `locomotion.laneSeed` | `20958` | `20958` | SETTABLE | integer seed | `DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed` | Seeds the lane-offset draw, so two passes along one edge are visibly different lines. |
| `perception.directSenseRadius` | `260` | `260` | SETTABLE | logical units | `SPARK_SENSE_RADIUS` | Hard-coded before 04C — there was no configuration path to it at all. |
| `perception.trailRowRetention` | `6` | `6` | SETTABLE | learner row transitions | `DEFAULT_ROW_RETENTION` | A count of row transitions, not of milliseconds or points. The controller took the constructor default; there was no path to it. |
| — | — | `half smallest trunk spacing + actorRadius` | DERIVED | logical units | `deriveTrailSenseRadius(graph)` | Recomputed from the live graph every call. NOT a configuration field: a stored value could disagree with the board it runs on. |
| — | — | `max(dtMs * 3, 50)` | DERIVED | ms | `maxContinuityGapMs` | Per-frame, from the frame time. Governs only whether a sighting velocity is continuous. |
| `strategy` | — | — | RESERVED | — | `—` | Empty in v1. One or two parameters may be promoted here once a PM task demonstrates which persistence parameters matter. None has been supplied to this build. |
| `commitment.lossConfirmationTicks` | `3` | `3` | FROZEN | ticks (frames) | `LOSS_CONFIRMATION_TICKS` | THIS, not a millisecond grace, is the real last-sighting grace. Derived from measured one-tick boundary chatter. Counted in frames, so its wall-clock length depends on the display. |
| `commitment.acquireConfirmationTicks` | `6` | `6` | FROZEN | ticks (frames) | `ACQUIRE_CONFIRMATION_TICKS` | Derived from a measured 3-tick self-sustained flutter with a 2x margin. A first acquisition is still immediate. |
| `commitment.trailExhaustionConfirmationTicks` | `6` | `6` | FROZEN | ticks (frames) | `TRAIL_EXHAUSTION_CONFIRMATION_TICKS` | Derived from a measured worst run of 2 non-actionable ticks with a 3x margin. |
| `commitment.leadPreemptionConfirmationTicks` | `6` | `6` | FROZEN | ticks (frames) | `LEAD_PREEMPTION_CONFIRMATION_TICKS` | Applies only to an already-consumed lead that has resurfaced. Applying it to all leads made TRAIL_TRACK unreachable — measured, and reverted. |
| `commitment.maxRememberedFragments` | `24` | `24` | FROZEN | fragments | `MAX_REMEMBERED_FRAGMENTS` | Bounded Brain memory. Module-private before 04C. |
| `chassis.laneBandFraction` | `0.55` | `0.55` | FROZEN | fraction of the clear band | `LANE_BAND_FRACTION` | Outside (0,1) a lane offset leaves the band the graph proved clear. Not a difficulty parameter. |
| `chassis.targetEpsilon` | `1` | `1` | FROZEN | logical units | `TARGET_EPSILON` | How far a target must move to count as a different target. |
| `chassis.arrivalEpsilon` | `4` | `4` | FROZEN | logical units | `ARRIVAL_EPSILON` | Fallback arrival test alongside the chassis arrival signal. Module-private before 04C. |
| `spawnCapture.spawnRule` | `AUTHORITY_FURTHEST_TRUNK` | `AUTHORITY_FURTHEST_TRUNK` | FROZEN | rule | `options.spawn ?? 'authority'` | 04B-R1 repaired this. The rejected 04A placement put the pursuer one row gap directly beneath the learner and is retained only for A/B. |
| `spawnCapture.groundLevels` | `2` | `2` | FROZEN | connector levels below row 0 | `GROUND_LEVELS` | AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels declares 0. The controller overrides it to 2 on every construction. |
| `spawnCapture.captureRail` | `true` | `true` | FROZEN | boolean | `options.captureRail ?? true` | AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.captureRail declares false. The controller overrides it to true. Governs approach only; production adjudicates capture itself. |
| — | — | `derived from world clearance` | DERIVED | logical units | `graphActorRadiusFor(world)` | AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius declares null ("size like the learner"). The controller overrides it with a live derivation on every construction. It DECREASES as framing widens. |

## Validation bounds

One table, read by both the validator and the tuning sliders, so a slider cannot offer a value
the validator then refuses. Every bound is about the game, not about taste.

| path | min | max | step | reason |
| --- | --- | --- | --- | --- |
| `locomotion.speed` | 0.01 | 1 | 0.005 | The learner walks its route at 0.62 u/ms. 1.0 already outruns it by 60%; below 0.01 the pursuer cannot cross a row inside a session. |
| `locomotion.minBurstMs` | 20 | 4000 | 10 | Below one frame a burst cannot be observed; above 4s a burst outlasts a whole row traversal and the cadence stops reading as bursty. |
| `locomotion.maxBurstMs` | 20 | 4000 | 10 | Same range as the lower bound it must not fall below. |
| `locomotion.minPauseMs` | 0 | 4000 | 10 | Zero is legitimate — it means a drawn pause can be instantaneous. Above 4s the pursuer reads as broken rather than hesitant. |
| `locomotion.maxPauseMs` | 0 | 4000 | 10 | Same range as the lower bound it must not fall below. |
| `locomotion.pauseChance` | 0 | 1 | 0.01 | A probability. 0 means a burst is never followed by a pause; 1 means always. |
| `locomotion.cadenceSeed` | 0 | 2147483647 | 1 | A 31-bit integer seed. The generator takes `seed | 0`, so anything wider is silently truncated. |
| `locomotion.laneSeed` | 0 | 2147483647 | 1 | A 31-bit integer seed, as above. |
| `perception.directSenseRadius` | 20 | 560 | 5 | The board is 600 logical units wide. A radius at or beyond that senses the whole board and makes the trail and search layers dead code — an architecture change, not a difficulty setting. |
| `perception.trailRowRetention` | 1 | 32 | 1 | At least one, or there is no trail to track. Above 32 the retained trail spans more rows than a session produces. |
| `commitment.lossConfirmationTicks` | 1 | 600 | 1 | At least one frame. 600 frames is ten seconds at 60Hz, well past any confirmation that could still be called one. |
| `commitment.acquireConfirmationTicks` | 1 | 600 | 1 | As above. |
| `commitment.trailExhaustionConfirmationTicks` | 1 | 600 | 1 | As above. |
| `commitment.leadPreemptionConfirmationTicks` | 1 | 600 | 1 | As above. |
| `commitment.maxRememberedFragments` | 1 | 512 | 1 | Bounded memory. At least one fragment, and bounded well below anything that would let memory grow without limit. |
| `chassis.laneBandFraction` | 0.01 | 0.99 | 0.01 | Strictly inside (0,1). At or beyond either end a lane offset leaves the band the graph proved clear, and the actor can clip a card. |
| `chassis.targetEpsilon` | 0.01 | 64 | 0.01 | Positive, or every frame counts as a new target and the retarget gate never closes. |
| `chassis.arrivalEpsilon` | 0.01 | 64 | 0.01 | Positive, or arrival is untestable in floating point. |
| `spawnCapture.groundLevels` | 0 | 8 | 1 | Connector levels below row 0. Zero means the pursuer cannot start beneath the learner; beyond 8 the spawn is further below the board than the search will ever look. |

## Safe transition boundaries

Documented, and all but one deliberately inactive.

| boundary | safe | active | why |
| --- | --- | --- | --- |
| Run start (a fresh run, after restart) | yes | **YES** | The controller is rebuilt from scratch: position, Brain memory, the consumed-trail watermark, the search episode, commitment, sensor counters, cadence and trail. Nothing survives, so nothing can be left describing the previous configuration. THIS IS THE ONLY ACTIVE BOUNDARY. |
| Between problems, while the learner is stationary and unsensed | no | no | Looks safe and is not. Cadence state, an in-flight commitment and a search episode all carry forward, and a changed sense radius mid-episode can retire evidence the Brain has already committed to — which is the exact class of defect 03A-R2 was built to eliminate. |
| On capture, before the next run begins | yes | no | Equivalent to run start, because the run has ended. Would be the natural place for a future host policy to act. Not active: nothing selects configurations automatically in this build. |
| Per frame | no | no | Explicitly ruled out by the addendum, and independently by evidence integrity: a run whose parameters moved during it cannot be attributed to any configuration, so every diagnostic it produces is unattributable. This is why no function in this module can be called from a frame loop. |

## Declared experiments

Declared, and deliberately not instantiated — the values are not this build's to choose.

### A · PURPOSEFUL MOTION

- **Parent:** `builtin/04b-r1-baseline`
- **Hypothesis:** The pursuer reads as aimless not because it is slow but because its motion is chopped. Longer bursts, shorter pauses and a lower chance of pausing at all should make the same speed read as deliberate.
- **Intended player-visible effect:** It looks like it is going somewhere. A player glancing at it should be able to tell where.
- **May change:** `locomotion.minBurstMs`, `locomotion.maxBurstMs`, `locomotion.minPauseMs`, `locomotion.maxPauseMs`, `locomotion.pauseChance`
- **BLOCKED:** Values not supplied. The addendum forbids inventing them before the PM task that establishes the real Graph V2 parameter authority, and that task did not reach this build.

### B · PERSISTENT HUNTER

- **Parent:** `builtin/04b-r1-baseline`
- **Hypothesis:** The pursuer gives up on evidence too readily, so a player who breaks line of sight is safe sooner than they should be. More persistent memory of where the learner was should make breaking away buy less.
- **Intended player-visible effect:** Hiding stops being a reset. The pursuer keeps coming to where you were.
- **May change:** `perception.trailRowRetention`
- **BLOCKED:** Blocked twice over. The values are not supplied, AND the persistence parameters this experiment would move live in the FROZEN `commitment` layer: `trailRowRetention` is the only persistence parameter presently settable. Promoting one or two commitment windows into `strategy` requires the PM task that demonstrates which of them matters, and a v2 schema.

### C · HIGHER PRESSURE

- **Parent:** `builtin/04b-r1-baseline`
- **Hypothesis:** The pursuer is simply not threatening enough. Raising locomotion speed and the cadence duty cycle should make it feel like a clock running down.
- **Intended player-visible effect:** Time pressure. The player hurries, and rushing the maths starts to cost them.
- **May change:** `locomotion.speed`, `locomotion.pauseChance`, `locomotion.maxPauseMs`
- **BLOCKED:** Values not supplied. Note also the product finding standing against it: at BASELINE speed, 6.3 seconds of standing still already ends a run. Raising pressure without a PM decision on that finding would be tuning past a known problem.

### D · COMBINED CANDIDATE

- **Parent:** `builtin/04b-r1-baseline`
- **Hypothesis:** Whatever A, B and C each demonstrate, combined into one candidate.
- **Intended player-visible effect:** To be stated once A, B and C have been read.
- **May change:** to be decided once A, B and C have been read
- **BLOCKED:** The addendum builds D only after A, B and C have been run and read. None has been instantiated.

## The baseline, canonically

This is exactly the text the behaviour hash is taken over. Metadata, labels and ids are absent
by design: renaming a configuration must not make it look like a different pursuer.

```
identity.schemaVersion="circuit-climb-pursuer-config/v1"
locomotion.cadenceSeed=42
locomotion.laneSeed=20958
locomotion.maxBurstMs=620
locomotion.maxPauseMs=380
locomotion.minBurstMs=180
locomotion.minPauseMs=90
locomotion.pauseChance=0.62
locomotion.speed=0.19
perception.directSenseRadius=260
perception.trailRowRetention=6
commitment.acquireConfirmationTicks=6
commitment.leadPreemptionConfirmationTicks=6
commitment.lossConfirmationTicks=3
commitment.maxRememberedFragments=24
commitment.trailExhaustionConfirmationTicks=6
chassis.arrivalEpsilon=4
chassis.laneBandFraction=0.55
chassis.targetEpsilon=1
spawnCapture.captureRail=true
spawnCapture.groundLevels=2
spawnCapture.spawnRule="AUTHORITY_FURTHEST_TRUNK"
```
