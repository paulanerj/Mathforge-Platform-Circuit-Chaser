import { TutorialScript } from './tutorialTypes';

export const TUTORIAL_SCRIPTS: Record<string, TutorialScript> = {
  app_basics: {
    id: 'app_basics',
    title: 'App Basics',
    description: 'Learn the core flow and interface of the MathForge client.',
    version: 1,
    steps: [
      {
        id: 'ab_welcome',
        kind: 'info',
        title: 'Welcome to MathForge!',
        message: 'This is a premium, offline-first application designed to help you build lightning-fast math intuition.',
        target: { id: 'app-root' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'ab_header',
        kind: 'info',
        title: 'Status & Progress',
        message: 'The header tracks your current step, streak level, score multiplier, and remaining time.',
        target: { id: 'top-bar' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'ab_help',
        kind: 'info',
        title: 'Contextual Help',
        message: 'Need a refresher during play? Tap the Help Button here to view play rules or replay guides at any moment.',
        target: { id: 'help-button' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      }
    ]
  },
  normal_mode_basics: {
    id: 'normal_mode_basics',
    title: 'Normal Mode Basics',
    description: 'Solve equations in the central coin and select from options grid.',
    version: 1,
    steps: [
      {
        id: 'nmb_coin',
        kind: 'info',
        title: 'Analyze the Core',
        message: 'The Center Coin displays your active equation or starting number list. Addition, subtraction, or multiplication equations start here!',
        target: { id: 'center-coin' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'nmb_grid',
        kind: 'info',
        title: 'The Answer Grid',
        message: 'The Answer Grid below presents standard visual multiple-choice values. Only one button in this grid holds the correct target solution!',
        target: { id: 'answer-grid' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'nmb_solve',
        kind: 'realAction',
        title: 'Find the Correct Option',
        message: 'Give it a try! Read the formula inside the center coin, calculate its correct value, then tap the correct button on the grid below.',
        target: { id: 'answer-button-correct' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'realAction',
      }
    ]
  },
  qmm_basics: {
    id: 'qmm_basics',
    title: 'QMM Modifier Training',
    description: 'Quick Math Mode modifiers and minimal layouts.',
    version: 1,
    steps: [
      {
        id: 'qmm_info',
        kind: 'info',
        title: 'Welcome to QMM!',
        message: 'Quick Math Mode (QMM) is a rapid-fire mental drill where you solve modifiers streaming outward in real-time.',
        target: { id: 'modifier-zone' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'qmm_goal',
        kind: 'info',
        title: 'Dynamic Modifiers',
        message: 'These floating indicator zones float around the central core. Multiply or add incoming modifiers into your calculation count!',
        target: { id: 'modifier-zone' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      }
    ]
  },
  dark_mode_basics: {
    id: 'dark_mode_basics',
    title: 'Dark Mode Audio/Rhythm',
    description: 'Practice rhythm matching and blind calculations.',
    version: 1,
    steps: [
      {
        id: 'dmb_blind',
        kind: 'info',
        title: 'Blind Pacing',
        message: 'In Dark Mode, the Answer Grid remains hidden. You do not visually select items from multiple choices.',
        target: { id: 'answer-grid' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'dmb_action',
        kind: 'info',
        title: 'Rhythm Pacing',
        message: 'Input your calculated count by directly tapping the Center Coin in a rhythmic flow.',
        target: { id: 'dark-mode-center-action' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      }
    ]
  },
  survival_mode_basics: {
    id: 'survival_mode_basics',
    title: 'Survival Mastery',
    description: 'Understand hearts, strikes, and pedagogical safeties.',
    version: 1,
    steps: [
      {
        id: 'sm_lives',
        kind: 'info',
        title: 'Shields/Hearts',
        message: 'In Survival Mode, you start with 3 lives. Watch out—careless errors or ticking timeouts will subtract a heart!',
        target: { id: 'survival-lives' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      },
      {
        id: 'sm_failsafe',
        kind: 'info',
        title: 'Fail-Safe Assurance',
        message: 'If you miss a step, the fail-safe indicator blinks green in the grid. Select it to learn and keep practicing.',
        target: { id: 'fail-safe-correct-answer' },
        pauseMode: 'freezeGameplay',
        advanceOn: 'continue',
      }
    ]
  }
};
