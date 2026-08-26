import { describe, it, expect } from 'vitest';
import { resolveTheme } from './resolveTheme';
import { defaultTheme } from './defaultTheme';
import { PartialMathForgeTheme } from './themeTypes';
import { crystalForgeProofTheme } from './proofThemes';

describe('resolveTheme', () => {
  it('1. resolveTheme() with no argument returns complete default theme', () => {
    const result = resolveTheme();
    expect(result.id).toBe('default');
    expect(result.name).toBe('MathForge Default');
    expect(result.tokens.shell.scenes.sky.backgroundTop).toBeDefined();
    expect(result.tokens.startScreen.mainPanel.background).toBeDefined();
    expect(result.assets.answerFeedback.correctSurface).toBeDefined();
    // It can be null according to types, but defined
    expect(Array.isArray(result.preload.preloadCriticalAssetKeys)).toBe(true);
    expect(Array.isArray(result.preload.lazyAssetKeys)).toBe(true);
    expect(result).toEqual(defaultTheme);
  });

  it('2. Partial theme metadata overrides identity fields only', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-id',
      name: 'Test Name',
      version: '2.0.0',
      description: 'Test Description'
    };
    const result = resolveTheme(partial);
    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Test Name');
    expect(result.version).toBe('2.0.0');
    expect(result.description).toBe('Test Description');
    expect(result.tokens).toEqual(defaultTheme.tokens);
    expect(result.assets).toEqual(defaultTheme.assets);
  });

  it('3. Partial shell scene override preserves sibling scene tokens', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-2',
      name: 'Test 2',
      version: '1',
      tokens: {
        shell: {
          scenes: {
            sky: {
              backgroundTop: 'custom-top'
            }
          }
        }
      }
    };
    const result = resolveTheme(partial);
    expect(result.tokens.shell.scenes.sky.backgroundTop).toBe('custom-top');
    expect(result.tokens.shell.scenes.sky.backgroundBottom).toBe(defaultTheme.tokens.shell.scenes.sky.backgroundBottom);
    expect(result.tokens.shell.scenes.sky.cloud1Fill).toBe(defaultTheme.tokens.shell.scenes.sky.cloud1Fill);
    expect(result.tokens.shell.scenes.sky.cloud2Fill).toBe(defaultTheme.tokens.shell.scenes.sky.cloud2Fill);
    expect(result.tokens.shell.scenes.sunset).toEqual(defaultTheme.tokens.shell.scenes.sunset);
    expect(result.tokens.shell.scenes.night).toEqual(defaultTheme.tokens.shell.scenes.night);
    expect(result.tokens.shell.scenes.space).toEqual(defaultTheme.tokens.shell.scenes.space);
  });

  it('4. Partial startScreen override preserves sibling startScreen tokens', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-3',
      name: 'Test 3',
      version: '1',
      tokens: {
        startScreen: {
          splashCard: {
            background: 'custom-background'
          }
        }
      }
    };
    const result = resolveTheme(partial);
    expect(result.tokens.startScreen.splashCard.background).toBe('custom-background');
    expect(result.tokens.startScreen.splashCard.boxShadow).toBe(defaultTheme.tokens.startScreen.splashCard.boxShadow);
    expect(result.tokens.startScreen.title).toEqual(defaultTheme.tokens.startScreen.title);
    expect(result.tokens.startScreen.mainPanel).toEqual(defaultTheme.tokens.startScreen.mainPanel);
  });

  it('5. Partial answerFeedback asset override preserves sibling feedback assets', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-4',
      name: 'Test 4',
      version: '1',
      assets: {
        answerFeedback: {
          correctSurface: 'custom-correct'
        }
      }
    };
    const result = resolveTheme(partial);
    expect(result.assets.answerFeedback.correctSurface).toBe('custom-correct');
    expect(result.assets.answerFeedback.incorrectSurface).toBe(defaultTheme.assets.answerFeedback.incorrectSurface);
    expect(result.assets.answerFeedback.failSafeRequiredSurface).toBe(defaultTheme.assets.answerFeedback.failSafeRequiredSurface);
    expect(result.assets.answerFeedback.failSafeDisabledSurface).toBe(defaultTheme.assets.answerFeedback.failSafeDisabledSurface);
  });

  it('6. default resolved theme includes complete panel tokens', () => {
    const result = resolveTheme();
    expect(result.tokens.panels.base.background).toBeDefined();
    expect(result.tokens.panels.modal.backdrop).toBeDefined();
    expect(result.tokens.panels.help.panel.background).toBeDefined();
    expect(result.tokens.panels.settings.panel.borderColor).toBeDefined();
    expect(result.tokens.panels.pause.panel.boxShadow).toBeDefined();
  });

  it('6a. partial panel override preserves sibling fields', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-panel-1',
      name: 'Test Panel 1',
      version: '1',
      tokens: {
        panels: {
          help: {
            panel: {
              background: 'custom-help-bg'
            }
          }
        }
      }
    };
    const result = resolveTheme(partial);
    expect(result.tokens.panels.help.panel.background).toBe('custom-help-bg');
    expect(result.tokens.panels.help.panel.borderColor).toBe(defaultTheme.tokens.panels.help.panel.borderColor);
    expect(result.tokens.panels.help.panel.boxShadow).toBe(defaultTheme.tokens.panels.help.panel.boxShadow);
    expect(result.tokens.panels.settings).toEqual(defaultTheme.tokens.panels.settings);
    expect(result.tokens.panels.modal).toEqual(defaultTheme.tokens.panels.modal);
    expect(result.tokens.panels.pause).toEqual(defaultTheme.tokens.panels.pause);
  });

  it('6b. partial modal backdrop override preserves nested panel', () => {
    const partial: PartialMathForgeTheme = {
      id: 'test-panel-2',
      name: 'Test Panel 2',
      version: '1',
      tokens: {
        panels: {
          modal: {
            backdrop: 'custom-modal-backdrop'
          }
        }
      }
    };
    const result = resolveTheme(partial);
    expect(result.tokens.panels.modal.backdrop).toBe('custom-modal-backdrop');
    expect(result.tokens.panels.modal.panel.background).toBe(defaultTheme.tokens.panels.modal.panel.background);
    expect(result.tokens.panels.modal.panel.borderColor).toBe(defaultTheme.tokens.panels.modal.panel.borderColor);
  });

  it('7. resolveTheme must not mutate defaultTheme', () => {
    const defaultClone = JSON.parse(JSON.stringify(defaultTheme));
    const partial: PartialMathForgeTheme = {
      id: 'mut-test',
      name: 'Mut Test',
      version: '1',
      tokens: {
        shell: {
          scenes: {
            sky: {
              backgroundTop: 'mutated'
            }
          }
        }
      }
    };
    resolveTheme(partial);
    expect(defaultTheme).toEqual(defaultClone);
  });

  it('8. concealed answer visuals are not present as formal theme tokens', () => {
    const result = resolveTheme();
    // Since answerHidden / answerDarkModeConcealed are not typed, we check the object
    expect((result.tokens as any).answerHidden).toBeUndefined();
    expect((result.tokens as any).answerDarkModeConcealed).toBeUndefined();
    expect((result.assets.answerFeedback as any).answerHidden).toBeUndefined();
    expect((result.assets.answerFeedback as any).answerDarkModeConcealed).toBeUndefined();
  });

  describe('Crystal Forge Proof Theme', () => {
    it('10. resolveTheme(crystalForgeProofTheme) returns proof identity metadata', () => {
      const result = resolveTheme(crystalForgeProofTheme);
      expect(result.id).toBe('crystal-forge-proof');
      expect(result.name).toBe('Crystal Forge Proof');
      expect(result.version).toBe('0.1.0');
    });

    it('11. proof theme overrides only allowed non-gameplay shell branches', () => {
      const result = resolveTheme(crystalForgeProofTheme);
      
      // Values can differ
      expect(result.tokens.panels.pause.panel.background).not.toBe(defaultTheme.tokens.panels.pause.panel.background);
      expect(result.tokens.panels.help.panel.background).not.toBe(defaultTheme.tokens.panels.help.panel.background);
      expect(result.tokens.panels.settings.panel.background).not.toBe(defaultTheme.tokens.panels.settings.panel.background);
      
      // Unallowed overrides remain identical
      expect(result.assets.answerFeedback).toEqual(defaultTheme.assets.answerFeedback);
      expect(result.tokens.board).toEqual(defaultTheme.tokens.board);
      expect(result.tokens.controls).toEqual(defaultTheme.tokens.controls);
    });

    it('12. proof theme does not define concealed answer visual keys', () => {
      const result = resolveTheme(crystalForgeProofTheme);
      expect((result.tokens as any).answerHidden).toBeUndefined();
      expect((result.tokens as any).answerDarkModeConcealed).toBeUndefined();
    });

    it('13. defaultTheme is not mutated after resolving proof theme', () => {
      const defaultClone = JSON.parse(JSON.stringify(defaultTheme));
      resolveTheme(crystalForgeProofTheme);
      expect(defaultTheme).toEqual(defaultClone);
    });

    it('14. proof theme defines no asset paths', () => {
      const result = resolveTheme(crystalForgeProofTheme);
      // It falls back to default assets, so we ensure no NEW asset paths were introduced directly by the proof theme object itself
      expect(crystalForgeProofTheme.assets).toBeUndefined();
      // the resolved assets will just equal defaultTheme assets
      expect(result.assets).toEqual(defaultTheme.assets);
      expect(result.preload).toEqual(defaultTheme.preload);
    });
  });
});
