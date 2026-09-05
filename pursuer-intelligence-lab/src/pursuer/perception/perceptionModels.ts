/**
 * PERCEPTION MODELS — what the pursuer is allowed to know, as a choice.
 *
 * The human tester's complaint is that the pursuer plays "Marco Polo in a
 * swimming pool": it seems to know roughly where the Spark is and then bumps
 * around with its eyes closed. That has two possible causes and they need
 * separating before anyone tunes anything:
 *
 *   the pursuer is not being TOLD enough, or
 *   the pursuer is being told enough and is THINKING badly.
 *
 * Production hard-codes one perception policy, so the question cannot be
 * asked there. Here it is a parameter. Every model produces the same
 * `PerceptionSnapshot` shape, so a Brain cannot tell which one it is running
 * under except by reading `modelId` — which the oracle-refusal check does, and
 * nothing else should.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * P3_ORACLE IS A CHEATING REFERENCE AND IS NOT PRODUCTION ELIGIBLE.
 * It exists to separate architecture defects: if the same graph, navigation
 * and locomotion still look stupid when the pursuer always knows exactly
 * where the learner is, then perception is not the main problem.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type {
  DirectContact, PerceptionModelId, PerceptionSnapshot, TrailFragment,
} from '../contract/observation';
import type { PursuitGraph } from '../graph/pursuitGraph';
import type { PlayerTrail } from '../graph/trail';
import {
  SPARK_SENSE_RADIUS, deriveTrailSenseRadius, senseTrail, continuityGapFor, deepFreeze,
} from './sensorGeometry';


/**
 * Does the segment a→b cross this rectangle?
 *
 * Written here rather than reusing production's `segmentHitsRect`, and the
 * reason is worth recording: that function is defined only for AXIS-ALIGNED
 * segments — it handles the vertical and horizontal cases and then returns
 * `true` for everything else, because every route leg in Circuit Climb is
 * axis-aligned and "not axis-aligned" is a caller error there. A sight line
 * between two actors is a diagonal, so calling it would report every sight
 * line as blocked, and a line-of-sight model built on it would silently be a
 * blind model. (It was, for one commit. The test caught it.)
 *
 * This is the slab method: clip the parametric segment against each axis pair
 * and see whether any interval survives.
 */
function segmentCrossesRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: { left: number; right: number; top: number; bottom: number },
): boolean {
  let tMin = 0;
  let tMax = 1;
  const clip = (origin: number, delta: number, low: number, high: number): boolean => {
    if (Math.abs(delta) < 1e-9) return origin >= low && origin <= high;
    const t1 = (low - origin) / delta;
    const t2 = (high - origin) / delta;
    const near = Math.min(t1, t2);
    const far = Math.max(t1, t2);
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    return tMin <= tMax;
  };
  if (!clip(a.x, b.x - a.x, rect.left, rect.right)) return false;
  if (!clip(a.y, b.y - a.y, rect.top, rect.bottom)) return false;
  return true;
}

/** Everything a perception model may look at. It sees hidden truth; its OUTPUT does not. */
export interface PerceptionInput {
  nowMs: number;
  dtMs: number;
  pursuerPosition: { x: number; y: number };
  graph: PursuitGraph;
  /** HIDDEN TRUTH. Never returned, never closed over past the call. */
  learnerPosition: { x: number; y: number };
  learnerRow: number;
  /** HIDDEN TRUTH, full retention. Clipped before it reaches the snapshot. */
  groundTruthTrail: PlayerTrail;
  /** Inflated platform rects, for models that care about line of sight. */
  occluders: ReadonlyArray<{ left: number; right: number; top: number; bottom: number }>;
  /** Last tick's snapshot, so a model can retain a lock or derive velocity. */
  previous: PerceptionSnapshot | null;
}

export interface PerceptionModelDefinition<Config = any> {
  id: PerceptionModelId;
  label: string;
  description: string;
  /** Loud, and shown wherever this model is offered. */
  warning?: string;
  productionEligible: boolean;
  defaultConfig: Config;
  parameters: ReadonlyArray<{
    path: string; label: string; min: number; max: number; step: number;
    integer?: boolean; unit?: string; reason: string;
  }>;
  perceive(input: PerceptionInput, config: Config): PerceptionSnapshot;
}

/** Velocity from two AUTHORIZED samples, or a zero vector across a real gap. */
function velocityFrom(
  previous: DirectContact | null | undefined,
  x: number, y: number, nowMs: number, dtMs: number,
): { vx: number; vy: number } {
  if (!previous) return { vx: 0, vy: 0 };
  const gap = nowMs - previous.sightingTMs;
  if (!(gap > 0) || gap > continuityGapFor(dtMs)) return { vx: 0, vy: 0 };
  return { vx: (x - previous.x) / gap, vy: (y - previous.y) / gap };
}

function snapshot(
  modelId: PerceptionModelId,
  directContact: DirectContact | null,
  trailFragments: TrailFragment[],
  directRadius: number,
  trailRadius: number,
  oracleTruth = false,
): PerceptionSnapshot {
  const result: PerceptionSnapshot = {
    modelId, oracleTruth, directContact, trailFragments, directRadius, trailRadius,
  };
  if (directContact) deepFreeze(directContact);
  deepFreeze(trailFragments);
  return result;
}

// ── P0 — CURRENT PRODUCTION INFORMATION MODEL ──────────────────────────────

export interface P0Config { directSenseRadius: number }

export const P0_PRODUCTION: PerceptionModelDefinition<P0Config> = {
  id: 'P0_PRODUCTION',
  label: 'P0 · PRODUCTION',
  description:
    'Faithful reproduction of the shipped information semantics: a hard 260-unit '
    + 'proximity circle for direct perception, and physical trail clipped to a radius '
    + 'derived live from trunk spacing. The comparison baseline for everything else.',
  productionEligible: true,
  defaultConfig: { directSenseRadius: SPARK_SENSE_RADIUS },
  parameters: [{
    path: 'directSenseRadius', label: 'Direct sense radius', min: 20, max: 560, step: 5, unit: ' u',
    reason: 'The board is 600 units wide. At or beyond that the pursuer senses everywhere and the trail and search layers stop running.',
  }],
  perceive(input, config) {
    const trailRadius = deriveTrailSenseRadius(input.graph);
    const fragments = senseTrail(input.groundTruthTrail, input.pursuerPosition, trailRadius, input.nowMs);
    const distance = Math.hypot(
      input.learnerPosition.x - input.pursuerPosition.x,
      input.learnerPosition.y - input.pursuerPosition.y,
    );
    if (distance > config.directSenseRadius) {
      return snapshot('P0_PRODUCTION', null, fragments, config.directSenseRadius, trailRadius);
    }
    const { vx, vy } = velocityFrom(
      input.previous?.directContact, input.learnerPosition.x, input.learnerPosition.y,
      input.nowMs, input.dtMs,
    );
    return snapshot('P0_PRODUCTION', {
      x: input.learnerPosition.x, y: input.learnerPosition.y, vx, vy,
      sightingTMs: input.nowMs, ageMs: 0, live: true,
    }, fragments, config.directSenseRadius, trailRadius);
  },
};

// ── P1 — LONGER / MORE STABLE DIRECT LOCK ──────────────────────────────────

export interface P1Config {
  directSenseRadius: number;
  /** Once locked, contact survives out to this radius. */
  lockRetentionRadius: number;
  /** And for this long after leaving even that. */
  lockGraceMs: number;
}

export const P1_STABLE_LOCK: PerceptionModelDefinition<P1Config> = {
  id: 'P1_STABLE_LOCK',
  label: 'P1 · STABLE LOCK',
  description:
    'Still non-omniscient. Acquiring is as hard as in production, but once acquired the '
    + 'lock is harder to shake: it survives out to a wider radius, and briefly beyond that. '
    + 'Tests whether the pursuer simply drops legitimate perception too readily — the '
    + '"loses the Spark too often" complaint — without giving it anything it could not sense.',
  productionEligible: true,
  defaultConfig: { directSenseRadius: SPARK_SENSE_RADIUS, lockRetentionRadius: 380, lockGraceMs: 900 },
  parameters: [
    { path: 'directSenseRadius', label: 'Acquire radius', min: 20, max: 560, step: 5, unit: ' u',
      reason: 'How close the learner must come to be noticed at all. Same meaning as production.' },
    { path: 'lockRetentionRadius', label: 'Retain radius', min: 20, max: 560, step: 5, unit: ' u',
      reason: 'How far the learner may go before an existing lock breaks. Below the acquire radius this model degenerates to P0.' },
    { path: 'lockGraceMs', label: 'Lock grace', min: 0, max: 4000, step: 50, unit: ' ms',
      reason: 'How long a broken lock is still reported, as an ageing contact. Milliseconds, not frames, so it means the same at any refresh rate.' },
  ],
  perceive(input, config) {
    const trailRadius = deriveTrailSenseRadius(input.graph);
    const fragments = senseTrail(input.groundTruthTrail, input.pursuerPosition, trailRadius, input.nowMs);
    const distance = Math.hypot(
      input.learnerPosition.x - input.pursuerPosition.x,
      input.learnerPosition.y - input.pursuerPosition.y,
    );
    const previous = input.previous?.directContact ?? null;
    const hadLock = previous !== null;
    const retain = Math.max(config.directSenseRadius, config.lockRetentionRadius);

    if (distance <= config.directSenseRadius || (hadLock && distance <= retain)) {
      const { vx, vy } = velocityFrom(previous, input.learnerPosition.x, input.learnerPosition.y,
        input.nowMs, input.dtMs);
      return snapshot('P1_STABLE_LOCK', {
        x: input.learnerPosition.x, y: input.learnerPosition.y, vx, vy,
        sightingTMs: input.nowMs, ageMs: 0, live: true,
      }, fragments, config.directSenseRadius, trailRadius);
    }

    // Out of range. Hold the LAST TRUE SAMPLE, ageing, for the grace window —
    // never a fresh position, and clearly marked as not live.
    if (previous && input.nowMs - previous.sightingTMs <= config.lockGraceMs) {
      return snapshot('P1_STABLE_LOCK', {
        x: previous.x, y: previous.y, vx: previous.vx, vy: previous.vy,
        sightingTMs: previous.sightingTMs,
        ageMs: input.nowMs - previous.sightingTMs,
        live: false,
      }, fragments, config.directSenseRadius, trailRadius);
    }
    return snapshot('P1_STABLE_LOCK', null, fragments, config.directSenseRadius, trailRadius);
  },
};

// ── P2 — LINE OF SIGHT ─────────────────────────────────────────────────────

export interface P2Config { visionRadius: number }

export const P2_LINE_OF_SIGHT: PerceptionModelDefinition<P2Config> = {
  id: 'P2_LINE_OF_SIGHT',
  label: 'P2 · LINE OF SIGHT',
  description:
    'The pursuer SEES rather than senses proximity: the learner is perceived when it is '
    + 'within the vision radius AND no platform stands between them. A wider radius than '
    + 'production, but a real occlusion rule, so hiding behind the board still works. '
    + 'Research only — this is a change to the game\'s information rules, not a tuning.',
  productionEligible: true,
  defaultConfig: { visionRadius: 520 },
  parameters: [{
    path: 'visionRadius', label: 'Vision radius', min: 60, max: 560, step: 10, unit: ' u',
    reason: 'How far sight carries when nothing is in the way. Bounded below the 600-unit board width so the far corner is never visible.',
  }],
  perceive(input, config) {
    const trailRadius = deriveTrailSenseRadius(input.graph);
    const fragments = senseTrail(input.groundTruthTrail, input.pursuerPosition, trailRadius, input.nowMs);
    const distance = Math.hypot(
      input.learnerPosition.x - input.pursuerPosition.x,
      input.learnerPosition.y - input.pursuerPosition.y,
    );
    const blocked = distance > config.visionRadius
      || input.occluders.some((rect) => segmentCrossesRect(input.pursuerPosition, input.learnerPosition, rect));
    if (blocked) return snapshot('P2_LINE_OF_SIGHT', null, fragments, config.visionRadius, trailRadius);

    const { vx, vy } = velocityFrom(input.previous?.directContact, input.learnerPosition.x,
      input.learnerPosition.y, input.nowMs, input.dtMs);
    return snapshot('P2_LINE_OF_SIGHT', {
      x: input.learnerPosition.x, y: input.learnerPosition.y, vx, vy,
      sightingTMs: input.nowMs, ageMs: 0, live: true,
    }, fragments, config.visionRadius, trailRadius);
  },
};

// ── P3 — ORACLE. CHEATING REFERENCE. NOT PRODUCTION ELIGIBLE. ──────────────

export const P3_ORACLE: PerceptionModelDefinition<Record<string, never>> = {
  id: 'P3_ORACLE',
  label: 'P3 · ORACLE — CHEATING REFERENCE',
  description:
    'The pursuer always knows exactly where the learner is. DIAGNOSTIC ONLY. Its purpose '
    + 'is to separate architecture defects: if the same graph, navigation and locomotion '
    + 'still look stupid under perfect information, perception is not the main problem; '
    + 'if the pursuit suddenly looks excellent, the information and belief model is.',
  warning: 'ORACLE — CHEATING REFERENCE — NOT PRODUCTION ELIGIBLE',
  productionEligible: false,
  defaultConfig: {},
  parameters: [],
  perceive(input) {
    const trailRadius = deriveTrailSenseRadius(input.graph);
    const fragments = senseTrail(input.groundTruthTrail, input.pursuerPosition, trailRadius, input.nowMs);
    const { vx, vy } = velocityFrom(input.previous?.directContact, input.learnerPosition.x,
      input.learnerPosition.y, input.nowMs, input.dtMs);
    return snapshot('P3_ORACLE', {
      x: input.learnerPosition.x, y: input.learnerPosition.y, vx, vy,
      sightingTMs: input.nowMs, ageMs: 0, live: true,
    }, fragments, Infinity, trailRadius, true);
  },
};

export const PERCEPTION_MODELS: readonly PerceptionModelDefinition[] = [
  P0_PRODUCTION, P1_STABLE_LOCK, P2_LINE_OF_SIGHT, P3_ORACLE,
];

export function perceptionModelById(id: string): PerceptionModelDefinition | null {
  return PERCEPTION_MODELS.find((model) => model.id === id) ?? null;
}
