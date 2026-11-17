# CC2-MAINT-31 — Circuit Climb Comprehensive Maintenance and Release Recovery

**Scope:** maintenance qualification only. No new species, powers, motion design, player physics, mathematics, scoring, camera rules or released UI materials in this branch. Qualified parent CC2-30H (source SHA `7d0f3a7f5b00bb0c537cddc25ebe958e6490bcd3`) is preserved. Protected accepted CC2-28 / slate-focus acceptance sources are untouched.

## Executive finding
A user-reported “pressed the button; game did not start” is **not equivalent to a broken core engine**. The playable release has two explicit stages:
1. `#cc209c-enter` is labeled **View the tower**. Clicking it removes the intro and makes the board/three choices visible, but **does not start the Pursuer simulation**.
2. The first real tap on `button.choice` starts the Pursuer, evaluates the mathematical choice, and moves Spark on source-owned ticks. The banner explicitly says “CHOOSE ANY NUMBER TO BEGIN THE CHASE.” This distinction should remain visible in future onboarding.

Prior tests mostly checked individually that the intro was dismissed, a canvas had pixels, the row projection counted 3+3, or a creature existed. Those tests could pass even when the user launch method or other lifecycle step was broken. The new complete-lifecycle gate opens the EXACT `dist/cc2-30.html` via browser navigation and makes ordinary pointer choices.

## Verified history of recurring failures
| Incident | Source-level cause | Status |
|---|---|---|
| Earlier splash Play did nothing when downloaded | ChatGPT/iOS inline/local file preview was used as equivalent of normal HTTPS game hosting; **physical preview JavaScript execution not established** | Delivery blocker; never claim local file preview parity |
| CC2-30F blank stage and raw minified code printed on page | `String.replace(tag,compiledJs)` expanded an internal `$&` replacement token, injecting the original script tag inside minified engine; browser parsed rest as visible text | Repaired by callback-based literal asset insertion in PR #45 and retained parser gate |
| CC2-30G board active but no future platforms | `#worldCanvas{opacity:0!important}` under accepted Heritage presentation; preview tiers had been drawn only to hidden source canvas; visible Heritage renderer did not draw future tiers | Repaired in PR #47, pixel-contrast and screenshot gate passed |
| CC2-30G guardian not visible at startup | Guardian is designed to unlock after **first genuine completed row**, not before player selects a choice | Expected by source; first-row encounter fully tested |
| Run ID repeats after summary restart with same seed | New `CircuitClimbCore` instance uses deterministic `cc2/<seed>/run-1` ID; seeded game generation and replay are deliberately reproducible | **Open contract risk** for future cross-session persistence; do not alter seed/replay to force new IDs in a maintenance-only phase without versioned change |
| Incomplete button/lifecycle tests | Existing tests validated parts of the journey independently and did not require intro->real first tap->Spark motion->pause/resume->Guardian->end->restart on the same packaged file | Fixed by additive CC2-MAINT-31A and -31B tests |

## Maintenance test inventory
**Base correctness:** source Vitest 225 tests including mathematical modes, source replay/digests, actor movement, source events, math fairness, Guardian ability SDK, period/contact boundaries, pause, source enforcement.

**CC2-27/28 browser regression:** accepted static special packets, real pointer geometry at 320/390/768, correct row receipts, source-selected strategy modes, historical UI controls.

**CC2-30A/B/C/E/F/G/H browser regression:** real creature placement, source math gate, strict visual/config isolation, 50% Pursuer-only persistent blanket, visible architecture, mobile pixel and screenshot parity, no source text spill in actual bundled HTML, zero-parameter preview, renamed HTML, previous controls.

**CC2-MAINT-31A, new:** real user flow on the exact `dist/cc2-30.html` at 320/390/768: intro load, Help from intro, Settings open/close, actual pointer hit, mathematical receipt, source tick and Spark movement, Pause stops tick, Resume restarts tick, correct row, physically tappable Guardian, correct independent micro-math activation, Molasses contact source, visible future structures, New Run clears all gameplay and UI, and no JS exceptions. Separately test the ordinary `#cc209c-enter` path and `file://` browser playback.

**CC2-MAINT-31B, new:** genuine solved answer, explicit real end-run button DOM event, exactly one authoritative `RUN_ENDED`, visible correct score, attempts and solved-only equation, rejection of stray post-terminal choices, clean summary restart with a new source ledger and zero old state, no exceptions. Deliberately does not demand a new ID string for a deterministic same-seed run.

## Non-negotiable candidate release gates
1. **Browser + delivery parity:** actual deployed HTTPS output must be byte-identical to the fully qualified standalone (or exact Git SHA runtime). Never hand off sandbox/file:// previews as the only iPhone test method.
2. **Start and first answer must both work:** the intro button can dismiss without an autonomous chase, but the first actual pointer selection must create a source receipt and move Spark.
3. **Visible pixels, not hidden counters:** accepted Heritage painter must produce contrasted preexisting future platforms at expected screen coordinates.
4. **World and math unchanged by specials:** Guardian math cannot invent primary row credit; Molasses only halves actual bot movement below source elevation; player Spark and choice math remain identical.
5. **Run termination and restart:** truthful solved-only summary, one end receipt, terminal noninterference, clean independent ledgers on restart.
6. **No source-of-truth drift:** no merge to accepted game or main until human iPhone and tablet acceptance. Keep earlier CC2-28 and CC2-30E hosted versions available as comparison points.
7. **Future cross-session ID uniqueness is a separate RFC:** review replay schema, source ownership, deterministic seeded reset, and external persistence before changing it.

## Acceptance limitations
- Automated GitHub Chromium at 320, 390, 768 CSS widths does not validate native iOS Safari / ChatGPT document preview.
- A downloaded HTML attachment opened inside ChatGPT or Files may have host restrictions. The HTML file's normal browser `file://` test is not equivalent to iOS QuickLook.
- Vercel daily deployment quota has previously returned HTTP 402. An exact ready HTTPS deployment is still required for physical-device qualification.
- Current CI tests do not prove hour-long game balance, all six proposed creatures, or native-device audio/performance. Those are later separate product phases, not covered by maintenance claims.

## Release decision
**Keep CC2-MAINT-31 isolated and draft** until complete CI passes on its HEAD and a verified HTTPS URL of the exact build is available for owner iPhone and tablet acceptance. Do not patch game mechanics in response to an unverified document preview failure.
