# CC2-34C — Source-Owned Relay Weaver Earned Ability Gate

Date: 2026-11-17 (CI 2026-11-18 UTC)
Based on CC2-34/39A draft PR #50, preserves protected CC2 owner baseline and maintenance candidate.

## New implementation
`src/games/circuit-climb-2/features/relayWeaverCreature34C.ts` is a headless source-owned Relay Weaver candidate with:
- Deterministic, independently seeded appearance after genuine learner progress.
- Spawn selection independent of the mathematically correct platform.
- One interactive encounter through `CreatureEncounterArbiter`.
- Real optional short skip-count gate, three distinct choices, 180-tick default timer, pause-aware.
- Explicit solved/wrong/declined/expired receipts. Wrong/declined means no guidance and no punitive fake row assessment.
- Correct independent gate starts `RelayGuidanceDirector` for FOUR genuine platform completions (no automatic movement or mathematical credit).
- If solved during Spark travel, source marks `ARMED` until the next READY phase; no collision or route change.
- Source-owned run reset, terminal clearing contract, bounded receipts and configuration validation.
- The existing chase, core, score, music, source/SDK and deployment remain UNCHANGED on ordinary URLs.

## Tests
GitHub Actions run `44228870366`: SUCCESS.
- TypeScript `npm run lint` pass.
- 5 test files, **35 tests passed**: new Relay source authority, prior Relay projection/ecology/material, Molasses SDK, and core transactions.
- Existing exact game `npm run build` passed.
- Parent PR #50's packaged Chromium path tests at 320/390/768 passed 25 assertions.

## Remaining work to become a playable earned creature
- Integrate Relay director as versioned optional subsystem in `CircuitClimbChaseCore` and replay commands/receipts.
- Add a visible autonomous Weaver avatar and tactile creature-only hit target to the in-game UI.
- Lock simultaneous Guardian vs Relay encounter offers in integrated source; keep nonoverlapping lingering effects.
- Connect earned source Relay receipts to the qualified 4-platform hologram. Remove stand-alone free developer preview from player-mode path.
- Invalidate/recompute forecast safely when pursuit, player mistakes or topology changes alter the future; cache out of frame loop.
- Audio: four restrained conductive tones on actual correctly guided row receipts, integrated with reference 5-stem music.
- Real mobile tests and same-seed replay parity; potential 60Hz CPU cost of forecast must be budgeted.
- Owner acceptance / real HTTPS preview (Vercel quota 402 blocked latest deployment).

## Owner creature priority
1. Guardian existing
2. Relay Weaver earned four-row assistance
3. Fracture Wisp, four temporary soft landings with 120 source-tick support
4. Tether Slug experimental
5. Prism Shuffler parked
6. Capacitor deferred

**Status: source authority tested, not yet a deployed integrated creature.** Do not merge into accepted branch or claim commercial readiness.
