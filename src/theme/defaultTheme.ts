/**
 * Default Theme Implementation
 * 
 * NOTE: Current CSS remains authoritative until individual surfaces are migrated in later phases.
 * Default-theme values are scaffolding for controlled future adoption.
 * No protected gameplay behavior is owned by this theme object.
 */

import { DefaultMathForgeTheme } from './themeTypes';

export const defaultTheme: DefaultMathForgeTheme = {
  id: 'default',
  name: 'MathForge Default',
  version: '1.0.0',
  description: 'The standard MathForge presentation. Baseline CSS serves as fallback.',
  tokens: {
    shell: {
      scenes: {
        sky: {
          backgroundTop: 'var(--sa-scene-sky-top, #e0f2fe)', // Verified in index.css
          backgroundBottom: 'var(--sa-scene-sky-bot, #ffffff)', // Verified in index.css
          cloud1Fill: 'var(--sa-scene-sky-cloud1)',
          cloud2Fill: 'var(--sa-scene-sky-cloud2)'
        },
        sunset: {
          backgroundTop: 'var(--sa-scene-sunset-top)',
          backgroundBottom: 'var(--sa-scene-sunset-bot)',
          cloudFill: 'var(--sa-scene-sunset-cloud)'
        },
        night: {
          backgroundTop: 'var(--sa-scene-night-top)',
          backgroundBottom: 'var(--sa-scene-night-bot)',
          star1Fill: 'var(--sa-scene-night-star1)',
          star2Fill: 'var(--sa-scene-night-star2)'
        },
        space: {
          backgroundTop: 'var(--sa-scene-space-top)',
          backgroundBottom: 'var(--sa-scene-space-bot)',
          star1Fill: 'var(--sa-scene-space-star1)',
          star2Fill: 'var(--sa-scene-space-star2)',
          star3Fill: 'var(--sa-scene-space-star3)',
          nebulaFill: 'var(--sa-scene-space-nebula)',
          star1Shadow: '0 0 8px 2px var(--sa-scene-space-star1)',
          star2Shadow: '0 0 6px 1px var(--sa-scene-space-star2)'
        }
      }
    },
    startScreen: {
      mainPanel: {
        background: 'radial-gradient(circle at center, rgba(37,99,235,0.08), transparent 60%), #f8fafc', // Equivalent to .start-bg CSS
      },
      title: {
        textShadow: '0 8px 24px rgba(0,0,0,0.18)'
      },
      splashCard: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        variants: {
          resumeBackground: '#059669',
          resumeBorder: '#10b981',
          resumeText: '#ffffff',

          primaryActiveBackground: '#eff6ff',
          primaryActiveBorder: '#bfdbfe',
          primaryActiveText: '#1e3a8a',

          primaryNewBackground: '#2563eb',
          primaryNewBorder: '#3b82f6',
          primaryNewText: '#ffffff',

          secondaryBackground: '#f8fafc',
          secondaryBorder: '#e2e8f0',
          secondaryText: '#1e293b',

          tertiaryBackground: '#ffffff',
          tertiaryBorder: '#e2e8f0',
          tertiaryText: '#1e293b'
        }
      }
    },
    panels: {
      base: {
        background: 'var(--sa-ui-panel, #ffffff)',
        borderColor: 'var(--sa-ui-border, #cbd5e1)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
      },
      modal: {
        backdrop: 'rgba(15, 23, 42, 0.45)', // from bg-slate-950/70 or similar
        panel: {
          background: 'var(--sa-ui-bg, #ffffff)',
          borderColor: 'var(--sa-ui-border, #cbd5e1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        },
        titleColor: 'var(--sa-ui-text, #1e293b)',
        bodyColor: 'var(--sa-text-secondary, #475569)'
      },
      help: {
        backdrop: 'rgba(2, 6, 23, 0.7)',
        panel: {
          background: '#ffffff',
          borderColor: '#cbd5e1',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' // equivalent to shadow-2xl
        },
        titleColor: '#0f172a',
        bodyColor: '#475569',
        headerDividerColor: '#e2e8f0',
        footerDividerColor: '#f1f5f9',
        tabContainerBackground: '#f1f5f9',
        sectionTitleColor: '#1e293b',
        bodyTextColor: '#475569',
        mutedTextColor: '#64748b'
      },
      settings: {
        backdrop: 'var(--color-overlay-scrim, rgba(15, 23, 42, 0.45))',
        panel: {
          background: 'var(--sa-ui-bg, #ffffff)',
          borderColor: 'var(--sa-ui-border, #cbd5e1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        },
        titleColor: 'var(--sa-ui-text, #1e293b)',
        bodyColor: 'var(--sa-text-secondary, #475569)',
        sectionTitleColor: 'var(--sa-ui-text-muted)',
        sectionDividerColor: 'var(--sa-ui-border)',
        passiveSectionBackground: 'var(--sa-ui-bg)',
        mutedTextColor: 'var(--sa-ui-text-muted)'
      },
      pause: {
        backdrop: 'var(--color-overlay-scrim, rgba(15, 23, 42, 0.45))',
        panel: {
          background: '#ffffff',
          borderColor: '#e2e8f0', // slate-200
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        },
        titleColor: '#1e293b', // slate-800
        bodyColor: '#1e293b',
        buttons: {
          resumeButtonBackground: '#10b981',
          restartButtonBackground: '#3b82f6',
          lessonPlanButtonBackground: '#a855f7',
          exitButtonBackground: '#f43f5e',
          buttonTextColor: '#ffffff'
        }
      }
    },
    typography: {},
    controls: {},
    board: {},
    progressStatus: {},
    feedbackStates: {
      // Themeable Later, Under Guarded Presentation Rules
      // These are scaffold values, not yet authoritative.
      answerCorrect: 'var(--sa-success, #4ade80)',
      answerIncorrect: 'var(--sa-error, #fb7185)',
      answerFailSafeRequired: '#bbf7d0', // Scaffold placeholder
      answerFailSafeDisabled: 'var(--sa-ui-border, #cbd5e1)', // Scaffold placeholder
      controlLocked: 'var(--sa-ui-border, #cbd5e1)', // Scaffold placeholder
      statusWarning: 'var(--sa-warning, #facc15)',
      statusComplete: 'var(--sa-primary, #38bdf8)'
    },
    modePresentation: {},
    effects: {}
  },
  assets: {
    shell: {},
    menu: {},
    gameplayHeaderBoard: {},
    centerPrompt: {},
    modifiers: {},
    answerFeedback: {
      correctSurface: null,
      incorrectSurface: null,
      failSafeRequiredSurface: null,
      failSafeDisabledSurface: null
    },
    controlsOverlays: {},
    effectsDecorations: {}
  },
  preload: {
    preloadCriticalAssetKeys: [],
    lazyAssetKeys: []
  }
};

