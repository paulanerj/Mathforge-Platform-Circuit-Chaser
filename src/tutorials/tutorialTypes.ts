/**
 * MATHFORGE — TUTORIAL / HELP SYSTEM TYPE DEFINITIONS
 * 
 * This file contains isolated TS type descriptions and models for the future
 * MathForge Tutorial and Help system.
 * 
 * ARCHITECTURE RULES:
 * 1. These types MUST NOT be added to or integrated into the core GameState definition.
 * 2. The tutorial system state and manager MUST live in its own separate domain (reusable react context, hook, or isolated store layer).
 * 3. Gameplay pause states can be leveraged as secondary/low-level operations, but gameReducer.ts must remain completely decoupled from tutorial progression, steps, overlays, and scripts.
 */

/**
 * Union of all supported tutorial identifiers in MathForge.
 */
export type TutorialId =
  | 'app_basics'
  | 'normal_mode_basics'
  | 'qmm_basics'
  | 'dark_mode_basics'
  | 'hidden_mode_basics'
  | 'survival_mode_basics'
  | 'fail_safe_explanation'
  | 'lesson_builder_basics'
  | 'settings_basics';

/**
 * Progression state of an active tutorial script.
 */
export type TutorialStatus =
  | 'idle'
  | 'offered'
  | 'active'
  | 'paused'
  | 'completed'
  | 'skipped'
  | 'dismissed';

/**
 * Interaction paradigm for an individual tutorial step.
 */
export type TutorialStepKind =
  | 'info'       // User reads and taps Continue
  | 'targetTap'  // User taps a highlighted UI element specifically
  | 'realAction' // User triggers a normal game action (e.g., clicks correct answer)
  | 'wait'       // System waits for an asynchronous timer or state resolver
  | 'choice';    // User chooses between multiple interactive pathways

/**
 * Uniquely identifies target UI components for interactive spotlights, highlights and pointer guides.
 */
export type TutorialTargetId =
  | 'app-root'
  | 'top-bar'
  | 'center-coin'
  | 'modifier-zone'
  | 'answer-grid'
  | 'answer-button-correct'
  | 'answer-button-any'
  | 'pause-button'
  | 'help-button'
  | 'settings-button'
  | 'lesson-builder-root'
  | 'lesson-plan-list'
  | 'lesson-step-editor'
  | 'mode-selector'
  | 'survival-lives'
  | 'dark-mode-center-action'
  | 'fail-safe-correct-answer';

/**
 * Details targeting a specific DOM element via standard identifier metrics without brittle selectors.
 */
export interface TutorialTarget {
  id: TutorialTargetId;
  required?: boolean;
  allowMissingInModes?: string[];
  fallbackPlacement?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

/**
 * The categories of actionable side-effects a tutorial step can trigger.
 */
export type TutorialActionKind =
  | 'none'
  | 'continue'
  | 'tapTarget'
  | 'submitCorrectAnswer'
  | 'openSettings'
  | 'openHelp'
  | 'pauseGame'
  | 'resumeGame'
  | 'startMode'
  | 'finishTutorial';

/**
 * Declarative actions coupled with instructions carried out upon entering or advancing steps.
 */
export interface TutorialAction {
  kind: TutorialActionKind;
  label?: string;
  payload?: Record<string, unknown>;
}

/**
 * Gameplay execution constraint triggered during specific steps.
 */
export type TutorialPauseMode =
  | 'none'            // Normal interactive speed
  | 'freezeGameplay' // Intercept ticks, freeze timer underneath
  | 'overlayOnly'     // Render tutorial over current page without pausing execution
  | 'fullScreenMenu'; // Standard pause overlay bounds the screen completely

/**
 * Complete metadata blueprint representing one specific node/state in a tutorial journey.
 */
export interface TutorialStep {
  id: string;
  kind: TutorialStepKind;
  title?: string;
  message: string;
  target?: TutorialTarget;
  pauseMode?: TutorialPauseMode;
  action?: TutorialAction;
  highlightMode?: 'none' | 'spotlight' | 'pulse' | 'ring' | 'dimBackground';
  advanceOn?: 'continue' | 'targetTap' | 'realAction' | 'condition' | 'timer';
  expectedAnswer?: number;
  durationMs?: number;
  allowSkip?: boolean;
  modeRestrictions?: string[];
  notes?: string;
}

/**
 * Configurable list of procedural instructions to carry out a full guided walkthrough.
 */
export interface TutorialScript {
  id: TutorialId;
  title: string;
  description: string;
  version: number;
  appliesToModes?: string[];
  steps: TutorialStep[];
  estimatedSeconds?: number;
  skippable?: boolean;
  replayable?: boolean;
}

/**
 * Active runtime slice driving a tutorial session. Built outside state.status to prevent corruption.
 */
export interface TutorialDirectorState {
  status: TutorialStatus;
  activeTutorialId: TutorialId | null;
  activeStepIndex: number;
  offeredTutorialId?: TutorialId | null;
  preExistingGamePause?: boolean;
  pauseReason?: 'help' | 'tutorial' | 'firstTimeOffer' | 'menu' | null;
  lastCompletedTutorialId?: TutorialId | null;
  lastSkippedTutorialId?: TutorialId | null;
  message?: string | null;
}

/**
 * Serializable progress history tracking to optimize onboarding suggestions.
 */
export interface TutorialCompletionState {
  completedTutorials: Partial<Record<TutorialId, boolean>>;
  skippedTutorials: Partial<Record<TutorialId, boolean>>;
  dismissedTutorialOffers: Partial<Record<TutorialId, boolean>>;
  lastSeenVersionByTutorial: Partial<Record<TutorialId, number>>;
}

/**
 * Identifies what triggered the tutorial instantiation.
 */
export type TutorialLaunchSource =
  | 'helpButton'
  | 'firstTimeOffer'
  | 'tutorialMenu'
  | 'settings'
  | 'contextualPrompt'
  | 'developerTest';

/**
 * Blueprint for loading a specific sequence into the runtime controller.
 */
export interface TutorialLaunchRequest {
  tutorialId: TutorialId;
  source: TutorialLaunchSource;
  startAtStepId?: string;
  forceReplay?: boolean;
}
