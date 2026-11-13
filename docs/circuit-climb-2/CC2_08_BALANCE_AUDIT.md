# CC2-08 — Balance Qualification Audit and Isolated Playable Lab

Date: 2026-11-13
Parent: CC2-07E PR #13, source commit `df3fe8b71aeeeea2d34f235a80b3c231ded02040`.
Branch: `feature/cc2-08-balance-qualification`.
Status: isolated qualification; no merge, deployment or production difficulty approval.

## Source audit
- `devtools/sessionTelemetry07C.ts`: read-only fixed 15-tick sampling, capped at 1,200 retained samples; full-tick aggregate range, first legitimate contact, route failures, rows and end reason.
- `devtools/cc2-02a.ts`: source-authoritative session report schema `cc2-playtest-report/v1` and a direct download button; replay/ledger included.
- `config/paceProfiles.ts`: Warm-up, Energetic, Intense retain same seeded arithmetic, but differ in Spark/pursuer speeds, detection radius and landing grace.
- `presentation/threatRadar07D.ts`: Euclidean world separation divided by actual physical rowGap. The UI indicator is distinct from actual Pursuer sensing.
- `pursuer/pursuerController.ts`: prior 07E bounded public graph gate; 180-tier test is structural, not a 180-row human completed-run proof.

## Evidence and limitations
Earlier six-seed/three-pace synthetic 40s matrix: Warm-up 0/6 captures, Energetic 3/6, Intense 6/6. These results use an always-correct agent with a 45-tick answer delay. They do not establish human difficulty, age suitability or fairness.

## Independent owner-facing CC2-08 candidate
Recovered the exact owner-library 07E offline HTML, SHA-256 `3532abe203377a9b0640584765db1548f942db0b54f2fe1357464b64ff4d3e19`.
A read-only HTML extension named `PLAY-CircuitClimb-CC2-08-BALANCE-LAB.html` uses the existing public `window.__CC2_02A__.sessionReport()` interface, displays session metrics, and exports `cc2-08-balance-snapshot/v1`.
The actual gameplay bundle is unchanged from 07E. This is an isolated owner playtest artifact, not a source-integrated game logic revision.

Local Chromium assertions PASSED at 320×568, 390×844, 768×1024 and 826×680:
- source API initializes; new read-only API initializes
- serialized game state equal before/after analysis
- physical rowGap remains 307.5
- no horizontal overflow or script errors
- refresh generates valid report and click downloads a JSON of declared schema.

## Critical next qualification gates
1. Collect real-session complete `cc2-playtest-report/v1` JSON for each difficulty, preferably matched seed and consistent user/curriculum/mode. Keep raw reports for full replay integrity.
2. Validate report schema, monotonic ticks, completeness, seed/config, and replay digest before aggregating.
3. Compare capture fraction with Wilson intervals, first-sense latency, time-to-capture, solved rows, route failures and proximity duration; separate censored/voluntary quits from survivals.
4. Stratify by learner skill and exposure; require more than one participant before making a production balance claim.
5. Preserve Energetic default while human fairness is unproven. Do not tune speed solely to synthetic capture count.
6. Qualify iPhone Safari and Galaxy tablet hardware, touch and sustained 60Hz performance.
7. Port the observer into source in the candidate branch with tests, then source-build a standalone HTML and independently qualify it before contemplating merge.

Original SOT-02 and protected game logic untouched.