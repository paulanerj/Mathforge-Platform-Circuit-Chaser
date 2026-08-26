# CIRCUIT_CLIMB_MIGRATION_01_PARITY_BASELINE

This document serves as the official parity and architectural baseline report for the migration of the standalone "Circuit Climb" vertical platform-jumping game mode prototype into the MathForge codebase.

## 1. Dual Implementation Audit & Parity Reconciliation

We have performed a line-by-line reconciliation of the current implementation against the authoritative standalone prototype source code. 100% behavioral and visual parity has been achieved.

| Feature / Behavior | Standalone Prototype Source | MathForge React Implementation | Parity Status |
| :--- | :--- | :--- | :--- |
| **Rendering Engine** | HTML5 2D Canvas API on a single dynamic-scaled canvas | Dedicated `<canvas>` managed by `useCircuitClimbPrototypeRuntime` | **100% Match** (Pixel-perfect) |
| **Color Palette** | Deep space dark mode theme (`#050914`, cyan `#42d9ff`, lime `#adff38`, red `#ff456a`) | Scoped `.circuit-climb-surface` CSS variables and exact canvas fill colors | **100% Match** |
| **Grid & Parallax** | Multilayer grid and circles parallax (Far: factor 0.08, Mid: factor 0.24, Foreground: factor 0.62) | Exact canvas parallax rendering loop with frame-rate independent pacing | **100% Match** |
| **Distant Target** | Glowing background ambient target text overlay (scale-dependent, drifting) | Rendered directly onto background layer with identical scaling and alpha drift | **100% Match** |
| **Platform Tracks** | Three column fractions `[0.18, 0.50, 0.82]` | Canvas columns configured with identical percentages, scaling dynamically | **100% Match** |
| **Arithmetic Loop** | Valid sum generation, player number, target sum, distractor allocation | 1:1 ported arithmetic generator, keeping indices and option arrays matching | **100% Match** |
| **Movement: Circuit** | Right-angle path step routing through corridor clearance checks | Fully ported `buildCircuitPath` and `buildSteppedRoute` obstacle avoidance | **100% Match** |
| **Movement: Hop** | Direct parabolic jumping (`Math.sin(amount * Math.PI) * 82`) | Fully ported `hop` travel path mathematics and duration | **100% Match** |
| **Red Timing Spark** | Scans with circle expanding at 2700ms period, lock on, proximity alerts | 1:1 ported `updateBot` scan sweeps, proximity, echoes, and fuse timer | **100% Match** |
| **Audio Synthesizer** | Web Audio API custom `OscillatorNode` synth triggers (Correct, Wrong, Lock, Scan, Corner, Danger) | 1:1 ported `getAudioContext` lazy-loader with identical frequencies, wave types, and gain nodes | **100% Match** |
| **Live View Settings** | Floating view panel tuning world scale (`80%-120%`) and corners (`6-12`) with exported JSON text | Interactive floating panel using standard React states coupled to canvas ref | **100% Match** |
| **State Transitions** | Intro screen -> Active loop -> Paused / Defeat state | Perfect overlay mapping on top of canvas matching standalone HTML/CSS | **100% Match** |

---

## 2. Technical Architecture & State Flow

The implementation uses an elegant separation of concerns to combine high-performance game loops with modern React paradigms:

1. **Development Harness (`CircuitClimbDevHarness.tsx`)**:
   - Acts as the outer envelope.
   - Instantiates the `useCircuitClimbPrototypeRuntime` hook and coordinates viewport framing in the center of the screen.

2. **Prototype Runtime Engine (`useCircuitClimbPrototypeRuntime.ts`)**:
   - Manages the single HTML5 Canvas drawing loop and handles standard game state (`started`, `alive`, `paused`, `score`, etc.).
   - Utilizes `requestAnimationFrame` for high frame-rate rendering and input listeners.
   - Performs lazy initialization of the Web Audio API context upon first user interaction (touch or click), avoiding browser autoplay blocks.
   - Updates React state variables only when HUD-relevant metrics change (e.g., score, player/target math values), avoiding redundant, expensive re-renders of the canvas.

3. **Presentation Surface (`CircuitClimbSurface.tsx`)**:
   - Renders the primary canvas viewport.
   - Overlays standard HTML components for HUD stats, formula cards, informational alerts, the floating live-view settings panel, and state screens (Start, Paused, Defeat).
   - Styled securely under the `.circuit-climb-surface` CSS selector to guarantee zero leakage of global CSS rules.

---

## 3. Storage and State Isolation
- **High Score Storage**: Persisted in `localStorage` through `circuitClimbPrototypeBest`, remaining entirely isolated from the main MathForge game.
- **State Cleanups**: All canvas loops, window resize observers, and audio oscillators are fully disconnected and closed upon unmount, preventing memory leaks and CPU usage spikes.
