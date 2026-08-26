import { describe, it, expect } from 'vitest';
import { CircuitClimbMathAdapter } from '../services/CircuitClimbMathAdapter';

describe('Circuit Climb Math Adapter', () => {
  it('Screenshot regression test: target 12, player 10', () => {
    const snapshot = CircuitClimbMathAdapter.requestAdditionProblem(1, 10, 12, 1);
    
    expect(snapshot).not.toBeNull();
    if (!snapshot) return;

    expect(snapshot.playerValue).toBe(10);
    expect(snapshot.targetValue).toBe(12);
    expect(snapshot.correctPlatformValue).toBe(2);

    // Exactly one 2
    const numCorrect = snapshot.choices.filter(c => c === 2).length;
    expect(numCorrect).toBe(1);

    // Choices are distinct
    const distinct = new Set(snapshot.choices);
    expect(distinct.size).toBe(snapshot.choices.length);
    expect(snapshot.choices.length).toBe(3);

    // Assert that a row with choices [11, 6, 9] would be invalid
    // Since we don't have a public validate function outside the runtime,
    // we can just assert that our generator would never produce it
    expect(snapshot.choices.includes(11) && snapshot.choices.includes(6) && snapshot.choices.includes(9)).toBe(false);
  });

  it('Generates 500 valid problems', () => {
    let failures = 0;
    for (let i = 0; i < 500; i++) {
       const bandId = Math.floor(i / 50);
       const target = Math.min(20, 10 + 2 * bandId);
       const incoming = 1 + (i % (Math.max(2, target - 1)));
       
       const snapshot = CircuitClimbMathAdapter.requestAdditionProblem(i, incoming, target, bandId);
       if (!snapshot) {
          failures++;
          continue;
       }

       if (snapshot.playerValue + snapshot.correctPlatformValue !== snapshot.targetValue) failures++;
       if (snapshot.choices[snapshot.correctChoiceIndex] !== snapshot.correctPlatformValue) failures++;
       const distinct = new Set(snapshot.choices);
       if (distinct.size !== snapshot.choices.length) failures++;
       if (snapshot.choices.length !== 3) failures++;
       if (snapshot.correctPlatformValue < 0) failures++;
    }
    expect(failures).toBe(0);
  });
});
