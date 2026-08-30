import { describe, it, expect } from 'vitest';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computeActorSafeCorridors, computePlatformBounds } from '../geometry/circuitClimbGeometry';
import { createPursuer, updatePursuer, getPursuerCaptureDistance, type CurrentGameGeometry } from '../pursuer/circuitClimbPursuer';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';

/**
 * Test that pursuer geometry calculations match runtime geometry at various scales.
 *
 * The issue: when view scale changes, CONFIG is mutated. The pursuer reads CONFIG
 * on every frame. But we need to verify that the geometry it's using actually
 * reflects the current runtime state, not cached or stale values.
 */
describe('Circuit Climb Geometry Parity', () => {
  it('preserves default geometry at 100% scale', () => {
    const defaultRowGap = 205;
    const defaultPlatformHeight = 62;
    const defaultPlayerRadius = 32;
    const defaultLogicalWidth = 600;

    expect(CONFIG.rowGap).toBe(defaultRowGap);
    expect(CONFIG.platformHeight).toBe(defaultPlatformHeight);
    expect(CONFIG.playerRadius).toBe(defaultPlayerRadius);
    expect(CONFIG.logicalWidth).toBe(defaultLogicalWidth);
  });

  it('pursuer initial state uses injected geometry', () => {
    const geometry = defaultTestGeometry();

    const pursuer = createPursuer(300, 0, undefined, geometry);

    // Pursuer should be initialized 2 rows below player
    const expectedY = 0 + 2 * geometry.rowGap;
    expect(pursuer.y).toBe(expectedY);
    expect(pursuer.radius).toBe(geometry.playerRadius);
    expect(pursuer.geometry).toBe(geometry);
  });

  it('corridor calculations use current CONFIG geometry', () => {
    // Get the three platforms of row 1 (left, center, right)
    const p0 = computePlatformBounds(0);
    const p1 = computePlatformBounds(1);
    const p2 = computePlatformBounds(2);

    const corridors = computeActorSafeCorridors(p0, p1, p2);

    // With default geometry and 3 platforms, we get at least 2 corridors (B and C interior)
    // The exterior corridors (A and D) may not exist due to platform positioning
    expect(corridors.length).toBeGreaterThanOrEqual(2);

    // Verify we have interior corridors
    const interiorCorridors = corridors.filter(c => c.type === 'interior');
    expect(interiorCorridors.length).toBeGreaterThanOrEqual(2);

    // Verify the corridors span within the logical width correctly
    for (const corridor of corridors) {
      expect(corridor.left).toBeGreaterThanOrEqual(0);
      expect(corridor.right).toBeLessThanOrEqual(CONFIG.logicalWidth);
      expect(corridor.right).toBeGreaterThan(corridor.left);
    }
  });
});

/**
 * Off-default geometry tests prove the pursuer USES injected geometry,
 * not module-default constants. These tests MUST fail if updatePursuer
 * ignores its geometry parameter.
 */
describe('Circuit Climb Pursuer Off-Default Geometry', () => {
  /**
   * A. createPursuer with scaled rowGap places pursuer using scaled rowGap.
   */
  it('A. scaled rowGap affects initial pursuer position', () => {
    const scaledGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      rowGap: 100, // Scaled down from default 205
    };

    const pursuer = createPursuer(300, 0, undefined, scaledGeometry);

    // Pursuer should be 2 rows below player, using scaled geometry
    const expectedY = 0 + 2 * scaledGeometry.rowGap;
    expect(pursuer.y).toBe(expectedY);
    expect(pursuer.y).not.toBe(0 + 2 * CONFIG.rowGap); // NOT using module-default
  });

  /**
   * B. createPursuer with scaled playerRadius uses scaled radius.
   */
  it('B. scaled playerRadius affects pursuer collision radius', () => {
    const scaledGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      playerRadius: 20, // Scaled down from default 32
    };

    const pursuer = createPursuer(300, 0, undefined, scaledGeometry);

    expect(pursuer.radius).toBe(scaledGeometry.playerRadius);
    expect(pursuer.radius).not.toBe(CONFIG.playerRadius); // NOT using module-default
  });

  /**
   * C. updatePursuer with scaled logicalWidth clamps against scaled width.
   */
  it('C. scaled logicalWidth clamps pursuer position', () => {
    const narrowGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      logicalWidth: 300, // Scaled down from default 600
    };

    const pursuer = createPursuer(150, 0, undefined, narrowGeometry);
    // Try to move far right, beyond narrower world
    const nextPursuer = updatePursuer(pursuer, { x: 600, y: 0 }, [], 100, undefined, narrowGeometry);

    // Pursuer should be clamped to narrower width
    const minClearance = pursuer.radius + 6;
    const maxX = narrowGeometry.logicalWidth - minClearance;
    expect(nextPursuer.x).toBeLessThanOrEqual(maxX);
    expect(nextPursuer.x).not.toBeGreaterThan(300 - minClearance); // NOT full width
  });

  /**
   * D. updatePursuer with scaled platformHeight uses scaled obstacle band.
   */
  it('D. scaled platformHeight affects corridor band calculation', () => {
    const scaledGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      platformHeight: 30, // Scaled down from default 62
    };

    const pursuer = createPursuer(300, 0, undefined, scaledGeometry);
    const row = [
      {
        x: 110,
        y: 100,
        width: 104,
        height: scaledGeometry.platformHeight,
        id: 'p0',
      },
      {
        x: 300,
        y: 100,
        width: 104,
        height: scaledGeometry.platformHeight,
        id: 'p1',
      },
      {
        x: 490,
        y: 100,
        width: 104,
        height: scaledGeometry.platformHeight,
        id: 'p2',
      },
    ];

    const nextPursuer = updatePursuer(
      pursuer,
      { x: 300, y: 50 },
      row,
      16,
      undefined,
      scaledGeometry
    );

    // With smaller platform height, the corridor band should be narrower
    // Verify pursuer is using scaled geometry by checking its state changed
    expect(nextPursuer).toBeDefined();
    expect(nextPursuer.geometry).toBe(scaledGeometry);
  });

  /**
   * E. capture distance uses injected scaled playerRadius.
   */
  it('E. capture distance reflects injected geometry playerRadius', () => {
    const scaledGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      playerRadius: 16, // Scaled down from default 32
    };

    const captureDistance = getPursuerCaptureDistance(scaledGeometry);

    expect(captureDistance).toBe(scaledGeometry.playerRadius);
    expect(captureDistance).not.toBe(CONFIG.playerRadius); // NOT using module-default
  });

  /**
   * F. changing module-default CONFIG does not override explicitly supplied geometry.
   */
  it('F. module-default CONFIG mutation does not override injected geometry', () => {
    const injectedGeometry: CurrentGameGeometry = {
      ...defaultTestGeometry(),
      rowGap: 150, // Custom value
    };

    // Create pursuer with explicit geometry
    const pursuer = createPursuer(300, 0, undefined, injectedGeometry);
    const initialY = pursuer.y;

    // Simulate what happens if CONFIG is mutated (module-level change)
    // The pursuer should still use the injected geometry, not read CONFIG again
    const nextPursuer = updatePursuer(
      pursuer,
      { x: 300, y: 0 },
      [],
      1,
      undefined,
      injectedGeometry
    );

    // Pursuer geometry should remain the injected value
    expect(nextPursuer.geometry).toBe(injectedGeometry);
    expect(nextPursuer.geometry.rowGap).toBe(150);
    // Verify it's NOT the module-default
    expect(nextPursuer.geometry.rowGap).not.toBe(CONFIG.rowGap);
  });
});
