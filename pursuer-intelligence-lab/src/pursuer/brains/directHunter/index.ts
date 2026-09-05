/**
 * BRAIN C — DIRECT HUNTER. A deliberately simple reference.
 *
 * This exists to answer one question the tester's complaint raises directly:
 *
 *   "It feels less like AI or a smart opponent and more like tag where the
 *    chaser has its eyes closed."
 *
 * Graph V2 is careful. It confirms a loss over three ticks, confirms a
 * reacquisition over six, confirms trail exhaustion over six more, and holds a
 * strategic commitment through perception flutter. Every one of those windows
 * was derived from a measured oscillation and each is defensible on its own.
 * The open question is whether their SUM is what reads as indecision from the
 * player's chair.
 *
 * So this Brain has none of them. Its whole policy is four sentences:
 *
 *   1. If the learner is perceived, go to where it is. Now. Every tick.
 *   2. If perception drops, go to where it last was, and keep going until you
 *      get there.
 *   3. If you get there and it is not there, follow the freshest trail you can
 *      still smell.
 *   4. If there is no trail either, sweep the graph outward from the freshest
 *      evidence you have, and never below the floor the learner started on.
 *
 * It is NOT automatically a production candidate — a Brain with no
 * confirmation windows is a Brain that will chatter at a sensor boundary, and
 * that chatter is exactly what 03A-R2 was built to eliminate. It is here to
 * measure how much of the "eyes closed" feeling is caused by deliberation
 * rather than by blindness. If this feels dramatically better, the windows are
 * the problem. If it feels the same, they are not, and the lab has saved
 * somebody a week of tuning them.
 */

import type { PursuerBrainDefinition, BrainInstance } from '../../contract/brain';
import type { PursuerObservation } from '../../contract/observation';
import type { PursuerDecision, BrainInspection } from '../../contract/decision';
import { nextSearchTarget, type SearchCursorState } from '../../graph/frontierSearch';

export interface DirectHunterConfig {
  /**
   * How long a lost sighting is worth walking to. After this it is stale
   * enough that the trail and the frontier are better bets.
   */
  sightingMemoryMs: number;
  /** How close counts as having reached a remembered point. */
  arrivalEpsilon: number;
  /**
   * How much fresher a trail lead must be than the last sighting before it
   * wins. Zero means strict recency; a positive value biases toward the
   * sighting, which is the more precise of the two.
   */
  trailPreferenceMarginMs: number;
}

const DEFAULTS: DirectHunterConfig = {
  sightingMemoryMs: 6000,
  arrivalEpsilon: 24,
  trailPreferenceMarginMs: 0,
};

interface Sighting { x: number; y: number; tMs: number }

class DirectHunterInstance implements BrainInstance {
  private lastSighting: Sighting | null = null;
  private sightingReached = false;
  private search: SearchCursorState | null = null;
  private commitment = 'none';
  private lastNote = '';

  constructor(private config: DirectHunterConfig) {}

  reset(): void {
    this.lastSighting = null;
    this.sightingReached = false;
    this.search = null;
    this.commitment = 'none';
    this.lastNote = '';
  }

  decide(observation: PursuerObservation): PursuerDecision {
    const { perception, self, nowMs } = observation;
    const here = { x: self.x, y: self.y };

    // ── 1. PERCEIVED: go there. No confirmation, no hesitation. ──────────
    if (perception.directContact) {
      const contact = perception.directContact;
      this.lastSighting = { x: contact.x, y: contact.y, tMs: contact.sightingTMs };
      this.sightingReached = false;
      // A search episode does not survive an actual sighting. Nothing it could
      // have been doing is more useful than the learner's real position.
      this.search = null;
      this.commitment = 'direct';
      this.lastNote = contact.live ? 'live contact' : `held contact, ${contact.ageMs.toFixed(0)}ms old`;
      return {
        mode: 'DIRECT_PURSUIT',
        modeLabel: contact.live ? 'DIRECT' : 'DIRECT (held)',
        target: { kind: 'POINT', point: { x: contact.x, y: contact.y } },
        confidence: contact.live ? 1 : 0.8,
        reasonCode: contact.live ? 'DIRECT_TARGET_VISIBLE' : 'DIRECT_TARGET_HELD',
        commitmentId: 'direct',
        explanation: contact.live
          ? 'The Spark is in view. Closing on it directly.'
          : `Perception dropped ${contact.ageMs.toFixed(0)}ms ago; still closing on the last true position.`,
      };
    }

    const freshestTrail = this.freshestUnspentTrail(observation);
    const sighting = this.usableSighting(nowMs);

    // ── 2. LOST: walk to the last known position, and finish the journey. ─
    // "Finish the journey" is the whole difference from Graph V2 here. A
    // half-completed walk to where the learner was is worse than not starting:
    // it spends the time and arrives nowhere.
    if (sighting) {
      const trailIsNewer = freshestTrail
        && freshestTrail.tMs > sighting.tMs + this.config.trailPreferenceMarginMs;
      if (!trailIsNewer) {
        const reached = Math.hypot(sighting.x - here.x, sighting.y - here.y) <= this.config.arrivalEpsilon;
        if (reached) {
          this.sightingReached = true;
          this.lastNote = 'reached the last sighting; nothing there';
        } else {
          this.commitment = `sighting:${sighting.tMs}`;
          this.lastNote = `walking to the last sighting, ${((nowMs - sighting.tMs) / 1000).toFixed(1)}s old`;
          return {
            mode: 'EVIDENCE_TRACK',
            modeLabel: 'TO LAST SIGHTING',
            target: { kind: 'POINT', point: { x: sighting.x, y: sighting.y } },
            confidence: Math.max(0.3, 1 - (nowMs - sighting.tMs) / this.config.sightingMemoryMs),
            reasonCode: 'SEARCH_LAST_SIGHTING',
            commitmentId: this.commitment,
            explanation: `Lost sight ${((nowMs - sighting.tMs) / 1000).toFixed(1)}s ago. Going to where it was, and not turning aside before arriving.`,
          };
        }
      }
    }

    // ── 3. Follow the freshest trail still detectable. ───────────────────
    if (freshestTrail) {
      this.commitment = `trail:${freshestTrail.id}`;
      this.lastNote = `following trail ${freshestTrail.id}`;
      return {
        mode: 'EVIDENCE_TRACK',
        modeLabel: 'TRAIL',
        target: { kind: 'POINT', point: { x: freshestTrail.x, y: freshestTrail.y } },
        confidence: 0.55,
        reasonCode: 'FOLLOW_NEWEST_TRAIL',
        commitmentId: this.commitment,
        explanation: 'No sight of the Spark. Following the freshest trail I can still detect, toward its newest end.',
      };
    }

    // ── 4. Sweep outward from the freshest evidence there is. ────────────
    const anchor = this.lastSighting
      ?? { x: observation.runStartOrigin.x, y: observation.runStartOrigin.y, tMs: 0 };
    const step = nextSearchTarget(
      observation.graph, { x: anchor.x, y: anchor.y }, this.search, nowMs,
      // Never below the floor the learner started on: the connector levels
      // beneath row 0 exist so the PURSUER can spawn there, and the learner
      // can never be in them. Searching them is provably wasted time.
      observation.runStartOrigin.row ?? undefined,
    );
    this.search = step.nextCursor;
    const node = observation.graph.nodes.get(step.targetNode);
    this.commitment = `search:${step.targetNode}`;
    this.lastNote = `sweeping from ${step.nextCursor.anchorNodeId}, tier ${step.tier}`;
    return {
      mode: 'SEARCH',
      modeLabel: 'SWEEP',
      target: { kind: 'NODE', node: step.targetNode },
      confidence: Math.max(0.1, 0.4 - step.tier * 0.05),
      reasonCode: 'SEARCH_FRONTIER_ADVANCE',
      commitmentId: this.commitment,
      explanation: node
        ? `Nothing to go on. Sweeping outward from the freshest evidence — ring ${step.tier}, ${step.targetNode}.`
        : 'Nothing to go on. Sweeping the graph outward.',
    };
  }

  /** The newest end of the newest trail fragment currently detectable. */
  private freshestUnspentTrail(observation: PursuerObservation) {
    let best: { id: string; x: number; y: number; tMs: number } | null = null;
    for (const fragment of observation.perception.trailFragments) {
      const head = fragment.points[fragment.points.length - 1];
      if (!head) continue;
      if (!best || fragment.tEndMs > best.tMs) {
        best = { id: fragment.id, x: head.x, y: head.y, tMs: fragment.tEndMs };
      }
    }
    return best;
  }

  private usableSighting(nowMs: number): Sighting | null {
    if (!this.lastSighting || this.sightingReached) return null;
    if (nowMs - this.lastSighting.tMs > this.config.sightingMemoryMs) return null;
    return this.lastSighting;
  }

  inspect(): BrainInspection {
    return {
      belief: this.search ? [{ node: this.search.anchorNodeId, weight: 1 }] : [],
      evidence: this.lastSighting
        ? [{ label: `sighting (${this.lastSighting.x.toFixed(0)},${this.lastSighting.y.toFixed(0)})`, ageMs: 0, consumed: this.sightingReached }]
        : [],
      notes: [`commitment ${this.commitment}`, this.lastNote],
    };
  }
}

export const BRAIN_DIRECT_HUNTER: PursuerBrainDefinition<DirectHunterConfig> = {
  id: 'C_DIRECT_HUNTER',
  label: 'C · DIRECT HUNTER',
  description:
    'A deliberately simple reference with no confirmation windows at all: if it can '
    + 'perceive you it comes straight at you, and if it loses you it finishes the walk to '
    + 'where you were before considering anything else. Not automatically a production '
    + 'candidate — it will chatter at a sensor boundary. Its job is to measure how much of '
    + 'the "eyes closed" feeling comes from deliberation rather than from blindness.',
  supportedPerception: ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT', 'P3_ORACLE'],
  defaultConfig: DEFAULTS,
  parameters: [
    { path: 'sightingMemoryMs', label: 'Sighting memory', min: 0, max: 30000, step: 250, unit: ' ms',
      reason: 'How long a lost sighting is still worth walking to. Milliseconds, not ticks, so it means the same at any refresh rate.' },
    { path: 'arrivalEpsilon', label: 'Arrival epsilon', min: 2, max: 200, step: 2, unit: ' u',
      reason: 'How close counts as having reached a remembered point. Too small and it can never finish the walk; too large and it gives up early.' },
    { path: 'trailPreferenceMarginMs', label: 'Trail preference margin', min: -5000, max: 5000, step: 100, unit: ' ms',
      reason: 'How much fresher a trail must be than the last sighting to win. Positive biases toward the sighting, which is the more precise evidence.' },
  ],
  productionEligible: true,
  create: (config) => new DirectHunterInstance({ ...DEFAULTS, ...config }),
};
