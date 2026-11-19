# Circuit Climb 2.0 — CC2-46B Molasses Surface / Smear Creature

**November 19, 2026 · owner-requested special redesign**

**Parent:** `feature/cc2-46-source-plasma-conduction-20261119` at documented source commit `fb166b627e05731de184a721b2c00ab5b8f5cf29`. All original CC2-45 accepted dimensions, pre-numbered source future rows, disappear-on-land, 3-above/1-below camera, spacing slider and canvas fallback remain protected on `preservation/cc2-45-owner-accepted-20261119` at `0a905c57e0f46c8165f036dd5e334731ed05a9ab`.

**Working branch:** `feature/cc2-46b-molasses-smear-surface-20261119`. Draft/unmerged pending owner visual assessment.

## Owner goals

1. Molasses physically slows the Pursuer to **20% of original speed** (an **80% reduction**), with a plainly visible reaction.
2. Render a flat but substantial thick-syrup or looser-than-honey material. Draw a bow wave in FRONT of the advancing bot, a dragged trough and slow wake BEHIND it.
3. Do NOT draw a green opacity overlay covering the entire game, player or red Pursuer. The syrup must be below the bot, which pushes over its surface.
4. Change Molasses Guardian identity from a bouncing green sphere into a side-traveling smear/snail, with stretching front and lagging back; compress and settle after movement. Keep its independent math-challenge gate and accessible touch target.
5. Expose five designer controls: slow strength, smear length, wake persistence, bow-wave size and recovery time.

## Implementation and source authority

- The new `cc246b=1` standalone preview installs the authoritative source config `fieldMode:'BELOW_PLATFORM', slowMultiplier:.20`. This passes strict `CreatureConfig` and `MolassesAbility` validation (minimum .10 in blanket mode), retaining original default multipliers and old replay values for all historical profiles.
- **Only a genuine successful independent Molasses sequence** can cast the blanket. The existing typed `MolassesAbility.observePursuer` checks real source-world overlap, then `CircuitClimbChaseCore` multiplies only the Pursuer's physical speed. The source Spark movement and math results are untouched.
- `?cc246b=0` reverts the exact prior CC2-46 preview behavior, including 50% blanket speed and original overlay/material, for A/B evaluation.
- `cc2-46b-molasses.js` is presentation only. The visible Heritage renderer calls `paintSurface` AFTER all platforms are painted but BEFORE red/blue actors. Surface strokes, shallow pools, bow arcs and a bounded fading wake are projected from actual source bot positions and contact flags. Its internal state advances by SOURCE ticks, not random clocks. The field's top demarcation is a thin meniscus rather than a floor-to-ceiling colored rectangle.
- The original `.cc230-gel` element is hidden when CC2-46B is active. There is no green mask over either the Pursuer or Spark, and the real answer click targets and high-contrast numerals remain untouched.
- Pursuer sprite is temporarily compressed/flared on real contact using only canvas transform (no changes to its actual collision body).
- Guardian's existing hop source IDs/ticks are retained; the old jumping visual parabola is suppressed in new mode. The button has a 54×44px accessible interaction target, and its textured smear pseudo-body stretches forward, then pulls its tail in. The new deformation is UI only; no synthetic world movement.
- The CC2-46B Developer section inside `Molasses Creature Studio` shows:
  - Slow strength (% of original speed lost), source configuration; **Apply slowdown & restart** is required. New preview default is 80% slowdown.
  - Snail-like smear length (0–100), visual-only live.
  - Wake depth and persistence (0–100), visual-only live.
  - Syrup bow-wave size (0–100), visual-only live.
  - Sticky material recovery time (0–100), visual-only live.
  - Reset defaults; no non-source developer panel on the playfield.
- Reduced-motion suppresses CSS animation and leaves source-tick-bound surface readable. The script and CSS are inlined into the existing `/cc2-30.html` standalone, no CDN.

## Limitations and future opportunities

- The shared Molasses blanket remains persistent for the rest of the run after a successful gate, as originally designed. The **recovery time slider is a visual wake decay**, not a secretly changing gameplay expiration.
- The Guardian's authentic source locomotion is still determined by its existing discrete platform-hop schedule; CC2-46B creates a flatter, elongated, slower *visual* transition. A future phase could introduce a genuinely independent surface patrol topology under a separately versioned movement authority, but must not invent new gameplay position in presentation.
- Contact slow speed is 20% while the Pursuer is physically below the blanket boundary. When it climbs above that WORLD Y, it recovers to 100%; the visible wake decays independently. No sticky film ever reduces Spark speed.
- Source-only performance and visuals should be tested on real iPhone Safari / Android tablet after green CI; do not infer owner acceptance from screenshots or Vercel READY alone.

## QA commands for maintainers

```sh
npm ci
npm run lint
npx vitest run src/games/circuit-climb-2/tests/molassesSmear46B.test.ts src/games/circuit-climb-2/tests/creatureRosterIntegrity32.test.ts src/games/circuit-climb-2/tests/futureNumberedRows45.test.ts src/games/circuit-climb-2/tests/threeUpOneDownSpacing44.test.ts
npm run build
node src/games/circuit-climb-2/devtools/cc2-46b-molasses-browser.mjs
node src/games/circuit-climb-2/devtools/cc2-46-plasma-browser.mjs
node src/games/circuit-climb-2/devtools/cc2-45-unified-platforms-browser.mjs
node src/games/circuit-climb-2/devtools/cc2-44-three-one-browser.mjs
```

The packaged browser gate must verify a real first-row mathematical solve, earned independent Molasses math puzzle, 20%-speed source contact, the under-bot bow wave, invisibility of the old green overlay, unchanged geometry, control restart semantics, and legacy CC2-46 opt-out. It saves screenshots in `cc2-46b-evidence/`.

**Do not mark complete or publish a release claim until the FINAL source commit's CI succeeds.** Draft PRs and Vercel previews are review candidates, not accepted production. Keep protected CC2-45 and CC2-46 untouched.
