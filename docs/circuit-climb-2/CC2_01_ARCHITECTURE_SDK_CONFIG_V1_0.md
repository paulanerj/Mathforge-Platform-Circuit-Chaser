# CC2-01 — Technical Architecture, SDK Boundaries, Configuration and UX System v1.0

**Status:** Normative module/contract design, not yet implemented. Existing SOT-02 source is read-only. The past integration branch is research reference, not an assumed present SDK API.

## 1. Architecture goal

The former game loop mingled mathematical generation, answer assessment, route feasibility, bot decisions, UI, particles, audio and persistence in one ~2,385-line React hook. Circuit Climb 2.0 will not recreate that coupling.

**Hard rule:** a deterministic, platform-agnostic `CircuitClimbCore` is the sole authority for world state, arithmetic, platform states, travel, capture, abilities, score and source-owned events. It accepts commands, advances fixed ticks, and emits immutable state snapshots and event batches. Neither React, Canvas, SDK, audio nor localStorage may judge an answer or modify core physics.

## 2. Layer/dependency topology

```
MathForge host (optional)
        |
   Host adapter (ports / subscriptions / result policy)
        |
Presentation layer -- accessible DOM / Canvas / WebAudio / Haptics
        |
    game controller (commands, fixed ticker, snapshots)
        |
  CircuitClimbCore (pure, deterministic world/event authority)
    |        |          |         |           |
  Math    Geometry   Learner   Pursuer     Specials
  pack    /routing   /travel   perception  /effects
                                brain
                                planner
                                body
```

Upward dependencies **must not import downward UI/host modules**. The core cannot import window, document, React, performance.now, Date.now, Web Audio, localStorage or network clients. Time is an integer simulation tick. Random streams are seeded and local to specific subsystems.

## 3. Proposed isolated source structure

```
src/games/circuit-climb-2/
  core/
    CircuitClimbCore.ts      # deterministic step state transition
    contracts.ts             # stable command/state/event schema
    tickClock.ts             # 60Hz deterministic ticking; pause semantics
    ledger.ts                # attempt/row/terminal exactly-once checks
    runLifecycle.ts
  math/
    packs/add20.ts
    packs/registry.ts
    generateProblem.ts
    validateProblem.ts
    cellRebase.ts
  world/
    worldGeometry.ts         # runtime geometry derived from same authority
    platformTopology.ts
    collision.ts
    learnerRouting.ts
    worldRetention.ts
  learner/
    learnerController.ts
    travelState.ts
    landingRules.ts
  pursuer/
    perception.ts
    beliefBrain.ts
    searchFrontier.ts
    routePlanner.ts
    locomotion.ts
    capture.ts
  specials/
    specialRows.ts
    abilityPulse.ts
    timedEffects.ts
    hazardRegistry.ts
  config/
    schema.ts
    presets.ts
    resolveConfig.ts
    configHash.ts
    randomStreams.ts
  presentation/
    CircuitClimb2Surface.tsx
    canvasRenderer.ts
    accessibleControls.tsx
    audioRouter.ts
    themeTokens.ts
    styles.css
  integration/
    CircuitClimbHostBridge.tsx
    eventMapping.ts
    integrationCapabilities.ts
  devtools/
    ScenarioInspector.tsx
    replayExport.ts
    traceInspector.ts
  tests/
    contracts/
    math/
    geometry/
    pursuer/
    integration/
    browser/
```

The structure is a proposed file-level target. Implement in small gated phases, not in one all-at-once construction. Do not overwrite `src/games/circuit-climb/` or the R&D lab. New executable surface may be mounted as a separate development menu entry.

## 4. Core command and output contract

**Inputs:** `START_RUN(config, seed)`, `SELECT_PLATFORM(platformId)`, `ACTIVATE_ABILITY(abilityId)`, `PAUSE`, `RESUME`, `RESTART`, `QUIT`, `ADVANCE_TICKS(n)` in laboratory/runner, and optional `SET_DEBUG_CONFIG` **only outside an active run**. All are typechecked/validated.

**Output:** each step returns `nextImmutableState`, `orderedEvents[]`, `diagnostics[]` and `stateDigest`. A production controller may cache snapshots but must not mutate them. One deterministic event order is shared by standalone and host-connected execution.

**State ownership:**
- Math owns problems, cell arithmetic and correctness.
- World owns platform immutable IDs, geometry, actor-safe collision and legal routes.
- Learner owns command validity, travel phase and landing progress; math attempt evaluated once on physically accepted selection.
- Pursuer owns permitted belief, decision, route and body state but not capture adjudication.
- Capture owns physical terminal conditions with protection/effect precedence.
- Specials own typed timed effects; they consume core events, never alter the problem correct answer.
- Ledger owns unique attempt/row/run outcomes, prevents duplicate emission across replay/restarts.
- Presentation derives pixels and accessible labels from state, never creates gameplay facts.

**Error shape:** named deterministic result with `code`, `context`, `tick`, `platformId` and `runId`. The user gets a readable fallback only for a genuinely unplayable state; Developer sees the actual failure. A no-route answer produces a diagnostic and halts unsafe progression rather than turning into "wrong."

## 5. Fixed time and spatial geometry

**Tick** = 1/60 simulation second. Commands are assigned target simulation tick and monotonic arrival order; changes processed at tick boundaries. Render loop collects elapsed wall time into an accumulator, drives a bounded number of sim ticks, and interpolates snapshots for smooth visual movement. A background-tab pause suspends simulation instead of catching up with seconds of invisible pursuit on return.

**Clock policy:** explicit game pause freezes, while tab invisibility auto-pauses to prevent an unfair offscreen capture. When the app regains focus, display a resume control; no fast-forward. Designer-specified `maxCatchUpTicks` guards performance without changing the deterministic step algorithm. The recorded replay is a list of ticks+commands, not FPS-dependent mouse-frame timestamps.

**Geometry:** world logical width reference 600, base rowGap 205, platform 104×62 and Spark radius 32, with SOT-02's safe-corridor formula as the preserved reference. 80–120% view framing remains a world geometry setting subject to actor clearance; resizing canvas viewport is *not* a simulation reflow. World topology caches are keyed by resolved geometry/config revision and destroyed only after active actors/routes no longer reference their nodes.

**Routing:** every offered answer has at least one validated nondegenerate route. The Pursuer cannot veto it. If path cache fails, return `NO_LEGAL_ROUTE` and emit a diagnostic, never teleport or auto-grade the attempt. Special row modifiers cannot move colliders during a turn.

## 6. Configuration schema and preset authority

**One versioned `CircuitClimbConfigV1`** with immutable resolved copy at `START_RUN`:
- `curriculum` (pack ID, four-row cell rules, difficulty band, deterministic math seed)
- `mode` (`practice`/`climb`/`challenge`, goal type and permitted help)
- `world` (framing percent 80–120, route corners 6/8/10/12, player/pursuer radius and clearance, world retention policy)
- `pursuer` (Brain ID, perception ID, contact radius/LOS/trail, reaction, search strategy, movement, spawn, pressure profile)
- `specials` (row modifier schedule, Pulse charge/radius/effect/expiry, optional registered enemies)
- `presentation` (visual density, contrast, reduced-motion preference, camera easing, VFX opacity, sound/mute settings) -- presentation-only fields cannot change a run's math/state digest unless they are *explicitly* gameplay settings such as world framing
- `integration` (optional host-controlled goal and evidence policy; no hidden arithmetic change)

Use strict validation: reject unknown schema versions, unknown fields, impossible combinations, NaN/Infinity, negative durations, route turns beyond 6–12, unsafe world scale, and unsupported curriculum. A preset has stable ID + semver + checksum; do not allow fallback to unvalidated defaults without recording it. Default/reset/export/import are first-class features. Config selected in Settings is **staged**; active run's hash and fields never mutate invisibly. Developer may deliberately start a new test run with new staged values.

**Seed policy:** a run seed plus independent streams for `math`, `world`, `pursuer`, `special`, `vfx`. Do not use shared `Math.random`; VFX quality changes must not perturb future problem options or bot decisions.

## 7. MathForge host integration — narrow optional port

The **existing host seam branch** is a useful reference: `attempt_evaluated` is source-owned; external mounting and `start/pause/resume/restart` controls exist there; the bridge intentionally does not infer mastery/score/result. It is **not** assumed to be an accepted SDK.

CC2 introduces an internal neutral port, not a fabricated MathForge Gen2 API. Example:

```ts
interface CircuitClimbHostPortV1 {
  readonly capabilities: {
    version: 'circuit-climb-host/v1';
    standalone: true;
    semanticAttempts: true;
    explicitRunResult: true;
  };
  start(config: ValidatedConfig, seed: string): void;
  pause(): void;
  resume(): void;
  restart(): void;
  quit(): void;
  subscribe(handler: (event: CircuitClimbEventV1) => void): () => void;
  snapshot(): PublicRunSnapshotV1;
}
```

- Host **may request** start/stop/goal/curriculum changes at defined boundaries; it may not override math correctness, unsafe movement, pursuer physics, or historical event order.
- Every semantic event is source-authored, immutable, versioned and idempotently identifiable. An adapter can map it to *an actual SDK* only after examining the SDK's real contract and verifying mapping tests.
- `attempt_evaluated` is published at accepted choice; `row_completed` only after landed success; `run_ended` only on explicit terminal. The optional SDK cannot convert a route failure into an incorrect answer.
- **Educational mastery remains host policy**, not game-score policy. Game may publish evidence and a specific authored practice-goal completion; it must not assert mastery simply because a score threshold or survival time was reached.
- React mount/unmount and canvas lifecycle belong to adapter/presentation. Unsubscribe detaches observers; observers cannot mutate core events or derail another subscriber.
- Offline mode operates identically with null adapter. Upon reconnection, the host may receive an ordered event export only through an explicit replay-idempotency policy; never duplicate learning evidence.

## 8. Storage, telemetry and privacy

Local storage allowed for preferences, best-height/score per pack/mode, and optionally user-requested local replay. Version keys, explicit migrations, safe parse and reset. Do not persist raw child identifiers or raw private math performance history indefinitely. No analytics network request without explicit host capability/policy. When telemetry is disabled, the game still works fully and supports manual trace export.

Crash/event report for QA includes source commit, schema/config hash, seed, simulation tick, chosen inputs, failure type and a finite replay window; it does not contain identifiable child data. Diagnostic logs are developer-only, with retention bounded (e.g. last 2,000 ticks in memory), not a growing string attached to React state.

## 9. Presentation separation and accessibility

Canvas paints the world; accessible DOM owns touch/keyboard/screen-reader operands and high-value text. Touch DOM hit rectangles must align to rendered platform coordinates using one projection transform. Avoid duplicate pointer dispatch from overlapping canvas and DOM handlers; route selection is deduplicated by core input token and busy phase.

Small-screen display does not change world collision; renderer uses letterbox/crop-free safe areas, low-end performance budgets and fit-to-board calculations. The top math equation is never hidden by decorative sky. Buttons meet touch target expectations; user preference for reduced motion is honored by presentation adapter only.

Sound engine plays once per semantic event ID, not on each React effect rerender. Pause also pauses any scheduled score/pursuer sounds. Sound settings are independent from game evidence and seed.

## 10. Operational and performance budgets (release targets)

These are **targets to measure**, not achieved results:
- Game thread on low-end target Android tablet: simulation update <2ms P95 in normal one-pursuer play; render work fits a stable 60fps when device supports it, otherwise a usable 30fps graceful mode without simulation drift.
- First interactive screen under 3 seconds on a reasonable mobile connection after assets cached; offline restart unaffected by network availability.
- No unbounded array growth through 30-minute infinite run; cull rendered offscreen rows but preserve minimal replay/evidence records and actor-owned graph nodes until safe retirement.
- World and route preparation is bounded per tick; heavy scenario batch/test runner can run headless without Canvas or React.
- No long main-thread blocking when presets export, replay loads or test inspector opens.
- No hidden layout jump when a message or UI overlay appears, including 320px width and tablet landscape.

## 11. Qualification and rollback

- Standalone preview remains first-class. The game must load from local dev server without MathForge SDK or connected services.
- Legacy SOT-02 seven protected gameplay hashes and accepted 21 capability tests remain comparison references; no rewrite of old tests to manufacture parity.
- On host adapter failure, gameplay continues standalone or fails visibly without misreporting learning evidence; do not silently swallow a malformed host command.
- Version every schema (events, configs, replay) and include migration or explicit unsupported-version behavior.
- CI and human evaluation must agree; red chase-quality fixtures block promotion even if build/unit are green.
