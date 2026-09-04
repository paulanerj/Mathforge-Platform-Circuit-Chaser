# Pursuer configuration architecture — 04C

The pursuer's configuration is now a contract rather than a scattering of constants.
This is what that contract is, why each part of it is shaped the way it is, and — as
importantly — what it deliberately does **not** do.

The generated companion document,
[`CIRCUIT_CLIMB_PURSUER_PARAMETER_AUTHORITY_04C.md`](./CIRCUIT_CLIMB_PURSUER_PARAMETER_AUTHORITY_04C.md),
carries every parameter, bound and value. This one carries the reasoning.

---

## Why

04B failed human acceptance on a sentence: *"the bot gets lost very quickly … at one point
after waiting I concluded the bot got lost."* Turning that into a defect took a full
reproduction cycle, and the first question of that cycle — *what was the pursuer set to?* —
had no single answer. The numbers lived in five modules, and three of them were not what
production ran:

| declared | production runs |
| --- | --- |
| `DEFAULT_GRAPH_PURSUER_CONFIG.captureRail = false` | `true` |
| `DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels = 0` | `2` |
| `DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius = null` | derived per world |

The controller overrode all three on construction. Anyone who described the shipped pursuer
by reading its "defaults" would have been wrong three times.

The audit also found the reverse problem — a parameter a configuration brief naturally asks
for that **does not exist**. There is no last-sighting grace in milliseconds anywhere in the
Brain. The real quantity is `LOSS_CONFIRMATION_TICKS`, counted in **frames**. That is not
pedantry: it is why the same pursuer reacted differently for the 04B tester, who was on a
144Hz display, than in every derivation that produced the constant at 16.7ms. A schema field
called `lastSightingGraceMs` would have been a fabrication, so there isn't one. There is
`commitment.lossConfirmationTicks`, under its real name and unit, and the wall-clock
consequence is *reported* in every diagnostic export as a derived value.

---

## The shape

```
identity      schemaVersion, configurationId, label, description
locomotion    speed, burst and pause ranges, pauseChance, two seeds     SETTABLE
perception    directSenseRadius, trailRowRetention                      SETTABLE
strategy      (reserved, empty in v1)                                   RESERVED
commitment    the four confirmation windows, bounded memory             FROZEN
chassis       laneBandFraction, targetEpsilon, arrivalEpsilon           FROZEN
spawnCapture  spawnRule, groundLevels, captureRail                      FROZEN
metadata      lifecycle, provenance, parent, notes, flags               never behaviour
```

Each parameter appears exactly once. Nothing is duplicated across layers, and one resolved
configuration governs one run.

**`strategy` is empty on purpose.** The addendum permits one or two parameters there, "only
those a PM task has demonstrated to matter". No such demonstration reached this build, so
putting anything there would have been inventing an authority. When the demonstration
arrives, a parameter is promoted out of `commitment` into `strategy` in a v2 schema and
nothing around it moves.

**Derived values are absent by design.** The trail-sensing radius is half the smallest trunk
spacing plus the actor's radius, computed live; the actor's radius comes from world
clearance and *decreases* as the framing widens. Storing either would let a saved
configuration disagree with the board it is running on — precisely the failure this contract
exists to prevent. They are reported as `ResolvedDerivedValues` and never authored.

---

## Schema versioning

Every payload carries `identity.schemaVersion`. It is checked **first**, and an unknown
version is fatal on its own — no other issue is even reported, because a payload written for
another schema cannot have its fields judged by this one's rules. Two schema versions may use
the same field name for different meanings, and running such a payload would produce evidence
attributed to parameters that were never applied.

Failure is loud. The tuning panel prints the refusal verbatim; the game still starts on the
baseline, and the evidence export records `selection.fallbackFrom` so nobody spends an evening
testing a pursuer that quietly reverted.

---

## One validator

`validatePursuerConfiguration` is the only door. Built-ins, slider edits, duplicates, pastes
from a bug report and any future host selection all come through it; there is no gentler path
for "our own" configurations, and a built-in that fails it is a bug in the built-in.

It checks type correctness, finiteness, integer-ness where required, ranges, `min ≤ max` on
both drawn ranges, probability bounds, enum membership, and the Graph V2 invariants
(`0 < laneBandFraction < 1`, positive epsilons, at least one retained row transition). Given a
board width it also refuses a sense radius that spans it — omniscience is an architecture
change, not a difficulty setting, and a pursuer that can always see makes the trail and search
layers dead code.

Two properties matter more than the list:

- **Nothing partial runs.** A missing field is a refusal, never a silently filled default.
- **Nothing extra rides along.** The validated configuration is rebuilt field by field, so an
  unrecognised key in a paste cannot reach the run or the hash.

The bounds live in one table that the sliders read too, so the UI cannot offer a value the
validator then rejects.

---

## The behaviour hash

SHA-256 over a canonical, human-readable text form: one `path=value` line per parameter,
layers in a fixed order, keys sorted, so neither object literal order nor a JSON round trip
can move it.

- **In:** every behaviour parameter, and the schema version.
- **Out:** the label, description, id and all metadata.

A rename does not change the hash. Two people who independently dial in the same numbers get
the same hash — and that is the intended reading: they are running the same pursuer. The
SHA-256 is implemented in the repository so it runs synchronously in the browser, in vitest
and in a Node tool alike; a test pins every digest against `node:crypto`.

---

## Lifecycle

```
BASELINE · EXPERIMENTAL · CANDIDATE · APPROVED · DEPRECATED
```

`04B-R1 BASELINE` is the only `BASELINE`, is frozen, and names the commit whose behaviour it
reproduces. Everything a human creates is `EXPERIMENTAL`, including a duplicate of the
baseline — a copy that starts with the baseline's numbers is a new thing, and calling it
anything else is how an unreviewed tuning ends up shipping. **No code in this system promotes
a configuration.** Promotion is a human decision taken outside the tool, and a configuration a
tester liked does not become `APPROVED` by being liked.

---

## No silent mutation

Moving a slider produces a **draft** on top of the selection. It never writes to the baseline,
a built-in, or a named configuration; the header reads `MODIFIED` until the draft is applied,
saved under a new name, or thrown away. Built-in objects are deep-frozen besides, so the rule
is enforced by the runtime and not merely observed by convention.

The panel shows **what is running** and **what is selected** separately. They differ for a
whole run every time somebody edits without applying — exactly the moment a tester would
otherwise attribute what they are watching to the wrong parameters.

---

## Exact reproducibility

Every diagnostic export (Ctrl+Shift+D) carries:

- `configurationSchemaVersion`, `configurationId`, `configurationLabel`
- `configurationHash` and its short form
- `lifecycle`, `experimental`, `authorityCommit`
- the **full resolved payload** — what actually ran, not what was asked for
- `selection` — the reason, the moment, what was requested, and any fallback
- `derived` — actor radius, trail-sense radius, trunk count, and the commitment windows
  expressed in milliseconds at the frame rate the run actually saw
- `testNotes` — the tester's own words, verbatim

That is enough to rebuild the run's pursuer exactly.

---

## Test notes

Six prompts (THREAT, PURPOSEFUL MOVEMENT, TOO STAGGERED, SEEMS TO GET LOST, MATH THINKING
TIME, FAIRNESS) rated 1–5, plus free text, attached to the exact configuration played.

**They are never interpreted by code.** Nothing scores, thresholds, averages or aggregates
them, and no configuration is selected because of them. A five on THREAT is a tester's word,
not a measurement, and the moment code treats it as one the evidence stops being human product
evidence and becomes a number nobody checked. Ratings start unrated rather than at a middle
default, and reading notes back from storage never invents one.

---

## Safe transition boundaries

Exactly one is active: **run start**. The controller is rebuilt from scratch there — position,
Brain memory, the consumed-trail watermark, the search episode, commitment, sensor counters,
cadence and trail — so nothing can be left describing the previous configuration. A changed
selection therefore builds a *new* controller rather than restarting the old one; restarting
would keep the old parameters and the evidence would name a pursuer that never ran.

The others are documented and inactive:

- *Between problems, while the learner is stationary and unsensed* — looks safe, is not.
  Cadence state, an in-flight commitment and a search episode all carry forward, and a changed
  sense radius mid-episode can retire evidence the Brain has already committed to. That is the
  exact class of defect 03A-R2 was built to eliminate.
- *On capture, before the next run* — genuinely safe, and the natural place for a future host
  policy. Inactive because nothing selects configurations automatically here.
- *Per frame* — ruled out by the addendum, and independently by evidence integrity: a run whose
  parameters moved during it cannot be attributed to any configuration. No function in the
  configuration modules can be called from a frame loop.

---

## The future seam

```
PLAYER EVIDENCE → PLAYER MODEL / POLICY → SELECT APPROVED CONFIGURATION → VALIDATE → RUN
                                                                          ^^^^^^^^
                                                                  resolvePursuerConfiguration
```

`ResolvedPursuerConfiguration` is what the runtime receives, and it carries **no account of why
it was selected**. The reason lives in `ConfigurationSelection`, which the diagnostic export
reads and the controller never imports. That is structural rather than a convention: pursuit
code cannot branch on the reason because the reason is not reachable from it, so a policy layer
can arrive later without the pursuer changing at all.

**04C implements none of that.** There is no player model, no adaptive difficulty, and no
prediction. What exists is the seam that would let one be added without touching Graph V2, and
the rule that any such layer selects among *approved, validated configurations* rather than
manipulating constants per frame.

---

## Repository boundary

The contract (`pursuer-v2/config/`) is plain TypeScript with no React anywhere in it. The
tuning panel (`devtools/PursuerConfigurationPanel.tsx`) is a rendering of pure store functions
and contains no pursuit logic. Graph V2 is not coupled to a slider component, and a future host
that selects configurations with no interface at all uses the same functions the panel does.

---

## Verifying it

```
npx vitest run src/games/circuit-climb/tests/pursuerV2Configuration.test.ts
node src/games/circuit-climb/tools/circuitClimbPursuerConfigVerify.mjs
npx tsx src/games/circuit-climb/tools/circuitClimbPursuerAuthorityDoc.mts
```

The first is the contract's unit gates; the second drives the real application in a real
browser and checks the claims a unit test cannot — that the panel is genuinely absent from the
game a tester meets, that a slider genuinely does not touch the running pursuer until applied,
that applying it genuinely changes what is on screen, and that the export genuinely names the
pursuer that ran. The third regenerates the parameter document from the code.
