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
