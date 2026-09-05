/**
 * THE LEARNER — the Spark, and how it actually travels.
 *
 * Route geometry is PRODUCTION'S OWN. `circuitClimbLearnerRouting.ts` is
 * copied unmodified from the shipped game, so the right-angled stepped
 * circuit, the corridor choice, the crossing altitudes and the landing points
 * are the ones a player sees. That matters more than it might sound: the
 * pursuer's whole world is corridors, and a learner that moved even slightly
 * differently would present it with a different problem, so any judgement made
 * here about pursuit would not transfer back to the product.
 *
 * What is NOT reproduced is threat avoidance. Production lets the Spark steer
 * its route away from the bot, which couples the learner to the pursuer — and
 * a learner whose path depends on which Brain is chasing it makes Brain
 * comparison meaningless. It is available (`avoidance`) and defaults to zero,
 * and a RECORDED run stores the actual walked path, so a replay is identical
 * whatever is chasing it.
 */

import {
  buildSteppedRoute, landingPointFor, collectActivePlatforms, destinationCorridors,
  threatRadiusFor, threatSkipDistanceFor,
  type LearnerRoutingConfig, type LearnerRoutingWorld, type RoutePoint,
} from './circuitClimbLearnerRouting';
import { chooseRouteAgainstThreat } from '../world/circuitClimbGeometry';
import type { Board, Platform } from '../world/board';
import type { GraphWorld } from '../world/graphWorld';

/** Production's own learner speed, in logical units per millisecond. */
export const ROUTE_SPEED = 0.62;

export interface LearnerState {
  x: number;
  y: number;
  row: number;
  platform: Platform;
  /** True while walking a route. */
  moving: boolean;
}

export interface LearnerTravel {
  path: RoutePoint[];
  lengths: number[];
  total: number;
  travelled: number;
  destination: Platform;
  startedAtMs: number;
  column: number;
}

export function routingConfigFor(world: GraphWorld, routeTurnCount = 8): LearnerRoutingConfig {
  return {
    logicalWidth: world.logicalWidth,
    platformHeight: world.platformHeight,
    playerRadius: world.playerRadius,
    routePlatformPadding: world.routePlatformPadding,
    routeTurnCount,
    routeMaxStraightRun: 72,
    routeHorizontalJitter: 44,
  } as LearnerRoutingConfig;
}

export class Learner {
  x: number;
  y: number;
  row = 0;
  platform: Platform;
  travel: LearnerTravel | null = null;

  constructor(
    private board: Board,
    private config: LearnerRoutingConfig,
    private speed = ROUTE_SPEED,
  ) {
    this.platform = board.rows[0].platforms[1];
    const landing = landingPointFor(config, this.platform);
    this.x = landing.x;
    this.y = landing.y;
  }

  get moving(): boolean { return this.travel !== null; }

  get state(): LearnerState {
    return { x: this.x, y: this.y, row: this.row, platform: this.platform, moving: this.moving };
  }

  /**
   * Plan and begin a climb to `column` of the next row.
   *
   * Returns the route, or null when no legal one exists — which the caller
   * must treat as a refused selection rather than teleporting the learner,
   * because "there was no clear path" is a real state of this board.
   */
  begin(
    column: number,
    nowMs: number,
    threat: { x: number; y: number } | null = null,
    avoidance = 0,
    rowDelta: 1 | -1 = 1,
  ): LearnerTravel | null {
    this.board.ensureRows(this.row);
    if (rowDelta === -1 && this.row === 0) return null;
    const destinationRow = this.board.getRow(this.row + rowDelta);
    if (!destinationRow) return null;
    const destination = destinationRow.platforms[column];
    if (!destination) return null;

    const routingWorld: LearnerRoutingWorld = {
      config: this.config,
      activePlatforms: collectActivePlatforms(this.board.rows),
      getRow: (index: number) => this.board.getRow(index),
      sourcePlatform: this.platform,
      threat,
      avoidance,
    };
    const corridors = destinationCorridors(destinationRow, this.config);
    const landing = landingPointFor(this.config, destination);

    // Production tries each corridor and each phase; the first legal route
    // wins unless threat avoidance reorders them.
    const candidates: { points: RoutePoint[] }[] = [];
    for (const corridor of corridors) {
      for (const phase of [-1, 1] as const) {
        const path = buildSteppedRoute(routingWorld, { x: this.x, y: this.y }, landing, destination, corridor, phase);
        if (path && path.length > 1) candidates.push({ points: path });
      }
    }
    if (!candidates.length) return null;

    const index = threat && avoidance > 0
      ? chooseRouteAgainstThreat(candidates, threat, avoidance, threatRadiusFor(this.config), threatSkipDistanceFor(this.config))
      : 0;
    return this.follow(candidates[Math.max(0, index)].points, destination, column, nowMs);
  }

  /** Walk an EXACT path. This is what replay uses, so a run repeats verbatim. */
  follow(path: RoutePoint[], destination: Platform, column: number, nowMs: number): LearnerTravel {
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < path.length; i += 1) {
      const length = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      lengths.push(length);
      total += length;
    }
    this.travel = { path, lengths, total, travelled: 0, destination, startedAtMs: nowMs, column };
    return this.travel;
  }

  /** Advance along the current route. Returns true on the tick it arrives. */
  advance(dtMs: number): boolean {
    const travel = this.travel;
    if (!travel) return false;
    travel.travelled = Math.min(travel.total, travel.travelled + this.speed * dtMs);

    let remaining = travel.travelled;
    let segment = 0;
    while (segment < travel.lengths.length && remaining > travel.lengths[segment]) {
      remaining -= travel.lengths[segment];
      segment += 1;
    }
    const a = travel.path[Math.min(segment, travel.path.length - 1)];
    const b = travel.path[Math.min(segment + 1, travel.path.length - 1)];
    const span = travel.lengths[segment] || 1;
    this.x = a.x + (b.x - a.x) * (remaining / span);
    this.y = a.y + (b.y - a.y) * (remaining / span);

    if (travel.travelled >= travel.total) {
      const landing = landingPointFor(this.config, travel.destination);
      this.x = landing.x;
      this.y = landing.y;
      this.platform = travel.destination;
      this.row = travel.destination.row;
      this.travel = null;
      this.board.ensureRows(this.row);
      return true;
    }
    return false;
  }
}
