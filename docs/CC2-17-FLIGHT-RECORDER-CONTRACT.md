# CC2-17 — Circuit Climb Flight Recorder (CC-FR)
Status: ENGINEERING CONTRACT / NOT YET RUNTIME-INTEGRATED
Authority: Circuit Climb 11-13 PM
Source baseline: CC2-16B real input recovery, commit 80565bf50d0c177da194a71bfb44a0c2d4a40aca
Scope: isolated diagnostic observer, not a third gameplay controller

## 0. Why this is needed

The CC2-16A preview supported a deterministic "?manual=1" test laboratory.
Its auto-tick loop was disabled for the entire URL, not just while a scripted
scenario was executing. A real platform selection could enter the engine yet
never produce visible Spark movement. Green regression tests validated the
scripted path, but never asserted a real user click followed by live movement.

CC2-16B repaired the clock ownership and added real browser pointer tests on
normal and manual URLs. The recorder must make the exact missing link obvious
from one exported incident rather than forcing a developer to infer it.

## 1. Primary invariants (non-negotiable)

1. The game core, math reducer, collision physics and Pursuer AI own truth.
   Recorder failure must never change game behavior or suppress an input.
2. Every input has one correlation ID; its subsequent command, evaluation,
   travel, tick, render, sound and landing outcomes are linked.
3. Every game tick is accounted for. Coalesced presentation frames and any
   missing samples are disclosed, never presented as complete capture.
4. Events use both monotonically ordered recorder sequence numbers and
   authoritative simulation ticks. Wall time is advisory.
5. Export is locally initiated; no automatic telemetry uploads.
6. Full session replay must remain possible through exact seed/config/commands.
7. Protected MathForge Classic and accepted CC2 math/Pursuer source stay intact.
8. A recorder cannot make claims about screenshots/video it did not capture.
9. Recording on/off must not change authoritative state digests in A/B tests.
10. The result is one trace timeline across DOM, game, Pursuer, camera and AV.

## 2. Recorded event envelope

Each logical event uses the schema cc2-flight-recorder/event/v1:
  sessionId, runId, seq, kind, eventId, parentId, correlationId,
  source ("dom" | "adapter" | "engine" | "pursuer" | "render" |
          "audio" | "system" | "recorder"),
  timestampMonotonicMs, elapsedRealMs, tick, phase, status,
  stateDigestBefore, stateDigestAfter, payload, evidenceRefs.

All payloads are versioned and validated. If a field is unavailable, use a
machine-readable unavailable reason. Do not invent it.

## 3. Specific observability surfaces

### A. Bootstrap and provenance
- Exact Git commit, deployment ID, build version, script hashes, manifest.
- Browser, OS, viewport, DPR, zoom, orientation, reduced-motion setting.
- Config, seed, mode, curriculum, run ID, selected presets, clock ownership.
- Asset loading, source initialization milestones, service worker and cache.
- Per-surface visual/sound skin, active rendering profile and feature toggles.

### B. End-to-end touch/click lineage
- Pointerdown, pointerup, click, keyboard focus/activation; timestamps.
- Real versus scripted event, pointer type, button, pressure if available.
- Client, CSS, board, canvas and physical-world coordinates separately.
- Hit target, composed path, closest selectable platform, disabled/hidden.
- elementFromPoint at the real pointer and target centre, overlay blockers.
- Bounding boxes, z-index, pointer-events, visibility, relevant transforms.
- IDs and options displayed for the source-owned current problem.
- Whether listener executed; whether source selectPlatform was invoked;
  result/validation, rejection reason, and source events emitted.
- Asserted causal chain, with an explicit first-broken-link diagnosis.

### C. Authoritative math and learning
- Incoming operand, operation, target, row/column/platform and options.
- Selected numeric value, attempt/receipt ID, correctness and invalidity.
- Answer selected -> evaluated -> route initiated -> landed/shorted/returned.
- Solved-only equation review, score delta, charge, Pulse, stage and session.
- No pedagogical milestones inferred from incomplete or incorrect attempts.

### D. Physics, geometry and route
- Per-tick Spark position, movement phase, selected destination and speed.
- Source position versus interpolated visual position, camera projection.
- Physical tower graph, platform geometry, row gap, route nodes and turns.
- Transit shield, landing grace, collision and returned-start transitions.
- For every movement stall, indicate whether no tick, blocked route, pause,
  wrong state, invalid input, hidden tab, throttled frame or rendering desync.

### E. Pursuer cognition
- Per-tick bot body position/velocity, chassis mode, search strategy.
- Target and target type: LIVE, STALE, WAKE, SEARCH_FRONTIER, patrol.
- Sensor observation timestamp, range, line-of-sight, age and confidence.
- Route graph, chosen goal, why selected, obsolete-goal or downhill alarms.
- Spark-bot distances, contact / contact loss / reacquisition and capture.
- Reconstructible close-four, 8-row schedule, idle and long-session cases.
- Quantify distance trend and compare actual bot action to expected policy.

### F. Presentation and audio
- frame number, rAF clock, simulation ticks/frame, dropped/coalesced frames,
  visibility, frozen frame warning, resize and canvas backing size.
- Camera world-to-screen transform and actual button DOM hitbox transform.
- Visual cue event IDs, start/stop, particle/FX state, overlays and blocking.
- Audio context locked/running/suspended, musical time, cue ID, scheduled
  note and beat, expected visual partner and desynchronization duration.
- Exception, unhandled rejection, console error, asset/network failure,
  unavailable APIs, renderer paint failure and degraded capture path.

### G. Environment anomalies
- Browser focus/blur, visibility hidden, orientation, resize and page freeze.
- RAF > threshold, UI thread stall, external tab/background throttling.
- Storage quota, file export issue, recorder overflow/retention loss.
- Distinguish user pause, QA/manual clock, paused engine and ended run.

## 4. Diagnostic causality graph

A normal correct click MUST trace the following ordered outcomes:
  POINTER_DOWN -> POINTER_UP -> DOM_CLICK -> HIT_PLATFORM
  -> SELECT_PLATFORM -> ATTEMPT_EVALUATED -> TRAVEL_STARTED
  -> TICK_ADVANCED -> SPARK_WORLD_POSITION_CHANGED
  -> FRAME_PRESENTED -> LANDING_CONFIRMED -> ROW_COMPLETED

Record alternate valid paths for shorted answers, keyboard selection, pause,
terminal state, Pulse and rejected clicks. Do not treat every rejected input
as an engine bug; the reason must be explicit.

If a link does not occur within its configured tick and time window, emit
CC_FR_CHAIN_BREAK with:
  expectedNext, lastObserved, elapsedTicks, elapsedMs,
  clockOwner, gamePhase, pauseReason, pointerBlocker, stateDigest,
  sourceEventsSinceInput and corrective category.
For the historical "?manual=1" defect, expected explanation:
  DOM_CLICK and ATTEMPT_EVALUATED observed,
  no TICK_ADVANCED, clockOwner=QA_WITHOUT_ACTIVE_SCENARIO.

## 5. Snapshot, screenshot and video

Three capture tiers (all disabled by default in public release):
1. TRACE: event and deterministic command transcript, continuous source
   state summaries, per-tick coordinates, capped memory + disk segments.
2. VISUAL: screenshots at incident, command, landing, contact, and final
   frame; record event-to-image pointers and SHA-256 of each artifact.
3. MOVIE: explicit user gesture and browser permission for tab/screen
   capture, with MediaRecorder timestamps synchronized to event monotonic
   time; provide WebM when supported and declare unsupported formats.

A web page cannot silently capture arbitrary full-page screenshots or tab
video. QA automation (Playwright) may capture full-page screenshots and video
without introducing a recorder mutation to the game; on-device video requires
browser support and permission. iOS Safari may need external screen recording
or a no-video fallback. Canvas-only captures must be labelled as such and must
not pretend to include DOM overlays. Do not silently record microphones.

Incident capture retains >=10 seconds of recent trace and >=20 seconds after,
where memory allows. User may mark an incident while playing without pausing
the game. Any retention limit is shown before export, with lost-sample count.

## 6. Export bundle

CC2-FLIGHT-SESSION-<runId>-<timestamp>.zip:
  manifest.json             version, provenance, counts and checksums
  README.txt                symptom summary, reproducible instructions
  bootstrap.json            config, seed, capabilities, environment
  commands.jsonl            canonical source command / receipt sequence
  input-chain.jsonl         complete pointer-to-engine correlation
  engine-ticks.jsonl        authoritative position and phase delta per tick
  pursuer-trace.jsonl       observations, goals, routes and capture
  render-frames.jsonl       camera, hitbox, frame timing and source sync
  math-events.jsonl         arithmetic receipt and correct-only results
  audio-visual.jsonl        synchronized cue, FX and music observations
  errors.jsonl              structured JS/asset/runtime/recording failures
  anomalies.jsonl           auto-classified invariant and stall violations
  replay.json              authoritative seed/config + commands
  replay-qualification.json repeatable digest checkpoints and divergence
  timeline.html             offline navigable event inspector (no network)
  screenshots/*             optional, image timestamp/event correlation
  video/session.webm        optional, explicit tab/screen permission
  video/sync.json           video start/stop and clock alignment
  checksums.sha256          file hashes

The recorder should deliver a JSON-only emergency bundle if media or ZIP
assembly fails. Export must not pause or mutate the game. No secret,
credential, precise user location or unrelated browser content collected.

## 7. User controls: Settings > Developer > Flight Recorder

- Start/stop trace (on-device, no network).
- Mark incident now (include previous ring and next observation window).
- Capture frame (native canvas; or permitted tab source).
- Start/stop video (requires user gesture / platform support).
- Download incident bundle / full session bundle.
- Show coverage: ticks recorded vs actual, events, frames, missed frames,
  retained media, storage usage and any degraded features.
- Optional replay comparison: compare deterministic digests at checkpoints.

Normal game HUD remains clean; there is NO persistent debug text covering
playable platforms or mathematical feedback.

## 8. Efficiency, privacy and testing

The capture adapter may emit one compact authoritative tick record per tick,
but writes in batched chunks to IndexedDB or a bounded memory fallback.
The recorder must never perform synchronous ZIP compression in a game tick.
Source state digests are sampled at documented deterministic checkpoints.
Device constraints and sample loss are explicit, not concealed.

Measure p50/p95 tick overhead, long-run memory use, dropped frames and export
latency. Acceptance target: p95 capture cost <=2 ms per 60-Hz tick on supported
qualification hardware, with no statistically meaningful gameplay desync.
If hardware cannot sustain it, degrade media first, not authoritative input
and command receipts. State the actual measured thresholds and devices.

A/B seed replay comparing instrumented versus uninstrumented runs must have
identical receipts, score, Spark/Bot outcome and terminal reason.

## 9. Mandatory fault injection tests

1. Normal URL: real pointer click -> Spark movement -> landing.
2. ?manual=1: same, outside active scenario.
3. ?manual=1: scripted scenarios own clock exclusively and relinquish it.
4. Choice receives event but authoritative select handler is missing.
5. Transparent overlay intercepts the target hitbox.
6. A CSS disabled/hidden platform appears visually selectable.
7. Camera projection and button DOM hitbox diverge.
8. Engine rejects invalid/stale platform ID and gives reason.
9. Engine enters travel but clock never advances.
10. Clock advances, Spark stays still due to invalid route.
11. Spark moves in source but visual renderer freezes.
12. Browser tab hidden and restored during travel.
13. Four rapid climbs and Pursuer reacquisition.
14. Bot searches obsolete goal below player.
15. Genuine finite-sense last-known trail expires.
16. Pursuer physically captures Spark during travel.
17. Wrong answer shorts and returns without false award.
18. Pulse ability, stage transition and achievement synchronized.
19. Screen resize, rotate, high DPI, reduced motion.
20. Sound suspended/unlocked and cue timing differs from visual FX.
21. Long session over ring capacity with explicit overflow.
22. Network block and asset failure without gameplay corruption.
23. Video permission denied; trace-only export still succeeds.
24. Recorder throws intentionally; gameplay digest unchanged.
25. Replay comparison reports first deterministic divergence.

## 10. Engineering phases and acceptance

CC-FR-00: read-only interface map and no-mutation contract.
CC-FR-01: input transaction IDs and DOM/hitbox capture.
CC-FR-02: authoritative tick/events/receipts and causal classifier.
CC-FR-03: Pursuer finite-sense/chassis/graph trace enrichment.
CC-FR-04: camera/render/music/FX and performance timelines.
CC-FR-05: screenshot + optional permissioned video capture.
CC-FR-06: ZIP bundle, local timeline viewer, deterministic replay diff.
CC-FR-07: injected failures, cross-browser/device and long-session QA.
CC-FR-08: SDK host-neutral observability adapter and release qualification.

Development must begin on a separate feature branch from the CC2-16B
passing candidate; the initial repaired preview is deliberately kept stable.
The recorder is a diagnostic *observer*, not a gameplay authority.

## 11. Current gate

CC2-16B: automated normal and manual pointer regression PASS, GitHub
Actions 43654924963 (320, 390, 768 widths; six variants).
Physical Safari / Galaxy tablet regression not yet accepted.
CC-FR runtime integration: NOT STARTED, BY DESIGN.
No claim of video capture or complete runtime tracing until implemented.
