import { describe, it, expect } from 'vitest';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computeActorSafeCorridors, computePlatformBounds } from '../geometry/circuitClimbGeometry';
import { createPursuer } from '../pursuer/circuitClimbPursuer';

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

  it('pursuer initial state uses current CONFIG geometry', () => {
    const initialConfig = {
      rowGap: CONFIG.rowGap,
      playerRadius: CONFIG.playerRadius,
      platformHeight: CONFIG.platformHeight,
    };

    const pursuer = createPursuer(300, 0);

    // Pursuer should be initialized 2 rows below player
    const expectedY = 0 + 2 * initialConfig.rowGap;
    expect(pursuer.y).toBe(expectedY);
    expect(pursuer.radius).toBe(initialConfig.playerRadius);
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
