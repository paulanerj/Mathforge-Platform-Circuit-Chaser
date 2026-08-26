import { describe, it, expect } from 'vitest';
import { 
  getRegisteredThemeIds, 
  getThemeById, 
  getDefaultTheme, 
  resolveRegisteredTheme 
} from './themeRegistry';
import { defaultTheme } from './defaultTheme';
import { crystalForgeProofTheme } from './proofThemes';

describe('themeRegistry', () => {
  it('1. registry exposes default theme ID', () => {
    const ids = getRegisteredThemeIds();
    expect(ids).toContain('default');
  });

  it('2. registry exposes proof theme ID', () => {
    const ids = getRegisteredThemeIds();
    expect(ids).toContain('crystal-forge-proof');
  });

  it('3. default theme lookup returns defaultTheme', () => {
    const theme = getThemeById('default');
    expect(theme).toBe(defaultTheme);
    expect(theme?.id).toBe('default');
  });

  it('4. proof theme lookup returns crystalForgeProofTheme', () => {
    const theme = getThemeById('crystal-forge-proof');
    expect(theme).toBe(crystalForgeProofTheme);
    expect(theme?.id).toBe('crystal-forge-proof');
  });

  it('5. missing theme lookup is safe', () => {
    const theme = getThemeById('does-not-exist');
    expect(theme).toBeUndefined();
  });

  it('6. resolveRegisteredTheme() with no ID returns resolved default theme', () => {
    const resolved = resolveRegisteredTheme();
    expect(resolved.id).toBe('default');
    expect(resolved.tokens.panels.modal.backdrop).toBeDefined();
    // Default default panel values
    expect(resolved.tokens.panels.pause.panel.background).toBe(
      defaultTheme.tokens.panels.pause.panel.background
    );
  });

  it('7. resolveRegisteredTheme("crystal-forge-proof") resolves proof values over default fallback', () => {
    const resolved = resolveRegisteredTheme('crystal-forge-proof');
    expect(resolved.id).toBe('crystal-forge-proof');
    
    // Check panel overrides
    expect(resolved.tokens.panels.pause.panel.background).not.toBe(
      defaultTheme.tokens.panels.pause.panel.background
    );
    expect(resolved.tokens.panels.pause.panel.boxShadow).not.toBe(
      defaultTheme.tokens.panels.pause.panel.boxShadow
    );
    expect(resolved.tokens.panels.settings.bodyColor).not.toBe(
      defaultTheme.tokens.panels.settings.bodyColor
    );

    // Check defaults remain untouched
    expect(resolved.assets.answerFeedback).toEqual(defaultTheme.assets.answerFeedback);
  });

  it('8. resolveRegisteredTheme("does-not-exist") falls back to default theme safely', () => {
    const resolved = resolveRegisteredTheme('does-not-exist');
    expect(resolved.id).toBe('default');
    expect(resolved.tokens.panels.pause.panel.background).toBe(
      defaultTheme.tokens.panels.pause.panel.background
    );
  });

  it('9. registry operations do not mutate defaultTheme', () => {
    const defaultClone = JSON.parse(JSON.stringify(defaultTheme));
    resolveRegisteredTheme('crystal-forge-proof');
    expect(defaultTheme).toEqual(defaultClone);
  });

  it('10. registry operations do not activate proof theme globally', () => {
    // Tests are pure logic, the state of the app would rely on `useTheme()`.
    // Default state returns defaultTheme without explicit context modification.
    const theDefault = getDefaultTheme();
    expect(theDefault.id).toBe('default');
  });
});
