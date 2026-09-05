# Returning a winner to the product

Nothing in this sandbox is production authority. This is what it takes for a
candidate to be *considered*.

## What you must be able to hand over

1. **The configuration**, copied from `COPY CONFIG` — Brain id, perception model
   id, every parameter, and its behaviour hash.
2. **The learner run**, copied from `COPY RUN` — so the result can be reproduced
   exactly.
3. **The run export**, from `EXPORT RUN` — metrics, capture verdict, the full
   event timeline and every retained sample.
4. **The human ratings and notes.** These are the acceptance evidence. The
   metrics are supporting material.
5. **The A/B/C table** against the baseline on that same learner run.
6. **The source**, as a self-contained directory under
   `brain-experiments/candidates/`.

## What disqualifies a candidate immediately

- It used **P3 ORACLE**. Permanently, whatever it scored.
- It read anything off the observation that its perception model did not put
  there.
- It is **non-deterministic** — the same observations produce different
  decisions, so nothing about it can be reproduced.
- It **imports** the simulation, the learner, the board or the renderer.
- It only wins under a perception model that is not P0, without saying so.

## What a strong case looks like

- Beats the baseline on the same recorded learner run, under **P0**.
- Reaches `DELIBERATE_PURSUIT_CAPTURE` where the baseline reaches
  `LIKELY_SEARCH_COLLISION`.
- Zero `trueReversals` while the learner is visible and stationary.
- A human says it feels like a smart opponent, and the ratings back it.
- Its search, when it does lose the learner, has a hypothesis a person can read
  off the overlay.

## What happens next — and what does not

A winning candidate is **proposed**, not merged. Integration into Circuit Climb
is a separate PM-controlled phase with its own acceptance, exactly as the
04A → 04B → 04B-R1 sequence was. Expect the production integration to require:

- reproducing the candidate's behaviour inside production's own architecture;
- the configuration contract that already exists there (`pursuer-v2/config/`);
- a human acceptance run on the real surface;
- a decision about the **frame-counted confirmation windows**, which this
  sandbox deliberately does not reproduce — the lab runs on a fixed simulation
  timebase, and a candidate that behaves identically at 60, 120 and 144Hz here
  may not do so once it is inside production's render-coupled loop.

Do not open a pull request against production from this sandbox. Hand over the
six items above.
