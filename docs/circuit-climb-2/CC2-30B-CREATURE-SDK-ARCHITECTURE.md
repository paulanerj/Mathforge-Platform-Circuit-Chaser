# CC2-30B — Creature SDK v1: Six Distinct Authorities, One Verified Handler

**Scope:** independent Creature SDK worktree, built on CC2-30A; no merge into historical `main` or protected CC2-28/CC2-30A. This is a source architecture qualification phase, not a visual redesign.

## The implementation boundary

`features/creatureAbilitySDK30B.ts` is the new source-owned contract. Each creature declares a **manifest** with species ID, ability, authority, friendly/hostile disposition, mathematical gate family, presentation material family, sound role, and an enabled flag. A manifest is NOT an effect implementation. Explicit `createCreatureAbility(species,runId)` fails closed when the adapter is absent.

The first implemented handler, `MolassesAbility`, owns *only* the `PURSUER_MOTION` authority:
- a source-validated, bounded `GelCastRequest` with an exact current run ID and game tick
- real source platform ID, emitted gel geometry, direction, and finite expiration tick
- physical Pursuer/field overlap with directional eligibility
- finite slow multiplier capped by strict valid range `[0.55, 1]`
- causal field cast / contact enter / contact exit / field expiry receipts
- reset and termination that prevent session carryover
- a read-only state snapshot for presentation, diagnostics, adaptive music

The old `CreatureEcologyDirector` still owns spawn schedules, physical hop source, independent math challenge, offer/decline/correct/wrong results. It now **delegates the world-effect cast and contact** to the ability handler. `CircuitClimbChaseCore` still composes the real Pursuer movement. The main math engine never receives creature answers and never lets visual code alter correct-platform IDs or scoring.

## Future creature implementation checklist

| Creature | Declared authority | Additional real game primitive required |
|---|---|---|
| Molasses Guardian | Pursuer motion | Implemented and qualification pending |
| Tether Slug | Spark motion | travel-time multiplier + 2-row or time-based expiry, physics response, fairness/capture race tests |
| Capacitor | Economy | source-owned charge earned/consumed receipts, no double credit |
| Relay Weaver | World topology | future platform reinforcement, true validity and gate checks |
| Prism Shuffler | Math option layout | transactional permutation of full future platform records and hitboxes before taps |
| Fracture Wisp | World topology | bounded, recoverable platform instability; must never make active math unsolvable |

**Rule:** No power is achieved by changing color, CSS, creature labels or other visual metadata. Additional authority types require separate implementation and explicit acceptance. Creation of a manifest does not authorize writing to the learner, math, or Pursuer brain.

## The Creature Studio source/gameplay configuration

The development panel retains existing visual settings, and adds a separate **source effects & timing** section. It edits, imports and exports strict versioned `cc2-creature/v1` values:
- first eligible row, hop cadence, hop travel ticks and offer duration
- skip-counting step and challenge clock
- gel lifetime, Pursuer multiplier, field collision radius
- material visual schema remains a separate part of the source preset

Changes are loaded as a **draft**, then applied only after explicit `Apply source settings & restart`. A validated JSON preset is transported by `cc230Cfg` and validated again by the core source before constructing the next run. The replay includes that exact source config. Visual-only settings continue to affect presentation without changing math or world authority.

## Exit gate

1. Complete TS typecheck and entire math/chase/feature/creature test suite.
2. Three-device-width real-pointer QA for the creature and main platform interactions.
3. Two-device-width true restart preset test: edit slow ratio, gate step, offer duration and field lifetime, then verify source and replay show exact applied values.
4. Reject forged authority, out-of-range parameters and invalid session requests.
5. Preserve CC2-28 and ordinary no-creature URLs without hidden extra fields.
6. Produce the fully standalone `dist/cc2-30.html`, then check hosted Vercel READY and physical phone start button before owner acceptance.

## Known outstanding UX quality

The Molasses renderer is still a lightweight jelly/stream visual. It is not yet the approved thick inertial firehose. That is CC2-30C, not part of core SDK. The independent sound effect still must be replaced or integrated into the Speed Grid-derived adaptive score transport. True device performance, especially Safari iPhone file preview, must be tested on HTTPS and cannot be inferred from hosted desktop Chromium alone.

**Related:** CC2-30A draft PR #40; this isolated extension is CC2-30B draft PR #41. Explicitly preserve the accepted slate-focus look.
