/**
 * Circuit Climb — the learner routing transaction.
 *
 * One question lives here: the learner has tapped a platform on the row above,
 * so what route does the spark fly, and what travel does that become?
 *
 * This was inside the runtime hook closure, where no test could reach it. That
 * is not a stylistic complaint. `buildCircuitPath` once returned null for every
 * candidate route in the game, `selectPlatform` swallowed the click in silence,
 * and every platform in Circuit Climb became unclickable with a fully green test
 * suite and no console error. Nothing could have caught it, because the
 * transaction had no seam.
 *
 * Everything here is pure and deterministic. It reads a world it is handed and
 * returns a result; it plays no sound, sets no message, mutates no platform and
 * touches no React state. Those remain the runtime's job.
 *
 * It owns no constants. Geometry comes from circuitClimbGeometry, which is the
 * single authority for the world, collision inflation and the route crossing
 * altitude; the view-scaled numbers arrive in `config` from the runtime that
 * derives them.
 */

import {
  computeActorSafeCorridors,
  computePlatformCollisionRects,
  computeRouteCrossingOffset,
  chooseRouteAgainstThreat,
  pathIsClear,
  sharedOpeningDistance,
} from '../geometry/circuitClimbGeometry';

export interface RoutePoint { x: number; y: number }

/**
 * The view-scaled numbers the runtime holds. Deliberately a plain snapshot
 * rather than a live reference: this module must not be able to change the
 * world it is reasoning about.
 */
export interface LearnerRoutingConfig {
  logicalWidth: number;
  platformHeight: number;
  playerRadius: number;
  routePlatformPadding: number;
  routeTurnCount: number;
  routeMaxStraightRun: number;
  routeHorizontalJitter: number;
}

export interface LearnerRoutingWorld {
  config: LearnerRoutingConfig;
  /** Every platform collision must respect, already filtered for row 0. */
  activePlatforms: any[];
  /** Resolves a row index to the row carrying `.y` and `.platforms`. */
  getRow: (index: number) => any | null;
  /** The platform the learner is standing on, or null before the first frame. */
  sourcePlatform: any | null;
  /**
   * The pursuer, as a point to steer away from. It can reorder candidate
   * routes and nothing more — see `chooseLearnerRoute`.
   */
  threat: RoutePoint | null;
  /** 0 disables steering entirely and restores first-clear-route-wins. */
  avoidance: number;
}

export interface LearnerTravel {
  type: 'circuit';
  platform: any;
  points: RoutePoint[];
  lengths: number[];
  total: number;
  distance: number;
  segment: number;
  correct: boolean;
}

/**
 * Why a selection produced no travel. Every one of these is a loud, inspectable
 * outcome. The failure this module exists to prevent had no name at all: the
 * click was simply consumed.
 */
export type LearnerSelectionFailure =
  | 'NO_DESTINATION_ROW'
  | 'NO_LEGAL_ROUTE'
  | 'DEGENERATE_ROUTE';

export interface LearnerSelectionDiagnostic {
  destinationRow: number | null;
  candidatesBuilt: number;
  candidatesClear: number;
  from: RoutePoint;
  landing: RoutePoint | null;
}

export interface LearnerSelectionRouted {
  ok: true;
  route: RoutePoint[];
  landing: RoutePoint;
  travel: LearnerTravel;
}

export interface LearnerSelectionRejected {
  ok: false;
  reason: LearnerSelectionFailure;
  diagnostic: LearnerSelectionDiagnostic;
}

export type LearnerSelectionResult = LearnerSelectionRouted | LearnerSelectionRejected;

/**
 * Narrow a selection result.
 *
 * This project's tsconfig does not enable `strict`, and without
 * strictNullChecks TypeScript will not narrow a union on a BOOLEAN literal
 * discriminant — `if (result.ok)` leaves the union intact and reading
 * `result.reason` is a compile error. A type predicate narrows correctly under
 * either setting, so callers get the safety whatever the project's strictness
 * becomes later.
 */
export function selectionRouted(result: LearnerSelectionResult): result is LearnerSelectionRouted {
  return result.ok === true;
}

// Arithmetic helpers, private to this module. Not domain authorities.
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the spark comes to rest on a platform. */
export function landingPointFor(config: LearnerRoutingConfig, platform: any): RoutePoint {
  return { x: platform.x, y: platform.y - config.playerRadius - 3 };
}

/**
 * The platforms collision must respect. Row 0 exposes only its centre platform:
 * the outer two are decorative and never obstruct.
 */
export function collectActivePlatforms(rows: any[]): any[] {
  const active: any[] = [];
  rows.forEach((row) => row.platforms.forEach((platform: any) => {
    if (platform.row === 0 && platform.column !== 1) return;
    active.push(platform);
  }));
  return active;
}

/** Collision only. The pursuer is deliberately absent from this call. */
export function isRouteClear(
  world: LearnerRoutingWorld,
  points: RoutePoint[],
  destinationPlatform?: any,
) {
  const rects = computePlatformCollisionRects(world.activePlatforms, world.config.playerRadius);
  return pathIsClear(points, rects, {
    destinationPlatform,
    landingPoint: destinationPlatform ? landingPointFor(world.config, destinationPlatform) : undefined,
    sourcePlatform: world.sourcePlatform,
  });
}

/** How near the pursuer a route must pass before it counts as exposed. */
export function threatRadiusFor(config: LearnerRoutingConfig) {
  return config.playerRadius * 2 + 60;
}

/**
 * Arc length of the route to ignore when judging exposure. Every candidate
 * leaves the same platform, so the opening leg is common to all of them and
 * says nothing about which is safer.
 */
export function threatSkipDistanceFor(config: LearnerRoutingConfig) {
  return threatRadiusFor(config) * 1.5;
}

/** Drops duplicate points and collapses collinear runs. */
export function cleanCircuitPath(points: RoutePoint[]): RoutePoint[] {
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const last = out[out.length - 1];
    if (point.x === last.x && point.y === last.y) continue;
    if (out.length >= 2) {
      const previous = out[out.length - 2];
      if ((previous.x === last.x && last.x === point.x) ||
          (previous.y === last.y && last.y === point.y)) {
        out[out.length - 1] = point;
        continue;
      }
    }
    out.push(point);
  }
  return out;
}

export function destinationCorridors(row: any, config?: LearnerRoutingConfig) {
  const bounds = (platform: any) => ({
    center: platform.x,
    left: platform.x - platform.width / 2,
    right: platform.x + platform.width / 2,
  });
  // The current world, not the module default. Without it the corridor the
  // route is built through is the one a 100% actor would fit, and a scaled-up
  // learner is routed into a gap its own body does not fit.
  const geometry = config
    ? {
        playerRadius: config.playerRadius,
        routePlatformPadding: config.routePlatformPadding,
        logicalWidth: config.logicalWidth,
        platformWidth: row.platforms[0].width,
      }
    : undefined;
  return computeActorSafeCorridors(
    bounds(row.platforms[0]),
    bounds(row.platforms[1]),
    bounds(row.platforms[2]),
    geometry,
  );
}

export function chooseDestinationCorridor(
  config: LearnerRoutingConfig,
  row: any,
  targetX: number,
  startX: number,
) {
  const corridors = destinationCorridors(row, config);
  if (!corridors.length) {
    const minActorClearance = config.playerRadius + 6;
    const edge = targetX < config.logicalWidth / 2 ? minActorClearance : config.logicalWidth - minActorClearance;
    return { id: targetX < config.logicalWidth / 2 ? 'A' : 'D', type: 'exterior', left: edge, right: edge, center: edge, width: 0 };
  }
  return corridors
    .slice()
    .sort((first, second) => {
      const firstBonus = first.type === 'interior' ? -20 : 0;
      const secondBonus = second.type === 'interior' ? -20 : 0;
      const firstScore =
        Math.abs(first.center - targetX) * 0.72 +
        Math.abs(first.center - startX) * 0.28 +
        firstBonus;
      const secondScore =
        Math.abs(second.center - targetX) * 0.72 +
        Math.abs(second.center - startX) * 0.28 +
        secondBonus;
      return firstScore - secondScore;
    })[0];
}

/**
 * Which way the serpentine's free legs lean.
 *
 * The route's opening horizontal legs alternate around a guide line, and which
 * way they alternate was fixed: leg 0 always leaned one way, so when the guide
 * sat within the minimum run of the spark's own position the clamp below turned
 * that lean into a hard 22-unit step in one direction — the same direction,
 * every route, every time. On a right-hand platform with the bot approaching
 * from the left that is a step straight toward it, and because both corridor
 * candidates leaned the same way there was no alternative for the threat
 * scoring to prefer.
 *
 * Flipping the phase gives a second legal route through the same corridor to
 * the same platform, leaning the other way. Neither is preferred here — that is
 * chooseRouteAgainstThreat's decision, and it is made on measured clearance.
 */
export type RoutePhase = -1 | 1;

export function buildSteppedRoute(
  world: LearnerRoutingWorld,
  from: RoutePoint,
  to: RoutePoint,
  destinationPlatform: any,
  corridor: any,
  phase: RoutePhase = -1,
): RoutePoint[] {
  const config = world.config;
  const turns = clamp(Math.round(config.routeTurnCount / 2) * 2, 6, 12);
  const horizontalCount = turns / 2;
  const verticalCount = horizontalCount + 1;
  const destinationRow = world.getRow(destinationPlatform.row);

  const landingY = to.y;
  const apexY = destinationRow.y - config.playerRadius - Math.max(16, config.routePlatformPadding * 1.8);

  // The altitude at which the route crosses beneath the destination row. It has
  // to clear that row's actor-inflated collision band; when it did not, every
  // candidate route in the game was rejected and no platform could be selected.
  // The formula lives in the geometry module beside the rect inflation it must
  // agree with, and is never re-derived here.
  const crossingStartY = destinationRow.y + computeRouteCrossingOffset(config);

  const midCrossY = destinationRow.y + config.platformHeight * 0.34;

  const verticalEndpoints: number[] = [];
  const preCorridorVerticalCount = verticalCount - 3;
  for (let index = 1; index <= preCorridorVerticalCount; index += 1) {
    verticalEndpoints.push(lerp(from.y, crossingStartY, index / preCorridorVerticalCount));
  }
  verticalEndpoints.push(midCrossY, apexY, landingY);

  const corridorWidth = Math.max(0, corridor.right - corridor.left);
  const corridorInset = Math.min(14, Math.max(3, corridorWidth * 0.2));
  const minBound = corridor.left + Math.min(2, corridorWidth / 2);
  const maxBound = corridor.right - Math.min(2, corridorWidth / 2);

  let corridorA = clamp(corridor.center - corridorInset, minBound, maxBound);
  let corridorB = clamp(corridor.center + corridorInset, minBound, maxBound);

  if (Math.abs(corridorB - corridorA) < 4) {
    corridorA = corridor.center;
    const bShift = Math.min(4, corridorWidth / 2);
    corridorB = clamp(corridor.center + (to.x < corridor.center ? -bShift : bShift), corridor.left, corridor.right);
  }

  if (to.x < corridor.center) {
    [corridorA, corridorB] = [corridorB, corridorA];
  }

  const horizontalEndpoints: number[] = [];
  const freeHorizontalCount = horizontalCount - 3;
  let currentX = from.x;

  const minScreenX = config.playerRadius + 6;
  const maxScreenX = config.logicalWidth - (config.playerRadius + 6);

  for (let index = 0; index < freeHorizontalCount; index += 1) {
    const progress = (index + 1) / (freeHorizontalCount + 1);
    const guide = lerp(from.x, corridorA, progress);
    const alternatingDirection = index % 2 === 0 ? phase : -phase;
    const targetDirection = Math.sign(corridorA - from.x) || 1;

    let candidate = guide + alternatingDirection * targetDirection * config.routeHorizontalJitter;
    candidate = clamp(candidate, minScreenX, maxScreenX);

    const deltaX = candidate - currentX;
    const maximumRun = config.routeMaxStraightRun;
    const minimumRun = Math.min(22, maximumRun * 0.40);

    if (Math.abs(deltaX) > maximumRun) {
      candidate = currentX + Math.sign(deltaX) * maximumRun;
    } else if (Math.abs(deltaX) < minimumRun) {
      candidate = currentX + alternatingDirection * minimumRun;
      candidate = clamp(candidate, minScreenX, maxScreenX);
    }

    horizontalEndpoints.push(candidate);
    currentX = candidate;
  }

  horizontalEndpoints.push(corridorA, corridorB, to.x);

  const points: RoutePoint[] = [{ x: from.x, y: from.y }];
  let currentPoint = points[0];

  for (let segmentIndex = 0; segmentIndex < horizontalCount; segmentIndex += 1) {
    const nextY = verticalEndpoints[segmentIndex];
    if (nextY !== currentPoint.y) {
      currentPoint = { x: currentPoint.x, y: nextY };
      points.push(currentPoint);
    }
    const nextX = horizontalEndpoints[segmentIndex];
    if (nextX !== currentPoint.x) {
      currentPoint = { x: nextX, y: currentPoint.y };
      points.push(currentPoint);
    }
  }

  const finalY = verticalEndpoints[verticalEndpoints.length - 1];
  if (finalY !== currentPoint.y) {
    points.push({ x: currentPoint.x, y: finalY });
  }
  return cleanCircuitPath(points);
}

/** Two routes are the same route when every point matches. */
function samePath(a: RoutePoint[], b: RoutePoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((point, index) => point.x === b[index].x && point.y === b[index].y);
}

export interface LearnerRouteOutcome {
  route: RoutePoint[] | null;
  candidatesBuilt: number;
  candidatesClear: number;
}

/**
 * Builds every corridor route, keeps the ones collision approves, and lets the
 * pursuer pick among those.
 *
 * The pursuer may only REORDER. It cannot reject a candidate and cannot empty
 * the list — a pursuer with veto power over routes could make a platform
 * unselectable simply by standing in the wrong place, which is the exact defect
 * that made the whole game dead.
 */
export function chooseLearnerRoute(
  world: LearnerRoutingWorld,
  from: RoutePoint,
  to: RoutePoint,
  destinationPlatform: any,
): LearnerRouteOutcome {
  const config = world.config;
  const destinationRow = world.getRow(destinationPlatform.row);

  if (!destinationRow) {
    return { route: null, candidatesBuilt: 0, candidatesClear: 0 };
  }

  const corridors = destinationCorridors(destinationRow, config);
  const preferred = chooseDestinationCorridor(config, destinationRow, destinationPlatform.x, from.x);
  const ordered = [preferred, ...corridors.filter((corridor) => corridor !== preferred)];

  let built = 0;
  const clear: { points: RoutePoint[] }[] = [];
  for (const corridor of ordered) {
    // Both leans, through the same corridor, to the same platform. The natural
    // one is offered first so that with no threat, or with avoidance off, the
    // route chosen is exactly the route that was always chosen.
    for (const phase of [-1, 1] as RoutePhase[]) {
      const candidate = buildSteppedRoute(world, from, to, destinationPlatform, corridor, phase);
      built += 1;
      if (!isRouteClear(world, candidate, destinationPlatform)) continue;
      // A phase that produced the same route as one already accepted is not a
      // second option, and offering it twice would weight that route.
      const duplicate = clear.some((existing) => samePath(existing.points, candidate));
      if (!duplicate) clear.push({ points: candidate });
    }
  }

  if (clear.length > 0) {
    const chosen = chooseRouteAgainstThreat(
      clear,
      world.threat,
      world.avoidance,
      threatRadiusFor(config),
      // Only the part the candidates actually differ on, never more than the
      // old fixed opening. Skipping the fixed 186 units hid the first
      // horizontal leg — the leg that commits the spark toward the pursuer or
      // away from it — behind an opening the candidates stopped sharing after
      // 29.5.
      Math.min(threatSkipDistanceFor(config), sharedOpeningDistance(clear)),
    );
    return { route: clear[Math.max(0, chosen)].points, candidatesBuilt: built, candidatesClear: clear.length };
  }

  // Last resort: hug the nearer world edge.
  const minActorClearance = config.playerRadius + 6;
  const isLeft = from.x < config.logicalWidth / 2;
  const edgeX = isLeft ? minActorClearance : config.logicalWidth - minActorClearance;
  const fallback = buildSteppedRoute(world, from, to, destinationPlatform, {
    id: isLeft ? 'A' : 'D', type: 'exterior', left: edgeX, right: edgeX, center: edgeX, width: 0,
  });
  built += 1;

  if (isRouteClear(world, fallback, destinationPlatform)) {
    return { route: fallback, candidatesBuilt: built, candidatesClear: 1 };
  }
  return { route: null, candidatesBuilt: built, candidatesClear: 0 };
}

/** Manhattan segment lengths, matching how travel advances along the route. */
export function pathMetrics(points: RoutePoint[]) {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y));
    total += lengths[lengths.length - 1];
  }
  return { lengths, total };
}

/**
 * The whole learner transaction: destination in, route and travel out.
 *
 * Mathematical correctness is never consulted. A wrong platform is a legitimate
 * destination that routes and travels exactly like a right one; correctness is
 * resolved on landing. That is a product decision, not an implementation
 * detail, and it is why `platform.correct` appears here only as a value copied
 * onto the travel for the arrival to read.
 *
 * A failure is always explicit and carries a diagnostic. It never returns a
 * zero-length route: travel advances until `distance >= total`, so a total of 0
 * arrives on the first frame and teleports the spark — the masking behaviour
 * that hid this defect for an entire era of the project.
 */
export function planLearnerSelection(
  world: LearnerRoutingWorld,
  from: RoutePoint,
  destinationPlatform: any,
): LearnerSelectionResult {
  const landing = landingPointFor(world.config, destinationPlatform);
  const destinationRow = world.getRow(destinationPlatform.row);

  const diagnostic = (candidatesBuilt: number, candidatesClear: number): LearnerSelectionDiagnostic => ({
    destinationRow: destinationRow ? destinationRow.index ?? destinationPlatform.row : null,
    candidatesBuilt,
    candidatesClear,
    from,
    landing,
  });

  if (!destinationRow) {
    return { ok: false, reason: 'NO_DESTINATION_ROW', diagnostic: diagnostic(0, 0) };
  }

  const outcome = chooseLearnerRoute(world, from, landing, destinationPlatform);
  if (!outcome.route) {
    return { ok: false, reason: 'NO_LEGAL_ROUTE', diagnostic: diagnostic(outcome.candidatesBuilt, 0) };
  }

  const metrics = pathMetrics(outcome.route);
  if (outcome.route.length < 2 || metrics.total <= 0) {
    return { ok: false, reason: 'DEGENERATE_ROUTE', diagnostic: diagnostic(outcome.candidatesBuilt, outcome.candidatesClear) };
  }

  return {
    ok: true,
    route: outcome.route,
    landing,
    travel: {
      type: 'circuit',
      platform: destinationPlatform,
      points: outcome.route,
      lengths: metrics.lengths,
      total: metrics.total,
      distance: 0,
      segment: 0,
      correct: destinationPlatform.correct,
    },
  };
}
