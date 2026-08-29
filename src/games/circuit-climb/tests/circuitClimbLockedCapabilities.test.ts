import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformBounds,
  computeActorSafeCorridors,
  computePlatformCollisionRects,
  computeRouteCrossingOffset,
  pathIsClear,
} from '../geometry/circuitClimbGeometry';
import {
  createPursuer,
  updatePursuer,
  PURSUER_CAPTURE_DISTANCE,
} from '../pursuer/circuitClimbPursuer';

/**
 * CAPABILITY LOCK — CIRCUIT CLIMB PURSUER BASELINE 01
 *
 * These are not unit tests of implementation detail. Each one locks a capability
 * that took a forensic audit and three repairs to reach, and each names the
 * failure it exists to prevent. If one of these goes red, a working behaviour
 * has been lost — treat it as a stop, not a test to update.
 *
 * The freeze manifest is docs/CIRCUIT_CLIMB_PURSUER_BASELINE_01_FREEZE.md.
 */

/** Exactly the platform shape production makeRow() emits. */
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

function playerRestingOn(platform: { x: number; y: number }) {
  return { x: platform.x, y: platform.y - CONFIG.playerRadius - 3 };
}

/** The view scales applyViewScale() can produce, and the derived world at each. */
const VIEW_SCALES = [80, 90, 100, 110, 120];
function worldAtScale(percent: number) {
  const zoom = percent / 100;
  return {
    rowGap: CONFIG.rowGap * zoom,
    platformWidth: CONFIG.platformWidth * (0.98 + 0.02 * zoom),
    platformHeight: CONFIG.platformHeight * Math.pow(zoom, 0.48),
    playerRadius: CONFIG.playerRadius * zoom,
    routePlatformPadding: CONFIG.routePlatformPadding,
  };
}

describe('LOCKED: accepted world geometry (handoff section J)', () => {
  it('world constants are unchanged', () => {
    expect(CONFIG.logicalWidth).toBe(600);
    expect(CONFIG.platformWidth).toBe(104);
    expect(CONFIG.platformHeight).toBe(62);
    expect(CONFIG.playerRadius).toBe(32);
    expect(CONFIG.routePlatformPadding).toBe(8);
    expect(CONFIG.rowGap).toBe(205);
  });

  it('column centres are 110 / 300 / 490', () => {
    expect(computePlatformBounds(0).center).toBeCloseTo(110, 6);
    expect(computePlatformBounds(1).center).toBeCloseTo(300, 6);
    expect(computePlatformBounds(2).center).toBeCloseTo(490, 6);
  });

  it('interior corridors B and C stay physically usable', () => {
    const corridors = computeActorSafeCorridors(
      computePlatformBounds(0),
      computePlatformBounds(1),
      computePlatformBounds(2),
    );
    const b = corridors.find((c) => c.id === 'B');
    const c = corridors.find((c) => c.id === 'C');
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    expect(b!.width).toBeGreaterThan(0);
    expect(c!.width).toBeGreaterThan(0);
  });
});

describe('LOCKED: learner can select a platform (the SOT-20 first-move failure)', () => {
  it('every platform production creates carries a unique, deterministic identity', () => {
    // Without this, pathIsClear compares undefined === undefined and its
    // exceptions apply to every platform at once.
    const ids = [0, 1, 2].flatMap((row) => makeProductionRow(row).map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^row-\d+-column-\d+$/));
  });

  it('the route crossing altitude clears the destination row collision band at every view scale', () => {
    // This is the exact invariant whose violation made every click dead: a
    // crossing altitude inside the band rejects every candidate corridor,
    // buildCircuitPath returns null, and selectPlatform bails silently.
    for (const percent of VIEW_SCALES) {
      const world = worldAtScale(percent);
      const destinationRowY = -world.rowGap;
      const platform = {
        id: 'row-1-column-1',
        x: 300,
        y: destinationRowY,
        width: world.platformWidth,
        height: world.platformHeight,
      };
      const [rect] = computePlatformCollisionRects([platform], world.playerRadius);
      const crossingY = destinationRowY + computeRouteCrossingOffset(world);

      expect(crossingY).toBeGreaterThan(rect.bottom);
    }
  });

  it('a horizontal crossing band exists between consecutive rows at every view scale', () => {
    for (const percent of VIEW_SCALES) {
      const world = worldAtScale(percent);
      const lower = { id: 'a', x: 300, y: 0, width: world.platformWidth, height: world.platformHeight };
      const upper = { id: 'b', x: 300, y: -world.rowGap, width: world.platformWidth, height: world.platformHeight };
      const [lowerRect] = computePlatformCollisionRects([lower], world.playerRadius);
      const [upperRect] = computePlatformCollisionRects([upper], world.playerRadius);

      expect(upperRect.bottom).toBeLessThan(lowerRect.top);
    }
  });

  it('the source-platform exception cannot leak onto an unrelated platform', () => {
    const row = makeProductionRow(1);
    const source = makeProductionRow(0)[1];
    const rects = computePlatformCollisionRects([source, ...row], CONFIG.playerRadius);
    const clipsLeftTopPadding = [
      { x: 60, y: row[0].y - 1 },
      { x: 160, y: row[0].y - 1 },
    ];

    expect(pathIsClear(clipsLeftTopPadding, rects)).toBe(false);
    expect(
      pathIsClear(clipsLeftTopPadding, rects, { sourcePlatform: source } as any),
    ).toBe(false);
  });
});

describe('LOCKED: pursuer navigates and captures', () => {
  const row = makeProductionRow(1);
  const player = playerRestingOn(row[0]);
  const band = (platform: any) =>
    computePlatformCollisionRects([platform], CONFIG.playerRadius)[0];

  it('a player standing on the row above is treated as an obstacle to cross', () => {
    // The "climbs one row then stops" jam: comparing the player against the
    // band TOP made a platform the player stands on read as clear air.
    const pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band(row[1]).bottom + 20;

    let mustCross: boolean | undefined;
    updatePursuer(pursuer, player, row, 16, (step) => { mustCross = step.mustCrossRow; });
    expect(mustCross).toBe(true);
  });

  it('it crosses the row rather than pressing into its underside forever', () => {
    let pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band(row[1]).bottom + 4;

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16);
    }
    expect(pursuer.y).toBeLessThan(row[1].y);
  });

  it('it never ends a frame inside a platform', () => {
    let pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band(row[1]).bottom + 4;
    const bands = row.map(band);

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16);
      for (const b of bands) {
        const inside =
          pursuer.x > b.left && pursuer.x < b.right &&
          pursuer.y > b.top && pursuer.y < b.bottom;
        expect(inside).toBe(false);
      }
    }
  });

  it('it reaches and captures a player standing on a platform', () => {
    // Requires the player's own platform to expose its top padding, or the
    // pursuer parks alongside and never makes contact.
    const standing = { ...player, platform: row[0] };
    let pursuer = createPursuer(row[1].x, 0);
    pursuer.y = band(row[1]).bottom + 4;

    for (let frame = 0; frame < 3000 && pursuer.state !== 'CAUGHT'; frame += 1) {
      pursuer = updatePursuer(pursuer, standing, row, 16);
    }
    expect(pursuer.state).toBe('CAUGHT');
  });

  it('capture needs a real overlap, not a graze', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50 + PURSUER_CAPTURE_DISTANCE + 20;
    const next = updatePursuer(pursuer, { x: 300, y: 50 }, [], 1);
    expect(next.state).toBe('PURSUING');
  });

  it('a captured pursuer stops dead', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50;
    const caught = updatePursuer(pursuer, { x: 300, y: 50 }, [], 100);
    expect(caught.state).toBe('CAUGHT');

    const after = updatePursuer(caught, { x: 100, y: -400 }, [], 1000);
    expect(after.x).toBe(caught.x);
    expect(after.y).toBe(caught.y);
  });
});
