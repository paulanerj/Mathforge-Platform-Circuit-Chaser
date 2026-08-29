# CIRCUIT CLIMB — SUCCESSOR SOURCE OF TRUTH — HANDOFF 01

**This is the authoritative document for Circuit Climb.** It is written for an
engineer or PM with no knowledge of the conversations that produced the code. If
you read one file before touching anything, read this one.

| | |
|---|---|
| Repository | `paulanerj/Mathforge-Platform-Circuit-Chaser` |
| Branch | `claude/circuit-climb-forensic-audit-3s4oyh` |
| Starting accepted commit | `060541bf6cd060b5dd2856fdab4d062641fda617` |
| Final handoff commit | resolve with `git log -1 --format=%H` on the branch head |
| Successor branch ref | `circuit-climb-successor-sot-01` |

---

## A. PRODUCT DESIGN

### The fantasy
A vertical climb through an electrical circuit. The learner is a blue spark
ascending a tower of numbered platforms, powering each node they solve, while a
red pursuer hunts them from below.

### The learner loop
1. The spark carries a value. A target sum is displayed.
2. The row above offers three numbered platforms.
3. The learner taps the platform whose number completes the sum.
4. The spark routes itself there along a blue plasma filament and lands.
5. The result resolves, and the next row arms.

### The arithmetic decision model
`carried value + platform value = target`. One platform in the row satisfies it.
Problems come from `services/CircuitClimbMathAdapter`, which wraps the shared
MathForge generator. Difficulty widens the target band as rows climb.

### Correct behaviour
The spark travels, lands, and the platform **powers**: green face, energised
interior, the numeral replaced by a power symbol. The value is retained in
state. The learner's carried value advances and the next row arms.

### Wrong behaviour
The spark **still travels and still lands**. The platform shorts out and goes
offline for that row. The learner chooses again from what remains. Observed
message sequence:

```
"4) + 5 = 9"
"Short circuit. That platform is offline. Choose another."
"Tap the platform that completes the equation."
```

### The destination-vs-path rule
**The learner chooses a destination, not a path.** The only input is a tap. There
are no movement controls. Route generation, travel and landing are automatic.

This is why a collision the learner could not have avoided is a design problem
rather than a fair loss, and it is the reasoning behind the transit shield
(§ H).

### Identities
- **Player** — a blue spark carrying its current value. Never green, never red.
- **Route** — a blue plasma filament. Part of the product identity, not debug
  rendering.
- **Powered platform** — green, energised, numeral replaced by a power symbol.
- **Dead platform** — a distinct offline treatment, never confusable with powered.
- **Pursuer** — a red orb. Pulse and a scanning arc communicate its state.

### Capture
Contact ends the run: red burst, `"Caught by the surge. Press Restart to run
again."`, the board goes inert to pointer input, everything but the burst
freezes. No lives. No scoring change.

### Pause / Restart
- **Pause** freezes the world and the pursuer and preserves state. Measured
  pursuer drift while paused: **0.00px**.
- **Restart** resets player, math, rows, pursuer and capture with no ghost
  state, mid-run or after a capture.

---

## B. CURRENT PRODUCT STATE

What the game **actually does today**, verified in a browser at five viewports:

- Launches, and all three first-row platforms are selectable with visible travel.
- Correct answers resolve and power the platform; wrong answers travel and short.
- Ten consecutive learner decisions run without a dead board.
- The blue route renders; powered platforms render green.
- The pursuer moves through SEARCH, ALERT and CHASE, navigates corridors,
  tracks the learner's column, and captures.
- Capture ends the run; Restart produces a clean one.
- Pause freezes, Resume restores.
- A fresh install runs the documented defaults with exact geometry parity.

Not present: lives, scoring changes, row staggering, difficulty systems, SDK
integration, host adapters.

---

## C. ARCHITECTURE

```
src/games/circuit-climb/
  geometry/circuitClimbGeometry.ts          world, collision, corridors, route
                                            crossing altitude, threat ranking
  runtime/circuitClimbLearnerRouting.ts     the learner routing transaction
  runtime/circuitClimbRuntimeRules.ts       storage parsing, world culling
  runtime/useCircuitClimbPrototypeRuntime.ts  the game loop (~2350 lines, one closure)
  pursuer/circuitClimbPursuer.ts            navigation + behaviour state machine
  pursuer/circuitClimbPursuerTuning.ts      every number shaping how it feels
  pursuer/circuitClimbPursuerTrace.ts       per-frame diagnostic and alerts
  services/CircuitClimbMathAdapter.ts       problem generation
  CircuitClimbSurface.tsx                   canvas, HUD, overlays, dev panel
  CircuitClimbDevHarness.tsx                mounts runtime + surface
  styles/circuit-climb.css
  tests/                                    16 files
  tests/support/                            shared production-shaped fixtures
  tools/circuitClimbSmoke.mjs               browser smoke test
  docs/                                     this file and the history
```

**Ownership.** Geometry owns the world and all spatial maths. Learner routing
owns the decision from tap to travel, and is pure. The runtime owns state,
effects and rendering. The pursuer owns its own navigation and behaviour, and
consumes geometry — it never forks it.

---

## D. GEOMETRY AUTHORITY

**GEOMETRY HAS ONE HOME:** `geometry/circuitClimbGeometry.ts`.

Read from the current source:

```ts
export const CIRCUIT_CLIMB_GEOMETRY = {
  logicalWidth: 600,
  platformWidth: 104,
  platformHeight: 62,
  playerRadius: 32,
  rowGap: 205,
  columns: [110 / 600, 300 / 600, 490 / 600],   // -> 110 / 300 / 490
  routePlatformPadding: 8,
};
```

Columns are stored as fractions of the logical width; the left column resolves
to `109.99999999999999` in floating point, which is why the geometry tests use
`toBeCloseTo(110)` rather than equality. Rows are centre-aligned;
`SHIFT_OFFSETS` exists but staggering is **off**.

Also owned here, and **never to be re-derived anywhere else**:

- `computePlatformCollisionRects` — actor-inflated collision rects
- `computeRouteCrossingOffset` — the altitude at which a route crosses beneath
  a row
- `computeActorSafeCorridors` — the A/B/C/D corridor model
- `computeInversePointerTransform` — display to logical coordinates
- `pathIsClear`, `pathClearance`, `chooseRouteAgainstThreat`

The rect inflation and the crossing offset live side by side deliberately. They
must agree, and when they did not, the entire game stopped working (§ F).

**Do not reproduce geometry formulas in future subsystems.** Import them.

---

## E. LEARNER ROUTING CONTRACT

`runtime/circuitClimbLearnerRouting.ts` owns the whole transaction:

```
destination in  ->  explicit routed / rejected result  ->  travel out
```

It is pure and deterministic. It plays no sound, sets no message, mutates no
platform and touches no React state. Those remain the runtime's.

```ts
planLearnerSelection(world, from, destinationPlatform): LearnerSelectionResult

type LearnerSelectionResult = LearnerSelectionRouted | LearnerSelectionRejected
//  routed   -> { ok: true,  route, landing, travel }
//  rejected -> { ok: false, reason, diagnostic }
```

Narrow with the exported `selectionRouted()` predicate. This project's tsconfig
does **not** enable `strict`, and without `strictNullChecks` TypeScript will not
narrow a union on a boolean literal discriminant — `if (result.ok)` leaves the
union intact and reading `result.reason` is a compile error.

### Rejection reasons

| Reason | Meaning |
|---|---|
| `NO_DESTINATION_ROW` | the destination's row is not in the world |
| `NO_LEGAL_ROUTE` | every candidate corridor and the edge fallback were refused by collision |
| `DEGENERATE_ROUTE` | a route with fewer than two points or zero total length |

Every rejection carries a diagnostic: destination row, candidates built,
candidates clear, origin and landing point. The runtime logs
`CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED` on any of them.

### THE PERMANENT INVARIANT

> **A legitimate learner destination must never be silently removed.**

Concretely:

- Mathematical correctness is never consulted during routing.
- The pursuer may **reorder** candidate routes. It may never reject one, and it
  never enters `isPathClear`.
- A zero-length route is never produced. Travel advances until
  `distance >= total`, so a total of 0 arrives on the first frame and teleports
  the spark.
- A failure is loud and diagnostic. It is never a consumed click.

---

## F. HISTORICAL FAILURE WARNING — READ THIS

The lock suite exists because of what follows. It is not ceremony.

**Every platform in the game became unclickable, and the test suite stayed
green.** Clicking any platform did nothing at all: no travel, no message, no
console error. Fifty-one tests passed throughout.

Four things combined:

**1. Crossing altitude versus inflated collision.** Collision rects are inflated
by `routePlatformPadding + playerRadius`. The route generator computed its
crossing altitude from `routePlatformPadding` alone. Every generated route
therefore began *inside* the destination row's collision band by construction —
by 16.6 to 29.4 units depending on view scale — and every candidate was
rejected. Two numbers that had to agree, in two different files, drifting apart.

**2. The inaccessible runtime closure.** `buildCircuitPath`, `selectPlatform`
and travel creation lived inside a React hook closure. No test could reach them.
The transaction had no seam, so no test could have caught this.

**3. Silent route-null.** When every candidate failed, `buildCircuitPath`
returned `null` and `selectPlatform` returned without setting a message. Before
that, it had returned a zero-length `[from, from]` route, which made `arrive()`
fire on the first frame and **teleported** the spark — so the game had appeared
to work for an entire era while never actually routing.

**4. The richer-test-fixture problem.** Tests built platforms with `id: 'p1'`.
Production `makeRow()` created platforms with **no `id` at all**, so
`pathIsClear` was comparing `undefined === undefined` and its exceptions applied
to every platform at once. The tests validated identity behaviour production did
not possess.

That last one is why `circuitClimbLearnerRouting.test.ts` reads `makeRow` out of
the runtime source and asserts the shared fixture's key set matches exactly.

---

## G. LOCK SUITE

`tests/circuitClimbLockedCapabilities.test.ts` — **20 tests, all passing.**

**THESE ARE CAPABILITY LOCKS.** Each one locks a capability that cost a forensic
audit and several repairs, and each names the failure it prevents.

> **If a lock fails, a working behaviour has been lost. Fix the product.**
> **Do not edit a lock merely because the implementation changed.**

Coverage: accepted world constants and column centres; usable interior
corridors; deterministic platform identity; crossing altitude clearing the
collision band at all five view scales; a horizontal crossing band existing
between rows; the source-platform exception not leaking; pursuer crossing,
non-penetration and capture; and the learner selection transaction — first
LEFT/CENTER/RIGHT selectable, a wrong platform selectable, failure creating no
travel, no zero-length travel, and no pursuer position at any avoidance able to
remove a destination.

---

## H. PURSUER

### States

```
SEARCH ──sensed──> ALERT ──hesitation──> CHASE ──contact──> CAUGHT
   ^                  │                     │
   └────────── lost the trail ──────────────┘
```

- **SEARCH** — works from the last sighting, sweeping side to side, always
  climbing. Dim slow pulse behind a scanning arc.
- **ALERT** — has sensed the learner and is orienting. Bright, ~18% speed.
- **CHASE** — locked on, straight at the learner through legal geometry.
- **CAUGHT** — terminal; the pursuer stops.

A spark **in transit breaks the lock**, so committing to a platform is what
shakes the pursuer off. Standing still is what gets you caught.

Everything is driven from elapsed time through two out-of-phase sines. A run
replays identically and there is **no `Math.random` in the pursuer**.

### Modes

| Preset | What it is |
|---|---|
| `alive` | the living pursuer; the current default |
| `baseline` | PURSUER BASELINE 01 frozen: sensing off, no hesitation, no sweep, constant speed |

`createPursuer` defaults to **baseline**, so the lock suite keeps exercising the
frozen behaviour whatever the live tuning becomes. The dev panel switches modes
live with no rebuild — the escape hatch for any tuning experiment.

### Tuning authority
`pursuer/circuitClimbPursuerTuning.ts` owns every number: search and chase
speeds, sense and lose radii, alert hesitation, sweep amplitude and period,
speed jitter, climb reserve. Navigation and capture distance are **not** tunable
— they are physics, and they are locked. Values are clamped on load, and
`loseRadius` is forced above `senseRadius` because a lock that can never be lost
can never be regained.

### Spark avoidance and transit shield
- **Spark avoidance (0–1)** — how hard the route steers around the pursuer. It
  only reorders collision-approved routes. Measured effectiveness is low
  (roughly 1 route in 24 has a safer alternative), because all candidates share
  a start and a destination.
- **Shield spark in transit** — when on, only a landed spark can be taken.
  **Off by default**; it changes the game's contract and that is a PM decision.

---

## I. DEBUGGING

```js
// Per-frame pursuer decisions, off by default
localStorage.setItem('circuitClimbPursuerTrace', '1');   // then reload
localStorage.removeItem('circuitClimbPursuerTrace');
```

| Signal | Meaning |
|---|---|
| `CIRCUIT_CLIMB_PURSUER_STEP` | one line per frame: state, obstacle row and its collision band, corridors considered, per-axis intent and blocks. Verbose flag only. |
| `CIRCUIT_CLIMB_PURSUER_STALLED` | motionless for 45 frames while more than a row from the learner. Always active. |
| `CIRCUIT_CLIMB_PURSUER_NOT_CLOSING` | moving, but the gap has not shrunk over 300 frames while at least 260 units out. Always active. Exists because STALLED needs *exact* zero movement, and a crawling pursuer moves every frame. |
| `CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED` | a learner selection produced no route. **Should never appear in normal play.** Carries the reason and diagnostic. |

Both pursuer navigation defects in this project's history were found by reading
the step trace, each in a single run, after being invisible to source reading.

**Download bot log (.json)** in the gear panel exports the whole recorded run.

Other dev-panel controls: world framing, circuit corners, spark avoidance,
transit shield, bot behaviour preset, nine pursuer sliders. All persist to
`localStorage`.

---

## J. SMOKE HARNESS

`src/games/circuit-climb/tools/circuitClimbSmoke.mjs`

```bash
npm i -D playwright-core          # once
npx vite --port=3000 &            # a dev server
node src/games/circuit-climb/tools/circuitClimbSmoke.mjs
# options: VW=390 CHROME=/path/to/chrome URL=http://127.0.0.1:3000/
```

Covers launch, first selection in each column, a correct travel, a wrong travel
and consecutive decisions. Exits non-zero on failure. Last run: **9/9 at 430**.

It needs a real browser and a running dev server, neither of which belongs in
`npm test`, so it is **deliberately not wired into package.json** and nothing
imports it. Wiring it into CI is a reasonable future task (§ roadmap 6).

---

## K. TEST INVENTORY

| | |
|---|--:|
| Repository test files | 18 |
| Circuit Climb test files | 16 |
| Other (theme) | 2 |
| Total tests | **165** |
| Circuit Climb tests | 140 |
| Other tests | 25 |
| Lock-suite tests | 20 |
| Passed / failed / skipped | **165 / 0 / 0** |

```
npm run lint     tsc --noEmit    exit 0, clean
npx vitest run   165/165 passing
npm run build    clean
```

---

## L. KNOWN LIMITATIONS — none of these are fixed

**1. Pursuer / runtime geometry divergence off default.** At the default 100%
view scale the runtime world is exactly the module constants
(`rowGap 205 · platform 104 · player 32`, measured), so the pursuer — which
reasons in module constants — agrees exactly. Move the dev world-framing slider
and they diverge; the pursuer keeps reasoning in 100% units.

**2. Alive pursuer tuning is provisional.** Set by feel over a handful of runs.
The sliders exist to argue with it. It has never been tuned against play data.

**3. Spark route avoidance rarely has an opportunity.** Roughly 1 route in 24.
All candidates share a start and a destination and the pursuer is usually near
one of them. Safe and free, but not an answer to "the spark flew into the bot" —
the transit shield is.

**4. `arrive`, `updateTravel` and drawing remain inside the runtime closure.**
The learner routing transaction is now testable; these are not. A rendering
defect that hid the platform under the learner at narrow viewports was found by
browser QA, not by a test, and its repair still has no unit lock.

**5. Browser checks depend on an external harness.** `circuitClimbSmoke.mjs`
covers the critical path but requires `playwright-core` installed separately and
a running dev server. The fuller acceptance matrix used across these phases
lives outside the repository and is not committed.

**6. Older pursuer test fixtures are duplicated.** `circuitClimbPursuer.test.ts`,
`circuitClimbPursuerNavigation.test.ts` and others each carry their own
production-row fixture. New work shares
`tests/support/circuitClimbProductionFixtures.ts`. Consolidating the older ones
was deliberately not bundled into a structural phase.

**7. `NOT_CLOSING` threshold is close to one row gap.** Its 260-unit floor sits
near `rowGap` 205, so a legitimate near-miss hold can trip it. Observed firing
at 377–417 units, correctly, in a minority of runs. Not tuned.

---

## FROZEN PRODUCT RULES

Accepted product decisions. Changing any of these requires PM authorisation.

- Mathematical correctness **never** controls selectability.
- A wrong platform is a legitimate destination.
- The learner chooses a destination, not a path.
- Route planning must **never** silently consume a click.
- The pursuer may influence route preference but may never remove every legal
  learner route.
- Powered platforms are green. The player and its route are blue. The pursuer
  is red.
- Capture ends the current run.
- No lives system. No scoring change on capture.
- Restart creates a clean run.
- Shared geometry remains authoritative.

---

## NEXT SAFE ENGINEERING WORK

Ranked assessment. **None of this is authorised.** Each needs a PM phase.

**1. Reconcile pursuer geometry with the dev world-framing slider.**
*Why:* the only known state where two geometry authorities disagree.
*Risk:* medium — touches pursuer navigation, which the lock suite guards.
*Prerequisites:* decide whether the slider is a dev tool or a product feature; if
dev-only, documenting the limitation may be the correct answer.
*Must stay frozen:* default geometry, capture distance, corridor model.

**2. Tune the Alive pursuer against real play data.**
*Why:* current values are guesses; pacing is the least evidenced part of the game.
*Risk:* low — tuning only, and Locked baseline is always one dropdown away.
*Prerequisites:* sessions with the bot log downloaded; agreement on what good
pressure feels like.
*Must stay frozen:* the baseline preset, navigation, capture.

**3. Decide whether the transit shield should be the product default.**
*Why:* it is the honest answer to losing a run to a collision the learner could
not avoid. Currently off, so the decision is unmade rather than made.
*Risk:* low technically, significant to game feel.
*Prerequisites:* play both ways; a PM view on whether flight should be lethal.
*Must stay frozen:* the destination-not-path rule either way.

**4. Improve spark route avoidance — only if play testing justifies it.**
*Why:* it works but rarely applies. Doing better means mid-flight re-planning,
which is materially harder.
*Risk:* high — this is the code that made the game unclickable.
*Prerequisites:* evidence from play that ambush deaths still matter after a
decision on the shield.
*Must stay frozen:* the pursuer may never reject a route.

**5. Continue extracting `arrive` / `updateTravel` from the closure.**
*Why:* the remaining untestable surface, and where a rendering defect already hid.
*Risk:* medium — arrival mutates a lot of state.
*Prerequisites:* the same discipline as RUNTIME-BOUNDARY-01: move whole, delegate,
leave no second implementation, re-run the full browser matrix.
*Must stay frozen:* all product behaviour; the extraction must be invisible.

**6. Bring browser smoke automation into a supported workflow.**
*Why:* the only coverage of the runtime closure is currently manual.
*Risk:* low to the product, real to CI time and dependency weight.
*Prerequisites:* a decision on adding Playwright as a devDependency.
*Must stay frozen:* `npm test` must remain fast and browser-free unless
deliberately changed.

**7. SDK / host integration preparation.**
*Why:* eventual embedding in the wider MathForge host.
*Risk:* high if attempted before the above settle.
*Prerequisites:* everything above stable; a host contract from the platform side.
*Must stay frozen:* the whole product surface. Integration should be an adapter
around this game, not a change to it.

---

## INSTRUCTIONS FOR THE NEXT AI STUDIO CODER

- **Start from the authoritative branch and commit** named at the top of this
  document. Nothing else is authority.
- **Do not use an older Gemini workspace as authority.** Those workspaces are
  retired. Snapshots and zips circulating elsewhere are not the source of truth.
- **Do not recreate old bot architectures.** Earlier bot systems accumulated
  unstable planners, incompatible geometry assumptions and fake diagnostics, and
  were removed deliberately. The current pursuer was built fresh against the
  accepted geometry.
- **Read in this order:** this document, then
  `CIRCUIT_CLIMB_FIRST_MOVE_FORENSIC_AUDIT_01.md`, then
  `CIRCUIT_CLIMB_PURSUER_BASELINE_01_FREEZE.md`, then
  `CIRCUIT_CLIMB_PURSUER_BEHAVIOUR.md` and `CIRCUIT_CLIMB_PURSUER_TRACE.md`.
- **Run the full test suite before your first edit**, so you know the baseline
  you inherited was green.
- **Run the smoke QA before your first edit**, for the same reason. Unit tests
  cannot tell you the game is clickable.
- **Work one PM-authorised phase at a time.**
- **Never self-authorise the next phase.**
- **Never weaken a lock test to make a change pass.** If a lock fails, the
  product regressed.
- **Return the exact commit SHA after every phase.**

---

## DOCUMENT INDEX

| Document | What it is |
|---|---|
| `CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md` | **this file — current authority** |
| `CIRCUIT_CLIMB_HANDOFF.md` | earlier engineering handoff; still useful, superseded by this |
| `CIRCUIT_CLIMB_FIRST_MOVE_FORENSIC_AUDIT_01.md` | how the game became unplayable while 51 tests passed |
| `CIRCUIT_CLIMB_PURSUER_BASELINE_01_FREEZE.md` | the frozen pursuer baseline and how to restore it |
| `CIRCUIT_CLIMB_CLAUDE_SUCCESSOR_BASELINE_01.md` | the acceptance record for that baseline |
| `CIRCUIT_CLIMB_PURSUER_BEHAVIOUR.md` | pursuer states, tuning, spark avoidance |
| `CIRCUIT_CLIMB_PURSUER_TRACE.md` | the per-frame diagnostic and its alerts |
| `CIRCUIT_CLIMB_MANUAL_QA.md`, `CIRCUIT_CLIMB_BOTLESS_BASELINE_18A.md`, and others | historical record — do not delete |

Historical documents are not superseded in content. They record how the current
state was reached, and the forensic audit in particular explains why the lock
suite must never be weakened.
