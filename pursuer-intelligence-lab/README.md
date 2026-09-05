# Circuit Climb — Pursuer Intelligence Lab

A portable R&D sandbox for the Circuit Climb pursuer. It exists so that
somebody — a person, a cheap model, a specialist coding model — can try to make
the bot smarter **without touching the game**, and so that whatever they try can
be compared fairly against what ships today.

## Run it

```bash
npm ci             # a lockfile is shipped; use this
npm run dev        # http://localhost:3200
```

> If you use `npm install` instead and npm 10 fails with
> `Cannot read properties of null (reading 'edgesOut')`, add
> `--legacy-peer-deps`. That is an npm bug in resolving vitest's optional peer
> set, not a problem with this package — `npm ci` avoids it entirely.

Then: `1` `2` `3` move the Spark left / centre / right, `space` pauses, `R`
restarts. Everything else is on the right-hand panel.

```bash
npm test           # the lab's own gates
npm run lint       # typecheck
npm run fixtures   # the twelve fixtures, headless
npm run compare    # every Brain against every perception model
npm run verify:browser         # drives the lab in a real Chromium
npm run artifacts              # regenerate fixtures/ and sample-runs/
npm run build:single           # one self-contained HTML file
npm run package                # rebuild the portable archive
```

No network, no credentials, no server, no MathForge host, no production
checkout. `npm install` and you have everything.

---

## What problem this is for

A human played the shipped pursuer and said:

> The way it finds the player's Spark feels like playing Marco Polo in a
> swimming pool. The bot seems to know roughly where the player's Spark is, but
> it seems to be bumping around with its eyes closed. At one point it is right
> next to the player's Spark but does not attack until it does some turns and
> seems to arbitrarily bump into the player's Spark.

That is a real product failure and it had nowhere to be investigated. The
shipped pursuer's diagnostics could not answer "why did it turn away?", the
learner never plays the same run twice so two candidates could not be compared,
and every experiment cost production development context.

This sandbox fixes all three.

---

## What is in it

| | |
|---|---|
| **Faithful board** | Production's own geometry, learner routing and camera. The pursuit problem is the real one. |
| **Two play modes** | REALISTIC (solve the sum to move) and PURSUIT TEST (`1`/`2`/`3`, no maths — dozens of runs an hour). |
| **Scripted learners** | Nine written-down shapes of play, plus RECORD MY RUN and replay. |
| **Four perception models** | P0 production · P1 stable lock · P2 line of sight · **P3 oracle (cheating reference)**. |
| **Three Brains** | A Graph V2 baseline · B the same, tunable · C a deliberately simple Direct Hunter. |
| **An empty slot** | `brain-experiments/` — add a Brain without touching anything else. |
| **Fog of war** | SHOW WHAT THE BOT KNOWS: perception radius, believed target, planned route, belief nodes. |
| **Reason trace** | Every decision says what it is doing and why, in plain language. |
| **Full logging** | Every retained sample carries a complete pursuer snapshot. There is no `pursuer: null`. |
| **Diagnostics** | Wrong-direction classifier, capture-deliberateness classifier, A/B/C comparison. |
| **Human ratings** | Nine 1–5 scales bound to the exact Brain, perception model, configuration hash and learner run. |

---

## The six layers

```
World truth
   |                     only the perception model may see this
   v
PERCEPTION        P0 / P1 / P2 / P3          selectable
   |
   v
PursuerObservation
   |
   v
BELIEF + STRATEGY     the Brain             selectable — the point of the lab
   |
   v
PursuerDecision
   |
   v
NAVIGATION        Graph V2 chassis: a target becomes a legal right-angled route
   |
   v
LOCOMOTION        Graph V2 cadence: bursts and pauses
   |
   v
PURSUER BODY
   |
   v
CAPTURE           adjudicated by the simulation, never by the Brain
```

Navigation and locomotion are **shared by every Brain**. Two Brains compared
here differ in judgement, not in driving ability — so a difference in how the
pursuit feels is attributable to the thinking.

---

## Where to start

| You want to… | Read |
|---|---|
| write a new Brain | `BRAIN_CONTRACT.md`, then `brain-experiments/README.md` |
| understand what the bot may know | `PERCEPTION_CONTRACT.md` |
| reproduce somebody's result | `CONFIGURATION_CONTRACT.md` |
| run an experiment properly | `EXPERIMENT_GUIDE.md` |
| propose a winner back to the product | `INTEGRATION_RETURN_GUIDE.md` |
| know what is copied from production | `LAB_AUTHORITY.md` |

---

## Two rules that are not negotiable

**The oracle is a cheating reference.** P3 hands the Brain the learner's true
position. It exists to separate an information problem from an architecture
problem, and nothing that uses it can ever be proposed for production. The lab
marks every such run.

**Nothing here is production authority.** The best a candidate can reach is
`APPROVED_FOR_LAB`. Putting a winner into the game is a separate, PM-controlled
integration phase. See `INTEGRATION_RETURN_GUIDE.md`.
