# The perception contract

What the pursuer is allowed to know is a **choice**, not a fact. Production
hard-codes one policy, so the question "is the bot blind or is it stupid?"
cannot be asked there. Here it is a dropdown.

Every model produces the same `PerceptionSnapshot`, so a Brain cannot tell which
one it is running under except by reading `modelId` — and the only thing that
should read it is a Brain refusing to run under the oracle.

---

## P0 · PRODUCTION

Faithful reproduction of the shipped semantics.

- Direct perception: a hard **260-unit proximity circle**. Inside it, the
  learner's true position; outside it, nothing.
- Trail: the learner's physical path, clipped to a radius **derived live** from
  half the smallest trunk spacing plus the actor's own radius (about 114 units
  at the default framing).

This is the comparison baseline. A candidate that only looks good under another
model has told you about the model, not about itself.

## P1 · STABLE LOCK

Still non-omniscient. Acquiring is as hard as production; keeping is easier.

- Acquire inside `directSenseRadius`, as P0.
- Once acquired, the lock survives out to `lockRetentionRadius`.
- Beyond that, the **last true sample** is reported for `lockGraceMs`, ageing,
  with `live: false`.

For the "loses the Spark too often" complaint. It gives the pursuer nothing it
could not have sensed — only more of what it already had.

## P2 · LINE OF SIGHT

The pursuer **sees** rather than senses proximity.

- Perceived when within `visionRadius` **and** no platform stands between.
- Occlusion is a real segment/rectangle test against the inflated platform
  rects.

A research direction, not a tuning: it changes the game's information rules.
Note that it is *harsher* than P0 at short range and far more generous at long
range, and that it makes contact flicker as the sight line clips platform
corners — a Brain with no hysteresis will chatter badly under it. That is a
finding about the Brain, and the lab measures it.

## P3 · ORACLE — CHEATING REFERENCE — NOT PRODUCTION ELIGIBLE

The pursuer always knows exactly where the learner is.

**This is a diagnostic instrument and can never be promoted.** Its purpose is to
split one question into two:

- If the same graph, navigation and locomotion **still look stupid** under
  perfect information, perception is not the main problem.
- If the pursuit **suddenly looks excellent**, the information and belief model
  is the limiting factor.

Every run using it is flagged in the interface, in the fixture output, in the
comparison table and in the export. `productionEligible(brain, 'P3_ORACLE')` is
false for every Brain, permanently.

---

## Writing your own model

```ts
export const P4_MINE: PerceptionModelDefinition<MyConfig> = {
  id: 'P4_MINE', label: 'P4 · MINE', description: '…',
  productionEligible: true,
  defaultConfig: { … },
  parameters: [ … ],
  perceive(input, config): PerceptionSnapshot { … },
};
```

`perceive` is the **only** function in the sandbox allowed to hold hidden truth
and the Brain's view at the same time. Its input carries the learner's real
position and the full trail; its output must contain nothing the model has
decided the pursuer may not know.

Two rules:

- **Never leak.** If your model does not perceive the learner this tick, do not
  put its position anywhere on the snapshot.
- **Set `oracleTruth` honestly.** It is what makes a cheating model impossible
  to mistake for a real one.
