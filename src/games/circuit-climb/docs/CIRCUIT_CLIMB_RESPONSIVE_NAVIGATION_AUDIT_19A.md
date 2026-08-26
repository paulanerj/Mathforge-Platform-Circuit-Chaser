# CIRCUIT-CLIMB-GEOMETRY-19A — RESPONSIVE NAVIGATION-SPACE FORENSIC AUDIT

## 1. Baseline identity
- **Source**: `CIRCUIT_CLIMB_BOTLESS_18B_SOT_CANDIDATE.zip` (100% Botless Baseline)
- **Status**: No legacy/V2/V3 AI. No active enemy logic.
- **Engine**: React + HTML5 Canvas.

## 2. Geometry ownership map
- **Gameplay/canvas logical width**: `width` (from `app.getBoundingClientRect()` in `useCircuitClimbPrototypeRuntime.ts` -> `resize()`)
- **Gameplay/canvas logical height**: `height` (from `app.getBoundingClientRect()`)
- **CSS/display width**: Derived from viewport bounds (100% of parent wrapper)
- **Viewport scaling**: Recomputed dynamically via ResizeObserver. Diagnostic multiplier `viewScalePercent` defaults to 100.
- **Platform width**: `Math.min(CONFIG.platformWidth, width * 0.30)` (max ~104px)
- **Platform height**: `CONFIG.platformHeight` (62px)
- **Platform X centers**: `CONFIG.columns[column] * width` where columns = `[0.18, 0.50, 0.82]`
- **Row spacing**: `CONFIG.rowGap` (205px)
- **Player radius**: `CONFIG.playerRadius` (32px visual and collision, 64px diameter)
- **Player movement path coordinates**: `buildCircuitPath()` and `buildSteppedRoute()`
- **World/navigation horizontal bounds**: `[2, width - 2]` (from `destinationCorridors()`)
- **Responsive breakpoints**: None. Completely fluid mathematical mapping to viewport width.
- **Canvas transform / DPR transform**: `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` inside `resize()`
- **Platform collision rectangles**: `platformCollisionRects()` utilizing `routePlatformPadding = 8`

## 3. Current responsive model
**C. CSS ELEMENT REFLOW / COMPRESSION**
The layout uses a percentage-based column system (`0.18`, `0.50`, `0.82` of total width) while holding player size (64px) and platform size (104px) constant. As the viewport narrows, the columns crush closer together, physically compressing the space between platforms without reducing the size of the objects occupying that space.

## 4. Viewport matrix
| Viewport | Logical Width | Scale Factor | LEFT X | CENTER X | RIGHT X | Platform W | Player Dia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 320 px | 320 | N/A | 57.6 | 160.0 | 262.4 | 96.0 | 64 |
| 360 px | 360 | N/A | 64.8 | 180.0 | 295.2 | 104.0 | 64 |
| 375 px | 375 | N/A | 67.5 | 187.5 | 307.5 | 104.0 | 64 |
| 390 px | 390 | N/A | 70.2 | 195.0 | 319.8 | 104.0 | 64 |
| 400 px | 400 | N/A | 72.0 | 200.0 | 328.0 | 104.0 | 64 |
| 430 px | 430 | N/A | 77.4 | 215.0 | 352.6 | 104.0 | 64 |
| 768 px | 768 | N/A | 138.2 | 384.0 | 629.8 | 104.0 | 64 |
| 1024 px | 1024 | N/A | 184.3 | 512.0 | 839.7 | 104.0 | 64 |

*(Note: Platform collision width includes 8px padding per side, making physical obstacles 120px wide normally).*

## 5. Platform dimensions
- Visual Width: ~104px (shrinks to 96px only on very small screens < 346px)
- Collision Width: Visual + 16px padding
- Height: 62px

## 6. Actor dimensions
- Current Player Visual: 64px diameter
- Current Player Collision: 64px diameter
- Future Enemy Concept: Typically mirrors player (e.g. 60-64px diameter)
- Largest Actor: 64px

## 7. Four-corridor measurements
Calculated physical clear width (gap between collision bounds):

| Viewport | Corridor A | Corridor B | Corridor C | Corridor D |
| :--- | :--- | :--- | :--- | :--- |
| 320 px | -0.4 px | -9.6 px | -9.6 px | -0.4 px |
| 360 px | 2.8 px | -4.8 px | -4.8 px | 2.8 px |
| 375 px | 5.5 px | 0.0 px | 0.0 px | 5.5 px |
| 390 px | 8.2 px | 4.8 px | 4.8 px | 8.2 px |
| 400 px | 10.0 px | 8.0 px | 8.0 px | 10.0 px |
| 430 px | 15.4 px | 17.6 px | 17.6 px | 15.4 px |
| 768 px | 76.2 px | 125.8 px | 125.8 px | 76.2 px |
| 1024 px | 122.3 px | 207.7 px | 207.7 px | 122.3 px |

## 8. Corridor passability matrix
Evaluating `corridorWidth >= playerDiameter (64px) + 8px clearance`:

| Viewport | Corridor A | Corridor B | Corridor C | Corridor D |
| :--- | :--- | :--- | :--- | :--- |
| 320 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 360 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 375 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 390 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 400 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 430 px | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE | NOT PASSABLE |
| 768 px | PASSABLE | PASSABLE | PASSABLE | PASSABLE |
| 1024 px| PASSABLE | PASSABLE | PASSABLE | PASSABLE |

## 9. Responsive topology verdict
**RESPONSIVE TOPOLOGY CHANGE CONFIRMED**
At tablet widths, all four vertical corridors are physically open and easily navigable. At mobile widths, Corridors B and C shrink to zero or negative clearance, meaning the internal game world topology radically changes to block all interior navigation.

## 10. Player route ownership
- **File**: `useCircuitClimbPrototypeRuntime.ts`
- **Functions**: `buildSteppedRoute()`, `chooseDestinationCorridor()`, `destinationCorridors()`
- **Routing Rules**: Identifies all clear gaps between padded platforms. If a gap is `>= 12px`, it's valid. Player evaluates target proximity and routes through the best clear gap.

## 11. Why exterior routing currently occurs
**E. Responsive geometry** + **C. Hard-coded path shape (fallback)**
Because mobile viewport compression shrinks Corridors A, B, C, and D to under 12px, `chooseDestinationCorridor()`'s filter `if (rectangle.left - cursor >= 12)` discards them all. When the valid corridor list is empty, a hardcoded fallback forces the player route to the extreme exterior edge: `width * 0.035` or `width * 0.965`.

## 12. Interior B-route feasibility
Physically impossible at mobile viewports (e.g. 4.8px clearance for a 64px actor at 390px). The player would clip massively through solid platform geometry.

## 13. Interior C-route feasibility
Physically impossible at mobile viewports (identical to B).

## 14. Corner-clearance analysis
Under current responsive rules, corner clearance is negative (clipping). If geometry were properly scaled (uniform), the 8px logical padding ensures an actor can make a clean 90-degree turn from the vertical corridor into the platform landing zone without catching the platform's corner.

## 15. World-edge behavior
Currently, the hardcoded fallback exterior route at `width * 0.035` places the player's 64px body partially outside the visible canvas (overscan margin). At 390px width, `390 * 0.035 = 13.65px` center, meaning the 32px radius player clips 18px off the left side of the screen.

## 16. Current row alignment
All rows are rigidly aligned. `[0.18, 0.50, 0.82]` percentages dictate every row. No rows are currently staggered. Ownership: `makeRow()`.

## 17. Staggered-row feasibility
Highly feasible. All three platforms in a row can be safely offset by a horizontal delta. This allows changing the topological shape of the world (e.g., closing A or D intentionally) while preserving interior corridors B and C, if those corridors are wide enough.

## 18. Safe stagger ranges
Assuming uniform scaling is fixed, a left-shifted row could offset by `-Corridor_A_Width`, safely closing the A corridor. A right-shifted row could offset by `+Corridor_D_Width`. This creates varied edge paths while ensuring player touch targets remain legible.

## 19. Uniform-scaling analysis
If the game world is treated as a 768px logical plane and uniformly scaled down to 390px (Scale: `0.508`):
- Logical Corridors B/C = 63.9px
- Logical Player Diameter = 32.5px
- Result: **PASSABLE**. The physical spatial relationship remains perfectly constant.

## 20. UI/game-world separation feasibility
**EASY**. The UI is already completely decoupled, built with HTML/CSS overlaying the canvas via React DOM (`CircuitClimbSurface.tsx`). Scaling the canvas logic does not require scaling the HUD.

## 21. Touch-size implications
Tension: Uniform scaling shrinks 104px platforms down to ~52px on mobile screens. While physically correct for navigation, a 52px wide platform containing multi-digit text approaches the minimum limits of readability and comfortable touch targets (Apple HIG recommends 44px min). We must distinguish between *physical collision width* (e.g. 52px) and *visual touch card width* (e.g. 70px) if uniform scaling is adopted.

## 22. Vertical geometry analysis
- Row Gap: 205px
- Platform Height: 62px
- Vertical Open Distance: 143px
- Ratio to Player Diameter: 2.23x
The game has abundant vertical space, emphasizing that the responsive layout error is entirely focused on horizontal axis compression.

## 23. Screenshot reconciliation
The PM's screenshots reflect reality perfectly. On tablets, the grid remains largely square and spacious, permitting the pathfinder to route dynamically through wide B and C corridors. On phones, the fixed horizontal pixel sizes (104px, 64px) crush all available space between the proportional column centers, breaking the pathfinder and forcing the player entirely off-screen via the hard-coded fallback. Dominant cause: **COLUMN SPACING COMPRESSION vs FIXED ACTOR SIZES**.

## 24. Proposed four-corridor contract
**PROPOSED — NOT FROZEN**
1. Circuit Climb should formally have 4 vertical actor corridors (A, B, C, D).
2. Interior B and C should **always** remain open and physically passable.
3. Exterior A may close on left-shifted rows.
4. Exterior D may close on right-shifted rows.
5. Minimum logical corridor clearance: `Actor Diameter + 8px`.
6. Player and enemy share identical spatial constraints.
7. Player route animation uses interior corridors dynamically.
8. Future enemy uses the 4 corridors to navigate upward.

## 25. Responsive architecture comparison
- **OPTION A (Current)**: Reflows columns but fixes sizes. Fails navigation completely on mobile.
- **OPTION B (Uniform)**: Easy to implement, guarantees physical space, but risks making touch targets too small.
- **OPTION C (Hybrid)**: Separates physical collision geometry (which scales uniformly or enforces hard minimum gaps) from visual touch bounds (which may render larger).
**RECOMMENDATION**: **Hybrid Model**. Ensure minimum guaranteed physical gaps for B/C, and visually float larger touch targets if necessary, or slightly scale the player down on mobile to fit the gaps.

## 26. Recommended responsive architecture
Hybrid Model / Enforced Minimum Clearance.

## 27. Future-bot implications
A future enemy will not need complex A* mesh mapping. If the 4-corridor model is adopted, the enemy only needs to know which corridors (A, B, C, or D) are open on the current row and the row above, routing cleanly between the platforms just like the player's blue trace.

## 28. Files modified
NONE

## 29. Recommended next implementation phase
Fix the responsive geometry and scale rules to ensure Corridors B and C remain permanently open on mobile devices. Ensure player routing correctly uses B and C.

## 30. Current status
READY FOR PM RESPONSIVE-GEOMETRY REVIEW
