import { describe, it, expect } from 'vitest';
import { CIRCUIT_CLIMB_GEOMETRY as G, computeColumnCentres } from '../geometry/circuitClimbGeometry';
import { createPursuer, updatePursuer, type PursuerState } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING, BASELINE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';

/**
 * LONG-RUN PURSUER CONTINUITY.
 *
 * The defect these tests exist to prevent: the pursuer chased for the first few
 * moves of a climb and then never chased again. It was not stalled — it kept
 * moving and kept climbing — but it settled about two rows below the learner
 * and stayed there for the rest of the run, never re-entering sensing range,
 * never accelerating, permanently harmless.
 *
 * The mechanism was a speed coincidence, not a logic error. Acquisition
 * requires the learner inside `senseRadius`, and closing that gap is itself a
 * SEARCH job. A learner climbing one row per (travel + think) cycle averages
 * about 0.096 u/ms at an ordinary 1200 ms think; `searchSpeed` was 0.095. The
 * two matched, so the gap froze wherever the opening transient left it and the
 * pursuer could never get close enough to lock on.
 *
 * A short test cannot see this. The first few landings look correct — the
 * pursuer is closing from its spawn two rows below — and the failure only
 * appears once that transient ends. Everything here therefore runs a full
 * climb, not a handful of frames.
 */

const FRAME = 16.7;
const ROUTE_SPEED = 0.62;            // CONFIG.routeSpeed
const LANDINGS = 20;

const geometry = {
  rowGap: G.rowGap,
  platformHeight: G.platformHeight,
  playerRadius: G.playerRadius,
  logicalWidth: G.logicalWidth,
  routePlatformPadding: G.routePlatformPadding,
};
const CENTRES = computeColumnCentres({ ...G, platformWidth: G.platformWidth });

/** A production-shaped tower, tall enough for the whole climb. */
function tower(rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) =>
    CENTRES.map((x, column) => ({
      id: `row-${index}-column-${column}`,
      row: index,
      column,
      x,
      y: -index * G.rowGap,
      width: G.platformWidth,
      height: G.platformHeight,
      dead: false,
    })),
  ).flat();
}

/**
 * Drive a full climb the way the runtime does: the learner travels to a
 * destination (`traveling: true`, which the alive tuning treats as elusive),
 * then rests on it while the player reads the next equation.
 *
 * `thinkMs` is the only variable that matters — it sets the learner's average
 * climb rate, which is what the pursuer is racing.
 */
function climb(tuning: typeof ALIVE_PURSUER_TUNING, thinkMs: number, landings = LANDINGS) {
  const platforms = tower(landings + 4);
  let px = CENTRES[1];
  let py = -G.playerRadius - 3;
  let pursuer: PursuerState = createPursuer(px, py, tuning, geometry);

  let chaseFrames = 0;
  let totalFrames = 0;
  let motionlessRun = 0;
  let longestMotionlessRun = 0;
  let closestApproach = Infinity;
  let capturedAtLanding: number | null = null;
  const perLanding: { distance: number; behaviour: string; lastKnownY: number }[] = [];

  const step = (player: any) => {
    const before = { x: pursuer.x, y: pursuer.y };
    pursuer = updatePursuer(pursuer, player, platforms, FRAME, undefined, geometry);
    totalFrames += 1;
    if (pursuer.behaviour === 'CHASE') chaseFrames += 1;
    // Mirror the runtime's own STALLED rule: motionless AND more than a row
    // away, for a sustained run of frames. Sitting still while pressed against
    // the platform the learner stands on is contact, not a stall, and a few
    // frames spent blocked against a platform underside resolve themselves as
    // the sweep carries the pursuer to a corridor.
    const far = Math.hypot(player.x - pursuer.x, player.y - pursuer.y) > G.rowGap;
    if (far && pursuer.x === before.x && pursuer.y === before.y) {
      motionlessRun += 1;
      longestMotionlessRun = Math.max(longestMotionlessRun, motionlessRun);
    } else {
      motionlessRun = 0;
    }
    closestApproach = Math.min(closestApproach, Math.hypot(player.x - pursuer.x, player.y - pursuer.y));
  };

  for (let landing = 1; landing <= landings; landing += 1) {
    // Mixed destinations, deterministic: every column is used.
    const column = [0, 1, 2, 1, 0, 2][landing % 6];
    const fromX = px;
    const fromY = py;
    const toX = CENTRES[column];
    const toY = -landing * G.rowGap - G.playerRadius - 3;
    const travelMs = (Math.abs(toY - fromY) + Math.abs(toX - fromX) + 190) / ROUTE_SPEED;

    for (let t = 0; t < travelMs; t += FRAME) {
      const k = Math.min(1, t / travelMs);
      // Shielded transit: a spark mid-route cannot be taken.
      step({ x: fromX + (toX - fromX) * k, y: fromY + (toY - fromY) * k, traveling: true, capturable: false });
    }
    px = toX;
    py = toY;

    for (let r = 0; r < thinkMs; r += FRAME) {
      step({ x: px, y: py, traveling: false, capturable: true });
      if (pursuer.state === 'CAUGHT' && capturedAtLanding === null) {
        capturedAtLanding = landing;
        break;
      }
    }

    perLanding.push({
      distance: Math.hypot(px - pursuer.x, py - pursuer.y),
      behaviour: pursuer.behaviour,
      lastKnownY: pursuer.lastKnownY,
    });
    if (capturedAtLanding !== null) break;
  }

  return {
    perLanding,
    landingsCompleted: perLanding.length,
    chaseShare: chaseFrames / Math.max(1, totalFrames),
    longestMotionlessRun,
    closestApproach,
    capturedAtLanding,
    finalBehaviour: pursuer.behaviour,
    finalLastKnownY: pursuer.lastKnownY,
    createdLastKnownY: -G.playerRadius - 3,
  };
}

describe('pursuer continuity: the chase survives a whole climb', () => {
  /**
   * The headline guarantee. Against the pre-repair build this is 0% at both
   * paces — the pursuer never chased once after the opening transient.
   */
  it('keeps chasing across 20 landings at an ordinary learner pace', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 1200);
    expect(run.landingsCompleted).toBeGreaterThanOrEqual(6);
    expect(
      run.chaseShare,
      `pursuer spent ${(run.chaseShare * 100).toFixed(1)}% of frames in CHASE across the climb`,
    ).toBeGreaterThan(0.05);
  });

  it('keeps chasing across 20 landings at a brisk learner pace', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 800);
    expect(run.chaseShare).toBeGreaterThan(0.02);
  });

  /**
   * The failure mode stated directly: the pursuer must not settle into a
   * permanent orbit outside sensing range. It has to actually make contact.
   */
  it('closes to within sensing range rather than trailing forever', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 1200);
    expect(
      run.closestApproach,
      `closest the pursuer ever got was ${run.closestApproach.toFixed(0)} units; ` +
      `senseRadius is ${ALIVE_PURSUER_TUNING.senseRadius}`,
    ).toBeLessThanOrEqual(ALIVE_PURSUER_TUNING.senseRadius);
  });

  /**
   * The specific "gives up after about five moves" report. Pursuit measured
   * late in the climb must be at least as good as early, not collapse.
   */
  it('does not degrade after the opening transient', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 1200);
    const landings = run.perLanding;
    if (landings.length >= 10) {
      const early = landings.slice(0, 5).reduce((a, l) => a + l.distance, 0) / 5;
      const late = landings.slice(-5).reduce((a, l) => a + l.distance, 0) / 5;
      expect(
        late,
        `distance averaged ${early.toFixed(0)} over the first five landings and ` +
        `${late.toFixed(0)} over the last five — the chase decayed`,
      ).toBeLessThanOrEqual(early * 1.5);
    }
  });

  /**
   * `lastKnown` used to be writable only from CHASE and ALERT, so a pursuer
   * that never acquired kept its creation-time value for the entire run and
   * steered at the learner's starting column forever.
   */
  it('updates what it knows about the learner once it acquires', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 1200);
    expect(run.finalLastKnownY).not.toBe(run.createdLastKnownY);
    expect(run.finalLastKnownY).toBeLessThan(-G.rowGap);
  });

  it('never seizes up for long enough to trip the runtime STALLED diagnostic', () => {
    // The runtime reports STALLED after 45 motionless frames while more than a
    // row from the learner. Short blocked runs do occur — the SEARCH rule
    // climbs even when the pursuer has overtaken the learner, so it can press
    // briefly against a platform underside until the sweep carries it to a
    // corridor — but they must stay transient.
    const run = climb(ALIVE_PURSUER_TUNING, 1200);
    expect(
      run.longestMotionlessRun,
      `longest motionless run more than a row out was ${run.longestMotionlessRun} frames`,
    ).toBeLessThan(45);
  });
});

describe('pursuer continuity: the learner can still get away', () => {
  /**
   * The other half of the product rule. A pursuer that always catches is as
   * wrong as one that never does — fast, confident play must escape.
   */
  it('a fast learner outruns the pursuer', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 300);
    expect(run.capturedAtLanding).toBeNull();
    expect(run.landingsCompleted).toBe(LANDINGS);
  });

  /**
   * And a learner who dawdles is genuinely threatened, so the pressure is real.
   */
  it('a slow learner is caught or closely pressed', () => {
    const run = climb(ALIVE_PURSUER_TUNING, 2500);
    const caught = run.capturedAtLanding !== null;
    expect(caught || run.closestApproach < G.playerRadius * 4).toBe(true);
  });
});

describe('pursuer continuity: the frozen baseline is untouched', () => {
  /**
   * The lock suite runs on BASELINE_PURSUER_TUNING, which senses at infinity
   * and is therefore always in CHASE. None of the continuity work may move it.
   */
  it('baseline still chases from the first frame and never searches', () => {
    const run = climb(BASELINE_PURSUER_TUNING, 1200, 3);
    expect(run.chaseShare).toBe(1);
    expect(run.finalBehaviour).toBe('CHASE');
  });

  it('baseline tuning values are unchanged', () => {
    expect(BASELINE_PURSUER_TUNING.searchSpeed).toBe(0.08);
    expect(BASELINE_PURSUER_TUNING.chaseSpeed).toBe(0.08);
    expect(BASELINE_PURSUER_TUNING.senseRadius).toBe(Infinity);
    expect(BASELINE_PURSUER_TUNING.alertDwellMs).toBe(0);
  });
});

describe('pursuer speed: the live chase pace', () => {
  /**
   * Measured, not asserted from the constant: drive a pursuer in a straight
   * unobstructed chase and compare displacement over an identical duration.
   */
  function chaseDisplacement(chaseSpeed: number) {
    const tuning = { ...BASELINE_PURSUER_TUNING, chaseSpeed, searchSpeed: chaseSpeed };
    let p = createPursuer(300, 0, tuning, geometry);
    const startY = p.y;
    // Player far above and out of reach, no platforms: pure vertical chase.
    for (let t = 0; t < 2000; t += FRAME) {
      p = updatePursuer(p, { x: 300, y: -100000, traveling: false, capturable: false },
        [], FRAME, undefined, geometry);
    }
    return Math.abs(p.y - startY);
  }

  it('the new chase speed moves the pursuer 1.20x as far in the same time', () => {
    const before = chaseDisplacement(0.16);
    const after = chaseDisplacement(0.192);
    const ratio = after / before;
    expect(ratio, `measured ${ratio.toFixed(4)}x displacement`).toBeGreaterThan(1.19);
    expect(ratio).toBeLessThan(1.21);
  });

  it('the shipped alive tuning carries the +20% chase speed', () => {
    expect(ALIVE_PURSUER_TUNING.chaseSpeed).toBeCloseTo(0.16 * 1.2, 6);
  });
});
