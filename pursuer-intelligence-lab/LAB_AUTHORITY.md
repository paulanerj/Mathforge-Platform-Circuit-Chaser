# Lab authority — what this is a copy of, and what changed

## Source

| | |
|---|---|
| Repository | `paulanerj/Mathforge-Platform-Circuit-Chaser` |
| Branch | `claude/circuit-climb-forensic-audit-3s4oyh` |
| Commit | `d7a8115ac03672c10ec1f060c8cf9d57b2422bc3` (04C) |
| Behavioural predecessor | `99fc81456c7c3c7b1f39aadf86101aaa8f444cf6` (04B-R1) |
| Accepted Lab authority | `f22acf6` (LAB 03A-R2) |

The pursuer in this sandbox is the one a human played and reported on. That is
the point: a conclusion drawn here has to transfer back.

## Copied VERBATIM (imports repathed, nothing else)

| lab | production |
|---|---|
| `src/world/circuitClimbGeometry.ts` | `geometry/circuitClimbGeometry.ts` |
| `src/learner/circuitClimbLearnerRouting.ts` | `runtime/circuitClimbLearnerRouting.ts` |
| `src/pursuer/graph/pursuitGraph.ts` | `pursuer-v2/graph/pursuitGraph.ts` |
| `src/pursuer/graph/graphRouting.ts` | `pursuer-v2/graph/graphRouting.ts` |
| `src/pursuer/graph/graphCadence.ts` | `pursuer-v2/graph/graphCadence.ts` |
| `src/pursuer/graph/graphActorRadius.ts` | `pursuer-v2/graph/graphActorRadius.ts` |
| `src/pursuer/graph/graphPursuerV2.ts` | `pursuer-v2/graph/graphPursuerV2.ts` |
| `src/pursuer/graph/plasmaWake.ts` | `pursuer-v2/graph/plasmaWake.ts` |
| `src/pursuer/graph/trail.ts` | `pursuer-v2/contracts/trail.ts` |
| `src/pursuer/graph/trailRecorder.ts` | `pursuer-v2/contracts/trailRecorder.ts` |
| `src/pursuer/brains/graphV2/brainObservation.ts` | `pursuer-v2/brain/observation.ts` |

`src/tests/extractionFidelity.test.ts` compares each of these against the
production tree line by line and fails on any difference that is not an import.
When the lab has been extracted on its own the production tree is absent and
those checks skip — which is the expected state of a portable archive.

## ADAPTED, with the difference documented

| file | what changed and why |
|---|---|
| `src/pursuer/brains/graphV2/graphBrainV1.ts` | The six constants that were module literals are now fields on a `GraphV2Tuning` object threaded through `updateBrain`. `GRAPH_V2_BASELINE_TUNING` holds the production values; Brain A passes exactly that, so it is behaviourally identical. The fidelity test undoes the threading and requires the rest to match production byte for byte. |
| `src/pursuer/graph/frontierSearch.ts` | Production's `brain/search.ts`, MOVED out of the Brain because an expanding ring over the board's topology is not Graph V2's property — making the Direct Hunter import Brain A to get one would have tied two candidates together. `SearchCursorState` moved with it. The algorithm is untouched, and the test asserts that. |
| `src/pursuer/perception/sensorGeometry.ts` | Production's `brain/sensors.ts`, split: the clipping arithmetic stays, the single hard-coded sensing policy became four selectable models. |
| `src/world/graphWorld.ts` | Production's `pursuer-v2/runtime/graphWorld.ts` plus the framing arithmetic from `testing/productionWorld.ts`, because the lab has no live React `CONFIG` to read. |

## NEWLY AUTHORED

Everything else: the fixed timebase, the simulation, the layered rig, the Brain
and perception contracts, the perception models, the Direct Hunter, the
configuration contract, the metrics and classifiers, the fixtures, the renderer,
the interface, the tests and the tools.

## Production files changed by this extraction

Two, both configuration, neither source:

- `tsconfig.json` — `"exclude": ["pursuer-intelligence-lab"]`
- `vite.config.ts` — the same directory excluded from the production test run

They exist so **production does not depend on the lab**. Production's build,
typecheck and test surface do not reach into this directory, and no production
file imports anything from it. Production's own suite is unchanged at 487 tests.

## The relationship, stated plainly

The lab may copy from production. Production must never import from the lab. If
a candidate here wins, putting it into the game is a separate PM-controlled
phase — see `INTEGRATION_RETURN_GUIDE.md`.
