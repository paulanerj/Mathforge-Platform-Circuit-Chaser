# CC2-30C — Viscoelastic Guardian Material, Source-Aligned Gel & Performance

**Status:** Isolated candidate on top of qualified CC2-30B PR #41. Protected CC2-28 and accepted slate-focus visuals remain unchanged outside `?cc230=1`.

## Product intention
The Molasses Guardian must communicate weight, inertia, thick liquid adhesion and a bounded directional slowing power without becoming a distracting neon particle machine. An ordinary answer platform must remain fully tappable even while Molasses is present.

## What is implemented in 30C
1. Thick, translucent half-disc field clipped to **left/right** based on the real source authority's direction and displayed only while the source `activeField` exists. The visual is an approximate projection of the true source circular radius; there is **no decorative contact claim**. `contactActive` is the sole authority for a Stuck/Released indication.
2. Low-cost viscoelastic organism: momentum-like trailing envelope with smoothed display lag, without modifying source hop endpoints/tick times.
3. Fluid core and pulling thread animated under a strict field-shaped clipping boundary, so particles do not appear to reach arbitrary distant answer platforms. No extra canvas, WebGL, or off-screen large compositing surface.
4. Versioned visual preset `cc2-30-vfx/v2`: three new sliders `gelDensity`, `slosh`, `trailLength`; retains material, glow, flow, viscosity, body size and sound controls. Imports older `cc2-30-vfx/v1` by adding documented defaults. This remains **cosmetic only** and does not affect gameplay/replay authority.
5. Reduced-motion mode disables internal fluid animations without disabling the actual source ability. DOM projection remains throttled to 30Hz while game simulation runs its native 60Hz.

## Provenance and rules
The source Molasses ability remains `features/creatureAbilitySDK30B.ts`, and the separate math gate remains `features/creatureEcology30.ts`. No edits to primary `CircuitClimbCore` math, score, answer options, collision logic, turn/capture priority or old CC2-28 special engine.

The geometry presentation is a **bounded, approximate 2D projection**: the visual does not own physics, cannot be treated as perfect pixel-level world collision parity and is not a true viscous-fluid Navier–Stokes simulator. The source's field `x/y/radius/direction`, contact flag, expiration and speed modifier are the truth.

## Acceptance tests
- Existing 220 source tests and all historical browser/source regression suites.
- Real player taps of the introduction, first two mathematical rows, creature, and optional skip gate on 320, 390, 768 px.
- Validate directional half-disc `clip-path`, visual layers, bounded dimensions, source receipt parity and zero extra canvas.
- Change thick-fluid look through developer controls and prove no source digest change.
- Reduced motion: no fluid animation but optional creature remains available.
- Check Vercel deployment exact Git SHA and inspect physically on iPhone and tablet. This last requirement is an owner acceptance gate—not inferred from desktop Chromium tests.

## Next
CC2-30D: physical pursuer impact animation and Speed Grid musical voice, source-causal event timing, true performance profiling on mobile. Then CC2-31 reciprocal Tether Slug implements Spark-motion authority independently.
