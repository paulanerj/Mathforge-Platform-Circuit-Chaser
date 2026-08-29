# CIRCUIT CLIMB —
# INDEPENDENT FIRST-MOVE FAILURE FORENSIC AUDIT — 01

**Date:** 2026-08-29
**Scope:** Phase 0 read-only forensic audit. **No production source was modified.**
**Method:** Independent source audit + git bisect + instrumented Chromium reproduction of the real
pointer path. No previous coder claim was accepted without reproduction.

---

## HEADLINE — THE HANDOFF'S PRIMARY HYPOTHESIS IS WRONG

Three findings overturn the framing supplied in the handoff. All three are reproduced, not argued.

1. **The first-move failure is NOT a pursuer-era regression.**
   It reproduces identically in the PM-accepted baseline **SOT (15)**. Bisect isolates the breaking
   commit as `c0ad332` — which *is* SOT (15) itself, the last commit of the geometry era.

2. **The platform-identity defect (Sections T/U) is real but is NOT the cause of the dead click.**
   Both `pathIsClear` exceptions are `continue` statements. `undefined === undefined` making them
   match every platform can only make collision **more permissive**, never less. It cannot produce a
   null route. Verified empirically with production-shaped objects (§9).

3. **Routing has been failing for every move since before `c0ad332`.** It was masked by the
   `return [from, from]` zero-length fallback, which made `arrive()` fire on the first frame and
   **teleported** the player. `c0ad332` correctly removed that unsafe teleport (Section N items 4/5)
   and thereby converted a pre-existing 100% routing failure into a visible dead click.

**The true root cause is a single unit mismatch:** `buildSteppedRoute` computes its crossing
altitude using `routePlatformPadding` only, while `computePlatformCollisionRects` inflates rects by
`routePlatformPadding + playerRadius`. Every generated route therefore starts *inside* the
destination row's collision band **by construction**, and is rejected.

---

## 1. CURRENT SOT HASH VERIFICATION

Working tree = branch `claude/circuit-climb-forensic-audit-3s4oyh` @ `875497c`.
All five Section-W key files verified byte-identical, from three independent sources
(Section W manifest / repository working tree / uploaded SOT projection):

| File | SHA-256 | Matches W | Matches upload |
|---|---|:--:|:--:|
| `runtime/useCircuitClimbPrototypeRuntime.ts` | `579770f1445b53fad00ca1e0bded32cf406b0017b92ada3fd5c27507ace77d40` | YES | YES |
| `geometry/circuitClimbGeometry.ts` | `b5203a817316f8b85298488f01a653a0445ee63ff11dc915dade6cffb43e7646` | YES | YES |
| `pursuer/circuitClimbPursuer.ts` | `68ead3f868241a38adcf13a4db8e4544cb030bc8c06f44df3b94a28b12ef2145` | YES | YES |
| `tests/circuitClimbPursuer.test.ts` | `28ac9b97db926149643b2d8377c7f40f32c9683008eb8b3caab734bf648225b2` | YES | YES |
| `tests/circuitClimbGeometry.test.ts` | `d43faa29de7740313d58db764bd03c42a71fee5f6c87d23a3bcbb8bf9001f7fd` | YES | YES |
| `tests/circuitClimbTerminalLanding.test.ts` | `ab837014fae56e9550c7ccb723af830143cf6993133fed80c0692c1d53d2c969` | YES | YES |

**Verdict: the repository IS SOT (20).** The archive-level SHA-256
`cf3c16ea…8771ac` could not be verified — the `.zip` was not supplied to this session (only the
text projection `reactexample_SOT_12.txt`). File-level verification is stronger and is complete.

## 2. ACCEPTED BASELINE HASH VERIFICATION

The SOT (15) `.zip` was likewise not supplied. It was identified in git history by its documented
fingerprint and confirmed on three independent criteria:

- **Commit `c0ad332`** ("fix: refine terminal landing collision detection")
- Circuit Climb test inventory: **8 files / 40 tests** — exactly Section O
- No `pursuer/` directory; no `circuitClimbPursuer.test.ts`
- `circuitClimbGeometry.test.ts` and `circuitClimbTerminalLanding.test.ts` hashes at `c0ad332`
  are **identical to SOT (20)** — confirming pursuer-era work never touched them

**`c0ad332` is SOT (15)** and was used as the forensic comparison baseline throughout.

## 3. EXACT SOT20-vs-SOT15 DIFF SCOPE

```
geometry/circuitClimbGeometry.ts                |  10 +-
pursuer/circuitClimbPursuer.ts                  | 142 ++ (new)
runtime/useCircuitClimbPrototypeRuntime.ts      |  61 +-
tests/circuitClimbPursuer.test.ts               | 185 ++ (new)
4 files changed, 393 insertions(+), 5 deletions(-)
```

Three pursuer-era commits: `0e9b780` (pursuer logic), `e1ac17d` (speed/culling),
`875497c` (obstacle navigation). Production changes outside the pursuer module are confined to:

- `pathIsClear` — added the `sourcePlatform` exception (10 lines)
- `isPathClear` — now always passes an options object incl. `sourcePlatform: player.platform`
- `cullWorld` — `keepBehind` now derives from pursuer row
- pursuer creation, per-frame update, and `drawPursuer`

**No world constant was changed. Section J geometry is intact in SOT (20).**

## 4. CURRENT TEST INVENTORY

SOT (20): **9 files / 51 tests** (SOT 15: 8 / 40; delta = the 11 new pursuer tests).

| File | Tests |
|---|--:|
| canvasPalette.test.ts | 2 |
| circuitClimbGameLogic.test.ts | 8 |
| circuitClimbGeometry.test.ts | 7 |
| circuitClimbMathAdapter.test.ts | 2 |
| circuitClimbNumberTransition.test.ts | 9 |
| circuitClimbPursuer.test.ts | 11 |
| circuitClimbSequenceStress.test.ts | 1 |
| circuitClimbTargetReveal.test.ts | 5 |
| circuitClimbTerminalLanding.test.ts | 6 |

**Zero tests exercise `buildCircuitPath`, `buildSteppedRoute`, `selectPlatform`, travel creation, or
production `makeRow()` output.** (Verified by grep across `tests/`.) The entire route-generation →
collision integration — where the game is 100% broken — is untested. This is precisely why 51 green
tests coexist with an unplayable game.

## 5. LINT / TEST / BUILD RESULT (AS-IS, UNMODIFIED SOT 20)

- `npx tsc --noEmit` → **exit 0, clean**
- `npx vitest run` → **11 files / 76 tests, all passing** (whole repo; 9 files / 51 tests for Circuit Climb)
- `npx vite` dev server → starts clean, app loads, canvas renders

**All green. The game is nonetheless completely unplayable.** This is the core governance finding:
the current suite cannot detect total gameplay failure.

## 6. MANUAL REPRODUCTION RESULT

Chromium 1194, real `pointerdown` dispatched at pixel-detected platform centres, verified via
`document.elementFromPoint` to land on `CANVAS#gameCanvas`, and confirmed received by the canvas
listener.

| Build | Column | Result |
|---|---|---|
| SOT (20) | LEFT / CENTER / RIGHT | **DEAD CLICK** — no travel, no message, no state change |
| SOT (15) `c0ad332` | CENTER | **DEAD CLICK** — identical |
| `9ab8a10` (pre-`c0ad332`) | CENTER | "works" — but by **zero-length teleport**, see §12 |

Reproduced at viewport widths 320 / 390 / 430 / 590 / 768 and at view scales 80% and 100%.
**Owner's report is fully confirmed, and it is not scale-, width-, or column-dependent.**

## 7. POINTER-CHAIN TRACE

Instrumented trace from SOT (20), CENTER platform, 430×900 (traced on a throwaway worktree copy;
production source untouched):

```
pointerdown        {engineStarted:true, enginePaused:false, hasTravel:false}   OK
pointerPosition    {x:299.18, y:703.43}  worldScale 0.61  playerRow 0  rowAbove 1   OK
hit-test           col 1 box x[239.2,360.8] y[669.7,755.4]  -> HIT                  OK
selectPlatform     {col:1,row:1,dead:false,playerRow:0,mode:'circuit'}              OK
buildCircuitPath   from {300,-28.6} to {300,-192.6} destRow 1
                   corridors B[201.8,208.2] w6.4 · C[391.8,398.2] w6.4  preferred B
  corridor B       clear=false   blocked seg1 (300,-28.6)->(300,-91.30) by row1/col1
  corridor B(dup)  clear=false   same
  corridor C       clear=false   same
  fallback edge    clear=false   same
buildCircuitPath   RETURNS NULL                                                     FAIL
selectPlatform     BAIL routeNull  -> platform.selected=false; return               DEAD
```

Everything upstream of route generation is **healthy**: pointer capture, inverse world transform,
`rowAbove()`, hit-testing, `selectPlatform` guards, source/destination detection.

## 8. EXACT POINT AT WHICH FIRST SELECTION FAILS

`useCircuitClimbPrototypeRuntime.ts:1010` — `buildCircuitPath` returns `null` after every corridor
candidate *and* the edge fallback are rejected by `isPathClear`. Control returns to
`selectPlatform` (line ~1058), which hits `if (!points) { platform.selected = false; return; }` —
**a silent return before `setMessage` and before `travel` is assigned.** No travel, no message, no
console output. This is exactly the observed "nothing happens".

### The geometry of the failure

`computePlatformCollisionRects` inflates each platform by `pad = routePlatformPadding + playerRadius`.
`buildSteppedRoute` computes its crossing altitude as:

```ts
crossingStartY = destinationRow.y + platformHeight + routePlatformPadding + 9;   // playerRadius MISSING
```

The destination row's collision rect bottom is at `destinationRow.y + platformHeight + pad`.
The crossing altitude is therefore **inside** the destination row's collision band at every
supported view scale:

| View scale | playerRadius | dest rect bottom (offset) | crossing altitude | inside by | free band available |
|---|--:|--:|--:|--:|--:|
| 80% (default, see §16-B) | 25.6 | +89.3 | +72.7 | **16.6** | 41.1 |
| 90% | 28.8 | +95.7 | +75.9 | **19.8** | 52.0 |
| 100% (accepted) | 32.0 | +102.0 | +79.0 | **23.0** | 63.0 |
| 110% | 35.2 | +108.1 | +81.9 | **26.2** | 74.2 |
| 120% | 38.4 | +114.1 | +84.7 | **29.4** | 85.5 |

Because the player always stands on a platform in the **same column** as one of the next row's
platforms, the very first vertical rise (or the first corridor rise, at 100%) enters that band and
is rejected. This is unconditional: **every move of every game is affected, not only the first.**

This is the unrepaired side effect of the Section N item 1 hardening — rects were inflated by the
actor radius, but the route generator's altitudes were never brought into agreement.

## 9. PLATFORM IDENTITY AUDIT — CONFIRMED DEFECT, WRONG SUSPECT

`makeRow()` (line 425) creates platforms with keys:
`row, column, x, y, width, height, value, correct, dead, powered, selected, litAt` — **no `id`.**
Rows get `id: row-${index}`; platforms do not. Section T/U is factually correct.

Verified against the real geometry module using an object literal identical to production's:

```
production platform keys : row,column,x,y,width,height,value,correct,dead,powered,selected,litAt
center.id                : undefined
source.id === center.id  : true            <-- unrelated platforms compare EQUAL

segment clipping the LEFT platform's top padding, sourcePlatform = row-0 CENTRE platform:
  without sourcePlatform option : false    (correctly blocked)
  with    sourcePlatform option : true     (exception leaks onto an unrelated platform)
```

**Direction of the defect is the opposite of the handoff's hypothesis.** Both exceptions are
`continue` statements — they can only *skip* a collision. A universally-true identity match therefore
makes `pathIsClear` **more permissive**, and can never turn a clear path into a null route.

Independent confirmation from the bisect: SOT (15), which has **no** `sourcePlatform` exception at
all, fails *earlier* — blocked by the **source** platform (row 0 / col 1) rather than the
destination. The broken identity is currently doing accidental work, not causing the failure.

It is still a genuine defect and must be fixed as part of any repair: as shown above, it strips the
top-padding collision from **every** platform, which is a real (currently invisible) collision
weakening.

## 10. SOURCE-PLATFORM EXCEPTION AUDIT

Added in `875497c`. Intent is legitimate and necessary: the player's resting position is
`platform.y - playerRadius - 3`, while the source rect top is `platform.y - routePlatformPadding -
playerRadius`. The player therefore always sits **exactly 5 units inside** its own platform's
inflated rect. Without a source exception, *no* route can ever leave the starting platform — which is
precisely why SOT (15) blocks at the source.

Defects in the current implementation:
- identity comparison is `undefined === undefined` → applies to **all** platforms (§9)
- it is applied on **every** segment, not just those leaving the source
- `stricterRect` naming is inverted — it is a *looser* rect (top raised from `y - pad` to `y`)

**Verdict:** keep the mechanism, fix the identity. It is not the blocker.

## 11. DESTINATION-PLATFORM EXCEPTION AUDIT

Pre-dates the pursuer era; tightened in `c0ad332` to require an exact `landingPoint` match.
Gated on `isTerminalSegment` — so it cannot help any earlier segment, and does not participate in
the failure. Its identity check has the same `undefined === undefined` flaw, meaning on the terminal
segment the exception can be granted to a **non-destination** platform. Latent, not currently
triggered. Fix alongside §9.

## 12. CURRENT ROUTE-NULL REASON — AND WHAT `c0ad332` ACTUALLY CHANGED

Bisect over the geometry era, identical harness, CENTER platform, 430×900:

| Commit | Subject | First move |
|---|---|---|
| `6e9c482` | powered platform visual feedback | accepted |
| `f584480` | adjust geometry and corridor logic | accepted |
| `31e5f84` | centralize geometry constants | accepted |
| `9ab8a10` | move platform collision logic to geometry utils | accepted |
| **`c0ad332`** | **fix: refine terminal landing collision detection** | **DEAD CLICK** |
| `0e9b780` … `875497c` | pursuer era | DEAD CLICK |

Instrumenting `9ab8a10` — the last "working" commit — shows *why* it appeared to work:

```
TRACE:PRE corridor B clear= false
TRACE:PRE corridor B clear= false
TRACE:PRE corridor C clear= false
TRACE:PRE *** ALL ROUTES FAILED -> RETURNING ZERO-LENGTH [from,from] TELEPORT FALLBACK ***
TRACE:PRE travel created points= 2 totalDistance= 0
```

Routing failed there too. `buildCircuitPath` returned `[from, from]`; `updateTravel` then evaluates
`travel.distance >= travel.total` with `total = 0`, which is true on the first frame, so `arrive()`
fires immediately and the player **teleports** onto the platform.

`c0ad332` replaced `return [from, from]` with `return null` and added the `!points` guard. That
change is **correct** and should be kept — it removed an unsafe teleport. But it removed the mask
without repairing the routing underneath, and SOT (15) was accepted in that state.

**Root-cause ownership: the routing/collision unit mismatch (§8). `c0ad332` is the commit that made
it visible, not the commit that created it.**

## 13. CULLING INTERACTION FINDING

```ts
const pursuerRow = pursuer ? Math.max(0, Math.floor(-pursuer.y / CONFIG.rowGap)) : player.row;
const keepBehind = Math.min(player.row - 2, pursuerRow - 1);
rows = rows.filter((row) => row.y < bottom || row.index >= keepBehind);
```

While the pursuer is at or below world row 0 (`pursuer.y >= 0`), `pursuerRow` clamps to `0`, so
`keepBehind` becomes `-1` for any `player.row > 1`. Every row then satisfies `index >= -1` and
**row culling is effectively disabled**: `rows` grows without bound, and `getActivePlatforms()` — used
by both the learner's `isPathClear` and the pursuer's own collision — grows with it.

**Not a cause of the first-move failure** (SOT 15 fails identically with no pursuer at all, and
nothing is culled on the first move). It is a real pursuer-era regression in memory and per-frame
collision cost, and it must be corrected before pursuer work resumes.

## 14. PURSUER SIDE-EFFECT FINDING

`updatePursuer` is **read-only** with respect to rows and platforms — it mutates no learner state
(verified by source read). It cannot corrupt the learner's geometry. Genuine issues found:

- **Radius mismatch.** Pursuer uses `CIRCUIT_CLIMB_GEOMETRY.playerRadius` (32, module constant)
  while the learner runs on `CONFIG.playerRadius` (25.6 at the default view scale). The two actors
  are physically different sizes, contradicting the "approximately same radius as player" intent.
- **Start offset mismatch.** `createPursuer` uses the module `rowGap` (205); the runtime's actual row
  spacing at the default scale is 164. The pursuer starts 2.5 runtime rows behind, not 2.
- **No reflow.** `reflowWorldForView` rescales rows, traces, particles, travel and player on a view
  scale change but never touches the pursuer, which then desynchronises from the world.
- **Per-frame allocation.** `computePlatformCollisionRects` over all active platforms is rebuilt every
  frame, compounding §13.

## 15. TEST-vs-PRODUCTION MISMATCH FINDINGS

1. **Fixtures are richer than production.** `circuitClimbPursuer.test.ts` and
   `circuitClimbTerminalLanding.test.ts` build platforms with `id: 'p1'`, `id: 'p0_0'`, … Production
   platforms have no `id`. Every identity assertion validates a shape production does not possess —
   the exact divergence Section V warned about, confirmed.
2. **Fixtures use the wrong constants.** Tests use module `CIRCUIT_CLIMB_GEOMETRY` values
   (radius 32, rowGap 205, platformWidth 104). Production runs on the view-scaled runtime `CONFIG`
   (25.6 / 164 / 103.58 by default). The pursuer suite never exercises production's real numbers.
3. **Formulas are re-derived, not imported.** Pursuer test H computes
   `100 + platformHeight/2 + playerRadius + routePlatformPadding + 1` — an invented expression with
   no counterpart in `computePlatformCollisionRects`. It places the pursuer *inside* the rect, so it
   passes by proving "cannot move while already embedded", not "cannot cross".
4. **Empty-world tests.** Pursuer test F calls `updatePursuer(..., [], delta)` with no platforms;
   production always has platforms.
5. **The decisive gap.** No test constructs a production row, selects a platform, and asserts a route
   exists. That single missing test is the whole reason the fix→regression loop has persisted.

## 16. RANKED ROOT CAUSES

### CONFIRMED (reproduced, with evidence)

**A. Route crossing altitude ignores `playerRadius` while collision rects include it.**
`buildSteppedRoute`'s `crossingStartY` omits `CONFIG.playerRadius`, placing every generated route
inside the destination row's actor-inflated collision band by 16.6–29.4 units at every supported view
scale. `buildCircuitPath` therefore returns `null` for **every** selection. **This is the blocker.**

**B. Fresh-install default view scale and route-turn count are wrong.**
```ts
const saved = Number(window.localStorage.getItem('circuitClimbViewScale'));
if (Number.isFinite(saved)) return clamp(saved, 80, 120);
return 100;   // dead code
```
`getItem` returns `null` on a fresh install → `Number(null)` is `0` → `Number.isFinite(0)` is `true`
→ `clamp(0, 80, 120)` = **80**. Every new player runs at 80% view scale, never the documented 100%.
`readSavedRouteTurns` has the identical bug: `clamp(Math.round(0/2)*2, 6, 12)` = **6**, not 8.
Consequence: `CONFIG.playerRadius` = 25.6 and `rowGap` = 164 in production, while
`computeActorSafeCorridors` still reasons with the module's 32 — the two geometry authorities
disagree at runtime. Independent of A (A reproduces at 100% too) but must be fixed with it.

**C. Production platforms have no identity.** §9. Currently *weakens* collision globally rather
than causing the dead click, but it is a real defect and blocks any correct source/destination
exception.

**D. `9ab8a10` and earlier "worked" only via a zero-length teleport.** §12. The pre-`c0ad332`
baseline was never actually routing.

### HIGH CONFIDENCE

**E. Culling disabled while the pursuer is below row 0** (§13) — unbounded row growth.
**F. Pursuer/learner radius and rowGap divergence** (§14).
**G. Route-integration test coverage is absent** (§4, §15) — the mechanism that allowed this to ship.

### POSSIBLE

**H.** `applyViewScale` mutating a runtime `CONFIG` clone while shared helpers read module constants
is a structural second-authority risk beyond the default-value bug in B. Worth a design decision;
no gameplay symptom proven beyond B.

### RULED OUT (with evidence)

- **Pursuer-era work as the cause of the dead click** — SOT (15) fails identically (§6, §12).
- **The `sourcePlatform` identity bug as the cause** — it is a `continue`; it can only loosen
  collision. Demonstrated empirically (§9).
- **Pointer transform / `worldScale` / hit-test error** — traced healthy; `elementFromPoint` and the
  canvas listener both confirm delivery, and `TRACE:hit column 1` fires (§7).
- **Pursuer mutating learner state** — `updatePursuer` is read-only over platforms (§14).
- **A thrown exception** — no `pageerror`, no Circuit-Climb-origin console error in any run. The only
  console error is an unrelated 404. The AI Studio noise in the supplied log is not connected.
- **Accepted world constants (Section J)** — unchanged in SOT (20) and not implicated.
- **Math generation** — unaffected; `makeRow` snapshots are valid throughout.

## 17. SMALLEST RECOMMENDED REPAIR — VALIDATED

Two lines. Applied to a throwaway worktree and exercised end-to-end:

```diff
       const platforms = CONFIG.columns.map((fraction, column) => ({
+        id: `row-${index}-column-${column}`,
         row: index,
         column,
@@
       const crossingStartY =
         destinationRow.y +
         CONFIG.platformHeight +
         CONFIG.routePlatformPadding +
+        CONFIG.playerRadius +
         9;
```

Change 1 gives platforms deterministic, stable identity created at creation time, derived from row
and column, not from mutable coordinates — as Section AB requires — so the source and destination
exceptions apply to exactly one platform each.

Change 2 lifts the crossing altitude clear of the actor-inflated collision band, restoring agreement
between the route generator and `computePlatformCollisionRects`. It adds **no** new constant, changes
**no** Section J value, and there is 41.1–85.5 units of free band at every supported view scale
(§8 table), so it clears with 9 units of margin everywhere.

### Validation performed on the patched copy

- `npx tsc --noEmit` → clean
- `npx vitest run` → **76/76 passing** (no existing test broken)
- Browser, real pointer clicks: **8 consecutive learner moves**, all three columns, `routeNull = 0`,
  visible travel of 194–432 world units on every move
- Correct answers resolve and power the platform (green, power symbol, numeral hidden); wrong
  answers travel and perform the existing wrong-return behaviour — both remain selectable
- Widths **320 / 390 / 430 / 590 / 768** → all PASS
- View scales **80% (default) and 100% (accepted)** → both PASS
- No Circuit-Climb-origin console error in any run

This does **not** yet cover items B, E, F, or the acceptance-gate steps for Pause/Resume/Restart —
see §19 and §22.

## 18. FILES THAT WOULD NEED MODIFICATION

| File | Change | Priority |
|---|---|---|
| `runtime/useCircuitClimbPrototypeRuntime.ts` | `makeRow` platform `id`; `crossingStartY` + `playerRadius` | **P1 — blocker** |
| `runtime/useCircuitClimbPrototypeRuntime.ts` | `readSavedViewScale` / `readSavedRouteTurns` null-vs-0 defaults | P2 |
| `runtime/useCircuitClimbPrototypeRuntime.ts` | `cullWorld` `keepBehind` guard | P3 (pre-pursuer) |
| `pursuer/circuitClimbPursuer.ts` | accept runtime radius/rowGap instead of module constants | P3 (pre-pursuer) |
| `geometry/circuitClimbGeometry.ts` | *(optional)* reject undefined identity rather than matching it | P2 — defence in depth |

`geometry/circuitClimbGeometry.ts` needs **no** change for the P1 repair. Section J constants and the
shared-authority model are untouched.

## 19. TESTS THAT MUST BE CORRECTED / ADDED

**Add (the missing integration test — the one that would have caught this):**
1. Build a row with production `makeRow()`; assert every platform has a unique deterministic `id`.
2. Fresh restart → row 1 exists → LEFT/CENTER/RIGHT are real production platforms → for **each**
   column, `buildCircuitPath` returns a non-null route with ≥ 2 distinct points and total length > 0.
3. Assert the same for a **wrong** destination as for the correct one.
4. Assert no route's total distance is 0 (regression guard against the `[from, from]` teleport).
5. Property test: for each view scale in {80, 90, 100, 110, 120}, `crossingStartY` lies strictly
   below the destination row's rect bottom **as computed by `computePlatformCollisionRects`** —
   importing the production helper, not re-deriving the formula.

**Correct:**
6. `circuitClimbPursuer.test.ts` and `circuitClimbTerminalLanding.test.ts` — remove hand-written `id`
   fixtures; use production `makeRow()` output, or a factory that produces the exact production shape.
7. Pursuer test H — derive bounds from `computePlatformCollisionRects` and start the pursuer *outside*
   the rect so it tests crossing, not embedding.
8. Add at least one pursuer test at the production default view scale, not only module constants.

## 20. ROLLBACK RECOMMENDATION

**None.** A rollback to SOT (15) would restore a build with the identical dead click (§6, §12), and a
rollback to `9ab8a10` would restore the unsafe zero-length teleport that Section N item 4 explicitly
identifies as a defect. **Neither rollback target is healthy.** The pursuer-era diff is small,
architecturally separable, and not implicated in the blocker; there is nothing to gain by reverting it.

## 21. CAN SOT (15) GEOMETRY REMAIN INTACT?

**Yes — entirely.** The validated repair changes no value in Section J:
`logicalWidth 600 · platformWidth 104 · platformHeight 62 · playerRadius 32 · routePlatformPadding 8 ·
rowGap 205 · columns 110/300/490`, rows centre-aligned, staggering off. The collision system is not
weakened, the player radius is not reduced, no second geometry authority is created, and the
powered-platform visual language is untouched. The repair makes a *derived route altitude* agree with
the inflation the geometry module already performs — it is a consistency fix, not a geometry change.

## 22. FINAL RECOMMENDATION

> ### A. LOCAL REPAIR — CURRENT ARCHITECTURE IS SOUND

The shared geometry authority, the responsive logical-world model, the corridor model, the pointer
transform, the math generation, the powered-platform visuals and the failed-route contract are all
**verified healthy**. The blocker is a two-line inconsistency between the route generator and the
collision inflation, plus a missing platform identity — both local, both validated, neither requiring
any change to accepted geometry or any rollback.

**Requested authorisation, in priority order:**

1. **P1 — apply the two-line repair in §17** and land the §19 integration tests. This restores the
   Section AI success condition: owner opens Circuit Climb, clicks a first-row platform, the blue
   player visibly moves.
2. **P2 — fix the `Number(null) === 0` defaults** so production actually runs the accepted 100% /
   8-turn configuration, and decide whether `computeActorSafeCorridors` should take the runtime
   radius (this is the only remaining genuine two-authority divergence).
3. **P3 — before pursuer work resumes:** the `cullWorld` `keepBehind` guard and the pursuer's
   radius/rowGap divergence.

I have **not** implemented any repair in production source, and I am **not** self-authorising the
next pursuer phase, capture, or any state machine. Full acceptance-gate items 10 (Pause/Resume) and
11 (Restart) remain to be exercised under the repair once implementation is authorised.
