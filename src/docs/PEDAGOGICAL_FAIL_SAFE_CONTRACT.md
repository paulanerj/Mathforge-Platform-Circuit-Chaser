# Pedagogical Fail-Safe Contract

## Purpose
The Pedagogical Fail-Safe feature is designed to prevent frustration and low-value guessing after a learner submits an incorrect answer. Instead of penalizing consecutive incorrect guesses or simply failing the step silently, it guides the learner to the correct answer to reinforce learning before moving on.

## Official Behavior
When `pedagogicalFailSafe` is enabled and a learner selects a wrong answer:
1. The game does not advance to the next step.
2. The current step enters a correction phase.
3. The correct answer button becomes visibly highlighted in green.
4. Incorrect answer buttons become visually disabled / greyed out.
5. The learner cannot continue by pressing another wrong answer.
6. If the learner taps a disabled/wrong answer during correction, the app displays a helpful message (e.g., "[X] is the correct answer. Please select it to continue.").
7. Survival/life penalties apply only to the initial wrong answer, not repeated fat-finger taps during correction.
8. The timer pauses during correction feedback.
9. The learner continues only by selecting the highlighted correct answer.
10. After the correct answer is selected, the correction state clears and normal gameplay resumes.
11. The feature is enabled by default.
12. The feature can be disabled from Settings.
13. Dark Mode remains protected: since AnswerGrid is hidden/inactive in Dark Mode, this feature does not turn Dark Mode into Normal Mode with dark colors.

## State Contract
- `AppConfig.pedagogicalFailSafe`: Boolean controlling whether the feature is enabled (defaults to true).
- `GameState.failedCurrentStep`: Boolean tracking if the current step is in the correction phase.
- **Entering correction**: When an incorrect answer is processed in `SUBMIT_ANSWER` and `pedagogicalFailSafe` is not explicitly false, `failedCurrentStep` is set to true.
- **Exiting correction**: When the correct answer is finally submitted, `failedCurrentStep` is reset to false, and the step advances as normal. `failedCurrentStep` is also reset on timeouts or early exits.

## Timer Contract
- The correction phase explicitly pauses active timing logic (in `useGameLogic.ts`, the timer/expiry hooks skip execution if `state.failedCurrentStep` is true).
- The learner should not time out while reading corrective feedback and studying the correct answer.
- This is a feedback mode, not an active timed play state.

## Mode Contracts
- **Normal Mode**: Wrong answer triggers fail-safe correction; clicking the correct green button advances.
- **QMM (Quick Math Mode)**: Wrong answer triggers correction; AnswerGrid UI gracefully highlights the correct answer without breaking QMM's minimal layout or causing geometry drift.
- **Dark Mode**: Protected. AnswerGrid is inactive in Dark Mode. Fail-safe logic must not expose the AnswerGrid or disrupt the center-tap requirement. If Dark Mode steps fail, they time out or advance based on the Dark Mode contract independently of AnswerGrid fail-safe interactions.
- **Survival Mode**: Strikes/penalties apply to the first wrong answer. Subsequent taps on disabled options during the correction phase do not double-penalize the learner.
- **Hidden Mode**: If configured, the fail-safe reveals the correct answer to prevent the learner from remaining soft-locked. It recovers gracefully for the next step.

## UI Contract
- **Highlight**: The correct answer button applies a green highlight (e.g., `bg-green-100`, `border-green-400`, `text-green-900`) and a subtle pulse animation.
- **De-emphasis**: Incorrect buttons apply `opacity-30` and `grayscale`.
- **Messaging**: Tapping an invalid answer during the correction phase triggers a clear, temporary helper message rendered over the grid.
- **Layout**: The helper message uses `absolute` positioning to avoid layout shift/push-down on mobile devices.

## Non-Goals
This system is strictly a fail-safe mechanism and is **not**:
- A proactive tutorial engine.
- A pre-emptive hint system (hints only appear after a failure).
- A replacement for proper curriculum/lesson design.
- A renderer-specific feature (it applies to the generic UI data model).
- A PWA/packaging feature.

## Regression Checklist
Future modifications to the following files must verify these constraints:
- `gameReducer.ts`: Ensure `failedCurrentStep` clears reliably on step advance, mode changes, and timeouts. Ensure penalties trigger only on the state transition to `failedCurrentStep`, not during it.
- `AnswerGrid.tsx`: Ensure the correct answer highlights, wrong answers are greyed out, and the layout doesn't shift when the helper message appears.
- `useGameLogic.ts`: Ensure the timer/expiry hooks pause when `failedCurrentStep` is explicitly true.
- `OptionsMenu.tsx`: Ensure the toggle correctly sets `pedagogicalFailSafe` and that disabling completely bypassed the correction phase.
