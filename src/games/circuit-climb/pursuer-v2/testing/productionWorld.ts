/**
 * TEST SUPPORT — the production board at a given view scale.
 *
 * The running game builds its world by mutating `CONFIG` inside
 * `applyViewScale`, which lives in a React effect and cannot be called from a
 * unit test. This module reproduces that arithmetic from the PRODUCTION
 * geometry authority so tests can ask for "the board at 90%" and get exactly
 * what the running game would have.
 *
 * It is deliberately NOT a second scaling rule: every constant comes from
 * `CIRCUIT_CLIMB_GEOMETRY` and the column centres come from production's own
 * `computeColumnCentres`, the same function `applyViewScale` calls.
 * `pursuerV2Geometry.test.ts` pins this against the runtime's formula, so
 * "reproduces" cannot quietly become "differs".
 */

import {
  CIRCUIT_CLIMB_GEOMETRY,
  computeColumnCentres,
} from '../../geometry/circuitClimbGeometry';
import { graphWorldFromLiveGeometry, type GraphWorld } from '../runtime/graphWorld';

export type { GraphWorld };

/**
 * The live geometry the runtime's `CONFIG` would hold at `percent`, in the
 * runtime's own representation — columns as FRACTIONS of logicalWidth.
 */
export function productionLiveGeometryAt(percent: number) {
  const clamped = Math.max(80, Math.min(120, Math.round(percent)));
  const zoom = clamped / 100;
  const base = CIRCUIT_CLIMB_GEOMETRY;

  const platformWidth = base.platformWidth * (0.98 + 0.02 * zoom);
  const platformHeight = base.platformHeight * Math.pow(zoom, 0.48);
  const playerRadius = base.playerRadius * zoom;
  const routePlatformPadding = base.routePlatformPadding;
  const logicalWidth = base.logicalWidth;

  const columns = computeColumnCentres({
    playerRadius,
    routePlatformPadding,
    logicalWidth,
    platformWidth,
  }).map((centre) => centre / logicalWidth);

  return {
    logicalWidth,
    rowGap: base.rowGap * zoom,
    platformWidth,
    platformHeight,
    playerRadius,
    routePlatformPadding,
    columns,
  };
}

/** The production board at `percent`, as GRAPH_V2 consumes it. */
export function productionGraphWorldAt(percent: number): GraphWorld {
  return graphWorldFromLiveGeometry(productionLiveGeometryAt(percent), percent);
}
