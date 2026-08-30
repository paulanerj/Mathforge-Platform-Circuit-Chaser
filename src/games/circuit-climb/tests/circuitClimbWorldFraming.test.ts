import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as G,
  computeColumnCentres,
  computeColumnSpacing,
  computeActorSafeCorridors,
  computePlatformCollisionRects,
  ACCEPTED_COLUMN_SPACING,
  MIN_INTERIOR_CORRIDOR,
} from '../geometry/circuitClimbGeometry';
import {
  planLearnerSelection,
  collectActivePlatforms,
  landingPointFor,
  selectionRouted,
  pathMetrics,
  type LearnerRoutingWorld,
} from '../runtime/circuitClimbLearnerRouting';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';

/**
 * WORLD FRAMING — every framing the slider can produce must leave the learner a
 * legal move.
 *
 * The defect this file exists to prevent: above 100% the actor grew but the
 * column spacing did not, the interior corridors closed, and every destination
 * returned NO_LEGAL_ROUTE. The board rendered perfectly and could not be
 * played. It reproduced on the accepted baseline too, so it had shipped
 * unnoticed for the whole life of the slider.
 *
 * These tests fail against that implementation at 101% and above.
 */

/** Exactly the framings applyViewScale() can produce (the slider is 80..120). */
export const SUPPORTED_FRAMINGS = [80, 90, 100, 101, 105, 110, 115, 120];

/** Mirrors applyViewScale(), including the derived columns. */
function worldAtFraming(percent: number) {
  const zoom = percent / 100;
  const config = {
    rowGap: G.rowGap * zoom,
    platformWidth: G.platformWidth * (0.98 + 0.02 * zoom),
    platformHeight: G.platformHeight * Math.pow(zoom, 0.48),
    playerRadius: G.playerRadius * zoom,
    routePlatformPadding: G.routePlatformPadding,
    logicalWidth: G.logicalWidth,
    routeTurnCount: 8,
    routeMaxStraightRun: 72 * zoom,
    routeHorizontalJitter: 44 * zoom,
  };
  return config;
}

function makeRows(config: any, count = 6, shiftOffset = 0) {
  const centres = computeColumnCentres(config);
  return Array.from({ length: count }, (_, index) => {
    const y = -index * config.rowGap;
    return {
      index,
      y,
      shiftOffset,
      platforms: centres.map((centre, column) => ({
        id: `row-${index}-column-${column}`,
        row: index,
        column,
        x: centre + shiftOffset,
        y,
        width: config.platformWidth,
        height: config.platformHeight,
        value: null as number | null,
        correct: false,
        dead: false,
        powered: false,
        selected: false,
        litAt: -1000,
      })),
    };
  });
}

function worldFor(config: any, rows: any[], overrides: Partial<LearnerRoutingWorld> = {}) {
  return {
    config,
    activePlatforms: collectActivePlatforms(rows),
    getRow: (index: number) => rows.find((r) => r.index === index) || null,
    sourcePlatform: rows[0].platforms[1],
    threat: null,
    avoidance: 0,
    ...overrides,
  } as LearnerRoutingWorld;
}

const COLUMN_NAMES = ['LEFT', 'CENTER', 'RIGHT'];

describe('WORLD FRAMING: the accepted default layout is untouched', () => {
  it('column spacing at and below the default is exactly the accepted 190', () => {
    for (const percent of [80, 90, 95, 100]) {
      expect(computeColumnSpacing(worldAtFraming(percent))).toBe(ACCEPTED_COLUMN_SPACING);
    }
    expect(ACCEPTED_COLUMN_SPACING).toBe(190);
  });

  it('column centres at the default framing are exactly 110 / 300 / 490', () => {
    expect(computeColumnCentres(worldAtFraming(100))).toEqual([110, 300, 490]);
    expect(computeColumnCentres(G)).toEqual([110, 300, 490]);
  });

  it('the accepted spacing IS the clearance formula, not a coincidence', () => {
    // 104 + 2*(8+32) + 6 === 190. The shipped layout has always been a
    // six-unit minimum interior corridor; it was frozen as literals.
    expect(
      G.platformWidth + 2 * (G.routePlatformPadding + G.playerRadius) + MIN_INTERIOR_CORRIDOR,
    ).toBe(ACCEPTED_COLUMN_SPACING);
  });

  it('columns only ever open, never tighten', () => {
    let previous = 0;
    for (const percent of SUPPORTED_FRAMINGS) {
      const spacing = computeColumnSpacing(worldAtFraming(percent));
      expect(spacing).toBeGreaterThanOrEqual(ACCEPTED_COLUMN_SPACING);
      expect(spacing).toBeGreaterThanOrEqual(previous);
      previous = spacing;
    }
  });

  it('every framing keeps the whole row inside the world', () => {
    for (const percent of SUPPORTED_FRAMINGS) {
      const config = worldAtFraming(percent);
      const centres = computeColumnCentres(config);
      const half = config.platformWidth / 2;
      expect(centres[0] - half).toBeGreaterThan(0);
      expect(centres[2] + half).toBeLessThan(config.logicalWidth);
    }
  });
});

describe('WORLD FRAMING: interior corridors stay physically real', () => {
  it('the actor of the moment fits through B and C at every framing', () => {
    for (const percent of SUPPORTED_FRAMINGS) {
      const config = worldAtFraming(percent);
      const centres = computeColumnCentres(config);
      const half = config.platformWidth / 2;
      const bounds = centres.map((c) => ({ center: c, left: c - half, right: c + half }));

      const corridors = computeActorSafeCorridors(bounds[0], bounds[1], bounds[2], config);
      const b = corridors.find((c) => c.id === 'B');
      const c = corridors.find((c) => c.id === 'C');

      expect(b, `corridor B missing at ${percent}%`).toBeDefined();
      expect(c, `corridor C missing at ${percent}%`).toBeDefined();
      expect(b!.width).toBeGreaterThanOrEqual(MIN_INTERIOR_CORRIDOR - 1e-9);
      expect(c!.width).toBeGreaterThanOrEqual(MIN_INTERIOR_CORRIDOR - 1e-9);
    }
  });

  it('the free gap in the real collision rects agrees with the corridor', () => {
    // Collision truth, not corridor bookkeeping: the inflated rects must
    // actually leave room. This is what rejects routes when it is negative.
    for (const percent of SUPPORTED_FRAMINGS) {
      const config = worldAtFraming(percent);
      const rows = makeRows(config, 2);
      const rects = computePlatformCollisionRects(
        rows[1].platforms, config.playerRadius, config.routePlatformPadding,
      );
      expect(rects[1].left - rects[0].right).toBeGreaterThanOrEqual(MIN_INTERIOR_CORRIDOR - 1e-9);
      expect(rects[2].left - rects[1].right).toBeGreaterThanOrEqual(MIN_INTERIOR_CORRIDOR - 1e-9);
    }
  });
});

describe('WORLD FRAMING: first-move reachability at every supported framing', () => {
  for (const percent of SUPPORTED_FRAMINGS) {
    it(`${percent}% — LEFT, CENTER and RIGHT are all selectable`, () => {
      const config = worldAtFraming(percent);
      const rows = makeRows(config);
      const world = worldFor(config, rows);
      const from = landingPointFor(config, rows[0].platforms[1]);

      rows[1].platforms.forEach((platform, column) => {
        const selection = planLearnerSelection(world, from, platform);
        expect(
          selection.ok,
          `${COLUMN_NAMES[column]} at ${percent}% -> ${(selection as any).reason}`,
        ).toBe(true);
        expect(selectionRouted(selection)).toBe(true);
        // Never a zero-length route: that teleports the spark on frame one.
        const metrics = pathMetrics((selection as any).route);
        expect(metrics.total).toBeGreaterThan(0);
        expect((selection as any).route.length).toBeGreaterThanOrEqual(2);
      });
    });
  }

  it('a wrong destination is selectable at every framing', () => {
    for (const percent of SUPPORTED_FRAMINGS) {
      const config = worldAtFraming(percent);
      const rows = makeRows(config);
      rows[1].platforms[0].correct = false;
      rows[1].platforms[1].correct = true;
      const world = worldFor(config, rows);
      const from = landingPointFor(config, rows[0].platforms[1]);

      const wrong = planLearnerSelection(world, from, rows[1].platforms[0]);
      expect(wrong.ok, `wrong destination rejected at ${percent}%`).toBe(true);
      expect((wrong as any).travel.correct).toBe(false);
    }
  });

  it('no pursuer position at any avoidance can remove a destination', () => {
    for (const percent of [80, 100, 120]) {
      const config = worldAtFraming(percent);
      const rows = makeRows(config);
      const from = landingPointFor(config, rows[0].platforms[1]);

      for (const avoidance of [0, 0.5, 1]) {
        for (const threatX of [0, 110, 205, 300, 395, 490, 600]) {
          for (const threatY of [0, -config.rowGap / 2, -config.rowGap]) {
            const world = worldFor(config, rows, {
              threat: { x: threatX, y: threatY }, avoidance,
            });
            rows[1].platforms.forEach((platform, column) => {
              const selection = planLearnerSelection(world, from, platform);
              expect(
                selection.ok,
                `${COLUMN_NAMES[column]} removed at ${percent}% by threat ${threatX}/${threatY} av=${avoidance}`,
              ).toBe(true);
            });
          }
        }
      }
    }
  });
});

describe('WORLD FRAMING: multi-row stress', () => {
  for (const percent of [80, 100, 120]) {
    it(`${percent}% — 10 consecutive decisions across mixed destinations`, () => {
      const config = worldAtFraming(percent);
      const rows = makeRows(config, 14);
      // A deterministic mix that includes wrong choices and every column.
      const script = [1, 0, 2, 1, 2, 0, 1, 0, 2, 1];
      const wrongTurns = new Set([1, 5, 7]);

      let standingRow = 0;
      let standingColumn = 1;
      let decisions = 0;

      for (let turn = 0; turn < script.length; turn += 1) {
        const targetColumn = script[turn];
        const destinationRow = rows[standingRow + 1];
        const platform = destinationRow.platforms[targetColumn];
        platform.correct = !wrongTurns.has(turn);

        const world = worldFor(config, rows, {
          sourcePlatform: rows[standingRow].platforms[standingColumn],
        });
        const from = landingPointFor(config, rows[standingRow].platforms[standingColumn]);

        const selection = planLearnerSelection(world, from, platform);
        expect(
          selection.ok,
          `turn ${turn} (${COLUMN_NAMES[targetColumn]}) at ${percent}% -> ${(selection as any).reason}`,
        ).toBe(true);

        const metrics = pathMetrics((selection as any).route);
        expect(metrics.total, `zero-length route on turn ${turn} at ${percent}%`).toBeGreaterThan(0);
        decisions += 1;

        if (platform.correct) {
          // Correct: the spark arrives and climbs.
          standingRow += 1;
          standingColumn = targetColumn;
        } else {
          // Wrong: the platform shorts out and the spark returns; the row stays.
          platform.dead = true;
        }
      }

      expect(decisions).toBe(10);
      expect(standingRow).toBe(script.length - wrongTurns.size);
    });
  }
});

describe('WORLD FRAMING: the pursuer navigates the same world', () => {
  for (const percent of [80, 100, 120]) {
    it(`${percent}% — pursuer crosses a row without entering a platform`, () => {
      const config = worldAtFraming(percent);
      const geometry = {
        rowGap: config.rowGap,
        platformHeight: config.platformHeight,
        playerRadius: config.playerRadius,
        logicalWidth: config.logicalWidth,
        routePlatformPadding: config.routePlatformPadding,
      };
      const rows = makeRows(config, 3);
      const row = rows[1].platforms;
      const pad = config.routePlatformPadding + config.playerRadius;
      const band = (p: any) => ({
        left: p.x - p.width / 2 - pad, right: p.x + p.width / 2 + pad,
        top: p.y - pad, bottom: p.y + p.height + pad,
      });
      const bands = row.map(band);

      let pursuer = createPursuer(row[1].x, 0, ALIVE_PURSUER_TUNING, geometry);
      pursuer.y = bands[1].bottom + 4;
      const player = { x: row[1].x, y: rows[2].y };

      for (let frame = 0; frame < 900; frame += 1) {
        pursuer = updatePursuer(pursuer, player, row, 16, undefined, geometry);
        for (const b of bands) {
          const inside =
            pursuer.x > b.left && pursuer.x < b.right &&
            pursuer.y > b.top && pursuer.y < b.bottom;
          expect(inside, `pursuer inside a platform at ${percent}% frame ${frame}`).toBe(false);
        }
      }
      // It got past the row it had to cross.
      expect(pursuer.y, `pursuer never crossed the row at ${percent}%`).toBeLessThan(row[1].y);
    });

    it(`${percent}% — pursuer reaches SEARCH, CHASE and CAUGHT`, () => {
      const config = worldAtFraming(percent);
      const geometry = {
        rowGap: config.rowGap, platformHeight: config.platformHeight,
        playerRadius: config.playerRadius, logicalWidth: config.logicalWidth,
        routePlatformPadding: config.routePlatformPadding,
      };
      // A finite sense so SEARCH is reachable at all.
      const tuning = { ...ALIVE_PURSUER_TUNING, senseRadius: 120, loseRadius: 160, alertDwellMs: 50 };

      const far = createPursuer(300, 0, tuning, geometry);
      const searching = updatePursuer(far, { x: 300, y: -4000 }, [], 16, undefined, geometry);
      expect(searching.behaviour).toBe('SEARCH');

      let near = createPursuer(300, 0, tuning, geometry);
      near.y = 60;
      let sawAlert = false;
      let caught = near;
      for (let frame = 0; frame < 200 && caught.state !== 'CAUGHT'; frame += 1) {
        caught = updatePursuer(caught, { x: 300, y: 0 }, [], 16, undefined, geometry);
        if (caught.behaviour === 'ALERT') sawAlert = true;
      }
      expect(sawAlert, `never entered ALERT at ${percent}%`).toBe(true);
      expect(caught.state, `never captured at ${percent}%`).toBe('CAUGHT');
    });
  }
});
