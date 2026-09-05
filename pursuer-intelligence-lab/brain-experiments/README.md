# Add a Brain

Three steps, and you touch nothing else.

```bash
cp -r brain-experiments/TEMPLATE brain-experiments/candidates/my-hunter
```

1. Implement `PursuerBrainDefinition` in `candidates/my-hunter/index.ts`.
2. Import it in `candidates/index.ts` and add it to `EXTERNAL_CANDIDATES`.
3. `npm test && npm run fixtures X_MY_HUNTER P0_PRODUCTION`

Your Brain now appears in the dropdown, runs against every script and fixture,
replays against recorded learner runs, draws in the fog-of-war overlay, and
takes part in the A/B/C comparison. No other file changes.

## What you may and may not touch

**Yours:** `candidates/my-hunter/**`, and one line in `candidates/index.ts`.

**Not yours:** the renderer, the learner, the board generator, the camera, the
simulation, the perception models, or any other Brain. If you find yourself
needing to edit one of those, the contract has a gap in it — **say so in your
report rather than working around it**. The gap is more valuable than the
workaround.

## Read first

- `BRAIN_CONTRACT.md` — the interface, and the rules
- `PERCEPTION_CONTRACT.md` — what you are allowed to know
- `EXPERIMENT_GUIDE.md` — how to tell whether you improved anything
- `src/pursuer/brains/directHunter/index.ts` — the smallest working example

## The one finding you should start from

Run the shipped Brain under `P3 · ORACLE` and watch it. Under perfect
information the same graph, navigation and locomotion reach
`DELIBERATE_PURSUIT_CAPTURE` on scripts where under production perception they
score `LIKELY_SEARCH_COLLISION`.

The chassis can hunt. **The knowing is what fails.** That is where the work is.
