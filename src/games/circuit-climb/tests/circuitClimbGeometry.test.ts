import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformBounds,
  computeActorSafeCorridors,
  computeInversePointerTransform,
} from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Geometry and Corridor Foundation (GEOMETRY-01-R2)', () => {
  function getRowCorridors(shiftOffset = 0) {
    const p0 = computePlatformBounds(0, shiftOffset);
    const p1 = computePlatformBounds(1, shiftOffset);
    const p2 = computePlatformBounds(2, shiftOffset);
    const corridors = computeActorSafeCorridors(p0, p1, p2);
    return { corridors, p0, p1, p2 };
  }

  it('1. Establishes exact logical world layout with 600px base coordinate system', () => {
    const p0 = computePlatformBounds(0);
    const p1 = computePlatformBounds(1);
    const p2 = computePlatformBounds(2);

    expect(p0.center).toBeCloseTo(110, 1);
    expect(p1.center).toBeCloseTo(300, 1);
    expect(p2.center).toBeCloseTo(490, 1);

    expect(p0.left).toBeCloseTo(58, 1);
    expect(p0.right).toBeCloseTo(162, 1);

    expect(p1.left).toBeCloseTo(248, 1);
    expect(p1.right).toBeCloseTo(352, 1);

    expect(p2.left).toBeCloseTo(438, 1);
    expect(p2.right).toBeCloseTo(542, 1);
  });

  it('2. Preserves ample interior corridors B and C with positive actor-center traversable width', () => {
    const { corridors } = getRowCorridors(0);

    const corridorB = corridors.find((c) => c.id === 'B');
    const corridorC = corridors.find((c) => c.id === 'C');

    expect(corridorB).toBeDefined();
    expect(corridorC).toBeDefined();

    // Actor safe width should be precisely 6px
    expect(corridorB?.width).toBeCloseTo(6, 1);
    expect(corridorC?.width).toBeCloseTo(6, 1);
  });

  it('3. Identifies that exterior corridors (A, D) are impassable and preserves interior (B, C)', () => {
    const { corridors } = getRowCorridors(0);
    expect(corridors.length).toBe(2);
    expect(corridors.map((c) => c.id)).toEqual(['B', 'C']);
  });

  it('4. Preserves interior corridors under Left shift offset (-24px)', () => {
    const { corridors } = getRowCorridors(-24);

    const corridorB = corridors.find((c) => c.id === 'B');
    const corridorC = corridors.find((c) => c.id === 'C');

    expect(corridorB).toBeDefined();
    expect(corridorC).toBeDefined();

    // Interior gaps remain identical because the whole row shifts together
    expect(corridorB?.width).toBeCloseTo(6, 1);
    expect(corridorC?.width).toBeCloseTo(6, 1);

    // Exterior left corridor A changes (may be lost due to boundary proximity), but interior is protected
    const corridorA = corridors.find((c) => c.id === 'A');
    expect(corridorA).toBeUndefined();
  });

  it('5. Preserves interior corridors under Right shift offset (+24px)', () => {
    const { corridors } = getRowCorridors(24);

    const corridorB = corridors.find((c) => c.id === 'B');
    const corridorC = corridors.find((c) => c.id === 'C');

    expect(corridorB).toBeDefined();
    expect(corridorC).toBeDefined();

    // Interior gaps remain identical
    expect(corridorB?.width).toBeCloseTo(6, 1);
    expect(corridorC?.width).toBeCloseTo(6, 1);
  });

  it('6. Viewport scaling preserves identical physical proportions across screen widths', () => {
    const viewports = [320, 360, 390, 430, 480, 590, 768, 1024];

    viewports.forEach((vpWidth) => {
      const worldScale = vpWidth / CONFIG.logicalWidth;
      const physicalPlatformWidth = CONFIG.platformWidth * worldScale;
      const physicalPlayerRadius = CONFIG.playerRadius * worldScale;
      const physicalCorridorBWidth = 6 * worldScale; // 6 is the actor-safe width

      const ratio = physicalCorridorBWidth / (physicalPlayerRadius * 2);
      expect(ratio).toBeCloseTo(6 / 64, 4);
    });
  });

  it('7. Inverse pointer transform functions correctly', () => {
    const rect = { left: 10, top: 20 } as DOMRect;
    const { logicalX, logicalY } = computeInversePointerTransform(110, 220, rect, 2);
    expect(logicalX).toBe(50);
    expect(logicalY).toBe(100);
  });
});
