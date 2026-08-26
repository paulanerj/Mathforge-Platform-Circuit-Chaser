import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Canvas Palette Safety', () => {
  it('Should not contain unresolved CSS variables in Canvas operations', () => {
    const fileContent = fs.readFileSync(path.join(process.cwd(), 'src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts'), 'utf8');
    
    // Extract COLORS object
    const colorsMatch = fileContent.match(/const COLORS = \{([\s\S]*?)\};/);
    expect(colorsMatch).toBeTruthy();
    
    const colorsText = colorsMatch![1];
    
    // Check that none of the values contain var(
    expect(colorsText).not.toContain('var(');
    
    // Check that it contains hex or rgba colors
    expect(colorsText).toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
  });
  
  it('Should have isSafeCanvasColor validator', () => {
    const fileContent = fs.readFileSync(path.join(process.cwd(), 'src/games/circuit-climb/runtime/useCircuitClimbPrototypeRuntime.ts'), 'utf8');
    expect(fileContent).toContain('function isSafeCanvasColor');
    expect(fileContent).toContain('SAFE_FALLBACK_COLOR');
  });
});
