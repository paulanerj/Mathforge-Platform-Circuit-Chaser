import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';
import { CIRCUIT_CLIMB_GEOMETRY as G } from '../geometry/circuitClimbGeometry';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';

/**
 * SEARCH VERTICAL REACQUISITION — 07B1.
 *
 * One defect: a searching pursuer had no expression that could ask to move
 * down. `min(lastKnownY, y - rowGap)` on an axis where up is negative returns a
 * point above the pursuer for every input, so a learner that reversed was
 * searched for in the one direction it had not gone.
 *
 * The repair gives the sighting one trip back down, from a clear row above.
 * Everything below holds that it is a trip and not a destination — the two ways
 * a memoryless version of this fails are parking on the sighting and
 * oscillating a row above it, and both were measured before this was written.
 */

const geometry = defaultTestGeometry();
const unreachable = { x: 300, y: -100000 };

function searching(pursuerY: number, sightingY: number, x = 300) {
  const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
  pursuer.x = x;
  pursuer.y = pursuerY;
  pursuer.behaviour = 'SEARCH';
  pursuer.lastKnownX = x;
  pursuer.lastKnownY = sightingY;
  return pursuer;
}

/** The vertical target the pursuer asked for on its next frame. */
function desiredYOf(pursuer: any, player: any = unreachable) {
  let step: any;
  updatePursuer(pursuer, { ...player, traveling: true }, [], 16, (s) => { step = s; }, geometry);
  return step.desired.y;
}

describe('SCENARIO A — the sighting is below the pursuer', () => {
  /**
   * The brief's case, exactly: pursuer at −1000, sighting at −650. Before the
   * repair the target came back at −1205 — a row above its own head, away from
   * the only information it had.
   */
  it('the vertical target points DOWN at the sighting, not up past it', () => {
    expect(desiredYOf(searching(-1000, -650))).toBe(-650);
  });

  it('and the pursuer actually reaches it', () => {
    let pursuer = searching(-1000, -650);
    const start = pursuer.y;
    let closest = Math.abs(start - (-650));
    for (let frame = 0; frame < 600; frame += 1) {
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
      closest = Math.min(closest, Math.abs(pursuer.y - (-650)));
    }
    // It arrived at the sighting during the run. Where it is at an arbitrary
    // frame afterwards is forward search, not the descent.
    expect(closest).toBeLessThan(2);
  });

  it('it descends whatever the depth, once clear of a row', () => {
    for (const sightingBelow of [250, 500, 1000, 2000]) {
      expect(desiredYOf(searching(-1000, -1000 + sightingBelow)), `${sightingBelow} below`)
        .toBe(-1000 + sightingBelow);
    }
  });
});

describe('SCENARIO B — the sighting is above the pursuer', () => {
  /**
   * Unchanged: head for the sighting, then keep going past it. The rule this
   * replaces is preserved verbatim as the else-branch.
   */
  it('the vertical target is unchanged when the sighting is above', () => {
    expect(desiredYOf(searching(-500, -650))).toBe(Math.min(-650, -500 - G.rowGap));
  });

  it('a sighting less than a row below does not divert the search either', () => {
    // Inside one row: still forward search, so passing the sighting on the way
    // up does not turn into a reversal.
    expect(desiredYOf(searching(-1000, -900))).toBe(-1000 - G.rowGap);
    expect(desiredYOf(searching(-1000, -1000))).toBe(-1000 - G.rowGap);
  });

  /**
   * The failure mode of the literal one-line form. Targeting the sighting
   * whenever it is below parks the pursuer on it: measured, forward travel over
   * 600 frames fell from 609.6 units to 150.1 and then stopped entirely. Search
   * must still go somewhere.
   */
  it('SEARCH does not become "stop at lastKnown"', () => {
    let pursuer = searching(-500, -650);
    const start = pursuer.y;
    for (let frame = 0; frame < 1200; frame += 1) {
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
    }
    // Well past the sighting, still climbing.
    expect(pursuer.y).toBeLessThan(-650 - G.rowGap);
    expect(start - pursuer.y).toBeGreaterThan(600);
  });
});

describe('SCENARIO C — the wrong-answer return', () => {
  /**
   * The product sequence, driven through the real pursuer: the learner departs
   * (the lock breaks and the sighting freezes where it left), climbs to a wrong
   * platform, and comes back down to the platform it started from — which is
   * exactly where the sighting is. The pursuer overshoots upward while all that
   * happens, and must be able to come back.
   */
  it('the pursuer returns to the sighting the learner came back to', () => {
    const restY = (row: number) => -row * G.rowGap - 35;
    let pursuer = searching(restY(2), restY(3), 110);
    pursuer.behaviour = 'CHASE';

    // 1-2. the learner departs for a wrong platform on the row above.
    for (let frame = 0; frame < 45; frame += 1) {
      pursuer = updatePursuer(pursuer, {
        x: 110, y: restY(3) + (restY(4) - restY(3)) * (frame / 45),
        traveling: true, capturable: true,
      }, [], 16.7, undefined, geometry);
    }
    expect(pursuer.behaviour).toBe('SEARCH');
    // The sighting froze where the learner left, and nothing has refreshed it.
    expect(pursuer.lastKnownY).toBeCloseTo(restY(3), 0);

    // 3-4. rejected, and the learner returns to the platform it started from.
    for (let frame = 0; frame < 22; frame += 1) {
      pursuer = updatePursuer(pursuer, {
        x: 110, y: restY(4) + (restY(3) - restY(4)) * (frame / 22),
        traveling: true, capturable: true,
      }, [], 16.7, undefined, geometry);
    }

    // 5. the learner is settled back at the sighting. Wherever the pursuer
    //    drifted to, it must be able to come back for it.
    let reacquired = false;
    for (let frame = 0; frame < 900; frame += 1) {
      pursuer = updatePursuer(pursuer, { x: 110, y: restY(3), traveling: false, capturable: true }, [], 16.7, undefined, geometry);
      if (pursuer.behaviour !== 'SEARCH' || pursuer.state === 'CAUGHT') { reacquired = true; break; }
    }
    expect(reacquired).toBe(true);
  });

  /**
   * And it gets there by looking, not by being told. No live coordinate ever
   * reaches SEARCH: the sighting it steers at is the one written when the lock
   * broke, and it does not move while the learner does.
   */
  it('no live player position leaks into the search', () => {
    let pursuer = searching(-900, -650, 110);
    const frozen = { x: pursuer.lastKnownX, y: pursuer.lastKnownY };
    for (let frame = 0; frame < 400; frame += 1) {
      // A learner charging around well outside sensing range.
      pursuer = updatePursuer(pursuer, {
        x: 110 + (frame % 40) * 8, y: -3000 - frame * 4,
        traveling: true, capturable: true,
      }, [], 16.7, undefined, geometry);
    }
    expect({ x: pursuer.lastKnownX, y: pursuer.lastKnownY }).toEqual(frozen);
  });
});

describe('the descent is a trip, not an equilibrium', () => {
  /**
   * The failure mode of the threshold form. Gating the downward branch on a row
   * of clearance and nothing else makes the two branches swap every frame at
   * exactly one row above the sighting: measured at 674 direction reversals in
   * 1800 frames, parked in a 5.5-unit band.
   */
  it('it does not oscillate around the sighting', () => {
    let pursuer = searching(-1000, -650);
    const heights: number[] = [];
    for (let frame = 0; frame < 1800; frame += 1) {
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
      heights.push(pursuer.y);
    }

    let reversals = 0;
    let lastDirection = 0;
    for (let i = 1; i < heights.length; i += 1) {
      const direction = Math.sign(Math.round((heights[i] - heights[i - 1]) * 1000));
      if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) reversals += 1;
      if (direction !== 0) lastDirection = direction;
    }
    // One turn: down to the sighting, then away. Not a patrol.
    expect(reversals).toBeLessThanOrEqual(2);
    // And it ended a long way past the sighting, still searching forward.
    expect(pursuer.y).toBeLessThan(-650 - 3 * G.rowGap);
  });

  /**
   * The freeze this introduced before the arrival band existed. Vertical
   * movement is skipped once the gap is under a tenth of a unit, so a descent
   * that completed only on reaching the sighting EXACTLY never completed: the
   * pursuer parked a hair above it with the trip still committed and stopped
   * moving for good. Measured at 1394 frozen frames.
   */
  it('a pursuer starting exactly on its sighting never freezes', () => {
    let pursuer = searching(-1000, -1000);
    const start = pursuer.y;
    let motionless = 0;
    let longestMotionless = 0;
    for (let frame = 0; frame < 1500; frame += 1) {
      const before = pursuer.y;
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
      if (pursuer.y === before) { motionless += 1; longestMotionless = Math.max(longestMotionless, motionless); }
      else motionless = 0;
    }
    expect(longestMotionless).toBeLessThan(45);      // the runtime's own stall threshold
    // And it covered real ground rather than settling anywhere: several rows.
    expect(start - pursuer.y).toBeGreaterThan(4 * G.rowGap);
  });

  it('the trip is taken once per sighting, not once per row climbed', () => {
    let pursuer = searching(-1000, -650);
    let descents = 0;
    let wasDescending = false;
    for (let frame = 0; frame < 3000; frame += 1) {
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
      const descending = pursuer.searchDescent === 'DESCENDING';
      if (descending && !wasDescending) descents += 1;
      wasDescending = descending;
    }
    expect(descents).toBe(1);
    expect(pursuer.searchDescent).toBe('SPENT');
  });

  it('a fresh sighting is owed a fresh trip', () => {
    let pursuer = searching(-1000, -650);
    for (let frame = 0; frame < 900; frame += 1) {
      pursuer = updatePursuer(pursuer, unreachable, [], 16.7, undefined, geometry);
    }
    expect(pursuer.searchDescent).toBe('SPENT');

    // The learner is seen again, close by, and then departs: a new sighting.
    pursuer = updatePursuer(pursuer, { x: pursuer.x, y: pursuer.y + 60, traveling: false, capturable: true }, [], 16.7, undefined, geometry);
    expect(pursuer.behaviour).not.toBe('SEARCH');
    expect(pursuer.searchDescent).toBe('PENDING');
  });
});

describe('LOCKED: the frozen baseline still cannot descend', () => {
  /**
   * The baseline tuning never loses its lock, so it is never in SEARCH and the
   * new branch is unreachable for it. Stated as a test because the capability
   * locks depend on that tuning behaving exactly as it always has.
   */
  it('a baseline pursuer never enters the descent state', () => {
    const pursuer = createPursuer(300, 0, undefined, geometry);
    expect(pursuer.searchDescent).toBe('PENDING');

    let next = pursuer;
    for (let frame = 0; frame < 300; frame += 1) {
      next = updatePursuer(next, { x: 300, y: -900, traveling: false, capturable: true }, [], 16.7, undefined, geometry);
      expect(next.searchDescent).toBe('PENDING');
      if (next.state === 'CAUGHT') break;
    }
    expect(next.behaviour).toBe('CHASE');
  });
});
