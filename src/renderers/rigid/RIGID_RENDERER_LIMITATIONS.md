# Rigid Renderer Limitations & Protective Constraints

This document explicitly lists architectural constraints necessary to preserve real CSS 3D geometry. If these rules are broken, the 3D optical illusion will shatter and flatten back into 2D squashes.

## Stacking Context & Flattening Traps
Warning: In CSS, certain properties force new stacking contexts that will silently disable the `transform-style: preserve-3d` behavior of their children. The browser falls back to a "flattened" 2D composition layer.

**Do NOT apply these properties to `.rigid-renderer-root`, `.rigid-perspective`, or wrappers:**
1. `overflow: hidden;`: Instantly crushes children into a flat plane.
2. `opacity: <anything less than 1>`: Instantly crushes 3D depth to maintain alpha compositing.
3. `filter` (e.g. `blur`, `drop-shadow`): Instantly forces flattening.
4. `backdrop-filter`: Same trap.

## The Rotational Lighting Invariant
If you set a static `box-shadow` or directional `linear-gradient` (e.g., top-down light) to a rotating 3D div, it rotates with the div. At 180 degrees, the shadow will appear inversely on the wrong side.

**The Clever Solution In Use:**
Because the `Back Face` layer uses `rotateY(180deg)` natively in its transform stack, when the overall coin grouping hits 180 degrees, the back face resolves perfectly back to 360 degrees (0 degrees) relative to the viewer. This means a top-lighting gradient on the back face will appear upright, just as the top-lighting on the front face does.
**Rule:** Lighting MUST be applied to the `.rigid-coin-face` leaves, never to the rotating generic parent wrapper.

## Layer-Based Sidewalls (The 1px Trick)
We construct physical thickness by iterating `n` layers of `1px` depth (`translateZ`). 
- Changing this to thicker slices creates severe visual moiré and exposes gaps at tight viewing angles.
- Currently: 24 layers at 1px each = 24px thick. Do not push edge layer spacing above 1px.

## Mobile Performance Notes
We are generating 24 DOM nodes for the central hub and 16 DOM nodes for each modifier.
- **Why this works:** The nodes are visually inert (no fonts, no layouts) and animated jointly via CSS `transform` on singular hardware-accelerated parent wrappers.
- Do not attach separate React transition lifecycles to individual slicing layers.

## React Strict Mode & Rapid Re-renders
A naïve un-guarded `useEffect` that triggers `setRotation(r => r + 180)` based on `[value]` dependencies is catastrophic under React Strict Mode (or rapid rapid execution frames), as setup phases execute twice.
- **Rule:** `useEffect` rotation incrementation MUST be guarded by a `useRef` that tracks the payload that was last actually processed (e.g. `processedRef.current = { val, op }`). This prevents `+360°` double-snaps.

## Rotation Accumulation Stability
The standard approach involves continuous `+180` additions rather than resetting modulo 360 values.
- **Rule:** Do NOT attempt to "normalize" or modulo reset (`% 360`) the rotation angles while hidden.
- Browsers safely process `rotateY(Ndeg)` with massive integer boundaries. Accumulating rotation infinitely prevents catastrophic visual un-winding during transitions.

## Rapid Solve Overriding & Queue Flooding
When transitioning at 300ms+, a rapid succession of gameplay inputs (e.g., three updates under 300ms timeframe) could lock up or flood the transition queue.
- **Findings:** By relying on `setTimeout` closures tied strictly to components and returning `() => clearTimeout(...)`, we successfully "drop" scheduled intermediate payload injections during rapid inputs.
- The visual effect resolves smoothly to the newest input payload on the latest timeout without snapping, preventing lockup.

## Z-Index in 3D Space
In a `preserve-3d` context, traditional `z-index` behaves strangely because actual Z translations supersede numerical indices. To mount the modifier, we explicitly apply `translateZ(-12px)` so it dips correctly behind the hub geometry at all viewing angles.
