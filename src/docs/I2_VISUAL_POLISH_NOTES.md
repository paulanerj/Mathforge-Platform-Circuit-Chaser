# I2 Visual Polish Notes

## What Changed

- **Normal Mode Polish**: 
  - Adjusted `--mf-modifier-overlap` to `-24px` to link the modifiers more tightly to the center circle.
  - Increased `EnergyRing` border width to `3px` and opacity to `0.4` to enhance the appearance of streaks without overwhelming the UI.
  - Allowed the main number's font size to dynamically scale higher (up to 112px max).

- **QMM Clarity Polish**:
  - `ModifierBadge` wrapper forces `whitespace-nowrap` to prevent multiline hopping for horizontal readability.
  - Center number size dynamically scales up smoothly.

- **Dark Mode Mood/Readability**:
  - Removed artificial CSS filter (`brightness(0.9) contrast(1.2)`) on the entire `CircleRenderer`, heavily improving `StopwatchSVG` readability and removing contrast clashes.
  - Dark mode (`sa-theme-dark`) values were pushed even deeper (`#020617` instead of `#0f172a` for gradients), adding a cleaner, modern look.
  - Controls, borders and UI cards utilize the extremely dark tones to emphasize glowing elements.

- **Modifier Pill & Answer Button**:
  - Modifier badges now adapt `px-5 py-2` on mobile, but `sm:px-6 sm:py-3` on desktop, improving spacing and maintaining single-line formatting.
  - AnswerGrid text-sizes scale dynamically, ensuring answer buttons look distinct but non-cramped.

## What Was Intentionally NOT Changed

- The `rigid` (3D webgl-like) renderer was NOT integrated. It remains dormant.
- No changes to AnswerGrid's structural normalization or mode-specific hiding rules (Dark Mode maintains a fully hidden grid as per contract).
- The math generation rules, distractors configuration, and scoring behaviors remain completely intact.
- Phone layout minimums and layout bands are completely unmodified to preserve clipping protection.

## Validation Status Requirements
- Start up game and enter "Standard" / "Normal Mode". Verify smooth answers, proper circle constraints, readable inner text.
- Change difficulty to DM, wait for next step. Screen should go full deeply dark, answer grid hides, tap Center to proceed. Readability on clock and active streak should be solid.
- Switch to QMM. Layout should become focused, yellow-themed. Answer grid maintains functionality without massive modifiers jumping around.
