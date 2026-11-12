import { describe, it, expect } from 'vitest';
import { defaultRunConfig } from '../config/runConfig';
import { SeededRandom } from '../config/prng';
import { generateAdd20Problem } from '../math/add20';
import {
  addProblemRow, createWorld, getRow, landingFor, planRoute,
  pointAlongRoute, resolveWorldGeometry,
} from '../world/world';
import { computeActorSafeCorridors } from '../world/legacyGeometry';
import { isRouteClear, collectActivePlatforms } from '../world/legacyLearnerRouting';

describe('CC2-02A: preserved geometry routed through an isolated typed world', () => {
  it('matches the accepted SOT-02 constants at default zoom', () => {
    const g = resolveWorldGeometry(defaultRunConfig());
    expect(g.logicalWidth).toBe(600);
    expect(g.rowGap).toBe(205);
    expect(g.platformWidth).toBe(104);
    expect(g.platformHeight).toBe(62);
    expect(g.playerRadius).toBe(32);
    expect(g.routePlatformPadding).toBe(8);
    expect(g.columns).toEqual([110, 300, 490]);
  });

  it('offers a legal nondegenerate, collision-checked route for every next platform', () => {
    for (const percent of [80, 90, 100, 110, 120] as const) {
      const config = { ...defaultRunConfig(), framingPercent: percent };
      const world = createWorld(config);
      const rng = new SeededRandom('world-' + percent);
      const first = generateAdd20Problem('r', 1, 3, rng);
      const second = generateAdd20Problem('r', 2, first.targetValue, rng);
      addProblemRow(world, first);
      addProblemRow(world, second);
      const current = getRow(world, 0)!;
      const row1 = getRow(world, 1)!;
      const row2 = getRow(world, 2)!;

      const corridor = computeActorSafeCorridors(
        ...row1.platforms.map(platform => ({
          center: platform.x, left: platform.x - platform.width / 2,
          right: platform.x + platform.width / 2,
        })) as [
          {center:number;left:number;right:number},
          {center:number;left:number;right:number},
          {center:number;left:number;right:number},
        ],
        world.geometry,
      );
      expect(corridor.filter(c => c.type === 'interior')).toHaveLength(2);

      const sources = [current.platforms[1], ...row1.platforms];
      for (const source of sources) {
        const destinations = source.row === 0 ? row1.platforms : row2.platforms;
        for (const destination of destinations) {
          const route = planRoute(world, source, destination, { x: 300, y: -100 });
          expect(route.ok, `${percent}%: ${source.id} to ${destination.id} route rejected`).toBe(true);
          if (route.ok === false) continue;
          expect(route.totalLength).toBeGreaterThan(0);
          expect(route.points.length).toBeGreaterThan(1);
          expect(route.points[0]).toEqual(landingFor(world, source));
          expect(route.landing).toEqual(landingFor(world, destination));
          expect(pointAlongRoute(route.points, route.totalLength)).toEqual(route.landing);
          const all = collectActivePlatforms(world.rows);
          expect(isRouteClear({
            config: world.geometry,
            activePlatforms: all,
            getRow: index => getRow(world, index) ?? null,
            sourcePlatform: source,
            threat: null,
            avoidance: 0,
          }, route.points, destination)).toBe(true);
        }
      }
    }
  });

  it('never lets a bot threat veto a learner choice', () => {
    const world = createWorld(defaultRunConfig());
    addProblemRow(world, generateAdd20Problem('threat', 1, 3, new SeededRandom('1')));
    for (const goal of getRow(world, 1)!.platforms) {
      for (const threat of [{ x: goal.x, y: goal.y }, { x: 300, y: -100 }]) {
        expect(planRoute(world, getRow(world, 0)!.platforms[1], goal, threat).ok).toBe(true);
      }
    }
  });

  it('refuses an absent row explicitly, never teleports to it', () => {
    const world = createWorld(defaultRunConfig());
    const imaginary = { ...world.rows[0].platforms[1], id: 'row-4-column-1', row: 4, y: -820 };
    expect(planRoute(world, world.rows[0].platforms[1], imaginary)).toEqual({
      ok: false, reason: 'NO_DESTINATION_ROW',
    });
  });
});
