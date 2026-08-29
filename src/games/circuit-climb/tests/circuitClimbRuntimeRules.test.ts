import { describe, it, expect } from 'vitest';
import {
  parseStoredNumber,
  computeKeepBehindRow,
  pursuerRowFromWorldY,
} from '../runtime/circuitClimbRuntimeRules';
import { CIRCUIT_CLIMB_GEOMETRY as CONFIG } from '../geometry/circuitClimbGeometry';

describe('LOCKED: an unset setting is not the number zero', () => {
  it('treats a missing key as no value, not as 0', () => {
    // The exact defect: Number(null) === 0 and Number.isFinite(0) === true, so a
    // naive guard accepted "never stored" as "stored zero".
    expect(Number.isFinite(Number(null))).toBe(true); // the trap, still true
    expect(parseStoredNumber(null)).toBe(null);       // and closed
    expect(parseStoredNumber(undefined)).toBe(null);
    expect(parseStoredNumber('')).toBe(null);
    expect(parseStoredNumber('   ')).toBe(null);
  });

  it('rejects values that are not numbers', () => {
    expect(parseStoredNumber('abc')).toBe(null);
    expect(parseStoredNumber('NaN')).toBe(null);
  });

  it('reads real stored values, zero included', () => {
    expect(parseStoredNumber('0')).toBe(0);
    expect(parseStoredNumber('100')).toBe(100);
    expect(parseStoredNumber('-12.5')).toBe(-12.5);
  });

  it('a fresh install lands on the documented defaults', () => {
    const viewScale = parseStoredNumber(null);
    const routeTurns = parseStoredNumber(null);
    expect(viewScale === null ? 100 : viewScale).toBe(100);
    expect(routeTurns === null ? 8 : routeTurns).toBe(8);
  });
});

describe('LOCKED: world culling actually culls', () => {
  it('the pursuer row is negative while it is still below world row 0', () => {
    // Clamping this at 0 is what pinned keepBehind at -1 and disabled culling.
    expect(pursuerRowFromWorldY(2 * CONFIG.rowGap, CONFIG.rowGap)).toBeLessThan(0);
    expect(pursuerRowFromWorldY(0, CONFIG.rowGap)).toBe(0);
    expect(pursuerRowFromWorldY(-3 * CONFIG.rowGap, CONFIG.rowGap)).toBe(3);
  });

  it('keeps rows behind the player without keeping the whole world', () => {
    // Player well up the tower, pursuer trailing: the cut follows them up.
    expect(computeKeepBehindRow(10, 8)).toBe(7);
    expect(computeKeepBehindRow(10, 20)).toBe(8);
  });

  it('the cut advances as the player climbs, instead of sticking below zero', () => {
    const early = computeKeepBehindRow(3, pursuerRowFromWorldY(-1 * CONFIG.rowGap, CONFIG.rowGap));
    const later = computeKeepBehindRow(12, pursuerRowFromWorldY(-10 * CONFIG.rowGap, CONFIG.rowGap));
    expect(later).toBeGreaterThan(early);
  });

  it('never cuts above the player, whatever the pursuer is doing', () => {
    for (let playerRow = 0; playerRow < 40; playerRow += 1) {
      for (let pursuerRow = -4; pursuerRow < 44; pursuerRow += 1) {
        expect(computeKeepBehindRow(playerRow, pursuerRow)).toBeLessThan(playerRow);
      }
    }
  });

  it('guards a degenerate rowGap rather than returning Infinity', () => {
    expect(pursuerRowFromWorldY(100, 0)).toBe(0);
    expect(pursuerRowFromWorldY(100, Number.NaN)).toBe(0);
  });
});
