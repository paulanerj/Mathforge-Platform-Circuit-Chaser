# PURSUER INTEGRATION 04A — PRODUCTION PROVENANCE MANIFEST

> The purpose of this document is to make it impossible for a future
> maintainer to wonder whether the production pursuer is actually the accepted
> Lab candidate. Every runtime file is listed with where it came from, what was
> changed, and why.

## AUTHORITIES

| | |
|---|---|
| **Production predecessor** | `dba9e59ddd1ad9976aa9364d2c0713f2a56aa6bc` (tree `d5f6ea984aa95348194a413ccd1d9ad24273cdb0`) |
| **Predecessor branch** | `circuit-climb-search-vertical-reacquisition-07b1` (unchanged) |
| **Integration branch** | `circuit-climb-graph-pursuer-integration-04a` |
| **Lab behavioural authority** | `f22acf63e168807b566a307e83d9c8556de582e1` (tree `e8eb1ce620d617c621a6ffb3a98463c97f5a0d4d`) |
| **Lab post-freeze head** | `9c59e3ba986d66d352cbd0ff33f5e956d417916a` |
| **Accepted behaviour hash** | `22ddf2074d4e93a5c6a1161a8480f33b93a6566aa36359c390e9553854d95abe` |

`f22acf6` is the behavioural rollback authority. `9c59e3b` adds only freeze
documentation, evidence and build tooling — its single `src/` change is a
log-metadata string inside a pure serialization function, and it reproduces the
same behaviour hash. Every blob below is taken from **`f22acf6`**.

## CLASSIFICATION OF THE LAB TREE

| Class | Meaning | Entered production? |
|---|---|---|
| **A** | production-candidate Graph V2 | yes |
| **B** | production-candidate Brain | yes |
| **C** | neutral/shared contracts the candidate needs | yes |
| **D** | Lab-only simulation/harness | no (one parity-harness copy, test-only) |
| **E** | Oracle / debug-only | **no** |
| **F** | evidence / freeze tooling | no |
| **G** | not required | no |

**Class E was not transplanted.** `sandbox/oracleTestDriver.ts` and
`sandbox/sandboxLog.ts` are omniscient test infrastructure and do not exist in
production. `pursuerV2Architecture.test.ts` asserts that no file under
`pursuer-v2/` contains Oracle code and that no Oracle file was copied.

Class D that stayed behind: `sim/simulation.ts`, `sim/frame.ts`,
`sim/model.ts`, `sim/graphRun.ts`, `sim/diagnostics.ts`, `sim/labLog.ts`,
`sim/graphLabLog.ts`, `sim/firewall.ts`, `sandbox/sandbox.ts`,
`sandbox/learnerActor.ts`, `parity/compare.ts`, `fixtures/*`, `harness/*`.
Class G: `candidate/*`, `current/*`, `engines/*`, `contracts/layers.ts`,
`labIdentity.ts`.

`sim/framing.ts` was deliberately **not** transplanted — see NOTE 1.

## RUNTIME FILES (classes A / B / C)

All paths below are relative to `src/games/circuit-climb/`.

| Production path | Lab source path | Lab blob SHA (`f22acf6`) | Class | Classification |
|---|---|---|---|---|
| `pursuer-v2/contracts/trail.ts` | `src/contracts/trail.ts` | `be366bdbfd98ecc3165fbf4a706accac006d514f` | C | **EXACT TRANSPLANT** |
| `pursuer-v2/contracts/trailRecorder.ts` | `src/sim/groundTruthTrail.ts` | `5c0e7a7a51228b306fd0a5ffd09289e368cff814` | C | **EXACT TRANSPLANT** (renamed only) |
| `pursuer-v2/graph/pursuitGraph.ts` | `src/graph/pursuitGraph.ts` | `c55eda5ad5a20a8d3605bb8036afa3ab3c59363d` | A | **IMPORT/PATH ADAPTATION** |
| `pursuer-v2/graph/graphRouting.ts` | `src/graph/graphRouting.ts` | `6a2a4bdd940cb03ec7d57dd16f4fe2567850ae95` | A | **EXACT TRANSPLANT** |
| `pursuer-v2/graph/graphCadence.ts` | `src/graph/graphCadence.ts` | `5f0687ef56857d9baa06cd139d318679e8b6dc4d` | A | **EXACT TRANSPLANT** |
| `pursuer-v2/graph/graphPursuerV2.ts` | `src/graph/graphPursuerV2.ts` | `36ec3123b31423b29eb8782ad25ba743b1a539b9` | A | **IMPORT/PATH ADAPTATION** |
| `pursuer-v2/graph/plasmaWake.ts` | `src/graph/plasmaWake.ts` | `33679cd03af761810defb3416b57c957fe26aaf4` | A | **EXACT TRANSPLANT** |
| `pursuer-v2/graph/graphActorRadius.ts` | `src/sandbox/graphActorRadius.ts` | `49bd0b446f51d74273a9782a06470f673ab4ebad` | A | **PRODUCTION ADAPTER** |
| `pursuer-v2/brain/observation.ts` | `src/brain/observation.ts` | `72be50344752da527f3f70cc198f39239ca6d61f` | B | **EXACT TRANSPLANT** |
| `pursuer-v2/brain/search.ts` | `src/brain/search.ts` | `ca36b2bbcfa967aaaadd53a6b9219590d08b4c52` | B | **EXACT TRANSPLANT** |
| `pursuer-v2/brain/sensors.ts` | `src/brain/sensors.ts` | `9deb6d569d4100182148513d18ff204dad3342fe` | B | **EXACT TRANSPLANT** |
| `pursuer-v2/brain/graphBrainV1.ts` | `src/brain/graphBrainV1.ts` | `31497ff3614f159da402771e29b623d716ea18d2` | B | **EXACT TRANSPLANT** |
| `pursuer-v2/runtime/graphWorld.ts` | — | — | — | **PRODUCTION ADAPTER** (new) |
| `pursuer-v2/runtime/graphPursuerController.ts` | derived from `src/sim/brainDriver.ts` | `a0af8822a3ef27f9a080919cc3e7a0fe60579d63` | — | **NEW PRODUCTION WIRING** |
| `pursuer-v2/pursuerControllerKind.ts` | — | — | — | **NEW PRODUCTION WIRING** (the seam) |

**Nine of the twelve transplanted modules are byte-identical to the accepted
Lab blobs**, including the entire Brain. The Brain that decides — `observation`,
`search`, `sensors`, `graphBrainV1` — was not edited at all.

### TEST-SUPPORT FILES (class D, never reachable from the application)

| Production path | Lab source path | Lab blob SHA | Classification |
|---|---|---|---|
| `pursuer-v2/testing/brainDriver.ts` | `src/sim/brainDriver.ts` | `a0af8822a3ef27f9a080919cc3e7a0fe60579d63` | **IMPORT/PATH ADAPTATION** |
| `pursuer-v2/testing/closedLoopRun.ts` | `src/sim/closedLoopRun.ts` | `f2f16b9fbdab02b3891f9c0d5662995d386e3372` | **PRODUCTION ADAPTER** |
| `pursuer-v2/testing/productionWorld.ts` | — | — | **PRODUCTION ADAPTER** (new) |
| `pursuer-v2/testing/fixtures/acceptedLabParity.json` | captured from `f22acf6` | — | accepted behaviour signature |

`pursuerV2Architecture.test.ts` asserts no production runtime file imports from
`pursuer-v2/testing/`, and `pursuerV2Firewall.test.ts` asserts the controller
cannot reach it transitively.

## SEMANTIC DIFFERENCES, EXPLAINED

Every departure from the accepted Lab source, and why it exists.

### NOTE 1 — `sim/framing.ts` was not transplanted (PRODUCTION ADAPTER)

The Lab built its board from `sim/framing.ts`, a standalone reimplementation of
the runtime's `applyViewScale`, written so that GRAPH_V2 could be developed
with no path back to production code. That was scaffolding for isolation.
Production already owns the authoritative geometry in
`geometry/circuitClimbGeometry.ts`, and shipping a second copy of a scaling
rule is precisely the kind of thing that drifts.

`pursuer-v2/runtime/graphWorld.ts` replaces it: it reads LIVE runtime geometry,
including any view scale the player has applied, and derives the rest. Column
centres are re-derived through production's own `computeColumnCentres` rather
than by multiplying the runtime's stored fractions back out — `(110/600)*600`
is `29.051999999999992`, not `29.052`, and that last bit is visible in a
decision stream compared against the accepted Lab.

**This is behaviour-preserving and proven so.** `pursuerV2Geometry.test.ts`
pins the adapter against production's own formula at nine framings, and
`pursuerV2Parity.test.ts` shows the resulting decisions are identical to the
accepted Lab's.

### NOTE 2 — `graphActorRadius.solveGraphActorRadius` takes a world, not a percent

In the Lab it took a framing PERCENT and rebuilt the board internally. Two
reasons that could not stand in production: it would re-derive a board
production already owns, and it would pin the clearance derivation to a framing
number, which the 04A brief explicitly forbids. It now solves from whatever
world the running game has. **The arithmetic is unchanged** — only its input.

The Lab's `SANDBOX_FRAMING = 90` and `SANDBOX_GRAPH_RADIUS` constants did not
come across; a `graphActorRadiusFor(world)` helper replaces them.
`pursuerV2Geometry.test.ts` shows the radius genuinely tracks the board
(26.1 at 80% down to 19.28 at 120%) and that the binding exterior lane lands on
the minimum passable gap at every framing.

### NOTE 3 — `FramedWorld` renamed to `GraphWorld`

A type rename following NOTE 1, applied mechanically to `pursuitGraph.ts` and
`graphPursuerV2.ts`. The complete diff against the accepted blobs is the import
line plus the type name at each use. No logic differs.

### NOTE 4 — `graphPursuerController.ts` is new wiring, not new behaviour

It wraps the accepted decision seam with what a real game needs and a lab
harness did not: building the graph from live geometry, extending it as the
learner climbs, rebuilding it if the player rescales the view, recording the
learner's real traversal as trail evidence, and a `restart()` that rebuilds
rather than clearing fields one by one.

The decision sequence inside it — build observation, `updateBrain`, project the
node, apply the retarget gate, step the chassis — is the accepted
`brainDriver.ts` sequence unchanged.

### NOTE 5 — capture stays with the Simulation

The Brain never adjudicates capture and never sees the distance. The runtime
applies exactly the rule the legacy pursuer is held to —
`getPursuerCaptureDistance(geometry)`, including the shielded-transit exemption
for a learner mid-route — to whichever pursuer is running.

### NOTE 6 — behaviour mapped to the three product-facing states

`VISIBLE_PURSUIT → CHASE`, `TRAIL_TRACK → ALERT`, `GRAPH_SEARCH → SEARCH`, so
the existing renderer and HUD work unchanged. This is presentation only; the
Brain still has exactly three strategic modes and gains no fourth.

## BEHAVIOURAL PARITY EVIDENCE

`pursuerV2Parity.test.ts` re-runs the accepted Lab's nine closed-loop
geometries through the production-integrated code and compares against a
signature captured from `f22acf6`:

- **`streamSha256`** over every decision field of all 900 frames per geometry —
  strategic mode, target source, projected node, pursuer x/y, pursuer node, raw
  sensor bit, named commitment end reason, commitment held/age, trail-lead
  consumption, sensed fragment count, retarget flag, distance.
- **field-level metric equality** for all 19 pathology metrics.
- a **combined signature** across all nine geometries:
  `abedac9af71b2e6f7cd7f50bb33420d3e1a4ed1145259fb11efcc2ac081ea4ff`.

All nine reproduce **exactly**. Parity was not waived and no tolerance was
widened to admit the candidate.

The Lab's own `behaviourHash` value cannot be reproduced verbatim in production
because that hash also covers a scripted `HumanSandbox` run, and `HumanSandbox`
is Lab-only class-D code that deliberately did not come across. The closed-loop
half of it — the half that exercises the pursuer's decisions — is reproduced
bit for bit by the signature above.

## LEGACY

`pursuer/circuitClimbPursuer.ts`, `circuitClimbPursuerLocomotion.ts`,
`circuitClimbPursuerTuning.ts` and `circuitClimbPursuerTrace.ts` are
**unmodified**. No legacy runtime line changed. `LEGACY_PURSUER` remains
launchable via the developer override (`?pursuer=legacy`).
