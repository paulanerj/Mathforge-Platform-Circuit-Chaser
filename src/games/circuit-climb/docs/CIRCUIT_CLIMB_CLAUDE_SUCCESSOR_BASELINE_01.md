# CIRCUIT CLIMB — CLAUDE SUCCESSOR BASELINE 01

Acceptance record for the successor baseline. This document does not replace or
revise the historical forensic documents; it records what the product does now
and what was verified to establish it.

## Provenance

| | |
|---|---|
| Repository | `paulanerj/Mathforge-Platform-Circuit-Chaser` |
| Branch | `claude/circuit-climb-forensic-audit-3s4oyh` |
| PM-observed commit | `923b2fc` |
| Acceptance start commit | `0f6eeb9` |
| Repair commit | `c485a20` |
| Final commit | `41a23a7` |

**The acceptance start commit is one ahead of the PM-observed SHA.** `0f6eeb9`
is the search-crawl repair made in response to the "it got lost and just sat
there" report, landed after the PM captured `923b2fc`. Acceptance was run
against `0f6eeb9`, not against the observed SHA.

The portable snapshot SHA-256 quoted in the acceptance brief could not be
verified: no archive was supplied to this session. Commit SHAs are the authority
used throughout.

## Current product behaviour

A vertical arithmetic climb. The learner reads the value carried by their blue
spark and taps whichever of the three platforms on the row above completes the
target sum. The spark routes itself there along a blue plasma filament, lands,
and the next problem arms. A red pursuer hunts the learner from below and ends
the run on contact.

## Player interaction contract

The learner picks a **destination, not a path**. The only input is a tap on a
platform in the active row; there are no movement controls. Route generation,
travel and landing are automatic.

Pointer input is inverse-transformed from display coordinates into the logical
world, so a tap lands where it looks like it lands at every viewport width.

## Correct / wrong contract

**Mathematical correctness never decides whether a platform can be selected.**
Every live platform in the active row is a legitimate destination.

- **Correct** — the spark travels, lands, and the platform powers: green face,
  energised interior, numeral replaced by the power symbol. Its value is kept in
  state. The learner's value advances and the next row arms.
- **Wrong** — the spark still travels and still lands. The platform shorts out,
  goes offline for that row, and the learner chooses again from what remains.
  Message sequence observed: `"4) + 5 = 9"` → `"Short circuit. That platform is
  offline. Choose another."` → `"Tap the platform that completes the equation."`

## Geometry authority

`geometry/circuitClimbGeometry.ts` is the single authority. Accepted values:

```
logicalWidth 600 · platformWidth 104 · platformHeight 62
playerRadius 32 · routePlatformPadding 8 · rowGap 205
columns 110 / 300 / 490 · rows centre-aligned, staggering off
```

Collision rect inflation and the route crossing altitude both live in this file,
beside each other, because they must agree. They once did not — the crossing
altitude used `routePlatformPadding` while rects were inflated by
`routePlatformPadding + playerRadius` — and every route in the game was rejected
by construction, silently. A lock test holds them together across all five view
scales.

## Route-selection invariant

**The pursuer never enters `isPathClear`.** Routes are built and validated by
collision alone. The pursuer is handed the already-approved list and may only
reorder it; it cannot reject a route and cannot empty the list.

This is load-bearing, not fastidiousness. `buildCircuitPath` returning null is
the failure that made the entire game unclickable with no console error. A
pursuer with veto power over routes could reproduce it by standing in the wrong
place.

## Powered-platform behaviour

On a correct landing the platform turns green with an energised interior, the
numeral is replaced by the power symbol, and the value is retained internally.
Dead platforms render as a distinct offline state and are never confusable with
powered. Verified by pixel measurement at every viewport (§ Browser QA).

## Pursuer states currently present

```
SEARCH ──sensed──> ALERT ──hesitation──> CHASE ──contact──> CAUGHT
   ^                  │                     │
   └────────── lost the trail ──────────────┘
```

- **SEARCH** — works from the last sighting, sweeping side to side, always
  climbing. Dim, slow pulse behind a scanning arc.
- **ALERT** — has sensed the learner and is orienting. Bright, near-stationary
  for `alertDwellMs`.
- **CHASE** — locked on, straight at the learner through legal geometry.
- **CAUGHT** — terminal.

A spark in transit breaks the lock, so committing to a platform is what shakes
the pursuer off. All three transitions including `CHASE → SEARCH` were observed
at every viewport.

## Capture contract

Contact ends the run. `PURSUER_CAPTURE_DISTANCE` is centre-to-centre and both
actors carry a radius, so it is a solid overlap rather than a graze. On capture:
red burst, `"Caught by the surge. Press Restart to run again."`, the board goes
inert to pointer input, and everything except the burst freezes.

No lives, no scoring change, no state machine beyond the four states above.
Capture was authorised explicitly by the owner and supersedes the original
handoff's "capture is not currently authorised" non-goal.

## Pause / restart contract

- **Pause** freezes the world and the pursuer and preserves state. Measured
  pursuer drift while paused: **0.00px** at every viewport.
- **Resume** restores motion. Measured movement after resume: 78–174px.
- **Restart** resets player, math, rows, pursuer and capture with no ghost
  state, both mid-run and after a capture.

## Dev-panel status

Gear icon, top right. All settings persist to `localStorage`.

| Control | Purpose |
|---|---|
| World framing / circuit corners | original view tuner |
| Spark avoidance (0–1) | how hard the route steers around the pursuer |
| Shield spark in transit | when on, only a landed spark can be taken (**off** by default) |
| Bot behaviour | Alive, or Locked baseline — switches live, no rebuild |
| Nine pursuer sliders | speeds, sense and lose radii, hesitation, sweep, period, jitter, climb reserve |
| Download bot log (.json) | the full per-frame trace |

**Locked baseline** reproduces PURSUER BASELINE 01 exactly. `createPursuer`
defaults to it, so the lock suite keeps exercising the frozen behaviour whatever
the live tuning becomes.

## Tracing capability

Per-frame pursuer decisions, off by default:

```js
localStorage.setItem('circuitClimbPursuerTrace', '1');   // then reload
```

Two alerts, always active:

- `CIRCUIT_CLIMB_PURSUER_STALLED` — motionless more than a row from the learner.
- `CIRCUIT_CLIMB_PURSUER_NOT_CLOSING` — moving, but the gap has not shrunk over
  300 frames while at least 260 units out. This exists because STALLED requires
  *exact* zero movement, and the crawling pursuer moved every frame.

Both pursuer navigation defects in this project's history were found by reading
this trace, each in a single run, after being invisible to source reading.

## Lock-suite role

`tests/circuitClimbLockedCapabilities.test.ts` — 13 tests. Not unit tests of
implementation detail: one case per capability that cost a forensic audit and
several repairs, each naming the failure it prevents.

**A red lock means a working behaviour has been lost. Fix the code, do not
update the test.**

## Browser QA results

Driven with Playwright against a dev build, from cleared `localStorage`, at
320 / 390 / 430 / 590 / 768. Sixteen checks per viewport, **80 of 80 pass**.

| Check | Evidence |
|---|---|
| First LEFT / CENTER / RIGHT selectable | each from its own fresh run with Restart between; blue displacement 25–67px |
| Correct answer travels and resolves | e.g. `"1) + 9 = 10"`, travel 41px, green 0 → 2132 |
| Wrong answer travels and shorts | e.g. `"9) + 3 = 12"`, travel 41px, full short-circuit message sequence |
| Ten consecutive decisions | 10 accepted, **0 dead clicks**, at every viewport |
| Powered platform | 1049 / 1701 / 2132 / 4270 / 4613 green pixels by viewport |
| Blue route present | 1016–3412 blue pixels |
| Pursuer navigates | 2597–3255 frames, vertical range 615–820, lateral range 177 |
| Pursuer reacts | SEARCH/ALERT/CHASE all seen; 499–749 CHASE frames; most closer to `player.x` than at start |
| Capture occurs | reached at every viewport |
| Capture ends run | board inert to pointer once caught |
| Restart after capture | capture cleared, learner plays again |
| Pause / Resume | 0.00px drift paused; 78–174px after resume |
| Console errors | none at any viewport |

### Driving method — required disclosure

**Clicks are driven from computed world coordinates, not pixel detection.** With
the camera settled the active row always sits at a fixed screen height:

```
screenY(activeRow) = logicalHeight × cameraAnchor + playerRadius + 3 − rowGap
```

Pixel scanning of row underlines was used in earlier phases and **fails at 320**,
where it cannot resolve them, and fails at any width once platforms short out and
lose their underline. It reported 0/3 moves at 320 for a build that was working.
Pixel probing is now used only to read actor positions and colour evidence, never
to aim a click.

## Test results

```
npm run lint     tsc --noEmit          exit 0, clean
npx vitest run   17 files / 144 tests  144 passed / 0 failed / 0 skipped
npm run build    vite build            clean
```

| | files | tests |
|---|--:|--:|
| Repository total | 17 | 144 |
| Circuit Climb | 15 | 119 |
| Other (theme) | 2 | 25 |

**Discrepancy against the handoff's ~135 — resolved.** `0f6eeb9` added
`circuitClimbPursuerSearch.test.ts` with exactly 9 tests. 144 − 9 = 135. The
handoff figure was correct for `923b2fc`; the acceptance figure is correct for
the current head. No tests were removed, skipped or renamed.

## One repair made during acceptance

`c485a20` — platforms were drawn against the CSS pixel height rather than the
logical viewport height. At 320 and 390 the platform the learner stood on was
not drawn at all: the spark floated with its route behind it, and a correct
landing rendered no powered green.

**Not a successor regression.** `git log -S` dates the line to the initial
project commit `d078042`, and the defect reproduces at `2b8e519` — before any
successor change, at the old 80% default — where a correct landing at 320 also
renders zero green. It was invisible at 430 and above only because the player
sits just inside the cull line there.

The full acceptance matrix was re-run after the repair.

## Known limitations — carried forward, not resolved

**A. Pursuer / runtime geometry divergence off default.** At the default 100%
view scale the runtime world is exactly the module constants
(`ROW GAP 205 · PLATFORM 104 · PLAYER 32`, measured), so the pursuer — which
reasons in module constants — agrees exactly. Move the world-framing slider and
they diverge again; the pursuer keeps reasoning in 100% units. **Not fixed.**

**B. Alive pursuer tuning is provisional.** `ALIVE_PURSUER_TUNING` was set by
feel over a handful of runs. The sliders exist to argue with it. **Not fixed.**

**C. Spark avoidance rarely has an opportunity.** Measured at roughly 1 route in
24. All candidate routes share a start and a destination platform, and the
pursuer is usually near one of those. It is safe and free, but it is not the
answer to "the spark flew into the bot" — shielded transit is. **Not fixed.**

**D. The runtime closure resists integration testing.** `buildCircuitPath`,
`selectPlatform`, `travel` and `drawPlatform` are unreachable from tests. Every
provable rule has been pushed out into `geometry/` and
`runtime/circuitClimbRuntimeRules.ts`; the remainder is covered only by browser
runs. The repair in this phase has no unit lock for exactly this reason.
**Not fixed** — deliberately deferred as a possible next structural phase.

**E. Browser checks are external-harness driven.** The Playwright drivers live
in a scratch directory outside the repository and are not committed. There is no
in-repo command that reproduces the browser matrix. **Not fixed.**

### Observation, not a defect

`CIRCUIT_CLIMB_PURSUER_NOT_CLOSING` fired in 2 of 5 viewport runs, at distances
of 268 and 399 units. Its floor is 260 units, close to one `rowGap` of 205, so a
legitimate near-miss hold can trip it. It correctly reported a pursuer that was
not closing in both cases. Threshold tuning was **not** performed in this phase.

## Files changed during the acceptance phase

**Production (1):**
`src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts` — the
`drawPlatform` visibility bound, one expression.

**Documentation (1):** this file.

No other production file was touched. No feature, refactor, visual change,
tuning change or cleanup was made.
