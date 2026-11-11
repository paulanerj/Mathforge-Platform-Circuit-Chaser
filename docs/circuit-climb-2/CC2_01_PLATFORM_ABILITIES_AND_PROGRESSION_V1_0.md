# CC2-01 — Special Platforms, Abilities, Enemies and Progression v1.0

**Status:** PM design baseline. Launch mechanics are specified, not yet built. Tuning values below are **initial test presets**, not claims of measured balance. Pursuer contract has priority on collision/perception.

## 1. Systems taxonomy

A **platform** is a physical surface with immutable ID, collision shape, operand and visual state (`LIVE`, `SELECTED`, `POWERED`, `SHORTED`). A **row modifier** adds an earned effect to the whole active row without changing any platform's numerical correctness. A **player ability** is a charged optional action that consumes resources while the player is READY. An **enemy/hazard** is an independent world actor or telegraphed zone constrained by reachability, capture and fairness contracts.

This distinction is essential: if a special *correct platform* glows with an exclusive reward icon, it reveals the answer. The launch program therefore applies special *row-wide* labels uniformly to all three candidates; the benefit triggers only once at a correct landing. This cannot leak the answer through art or power-up rarity.

## 2. Launch feature catalog (bounded scope)

| Mechanic | Where visible | Trigger / deterministic effect | Player comprehension | Safety |
|---|---|---|---|---|
| **Normal platform** | Each option displays clear numeric operand | Correct: green POWERED; Wrong: short and return | Primary arithmetic feedback | Every choice physically routeable |
| **Capacitor Row** | Same capacitor motif visible on all three platforms and on a small row label | On correct landing: +2 ability-charge units instead of standard +1 | “This row charged my Pulse faster” | No answer cue; no effect on wrong route |
| **Relay Row** | Same connected node motif across all three | On correct landing: propagates a power wave through earlier solved platforms and grants a clearly labelled **visual-only** `RELAY_CHAIN` milestone | “My solved math powered the tower” | Never awards hidden correctness or automatically selects |
| **Four-row Cell Recharge** | Cell progress ticks and tiny edge-light build | On fourth correct landing: completed circuit lights; explicit arithmetic rebase to next seeded starting value | “I finished a battery; next starts fresh” | Cannot silently rewrite a math value |
| **Circuit Pulse** | Single bottom-row action button and charge ring | READY and full: within initial radius 220, Pursuer moves at initial 65% speed for 150 simulation ticks (2.5s at 60Hz) | “My correct answers buy a short escape window” | No answer reveal, no teleport, no priority reversal of prior capture |

**Frequency proposal** (to be verified in gameplay): first 4 solved rows are all normal; capacitor row at every 6th row thereafter, relay row at every 4th row thereafter, with relay priority on overlap unless explicitly authored as a dual modifier. This means new effects are introduced through known milestones, not hidden answer distributions. A deterministic `special` RNG can later introduce safe seeded variants only after tests prove no answer correlation.

**Pulse charge:**
- Meter integer 0..4; normal correct landing +1, Capacitor correct landing +2 (clamped to 4). Wrong attempts +0. This makes the meter easy to understand.
- Trigger requires `READY`, `Climb` or `Challenge`, charge exactly 4, no terminal state, and a valid effect configuration. Successful activation consumes all 4 and publishes one `ABILITY_ACTIVATED` event with affected actor IDs and expiry tick. If no pursuer is within range, the player can still choose to spend it; UI must show range/feedback clearly to prevent confusion.
- There is no auto-fire, invisible auto-charge, permanent inventory, stack, or optional purchase. In Practice the ability is taught with a simulated target and no paid pressure.
- Pulse does not stop the Pursuer's Brain or mask sensory evidence; it modifies body speed while active. It cannot move the bot backward or force a scripted failure. Multiple Pulses cannot overlap because the meter resets and charging rules restrict use; if a future upgrade permits it, define effect precedence explicitly.
- Sound/visual should show a wave that reaches the actor, not imply a hit where none occurred.

**Relay visual rule:** the number and equation must finish resolving before the energy wave expands. Waves last no more than the tuned presentation budget and cannot block next-row selection or alter collision surfaces. Reduced-motion alternative is a small illumination transition and a static “Relay powered” label.

## 3. Standard platform micro-states and motion

| State | Fill / symbol | Input | Event |
|---|---|---|---|
| LIVE | Soft translucent dark base, bright numeral, accessible label | Tap/selectable | None until valid route accepted |
| SELECTED | Bounded blue ring, numeral remains readable | No new choices during transit | `TRAVEL_STARTED` |
| POWERED | Green inner glow + bolt or check icon; original selected value remains in event log | Historical node, not available as new row | `ROW_COMPLETED` after landing |
| SHORTED | Amber warning flash -> red low-power X, numerical wrong operand remains inspectable | Disabled for rest of active row | `PLATFORM_SHORTED` after wrong landing |
| REMOVED/CULLED | Not present in active rendering | None | Simulation history preserved in replay |
| CHECKPOINT | Completed connected row/cell accent | Not a choice | `CELL_COMPLETED`/`VOLTAGE_REBASE` |

The learner chooses a platform **operand**, not a special shape. Selection must never be mathematically filtered. Incorrect destination receives an actual visit and return; designers cannot shortcut it to a shake at the starting platform without a separate explicit product decision.

## 4. Candidate post-launch special platform set

Detailed rules are defined now so the game can grow without a rewrite, but **none are required in CC2-03 MVP**:

**Stabilizer Row:** on correct landing applies a visible, short enemy movement slow (candidate 20% for 1s) by the *same typed effect system* as Pulse. Precedence: use the strongest slow, not multiplication; expiry = latest active effect's tick only when authored stacking policy says so. Do not allow permanent slowdown through repeated landings.

**Switchback Row:** alters the *visual path style* through a route chosen from the same prevalidated candidates. It may add apparent turns only within validated geometry and player travel duration, never alter destination or force contact.

**Overload Row:** on wrong answer intensifies the short visual/sound, but may not add a hidden mathematical penalty; if it affects the Pursuer, declare visible telegraph beforehand and measure fairness. Post-launch until fully tested.

**Phase Gateway:** visible checkpoint cosmetic change and optional stage transition, not an uncontrolled teleport through obstacles. A true teleport would be a different game mechanic and is excluded.

**Conductor Chain:** cosmetic visual linking previous solved nodes (not physically a new route). Must not use hidden answer-position data in the styling algorithm.

## 5. Enemy roster and authored stage behavior

**Core launch = one red Pursuer** with versioned perception and purposeful navigation, as defined in the Pursuer contract. It is the necessary quality bar, not one element among distractions.

**Sentry Arc — Challenge expansion candidate:** anchored between authored safe segments; periodically charges a visibly marked stationary zone only while the Spark is READY/grounded. It cannot invalidate any of the three selectable options. Its telegraph is readable at least 1.2s (initial) before activation, and its world collision remains a separate timed hazard with protected-transit exclusion. No unseen instant burst at the exact point the Spark arrives. If geometry proves the player has no fair response time, disable the hazard for that stage.

**Scout Node — Challenge expansion candidate:** bounded deterministic patroller; its own detection within explicit radius emits a delayed/aged `SCOUT_SIGHTING` observation to the primary Pursuer. Sightings cannot contain future route, correct answer or actual current Spark position if the scout has lost sight. It has no direct capture; its value is information, not damage.

**Interceptor — expansion candidate:** small secondary hunter covering nearby circuit nodes; distinct patrol/commitment and a maximum pursuit window, no spawn at a required destination. With more than one enemy, define resource budget and deterministic collision priority without multiplying assessment outcomes.

**Circuit Warden — future curated encounter:** a visually identifiable multi-phase variant of the primary pursuer. It cannot receive oracle truth or manipulate platform arithmetic. Phases alter published speed, sensing or patrol pattern within valid bounds; every shift has an accessible telegraph. First boss content appears only after the standard Pursuer is proven.

**No false difficulty:** extra enemies are optional progression content, never a substitute for a broken red Pursuer or for unbalanced arithmetic.

## 6. Stage progression design (content plan)

The first twelve completed rows constitute **Stage 1** (three four-row power cells). The gameplay is continuous; stage boundaries create a low-profile header cue, not a forced cutscene. Proposed rollout:

| Solved row band | Math | Mechanics | Pursuit |
|---|---|---|---|
| 1–4 | `add20`, clear equation | Basic selection, correct/wrong and first checkpoint | Practice shadow or soft Climb preset |
| 5–8 | `add20` or user-selected pack | Capacitor introduced, Pulse charging clearly shown | Full purposeful Pursuer |
| 9–12 | Same pack, stable scope | Relay motif, Pulse used by choice | Pursuer search/lock behavior readable |
| 13–24 | Same selected math or explicitly changed pack | Mix capacitor/relay, restraint in visuals | Approved Climb pressure curve |
| After 24 | Host-selected progression or authored Challenge | Optional Stabilizer / Sentry / Scout **if separately qualified** | Mode and chosen difficulty define pressure, not arbitrary hidden rubberband |

If a curriculum is changed by host during a live run, it applies **only at a cell boundary** and creates an explicit `CURRICULUM_CHANGED` event; the current visible math problem is immutable. Do not auto-escalate arithmetic because the learner is fast at tapping or because the pursuer is behind.

## 7. Pressure and learning balance

The tension should come from how long the learner takes to solve the problem, visible Pursuer progress, optional strategic Pulse timing, and satisfying tower lighting. A 9–10-year-old learner should never feel that fast clicking without thinking is rewarded more than getting the arithmetic right.

- Wrong attempts use up real decision time while allowing a retry. They do **not** subtract hidden points from educational evidence, nor change the correct answer.
- Practice mode suppresses capture and allows hints with an explicit assisted flag.
- Climb mode always keeps the main Pursuer physically present while playing. The opening stage may tune speed conservatively but cannot silently spawn a new threat at an unavoidable landing.
- Challenge mode authorizes calibrated greater pressure, not cheating sensors.
- Pulse rewards correct play, not random loot. A mathematically strong learner sees more earned options; the tool cannot allow Pulse to auto-answer.

## 8. Reward economy and persistence

**Launch:** no currency, loot boxes, purchases, inventory, permanent gameplay boosts or artificial daily streak penalties. Best height/score, unlocked cosmetic themes and optional achievement markers may be saved locally under versioned keys. A MathForge host can manage its own identity and progress; the surface emits neutral evidence without leaking personal data.

Optional achievements use source-owned events: `FIRST_CELL`, `THREE_CELLS`, `PERFECT_CELL` (no wrong attempt within four-row cell), `CIRCUIT_PULSE_USED`, `BEAT_CHALLENGE`. Achievements do not claim educational mastery. Visual achievements do not block the next row.

## 9. Designer schema (proposed)

```
specials:
  capacitor: { enabled: true, startAfterSolvedRow: 4, interval: 6, bonusCharge: 2 }
  relay:     { enabled: true, startAfterSolvedRow: 4, interval: 4, visualOnly: true }
abilities:
  pulse: { enabled: true, chargeCapacity: 4, chargePerCorrect: 1,
           radiusWorld: 220, movementMultiplier: 0.65, durationTicks: 150 }
enemies:
  pursuer: { enabled: true, captureInTransit: false, landingGraceTicks: 15 }
  sentryArc: { enabled: false } # separate gate
  scoutNode: { enabled: false } # separate gate
```

The above is a human-readable schematic, not a YAML parser implementation. All fields must be validated, defaulted by version, and included in the resolved config hash. Changing a slider mid-run stages the value for the **next** run unless specifically approved as a dev-only live experiment with separate test provenance.

## 10. Advancement acceptance

Before any special behavior is admitted to a playable candidate:
- Golden seeds prove option correctness distribution is unchanged compared with base math.
- All three destinations remain selectable and routeable in all supported zooms.
- No special overlay reveals which choice is correct.
- The ability charges/consumes exactly once and expires at the correct tick.
- Pause/restart/capture clears timed effects or freezes time as specified.
- The VFX/animation communicates math and effects without making option numerals unreadable.
- Low-spec tablet frame time and memory remain within performance budget.
- Demo in normal and reduced motion; inspect special platform behavior when wrong option is selected.
