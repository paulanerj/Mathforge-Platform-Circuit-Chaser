import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import type { PursuerStep } from '../pursuer/circuitClimbPursuerTrace';
import { PursuerTracer } from '../pursuer/circuitClimbPursuerTrace';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG } from '../geometry/circuitClimbGeometry';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';

/**
 * "It was chasing, then it got lost and just sat there."
 *
 * The search vertical target was Math.min(lastKnownY, y - 1). Two faults in one
 * expression, and the step trace showed both: a pursuer 538 units below the
 * player, steering for a point 1 unit above its own head.
 */

const alive = (x: number, y: number) => {
  const p = createPursuer(x, 0, ALIVE_PURSUER_TUNING, defaultTestGeometry());
  p.y = y;
  return p;
};

/** Puts the pursuer into SEARCH with a chosen last sighting. */
function searchingAt(pursuerY: number, sightingY: number) {
  const p = alive(300, pursuerY);
  p.behaviour = 'SEARCH';
  p.lastKnownX = 300;
  p.lastKnownY = sightingY;
  return p;
}

/** Somewhere the pursuer cannot possibly sense, so it stays in SEARCH. */
const unreachablePlayer = { x: 300, y: -100000 };

describe('LOCKED: a searching pursuer keeps hunting upward at its real speed', () => {
  it('heads for a sighting that is still above it', () => {
    const pursuer = searchingAt(0, -CONFIG.rowGap * 3);
    let step: PursuerStep | undefined;
    updatePursuer(pursuer, unreachablePlayer, [], 16, (s) => { step = s; });

    expect(step!.behaviour).toBe('SEARCH');
    expect(step!.desired.y).toBeCloseTo(-CONFIG.rowGap * 3, 3);
  });

  it('keeps climbing once it is past the sighting, aiming a whole row on', () => {
    let pursuer = searchingAt(-1000, -1000);
    const start = pursuer.y;
    let step: PursuerStep | undefined;
    // A short window rather than a single frame: the live pursuer's locomotion
    // cadence is allowed to spend a beat hesitating, and this test is about
    // where the search is aimed, not about which frame it spends.
    for (let f = 0; f < 40; f += 1) {
      pursuer = updatePursuer(pursuer, unreachablePlayer, [], 16, (s) => { if (!step) step = s; });
    }

    expect(step!.desired.y).toBeCloseTo(-1000 - CONFIG.rowGap, 3);
    expect(pursuer.y).toBeLessThan(start);
  });

  it('does not oscillate around the sighting it has passed', () => {
    // An "arrived yet?" tolerance band flips as the pursuer crosses it, leaving
    // it bobbing either side of the sighting instead of searching onward.
    let pursuer = searchingAt(-1000, -1000);
    const heights: number[] = [];
    for (let f = 0; f < 200; f += 1) {
      pursuer = updatePursuer(pursuer, unreachablePlayer, [], 16);
      heights.push(pursuer.y);
    }
    // Monotonically upward: never once turns back down.
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]).toBeLessThanOrEqual(heights[i - 1]);
    }
    // Real ground covered, not a crawl. The sweep and the climb reserve each
    // take their share of the frame budget, so this is well under a full row in
    // 200 frames — the point is that it is sustained and one-directional.
    expect(-1000 - heights[heights.length - 1]).toBeGreaterThan(100);
  });

  // Isolating the cap: no sweep, no climb reserve and no hesitation, so the
  // whole frame budget is available vertically and nothing else can explain a
  // short climb. `agitation: 0` belongs with the others — it redistributes the
  // budget across frames, which is exactly the variable this test holds still.
  const pureClimb = (searchSpeed: number) =>
    ({ ...ALIVE_PURSUER_TUNING, searchSpeed, speedJitter: 0, wanderAmplitude: 0, climbReserve: 0, agitation: 0 });

  it('spends its whole frame budget climbing, rather than one unit a frame', () => {
    // The crawl: when `y - 1` won, vertical intent was a single unit, so the
    // climb was capped at 1 unit per frame however large the budget was.
    const tuning = pureClimb(0.3);
    const pursuer = createPursuer(300, 0, tuning, defaultTestGeometry());
    pursuer.y = -1000;
    pursuer.behaviour = 'SEARCH';
    pursuer.lastKnownX = 300;
    pursuer.lastKnownY = -1000; // already at the sighting

    const budget = tuning.searchSpeed * 16; // 4.8 units this frame
    const climbed = pursuer.y - updatePursuer(pursuer, unreachablePlayer, [], 16).y;

    expect(budget).toBeGreaterThan(1); // the cap would have bitten
    expect(climbed).toBeCloseTo(budget, 6);
  });

  it('a faster search setting actually searches faster', () => {
    const run = (searchSpeed: number) => {
      let p = createPursuer(300, 0, pureClimb(searchSpeed), defaultTestGeometry());
      p.y = -1000; p.behaviour = 'SEARCH'; p.lastKnownX = 300; p.lastKnownY = -1000;
      const start = p.y;
      for (let f = 0; f < 60; f += 1) p = updatePursuer(p, unreachablePlayer, [], 16);
      return start - p.y;
    };
    // Under the cap both settings crawled at the same 1 unit a frame.
    expect(run(0.2)).toBeGreaterThan(run(0.05) * 3);
  });

  it('closes on a sighting far above it over a sustained search', () => {
    let pursuer = searchingAt(0, -CONFIG.rowGap * 4);
    const startGap = Math.abs(pursuer.y - pursuer.lastKnownY);
    for (let f = 0; f < 400; f += 1) {
      pursuer = updatePursuer(pursuer, unreachablePlayer, [], 16);
    }
    expect(Math.abs(pursuer.y - pursuer.lastKnownY)).toBeLessThan(startGap);
  });
});

describe('LOCKED: the tracer notices a pursuer that moves but never closes', () => {
  const baseStep = (distance: number, x: number): PursuerStep => ({
    frame: 0, behaviour: 'SEARCH', distanceToPlayer: distance,
    desired: { x, y: 0 }, lastKnown: { x, y: 0 }, speedScale: 1,
    delta: 16, budget: 1.5,
    cadence: 'MOVING', direction: { axis: 'x', sign: 1, changed: false },
    from: { x, y: 0 }, to: { x, y: 0 }, player: { x: 0, y: distance },
    nextRowY: null, rowTop: null, rowBottom: null, mustCrossRow: false,
    mode: 'DIRECT', rowPlatformCount: 0, corridors: [], chosenCorridor: null,
    targetX: x,
    horizontal: { intent: 0, attempted: 1, blocked: false, applied: 1 },
    vertical: { intent: 0, attempted: 1, blocked: false, applied: 1 },
    budgetAfterHorizontal: 0, stalled: false, stallReason: null,
  });

  it('raises NOT_CLOSING for a busy pursuer that never gets nearer', () => {
    // Every frame it moves. STALLED needs exact zero movement, so it never fires.
    const tracer = new PursuerTracer(5000, 45, 120, 260);
    let alert = null;
    for (let f = 0; f < 240 && !alert; f += 1) {
      alert = tracer.record(baseStep(600, f % 2 === 0 ? 100 : 140));
    }
    expect(alert).not.toBeNull();
    expect(alert!.kind).toBe('NOT_CLOSING');
    expect(alert!.distanceToPlayer).toBe(600);
  });

  it('stays quiet while the gap is actually shrinking', () => {
    const tracer = new PursuerTracer(5000, 45, 120, 260);
    let alert = null;
    for (let f = 0; f < 240 && !alert; f += 1) {
      alert = tracer.record(baseStep(900 - f * 2, 100));
    }
    expect(alert).toBeNull();
  });

  it('stays quiet in close quarters, where holding is legitimate', () => {
    const tracer = new PursuerTracer(5000, 45, 120, 260);
    let alert = null;
    for (let f = 0; f < 240 && !alert; f += 1) {
      alert = tracer.record(baseStep(40, 100));
    }
    expect(alert).toBeNull();
  });
});
