# CC2-05A — Camera Zoom and Source-Authoritative Behavior Tuning Laboratory

**Date:** 2026-11-12  
**PM authority:** CC2 successor, not historical SOT-02 nor old Pursuer R&D  
**Parent:** `f7d23ff55bbaa17349ccd97ec151f33065a186ed` (Q2 math + offline standalone PASS)  
**Candidate branch:** `feature/cc2-05a-camera-behavior-tuning`  
**Promotion:** draft/unmerged, pending exact-head CI and owner gameplay review.

## 1. Why the former "World framing" was not camera zoom

CC2-04's framingPercent (80..120) changes **physical world geometry**: world row gap, actor radius and safe route dimensions. Treating it as mere visual zoom would corrupt replay parity and chase/route behavior. Therefore CC2-05A adds a separate `CameraViewPresetV1`, with **zoom 0.60..1.0** (lab default **0.70**) and camera follow factor (0.05..0.50, default 0.13). The Canvas geometry and DOM button locations share a single projection. Hit targets remain at least 52x44 screen pixels; zoom does not change world or math.

The core currently authors only the next **one** numbered problem, after a completed correct physical landing. Drawing three additional numbered future problems would disclose mathematically uncommitted options. CC2-05A instead draws up to four softly dashed **noninteractive structural preview** rows above the active problem. These silhouettes are never added to `WorldV1.rows`, receive no platform ID, are never mathematically evaluated, and cannot be clicked. Only the three active platforms have numbered accessible DOM buttons.

## 2. Four independent configuration domains

1. **RunConfigV1 (existing):** mode, curriculum, movement Circuit/Hop, physical framing 80–120%, route turns (6/8/10/12), landingGraceTicks (0–120), transitShield on/off. All source-owned and replayed. Existing mathematical semantics unchanged.
2. **LearnerMotionPresetV1 (new):** circuitSpeedPerTick (1–50, default 16), hopTicks (6–90, default 18), returnTicks (6–90, default 14). Used **in the actual core** to advance real circuit/Hop and wrong-return movement, never in renderer timers. Optional field in previous V1 replay type preserves historical playback behavior.
3. **PursuerPresetV1 (already implemented by CC2-02B; now exposed):** nearSenseRadius (50–500), clearSightRadius (50–600), trailSenseRadius (0–260), trailLifetimeTicks (0–1200), staleContactTicks (0–120), speedSearch (0.1–10), speedPursuit (0.1–12), actorRadiusRatio (0.25–0.7), spawnRowsBelow (1–4). Existing finite-sensing/firewall, chassis graph route constraints and physical capture authority remain unchanged. Existing `ChaseReplayV1` already serialized pursuerPreset; now also serializes learnerMotion.
4. **CameraViewPresetV1 (new, render-only):** zoom and follow smoothing. Never passed into the simulator, math generator, AI or replay source digest; recorded only alongside exported developer preset.

This phase exposes every already-validated PursuerPreset knob and the source-owned core travel timing controls. It does **not** claim that the graph-search algorithm itself or all fixed chassis constants are externalized. Changing an algorithm is a separate, strictly tested controller-version change. No user-facing "omniscience" toggle is permitted.

## 3. Developer Lab UX

Expand **Developer Laboratory · Camera / Spark / Pursuer** below the board.

- Drag **Camera zoom** to see more of the board **immediately**, without resetting or advancing the game. The new default is 70%, and 60–100% is available.
- Change Spark motion timings, row geometry options or AI sensing/memory/speeds, then click **Apply tuning & new run**. A fresh run uses a complete validated preset, ensuring consistent test comparisons.
- **Export preset JSON** writes a human-readable versioned preset into the textarea and downloads `cc2-05a-behavior-preset.json`.
- Paste JSON and click **Import preset JSON** to validate all keys and ranges before altering control values or starting a new run. Invalid JSON is visibly rejected, and the existing run remains unchanged.
- **Reset lab defaults** restores source-approved tuning values (the UI starts a Make Target demo for owner convenience).
- The existing **Export replay** includes the applied Developer preset, source replay, current state digest, event ledger and source-grounded end summary. It does not falsely report edited but unapplied AI parameters as active settings.

A serious human tuning report should record: seed, mode, math curriculum, camera zoom, Spark timings, Pursuer sensing and movement, specific behavior observed, and replay JSON. Repeat the same seed to compare genuinely different bot behavior.

## 4. Qualification

New test file `tests/cameraAndTuning05A.test.ts`: validation, source actual Circuit/Hop/return timings, Pursuer speed and sensing, default source-equivalent replay, custom replay signatures, visual camera-only projection.

New Chromium test `devtools/cc2-05a-browser-smoke.mjs`: at 320/390/768 px, prove zoom independent from core, preview rows have no future math state, DOM choice positions follow projected Canvas, user control changes reach actual source replay and movement, import/export/reset valid, malformed preset leaves game unchanged, no overflow or browser errors.

`.github/workflows/cc2-05a-tuning.yml` tests old SOT custody and browser regression, CC2-04 achievement browser, Q2 curriculum browser, new zoom+behavior browser, all unit tests, production build, and verified one-file HTML `cc2-standalone/CC2-05A-TuningLab-Playable.html` opened over `file://` with internet blocked.

## 5. Next gate

**CC2-05A-R (Endless-world and retention).** At least 150 real rows with a deliberately lagging pursuer; no disappearing current node, memory/graph blow-up, teleport, false capture or leaked hidden Spark position. Pursuer route planner's legacy graph growth bound remains unqualified. This is a separate source-backed stress gate, not automatically passed by the new tuning panel. Follow with runtime/frame profiling, iPhone Safari and Galaxy Tab actual human-play tuning, then visual/sound polish.

**Hard preservation:** do not merge or edit original SOT-02, old Pursuer R&D, existing Q2 branch, or production design authority without explicit review.
