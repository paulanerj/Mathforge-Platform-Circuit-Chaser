import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';
import {
  CIRCUIT_CLIMB_GEOMETRY as G,
  computeColumnCentres,
  computeActorSafeCorridors,
} from '../geometry/circuitClimbGeometry';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';

/**
 * REACQUISITION FORENSICS.
 *
 * Nothing here changes behaviour. These tests exist to pin down, in executable
 * form, what the pursuer's SEARCH policy can and cannot reach — because the
 * failure they describe is invisible to every diagnostic the project already
 * has. The bot moves the whole time. It never stalls. It is simply looking in
 * a place the learner cannot be, and no mechanism exists that can tell it so.
 *
 * The figures are the human run's: learner route 4, LEFT (110) to RIGHT (490),
 * pursuer left holding a sighting at x = 110.
 */

const geometry = defaultTestGeometry();
const T = ALIVE_PURSUER_TUNING;

/** The two points the lateral patrol can ever aim at. */
function sweepEnvelope(lastKnownX: number, amplitude: number, logicalWidth: number, radius: number) {
  const minClearance = radius + 6;
  const clamp = (v: number) => Math.max(minClearance, Math.min(logicalWidth - minClearance, v));
  return { left: clamp(lastKnownX - amplitude), right: clamp(lastKnownX + amplitude) };
}

// ---------------------------------------------------------------------------
// TASK 1 — the recorded post-route state, reproduced
// ---------------------------------------------------------------------------

const ROUTE4 = {
  lastKnown: { x: 110, y: -654.28 },
  player: { x: 490, y: -855 },
  pursuerY: -922.98,
};

function searchingPursuer(x: number, y: number) {
  const pursuer = createPursuer(300, 0, T, geometry);
  pursuer.x = x;
  pursuer.y = y;
  pursuer.behaviour = 'SEARCH';
  pursuer.lastKnownX = ROUTE4.lastKnown.x;
  pursuer.lastKnownY = ROUTE4.lastKnown.y;
  return pursuer;
}

describe('TASK 1 — the recorded state, reproduced', () => {
  /**
   * Two envelopes, one unit apart in importance. The sweep AIMS at
   * lastKnownX +/- wanderAmplitude — 30 and 190. The pursuer's position is then
   * clamped to the world by `radius + 6`, so what it can actually REACH is
   * 38 .. 190. Only the right edge decides anything here, and both agree on it.
   */
  it('the sweep aims at 30 .. 190 and can reach 38 .. 190', () => {
    expect(ROUTE4.lastKnown.x - T.wanderAmplitude).toBe(30);
    expect(ROUTE4.lastKnown.x + T.wanderAmplitude).toBe(190);

    const envelope = sweepEnvelope(ROUTE4.lastKnown.x, T.wanderAmplitude, G.logicalWidth, G.playerRadius);
    expect(envelope.left).toBe(G.playerRadius + 6);   // 38, clamped by the world edge
    expect(envelope.right).toBe(190);
  });

  it('the closest the sweep can bring the pursuer is 307.6 from the learner', () => {
    const closest = Math.hypot(ROUTE4.player.x - 190, ROUTE4.player.y - ROUTE4.pursuerY);
    expect(closest).toBeCloseTo(307.61, 2);
    expect(closest).toBeGreaterThan(T.senseRadius);
  });

  /**
   * The sweep is not the only thing that can move the pursuer sideways: while
   * crossing a row it commits to a corridor, chosen by the UNSWEPT sighting.
   * That reaches further right than the sweep does, and it still is not enough.
   */
  it('even the corridor commitment cannot reach sensing range', () => {
    const centres = computeColumnCentres({ ...G, platformWidth: G.platformWidth });
    const half = G.platformWidth / 2;
    const bounds = centres.map((c) => ({ center: c, left: c - half, right: c + half }));
    const corridors = computeActorSafeCorridors(bounds[0], bounds[1], bounds[2], {
      playerRadius: G.playerRadius, routePlatformPadding: G.routePlatformPadding,
      logicalWidth: G.logicalWidth, platformWidth: G.platformWidth,
    });

    // It commits to the corridor nearest the sighting, not nearest the learner.
    const chosen = corridors.reduce((best, c) =>
      Math.abs(c.center - ROUTE4.lastKnown.x) < Math.abs(best.center - ROUTE4.lastKnown.x) ? c : best);
    expect(chosen.id).toBe('B');
    expect(chosen.center).toBe(205);

    // Best case: standing in that corridor at the learner's own altitude.
    expect(Math.abs(ROUTE4.player.x - chosen.center)).toBe(285);
    expect(285).toBeGreaterThan(T.senseRadius);
  });

  /**
   * The headline. Two thousand frames — over half a minute — of a pursuer that
   * moves every frame, sweeps both ways many times, and never once gets close
   * enough to see a learner standing still in plain sight.
   */
  it('SEARCH never becomes ALERT, however long it runs', () => {
    let pursuer = searchingPursuer(190, ROUTE4.pursuerY);
    const player = { ...ROUTE4.player, traveling: false, capturable: true };

    let minimumDistance = Infinity;
    let everSensed = false;
    let movedFrames = 0;
    const xs: number[] = [];

    for (let frame = 0; frame < 2000; frame += 1) {
      const before = { x: pursuer.x, y: pursuer.y };
      pursuer = updatePursuer(pursuer, player, [], 16.7, undefined, geometry);
      minimumDistance = Math.min(minimumDistance, Math.hypot(player.x - pursuer.x, player.y - pursuer.y));
      if (pursuer.behaviour !== 'SEARCH') everSensed = true;
      if (pursuer.x !== before.x || pursuer.y !== before.y) movedFrames += 1;
      xs.push(pursuer.x);
    }

    expect(everSensed).toBe(false);
    expect(pursuer.behaviour).toBe('SEARCH');
    expect(minimumDistance).toBeGreaterThan(T.senseRadius);
    // It is not stuck. It moves almost every frame, for the whole run.
    expect(movedFrames).toBeGreaterThan(1000);
    // And it swept both ways many times while failing.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(50);
  });

  it('the sighting it is searching around never changes', () => {
    let pursuer = searchingPursuer(190, ROUTE4.pursuerY);
    const player = { ...ROUTE4.player, traveling: false, capturable: true };
    for (let frame = 0; frame < 2000; frame += 1) {
      pursuer = updatePursuer(pursuer, player, [], 16.7, undefined, geometry);
    }
    expect(pursuer.lastKnownX).toBe(ROUTE4.lastKnown.x);
    expect(pursuer.lastKnownY).toBe(ROUTE4.lastKnown.y);
  });

  /**
   * Why it is absorbing rather than merely unlucky. `lastKnown` is written in
   * exactly two places — the frame a lock breaks, and the frame one is
   * acquired. In SEARCH neither can fire while the learner is out of range, so
   * the belief that makes reacquisition impossible is the same belief that
   * prevents it being corrected.
   */
  it('a learner that keeps playing does not rescue it either', () => {
    let pursuer = searchingPursuer(190, ROUTE4.pursuerY);
    let everSensed = false;
    // The learner carries on climbing the right-hand side, travelling and
    // settling, for another six rows.
    for (let row = 4; row < 10; row += 1) {
      const restY = -row * G.rowGap - 35;
      for (let frame = 0; frame < 60; frame += 1) {
        pursuer = updatePursuer(pursuer, { x: 490, y: restY, traveling: true, capturable: true }, [], 16.7, undefined, geometry);
        if (pursuer.behaviour !== 'SEARCH') everSensed = true;
      }
      for (let frame = 0; frame < 120; frame += 1) {
        pursuer = updatePursuer(pursuer, { x: 490, y: restY, traveling: false, capturable: true }, [], 16.7, undefined, geometry);
        if (pursuer.behaviour !== 'SEARCH') everSensed = true;
      }
    }
    expect(everSensed).toBe(false);
    expect(pursuer.lastKnownX).toBe(110);
  });
});

// ---------------------------------------------------------------------------
// TASK 3 — the general condition
// ---------------------------------------------------------------------------

/**
 * The lateral impossibility condition.
 *
 * The sweep can put the pursuer no further from its sighting than
 * `wanderAmplitude`, so the smallest horizontal gap it can ever achieve is
 * `|playerX - lastKnownX| - wanderAmplitude`. Horizontal gap is a lower bound on
 * Euclidean distance, so when that exceeds `senseRadius` no vertical position
 * can rescue it: reacquisition is impossible for every future frame, not merely
 * unlikely.
 */
export function lateralReacquisitionImpossible(
  playerX: number, lastKnownX: number, amplitude: number, senseRadius: number,
) {
  return Math.abs(playerX - lastKnownX) - amplitude > senseRadius;
}

describe('TASK 3 — the general lateral condition', () => {
  it('the threshold is senseRadius + wanderAmplitude', () => {
    expect(T.senseRadius + T.wanderAmplitude).toBe(340);
    expect(lateralReacquisitionImpossible(490, 110, 80, 260)).toBe(true);   // 380 > 340
    expect(lateralReacquisitionImpossible(300, 110, 80, 260)).toBe(false);  // 190 < 340
    expect(lateralReacquisitionImpossible(110 + 340, 110, 80, 260)).toBe(false); // exactly on it
  });

  /**
   * The finding that matters for the product: this is not an exotic state. It
   * is what one perfectly ordinary move does — crossing the board — at every
   * framing the game supports.
   */
  it('an outer-column to outer-column move is impossible at EVERY framing', () => {
    for (const percent of [80, 90, 100, 110, 120]) {
      const zoom = percent / 100;
      const platformWidth = G.platformWidth * (0.98 + 0.02 * zoom);
      const radius = G.playerRadius * zoom;
      const centres = computeColumnCentres({
        platformWidth, playerRadius: radius,
        routePlatformPadding: G.routePlatformPadding, logicalWidth: G.logicalWidth,
      });
      const crossBoard = Math.abs(centres[2] - centres[0]);
      expect(crossBoard, `${percent}% cross-board gap`).toBeGreaterThan(T.senseRadius + T.wanderAmplitude);
      expect(lateralReacquisitionImpossible(centres[2], centres[0], T.wanderAmplitude, T.senseRadius)).toBe(true);
      expect(lateralReacquisitionImpossible(centres[0], centres[2], T.wanderAmplitude, T.senseRadius)).toBe(true);
    }
  });

  it('an adjacent-column move stays recoverable at every framing', () => {
    for (const percent of [80, 90, 100, 110, 120]) {
      const zoom = percent / 100;
      const platformWidth = G.platformWidth * (0.98 + 0.02 * zoom);
      const centres = computeColumnCentres({
        platformWidth, playerRadius: G.playerRadius * zoom,
        routePlatformPadding: G.routePlatformPadding, logicalWidth: G.logicalWidth,
      });
      expect(
        lateralReacquisitionImpossible(centres[1], centres[0], T.wanderAmplitude, T.senseRadius),
        `${percent}% adjacent`,
      ).toBe(false);
    }
  });

  /**
   * Route turn count shapes the path, not its endpoints, so it cannot affect
   * the lateral condition at all. Recording that here so the next phase does
   * not go looking for an interaction that is not there.
   */
  it('routeTurnCount cannot influence the condition', () => {
    const centres = computeColumnCentres({ ...G, platformWidth: G.platformWidth });
    for (const turns of [6, 8, 10, 12]) {
      // The condition reads only the endpoints, which are column centres.
      expect(lateralReacquisitionImpossible(centres[2], centres[0], T.wanderAmplitude, T.senseRadius),
        `turns ${turns}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// TASK 4 — the upward-only search target
// ---------------------------------------------------------------------------

describe('TASK 4 — SEARCH cannot aim downward', () => {
  /**
   * `desiredY = min(lastKnownY, y - rowGap)` on an axis where up is negative.
   * `y - rowGap` is always above the pursuer, so the minimum is too — the
   * expression has no reachable branch that points down.
   */
  it('the vertical target is always at least a row above the pursuer', () => {
    for (const sightingBelow of [0, 100, 500, 2000]) {
      const pursuer = searchingPursuer(300, -1000);
      pursuer.lastKnownX = 300;
      pursuer.lastKnownY = -1000 + sightingBelow;
      let step: any;
      updatePursuer(pursuer, { x: 300, y: -1000 + sightingBelow, traveling: true }, [], 16, (s) => { step = s; }, geometry);
      expect(step.desired.y, `sighting ${sightingBelow} below`).toBeLessThanOrEqual(-1000 - geometry.rowGap);
    }
  });

  it('a pursuer already above the learner climbs further away', () => {
    let pursuer = searchingPursuer(190, ROUTE4.pursuerY);
    const player = { ...ROUTE4.player, traveling: false, capturable: true };
    const start = pursuer.y;
    for (let frame = 0; frame < 600; frame += 1) {
      pursuer = updatePursuer(pursuer, player, [], 16.7, undefined, geometry);
    }
    expect(pursuer.y).toBeLessThan(start);                        // climbed
    expect(Math.abs(player.y - pursuer.y)).toBeGreaterThan(Math.abs(player.y - start));
  });

  /** CHASE has no such limit — the asymmetry is the whole of the defect. */
  it('CHASE aims at a learner below it; SEARCH does not', () => {
    const chasing = searchingPursuer(300, -900);
    chasing.behaviour = 'CHASE';
    let chaseStep: any;
    updatePursuer(chasing, { x: 300, y: -650, traveling: false, capturable: true }, [], 16, (s) => { chaseStep = s; }, geometry);
    expect(chaseStep.desired.y).toBe(-650);

    const searching = searchingPursuer(300, -900);
    searching.lastKnownX = 300;
    searching.lastKnownY = -650;
    let searchStep: any;
    updatePursuer(searching, { x: 300, y: -650, traveling: true, capturable: true }, [], 16, (s) => { searchStep = s; }, geometry);
    expect(searchStep.desired.y).toBeLessThan(-900);
  });
});

// ---------------------------------------------------------------------------
// TASK 5 — is the wrong-answer return the same defect?
// ---------------------------------------------------------------------------

describe('TASK 5 — the wrong-answer return is the vertical failure, not the lateral one', () => {
  /**
   * A wrong answer moves the learner UP to the rejected platform and back DOWN
   * to where it started, so its horizontal displacement is zero and the lateral
   * condition never fires. What bites there is the upward-only target alone.
   * Keeping the two apart matters: they have different triggers, different
   * severities, and would take different repairs.
   */
  it('a wrong-answer round trip never triggers the lateral condition', () => {
    const centres = computeColumnCentres({ ...G, platformWidth: G.platformWidth });
    for (const column of [0, 1, 2]) {
      // Start and end are the SAME platform: the learner returns to it.
      expect(lateralReacquisitionImpossible(centres[column], centres[column], T.wanderAmplitude, T.senseRadius))
        .toBe(false);
    }
  });

  it('but the pursuer still cannot aim down at the returning learner', () => {
    const pursuer = searchingPursuer(110, -900);
    pursuer.lastKnownX = 110;
    pursuer.lastKnownY = -650;
    let step: any;
    // The learner is on its way back down, below the pursuer.
    updatePursuer(pursuer, { x: 110, y: -700, traveling: true, capturable: true }, [], 16, (s) => { step = s; }, geometry);
    expect(step.desired.y).toBeLessThan(-900);
  });

  /**
   * And the severities differ by an order of magnitude. The vertical failure
   * self-corrects when the learner settles inside the sense radius; the lateral
   * one cannot, because the sighting that makes it impossible is the sighting
   * it would need to correct.
   */
  it('the vertical failure recovers where the lateral one does not', () => {
    // Same column, so only the vertical rule is in play: it re-acquires.
    let vertical = searchingPursuer(110, -900);
    vertical.lastKnownX = 110;
    vertical.lastKnownY = -650;
    let verticalRecovered = false;
    for (let frame = 0; frame < 300; frame += 1) {
      vertical = updatePursuer(vertical, { x: 110, y: -650, traveling: false, capturable: true }, [], 16.7, undefined, geometry);
      if (vertical.behaviour !== 'SEARCH') { verticalRecovered = true; break; }
    }
    expect(verticalRecovered).toBe(true);

    // Cross-board, so the lateral rule is in play: it never does.
    let lateral = searchingPursuer(190, ROUTE4.pursuerY);
    let lateralRecovered = false;
    for (let frame = 0; frame < 2000; frame += 1) {
      lateral = updatePursuer(lateral, { ...ROUTE4.player, traveling: false, capturable: true }, [], 16.7, undefined, geometry);
      if (lateral.behaviour !== 'SEARCH') { lateralRecovered = true; break; }
    }
    expect(lateralRecovered).toBe(false);
  });
});
