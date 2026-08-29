import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import type { PursuerStep } from '../pursuer/circuitClimbPursuerTrace';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformCollisionRects,
} from '../geometry/circuitClimbGeometry';

/**
 * Regression cover for the "climbs one row, then the chase stops" defect.
 *
 * These tests build rows the way makeRow() does — same keys, same id scheme,
 * same y = -index * rowGap layout, same landing height for the player — and
 * they take every bound from computePlatformCollisionRects rather than
 * re-deriving the padding formula, so they cannot drift away from the
 * collision system they are asserting against.
 */

/** Mirrors the production makeRow() platform shape exactly. */
function makeProductionRow(index: number) {
  return CONFIG.columns.map((fraction, column) => ({
    id: `row-${index}-column-${column}`,
    row: index,
    column,
    x: fraction * CONFIG.logicalWidth,
    y: -index * CONFIG.rowGap,
    width: CONFIG.platformWidth,
    height: CONFIG.platformHeight,
    value: null as number | null,
    correct: false,
    dead: false,
    powered: false,
    selected: false,
    litAt: -1000,
  }));
}

/** Mirrors production landingPoint(): where the player actually rests on a row. */
function playerRestingOn(platform: { x: number; y: number }) {
  return { x: platform.x, y: platform.y - CONFIG.playerRadius - 3 };
}

function bandOf(platform: any, actorRadius: number) {
  const [rect] = computePlatformCollisionRects([platform], actorRadius);
  return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
}

describe('Circuit Climb pursuer navigation (PURSUER-02 regression)', () => {
  it('1. the player resting on a row sits INSIDE that row\'s collision band, not above it', () => {
    // This is the geometric fact the old gate got wrong.
    const row = makeProductionRow(1);
    const band = bandOf(row[0], CONFIG.playerRadius);
    const player = playerRestingOn(row[0]);

    expect(player.y).toBeGreaterThan(band.top);   // below the top edge
    expect(player.y).toBeLessThan(band.bottom);   // above the bottom edge
  });

  it('2. a player standing on the row directly above is treated as a row to cross', () => {
    const row = makeProductionRow(1);
    const player = playerRestingOn(row[0]);
    const band = bandOf(row[0], CONFIG.playerRadius);

    const pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band.bottom + 20; // just below the row, still clear of it

    let step: PursuerStep | undefined;
    updatePursuer(pursuer, player, row, 16, (s) => { step = s; });

    expect(step).toBeDefined();
    expect(step!.mustCrossRow).toBe(true);
    expect(step!.mode).toBe('CORRIDOR');
    expect(step!.corridors.length).toBeGreaterThan(0);
  });

  it('3. it does not jam under the row the player is standing on', () => {
    const row = makeProductionRow(1);
    const player = playerRestingOn(row[0]);
    const band = bandOf(row[1], CONFIG.playerRadius);

    // Directly beneath the centre platform — the exact geometry that deadlocked.
    let pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band.bottom + 4;

    const startY = pursuer.y;
    let firstStallFrame: number | null = null;
    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16, (s) => {
        if (s.stalled && firstStallFrame === null) firstStallFrame = frame;
      });
    }

    // Before the fix it pressed into the underside of the row forever, never
    // getting past band.bottom. It must now clear the platform surface entirely.
    expect(startY).toBeGreaterThan(band.bottom);
    expect(pursuer.y).toBeLessThan(row[1].y);

    // And having crossed, it should have closed to within a row of the player
    // rather than parking somewhere unrelated.
    const gap = Math.hypot(pursuer.x - player.x, pursuer.y - player.y);
    expect(gap).toBeLessThan(CONFIG.rowGap);

    // Any stall may only happen after it has closed in — never while it is
    // still stuck against the row it needs to cross.
    if (firstStallFrame !== null) {
      expect(firstStallFrame).toBeGreaterThan(60);
    }
  });

  it('4. it steers toward the corridor nearest the player, and re-steers when the player moves', () => {
    const row = makeProductionRow(1);
    const band = bandOf(row[1], CONFIG.playerRadius);

    const start = () => {
      const p = createPursuer(row[1].x, 0);
      p.y = band.bottom + 20;
      return p;
    };

    let leftStep: PursuerStep | undefined;
    updatePursuer(start(), playerRestingOn(row[0]), row, 16, (s) => { leftStep = s; });

    let rightStep: PursuerStep | undefined;
    updatePursuer(start(), playerRestingOn(row[2]), row, 16, (s) => { rightStep = s; });

    expect(leftStep!.targetX).toBeLessThan(row[1].x);
    expect(rightStep!.targetX).toBeGreaterThan(row[1].x);
    expect(leftStep!.targetX).not.toBe(rightStep!.targetX);
  });

  it('5. row 0 exposes only its centre platform, and the pursuer routes around it', () => {
    // getActivePlatforms() drops row 0's outer platforms; the pursuer must cope.
    const rowZero = [makeProductionRow(0)[1]];
    const player = playerRestingOn(makeProductionRow(1)[0]);

    let pursuer = createPursuer(rowZero[0].x, 0);
    pursuer.y = bandOf(rowZero[0], CONFIG.playerRadius).bottom + 20;

    let step: PursuerStep | undefined;
    updatePursuer(pursuer, player, rowZero, 16, (s) => { step = s; });

    expect(step!.rowPlatformCount).toBe(1);
    expect(step!.mustCrossRow).toBe(true);
    expect(step!.corridors.length).toBeGreaterThan(0);
    expect(step!.targetX).not.toBe(rowZero[0].x);
  });

  it('6. a blocked sideways step does not also cancel that frame\'s climb', () => {
    const row = makeProductionRow(1);
    const player = playerRestingOn(row[0]);

    // Sitting in corridor B, level with the row band: sideways is walled off,
    // upwards is open. The frame must still produce vertical movement.
    const leftBand = bandOf(row[0], CONFIG.playerRadius);
    const centreBand = bandOf(row[1], CONFIG.playerRadius);
    const pursuer = createPursuer((leftBand.right + centreBand.left) / 2, 0);
    pursuer.y = leftBand.bottom - 10; // inside the band, in the corridor

    let step: PursuerStep | undefined;
    const next = updatePursuer(pursuer, player, row, 16, (s) => { step = s; });

    expect(step!.stalled).toBe(false);
    expect(next.y).toBeLessThan(pursuer.y); // it climbed
  });

  it('7. it never passes through a platform', () => {
    const row = makeProductionRow(1);
    const player = playerRestingOn(row[0]);
    let pursuer = createPursuer(row[1].x, 0);
    pursuer.y = bandOf(row[1], CONFIG.playerRadius).bottom + 4;

    const bands = row.map((platform) => bandOf(platform, CONFIG.playerRadius));

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16);
      for (const band of bands) {
        const inside =
          pursuer.x > band.left && pursuer.x < band.right &&
          pursuer.y > band.top && pursuer.y < band.bottom;
        expect(inside).toBe(false);
      }
    }
  });
});
