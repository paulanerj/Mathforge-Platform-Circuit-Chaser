import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformBounds, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Pursuer (PURSUER-01)', () => {
  const player = { x: 300, y: 0 };
  
  it('1. Pursuer starts approximately two rows below player and has comparable radius', () => {
    const pursuer = createPursuer(player.x, player.y);
    // Row 0 is at y=0, row gap is 205. Two rows below means positive y.
    expect(pursuer.y).toBe(player.y + 2 * CONFIG.rowGap);
    expect(pursuer.radius).toBe(CONFIG.playerRadius);
    expect(pursuer.state).toBe('PURSUING');
  });

  it('2. Pursuer movement is delta-time based', () => {
    const pursuer = createPursuer(300, 400);
    const activePlatforms = [];
    const delta1 = 16;
    const next1 = updatePursuer(pursuer, { x: 300, y: 0 }, activePlatforms, delta1);
    
    // Should move upwards directly if no platforms
    expect(next1.y).toBe(pursuer.y - pursuer.speed * delta1);
    expect(next1.x).toBe(300); // X already matches
  });

  it('3. Pursuer respects actor-expanded platform obstacles and shared geometry', () => {
    // Put a platform right in front of the pursuer
    const pursuer = createPursuer(300, -160); // y = -160 + 410 = 250
    const activePlatforms = [{ id: 'p1', row: 1, column: 1, x: 300, y: 100, width: 104, height: 62 }];
    
    // With step large enough to hit the platform padding
    const delta = 1000; // Big step -> 350 pixels. 250 - 350 = -100 (crosses 100)
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, activePlatforms, delta);
    
    // The straight path is blocked.
    expect(next.y).not.toBeLessThan(100 + 31 + 40); 
    // It should have moved X away from 300 via fallback
    expect(next.x).not.toBe(300);
  });

  it('4. Pursuer remains inside logical world edge constraints', () => {
    const pursuer = createPursuer(10, 200); // very close to left edge
    const activePlatforms = [];
    // Player is at x=0
    const next = updatePursuer(pursuer, { x: 0, y: 0 }, activePlatforms, 1000);
    const minClearance = CONFIG.playerRadius + 6;
    expect(next.x).toBeGreaterThanOrEqual(minClearance);
  });

  it('5. Pause prevents movement (simulated by state not being PURSUING)', () => {
    const pursuer = createPursuer(300, 400);
    pursuer.state = 'PAUSED' as any;
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, [], 16);
    expect(next.x).toBe(pursuer.x);
    expect(next.y).toBe(pursuer.y);
  });

  it('6. No capture logic is present in movement update', () => {
    const pursuer = createPursuer(300, 50);
    const next = updatePursuer(pursuer, { x: 300, y: 50 }, [], 16);
    // Just moves, doesn't return any 'CAUGHT' state
    expect(next.state).toBe('PURSUING');
  });
});
