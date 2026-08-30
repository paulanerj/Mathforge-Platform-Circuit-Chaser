# CIRCUIT CLIMB — SUCCESSOR SOURCE OF TRUTH — HANDOFF 02

**This is the authoritative document for Circuit Climb.** It supersedes
`CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md`, which is kept only as history.

Written for an engineer or PM with no knowledge of the conversations that
produced the code. If you read one file before touching anything, read this one.

---

## A. IDENTITY

| | |
|---|---|
| Repository | `paulanerj/Mathforge-Platform-Circuit-Chaser` |
| Branch | `claude/circuit-climb-forensic-audit-3s4oyh` |
| Successor ref | `circuit-climb-successor-sot-02` |
| **Accepted PRODUCT SHA** | `c8838c30947c2a561bfc8322a6159e4f28fef61a` |
| **Accepted QA-infrastructure SHA** | `eac8d8337a30d22cd41f09b6d78f0e73474cb390` |
| **Final transfer / SOT-02 SHA** | see `TRANSFER_SHA` below |

### Two authorities, and why the distinction matters

**`c8838c3` is the gameplay authority.** Everything the player experiences —
geometry, learner routing, pursuer, capture, scoring, rendering — is frozen at
that commit.

**`eac8d83` adds supported browser validation and nothing else.** It changed
`package.json`, `package-lock.json`, docs, and files under `tools/`. It did not
touch `geometry/`, `runtime/`, `pursuer/`, `CircuitClimbSurface.tsx`,
`services/`, or any test. This is verifiable:

```bash
git diff --name-only c8838c3 eac8d83 -- \
  src/games/circuit-climb/geometry \
  src/games/circuit-climb/runtime \
  src/games/circuit-climb/pursuer \
  src/games/circuit-climb/tests \
  src/games/circuit-climb/CircuitClimbSurface.tsx
# empty
```

**Do not read the browser-smoke work as a gameplay change.** It is a gate that
proves the gameplay still works; it is not part of it.

The transfer commit adds this document and the AI Studio package. It changes no
source of either kind.

---

## B. WHAT THE PRODUCT IS

A vertical climb. The learner is a blue spark resting on a platform. Each row
above offers three numbered platforms; exactly one completes the equation shown
at the top. Tapping a platform sends the spark along a blue right-angled circuit
route to it. A red pursuer climbs after the learner and ends the run on contact.

### Product contract

These are the accepted behaviours. Changing any of them needs PM authorisation.

| | |
|---|---|
| **Learner** | Blue spark. Carries its current value. |
| **Route** | Blue, right-angled, drawn as it travels. |
| **Powered platforms** | Green once correctly taken; they light the tower behind you. |
| **Pursuer** | Red. Climbs continuously. |
| **Destination, not path** | The learner chooses *where to go*. The route is the game's to compute. A learner never steers around an obstacle. |
| **All three selectable** | LEFT, CENTER and RIGHT are physically reachable whenever the activity offers them. A destination is never removed for being geometrically awkward. |
| **Wrong is selectable** | A wrong platform can be chosen, and choosing it has a physical consequence: it shorts out for that row and the spark returns. Wrongness is never prevented, only answered. |
| **The pursuer cannot veto** | No pursuer position, at any avoidance setting, may remove a legitimate learner route. It may reorder candidate routes; it may never reject one. Locked. |
| **Capture ends the run** | Contact is terminal for that run. Restart is the only way on. |
| **Pause / Resume** | Pause stops the world — the pursuer included — behind an overlay. Resume continues from the same state, not a fresh one. |
| **Restart** | A clean, immediately playable run. |
| **Transit shield** | **On.** A spark mid-route cannot be taken. The learner chose a destination, not a path, so a collision they had no way to avoid is not a fair way to lose. Hesitating still is. Whether this stays the shipped default is an open PM decision (see §H). |
| **Spark avoidance** | On, and rarely consequential — roughly 1 route in 24 has a real choice to make. It reorders candidate routes only. It is not the answer to "the spark flew into the bot"; the transit shield is. |

---

## C. GEOMETRY

### One authority

`src/games/circuit-climb/geometry/circuitClimbGeometry.ts` is the single source
of layout truth. Nothing else defines a world dimension.

```
logicalWidth          600
platformWidth         104
platformHeight         62
playerRadius           32
rowGap                205
routePlatformPadding    8
columns               110 / 300 / 490   (fractions of logicalWidth)
```

The runtime holds a **local mutable `CONFIG`** seeded from this authority.
World framing mutates that local copy; the module constant never changes.

### World framing, 80–120%

A dev-panel slider. `applyViewScale()` derives the current world:

| field | behaviour |
|---|---|
| `rowGap` | × zoom |
| `playerRadius` | × zoom |
| `platformHeight` | × zoom^0.48 |
| `platformWidth` | × (0.98 + 0.02·zoom) — deliberately damped |
| `logicalWidth` | **never scaled** |
| `routePlatformPadding` | **never scaled** |

### Column spacing is derived, not frozen

```
spacing = max(190, platformWidth + 2*(routePlatformPadding + playerRadius) + 6)
```

At the accepted geometry this is `104 + 2*(8+32) + 6` = **exactly 190**, the
shipped spacing. The layout has always been a six-unit minimum interior
corridor; it was written as literals, and stopped being true once world framing
grew the actor. At and below 100% the columns are still exactly 110/300/490.
Above it they open by exactly what the actor's body needs — 203.2 at 120%, with
the row still well inside the world (44.6 → 555.4 of 600).

### Shared actor-safe corridors

`computeActorSafeCorridors(p0, p1, p2, geometry)` is the **one** corridor
authority, used by the learner (via `destinationCorridors`) and the pursuer
alike. It takes the *current* world. Both actors pass their live geometry in, so
they can never compute different physics. Giving the pursuer its own corridor
formula is forbidden — that is precisely how the two fell out of agreement
before.

Only interior corridors B and C have ever existed. Exteriors A and D are
negative at every framing, including 80% and 100%. Learner mobility depends
entirely on the interior corridor, which is why it is now derived rather than
assumed.

### The pursuer consumes current runtime geometry

`captureRuntimeGeometry()` in the runtime snapshots the **local `CONFIG`** into a
`CurrentGameGeometry` and passes it explicitly to `createPursuer()` and to every
`updatePursuer()` call — mirroring what `routingConfig()` has always done for the
learner. `geometry` is a required argument on `createPursuer`, so a caller
cannot silently fall back to module defaults.

**The pursuer's body follows a live framing change.** `updatePursuer()` refreshes
`radius` from the injected geometry every frame, and the collision rects and
bounds clamp read that refreshed value. Measured in-browser off the rendered
collision overlay, changing framing with a pursuer already alive: **26.2 @80% /
32 @100% / 39.3 @120%**, against a constant 32.8 before the repair.

---

## D. LEARNER ROUTING

`src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts` — pure,
deterministic, no side effects, no UI, no sound.

```
planLearnerSelection(world, from, destinationPlatform) -> LearnerSelectionResult
```

Every outcome is explicit and inspectable. The failure this module exists to
prevent had no name at all: the click was simply consumed.

| result | meaning |
|---|---|
| `ok: true` | a route, a landing point, and a travel |
| `NO_DESTINATION_ROW` | the destination's row is not in the world |
| `NO_LEGAL_ROUTE` | candidates were built and none was clear |
| `DEGENERATE_ROUTE` | fewer than two points, or zero total length |

**Guarantees.** No silent consumption — a click always produces a result.
**No zero-length route ever becomes travel**: travel advances until
`distance >= total`, so a total of 0 arrives on the first frame and teleports the
spark, which is the masking behaviour that hid a defect for an entire era of this
project. No unsafe zero-distance fallback. The pursuer is an input to route
*ordering* and never to route *rejection*.

`CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED` is logged on any failure and **must never
appear in normal play**. The browser smoke treats it as fatal.

---

## E. PURSUER

`SEARCH` → `ALERT` → `CHASE`, with `CAUGHT` as the terminal lifecycle state.

| state | behaviour |
|---|---|
| `SEARCH` | sweeping side to side, climbing a whole row at a time toward the last sighting |
| `ALERT` | oriented on a sighting, nearly stopped, for `alertDwellMs` |
| `CHASE` | locked on, full speed |
| `CAUGHT` | terminal for the run |

`BASELINE_PURSUER_TUNING` is frozen and has `senseRadius: Infinity` — it is
always in CHASE and never searches. The SEARCH branch is only reachable with a
finite sense, which is what `ALIVE_PURSUER_TUNING` provides. Anything that does
not explicitly ask for a living pursuer gets the frozen baseline, including the
whole lock suite.

### Diagnostics policy

| signal | policy |
|---|---|
| `CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED` | **fatal.** Never acceptable in normal play. |
| `CIRCUIT_CLIMB_PURSUER_STALLED` | informational. Motionless 45 frames while more than a row away. |
| `CIRCUIT_CLIMB_PURSUER_NOT_CLOSING` | informational. Moving, but the gap has not shrunk over 300 frames while at least 260 units out. Fires in normal play when the learner climbs away from a pursuer that is legitimately behind. See limitation 6. |
| `CIRCUIT_CLIMB_PURSUER_STEP` | verbose flag only; one line per frame. |

The browser smoke reports the informational two as notes and never fails on
them. Changing that is a PM decision.

---

## F. QA

### Two layers

| layer | command | browser | proves |
|---|---|---|---|
| unit | `npm test` | no | geometry, routing, pursuer, the capability locks |
| browser | `npm run test:circuit-climb:browser` | yes | the real app renders and is playable |

`npm test` is deliberately browser-free and runs in about 9 seconds. The browser
layer is opt-in and starts its own dev server — there is nothing to set up.

### Accepted results

```
Unit          20 test files · 206 tests · 206 passing · 0 failed · 0 skipped
Locks         21
Browser smoke 61/61 checks
Fast smoke    9/9 at each of 320, 390, 430, 590, 768
```

### What the browser smoke covers

**Viewport matrix** 320/390/430/590/768 at default framing — surface exists,
renders and is not blank, a playable first move, no route failures, no console
errors.

**Framing matrix** 80/100/120% at 430 — the render assertion, actors on the
board, LEFT/CENTER/RIGHT each selectable, a correct destination resolving, a
wrong one shorting, Restart giving a clean run, and Pause actually stopping the
world (canvas checksum identical across 1.2s, then changing after Resume).

### Two regression gates, both proven by mutation

- **White-screen gate.** `render()` returning early fails "renders, not blank" at
  all five viewports. It reads the canvas back: a drawn board carries hundreds of
  distinct colours, a blank one about one. Note that **clicks keep working while
  the screen is blank** — hit-testing is independent of drawing — which is why
  the render assertion is a separate check and never inferred from a successful
  click.
- **>100% dead-board gate.** Reverting the WORLD-FRAMING-03 repair fails the
  120% block with `NO_LEGAL_ROUTE {candidatesBuilt: 4, candidatesClear: 0}`,
  while 80% and 100% keep passing.

Full guide: `CIRCUIT_CLIMB_BROWSER_SMOKE.md`.

### The fast smoke

`tools/circuitClimbSmoke.mjs` (`npm run test:circuit-climb:smoke`) is kept for
quick single-viewport loops. It does **not** start a server. Superseded for
gating, not deleted.

---

## G. RESOLVED — do not re-open these

**A. Pursuer / runtime geometry divergence off default. RESOLVED
(GEOMETRY-PARITY-02).** The pursuer consumes the runtime's current local
`CONFIG` through an explicit `CurrentGameGeometry`, exactly as the learner
already did.

**B. Live pursuer radius stale after a scale change. RESOLVED
(GEOMETRY-PARITY-02-R4).** `radius` was set once at creation and never
refreshed, so the body stayed at its creation scale while every other
calculation moved. `updatePursuer()` now refreshes it every frame.

**C. Learner dead board above 100% world framing. RESOLVED
(WORLD-FRAMING-03).** Above 100% every destination returned `NO_LEGAL_ROUTE`
and the board was unplayable while still rendering perfectly; it reproduced on
the older accepted baseline too, so it had shipped for the life of the slider.
Column spacing is now derived from actor clearance and the shared corridor
authority takes the current world.

**D. Unsupported, manual-only browser acceptance. RESOLVED
(BROWSER-SMOKE-04).** One command, no prerequisites beyond a Chromium it finds
itself.

---

## H. OPEN LIMITATIONS

None of these are fixed. None block acceptance.

**1. Alive pursuer tuning is provisional.** Set by feel over a handful of runs.
The nine sliders exist to argue with it. It has never been calibrated against
sufficient real play data.

**2. Spark route avoidance is weakly exercised.** Roughly 1 route in 24 has a
real choice. All candidates share a start and a destination and the pursuer is
usually near one of them. Safe and free, but not load-bearing.

**3. `arrive`, `updateTravel` and drawing remain inside the runtime closure.**
The learner routing transaction is testable; these are not. A rendering defect
that hid the platform under the learner at narrow viewports was found by browser
QA, not by a test, and its repair still has no unit lock.

**4. The browser smoke needs an available Chromium.** The workflow is
repository-supported and discovers a browser automatically, but it does not
bundle one. In an environment with no Chromium and no network, it cannot run.

**5. Historical pursuer fixture duplication.** `circuitClimbPursuer.test.ts`,
`circuitClimbPursuerNavigation.test.ts` and others each carry their own
production-row fixture. Newer work shares
`tests/support/circuitClimbProductionFixtures.ts`; the older files were not
migrated.

**6. `NOT_CLOSING` threshold is close to one row gap.** Its 260-unit floor sits
near `rowGap` 205, so a legitimate behind-distance hold trips it. Observed once
per twelve-decision run at 80% and 100%, twice at 120%, at 303–392 units, while
the learner was climbing away from a pursuer that was legitimately behind. It
fires at 100%, where the framing work provably changed no geometry, so it is
this limitation and not a framing defect. Needs a policy/tuning review, not a
silent threshold change.

**Also worth knowing, not a defect:** exterior corridors A and D have never
existed at any framing. Learner mobility rests entirely on interior corridors B
and C. That is unchanged by any recent work, but it makes the interior corridor
a single point of failure — which is why it is now derived from clearance
rather than frozen.

---

## I. NEXT SAFE WORK — informational, nothing authorised

Ranked by current source risk, not by convenience.

**1. Decide the transit-shield product default.** The only item on this list
that changes what a learner experiences, and it is a *decision* rather than an
investigation — cheap to act on, and everything about difficulty tuning depends
on the answer. Ranked first because tuning the pursuer (2) against the wrong
shield policy wastes that work.

**2. Calibrate alive pursuer tuning against real play data.** The largest
gap between what ships and what has been justified. Nine sliders set by feel.
Needs instrumented sessions, not more opinion.

**3. Extract the `arrive` / `updateTravel` runtime seam.** The highest
*structural* risk: the last substantial body of behaviour with no unit
reachability, and the place the one browser-only defect in project history came
from. Ranked below 1–2 only because it is a refactor with no user-visible
payoff, and the browser smoke now covers the blast radius.

**4. Reduce historical fixture duplication.** Cheap, low-risk, and it removes
the trap that once let a green suite validate identity behaviour production did
not have.

**5. Improve spark avoidance — only if play evidence justifies it.**
Deliberately low. It fires rarely and the transit shield already answers the
problem it was built for. Do not touch it on theory.

**6. SDK / host integration preparation.** Sequenced last: integrating a product
whose difficulty curve is still provisional means doing it twice.

---

## J. FROZEN PRODUCT RULES

Changing any of these requires PM authorisation.

1. Geometry lives in one authority. Runtime may derive from it; nothing may
   fork it.
2. Learner and pursuer must never compute different physical corridors.
3. `LearnerSelectionResult` is a contract. No silent consumption, no
   zero-length travel, no unsafe fallback.
4. The pursuer may reorder learner routes. It may never remove one.
5. All three destinations stay selectable whenever the activity offers them.
6. Wrong destinations stay selectable and keep a physical consequence.
7. Collision is real. No point collision, no routing through platforms.
8. **A capability lock is a stop sign.** If one goes red a working behaviour has
   been lost — fix the product, never the lock.
9. Default 100% framing geometry is frozen: columns 110/300/490, and the
   accepted constants in §C.
10. Diagnostics are never suppressed to make a gate green.

---

## K. FOR THE NEXT CODER

### Onboarding

1. Read this document.
2. `npm install && npm test` — expect 20 files / 206 tests / 206 passing.
3. `npm run test:circuit-climb:browser` — expect 61/61.
4. `npm run dev`, open the app, play it. Move the World framing slider.
5. Skim `circuitClimbGeometry.ts` and `circuitClimbLearnerRouting.ts`.

### Working rules

- **Geometry change** → update the authority, re-verify all 21 locks and the
  browser smoke at 80/100/120.
- **Routing change** → maintain the `LearnerSelectionResult` contract; add tests.
- **Pursuer change** → the locks are the contract; do not tune to make a test
  pass.
- **Never weaken a test to go green.** Fix the product.
- **Build success is not acceptance.** A white screen has shipped behind a green
  build in this project. Run the browser smoke.
- **Commits** small, testable, full suite green.

### Document index

| file | role |
|---|---|
| `CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md` | **this file — the authority** |
| `CIRCUIT_CLIMB_BROWSER_SMOKE.md` | browser workflow guide |
| `CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md` | historical, superseded |
| `CIRCUIT_CLIMB_FIRST_MOVE_FORENSIC_AUDIT_01.md` | historical audit |
