# CC2-22 — Baseline Protection and Production Architecture

**Status:** Isolated engineering candidate, subject to owner acceptance  
**Source accepted by owner:** CC2-VIS-21 Cohesive Plasma + Red Shell swallowing  
**Immutable accepted commit ID:** `d80332d6c8e6fb2f8940c8ef9b066ae1a20037b7`  
**Accepted reference branch:** `baseline/cc2-vis21-owner-selected-2026-11-15`  
**Isolated development branch:** `feature/cc2-22-baseline-production-architecture`  
**Primary source repository:** `paulanerj/Mathforge-Platform-Circuit-Chaser`  
**Historical fallback:** `80565bf50d0c177da194a71bfb44a0c2d4a40aca` (CC2-16B input recovery)  
**Scope:** Architecture, source custody, deterministic test harnesses, CI and future opt-in contracts **only**.

> The accepted CC2-VIS-21 code was not rewritten. Its commit SHA is the immutable
> reference. The reference branch is a convenient pointer, **not** server-enforced
> immutable branch protection. GitHub branch-protection/ruleset configuration
> still requires separate repository permission and owner review.

## 1. Source of truth and invariants

1. `CircuitClimbCore` owns mathematical problems, selection correctness, Spark
   movement, physical landings, phase progression, authoritative events and
   terminal outcomes. Its event and state digests are normative.
2. `CircuitClimbChaseCore` owns integration of the finite-sensor Pursuer and
   the existing charge/Pulse system with the core. The Pursuer does not grade
   an answer. Contact is still adjudicated by the original core.
3. `PursuerController` reads only permitted finite proximity, sight and
   historical wake. It cannot obtain future math answers or private Spark
   routes.
4. `FeatureProgression` derives Capacitor, Relay, stage and earned Pulse events
   from actually completed rows. It cannot create a correct answer.
5. `buildRunSummary` uses only real completed rows, properly accepted
   equations and a unique terminal receipt. No unlanded equation qualifies.
6. CC2-VIS-21 retains its exact visual behavior, in-board capture, attached
   living shell, one blue eye, and existing run summary. Music is untouched.
7. No CC2-22 extension is activated in any actual playable CC2 run.
8. No merge to the production, main or accepted branch is authorized without
   explicit owner approval.

## 2. What CC2-22 actually implements

This phase adds three **disconnected** modules and their tests under
`src/games/circuit-climb-2/architecture/`.

### A. Strict future-extension data contract

`extensionContracts.ts` specifies versioned definitions for four potential
categories: ENEMY, HAZARD, ABILITY and SPECIAL_PLATFORM.

The input firewall accepts exactly:
- run ID and deterministic simulation tick;
- public run mode, phase and completed-row count;
- an optional finite observation, explicitly marked NEAR, SIGHT or WAKE.

It rejects all unknown keys. A full EngineState, hidden correct answer,
upcoming platform ID, actual unsensed Spark position, future path, or other
private state is **invalid input**, not ignored metadata. Wake age and observed
tick are checked. This is a structural guard; a future connected producer must
also prove its observations come from an actual finite-sensor source.

### B. Disabled deterministic encounter catalog

`extensionRegistry.ts` describes a future Scout, Sentry, Stabilizer,
Insulation and Overload catalog. These are **design candidates only**, not
implemented enemies, hazards, power-ups or live gameplay.

Every definition must have `enabledByDefault: false`. Actual baseline enabled
IDs are the immutable empty set. The catalog returns only advisory eligibility
receipts with explicit run ID and tick; it cannot spawn, capture, stun, slow,
spend charge, award score, solve a problem or mutate any gameplay state.

Candidate ordering is reproducible by priority and ID. Practice, ended runs
and disconnected sensing are treated as distinct eligibility conditions.
The registry is deterministic and contains no game references, timers,
browser APIs or pseudorandom draws.

### C. Host-neutral evidence boundary

`hostEvidenceBoundary.ts` maps a real terminal run summary plus the real
event ledger into a limited result receipt. The mapping verifies exactly one
terminal event, attempt accounting, row count, solved attempt references and
equation provenance before returning any result.

A CAPTURED outcome is **not** a wrong math answer or a mastery judgment.
Host rewards are not granted by this module. The module does not import or
represent an implemented Gen2 SDK; official host integration is CC2-30.

## 3. Dependency boundaries

```text
             FUTURE MATHFORGE GEN2 HOST
                        |
           [Host adapter, not yet built]
                        |
        hostEvidenceBoundary (pure map)
                        ^
                        |
       [Read-only ledger and run summary]
                        |
     +--------------------------------------+
     |   CC2-02A and CC2-02B ACCEPTED CORE  |
     |   Math / Pursuer / Spark / Progress  |
     +--------------------------------------+
                        ^
                        |
   [Future authoritative extension adjudicator]
                        ^
                        |
          extensionContracts (strict)
                        ^
                        |
         extensionRegistry (advisory)
           ALL FEATURES DISABLED
                        |
       CC2-23+ future opt-in qualification
```

The bottom path is **not connected to the active game**. In particular, an
advisory CONTACT_CANDIDATE could never bypass the engine's physical terminal
adjudication; the present registry does not even generate contact candidates.
Before introducing live enemies, implement deterministic core-owned spawn,
physics, collision, effect precedence, sensor provenance, tick scheduling,
budget limits and unique event IDs in a separately reviewed phase.

## 4. Future CC2-23/24/25 implementation sequence

**CC2-23: Scout, then Sentry.** Each receives a bounded, replayable sensor
projection and its own seeded RNG stream, independent of mathematical RNG.
Start behind a disabled feature flag. No answer access. Differentially compare
single-Pursuer baseline to new-enemy flag-off builds. Challenge and practice
exclusions are defined before activating entities.

**CC2-24: Special platforms and hazards.** Add separate timing/telegraph,
valid route constraints, geometry, and explicit physical collider precedence.
Never change correct-platform identity or mathematical content. Capacitor and
Relay remain baseline authorities.

**CC2-25: Upgrades and pickups.** Add ledger-backed acquire/use/expire receipts,
bounded capacity, one-use and overlap semantics, and dedicated charge sources
for each ability. Preserve the currently accepted Circuit Pulse exactly
until a versioned replacement is explicitly approved.

## 5. Regression matrix and release gates

| Gate | Required evidence |
|---|---|
| Source custody | Commit ancestor pin and allowlist-only diff against VIS-21 |
| Type safety | `npm run lint` and exact TypeScript contracts |
| All CC2 historical tests | `npx vitest run src/games/circuit-climb-2` |
| Extension firewall | Unknown keys, answer leak, stale/future sensing, config strictness |
| Candidate determinism | Sorting, replay repeatability, all-off parity, run isolation |
| Source noninterference | Real arithmetic modes, valid landings, digest equality |
| Host evidence | Unique terminal receipt, solved-only equations, no mastery inference |
| Visual baseline | CC2-VIS-20 / CC2-VIS-21 actual browser screenshots |
| Device layout | Existing 320/360/390/428/768/1280px browser checks |
| Actual input regression | CC2-16B real pointer/touch and valid landings |
| Portable version | Single-file builder and offline real-play smoke |
| Production build | `npm run build`; no main/prod deployment |

The workflow must **fail closed** if a source file outside this phase's
architecture, documentation, test, and CI allowlist changes. A green test run
does not waive this protected-code diff check.

## 6. Owner review and honest limits

- **What is protected by design and CI:** the exact accepted commit hash, the
  unchanged gameplay/presentation files, and future opt-in boundaries.
- **What is not yet secured:** an organization-level protected Git tag or
  branch ruleset. Neither has been configured in this phase.
- **What is not yet implemented:** any additional enemy, ability, hazard,
  campaign, curriculum mode, or live host adapter.
- **What the owner tests:** open the isolated CC2-22 preview, play a normal
  chase, solve equations, trigger capture, replay/skip, and compare material
  appearance and interactions to accepted CC2-VIS-21.
- **Next authorization:** CC2-23 secondary enemy implementation, with Scout
  isolated, zero-new-enemy mode mandatory, and exact core-digest/route fairness.

The CC2-22 branch is not a product release. Neither successful CI nor this
document conveys owner visual approval or permission to merge.
