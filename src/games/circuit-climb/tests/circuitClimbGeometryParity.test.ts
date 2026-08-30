import { describe, it, expect } from 'vitest';
import { CIRCUIT_CLIMB_GEOMETRY as MODULE_GEOMETRY } from '../geometry/circuitClimbGeometry';
import {
  createPursuer,
  updatePursuer,
  getPursuerCaptureDistance,
  type CurrentGameGeometry,
} from '../pursuer/circuitClimbPursuer';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';
import { BASELINE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';

/**
 * GEOMETRY PARITY — the pursuer must navigate the world the runtime is actually
 * drawing, not the module-default world.
 *
 * The runtime owns a LOCAL CONFIG seeded from CIRCUIT_CLIMB_GEOMETRY. World
 * framing (applyViewScale, 80–120%) mutates that LOCAL CONFIG; the module
 * constant never changes. The runtime snapshots its LOCAL CONFIG into a
 * CurrentGameGeometry and hands it to the pursuer, exactly as routingConfig()
 * already does for the learner.
 *
 * Every test below drives a real pursuer calculation and asserts on an
 * observable movement/state outcome. A test that only inspected
 * `pursuer.geometry` would prove the snapshot was stored, not that it was used,
 * and would still pass if updatePursuer ignored the argument entirely.
 */

/** Mirrors applyViewScale() in useCircuitClimbPrototypeRuntime.ts. */
function runtimeGeometryAtScale(percent: number): CurrentGameGeometry {
  const zoom = percent / 100;
  return {
    rowGap: MODULE_GEOMETRY.rowGap * zoom,
    platformHeight: MODULE_GEOMETRY.platformHeight * Math.pow(zoom, 0.48),
    playerRadius: MODULE_GEOMETRY.playerRadius * zoom,
    // Neither of these is touched by applyViewScale — see the assertions in
    // "fields the runtime deliberately holds constant".
    logicalWidth: MODULE_GEOMETRY.logicalWidth,
    routePlatformPadding: MODULE_GEOMETRY.routePlatformPadding,
  };
}

/** A production-shaped three-platform row at a given y. */
function rowAt(y: number, geometry: CurrentGameGeometry, platformHeight = geometry.platformHeight) {
  return MODULE_GEOMETRY.columns.map((fraction, column) => ({
    id: `row-column-${column}`,
    row: 0,
    column,
    x: fraction * geometry.logicalWidth,
    y,
    width: MODULE_GEOMETRY.platformWidth,
    height: platformHeight,
  }));
}

describe('geometry parity: default framing is unchanged', () => {
  it('the module authority still holds the accepted values', () => {
    expect(MODULE_GEOMETRY.rowGap).toBe(205);
    expect(MODULE_GEOMETRY.platformHeight).toBe(62);
    expect(MODULE_GEOMETRY.playerRadius).toBe(32);
    expect(MODULE_GEOMETRY.logicalWidth).toBe(600);
    expect(MODULE_GEOMETRY.routePlatformPadding).toBe(8);
  });

  it('a pursuer built from 100% geometry is identical to the frozen baseline', () => {
    // The accepted product placed the pursuer two rows below the player at the
    // module rowGap, with the module radius. Injection must not move it.
    const pursuer = createPursuer(300, 0, undefined, runtimeGeometryAtScale(100));
    expect(pursuer.y).toBe(0 + 2 * 205);
    expect(pursuer.radius).toBe(32);
  });
});

describe('geometry parity: fields the runtime deliberately holds constant', () => {
  // applyViewScale sets routePlatformPadding = BASE_VIEW.routePlatformPadding
  // (unchanged) and never assigns logicalWidth at all. Column positions are
  // fractions of logicalWidth, so the world keeps its width and its horizontal
  // spacing at every scale — only the vertical rhythm and the actors resize.
  it('logicalWidth is the same at 80%, 100% and 120%', () => {
    expect(runtimeGeometryAtScale(80).logicalWidth).toBe(600);
    expect(runtimeGeometryAtScale(100).logicalWidth).toBe(600);
    expect(runtimeGeometryAtScale(120).logicalWidth).toBe(600);
  });

  it('routePlatformPadding is the same at 80%, 100% and 120%', () => {
    expect(runtimeGeometryAtScale(80).routePlatformPadding).toBe(8);
    expect(runtimeGeometryAtScale(100).routePlatformPadding).toBe(8);
    expect(runtimeGeometryAtScale(120).routePlatformPadding).toBe(8);
  });

  it('rowGap, platformHeight and playerRadius do scale', () => {
    const small = runtimeGeometryAtScale(80);
    const large = runtimeGeometryAtScale(120);
    expect(small.rowGap).toBeLessThan(205);
    expect(large.rowGap).toBeGreaterThan(205);
    expect(small.playerRadius).toBeLessThan(32);
    expect(large.playerRadius).toBeGreaterThan(32);
    expect(small.platformHeight).toBeLessThan(62);
    expect(large.platformHeight).toBeGreaterThan(62);
  });
});

describe('geometry parity: the pursuer uses the geometry it is given', () => {
  /**
   * A. rowGap drives the search climb. When the pursuer is level with its last
   * sighting it keeps pushing upward by a whole row, so the row height decides
   * how far it intends to travel — and, because intent caps the move, how far
   * it actually travels in a budget-rich frame.
   */
  it('A. scaled rowGap changes the vertical search intent the pursuer acts on', () => {
    // BASELINE_PURSUER_TUNING has senseRadius: Infinity, so it is always in
    // CHASE and heads straight for the player — the rowGap branch never runs.
    // A finite sense is what puts it in SEARCH, where the climb is a whole row.
    const searching = { ...BASELINE_PURSUER_TUNING, senseRadius: 100, loseRadius: 100 };
    const climb: Record<number, number> = {};

    for (const percent of [80, 100, 120]) {
      const geometry = runtimeGeometryAtScale(percent);
      const pursuer = createPursuer(300, 0, searching, geometry);
      // Level with its last sighting, so `min(lastKnownY, y - rowGap)` is
      // decided by the rowGap term rather than by the sighting.
      pursuer.lastKnownY = pursuer.y;
      let desiredY = 0;
      updatePursuer(
        pursuer, { x: 300, y: -5000 }, [], 16,
        (step) => { desiredY = step.desired.y; },
        geometry,
      );
      expect(pursuer.behaviour).toBe('SEARCH');
      climb[percent] = pursuer.y - desiredY;
    }

    expect(climb[80]).toBeCloseTo(205 * 0.8, 6);
    expect(climb[100]).toBeCloseTo(205, 6);
    expect(climb[120]).toBeCloseTo(205 * 1.2, 6);
    // The three are genuinely different, so a build that ignored the argument
    // and read the module constant would report 205 for all of them.
    expect(climb[80]).not.toBeCloseTo(climb[100], 3);
    expect(climb[120]).not.toBeCloseTo(climb[100], 3);
  });

  /**
   * B. The actor's own body. Used for its collision rects, its bounds clamp and
   * its drawn size.
   */
  it('B. scaled playerRadius becomes the pursuer body radius', () => {
    expect(createPursuer(300, 0, undefined, runtimeGeometryAtScale(80)).radius).toBeCloseTo(25.6, 6);
    expect(createPursuer(300, 0, undefined, runtimeGeometryAtScale(120)).radius).toBeCloseTo(38.4, 6);
  });

  /**
   * B2. World framing can change while a pursuer is already alive. The runtime
   * passes a fresh snapshot every frame, so the body must follow it — otherwise
   * a pursuer created at one scale keeps that body forever and its collision
   * rects stay at the old scale while every other calculation moves.
   */
  it('B2. a live pursuer adopts a new scale on the next update', () => {
    const pursuer = createPursuer(300, 0, undefined, runtimeGeometryAtScale(100));
    expect(pursuer.radius).toBe(32);

    const rescaled = updatePursuer(
      pursuer, { x: 300, y: -5000 }, [], 16, undefined, runtimeGeometryAtScale(80),
    );
    expect(rescaled.radius).toBeCloseTo(25.6, 6);

    const backUp = updatePursuer(
      rescaled, { x: 300, y: -5000 }, [], 16, undefined, runtimeGeometryAtScale(120),
    );
    expect(backUp.radius).toBeCloseTo(38.4, 6);
  });

  /**
   * C. Capture is the product rule that ends a run. The boundary has to move
   * with the actor's real size, or a scaled-up pursuer would have to overlap
   * the spark far more deeply than a default one to take it.
   */
  it('C. the capture boundary follows the injected playerRadius', () => {
    for (const percent of [80, 100, 120]) {
      const geometry = runtimeGeometryAtScale(percent);
      const reach = getPursuerCaptureDistance(geometry);
      expect(reach).toBeCloseTo(32 * (percent / 100), 6);

      // Just inside the boundary: taken. Just outside: still pursuing.
      // delta is tiny so the frame's own movement cannot cross the gap itself.
      const inside = createPursuer(300, 0, undefined, geometry);
      inside.y = 50 + reach - 1;
      expect(updatePursuer(inside, { x: 300, y: 50 }, [], 0.001, undefined, geometry).state)
        .toBe('CAUGHT');

      const outside = createPursuer(300, 0, undefined, geometry);
      outside.y = 50 + reach + 1;
      expect(updatePursuer(outside, { x: 300, y: 50 }, [], 0.001, undefined, geometry).state)
        .toBe('PURSUING');
    }
  });

  /**
   * D. The bounds clamp. A pursuer pushed past the edge must come to rest a
   * body-and-margin inside it, so the clamp has to use the current radius.
   */
  it('D. the pursuer is clamped to the world using the injected radius', () => {
    for (const percent of [80, 120]) {
      const geometry = runtimeGeometryAtScale(percent);
      const pursuer = createPursuer(300, 0, undefined, geometry);
      // Chase a target far outside the world so the horizontal move saturates.
      const pushed = updatePursuer(
        pursuer, { x: 100000, y: pursuer.y }, [], 100000, undefined, geometry,
      );
      expect(pushed.x).toBeCloseTo(geometry.logicalWidth - (geometry.playerRadius + 6), 6);
    }
  });

  /**
   * E. The row obstacle band. `rowBottom` is what decides whether the player
   * counts as "behind an obstacle I must cross" or "straight ahead". It is
   * built from the row's platform height plus padding and the actor radius, so
   * a taller platform must push the band lower — and a player sitting between
   * the two heights must flip from DIRECT to CORRIDOR.
   *
   * Two worlds identical but for platformHeight, and an observable routing mode
   * difference at exactly the threshold between them.
   */
  it('E. platform height changes the obstacle band and the routing mode', () => {
    const geometry = defaultTestGeometry();
    const rowY = -400;
    const pad = geometry.routePlatformPadding + geometry.playerRadius;

    const shortH = 40;
    const tallH = 90;
    const shortBand = rowY + shortH + pad;
    const tallBand = rowY + tallH + pad;
    expect(tallBand).toBeGreaterThan(shortBand);

    // A player parked between the two band bottoms: below the short row's band
    // (nothing to cross) but still inside the tall row's band (must cross).
    const playerY = (shortBand + tallBand) / 2;

    const probe = (platformHeight: number) => {
      const row = rowAt(rowY, geometry, platformHeight);
      const pursuer = createPursuer(300, 0, undefined, geometry);
      pursuer.y = rowY + 600; // well below the row
      let step: any = null;
      updatePursuer(pursuer, { x: 300, y: playerY }, row, 16, (s) => { step = s; }, geometry);
      return step;
    };

    const shortStep = probe(shortH);
    const tallStep = probe(tallH);

    // The band itself moved, by exactly the height difference.
    expect(tallStep.rowBottom - shortStep.rowBottom).toBeCloseTo(tallH - shortH, 6);

    // And the mode the pursuer routes in flipped as a result.
    expect(shortStep.mustCrossRow).toBe(false);
    expect(shortStep.mode).toBe('DIRECT');
    expect(tallStep.mustCrossRow).toBe(true);
    expect(tallStep.mode).toBe('CORRIDOR');
  });

  /**
   * F. routePlatformPadding is part of the same band. The pursuer must use the
   * runtime's value, and the runtime holds it constant across framing — so the
   * band must be padded identically at every scale.
   */
  it('F. routePlatformPadding comes from the injected geometry', () => {
    const rowY = -400;
    const bandFor = (routePlatformPadding: number) => {
      const geometry = { ...defaultTestGeometry(), routePlatformPadding };
      const row = rowAt(rowY, geometry);
      const pursuer = createPursuer(300, 0, undefined, geometry);
      pursuer.y = rowY + 600;
      let step: any = null;
      updatePursuer(pursuer, { x: 300, y: rowY - 50 }, row, 16, (s) => { step = s; }, geometry);
      return step;
    };
    // The band grows by exactly the extra padding, proving the injected value
    // (not the module constant) is the one in the formula.
    expect(bandFor(48).rowBottom - bandFor(8).rowBottom).toBeCloseTo(40, 6);
    expect(bandFor(8).rowTop - bandFor(48).rowTop).toBeCloseTo(40, 6);
  });
});

describe('geometry parity: what the module authority can and cannot still reach', () => {
  const rowY = -400;

  const runPursuer = (geometry: CurrentGameGeometry) => {
    const row = rowAt(rowY, geometry);
    const pursuer = createPursuer(300, 0, undefined, geometry);
    pursuer.y = rowY + 600;
    let step: any = null;
    const next = updatePursuer(
      pursuer, { x: 300, y: rowY - 20 }, row, 16, (s2) => { step = s2; }, geometry,
    );
    return {
      x: next.x, y: next.y, radius: next.radius,
      rowTop: step.rowTop, rowBottom: step.rowBottom,
      targetX: step.targetX, desiredY: step.desired.y, mode: step.mode,
      corridors: step.corridors,
    };
  };

  /** Mutate the exported authority, run, restore. It is a plain object literal,
   *  not frozen, so this is the real thing a stray module read would see. */
  const withMutatedModule = <T,>(patch: Record<string, number>, body: () => T): T => {
    const saved: Record<string, number> = {};
    for (const key of Object.keys(patch)) saved[key] = (MODULE_GEOMETRY as any)[key];
    try {
      Object.assign(MODULE_GEOMETRY as any, patch);
      return body();
    } finally {
      Object.assign(MODULE_GEOMETRY as any, saved);
    }
  };

  /**
   * G. rowGap and platformHeight reach the pursuer only through the injected
   * snapshot. Corrupting the module authority must not move it at all.
   */
  it('G. rowGap and platformHeight cannot leak in from the module authority', () => {
    const geometry = runtimeGeometryAtScale(100);
    const before = runPursuer(geometry);
    const during = withMutatedModule({ rowGap: 999, platformHeight: 999 }, () => runPursuer(geometry));

    expect(during).toEqual(before);
    // The restore really happened — nothing leaks into another test.
    expect(MODULE_GEOMETRY.rowGap).toBe(205);
    expect(MODULE_GEOMETRY.platformHeight).toBe(62);
  });

  /**
   * G2. The seam is closed.
   *
   * computeActorSafeCorridors() used to read playerRadius / padding /
   * logicalWidth from the module constant for both actors. WORLD-FRAMING-03
   * made it take the current world instead — still one shared authority, still
   * identical physics for learner and pursuer, but no longer anchored to the
   * default framing. Corrupting the module must now move nothing at all.
   */
  it('G2. corridor bounds no longer leak in from the module authority', () => {
    const geometry = runtimeGeometryAtScale(100);
    const before = runPursuer(geometry);
    const during = withMutatedModule(
      { playerRadius: 40, routePlatformPadding: 40, logicalWidth: 9999 },
      () => runPursuer(geometry),
    );

    expect(during).toEqual(before);
    expect(during.corridors).toEqual(before.corridors);

    expect(MODULE_GEOMETRY.playerRadius).toBe(32);
    expect(MODULE_GEOMETRY.routePlatformPadding).toBe(8);
    expect(MODULE_GEOMETRY.logicalWidth).toBe(600);
  });
});
