/**
 * How big the GRAPH_V2 body may be and still have four channels.
 *
 * LAB 02A found the exterior trunks uninhabitable at 90% when the pursuer was
 * sized like the learner: A and D came to 0.5 units. That was a conclusion
 * about a *body*, not about the board, and this module tests the difference —
 * the graph actor gets its own radius, and the learner's is untouched.
 *
 * The binding constraint is the exterior lane. Between the world edge and the
 * outermost card there is a fixed amount of air; the actor needs a radius of it
 * on each side, and whatever is left has to clear the minimum passable gap:
 *
 *     available = columns[0] − platformWidth/2        (world edge is x = 0)
 *     lane      = available − 2r  ≥  MIN_LANE_WIDTH
 *     ⟹  r ≤ (available − MIN_LANE_WIDTH) / 2
 *
 * The interior lanes are far wider and never bind at any supported framing, but
 * they are computed rather than assumed, so a future board that changes that
 * cannot slip past.
 */

import type { GraphWorld } from '../../world/graphWorld';
import { MIN_LANE_WIDTH } from './pursuitGraph';

export interface RadiusSolution {
  /** DIAGNOSTIC ONLY. Carried through from the world; nothing decides on it. */
  percent: number;
  /** The learner's radius at this framing. Never changed by any of this. */
  learnerRadius: number;
  /** Largest graph-actor radius admitting all four trunks. */
  exactMax: number;
  /** What the engine actually uses: exactMax floored to 0.01 for a safe margin. */
  chosen: number;
  /** Which lane forced the answer. */
  bindingLane: 'exterior' | 'interior';
  /** Resulting lane widths at `chosen`. */
  lanes: { A: number; B: number; C: number; D: number };
  /** chosen / learnerRadius, as a readability check on the drawn body. */
  relativeToLearner: number;
  feasible: boolean;
}

/** Air between the world edge and the outermost card, at this framing. */
function exteriorAvailable(world: GraphWorld) {
  return world.columns[0] - world.platformWidth / 2;
}

/** Air between two adjacent cards. */
function interiorAvailable(world: GraphWorld) {
  return (world.columns[1] - world.columns[0]) - world.platformWidth;
}

/**
 * PRODUCTION ADAPTATION. In the Lab this took a framing PERCENT and rebuilt
 * the board from `sim/framing.ts`. Production has no business re-deriving a
 * board it already owns, and pinning a percent here is exactly the hard-coding
 * the 04A brief forbids — so it now solves from whatever world the running
 * game actually has. The arithmetic below is untouched.
 */
export function solveGraphActorRadius(world: GraphWorld): RadiusSolution {
  const exterior = exteriorAvailable(world);
  const interior = interiorAvailable(world);

  const exteriorMax = (exterior - MIN_LANE_WIDTH) / 2;
  const interiorMax = (interior - MIN_LANE_WIDTH) / 2;
  const exactMax = Math.min(exteriorMax, interiorMax);

  // Floored rather than rounded: at exactly the maximum the lane is 6.000 and a
  // floating-point crumb the wrong way fails its own admission test.
  const chosen = Math.floor(exactMax * 100) / 100;
  const feasible = chosen > 0;

  const lanes = {
    A: exterior - 2 * chosen,
    B: interior - 2 * chosen,
    C: interior - 2 * chosen,
    D: exterior - 2 * chosen,
  };

  return {
    percent: world.percent,
    learnerRadius: world.playerRadius,
    exactMax,
    chosen,
    bindingLane: exteriorMax <= interiorMax ? 'exterior' : 'interior',
    lanes,
    relativeToLearner: chosen / world.playerRadius,
    feasible,
  };
}

/**
 * The radius GRAPH_V2 should run with on a given live board.
 *
 * Falls back to the learner's own radius only if the board is so narrow that
 * no four-trunk body fits — a degenerate case the graph builder then rejects
 * on its own terms rather than silently pursuing with an impossible body.
 */
export function graphActorRadiusFor(world: GraphWorld): number {
  const solution = solveGraphActorRadius(world);
  return solution.feasible ? solution.chosen : world.playerRadius;
}
