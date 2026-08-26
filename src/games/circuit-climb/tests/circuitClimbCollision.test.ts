import { describe, it, expect } from 'vitest';

function sweptCollision(px0: number, py0: number, px1: number, py1: number, bx0: number, by0: number, bx1: number, by1: number, r: number) {
    const vx = (bx1 - bx0) - (px1 - px0);
    const vy = (by1 - by0) - (py1 - py0);
    const sx = bx0 - px0;
    const sy = by0 - py0;
    
    const a = vx*vx + vy*vy;
    const b = 2 * (sx*vx + sy*vy);
    const c = sx*sx + sy*sy - r*r;
    
    if (c <= 0) return 0; // already intersecting
    if (a === 0) return -1; // no relative movement
    
    const disc = b*b - 4*a*c;
    if (disc < 0) return -1;
    
    const t = (-b - Math.sqrt(disc)) / (2*a);
    if (t >= 0 && t <= 1) return t;
    return -1;
}

describe('Circuit Climb Swept Collision', () => {
    const r = 62; // 32 + 30

    it('1. Exact tangent contact captures', () => {
        // player at 0,0 moving to 100,0
        // bot at 162,0 stationary
        const t = sweptCollision(0, 0, 100, 0, 162, 0, 162, 0, r);
        expect(t).toBe(1.0); // Exact hit at end of frame
    });

    it('2. A tiny positive gap does not capture', () => {
        const t = sweptCollision(0, 0, 99.9, 0, 162, 0, 162, 0, r);
        expect(t).toBe(-1);
    });

    it('3. Deep overlap captures and clamps to first contact', () => {
        // Player moves very fast through bot
        const t = sweptCollision(0, 0, 200, 0, 162, 0, 162, 0, r);
        expect(t).toBe(0.5); // Should hit exactly halfway through movement
    });

    it('4. Existing overlap captures before movement', () => {
        const t = sweptCollision(0, 0, 100, 0, 50, 0, 50, 0, r);
        expect(t).toBe(0);
    });
    
    it('5. Diagonal first touch captures', () => {
        // player stationary at origin
        // bot moves diagonally towards it
        const dist = 100;
        const bx0 = dist;
        const by0 = dist;
        const bx1 = 0;
        const by1 = 0;
        const t = sweptCollision(0, 0, 0, 0, bx0, by0, bx1, by1, r);
        // initial distance is 141.4. r is 62.
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
    });

    it('6. Diagonal near miss does not capture', () => {
        const dist = 100;
        const t = sweptCollision(0, 0, 0, 0, dist, dist, dist, -dist, r);
        expect(t).toBe(-1); // passes by at distance 100 (which is > 62)
    });
});
