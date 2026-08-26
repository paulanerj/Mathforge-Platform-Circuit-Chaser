/**
 * Theme Resolution
 * Pure, side-effect-free resolution utility capable of returning a complete ResolvedMathForgeTheme.
 * 
 * NOTE: Protected answer-state semantics originate from gameplay state. Future safe visual 
 * rendering constraints will be enforced at the presentation boundary during the later 
 * protected-surface migration phase, not inside gameplay logic and not during SKIN-3A-R.
 * 
 * Concealed answer-element visuals are intentionally absent from the theme schema.
 */

import { DefaultMathForgeTheme, PartialMathForgeTheme, ResolvedMathForgeTheme } from './themeTypes';
import { defaultTheme } from './defaultTheme';

export function resolveTheme(partialTheme?: PartialMathForgeTheme): ResolvedMathForgeTheme {
  if (!partialTheme) {
    return { ...defaultTheme };
  }

  // Safely merge future partial override, without adding visible behavior or uncontrolled complexity.
  // Must not manipulate DOM, CSS, classes, assets, or gameplay state.
  return {
    ...defaultTheme,
    ...partialTheme,
    // ID and Name come from partial if provided
    id: partialTheme.id || defaultTheme.id,
    name: partialTheme.name || defaultTheme.name,
    version: partialTheme.version || defaultTheme.version,
    description: partialTheme.description || defaultTheme.description,
    tokens: {
      ...defaultTheme.tokens,
      ...(partialTheme.tokens || {}),
      shell: {
        ...defaultTheme.tokens.shell,
        scenes: {
          ...defaultTheme.tokens.shell.scenes,
          ...(partialTheme.tokens?.shell?.scenes || {}),
          sky: {
            ...defaultTheme.tokens.shell.scenes.sky,
            ...(partialTheme.tokens?.shell?.scenes?.sky || {})
          },
          sunset: {
            ...defaultTheme.tokens.shell.scenes.sunset,
            ...(partialTheme.tokens?.shell?.scenes?.sunset || {})
          },
          night: {
            ...defaultTheme.tokens.shell.scenes.night,
            ...(partialTheme.tokens?.shell?.scenes?.night || {})
          },
          space: {
            ...defaultTheme.tokens.shell.scenes.space,
            ...(partialTheme.tokens?.shell?.scenes?.space || {})
          }
        }
      },
      startScreen: {
        mainPanel: {
          ...defaultTheme.tokens.startScreen.mainPanel,
          ...(partialTheme.tokens?.startScreen?.mainPanel || {})
        },
        title: {
          ...defaultTheme.tokens.startScreen.title,
          ...(partialTheme.tokens?.startScreen?.title || {})
        },
        splashCard: {
          ...defaultTheme.tokens.startScreen.splashCard,
          ...(partialTheme.tokens?.startScreen?.splashCard || {}),
          variants: {
            ...defaultTheme.tokens.startScreen.splashCard.variants,
            ...(partialTheme.tokens?.startScreen?.splashCard?.variants || {})
          }
        }
      },
      panels: {
        base: {
          ...defaultTheme.tokens.panels.base,
          ...(partialTheme.tokens?.panels?.base || {})
        },
        modal: {
          ...defaultTheme.tokens.panels.modal,
          ...(partialTheme.tokens?.panels?.modal || {}),
          panel: {
            ...defaultTheme.tokens.panels.modal.panel,
            ...(partialTheme.tokens?.panels?.modal?.panel || {})
          }
        },
        help: {
          ...defaultTheme.tokens.panels.help,
          ...(partialTheme.tokens?.panels?.help || {}),
          panel: {
            ...defaultTheme.tokens.panels.help.panel,
            ...(partialTheme.tokens?.panels?.help?.panel || {})
          }
        },
        settings: {
          ...defaultTheme.tokens.panels.settings,
          ...(partialTheme.tokens?.panels?.settings || {}),
          panel: {
            ...defaultTheme.tokens.panels.settings.panel,
            ...(partialTheme.tokens?.panels?.settings?.panel || {})
          }
        },
        pause: {
          ...defaultTheme.tokens.panels.pause,
          ...(partialTheme.tokens?.panels?.pause || {}),
          panel: {
            ...defaultTheme.tokens.panels.pause.panel,
            ...(partialTheme.tokens?.panels?.pause?.panel || {})
          },
          buttons: {
            ...defaultTheme.tokens.panels.pause.buttons,
            ...(partialTheme.tokens?.panels?.pause?.buttons || {})
          }
        }
      },
      typography: { ...defaultTheme.tokens.typography, ...(partialTheme.tokens?.typography || {}) },
      controls: { ...defaultTheme.tokens.controls, ...(partialTheme.tokens?.controls || {}) },
      board: { ...defaultTheme.tokens.board, ...(partialTheme.tokens?.board || {}) },
      progressStatus: { ...defaultTheme.tokens.progressStatus, ...(partialTheme.tokens?.progressStatus || {}) },
      feedbackStates: {
        ...defaultTheme.tokens.feedbackStates,
        ...(partialTheme.tokens?.feedbackStates || {})
      },
      modePresentation: { ...defaultTheme.tokens.modePresentation, ...(partialTheme.tokens?.modePresentation || {}) },
      effects: { ...defaultTheme.tokens.effects, ...(partialTheme.tokens?.effects || {}) }
    },
    assets: {
      ...defaultTheme.assets,
      ...(partialTheme.assets || {}),
      shell: { ...defaultTheme.assets.shell, ...(partialTheme.assets?.shell || {}) },
      menu: { ...defaultTheme.assets.menu, ...(partialTheme.assets?.menu || {}) },
      gameplayHeaderBoard: { ...defaultTheme.assets.gameplayHeaderBoard, ...(partialTheme.assets?.gameplayHeaderBoard || {}) },
      centerPrompt: { ...defaultTheme.assets.centerPrompt, ...(partialTheme.assets?.centerPrompt || {}) },
      modifiers: { ...defaultTheme.assets.modifiers, ...(partialTheme.assets?.modifiers || {}) },
      answerFeedback: {
        ...defaultTheme.assets.answerFeedback,
        ...(partialTheme.assets?.answerFeedback || {})
      },
      controlsOverlays: { ...defaultTheme.assets.controlsOverlays, ...(partialTheme.assets?.controlsOverlays || {}) },
      effectsDecorations: { ...defaultTheme.assets.effectsDecorations, ...(partialTheme.assets?.effectsDecorations || {}) }
    },
    preload: {
      ...defaultTheme.preload,
      ...(partialTheme.preload || {})
    }
  };
}

