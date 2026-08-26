# Rigid Renderer Integration Notes

## Overview
The Rigid Renderer is an experimental 3D geometry-based rendering path designed as a drop-in replacement for `CircleRenderer`. It builds real physical depth (thickness) via multiple CSS planes (`translateZ`) rather than pseudo-3D or squash illusions.

## Architecture
- **RigidRenderer.tsx** -> Drop-in boundary. Calculates scale factor based on the parent's width, identically to `CircleRenderer`. Maps `VisualStep` to physical objects.
- **RigidCenterCoin.tsx** -> The rigid central coin. It rotates continuously on a 180° `rotateY` axis without ever squashing. Contains multiple edge layers for true depth. 
- **RigidModifier.tsx** -> Maps to modifiers (`top`, `bottom`, `left`, `right`) and rotates via a 180° `rotateX` axis.
- **rigidRenderer.css** -> Defines variables for scale/geometry mapping. No hard boundaries. 

## Integration Rules
1. **Parent Boundary Trust**: The renderer must never set `width: 100vw` or force `bg-slate-900`. It operates transparently inside `<div ref={rendererRef} className="relative flex items-center justify-center shrink-0 w-full h-full">`.
2. **Standard Prop Surface**: The renderer consumes exact implementations of `RendererProps`, so passing `visualStep`, `config`, `isDark`, `uiSkin`, etc. matches standard rendering behavior. No active app wire-ups are needed until the codebase approves the renderer swap.
3. **Responsive Mapping**: Fixed geometry (e.g. 220px) is driven by `--mf-coin-size`, a CSS context variable pushed down from `RigidRenderer`, mapping to standard dynamically generated scaling (`CIRCLE_SIZE = 220 * scaleFactor`).

## Motion Notes (Phase R5)
- **Coin Timing:** `320ms` duration, `160ms` midpoint value swap.
- **Coin Easing:** `cubic-bezier(0.35, 0.0, 0.15, 1)`. A firmer start suggests heavy mass being pushed, while a controlled deceleration ensures a confident, wobble-free landing.
- **Modifier Timing:** `260ms` duration, `130ms` midpoint value swap.
- **Modifier Easing:** `cubic-bezier(0.25, 0.0, 0.2, 1)`. Snappier and lighter to convey smaller physical mass, while synchronizing with the central hub's cadence.
- **QMM Recommendations:** If adapted for QMM handling, durations should be accelerated proportionally (e.g., coin to `200ms`, modifier to `160ms`) to minimize visual distraction during rapid solves, while preserving the mass differential.

## Phase R6 Stress Validation Complete
- **React Stability:** The system is explicitly immunized against `useEffect` double-firings (e.g., React Strict Mode double spins). Rotation states (`+180°`) trigger exactly once per discrete value update.
- **Fast Input Resilience:** `setTimeout`-based swaps gracefully override queue flooding on successive fast inputs by bypassing outdated swap intervals seamlessly.
- **Transform Accumulation Risk:** Handled. Endless rotation additions (e.g., millions of degrees) are universally stable under CSS `transform`. Attempting to modulo values caused unwanted reverse-winding and was eliminated.
- **CSS Parent Sandbox:** Standardized isolation. Scale factors, `overflow:hidden`, and bounded areas on the direct parent do not contaminate the 3D contexts of the children.

## How to Safely Activate Later
To activate this renderer in the live game, locate `GameBoard.tsx` or `App.tsx` and alter the renderer selection switch (if a factory pattern exists) or replace `<CircleRenderer {...props} />` with `<RigidRenderer {...props} />`. 

### DO NOT TOUCH
- `VisualStep` contract.
- Gameplay answer generation.
- Production UI overlay geometry.

Ensure FX and particles remain *off* until the structural behavior is fully vetted across standard scale factors on mobile devices.
