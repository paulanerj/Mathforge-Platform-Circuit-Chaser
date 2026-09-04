/**
 * GRAPH BRAIN V1 — the pursuit decision seam.
 *
 * `updateBrain(previousState, observation) -> { state, intent, evidence }` is
 * deterministic and explicit: every byte of memory the Brain carries between
 * ticks is in `BrainState`, which is plain, serializable data. No hidden
 * module singleton, no `Math.random`, no `Date.now` — the only clock this
 * file ever reads is `observation.nowMs`, which the Simulation supplies.
 *
 * Exactly three strategic modes, chosen by priority every tick from the
 * CURRENT observation and the Brain's own memory — never by a probability
 * roll:
 *
 *   1. VISIBLE_PURSUIT — a Spark is sensed right now, OR sensing dropped out
 *      for fewer than `LOSS_CONFIRMATION_TICKS` consecutive ticks (see LAB
 *      03A-R1 below). Always wins over the other two; sensing interrupts
 *      anything else "at any time", per the phase brief.
 *   2. TRAIL_TRACK — no direct sense (and no live grace), but some
 *      remembered trail fragment offers a point newer than what has already
 *      been reached. Fragments are compared by their own `tEndMs`, so the
 *      single freshest one always wins — which is the entire mechanism
 *      behind a downward TEST RETURN naturally pulling the pursuer back
 *      down: a return leg is simply walked LATER than the climb it
 *      retraces, with no wrong-answer branch anywhere in this file to say
 *      so.
 *   3. GRAPH_SEARCH — neither of the above. A deterministic expanding-ring
 *      frontier (`search.ts`) anchored at the best evidence available.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LAB 03A-R1 — two stability repairs, from a real human failure log
 *
 * DEFECT A, sensor boundary chatter. A stationary or slow-moving Spark right
 * at 260 units produces a `sensedSpark` that flips true/false every frame as
 * the pursuer's OWN approach carries it back and forth across the line —
 * confirmed by `tests/zzz-diagnostic` reproducing the exact reported
 * 261.4u/258.7u pair. Recomputing `mode` from scratch each tick then flips
 * VISIBLE_PURSUIT/TRAIL_TRACK/GRAPH_SEARCH on every such frame, each flip
 * re-targeting the chassis toward a genuinely different point (live Spark vs
 * remembered trail), which is what turned a one-frame sensor flicker into a
 * real, visible position oscillation. The repair is a LOSS CONFIRMATION
 * GRACE: losing direct sensing while already in VISIBLE_PURSUIT holds mode
 * at VISIBLE_PURSUIT — targeting the FROZEN last sighting, reading no hidden
 * state — for up to `LOSS_CONFIRMATION_TICKS` consecutive unsensed ticks
 * before confirming the loss and falling through to TRAIL_TRACK/
 * GRAPH_SEARCH. Still three strategic modes; the grace is a target SOURCE
 * (`LAST_SIGHTING_GRACE`), not a fourth mode.
 *
 * DEFECT B, a remembered trail lead that never exhausts. `tests/zzz-
 * diagnostic`'s second case proved the mechanism directly: the pursuer's
 * chassis-resting position sat ~111 units from the raw trail point TRAIL_
 * TRACK was targeting (graph nodes sit tens to ~95+ units from an arbitrary
 * off-lattice point — a documented, accepted property of this graph, not a
 * defect in it), while the "arrived" check compared the two with a 4-unit
 * epsilon. That comparison could never succeed, `consumedUntilMsByFragment`
 * was never populated, and TRAIL_TRACK targeted the same lead forever.
 *
 * Two contributing causes, both repaired together:
 *   (i) The Brain compared against the wrong reference frame — a raw,
 *       off-lattice evidence point — instead of asking whether the CHASSIS
 *       considers itself to have arrived (`pursuerArrivedAtIntent`, already
 *       threaded through the observation from `GraphEvidence.arrived` but
 *       previously unused here).
 *   (ii) `arrived` is a ONE-TICK-WIDE transient. If direct sensing resumes
 *       on the very tick the chassis finishes its trail-lead route,
 *       VISIBLE_PURSUIT's higher priority wins that tick and the
 *       consumed-check (guarded by `mode === 'TRAIL_TRACK'`) never runs,
 *       so the transient is lost and the same stale lead persists into the
 *       next TRAIL_TRACK episode. The diagnostic proved this exactly:
 *       `arrived` was true 74 times over the run and NEVER once while mode
 *       was TRAIL_TRACK.
 *
 * The repair for (i) is `pursuerArrivedAtIntent`. The repair for (ii) is a
 * generously-sized fallback proximity radius — `investigatedRadiusFor`,
 * below — so getting close enough to a lead counts as "investigated" on its
 * own even if the exact arrival transient is lost to a mode-priority race.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This file imports nothing from `sandbox/oracleTestDriver.ts` or any legacy
 * pursuer module — see `tests/15-brain-independence.test.ts`, which checks
 * that by walking this file's real transitive import graph rather than
 * trusting this comment.
 */
import type {
  BrainState, BrainObservation, BrainUpdateResult, PursuitIntent, BrainEvidence,
  LastSighting, RememberedTrailFragment, TrailFragment, TargetSource,
  CommitmentEndReason,
} from './observation';
import { nextSearchTarget } from './search';

/** How close the pursuer must be to a target point to count as "reached", as a fallback alongside the chassis's own arrival signal. */
const ARRIVAL_EPSILON = 4;

/**
 * Consecutive unsensed ticks tolerated before a direct-sensing loss is
 * confirmed. Three: the reproduced boundary-chatter failure flipped every
 * ONE tick (a single frame each way), so three ticks (~50ms at a typical
 * 16.7ms frame) comfortably absorbs that without ever letting a genuine,
 * sustained loss take more than a fraction of a second to confirm — nowhere
 * near long enough to read as "the sensor secretly still tracks you".
 */
export const LOSS_CONFIRMATION_TICKS = 3;

/**
 * Consecutive RAW-sensed ticks required before direct sensing may PREEMPT an
 * existing commitment to something else (a trail lead or a search frontier).
 *
 * DERIVED, not chosen. The closed-loop reproduction of the human 03A-R1
 * terminal failure (`tests/19`) measures the self-sustained flutter directly:
 * its median strategic episode is 50.1ms — three ticks each way — because the
 * oscillation is driven by the mode flips themselves (each flip re-targets
 * the chassis, which redraws its entry-leg lane offset, which nudges the
 * actor a few units across the 260 boundary). Any confirmation longer than
 * one self-sustained run therefore breaks the feedback rather than merely
 * re-tuning its period. Six ticks (~100ms) is that measured 3-tick run with
 * a 2x margin: long enough to outlast the flutter, short enough that a
 * genuine, sustained reacquisition still engages within a tenth of a second.
 *
 * A FIRST acquisition — one made while the Brain holds no competing
 * commitment — remains immediate; this gate only applies to overriding an
 * intent already in flight.
 */
export const ACQUIRE_CONFIRMATION_TICKS = 6;

/**
 * Consecutive ticks a committed trail lead must offer nothing actionable
 * before it is declared exhausted. The trail-side twin of
 * `LOSS_CONFIRMATION_TICKS`, and the same principle: NO strategic commitment
 * ends on one frame's perception.
 *
 * DERIVED from `tests/19`'s closed-loop probe, not chosen. A remembered
 * fragment's CLIPPED `tEndMs` is a function of the PURSUER's position, not of
 * learner activity: the sensor circle's far intersection with a static trail
 * slides along it as the pursuer moves, so `tEndMs` walks forward and back
 * (measured: 23 -> 28 -> 33 -> 37 -> 41 -> 45 -> 48 -> 49 -> 46 -> 43 ms on a
 * trail the stationary learner had finished five seconds earlier), while the
 * distance to the clipped head hovers at 112.7-115.1 against an investigated
 * radius of ~114.02. Both quantities straddle their threshold at frame scale
 * — structurally the SAME defect as the 260u sensor boundary, one layer down.
 * The measured worst run of consecutive non-actionable ticks while the lead
 * was still genuinely advancing is 2; six ticks (~100ms) is that run with a
 * 3x margin, so straddling can never confirm exhaustion while a lead is still
 * yielding ground, and a lead that has truly ended still exhausts in a tenth
 * of a second.
 */
export const TRAIL_EXHAUSTION_CONFIRMATION_TICKS = 6;

/**
 * Consecutive ticks the same trail lead must look actionable before it may
 * PREEMPT a commitment already in flight. The trail-side twin of
 * `ACQUIRE_CONFIRMATION_TICKS`, and the fourth face of one single rule:
 *
 *   No strategic commitment starts or ends on one frame's perception.
 *   Only a FIRST decision — taken while the Brain holds no commitment at
 *   all — is immediate.
 *
 * DERIVED from `tests/19`'s second sustaining geometry, not chosen. The
 * `climb-then-cross` family exposed the mirror of the exhaustion defect:
 * `isActionableLead`'s geometric clause compares the clipped head against
 * `investigatedRadiusFor` (~114.02u), and a pursuer TRACKING a trail at a
 * fixed offset sits exactly on that line — measured head distances of
 * 111.0/114.0/114.2/114.5/117.1 on consecutive frames, straddled by the
 * chassis's own 3.2u-per-frame step. That is the same class of defect as the
 * 260u sensor boundary, and it cannot be fixed by moving the radius: any
 * radius the pursuer tracks along will be straddled somewhere. Measured worst
 * run of consecutive "actionable" frames produced purely by that straddle: 3.
 * Six ticks (~100ms) is that run with a 2x margin.
 */
export const LEAD_PREEMPTION_CONFIRMATION_TICKS = 6;

/** Bounded Brain memory — old fragments age out rather than accumulating forever. */
const MAX_REMEMBERED_FRAGMENTS = 24;

export function createBrainState(): BrainState {
  return {
    mode: 'GRAPH_SEARCH',
    lastSighting: null,
    rememberedFragments: [],
    consumedUntilMsByFragment: {},
    search: null,
    commitment: null,
    sensedRunTicks: 0,
    unsensedRunTicks: 0,
    trailExhaustionTicks: 0,
    actionableLeadId: null,
    actionableLeadRunTicks: 0,
    directLossGraceTicks: 0,
    lastIssuedTargetKey: null,
    consecutiveIdenticalTargetTicks: 0,
    ticks: 0,
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * How close counts as "close enough to consider a trail lead investigated",
 * when the chassis's own one-tick arrival transient doesn't line up with
 * this exact tick. Half the smallest trunk spacing plus the graph actor's
 * own radius — the same geometric quantity `brain/sensors.ts` derives the
 * local trail-sense radius from, reimplemented locally here rather than
 * imported, so this file's own reachable set stays exactly what
 * `tests/15-brain-independence.test.ts` already verifies. At the accepted
 * 90% geometry this is ~114 units, comfortably covering the ~95-111 unit
 * gap between an arbitrary off-lattice trail point and the nearest graph
 * node the chassis can actually stand on.
 */
function investigatedRadiusFor(graph: BrainObservation['graph']): number {
  if (graph.trunks.length < 2) return graph.actorRadius;
  let smallest = Infinity;
  for (let i = 0; i < graph.trunks.length - 1; i += 1) {
    smallest = Math.min(smallest, graph.trunks[i + 1].x - graph.trunks[i].x);
  }
  return smallest / 2 + graph.actorRadius;
}

/**
 * Merge this tick's freshly sensed fragments into memory.
 *
 * A fragment already known keeps its ORIGINAL detection time — that is the
 * "I smelled this here, some time ago" fact — while its geometry and
 * `tEndMs` update to whatever was just (re-)sensed, which is how continued
 * sensing lets a fragment's useful endpoint keep advancing as the bot moves.
 * Nothing here extends a fragment into territory that was never sensed: the
 * geometry always comes straight from this tick's `TrailFragment`, itself
 * already clipped by `brain/sensors.ts`.
 */
function upsertFragments(
  existing: readonly RememberedTrailFragment[],
  fresh: readonly TrailFragment[],
  nowMs: number,
): RememberedTrailFragment[] {
  const byId = new Map<string, RememberedTrailFragment>(existing.map((f) => [f.id, f]));
  for (const f of fresh) {
    const prior = byId.get(f.id);
    byId.set(f.id, {
      ...f,
      firstDetectedAtMs: prior ? prior.firstDetectedAtMs : nowMs,
      lastSensedAtMs: nowMs,
    });
  }
  const all = [...byId.values()].sort((a, b) => b.lastSensedAtMs - a.lastSensedAtMs);
  return all.slice(0, MAX_REMEMBERED_FRAGMENTS);
}

/** The single freshest fragment by physical chronology — ties break on id for determinism. */
function freshestFragment(fragments: readonly RememberedTrailFragment[]): RememberedTrailFragment | null {
  let best: RememberedTrailFragment | null = null;
  for (const f of fragments) {
    if (!best || f.tEndMs > best.tEndMs || (f.tEndMs === best.tEndMs && f.id < best.id)) best = f;
  }
  return best;
}

/**
 * REMEMBERED EVIDENCE is not the same thing as an ACTIONABLE LEAD.
 *
 * A fragment never investigated is actionable on sight. A fragment already
 * investigated becomes actionable again ONLY if the newer part of it lies
 * beyond the reach the pursuer has already covered — the same
 * `investigatedRadiusFor` geometry that marked it consumed in the first
 * place.
 *
 * That geometric test is what kills the 03A-R1 trail/search chatter without
 * inventing a time constant. As the pursuer moves, the sensor's clip window
 * slides along a static segment and keeps revealing a marginally later
 * `tEndMs` — pure clip artifact, metres from where the pursuer is already
 * standing. Under the old `tEndMs > consumedUntil` test that artifact
 * resurrected an exhausted lead for a single frame and stole an in-flight
 * search; here it cannot, because the revealed point is still well inside
 * the radius already investigated. A learner who genuinely walks on moves
 * that head OUT of the investigated radius, and the lead legitimately
 * becomes actionable again.
 */
function isActionableLead(
  fragment: RememberedTrailFragment,
  consumedUntilMs: number | undefined,
  pursuerPosition: { x: number; y: number },
  investigatedRadius: number,
): boolean {
  if (consumedUntilMs === undefined) return true;
  if (fragment.tEndMs <= consumedUntilMs + 1e-6) return false;
  const head = fragment.points[fragment.points.length - 1];
  return distance(pursuerPosition, { x: head.x, y: head.y }) > investigatedRadius;
}

export function updateBrain(prev: BrainState, obs: BrainObservation): BrainUpdateResult {
  const rememberedFragments = upsertFragments(prev.rememberedFragments, obs.sensedTrailFragments, obs.nowMs);
  const investigatedRadius = investigatedRadiusFor(obs.graph);

  // ── LAYER 1: PERCEPTION TRUTH ────────────────────────────────────────────
  // Raw, this tick, allowed to flutter. Nothing below reads hidden state.
  const rawSensedNow = obs.sensedSpark !== null;
  const sensedRunTicks = rawSensedNow ? prev.sensedRunTicks + 1 : 0;
  const unsensedRunTicks = rawSensedNow ? 0 : prev.unsensedRunTicks + 1;

  // ── LAYER 2: EVIDENCE STATE ──────────────────────────────────────────────
  const lastSighting: LastSighting | null = obs.sensedSpark
    ? {
        x: obs.sensedSpark.x, y: obs.sensedSpark.y,
        vx: obs.sensedSpark.vx, vy: obs.sensedSpark.vy,
        sightingTMs: obs.sensedSpark.sightingTMs,
      }
    // Frozen at the moment of loss: simply stop updating it. Nothing here
    // ever re-reads hidden truth to keep it current — true during the
    // loss-confirmation grace and during any held commitment alike.
    : prev.lastSighting;

  const best = freshestFragment(rememberedFragments);
  const bestConsumedUntil = best ? prev.consumedUntilMsByFragment[best.id] : undefined;
  const bestIsActionable = best !== null
    && isActionableLead(best, bestConsumedUntil, obs.pursuerPosition, investigatedRadius);

  // Confirmed transitions, as opposed to raw sensor edges.
  const directLossConfirmed = unsensedRunTicks >= LOSS_CONFIRMATION_TICKS;
  const directStablyReacquired = sensedRunTicks >= ACQUIRE_CONFIRMATION_TICKS;

  // How long THIS candidate lead has looked actionable without interruption.
  // Resets whenever it stops looking actionable, or a different fragment
  // becomes the freshest — so the run always describes one single lead.
  const actionableLeadId = bestIsActionable && best ? best.id : null;
  const actionableLeadRunTicks = actionableLeadId !== null && actionableLeadId === prev.actionableLeadId
    ? prev.actionableLeadRunTicks + 1
    : (actionableLeadId !== null ? 1 : 0);
  /**
   * A lead the Brain has NEVER investigated is genuinely new information and
   * may preempt at once; only a RESURRECTED one — a fragment already carrying
   * a consumption watermark, re-arming because its clipped extent slid — has
   * to prove itself over LEAD_PREEMPTION_CONFIRMATION_TICKS.
   *
   * That distinction is the point. A consecutive-run requirement applied to
   * every lead alike is both too weak and too strong: measured against the
   * live sandbox it never exceeded 4 consecutive ticks even for legitimate
   * evidence, which would have made TRAIL_TRACK unreachable behind a held
   * search commitment (`tests/19` measures this directly). The clip-slide
   * artifact, by construction, can only ever resurrect a fragment that has
   * ALREADY been consumed — so gating exactly that case costs nothing real
   * and removes the chatter.
   */
  const bestNeverInvestigated = best !== null && prev.consumedUntilMsByFragment[best.id] === undefined;
  const leadStablyActionable = bestIsActionable
    && (bestNeverInvestigated || actionableLeadRunTicks >= LEAD_PREEMPTION_CONFIRMATION_TICKS);

  let consumedUntilMsByFragment = prev.consumedUntilMsByFragment;
  let trailLeadConsumedThisTick = false;

  // A trail lead is investigated when the chassis says it finished the route
  // it was given, or when the pursuer has simply come within the radius it
  // would have finished at. Monotonic: a watermark is only ever raised.
  //
  // Note this deliberately still runs AFTER actionability is judged, so a
  // fragment smelled for the first time is actionable on the tick it is
  // discovered even though the pursuer is standing inside the investigated
  // radius of its clipped head — the sensor's trail-clip radius and the
  // investigated radius are the same geometric quantity (~114u at the
  // accepted framing), so a freshly clipped head is ALWAYS inside it by
  // construction and consuming first would make TRAIL_TRACK unreachable
  // (measured: it broke 7 existing scenario gates). What stops the resulting
  // commit-then-consume from becoming frame-scale chatter is not the
  // ordering but TRAIL_EXHAUSTION_CONFIRMATION_TICKS below: the commitment
  // outlives a single tick's disagreement.
  if (best !== null) {
    const head = best.points[best.points.length - 1];
    const reached = obs.pursuerArrivedAtIntent
      || distance(obs.pursuerPosition, { x: head.x, y: head.y }) < investigatedRadius;
    const previousWatermark = prev.consumedUntilMsByFragment[best.id];
    if (reached && (previousWatermark === undefined || best.tEndMs > previousWatermark)) {
      consumedUntilMsByFragment = { ...consumedUntilMsByFragment, [best.id]: best.tEndMs };
      trailLeadConsumedThisTick = true;
    }
  }

  // ── LAYER 3: STRATEGIC INTENT ────────────────────────────────────────────
  // A commitment ends ONLY at a named decision boundary. It never ends
  // because a sensor bit toggled, which is the whole of the 03A-R1 defect.
  let commitment = prev.commitment;
  let commitmentEndReason: CommitmentEndReason | null = null;
  let search = prev.search;
  // Reset by default: the counter only ever accumulates while a TRAIL_TRACK
  // commitment is being held and is finding nothing new.
  let trailExhaustionTicks = 0;

  if (commitment) {
    if (commitment.mode === 'VISIBLE_PURSUIT') {
      // Held while sensed, and through a dropout, until the loss is
      // CONFIRMED. The 03A-R1 grace is retained but is no longer the whole
      // test, because a purely temporal one is not enough: LOSS_CONFIRMATION_
      // TICKS still starts the grace, and the sighting must ALSO have been
      // INVESTIGATED before the commitment is abandoned.
      //
      // That second clause is the same semantics TRAIL_LEAD_CONSUMED already
      // has — a lead ends when it has been looked at, not when a sensor bit
      // toggled — and it is what a person does: "I saw them over there, so I
      // am going over there", not "I stopped seeing them 50ms ago, so I have
      // no idea where they went". `tests/19` measured the alternative
      // directly: the pursuer abandoned a sighting three ticks after losing
      // it while still EN ROUTE to it, fell to TRAIL_TRACK whose commanded
      // node pulls the chassis the opposite way along x, drove itself back
      // out past 260, and re-acquired — a 200ms three-mode limit cycle
      // (TRAIL_TRACK -> GRAPH_SEARCH -> VISIBLE_PURSUIT -> ...) that paced
      // between d=254.6 and d=268.3 for 1.2 seconds without ever closing.
      //
      // This cannot lock the way 03A-R1's defect B did: the target is a
      // fixed frozen point, the chassis always eventually reports arrival at
      // the node it was sent to, and arrival alone satisfies the clause.
      if (!rawSensedNow && directLossConfirmed) {
        const sighting = lastSighting;
        const investigated = sighting === null
          || obs.pursuerArrivedAtIntent
          || distance(obs.pursuerPosition, { x: sighting.x, y: sighting.y }) < investigatedRadius;
        if (investigated) commitmentEndReason = 'DIRECT_LOSS_CONFIRMED';
      }
    } else if (directStablyReacquired) {
      // A trail/search commitment yields to direct pursuit only on a
      // SUSTAINED reacquisition, never on a one-frame boundary blip.
      commitmentEndReason = 'STABLE_DIRECT_REACQUISITION';
    } else if (commitment.mode === 'TRAIL_TRACK') {
      const committedFragment = rememberedFragments.find((f) => f.id === commitment!.evidenceKey) ?? null;
      const committedWatermark = committedFragment
        ? consumedUntilMsByFragment[committedFragment.id] : undefined;
      if (!committedFragment) commitmentEndReason = 'TARGET_INVALIDATED';
      else if (!isActionableLead(committedFragment, committedWatermark, obs.pursuerPosition, investigatedRadius)) {
        // CONFIRMED exhaustion only. One non-actionable frame is perception
        // noise (see TRAIL_EXHAUSTION_CONFIRMATION_TICKS); a lead is declared
        // spent only when it stops yielding ground for a whole run of them.
        trailExhaustionTicks = prev.trailExhaustionTicks + 1;
        if (trailExhaustionTicks >= TRAIL_EXHAUSTION_CONFIRMATION_TICKS) {
          commitmentEndReason = 'TRAIL_LEAD_CONSUMED';
        }
      } else if (best && best.id !== committedFragment.id && leadStablyActionable
        && best.tEndMs > committedFragment.tEndMs) {
        commitmentEndReason = 'NEWER_TRAIL_LEAD';
      }
    } else {
      // GRAPH_SEARCH: run to the committed frontier node. Only a genuinely
      // actionable trail lead may interrupt it — an already-investigated
      // fragment drifting back into the sensor envelope may not.
      const node = obs.graph.nodes.get(commitment.evidenceKey);
      if (!node) commitmentEndReason = 'TARGET_INVALIDATED';
      else if (distance(obs.pursuerPosition, { x: node.x, y: node.y }) < ARRIVAL_EPSILON
        || obs.pursuerArrivedAtIntent) commitmentEndReason = 'SEARCH_TARGET_REACHED';
      // A lead may interrupt a search in flight only once CONFIRMED — see
      // LEAD_PREEMPTION_CONFIRMATION_TICKS. An already-investigated fragment
      // drifting back across the investigated radius may not.
      else if (leadStablyActionable) commitmentEndReason = 'NEWER_TRAIL_LEAD';
    }
    if (commitmentEndReason) commitment = null;
  }

  // ── FRESH COMMITMENT, when the previous one reached its boundary ─────────
  const lastDirectSightingAgeMs = lastSighting ? obs.nowMs - lastSighting.sightingTMs : null;

  // A commitment ENDING is not a licence to re-decide from raw perception.
  // Direct pursuit engages immediately only on a GENUINE first decision —
  // one taken while the Brain held no commitment at all. At every other
  // boundary the same confirmation applies as for preemption, because the
  // alternative is the rejected "recompute the highest-priority currently
  // visible input" architecture creeping back in through the boundary:
  // `tests/19` measured exactly that limit cycle, a 200ms VISIBLE_PURSUIT /
  // TRAIL_TRACK standing oscillation in which the trail lead exhausted on
  // its 6th tick and the raw sensor happened to read true on that same tick,
  // so direct pursuit engaged with only 4 sensed ticks behind it — and the
  // two modes' projected nodes pull the chassis in opposite directions along
  // x, which is what turned the re-decision into physical pacing.
  const mayEngageDirectNow = rawSensedNow && (prev.commitment === null || directStablyReacquired);

  if (!commitment) {
    if (mayEngageDirectNow) {
      commitment = {
        mode: 'VISIBLE_PURSUIT',
        targetPoint: { x: obs.sensedSpark!.x, y: obs.sensedSpark!.y },
        targetSource: 'SENSED_SPARK',
        evidenceKey: 'SPARK',
        committedAtMs: obs.nowMs,
        committedTick: prev.ticks,
      };
      search = null;
    } else if (best !== null && bestIsActionable) {
      const head = best.points[best.points.length - 1];
      commitment = {
        mode: 'TRAIL_TRACK',
        targetPoint: { x: head.x, y: head.y },
        targetSource: obs.sensedTrailFragments.some((f) => f.id === best.id) ? 'SENSED_TRAIL' : 'REMEMBERED_TRAIL',
        evidenceKey: best.id,
        committedAtMs: obs.nowMs,
        committedTick: prev.ticks,
      };
      search = null;
    } else {
      // GRAPH_SEARCH. An EPISODE's anchor is chosen once and then held —
      // reaching a frontier node advances the frontier, it does not re-open
      // the question of where to search from.
      //
      // Holding it is not cosmetic. `search.ts` restarts a frontier from
      // tier 0 whenever the anchor's nearest node changes, and the evidence
      // anchor below is the freshest fragment's CLIPPED head, which slides
      // with the pursuer's own position. Re-deriving it on every arrival
      // therefore flipped the anchor between two adjacent nodes and reset
      // the frontier every time: `tests/19` measured a 23-second search that
      // issued its first frontier target once and then paced A12<->B12
      // forever, visiting 2 nodes out of the whole board. That defect
      // predates LAB 03A-R2 but was invisible to the 03A/03A-R1 suite, which
      // teleported the pursuer to each target instead of letting the chassis
      // drive — exactly the closed-loop blind spot the R2 brief names.
      let anchorPoint: { x: number; y: number };
      let anchorSource: TargetSource;
      const episodeAnchor = search ? obs.graph.nodes.get(search.anchorNodeId) : undefined;
      if (episodeAnchor) { anchorPoint = { x: episodeAnchor.x, y: episodeAnchor.y }; anchorSource = 'SEARCH_FRONTIER'; }
      else if (lastSighting) { anchorPoint = { x: lastSighting.x, y: lastSighting.y }; anchorSource = 'SEARCH_FRONTIER'; }
      else if (best) { const p = best.points[best.points.length - 1]; anchorPoint = { x: p.x, y: p.y }; anchorSource = 'SEARCH_FRONTIER'; }
      else { anchorPoint = { x: obs.runStartOrigin.x, y: obs.runStartOrigin.y }; anchorSource = 'RUN_START_CUE'; }

      const step = nextSearchTarget(obs.graph, anchorPoint, search, obs.nowMs);
      search = step.nextCursor;
      commitment = {
        mode: 'GRAPH_SEARCH',
        targetPoint: step.targetPoint,
        targetSource: anchorSource,
        evidenceKey: step.targetNode,
        committedAtMs: obs.nowMs,
        committedTick: prev.ticks,
      };
    }
  }

  // ── THE INTENT THIS TICK, from the held commitment ───────────────────────
  const commitmentHeld = prev.commitment !== null && commitmentEndReason === null;
  const mode = commitment.mode;
  let intent: PursuitIntent;

  if (mode === 'VISIBLE_PURSUIT') {
    if (rawSensedNow) {
      // Sensed: track the live Spark. Legitimate — it is inside the radius.
      const spark = obs.sensedSpark!;
      commitment = { ...commitment, targetPoint: { x: spark.x, y: spark.y }, targetSource: 'SENSED_SPARK' };
      intent = {
        mode, targetPoint: { x: spark.x, y: spark.y }, targetSource: 'SENSED_SPARK',
        evidenceTMs: spark.sightingTMs, lastDirectSightingAgeMs: 0,
        trailFragmentId: null, trailFragmentAgeMs: null,
        searchTier: null, searchFrontierIndex: null,
      };
    } else {
      // Unsensed but not yet confirmed lost: hold the FROZEN last sighting,
      // verbatim. No hidden read of any kind.
      const sighting = lastSighting!;
      intent = {
        mode, targetPoint: { x: sighting.x, y: sighting.y }, targetSource: 'LAST_SIGHTING_GRACE',
        evidenceTMs: sighting.sightingTMs, lastDirectSightingAgeMs,
        trailFragmentId: null, trailFragmentAgeMs: null,
        searchTier: null, searchFrontierIndex: null,
      };
    }
    search = null;
  } else if (mode === 'TRAIL_TRACK') {
    const fragment = rememberedFragments.find((f) => f.id === commitment!.evidenceKey) ?? best!;
    const head = fragment.points[fragment.points.length - 1];
    // The committed lead's own newest known point, refreshed as further
    // continuation of THAT fragment is legitimately sensed.
    commitment = { ...commitment, targetPoint: { x: head.x, y: head.y } };
    intent = {
      mode, targetPoint: { x: head.x, y: head.y },
      targetSource: obs.sensedTrailFragments.some((f) => f.id === fragment.id) ? 'SENSED_TRAIL' : 'REMEMBERED_TRAIL',
      evidenceTMs: fragment.tEndMs, lastDirectSightingAgeMs,
      trailFragmentId: fragment.id, trailFragmentAgeMs: obs.nowMs - fragment.tEndMs,
      searchTier: null, searchFrontierIndex: null,
    };
  } else {
    intent = {
      mode, targetPoint: { ...commitment.targetPoint }, targetSource: commitment.targetSource,
      evidenceTMs: commitment.committedAtMs, lastDirectSightingAgeMs,
      trailFragmentId: null, trailFragmentAgeMs: null,
      searchTier: search ? search.lastTargetTier : null,
      searchFrontierIndex: search ? search.lastFrontierIndex : null,
    };
  }

  // Semantic health bookkeeping: how many ticks in a row the issued target
  // point has been EXACTLY the same.
  const targetKey = `${intent.targetPoint.x.toFixed(3)},${intent.targetPoint.y.toFixed(3)}`;
  const consecutiveIdenticalTargetTicks = targetKey === prev.lastIssuedTargetKey
    ? prev.consecutiveIdenticalTargetTicks + 1 : 0;

  const nextState: BrainState = {
    mode, lastSighting, rememberedFragments, consumedUntilMsByFragment, search,
    commitment, sensedRunTicks, unsensedRunTicks, trailExhaustionTicks,
    actionableLeadId, actionableLeadRunTicks,
    directLossGraceTicks: mode === 'VISIBLE_PURSUIT' && !rawSensedNow ? unsensedRunTicks : 0,
    lastIssuedTargetKey: targetKey, consecutiveIdenticalTargetTicks,
    ticks: prev.ticks + 1,
  };

  const evidence: BrainEvidence = {
    mode,
    sensedSparkNow: rawSensedNow,
    sensedFragmentCount: obs.sensedTrailFragments.length,
    rememberedFragmentCount: rememberedFragments.length,
    searchTrunksVisited: search ? search.trunksVisited : [],
    searchLevelsVisited: search ? search.levelsVisited : [],
    searchTargetsIssued: search ? search.targetsIssued : 0,
    searchConsecutiveRepeats: search ? search.consecutiveRepeats : 0,
    hiddenStateFirewallViolations: 0,
    futureRouteLeakCount: 0,
    sensingGraceActive: mode === 'VISIBLE_PURSUIT' && !rawSensedNow,
    trailExhaustionTicks,
    actionableLeadRunTicks,
    trailLeadConsumedThisTick,
    consecutiveIdenticalTargetTicks,
    rawSensedNow,
    commitmentHeld,
    commitmentAgeMs: obs.nowMs - commitment.committedAtMs,
    commitmentEndReason,
    strategicModeChanged: prev.mode !== mode,
  };

  return { state: nextState, intent, evidence };
}
