import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TutorialId, 
  TutorialStatus, 
  TutorialScript, 
  TutorialStep, 
  TutorialCompletionState 
} from './tutorialTypes';
import { TUTORIAL_SCRIPTS } from './tutorialScripts';
import { TutorialFreezeAdapter } from './useTutorialFreezeAdapter';

const STORAGE_KEY = 'mf_tutorial_completion_v1';

const defaultCompletionState: TutorialCompletionState = {
  completedTutorials: {},
  skippedTutorials: {},
  dismissedTutorialOffers: {},
  lastSeenVersionByTutorial: {},
};

export interface UseTutorialDirectorArgs {
  isGamePaused: boolean;
  togglePause: () => void;
  currentMode: string;
  onNavigateTo?: (screen: string) => void;
  onCustomAction?: (actionKind: string, payload?: any) => void;
}

export function useTutorialDirector({
  isGamePaused,
  togglePause,
  currentMode,
  onNavigateTo,
  onCustomAction,
}: UseTutorialDirectorArgs) {
  const [activeTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [tutorialStatus, setTutorialStatus] = useState<TutorialStatus>('idle');
  const [completionState, setCompletionState] = useState<TutorialCompletionState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[TUTORIAL] Failed to load tutorial completion state', e);
    }
    return defaultCompletionState;
  });

  const wasPausedByDirectorRef = useRef<boolean>(false);

  // Persistence Helper
  const saveCompletionState = (updated: TutorialCompletionState) => {
    setCompletionState(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[TUTORIAL] Failed to save tutorial completion state', e);
    }
  };

  const activeScript: TutorialScript | null = activeTutorialId 
    ? TUTORIAL_SCRIPTS[activeTutorialId] || null 
    : null;

  const currentStep: TutorialStep | null = activeScript && activeScript.steps[activeStepIndex] 
    ? activeScript.steps[activeStepIndex] 
    : null;

  // Sync Gameplay Freeze under our Tutorial overlay
  const handleFreezeGame = useCallback(() => {
    if (!isGamePaused) {
      wasPausedByDirectorRef.current = true;
      togglePause();
    }
  }, [isGamePaused, togglePause]);

  const handleUnfreezeGame = useCallback(() => {
    if (wasPausedByDirectorRef.current && isGamePaused) {
      wasPausedByDirectorRef.current = false;
      togglePause();
    }
  }, [isGamePaused, togglePause]);

  const startTutorial = useCallback((id: TutorialId) => {
    const script = TUTORIAL_SCRIPTS[id];
    if (!script) {
      console.warn(`[TUTORIAL] Script not found: ${id}`);
      return;
    }

    console.log(`[TUTORIAL] Launching script: ${id}`);
    setActiveTutorialId(id);
    setActiveStepIndex(0);
    setTutorialStatus('active');

    // Freeze gameplay in standard info/targetTap tutorial steps
    const firstStep = script.steps[0];
    if (firstStep && firstStep.pauseMode !== 'none') {
      handleFreezeGame();
    }
  }, [handleFreezeGame]);

  const endTutorial = useCallback((status: 'completed' | 'skipped' | 'dismissed') => {
    if (!activeTutorialId) return;

    console.log(`[TUTORIAL] Ending script: ${activeTutorialId} with status: ${status}`);
    
    const updated = { ...completionState };
    if (status === 'completed') {
      updated.completedTutorials = { ...updated.completedTutorials, [activeTutorialId]: true };
    } else if (status === 'skipped') {
      updated.skippedTutorials = { ...updated.skippedTutorials, [activeTutorialId]: true };
    }
    saveCompletionState(updated);

    setActiveTutorialId(null);
    setActiveStepIndex(0);
    setTutorialStatus(status);
    handleUnfreezeGame();
  }, [activeTutorialId, completionState, handleUnfreezeGame]);

  const advanceStep = useCallback(() => {
    if (!activeScript) return;

    if (activeStepIndex + 1 < activeScript.steps.length) {
      const nextIndex = activeStepIndex + 1;
      setActiveStepIndex(nextIndex);
      
      const nextStep = activeScript.steps[nextIndex];
      // Sync freeze behavior of the next step
      if (nextStep.pauseMode === 'none') {
        handleUnfreezeGame();
      } else {
        handleFreezeGame();
      }
    } else {
      endTutorial('completed');
    }
  }, [activeScript, activeStepIndex, handleFreezeGame, handleUnfreezeGame, endTutorial]);

  const previousStep = useCallback(() => {
    if (activeStepIndex > 0) {
      const nextIndex = activeStepIndex - 1;
      setActiveStepIndex(nextIndex);

      const prevStep = activeScript?.steps[nextIndex];
      if (prevStep && prevStep.pauseMode === 'none') {
        handleUnfreezeGame();
      } else {
        handleFreezeGame();
      }
    }
  }, [activeScript, activeStepIndex, handleFreezeGame, handleUnfreezeGame]);

  // Intercept normal gameplay answers/interactions to auto-advance if required
  const notifyAction = useCallback((actionKind: string, payload?: any) => {
    if (!activeTutorialId || !currentStep) return;

    if (currentStep.advanceOn === 'realAction') {
      // If the step is waiting for real action, check if it matches expectation
      if (actionKind === 'submitCorrectAnswer' && currentStep.target?.id === 'answer-button-correct') {
        const isCorrect = payload?.isCorrect;
        if (isCorrect) {
          advanceStep();
        }
      } else if (actionKind === 'tapCenterCoin' && currentStep.target?.id === 'center-coin') {
        advanceStep();
      }
    }
  }, [activeTutorialId, currentStep, advanceStep]);

  return {
    activeScript,
    activeTutorialId,
    activeStepIndex,
    currentStep,
    tutorialStatus,
    completionState,
    startTutorial,
    advanceStep,
    previousStep,
    endTutorial,
    notifyAction,
    isCompleted: (id: TutorialId) => !!completionState.completedTutorials[id],
    isSkipped: (id: TutorialId) => !!completionState.skippedTutorials[id],
  };
}
