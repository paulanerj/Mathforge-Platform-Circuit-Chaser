# CC2-30A — One-Creature Architectural Vertical Slice & Next Phases
**Engineering state:** GitHub draft PR #40 on isolated `feature/cc2-30a-molasses-creature-architecture`; NOT merged, not owner-accepted, CI not yet confirmed, Vercel preview unverified. Baseline CC2-28 SHA `441f74c4fdc5dcb6ea5f4bf1045e08647a43515c` remains protected.

## Why only one creature?
The first Molasses Guardian proves actual independent world authority and a reusable set of interfaces before implementing five unrelated species. The alternative (six visual recolors before source contracts) would make world-affecting abilities impossible to manage and balance. The owner is authorized to tune visuals and behavior through versioned presets, but never through arbitrary JavaScript or authority-changing visual settings.

## Source module boundaries
- `core/CircuitClimbCore.ts` (protected): primary mathematical problem, legal answer, accepted route, right/wrong accounting, capture, pause and run lifecycle.
- `features/creatureEcology30.ts` (new): schema, strict config, six-species capability catalog, seeded Molasses hop/window/micro-passkey, source receipts and finite directed Pursuer speed field.
- `pursuer/CircuitClimbChaseCore.ts` (opt-in diff): clock integration, gate commands/replay, bounded field-to-Pursuer physical multiplier, capture precedence, direct source projection.
- `devtools/cc2-02a.ts` (opt-in port): public read-only projection + controlled `offerCreature/answerCreature/declineCreature`; engine retains authority.
- `devtools/cc2-30-creature.js/.css` (visual): actual board-anchored creature control, skip-count bubble, one fluid field and standalone VFX studio with apply/reset/import/export. The visual studio cannot change mathematical credit or Pursuer speed.
- `devtools/buildPortable16A.mjs`, `publishCC227Preview.mjs`: reconstruct fully inline /cc2-30.html, never replace historical root.
- `features/creatureEcology30.test.ts`: seeded gate, historical parity, deterministic replay, field expiry, cap, state safety.

## Most important extension rule: each ability uses its OWN world authority
A creature may only emit a request of a **typed capability** with explicit preconditions and bounds. Never let an animated actor edit game state directly. The six catalog slots are:
| Slot | World authority | What new source primitive is needed before that species can be enabled |
| --- | --- | --- |
| Molasses Guardian | PURSUER_MOTION | Already prototyped: one bounded slow multiplier on actual bot/field overlap |
| Tether Slug | SPARK_MOTION | Travel clock modifier, capped by 2 real rows or tick TTL; currently **not implemented** |
| Capacitor | ECONOMY | Source-owned charge/score receipt and no double-credit; **not implemented** |
| Relay Weaver | WORLD_TOPOLOGY | Source platform durability/grounding after legal landing; **not implemented** |
| Prism Shuffler | MATH_OPTION_LAYOUT | Atomic next-row option/ID/hitbox permutation **before** any player input; **not implemented** |
| Fracture Wisp | WORLD_TOPOLOGY | Source expiry/recoverable row action, qualified against replay+solvability; **not implemented** |

Each new ability must add (a) typed input/observation (b) bounded reversible source effect (c) causal receipt (d) visual representation (e) separate micro challenge generator/puzzle difficulty (f) at least one matched-seed counterfactual fairness test (g) optional song voice. A creature cannot request unrelated authority just by setting a new configuration parameter.

## Caveats, not accepted yet
1. The prototype creature **occupies physical platform IDs** and periodically relocates, but the browser's body is still a simple bobbing, board-anchored jelly button. True interpolated hop arcs, fluid mass/inertia and readable platform residue remain follow-on visual milestones.
2. The authoritative field is a **bounded directional radius** centered at an actual platform, not a full viscous-fluid or arbitrary polygon simulation. The visible flow is illustrative; matching its collision bounds with the rendered liquid must be visually qualified.
3. The prototype offers a separate skip-count microgate and source-authorized bot slowdown but **no scoring bonus**, no ability economy, no harmful effect, no post-cast creature musical voice integrated into the approved score. A small independently generated synthetic cue is provisional and must be unified with the master transport.
4. Creature world effects do not yet alter Spark and do not affect other creatures. This keeps CC2-28 special policy and secondary enemy threat composition unchanged except a real bot speed modifier on the test URL.
5. Existing easy intro and source target presentation remain; CC2-29 layered target stack is a distinct phase, not silently bundled into CC2-30A.
6. The normal CC2-28 URL and replay contain **no creature fields**, preserving source digest compatibility. No default game promotion until tests and physical owner acceptance.

## Future phase dependency order
- **CC2-30A2 — Proof hardening:** source CI, exact replica replay, 390/768 real touch audit, browser input focus, definitive geometry for fluid collision, animation instrumented, user-accessible independent preview.
- **CC2-30B — Creature SDK v1:** extract a bounded ability-handler interface/registry, instantiate new species via typed manifests and hooks instead of conditional branching, design snapshot+effect component ownership, implement visual/behavior config schema and preview tests.
- **CC2-30C — Fluid/material studio:** produce actual viscous hose topology and momentum-like animation while preserving 60Hz touch responsiveness; add saved material and musical presets and device performance budget.
- **CC2-30D — One complete Guardian:** real Pursuer collision deformation, natural hop arcs, residue ledger, beat-synchronized score events, telemetry showing exact benefit vs baseline.
- **CC2-31 — Reciprocal Tether:** first negative creature, source-owned Spark slow travel exactly <=2 rows; prove any new ability can be written without modifying primary math and with minimal chase wrapper modification.
- **CC2-32 — More authorities:** Capacitor charge, Relay topology, Prism atomic shuffled row (future inactive only), Fracture temporary instability (never source-false math).
- **CC2-33 — Layered target + strategic mission:** fold CC2-29 objective stack into experience after UX test, optional tutorial, mission scoring, adaptive Pursuer pressure, music and Gen2 host.

## Owner's acceptance question
Can a learner distinguish that the Guardian's option is **not** another primary answer platform, intentionally open its skip puzzle, answer it, SEE an actual bot slowing when physically entering gel, and then maintain a playable primary climb without misgraded mathematics?

If not, the first creature isn't a ready template regardless of how attractive its VFX looks.

## Release discipline
- One experimental URL flag: `?cc2Ui=slate-focus&cc230=1`; other experiments not automatically enabled.
- CC2-28 opt-in unchanged without `cc230=1`; no `main` merge or protected source rewrite.
- Browser controller introspection `window.__CC2_30__` and `window.__CC2_02A__.creature()` are developer-only diagnostics.
- Do not call this a production playable build until the exact Git SHA is built, checks pass, a Vercel deployment is READY and the owner can load it.
