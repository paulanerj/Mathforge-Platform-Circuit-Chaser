/**
 * THE REGISTRY — the one place a Brain or a perception model becomes visible
 * to the rest of the lab.
 *
 * Adding a candidate is one import and one array entry. Nothing else in the
 * sandbox — rendering, learner modes, replay, overlays, metrics, fixtures,
 * comparison — needs to know a new Brain exists, which is the property that
 * makes this cheap enough to hand to an inexpensive model.
 *
 * See `brain-experiments/README.md` for the procedure.
 */

import type { PursuerBrainDefinition } from './contract/brain';
import { BRAIN_GRAPH_V2_BASELINE, BRAIN_GRAPH_V2_TUNABLE } from './brains/graphV2/index';
import { BRAIN_DIRECT_HUNTER } from './brains/directHunter/index';
import { PERCEPTION_MODELS, perceptionModelById } from './perception/perceptionModels';
import type { RegistryView } from './config/labConfiguration';
import { EXTERNAL_CANDIDATES } from '../../brain-experiments/candidates/index';

/**
 * Every Brain this build can run.
 *
 * The three built-ins are the baseline, its tunable twin, and the simple
 * reference. Everything after them comes from `brain-experiments/candidates/`,
 * which is where an external model adds its own without touching this file.
 */
export const BRAINS: readonly PursuerBrainDefinition[] = [
  BRAIN_GRAPH_V2_BASELINE,
  BRAIN_GRAPH_V2_TUNABLE,
  BRAIN_DIRECT_HUNTER,
  ...EXTERNAL_CANDIDATES,
];

export function brainById(id: string): PursuerBrainDefinition | null {
  return BRAINS.find((brain) => brain.id === id) ?? null;
}

export { PERCEPTION_MODELS, perceptionModelById };

/** What the configuration validator needs to know about what is registered. */
export const REGISTRY_VIEW: RegistryView = {
  brainIds: BRAINS.map((brain) => brain.id),
  perceptionIds: PERCEPTION_MODELS.map((model) => model.id),
  brainParameters: (brainId) => brainById(brainId)?.parameters ?? [],
  perceptionParameters: (id) => perceptionModelById(id)?.parameters ?? [],
};

/**
 * Whether a Brain/perception pairing could ever be a production candidate.
 *
 * The oracle poisons any pairing it is in, permanently and by design: a result
 * obtained while knowing exactly where the learner is says nothing about a
 * pursuer that does not. The lab marks such runs rather than refusing them —
 * they are the most useful diagnostic here — but nothing carrying this flag
 * can be proposed for integration.
 */
export function productionEligible(brainId: string, perceptionModelId: string): boolean {
  const brain = brainById(brainId);
  const model = perceptionModelById(perceptionModelId);
  return Boolean(brain?.productionEligible && model?.productionEligible);
}
