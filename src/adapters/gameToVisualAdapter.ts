/**
 * 🔒 STABLE BASELINE FILE
 * Do not modify without explicit architecture change approval.
 * Changes here can break the entire app.
 */
import { GameStep, AppConfig } from '../types';
import { VisualStep } from '../contracts/visualStep';
import { modeController } from '../services/timing';

export function toVisualStep(step: GameStep, currentNumber: number, problem?: any, stateContext?: any, config?: AppConfig, stepId?: string): VisualStep {
  let mode: 'NM' | 'QMM' | 'DM' | 'HIDDEN' | 'SURVIVAL' = 'NM';
  if (step.mode === 'qmm') mode = 'QMM';
  else if (step.mode === 'dark') mode = 'DM';
  else if (step.mode === 'hidden') mode = 'HIDDEN';
  else if (step.mode === 'survival') mode = 'SURVIVAL';

  let modifierValue: number | undefined = undefined;
  let operation: string | undefined = undefined;
  if (step.modifiers && step.modifiers.length > 0) {
    const mod = step.modifiers[0];
    modifierValue = typeof mod.value === 'number' ? mod.value : parseInt(mod.value as string, 10);
    if (isNaN(modifierValue)) modifierValue = undefined;
    operation = mod.operation;
  } else if (step.operation !== undefined) {
    operation = step.operation;
    modifierValue = step.value;
  }

  const currentValue = problem?.centerValue ?? currentNumber;
  const isMystery = mode === 'QMM' || mode === 'HIDDEN' || problem?.type === 'sequence';
  
  const modeConfig = modeController.getModeConfig(step.mode as any);
  
  const getStreakTier = (streakCount: number): number => {
    if (streakCount >= 10) return 3;
    if (streakCount >= 5) return 2;
    if (streakCount >= 3) return 1;
    return 0;
  };
  
  const streakTier = getStreakTier(stateContext?.streakCount || 0);

  const safeOptions = (() => {
    const base = [
      ...(step.distractors || []),
      step.correctAnswer
    ].filter(v => typeof v === 'number' && !isNaN(v));

    let unique = Array.from(new Set(base));

    if (!unique.includes(step.correctAnswer)) {
      unique.push(step.correctAnswer);
    }

    while (unique.length < 3) {
      const last = unique[unique.length - 1] ?? step.correctAnswer;
      unique.push(last + 1);
    }

    return unique.sort((a, b) => a - b);
  })();

  const visualStep: VisualStep = {
    currentValue,
    modifier: modifierValue,
    operation,
    mode,
    options: safeOptions,
    correctAnswer: step.correctAnswer,
    stepId,
    
    timerSeconds: step.timerSeconds || 0,
    currentLevel: step.difficultyMeta?.level || config?.difficultyLevel || 5,
    activeTable: step.meta?.activeTable,
    isMystery,
    usesRingTimer: modeConfig.usesRingTimer,
    isPaused: stateContext?.isPaused || !!stateContext?.flashState,
    streakTier,
    rhythm: stateContext?.rhythmState,
    modifiers: problem?.type === 'standard' ? problem.modifiers : undefined
  };

  if (!visualStep.options || visualStep.options.length < 3) {
    console.error('[VISUAL CONTRACT BROKEN]', visualStep);
  }

  if ((config as any)?.learningMode === 'mixed') {
    console.log('[MIXED TRACE]', {
      step,
      safeOptions,
      correctAnswer: step.correctAnswer
    });
  }

  console.log('[VISUAL TRACE SINGLE]', {
    i: stateContext?.stepIndex,
    currentValue: visualStep.currentValue,
    operation: visualStep.operation,
    modifier: visualStep.modifier,
    correctAnswer: visualStep.correctAnswer,
    options: visualStep.options
  });

  if ((config?.difficultyLevel || 5) <= 1 && Number(visualStep.currentValue) > 30) {
    console.warn('[POSSIBLE RANGE DRIFT]', { config, visualStep });
  }

  if (Math.abs(Number(visualStep.correctAnswer)) > 100 && (config?.difficultyLevel || 5) <= 1) {
    console.warn('[POSSIBLE ANSWER DRIFT]', { config, visualStep });
  }

  console.log('[VISUAL STEP TRACE]', {
    rawStep: step,
    stateCurrentNumber: currentNumber,
    visualStep,
    visibleExpression: `${visualStep.currentValue} ${visualStep.operation ?? ''} ${visualStep.modifier}`,
    correctAnswer: visualStep.correctAnswer,
    options: visualStep.options
  });

  return visualStep;
}
