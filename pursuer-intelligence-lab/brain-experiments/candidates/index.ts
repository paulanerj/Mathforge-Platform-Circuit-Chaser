/**
 * EXTERNAL BRAIN CANDIDATES.
 *
 * Add yours here, and nowhere else:
 *
 *   1. copy `brain-experiments/TEMPLATE/` to `brain-experiments/candidates/<your-name>/`
 *   2. implement `PursuerBrainDefinition` in its `index.ts`
 *   3. import it below and add it to the array
 *
 * That is the whole integration. You do not touch the renderer, the learner,
 * the board, the simulation, or any other Brain. If you find yourself editing
 * one of those, the contract has a gap in it — say so in your report rather
 * than working around it, because the gap is more valuable than the workaround.
 */

import type { PursuerBrainDefinition } from '../../src/pursuer/contract/brain';

export const EXTERNAL_CANDIDATES: readonly PursuerBrainDefinition[] = [
  // e.g. BRAIN_MY_NEW_HUNTER,
];
