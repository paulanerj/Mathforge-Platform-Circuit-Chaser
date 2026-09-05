/**
 * THE BOARD, AS THE PURSUIT GRAPH CONSUMES IT.
 *
 * EXTRACTED from production `src/games/circuit-climb/pursuer-v2/runtime/graphWorld.ts`
 * at commit d7a8115. Adapted only in that the lab has no live React `CONFIG`
 * to read: it builds a world from a framing percentage using production's own
 * geometry authority, which is what `productionWorld.ts` did on the production
 * side for tests.
 *
 * The one subtlety carried across verbatim: production stores column centres
 * as FRACTIONS of `logicalWidth`, and multiplying those back out loses the
 * last bit — `(110 / 600) * 600` is `29.051999999999992`. Absolute centres are
 * therefore re-derived through `computeColumnCentres`, the same function
 * production calls, so the lab board is bit-identical to the product's.
 */

import { CIRCUIT_CLIMB_GEOMETRY, computeColumnCentres } from './circuitClimbGeometry';

export interface GraphWorld {
  logicalWidth: number;
  rowGap: number;
  platformWidth: number;
  platformHeight: number;
  playerRadius: number;
  routePlatformPadding: number;
  /** Absolute x of the platform column centres. */
  columns: number[];
  /** Framing percent. DIAGNOSTIC ONLY — no graph decision reads it. */
  percent: number;
}

export interface LiveGameGeometry {
  logicalWidth: number;
  rowGap: number;
  platformWidth: number;
  platformHeight: number;
  playerRadius: number;
  routePlatformPadding: number;
  columns: readonly number[];
}

export function graphWorldFromLiveGeometry(geometry: LiveGameGeometry, percent = 100): GraphWorld {
  return {
    logicalWidth: geometry.logicalWidth,
    rowGap: geometry.rowGap,
    platformWidth: geometry.platformWidth,
    platformHeight: geometry.platformHeight,
    playerRadius: geometry.playerRadius,
    routePlatformPadding: geometry.routePlatformPadding,
    columns: computeColumnCentres({
      playerRadius: geometry.playerRadius,
      routePlatformPadding: geometry.routePlatformPadding,
      logicalWidth: geometry.logicalWidth,
      platformWidth: geometry.platformWidth,
    }),
    percent,
  };
}

/**
 * The live geometry production's `applyViewScale` would hold at `percent`.
 * Reproduced from `CIRCUIT_CLIMB_GEOMETRY`, not reinvented.
 */
export function liveGeometryAt(percent: number): LiveGameGeometry & { cameraAnchor: number } {
  const clamped = Math.max(80, Math.min(120, Math.round(percent)));
  const zoom = clamped / 100;
  const base = CIRCUIT_CLIMB_GEOMETRY;

  const platformWidth = base.platformWidth * (0.98 + 0.02 * zoom);
  const platformHeight = base.platformHeight * Math.pow(zoom, 0.48);
  const playerRadius = base.playerRadius * zoom;
  const routePlatformPadding = base.routePlatformPadding;
  const logicalWidth = base.logicalWidth;

  return {
    logicalWidth,
    rowGap: base.rowGap * zoom,
    platformWidth,
    platformHeight,
    playerRadius,
    routePlatformPadding,
    columns: computeColumnCentres({ playerRadius, routePlatformPadding, logicalWidth, platformWidth })
      .map((centre) => centre / logicalWidth),
    // Production: lerp(0.585, 0.615, (percent - 80) / 40).
    cameraAnchor: 0.585 + (0.615 - 0.585) * ((clamped - 80) / 40),
  };
}

/** The board at `percent`, exactly as the running game would have it. */
export function graphWorldAt(percent = 100): GraphWorld {
  return graphWorldFromLiveGeometry(liveGeometryAt(percent), percent);
}

export function graphWorldChanged(a: GraphWorld | null, b: GraphWorld): boolean {
  if (!a) return true;
  const differs = (x: number, y: number) => Math.abs(x - y) > 1e-6;
  if (differs(a.rowGap, b.rowGap)) return true;
  if (differs(a.platformWidth, b.platformWidth)) return true;
  if (differs(a.platformHeight, b.platformHeight)) return true;
  if (differs(a.playerRadius, b.playerRadius)) return true;
  if (differs(a.logicalWidth, b.logicalWidth)) return true;
  if (a.columns.length !== b.columns.length) return true;
  return a.columns.some((x, i) => differs(x, b.columns[i]));
}
