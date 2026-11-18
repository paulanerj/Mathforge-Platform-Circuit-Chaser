# CC2-44 — Three Above, One Below & Live Visual Row Distance

Date: November 18, 2026
Governing repository: `paulanerj/Mathforge-Platform-Circuit-Chaser`
Source branch: `feature/cc2-44-three-up-one-down-row-slider-20261118`
Base: `fix/cc2-43-locked-balanced-row-geometry-20261118` at commit `a2594054c30adf623ac9fa081915526ba3f87f2d`.
Last tested gameplay commit: `bcdfea1ab20e611e2f528e2d7ab65103fe56191a` (source code; this document is a later documentation-only commit).

## Owner change request

Reduce visual crowding: show exactly THREE rows ahead of Spark and ONE behind Spark, with a lower area that can expose the approaching Pursuer. Add a live slider that changes the visible distance between rows, without camera auto-zoom erasing the change. Preserve earlier approved geometry and the original source math, Pursuer AI, movement, audio and scored session authority.

## Implemented

- The CC2-43 pixel-pitch camera accepts a separately opted-in `flowFraming:'3_UP_1_DOWN'` parameter. Spark's rendered center is located 3 pitch intervals plus 50 CSS px below the board top. The previous symmetric camera branch is unchanged when this option is omitted.
- The stage displays three genuine/structural rows above and one real/dormant row below; source world and replay rows outside the window remain untouched. Lower dormant geometry at row -1 is explicitly non-clickable and not a mathematical choice.
- Responsive defaults are 96 CSS px on phone (max 600 px width) and 108 CSS px on larger screens.
- The Developer Settings > Developer tools > Developer Laboratory > Viewport section has a **Visible row distance** range slider, 80–140 CSS px, step 2. It changes the CSS geometry token `--cc243-row-pitch` *live*; camera projection and responsive board height read that same token.
- To avoid canceling the user's adjustment, the displayed stage grows/shrinks by four times the pitch delta. No source `run.rowGapScale`, simulation ticks, jump distance, math, scoring, action geometry or Pursuer sensors are changed by the slider.
- The actual visible pale Heritage painter and hidden source architecture paint the same signed row range. Real platform rows outside the visual window are preserved by the engine but omitted from the visible renderer.
- The `rendererStats()` data now exposes `flowRowsAbove:3` and `flowRowsBelow:1`; the legacy `flowRowsEachSide:3` read-only property remains for older diagnostic consumers.
- The historical `?cc2Flow=0&cc230=0` presentation retains its prior two-above/two-below behavior and the new slider is disabled.

## Qualification: PASS

Actions run: https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44371176498

- `npm run lint` — PASS.
- 22 Vitest source contracts across four suites (CC2-44, original production camera, CC2-43 geometry and math transactions) — PASS.
- `npm run build` exact standalone `dist/cc2-30.html` — PASS.
- 56 packaged Chromium assertions on 320, 390, 428, 768 and 988 px — PASS, including *actual keyboard-driven slider movement within Settings*, visible Heritage lower-tier pixels, new stage height, existing hitboxes and no mathematical state change under a frozen source QA clock.
- Historical CC2-30H Heritage visible-pixel tests at 320/390/768 and `cc2Flow=0` legacy — PASS.
- CI screenshot artifact: https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44371176498/artifacts/14458463870

## Deployment status

Automatic early-branch Vercel previews exist but predate the final tested code and MUST NOT be advertised as CC2-44 release.
An explicit Git-source Vercel deployment request for code SHA `bcdfea1ab20e611e2f528e2d7ab65103fe56191a` was rejected with HTTP 402 `api-deployments-free-per-day` (more than 100 deploys within 24h). The new CC2-44 public HTTPS gameplay URL is therefore not verified or available.
The last verified pre-CC2-44 candidate is CC2-43 at https://mathforge-circuit-climb-cc2-preview-88wzkigap.vercel.app/cc2-30.html; DO NOT confuse it with this phase.

## Still pending (future phases)

- CC2-45: unified thicker platform bodies, same footprint for present and future, source-backed numbers on future platforms (requires observational lookahead rather than invented values).
- CC2-46: remove numeral on landed platform and strengthen connected-state plasma illumination.
- CC2-47/48: seedable authored staggering patterns and 2-column speedy corridor, with mathematical and route solvability gates.
- Owner screenshot/physical iPhone/tablet acceptance and actual newly deployed CC2-44 Vercel URL.

Do not merge this candidate into accepted Slate/Focus or old main based solely on CI. Preserve this geometry policy as a first-class presentation contract; subsequent platform redesign phases should not change it without a separate owner-accepted visual pass.
