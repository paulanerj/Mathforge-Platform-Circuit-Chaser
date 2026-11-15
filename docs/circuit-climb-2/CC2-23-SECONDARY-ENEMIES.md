# CC2-23 — Secondary Enemy Ecosystem: Scout and Sentry

**State:** Experimental, isolated, owner acceptance pending.  
**Base:** CC2-22 owner-playtested commit `ab40fe048d459d270c68e361be659f578b1a723b`  
**Branch:** `feature/cc2-23-secondary-enemy-ecosystem`  
**Production default:** Additional enemies **OFF**.  
**Affected gameplay paths:** Opt-in live Scout/Sentry support encounters ONLY.

## 1. Product design

The original red/magenta Pursuer remains the only organism capable of
physically capturing and swallowing the blue Spark. Its accepted pathfinder,
sensing, contact adjudication, capture animation, normal music and summary
remain intact.

**Scout** is a smaller, mobile amber triangular recon drone. It patrols
laterally relative to PUBLIC row progression, investigates Spark only within
bounded proximity or actual clear line of sight, and telegraphs a warning.

**Sentry** is a larger violet diamond observer. It holds a deterministic
forward-scanning cone with a restricted field of view. It cannot see Spark
behind its cone or through an occluding platform.

Each enemy is a ***supporting threat***, not an instant-kill collider. Once it
has actually observed Spark, it displays a 40-tick warning. A warning may be
cancelled if the line of sight is lost. After a completed warning it can
briefly raise the main Pursuer's speed by 10% for at most 88 ticks. That
effect only applies when the main Pursuer independently has a legitimate
live sense and is already in PURSUIT. No enemy directly captures, reveals
hidden routes, grades mathematics or changes correct answers. Two alerts do
not stack into a 20% buff.

This constrained first pass deliberately avoids the earlier CC2 failure
pattern where adding enemies or AI adjustments made the primary bot's route
unreliable or caused unfair catches.

## 2. Actual selectable modes

- `?cc223=off` or no parameter: exact accepted CC2-22 behavior; no second
  enemy object, no new replay field, no secondary-engine tick.
- `?cc223=scout`: Scout at earned public progress threshold (four rows).
- `?cc223=sentry`: Sentry at eight rows.
- `?cc223=both`: both by public progression threshold.
- Add `&cc223Demo=1` to any enabled mode to make that mode visible at
  the beginning of an **actual playable run**. This developer-only fast-start
  cannot become a default production mode.

Developer Settings > **CC2-23 Secondary enemy experiments** offers direct
mode changes; switching modes intentionally starts a fresh game and resets
replay, detection receipts and entity state.

The browser adds a transparent, pointer-inert source-projected presentation
layer inside the accepted original game board. It does not capture touch
events, change math buttons, or obscure the source's rules.

## 3. Strict ownership

```text
CC2 original arithmetic, route and Spark engine
  | real observed world, Spark, tick -- sensor producer only
  v
CC2-23 SecondaryEnemyDirector
  | fresh NEAR or occlusion-checked SIGHT signal
  | public completed-row and current simulation tick
  v
Scout / Sentry (warning, cooldown, finite signal)
  | source-owned 1.00–1.10 advisory pressure
  v
CC2 original Pursuer step()
  | accepts boost only when independently sensing and pursuing
  v
CC2 original physical contact / math / run-summary authority
```

The secondary director never sees correctPlatformId, math operands,
future path, selected answer or route. Both external entities are fully
deterministic and use no wall-clock, timers, remote state, Math.random or
unsourced gameplay data. The new secondary event log is versioned, bounded
and independent of the trusted mathematics and achievement ledger.

### Fairness limits
- 40-tick warning before support pressure; never immediate acceleration.
- Hard ceiling of 12% regardless of simultaneous alerts (default 10%).
- Original main bot finite sensing always required; signal does not
  transfer a hidden Spark position to its brain.
- No direct capture, collision attack, stun or teleport from secondary.
- No secondary enemies in Practice; no active effects after terminal events.
- No second-enemy state carried into a restarted run.
- No secondary paths or collision geometry inserted into the math routing
  network; all valid equations and platform routes remain unchanged.
- Replay exports include the optional secondary config **only when enabled**.
  Old CC2-22 replays and state digests remain byte-equivalent in OFF mode.

## 4. SOT and unapproved future behaviors

CC2-22 accepted remains at
`baseline/cc2-22-owner-accepted-2026-11-15`.
The frozen CC2-VIS-21 material baseline remains at its earlier pinned commit.

CC2-23 is only a limited ecosystem pilot. Full damage/rescue, strategic
decoys, player upgrades, destructible Sentry, additional enemy mutations,
level scaling and campaign difficulty remain separate future decisions,
not slipped into this prototype.

## 5. Acceptance matrix

1. Exact no-enemy-off baseline snapshots/replay, matched deterministic seeds.
2. Real Scout/Sentry source tick, distinct movement, telegraph and SIGHT.
3. Line-of-sight cancellation, no remote Spark knowledge; bounded boost
   without stacking and only when primary Pursuer senses Spark.
4. Real browser play with correct platform, actual movement and row landing.
5. All three mathematical modes, wrong-answer ledger, existing abilities,
   progress milestones, result and equation review unchanged.
6. Practice mode, paused runs, terminal events and multi-run reset safe.
7. Original CC2-20 pursuit/capture and CC2-VIS-21 geometry screens pass.
8. Phone widths, tablet and desktop, no UI overflow or lost pointers.
9. Portable offline self-contained HTML with all source modules bundled.
10. Owner feedback on playability, aesthetics, threat differentiation and
    fun before any merge or progression defaults change.

**Do not merge, deploy to production, mark visuals accepted, or advance to
CC2-24 without explicit owner review.**
