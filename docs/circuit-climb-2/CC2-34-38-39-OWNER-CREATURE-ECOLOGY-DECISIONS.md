# Circuit Climb — CC2-34 Creature Ecology + CC2-39 Visual Foundation
**Date:** 2026-11-17. **Authority:** owner decisions in current dedicated Circuit Climb PM conversation.
**Base:** CC2-32 commit `905fdf36ccdf4b78e27cd17d3ac939b46d8b0ea5`. Protected owner baseline and CC2-MAINT-31 remain unchanged.

## Owner decisions, effective immediately

- **Prioritize Molasses Guardian and Relay Weaver.** Guardian currently works. Relay is newly designed; domain-level source-backed guidance exists in CC2-34 but the full in-game creature and visuals are NOT yet implemented.
- **Tether Slug** is an approved experiment for later study, **not** automatically enabled.
- **Prism Shuffler** is **parked**: do not implement or activate in the next build.
- **Fracture Wisp** remains in the roadmap and is preferred over Prism as the next harmful-world experiment.
- **One interactive creature encounter at a time by default.** This means one selectable creature/one open independent micro-puzzle on the active player view. A completed Guardian can leave a source-owned Molasses effect behind; a later Relay may coexist with that lingering field because the authorities are disjoint (Pursuer movement vs source-backed guidance). Never stack two effects that own the same authority without a formal composition policy. Distinguish active entity vs lingering field.
- UI must communicate the currently active creature, the current ability, and when another creature is not available; no accidental creature interception via platform taps.
- Preserve Slate / Focus 43, original Speed Grid score, real core math, normal three-platform choice, and original result ledger.

## Relay Weaver — owner-authored target behavior

### Player experience
The Weaver is a mobile cyan conductive organism, not a stationary badge. Solving its deliberately chosen optional skip-count challenge earns a **guided relay spanning up to four actual completed rows**. It connects the source-correct platform of each row into an elegant glowing energy path. The child still needs to identify and TAP every marked platform; it does not automatically solve, auto-move, grant completion, or award extra arithmetic score. A new row is credited only by a genuine accepted attempt and physical landing.

### The four-platform lookahead distinction
The current mathematical core generates a new `currentProblem` **after** the preceding correct landing. It does not expose the next four genuine problems or four selected correct platform IDs at the moment the Relay is earned. Therefore there are TWO necessary stages:
1. **CC2-34A implemented headless groundwork:** hold a four-row budget; guide the current real source-generated correct platform; update after genuine `completedRows` increases; never invent future platforms.
2. **CC2-34B not yet implemented:** pre-generate or project the actual next four future problems from the authoritative seeded math stream, including all rebases, three-option identity, full platform positions, and row/cell boundary transitions; prove lookahead is observational (does not advance actual RNG or change future problems) and identical on deterministic replay. Only then can all four platforms be illuminated simultaneously in advance.

A fallback *rolling charged path* is permitted for early prototype testing only if its behavior is explicitly represented as progressive guidance rather than claiming four known pre-lit platforms.

### Educational integrity
- Treat Relay as an earned **temporary assistance power**, not standard-mode autoplay.
- Child actively taps each lit solution and watches the real Spark physically traverse the platform.
- Accessible narration describes the rule or asks a short verbal prediction before a guided row, without blocking normal play; never invent an assessment receipt from narration.
- Guided completion should report `assistanceUsed=true` in any future source-backed achievements/scoring analysis, but **do not** add an artificial flag to old core receipts without a versioned schema.
- The Relay is finite; after four authentic row completions the glow and route exit on an event, not a timer or rendering frame.
- Normal curriculum remains mathematically correct with the guidance disabled.

## Fracture Wisp — next hostile design, no runtime activation yet

### Owner experience
A rust/copper mineral wisp destabilizes the **platform Spark lands on**, over the next approximately four rows. Once Spark truly lands on any such platform, the support turns soft, loses cohesion and drops the child after **two seconds by default** if the next valid move has not begun. It MUST NOT preemptively regrade correct mathematics as wrong.

### Contract before gameplay implementation
- Start a landing-specific deadline only on real source `LANDING_CONFIRMED` and qualifying `ROW_COMPLETED`; the warning must be visible and audible.
- Default `supportTicks=120` at 60 source ticks/second, adjustable via Developer Settings, bounded 60–240 ticks (1–4 seconds) for experiment. Pause freezes ticks.
- Timer must be calculated from source ticks and same-run event IDs, never wall-clock CSS animation.
- If player launches a legal next platform selection before deadline, support timer clears, even if Spark finishes travel later.
- If deadline elapses, emit **one** `PLATFORM_SUPPORT_COLLAPSED` receipt; Spark enters a source-authoritative falling/return state following established wrong-platform physics (never teleport).
- Define **what happens to row ledger, current problem and Pursuer collision during the fall** before enabling: the already-correct math receipt remains truthful, but physical position must fall back and require another valid climb. Never duplicate awarded score or solved equations from repeated falling. Retry/catch balance must be tested.
- Four-row duration counts four qualified future **landing events**; effect cannot spawn an impossible board or break the only reachable path.
- If Guardian and Fracture are present in the same run, their authorities differ; still enforce one interactive encounter at a time and visible transition from one threat to another.
- Effect disabled in normal gameplay until engine-specific fall/return source command, fair collision logic and replay tests are complete.

## Tether Slug — exploratory
The elastic harmful slug may introduce at most two rows of Spark travel slowdown, communicated in advance and counteractable via optional creature gate. Do not activate until a separate movement authority test and same-tick composition contract exist. Do not stack with another Spark travel effect.

## Ecology arbitration
1. One `targetable` creature at a time; inactive creatures can exist visibly but are noninteractive.
2. A creature puzzle opens by a deliberate target action and never hides normal mathematical choices.
3. No two independent creature gates occupy touch space simultaneously; a gate can be declined.
4. Source-owned lingering effects may coexist **only when disjoint authority and geometry** make behavior clear. Molasses affects Pursuer movement in defined field, Relay guidance affects only presentation with source-confirmed math.
5. Creature power activation occurs solely from source receipts; renderer has no permission to apply effects.
6. Event priority: terminal capture/end > primary math selection/landing > creature activation > effect ticking > visuals/audio.
7. All development remains opt-in until real browser and owner acceptance.

## CC2-39 partial visual foundation — production direction
- **Material grammar:** Guardian = translucent pale-green/teal high-viscosity body with slow trailing weight; Weaver = thin cyan conductive strands that travel along real platform-to-platform joins; Fracture = desaturated copper mineral microcracks and powder dissolving under the foot; Tether = smoky graphite elastic filament.
- **Silhouette grammar:** each species must be recognizable in greyscale and at small mobile widths. No family distinguished exclusively by color.
- **Energy behavior:** quiet when idle, visibly energized when source ability earned, decays when effect expires; slow, medium and exaggerated developer range is allowed with caps for mobile performance.
- **Camera:** preserve 3 rows above and 3 below; the chain's glowing lines must lie behind platform numerals and cannot intercept taps.
- **Typography:** white/high-contrast math digits and discreet objective hierarchy; no extra meta buttons over playfield.
- **Sound:** retain existing five-stem Speed Grid reference; Relay adds a sequence of four soft connected musical cues on real row-completion receipts, not a free-running melody or unearned correct chime.
- **Motion & performance:** no DOM heavy per-frame gradients; fixed cap on creature particles, offscreen/bounds culling, adaptive visual quality, reduced-motion fallback. No change to source tick rate.

## Revised near-term implementation order
1. **CC2-34A** commit this design and the source-safe single-encounter/Relay guidance foundation with tests.
2. **CC2-34B** implement genuine four-row source RNG lookahead and full Relay creature actor/presentation, or explicitly label staged rolling guidance until certified.
3. **CC2-38A** introduce ecology scheduler, ability arbitration and safe overlapping noninteractive residue.
4. **CC2-39A** integrate the material/silhouette/energy/movement system into the playable renderer and Developer Studio.
5. **CC2-37** add Fracture Wisp after source-authoritative fall lifecycle is designed and tested.
6. **CC2-35** evaluate Tether after baseline balance; leave Prism parked.
7. Continue existing CC2-40 through CC2-41 for game completion/SDK/release.

## Production gates
- 320/360/390/428 iPhone viewport + 768 tablet: no obscured math targets.
- Math correctness and source ledger invariant with and without effects.
- Deterministic multi-seed replay; no ability action after terminal end.
- Real HTTPS preview tied to exact Git SHA, physical Safari and tablet tests.
- No unapproved owner-accepted visual reset or music replacement.

**Current phase status:** design + headless ecology/Relay source gateway. The visual rendering, four-future-problem projection, full Fracture fall and creature gameplay integration remain open.
