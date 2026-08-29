# CIRCUIT CLIMB — PURSUER BASELINE 01 — FREEZE MANIFEST

**Frozen:** 2026-08-29
**Tag:** `circuit-climb-pursuer-baseline-01`
**Purpose:** lock the first configuration in which the learner can play *and* the
pursuer navigates and captures, before behavioural work begins.

Everything below was reproduced in a browser, not asserted from source.

## Capabilities frozen

| # | Capability | Locked by |
|---|---|---|
| 1 | Learner can select LEFT / CENTER / RIGHT on the first row and the spark visibly travels | `circuitClimbLockedCapabilities.test.ts` — crossing-altitude and platform-identity locks |
| 2 | Correct answers resolve and power the platform; wrong answers travel and short it | manual QA below |
| 3 | Accepted world geometry (section J) unchanged | world-constants lock |
| 4 | Interior corridors B and C remain physically usable | corridor lock |
| 5 | Pursuer routes around the row-0 centre platform via an exterior corridor | navigation locks |
| 6 | Pursuer treats the row the player is standing on as an obstacle to cross | `mustCrossRow` lock |
| 7 | Pursuer never ends a frame inside a platform | penetration lock |
| 8 | Pursuer reaches a player standing on a platform and captures | capture lock |
| 9 | Capture requires a real overlap, and a captured pursuer stops dead | capture-distance locks |
| 10 | Bot event log downloads as JSON from the gear panel | manual QA below |

## Frozen file hashes (SHA-256)

| File | SHA-256 |
|---|---|
| `geometry/circuitClimbGeometry.ts` | see `git show circuit-climb-pursuer-baseline-01` |
| `pursuer/circuitClimbPursuer.ts` | " |
| `pursuer/circuitClimbPursuerTrace.ts` | " |
| `runtime/useCircuitClimbPrototypeRuntime.ts` | " |
| `CircuitClimbSurface.tsx` | " |

The tag is the authoritative record; hashes are reproducible from it with
`git show circuit-climb-pursuer-baseline-01:<path> | sha256sum`.

## Test inventory at freeze

11 Circuit Climb test files / 73 tests, all passing. `tsc --noEmit` clean.

## Restoring this baseline

```
git checkout circuit-climb-pursuer-baseline-01 -- src/games/circuit-climb
```

Or, to compare only the pursuer:

```
git diff circuit-climb-pursuer-baseline-01 -- src/games/circuit-climb/pursuer
```

## The lock tests are a stop, not a chore

`circuitClimbLockedCapabilities.test.ts` does not test implementation detail. Each
case locks a capability that cost a forensic audit and three repairs to reach, and
each names the failure it prevents. **If one goes red, a working behaviour has been
lost.** Fix the code, do not update the test.

Two of them exist because the exact bug already happened once:

- *route crossing altitude clears the destination row collision band* — when this
  was violated, `buildCircuitPath` returned null for every candidate and the
  learner could not select any platform at all.
- *a player standing on the row above is treated as an obstacle to cross* — when
  this was violated, the pursuer drove into the underside of the player's platform
  and the chase stopped after one row.

## Manual QA at freeze

Run at 430×900 unless stated.

- [x] Fresh launch, click first-row LEFT → visible travel
- [x] Restart, click first-row CENTER → visible travel
- [x] Restart, click first-row RIGHT → visible travel
- [x] Correct answer resolves, platform turns green with the power symbol
- [x] Wrong answer travels and shorts the platform
- [x] Eight consecutive learner moves
- [x] Widths 320 / 390 / 430 / 590 / 768
- [x] View scales 80% (default) and 100%
- [x] Pursuer routes around row 0 and climbs continuously
- [x] Pursuer captures an idle player (~8.5s) and a climbing player
- [x] Board inert once captured; Restart clears it and play resumes
- [x] Bot log downloads with the full step schema
- [x] No Circuit-Climb-origin console errors in any run

## Known and deliberately not fixed at freeze

- **P2 — fresh-install defaults.** `Number(localStorage.getItem(...))` is `0` on a
  fresh install and `Number.isFinite(0)` is true, so `clamp(0, 80, 120)` yields a
  view scale of **80**, never the documented 100; route turns land on **6**, not 8.
- **Pursuer / runtime geometry divergence.** The pursuer uses the module constants
  (radius 32, rowGap 205) while the runtime world runs view-scaled (25.6 / 164 at
  the default). The pursuer starts 2.5 runtime rows behind, not 2.
- **Culling.** `keepBehind` collapses to -1 while the pursuer sits at or below
  world row 0, so rows are effectively never culled.
