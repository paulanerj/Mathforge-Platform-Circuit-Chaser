# CC2-02A-Q1 — Visual and Interaction Qualification

**Local date:** November 11, 2026 (Colombia); CI reports UTC November 12.  
**Work branch:** `feature/cc2-02a-q1-visual-interaction`  
**Parent:** `feature/cc2-02a-core-world-math` at `f456a8ef19e0d9fa45ba6e012975674617a2a2ce`.  
**Scope:** Pure rendering, mobile UI and browser QA in `src/games/circuit-climb-2/devtools/`.  
**Protected:** SOT-02 game and core/world/math engine completely unchanged by Q1.

## 1. Q1 verdict

**Automated interaction/visual regression: PASS** on [GitHub Actions 43132543988](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43132543988), source SHA `61e3cdb50d1e1f9356a6bc8e94eb9ac5663a9e19`.

A final presentation-only follow-up at `0d782e5bfa46cecdab4e54af1e3be82ff38bee06` replaces the recharge notice's translucent fill with solid fill to remove ghost text behind it; [latest branch CI](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43132901194) should confirm that exact SHA before marking the final head fully green.

**PM visual inspection:** actual CI screenshots inspected for 320x568 ready, 390x844 ready/wrong outbound/wrong short/wrong return/correct landing/rebase, and 1200 desktop. The corrected first-row artwork no longer falsely portrays two wrong starting choices. The recharge number boundary is visually explicit without covering the next three available choices.

**Owner physical-device review remains OPEN.** Headless Chromium screenshots and emulated screen dimensions do not prove iPhone Safari or Galaxy Tab S6 Lite behavior.

## 2. Actual findings and applied corrections

| ID | Initial evidence | Corrective action | Q1 status |
|---|---|---|---|
| Q1-F01 | 320px-wide option height derived from 62 world units was approximately 31px, too small for reliable fingers | DOM hit target `>=44px` high, `>=52px` wide, centered on actual platform; world collision unchanged | PASS in browser matrix |
| Q1-F02 | During outbound travel the math HUD stayed `a + ? = target`; the selected sum was not explained, making mistakes opaque | Event-sourced `a + b = result · target t` overlay, selected `+b` near Spark, traversed electrical route illuminate progressively | PASS screenshots |
| Q1-F03 | After wrong landing feedback was generic; the learner did not see the inequality or differentiated return route | Red `a+b=actual ≠ target` overlay, dashed red physical return indicator, shorted destination remains disabled after return | PASS screenshots |
| Q1-F04 | Correct-to-next-row transition and fourth-row number rebase could be visually conflated | Preserve solved `a+b=result ✓` independently of next HUD; clearly display `CELL n RECHARGED · old → new (new start)` in its own status strip beneath board | PASS screenshots |
| Q1-F05 | `fitCanvas()` rewrote `canvas.width/height` every frame, clearing and reallocating the backing buffer unnecessarily | Allocate backing store only on CSS/DPR change, expose dev-only resize count for browser checks | PASS browser matrix |
| Q1-F06 | At 320×568 Pause action was **at y=594.75**, outside 568px viewport by 26.75px | Responsive viewport height budget, compact message and move developer fields into collapsed section | PASS in corrected CI |
| Q1-F07 | Two row-zero decorative placeholders were marked `dead` in source geometry and painted red, misleadingly implying pre-existing wrong attempts | Skip rendering the two decorative placeholders; the base Spark platform remains and the source world/collision is unchanged | PASS screenshot review |
| Q1-F08 | Debug seed, framing and movement controls consumed permanent mobile viewport space | Place them under explicit collapsible Developer settings; preserve existing scenario script by opening the section when needed | PASS original 02A UI regression |

## 3. Visual-review samples

The executable CI captures **11 actual browser screenshots**, uploaded as `cc2-q1-visual-evidence`, alongside the interaction logs:

- 320×568 ready, 360×640 ready, 390×844 ready, 428×926 ready.
- 768×1024 ready, 1200×800 ready.
- 390px wrong outbound, wrong shorted, wrong returned.
- 390px correct landing/new math and power-cell rebase.

**Artifact:** [Q1 screenshots on Actions run 43132543988](https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/43132543988). The final follow-up run's artifact supersedes it once available.

The base screenshot now displays only the legitimate center starting platform, not false red fail blocks. The screenshots show platform numerals and Spark number legible against the dark circuitry; the incorrect arithmetic and checkpoint transitions have high-contrast separate visual grammars.

## 4. Test and acceptance controls

- Actual Q1-specific browser script: `src/games/circuit-climb-2/devtools/cc2-02a-q1-visual-smoke.mjs`.
- Source-integrity guard validates all original SOT-02 files and exact Q1 ancestry.
- TypeScript project check and complete original/new Vitest suite.
- Build smoke plus actual new 02A browser play tests.
- Actual Chromium Q1 screen sizes: **320×568, 360×640, 390×844, 428×926, 768×1024 and 1200×800**.
- Every viewport checks no horizontal overflow, first-viewport Pause visibility, three visible DOM choices, >=44px height, >=52px width, no clipped selection, no banner overlap and no repeated canvas resizes.
- Actual wrong-choice outbound and return verified, including immutable problem identity/number and disabled wrong option.
- Actual right-choice landing verified with solved arithmetic and exact next-row numerical continuity.
- Four-row checkpoint verified with exactly one `VOLTAGE_REBASE`, visible old/new status.
- Numeric keyboard shortcut verified to submit a single attempt.
- Retained SOT-02 original browser regression required as a separate final CI step.
- Human screenshots inspected after passing automation; no AI/hazard/player capture integration claimed.

**No numerical event source was modified in Q1.** All fixes are presentation-only. The math, routing, core state machine, config/replay schemas and old 2.0 design baseline remain exactly as they were at CC2-02A.

## 5. Visual quality assessment

The current core lab is suitable for testing whether the learner understands *choose operand → Spark travels → result builds → correct power or wrong short/return*. Its presentation uses restrained dark architectural lanes, simple cyan/green/red semantics, high-contrast numerals, and a compact HUD/bottom controls.

It is **not a production-art acceptance**: environmental effects, additional background depth, polished particles, final animation pacing, audio/haptics, onboarding, final motion reduction, accessibility auditing and MathForge host integration belong to CC2-03/04.

One intentional interaction exception: the backported Circuit and Hop paths have not been cosmetically reconciled into one production transition grammar. Both remain separately testable and mathematically equivalent.

## 6. Actual unresolved gates

1. **Owner play review:** use genuine phone and tablet; inspect finger taps, wrong short/return clarity, and whether the voltage reset feels intuitive rather than a contradiction.
2. **Pursuer absent:** six original pursuit-specific successor tests remain deferred to CC2-02B, including reacquisition, obstacle navigation, physical capture and freeze.
3. **No publicly deployed preview:** screenshots and GitHub source are available; local Vite lab can run on any checked-out workstation. Deployment must be an explicit future step, not silently assumed.
4. **SDK and production presentation:** intentionally out of Q1 scope. The learner events remain source-owned.
5. **Full accessibility and device performance:** browser emulation passes interactions, but VoiceOver/TalkBack, real Safari, actual Galaxy Tab S6 Lite, haptics and low-end FPS budgets remain unverified.

## 7. Q1 scope protection and next step

Source diff against CC2-02A parent contains **only**:
- added dedicated Q1 screenshot/interaction browser script,
- added dedicated Q1 CI workflow,
- modifications in Q1 learner lab HTML/TS,
- modification to previous 02A browser smoke to open the collapsed developer settings.

No core, world, curriculum, scoring, pursue-bot, SDK or original source modifications.

**PM disposition:** engineering and visual *candidate* qualified in Chromium; keep unmerged in draft review. Proceed to **CC2-02B pursuer laboratory** only as a separate workstream, while owner can review these artifacts. No need to block designing the isolated pursuer laboratory on a cosmetic final-art pass, but do not declare 2.0 finished until real chase and owner acceptances exist.
