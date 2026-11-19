# CC2-46 — Source-Verified Liquid-Crystal Platform Conduction

**MathForge Circuit Climb 2.0 · November 19, 2026**

Parent: `preservation/cc2-45-owner-accepted-20261119` (owner-approved source commit `0a905c57e0f46c8165f036dd5e334731ed05a9ab`).

Development: `feature/cc2-46-source-plasma-conduction-20261119` (candidate, not merged).

## Owner-accepted CC2-45 invariants — immutable during this phase

- Same substantial 46 CSS-pixel mineral platform body and responsive width for all current and pre-numbered future platforms; no oversized answer cards.
- Three source-authentic future rows carry actual math option numbers in advance. No invented values, no correct-answer hints on future rows, and only current problem buttons are clickable.
- Claimed platform no longer shows its old printed value. Spark is the only current carried number.
- Three rows above, one below, and live row-distance 80–140px slider from CC2-44 (no camera auto-zoom cancellation).
- Existing opaque answer fallback when Heritage Canvas context is lost.
- No changes to arithmetic, run score, Pursuer sensors, live source row gap, travel planner, replay or accepted audio.

## CC2-46 material identity

**Unpowered:** accepted CC2-45 white ceramic/mineral geometry. Math values readable.

**Claimed/powered:** exactly the SAME rectangular volume, now internally energized. Luminous refracted core (white-hot/cyan), a few low-frequency liquid crystal conductive ribbons, transparent center, controlled outer halo. The original extra green point/squiggle is suppressed *only* in CC2-46 so it cannot compete visually with Spark's value. No unnecessary floating particles or opaque overlay, no resizing or visual cardinality changes.

**Connected trails:** a real user selection captures a detached read-only copy of the source core's accepted outbound `travel.points` and attempt ID **at the selection boundary**, not when a render frame happens to observe Spark traveling. At `LANDING_CONFIRMED` with `correct===true`, the visible painter must also verify a matching authoritative `state.solved.attemptId` and source platform ID before it can create the conductor. This survives a journey that completes between frames on low-FPS devices or in a deterministic QA jump. Paths paint behind platform bodies with a restrained 3-stroke crystalline ribbon and slow optional white electrical glints. No invented straight-line connection, wrong attempt, future prediction, or merely touched selection becomes a conductor.

**Animation:** phase comes from source `state.tick`, so Pause freezes energy flow; ambient visual frame rate does not become game authority. `prefers-reduced-motion: reduce` freezes glints without disabling clarity.

**Developer controls** (Settings > Developer tools > Developer Laboratory): Inner plasma energy 0–100 default 78, Crystal flow motion 0–100 default 44, Connected path brightness 0–100 default 72; reset to defaults. Visual-only, no run recreation or math changes. All of these are hidden when opt-out `?cc246=0`.

**Isolation:** `cc246=1` is the default only for the experimental standalone `/cc2-30.html` preview from this branch. `?cc246=0` makes the accepted CC2-45 painter run untouched (except inert script/invisible developer markup). Historical game URLs remain exact; no accepted production branch merged.

## Package authority

The new presentation source is `src/games/circuit-climb-2/devtools/cc2-46-plasma-conductor.js`. The existing `buildPortable16A.mjs` inlines it before the visible `cc209b-heritage-adapter` so the game continues to operate as a single HTML, with no external resources or CDNs.

The Heritage adapter (not the hidden `worldCanvas`) hosts the actual plasma, and read-only `window.__CC2_09B__.summary().plasma` exposes settings and source-verified connection counts for screenshot tests. The renderer remains the only presentation authority; no new buttons/overlay cover source choices.

## QA and release gates

Run from repository root:

```bash
npm ci
npm run lint
npx vitest run src/games/circuit-climb-2/tests/futureNumberedRows45.test.ts src/games/circuit-climb-2/tests/threeUpOneDownSpacing44.test.ts src/games/circuit-climb-2/tests/coreTransactions.test.ts
npm run build
node src/games/circuit-climb-2/devtools/cc2-46-plasma-browser.mjs
node src/games/circuit-climb-2/devtools/cc2-45-unified-platforms-browser.mjs
node src/games/circuit-climb-2/devtools/cc2-44-three-one-browser.mjs
```

The browser gate inspects the packed game at phone 320/390/428 and tablet/desktop 768/988. It enters gameplay, inspects the visible canvas and source ledger before and after a mathematically correct landing, tunes slider through real Settings, compares state digests, and checks reduced-motion freeze and CC2-45 opt-out. Save screenshots from `cc2-46-evidence`.

Before claiming success verify the newest GitHub Actions run conclusion and deployment SHA. A Vercel READY response does not independently establish HTTP accessibility on the user's mobile browser. Do not advertise a preview from an untested early commit as finished.

## Next independent phases

- **CC2-47**: deterministic authored side-biased, aligned, zig-zag patterns, preserving safe phone edges and source solvability.
- **CC2-48**: authentic two-choice five-row mathematics section with explicit education and pacing rules.
- **CC2-QA**: prolonged phone/tablet performance, no white canvas, real sound and rendering acceptance.

## Final candidate gate (source code commit `72b3c0a1a9d45fbbb738bef9e1888b18334789d1`)

CI: https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44547887938 — **success**.

- 21 TypeScript/mathematical source tests passed.
- 47 new CC2-46 packaged-browser assertions passed: five viewport widths, developer energy/flow/trail controls, reset, correct source-issued path after landing, reduced-motion, explicit CC2-45 opt-out and no score/tick/replay mutations by visual controls.
- 46 CC2-45 visible-platform regression assertions passed.
- 56 CC2-44 camera/slider regression assertions passed.
- Screenshot artifact: https://github.com/paulanerj/Mathforge-Platform-Circuit-Chaser/actions/runs/44547887938/artifacts/14541223398
- Vercel Git-source deployment `dpl_DiPrgXciSpUbbhtxFAyxEWhkGrGA`, source commit `72b3c0a`, READY at https://mathforge-circuit-climb-cc2-preview-hr3fhopsx.vercel.app/cc2-30.html . External public page access could not be independently verified. Owner mobile acceptance pending.
