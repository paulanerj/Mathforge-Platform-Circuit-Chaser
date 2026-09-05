# Running an experiment properly

## The short version

1. Pick a Brain and a perception model.
2. Record a learner run, or pick a script.
3. Replay it against every candidate.
4. Read the metrics **and** play it yourself.
5. Write down what it felt like, in the ratings panel, before you look at the
   numbers again.

## The long version

### Start from the baseline

`A · GRAPH V2 BASELINE` under `P0 · PRODUCTION` is what a human has actually
played and reported on. Every claim is relative to it. If your candidate is only
better under P1 or P2, you have learned something about the perception model.

### Make the learner the same every time

A human cannot play the same run twice. Either use one of the nine scripts, or
play once and press `RECORD MY RUN` — then every candidate faces an identical
Spark, doing identical things at identical times.

This is not a nicety. Without it, "B felt better than A" is a statement about
two different games.

### Use the oracle to split the question

Before tuning anything, run your candidate under `P3 · ORACLE`.

- **Still looks stupid?** The problem is navigation, locomotion or route
  selection. Tuning perception will not fix it.
- **Suddenly excellent?** The problem is the information and belief model, and
  the chassis is fine.

The baseline's answer, measured in this sandbox: under the oracle the shipped
chassis reaches `DELIBERATE_PURSUIT_CAPTURE` on scripts where it otherwise
scores `LIKELY_SEARCH_COLLISION`. **The chassis can hunt. It is the knowing that
fails.** Start there.

### Read the right numbers

| Question | Metric |
|---|---|
| Does it commit when it can see a still learner? | `visibleStationary.directPursuitMs / totalMs` |
| How long before it commits? | `visibleStationary.timeToCommitMs` |
| Does it actually close? | `visibleStationary.graphDistanceClosedFraction` |
| Does it turn the wrong way? | `trueReversals` (NOT `expectedDetours`) |
| Is it dithering? | `strategicReplans`, `modeChanges` |
| Did it hunt or bump into you? | the capture verdict |

**Progress is measured in legal graph distance, never straight-line.** The board
is corridors; a route that opens the Euclidean gap while closing the legal one
is doing exactly the right thing. `expectedDetours` counts turns that kept
closing; `trueReversals` counts turns that lost legal ground. Only the second is
a candidate for the human's "goes in the opposite direction" complaint.

**Cadence pauses are not failures to close.** The pursuer pauses 62% of finished
bursts by design. Pauses are reported separately (`pausedVisible`) and excluded
from `awayVisible` and from the capture classifier.

### Do not optimise for capture

A dumb enemy eventually collides with the player. `F12` and the capture verdict
exist because a capture on its own proves nothing. What is wanted is a pursuit
that reads as intentional, informed, persistent, responsive, threatening, fair
and — after inspection — understandable.

The target reaction is *"it found me"*, not *"it eventually wandered into me."*

### Watch it, then read the numbers

Turn on `SHOW WHAT THE BOT KNOWS`. When it does something stupid, press `space`,
drag the review slider back to that moment, and read `MODE`, `WHY`, `TARGET`,
`ROUTE`. That answers "why did it turn away?" in about ten seconds.

Then fill in the ratings. They are bound to the exact Brain, perception model,
configuration hash and learner run, exported with the evidence, and **never
interpreted by any code** — nothing scores, averages or thresholds them.

### The twelve fixtures

`npm run fixtures [brainId] [perceptionId]` runs all twelve headlessly. They
report rather than judge wherever a threshold would have to be invented.

## Research directions worth trying

Not implemented here — that is the point of the empty slot.

- behaviour tree; utility AI; finite-state hunter
- probabilistic belief over graph nodes; particle filter; Bayesian evidence fusion
- confidence-weighted trail tracking; recency-weighted evidence field
- systematic expanding search with memory of what has been cleared
- route-intersection reasoning: where do the learner's legal routes cross mine?
- legitimate historical-motion prediction (from perceived samples only)

A good first brief, given what the oracle diagnostic says: **"the chassis can
hunt; make it know where to hunt."**
