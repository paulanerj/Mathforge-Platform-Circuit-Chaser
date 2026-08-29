import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer, PURSUER_CAPTURE_DISTANCE } from '../pursuer/circuitClimbPursuer';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformBounds, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';

describe('Circuit Climb Pursuer (PURSUER-01-R2)', () => {
  const player = { x: 300, y: 0 };
  
  it('A. Pursuer starts exactly two rows below player', () => {
    const pursuer = createPursuer(player.x, player.y);
    expect(pursuer.y).toBe(player.y + 2 * CONFIG.rowGap);
  });

  it('B. row-0 center obstacle causes lateral routing', () => {
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

  it('C. player left of pursuer biases route left', () => {
    const pursuer = createPursuer(300, 0);
    const rowY = 100;
    pursuer.y = rowY + CONFIG.rowGap;
    
    const fraction = CONFIG.columns;
    const activePlatforms = fraction.map((f, i) => ({
      id: `p${i}`, row: 1, column: i, 
      x: f * CONFIG.logicalWidth, y: rowY, 
      width: CONFIG.platformWidth, height: CONFIG.platformHeight
    }));
    
    // Player is at x=100 (left)
    const next = updatePursuer(pursuer, { x: 100, y: 0 }, activePlatforms, 1000);
    expect(next.x).toBeLessThan(300); // Moves left
  });

  it('D. player right of pursuer biases route right', () => {
    const pursuer = createPursuer(300, 0);
    const rowY = 100;
    pursuer.y = rowY + CONFIG.rowGap;
    
    const fraction = CONFIG.columns;
    const activePlatforms = fraction.map((f, i) => ({
      id: `p${i}`, row: 1, column: i, 
      x: f * CONFIG.logicalWidth, y: rowY, 
      width: CONFIG.platformWidth, height: CONFIG.platformHeight
    }));
    
    // Player is at x=500 (right)
    const next = updatePursuer(pursuer, { x: 500, y: 0 }, activePlatforms, 1000);
    expect(next.x).toBeGreaterThan(300); // Moves right
  });

  it('E. after clearing one row, changing player.x changes the next corridor choice', () => {
    // Setup 2 rows of obstacles
    const row0Y = 300;
    const row1Y = 100; // Above row 0
    
    const fraction = CONFIG.columns;
    const activePlatforms = [
      ...fraction.map((f, i) => ({
        id: `p0_${i}`, row: 0, column: i, 
        x: f * CONFIG.logicalWidth, y: row0Y, 
        width: CONFIG.platformWidth, height: CONFIG.platformHeight
      })),
      ...fraction.map((f, i) => ({
        id: `p1_${i}`, row: 1, column: i, 
        x: f * CONFIG.logicalWidth, y: row1Y, 
        width: CONFIG.platformWidth, height: CONFIG.platformHeight
      }))
    ];

    // Pursuer has cleared row 0, and is hovering in the clear space between row 0 and row 1.
    // y = 210 is safely above row 0 collision top (260), and safely below row 1 collision bottom (202).
    const pursuer = createPursuer(300, 0);
    pursuer.y = 210; 

    // Player is above row 1, at x=100 (left)
    const player1 = { x: 100, y: 0 };
    const next1 = updatePursuer(pursuer, player1, activePlatforms, 1000);
    expect(next1.x).toBeLessThan(300); // Routes left towards player

    // Reset pursuer position
    pursuer.x = 300;
    pursuer.y = 210;

    // Player changes column! Now above row 1, at x=500 (right)
    const player2 = { x: 500, y: 0 };
    const next2 = updatePursuer(pursuer, player2, activePlatforms, 1000);
    expect(next2.x).toBeGreaterThan(300); // Routes right towards player
  });

  it('F. Pursuer uses orthogonal segments only (moves X first, then Y)', () => {
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

  it('J. Overlapping the player captures it', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50;
    const next = updatePursuer(pursuer, { x: 300, y: 50 }, [], 100); // Overlapping player
    expect(next.state).toBe('CAUGHT');
  });

  it('K. A pursuer further away than the capture distance keeps pursuing', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50 + PURSUER_CAPTURE_DISTANCE + 20;
    const next = updatePursuer(pursuer, { x: 300, y: 50 }, [], 1); // tiny step, stays clear
    expect(next.state).toBe('PURSUING');
  });

  it('L. A captured pursuer stops moving', () => {
    const pursuer = createPursuer(300, 0);
    pursuer.y = 50;
    const caught = updatePursuer(pursuer, { x: 300, y: 50 }, [], 100);
    expect(caught.state).toBe('CAUGHT');

    const after = updatePursuer(caught, { x: 100, y: -400 }, [], 1000);
    expect(after.x).toBe(caught.x);
    expect(after.y).toBe(caught.y);
    expect(after.state).toBe('CAUGHT');
  });
});
