# CC2-30E — Molasses Blanket: One-Way Strategic Pursuer Speed Boundary

## Locked owner gameplay interpretation

A successfully unlocked Molasses Guardian **casts a source-owned blanket** beginning at the ORIGINAL platform's world elevation. The blanket covers the entire horizontal width and every lower elevation (world Y >= boundary Y), regardless of which horizontal lane/column the Pursuer selects. The Pursuer runs at **0.50× baseline speed** while at or below that demarcation; on crossing above the line (Y < boundary Y), its normal movement multiplier is restored. This is a real source-level speed modifier, NOT a cosmetic filter.

The 0.50 multiplier is composited by the established Chase wrapper with its existing legitimate pressure and feature modifiers. Thus the blanket halves the Pursuer's speed relative to what the Pursuer would otherwise do in the same tick, without disabling any previously legitimate temporary power or changing its AI target logic.

## Persistence, ownership and transitions

- Cast must be earned through the separate optional skip-count challenge. Wrong answer/decline gives no slowdown.
- The boundary attaches to the source platform ID and world Y when cast, never to the creature's subsequent visual hops.
- Every column below the boundary is inside. At the boundary the Pursuer remains slowed. Only crossing strictly ABOVE returns normal speed.
- The blanket lasts for the current run without a short TTL; it is destroyed by restart, quit, run end, or session isolation.
- Repeated casts cannot stack multipliers. Each source cast has a causal receipt; physical contacts create contact ENTER/EXIT edges without duplicate records each frame.
- Original CC2-30C localized field is preserved under ordinary `?cc230=1` and in prior replays. Blanket must be explicitly opted in with `?cc230=1&cc230Blanket=1`, which creates a versioned source config with `fieldMode:'BELOW_PLATFORM'` and `slowMultiplier:0.50`.
- Old `cc2-creature/v1` source presets remain valid WITHOUT the optional field; new optional field is strictly validated. The source replay exports the exact mode. Designer presets can set a multiplier as low as 0.45 for experiment, but the accepted default is exactly 0.50.
- In blanket mode, old local `fieldTicks` duration and circular radius remain included in the historical config shape for compatibility but do NOT limit blanket collision. Developer controls label the local-only lifetime appropriately.
- No mathematical authority, answer-platform layout, scoring, Spark movement, Pursuer sensing, world topology or other special abilities changed.

## Visual language

The visual is a low-opacity, thick, transparent flowing blanket extending horizontally across the entire visible board and vertically from source platform elevation down to the board's bottom. A sharply readable glowing line marks the boundary. This is a projected viewport approximation, not a new gameplay collider. When the source platform scrolls offscreen the best-effort rendering projects relative to the current row; collision always uses the true world-coordinate boundary and is unaffected by rendering, screen size, opacity, or reduced motion.

## Qualification

1. Source-level equality: fixed stationary world Y on cast; no x limitation; speed multiplier 0.5 for any bot x below boundary; exit on y < boundary; reentry receives 0.5 again; no unexpected timeout.
2. Unauthorized overlapping casts reject; wrong optional gate earns no field; reset/new run/quit clears field.
3. Historical source regressions and exact deterministic replay, including old local-field mode.
4. Real browser touch 320/390/768: start, two rows, optional creature challenge, field coverage full board width with downward direction, viewport/clipping, source math score untouched, no horizontal overflow.
5. Reduced-motion disables nonessential fluid animations. Rendering never covers or blocks legitimate mathematical touch controls.
6. Exact GitHub CI and READY Vercel deployment on same commit, then **physical iPhone/tablet acceptance**. CI alone does not authorize release.

## Playable URL convention

`/cc2-30.html?cc2Ui=slate-focus&cc230=1&cc230Blanket=1`

## Next after owner acceptance

One interaction matrix for special powers and hazards, including blanket intersection with the CC2-28 special platform pressure modifiers, Spark upgrades, temporary Pursuer boost, captures, pause/resume, and future Tether Slug. All game-modifying powers need this kind of source-authority proof before full commercial integration.
