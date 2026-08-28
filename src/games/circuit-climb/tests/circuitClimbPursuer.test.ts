import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformBounds, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Pursuer (PURSUER-01-R1)', () => {
  const player = { x: 300, y: 0 };
  
  it('A. Pursuer starts exactly two rows below player', () => {
    const pursuer = createPursuer(player.x, player.y);
    expect(pursuer.y).toBe(player.y + 2 * CONFIG.rowGap);
  });

  it('B. Pursuer radius equals shared geometry player radius', () => {
    const pursuer = createPursuer(player.x, player.y);
    expect(pursuer.radius).toBe(CONFIG.playerRadius);
  });

  it('C. Speed is conservative and named', () => {
    const pursuer = createPursuer(player.x, player.y);
    // Verified 0.06 to 0.10 range
    expect(pursuer.speed).toBeGreaterThanOrEqual(0.06);
    expect(pursuer.speed).toBeLessThanOrEqual(0.10);
  });

  it('D. Movement distance is delta-time based', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 400; // manually set to avoid createPursuer offset
    const activePlatforms: any[] = [];
    const delta = 100;
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, activePlatforms, delta);
    
    // Unobstructed, already horizontally aligned -> pure vertical movement
    const expectedDistance = pursuer.speed * delta;
    expect(next.x).toBe(300);
    expect(next.y).toBe(400 - expectedDistance);
  });

  it('E. Pursuer uses orthogonal segments only (moves X first, then Y)', () => {
    const pursuer = createPursuer(200, 0); // not aligned with player
    pursuer.y = 400; // manually set
    const delta = 1000; // Big step to allow both X and Y movement
    const step = pursuer.speed * delta;
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, [], delta);
    
    // Distance to targetX is 100.
    // Speed is 0.08, delta 1000 => step 80. 
    // Step (80) < dx (100). Should only move X, not Y.
    expect(next.x).toBe(200 + 80);
    expect(next.y).toBe(400);

    // If delta is 2000, step is 160.
    // Should move X by 100, then Y by remaining 60.
    const next2 = updatePursuer(pursuer, { x: 300, y: 0 }, [], 2000);
    expect(next2.x).toBe(300);
    expect(next2.y).toBe(400 - 60);
  });

  it('F. Three-platform row chooses actor-safe B/C corridor', () => {
    const pursuer = createPursuer(300, 0);
    const rowY = 100;
    pursuer.y = rowY + CONFIG.rowGap; // Start safely below the row
    // Player is at x=50, meaning closest to left corridor A or B
    // We create a standard 3-platform row at y=100
    const fraction = CONFIG.columns;
    const activePlatforms = fraction.map((f, i) => ({
      id: `p${i}`, row: 1, column: i, 
      x: f * CONFIG.logicalWidth, y: rowY, 
      width: CONFIG.platformWidth, height: CONFIG.platformHeight
    }));
    
    const next = updatePursuer(pursuer, { x: 150, y: 0 }, activePlatforms, 100);
    // It should route through Corridor B (between left and center platform)
    expect(next.x).toBeLessThan(300); // Moves left towards the corridor
  });

  it('G. Row-0 single-center-platform case chooses a safe side passage', () => {
    const pursuer = createPursuer(300, 0);
    const rowY = 100;
    pursuer.y = rowY + CONFIG.rowGap; // Start safely below the row
    // Row 0 has only ONE active center platform
    const p1 = { id: 'p1', row: 0, column: 1, x: 300, y: rowY, width: CONFIG.platformWidth, height: CONFIG.platformHeight };
    const activePlatforms = [p1];
    
    // Player is straight up (x: 300). Pursuer at 300 is blocked.
    // Corridor selection should pick an exterior side passage since there are no interior ones.
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, activePlatforms, 1000);
    
    // Delta 1000 -> 80px movement. It should move left or right, not stay at 300.
    expect(next.x).not.toBe(300);
    expect(next.y).toBe(pursuer.y); // Used budget for X, didn't move Y
  });

  it('H. Pursuer cannot cross actor-expanded platform rectangle', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 100 + CONFIG.platformHeight/2 + CONFIG.playerRadius + CONFIG.routePlatformPadding + 1; // just below padding
    const activePlatforms = [{ id: 'p1', row: 1, column: 1, x: 300, y: 100, width: CONFIG.platformWidth, height: CONFIG.platformHeight }];
    
    // Force a purely vertical move with a massive step
    const next = updatePursuer(pursuer, { x: 300, y: 0 }, activePlatforms, 2000);
    
    expect(next.y).toBe(pursuer.y); 
  });

  it('I. World-edge bounds remain safe', () => {
    const pursuer = createPursuer(10, 0); // Out of bounds left
    pursuer.y = 200;
    const next = updatePursuer(pursuer, { x: 0, y: 0 }, [], 100);
    
    const minClearance = CONFIG.playerRadius + 6;
    expect(next.x).toBeGreaterThanOrEqual(minClearance);
  });

  it('J. No capture state/consequence exists', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50;
    const next = updatePursuer(pursuer, { x: 300, y: 50 }, [], 100); // Overlapping player
    expect(next.state).toBe('PURSUING'); // Just keeps pursuing, no CAUGHT state
  });
});
