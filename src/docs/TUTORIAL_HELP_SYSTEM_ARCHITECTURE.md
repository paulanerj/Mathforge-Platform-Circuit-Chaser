# Tutorial / Help System Architecture

## Purpose
The tutorial/help system is designed to improve playability and mode comprehension without polluting the core game loop. It aims to provide interactive, mode-specific, skippable, replayable, and mobile-friendly guidance based on real player confusion points, rather than building static manuals or text walls.

## Core Architecture Rule
**Tutorial state must be isolated from core GameState.**

The tutorial/help system may freeze gameplay underneath, but it must **not** store tutorial progress, tutorial step index, tutorial overlays, tutorial triggers, or tutorial-specific actions within `gameReducer.ts` or the primary GameState engine.

**Official rule**: Tutorial state owns tutorial flow. Game pause only freezes gameplay underneath.

## Non-Active-Play State Separation
We now distinguish between three separate non-active-play states:

1. **User Pause**
   - Manually triggered by the user pausing the game.
   - Resumes exactly as it was paused.

2. **Pedagogical Fail-Safe Correction**
   - Triggered by a wrong answer.
   - Shows the correct answer visually.
   - Pauses active timing.
   - Learner continues by pressing the correct answer.

3. **Tutorial / Help Guidance**
   - Triggered by the Help button, a first-time suggestion offer, or via a tutorial menu.
   - May freeze gameplay underneath dynamically.
   - Owns its own script/step state.
   - Must not be confused with or tangled with the fail-safe correction phase.

## Recommended File Architecture
The future tutorial system should be contained in its own domain:

```
src/tutorials/
  tutorialTypes.ts
  tutorialRegistry.ts
  tutorialScripts.ts
  tutorialSelectors.ts
  useTutorialDirector.ts
  components/
    TutorialOverlay.tsx
    TutorialTooltip.tsx
    TutorialSpotlight.tsx
    TutorialPauseLayer.tsx

src/components/UI/Help/
  HelpButton.tsx
  HelpMenu.tsx
  TutorialLauncher.tsx
```

## Tutorial State Model
The following concepts belong *outside* core GameState (e.g., in their own localized Context or hook state):
- `activeTutorialId`
- `activeStepIndex`
- `tutorialStatus`
- `tutorialPauseReason`
- `dismissedTutorialOffers`
- `completedTutorials`

## Tutorial Step Model
There are three official step interaction categories:
1. **info**: The user reads an informational popover and taps "Continue" to proceed to the next tutorial step.
2. **targetTap**: The user is required to tap a highlighted UI target to prove they know where it is located.
3. **realAction**: The user performs a real gameplay action (such as selecting the correct answer on the AnswerGrid or interacting with the center coin).

## First-Time Tutorial Policy
- **Suggested, Not Mandatory**: Tutorials are offered, not forced.
- **First time entering a mode**: Show a small, optional tutorial offer. The user can choose to "Start Tutorial" or "Skip".
- **Replayability**: The user can replay a skipped or completed tutorial later from the Help menu.
- **Persistence**: Future iterations will persist the seen/skipped/completed state for each tutorial out of the core progression logic.

## Help Button Policy
The Help button should:
- Be visible but unobtrusive.
- Live near the footer/pause area, not in the top status bar.
- Open contextual help relevant to the current mode or screen.
- Offer actionable options: Resume, Quick Tip, Play Mode Tutorial, and Open Tutorial Menu.
- Freeze gameplay safely *without* becoming the actual tutorial state owner.

## Pause / Freeze Contract
- Tutorial/help can request a gameplay freeze.
- It must remember whether the game was already paused before the tutorial/help was opened.
- Closing the tutorial/help must not blindly unpause the game if the user was already paused manually.
- Tutorial pause must not trigger the TIMEOUT action.
- Tutorial pause must not advance Dark Mode automatically.
- Tutorial pause must not affect Survival Mode penalties or strikes.
- Tutorial pause must not be intertwined with the pedagogical fail-safe correction phase.

## Freeze Adapter Contract
MathForge maintains a unified, hook-driven freeze/resume contract in `src/tutorials/useTutorialFreezeAdapter.ts` to ensure layout overlays like contextual help or tutorials pause the gameplay smoothly:

```typescript
export interface UseTutorialFreezeAdapterArgs {
  isGamePaused: boolean;
  togglePause: () => void;
}

export interface TutorialFreezeAdapter {
  isFrozenByOverlay: boolean;
  beginOverlayFreeze: () => void;
  endOverlayFreeze: () => void;
  wasGamePausedBeforeOverlay: boolean;
}
```

This adapter enforces:
1. **Isolation**: No freeze adapter states (temp record metrics, screen overlays toggled) pollute `gameReducer.ts` or standard progression objects.
2. **Context Memory**: Tracks if the game was pre-paused manually, preventing blind unpauses when closing panels.
3. **Fail-Safe Independence**: Gameplay freeze layers live separate from the Pedagogical Fail-Safe correction state, leaving answer highlights undisturbed.


## DOM Targeting Contract
- Future tutorial overlays should use stable, dedicated `data-guide-id` attributes to target elements.
- Avoid brittle CSS selectors or complex class-based targeting.
- Avoid deep React element refs passing across large component trees when possible.
- `data-guide-id` additions directly to UI components must be minimal and stable.
- **Dark Mode Safeguard**: Dark Mode tutorials must never attempt to target hidden AnswerGrid elements, as they do not logically exist in that mode.

## Overlay Shell Contract
MathForge maintains an isolated, fixed-position overlay system (`src/tutorials/components/TutorialOverlay.tsx`) to render tutorial spotlights and tooltip components dynamically:

- **Target Resolution**: Locates target elements visually by querying `[data-guide-id="${targetId}"]`.
- **Spotlight Highlights**: Renders a standard box-shadow shroud over other UI nodes, creating focus without inserting disruptive block wrapper divs.
- **Graceful Fallbacks**: If a target is absent, hidden, or sizeless, the tooltip safely centers on the viewport rather than crashing the interface.
- **Micro-responsive Alignment**: Dynamically measures bounding rects and pivots tooltips above or below the target to prevent window overflow.
- **Overlay Independence**: Operates entirely outside of core `GameState` and relies on `useTutorialFreezeAdapter` for gameplay suspension.

## Initial Tutorial Catalog
1. **App Basics**: General flow of the game. (info)
2. **Normal Mode Basics**: How to select answers, standard UI. (realAction / targetTap)
3. **QMM Tutorial**: Explanation of Quick Math Mode modifiers and minimal UI. (hybrid)
4. **Dark Mode Tutorial**: Explanation of center-tap progression since grid is hidden. (targetTap)
5. **Hidden Mode Tutorial**: How to deal with hidden answer values. (info / targetTap)
6. **Survival Mode Tutorial**: Explanation of lives and strikes. (info)
7. **Pedagogical Fail-Safe Explanation**: How wrong answers behave and the correction mechanism. (info / realAction)
8. **Lesson Builder Tutorial**: How to create custom curricula. (info / targetTap)
9. **Settings Tutorial**: Explanation of app config features. (info / targetTap)

## Non-Goals
This system is NOT:
- A new gameplay mode.
- Part of the core answer validation process.
- Part of the `gameReducer`.
- Part of the renderer architecture.
- A replacement for the newly established Pedagogical Fail-Safe.
- A PWA/offline caching feature.
- A static PDF/manual system.

## Implementation Phases
- **T1**: Contract document and type plan only (This Document).
- **T2**: Type files only, no runtime behavior.
- **T3**: Help button shell + static contextual Help menu.
- **T4**: Safe gameplay-freeze adapter.
- **T5**: Introduction of `data-guide-id` markers on major UI elements.
- **T6**: `TutorialDirector` + overlay shell implementation.
- **T7**: Normal Mode Basics tutorial execution.
- **T8**: QMM and Dark Mode tutorial executions.
- **T9**: Persistence for completion/skipped statuses.
- **T10**: Final polish, motion transitions, and audio hooks.

## Regression Checklist
- [ ] Dark Mode behaves natively and is strictly uncorrupted.
- [ ] `gameReducer.ts` is strictly unpolluted by tutorial state.
- [ ] Renderer structure (like `CircleRenderer`) remains agnostic and unmodified.
- [ ] Pausing/unpausing from tutorial layers does not mistakenly cause round timeouts or skips.
- [ ] Survival Mode penalties/lives are not affected by tutorials.
- [ ] QMM visual layout remains pristine and uncluttered.
- [ ] Mobile responsive layout is not stretched or pushed down by tutorial panels.
- [ ] Tutorial state is not prematurely synced to general payload persistence.

## Proposed Type Plan (Optional / Reference)

```typescript
// Proposed Types - Not Yet Embedded In Runtime

type TutorialId = 'app-basics' | 'normal-basics' | 'qmm' | 'dark' | 'hidden' | 'survival' | 'failsafe' | 'lesson-builder' | 'settings';

type TutorialStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'skipped';

type TutorialStepKind = 'info' | 'targetTap' | 'realAction';

interface TutorialTarget {
  guideId: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight: boolean;
}

interface TutorialStep {
  stepId: string;
  kind: TutorialStepKind;
  content: string; // The text content or localized key
  target?: TutorialTarget;
  requireAction?: string; // e.g., 'submit_correct'
  actionPayload?: any;
}

interface TutorialScript {
  id: TutorialId;
  title: string;
  steps: TutorialStep[];
}

interface TutorialDirectorState {
  activeTutorial: TutorialId | null;
  status: TutorialStatus;
  currentStepIndex: number;
}

interface TutorialCompletionState {
  completed: Record<TutorialId, boolean>;
  skipped: Record<TutorialId, boolean>;
}
```
