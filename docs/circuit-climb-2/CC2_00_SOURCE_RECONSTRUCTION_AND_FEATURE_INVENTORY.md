# CC2-00 — Source reconstruction and feature inventory

**Audit date:** 2026-11-11  
**PM disposition:** SOURCE AND DESIGN RECONSTRUCTION COMPLETE; **FULL GATE HELD** pending live parity/executable evidence and two product-rule resolutions.  
**Method:** GitHub authenticated repository/tree/commit inspection, direct read of SOT-02 TypeScript and documentation, R&D branch comparison, explicit test implementation inspection. **No local checkout or human browser play session in this audit.** A GitHub Actions baseline run was initiated separately; do not mistake its start for a PASS.

## A. Exact custody — authoritative versus experimental

| Ref | SHA | What it represents | Use for CC2 |
|---|---|---|---|
| SOT-02 gameplay | `c8838c30947c2a561bfc8322a6159e4f28fef61a` | Accepted playable game/geometry/math/pursuer | **Read-only product behavior authority** |
| SOT-02 QA | `eac8d8337a30d22cd41f09b6d78f0e73474cb390` | Browser workflow, no gameplay edit | **Read-only QA reference** |
| SOT-02 transfer | `0a6f138f229119bc6b6c15ee1f658046c7075f50` | Authoritative SOT-02 handoff and restoration payload | **Protected fork point** |
| `main` | `875497ce053a8f3840178c17582d4d6b1bc8231d` at audit | Older pursuer corridor commit, NOT latest accepted SOT | **Not production authority** |
| `circuit-climb-successor-sot-02` | `0a6f138f229119bc6b6c15ee1f658046c7075f50` | Frozen original handoff | **Do not mutate** |
| 05B | `f1ded796930c906831554d8fba4f02d83207c981` | Long-run pursuer chase continuity candidate | Compare |
| 05C | `c84d3394c788be462d4589f21160cb0bcab1eeb8` | Same-level obstacle deadlock correction | Compare |
| 06 | `4c6e52f9b6abff0d248258fcfd024475dfbd2bdf` | Learner avoidance and pursuer orthogonal gait/cadence | Compare |
| 07A | `84b4dc761c26ff54a508815fc2672ebb4ebf7fdf` | **Forensic test only:** absorbing search state | Crucial failing fixture |
| 07B1 | `dba9e59ddd1ad9976aa9364d2c0713f2a56aa6bc` | Vertical descent/reacquisition repair; **lateral absorbing search bug still open** | Candidate, not replacement |
| Graph V2 / PURSUER-04C | `d7a8115ac03672c10ec1f060c8cf9d57b2422bc3` | Graph-based chassis, restricted Brain, versioned tuning and diagnostics | Reuse engineering lessons |
| Pursuer intelligence lab | `06beebb2ec309fe24527b9b45bebb6e69a8caeed` | Standalone controlled comparison of perception/Brains, fixed clock | Prime CC2-02 lab reference |
| Semantic and host bridge R1 | `f186fe211bc6427bf59f0216254e78071f9c4046`, `eeeb347435a11b3afdbbf6dfe3a851849490b714` | Source-owned `attempt_evaluated` candidate, host start/pause/resume/restart | Reuse bounded contracts, **not accepted gameplay** |
| New CC2 branch | `circuit-climb-2-production` | Design, QA, then isolated successor | **Only new writable workstream** |

The SOT-02 repository tree was enumerated directly and was **not truncated** (246 entries including directories). A separate Graph V2 04C tree contained 310 entries including directories. Source, tests, copy/restore scripts, and authored documentation are in GitHub; no file content is inferred from a similarly named MathForge surface.

## B. Actual SOT-02 runtime inventory

| Feature/system | Source location | Verified implementation behavior | CC2 decision |
|---|---|---|---|
| Surface entry | `CircuitClimbDevHarness.tsx`, `CircuitClimbSurface.tsx`, `src/App.tsx` | React host, canvas-led gameplay and overlays | Preserve runnable standalone envelope |
| Game loop and rendering | `runtime/useCircuitClimbPrototypeRuntime.ts` | One ~2,385-line runtime closure uses `requestAnimationFrame`, 2D canvas, camera, parallax and particles | Split deterministic core from renderer |
| Mathematical problem creation | `services/CircuitClimbMathAdapter.ts` | Shared `ProblemGenerator` configured for **addition only**, 3 shuffled positive numeric operands and one correct | Preserve addition baseline, add curriculum only by contract |
| Target progression | `makeRow` / `targetBandFor` in runtime | Target ceiling: `min(20, 10 + 2*floor((row-1)/6))`; every six rows target grows by two until 20 | Decide educational progression and upper limits |
| Prepared rows | `makeRow`, `ensureRows` | Rows 0..player.row+6 prepared in advance; three platform IDs row/column | Preserve pre-generation concept; validate math continuity |
| Player state | runtime `player` and number presentation | Blue Spark has displayed value, row, landing platform, pending transition | Explicit state machine required |
| Input | `CircuitClimbSurface` + runtime pointer/keyboard | Tap/click active row destination, keyboard columns 1/2/3, no direct route steering | Preserve; expand touch accessibility |
| Movement | `circuitClimbLearnerRouting.ts`, runtime | Circuit's blue right-angle segments (configurable 6–12 turns); **Hop** mode also exists with parabolic auto-jump | Preserve two destinations-driven presentation modes until explicit decision |
| Route feasibility | `circuitClimbGeometry.ts`, `circuitClimbLearnerRouting.ts` | Shared actor-expanded platform collision; named selection errors; all three offered destinations available | Hard parity lock |
| World zoom | geometry + runtime | Supports 80–120% framing; derived column spacing protects inner corridors | Hard parity lock |
| Wrong answer | `selectPlatform`, `arrive`, `updateTravel` | **Wrong choice travels to selected platform, shorts it, then follows return-hop to original platform**; correct option remains | Preserve exact visible consequence unless redesigned explicitly |
| Correct answer | `arrive` | Landing powers platform green, emits particles/audio, increments row/score, sets next active row and displayed value | Preserve visible result, rebuild transaction accounting |
| Player number presentation | runtime number phase | Clear 110ms on correct selection, hide in transit, reveal next value at landing; wrong does not hide | Keep as candidate, after math semantics clarified |
| Pursuer (SOT) | `pursuer/circuitClimbPursuer.ts`, `circuitClimbPursuerTuning.ts` | SEARCH/ALERT/CHASE with CAUGHT lifecycle; baseline omniscient preset and finite-sense Alive preset | Replace by independently validated pursuit intelligence |
| Capture | runtime `update`, `onCaptured` | Real physical overlap adjudicated in pursuer update; terminal capture; no lives or revival | Preserve run terminal; define special-effect precedence |
| Transit shield | runtime `engineSparkShielded` | **New install initializes false/off unless localStorage key is '1'**, unlike SOT-02 doc's “On” wording | **CONTRACT DISCREPANCY, resolve before shipping** |
| Spark avoidance | route threat chooser | Ranks prevalidated routes; cannot reject a destination; historically rarely consequential | Keep until behavior evaluated |
| Pause / restart | runtime and overlays | Pause stops update, settings pauses; restart rebuilds run and retains best-row storage | Preserve and strengthen lifecycle tests |
| Score / record | `updateHud`, `arrive` | Score is climbed row, best row stored under `circuitClimbPrototypeBest` in localStorage | Distinguish run score, math evidence and achievement tracking |
| Sound | runtime Web Audio | Programmatic oscillator tones for launch, corner, correct, wrong, threat | Keep synthesized fallback; add MathForge sound policy |
| UI | `CircuitClimbSurface.tsx`, CSS | Home/Menu top, gear view tuner, ticker, Pause and Restart bottom, intro and pause overlays | Tighten to MathForge suite layout; mobile-first |
| Developer controls | surface/runtime | World framing, corners, collision shapes, SUM TO cue, spark avoidance, transit shield, bot preset, 9 sliders, log export and view JSON | Move to Settings > Developer |
| Responsive | canvas inverse transform, CSS, existing browser smoke | Reference tests 320/390/430/590/768; pointer scaled into world coordinates | Test 320/360/390/428/tablet/landscape and real devices |
| Diagnostics | `circuitClimbPursuerTrace.ts` | Stalled / NOT_CLOSING warnings and trace download | Preserve and extend with reason/state/replay |
| SDK / host | **NOT** part of accepted SOT-02 | Separate unmerged R1 branch has semantic attempt observer and host controls, no mastery/result inference | Import ideas after explicit parity qualification |
| Special platforms | No dedicated feature system in SOT-02 game tree | **Not implemented** | CC2 product proposal only |
| Player special abilities | No ability system in SOT-02 game tree | **Not implemented**; `pulseAt` is a visual landing pulse, not a gameplay ability | CC2 product proposal only |
| Secondary enemies / bosses | No enemy roster in SOT-02 game tree | **Not implemented** | Defer until primary pursuit meets gate |
| Dedicated end-of-run equation review | Not found in Circuit Climb-specific surface and runtime | **Not implemented as a CC-specific review system** | Production candidate |
| Seeded gameplay/replay | SOT code uses `Math.random` and `RandomService.shuffle`; no full run replay contract | **Not deterministic by seed** | Required CC2 foundation |

### The two high-priority hidden semantic discrepancies

**F01 — Player number changes independently between rows (SOURCE VERIFIED).**  
The runtime's `makeRow(index)` generates `incomingPlayerValue` with `randomInt` for each future row. Even when the prior row has a snapshot, both branches select a new random value. On correct arrival the runtime increments `player.row`, then sets `player.value = nextActiveRow.problemSnapshot.playerValue`, and updates the display to that new value. The new value is **not necessarily** `previous player value + selected operand` (which equals the prior target). This produces valid independent per-row addition problems, but not a continuous arithmetic accumulation. Historical simulated `circuitClimbGameLogic.test.ts` tests a *mock* chain in which `incomingPlayerValue` is the previous row's resulting value; that mock does **not** establish runtime continuity. `circuitClimbNumberTransition.test.ts` also simulates presentation independently of the production closure. **Product decision D15:** continuous mathematical value, or explicitly explained independent problem reset. Do not silently presume either.

**F02 — Transit-shield default documentation contradicts running source (SOURCE VERIFIED).**  
SOT-02 handoff §B states transit shield “On.” However `let engineSparkShielded = false`; startup reads `localStorage.getItem('circuitClimbSparkShielded') === '1'`, falling back to false on missing key or storage error. Hence clean storage means **OFF** in this version. The settings toggle can turn it on; saved state persists. CC2 must explicitly set and test the shipping default; neither docs nor code silently wins for the *new* product.

### Other evidenced quality limitations

**F03 — Weak runtime-facing math/arrival tests.** `circuitClimbGameLogic.test.ts` and `circuitClimbNumberTransition.test.ts` contain simulation/local objects instead of driving actual runtime `makeRow` and `arrive`. Rely on real source tests and browser evidence, not a large passing count by itself.

**F04 — Seed/control gaps.** Runtime's `randomInt` calls `Math.random`; visual bursts also call it, and the math adapter has a module-scoped `problemCounter`. Exported settings alone do not permit reproduction of an identical complete game run. CC2 needs independent seeded streams for math/world/pursuer/VFX, and a versioned replay trace.

**F05 — Large update closure and `any` state.** Runtime owns math, travel, arrival, pursuit, camera, audio, particles, rendering and input in one React hook. Production coupling is the structural reason a source-level state machine is required.

**F06 — Frame-time assumptions.** Main loop clamps elapsed render delta to 34 ms and drives gameplay directly with animation frames; past pursuer decision windows were frame-counted. Design CC2 with explicit fixed simulation ticks and renderer interpolation.

**F07 — Actual pursuer has multiple experimentally proven deadlocks and nonproductive-motion cases.** See section C.

**F08 — Original's product result/SDK semantics remain incomplete.** Host bridge R1 explicitly refuses to infer completion, mastery or score from capture. A semantic attempt seam exists as separate candidate and had prior CI success, but SOT-02 production has no accepted host result contract.

**F09 — Accessibility and UX incomplete for commercial readiness.** Current canvas has aria-label but mathematical choices remain canvas-driven and the developer panel is integrated with learner UI. Need accessible input/output parity and a clearly organized MathForge control surface.

## C. Pursuer R&D: what we learned and what remains broken

| Workstream | Concrete result | Status for CC2 |
|---|---|---|
| SOT-02 locked baseline | Reaches and captures, with infinite sensing radius; useful physical movement baseline but deliberately omniscient | **Physics reference, not production-quality intelligence** |
| SOT-02 Alive | Finite radius (260), lose radius (420), 260ms alert, sweep and jitter; tuned by feel | **Never fully calibrated** |
| 05B | Found searchSpeed nearly equals typical learner ascent, causing parallel pursuit; raised 0.095 to 0.130 and chase speed to 0.192; 218 historical passing tests | **Causal evidence, not final tune** |
| 05C | Bot was within 0.116 units of platform edge, outside collision but tried illegal sideways step for 767 frames; added edge detour | **Regression fixture for route planner** |
| 06 | Added two legal learner serpentine phases, better threat scoring, orthogonal pursuer legs and cadence; 104 browser transitions reported | **Useful locomotion & avoidance ideas** |
| 07A | Reproduced pursuit moving in circles but never seeing stationary learner. Lateral sighting anchor trapped search within `lastKnownX ± 80` while radius 260; cross-board separation 380+ was unrecoverable | **Critical red test; no amount of “not stalled” diagnostics suffices** |
| 07B1 | Added bounded return toward a sighting below pursuer, repaired exact-arrival freeze; explicitly left the **lateral cross-board absorbing state** unresolved | **Partial repair; NOT a winning pursuer** |
| Graph V2 / 04C | Graph routing, trails, observed-evidence firewall, deterministic config hash, run freeze, diagnostics, QA | **Candidate reusable architecture** |
| Standalone pursuer intelligence lab | Four perception models (P0 production/P1 stable lock/P2 line-of-sight/P3 cheating oracle), three Brains, fixed simulation time and recorded scripts | **Preferred CC2-02 test harness, not production engine by fiat** |

**Most important newer finding:** the pursuer-intelligence lab commit reports that with **the same graph/navigation/chassis**, P0 production perception yields likely incidental collisions/ambiguous chase on three diagnostic scripts, whereas P3 oracle yields deliberate captures on two of three. This is evidence that the *information and belief model*, not only movement, deserves priority. P3 cannot ship because it reads hidden player truth. We should reuse the lab's head-to-head methodology and audit its original data before deciding which Brain to adopt.

**Takeaway:** rebuilding a higher-speed version of the SOT Alive bot alone would repeat known failure modes. CC2 must demonstrate non-omniscient reacquisition after a cross-board jump, a fair route to capture, and purposeful search instead of sweep loops.

## D. SOT-02 geometry and route invariants

Current frozen constants: logical width 600, platform width 104, platform height 62, Spark radius 32, row gap 205, route padding 8, default column centres 110/300/490. Column spacing is derived from width and actor clearance above 100% framing. Two valid interior corridors B and C are load-bearing; A/D exterior corridors are not reliably traversable in the accepted framing. World zoom 80–120% must not remove any offered learner choice.

The pure routing module reports named failures `NO_DESTINATION_ROW`, `NO_LEGAL_ROUTE`, and `DEGENERATE_ROUTE` rather than silently accepting impossible movement. No unsafe zero-length fallback, no platform penetration, no bot veto over destinations. Earlier forensic audits demonstrate that a white/working-looking board can nevertheless be mathematically unplayable, so accepted browser testing reads rendered pixels **and** runs physical taps.

These rules should become formal CC2 invariants instead of copied hidden constants.

## E. Tests: historical evidence versus fresh evidence

**Historical SOT-02 acceptance**, recorded in SOT-02 doc and transfer commit: 20 test files / 206 tests passing; 21 capability locks; 61 browser checks; 9 fast checks at each 320, 390, 430, 590, 768 width. The 120%-world route-regression and white-canvas regressions are mutation-tested. These counts are **historical**, not a fresh audit verdict.

**Fresh gate initiated:** GitHub Actions [CC2 SOT-02 baseline audit](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43115779305), commit `e2ecee53c4a9a23885b0fffa592fad1f902c3442`. It checks strict SOT-02 ancestry, exact protected gameplay blob identities, `npm ci`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:circuit-climb:browser`. At report creation **run in progress; no PASS asserted**. Later runs after documentation commits must be tracked independently.

**Not yet verified in this CC2 audit:** actual device play, human observation of baseline and R&D, recorded chase replays, local build/dependency tests, or learner-number progression under a real button sequence. The current connector can read repository contents and CI metadata, but the working container has no network route to GitHub and cannot clone the code directly.

## F. Feature gap to production-ready MathForge surface

**Available baseline:** complete simple arithmetic climb, two movement presentations, visual power-on, wrong short/return, restart/pause, synthesizer audio, score/best row, settings/tuning, actor-aware collision, basic pursuer, diagnostics, responsive reference tests.

**Candidate new systems NOT IMPLEMENTED in SOT-02:** seeded match configuration and faithful replay, difficulty profiles independent of arithmetic, curriculum packs beyond addition, first earned ability, special-platform system, multiple enemy types/bosses, polished MathForge settings/HUD and accessibility, dedicated equation review, full source-owned result/learning SDK contract, telemetry/privacy policy, production performance criteria, achievement/challenge sequencing.

**Already researched elsewhere in this same repo but not promoted:** `attempt_evaluated` source event, host bridge controls, Graph V2 Brain, configurable perception, direct-hunter lab, fixed-tick pursuit comparison, observation/export tools. Auditing and adapting these saves more work than copying the whole previous runtime.

## G. Decisions required before CC2-01 specification freeze

1. **D15 / Math continuity (HIGH):** Must the Spark's numeric value carry forward exactly as the result of each correct equation, or do we intentionally present a newly chosen starting number every row? Source does the latter. If independent problems are chosen, transition animation must explicitly explain the reset. Proposed PM direction: **carry actual result forward** unless educational scope requires a marked reset/chapter change.
2. **D04 / Transit shield (HIGH):** Source clean-start OFF, handoff says ON. Proposed PM direction: ON by default because player cannot steer automatic route, but genuine pressure while waiting on a platform. A rule change requires new capture/overlap tests.
3. **D21 / Hop presentation:** In SOT-02 Hop is real, but the current HUD emphasizes circuit mode; preserve as an explicit optional movement style with equivalent math, or remove only by owner/PM sign-off.
4. **D22 / Wrong-choice evidence:** Wrong answer lands and returns. Decide exact moment to record the attempt, animate short, and resume timer. Candidate host seam emits when a routed choice is accepted; new core needs independent attempt id and resolution id.
5. **D23 / Pursuer sensing and search:** Choose observable sensory rules; forbid production oracle. Require recoverable cross-board reacquisition and useful search, not permanent pursuit lock.
6. **D24 / World and ability scope:** New platform effects may never affect one-correct-of-three or physical selectability. Ability types must use an explicit effect timeline and freeze during pause.
7. **D25 / End result:** Define run-local capture/goal semantics separately from correctness, mastery, and session summary. No SDK host may derive mastery from score.

## H. CC2-00 acceptance matrix and gate verdict

| Check | Result at audit |
|---|---|
| Verify accepted original product/QA/transfer SHAs | **PASS** via repo tree, commits and SOT documentation |
| Enumerate actual modules, gameplay and feature inventory | **PASS** via direct code review |
| Compare relevant pursuer R&D and integration branches | **PASS** via branch/commit/doc source audit |
| Identify documented and additional systemic gaps | **PASS**; see F01–F09 |
| Fresh CI lint/unit/build/browser on exact preserved behavior | **IN PROGRESS** at this report's original commit |
| Reproduce pursuit defects and number transition in live browser | **OPEN** |
| Resolve conflicting default shield and arithmetic continuity | **OPEN PRODUCT DECISIONS** |
| Define testable core state/event model for CC2-01 | **READY TO BEGIN**; not yet a frozen contract |

**PM result:** CC2-00 documentary/source-reconstruction tranche complete. **Do not declare CC2-00 fully passed or authorize engine replacement** until the fresh CI and specific real-gameplay fixtures are examined and the two foundational rule ambiguities are resolved. Work may proceed on CC2-01 *design*, but not on CC2-02 implementation.

## I. Next coder-ready request: CC2-00B executable validation

Work only on `circuit-climb-2-production` (or a child branch). Keep the old product code byte-identical through this gate.

- Obtain/checkout exact `0a6f138...`, record `git rev-parse HEAD` and `git status`.
- Run `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run test:circuit-climb:browser`; attach unedited results and actual runtime/browser identifiers. Do not report historical test figures as a new run.
- In a real browser with clean storage, record the transit-shield initial toggle value and a protected/unprotected capture scenario.
- Take correct path twice with deliberately different correct operands and record `player.value` before selection, `targetValue`, selected operand, and displayed value after landing; identify value discontinuities without guessing.
- Recreate 07A cross-board loss and 07B1 vertical search cases in the appropriate experimental branch/lab; capture video/trace, seed or scripted input sequence, and source/config IDs.
- Verify wrong answer travel->short->return; Hop selection; all three choices; pause/restart; 80/100/120% world; widths 320/390/430/590/768.
- Return a structured PASS/FAIL matrix and behavior traces. No “fixes” in this tranche; every identified defect receives an isolated future work item.

Only a human-observed plus artifact-backed result can authorize CC2-02's new engine. Preserve every historical finding above as a regression test proposal, not an instruction to blindly copy old implementation.
