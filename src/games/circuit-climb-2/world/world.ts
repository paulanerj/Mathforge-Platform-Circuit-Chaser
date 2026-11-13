/**
 * CC2-02A — authoritative learner-world geometry and routing adapter.
 *
 * This module preserves the accepted SOT-02 actor-clearance algorithms in
 * legacyGeometry.ts / legacyLearnerRouting.ts while giving the new core a
 * strongly typed world model. The old product is never imported at runtime.
 */
import { RunConfigV1 } from '../config/runConfig';
import { ProblemV1 } from '../math/add20';
import {
  CIRCUIT_CLIMB_GEOMETRY as BASE,
  computeColumnCentres,
  computeColumnSpacing,
} from './legacyGeometry';
import {
  collectActivePlatforms,
  landingPointFor,
  planLearnerSelection,
  selectionRouted,
  LearnerSelectionFailure,
  RoutePoint,
} from './legacyLearnerRouting';

export interface WorldPlatformV1 {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number | null;
  correct: boolean;
  dead: boolean;
  powered: boolean;
  selected: boolean;
}

export interface WorldRowV1 {
  index: number;
  y: number;
  platforms: WorldPlatformV1[];
}

export interface ResolvedWorldGeometryV1 {
  logicalWidth: number;
  platformWidth: number;
  platformHeight: number;
  playerRadius: number;
  rowGap: number;
  routePlatformPadding: number;
  routeTurnCount: number;
  routeMaxStraightRun: number;
  routeHorizontalJitter: number;
  columns: readonly [number, number, number];
  columnSpacing: number;
}

export interface WorldV1 {
  geometry: ResolvedWorldGeometryV1;
  rows: WorldRowV1[];
}

export type RoutePlanV1 =
  | { ok: true; points: RoutePoint[]; landing: RoutePoint; totalLength: number }
  | { ok: false; reason: LearnerSelectionFailure };

export function resolveWorldGeometry(config: RunConfigV1): ResolvedWorldGeometryV1 {
  const zoom = config.framingPercent / 100;
  const common = {
    logicalWidth: BASE.logicalWidth,
    platformWidth: BASE.platformWidth * (0.98 + 0.02 * zoom),
    platformHeight: BASE.platformHeight * Math.pow(zoom, 0.48),
    playerRadius: BASE.playerRadius * zoom,
    // CC2-06B: actual physical tier separation, not a CSS stretch. Player,
    // route planner, Pursuer graph, landing and replay share this one value.
    rowGap: BASE.rowGap * zoom * (config.rowGapScale ?? 1),
    routePlatformPadding: BASE.routePlatformPadding,
    routeTurnCount: config.routeTurns,
    routeMaxStraightRun: 72 * zoom,
    routeHorizontalJitter: 44 * zoom,
  };
  const columns = computeColumnCentres(common) as [number, number, number];
  return { ...common, columns, columnSpacing: computeColumnSpacing(common) };
}

function makeRowGeometry(world: WorldV1, index: number): WorldRowV1 {
  const g = world.geometry;
  const y = -index * g.rowGap;
  return {
    index,
    y,
    platforms: g.columns.map((x, column): WorldPlatformV1 => ({
      id: `row-${index}-column-${column}`,
      row: index,
      column,
      x,
      y,
      width: g.platformWidth,
      height: g.platformHeight,
      value: null,
      correct: false,
      dead: index === 0 && column !== 1,
      powered: index === 0 && column === 1,
      selected: false,
    })),
  };
}

export function createWorld(config: RunConfigV1): WorldV1 {
  const world: WorldV1 = { geometry: resolveWorldGeometry(config), rows: [] };
  world.rows.push(makeRowGeometry(world, 0));
  return world;
}

export function getRow(world: WorldV1, index: number): WorldRowV1 | undefined {
  return world.rows.find(row => row.index === index);
}

export function findPlatform(world: WorldV1, id: string): WorldPlatformV1 | undefined {
  for (const row of world.rows) {
    const platform = row.platforms.find(item => item.id === id);
    if (platform) return platform;
  }
  return undefined;
}

export function landingFor(world: WorldV1, platform: WorldPlatformV1): RoutePoint {
  return landingPointFor(world.geometry, platform);
}

export function addProblemRow(world: WorldV1, problem: ProblemV1): WorldRowV1 {
  if (getRow(world, problem.rowIndex)) throw new Error('WORLD_ROW_ALREADY_EXISTS');
  if (!getRow(world, problem.rowIndex - 1)) throw new Error('WORLD_MISSING_PREDECESSOR');
  const row = makeRowGeometry(world, problem.rowIndex);
  for (const option of problem.options) {
    const platform = row.platforms[option.ordinal];
    if (platform.id !== option.platformId) throw new Error('WORLD_PROBLEM_PLATFORM_ID_MISMATCH');
    platform.value = option.value;
    platform.correct = option.platformId === problem.correctPlatformId;
  }
  world.rows.push(row);
  return row;
}

export function planRoute(
  world: WorldV1,
  source: WorldPlatformV1,
  destination: WorldPlatformV1,
  threat: RoutePoint | null = null,
): RoutePlanV1 {
  const config = world.geometry;
  const from = landingFor(world, source);
  const selection = planLearnerSelection(
    {
      config,
      activePlatforms: collectActivePlatforms(world.rows),
      getRow: index => getRow(world, index) ?? null,
      sourcePlatform: source,
      threat,
      avoidance: threat ? 0.5 : 0,
    },
    from,
    destination,
  );
  if (!selectionRouted(selection)) {
    return { ok: false, reason: selection.reason };
  }
  return {
    ok: true,
    points: selection.route,
    landing: selection.landing,
    totalLength: selection.travel.total,
  };
}

/** The route is already actor-safe. This helper only interpolates its centre. */
export function pointAlongRoute(points: readonly RoutePoint[], distance: number): RoutePoint {
  if (points.length < 2) throw new Error('WORLD_EMPTY_ROUTE');
  // The final sample must be the exact source-owned landing coordinate.
  // Summing floating-point segment lengths can otherwise leave a 1e-13 unit
  // residual even when distance equals the stored route total.
  const total = points.slice(1).reduce((sum, point, i) =>
    sum + Math.abs(point.x - points[i].x) + Math.abs(point.y - points[i].y), 0);
  if (distance >= total - 1e-8) return { ...points[points.length - 1] };
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (remaining <= length || i === points.length - 1) {
      const ratio = length === 0 ? 1 : Math.min(1, remaining / length);
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    }
    remaining -= length;
  }
  return { ...points[points.length - 1] };
}

/** Hop is the accepted optional automatic arc presentation, not a route veto. */
export function pointOnHop(from: RoutePoint, to: RoutePoint, progress: number): RoutePoint {
  const p = Math.max(0, Math.min(1, progress));
  const arc = Math.sin(Math.PI * p) * 58;
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p - arc,
  };
}

/**
 * Keep a bounded collision snapshot without losing the source or target row.
 * Pursuer retention will extend this policy in CC2-02B, not reinterpret it.
 */
export function retainRecentRows(world: WorldV1, sourceRow: number, behind = 8): void {
  world.rows = world.rows.filter(row => row.index >= sourceRow - behind);
}
