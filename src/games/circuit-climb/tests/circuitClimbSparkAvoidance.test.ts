import { describe, it, expect } from 'vitest';
import {
  chooseRouteAgainstThreat,
  pathClearance,
  distancePointToSegment,
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
} from '../geometry/circuitClimbGeometry';

/**
 * Spark route avoidance.
 *
 * The load-bearing property is the last describe block: the threat may only
 * reorder routes, never remove one. Route rejection is what made every platform
 * unclickable in SOT 20, and a pursuer able to veto routes could reproduce it
 * just by standing in the wrong place.
 */

const THREAT_RADIUS = CONFIG.playerRadius * 2 + 60;

/** A route through corridor B, and one through corridor C, same destination. */
const viaLeftCorridor = { points: [{ x: 300, y: 0 }, { x: 205, y: 0 }, { x: 205, y: -205 }, { x: 300, y: -205 }] };
const viaRightCorridor = { points: [{ x: 300, y: 0 }, { x: 395, y: 0 }, { x: 395, y: -205 }, { x: 300, y: -205 }] };

describe('Route clearance maths', () => {
  it('measures distance to a segment, including past its ends', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    expect(distancePointToSegment({ x: 50, y: 30 }, a, b)).toBeCloseTo(30, 6);
    expect(distancePointToSegment({ x: -40, y: 0 }, a, b)).toBeCloseTo(40, 6);
    expect(distancePointToSegment({ x: 140, y: 0 }, a, b)).toBeCloseTo(40, 6);
  });

  it('reports how close a route comes to a point at its closest', () => {
    // Sitting on the corridor leg: no clearance at all.
    expect(pathClearance(viaLeftCorridor.points, { x: 205, y: -100 })).toBeCloseTo(0, 6);

    // Over in the right-hand corridor: the closest approach is not the corridor
    // leg 190 away, but the route's own start and landing legs, which reach
    // across to x=300. Measuring only the corridor would overstate the clearance.
    const acrossTheRow = pathClearance(viaLeftCorridor.points, { x: 395, y: -100 });
    expect(acrossTheRow).toBeGreaterThan(120);
    expect(acrossTheRow).toBeLessThan(190);

    expect(pathClearance([], { x: 0, y: 0 })).toBe(Infinity);
  });
});

describe('Steering the spark around the bot', () => {
  it('a bot sitting in the left corridor sends the spark right', () => {
    const botInLeftCorridor = { x: 205, y: -100 };
    const chosen = chooseRouteAgainstThreat(
      [viaLeftCorridor, viaRightCorridor], botInLeftCorridor, 1, THREAT_RADIUS,
    );
    expect(chosen).toBe(1);
  });

  it('a bot sitting in the right corridor leaves the spark on the left', () => {
    const botInRightCorridor = { x: 395, y: -100 };
    const chosen = chooseRouteAgainstThreat(
      [viaLeftCorridor, viaRightCorridor], botInRightCorridor, 1, THREAT_RADIUS,
    );
    expect(chosen).toBe(0);
  });

  it('a bot far from both routes leaves the natural preference alone', () => {
    const distantBot = { x: 300, y: 900 };
    const chosen = chooseRouteAgainstThreat(
      [viaLeftCorridor, viaRightCorridor], distantBot, 1, THREAT_RADIUS,
    );
    expect(chosen).toBe(0);
  });

  it('it weighs exposure continuously rather than flipping on which side the bot is', () => {
    // Barely inside the threat radius of the preferred route: not worth the
    // detour. Sitting on it: worth the detour.
    const grazing = { x: 205 - THREAT_RADIUS * 0.95, y: -100 };
    const onTheRoute = { x: 205, y: -100 };
    expect(chooseRouteAgainstThreat([viaLeftCorridor, viaRightCorridor], grazing, 0.5, THREAT_RADIUS)).toBe(0);
    expect(chooseRouteAgainstThreat([viaLeftCorridor, viaRightCorridor], onTheRoute, 0.5, THREAT_RADIUS)).toBe(1);
  });

  it('avoidance turned off reproduces the original first-clear-route-wins ordering', () => {
    const botOnTheRoute = { x: 205, y: -100 };
    expect(chooseRouteAgainstThreat([viaLeftCorridor, viaRightCorridor], botOnTheRoute, 0, THREAT_RADIUS)).toBe(0);
  });

  it('the chosen route really is the roomier one when avoidance is on', () => {
    const botInLeftCorridor = { x: 205, y: -100 };
    const candidates = [viaLeftCorridor, viaRightCorridor];
    const chosen = chooseRouteAgainstThreat(candidates, botInLeftCorridor, 1, THREAT_RADIUS);
    const chosenClearance = pathClearance(candidates[chosen].points, botInLeftCorridor);
    const naturalClearance = pathClearance(candidates[0].points, botInLeftCorridor);
    expect(chosenClearance).toBeGreaterThan(naturalClearance);
  });
});

describe('LOCKED: the bot can reorder routes but never remove one', () => {
  it('always returns a candidate that was offered, whatever the threat', () => {
    const candidates = [viaLeftCorridor, viaRightCorridor];
    const positions = [
      { x: 205, y: -100 }, { x: 395, y: -100 }, { x: 300, y: -205 },
      { x: 300, y: 0 }, { x: 0, y: 0 }, { x: 600, y: -400 },
    ];
    for (const threat of positions) {
      for (const avoidance of [0, 0.25, 0.5, 0.75, 1]) {
        const chosen = chooseRouteAgainstThreat(candidates, threat, avoidance, THREAT_RADIUS);
        expect(chosen).toBeGreaterThanOrEqual(0);
        expect(chosen).toBeLessThan(candidates.length);
      }
    }
  });

  it('a bot sitting on top of the only route still yields that route', () => {
    // The case that must never become a dead click: one clear route, bot on it.
    const chosen = chooseRouteAgainstThreat([viaLeftCorridor], { x: 205, y: -100 }, 1, THREAT_RADIUS);
    expect(chosen).toBe(0);
  });

  it('an empty candidate list is reported as such, not invented around', () => {
    expect(chooseRouteAgainstThreat([], { x: 0, y: 0 }, 1, THREAT_RADIUS)).toBe(-1);
  });
});

describe('Shielded transit', () => {
  it('a spark marked uncapturable is not taken even on contact', async () => {
    const { createPursuer, updatePursuer } = await import('../pursuer/circuitClimbPursuer');
    const { defaultTestGeometry: getGeometry } = await import('./support/circuitClimbProductionFixtures');
    const pursuer = createPursuer(300, 0, undefined, getGeometry());
    pursuer.y = 50;
    const onTop = { x: 300, y: 50 };

    expect(updatePursuer(pursuer, { ...onTop, capturable: false }, [], 100).state).toBe('PURSUING');
    expect(updatePursuer(pursuer, onTop, [], 100).state).toBe('CAUGHT');
  });

  it('the shield is the only thing that changes — it still closes in', async () => {
    const { createPursuer, updatePursuer } = await import('../pursuer/circuitClimbPursuer');
    const { defaultTestGeometry: getGeometry } = await import('./support/circuitClimbProductionFixtures');
    const pursuer = createPursuer(300, 0, undefined, getGeometry());
    pursuer.y = 400;
    const shielded = updatePursuer(pursuer, { x: 300, y: 0, capturable: false }, [], 100);
    const exposed = updatePursuer(pursuer, { x: 300, y: 0 }, [], 100);
    expect(shielded.x).toBe(exposed.x);
    expect(shielded.y).toBe(exposed.y);
  });
});
