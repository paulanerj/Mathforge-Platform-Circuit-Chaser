import { describe, it, expect } from 'vitest';
import { CircuitClimbMathAdapter } from '../services/CircuitClimbMathAdapter';

describe('Circuit Climb Sequence Stress Test', () => {
  it('Simulates 15 runs of 30 rows each', () => {
    let failures = 0;
    
    for (let run = 0; run < 15; run++) {
      let incoming = 4;
      
      for (let row = 1; row <= 30; row++) {
        const bandId = Math.floor(Math.max(0, row - 1) / 6);
        const maxTarget = Math.min(20, 10 + 2 * bandId);
        
        const snapshot = CircuitClimbMathAdapter.requestAdditionProblem(row, incoming, maxTarget, bandId);
        if (!snapshot) {
           failures++;
           break;
        }

        // Assertions
        if (snapshot.playerValue !== incoming) failures++;
        if (snapshot.targetValue <= incoming) failures++;
        if (snapshot.correctPlatformValue !== snapshot.targetValue - snapshot.playerValue) failures++;
        if (snapshot.choices[snapshot.correctChoiceIndex] !== snapshot.correctPlatformValue) failures++;
        if (snapshot.choices.length !== 3) failures++;

        // Simulate jumping onto correct platform
        incoming = 1 + ((run + row) % (Math.max(2, maxTarget - 1))); // random logic
      }
    }
    
    expect(failures).toBe(0);
  });
});
