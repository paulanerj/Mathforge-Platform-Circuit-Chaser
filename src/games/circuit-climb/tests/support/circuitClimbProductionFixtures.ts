/**
 * Production-shaped fixtures for Circuit Climb tests.
 *
 * One definition, shared by every test that needs a row. Tests that invent a
 * richer platform than production is the exact trap that let a green suite
 * validate identity behaviour production did not have, so the shape here is
 * checked against the real makeRow source by
 * `circuitClimbLearnerRouting.test.ts`.
 */
import {
  LearnerRoutingWorld,
  collectActivePlatforms,
  landingPointFor,
} from '../../runtime/circuitClimbLearnerRouting';
import { CIRCUIT_CLIMB_GEOMETRY as G } from '../../geometry/circuitClimbGeometry';
import type { CurrentGameGeometry } from '../../pursuer/circuitClimbPursuer';

/** Exactly the keys production makeRow() puts on a platform. Nothing richer. */
export const PRODUCTION_PLATFORM_KEYS = [
  'id','row','column','x','y','width','height','value','correct','dead','powered','selected','litAt',
];

/** The accepted world at the default 100% view scale. */
export const DEFAULT_ROUTING_CONFIG = {
  logicalWidth: G.logicalWidth,
  platformHeight: G.platformHeight,
  playerRadius: G.playerRadius,
  routePlatformPadding: G.routePlatformPadding,
  routeTurnCount: 8,
  routeMaxStraightRun: 72,
  routeHorizontalJitter: 44,
};

export function makeProductionRow(index: number) {
  const y = -index * G.rowGap;
  const platforms = G.columns.map((fraction, column) => ({
    id: `row-${index}-column-${column}`,
    row: index,
    column,
    x: fraction * G.logicalWidth,
    y,
    width: G.platformWidth,
    height: G.platformHeight,
    value: null as number | null,
    correct: false,
    dead: false,
    powered: false,
    selected: false,
    litAt: -1000,
  }));
  return { index, y, platforms };
}

/** Base state: the learner on row 0 centre, rows 0..count-1 in the world. */
export function baseRoutingWorld(rowCount = 4, overrides: Partial<LearnerRoutingWorld> = {}) {
  const rows = Array.from({ length: rowCount }, (_, i) => makeProductionRow(i));
  const world: LearnerRoutingWorld = {
    config: DEFAULT_ROUTING_CONFIG,
    activePlatforms: collectActivePlatforms(rows),
    getRow: (index: number) => rows.find((r) => r.index === index) || null,
    sourcePlatform: rows[0].platforms[1],
    threat: null,
    avoidance: 0,
    ...overrides,
  };
  return { world, rows };
}

/** Where the spark rests on a platform, from the production helper. */
export const standingOn = (platform: any) => landingPointFor(DEFAULT_ROUTING_CONFIG, platform);

/** Default geometry for tests (100% scale / production values). */
export function defaultTestGeometry(): CurrentGameGeometry {
  return {
    rowGap: G.rowGap,
    platformHeight: G.platformHeight,
    playerRadius: G.playerRadius,
    logicalWidth: G.logicalWidth,
    routePlatformPadding: G.routePlatformPadding,
  };
}
