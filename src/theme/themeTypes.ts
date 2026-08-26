/**
 * Theme Types Foundation
 * Supports the SKINLAB multi-phase migration.
 * Phase SKIN-3A-R: Foundation correction. No visual consumption.
 */

/**
 * Concealed answer element visuals are intentionally not represented
 * as theme tokens or assets. Concealment remains owned by the answer
 * rendering boundary.
 */
// answerHidden
// answerDarkModeConcealed

export interface MathForgeThemeFeedbackStates {
  answerCorrect: string;
  answerIncorrect: string;
  answerFailSafeRequired: string;
  answerFailSafeDisabled: string;
  controlLocked: string;
  statusWarning: string;
  statusComplete: string;
}

export interface MathForgeSceneGradientTokens {
  backgroundTop: string;
  backgroundBottom: string;
}

export interface MathForgeSkySceneTokens extends MathForgeSceneGradientTokens {
  cloud1Fill: string;
  cloud2Fill: string;
}

export interface MathForgeSunsetSceneTokens extends MathForgeSceneGradientTokens {
  cloudFill: string;
}

export interface MathForgeNightSceneTokens extends MathForgeSceneGradientTokens {
  star1Fill: string;
  star2Fill: string;
}

export interface MathForgeSpaceSceneTokens extends MathForgeSceneGradientTokens {
  star1Fill: string;
  star2Fill: string;
  star3Fill: string;
  nebulaFill: string;
  star1Shadow: string;
  star2Shadow: string;
}

export interface MathForgeStartScreenMainPanelTokens {
  background: string;
  overlayGradient?: string;
  borderColor?: string;
}

export interface MathForgeStartScreenTitleTokens {
  textShadow: string;
  primaryColor?: string;
  accentColor?: string;
}

export interface MathForgeStartScreenCardVariants {
  resumeBackground: string;
  resumeBorder: string;
  resumeText: string;

  primaryActiveBackground: string;
  primaryActiveBorder: string;
  primaryActiveText: string;

  primaryNewBackground: string;
  primaryNewBorder: string;
  primaryNewText: string;

  secondaryBackground: string;
  secondaryBorder: string;
  secondaryText: string;

  tertiaryBackground: string;
  tertiaryBorder: string;
  tertiaryText: string;
}

export interface MathForgeStartScreenSplashCardTokens {
  boxShadow: string;
  background?: string;
  borderColor?: string;
  variants: MathForgeStartScreenCardVariants;
}

export interface MathForgeStartScreenTokens {
  mainPanel: MathForgeStartScreenMainPanelTokens;
  title: MathForgeStartScreenTitleTokens;
  splashCard: MathForgeStartScreenSplashCardTokens;
}

export interface MathForgePanelSurfaceTokens {
  background: string;
  borderColor: string;
  boxShadow: string;
  backdrop?: string;
}

export interface MathForgePauseOverlayButtonTokens {
  resumeButtonBackground: string;
  restartButtonBackground: string;
  lessonPlanButtonBackground: string;
  exitButtonBackground: string;
  buttonTextColor: string;
}

export interface MathForgePauseOverlayTokens extends MathForgeOverlayPanelTokens {
  buttons: MathForgePauseOverlayButtonTokens;
}

export interface MathForgeOverlayPanelTokens {
  backdrop: string;
  panel: MathForgePanelSurfaceTokens;
  titleColor?: string;
  bodyColor?: string;
}

export interface MathForgeHelpMenuPassiveTokens extends MathForgeOverlayPanelTokens {
  headerDividerColor: string;
  footerDividerColor: string;
  tabContainerBackground: string;
  sectionTitleColor: string;
  bodyTextColor: string;
  mutedTextColor: string;
}

export interface MathForgeOptionsMenuPassiveTokens extends MathForgeOverlayPanelTokens {
  sectionTitleColor: string;
  sectionDividerColor: string;
  passiveSectionBackground: string;
  mutedTextColor: string;
}

export interface MathForgeNonGameplayPanelTokens {
  base: MathForgePanelSurfaceTokens;
  modal: MathForgeOverlayPanelTokens;
  help: MathForgeHelpMenuPassiveTokens;
  settings: MathForgeOptionsMenuPassiveTokens;
  pause: MathForgePauseOverlayTokens;
}

export interface MathForgeThemeTokens {
  shell: {
    scenes: {
      sky: MathForgeSkySceneTokens;
      sunset: MathForgeSunsetSceneTokens;
      night: MathForgeNightSceneTokens;
      space: MathForgeSpaceSceneTokens;
    };
  };
  startScreen: MathForgeStartScreenTokens;
  /**
   * Scaffold-only groups.
   * These must not be used by live components until each surface receives
   * explicit semantic token interfaces in a dedicated authorized phase.
   */
  panels: MathForgeNonGameplayPanelTokens;
  typography: Record<string, string>;
  controls: Record<string, string>;
  board: Record<string, string>;
  progressStatus: Record<string, string>;
  feedbackStates: MathForgeThemeFeedbackStates;
  modePresentation: Record<string, string>;
  effects: Record<string, string>;
}

export interface MathForgeThemeAssets {
  shell: Record<string, string | null>;
  menu: Record<string, string | null>;
  gameplayHeaderBoard: Record<string, string | null>;
  centerPrompt: Record<string, string | null>;
  modifiers: Record<string, string | null>;
  answerFeedback: {
    correctSurface: string | null;
    incorrectSurface: string | null;
    failSafeRequiredSurface: string | null;
    failSafeDisabledSurface: string | null;
  };
  controlsOverlays: Record<string, string | null>;
  effectsDecorations: Record<string, string | null>;
}

export interface MathForgeThemeMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export interface FallbackPreloadMetadata {
  preloadCriticalAssetKeys: string[];
  lazyAssetKeys: string[];
}

// A complete theme definition that will eventually supply all required resolved token and asset values.
// Never partial.
export interface DefaultMathForgeTheme extends MathForgeThemeMetadata {
  tokens: MathForgeThemeTokens;
  assets: MathForgeThemeAssets;
  preload: FallbackPreloadMetadata;
}

// DeepPartial utility type
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// A future alternate theme pack whose permitted cosmetic fields may be partial.
// Required identity metadata for registered alternate packs.
export interface PartialMathForgeTheme extends MathForgeThemeMetadata {
  tokens?: DeepPartial<MathForgeThemeTokens>;
  assets?: DeepPartial<MathForgeThemeAssets>;
  preload?: FallbackPreloadMetadata;
}

// A complete runtime result produced by merging the default theme with an optional partial alternate theme.
export type ResolvedMathForgeTheme = DefaultMathForgeTheme;

