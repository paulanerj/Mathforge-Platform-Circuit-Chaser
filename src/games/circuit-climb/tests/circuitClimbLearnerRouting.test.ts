import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  LearnerRoutingWorld,
  planLearnerSelection,
  selectionRouted,
  pathMetrics,
} from '../runtime/circuitClimbLearnerRouting';
import { CIRCUIT_CLIMB_GEOMETRY as G } from '../geometry/circuitClimbGeometry';

/**
 * The learner routing transaction, exercised as one production unit.
 *
 * This is the coverage that did not exist when every platform in the game
 * became unclickable: buildCircuitPath returned null for every candidate,
 * selectPlatform swallowed the click, and a fully green suite noticed nothing.
 */

import {
  PRODUCTION_PLATFORM_KEYS,
  DEFAULT_ROUTING_CONFIG as CONFIG,
  makeProductionRow as makeRowFixture,
  baseRoutingWorld as baseWorld,
  standingOn,
} from './support/circuitClimbProductionFixtures';

describe('Fixture fidelity', () => {
  it('the test platform shape is exactly what production makeRow builds, no richer', () => {
    // Tests that invent a richer platform than production is the exact trap that
    // let a whole era of green suites validate identity behaviour production did
    // not have. This reads the real source so the fixture cannot drift.
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts'),
      'utf8',
    );
    const start = source.indexOf('const platforms = CONFIG.columns.map((fraction, column) => ({');
    expect(start).toBeGreaterThan(-1);
    const literal = source.slice(start, source.indexOf('}));', start));
    // `column,` and `y,` are shorthand properties, so both forms must match.
    const productionKeys = [...literal.matchAll(/^\s+([a-zA-Z]+)(?::|,\s*$)/gm)].map((m) => m[1]);

    const fixtureKeys = Object.keys(makeRowFixture(1).platforms[0]);
    expect(fixtureKeys.sort()).toEqual(PRODUCTION_PLATFORM_KEYS.slice().sort());
    PRODUCTION_PLATFORM_KEYS.forEach((key) => expect(productionKeys).toContain(key));
    expect(productionKeys.sort()).toEqual(fixtureKeys.sort());
  });
});

describe('LOCKED: every first-row destination is selectable', () => {
  // The SOT-20 failure: the learner could click any of these and nothing at all
  // happened, at every column, on every move of every game.
  for (const [column, label] of [[0, 'LEFT'], [1, 'CENTER'], [2, 'RIGHT']] as const) {
    it(`first ${label} platform produces a travel transaction`, () => {
      const { world, rows } = baseWorld();
      const destination = rows[1].platforms[column];
      const result = planLearnerSelection(world, standingOn(world.sourcePlatform), destination);

      expect(selectionRouted(result)).toBe(true);
      if (!selectionRouted(result)) return;
      expect(result.travel.platform).toBe(destination);
      expect(result.route.length).toBeGreaterThanOrEqual(2);
      expect(result.travel.total).toBeGreaterThan(0);
      expect(result.landing).toEqual(standingOn(destination));
    });
  }
});

describe('LOCKED: mathematical correctness never gates selection', () => {
  it('a wrong destination routes and travels exactly like a right one', () => {
    // Product decision, not an implementation detail. A wrong platform is a
    // legitimate destination; correctness is resolved on landing.
    const { world, rows } = baseWorld();
    const right = rows[1].platforms[0];
    const wrong = rows[1].platforms[2];
    right.correct = true;
    wrong.correct = false;

    const from = standingOn(world.sourcePlatform);
    const a = planLearnerSelection(world, from, right);
    const b = planLearnerSelection(world, from, wrong);

    expect(selectionRouted(a)).toBe(true);
    expect(selectionRouted(b)).toBe(true);
    if (!selectionRouted(a) || !selectionRouted(b)) return;
    expect(a.travel.correct).toBe(true);
    expect(b.travel.correct).toBe(false);
    expect(b.travel.total).toBeGreaterThan(0);
  });

  it('every platform of the row is selectable regardless of which one is correct', () => {
    const { world, rows } = baseWorld();
    rows[1].platforms[1].correct = true;
    const from = standingOn(world.sourcePlatform);
    rows[1].platforms.forEach((platform: any) => {
      expect(selectionRouted(planLearnerSelection(world, from, platform))).toBe(true);
    });
  });
});

describe('LOCKED: routing keeps working above row 0', () => {
  it('selects from row 1 to row 2 in every column after an arrival', () => {
    // Guards against a row-0 special case passing for a working game.
    const { world, rows } = baseWorld(5);
    for (const column of [0, 1, 2]) {
      const landed = rows[1].platforms[column];
      const climbed: LearnerRoutingWorld = { ...world, sourcePlatform: landed };
      const from = standingOn(landed);
      for (const target of [0, 1, 2]) {
        const result = planLearnerSelection(climbed, from, rows[2].platforms[target]);
        expect(selectionRouted(result)).toBe(true);
        if (selectionRouted(result)) expect(result.travel.total).toBeGreaterThan(0);
      }
    }
  });

  it('keeps routing four rows up', () => {
    const { world, rows } = baseWorld(6);
    for (let row = 1; row < 5; row += 1) {
      const source = rows[row - 1].platforms[1];
      const climbed: LearnerRoutingWorld = { ...world, sourcePlatform: source };
      const result = planLearnerSelection(climbed, standingOn(source), rows[row].platforms[1]);
      expect(selectionRouted(result)).toBe(true);
    }
  });
});

describe('LOCKED: a failed selection fails loudly and changes nothing', () => {
  it('a missing destination row is reported, not swallowed', () => {
    const { world, rows } = baseWorld();
    const orphan = makeRowFixture(9).platforms[1];
    const result = planLearnerSelection(world, standingOn(rows[0].platforms[1]), orphan);

    expect(result.ok).toBe(false);
    if (selectionRouted(result)) return;
    expect(result.reason).toBe('NO_DESTINATION_ROW');
    expect(result.diagnostic.landing).toEqual(standingOn(orphan));
  });

  it('a genuinely sealed world reports NO_LEGAL_ROUTE and builds no travel', () => {
    // Obstacles are ADDED to seal the world. No clearance is reduced and no
    // geometry is weakened to make this reachable.
    const { world, rows } = baseWorld();
    const wall = Array.from({ length: 9 }, (_, i) => ({
      ...makeRowFixture(1).platforms[0],
      id: `wall-${i}`,
      row: 1,
      column: 0,
      x: 40 + i * 64,
      y: rows[1].y + G.platformHeight + G.routePlatformPadding + G.playerRadius + 4,
    }));
    const sealed: LearnerRoutingWorld = { ...world, activePlatforms: [...world.activePlatforms, ...wall] };
    const result = planLearnerSelection(sealed, standingOn(world.sourcePlatform), rows[1].platforms[1]);

    expect(result.ok).toBe(false);
    if (selectionRouted(result)) return;
    expect(result.reason).toBe('NO_LEGAL_ROUTE');
    expect(result.diagnostic.candidatesBuilt).toBeGreaterThan(0);
    expect(result.diagnostic.candidatesClear).toBe(0);
    expect((result as any).travel).toBeUndefined();
  });

  it('a failed selection never mutates platform state', () => {
    // The runtime clears `selected` itself; the transaction must not be the
    // thing that quietly powers, kills or selects a platform it could not reach.
    const { world, rows } = baseWorld();
    const orphan = makeRowFixture(9).platforms[1];
    const before = JSON.stringify(rows);
    planLearnerSelection(world, standingOn(rows[0].platforms[1]), orphan);
    expect(JSON.stringify(rows)).toBe(before);
    expect(orphan.selected).toBe(false);
    expect(orphan.powered).toBe(false);
    expect(orphan.dead).toBe(false);
  });
});

describe('LOCKED: no zero-length travel can ever be created', () => {
  it('a routed selection always carries real distance', () => {
    // travel advances until distance >= total, so a total of 0 arrives on the
    // first frame and teleports the spark. That masked total route failure for
    // an entire era of the project.
    const { world, rows } = baseWorld(5);
    for (const row of [1, 2, 3]) {
      for (const column of [0, 1, 2]) {
        const source = rows[row - 1].platforms[1];
        const climbed: LearnerRoutingWorld = { ...world, sourcePlatform: source };
        const result = planLearnerSelection(climbed, standingOn(source), rows[row].platforms[column]);
        if (!selectionRouted(result)) continue;
        expect(result.travel.total).toBeGreaterThan(0);
        expect(result.travel.lengths.length).toBeGreaterThan(0);
        expect(pathMetrics(result.route).total).toBeCloseTo(result.travel.total, 6);
        const start = result.route[0];
        const end = result.route[result.route.length - 1];
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(0);
      }
    }
  });
});

describe('LOCKED: the pursuer can reorder routes but never remove a destination', () => {
  it('no threat position at any avoidance makes a legitimate destination unselectable', () => {
    // A pursuer able to veto routes could reproduce the dead-click defect just
    // by standing in the wrong place.
    const { world, rows } = baseWorld();
    const from = standingOn(world.sourcePlatform);
    const threats = [
      { x: 110, y: -G.rowGap }, { x: 300, y: -G.rowGap }, { x: 490, y: -G.rowGap },
      { x: 205, y: -100 }, { x: 395, y: -100 }, { x: 300, y: 0 }, { x: 300, y: -240 },
      { x: 38, y: -120 }, { x: 562, y: -120 },
    ];
    for (const threat of threats) {
      for (const avoidance of [0, 0.25, 0.5, 0.75, 1]) {
        for (const column of [0, 1, 2]) {
          const hunted: LearnerRoutingWorld = { ...world, threat, avoidance };
          const result = planLearnerSelection(hunted, from, rows[1].platforms[column]);
          expect(selectionRouted(result)).toBe(true);
        }
      }
    }
  });

  it('avoidance 0 reproduces the route chosen with no pursuer at all', () => {
    const { world, rows } = baseWorld();
    const from = standingOn(world.sourcePlatform);
    const plain = planLearnerSelection(world, from, rows[1].platforms[1]);
    const ignored = planLearnerSelection(
      { ...world, threat: { x: 205, y: -100 }, avoidance: 0 }, from, rows[1].platforms[1],
    );
    expect(selectionRouted(plain) && selectionRouted(ignored)).toBe(true);
    if (!selectionRouted(plain) || !selectionRouted(ignored)) return;
    expect(ignored.route).toEqual(plain.route);
  });
});
