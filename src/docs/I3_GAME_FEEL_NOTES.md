# I3 Game Feel Micro-Tuning Notes

## What Was Tuned

- **Answer Button Tactile Feel**: 
  - Overhauled `.sa-btn` transition durations to `150ms cubic-bezier(0.4, 0, 0.2, 1)` for immediate physical snappy feedback instead of the slower 300ms default.
  - Deepened the active state click to `scale(0.96)` for stronger tactile satisfaction.
  - This universally improves normal answer buttons and QMM without heavy animations.

- **Correct & Incorrect Cadences**:
  - Replaced the infinite 1-second pulse on correct answers with a satisfying, fast, one-off `sa-correct-pop` lasting 300ms.
  - Rewrote the incorrect shake animation to `sa-shake-quick` (150ms instead of 200ms) to ensure errors are instantly felt but quickly recovered from without lingering punishment.

- **DM and Center-Tap Affordance**:
  - Introduced `hover:scale-[1.02]`, `active:scale-[0.98]`, `active:brightness-95`, and `cursor-pointer` on the central coin. This immediately signals interactivity for DM users since their progression mechanism relies entirely on tapping the center watch.

## What Was Intentionally NOT Changed

- The `rigid` (3D webgl-like) renderer was NOT integrated. It remains strictly dormant.
- Did not change QMM's structural minimalist styling or distractor setups. 
- Did not modify math generation, scoring logics, or pause overlays.
- Did not change DM layout logic (Answer Grid properly stays hidden in DM).

## Validation Status Requirements
- Ensure **NM** plays correctly. Answer buttons should feel punchy and correct taps shouldn't hang or look laggy due to the old pulse.
- Test **QMM** button speeds. Should maintain extreme minimalism with faster reaction feedback.
- Test **DM (Dark Mode)** tap feels. Tapping the big clock should depress physically and advance the clock correctly.
- Ensure the layout remains strictly within baseline, meaning no AnswerGrids pop up in DM and no layout clipping occurs on standard phone resolutions.
