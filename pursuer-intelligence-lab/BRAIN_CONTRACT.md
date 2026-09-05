# The Brain contract

Implement one interface and register it. Nothing else in the sandbox needs to
change — rendering, learner modes, replay, overlays, metrics, fixtures and A/B
comparison all work with your Brain as they are.

```ts
import type { PursuerBrainDefinition } from '../../src/pursuer/contract/brain';

export const BRAIN_MY_HUNTER: PursuerBrainDefinition<MyConfig> = {
  id: 'X_MY_HUNTER',
  label: 'X · MY HUNTER',
  description: 'One sentence a tester will read in a dropdown.',
  supportedPerception: ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT'],
  defaultConfig: { ... },
  parameters: [ /* only the ones you actually read */ ],
  productionEligible: true,
  create: (config) => new MyHunter(config),
};
```

```ts
class MyHunter implements BrainInstance {
  decide(observation: PursuerObservation): PursuerDecision { ... }
  reset(): void { ... }
  inspect?(): BrainInspection { ... }   // optional; drawn by the overlay
}
```

---

## What you are given

```ts
interface PursuerObservation {
  nowMs: number;          // simulation clock. NEVER use Date.now().
  dtMs: number;           // this tick's step. Fixed in the default timebase.
  tick: number;
  self: {
    x, y, radius, node, edge, arrivedAtTarget,
    routeNodes, cadencePhase, lastStepDistance
  };
  perception: {
    modelId, oracleTruth,
    directContact: { x, y, vx, vy, sightingTMs, ageMs, live } | null,
    trailFragments: TrailFragment[],
    directRadius, trailRadius
  };
  graph: PursuitGraph;    // board topology. Not secret — a pursuer can see platforms.
  runStartOrigin: { x, y, row, tMs };
  oracle?: { x, y, row }; // ONLY under P3. Reading it forfeits production eligibility.
}
```

### What you are NOT given

The learner's live position, its row, its platform, whether its pending answer
is right, the route it is about to walk, its destination, or how far away it is.
Not "these are unset" — there is nowhere on the type to put them.

`directContact` is the learner's true position **at the moment it was
perceived**. `live: false` means the perception model is holding a lock through
an occlusion and `ageMs` says how stale it is; treat a held contact as evidence,
not as a sighting.

`trailFragments` are ground the learner **has physically walked**. A trail never
extends past where the learner actually is. `id` is stable across ticks, so you
can recognise a trail you have followed before.

---

## What you return

```ts
interface PursuerDecision {
  mode: 'DIRECT_PURSUIT' | 'EVIDENCE_TRACK' | 'SEARCH' | 'IDLE';
  modeLabel?: string;                    // your own finer vocabulary
  target: { kind: 'NODE'; node } | { kind: 'POINT'; point } | { kind: 'REGION'; point; radius };
  confidence: number;                    // 0..1, your own self-report
  reasonCode: string;                    // canonical codes exist; yours are fine
  commitmentId: string;                  // stable while one intent is in flight
  explanation: string;                   // one sentence, shown on screen
}
```

You decide **what to investigate**. You do not decide how to get there and you
do not move the body: navigation and locomotion are shared layers. That is what
makes a comparison between two Brains a comparison of judgement.

`commitmentId` is watched. Bump it every tick and the lab will report you as
exactly as indecisive as you are.

---

## Rules

**Be deterministic.** Same observations in, same decisions out. Use the supplied
clock; if you need randomness, seed it from your configuration. A
non-deterministic Brain cannot be replayed against another Brain on the same
learner run, which is the only fair comparison here.

**Be stateless across runs.** `reset()` must return you to your starting
condition. State that survives a restart is the classic source of "it behaved
differently the second time and nobody knows why".

**Read only the observation.** Do not import the simulation, the learner, the
board or the renderer. `src/tests/lab.test.ts` walks the observation your Brain
is handed and fails you if hidden truth reaches it.

**Declare only parameters you read.** A slider for a constant you ignore wastes
a tester's session.

---

## Reason codes

Canonical, and the ones the metrics understand:

```
DIRECT_TARGET_VISIBLE   DIRECT_TARGET_HELD     NEWER_TRAIL_SUPERSEDES_SIGHTING
DIRECT_LOCK_LOST        FOLLOW_NEWEST_TRAIL    SEARCH_LAST_SIGHTING
SEARCH_FRONTIER_ADVANCE TARGET_REACHED         EVIDENCE_EXHAUSTED
REPLAN_ROUTE            REACQUIRED             CAPTURE_APPROACH
RUN_START_CUE           HOLDING_COMMITMENT
```

Your own codes are displayed verbatim rather than dropped.

---

## The two reference implementations

Read both before writing your own; between them they bracket the design space.

**`brains/graphV2/`** — the shipped pursuer. Careful, commitment-based, four
derived confirmation windows. Its adapter (`index.ts`) is a good model for
translating a Brain that speaks its own vocabulary.

**`brains/directHunter/`** — four sentences of policy and no confirmation
windows at all. Shorter than this document. If you want the smallest possible
starting point, copy it.
