# CC2-01 — Pursuer Intelligence, Physics, Fairness and Enemy Contract v1.0

**Authority:** PM design baseline, not a claim of a working new bot. **Hard input:** CC2-00 documented the F01/F08 lab failures, 07A lateral absorbing search state, 07B1 partial vertical repair, and Graph V2 engineering evidence.

## 1. What makes an excellent Pursuer

The red Pursuer must seem like a thinking opponent with evidence, goals and commitment:
- It visibly searches and can *find* a learner it has lost. It cannot know a hidden learner's exact present/future location.
- When it perceives the Spark, it moves deliberately toward an **actor-safe intercept or contact opportunity**, not around aimlessly.
- When it loses contact, it checks recent evidence and broadens search rather than sweeping forever around a stale X coordinate.
- It remains physically constrained by the same world geometry and cannot tunnel through platforms or skip space to make a capture.
- An expert learner who solves rapidly should meaningfully outclimb it; a slow learner should feel pressure, but the bot should not score unavoidable kills during automated Spark travel.
- Its visible reaction must communicate intent without exposing secret correct answers or the learner's queued path.

A pursuer that is technically moving yet never reacquiring is **failed**, even if movement counters show activity or unit tests are green.

## 2. Six independent layers — source and responsibility

1. **World truth** (`WorldV1`): owns platform topology, collision, active rows and true actor positions. It does not choose pursuit policy.
2. **Perception firewall**: accepts truth and returns *only* admitted contact/trace/LOS evidence. Includes timestamps, ages, source, uncertainty and visibility status. The Brain cannot import the world-truth source.
3. **Belief/strategy (Brain)**: holds last observations, explores hypotheses and selects a goal with explainable `reasonCode`, confidence and stable commitment identity.
4. **Navigation planner**: finds a legal graph route to a strategy goal; returns concrete waypoints or typed failure/recovery advice, with no learner-math information.
5. **Locomotion/body**: executes actor-safe orthogonal movement, cadence, acceleration and turn/stop, updating actual collision-resolved body position.
6. **Capture adjudicator**: checks overlap, transit/grace/ability effects and run-state semantics. **The Brain may not issue a capture event.**

Use the lab's shared-chassis A/B design to compare Brains under identical player runs, seed and body physics. Do not literally import an R&D package into the final core without extracting/proving its contract. Oracle P3 is never production eligible.

## 3. Production perception — finite and explainable

**Recommended initial sensory policy** (named `P_REALISTIC_ELECTRIC_V1`, parameters provisional):
- **Nearby electromagnetic contact:** direct true Spark location sampled only while Spark center is within 260 logical world units of Pursuer center. This signal is non-occluded by platforms at short range, justified as circuit energy sensing. It is not a global wallhack.
- **Long sight:** up to 420 units if unobstructed straight-line world segment between actor centers; physics geometry decides occlusion. The longer range is optional in Practice/Climb tuning, not a different secret rule.
- **Recent physical wake:** the Spark's **already traveled** path may leave short-lived fragments (initial reference: 110-unit detection band, 4 seconds lifetime). The path stops at its actual current position and never includes planned/selected destination. A wrong-return route also leaves only its physical wake.
- **Event evidence:** a Scout, if later enabled, may supply its actual detected position/timestamp as an admitted external observation.
- **Held lock:** last directly perceived sample can be held for a short configured grace (candidate 500ms) tagged `live=false`. The Brain must account for staleness. A held lock is not a newly seen position.
- All sensor radii and decay are authoritative-world units, **not** on-screen pixel units; zoom changes recompute world collision/sensor math predictably.

**Forbidden:** selected answer, correct platform, player upcoming row, untraveled future circuit route, offscreen game data, hardcoded current Spark coordinates when out of sensing, cheating oracle, unlogged teleports. R&D `P3_ORACLE` remains strictly diagnostic with a "CHEATING" badge.

## 4. Belief and purposeful search

**Belief record:** `lastDirectContact`, velocity estimate (only from previously observed samples), trail sightings with timestamps, visited graph nodes, suspected regions with confidence, search frontier, and a commitment start/expiry. All state resets on restart or new run.

**Behavior grammar:** `DORMANT` (tutorial only), `SEARCH`, `ALERT`, `PURSUIT`, `INVESTIGATE_EVIDENCE`, `REACQUIRE`, `RECOVER_NAVIGATION`, `CAPTURED` (terminal body state). Mode is explainable to Developer, not automatically announced in the learner HUD.

**Direct pursuit:** current live contact -> choose legal contact/intercept position with future *prediction derived only from observed velocity and topology*, never from the player's selected answer. If predicted path becomes invalid, fall back to actual observed location.

**Investigation:** last valid sighting is a **bounded target**, not an infinite anchor. On reaching it or after a configured time budget, mark explored, broaden ring/graph frontier, and revisit newer evidence. If the Spark later comes into range, new observation supersedes the stale hypothesis immediately. Avoid lastKnownX±wanderAmplitude as an exclusive search region.

**Reacquisition:** use **reachable expanding-frontier graph search** around the last credible region, including left/right cross-board lanes and reachable rows above/below. Maintain a visited-set and diverse frontier, with bounded memory. The search must not be an eternal two-node oscillation. Evidence aging drives a wider hypothesis, not a narrower permanent loop. A stationary hidden player eventually becomes detectable in reachable bounded fixture worlds; not all infinitely distant real-world players are required to be found instantly.

**Commitment:** each decision has goal ID and commit duration measured in **simulation ticks**. Temporary wrong-way movement is permissible to route around geometry; oscillating back and forth without measurable navigation progress is not. `REPLAN` due to new evidence or world-change is logged with reason.

**Failure recovery:** if path planner cannot find route, return named failure and viable alternate frontier; if body progress over N ticks is insufficient, record blocked waypoint, mark its edge temporarily unavailable and replan. Never turn zero movement into "SUCCESS" or teleport past the obstacle. Preserve a "blocked route" diagnostic even if the actor is still drawing an idle animation.

## 5. Movement and chase fairness

- One collision authority and safe-corridor topology for both Spark and Pursuer; actor radius and clearance are explicit and cannot be altered by UI decoration.
- Pursuer should move with right-angled commitment legs, visually in the same circuit language as the Spark. Cadence may be irregular but no static sine-wave metronome that undoes closing speed.
- Fixed simulation tick baseline **60Hz**, derived tick count for delays; rendering at 30/60/90/120/144Hz must not change chase results for identical input tick sequence.
- Track **time spent pursuing with actual contact**, distance closed along legal graph, visited/retired hypotheses, path node progress, idle time, route failures and deliberate-vs-incidental captures. A fake high "moving frames" rate is not evidence of intelligence.
- Static player on a known reachable platform and legitimate detected contact should cause legal distance to decrease until capture/grace or physical obstruction explained in the trace.
- A learner fast enough to outrun the Pursuer is a legitimate result, not an AI bug. But a bot that never senses again after an ordinary cross-board move while the player stands still is a bug.
- Threat tuning may depend on approved mode and transparent milestone bands, not hidden math correctness or answer-choice index. No "rubberband teleport".

**Starting tuning candidate** (not accepted empirical truth): Climb search travel speed 0.13 logical units/ms and active pursuit 0.19 logical units/ms **only as old-world starting references**. A fixed-tick new graph system may need entirely different speed units. Do not copy these numbers without a physics conversion and play-testing. Define actual values in a versioned preset after an apples-to-apples benchmark.

## 6. Capture precedence and ability interactions

- Contact is physical circle/body overlap after collision resolution, not a Brain decision.
- During accepted automatic Spark outbound/return travel, no capture; same for the proposed 250ms landing grace (design D04). Vulnerable grounded overlap captures once.
- If pause occurs, all clocks and movement freeze before capture advancement. Restart clears body and observation memory and aborts pending effects.
- Circuit Pulse, when activated while READY and charged, applies a **movement-speed modifier** of candidate 0.65 for 2.5 seconds to nearby Pursuer body (initial candidate radius 220 world units); it does **not** erase the pursuer's belief, cancel capture already committed in prior tick, disable collision or require the pursuer to become blind. It should remain aware and act purposefully when slowed.
- A body already overlapping Spark in a vulnerable prior state captures before a newly pressed Pulse/selection at the same tick, eliminating retroactive rescues. A protected-tick overlap does not become a capture when the body/grace remains protected.
- Effects are typed, own expiry tick and are replayed deterministically. Multiple pulses cannot stack multiplicatively; refresh is disallowed while meter is empty.
- Challenge hazards may never damage or capture during an unsteerable route and must have comparable advance telegraph if they affect grounded decisions.

## 7. Mandatory deterministic proof fixtures

**Retain historic reference:** 07A cross-board loss, 07B1 descent, 05B pace-matching, 05C same-row obstacle deadlock, 06 corridor/cadence and 04C Graph chassis parity.

**New minimum test set** (each scenario is seed, config hash, input script, world scale and an expectation expression):
1. Stationary visible learner: Pursuer acquires, legally closes, and captures, with explanation.
2. Stationary learner just outside current sensing: broadens search and eventually acquires within bounded test arena.
3. Cross-board left→right at 80/100/120%: search cannot remain trapped around old X; eventually traverses/re-senses when player stops.
4. Lost above/below: explores both vertical directions with no zero-progress equilibrium.
5. Fast zigzag: avoids endless leg reversals, respects corridor clearance.
6. Wrong-answer outbound and return: no hidden future-route access; no illegal capture during automatic motion.
7. World expansion/culling: actor body, goal and evidence graph stay connected; missing topology yields named recovery.
8. 30/60/90/120/144 renderer refresh rates: identical decisions/state hashes at common sim ticks.
9. Rarely seen learner: meaningful frontier search without secret omniscience or orphan goal.
10. Narrow platform and same-row obstruction: no platform penetration, and blocked path never loops forever.
11. Paused, restarted, app unmounted: no stale Brain, effect or capture.
12. Multi-seed 20+ landings at varying learner think times; success cannot depend on a single friendly script.
13. Three destination rows, wrong choice and Capture boundary: pursuit never removes math choice or invents an attempt.
14. Hold/reveal/occlusion: held contact is flagged stale and cannot be interpreted as a new live sighting.
15. Pulse effect during pursuit and just outside radius; fixed expiry tick and no permanent state corruption.
16. Human-recorded Zigzag and cross-board footage reproduced by identical scripted learner movements.

**Pilot quantitative gates (targets for measurement, not old-test claims):**
- **Hard zero:** unreported stall, map penetration, no-route destination, direct sensory leak, non-deterministic replay, protected capture, infinite two-node search loops.
- **Visible stationary contact:** 100% of designated seeded reachable fixtures show legal distance decreasing within 2 seconds of detection or a named explainable obstacle detour with bounded resolution.
- **Bounded loss fixture:** >=95% of a defined 100-seed cross-board-then-stationary suite reacquire within 12 simulation seconds **when reachable under fixture sensor topology**; all exceptions logged and manually reviewed. This is a proposed release threshold, adjusted only by documented product evidence, not by weakening tests.
- **Perception integrity:** 100% of logged direct contacts have sensor eligibility at contact tick; oracle never eligible in production.
- **Pressure balance:** run human sessions at fast/typical/slow think times. Fast learner can frequently outpace pursuit; typical feels pressure; slow feels threatened without involuntary transit losses. Set numeric capture-rate bands only after live calibration.
- **Human judgement:** the real owner watches at least 3 scripted/human-play runs per candidate and rates deliberate chasing, search purpose, threat, confusion, capture fairness. No launch based on passing threshold alone.

## 8. Extended enemy roster (future candidates, not forced into launch)

| Enemy | Observable capability | Geometry limits | Release policy |
|---|---|---|---|
| **Pursuer / Red Surge** | Primary finite-sense hunter; searches, commits, captures | Same legal graph/body/capture authority | **Launch-required** |
| **Sentry Arc** | Fixed visible hazard on a circuit segment with charged/off cadence | Never blocks the only mathematical choice; cannot hit automatic transit | After one-bot gate, Challenge-only pilot |
| **Scout Node** | Small patrol, spots Spark only via its own sensor and reports aged sightings to Pursuer through observation events | Bounded assigned graph edges; no omniscience | Post-core candidate |
| **Interceptor** | Short-distance aggressive alternate hunter, e.g. adjacent node cutoffs | Bounded travel and cooldown, cannot spawn on a required landing | Future expansion |
| **Circuit Warden** | Authored multi-phase boss behavior using the same Pursuer chassis plus visible cell stages | No physics bypass, no secret math answers, clear entry/exit | Future curated challenge |

An enemy roster is not required to prove the primary chase. Each candidate needs its own performance budget, telegraph, accessible warning and collision priority contract before implementation.

## 9. Dev inspector and evidence

A developer can overlay permitted sensed area, stale last-known position, frontier candidates, goal/commitment, legal route, next waypoint, actor collider, blocked edge, reason code, effect expiry and per-tick events. A "truth overlay" is available only in dev-lab and marked clearly as cheating diagnostic context.

Every failure export includes source SHA, schema version, Brain/perception config ID and hash, run seed, last 500+ ticks around failure, selected input trace, world scale and viewport. Config editing is staged; active runs use a frozen resolved config. The lab can compare different Brains on the **same learner input** using the same chassis to isolate strategic improvement.

**CC2-02 proof requirement:** pass the hard mechanical gates **and** make recorded chasing look intentional to a human. The existing 487 Graph V2 test passes are research evidence, not a declaration that this is solved.
