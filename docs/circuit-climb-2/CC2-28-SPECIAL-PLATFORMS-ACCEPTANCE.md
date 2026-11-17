# CC2-28 — Special Platforms, Hazards and Ability Strategy

**Source:** isolated `feature/cc2-28-special-platforms-hazards-ability-strategy` child of verified CC2-27 `4f755aa76f783557742fa86743005921e5fdabfc`. **Status:** owner-review candidate, not merged, not production certified. Current **standard** `cc2-28.html` URL without `?cc228=1` intentionally preserves CC2-24/25 source and CC2-26/27 opt-in boundaries.

## Product requirement

An elementary learner should be able to recognize a special platform before selecting a number, understand what it will do, observe a precise cause/effect when the REAL source event happens, and make an informed decision about when to spend earned Pulse charge. A special effect must not reveal which answer is correct.

## Active mechanics (only when `cc228=1`)

| Role | Trigger | Actual source effect | Player-readable feedback |
| --- | --- | --- | --- |
| Capacitor | Real `ROW_COMPLETED` row 6,18,30… and `CHARGE_GAINED` receipt with `CAPACITOR` | Existing FeatureProgression grants up to two charge, limited by existing capacity (can be **0 if already full**) | Every option has the same gold mineral mark; physical completion produces a gold burst with the **actual** earned increment |
| Relay | Real `ROW_COMPLETED` row 8,12,16… plus real `RELAY_CHAIN` receipt | Existing circuit illumination continues; CC2-28 additionally grounds any active Surge and provides one-row grounded protection. No points/answer change | All three options share the same cyan relay; source receipt creates a blue linked-circuit event; grounded surge has separate proof |
| Surge | Real `ROW_COMPLETED` on row multiples of 7, starting at 7. The warning is **row-wide across all 3 number options** | After 45 simulated ticks of warning, an active Surge can add max 7% to Pursuer speed for at most 120 ticks, **only while the original Pursuer genuinely has live pursuit sight**. No secondary capture, no hidden math change. | All options get the same orange angular symbol. After physical landing show countdown, then active state; explicit expire/ground/discharge |
| Circuit Pulse | Existing source-owned full-charge + grounded + nonpractice acceptance; `ABILITY_ACTIVATED` receipt | Existing in-range Pulse slows Pursuer. When CC2-28 enabled, an **in-range successful Pulse** also discharges an active/warning Surge. Out-of-range Pulse **still spends charge and does nothing to threat**, preserving original rules. | Before use, button indicates in/out of range in title/accessibility and signal color; verified hit/miss shows red/blue localized shockwave and an event caption |

**Combo priority**: An active Relay guard protects a surge on the next row, then is consumed; a Relay completed while a Surge is active also grounds it. If Scout/Sentry simultaneously contribute pressure, the source takes **max(secondary,Surge)**, never multiplying effects. Existing Pulse slowing remains a separate earned defensive multiplier. The total source threat is bounded by the existing capped secondary policy. Practice remains nonthreatening. No changes to the score, accepted attempts, mathematical problem seed, answer, route, world geometry, Pulsar capture authority, host SDK, stored achievements, or accepted music.

## Timeline and event authority

- `specialDirector28.ts` is deterministic 60Hz source policy with an exact `cc2-specials/v1` config, strict field whitelist, immutable clones, distinct run scopes, bounded event IDs, replay serialization and no direct world/answer access.
- It consumes the actual `ROW_COMPLETED` and established feature ledger **after** FeatureProgression. It will reject missing proof for earned powers and cannot claim a Relay or Capacitor on selection alone.
- It exposes `SURGE_WARNING`, `SURGE_ACTIVE`, `SURGE_GROUNDED`, `SURGE_DISCHARGED` and `SURGE_EXPIRED`. Renderers read these but cannot issue them.
- A warning is valid from its real source landing tick. Paused/terminal runs cannot secretly advance. Capture/quit/restart clears live pressure and guard. Old replay input lacking `specialConfig` remains exact.

## Visual package / Developer Settings

The optional CC2-28 controller adds a **bounded decorative layer inside each existing platform button**, never a full-screen composited canvas (explicit black-board regression blocker). Three minimal material styles (`mineral`, `glass`, `wire`) use distinct shapes, colors and restrained loops, with the number staying visible. Each button has immediate pointer-down reaction and genuine event-driven feedback from validated source receipts. The real Pursuer location anchors Pulse/discharge rings. Events provide optional quiet generated tones while preserving the CC2-24 Speed Grid soundtrack.

Settings → Developer → **CC2-28 · Special Platform Studio**: compare four labelled **VFX PREVIEW ONLY** effects, adjust material / intensity / loop / particles / audio, paste strict JSON, export preset and reset. Preview must leave core tick, score, source digest and charge exactly unchanged. All interactive signals have reduced-motion support. The HUD includes a compact upcoming-specials text to avoid learners missing row 6/7/8.

## Test/acceptance gates

1. Determinism: 187 prior tests + new seeded real math and strict configuration cases, replay exact, owner-accepted feature balance and chase parity preserved.
2. Correctness: source counter and ledger align; wrong-platform attempts never charge or start a hazard; all 3 offered answers share the same special motif; preview is visual-only.
3. Physical event: cap row 6 + surge row 7 + relay row 8 validated in real browser and unit tests; if original Pursuer lacks live sight, Surge pressure is 1.00; Relay/Pulse disarm receipts are distinct and idempotent.
4. UX: no black canvas, no hitbox obstruction, one browser real pointer click at 320/390/768, reduced motion, no layout overflow, accessibility labels, safe recovery.
5. Parent regression: CC2-27 encounter, CC2-25 music/debrief, CC2-21 capture cohesion, CC2-16B player first tap, fully offline single-file and Vite preview build. Owner device aesthetic and actual challenge balance remain open.
6. Delivery: a CI artifact `CC2-28-Special-Platforms-Hazards-Strategy-Playable.html` built from exact committed source and a Vercel direct page `/cc2-28.html` **only after a matching READY deployment and observed HTTP page response**. Vercel's deployment quota may defer the hosted URL; never link to a stale SHA.

## PM decision

Keep the first four rows simple; the child encounters their first true special at row 6 (Capacitor), then Surge at row 7 and Relay at row 8. This is intentional learning cadence. No additional ambiguous special types are being represented as if their mechanics are finished.

Future **CC2-28B** may explore individual platform hazards, direction-dependent routing and combination chains, but only with proven fairness, all-option mathematical solvability and separate explicit owner approval. Next product **CC2-29/30**: persistent source-backed achievements, personal best and optional finite onboarding mission; no silent default Endless Climb replacement.
