# SpeedMath UI Layout Constitution
## Phase U3.1 — Baseline Protection Layer

This document defines the spatial architecture and layout invariants for the SpeedMath application. It serves as a contract to prevent layout drift during future development.

---

## 1. Anchor System Definition
The UI is organized into three distinct spatial layers, all radiating outward from the central focus point:

1.  **CENTER_CIRCLE (Primary Cognitive Anchor):** The central visual element containing the current number or problem state. It is the fixed point around which all other elements are organized.
2.  **MODIFIER_RING (Orbit Layer):** A radial system of modifier bubbles that orbit the center circle.
3.  **INTERACTION_STAGE (Answer Grid and Controls):** The lower portion of the UI containing the answer selection grid and game controls.

All gameplay interaction and visual flow must radiate outward from the **CENTER_CIRCLE**.

---

## 2. Modifier Ring Contract
The modifier placement system is strictly defined by the center-radius model:

*   **Anchor Point:** The center of the `CENTER_CIRCLE` (`left: 50%; top: 50%`).
*   **Distance Variable:** `MODIFIER_RING_RADIUS`.
*   **Calculation Rule:** All modifier positions must derive from `distanceFromCenter = MODIFIER_RING_RADIUS`.

**Rule:** This center-radius model must never be replaced with "offset-from-circle-edge" calculations. Modifiers are allowed to visually overlap the circle edge slightly to maintain viewport fit.

---

## 3. Geometry Authority
All UI geometry must originate from a single source of truth:

*   **Authority File:** `src/ui/uiGeometry.ts`
*   **Enforcement:** No component may hardcode spatial dimensions (pixels, percentages, etc.) for layout.
*   **Reference:** Components must only reference constants exported by the Geometry Authority.

---

## 4. Layout Invariants
The following spatial behaviors are fixed and must not change:

*   **Static Center:** The `CENTER_CIRCLE` never shifts its coordinate origin during gameplay transitions.
*   **Stable Orbit:** Modifier positions remain spatially stable during gameplay; they do not "jump" or reposition when numbers change.
*   **Independent Stage:** The appearance or disappearance of the answer grid must not shift the vertical position of the center circle.
*   **Cross-Device Stability:** UI anchors must remain spatially consistent across all device profiles (Phone/Tablet).

---

## 5. Safe Geometry Variables
The following constants in `uiGeometry.ts` are designated as "Safe for Tuning." They may be adjusted to refine the visual feel without breaking the underlying architecture:

*   `CENTER_CIRCLE_SIZE`
*   `CIRCLE_VERTICAL_OFFSET`
*   `MODIFIER_RING_RADIUS`
*   `ANSWER_STAGE_GAP`
*   `BOTTOM_BAND_BASIS`
*   `BOTTOM_BAND_NEGATIVE_MARGIN`

---

## 6. Forbidden Structural Changes
The following architectural systems are locked and must not be altered without explicit approval:

*   **Modifier Placement Model:** (Center-radius radial positioning).
*   **Band Layout Architecture:** (Top Status / Play Surface / Interaction Band).
*   **Circle Anchor System:** (The use of the circle as the coordinate origin for modifiers).
*   **Interaction Band Structure:** (The relationship between the answer grid and control buttons).

---

## 7. Visual Baseline Reference
The baseline screenshots stored in `/src/ui/ui_baseline/` represent the official UI reference state for the SpeedMath application. These images capture the Golden Master Layout and must be used to verify that future changes do not cause layout drift.

---

## 8. Purpose and Extensibility
This architecture is designed to remain stable while supporting:
*   Multiple math mechanics (Addition, Subtraction, Multiplication, etc.).
*   Alternate game modes (Dark Mode, QMM, Hidden).
*   Alternate visual themes.
*   Adaptive difficulty systems (Color scales, timing adjustments).

By adhering to this constitution, the application maintains a consistent cognitive load for the user regardless of the specific mathematical challenge.
