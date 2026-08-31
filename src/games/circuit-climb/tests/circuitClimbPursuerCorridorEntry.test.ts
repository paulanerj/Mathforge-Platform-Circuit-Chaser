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

/**
 * DIRECT-MODE DEADLOCK, 100% world framing.
 *
 * A second live run, after the corridor-entry repair. The pursuer chased much
 * better — reaching learner row 10 — and then froze for 767 frames, level with
 * the learner, with 282 units of horizontal intent, every frame refused.
 *
 * This one is NOT the corridor-entry defect and NOT an overlap. The pursuer is
 * OUTSIDE every rect, pressed against one by 0.116 units. It is stuck because
 * DIRECT mode has no obstacle handling at all: the only obstacle it reasons
 * about is the row it must cross, and when the learner is on the pursuer's own
 * row there is no such row, so no corridor is ever chosen. With the vertical
 * gap already closed there is nothing to spend the frame on either.
 *
 * The session reported 90% framing, but the recorded band (rowTop -2295,
 * rowBottom -2153, nextRowY -2255) gives pad 40 and platformHeight 62 — which
 * is 100%. Row 11 sits at -2255 only at rowGap 205, and row 10's rest position
 * is exactly the recorded -2085. The figures below are therefore 100%.
 */
const D_GEOMETRY = {
  rowGap: G.rowGap,
  platformHeight: G.platformHeight,
  playerRadius: G.playerRadius,
  logicalWidth: G.logicalWidth,
  routePlatformPadding: G.routePlatformPadding,
};
const D_CENTRES = computeColumnCentres({ ...G, platformWidth: G.platformWidth });
const D_ROW = (index: number) => D_CENTRES.map((x, column) => ({
  id: `row-${index}-column-${column}`, row: index, column, x,
  y: -index * G.rowGap, width: G.platformWidth, height: G.platformHeight, dead: false,
}));
const D_WORLD = [9, 10, 11, 12].flatMap(D_ROW);
const FROZEN = { x: 207.88411021261896, y: -2085 };
const D_LEARNER = { x: 490, y: -2085 };

function frozenPursuer(): PursuerState {
  const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, D_GEOMETRY);
  pursuer.x = FROZEN.x;
  pursuer.y = FROZEN.y;
  pursuer.behaviour = 'CHASE';
  return pursuer;
}

describe('direct mode: level with the learner and walled off', () => {
  it('the recorded band identifies 100% framing, not 90%', () => {
    expect(G.routePlatformPadding + G.playerRadius).toBe(40);   // reported pad
    expect(G.platformHeight).toBe(62);                          // reported height
    expect(-11 * G.rowGap).toBe(-2255);                         // reported nextRowY
    expect(-10 * G.rowGap - G.playerRadius - 3).toBe(-2085);    // reported learner y
  });

  /**
   * The correction to the working hypothesis: this is not penetration. The
   * pursuer is outside every rect, by a tenth of a unit.
   */
  it('the pursuer is OUTSIDE every rect, not embedded in one', () => {
    const rects = computePlatformCollisionRects(D_WORLD, G.playerRadius);
    expect(computeRectEscape(FROZEN, rects)).toBeNull();

    const blocking = rects.find(r => r.platform.id === 'row-10-column-1')!;
    expect(blocking.left - FROZEN.x).toBeCloseTo(0.116, 3);
  });

  it('the move toward the learner is refused by the pursuer\'s own row', () => {
    const rects = computePlatformCollisionRects(D_WORLD, G.playerRadius);
    const toward = [FROZEN, { x: FROZEN.x + 1, y: FROZEN.y }];
    expect(pathIsClear(toward, rects)).toBe(false);

    const culprit = rects.filter(r => !pathIsClear(toward, [r]));
    expect(culprit).toHaveLength(1);
    expect(culprit[0].platform.id).toBe('row-10-column-1');
  });

  /**
   * Five units of lift is all that was ever needed.
   */
  it('a small climb clears the band and opens the path', () => {
    const rects = computePlatformCollisionRects(D_WORLD, G.playerRadius);
    const blocking = rects.find(r => r.platform.id === 'row-10-column-1')!;
    expect(FROZEN.y - blocking.top).toBe(5);

    const above = blocking.top - 1;
    expect(pathIsClear([{ x: FROZEN.x, y: above }, { x: FROZEN.x + 1, y: above }], rects)).toBe(true);
  });

  /**
   * The headline regression. Before the repair this run produces zero movement
   * across 400 frames; an earlier attempt produced movement but only an
   * oscillation, so progress is measured in horizontal distance closed, not in
   * frames that happened to move.
   */
  it('routes around the platform instead of pressing against it', () => {
    let pursuer = frozenPursuer();
    const player = { ...D_LEARNER, traveling: false, capturable: true, platform: D_ROW(10)[2] };

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, D_WORLD, 16.7, undefined, D_GEOMETRY);
    }

    const closed = pursuer.x - FROZEN.x;
    expect(closed, `only closed ${closed.toFixed(1)} of the 282 units of horizontal intent`)
      .toBeGreaterThan(150);
    expect(Math.abs(D_LEARNER.x - pursuer.x)).toBeLessThan(100);
  });

  it('never passes through a platform on the way around', () => {
    let pursuer = frozenPursuer();
    const player = { ...D_LEARNER, traveling: false, capturable: true, platform: D_ROW(10)[2] };

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, D_WORLD, 16.7, undefined, D_GEOMETRY);
      for (const platform of D_WORLD) {
        const insideBody =
          pursuer.x > platform.x - platform.width / 2 &&
          pursuer.x < platform.x + platform.width / 2 &&
          pursuer.y > platform.y &&
          pursuer.y < platform.y + platform.height;
        expect(insideBody, `inside ${platform.id} at frame ${frame}`).toBe(false);
      }
    }
  });

  /**
   * The same deadlock reflected. If the repair only worked on the recorded
   * coordinates it would be a fix for one session, not for the contract.
   */
  it('routes around from the other side too', () => {
    const rects = computePlatformCollisionRects(D_WORLD, G.playerRadius);
    const blocking = rects.find(r => r.platform.id === 'row-10-column-1')!;
    const startX = blocking.right + (FROZEN.x - blocking.left) * -1; // same 0.116 gap, mirrored

    let pursuer = frozenPursuer();
    pursuer.x = startX;
    const player = { x: D_CENTRES[0], y: FROZEN.y, traveling: false, capturable: true, platform: D_ROW(10)[0] };

    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, D_WORLD, 16.7, undefined, D_GEOMETRY);
    }

    const closed = startX - pursuer.x;
    expect(closed, `only closed ${closed.toFixed(1)} units leftward`).toBeGreaterThan(150);
    expect(Math.abs(D_CENTRES[0] - pursuer.x)).toBeLessThan(100);
  });

  /**
   * The detour has to be a detour: the smallest lift that clears the band, and
   * given back once the way is open. A pursuer that climbed away to solve this
   * would pass the headline test and still be broken.
   */
  it('lifts only as far as the band requires, and comes back down', () => {
    let pursuer = frozenPursuer();
    const player = { ...D_LEARNER, traveling: false, capturable: true, platform: D_ROW(10)[2] };

    let highest = FROZEN.y;
    for (let frame = 0; frame < 400; frame += 1) {
      pursuer = updatePursuer(pursuer, player, D_WORLD, 16.7, undefined, D_GEOMETRY);
      highest = Math.min(highest, pursuer.y);
    }

    expect(pursuer.state).toBe('CAUGHT');
    expect(FROZEN.y - highest).toBeLessThan(10);
    expect(pursuer.y).toBe(FROZEN.y);
  });
  /**
   * The detour is a fallback, not an override. When the frame's own vertical
   * move would already clear the band, that move must survive intact — which is
   * why the band test looks at where the move ENDS, not at where the pursuer
   * currently is. At a normal frame budget the two readings agree (a frame moves
   * ~3 units and the band edge is 5 away), so this uses one large frame to tell
   * them apart: the honest move closes the full 10-unit gap, the override would
   * substitute a 6-unit hop and leave the pursuer short.
   */
  it('does not override a vertical move that already clears the band', () => {
    const rects = computePlatformCollisionRects(D_WORLD, G.playerRadius);
    const blocking = rects.find(r => r.platform.id === 'row-10-column-1')!;

    const pursuer = frozenPursuer();
    const player = { x: D_LEARNER.x, y: FROZEN.y - 10, traveling: false, capturable: true, platform: D_ROW(10)[2] };
    const next = updatePursuer(pursuer, player, D_WORLD, 300, undefined, D_GEOMETRY);

    expect(next.x).toBe(FROZEN.x);            // still walled off sideways
    expect(next.y).toBe(FROZEN.y - 10);       // the whole gap, not a 6-unit hop
    expect(next.y).toBeLessThan(blocking.top);
  });

  /**
   * Why the near edge is always the top edge for a resting learner, at every
   * framing: a learner rests playerRadius + 3 above its platform, and the
   * inflated rect starts routePlatformPadding + playerRadius above it, so the
   * gap is routePlatformPadding - 3 — five units — whatever the view scale. The
   * far edge is platformHeight + 11 + 2 * playerRadius away. The nearest-edge
   * choice therefore only ever picks "down" for a learner in transit, which is
   * why the recorded freezes are all top-edge cases.
   */
  it('a resting learner always sits five units inside the top of the band', () => {
    for (const zoom of [0.8, 0.9, 1.0, 1.2]) {
      const radius = G.playerRadius * zoom;
      const height = G.platformHeight * Math.pow(zoom, 0.48);
      const platform = { id: 'p', row: 3, column: 1, x: 300, y: -3 * G.rowGap * zoom, width: G.platformWidth, height };
      const [rect] = computePlatformCollisionRects([platform], radius, G.routePlatformPadding);
      const restY = platform.y - radius - 3;

      expect(restY - rect.top, `zoom ${zoom}`).toBeCloseTo(5, 9);
      expect(rect.bottom - restY).toBeCloseTo(height + 11 + 2 * radius, 9);
    }
  });
});
