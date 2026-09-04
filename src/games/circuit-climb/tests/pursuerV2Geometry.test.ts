/**
 * GRAPH_V2 CONSUMES LIVE PRODUCTION GEOMETRY.
 *
 * The Lab developed the graph against `sim/framing.ts`, a standalone
 * reimplementation of the runtime's scaling, and ran its human sessions at a
 * fixed 90%. Both of those were scaffolding. In production the board is owned
 * by `circuitClimbGeometry.ts` and the player can change the view scale at
 * will, so these gates check the two things that could quietly go wrong:
 *
 *   1. the adapter agrees with the engine about where the board IS, and
 *   2. nothing about Graph V2 is pinned to the 90% experiment.
 */
import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY,
  computeColumnCentres,
} from '../geometry/circuitClimbGeometry';
import {
  graphWorldFromLiveGeometry,
  absoluteColumnsFromLiveGeometry,
  graphWorldChanged,
} from '../pursuer-v2/runtime/graphWorld';
import { productionLiveGeometryAt, productionGraphWorldAt } from '../pursuer-v2/testing/productionWorld';
import { solveGraphActorRadius, graphActorRadiusFor } from '../pursuer-v2/graph/graphActorRadius';
import { buildPursuitGraph, MIN_LANE_WIDTH } from '../pursuer-v2/graph/pursuitGraph';

const FRAMINGS = [80, 85, 90, 95, 100, 105, 110, 115, 120];

describe('the graph world is derived from live production geometry', () => {
  it('reproduces the runtime scaling from the production geometry authority', () => {
    // Values the runtime's applyViewScale would hold, computed from the
    // authority module rather than restated as literals here.
    for (const percent of FRAMINGS) {
      const zoom = percent / 100;
      const live = productionLiveGeometryAt(percent);
      expect(live.rowGap).toBeCloseTo(CIRCUIT_CLIMB_GEOMETRY.rowGap * zoom, 12);
      expect(live.playerRadius).toBeCloseTo(CIRCUIT_CLIMB_GEOMETRY.playerRadius * zoom, 12);
      expect(live.platformWidth).toBeCloseTo(CIRCUIT_CLIMB_GEOMETRY.platformWidth * (0.98 + 0.02 * zoom), 12);
      expect(live.platformHeight).toBeCloseTo(CIRCUIT_CLIMB_GEOMETRY.platformHeight * Math.pow(zoom, 0.48), 12);
      expect(live.logicalWidth).toBe(CIRCUIT_CLIMB_GEOMETRY.logicalWidth);
    }
  });

  it('the graph columns agree with the columns the engine actually renders', () => {
    // The adapter re-derives absolute centres through production's own
    // computeColumnCentres rather than multiplying the runtime's stored
    // fractions back out (that round trip loses the last bit). This pins the
    // two representations together so they cannot drift apart.
    for (const percent of FRAMINGS) {
      const live = productionLiveGeometryAt(percent);
      const world = graphWorldFromLiveGeometry(live, percent);
      const rendered = absoluteColumnsFromLiveGeometry(live);
      expect(world.columns).toHaveLength(rendered.length);
      world.columns.forEach((x, i) => expect(x).toBeCloseTo(rendered[i], 9));
    }
  });

  it('at the accepted geometry the columns are exactly 110 / 300 / 490', () => {
    const world = productionGraphWorldAt(100);
    expect(world.columns).toEqual([110, 300, 490]);
    // ...and the derivation is production's, not a private copy.
    expect(world.columns).toEqual(computeColumnCentres({
      playerRadius: CIRCUIT_CLIMB_GEOMETRY.playerRadius,
      routePlatformPadding: CIRCUIT_CLIMB_GEOMETRY.routePlatformPadding,
      logicalWidth: CIRCUIT_CLIMB_GEOMETRY.logicalWidth,
      platformWidth: CIRCUIT_CLIMB_GEOMETRY.platformWidth,
    }));
  });
});

describe('Graph V2 is not pinned to the 90% framing experiment', () => {
  it('builds a four-trunk network at every supported view scale', () => {
    for (const percent of FRAMINGS) {
      const world = productionGraphWorldAt(percent);
      const radius = graphActorRadiusFor(world);
      const graph = buildPursuitGraph(world, 14, radius, 2);
      expect(graph.trunks.map((t) => t.id), `framing ${percent}%`).toEqual(['A', 'B', 'C', 'D']);
      expect(graph.levels.length, `framing ${percent}%`).toBeGreaterThan(0);
    }
  });

  it('derives actor clearance live from the board, not from a stored constant', () => {
    // If the radius were hard-coded to the 90% experiment these would all be
    // equal. They are not: as the view scales up the cards grow and the
    // columns open outward, so the exterior air the body has to fit through
    // actually SHRINKS (26.1 at 80% down to 19.28 at 120%).
    const radii = FRAMINGS.map((p) => graphActorRadiusFor(productionGraphWorldAt(p)));
    expect(new Set(radii).size).toBe(FRAMINGS.length);
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeLessThanOrEqual(radii[i - 1]);
    }

    // The defining property of the derivation, at EVERY framing: the actor is
    // sized so the binding exterior lane lands exactly on the minimum passable
    // gap. That is what "derived live from geometry" actually means, and it is
    // a far stronger statement than any single expected number.
    for (const percent of FRAMINGS) {
      const solution = solveGraphActorRadius(productionGraphWorldAt(percent));
      expect(solution.feasible, `framing ${percent}%`).toBe(true);
      expect(solution.bindingLane, `framing ${percent}%`).toBe('exterior');
      expect(Math.min(...Object.values(solution.lanes)), `framing ${percent}%`)
        .toBeGreaterThanOrEqual(MIN_LANE_WIDTH);
      // Floored to 0.01, so the lane may exceed the minimum by at most the
      // clearance two hundredths of a radius buys.
      expect(solution.lanes.A, `framing ${percent}%`).toBeLessThan(MIN_LANE_WIDTH + 0.05);
    }
  });

  it('sizing the graph actor never changes the learner\'s own radius', () => {
    // LAB 02A found the exterior trunks uninhabitable for a learner-sized
    // body. The fix was to give the GRAPH actor its own radius — explicitly
    // not to shrink the player.
    for (const percent of FRAMINGS) {
      const world = productionGraphWorldAt(percent);
      expect(solveGraphActorRadius(world).learnerRadius).toBe(world.playerRadius);
      expect(world.playerRadius).toBeCloseTo(CIRCUIT_CLIMB_GEOMETRY.playerRadius * (percent / 100), 12);
    }
  });
});

describe('a view-scale change is detected so the graph can be rebuilt', () => {
  it('reports a change when the board actually moves, and not otherwise', () => {
    const at90 = productionGraphWorldAt(90);
    const at100 = productionGraphWorldAt(100);
    expect(graphWorldChanged(null, at90)).toBe(true);
    expect(graphWorldChanged(at90, at90)).toBe(false);
    expect(graphWorldChanged(at90, productionGraphWorldAt(90))).toBe(false);
    expect(graphWorldChanged(at90, at100)).toBe(true);
  });
});
