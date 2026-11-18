# CC2-43 — Owner-Locked Balanced Tower Geometry

**Date:** 2026-11-18
**Status:** Candidate, green automated qualification; owner screenshot and hardware acceptance still pending.
**Base:** `feature/cc2-34d4-relay-answer-terminal-20261118` at `728997d74d67a53fdbbc18b94974cc7b78047dcd`.
**Source of owner defect:** screenshot `Clipboard26(20261118-124651).jpg` supplied in dedicated Circuit Climb PM conversation.
**Intent:** Fix visual row compression and asymmetric starting tiers without changing physical play, math, scoring, Pursuer, camera legacy mode, sound or accepted baseline.

## Root causes verified in source
1. `computeProductionCamera` previously calculated yScale by fitting 3+3 physical gaps and the tracking headroom into the same viewport. Increasing world `rowGapScale` was canceled by automatic zoom-out, undoing the owner's requested visual separation.
2. The source preview and VISIBLE pale Heritage adapter both used `Math.max(0, sparkRow-3)` to enumerate structural tiers. At the actual starting row zero this gives no below-platform tier. The empty space under Spark visually top-loaded the game even though the camera was roughly centered.
3. The original board could be too short to display seven tier centers, HUD equation clearance and readable spacing simultaneously. Reducing the row pitch to force all tiers into the board was the historical oscillating fix to avoid.

## New geometry authority
- The **single CSS token** `--cc243-row-pitch` controls display pitch:
  - phone widths up to 600 CSS px: **96 CSS px** (platform center-to-center)
  - larger widths: **108 CSS px**.
- `productionCamera.ts` accepts optional `lockedRowPitchCssPx` and `canvasCssWidth`, and projects the source's REAL `rowGap` at exactly that pitch. No source geometry, route or replay data is modified.
- `cc2Flow=1` opts into this lock and marks `body.cc243-locked-spacing` before first source draw. `cc2Flow=0` preserves exact historical camera behavior.
- Spark's display camera centers to within eight CSS pixels of the playfield vertical midpoint; the three above and three below display bands share the SAME pitch.
- To prevent compression, the board is at least 720 CSS px high on phones and 800 CSS px high on wider viewports. On a short viewport this may require vertical page scroll; do NOT silently shrink tier pitch or hide bottom geometry to avoid scrolling.
- The VISIBLE Heritage painter now renders decorative unnumbered tiers at negative indices -1, -2, -3 at the start, with quietly distinct desaturated ceramic material. These are not world rows, answer platforms, selectable buttons, prior mathematical solves, or collision geometry. At higher rows, real retained past rows naturally replace structural placeholders.
- The hidden worldCanvas structural preview is also aligned; actual DOM mathematical answer positions share the one camera transform.
- User camera zoom changes cannot override the locked pitch in flow mode. In legacy mode, zoom still behaves as before.
- Developer readout exposes the fixed pitch; no need to guess values from photos.

## Automated gates and evidence
GitHub Actions: `https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44309590863` — **success**.
- 17 unit tests across new geometry, historical camera and core transactions: pass.
- 41 packaged Chromium assertions at 320/390/428/768/988: pass.
- Actual canvas pixel sampling confirms lower dormant tiers visible (not just virtual coordinates).
- Mathematics still has exactly THREE clickable current options; genuine selection remains hittable.
- Row pitch is exact, camera remains symmetric, no browser JS exceptions.
- Historical Heritage test passes again at 320/390/768 and `cc2Flow=0` remains unchanged.
- CI exports full-page browser screenshots as `cc2-43-balanced-row-screenshots` artifact.
- Physical iPhone and Android tablet owner screenshot review pending.

## Strict non-regression rule
Do not change `--cc243-row-pitch`, board minimum heights, signed structural-row enumeration, or camera centering without (a) a new isolated branch, (b) a controlled before/after screenshot at 320/390/428/768/988, (c) updated tests justifying the change, and (d) explicit owner visual acceptance. Never solve spacing by changing `run.rowGapScale` or camera zoom alone; the two domains must remain separate.

## Known tradeoff
At a short window height, preserving seven readable tier centers requires scroll. If the owner prefers all action buttons within one screen, that is a different layout product decision; do not revert spacing automatically. Evaluate alternative (2+2 displayed with same fixed pitch, or dedicated sticky controls) in a separate experiment before changing the approved row-spacing contract.

## Release status
The Vercel preview for commit `7552356dba165c7e1a80bf84925dcd2b46f437c7` is READY at `mathforge-circuit-climb-cc2-preview-88wzkigap.vercel.app`, but direct public loading from external browsing tools could not be verified. Do not merge into the owner-accepted reference until visual and hardware testing.
