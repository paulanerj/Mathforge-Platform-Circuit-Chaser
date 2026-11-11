# CC2-01 — Decision Register, Open Risks and Design Freeze v1.0

**Status:** PM decision-grade design baseline on `circuit-climb-2-production`. **Not release-approved or shipped.** This register supersedes the v0.1 *2.0 proposal wording* where incompatible, but never supersedes historical facts of protected SOT-02.

## 1. Source authority and non-negotiable preservation

- Frozen accepted **gameplay**: `c8838c30947c2a561bfc8322a6159e4f28fef61a`.
- Frozen accepted **QA**: `eac8d8337a30d22cd41f09b6d78f0e73474cb390`.
- Frozen **transfer**: `0a6f138f229119bc6b6c15ee1f658046c7075f50`.
- New design branch: `circuit-climb-2-production`; do not merge into original or overwrite `main`.
- Exact accepted geometry, wrong-choice physical travel/short/return, destination-selection grammar, capture terminal and no route veto are SOT-02 parity requirements unless documented as explicit changes.
- R&D 07B1 and Graph 04C are engineering evidence/candidates, not a replacement player-facing authority.
- CI reproductions are documented in [CC2-00 evidence](./CC2_00_EXECUTABLE_EVIDENCE.md).

## 2. Named design decisions

Status meanings: **LOCKED (PM CC2 design)** = specified for successor build but not proven/implemented; **REFERENCE** = preserved original historical behavior; **PROVISIONAL TUNING** = target with explicit playtest gate; **DEFERRED** = not first-release required; **OPEN INTEGRATION** = external SDK or product acceptance required.

| ID | Domain | PM decision | Status |
|---|---|---|---|
| D01 | Player action | Pick one of exactly 3 numbered destinations; no path steering | REFERENCE / LOCKED |
| D02 | Math | Exactly one mathematically correct option; wrong options physically selectable | REFERENCE / LOCKED |
| D03 | Wrong | Outbound to wrong platform, short and return to source; don't regenerate question | REFERENCE / LOCKED |
| D04 | Transit | **New CC2 clean-start shield ON**; wrong return protected too | LOCKED, source-doc discrepancy explicitly resolved for CC2 |
| D05 | Pursuer | Layered world/perception/Brain/graph locomotion/capture, no oracle | LOCKED |
| D06 | Search | Recent sightings bound commitment; expand frontier, no absorbing stale-X sweeps | LOCKED; measured timing provisional |
| D07 | Modes | Practice/Climb/Challenge; math difficulty independent of chase | LOCKED |
| D08 | Special platform scope | Launch row-wide Capacitor + Relay; no answer-position leak | LOCKED |
| D09 | Ability | First ability Circuit Pulse earned by correct play; slowdown only, not answer/reverse capture | LOCKED; radius/effect duration provisional |
| D10 | Extra enemies | Sentry Arc/Scout/Interceptor/Warden designed but **not** launch prerequisites | DEFERRED |
| D11 | Curriculum | Launch `add20`; addition/subtraction etc are independently validated later packs | LOCKED / DEFERRED future packs |
| D12 | Presentation | MathForge restrained Monument-Valley-like identity, one compact top region, one bottom row, readable numeral contrast | LOCKED |
| D13 | SDK | Pure standalone core + optional narrow host bridge with source-owned events; no invented SDK mastery | LOCKED; actual SDK mapping OPEN INTEGRATION |
| D14 | Results | Capture terminal for Climb; run goals explicit; score never equals mastery | LOCKED |
| D15 | Math continuity | **Carry true result for four correct rows, then explicitly rebase** at power-cell boundary, never silent random value | LOCKED; deliberate divergence from original runtime |
| D16 | Chase fairness | Finite sensing and bounded reacquisition; pressure from mode not hidden right-answer access | LOCKED; quantitative quality to verify |
| D17 | Geometry | Shared actor-safe collision and route graph; 80–120% world framing; no path-void fallback | REFERENCE / LOCKED |
| D18 | Accessibility | Semantic DOM options, touch and keyboard, high contrast, reduced motion and audio controls | LOCKED |
| D19 | Learning evidence | Source-owned `attempt_evaluated` only on accepted route; `row_completed` only on successful landing | LOCKED; adapter mapping OPEN |
| D20 | Promotion | Protected SOT unchanged; explicit candidate/PM/owner review, no automatic main merge | LOCKED |
| D21 | Alternate movement | Keep Circuit and Hop; same math and result; switch only while not traveling | LOCKED |
| D22 | Wrong attempt ledger | Record exactly once at accepted selection; no row completion on wrong | LOCKED |
| D23 | Perception policy | Initial nearby signal 260, clear LOS 420, trail contact candidate; production truth firewall | PROVISIONAL TUNING |
| D24 | Ability/hazards | Timed typed effects, row-wide no-leak metadata; no transit kills | LOCKED |
| D25 | Run terminal | Exact once `RUN_ENDED`; finish goal landing wins same-tick tie, unprotected prior contact precedes new action | LOCKED |
| D26 | Cell size | Four correct rows/cell; starter `add20`: start 2–4, addend 1–4, max result 20 | LOCKED, extendable curriculum |
| D27 | Input/guard | Busy, dead, paused, invalid row or no-route selections do not count as attempts | LOCKED |
| D28 | Time | Fixed simulation 60Hz; tab background suspends instead of catch-up; pause freezes all systems | LOCKED |
| D29 | Landing grace | Proposed 250ms protected after any automatic landing, adjustable by measured policy | PROVISIONAL TUNING |
| D30 | Score | Transparent rows/first-try/checkpoint formula, independent of raw attempts/accuracy | PROVISIONAL BALANCE |
| D31 | UI global actions | No dead Undo/Previous/Next inside endless chase; host navigation can live in paused shell | LOCKED |
| D32 | Special schedule | Capacitor every 6th after first cell, Relay every 4th, shared-row motifs; overlap precedence documented | PROVISIONAL BALANCE |
| D33 | Capture consequence | No lives in Climb/Challenge baseline; Practice pursuit cannot capture by default | LOCKED |
| D34 | Replay | Versioned seed+config hash+input-at-tick replay; separate random streams; headless runner | LOCKED |
| D35 | SDK scoring | Game reports local result/evidence, not grade/mastery; assignment success is explicitly requested goal | LOCKED, mapping OPEN |
| D36 | Human acceptance | No bot promotion without real gameplay video/trace and purposefulness/fairness review | LOCKED |
| D37 | Device target | Mobile-first iPhone/Android tablet, 320px minimum, landscape/desktop supported | LOCKED |
| D38 | Save policy | Local preferences/best score, optional replay, no mandatory online/account/profile | LOCKED |

## 3. Residual CC2-00 evidence blockers (not a design contradiction)

**B00-1:** The two SOT-02 source facts are established from code, but a new instrumented real browser trace of `player.value` before/after a correct landing and clean-start shield default was not captured in CC2-00. CC2 decisions D04/D15 explicitly replace historical behavior and are not dependent on claiming old source behaved otherwise.

**B00-2:** The standalone lab's 07A/F08 reacquisition failure has a documented deterministic fixture and output (zero reacquisitions); independent human-play video/trace against the final experimental Brain is not yet attached. Need benchmark as first CC2-02B test.

**B00-3:** Lab browser script fails to start/detect Vite in CI; deterministic fixture runner does not accurately propagate expectation failure. This is **harness repair scope**, not evidence that bot behavior passes.

**B00-4:** Actual iPhone Safari and Galaxy Tab S6 Lite owner sessions not yet performed. They are release gates, not prerequisites to drafting architecture.

## 4. Items intentionally not frozen yet

- **Chase speeds/detection radii/timing windows**: values are initial test candidates; accept from same-input comparative graphs and real owner experience.
- **Pulse radius, effect multiplier and charge pacing**: provisional tuning until pursuit remains consequential and the effect is readable.
- **Landing grace duration**: 250ms starting proposal, not a scientifically established fair window.
- **UI art assets, exact font and sounds**: visual identity is locked, implementation to be reviewed with device captures.
- **Optional stage modifiers, enemy variants and boss**: designed but not first-launch commitments.
- **Actual MathForge SDK adapter type names and output schema**: inspect real SDK; don't manufacture assumptions.
- **Production performance data**: target budgets are defined but no CC2 code exists to measure.
- **Numerical Pursuer reacquisition and closing quality thresholds**: measured in CC2-02 with recorded seed population and human sessions.

These are the only appropriate areas for calibration without changing the frozen core gameplay contracts.

## 5. Formal design-freeze condition

**PM design completeness:** The seven companion CC2-01 specifications together cover product loop, math, run/turn event order, capture priority, pursuer observations/search, platform modifiers, ability, modes, progression, UI accessibility, SDK boundary, deterministic replay and QA. This is sufficient for **isolated, gated engineering design and implementation**.

**No release claim:** `CC2-01 DESIGN COMPLETE` means the developer has enough information to build, not that the game is production-ready. `CC2-00 FULL ACCEPTANCE` remains held for real trace/owner review; `CC2-02` implementation must be isolated from original and cannot be promoted without evidence.

**Change control:** Any later proposed rules change requires:
1. Named decision ID + prior/new behavior, rationale and acceptance impact.
2. Cross-document references updated coherently.
3. New or modified tests that fail against the wrong behavior.
4. A versioned config/schema migration where relevant.
5. PM acceptance, and owner review for changes to core learner math, collision, capture or visual game identity.

## 6. When to stop a coder immediately

Stop and do not alter acceptance criteria when:
- A selected mathematically live destination cannot be routed.
- A wrong option is prevented from being selected because it is wrong.
- A spark number changes without solved arithmetic or explicit rebase.
- A bot reads hidden truth, answer, intended destination or future route.
- A shielded Spark is captured, a grounded capture occurs without overlap, or pause advances simulation.
- A learning attempt or row completion is duplicated, missing or generated from visual callbacks.
- Test runner returns success with known unmet acceptance expectations.
- Original SOT-02 files, branch or tagged reference are modified without authorization.

## 7. Progress accounting at authoring

**Completed:** source audit, original CI proof (206 unit/61 browser), 07B1 engineering CI (351/61), Graph V2 engineering CI (487), and the normative CC2-01 design package.

**Still pending:** CC2-00B trace reproduction, proven pursuer replacement, new runtime, designer preset UI, physical-device QA and optional SDK mapping.

Owner/PM can review the design while the old game remains playable. Implementation is scoped next in [CC2-02A coder handoff](./CC2_01_CODER_HANDOFF_02A.md).
