/**
 * A TEMPLATE BRAIN.
 *
 * Copy this directory to `brain-experiments/candidates/<your-name>/`, make it
 * do something, and add it to `candidates/index.ts`.
 *
 * As written it is a legal, deterministic, honest Brain that walks toward the
 * learner when it can perceive one and stands still otherwise. It will lose
 * badly. That is deliberate: it is the smallest thing that runs, so you can see
 * it appear in the dropdown before you have written any strategy.
 *
 * Read BRAIN_CONTRACT.md. The rules that actually matter:
 *
 *   - deterministic: use `observation.nowMs`, never `Date.now()`
 *   - stateless across runs: `reset()` returns you to the start
 *   - read only the observation: no imports of the simulation, learner, board
 *   - declare only parameters you actually read
 */

import type { PursuerBrainDefinition, BrainInstance } from '../../src/pursuer/contract/brain';
import type { PursuerObservation } from '../../src/pursuer/contract/observation';
import type { PursuerDecision, BrainInspection } from '../../src/pursuer/contract/decision';

export interface TemplateConfig {
  /** How long a lost sighting is still worth walking to, in milliseconds. */
  memoryMs: number;
}

const DEFAULTS: TemplateConfig = { memoryMs: 5000 };

class TemplateBrain implements BrainInstance {
  private lastSeen: { x: number; y: number; tMs: number } | null = null;

  constructor(private config: TemplateConfig) {}

  reset(): void {
    this.lastSeen = null;
  }

  decide(observation: PursuerObservation): PursuerDecision {
    const contact = observation.perception.directContact;

    if (contact) {
      this.lastSeen = { x: contact.x, y: contact.y, tMs: contact.sightingTMs };
      return {
        mode: 'DIRECT_PURSUIT',
        target: { kind: 'POINT', point: { x: contact.x, y: contact.y } },
        confidence: 1,
        reasonCode: 'DIRECT_TARGET_VISIBLE',
        commitmentId: 'direct',
        explanation: 'I can see the Spark, so I am going to it.',
      };
    }

    if (this.lastSeen && observation.nowMs - this.lastSeen.tMs < this.config.memoryMs) {
      return {
        mode: 'EVIDENCE_TRACK',
        target: { kind: 'POINT', point: { x: this.lastSeen.x, y: this.lastSeen.y } },
        confidence: 0.5,
        reasonCode: 'SEARCH_LAST_SIGHTING',
        commitmentId: `sighting:${this.lastSeen.tMs}`,
        explanation: 'I lost it. Going to where it was.',
      };
    }

    // TODO: this is where your idea goes. Standing still is honest, and losing.
    return {
      mode: 'IDLE',
      target: { kind: 'POINT', point: { x: observation.self.x, y: observation.self.y } },
      confidence: 0,
      reasonCode: 'EVIDENCE_EXHAUSTED',
      commitmentId: 'idle',
      explanation: 'I have nothing to go on and no policy for that yet.',
    };
  }

  /** Optional. Whatever you return here is drawn by the fog-of-war overlay. */
  inspect(): BrainInspection {
    return {
      belief: [],
      evidence: this.lastSeen
        ? [{ label: 'last sighting', ageMs: 0, consumed: false }]
        : [],
      notes: ['template brain — replace me'],
    };
  }
}

export const BRAIN_TEMPLATE: PursuerBrainDefinition<TemplateConfig> = {
  id: 'X_TEMPLATE',
  label: 'X · TEMPLATE',
  description: 'A minimal legal Brain. Walks at what it can see, stands still otherwise.',
  supportedPerception: ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT', 'P3_ORACLE'],
  defaultConfig: DEFAULTS,
  parameters: [
    {
      path: 'memoryMs', label: 'Sighting memory', min: 0, max: 30000, step: 250, unit: ' ms',
      reason: 'How long a lost sighting is still worth walking to. Milliseconds, not ticks, so it means the same at any refresh rate.',
    },
  ],
  productionEligible: true,
  create: (config) => new TemplateBrain({ ...DEFAULTS, ...config }),
};
