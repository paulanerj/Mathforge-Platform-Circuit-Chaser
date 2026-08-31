import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as G,
  computeColumnCentres,
  computeActorSafeCorridors,
  computePlatformCollisionRects,
  computeRectEscape,
  pathIsClear,
} from '../geometry/circuitClimbGeometry';
import { createPursuer, updatePursuer, type PursuerState } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';

/**
 * CORRIDOR-ENTRY DEADLOCK, 90% world framing.
 *
 * Taken from a real play session: the pursuer froze for 1605 consecutive frames
 * — 27 seconds — while still in CHASE, still tracking the learner exactly, and
 * still selecting a legal corridor 17.9 units to its right. Every frame it
 * attempted to move and every frame both axes were refused.
 *
 * It was not a navigation or awareness failure. The pursuer was sitting INSIDE
 * an inflated collision rect, and `segmentHitsRect` is a pure overlap test: a
 * segment starting inside a rect overlaps it whichever way it points, so
 * `pathIsClear` rejected every direction including the way out.
 *
 * It reached that position legally. The pursuer is allowed into the top padding
 * of the platform the learner stands on, so it can actually reach a learner
 * resting there. When the learner climbed on, that exception was withdrawn and
 * the full rect closed over it.
 *
 * The figures below are the session's, not invented: pursuer at
 * (377.0866756, -1107.9065352), learner at (490, -1507.8), blocking row at
 * -1291.5, corridors 198.696..211.304 and 388.696..401.304.
 */

const ZOOM = 0.9;
const geometry = {
  rowGap: G.rowGap * ZOOM,                                  // 184.5
  platformHeight: G.platformHeight * Math.pow(ZOOM, 0.48),   // 58.94
  playerRadius: G.playerRadius * ZOOM,                       // 28.8
  logicalWidth: G.logicalWidth,
  routePlatformPadding: G.routePlatformPadding,
};
const PLATFORM_WIDTH = G.platformWidth * (0.98 + 0.02 * ZOOM); // 103.792
const CENTRES = computeColumnCentres({ ...geometry, platformWidth: PLATFORM_WIDTH });

/** The exact state recorded when the pursuer stopped. */
const DEADLOCK = { x: 377.08667564702057, y: -1107.9065351885936 };
const LEARNER = { x: 490, y: -1507.8 };

function row(index: number) {
  return CENTRES.map((x, column) => ({
    id: `row-${index}-column-${column}`,
    row: index,
    column,
    x,
    y: -index * geometry.rowGap,
    width: PLATFORM_WIDTH,
    height: geometry.platformHeight,
    dead: false,
  }));
}
const WORLD = [4, 5, 6, 7, 8, 9].flatMap(row);

function deadlockedPursuer(): PursuerState {
  const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
  pursuer.x = DEADLOCK.x;
  pursuer.y = DEADLOCK.y;
  pursuer.behaviour = 'CHASE';
  return pursuer;
}

describe('corridor entry: the world matches the recorded session', () => {
  it('90% framing derives the geometry the session reported', () => {
    expect(geometry.rowGap).toBeCloseTo(184.5, 6);
    expect(PLATFORM_WIDTH).toBeCloseTo(103.792, 3);
    expect(geometry.platformHeight).toBeCloseTo(58.9, 1);
    expect(geometry.playerRadius).toBeCloseTo(28.8, 6);
    expect(CENTRES).toEqual([110, 300, 490]);
  });

  it('produces the two corridors the session selected between', () => {
    const half = PLATFORM_WIDTH / 2;
    const bounds = CENTRES.map(c => ({ center: c, left: c - half, right: c + half }));
    const corridors = computeActorSafeCorridors(bounds[0], bounds[1], bounds[2],
      { ...geometry, platformWidth: PLATFORM_WIDTH });

    expect(corridors.map(c => c.id)).toEqual(['B', 'C']);
    expect(corridors[0].left).toBeCloseTo(198.696, 3);
    expect(corridors[0].right).toBeCloseTo(211.304, 3);
    expect(corridors[1].left).toBeCloseTo(388.696, 3);
    expect(corridors[1].right).toBeCloseTo(401.304, 3);
    expect(corridors[1].center).toBeCloseTo(395, 6);
  });

  /**
   * The corridor authority and the collision rects have to agree, or the
   * pursuer would be steered at a gap that is not really there. They do: the
   * corridor is exactly the space between two inflated rects.
   */
  it('the corridor is exactly the gap between the inflated rects', () => {
    const rects = computePlatformCollisionRects(row(7), geometry.playerRadius);
    expect(rects[1].right).toBeCloseTo(388.696, 3);
    expect(rects[2].left).toBeCloseTo(401.304, 3);
  });
});

describe('corridor entry: the deadlock itself', () => {
  it('the recorded position is inside an inflated rect', () => {
    const rects = computePlatformCollisionRects(WORLD, geometry.playerRadius);
    const containing = rects.filter(r =>
      DEADLOCK.x > r.left && DEADLOCK.x < r.right &&
      DEADLOCK.y > r.top && DEADLOCK.y < r.bottom);

    expect(containing).toHaveLength(1);
    expect(containing[0].platform.id).toBe('row-6-column-1');
  });

  /**
   * The contradiction in one assertion: the position is inside a rect, and the
   * move toward the legal corridor is refused even though it heads for the exit.
   */
  it('every direction out is refused by the raw collision test', () => {
    const rects = computePlatformCollisionRects(WORLD, geometry.playerRadius);
    const right = [DEADLOCK, { x: DEADLOCK.x + 1.76, y: DEADLOCK.y }];
    const up = [DEADLOCK, { x: DEADLOCK.x, y: DEADLOCK.y - 1.44 }];

    expect(pathIsClear(right, rects)).toBe(false);
    expect(pathIsClear(up, rects)).toBe(false);
  });

  /**
   * And how it got there: while the learner stood on that platform, the
   * exception made this exact position legal.
   */
  it('the position was legal while the learner stood on that platform', () => {
    const standingOn = row(6)[1];
    const rects = computePlatformCollisionRects(WORLD, geometry.playerRadius)
      .map(r => (r.platform.id === standingOn.id ? { ...r, top: r.platform.y } : r));
    const right = [DEADLOCK, { x: DEADLOCK.x + 1.76, y: DEADLOCK.y }];

    expect(pathIsClear(right, rects)).toBe(true);
  });
});

describe('corridor entry: the pursuer gets out and keeps going', () => {
  /**
   * The headline regression. On the 05B candidate this run produces zero
   * movement across 400 frames.
   */
  it('makes real progress instead of freezing for the rest of the run', () => {
    let pursuer = deadlockedPursuer();
    const player = { ...LEARNER, traveling: false, capturable: true };
    let movedFrames = 0;

    for (let frame = 0; frame < 400; frame += 1) {
      const before = { x: pursuer.x, y: pursuer.y };
      pursuer = updatePursuer(pursuer, player, WORLD, 16.7, undefined, geometry);
      if (pursuer.x !== before.x || pursuer.y !== before.y) movedFrames += 1;
    }

    expect(movedFrames, 'the pursuer never moved from the deadlock position').toBeGreaterThan(50);
    // It should have climbed a long way toward the learner, not merely twitched.
    expect(DEADLOCK.y - pursuer.y).toBeGreaterThan(geometry.rowGap);
  });

  it('leaves the rect it was embedded in within a handful of frames', () => {
    let pursuer = deadlockedPursuer();
    const player = { ...LEARNER, traveling: false, capturable: true };
    let framesInside = 0;

    for (let frame = 0; frame < 60; frame += 1) {
      const rects = computePlatformCollisionRects(WORLD, pursuer.radius);
      if (computeRectEscape({ x: pursuer.x, y: pursuer.y }, rects)) framesInside += 1;
      pursuer = updatePursuer(pursuer, player, WORLD, 16.7, undefined, geometry);
    }

    expect(framesInside, `still embedded after ${framesInside} frames`).toBeLessThan(30);
    const rects = computePlatformCollisionRects(WORLD, pursuer.radius);
    expect(computeRectEscape({ x: pursuer.x, y: pursuer.y }, rects)).toBeNull();
  });

  /**
   * The escape must not become a way through a platform. It leaves by the
   * nearest edge, so it can never carry the pursuer across a platform body.
   */
  it('never ends a frame inside a platform body', () => {
    let pursuer = deadlockedPursuer();
    const player = { ...LEARNER, traveling: false, capturable: true };

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, WORLD, 16.7, undefined, geometry);
      for (const platform of WORLD) {
        const insideBody =
          pursuer.x > platform.x - platform.width / 2 &&
          pursuer.x < platform.x + platform.width / 2 &&
          pursuer.y > platform.y &&
          pursuer.y < platform.y + platform.height;
        expect(insideBody, `inside ${platform.id} at frame ${frame}`).toBe(false);
      }
    }
  });
});

describe('corridor entry: collision is not weakened', () => {
  /**
   * A pursuer in a legal position still cannot walk through a platform. The
   * escape only exists for an actor already inside one.
   */
  it('a legally placed pursuer is still blocked by a platform', () => {
    const rects = computePlatformCollisionRects(row(6), geometry.playerRadius);
    // Directly below the centre platform's inflated rect, trying to climb in.
    const below = { x: 300, y: -1011.26 + 5 };
    expect(computeRectEscape(below, rects)).toBeNull();
    expect(pathIsClear([below, { x: below.x, y: below.y - 20 }], rects)).toBe(false);
  });

  it('computeRectEscape returns nothing for a point outside every rect', () => {
    const rects = computePlatformCollisionRects(WORLD, geometry.playerRadius);
    // Inside corridor C on the blocking row — a legal place to stand.
    expect(computeRectEscape({ x: 395, y: -1291.5 }, rects)).toBeNull();
  });

  it('the escape heads for the nearest edge, not through the platform', () => {
    const rects = computePlatformCollisionRects(row(6), geometry.playerRadius);
    const escape = computeRectEscape(DEADLOCK, rects);

    expect(escape).not.toBeNull();
    // Nearest edge is the right one, 11.61 units away — which is also the side
    // the chosen corridor is on.
    expect(escape!.dx).toBeGreaterThan(0);
    expect(escape!.dy).toBe(0);
    expect(escape!.distance).toBeCloseTo(11.609, 2);
  });
});
