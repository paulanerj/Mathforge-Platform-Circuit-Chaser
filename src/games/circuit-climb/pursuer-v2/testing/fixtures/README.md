# ACCEPTED LAB PARITY FIXTURE

`acceptedLabParity.json` is the behavioural signature of the ACCEPTED Pursuer
Lab candidate, captured directly from Lab commit
`f22acf63e168807b566a307e83d9c8556de582e1` (tree
`e8eb1ce620d617c621a6ffb3a98463c97f5a0d4d`).

For each of nine closed-loop geometries it records:

- `streamSha256` — SHA-256 over the COMPLETE per-frame decision stream
  (frame, tMs, strategic mode, target source, projected node, pursuer x/y,
  pursuer node, raw sensed bit, commitment end reason, commitment held,
  commitment age, trail-lead consumption, sensed fragment count, retarget flag,
  new-evidence flag, distance to learner). Every field the Brain and chassis
  decide, on every one of 900 frames.
- `metrics` — the full pathology metric object, field by field.

`pursuerV2Parity.test.ts` re-runs those nine geometries through the
PRODUCTION-INTEGRATED code and asserts both, so "the production pursuer is the
accepted Lab candidate" is a checked fact rather than a claim.

## REGENERATING

Only regenerate if the accepted Lab authority itself changes — which would
mean a new PM acceptance, not a refactor here. A parity failure means
production has diverged from the accepted behaviour; it does not mean the
fixture is stale.

    # in the Pursuer Lab checkout, at the accepted commit
    git checkout f22acf6
    npx tsx <generator>   # see pursuerV2Parity.test.ts for the exact scenarios

The generator emits the full 1.4 MB stream; this fixture is the hashed form so
that exactness is preserved without committing the raw stream.
