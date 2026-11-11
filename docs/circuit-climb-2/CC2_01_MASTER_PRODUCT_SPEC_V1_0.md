# CC2-01 — Circuit Climb 2.0 Master Product Specification v1.0

**Design authority:** Circuit Climb 2.0 PM. **Date:** 2026-11-11.  
**Status:** PM-approved *design baseline*, not implemented or released. Some calibration parameters are provisional until CC2-02 human and device evidence.  
**Read first:** [CC2-00 source audit](./CC2_00_SOURCE_RECONSTRUCTION_AND_FEATURE_INVENTORY.md), [math/transaction contract](./CC2_01_MATH_AND_TRANSACTION_CONTRACT_V1_0.md), [pursuit contract](./CC2_01_PURSUER_AND_ENEMY_DESIGN_V1_0.md), [decisions](./CC2_01_DECISION_LOG_AND_FREEZE_V1_0.md).

## 1. Product definition and promise

Circuit Climb 2.0 is a **vertical mathematical escape game**: a blue Spark climbs a luminous three-lane electrical tower by solving the addition/subtraction problem associated with the next row. A red Pursuer is a persistent, physically constrained and evidence-limited opponent. Correct answers visibly power the tower and increase height; wrong answers visibly short a destination and return the Spark to its last valid platform. The game is not a navigation reflex test. The learner chooses **where** to go, never how to steer the travel path.

**Emotional loop:** *read → reason → commit → see the arithmetic travel → power a platform → feel the pursuing threat → choose again*. Each successful answer should make the tower look more complete. The pursuer should seem alert and intentional, not magically omniscient or comically lost.

Primary testing audience: mobile/tablet arithmetic learners (~grades 3–6), with a grade-4-friendly addition pilot. Desktop is a supported input/display target, not the primary layout. The product is playable completely offline without a MathForge host or account.

## 2. Existing behavior and 2.0 differences

| Domain | Protected SOT-02 | CC2.0 design |
|---|---|---|
| Math | Three positive numbered choices, addition, exactly one correct | Preserve the launch addition loop; valid curriculum packs can extend it |
| Carried number | Next row can silently replace with independent random start | **Continuous within a four-row power cell**, then a **visible, labelled rebasing** at checkpoint |
| Selection | Tap a destination, automatic route | Preserve, including all three physically accessible |
| Incorrect | Travel to selected wrong platform, short, return | Preserve, record mathematical attempt once |
| Correct | Land, power green, increment row | Preserve; commit row only after valid landing |
| Movement | Circuit and optional Hop | Both supported, with the same mathematical result and evidence |
| Pursuer | Finite-sense Alive or always-aware baseline | One non-cheating AI using observation/memory/graph search; continuous pursuit |
| Capture | Terminal overlap; runtime clean-start shield OFF (handoff says ON) | **Protected in transit + proposed short post-landing grace**; capture otherwise physically valid |
| Rewards | Score = row and persistent best | Separate altitude, accuracy, combo and reward values |
| New systems | No dedicated ability/enemy/platform types | Bounded Capacitor/Relay platform system, earned Circuit Pulse, extensible enemy architecture |
| SDK | Experimental separate host bridge | Standalone source-owned events and optional explicitly validated adapter |

Any item on the right is a *new design rule*; do not claim it already works in the old runtime.

## 3. One canonical turn

1. **READY.** Camera follows the Spark. Its current mathematical number, next target and three candidate operands are stable and readable. A wrong candidate may already be disabled if retried.
2. **SELECT.** A press/tap on a still-live candidate creates a request. Input from the wrong row, a dead candidate, or a busy/paused/terminal state is ignored with a named reason; it is not counted as an incorrect answer.
3. **ACCEPT.** Validate that a legal path or Hop exists. Only accepted travel is a math attempt. The candidate answer and correctness are frozen; an `attempt_evaluated` event is emitted exactly once.
4. **TRAVEL.** Spark follows a finite, physically legal path. Arithmetic is displayed over the route while numbers stay legible. The route and destination cannot be redirected after acceptance. Transit shield applies.
5. **CORRECT LANDING.** Advance one row only at landing, illuminate platform green, emit `row_completed` once, update carried number to actual solved result, fill energy and optionally fire the row modifier. A lightweight target transition begins; there is no full-screen interruption.
6. **WRONG LANDING.** Chosen platform visibly shorts (amber-to-red), becomes disabled for this row, then the Spark returns to the previous platform under protection. The equation remains unchanged. Correct choice remains available. The pursuer continues its authorized time pressure while READY.
7. **CHECKPOINT.** On completion of the fourth correct row of a power cell, illuminate the cell and *explicitly* rebase voltage to a new starting number before arming the next problem. The reset is not disguised as arithmetic.
8. **CAPTURE/END.** Unshielded physical overlap ends the run once, freezes further selection/math progression, and shows the run summary. No lives or silent retry in Climb/Challenge.

**Learning principle:** mathematical correctness, route availability, arrival, score, and learning evidence are independent facts with one authoritative owner each.

## 4. Modes and independently selectable curriculum

| Mode | Pursuer | Goal | Feedback/help | Result |
|---|---|---|---|---|
| **Practice** | Visible demonstration ghost with capture disabled by default | Four-row power cell or selected short practice plan | Clear equation, optional untimed hint after user request; assisted attempts labelled | Practice completion, accuracy and support used |
| **Climb** | Fully active fair Pursuer | Endless climb until captured or manually ended | Strong but concise feedback; no answer reveal before choice | Run altitude, attempts, accuracy, best result |
| **Challenge** | Same evidence rules, higher bounded pressure | Authored finite multi-cell route or timed challenge | Fewer nonessential cues, never smaller math or hidden answer | Explicit success/failure vs authored goal |

Curriculum (e.g. `add20`, later `add50`, `subtract20`, mixed) is **not** determined by mode. A teacher/host may select arithmetic separately from chase pressure. Selecting a hard pursuer does not silently increase operand size.

**Pilot default:** Climb + `add20`, one initial tutorial offer, Circuit travel, sound enabled at moderate level, reduced-motion preference honored, transit shield on, short proposed landing grace. No default timer; pursuing time pressure is sufficient.

**Session policy:** pause is always available and pauses all simulation. Practice hints mark evidence as assisted; they are not counted as unassisted mastery. High-pressure choices must remain legible on narrow phones. Any countdown in Challenge is visible, configurable, and suspended during pause.

## 5. Challenge and progression structure

- **Power cell:** four correct row completions with locally continuous arithmetic. Completion performs a clearly marked voltage rebase, with no hidden penalty.
- **Stage:** three power cells (12 solved rows) introduce a new theme or mechanic; stage labels appear in a light header or progress micro-indicator, not interrupting full-screen panels.
- **Opening:** 1–4 correct rows teach the selection/arrival/short/return pattern with just one active opponent model; bot pressure tuned for fair learning time.
- **Later stage:** one new mechanic at a time; higher pressure emerges from AI speed/patience profile and published platform effects, not unseen arithmetic corrections.
- **Practice goal:** one four-row cell is a meaningful end condition; longer assignments specify their own verified row goal.
- **Endless Climb:** no claim of completing the course; "Best height" and "attempts" are displayed separately from learning attainment.
- **Challenge goal:** declared before start (e.g. survive three cells without capture). On final row, goal completion is adjudicated at landing with explicit event priority. Any tie rule is deterministic and documented.

Unlocks may change visuals, cosmetics, or introduce optional authored difficulty. They may not secretly modify addition truth, assessment correctness, or make paid upgrades necessary.

## 6. Platform and enemy launch scope

**Launch baseline:** the primary red Pursuer, base platforms plus two *row-wide* special modifiers: **Capacitor** and **Relay**, and one earned ability, **Circuit Pulse**. These are specified in the [platform/ability catalog](./CC2_01_PLATFORM_ABILITIES_AND_PROGRESSION_V1_0.md). Sentry Arc and Scout Node are completely designed as candidate expansion features but **must not block the first commercial core** and cannot compensate for an unintelligent Pursuer.

During the first four solved rows, no hazardous platform exceptions appear. A modifier's display cannot reveal which of the three answers is correct; initial special icons are shown uniformly for the row. No modifier changes mathematical correctness or the legality of a route.

## 7. Visual system and user interface

**Art direction:** MathForge's restrained architectural look: three calm translucent vertical lanes, thin luminous circuitry and carefully bounded blue/green/red light, subtle layered depth, no plastic green plasma, no oversaturated particle fog. Number contrast takes priority over atmospheric light.

**Color semantics:** Spark = cyan/blue; correct/powered = mint/green; inactive/neutral = slate/glass; wrong/short = amber then red; Pursuer = red/magenta distinct from short state via silhouette and motion; ability = violet/blue pulse. Never rely on color alone; symbols and motion patterns reinforce state.

**Top HUD (one compact region):** large readable `current + ? = target` (or active operation), a small row/cell counter, a restrained threat pulse and optional challenge clock. On a small phone the equation wins space. Text numbers have solid backplates for contrast. The Spark number remains legible on the actor. A distinct checkpoint banner briefly labels a reset, e.g. `CELL RECHARGED — NEXT START: 3`.

**Board:** three fully tap-accessible options visually above the player. Never hide a live candidate under header, status, ad, modal or safe-area cutout. Camera motion tracks at an easing rate that does not cause mis-taps; freeze hit geometry at acceptance. Brightness feedback should never obscure the selected numeral.

**Bottom action row:** Home, Pause/Resume, Restart (confirmation while a live run is at stake), Circuit Pulse (if enabled), Settings. Do not add dead/false affordances merely to imitate other MathForge games. Suite-wide Previous/Next and Undo have no meaningful operation inside an endless chase; if the host needs activity navigation, expose them in a paused host menu, not inside gameplay. This is the explicit MathForge surface exception to shared control placement.

**Settings:** learner tab (sound, effects, music, haptics if supported, contrast, motion, help, mode overview); Developer nested tab (seed, parameters, movement inspector, graph, replay, telemetry diagnostics, reset/export/import). All forensic data is absent from default learner play.

**Transitions and feedback:** correct route draws step by step and lands with an energy ring that indicates `a + b = t`, the correct platform powers, and the next decision appears continuously. Wrong route is traveled, short event is visible at destination, then return. No long victory modal between ordinary answers. Audio and haptics mirror the semantic event, not every render frame.

**Motion/accessibility:** reduced motion removes camera sways, excess particles and visual noise but not the spatially necessary route/landing information. High-contrast mode prioritizes luminance and numeric readability. At 200% text scaling, no current equation or option should be truncated. Numbers have accessible parallel labels/buttons in the DOM; canvas-only pointer selection is not the sole way to play. Keyboard 1/2/3, Enter/Space and screen-reader flow must not create duplicate attempts.

**Responsive:** 320/360/390/428px portrait; iPhone Safari, Android/Chrome and Galaxy Tab S6 Lite; tablet/desktop; landscape with clear safe-area and bottom bar. No body scrolling during active touch play. Do not make display/world scaling mutate mathematical truth.

## 8. Audio narrative

- Soft activation tick for accepted choice, discrete corner notes when the Spark turns, a small harmonious confirmation on correct landing, a low interrupted electrical short on wrong landing/return.
- Pursuer acquisition emits a subtle alert motif **only when detection is legitimate**; a red warning should not leak unseen Pursuer knowledge in gameplay.
- Pulse uses a clean, brief electric swell, not a loud explosion. Cell recharge gets a short progress flourish.
- Sound preferences independent for SFX/music; no reliance on a music asset to make gameplay legible. Mute is fully playable. Browser audio unlock on direct interaction.
- All sounds use a centrally controlled event scheduler to avoid duplicate sound when React rerenders or replay scrubbing.

## 9. Run result and mastery boundaries

A results screen shows **height**, **correct answers**, **wrong attempts**, **accuracy**, **solved equations**, **time playing**, **mode/pack**, **capture or goal reason**, and **ability uses**. Show solved equations in the primary list; wrong attempts belong in an expandable review with the correct relation explained. Never present an incorrect attempt as a completed solved equation.

Score is an entertainment measure. A learner can achieve a high climb but still have a low mathematical accuracy; the MathForge host must not infer mastery or assignment completion from height or a Pursuer collision. Assisted events are labelled. A completed practice assignment has an explicit source-owned outcome, independent from capture.

## 10. Explicit exclusions and release philosophy

**Not in first playable or required launch:** multiplayer; live generated tutoring text; free-steering jumps; pay-to-win upgrades; stealth omniscience; complex inventory; multi-enemy swarms; arbitrary route veto; online-only features; shared-suite SDK coupling inside core; game-score-derived mastery; 3D rendering dependency.

Production readiness means *good play*, evidence-limited purposeful bot behavior, deterministic accounting, clear presentation, keyboard/touch/accessibility coverage, stable offline operation, safe SDK boundaries, and tested real devices. No amount of unit-test passes can replace owner-observed chase acceptance.

This spec deliberately picks a coherent product rather than "every feature on day one." Source reconstruction remains protected while CC2-02 proves the hardest new capability: a genuinely convincing pursuer.
