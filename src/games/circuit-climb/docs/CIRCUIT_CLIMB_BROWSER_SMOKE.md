# Circuit Climb — browser smoke

## One command

```bash
npm run test:circuit-climb:browser
```

That is the whole thing. It starts its own dev server, finds a Chromium, drives
the real application, tears everything down, and exits non-zero if the accepted
runtime contract is broken. Takes about a minute.

---

## Why this exists

The vitest suite cannot reach the runtime hook. Every defect that has actually
shipped in this game was invisible to unit tests and obvious in a browser
within seconds:

- a **white screen** behind a completely green build,
- a board that **rendered perfectly and could not be clicked** above 100% world
  framing, where every destination returned `NO_LEGAL_ROUTE`.

Neither is reachable from a unit test, because neither is a logic bug. Unit
tests prove the geometry is right; this proves the game is *playable*.

---

## The two test layers

| | command | needs a browser | what it proves |
|---|---|---|---|
| **Unit** | `npm test` | no | geometry, learner routing, pursuer behaviour, the 21 capability locks |
| **Browser smoke** | `npm run test:circuit-climb:browser` | yes | the real app renders and can be played |

`npm test` is deliberately browser-free — nothing in the unit suite launches
Chromium, so it stays fast and runs anywhere. The browser layer is opt-in.

There is also a **fast single-scenario smoke**, kept from before this workflow
existed and still useful when iterating on one viewport:

```bash
npx vite --port=3000 &                    # it does NOT start a server itself
npm run test:circuit-climb:smoke          # VW=390 to change viewport
```

It covers the critical path at one viewport and the default framing. The
supported command above supersedes it for gating; this one is for a quick loop.

---

## What the supported command covers

**Viewport matrix** — 320, 390, 430, 590, 768 at default framing:
surface exists · renders and is not blank · a playable first move · no route
failures · no console errors.

**Framing matrix** — 80%, 100%, 120% at 430px:
renders and is not blank · actors on the board · LEFT, CENTER and RIGHT each
selectable · a correct destination resolves · a wrong destination shorts ·
Restart gives a clean playable run · Pause stops the world and Resume continues
· no route failures · no console errors.

The framing matrix is the guard on the world-framing repair. **If that repair is
reverted, the 120% block fails** with
`CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED {reason: NO_LEGAL_ROUTE}` — verified by
mutation, along with 80% and 100% continuing to pass.

Run one matrix on its own with `ONLY=framing` or `ONLY=viewport`.

---

## Prerequisites

`npm install` is enough if a Chromium is already on the machine.
`playwright-core` is a dev dependency; it ships **no browser of its own**.

The runner looks for a browser in this order:

1. `$CHROME`
2. `$PLAYWRIGHT_BROWSERS_PATH`, else `/opt/pw-browsers`
3. `/usr/bin/chromium`, `chromium-browser`, `google-chrome`, `google-chrome-stable`

If none is found it says so and tells you how to fix it. To install one:

```bash
npx playwright install chromium
```

---

## Options

| variable | effect |
|---|---|
| `CHROME=/path/to/chrome` | use a specific browser |
| `BASE_URL=http://…` | test a server you already run; none is spawned or killed |
| `PORT=3111` | port for the spawned dev server |
| `ONLY=framing` \| `viewport` | run a single matrix |

---

## Reading the output

```
── 120% world framing @ 430px ──
  PASS  renders, not blank             363 colours, 920 painted
  PASS  LEFT selectable                "5) + 5 = 10"
  ...
================================================================
BROWSER SMOKE PASS — 61/61 checks in 58.0s
================================================================
```

A failure names its scope, so `✗ [framing 120%] no route failures` tells you
which world broke without re-reading the log.

### "renders, not blank"

Not a page-load check. The canvas is read back pixel by pixel: a drawn board
carries hundreds of distinct colours, a blank one carries about one. This is
the check that catches the white screen — and note that **clicks keep working
while the screen is blank**, because hit-testing is independent of drawing. That
is exactly why the render assertion is its own separate check and not inferred
from a successful click.

### Diagnostics that are not failures

`CIRCUIT_CLIMB_PURSUER_NOT_CLOSING` and `CIRCUIT_CLIMB_PURSUER_STALLED` are
recorded and reported as notes, never fatal. `NOT_CLOSING` fires in normal play
when the learner climbs away from a pursuer that is legitimately behind — see
known limitation 7 in the successor SOT. `CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED`
**is** fatal: it must never appear in normal play.

A `404` for a missing favicon is ignored. Any other `console.error` or uncaught
exception fails the run.

---

## How clicks are aimed

From computed world coordinates, not pixel detection. With the camera settled
the active row sits at a fixed screen height, because the camera anchors on the
player and the active row is always exactly one `rowGap` above them. Reading the
row's underline back off the canvas was tried and fails at 320px, and again
whenever a platform shorts out and loses its underline.

The runner therefore mirrors `applyViewScale()` and `computeColumnCentres()`.
**If a framing formula changes in the product and not in the runner, the smoke
misses the row and goes red.** That is the correct outcome: a harness that has
drifted from the world it tests should not report success. If you change world
framing, update `worldAtFraming()` in `circuitClimbBrowserSmoke.mjs`.

Each click walks a small fixed set of offsets down the platform band and waits
for the runtime's own message to change, rather than sleeping a guessed
interval. The offsets are fixed, so a run replays identically.

---

## Troubleshooting

**"No Chromium found."** — Install one (`npx playwright install chromium`) or
point at your own with `CHROME=`. The message lists every path that was tried.

**Sandbox errors on launch** — the runner already passes `--no-sandbox` and
`--disable-dev-shm-usage`. In a container without those privileges, run against
a browser on the host and set `CHROME`.

**Everything renders blank in headless** — the runner passes
`--use-gl=swiftshader --enable-unsafe-swiftshader` so the canvas really paints.
If your Chromium build lacks SwiftShader, the render assertion will correctly
fail; use a full Chromium rather than a headless-shell build.

**"Dev server did not answer"** — something else holds the port. Set `PORT`, or
start your own server and set `BASE_URL`.

**A click "no reaction" at one framing only** — that is the shape of the
world-framing dead board. Check for `NO_LEGAL_ROUTE` in the output before
assuming the harness is at fault.

---

## Files

| file | role |
|---|---|
| `tools/circuitClimbBrowserSmoke.mjs` | the supported runner: scenarios, matrices, reporting |
| `tools/circuitClimbBrowserHarness.mjs` | plumbing: browser discovery, dev server, render assertion |
| `tools/circuitClimbSmoke.mjs` | the older fast single-viewport smoke, kept for quick loops |
