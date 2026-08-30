# Circuit Climb AI Studio Handoff
## Commit 8f54069 - Successor SOT Freeze

This directory contains the self-contained transfer artifact for restoring Circuit Climb into an AI Studio workspace.

---

## What You Have

### 1. **CIRCUIT_CLIMB_AI_STUDIO_RESTORE.py** (4.6 KB)
Python restore script. Self-contained, zero dependencies.

**Usage:**
```bash
python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE.py --payload circuit-climb-payload.b64 ./restored
```

### 2. **circuit-climb-payload.b64** (378 KB)
Base64-encoded tar.gz archive containing:
- Complete `src/` directory (Circuit Climb + all supporting services/types)
- Configuration files (package.json, tsconfig.json, vite.config.ts, etc.)
- All 18 test files with 165 passing tests

### 3. **CIRCUIT_CLIMB_AI_STUDIO_TRANSFER_MANIFEST.md** (9.5 KB)
Detailed manifest covering:
- File inventory & expected counts
- Verification checklist with exact commands
- Geometry authority (single source of truth)
- Learner routing contract
- Known limitations
- Troubleshooting guide

### 4. **src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md** (551 lines)
Authoritative source-of-truth document covering:
- Product design & acceptance criteria
- Architecture map & module responsibilities
- Geometry authority definition
- Learner routing contract  
- Lock suite (20 capability guarantees)
- Pursuer state machine
- Debugging guide
- Known limitations & next work

---

## Quick Start (5 minutes)

### Step 1: Restore
```bash
python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE.py --payload circuit-climb-payload.b64 ./cc-restored
cd cc-restored
```

**Expected output:**
```
✓ Decoded 232548 bytes
✓ Extracted to ./cc-restored
✓ [all 5 sentinel files verified]
RESTORATION COMPLETE
```

### Step 2: Verify
```bash
npm install
npm run lint          # Should: 0 errors
npx vitest run        # Should: 165/165 tests passing
```

### Step 3: Launch
```bash
npm run dev
# Open http://localhost:5173
# Circuit Climb should load with blue spark, numbered platforms
```

---

## Critical Concepts

### Geometry Authority
**File:** `src/games/circuit-climb/geometry/circuitClimbGeometry.ts`

Single source of truth for all layout dimensions:
- `logicalWidth: 600` – Drawing canvas width
- `platformWidth: 104` – Platform visual width
- `platformHeight: 62` – Platform visual height
- `playerRadius: 32` – Collision radius
- `rowGap: 205` – Vertical spacing
- `columns: [110, 300, 490]` – X positions

**Rule:** Never change geometry without re-verifying the full test suite.

### Learner Routing Contract
**Module:** `src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts`

Pure function: `planLearnerSelection(world, from, destinationPlatform) → LearnerSelectionResult`

**Guarantees:**
1. No side effects (read-only, no mutations)
2. Deterministic (same input = same output)
3. Routed platforms never exceed destination row
4. Zero-length routes rejected
5. Result contract always honored

### Pursuer States
- `SEARCH` – Sweeping side-to-side, climbing toward player
- `ALERT` – Locked on sighting, 1.2s pause
- `CHASE` – Full-speed pursuit
- `CAUGHT` – Terminal (end game)

---

## Testing

**Unit Tests:** 165 passing in 18 files
- Geometry, routing, pursuer behavior, game logic, rendering

**Capability Locks:** 20 tests in `circuitClimbLockedCapabilities.test.ts`
- These must NEVER weaken
- If a lock fails, fix the product

**Browser Matrix:** (external dependency, see manifest)
- 5 viewports: 320, 390, 430, 590, 768
- Validates at scale and responsive behavior

---

## Known Limitations

All documented in the SOT and manifest. None block product acceptance:

1. Pursuer geometry divergence off-default
2. Alive tuning provisional
3. Spark avoidance ~1 in 24
4. Pursuer update methods in closure
5. Browser checks need external Chromium
6. Pursuer fixture duplication in tests
7. NOT_CLOSING threshold margin narrow

---

## Next Development

### Onboarding Checklist
- [ ] Read SOT (CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md)
- [ ] Restore and verify all tests pass
- [ ] Launch dev server, play the game
- [ ] Skim geometry authority & routing contract
- [ ] Understand lock suite basics

### Development Rules
1. **Geometry changes:** Update geometry authority → re-verify locks
2. **Routing changes:** Maintain LearnerSelectionResult contract
3. **Test weakening:** Never. Fix product instead.
4. **Commits:** Small, testable, full suite green
5. **Refactoring:** Preserve behavior, re-verify locks

---

## Repository Context

- **Repo:** paulanerj/Mathforge-Platform-Circuit-Chaser
- **Branch:** claude/circuit-climb-forensic-audit-3s4oyh
- **Commit:** 8f54069 (HEAD when frozen)
- **Status:** Clean (no uncommitted changes at freeze)

---

## Support

This is a one-time handoff. The artifact is self-contained and verifiable in a clean-room environment.

**All you need is here:**
- ✓ Complete code (commit 8f54069)
- ✓ Full test suite (165 tests, all passing)
- ✓ Authoritative SOT guidance
- ✓ Known limitations documented
- ✓ Self-contained restore script

Ready to transfer to AI Studio.
