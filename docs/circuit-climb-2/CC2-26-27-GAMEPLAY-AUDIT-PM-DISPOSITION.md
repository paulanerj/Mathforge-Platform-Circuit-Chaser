# CC2-26/27 Owner-Review Handoff and MF-GAME-AUDIT-06 Disposition

**Date:** 2026-11-16/17 UTC. **Status:** independent draft development; engineering CI and physical owner acceptance are distinct. No `main` merge, production promotion, or change to accepted game authority.

## Proven source hierarchy
- Owner-selected, playtested visual baseline: Slate / Focus 43, `66a3ab972be05cdc52cff88d712abc151c8a5e40`, PR #32, untouched.
- User playtested CC2-24/25 and reported playable version worked well, and that the new music was interactive and appeared correct; **did not see special elements**. The precise parent remains `2fc9baf345a8372e83f188d524ceca6c87c2fc5f`, PR #33. Do not infer the debrief/capture was physically reverified, nor treat the absence of specials as proof they are absent in code.
- CC2-26: branch `feature/cc2-26-living-pursuer-mass-intent` (PR #36) based on PR #33. New additive oxide material preset and intent/read-only diagnostics. Opt in `?cc226=1`. No game source changed.
- CC2-27: branch `feature/cc2-27-role-distinct-enemy-ecology` (separate PR) based on the CC2-26 candidate. Adds a **strictly optional, versioned** `encounterPolicy: 'cc2-27-distinct/v1'` to the existing CC2-23 secondary director. Omission preserves legacy replay/config; no new secondary actors on ordinary URLs. Opt in with `?cc223=both&cc223Demo=1&cc227=1`.

## CC2-26 actual scope
The existing CC2-20 fixed-step material simulation and CC2-21 shell anchoring remain authoritative visual implementation. New oxide-red tuning biases toward mass, modest inertial lag, bounded wake and quiet internal motion. Uses existing canvas only; no second canvas/black compositor. The same source sensor/personality drives presentation intensity; no inferred target knowledge, no steering or capture changes. Visual preset import/export and a read-only telemetry surface are in Developer Settings. No changed audio and no changed CC2-19 terminal choreography.

## CC2-27 actual distinct gameplay roles
- **Scout:** mobile patrol; sight-based warning, brief bounded alert, max 6% supportive Pursuer speed influence. Lost sight ends pressure immediately, with a proper cooldown.
- **Sentry:** fixed swept directional field; minimum 64-tick telegraph, max 10% supportive Pursuer speed influence; leaving its actual cone or breaking sight cancels alert and enters cooldown.
- Both cannot read mathematics, grade platforms, adjust the Spark, or deliver lethal capture. They are not omniscient. Pressure only applies if the original Pursuer simultaneously has genuine pursuit sensor lock. No multiplication of two boosts; max 10% for default approved test profile.
- Existing Scout triangle and Sentry diamond remain distinct, with a bounded orientation-linked Sentry fan and source-backed warning grammar. No full-board canvas.
- Normal `climb` still has the original Pursuer alone; standard Scout threshold is 4 completed rows and Sentry 8, so a short ordinary playtest may not show them. The explicit `cc223Demo=1` *experimental* preview spawns them at the first genuine tick. Practice still suppresses them.

## Disposition of independent Gameplay Completeness Audit (MF-GAME-AUDIT-06)
Report: 24 requirements; 7 PASS, 15 PARTIAL, 2 FAIL, and **not** physical-device, Gen2 or production certification. It correctly identifies that existing scoring, achievements, audio, results, mathematics and chases should be extended, not replaced.

| Audit finding | PM decision | Roadmap |
|---|---|---|
| Default Climb is endless; Practice 4 / Challenge 12 have real wins | **Accepted as product problem**. Finite first mission should be a visible optional mode, no silent default change | CC2-30, as first onboarding slice |
| Five run-local badges; no cross-session progress or comparable PB | **Accepted**. Persistent, idempotent, receipt-backed records; no duplicate scoring engine; difficulty/curriculum/mode separation | CC2-29/30 |
| Perceived audio adapts / debrief honest | **Owner positive music test; partial physical gate**. Retain current sound and source-backed debrief; verify real capture, zero-rows, goals and replay across devices | CC2-24/25 owner follow-up, CC2-33 |
| Pursuer fair and physical creature | **Apply now** the visual matter/tether/intent phase, never hidden speed tuning; matched-seed novice vs expert chase study remains open | CC2-26, CC2-31/33 |
| Scout/Sentry role distinction and source sensing | **Apply now as opt-in**; safely let players see both in demo, require real eye/hand feedback before making default | CC2-27 |
| Pulse/Capacitor/Relay strategy not visible to short-run owner | **Audit correctly notes systems exist**. Design future teachable powerups and special platforms; do not fabricate specials or silently enable in Practice | CC2-28 |
| Choice vs physical landing | **Already source-backed**. Preserve `ATTEMPT_EVALUATED` vs `ROW_COMPLETED` receipt authority and solved-only debrief | always-on correctness gate |
| Independent vs hinted performance / educational progression | **Accepted follow-up**; hints must have versioned support exposure, not retroactively rewrite scoring or claim mastery | CC2-31 |
| Gen2 F04/persistence and physical accessibility | **Unverified/FAIL** for commercial readiness, remains release hold | CC2-32/33 |

## Acceptance gates
1. CC2-26: browser and phone source attachment; red shell remains centered within bounded plasma; no pink detached blob, no black board, no synthetic capture, 320–428 phone responsive, reduced motion and stable performance.
2. CC2-27: real first tap and genuine mathematical choices with both roles visible; distinct warning and counterplay; no threatening player during protected Practice; source replay matches seeded event digest; enemy policy can be disabled with legacy off parity.
3. Test engineer records numerical results (not marketing): historical math/capture/inputs, deterministic role unit test, first-click 320/390/768 browser smoke, offline single-file, Vite production build and device signoff.
4. Once user approves, independently consider integration/merge gates. **No automatic release from CI.**

## PM continuity
Cross-suite issue #35 describes the audit; permanent CC2 continuity issue #34 is the source hierarchy and next action index. The two opt-in phases are not a substitute for commercial gameplay completeness, especially first mission and durable records.
