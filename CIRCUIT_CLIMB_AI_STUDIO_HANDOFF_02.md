# Circuit Climb — AI Studio Handoff 02

Read this first. It is short on purpose.

---

## You have two files

```
CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py
circuit-climb-successor-02-payload.b64
```

Save both **exactly as given**. Do not reformat, re-wrap, or edit the payload —
it is verified by SHA-256 and any change will be rejected as truncation.

You need nothing else. No GitHub. No network. No context from any previous
conversation.

---

## Procedure

```bash
# 1. Restore into a FRESH, EMPTY directory
python3 CIRCUIT_CLIMB_AI_STUDIO_RESTORE_02.py \
    --payload circuit-climb-successor-02-payload.b64 \
    ./circuit-climb-restored

# 2. Enter it
cd ./circuit-climb-restored

# 3-7. Validate
npm install
npm run lint
npm test
npm run build
npm run test:circuit-climb:browser

# 8. Look at it with your own eyes
npm run dev          # http://localhost:3000 -> Circuit Climb
```

### Exactly what to expect

| step | expected — stop if it differs |
|---|---|
| `npm run lint` | clean, exit 0 |
| `npm test` | **20 files · 206 tests · 206 passing · 0 failed · 0 skipped** |
| `npm run build` | success |
| `npm run test:circuit-climb:browser` | **BROWSER SMOKE PASS — 61/61** |
| `npm run dev` | blue spark, three numbered platforms per row, red pursuer, all three destinations clickable |

Capability locks: **21**, inside the 206.

**If any baseline differs, stop and report it. Do not proceed and do not repair
the workspace by hand.**

---

## Prohibited

- **Do not synthesise missing files.** If the restore reports a missing
  sentinel, the transfer failed. A file you write by hand is not the frozen
  product. Report it instead.
- **Do not reuse a previous Gemini workspace.** Restore into a new directory.
  The script refuses a non-empty target for this reason; do not pass `--force`
  to get around it.
- **Do not import earlier GEOMETRY-PARITY attempts.** Two of them were rejected
  and one was superseded. Whatever survives is already in this payload; anything
  outside it is a discarded draft.
- **Do not treat a successful build as acceptance.** A white screen has shipped
  behind a green build in this project. `npm run build` proves the code
  compiles. It proves nothing about whether the game is on screen or playable.
  Run the browser smoke.
- **Do not weaken a test to make it pass.** A capability lock going red means a
  working behaviour was lost. Fix the product.

---

## What you are receiving

A vertical maths climb. A blue spark rests on a platform; each row above offers
three numbered platforms and exactly one completes the equation. Tapping one
sends the spark along a blue right-angled route. A red pursuer climbs after it
and ends the run on contact.

The learner chooses **a destination, not a path**. All three destinations stay
selectable whenever the activity offers them; wrong ones stay selectable too and
carry a physical consequence. The pursuer may reorder candidate routes and may
never remove one.

### Two authorities, and the difference matters

| | |
|---|---|
| **Product / gameplay** | `c8838c30947c2a561bfc8322a6159e4f28fef61a` |
| **QA infrastructure** | `eac8d8337a30d22cd41f09b6d78f0e73474cb390` |

The QA commit added the browser-smoke workflow and changed **no gameplay
source**. Do not read it as a product change.

---

## Then read

`src/games/circuit-climb/docs/CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_02.md`

That is the authority: product contract, geometry, routing contract, pursuer
state machine, the lock suite, resolved and open limitations, and a ranked list
of next work. **Nothing on that roadmap is authorised** — it is there so you
understand the terrain, not so you start on it.

`CIRCUIT_CLIMB_SUCCESSOR_SOT_HANDOFF_01.md` is historical and marked superseded.
Do not use it to make decisions.

`src/games/circuit-climb/docs/CIRCUIT_CLIMB_BROWSER_SMOKE.md` explains the
browser workflow, including what to do when no Chromium is available.

---

## The one thing to internalise

Unit tests prove the geometry is right. They cannot prove the game is
*playable* — they cannot reach the runtime hook at all.

Every defect that has actually shipped in this project was invisible to the unit
suite and obvious in a browser within seconds: a white screen behind a fully
green build, and a board that rendered perfectly and could not be clicked above
100% world framing. Both now have permanent gates, verified by deliberately
reintroducing each defect and watching the gate go red.

So: `npm run test:circuit-climb:browser`, every time, before you believe
anything.
