import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformCollisionRects,
  pathIsClear,
} from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Terminal Landing Exception (GEOMETRY-01-R3)', () => {
  const mockPlatform = { id: 'p1', x: 300, y: 500, width: 104, height: 62 };
  const rects = computePlatformCollisionRects([mockPlatform], CONFIG.playerRadius);
  const pad = CONFIG.routePlatformPadding + CONFIG.playerRadius; // 40

  it('1. Rejects route passing completely through the platform body', () => {
    // A route that passes straight through from top to bottom
    const route = [
      { x: 300, y: 400 },
      { x: 300, y: 600 }
    ];
    // With or without destination exception, going straight through fails
    expect(pathIsClear(route, rects)).toBe(false);
    expect(pathIsClear(route, rects, mockPlatform)).toBe(false);
  });

  it('2. Rejects route passing through the side padded region if not destination', () => {
    const sideRoute = [
      { x: 300 - 52 - pad + 10, y: 400 },
      { x: 300 - 52 - pad + 10, y: 600 }
    ];
    expect(pathIsClear(sideRoute, rects)).toBe(false);
    expect(pathIsClear(sideRoute, rects, mockPlatform)).toBe(false);
  });

  it('3. Rejects terminal landing approach if it is NOT the destination platform', () => {
    // Approach from apex to landing point
    const landingY = mockPlatform.y - CONFIG.playerRadius - 3;
    const terminalApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: landingY }
    ];
    // Not destination -> fails
    expect(pathIsClear(terminalApproach, rects)).toBe(false);
  });

  it('4. Approves terminal landing approach if it IS the destination platform', () => {
    const landingY = mockPlatform.y - CONFIG.playerRadius - 3;
    const terminalApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: landingY }
    ];
    // Destination exception allows entering the top padding!
    expect(pathIsClear(terminalApproach, rects, mockPlatform)).toBe(true);
  });

  it('5. Rejects terminal landing approach if it penetrates the actual platform body', () => {
    // Approach goes too far down, entering the actual platform
    const tooDeepY = mockPlatform.y + 10;
    const deepApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: tooDeepY }
    ];
    // Destination exception does NOT protect the body!
    expect(pathIsClear(deepApproach, rects, mockPlatform)).toBe(false);
  });
});
