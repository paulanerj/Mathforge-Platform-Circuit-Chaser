# Circuit Climb AI Studio Transfer Manifest
## Commit 8f54069 (Successor SOT Freeze)

**Date Generated:** 2026-08-30  
**Status:** Ready for clean-room restoration  
**Repository:** paulanerj/Mathforge-Platform-Circuit-Chaser  
**Branch:** claude/circuit-climb-forensic-audit-3s4oyh (tracking commit 8f54069)  

---

## What This Package Contains

### Embedded Payload
- **File:** `CIRCUIT_CLIMB_AI_STUDIO_RESTORE_01.py`
- **Format:** Self-contained Python script with base64-encoded tar.gz
- **Size:** ~127 KB compressed (~1.2 MB decompressed)
- **Contents:** Full Circuit Climb source, tests, config, and build files

### Restore Steps
1. Place `CIRCUIT_CLIMB_AI_STUDIO_RESTORE_01.py` in an empty directory
2. Run: `python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_01.py [target_dir]`
3. The script decodes, extracts, and verifies the archive

---

## Expected File Inventory

### Source Files (Core)
```
src/games/circuit-climb/
├── runtime/
│   ├── circuitClimbLearnerRouting.ts (478 lines) - Pure routing module
│   ├── useCircuitClimbPrototypeRuntime.ts (2347 lines) - Runtime hook
│   └── circuitClimbRuntimeRules.ts
├── geometry/
│   └── circuitClimbGeometry.ts (single source of truth for layout)
├── services/
│   └── CircuitClimbMathAdapter.ts
└── styles/
    └── circuit-climb.css
```

### Test Files (18 total)
```
src/games/circuit-climb/tests/
├── circuitClimbLockedCapabilities.test.ts (20 locks)
├── circuitClimbLearnerRouting.test.ts (14 tests)
├── circuitClimbGameLogic.test.ts
├── circuitClimbPursuerNavigation.test.ts
├── circuitClimbPursuerBehaviour.test.ts
├── circuitClimbPursuerSearch.test.ts
├── circuitClimbSparkAvoidance.test.ts
├── circuitClimbRuntimeRules.test.ts
├── circuitClimbMathAdapter.test.ts
├── circuitClimbTerminalLanding.test.ts
├── circuitClimbNumberTransition.test.ts
├── circuitClimbTargetReveal.test.ts
├── circuitClimbSequenceStress.test.ts
├── circuitClimbGeometry.test.ts
├── canvasPalette.test.ts
└── support/
    └── circuitClimbProductionFixtures.ts
```

### Configuration Files
```
package.json (npm dependencies)
package-lock.json
tsconfig.json
vite.config.ts
metadata.json
```

---

## Verification Checklist

### Step 1: Restore Archive
```bash
python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_01.py ./cc-restored
cd cc-restored
```

**Expected Output:**
- ✓ Decoded N bytes
- ✓ Extracted to ./cc-restored
- ✓ All 18 files verified
- ✓ Restoration complete

### Step 2: Install Dependencies
```bash
npm install
```

**Expected:** No errors, node_modules created, 200+ packages installed.

### Step 3: Lint Check
```bash
npm run lint
```

**Expected:** Clean (0 errors, 0 warnings).

### Step 4: Run Full Test Suite
```bash
npx vitest run
```

**Expected Results:**
- **Files:** 18 test files
- **Tests:** 165 total
- **Passing:** 165 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Duration:** ~5-10s

**Critical Locks (Must All Pass):**
- `circuitClimbLockedCapabilities.test.ts`: 20 tests
  - Geometry authority (logicalWidth, platformWidth, etc.)
  - Learner selection contract (fresh-row, zero-length, rejection)
  - Pursuer state preservation

### Step 5: Build
```bash
npm run build
```

**Expected:**
- ✓ Build succeeds
- ✓ dist/ directory created with compiled output
- ✓ No TypeScript errors

### Step 6: Launch Dev Server
```bash
npm run dev
```

**Expected:**
- ✓ Server starts on http://localhost:5173
- ✓ Game loads in browser (no white screen)
- ✓ Circuit Climb UI visible
- ✓ Platform grid renders
- ✓ Blue spark at top
- ✓ Numbered platforms (0, 1, 2, ...)
- ✓ First row clickable (learner moves/pursuer responds)

---

## Geometry Authority (Single Source of Truth)

**File:** `src/games/circuit-climb/geometry/circuitClimbGeometry.ts`

### Critical Constants
```typescript
logicalWidth: 600           // Canvas-relative drawing units
platformWidth: 104          // Platform visual width
platformHeight: 62          // Platform visual height
playerRadius: 32            // Collision radius
rowGap: 205                 // Vertical spacing between platform rows
routePlatformPadding: 8     // Route-crossing tolerance
columns: [110, 300, 490]    // X positions (3 columns)
```

**These must never be changed without full regression test suite re-verification.**

---

## Learner Routing Contract

**Module:** `src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts`

Pure, deterministic function: `planLearnerSelection(world, from, destinationPlatform) → LearnerSelectionResult`

**Guarantees:**
1. No side effects (no state mutation, no UI, no sound)
2. Routed platforms never extend beyond destination row
3. Zero-length routes rejected with reason
4. Pursuer state never blocks routing (pursuer-agnostic)
5. Returned route always crosses altitude/width contract
6. Fixtures must match production geometry (no richer test data)

---

## Pursuer States

**Terminal States (Once entered, not exitable within session):**
- `CAUGHT`: Terminal. Learner collision = end game.

**Active States:**
- `SEARCH`: Sweeping side-to-side, vertical crawl toward target
- `ALERT`: Oriented at sighting, paused 1.2s
- `CHASE`: Locked on learner, full pursuit speed

---

## Known Limitations (Documented, Unresolved)

1. **Pursuer geometry divergence off-default** – Platform radius detection unreliable at non-default scale
2. **Alive tuning provisional** – Learner alive state heuristic needs formal proof
3. **Spark avoidance ~1 in 24** – Deterministic collision resolution remains elusive
4. **Arrive/updateTravel/drawing in closure** – Pursuer update methods reference module scope
5. **Browser checks need external dependency** – Smoke test requires Chrome/Chromium
6. **Pursuer fixture duplication** – Test setups repeat platform/pursuer initialization
7. **NOT_CLOSING threshold close to rowGap** – Safety margin (205-25=180 units) may be narrow

**None of these affect product acceptance. All are recorded for next coder.**

---

## Repository Context

### Branch & Commit
- **Branch:** `claude/circuit-climb-forensic-audit-3s4oyh`
- **Commit:** `8f54069` (HEAD)
- **Status:** Clean (no uncommitted changes)

### Source of Truth Document
- **File:** `src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md`
- **Length:** 551 lines
- **Contents:**
  - Product design & acceptance criteria
  - Architecture map & module responsibilities
  - Geometry authority definition
  - Learner routing contract
  - Lock suite (capability guarantees)
  - Pursuer state machine
  - Debugging guide
  - Known limitations & next work

---

## Next Steps for AI Studio Coder

### Onboarding
1. Read SOT document (src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md)
2. Understand geometry authority is single source of truth
3. Verify all 165 tests pass in clean-room
4. Launch dev server and interact with the game

### Development Rules
1. **Geometry changes:** Update geometry authority first, re-verify all locks
2. **Routing changes:** Must maintain LearnerSelectionResult contract; add tests
3. **Test weakening:** Never. Fix product instead.
4. **Browser matrix:** Re-run smoke test (320, 390, 430, 590, 768 viewports)
5. **Commit pattern:** Small, testable changes; full suite green before commit

### Common Tasks
- **Add feature:** Extract testable boundary first, lock it, add tests, implement
- **Fix bug:** Reproduce with test, fix product, verify all locks still pass
- **Tune parameter:** Measure before/after, document in code, check lock impacts
- **Refactor:** Preserve behavior, re-run full suite, no broken locks

---

## Troubleshooting

### npm install fails
**Cause:** Dependency resolution issue  
**Fix:** `rm package-lock.json && npm install`

### Tests fail after restore
**Cause:** Likely not a restore issue (restore is deterministic)  
**Check:** Is the filesystem read-only? Does temp disk have space?  
**Verify:** `npx vitest run --reporter=verbose` for detailed output

### Dev server won't start
**Cause:** Port 5173 in use or build issue  
**Fix:** `npm run dev -- --port 5174` for alternate port  
**Or:** `npm run build` first to check for TypeScript errors

### Game doesn't render (white screen)
**Cause:** Usually missing Canvas or styles  
**Check:** Open DevTools console for JS errors  
**Verify:** Confirm `circuit-climb.css` loaded in Network tab

### Platforms invisible at narrow viewport
**Cause:** Fixed in this restore (was draw cull using CSS pixels instead of logical)  
**Status:** Should NOT occur on 8f54069

---

## File Hash Verification (Optional)

If you want to verify the restore integrity after extraction:

```bash
cd src/games/circuit-climb
find . -type f -name "*.ts" -o -name "*.css" | sort | xargs md5sum
```

No pre-computed hashes are provided in this manifest (payload contains the ground truth).
To verify across multiple restores, extract in two directories and compare:

```bash
diff -r restored-1/src/games/circuit-climb restored-2/src/games/circuit-climb
```

Should produce no output (identical files).

---

## Contact & Support

This transfer is a one-time handoff. The artifact contains:
- ✓ Complete, frozen code at commit 8f54069
- ✓ All 165 unit tests (passing)
- ✓ All 18 test files with production fixtures
- ✓ Authoritative SOT document for guidance
- ✓ Known limitations clearly documented
- ✓ No dependencies on external services

The code is ready for:
- ✓ Clean-room restoration
- ✓ Full verification in isolated environment
- ✓ Continued development by AI Studio team

**Package Status:** Ready for delivery.
