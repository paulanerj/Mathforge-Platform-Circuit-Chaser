# CC2 — Parity, source custody, and decision register v0.1

**Date:** 2026-11-11 | **Phase:** CC2-00 | **Status:** document/source reconnaissance complete enough to propose design; executable qualification not yet performed.

## Source-of-truth map

| Role | Source | Status |
|---|---|---|
| Accepted gameplay | `paulanerj/Mathforge-Platform-Circuit-Chaser@c8838c30947c2a561bfc8322a6159e4f28fef61a` | PROTECTED; accepted SOT-02 product |
| QA infrastructure | `@eac8d8337a30d22cd41f09b6d78f0e73474cb390` | PROTECTED; browser-smoke additions, no gameplay changes |
| SOT-02/transfer | `@0a6f138f229119bc6b6c15ee1f658046c7075f50` | PROTECTED; source document and restore package |
| Original SOT branch | `circuit-climb-successor-sot-02` | READ ONLY for CC2 work |
| Later Graph V2 pursuer R&D | `@d7a8115ac03672c10ec1f060c8cf9d57b2422bc3` / `pursuer-v2/` | EXPERIMENTAL evidence, not automatic product promotion |
| New production successor | `circuit-climb-2-production` | DESIGN branch; based on 0a6f138, separate from main and R&D |

Do not conflate Circuit Climb / Platform Chaser with Math Circuit Chase or Skip Count Tower. The former is the vertical climbing three-platform arithmetic and red pursuer game.

The SOT-02 document in `src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md` remains the authoritative reference for *what the original product does*. These CC2 documents are authoritative for the **new proposed design direction**, not a declaration of implementation or supersession.

## Accepted capability invariants — parity gate

Before CC2 becomes a playable candidate, it must pass at least equivalent checks:

1. Blue Spark carries current numerical value.
2. Every row offers three numbered destinations and exactly one mathematically correct answer.
3. Learner picks destination; game computes right-angle travel, no manual steering.
4. All offered destinations have a legal route in supported framing configurations.
5. Wrong destinations can be selected and visibly short/return; never silently blocked.
6. Pursuer position never vetoes a destination.
7. Correct landing powers platform green and progresses math.
8. Pursuer is physically constrained; capture ends the run.
9. Pause freezes every simulation subsystem; resume preserves run state.
10. Restart yields clean state, correct reset data and valid new choice.
11. Mid-transit shield remains active until an explicit future product decision.
12. Shared collision/corridor geometry; no actor can tunnel through a blocked platform.
13. Default 100% layout equivalent to SOT-02 geometry; reflow remains playable across 80–120%.
14. Pure learner-selection results must name all rejection modes; no silent route failure or zero-length teleport.
15. Diagnostics and accepted capability-lock tests cannot be weakened to achieve a green release.
16. Learner math evaluation, movement, landing, and capture events are consistently ordered with no double-credit.
17. A visually rendered board must also be truly selectable; browser smoke checks both.

**Historical SOT-02 results:** 206 unit tests, 21 locks, 61 browser checks; responsive smoke at 320/390/430/590/768 px. These are previous claims corroborated by repository documentation and commit metadata; they are **not freshly executed in this CC2 session**. Run them afresh in the implementation environment before using them as a promotion gate.

## Known SOT-02 limitations to carry, not hide

1. Alive-pursuer settings were provisional, calibrated by feel.
2. Player route avoidance rarely exercises a meaningful alternate route.
3. `arrive`, `updateTravel` and drawing are still entangled in the old runtime closure and lack direct unit reachability.
4. Browser acceptance depends on available Chromium.
5. Historical pursuer fixtures duplicate production-row geometry.
6. `PURSUER_NOT_CLOSING` diagnostic can legitimately fire when the learner is climbing ahead.

The later Graph V2 / PURSUER-04C work also shows the importance of explicit sensor contracts and unified run configuration. It reported a human 'bot gets lost' failure and discovered configuration disagreements and frame-based reaction windows. Treat this as an engineering warning and a source for candidate techniques, not proven current success.

## Product decisions and current position

| ID | Decision | Working PM direction | Finality |
|---|---|---|---|
| D01 | Original's destination-over-path choice | Preserve exactly | ACCEPTED IN SOT-02 |
| D02 | Exact one correct among 3 | Preserve and solver-test | ACCEPTED IN SOT-02 |
| D03 | Wrong platform shorts/returns | Preserve; specify timing and event order | ACCEPTED IN SOT-02 |
| D04 | Shield during automatic transit | Keep ON initially; measure fairness impact before changing | OPEN SHIPPING DEFAULT |
| D05 | Pursuer architecture | Shared geometry; perception-limited route-capable agent | PROPOSED CC2 |
| D06 | Pursuer failure standards | Separate legitimate loss-of-sight from unrecovered deadlock | OPEN, CC2-01 |
| D07 | Practice/Climb/Challenge profiles | Three simple modes, curriculum independent | PROPOSED CC2 |
| D08 | Special platform launch scope | Capacitor + Relay first; Stabilizer only after chase tests | PROPOSED CC2 |
| D09 | First player ability | Circuit Pulse: earned temporary slowdown, not answer help | PROPOSED CC2 |
| D10 | Extra enemies | Defer Sentry/Scout/Interceptor until main pursuer proven | DEFERRED |
| D11 | Content/operations expansion | Addition/subtraction first; curriculum packs verified separately | PROPOSED CC2 |
| D12 | Visual language | Clean MathForge geometry, clear numbers, responsive HUD | PROPOSED CC2 |
| D13 | SDK approach | Host-neutral core plus thin adapter, no premature Gen2 coupling | PROPOSED CC2 |
| D14 | Run end and scoring | Capture ends run; score and correctness evidence are separate | PARTLY ACCEPTED / NEEDS SPEC |
| D15 | Mathematical candidate reveal and value update timing | Audit existing implementation; freeze explicit ordering | OPEN |
| D16 | Bot spawn, sensing and pursuit fairness | Reconstruct human play fixtures, measure, decide per mode | OPEN |
| D17 | World generation/culling | Keep topology navigable through ascent; bounds and history measured | OPEN IMPLEMENTATION DETAIL |
| D18 | Accessibility, audio, reduced motion | Release requirements, controls in Settings | PROPOSED CC2 |
| D19 | SDK activity evidence | Semantic events from core; exact host schema TBD | OPEN ADAPTER DESIGN |
| D20 | New branch promotion | Never overwrite accepted baseline; explicit PM/owner gate | DECIDED |

## CC2-00 remaining executable audit

1. Check out the frozen SOT-02 transfer state and separately the Graph V2 R&D baseline; record exact trees, hashes and dependency environment.
2. Re-run the original 206 unit tests, 21 locks, 61 browser checks and device matrix; capture output rather than citing history as new evidence.
3. Enumerate game systems and current features from source, including exact math generator distributions, scoring, transit and capture precedence, settings, sound, replay and build harness.
4. Enumerate all newer pursuer variants and their source histories; list the ones that pass/fail meaningful movement tests and their known limitations.
5. Reproduce a minimum set of old bot failures in a real browser with capture traces and human observations, then turn each into a seed-backed fixture.
6. Obtain a first playable spec/vertical board mock and check that the proposed HUD and modifiers do not impede mathematical comprehension.
7. Freeze CC2-01 product rules before writing replacement engine code; record decisions in this register, not only in chat.

## Workstream safety

- No unauthorized edits to protected `src/games/circuit-climb/` on accepted branches.
- No direct replacement of `main`; no force-push, no source data deletion or opportunistic branch merges.
- Successor code, when authorized, uses an isolated surface path and retains standalone app preview.
- All pull requests should state changes versus prior accepted behavior, tests added, tests rerun, device and human evidence, and rollback point.
- If the new platform/ability/enemy mechanic compromises a math or reachability lock, cut the mechanic rather than the lock.
