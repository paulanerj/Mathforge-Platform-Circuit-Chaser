# FINAL STABLE BASELINE RULES

*DO NOT MODIFY THIS PROJECT UNLESS YOU ADHERE TO THESE GUIDELINES.*

## Active Renderer Map
- The primary renderers are `CircleRenderer.tsx` and `MinimalRenderer.tsx`.
- They are selected dynamically based on `uiRenderer` state (which defaults to `circle`).

## Protected Files
- `src/App.tsx`
- `src/components/Game/GameBoard.tsx`
- `src/components/Game/AnswerGrid.tsx`
- `src/renderers/CircleRenderer.tsx`

## DM Contract (Dark Mode)
- DM must function perfectly without answer grids in standard playing.
- Center-tap on coin reveals answer grid.

## QMM Contract (Quick Math Mode)
- QMM must display answer grids correctly.
- Layout must support rapid interactions without clipping below the viewport.

## AnswerGrid Guarantees
- AnswerGrid must be visible where expected (NM/QMM/DM behavior).
- Scaling should fit correctly inside the structural layout without clipping or blocking the coin stage.

## Phone/Tablet Layout Expectations
- On phones, do not clip modifiers or the central coin. Viewport constraints must be respected.
- Tablets must maintain structural bands gracefully.

## Rigid Renderer Dormant Rule
- The rigid renderer (`RigidRenderer.tsx`) is explicitly DORMANT and should NOT be the default renderer unless specifically toggled/requested in an experimental path.

## Rollback Instruction
- If structural integrity fails or NM/QMM/DM contracts are broken, stop feature development and roll back to the stable baseline state.

---

## Change Protocol
Any future risky work must:
1. happen in a remix/lab branch.
2. state which protected files it touches.
3. provide rollback notes.
4. pass NM/QMM/DM runtime validation.
5. pass phone/tablet validation.
