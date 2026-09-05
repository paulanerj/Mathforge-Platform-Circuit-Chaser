/**
 * BRAIN A / BRAIN B — GRAPH PURSUER V2, the production baseline.
 *
 * The Brain the human tester has been playing against. It is here for two
 * reasons: it is the thing any replacement has to beat, and it is the only
 * candidate whose behaviour is already accepted, so a lab result that
 * contradicts it is a result about the lab rather than about the pursuer.
 *
 * BRAIN A is frozen at the production tuning and is the parity reference.
 * BRAIN B is the same code with its six derived windows exposed as parameters.
 * They are the SAME implementation — the only difference is whether the tuning
 * object is the frozen one — so any behavioural difference between them is
 * attributable to a parameter and nothing else.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS ADAPTER DOES, AND WHY IT IS A SEPARATE FILE
 *
 * `graphBrainV1.ts` is production code and is kept as close to verbatim as the
 * tuning change allows. It speaks its own observation vocabulary. Everything
 * needed to make it speak the lab's general Brain contract lives here, so that
 * a future diff against production reads as "the adapter changed", never as
 * "somebody edited the accepted decision logic".
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { PursuerBrainDefinition, BrainInstance } from '../../contract/brain';
import type { PursuerObservation } from '../../contract/observation';
import type { PursuerDecision, CanonicalMode, BrainInspection } from '../../contract/decision';
import type { BrainObservation, BrainState, TargetSource } from './brainObservation';
import {
  createBrainState, updateBrain, GRAPH_V2_BASELINE_TUNING, type GraphV2Tuning,
} from './graphBrainV1';

/** How the three Graph V2 modes map onto the lab's canonical postures. */
const MODE_MAP: Record<string, CanonicalMode> = {
  VISIBLE_PURSUIT: 'DIRECT_PURSUIT',
  TRAIL_TRACK: 'EVIDENCE_TRACK',
  GRAPH_SEARCH: 'SEARCH',
};

/**
 * Graph V2 has no confidence concept of its own, so rather than invent a
 * number this reports the STRENGTH OF THE EVIDENCE the intent is standing on.
 * That is an honest translation: a search frontier really is a weaker reason
 * to be somewhere than a live sighting, and the overlay showing 0.25 while the
 * pursuer sweeps an empty trunk is telling the tester something true.
 */
const CONFIDENCE_BY_SOURCE: Record<TargetSource, number> = {
  SENSED_SPARK: 1,
  LAST_SIGHTING_GRACE: 0.85,
  SENSED_TRAIL: 0.6,
  REMEMBERED_TRAIL: 0.5,
  SEARCH_FRONTIER: 0.25,
  RUN_START_CUE: 0.2,
};

const REASON_BY_SOURCE: Record<TargetSource, string> = {
  SENSED_SPARK: 'DIRECT_TARGET_VISIBLE',
  LAST_SIGHTING_GRACE: 'DIRECT_TARGET_HELD',
  SENSED_TRAIL: 'FOLLOW_NEWEST_TRAIL',
  REMEMBERED_TRAIL: 'FOLLOW_NEWEST_TRAIL',
  SEARCH_FRONTIER: 'SEARCH_FRONTIER_ADVANCE',
  RUN_START_CUE: 'RUN_START_CUE',
};

function explain(source: TargetSource, state: BrainState, ageMs: number | null): string {
  switch (source) {
    case 'SENSED_SPARK': return 'The Spark is being perceived right now; closing on where it is.';
    case 'LAST_SIGHTING_GRACE':
      return 'Perception flickered at the edge of the radius; riding out the dropout on the last true sample rather than declaring a loss.';
    case 'SENSED_TRAIL':
    case 'REMEMBERED_TRAIL':
      return `Following the freshest unspent trail lead${ageMs === null ? '' : `, ${(ageMs / 1000).toFixed(1)}s old`}.`;
    case 'SEARCH_FRONTIER':
      return `Nothing perceived and no lead left; sweeping the search frontier outward from ${state.search?.anchorNodeId ?? 'the anchor'}.`;
    case 'RUN_START_CUE':
      return 'Nothing has been perceived yet; heading for where the run began.';
    default: return 'No stated reason.';
  }
}

/** Translate the lab's general observation into the one this Brain speaks. */
function toBrainObservation(observation: PursuerObservation): BrainObservation {
  const contact = observation.perception.directContact;
  return {
    nowMs: observation.nowMs,
    pursuerPosition: { x: observation.self.x, y: observation.self.y },
    pursuerNode: observation.self.node,
    pursuerArrivedAtIntent: observation.self.arrivedAtTarget,
    graph: observation.graph,
    sensedSpark: contact
      ? { x: contact.x, y: contact.y, vx: contact.vx, vy: contact.vy, sightingTMs: contact.sightingTMs }
      : null,
    sensedTrailFragments: observation.perception.trailFragments,
    runStartOrigin: observation.runStartOrigin,
  };
}

class GraphV2BrainInstance implements BrainInstance {
  private state: BrainState = createBrainState();
  private lastCommitmentKey = '';

  constructor(private tuning: GraphV2Tuning) {}

  reset(): void {
    this.state = createBrainState();
    this.lastCommitmentKey = '';
  }

  decide(observation: PursuerObservation): PursuerDecision {
    const result = updateBrain(this.state, toBrainObservation(observation), this.tuning);
    this.state = result.state;
    const intent = result.intent;
    const commitment = result.state.commitment;
    const key = commitment ? `${commitment.mode}:${commitment.evidenceKey}` : 'none';
    this.lastCommitmentKey = key;

    return {
      mode: MODE_MAP[intent.mode] ?? 'SEARCH',
      modeLabel: intent.mode,
      target: { kind: 'POINT', point: intent.targetPoint },
      confidence: CONFIDENCE_BY_SOURCE[intent.targetSource] ?? 0.25,
      // A commitment that has just ENDED is the more informative reason: it
      // says why the pursuer stopped doing what it was doing, which is the
      // question a tester watching it turn away actually has.
      reasonCode: result.evidence.commitmentEndReason ?? REASON_BY_SOURCE[intent.targetSource],
      commitmentId: key,
      explanation: explain(intent.targetSource, result.state, intent.trailFragmentAgeMs),
    };
  }

  inspect(): BrainInspection {
    const state = this.state;
    const now = state.lastSighting?.sightingTMs ?? 0;
    return {
      // Graph V2 holds no distribution — it holds one committed intent. Saying
      // so plainly is more useful than fabricating a belief cloud it does not
      // have, and it is itself a finding about the architecture.
      belief: state.search ? [{ node: state.search.anchorNodeId, weight: 1 }] : [],
      evidence: [
        ...(state.lastSighting
          ? [{ label: `sighting (${state.lastSighting.x.toFixed(0)},${state.lastSighting.y.toFixed(0)})`, ageMs: 0, consumed: false }]
          : []),
        ...state.rememberedFragments.map((fragment) => ({
          label: `trail ${fragment.id}`,
          ageMs: Math.max(0, now - fragment.tEndMs),
          consumed: (state.consumedUntilMsByFragment[fragment.id] ?? -Infinity) >= fragment.tEndMs,
        })),
      ],
      notes: [
        `commitment ${this.lastCommitmentKey}`,
        `sensed run ${state.sensedRunTicks} ticks · unsensed run ${state.unsensedRunTicks} ticks`,
        state.search
          ? `search anchor ${state.search.anchorNodeId}, last target ${state.search.lastTargetNode ?? '—'}`
          : 'no search episode',
      ],
    };
  }
}

const PARAMETERS = [
  { path: 'lossConfirmationTicks', label: 'Loss confirmation', min: 1, max: 240, step: 1, integer: true, unit: ' ticks',
    reason: 'Consecutive unperceived ticks before a loss is confirmed. Derived from measured one-tick boundary chatter; three was that with margin.' },
  { path: 'acquireConfirmationTicks', label: 'Acquire confirmation', min: 1, max: 240, step: 1, integer: true, unit: ' ticks',
    reason: 'Ticks a new sighting must hold before it may preempt an existing commitment. Derived from a measured 3-tick self-sustained flutter, doubled.' },
  { path: 'trailExhaustionConfirmationTicks', label: 'Trail exhaustion', min: 1, max: 240, step: 1, integer: true, unit: ' ticks',
    reason: 'Ticks a committed lead must offer nothing before it is declared spent. Derived from a measured worst run of 2, tripled.' },
  { path: 'leadPreemptionConfirmationTicks', label: 'Lead preemption', min: 1, max: 240, step: 1, integer: true, unit: ' ticks',
    reason: 'Ticks a resurrected lead must look actionable before it may interrupt. Applying this to ALL leads made trail tracking unreachable — measured, and reverted.' },
  { path: 'maxRememberedFragments', label: 'Remembered fragments', min: 1, max: 256, step: 1, integer: true, unit: '',
    reason: 'Bounded memory. Raising it is the cheapest legitimate persistence experiment this Brain offers.' },
  { path: 'arrivalEpsilon', label: 'Arrival epsilon', min: 0.5, max: 64, step: 0.5, unit: ' u',
    reason: 'How close counts as reaching a target point, alongside the chassis arrival signal.' },
] as const;

export const BRAIN_GRAPH_V2_BASELINE: PursuerBrainDefinition<GraphV2Tuning> = {
  id: 'A_GRAPH_V2_BASELINE',
  label: 'A · GRAPH V2 BASELINE',
  description:
    'The shipped pursuer, frozen at the production tuning. The reference every other '
    + 'candidate is measured against, and the only Brain here whose behaviour is already '
    + 'human-accepted. Not tunable on purpose: a baseline somebody has edited is not one.',
  supportedPerception: ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT', 'P3_ORACLE'],
  defaultConfig: GRAPH_V2_BASELINE_TUNING,
  parameters: [],
  productionEligible: true,
  create: () => new GraphV2BrainInstance(GRAPH_V2_BASELINE_TUNING),
};

export const BRAIN_GRAPH_V2_TUNABLE: PursuerBrainDefinition<GraphV2Tuning> = {
  id: 'B_GRAPH_V2_TUNABLE',
  label: 'B · GRAPH V2 TUNABLE',
  description:
    'The same implementation as Brain A with its six derived windows exposed. Every one '
    + 'of them was derived from a measured oscillation rather than chosen, so moving one '
    + 'is an experiment and its default is not an accident.',
  supportedPerception: ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT', 'P3_ORACLE'],
  defaultConfig: { ...GRAPH_V2_BASELINE_TUNING },
  parameters: PARAMETERS,
  productionEligible: true,
  create: (config) => new GraphV2BrainInstance({ ...GRAPH_V2_BASELINE_TUNING, ...config }),
};
