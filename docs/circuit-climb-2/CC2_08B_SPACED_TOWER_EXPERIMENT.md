# CC2-08B — 1.5× additional platform-row spacing (isolated owner experiment)

Date: 2026-11-13
Status: playable offline experimental artifact; NOT source merged, no release or SDK promotion.

## Owner request
Rows are still too tightly stacked, making Spark's stair-step route seem like a teleport rather than an expressive zigzag. Change ONLY the vertical physical row separation, by a factor of 1.5 over the CC2-08 current state; do not arbitrarily rebalance Spark or Pursuer speed.

## Exact physical change
- Original baseline physical gap: 205 world units.
- CC2-07E/CC2-08 physical gap: 307.5 world units (1.5× baseline).
- CC2-08B proposed: **461.25 world units** (1.5 × 307.5; 2.25× baseline).
- The offline owner playtest extends accepted optional `rowGapScale` values to `1|1.5|2.25`, defaults the current energetic preset to 2.25, and exposes all three settings in Developer Laboratory.

## Critical camera coupling
The production camera's previous 2+2-tier auto-fit divides zoom by row gap. Simply enlarging the world by 1.5× would preserve roughly the same apparent screen spacing and hide the user's requested effect. The candidate uses the previous 307.5-unit gap as its framing reference when the new 461.25 gap is active. This necessarily shows fewer tiers in frame (~1.6–1.9 visible each side in Chromium, rather than 2.4–2.8); keep the actual current answer row fully visible. Legacy 1× and previous 1.5× settings retain the former camera behavior. This is a limited, intentional exception to earlier CC2-06A 2+2 camera contract pending owner evaluation.

## Guardrails
Spark circuit speed 24 world units/tick (unchanged). Pursuer speedSearch 4.8, speedPursuit 6 (unchanged). The arithmetic, answer assessment, navigation, finite sensing, and scoring source is the same offline 07E/08 executable bundle except the validated configuration and render-only camera path. The separate read-only CC2-08 observer remains.

## Qualification performed in local HTML
- Chromium 320×568, 390×844, 768×1024, 826×680: active `world.geometry.rowGap === 461.25`, replay `rowGapScale === 2.25`, unchanged Spark/Pursuer speeds, page-error-free initialization, usable selectable choices, no horizontal overflow, actual session report schema.
- Live click of valid answer on 390px: Spark advances along multiple distinct continuous world positions to row 1, source motion remains real and not a render-only teleport.
- SHA-256 of downloadable owner artifact: `fde7547f2691f03da6465601c79b56171bec8aeb1d39e38ab78dca142a67227a`.

## Important status boundary
The artifact is a local, self-contained playable experiment patched from the recovered authenticated CC2-08 library HTML. The TypeScript repository has NOT been updated or CI-qualified for the 2.25 multiplier; do not claim a source-built production candidate. Next acceptance gate: owner tests motion and framing, then implement this change in the isolated source branch with updated camera and geometry regression tests and full CI.
