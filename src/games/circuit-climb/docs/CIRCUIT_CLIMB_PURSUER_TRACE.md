# Circuit Climb — pursuer step trace

A per-frame record of every decision the pursuer actually makes, built to answer
one question when it misbehaves: **which link in the chain stopped producing
movement, and why?**

Nothing in the trace is synthesised and nothing in it influences pursuer
behaviour. Every field is read from the decision the pursuer took on that frame.

## Turning it on

In the browser console, before or during play:

```js
localStorage.setItem('circuitClimbPursuerTrace', '1');   // then reload
localStorage.removeItem('circuitClimbPursuerTrace');     // off again
```

Verbose per-frame logging is **off by default**. The stall detector below is
always active, because a jammed pursuer should never be silent.

## Reading a step

```
f885 | DIRECT | pos(202.3,-192.6)->(202.3,-192.6) | player(110.0,-192.6)
     | row y=-328.0 band[-368.0,-232.3] | mustCross=false | targetX=110.0
     | dx a=-1.3 BLOCKED | dy a=0.0 | STALLED:HORIZONTAL_BLOCKED
```

| Field | Meaning |
|---|---|
| `f885` | frame counter since the pursuer was created |
| `DIRECT` / `CORRIDOR` / `NO_ROW` | whether it is driving straight at the player, routing through a corridor, or has no row above it |
| `pos(a)->(b)` | position before and after this frame |
| `player(x,y)` | where the player was when the decision was made |
| `row y=` | world y of the row it considers its next obstacle |
| `band[top,bottom]` | that row's **actor-inflated** collision band |
| `mustCross` | whether it decided it has to route around that row |
| `targetX` | the x it is steering toward — a corridor centre, or the player |
| `dx a=` / `dy a=` | distance attempted on each axis, and whether collision rejected it |
| `STALLED:<reason>` | the frame produced no movement at all, and why |

The band is the single most useful field. A pursuer pressed against `band.bottom`
with `mustCross=false` is the signature of a navigation gate that has misjudged
the obstacle.

## Stall reasons

| Reason | Meaning |
|---|---|
| `NO_BUDGET` | zero movement budget this frame |
| `VERTICAL_BLOCKED` | wanted to climb, collision refused |
| `HORIZONTAL_BLOCKED` | wanted to move sideways, collision refused |
| `HORIZONTAL_BLOCKED_CONSUMED_BUDGET` | sideways move failed after the budget was spent |
| `ALREADY_AT_TARGET_AND_PLAYER_LEVEL` | nothing left to do — already where it wants to be |
| `NO_VERTICAL_INTENT` | no climb was requested |

## Jam versus hold

After 45 consecutive motionless frames (about 0.75s) the tracer raises a report.
The runtime then classifies it:

- **`CIRCUIT_CLIMB_PURSUER_STALLED`** (`console.warn`) — motionless *and* more
  than one row away from the player. This is a real break in the navigation
  chain and should be investigated.
- **`CIRCUIT_CLIMB_PURSUER_HOLDING`** (verbose only) — motionless but pressed up
  against the platform the player is standing on. The pursuer has closed as far
  as the geometry allows and resumes the instant the player moves. Not a defect.

Both reports carry the full last step, the chosen corridors, the collision band,
and `distanceToPlayer`.

## Programmatic access

The runtime keeps a bounded ring buffer (900 frames) regardless of the verbose
flag, reachable through the runtime's debug surface:

```ts
runtime.debug.getPursuer();        // current pursuer state
runtime.debug.getPursuerSteps();   // the recorded steps
runtime.debug.setPursuerTrace(true);
```

## What this trace found

The first defect it caught, on its first run:

```
f399 | DIRECT | pos(300.0,96.1)->(300.0,96.1) | player(300.0,-28.6)
     | row y=0.0 band[-40.0,95.7] | mustCross=false | targetX=300.0
     | dy a=-1.3 BLOCKED | STALLED:VERTICAL_BLOCKED
```

The pursuer sat at y=96.1, four tenths of a unit below a collision band it had
declared irrelevant (`mustCross=false`), driving upward into it for 186 of 360
frames with zero horizontal movement. The gate deciding `mustCross` compared the
player against the band's **top** edge; a player standing on a row rests *inside*
that band, never above it, so a solid platform read as clear air.
