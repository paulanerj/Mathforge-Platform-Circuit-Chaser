import { describe, it, expect } from 'vitest';
import {
  buildSteppedRoute,
  chooseLearnerRoute,
  destinationCorridors,
  isRouteClear,
  planLearnerSelection,
  selectionRouted,
  threatRadiusFor,
  threatSkipDistanceFor,
  type RoutePhase,
} from '../runtime/circuitClimbLearnerRouting';
import {
  pathClearance,
  pointAtDistance,
  routeOpeningRelief,
  sharedOpeningDistance,
  chooseRouteAgainstThreat,
  CIRCUIT_CLIMB_GEOMETRY as G,
  computeColumnCentres,
} from '../geometry/circuitClimbGeometry';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import {
  ALIVE_PURSUER_TUNING,
  BASELINE_PURSUER_TUNING,
} from '../pursuer/circuitClimbPursuerTuning';
import {
  advanceCadence,
  burstDurationMs,
  cadenceSpeedCompensation,
  chooseLegAxis,
  createLocomotion,
  hesitationChance,
  hesitationDurationMs,
  legBudgetMs,
  movingDutyCycle,
} from '../pursuer/circuitClimbPursuerLocomotion';
import {
  baseRoutingWorld,
  standingOn,
  DEFAULT_ROUTING_CONFIG as CONFIG,
  defaultTestGeometry,
} from './support/circuitClimbProductionFixtures';

/**
 * PURSUIT, EVASION AND MOVEMENT CHARACTER.
 *
 * Three behaviours that only make sense together: the spark should not walk
 * into the bot when a legal route exists that does not; the bot should move in
 * the spark's own right-angle language; and its cadence should be frantic
 * rather than metronomic — without any of that costing it the pursuit.
 */

// ---------------------------------------------------------------------------
// Evasive route selection
// ---------------------------------------------------------------------------

/**
 * The learner on a chosen platform of row 1, with the bot placed as a point.
 * Everything below reads out of this one helper so a scenario is a position,
 * not a bespoke world.
 */
function evasionCase(sourceColumn: number, threat: { x: number; y: number } | null, avoidance = 0.75) {
  const { world, rows } = baseRoutingWorld(4, { threat, avoidance });
  world.sourcePlatform = rows[1].platforms[sourceColumn];
  return { world, rows, from: standingOn(world.sourcePlatform) };
}

/** Every legal route to a destination, however the spark could fly it. */
function legalRoutes(world: any, rows: any[], from: any, destinationColumn: number) {
  const destination = rows[2].platforms[destinationColumn];
  const to = standingOn(destination);
  const routes: { points: any[]; phase: RoutePhase; corridor: string }[] = [];
  for (const corridor of destinationCorridors(rows[2], world.config)) {
    for (const phase of [-1, 1] as RoutePhase[]) {
      const points = buildSteppedRoute(world, from, to, destination, corridor, phase);
      if (!isRouteClear(world, points, destination)) continue;
      routes.push({ points, phase, corridor: corridor.id });
    }
  }
  return { destination, to, routes };
}

const clearanceOf = (points: any[], threat: any) => pathClearance(points, threat, 0);

describe('the route builder can lean either way', () => {
  /**
   * The hard bias, in one assertion. The free legs of the serpentine alternate
   * around a guide, and the lean was fixed — so when the guide fell inside the
   * minimum run the clamp turned it into a 22-unit step in the same direction
   * every time, whatever the spark's position or the bot's.
   */
  it('the two phases are genuinely different legal routes', () => {
    const { world, rows, from } = evasionCase(2, { x: 400, y: -240 });
    const { destination, to } = legalRoutes(world, rows, from, 2);
    const corridor = destinationCorridors(rows[2], world.config)[1];

    const natural = buildSteppedRoute(world, from, to, destination, corridor, -1);
    const mirrored = buildSteppedRoute(world, from, to, destination, corridor, 1);

    expect(natural.map((p) => p.x)).not.toEqual(mirrored.map((p) => p.x));
    expect(isRouteClear(world, natural, destination)).toBe(true);
    expect(isRouteClear(world, mirrored, destination)).toBe(true);
    // Same corridor, same platform, same landing: a different route, not a
    // different destination.
    expect(natural[natural.length - 1]).toEqual(mirrored[mirrored.length - 1]);
  });

  /**
   * The phase is not decoration: there are worlds where every route the old
   * builder could produce passes close to the bot, and the mirrored lean is the
   * only one that does not. Standing on the centre platform with the bot below
   * and left, the mirrored route keeps 36.8 more units of clearance than the
   * best route a single lean can build.
   */
  it('a case the mirrored lean wins outright', () => {
    const threat = { x: 210, y: -380 };
    const { world, rows, from } = evasionCase(1, threat);
    const destination = rows[2].platforms[2];
    const to = standingOn(destination);

    const chosen = chooseLearnerRoute(world, from, to, destination).route!;
    expect(clearanceOf(chosen, threat)).toBeGreaterThan(140);

    // Everything the natural lean alone could have offered.
    const naturalOnly = destinationCorridors(rows[2], world.config)
      .map((corridor) => buildSteppedRoute(world, from, to, destination, corridor, -1))
      .filter((points) => isRouteClear(world, points, destination));
    expect(naturalOnly.length).toBeGreaterThan(0);
    expect(Math.max(...naturalOnly.map((points) => clearanceOf(points, threat)))).toBeLessThan(110);
  });

  it('the default phase is the route that was always built', () => {
    const { world, rows, from } = evasionCase(2, null, 0);
    const { destination, to } = legalRoutes(world, rows, from, 1);
    const corridor = destinationCorridors(rows[2], world.config)[0];
    expect(buildSteppedRoute(world, from, to, destination, corridor))
      .toEqual(buildSteppedRoute(world, from, to, destination, corridor, -1));
  });
});

describe('exposure is measured where the routes differ', () => {
  /**
   * The fixed skip discarded 186 units. The candidates stopped agreeing after
   * 29.5 — so the whole first horizontal leg, the one that commits the spark
   * toward the bot or away from it, was invisible to the scoring.
   */
  it('the shared opening is far shorter than the old fixed skip', () => {
    const { world, rows, from } = evasionCase(2, { x: 400, y: -240 });
    const { routes } = legalRoutes(world, rows, from, 1);

    const shared = sharedOpeningDistance(routes);
    expect(shared).toBeLessThan(40);
    expect(threatSkipDistanceFor(CONFIG)).toBe(186);
    expect(shared).toBeLessThan(threatSkipDistanceFor(CONFIG));
  });

  it('a single candidate has no shared opening to discount', () => {
    const { world, rows, from } = evasionCase(1, null, 0);
    const { routes } = legalRoutes(world, rows, from, 1);
    expect(sharedOpeningDistance(routes.slice(0, 1))).toBe(0);
    expect(sharedOpeningDistance([])).toBe(0);
  });

  it('the old skip hid a route that passes close to the bot', () => {
    const { world, rows, from } = evasionCase(2, { x: 530, y: -205 });
    const { routes } = legalRoutes(world, rows, from, 1);
    const threat = { x: 530, y: -205 };

    // Same route, two measurements: the fixed skip reports it as clear of the
    // threat radius, the shared-opening skip reports the exposure that is there.
    const overSkipped = pathClearance(routes[0].points, threat, threatSkipDistanceFor(CONFIG));
    const honest = pathClearance(routes[0].points, threat, sharedOpeningDistance(routes));
    expect(overSkipped).toBeGreaterThan(threatRadiusFor(CONFIG));
    expect(honest).toBeLessThan(overSkipped);
  });
});

describe('the opening of a route is scored, not just its closest approach', () => {
  it('relief is positive for a route that sets off away from the bot', () => {
    const away = [{ x: 300, y: 0 }, { x: 300, y: -200 }];
    const toward = [{ x: 300, y: 0 }, { x: 300, y: 200 }];
    const threat = { x: 300, y: 200 };

    expect(routeOpeningRelief(away, threat, 124)).toBeGreaterThan(0);
    expect(routeOpeningRelief(toward, threat, 124)).toBe(0);
  });

  it('it is measured by distance travelled, so framing cannot change it', () => {
    const route = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
    expect(pointAtDistance(route, 100)).toEqual({ x: 100, y: 0 });
    expect(pointAtDistance(route, 10000)).toEqual({ x: 400, y: 0 });
  });

  /**
   * Two routes whose closest approach is EXACTLY equal, so exposure cannot
   * separate them and the tie would otherwise fall to list order. One sets off
   * at the bot and slips past; the other leaves first. This is the case the
   * player actually watches, and the only thing that can decide it is how the
   * route opens.
   */
  it('it decides between two routes exposure scores identically', () => {
    const threat = { x: 300, y: 0 };
    const towardFirst = [{ x: 200, y: 0 }, { x: 260, y: 0 }, { x: 260, y: -300 }];
    const awayFirst = [
      { x: 200, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -200 }, { x: 260, y: -200 }, { x: 260, y: 0 },
    ];
    expect(pathClearance(towardFirst, threat, 0)).toBe(40);
    expect(pathClearance(awayFirst, threat, 0)).toBe(40);
    expect(routeOpeningRelief(towardFirst, threat, 124)).toBe(0);
    expect(routeOpeningRelief(awayFirst, threat, 124)).toBeGreaterThan(0.5);

    // The walk-at-it route is offered FIRST, so a win here cannot come from
    // list order — the rank term actively favours the one that loses.
    expect(chooseRouteAgainstThreat(
      [{ points: towardFirst }, { points: awayFirst }], threat, 0.75, 124, 0,
    )).toBe(1);
  });

  it('with avoidance off the opening is not consulted at all', () => {
    const threat = { x: 300, y: 0 };
    const towardFirst = [{ x: 200, y: 0 }, { x: 260, y: 0 }, { x: 260, y: -300 }];
    const awayFirst = [{ x: 200, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -300 }];
    expect(chooseRouteAgainstThreat(
      [{ points: towardFirst }, { points: awayFirst }], threat, 0, 124, 0,
    )).toBe(0);
  });
});

describe('SCENARIO A — bot approaches from the left', () => {
  const threat = { x: 400, y: -240 };

  it('the spark takes the route that keeps most distance from the bot', () => {
    const { world, rows, from } = evasionCase(2, threat);
    const { routes } = legalRoutes(world, rows, from, 0);
    const outcome = chooseLearnerRoute(world, from, standingOn(rows[2].platforms[0]), rows[2].platforms[0]);

    expect(outcome.route).not.toBeNull();
    const chosen = clearanceOf(outcome.route!, threat);
    const worst = Math.min(...routes.map((r) => clearanceOf(r.points, threat)));
    expect(chosen).toBeGreaterThan(worst);
  });

  it('it is a strict improvement on the route it used to take', () => {
    const { world, rows, from } = evasionCase(2, threat);
    const destination = rows[2].platforms[0];
    const natural = chooseLearnerRoute({ ...world, avoidance: 0 }, from, standingOn(destination), destination);
    const evasive = chooseLearnerRoute(world, from, standingOn(destination), destination);

    expect(clearanceOf(evasive.route!, threat)).toBeGreaterThan(clearanceOf(natural.route!, threat));
  });
});

describe('SCENARIO B — bot approaches from the right', () => {
  const threat = { x: 200, y: -240 };

  it('the mirror case improves in the same way, from the same rule', () => {
    const { world, rows, from } = evasionCase(0, threat);
    const destination = rows[2].platforms[2];
    const natural = chooseLearnerRoute({ ...world, avoidance: 0 }, from, standingOn(destination), destination);
    const evasive = chooseLearnerRoute(world, from, standingOn(destination), destination);

    expect(clearanceOf(evasive.route!, threat)).toBeGreaterThan(clearanceOf(natural.route!, threat));
  });

  /**
   * The rule the brief forbids is "bot left, so go right". This is the check
   * that it was not written: the same bot offset produces mirrored outcomes
   * because the geometry mirrors, not because a side is named anywhere.
   */
  it('neither side is privileged — the two mirrors behave alike', () => {
    const left = evasionCase(2, { x: 400, y: -240 });
    const right = evasionCase(0, { x: 200, y: -240 });

    const leftDestination = left.rows[2].platforms[0];
    const rightDestination = right.rows[2].platforms[2];
    const leftRoute = chooseLearnerRoute(left.world, left.from, standingOn(leftDestination), leftDestination);
    const rightRoute = chooseLearnerRoute(right.world, right.from, standingOn(rightDestination), rightDestination);

    const leftGain = clearanceOf(leftRoute.route!, { x: 400, y: -240 })
      - clearanceOf(chooseLearnerRoute({ ...left.world, avoidance: 0 }, left.from, standingOn(leftDestination), leftDestination).route!, { x: 400, y: -240 });
    const rightGain = clearanceOf(rightRoute.route!, { x: 200, y: -240 })
      - clearanceOf(chooseLearnerRoute({ ...right.world, avoidance: 0 }, right.from, standingOn(rightDestination), rightDestination).route!, { x: 200, y: -240 });

    expect(leftGain).toBeGreaterThan(0);
    expect(rightGain).toBeGreaterThan(0);
    expect(Math.abs(leftGain - rightGain)).toBeLessThan(1);
  });
});

describe('SCENARIO C — the safer side is not available', () => {
  /**
   * The spark may not invent a route. Whatever the bot does, the destination
   * stays reachable by something collision has approved — the reordering
   * contract this whole mechanism is built on.
   */
  it('every destination stays reachable at every bot position', () => {
    for (let botX = 20; botX <= 580; botX += 20) {
      for (const botY of [-240, -300, -420]) {
        for (const sourceColumn of [0, 1, 2]) {
          const { world, rows, from } = evasionCase(sourceColumn, { x: botX, y: botY }, 1);
          for (const destinationColumn of [0, 1, 2]) {
            const destination = rows[2].platforms[destinationColumn];
            const result = planLearnerSelection(world, from, destination);
            expect(selectionRouted(result), `bot ${botX},${botY} src ${sourceColumn} dest ${destinationColumn}`).toBe(true);
          }
        }
      }
    }
  });

  it('the chosen route is always one collision approved', () => {
    const { world, rows, from } = evasionCase(2, { x: 395, y: -300 });
    const destination = rows[2].platforms[1];
    const outcome = chooseLearnerRoute(world, from, standingOn(destination), destination);
    expect(isRouteClear(world, outcome.route!, destination)).toBe(true);
  });
});

describe('SCENARIO D — the bot corners the spark', () => {
  /**
   * No protection is bought anywhere. When the bot is close enough, the best
   * route the spark has still passes inside the capture distance.
   */
  it('a bot on top of the spark leaves it no clean route', () => {
    const threat = { x: 490, y: -240 };
    const { world, rows, from } = evasionCase(2, threat, 1);
    const destination = rows[2].platforms[2];
    const outcome = chooseLearnerRoute(world, from, standingOn(destination), destination);

    expect(outcome.route).not.toBeNull();
    expect(clearanceOf(outcome.route!, threat)).toBeLessThan(G.playerRadius);
  });

  it('a pursuer that reaches the spark still captures it', () => {
    const geometry = defaultTestGeometry();
    const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
    pursuer.y = 50;
    expect(updatePursuer(pursuer, { x: 300, y: 50 }, [], 100, undefined, geometry).state).toBe('CAUGHT');
  });
});

describe('SCENARIO E — routes of similar safety', () => {
  it('the same world and threat always produce the same route', () => {
    const threat = { x: 300, y: -300 };
    const runs = Array.from({ length: 6 }, () => {
      const { world, rows, from } = evasionCase(1, threat);
      const destination = rows[2].platforms[1];
      return chooseLearnerRoute(world, from, standingOn(destination), destination).route;
    });
    runs.forEach((route) => expect(route).toEqual(runs[0]));
  });

  /**
   * Stability under a bot that is barely moving. A choice that flipped on a
   * fraction of a unit would read as the spark changing its mind.
   */
  it('a bot creeping past does not make the choice flicker', () => {
    const chosen: string[] = [];
    for (let botX = 296; botX <= 304; botX += 1) {
      const { world, rows, from } = evasionCase(1, { x: botX, y: -420 });
      const destination = rows[2].platforms[1];
      const route = chooseLearnerRoute(world, from, standingOn(destination), destination).route!;
      chosen.push(route.map((p) => `${Math.round(p.x)}`).join(','));
    }
    const changes = chosen.filter((value, index) => index > 0 && value !== chosen[index - 1]).length;
    expect(changes).toBeLessThanOrEqual(1);
  });

  it('with avoidance off the natural preference is untouched', () => {
    const { world, rows, from } = evasionCase(2, { x: 400, y: -240 }, 0);
    const destination = rows[2].platforms[0];
    const withThreat = chooseLearnerRoute(world, from, standingOn(destination), destination);
    const withoutThreat = chooseLearnerRoute({ ...world, threat: null }, from, standingOn(destination), destination);
    expect(withThreat.route).toEqual(withoutThreat.route);
  });
});

// ---------------------------------------------------------------------------
// Bot movement geometry and cadence
// ---------------------------------------------------------------------------

const GEOMETRY = defaultTestGeometry();
const COLUMNS = computeColumnCentres({ ...G, platformWidth: G.platformWidth });
const row = (index: number) => COLUMNS.map((x, column) => ({
  id: `row-${index}-column-${column}`, row: index, column, x,
  y: -index * G.rowGap, width: G.platformWidth, height: G.platformHeight, dead: false,
}));
const WORLD = [0, 1, 2, 3, 4, 5, 6].flatMap(row);

/** A pursuit, reported as the shape of its movement rather than its outcome. */
function pursue(tuning: any, frames = 900, targetColumn = 0, targetRow = 5) {
  let pursuer = createPursuer(300, 0, tuning, GEOMETRY);
  const player = {
    x: COLUMNS[targetColumn], y: -targetRow * G.rowGap - 35,
    traveling: false, capturable: true, platform: row(targetRow)[targetColumn],
  };
  let both = 0, onlyX = 0, onlyY = 0, turns = 0, hesitated = 0, stalls = 0;
  const moving: boolean[] = [];
  const corridors: Array<number | null> = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const before = { x: pursuer.x, y: pursuer.y };
    pursuer = updatePursuer(pursuer, player, WORLD, 16.7, (step) => {
      if (step.direction.changed) turns += 1;
      if (step.cadence === 'HESITATING') hesitated += 1;
      if (step.stalled) stalls += 1;
      corridors.push(step.chosenCorridor);
    }, GEOMETRY);
    const movedX = Math.abs(pursuer.x - before.x) > 1e-9;
    const movedY = Math.abs(pursuer.y - before.y) > 1e-9;
    if (movedX && movedY) both += 1; else if (movedX) onlyX += 1; else if (movedY) onlyY += 1;
    moving.push(movedX || movedY);
    if (pursuer.state === 'CAUGHT') break;
  }
  return { pursuer, both, onlyX, onlyY, turns, hesitated, stalls, moving, corridors, frames: moving.length };
}

/** Lengths of the alternating runs of movement and stillness. */
function runLengths(flags: boolean[]) {
  const runs: { moving: boolean; length: number }[] = [];
  let current = flags[0];
  let length = 1;
  for (let i = 1; i < flags.length; i += 1) {
    if (flags[i] === current) length += 1;
    else { runs.push({ moving: current, length }); current = flags[i]; length = 1; }
  }
  runs.push({ moving: current, length });
  return runs;
}

describe('SCENARIO F — the bot moves in the spark\'s language', () => {
  /**
   * The spark travels a polyline one segment at a time, so its turns are right
   * angles. The bot spent each frame's budget on both axes at once, which at
   * frame granularity is a diagonal drift — 13% of its moving frames. Committing
   * to a leg is what makes the two read as the same kind of creature.
   */
  it('almost no frame moves on both axes', () => {
    const result = pursue(ALIVE_PURSUER_TUNING);
    const movingFrames = result.both + result.onlyX + result.onlyY;
    expect(movingFrames).toBeGreaterThan(100);
    expect(result.both / movingFrames).toBeLessThan(0.02);
  });

  it('it travels real legs, not one-frame flickers', () => {
    const result = pursue(ALIVE_PURSUER_TUNING);
    // Far more frames on an axis than turns between them.
    expect(result.turns).toBeGreaterThan(0);
    expect(result.frames / Math.max(1, result.turns)).toBeGreaterThan(10);
  });

  it('a leg is held for its share of the leg period', () => {
    const tuning = { legPeriodMs: 400, agitation: 0, climbReserve: 0.45 };
    // climbReserve is the share held back from sideways travel, so it is the
    // vertical leg's share of the time and the rest is the horizontal leg's.
    expect(legBudgetMs('y', tuning)).toBeCloseTo(180, 6);
    expect(legBudgetMs('x', tuning)).toBeCloseTo(220, 6);
    // Neither axis can be starved to nothing, whatever the reserve.
    expect(legBudgetMs('y', { ...tuning, climbReserve: 0 })).toBeCloseTo(80, 6);
  });

  /**
   * Committing to a leg is not the same as finishing one axis before starting
   * the other. Without the leg taking its turn, a frame's whole budget goes to
   * whichever axis is checked first, and the pursuer travels an L: all the way
   * across, then all the way up. It has to alternate, which is what makes the
   * path a staircase and what keeps `climbReserve` meaning anything.
   */
  it('it alternates legs rather than draining one axis first', () => {
    const tuning = { ...ALIVE_PURSUER_TUNING, agitation: 0 };
    let pursuer = createPursuer(300, 0, tuning, GEOMETRY);
    pursuer.x = 110;
    pursuer.y = -400;
    pursuer.behaviour = 'CHASE';
    const player = { x: 490, y: -1000, traveling: false, capturable: true };
    const horizontalGap = Math.abs(player.x - pursuer.x);

    let firstClimbRemainder = -1;
    let axisChanges = 0;
    let lastAxis = '';
    for (let frame = 0; frame < 400; frame += 1) {
      const before = { x: pursuer.x, y: pursuer.y };
      pursuer = updatePursuer(pursuer, player, [], 16.7, (step) => {
        if (step.direction.axis !== lastAxis) { axisChanges += 1; lastAxis = step.direction.axis; }
      }, GEOMETRY);
      if (firstClimbRemainder < 0 && Math.abs(pursuer.y - before.y) > 1e-9) {
        firstClimbRemainder = Math.abs(player.x - pursuer.x) / horizontalGap;
      }
      if (pursuer.state === 'CAUGHT') break;
    }

    // It started climbing with most of the sideways travel still to do.
    expect(firstClimbRemainder).toBeGreaterThan(0.6);
    // And it kept swapping between the two, rather than taking one long leg each.
    expect(axisChanges).toBeGreaterThan(6);
  });

  it('turning the leg model off restores per-frame mixing', () => {
    const state = createLocomotion(1.7);
    const off = chooseLegAxis(state, { x: 50, y: 50, blockedX: false, blockedY: false }, 16, {
      legPeriodMs: 0, agitation: 0, climbReserve: 0,
    });
    expect(off.axis).toBe('x');
    expect(off.state.legElapsed).toBe(0);
  });
});

describe('SCENARIO I — one signal per genuine turn', () => {
  it('holding course reports no change, however long the leg', () => {
    let state = createLocomotion(1.7);
    const tuning = { legPeriodMs: 10000, agitation: 0, climbReserve: 0.5 };
    const intent = { x: 500, y: 0, blockedX: false, blockedY: false };

    const first = chooseLegAxis(state, intent, 16, tuning);
    state = first.state;
    expect(first.changed).toBe(true);          // 0 -> +1 on x is a turn

    for (let frame = 0; frame < 100; frame += 1) {
      const step = chooseLegAxis(state, intent, 16, tuning);
      state = step.state;
      expect(step.changed).toBe(false);
      expect(step.axis).toBe('x');
    }
  });

  it('a change of axis and a reversal along one both count once', () => {
    const tuning = { legPeriodMs: 100, agitation: 0, climbReserve: 0.5 };
    let state = createLocomotion(1.7);

    state = chooseLegAxis(state, { x: 500, y: 0, blockedX: false, blockedY: false }, 16, tuning).state;
    // The x intent is satisfied, so the leg moves to y: one turn.
    const toVertical = chooseLegAxis(state, { x: 0, y: -500, blockedX: false, blockedY: false }, 16, tuning);
    expect(toVertical.changed).toBe(true);
    expect(toVertical.axis).toBe('y');
    state = toVertical.state;

    // Still vertical, now downward: a reversal is a turn too.
    const reversal = chooseLegAxis(state, { x: 0, y: 500, blockedX: false, blockedY: false }, 200, tuning);
    expect(reversal.changed).toBe(true);
    expect(reversal.axis).toBe('y');
    expect(reversal.sign).toBe(1);
  });

  it('the live pursuer reports turns through the step trace', () => {
    const result = pursue(ALIVE_PURSUER_TUNING, 600, 2, 4);
    expect(result.turns).toBeGreaterThan(0);
    // A signal on every frame would be an uncontrolled trigger, not a turn.
    expect(result.turns).toBeLessThan(result.frames / 5);
  });
});

describe('SCENARIO G — irregular locomotion cadence', () => {
  it('agitation 0 never hesitates', () => {
    const result = pursue({ ...ALIVE_PURSUER_TUNING, agitation: 0 }, 400);
    expect(result.hesitated).toBe(0);
  });

  /**
   * The complaint this replaces: the old model was two fixed-period sines, so
   * when it produced pauses at all they arrived on a beat. What matters is not
   * that pauses exist but that their spacing varies.
   */
  it('bursts and pauses vary in length rather than alternating on a beat', () => {
    const result = pursue({ ...ALIVE_PURSUER_TUNING, agitation: 0.55 }, 900);
    const runs = runLengths(result.moving);
    const bursts = runs.filter((run) => run.moving).map((run) => run.length);
    const pauses = runs.filter((run) => !run.moving).map((run) => run.length);

    expect(bursts.length).toBeGreaterThan(4);
    expect(pauses.length).toBeGreaterThan(4);
    expect(new Set(bursts).size).toBeGreaterThan(2);
    expect(new Set(pauses).size).toBeGreaterThan(2);
    // Not a metronome: the longest burst is well clear of the shortest.
    expect(Math.max(...bursts)).toBeGreaterThan(Math.min(...bursts) * 1.5);
  });

  /**
   * The measurement the complaint deserves. "Irregular" is not that pauses
   * exist — the old sine model produced those too — it is that no burst
   * predicts the next. Over 6000 frames the burst lengths have a coefficient of
   * variation around 0.62, and consecutive bursts land within two frames of
   * each other twice in 67. A fixed-length burst would score near zero on the
   * first and near everything on the second.
   */
  it('no burst predicts the length of the next', () => {
    let state = createLocomotion(1.7);
    const moving: boolean[] = [];
    for (let frame = 0; frame < 6000; frame += 1) {
      const step = advanceCadence(state, 16.7, { legPeriodMs: 420, agitation: 0.55, climbReserve: 0.45 });
      moving.push(step.moving);
      state = step.state;
    }
    const bursts = runLengths(moving).filter((run) => run.moving).map((run) => run.length);
    expect(bursts.length).toBeGreaterThan(20);

    const mean = bursts.reduce((sum, value) => sum + value, 0) / bursts.length;
    const deviation = Math.sqrt(
      bursts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / bursts.length,
    );
    expect(deviation / mean).toBeGreaterThan(0.35);

    const consecutiveAlike = bursts.filter((value, index) =>
      index > 0 && Math.abs(value - bursts[index - 1]) <= 2).length;
    expect(consecutiveAlike / (bursts.length - 1)).toBeLessThan(0.25);
  });

  it('more agitation means shorter bursts and more pausing', () => {
    const calm = pursue({ ...ALIVE_PURSUER_TUNING, agitation: 0.25 }, 900);
    const frantic = pursue({ ...ALIVE_PURSUER_TUNING, agitation: 0.9 }, 900);
    expect(frantic.hesitated / frantic.frames).toBeGreaterThan(calm.hesitated / calm.frames);
    expect(burstDurationMs(0.9, 0.5)).toBeLessThan(burstDurationMs(0.25, 0.5));
    expect(hesitationDurationMs(0.9, 0.5)).toBeGreaterThan(hesitationDurationMs(0.25, 0.5));
    expect(hesitationChance(0.9)).toBeGreaterThan(hesitationChance(0.25));
  });

  /**
   * Where the variability is actually made. The run lengths above are dominated
   * by how often two bursts run together, so they stay irregular even if every
   * burst is the same length — which means they cannot, on their own, hold the
   * durations to being drawn at all. These check the draw itself.
   */
  it('a longer draw is a longer burst, and a longer pause', () => {
    for (const agitation of [0.25, 0.55, 0.9]) {
      expect(burstDurationMs(agitation, 0)).toBeLessThan(burstDurationMs(agitation, 1));
      expect(hesitationDurationMs(agitation, 0)).toBeLessThan(hesitationDurationMs(agitation, 1));
    }
  });

  it('the burst that follows a pause is drawn, not fixed', () => {
    let state = createLocomotion(1.7);
    const tuning = { legPeriodMs: 420, agitation: 0.8, climbReserve: 0.45 };
    const afterPause: number[] = [];
    let wasHesitating = false;
    let length = 0;
    for (let frame = 0; frame < 6000; frame += 1) {
      const step = advanceCadence(state, 16.7, tuning);
      state = step.state;
      if (!step.moving) {
        if (length > 0) { afterPause.push(length); length = 0; }
        wasHesitating = true;
      } else if (wasHesitating) {
        length += 1;
      }
      if (step.moving && !wasHesitating) length = 0;
    }
    expect(afterPause.length).toBeGreaterThan(20);
    expect(new Set(afterPause).size).toBeGreaterThan(afterPause.length / 3);
  });

  it('durations stay inside their bounds at every agitation', () => {
    for (let agitation = 0; agitation <= 1; agitation += 0.05) {
      for (const draw of [0, 0.25, 0.5, 0.75, 1]) {
        expect(burstDurationMs(agitation, draw)).toBeGreaterThanOrEqual(90);
        const pause = hesitationDurationMs(agitation, draw);
        expect(pause).toBeGreaterThanOrEqual(40);
        expect(pause).toBeLessThanOrEqual(420);
      }
      expect(hesitationChance(agitation)).toBeLessThan(1);
    }
  });

  it('a pause is never followed by another pause', () => {
    let state = createLocomotion(3.1);
    const tuning = { legPeriodMs: 420, agitation: 0.9, climbReserve: 0.45 };
    let wasHesitating = false;
    for (let frame = 0; frame < 4000; frame += 1) {
      const step = advanceCadence(state, 16.7, tuning);
      const hesitating = !step.moving;
      // A hesitation that begins immediately after one ends would be one long
      // pause with a seam in it, and would read as a freeze.
      if (wasHesitating && state.cadenceRemaining <= 0) expect(hesitating).toBe(false);
      wasHesitating = hesitating;
      state = step.state;
    }
  });

  it('the same seed replays exactly', () => {
    const play = () => {
      let state = createLocomotion(1.7);
      const marks: boolean[] = [];
      for (let frame = 0; frame < 500; frame += 1) {
        const step = advanceCadence(state, 16.7, { legPeriodMs: 420, agitation: 0.7, climbReserve: 0.45 });
        marks.push(step.moving);
        state = step.state;
      }
      return marks.join('');
    };
    expect(play()).toBe(play());
  });
});

describe('SCENARIO H — navigation survives the cadence', () => {
  /**
   * The rule the whole separation exists for: hesitating changes when the
   * pursuer moves, never where it was going.
   */
  it('a hesitating frame still tracks the learner and holds its corridor', () => {
    const tuning = { ...ALIVE_PURSUER_TUNING, agitation: 1 };
    let pursuer = createPursuer(300, 0, tuning, GEOMETRY);
    const player = { x: COLUMNS[0], y: -4 * G.rowGap - 35, traveling: false, capturable: true, platform: row(4)[0] };

    let checkedPause = false;
    for (let frame = 0; frame < 600; frame += 1) {
      const before = { corridor: pursuer.crossingCorridorX, lastKnown: pursuer.lastKnownX };
      let hesitated = false;
      const after = updatePursuer(pursuer, player, WORLD, 16.7, (step) => {
        hesitated = step.cadence === 'HESITATING';
        if (hesitated) {
          // The pause is not reported as a navigation stall.
          expect(step.stalled).toBe(false);
          expect(step.budget).toBe(0);
        }
      }, GEOMETRY);
      if (hesitated && before.corridor !== null) {
        expect(after.crossingCorridorX).toBe(before.corridor);
        checkedPause = true;
      }
      pursuer = after;
      if (pursuer.state === 'CAUGHT') break;
    }
    expect(checkedPause).toBe(true);
  });

  it('it still catches a stationary learner at full agitation', () => {
    const result = pursue({ ...ALIVE_PURSUER_TUNING, agitation: 1 }, 3000, 0, 4);
    expect(result.pursuer.state).toBe('CAUGHT');
  });

  it('it never ends a frame inside a platform, however erratic the cadence', () => {
    let pursuer = createPursuer(300, 0, { ...ALIVE_PURSUER_TUNING, agitation: 1 }, GEOMETRY);
    const player = { x: COLUMNS[2], y: -5 * G.rowGap - 35, traveling: false, capturable: true, platform: row(5)[2] };
    let frames = 0;
    for (let frame = 0; frame < 1200; frame += 1) {
      pursuer = updatePursuer(pursuer, player, WORLD, 16.7, undefined, GEOMETRY);
      frames += 1;
      for (const platform of WORLD) {
        const inside =
          pursuer.x > platform.x - platform.width / 2 &&
          pursuer.x < platform.x + platform.width / 2 &&
          pursuer.y > platform.y && pursuer.y < platform.y + platform.height;
        expect(inside, `inside ${platform.id} at frame ${frame}`).toBe(false);
      }
      if (pursuer.state === 'CAUGHT') break;
    }
    expect(frames).toBeGreaterThan(100);
  });
});

describe('agitation is a rhythm, not a speed cut', () => {
  /**
   * Hesitation forfeits frames, and forfeited frames are lost ground. At 0.55
   * that is about an eighth of the travel, which takes the live search speed
   * from 0.130 to 0.114 — below the 0.1214 the learner's own climb rate
   * demands — and the pursuit dies exactly as it did before 05B. The moving
   * frames carry what the pauses gave up.
   */
  it('the duty cycle and its compensation are reciprocal', () => {
    for (const agitation of [0, 0.25, 0.55, 0.9, 1]) {
      const duty = movingDutyCycle(agitation);
      expect(duty).toBeGreaterThan(0);
      expect(duty).toBeLessThanOrEqual(1);
      expect(duty * cadenceSpeedCompensation(agitation)).toBeCloseTo(1, 9);
    }
    expect(movingDutyCycle(0)).toBe(1);
    expect(cadenceSpeedCompensation(0)).toBe(1);
    expect(movingDutyCycle(0.9)).toBeLessThan(movingDutyCycle(0.25));
  });

  it('ground covered barely moves as agitation rises', () => {
    const travelled = (agitation: number) => {
      let pursuer = createPursuer(300, 0, {
        ...ALIVE_PURSUER_TUNING, agitation, wanderAmplitude: 0, speedJitter: 0, climbReserve: 0,
      }, GEOMETRY);
      pursuer.y = -1000;
      pursuer.behaviour = 'SEARCH';
      pursuer.lastKnownX = 300;
      pursuer.lastKnownY = -1000;
      const start = pursuer.y;
      for (let frame = 0; frame < 1500; frame += 1) {
        pursuer = updatePursuer(pursuer, { x: 300, y: -100000 }, [], 16.7, undefined, GEOMETRY);
      }
      return start - pursuer.y;
    };
    const calm = travelled(0);
    for (const agitation of [0.25, 0.55, 0.9]) {
      const ratio = travelled(agitation) / calm;
      expect(ratio, `agitation ${agitation}`).toBeGreaterThan(0.85);
      expect(ratio, `agitation ${agitation}`).toBeLessThan(1.15);
    }
  });
});

describe('LOCKED: the frozen baseline is untouched', () => {
  it('the baseline tuning has no cadence and no leg commitment', () => {
    expect(BASELINE_PURSUER_TUNING.agitation).toBe(0);
    expect(BASELINE_PURSUER_TUNING.legPeriodMs).toBe(0);
  });

  it('a baseline pursuer never hesitates and never stalls on cadence', () => {
    const result = pursue(BASELINE_PURSUER_TUNING, 600);
    expect(result.hesitated).toBe(0);
  });

  it('agitation 0 does not advance the generator', () => {
    const state = createLocomotion(1.7);
    const after = advanceCadence(state, 16.7, { legPeriodMs: 0, agitation: 0, climbReserve: 0 });
    expect(after.state.rngState).toBe(state.rngState);
    expect(after.moving).toBe(true);
  });

  it('speed jitter alone can no longer stop the pursuer', () => {
    // The old floor was 0.12 of the configured speed — low enough to read as a
    // stop, and reached on a fixed beat. Neither shipped tuning ever reaches
    // the new floor, so neither changes.
    const tuning = { ...ALIVE_PURSUER_TUNING, agitation: 0, speedJitter: 1 };
    let pursuer = createPursuer(300, 0, tuning, GEOMETRY);
    const player = { x: 300, y: -3 * G.rowGap - 35, traveling: false, capturable: true, platform: row(3)[1] };
    let still = 0;
    for (let frame = 0; frame < 600; frame += 1) {
      const before = { x: pursuer.x, y: pursuer.y };
      pursuer = updatePursuer(pursuer, player, WORLD, 16.7, undefined, GEOMETRY);
      if (pursuer.x === before.x && pursuer.y === before.y) still += 1;
      if (pursuer.state === 'CAUGHT') break;
    }
    expect(still).toBe(0);
  });
});
