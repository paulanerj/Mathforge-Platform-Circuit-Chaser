# CIRCUIT CLIMB — ENGINEERING HANDOFF

Written for whoever picks this up next. It assumes you have not read the
conversation that produced it.

## Where things stand

The surface arrived unplayable: clicking any platform did nothing. It now plays,
and a red pursuer hunts the learner and catches them.

Four repairs and one feature, in order:

1. **Learner selection restored.** Every click was dead — not the first one, all
   of them. Diagnosis in `CIRCUIT_CLIMB_FIRST_MOVE_FORENSIC_AUDIT_01.md`.
2. **Pursuer unjammed.** It climbed one row and stopped.
3. **Capture.** It reaches the player and ends the run.
4. **Behaviour.** SEARCH / ALERT / CHASE, with a dev tuning panel.
5. **Spark route avoidance**, plus an optional shield for a spark in transit.

## Read these first, in this order

| Document | Why |
|---|---|
| `CIRCUIT_CLIMB_FIRST_MOVE_FORENSIC_AUDIT_01.md` | How the game came to be completely unplayable while 51 tests passed. The most important document here. |
| `CIRCUIT_CLIMB_PURSUER_BASELINE_01_FREEZE.md` | What is frozen, and how to get back to it. |
| `CIRCUIT_CLIMB_PURSUER_BEHAVIOUR.md` | The pursuer's states, every tuning knob, and the spark avoidance rules. |
| `CIRCUIT_CLIMB_PURSUER_TRACE.md` | The per-frame bot log and how to download it. |

## The map

```
src/games/circuit-climb/
  geometry/circuitClimbGeometry.ts     the shared geometry authority — do not fork it
  runtime/useCircuitClimbPrototypeRuntime.ts   the game loop, ~2300 lines, one closure
  runtime/circuitClimbRuntimeRules.ts  small pure rules lifted out so they can be tested
  pursuer/circuitClimbPursuer.ts       navigation + behaviour state machine
  pursuer/circuitClimbPursuerTuning.ts every number that shapes how the bot feels
  pursuer/circuitClimbPursuerTrace.ts  the per-frame diagnostic
  CircuitClimbSurface.tsx              HUD, overlays, the dev panel
  tests/                               16 files
```

## Running it

```
npm install
npm run dev      # http://localhost:3000  -> Circuit Climb -> START PROTOTYPE
npm run lint     # tsc --noEmit
npx vitest run   # 135 tests
```

## Three things to know before you change anything

**1. The lock suite is a stop sign.**
`tests/circuitClimbLockedCapabilities.test.ts` is not unit tests of
implementation detail. Each case locks a capability that cost a forensic audit
and several repairs, and each names the failure it prevents. If one goes red, a
working behaviour has been lost. **Fix the code, do not update the test.**

**2. Never let anything reject a route.**
`buildCircuitPath` returning null is the failure mode that made the whole game
unclickable, silently, with no console error. The pursuer is deliberately kept
out of `isPathClear` for this reason: it may reorder routes, never remove one.
Keep it that way.

**3. Geometry has one home.**
Route altitudes and collision inflation must agree. They drifted apart once —
the crossing altitude used `routePlatformPadding` while the rects were inflated
by `routePlatformPadding + playerRadius` — and every route in the game was
rejected by construction. Both now live in `circuitClimbGeometry.ts` and a test
holds them together across all five view scales. Do not compute either one
anywhere else.

## Debugging the bot

```js
localStorage.setItem('circuitClimbPursuerTrace', '1');   // then reload
```

Per-frame decisions to the console, and a **Download bot log (.json)** button in
the gear panel. A pursuer motionless more than a row from the player raises
`CIRCUIT_CLIMB_PURSUER_STALLED` with the full decision that produced it. Both
navigation bugs above were found this way in one run each, after being invisible
to source reading.

## Dev panel

Gear icon, top right. Persists to `localStorage`.

- **World framing / circuit corners** — the original view tuner
- **Spark avoidance** (0–1) — how hard the route steers around the bot
- **Shield spark in transit** — when on, only a landed spark can be caught
- **Bot behaviour** — Alive, or Locked baseline (the frozen pursuer, live switch)
- **Nine bot sliders** — speeds, sense and lose radii, hesitation, sweep, jitter, climb reserve
- **Download bot log**

## Known and outstanding

- **Pursuer geometry divergence returns off-default.** The pursuer reads the
  module constants (radius 32, rowGap 205). At the default 100% view scale the
  runtime world is identical, so they agree. Move the world-framing slider and
  they diverge again — the pursuer keeps reasoning in 100% units. Either feed the
  runtime values in, or accept that the slider is a dev tool.
- **Tuning is provisional.** `ALIVE_PURSUER_TUNING` numbers were set by feel over
  a handful of runs. They are the sliders' reason to exist.
- **Spark avoidance rarely fires.** Measured at roughly 1 route in 24. All
  candidate routes share a start and a destination, and the bot is usually near
  one of those. It is safe and free, but it is not the answer to "the spark flew
  into the bot" — the shield is.
- **No test covers the runtime closure.** `buildCircuitPath`, `selectPlatform`
  and travel are unreachable from tests because they live inside the hook.
  Everything provable was pushed out into `geometry/` and `runtime/
  circuitClimbRuntimeRules.ts`; the rest is covered only by browser runs. If you
  do one piece of structural work, make this it.
- **Browser checks are manual.** They were driven with Playwright from a scratch
  directory that is not in the repo. `CIRCUIT_CLIMB_PURSUER_BASELINE_01_FREEZE.md`
  lists the checks that were actually run.
- **The freeze tag was never pushed.** The remote refused it (HTTP 403 — branch
  refs only from that session). Commit `0eff8f8` is the freeze point:
  `git tag -a circuit-climb-pursuer-baseline-01 0eff8f8 -m "..." && git push origin circuit-climb-pursuer-baseline-01`

## Product rules that are decisions, not accidents

- Mathematical correctness must **never** decide whether a platform can be
  selected. A wrong platform is a legitimate destination that shorts on landing.
- The learner picks a **destination**, not a path. That is why a collision they
  could not avoid is a design problem, and why the shield exists.
- Capture ends the run. No lives, no scoring change. This was authorised
  explicitly and supersedes the original "no capture" non-goal.
