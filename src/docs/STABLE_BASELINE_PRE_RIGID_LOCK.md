# STABLE BASELINE: PRE-RIGID LOCK

This document serves as the formal baseline lock for the project after reverting major renderer/layout drift. It ensures future work cannot accidentally repeat the renderer/layout drift.

## Current State Identity
- **Branch Identity**: Reverted baseline pre-rigid-integration.
- **Active Renderer Map**:
  - `circle`: `CircleRenderer`
  - `minimal`: `MinimalRenderer`
- **Rigid Renderer Status**: DORMANT. `RigidRenderer` files exist but are not imported or active in live gameplay.

## Gameplay & Layout Validation
- **Normal Mode (NM)**: Playable. Standard circle/modifier + answer grid behavior.
- **Quick Math Mode (QMM)**: Playable. Clean renderer behavior, stable layout.
- **Dark Mode (DM)**: Playable and visually correct as per its specific rules.
- **Phone Layout**: Playable. No overlapping UI, full bottom controls, answer grid, and mechanic visible.
- **Tablet Layout**: Acceptable. Elements use space correctly without being tiny or excessively large.
- **AnswerGrid**: Safe. Functions correctly in NM and QMM.

## Dark Mode (DM) Contract
Dark Mode has a distinct, explicit behavior that differs from Normal Mode.
- **Rule 1**: DM INTENTIONALLY hides the `AnswerGrid`.
- **Rule 2**: DM uses center-tap progression instead of answer buttons.
- **Rule 3**: `GameBoard` routes center clicks to `actions.advanceDarkStepNow`.
- **Rule 4**: A stopwatch SVG appears inside the center coin.
- **Rule 5**: Do NOT "fix" DM by restoring answer buttons unless explicitly requested. It is not standard answer-button gameplay.

## Rigid Renderer Isolation Rule
Rigid files (`src/renderers/rigid/*`) exist but must remain dormant.
- DO NOT import `RigidRenderer` into `GameBoard`.
- DO NOT add rigid to the renderer map.
- DO NOT patch rigid lint/type issues during baseline work.
- The rigid renderer is an experiment-only feature until a separate integration phase is initiated.

## Protected Files (DO NOT TOUCH WITHOUT APPROVAL)
The following files are locked and should not be modified without explicit consent:
- `src/components/Game/GameBoard.tsx`
- `src/components/Game/GameLayout.tsx`
- `src/adapters/gameToVisualAdapter.ts`
- `src/components/Game/AnswerGrid.tsx`
- `src/index.css`
- `src/renderers/rigid/*`
