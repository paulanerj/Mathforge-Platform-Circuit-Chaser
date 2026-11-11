# CC2-01 — Qualification Strategy, Evidence Matrix and Release Gates v1.0

**Status:** PM design baseline. The original SOT-02 was freshly rerun successfully in CC2-00; **the new CC2 product has not been built or accepted**. This file defines how that future claim will be tested.

## 1. Acceptance philosophy

The original game achieved 206/206 tests and 61/61 browser smoke; later Graph V2 achieved 487/487 engineering tests. Neither number proved the later chase felt intelligent. The standalone lab's fixture command returned process success while printing **two unmet behavioral expectations**. Therefore:
- The **test runner itself must fail** on failed expectations; a green CLI exit from a diagnostic script is insufficient.
- An accepted feature needs pure contract tests, real-browser tests, recorded gameplay traces, and human observation when gameplay feel is involved.
- Old protected SOT-02 stays untouched; test original and 2.0 in separate CI jobs, not by editing baseline assertions.
- A known failure is recorded with evidence and owned as an unresolved issue; no deletion or downgrading of tests to make a report green.
- Source hashes, seed/config digests, device/viewport and run timestamps are part of every candidate evidence bundle.

## 2. Deterministic acceptance matrix

| System | Required seeded/automated evidence | Required actual play evidence | Hard stop |
|---|---|---|---|
| Math generation | For 1,000 seeded runs per pack/band: exact one correct, two distinct wrong, target bounds and stable shuffle | Child can understand what is being asked | Incorrect target; duplicate correct answer |
| Power-cell math | 4-row exact result continuity and explicit reset; test wrong retries and resize | Rebase obvious, not mistaken for a math contradiction | Silent number jump |
| Physical routes | Every offered platform route valid at 80/90/100/110/120%, all three lanes, wide and narrow views | All three choices visibly tappable | Any legal destination has no route |
| Math attempt ledger | Select/short/return/land/restart/capture/pause exactly-once ID property; duplicate input fuzz | Primary result matches the visible answer sequence | Duplicate/missing attempt or row credit |
| Pursuer sensing | Probe sensor-boundary and occlusion tests, no oracle truth leak, stale held contact age | Bot looks aware only when legitimately sensing | Hidden future-route/answer access |
| Pursuer navigation | 07A, 07B1, 05B, 05C, 06 and Graph V2 R&D fixtures; many seeds across scale and FPS | Looks purposeful, recovers from loss, no wall pinning | Known endless search or path deadlock |
| Capture fairness | Ground overlap vs protected transit/return/grace and Pulse boundary in exact tick tests | Capture feels deserved, not triggered during auto travel | Any protected capture or phantom overlap |
| Ability and special rows | Deterministic spawn schedule, no answer correlation, charge/use/expiry and correct/wrong overlap | Numerals remain readable, effect purpose understood | Answer leak, route invalidation or permanent effect |
| UI/controls | Keyboard, touch, screen reader, reduced-motion and high-contrast tests | Phone/tablet comprehension and touch feedback | Broken active buttons or truncated math |
| Score/evidence | Equation review uses only completed correct rows; attempts/accuracy correctly account for wrong retries | Summary accurately represents the run | Misreported solved equation or host mastery |
| Host integration | Null-host offline, source-owned events, dedup/replay, subscription isolation | Standalone and embedded parity | Host re-evaluates correctness or corrupts run |
| Performance | Frame/heap/time-growth baseline and 30-minute bot/world soak | Stable camera, readable action on low-end tablet | Unbounded growth, persistent event loop jank |

## 3. Core/QA engineering tests

**Mutation/reversion tests:** prove each accepted lock is load-bearing by reintroducing the old bug in a controlled test branch and watching the named test fail. Priority regressions:
- All routes null due to crossing altitude vs collision inflation mismatch.
- The pursuer jams against a platform row or an aligned platform edge.
- A visually painted platform cannot be clicked because inverse transform is wrong.
- World zoom to 120% removes a corridor or makes the Spark's geometry inconsistent.
- Search in `lastKnownX ± amplitude` traps reacquisition across columns.
- A bot repeatedly commits to lastKnownY but cannot move vertically to arrive.
- Search speed matches learner mean ascent and produces a permanently widening gap.
- Repeated route rejection/waypoint switching keeps Pursuer animated without making legal progress.
- Unknown/silent math value rebase across rows.
- A stored-setting `null` parses as numeric zero or an unsafe default.
- A stale callback from the prior run creates second row completion or capture.
- “Fixture expectation unmet” is printed but CI reports success.

**Property tests:** deterministic seed generation, choice uniqueness, route validity, no collision penetration, actor position finite, state machine totality, config round-trip and hash stability, monotonic event ordinals, replay digest equality and bounded retained world growth.

**Browser smoke:** actual Chromium must render nonblank content, accept pointer/keyboard choices, show correct landing / wrong short & return / cell recharge, pause/resume/restart, Pulse charge and effect, correct summary, and no page error. A browser smoke check is not a screenshot-only check.

## 4. Device matrix and accessibility

| Device class | Required check |
|---|---|
| 320px iPhone width | Portrait live game, 200% text zoom where supported, hit targets, safe area |
| 360px Android phone | Touch selection, no body scrolling, math legibility |
| 390px and 428px iPhone | Safari real device pass, normal and reduced motion |
| 590–768px tablet | Galaxy Tab S6 Lite Chrome in portrait, actual touch and sound |
| Tablet landscape | Full board visible, stable math header, bottom actions not offscreen |
| Desktop ≥1024px | Pointer/keyboard and proper centered frame, settings not floating far away |
| Slow/variable FPS | 30/60/90/120/144 simulated/actual; same seeded sim behavior |
| Accessibility | Screen-reader labels, focus order, keyboard 1/2/3, reduced motion, contrast states, mute |

Every supported width must test active row with candidate values and after a wrong short/return; responsive layout correctness cannot rely on an empty intro screen.

**Device proof requirement:** at least one iPhone Safari and one Galaxy Tab S6 Lite (or documented equivalent performance tier) are actually used before release, with recorded browser version, viewport and source SHA. Automated emulation alone is not enough.

## 5. Pursuer acceptance protocol

**Prequalification:** 16 canonical fixtures in pursuer design, 100-seed cross-board/stop suite, long-run stress, perception firewall tests, zero hidden oracle. Test with same runner at 80/100/120% world, three pressure modes, and two ability states. Only one dimension changes at a time during comparisons.

**Human observation:** record at least three full runs per Brain/preset before PM preference and later learner sessions. Each video/trace includes a scenario ID. Raters use 1–5 ratings (1 bad, 5 excellent) for:
- Pursuit intention: moves as if closing on evidence, not random drift.
- Search purpose: seeks plausible places after losing sight.
- Responsiveness: after a genuine sighting it commits without nonsensical reversals.
- Fairness: avoids cheap captures through unsteerable travel.
- Threat/pace: learner has time to think but hesitating is costly.
- Legibility: movement, telegraph and Pulse effect easy to interpret.

**Initial hard numerical targets:** 100% no hidden sensor leak, 100% no protected capture, 100% no offered unrouteable platform; all 07A/07B1/05B/05C defects have explicit green regression cases; 100% required deterministic replay. **Provisional quality threshold**: cross-board then stationary reacquisition at least 95% within 12 seconds across a fixed reachable 100-seed fixture and stationary-when-seen closing within 2s unless logged safe detour. Thresholds are targets, not measured results, and can change only via documented PM decision with comparison videos.

**No fake promise:** the pursuer may legitimately lose a very fast learner. The acceptance requirement is productive evidence-based behavior, not guaranteed catch in an infinite world. Human approval is still mandatory even after all seeded checks pass.

## 6. Session and curriculum QA

**At least** these scripts:
- First-time Practice walkthrough: deliberately wrong option then recover, use a hint, complete four-row cell, inspect assisted evidence and resulting number.
- Climb: no wrong answers, three cells, a Pulse charge/use, then deliberate capture; summary shows only solved equations.
- Climb: two wrong options on same row, third correct; verify 3 attempts, 1 completed row and no changed target.
- Climb: pause mid-route, settings, resume, then quit/restart; no lost or duplicated score.
- Challenge: reach last goal landing exactly while pursuer is close; goal terminal precedence unambiguous.
- Accessibility: screen-reader label announces equation/three candidates, keyboard can play without canvas click.
- Reduced motion: full arithmetic and chase semantics remain clear when effects suppressed.
- Curriculum boundary: change requested in middle of cell applies only at next cell, creates an event and never mutates current options.

## 7. Shipping acceptance checklist and defect severity

**P0 — No launch:** wrong math, no-route choices, duplicate learner evidence, protected/phantom capture, unrecovered Pursuer deadlock or permanent unaware-state in bounded fixture, corrupted replay, crash/memory leak, unplayable 320px input or actual-device critical failure.

**P1 — Fix before release:** confusing number rebase, illegible target, UI overlays blocking play, invalid settings import silently accepted, inaccessible controls, stale audio after pause, mislabelled mastery, major FPS degradation.

**P2 — Can be deferred with documentation:** optional secondary enemy absent, extra themes, expanded curriculum pack, cosmetic Relay variants, daily challenge, further flavor audio.

**Release evidence bundle:** source SHA, dependency lock SHA, branch, exact preset IDs/hashes, seeded fixture set, unit/browser summaries, device clips/screenshots, human rating notes, accessibility checklist, package size/performance readings, issue ledger, rollback SHA and PM decision.

## 8. Gated delivery order and promotion standard

| Gate | Scope | Pass requirements |
|---|---|---|
| **CC2-00B** | Exact product source reconstruction executable checks | Source/doc conflicts reproduced; baseline remains protected; chase failure traces captured |
| **CC2-01** | Complete approved *design* | No undefined math, capture, input, event, special, mode or boundary semantics; document links and decisions stable |
| **CC2-02A** | New core math/world/learner vertical slice | Standalone headless deterministic tests, 21 legacy-equivalent locks, four-row rebase, wrong-return, all route choices |
| **CC2-02B** | Perception-limited Pursuer laboratory | Zero critical pursuit fixture failures; 100-seed cross-board proof; human video review |
| **CC2-03** | Integrated playable prototype | Correct loop, pursuit, HUD, pause, Pulse, Capacitor/Relay, feedback and replay |
| **CC2-04** | Production feature and SDK candidate | Accessible UI, device polish, sound, summary, performance, optional adapter |
| **CC2-05** | Release qualification | No P0/P1, full automated/device/human evidence, signed PM/owner promotion and rollback |

No gate may use a passing result from an earlier commit as proof of a later behavioral change without an explicit bounded-diff/source-hash argument.

## 9. Status at CC2-01 authoring

- Original preserved SOT-02: baseline CI PASS, 206/206 and 61/61.
- Later 07B1: 351/351 and 61/61 engineering PASS, but known lateral reacquisition problem documented.
- Graph V2 04C: 487/487 engineering PASS.
- Intelligence lab: source fixture output **two unmet behavioral expectations**, browser harness qualification not proven.
- New CC2: **zero successor gameplay code implemented or performance qualified by this document**.

A design package can be complete while implementation and release remain unapproved.
