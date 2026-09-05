# The configuration contract

A tester says *"BRAIN C / config 7be831 feels much smarter."* That sentence has
to be reproducible a week later by somebody else. This is how.

## The shape

```ts
interface LabConfiguration {
  schemaVersion: 'circuit-climb-lab-config/v1';
  configurationId, label, description;
  brainId;                 // WHICH BRAIN — behaviour
  perceptionModelId;       // WHICH MODEL — behaviour
  brainConfig;             // the Brain's own parameters
  perceptionConfig;        // the model's own parameters
  locomotion;              // shared by every Brain: speed, bursts, pauses, seeds
  timebase, stepMs;        // FIXED or RENDER_COUPLED, and the step
  parentConfigurationId, notes, lifecycle, createdAt;
}
```

## One validator

Built-ins, slider edits, duplicates and pastes from a bug report all go through
`validateLabConfiguration`. There is no gentler path for "our own"
configurations, and a built-in that fails it is a bug in the built-in.

- **Nothing partial runs.** A missing field is a refusal, never a silently
  filled default. A run whose evidence says `pauseChance: 0.62` because a reader
  supplied it, not because a tester chose it, is evidence about nothing.
- **Nothing extra rides along.** The validated object is rebuilt field by field,
  so an unrecognised key in a paste cannot reach the run or the hash.
- **An unknown schema version is fatal on its own**, and no other issue is even
  reported: a payload written for another schema cannot have its fields judged
  by this one's rules.

## The behaviour hash

SHA-256 over a canonical `path=value` text, keys sorted.

**In:** schema version, `brainId`, `perceptionModelId`, timebase, step, and
every parameter of the Brain, the perception model and locomotion.

**Out:** label, description, id, notes, lifecycle, parent, creation time.

So renaming a configuration does not make it look like a different pursuer, and
two people who independently dial in the same numbers get the same hash — which
is the intended reading: they are running the same pursuer.

## Lifecycle

```
BASELINE · EXPERIMENTAL · CANDIDATE · APPROVED_FOR_LAB · REJECTED
```

Note the ceiling. **`APPROVED_FOR_LAB` is as far as anything here can go.**
Production authority is a separate, PM-controlled integration phase and nothing
in this sandbox can grant it. No code promotes a configuration; promotion is a
human decision, and a configuration a tester liked does not become approved by
being liked.

## In the interface

`COPY CONFIG` · `PASTE CONFIG` · `COPY ID+HASH` · `COMPARE TO BASELINE` ·
`RESET`. A slider produces an experimental configuration; it never edits a
built-in. Changes take effect on `APPLY AND RESTART`, never mid-run — a run
whose parameters moved during it cannot be attributed to any configuration.

## Recorded learner runs

A separate schema, `circuit-climb-lab/learner-run/v1`, storing the learner's
**actual walked path** and the simulation time it set off. Storing the path
rather than the choice is the whole trick: production's learner can steer its
route away from the bot, which would make the path depend on which Brain is
chasing. A recorded path cannot, so the same recording drives three Brains
identically. `RECORD MY RUN` · `COPY RUN` · `PASTE RUN` · `COMPARE A / B / C`.
