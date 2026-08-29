# Circuit Climb — pursuer behaviour

The pursuer has two layers, and they are deliberately not the same thing.

**Physics is fixed.** Corridors, collision, actor clearance, the capture distance,
the platform it may approach over. None of it is tunable, all of it is locked by
`circuitClimbLockedCapabilities.test.ts`.

**Behaviour is tunable.** What it believes about the player, how fast it moves in
each belief, how it hunts when it has lost you. Every number lives in one struct
in `circuitClimbPursuerTuning.ts` and every one is a slider in the gear panel.

## States

```
SEARCH ──sensed──> ALERT ──hesitation elapsed──> CHASE ──contact──> CAUGHT
   ^                  |                            |
   └──────────lost the trail─────────────────────-─┘
```

| State | What it means | How it looks | How it moves |
|---|---|---|---|
| `SEARCH` | It does not know where you are. It works from the last sighting. | Dim, slow breathing pulse, a sensor arc sweeping across its guess | `searchSpeed`, sweeping side to side, always climbing |
| `ALERT` | It has just sensed you and is orienting. | Snaps bright, fast flicker | Nearly stationary — 18% speed for `alertDwellMs` |
| `CHASE` | Locked on. It knows exactly where you are. | Hot, hard fast pulse | `chaseSpeed`, straight at you through legal geometry |
| `CAUGHT` | Contact. | Capture burst | Stopped |

**Losing the trail.** With `reacquireOnPlayerMove` on, a spark in transit breaks
the lock: the moment you commit to a platform and start travelling, the pursuer
drops to SEARCH and works from where it last had eyes on you. Answering and moving
is what shakes it off. Standing still is what gets you caught.

## What makes it read as alive

Four things, each independently tunable, none of them randomness:

1. **Imperfect knowledge.** It only sees you inside `senseRadius` and loses you past
   `loseRadius`. Outside that it is guessing.
2. **A sweep.** While searching it commits to a side and travels that way for half
   of `wanderPeriodMs`, then reverses — a patrol, at its own speed, not a jitter.
3. **Surging speed.** `speedJitter` makes it press and ease rather than glide at
   one rate.
4. **A hesitation.** `alertDwellMs` is the beat between noticing and committing.
   It is what makes the lock-on readable instead of instantaneous.

Everything is driven from elapsed time through two out-of-phase sines, so a run
replays identically and the behaviour is testable. There is no `Math.random` in
the pursuer.

## Two things that are navigation, not expression

Both were found by the step trace, and both are the difference between a pursuer
that hunts and one that vibrates in place.

**The corridor is latched.** Once it commits to threading a row, it holds that
corridor for the whole transit. Re-deciding every frame let a moving target drag
it back and forth across the middle of the row: it never travelled far enough to
reach any corridor, and never got through.

**The sweep never chooses the corridor.** Navigation uses the unswept target. A
corridor choice that flips with the sweep is a choice it can never act on.

**`climbReserve`** holds back a share of each frame's budget from sideways motion.
Without it, a sweep wider or quicker than the actor can follow eats the whole
frame and the pursuer stops climbing entirely.

## Presets

| Preset | What it is |
|---|---|
| `alive` | The living pursuer. Provisional numbers — the sliders exist to argue with them. |
| `baseline` | **PURSUER BASELINE 01, frozen at commit `0eff8f8`.** Sensing off, no hesitation, no sweep, constant speed: a pursuer that has always seen you. Reproduces the locked behaviour exactly. |

`createPursuer` defaults to `baseline`, so anything that does not explicitly ask
for a living pursuer — the whole capability lock suite included — keeps testing
the frozen behaviour.

Selecting **Locked baseline** in the gear panel switches live, with no rebuild.
That is the escape hatch: a tuning experiment can always be abandoned.

## The sliders

| Slider | Range | What it changes |
|---|---|---|
| Search speed | 0.01–0.3 u/ms | Pace while hunting |
| Chase speed | 0.01–0.4 u/ms | Pace once locked on |
| Sense radius | 60–900 u | How close you must get before it sees you |
| Lose-lock radius | 80–1200 u | How far you must get to shake it |
| Alert hesitation | 0–1200 ms | The beat between noticing and committing |
| Search sweep | 0–260 u | How wide it hunts either side of its guess |
| Sweep period | 300–4000 ms | How often it reverses |
| Speed jitter | 0–1 | How much it surges and eases |
| Climb reserve | 0–0.9 | Share of each frame held back for climbing |

Moving any slider switches the preset to Alive. Values persist in `localStorage`
and are clamped on load, so a stored value from an older range cannot produce an
illegal pursuer. `loseRadius` is always forced above `senseRadius`: a lock that
can never be lost is a lock that can never be regained.

## Where difficulty goes later

The tuning struct is the seam. A difficulty setting, or an adaptive one driven by
how the learner is performing, sets these numbers — it does not touch pursuer
code. Relaxed is a slower chase and a shorter sense radius; pressure is a faster
chase, a wider sense radius and a shorter hesitation.

---

# Spark route avoidance

The learner picks a *destination*, not a path. The route generator then flies the
spark along a stepped route it had no say in. When the bot happened to be sitting
on that route, the spark flew into it — a loss with no available counterplay,
which is what made the spark look stupid.

## The rule that matters

**The pursuer never enters `isPathClear`.**

Routes are built and validated by collision exactly as before. The pursuer is
handed the list of already-approved routes and may only **reorder** it. It cannot
reject one, and it cannot empty the list.

This is not fussiness. Route rejection is what made every platform unclickable in
SOT 20: every candidate refused, `buildCircuitPath` returned null, and
`selectPlatform` bailed in silence. A pursuer with veto power over routes could
reproduce that exactly by standing in the wrong place. `chooseRouteAgainstThreat`
is a pure ranking function over routes someone else already approved, and
`circuitClimbSparkAvoidance.test.ts` locks that: whatever the threat and whatever
the avoidance weight, it always returns a candidate that was offered.

## How a route is scored

Natural preference and exposure are both normalised to 0..1 and blended, so
`avoidance` reads as the balance between them:

```
rank     = index / (candidates - 1)          // natural preference, 0..1
exposure = max(0, 1 - clearance / radius)    // 0 clear, 1 straight through
score    = rank * (1 - avoidance) + exposure * avoidance * 2 + rank * 1e-3
```

Exposure carries double weight so that at avoidance 0.5 a route running straight
through the bot still loses to a clear detour. The trailing rank term breaks ties
in favour of the natural route. At avoidance 0 the score is the rank, which is
the original "first clear route wins" ordering exactly.

Two things this had to get right, both found by measurement rather than reading:

- **Raw list position cannot be the rank term.** A rank gap of 1 buried an
  exposure of 0.26, so a route passing 83 units from the bot kept winning against
  a clean alternative 163 away.
- **Clearance ignores the opening leg** (`skipDistance`). Every candidate leaves
  the same platform, so when the bot is near the actor — exactly when it is
  dangerous — the shared opening dominates the measurement and every candidate
  scores identically. Nothing ever diverted until this was fixed.

## What it is worth, measured

Over 24 routes of real play with the bot active:

| | routes | opportunities | diverted | clearance gained |
|---|--:|--:|--:|--:|
| avoidance 0 | 34 | 0 | 0 | — |
| avoidance 1 | 24 | 1 | 1 | 69 → 209 |

It fires correctly when it can. **It can rarely help.** All candidate routes share
a start and a destination platform, and when the bot is dangerous it is usually
near one of those — which every candidate passes through regardless. Corridor
choice only helps when the bot is parked mid-row, off to one side.

So avoidance is worth having — it is cheap, safe, and free when idle — but it is
not on its own an answer to "the spark flew into the bot".

## Shielded transit

The setting that does answer it. When **Shield spark in transit** is on, a spark
already travelling cannot be taken; only a landed one can.

It reframes the loss condition around something the learner controls. Hesitating
over the arithmetic is what gets you caught; the flight itself is not a dice roll
on where the bot happened to drift. `player.capturable` is the only thing it
changes — the pursuer still closes, still navigates, still behaves identically in
every other respect.

Off by default, because it changes the game's contract and that is the owner's
call, not a default to slip in.
