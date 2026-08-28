import { describe, it, expect } from 'vitest';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformCollisionRects,
  pathIsClear,
} from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Terminal Landing Exception (GEOMETRY-01-R4)', () => {
  const mockPlatform = { id: 'p1', x: 300, y: 500, width: 104, height: 62 };
  const rects = computePlatformCollisionRects([mockPlatform], CONFIG.playerRadius);
  const pad = CONFIG.routePlatformPadding + CONFIG.playerRadius; // 40
  const landingY = mockPlatform.y - CONFIG.playerRadius - 3;
  const validOptions = {
    destinationPlatform: mockPlatform,
    landingPoint: { x: 300, y: landingY }
  };

  it('1. Rejects route passing completely through the platform body', () => {
    const route = [
      { x: 300, y: 400 },
      { x: 300, y: 600 }
    ];
    expect(pathIsClear(route, rects)).toBe(false);
    expect(pathIsClear(route, rects, validOptions)).toBe(false);
  });

  it('2. Rejects route passing through the side padded region if not destination', () => {
    const sideRoute = [
      { x: 300 - 52 - pad + 10, y: 400 },
      { x: 300 - 52 - pad + 10, y: 600 }
    ];
    expect(pathIsClear(sideRoute, rects)).toBe(false);
    expect(pathIsClear(sideRoute, rects, validOptions)).toBe(false);
  });

  it('3. Approves terminal landing approach if it perfectly matches destination and landingPoint', () => {
    const terminalApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: landingY }
    ];
    expect(pathIsClear(terminalApproach, rects, validOptions)).toBe(true);
  });

  it('4. Rejects a vertical terminal segment ending above the canonical landing point but inside padding', () => {
    const tooHighY = landingY - 2;
    const terminalApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: tooHighY }
    ];
    // This is still in top padding (463 > 460), but since it doesn't match landingY exactly, it gets rejected
    expect(pathIsClear(terminalApproach, rects, validOptions)).toBe(false);
  });

  it('5. Rejects a vertical terminal segment ending at the wrong X', () => {
    const terminalApproach = [
      { x: 310, y: mockPlatform.y - 100 },
      { x: 310, y: landingY }
    ];
    expect(pathIsClear(terminalApproach, rects, validOptions)).toBe(false);
  });

  it('6. Rejects terminal landing approach if it penetrates the actual platform body', () => {
    const tooDeepY = mockPlatform.y + 10;
    const deepApproach = [
      { x: 300, y: mockPlatform.y - 100 },
      { x: 300, y: tooDeepY }
    ];
    // We pass validOptions but since the approach penetrates the actual platform, it fails
    // Wait, if it penetrates the body, the endpoint Y is different. Let's make sure it's rejected.
    expect(pathIsClear(deepApproach, rects, validOptions)).toBe(false);
  });
});
