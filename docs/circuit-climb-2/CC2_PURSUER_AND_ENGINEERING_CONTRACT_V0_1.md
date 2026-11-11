# CC2 — Pursuer and engineering contract v0.1

**Date:** 2026-11-11 | **Status:** PROPOSED; implementation not yet accepted

## 1. The design failure we are preventing

Earlier bot variants could compile and pass unit tests yet appear lost, stall behind platforms, fail to reacquire the learner, or offer little convincing chase. Earlier product geometry also allowed a rendered but unplayable board above 100% world framing. New engineering shall never treat visually plausible movement or passing unit tests as sufficient.

The rebuild needs one authoritative world, one mathematical transaction model, one locomotion implementation for each actor with shared collision and reachability, and a **pursuer decision layer operating only on admissible evidence**.

## 2. Layered implementation

### A. World/geometry service

- Owns immutable row/platform IDs, topology, corridor graph, actor radii/clearance, collision shapes, camera projection and active/off-screen world retention.
- Maintains the SOT-02 mathematical/physical contract: each of three offered destination platforms must have a legal route; the pursuer can rank but never veto these routes.
- Recomputes or safely invalidates cached navigation on world expansion, scale changes or row culling; preserve nodes needed by currently active learner/pursuer plans.
- Coordinates are world-space first. Screen scaling/zoom cannot change collision truth without explicit geometry reflow.
- Do not duplicate corridor calculations per actor. Tests prove actor-expanded clearance and endpoint validity.
- Never use a silent teleport or zero-length path to cover routing failure.

### B. Math and learner transaction engine

- Validated row generation guarantees one correct offered math candidate, two incorrect but selectable candidates, and an available physical route to all three.
- Explicit sequential state machine: `READY -> SELECTION -> EVALUATED -> TRAVEL -> LANDED -> ADVANCE`; wrong route is `EVALUATED_WRONG -> SHORT -> RETURN -> READY`. Capture/pause/terminal precedence documented and tested.
- **Math correctness** is decided from offered problem and selected value; **physical arrival** is a later fact; **credit/evidence** uses an explicit contract preventing duplicate, lost or premature grants.
- `INPUT_SELECTED` is not inherently a completed `ATTEMPT`. The actor cannot score a completed row merely by beginning the animation.
- Capture, pause, restart, full-screen UI, reduced motion and special modifiers must not break the transaction ledger.

### C. Perception firewall

- Bot input: observed positions only when sensor conditions are met, occlusion, event-local evidence (last known position, trace snippets, decoy observations), navigation topology, elapsed simulation time.
- Bot **cannot** read learner equation, whether a choice is right, chosen destination, future route, queued inputs, target score, or hidden capture result.
- Sensor capabilities are versioned and explicitly bounded. Spawn privileges are specified, not accidental. No omniscient fallback when the player vanishes.
- Tests inspect transitive inputs to forbid leaks. Any temporary gameplay cue from a Scout must enter through the same perception channel.

### D. Decision brain

Behavior states (candidate): `PATROL/SEARCH`, `ALERT`, `CHASE`, `INVESTIGATE_LAST_SEEN`, `REACQUIRE`, `RECOVER_ROUTE`, `CAUGHT`. An implementation may simplify these names, but all observable behaviors need explicit semantics.

- SEARCH covers plausible unexplored routes or recently observed traces without wandering forever between two nodes.
- ALERT supports readable detection telegraph and a measured reaction delay.
- CHASE pursues a goal based on *current permissible evidence* and routes around platforms.
- INVESTIGATE_LAST_SEEN commits for a bounded time/distance, then broadens search if stale.
- REACQUIRE accepts legitimate new evidence, even after prolonged separation and world scrolling.
- RECOVER_ROUTE triggers when a candidate becomes invalid or progress stalls: detect, abandon, replan safely, and emit a named diagnostic. It cannot oscillate indefinitely between the same two failed choices.
- CAUGHT is a world adjudication, not a brain hallucination. Capture checks use physical collision plus any active accepted shields.

### E. Navigation/chassis

- Route planner operates on the same traversable geometry as the learner, with independent movement abilities only if specified; target unreachable -> named result + alternative strategy.
- Locomotion is deterministic under a fixed simulation step; render interpolation does not change physics.
- Turn decisions use hysteresis/commitment windows in seconds or simulation ticks with a known fixed tick duration; no hidden 60fps assumption.
- Prefer explainable shortest-/lowest-risk-route search with bounded replanning over continuous greedy left/right checks.
- Purposeful arrival: reaching a path node advances the plan; the pursuer must not stay indefinitely at waypoints.
- Anti-deadlock invariants: finite recovery after a confirmed stuck state; avoid immediate repeated route rejection; world/camera reflows do not invalidate actor bodies.
- Fairness: bot pressure curves can depend on *observable progress* and approved configuration, never silently on the answer's correctness.

### F. Capture and effects

- Define collision geometry and precedence separately from Brain. The accepted SOT-02 transit shield makes mid-route capture impossible; preserve until CC2-01 makes an explicit new decision.
- Ability pulses, hazards and temporary slows are typed effects with start/end timestamps, overlapping-effect policy and replay trace; no permanent debuffs from an unhandled timer.
- Captures at a frame boundary, pauses, travel completions and ability activation need deterministic ordering. Capture ends the run once and emits one terminal event.

## 3. Proof harness

Create the world+pursuer harness **before** building the entire successor UI. This is not a toy geometry test: it uses exactly the production candidate's topology, sensing, collision, step time and motion code. Its purpose is both behavioral proof and human observation.

### Mandatory scenario matrix

1. Stationary learner, pursuer has valid evidence: purposeful approach or bounded investigation.
2. Early game with finite perception: no forever-unaware pursuer without an explicit game design reason.
3. Fast upward climb: preserves route planning and awareness behavior; does not silently fall off the retained graph.
4. Learner moves left/right/reverses quickly: no perpetual corridor ping-pong.
5. Last seen behind platforms: searches plausible reachable destinations; may be fooled fairly.
6. Prolonged loss followed by legal sighting: reacquires and pursues.
7. Narrow clearances/single-platform and three-platform rows: actor-safe path; no collision tunneling.
8. World expansion and culling while both actors move: no orphaned goal, missing node or invisible pursuer.
9. All supported world zooms (at least SOT-02 80/100/120): route and body remain consistent.
10. Pauses, restarts, death on exact boundary, transient effects: no lost or duplicate lifecycle transitions.
11. Player chooses each of three options, correct and wrong: bot cannot invalidate choices.
12. Both unshielded and shielded collision fixtures: only approved policy determines capture.
13. Deterministic repeated run with same seed/config/input/time sequence: identical outputs and evidence.
14. Variable render FPS (30/60/90/120/144) using same fixed simulation ticks: equivalent outcomes.
15. Bot out of view or several rows behind: meaningful bounded recovery, no hidden teleport.
16. Long continuous sessions and seeded adversarial fuzzing: no stuck route, NaN, or unbounded memory growth.

### Human-play acceptance

At least one intentionally difficult real-player session is required for each bot tuning candidate; multiple ages/abilities and devices before final release. Record notes on **threat**, **purposeful movement**, **stagger/hesitation**, **seems lost**, **time allowed for math**, and **fairness** (continuing PURSUER-04C practice). Notes are not automatically converted into a pass. Screen recording and exported trace must identify configuration hash, run seed, viewport, simulation tick and source commit.

### QA evidence thresholds

- Zero mathematical correctness contradictions, duplicate completed attempts, no-route offered choices or geometry penetration in acceptance fixtures.
- Zero silent stalled-route states: if stuck is possible, detection and bounded recovery must be directly tested.
- All required fixtures green *and* at least one human-observed, positive chase session under each proposed release preset.
- Capture cannot occur in the accepted protected transit state; outside it capture is physically and temporally correct.
- Test result counts alone are **not** release acceptance. Quantitative pursuit quality targets should be set from a measured baseline and gameplay sample, not invented now.
- Every scenario should be reproducible by seed and trace; no test weakened or diagnostic suppressed for a green gate.

## 4. Configuration and diagnostics

Adopt the important PURSUER-04C lessons:

- Single validated, versioned `PursuerConfig` with speed, detection, cadence, memory, reacquisition, spawn and capture policies; reject incomplete/unknown-schema payloads.
- At run start resolve and freeze the config and record a canonical hash, provenance, selected preset and any fallback.
- Separate **what is selected** from **what is running**; settings edits never mutate an active run silently.
- Offer a dev-only inspector showing world graph, legal paths, current behavior, last-seen evidence, current goal, route failure reason, elapsed time and blocked/retarget counts.
- Export deterministic session replay and diagnostic logs from the UI without depending on browser devtools.
- Keep learner controls separate from internal debug controls. Do not show predicted correct answers in learner view.

## 5. Structure and release boundaries

Suggested source layout, not yet created:

```
src/games/circuit-climb-2/
  core/              # pure, deterministic state engine
  math/              # generation, correctness, curriculum
  world/             # topology, geometry, collision, route graph
  learner/           # selection, travel, landing transactions
  pursuer/           # sensors, brain, path planner, chassis
  special/           # abilities, platform modifiers, enemies
  presentation/      # visual/audio adapters, accessible UI
  integration/       # MathForge SDK port, manifest, event mapping
  config/            # versioned presets and validation
  tests/             # unit, property-based, replay, browser/device
  devtools/          # inspector, recorded runs, scenario player
```

Do not introduce the above directory until implementation gate approval. The existing `src/games/circuit-climb/` continues to serve as **historical protected executable reference**, not a playground for CC2 experiments.

## 6. Work packages and stop conditions

| Gate | Must demonstrate |
|---|---|
| CC2-00 | Exact source/experiment custody, feature inventory, baseline tests and known limitations |
| CC2-01 | Frozen decision-grade gameplay spec, contact/priority policy, generated row rules and content plan |
| CC2-02A | Shared world+math+learner route engine, parity fixtures for 21 accepted locks |
| CC2-02B | Pursuer isolated proof, human-observable prototype, trace/replay, all critical behavior scenarios |
| CC2-03 | Full continuous standalone loop with calibrated chase, specials bounded by math |
| CC2-04 | UX/audio/accessibility/SDK adapter and device/content coverage |
| CC2-05 | Performance, security/privacy, regression, human acceptance and explicit release promotion |

**Stop immediately** on a red accepted capability lock, silent unselectable destination, math/accounting disagreement, illegal collision, untraceable bot deadlock, or source-of-truth overwrite. Roll back rather than modifying the acceptance criteria to fit an implementation.

## 7. Decision needed from product research

A perfectly deterministic bot can be fairly evasive yet sometimes lose the learner; that is not automatically broken. Product readiness requires defining a **purposeful pursuit standard**, including what evidence the bot should retain, how long it should search, how player competence changes pressure, and when an intentional loss of contact is acceptable. CC2-01 must explicitly authorize these semantics before tuning or adding secondary enemies.
