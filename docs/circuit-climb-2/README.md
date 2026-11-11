# Circuit Climb 2.0 — Production successor workstream

**Date established:** 2026-11-11  
**Status:** Design / forensic qualification (CC2-00); no successor implementation approved yet  
**PM authority:** Circuit Climb 2.0 conversation in ChatGPT  
**Repository:** `paulanerj/Mathforge-Platform-Circuit-Chaser`  
**Work branch:** `circuit-climb-2-production`  
**Fork point:** `0a6f138f229119bc6b6c15ee1f658046c7075f50` (SOT-02 transfer freeze)  
**Accepted gameplay authority:** `c8838c30947c2a561bfc8322a6159e4f28fef61a`  
**Accepted QA authority:** `eac8d8337a30d22cd41f09b6d78f0e73474cb390`

## Mandate

Build a complete, commercially polished MathForge platform-climbing arithmetic game, not merely a replacement bot. Preserve accepted learning mechanics and proven playable behavior. Design and qualify the future game before replacing the original. Include a fair, persistent pursuer, special platforms, optional abilities, additional enemies/hazards, progression, accessibility, strong responsive presentation, and host-neutral MathForge integration boundaries.

This branch is a **successor design and development workspace**. It does not replace the accepted SOT-02, the original product, or the experimental Graph V2 pursuer simply by existing. No automatic merges into `main`, `circuit-climb-successor-sot-02`, or R&D branches.

## Governing documents

1. [Product blueprint](./CC2_PRODUCT_BLUEPRINT_V0_1.md) — gameplay, features, progression, art direction, SDK contract.
2. [Pursuer/engineering contract](./CC2_PURSUER_AND_ENGINEERING_CONTRACT_V0_1.md) — engine boundaries, AI evidence, replay, QA gates.
3. [Parity and decisions register](./CC2_PARITY_AND_DECISIONS_V0_1.md) — source custody, preserved invariants, outstanding questions, candidate decisions.

All three are **v0.1 PM proposals**, not an assertion that new features exist in executable code. Preserve explicit distinctions between **ACCEPTED IN SOT-02**, **PROPOSED FOR CC2**, and **OPEN/NEEDS EVIDENCE**. Gameplay rules are not silently revised by an engineering implementation.

## Foundational accepted product behavior to preserve

- Vertical climb; the player is a blue Spark carrying a current number.
- A row presents **three numbered destination platforms**, exactly one mathematically correct.
- Selecting a destination, rather than steering a route, is the core input. The game computes a blue orthogonal route.
- All three choices are physically reachable; wrong answers remain selectable and short out with a visible physical consequence and return.
- Correctly taken platforms power on green; the pursuer is red and captures on contact, ending that run.
- The pursuer cannot veto any mathematically offered destination.
- Pause freezes the simulation; restart is a clean run.
- Current SOT-02 transit shield protects a Spark mid-route; future shipping policy must be decided explicitly.
- One shared geometry/corridor authority for player and pursuer. No point collision or hidden routing fallbacks.
- Mathematical input/evaluation, physical route, arrival, and score/learner evidence must be distinguished.

## Baseline evidence (historical, not freshly re-run)

SOT-02 documented 206/206 unit tests, 21 capability locks, 61/61 browser checks and responsive smoke at 320/390/430/590/768 px. This branch has **not** yet rerun them. SOT-02 has six recorded open limitations, including provisional alive-pursuer tuning, closure/diagnostics policy, and runtime arrival/render seams.

The separate GRAPH_PURSUER_V2 R&D series (notably PURSUER-04C, commit `d7a8115ac03672c10ec1f060c8cf9d57b2422bc3`) provides evidence and engineering ideas, **not** adopted gameplay authority.

## Development gates

| Gate | Outcome | Entry/exit principle |
|---|---|---|
| CC2-00 | Source audit and product inventory | Exact source custody, active baseline, feature matrix, reproducible failing scenarios |
| CC2-01 | Signed product/technical specification | No unresolved foundational gameplay or collision semantics |
| CC2-02 | Standalone pursuer+world proof | Real geometry, perception firewall, live and replay tests prove acceptable behavior |
| CC2-03 | Vertical playable production candidate | Full math loop, UI, special systems, deterministic state transitions |
| CC2-04 | Feature completion and MathForge adapter | Evidence, progression, accessibility, settings, content governance |
| CC2-05 | Release qualification | Device/browser matrix, learner sessions, performance, regression, SDK contract and PM acceptance |

A gate cannot be passed by test count alone; browser and human gameplay evidence are required. No new feature may make the three-choice math contract unsolvable, unfair, or physically unreachable.

## PM control

- Keep the core run independently playable without an SDK host.
- One change request per coder tranche, with named files, forbidden edits, rollback point, test evidence and demo instructions.
- Maintain deterministic seeds, preset export/import, reset-to-defaults, failure traces and reproducible run IDs.
- Put tuning and forensic tools under Settings > Developer, not the learner HUD.
- Keep the MathForge style direction: clean restrained geometry, translucent materials, meaningful illumination; mobile and tablet first.
- Commit design, implementation, tests and evidence to this branch. Promote to an accepted release only after explicit PM/owner qualification.

## Immediate next action

Complete CC2-00 by comparing the production SOT, the later pursuer experiments and intended future features against actual source and recorded gameplay. In parallel, use these v0.1 proposals to identify every open foundational decision before implementation starts.
