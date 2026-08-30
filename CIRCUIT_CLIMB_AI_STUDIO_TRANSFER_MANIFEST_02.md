# Circuit Climb — AI Studio Transfer Manifest 02

Successor SOT-02 freeze. Supersedes `CIRCUIT_CLIMB_AI_STUDIO_TRANSFER_MANIFEST.md`.

---

## 1. Identity

| | |
|---|---|
| Repository | `paulanerj/Mathforge-Platform-Circuit-Chaser` |
| Branch | `claude/circuit-climb-forensic-audit-3s4oyh` |
| Successor ref | `circuit-climb-successor-sot-02` |
| **Accepted PRODUCT SHA** | `c8838c30947c2a561bfc8322a6159e4f28fef61a` |
| **Accepted QA-infrastructure SHA** | `eac8d8337a30d22cd41f09b6d78f0e73474cb390` |
| **Final transfer / SOT-02 SHA** | see the repository log; this manifest is part of that commit |

**The product authority is `c8838c3`.** The QA commit `eac8d83` added the
supported browser-smoke workflow and changed no gameplay source — provable with:

```bash
git diff --name-only c8838c3 eac8d83 -- \
  src/games/circuit-climb/geometry src/games/circuit-climb/runtime \
  src/games/circuit-climb/pursuer src/games/circuit-climb/tests \
  src/games/circuit-climb/CircuitClimbSurface.tsx
# empty
```

Do not read the browser tooling as a gameplay change.

---

## 2. The package

Two files. Nothing else is needed — no GitHub, no network, no knowledge of the
conversation that produced the code.

| file | SHA-256 | bytes |
|---|---|---|
| `CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py` | `39b6df4f513f82b543b3033a93f5b658a1eafac72b46ef83fc9731102bb9d2ac` | 8,601 |
| `circuit-climb-successor-02-payload.b64` | `3ba6dd6d6660afa4c1d6efaac0f9866e0789e07c635a6ce2e8bba3e067fa85be` | 430,420 |

The restore script's own SHA-256 is recorded before its shebang line is
executed; recompute with `sha256sum` and compare if you want to verify it.

### Inner archive

| | |
|---|---|
| `payload.tar.gz` SHA-256 | `600448477583696901c9ee0c969c5e0ba304facf7e8ff2d40bf36c5f2aac92f9` |
| compressed bytes | 322,815 |
| restored bytes | 1,247,006 |
| **restored file count** | **195** |

The base64 SHA-256 above is of the file's stripped text, which is what the
restore script hashes; for this payload the whole-file and stripped-text digests
are identical.

---

## 3. Contents

| group | count |
|---|---|
| files total | 195 |
| `.ts` / `.tsx` under `src/` | 152 |
| test files | 20 |
| Circuit Climb test files | 18 |
| Circuit Climb files total | 46 |
| Circuit Climb docs | 13 |

Includes the complete accepted source, every test, all supporting
services/types, `package.json`, `package-lock.json`, `tsconfig.json`,
`vite.config.ts`, `index.html`, `metadata.json`, the browser-smoke
infrastructure, `CIRCUIT_CLIMB_BROWSER_SMOKE.md`, and SOT-02.

**QA tooling is included deliberately.** It is not production runtime code, but
the transfer is not usable without it: the browser smoke is the only thing that
catches the two defect classes that have actually shipped in this project.

The superseded first-generation transfer artifacts (`..._RESTORE.py`,
`circuit-climb-payload.b64`, `..._MANIFEST.md`, `..._HANDOFF.md`) are **excluded**
from the payload — SOT-02 replaces them, and shipping both invites restoring the
wrong one.

---

## 4. Restore

```bash
python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py \
    --payload circuit-climb-successor-02-payload.b64 \
    ./circuit-climb-restored
cd ./circuit-climb-restored
```

The script:

- **refuses a non-empty target** — merging into an existing workspace is how a
  stale file survives a transfer unnoticed,
- **verifies both SHA-256 digests** before extracting, and says plainly that a
  mismatch means truncation,
- **rejects unsafe members** — absolute paths, `..` traversal, symlinks, hard
  links, special files,
- **fails on a corrupt archive** rather than extracting a partial tree,
- **checks the file count and every sentinel** after extraction,
- **never synthesises a missing file.**

### Sentinels

```
package.json
package-lock.json
tsconfig.json
vite.config.ts
index.html
src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md
src/games/circuit-climb/docs/CIRCUIT_CLIMB_BROWSER_SMOKE.md
src/games/circuit-climb/geometry/circuitClimbGeometry.ts
src/games/circuit-climb/runtime/circuitClimbLearnerRouting.ts
src/games/circuit-climb/runtime/circuitClimbRuntimeRules.ts
src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts
src/games/circuit-climb/pursuer/circuitClimbPursuer.ts
src/games/circuit-climb/pursuer/circuitClimbPursuerTuning.ts
src/games/circuit-climb/pursuer/circuitClimbPursuerTrace.ts
src/games/circuit-climb/tests/circuitClimbLockedCapabilities.test.ts
src/games/circuit-climb/tests/circuitClimbWorldFraming.test.ts
src/games/circuit-climb/tools/circuitClimbSmoke.mjs
src/games/circuit-climb/tools/circuitClimbBrowserSmoke.mjs
src/games/circuit-climb/tools/circuitClimbBrowserHarness.mjs
```

---

## 5. Validation — every number below was observed, not predicted

Run in the restored directory:

| step | command | expected |
|---|---|---|
| 1 | `npm install` | no errors |
| 2 | `npm run lint` | clean, exit 0 |
| 3 | `npm test` | **20 files · 206 tests · 206 passing · 0 failed · 0 skipped** |
| 4 | `npm run build` | success |
| 5 | `npm run test:circuit-climb:browser` | **BROWSER SMOKE PASS — 61/61** |
| 6 | `npm run dev` | the game visibly plays at `http://localhost:3000` |

Capability locks: **21**.

**Clean-room result on this exact payload:** restored into a new empty
directory from the two files alone — lint clean, 20 files / 206 tests / 206
passing, 21 locks, build clean, **browser smoke 61/61 in 59.8s**.

### Critical-file byte parity, repository vs restored

All ten verified **IDENTICAL**:

```
circuitClimbGeometry.ts              f39ad71281294552…
circuitClimbLearnerRouting.ts        2fb88e42a206aed9…
circuitClimbRuntimeRules.ts          7205da332539773e…
useCircuitClimbPrototypeRuntime.ts   14c7ccea714e8938…
circuitClimbPursuer.ts               33858f9d5d12f42f…
circuitClimbPursuerTuning.ts         4ae12a3bc39fe1a9…
circuitClimbPursuerTrace.ts          42eb5fbe81379c8e…
CircuitClimbSurface.tsx              2cb9f90f440873ed…
circuitClimbBrowserSmoke.mjs         1094b7ff98de1ce9…
circuitClimbBrowserHarness.mjs       b63aa8f07464c1fd…
```

A full `diff -r` of the staged payload against the restored tree reports no
differences.

---

## 6. Browser prerequisite

`playwright-core` is a pinned dev dependency and **ships no browser**. The
harness searches `$CHROME`, then `$PLAYWRIGHT_BROWSERS_PATH` (else
`/opt/pw-browsers`), then the usual system paths, and prints how to fix it when
there is none:

```bash
npx playwright install chromium
# or
CHROME=/path/to/chrome npm run test:circuit-climb:browser
```

`npm test` needs no browser and stays fast.

---

## 7. Known limitations carried into the transfer

Open, documented, none blocking: provisional alive-pursuer tuning; weakly
exercised spark avoidance; `arrive`/`updateTravel`/drawing still inside the
runtime closure; the browser smoke needs an available Chromium; historical
pursuer fixture duplication; the `NOT_CLOSING` threshold sitting close to one
row gap.

Resolved and not to be re-opened: pursuer/runtime geometry divergence
off-default; stale live pursuer radius after a scale change; the learner dead
board above 100% world framing; manual-only browser acceptance.

Full detail in SOT-02, §G and §H.

---

## 8. Troubleshooting

**Payload SHA-256 mismatch** — it was truncated in transit. Re-copy the whole
file; do not edit it.

**"target is not empty"** — restore into a genuinely new directory. Do not pass
`--force` to work around it.

**A sentinel is missing** — the transfer failed. Do not create the file by hand:
a synthesised file is not the frozen product.

**Browser smoke cannot find Chromium** — see §6. The error lists every path
tried.

**Everything renders blank in headless** — the runner already passes
`--use-gl=swiftshader`. Use a full Chromium rather than a headless-shell build.

**`npm test` passes but the game looks wrong** — that is expected and is exactly
why the browser layer exists. A white screen has shipped behind a green build in
this project. Build success is not acceptance.
