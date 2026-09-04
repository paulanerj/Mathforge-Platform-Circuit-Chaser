/**
 * PARITY HARNESS COPY of the accepted Lab driver. TEST SUPPORT ONLY.
 *
 * Production's real wiring is `runtime/graphPursuerController.ts`. This file
 * exists so the transplanted decision code can be driven through EXACTLY the
 * sequence the accepted Lab behaviour hash was computed over, byte for byte,
 * without the production controller's extra responsibilities (dynamic
 * extension, view-scale rebuilds, restart) perturbing the comparison. It is
 * imported only by `testing/` and by tests; `pursuerV2Architecture.test.ts`
 * asserts that no production runtime file reaches it.
 *
 * Transplanted verbatim from Lab f22acf6 `src/sim/brainDriver.ts`; only the
 * import paths differ.
 *
 * ── original header ──
 * THE ONE PLACE THE BRAIN IS WIRED TO THE CHASSIS.
 *
 * LAB 03A-R2 extracted this from `sandbox/sandbox.ts` for one reason: the
 * defect under repair is a CLOSED LOOP — the Brain's chosen target changes
 * where the chassis goes, which changes what the sensors see, which changes
 * the Brain's next target. A regression that drives the Brain against a
 * frozen, precomputed pursuer path cannot see that loop at all, and the
 * 03A-R1 suite's failure to reject a 19-second live oscillation is exactly
 * what that blind spot costs.
 *
 * So the live Human Sandbox and the closed-loop regression runner now share
 * this function verbatim. There is no second copy of the wiring to drift.
 *
 * What lives here: build the firewalled observation, run the pure decision
 * seam, and apply the RETARGET GATE. What does NOT live here: stepping the
 * chassis (the caller owns the clock) and event logging (the caller owns its
 * own log).
 */

import type { GraphPursuerV2 } from '../graph/graphPursuerV2';
import { nearestNode } from '../graph/graphRouting';
import type { PlayerTrail } from '../contracts/trail';
import { buildBrainObservation } from '../brain/sensors';
import { createBrainState, updateBrain } from '../brain/graphBrainV1';
import type {
  BrainState, BrainObservation, BrainEvidence, PursuitIntent, SensedSpark, RunStartOrigin,
} from '../brain/observation';

export interface BrainDriver {
  brainState: BrainState;
  previousSensedSpark: SensedSpark | null;
  /** The node last actually commanded to the chassis, for the retarget gate. */
  lastCommandedNode: string | null;
}

export function createBrainDriver(): BrainDriver {
  return { brainState: createBrainState(), previousSensedSpark: null, lastCommandedNode: null };
}

export interface BrainDriverInput {
  nowMs: number;
  dtMs: number;
  pursuer: GraphPursuerV2;
  /** Last frame's chassis evidence, or null on the very first tick. */
  lastGraphEvidence: { node: string; arrived: boolean } | null;
  /** SIMULATION-ONLY. Reaches the firewall gate and goes no further. */
  hiddenLearnerPosition: { x: number; y: number };
  /** SIMULATION-ONLY, full retention. Spatially clipped before the Brain sees it. */
  groundTruthTrail: PlayerTrail;
  runStartOrigin: RunStartOrigin;
}

export interface BrainDriverResult {
  observation: BrainObservation;
  intent: PursuitIntent;
  evidence: BrainEvidence;
  projectedNode: string;
  /** True on the ticks the chassis was actually re-targeted. */
  retargeted: boolean;
  /** Null unless retargeted; false means the graph had no route. */
  routeFound: boolean | null;
}

/**
 * One Brain tick, wired to the chassis.
 *
 * THE RETARGET GATE: the chassis is only re-targeted on the first tick, when
 * the intent's projected graph node actually changes, or once the chassis
 * reports arrival. Re-issuing a continuously-drifting evidence point every
 * frame would redraw its entry-leg lane offset every frame (a fresh random
 * draw per `setTarget` call), reproducing the on-rails wobble LAB 02A fixed.
 */
export function driveBrainOnce(driver: BrainDriver, input: BrainDriverInput): BrainDriverResult {
  const observation = buildBrainObservation({
    nowMs: input.nowMs,
    dtMs: input.dtMs,
    pursuerPosition: input.pursuer.position,
    pursuerNode: input.lastGraphEvidence
      ? input.lastGraphEvidence.node
      : nearestNode(input.pursuer.graph, input.pursuer.position).id,
    pursuerArrivedAtIntent: input.lastGraphEvidence ? input.lastGraphEvidence.arrived : false,
    graph: input.pursuer.graph,
    hiddenLearnerPosition: input.hiddenLearnerPosition,
    groundTruthTrail: input.groundTruthTrail,
    previousSensedSpark: driver.previousSensedSpark,
    runStartOrigin: input.runStartOrigin,
  });

  const { state, intent, evidence } = updateBrain(driver.brainState, observation);
  driver.brainState = state;
  driver.previousSensedSpark = observation.sensedSpark;

  const projectedNode = nearestNode(input.pursuer.graph, intent.targetPoint).id;
  const arrived = input.lastGraphEvidence ? input.lastGraphEvidence.arrived : false;
  const firstTick = driver.lastCommandedNode === null;
  let retargeted = false;
  let routeFound: boolean | null = null;
  if (firstTick || projectedNode !== driver.lastCommandedNode || arrived) {
    const route = input.pursuer.setTarget(intent.targetPoint);
    driver.lastCommandedNode = projectedNode;
    retargeted = true;
    routeFound = route !== null;
  }

  return { observation, intent, evidence, projectedNode, retargeted, routeFound };
}
