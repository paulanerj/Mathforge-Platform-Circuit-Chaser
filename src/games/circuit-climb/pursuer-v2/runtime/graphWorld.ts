/**
 * PRODUCTION ADAPTER — live game geometry, expressed as a graph world.
 *
 * The Pursuer Lab built its board from `sim/framing.ts`, a standalone
 * reimplementation of the runtime's `applyViewScale` that let GRAPH_V2 be
 * developed with no path back to production code. That reimplementation has
 * done its job and does NOT come across: production already owns the
 * authoritative geometry, and a second copy of a scaling rule is exactly the
 * kind of thing that silently drifts.
 *
 * So this module is the single seam where LIVE production geometry becomes a
 * `GraphWorld`. It reads what the running engine actually has — including any
 * view-scale the player has applied — and derives everything else. Nothing
 * here pins a framing percentage: the accepted 90% Lab experiment is a
 * historical detail, not a requirement, and Graph V2 passed multi-geometry
 * closed-loop testing precisely because it is geometry-derived.
 *
 * The one subtlety worth stating: production stores `columns` as FRACTIONS of
 * `logicalWidth`, while the graph needs absolute x. Multiplying those
 * fractions back out is NOT good enough — `(110 / 600) * 600` is
 * 29.051999999999992, not 29.052, and that last-bit difference is visible in a
 * decision stream compared against the accepted Lab. So the absolute centres
 * are re-derived through production's OWN `computeColumnCentres`, the same
 * function `applyViewScale` calls to produce those fractions in the first
 * place. `pursuerV2Geometry.test.ts` pins the two against each other, so this
 * cannot drift into being a second, disagreeing source of column positions.
 */

import { computeColumnCentres } from '../../geometry/circuitClimbGeometry';

/**
 * The board as GRAPH_V2 needs to see it. Field-for-field the shape the
 * accepted Lab chassis consumed, so the transplanted graph code is unchanged.
 */
export interface GraphWorld {
  logicalWidth: number;
  rowGap: number;
  platformWidth: number;
  platformHeight: number;
  playerRadius: number;
  routePlatformPadding: number;
  /** Absolute x of the platform column centres. */
  columns: number[];
  /**
   * Framing percent, when the runtime knows it. DIAGNOSTIC ONLY — no graph
   * decision reads this, and a world built without it behaves identically.
   */
  percent: number;
}

/**
 * The live geometry fields this adapter needs. Deliberately structural rather
 * than an import of the runtime's private `CONFIG` type: the runtime may hold
 * many more fields, and the graph has no business seeing them.
 */
export interface LiveGameGeometry {
  logicalWidth: number;
  rowGap: number;
  platformWidth: number;
  platformHeight: number;
  playerRadius: number;
  routePlatformPadding: number;
  /** Production stores these as fractions of `logicalWidth`. */
  columns: readonly number[];
}

export function graphWorldFromLiveGeometry(
  geometry: LiveGameGeometry,
  percent = 100,
): GraphWorld {
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
 * The runtime's own fractional columns, made absolute. Used only to CHECK the
 * derivation above against what the engine is actually rendering — if these
 * ever disagree, the graph and the board have come apart and the graph is the
 * one that must be corrected.
 */
export function absoluteColumnsFromLiveGeometry(geometry: LiveGameGeometry): number[] {
  return geometry.columns.map((fraction) => fraction * geometry.logicalWidth);
}

/**
 * Whether two worlds differ enough that the graph must be rebuilt.
 *
 * A view-scale change moves every column and row, so the graph the pursuer is
 * standing on stops describing the board. Rebuilding on an exact inequality
 * would rebuild on floating-point noise, hence the epsilon.
 */
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
