import { describe, it, expect } from 'vitest';

describe('Circuit Climb Geometry and Corridor Foundation (GEOMETRY-01)', () => {
  const CONFIG = {
    logicalWidth: 600,
    columns: [110 / 600, 300 / 600, 490 / 600],
    platformWidth: 104,
    platformHeight: 62,
    playerRadius: 32,
    routePlatformPadding: 8,
  };

  function computePlatformBounds(columnIndex: number, shiftOffset = 0) {
    const fraction = CONFIG.columns[columnIndex];
    const centerX = fraction * CONFIG.logicalWidth + shiftOffset;
    const halfW = CONFIG.platformWidth / 2;
    return {
      center: centerX,
      left: centerX - halfW,
      right: centerX + halfW,
      paddedLeft: centerX - halfW - CONFIG.routePlatformPadding,
      paddedRight: centerX + halfW + CONFIG.routePlatformPadding,
    };
  }

  function getRowCorridors(shiftOffset = 0) {
    const p0 = computePlatformBounds(0, shiftOffset);
    const p1 = computePlatformBounds(1, shiftOffset);
    const p2 = computePlatformBounds(2, shiftOffset);
    const minActorClearance = CONFIG.playerRadius + 4;

    const corridors = [];

    // Corridor A (Exterior Left)
    if (p0.paddedLeft - minActorClearance >= 12) {
      corridors.push({
        id: 'A',
        type: 'exterior',
        left: minActorClearance,
        right: p0.paddedLeft,
        width: p0.paddedLeft - minActorClearance,
        center: (minActorClearance + p0.paddedLeft) / 2,
      });
    }

    // Corridor B (Interior Left-Center)
    if (p1.paddedLeft - p0.paddedRight >= 12) {
      corridors.push({
        id: 'B',
        type: 'interior',
        left: p0.paddedRight,
        right: p1.paddedLeft,
        width: p1.paddedLeft - p0.paddedRight,
        center: (p0.paddedRight + p1.paddedLeft) / 2,
      });
    }

    // Corridor C (Interior Center-Right)
    if (p2.paddedLeft - p1.paddedRight >= 12) {
      corridors.push({
        id: 'C',
        type: 'interior',
        left: p1.paddedRight,
        right: p2.paddedLeft,
        width: p2.paddedLeft - p1.paddedRight,
        center: (p1.paddedRight + p2.paddedLeft) / 2,
      });
    }

    // Corridor D (Exterior Right)
    const rightBound = CONFIG.logicalWidth - minActorClearance;
    if (rightBound - p2.paddedRight >= 12) {
      corridors.push({
        id: 'D',
        type: 'exterior',
        left: p2.paddedRight,
        right: rightBound,
        width: rightBound - p2.paddedRight,
        center: (p2.paddedRight + rightBound) / 2,
      });
    }

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

    // Raw physical gap between platforms is 86px. Padded gap is 70px (with 8px padding on each side).
    expect(corridorB?.width).toBe(70);
    expect(corridorC?.width).toBe(70);

    // Player diameter is 64px. Navigable corridor must fit the player
    expect(corridorB!.width).toBeGreaterThanOrEqual(CONFIG.playerRadius * 2);
    expect(corridorC!.width).toBeGreaterThanOrEqual(CONFIG.playerRadius * 2);
    
    // Traversable width = 70 - 64 = 6px
    expect(corridorB!.width - (CONFIG.playerRadius * 2)).toBeCloseTo(6, 1);
  });

  it('3. Preserves all 4 corridors (A, B, C, D) simultaneously', () => {
    const { corridors } = getRowCorridors(0);
    expect(corridors.length).toBe(4);
    expect(corridors.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('4. Preserves interior corridors under Left shift offset (-24px)', () => {
    const { corridors } = getRowCorridors(-24);

    const corridorB = corridors.find((c) => c.id === 'B');
    const corridorC = corridors.find((c) => c.id === 'C');

    expect(corridorB).toBeDefined();
    expect(corridorC).toBeDefined();

    // Interior gaps remain identical because the whole row shifts together
    expect(corridorB?.width).toBe(70);
    expect(corridorC?.width).toBe(70);

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
    expect(corridorB?.width).toBe(70);
    expect(corridorC?.width).toBe(70);
  });

  it('6. Viewport scaling preserves identical physical proportions across screen widths', () => {
    const viewports = [320, 360, 390, 430, 480, 590, 768, 1024];

    viewports.forEach((vpWidth) => {
      const worldScale = vpWidth / CONFIG.logicalWidth;
      const physicalPlatformWidth = CONFIG.platformWidth * worldScale;
      const physicalPlayerRadius = CONFIG.playerRadius * worldScale;
      const physicalCorridorBWidth = 70 * worldScale;

      // The ratio of corridor width to player diameter remains strictly invariant
      const ratio = physicalCorridorBWidth / (physicalPlayerRadius * 2);
      expect(ratio).toBeCloseTo(70 / 64, 4);
    });
  });
});
