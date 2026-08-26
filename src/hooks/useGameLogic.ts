/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { AppConfig, GameState, GameMode } from '../types';
import { SettingsStore } from '../services/storage';
import { telemetryGameReducer, statsTracker } from '../store/gameReducer';
import { useSound } from './useSound';
import { gameEngine, timingKernel } from '../services/timing';
import { XPTracker } from '../store/gameReducer';
import { ProblemTypeEngine } from '../services/problemGenerator';
import { StepLogger } from '../services/stepLogger';
import { getSkillTags } from '../services/skillTagging';

/*
AI_CONTEXT:
useGameLogic is the primary bridge between the React UI and the core game services.
It manages the synchronization of the TimingKernel with the current GameState.
Do not move core gameplay logic into this hook; it should remain a thin 
orchestration layer that dispatches actions to the reducer.
*/

import { PracticePlanController } from '../services/practicePlanController';
import { SafeStorage } from '../services/safeStorage';

export const useGameLogic = () => {
  const [config, setConfigState] = useState<AppConfig>(() => SettingsStore.load());
  const setConfig = (newConfig: AppConfig) => {
    setConfigState(newConfig);
    SettingsStore.save(newConfig);
  };

  const [state, dispatch] = useReducer(telemetryGameReducer, {
    status: 'idle',
    currentNumber: 0,
    stepIndex: 0,
    steps: [],
    errorCount: 0,
    elapsedTime: 0,
    isPaused: false,
    lives: 3,
    distractors: [],
    flashState: null,
    shake: false,
    lastEvent: 'none',
    initError: null,
    timedOutLocked: false,
  });

  const [retryStep, setRetryStep] = useState<any>(null);
  const [stepTries, setStepTries] = useState(0);

  let currentStep = state.steps && state.steps[state.stepIndex] ? state.steps[state.stepIndex] : null;
  if (retryStep) {
    currentStep = retryStep;
  }
  const currentMode = currentStep ? currentStep.mode : (config.activeMode as GameMode);
  const [internalLastEvent, setInternalLastEvent] = useState(state.lastEvent);

  const streakTier = (() => {
    const sc = state.streakCount || 0;
    if (sc >= 10) return 3;
    if (sc >= 5) return 2;
    if (sc >= 3) return 1;
    return 0;
  })();

  const sound = useSound(
    config.isMuted, 
    internalLastEvent, 
    currentMode === 'dark' && state.status === 'playing', 
    currentMode === 'qmm',
    streakTier
  );
  const requestRef = useRef<number | null>(null);
  const darkStepAdvanceFiredRef = useRef(false);
  const [sessionXP, setSessionXP] = useState<any>(null);
  const xpAwardedRef = useRef(false);

  // Skip Rhythm Momentum Chain State
  const [chainLength, setChainLength] = useState(0);
  const [chainMultiplier, setChainMultiplier] = useState(1);
  const [maxChain, setMaxChain] = useState(0);
  const skipRhythmStats = useRef({ totalResponseTime: 0, responseCount: 0 });
  const stepStartTimeRef = useRef<number>(0);

  // Visibility Pause Guard Refs
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const hiddenTimestampRef = useRef<number | null>(null);
  const autoPausedByVisibilityRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = state.status === 'playing';
    isPausedRef.current = state.isPaused;
  }, [state.status, state.isPaused]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlayingRef.current) {
          hiddenTimestampRef.current = performance.now();
          if (!isPausedRef.current) {
            autoPausedByVisibilityRef.current = true;
            dispatch({ type: 'TOGGLE_PAUSE' });
          }
        }
      } else {
        if (hiddenTimestampRef.current !== null) {
          const hiddenDuration = performance.now() - hiddenTimestampRef.current;
          stepStartTimeRef.current += hiddenDuration;
          hiddenTimestampRef.current = null;
          
          // Existing UX uses a PauseOverlay that requires manual resume.
          // Therefore, we keep the game paused and do not auto-resume.
          autoPausedByVisibilityRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track step attempts to ensure timer resets on retry
  const stepId = `${state.stepIndex}-${stepTries}`;

  useEffect(() => {
    darkStepAdvanceFiredRef.current = false;
    stepStartTimeRef.current = performance.now();
    console.log('[TIMER RESET SIGNAL]', stepId);
  }, [state.stepIndex, stepTries]);

  useEffect(() => {
    if (state.flashState || state.shake || state.lastEvent !== 'none' || state.opUpdateAnim) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_EFFECTS' }), 400);
      return () => clearTimeout(t);
    }
  }, [state.flashState, state.shake, state.lastEvent, state.opUpdateAnim]);

  useEffect(() => setInternalLastEvent(state.lastEvent), [state.lastEvent]);

  /*
  AI_CONTEXT:
  This effect manages the 1s TICK dispatch.
  It is separate from the TimingKernel to ensure the UI's elapsedTime 
  remains synchronized with the global game state regardless of mode-specific 
  timer behaviors.
  */
  useEffect(() => {
    if (state.status !== 'playing' || state.isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
    let lastTime = performance.now();
    const loop = (time: number) => {
      if (time - lastTime >= 1000) {
        dispatch({ type: 'TICK' });
        lastTime = time;
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state.status, state.isPaused]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  /*
  AI_CONTEXT:
  This effect synchronizes the TimingKernel with the current step's mode.
  It ensures that mode-specific timing semantics (pressure, concealment) 
  are correctly applied at the start of each step.
  */
  useEffect(() => {
    // Timer is effectively paused while in the correction phase (!state.failedCurrentStep)
    if (state.status === 'playing' && !state.isPaused && !state.flashState && currentStep && !state.failedCurrentStep) {
      if (currentMode !== 'dark' && state.timedOutLocked) {
        gameEngine.stopAll();
        return;
      }
      const onExpire = () => {
        if (configRef.current.learningMode === 'skip_rhythm') {
          setChainLength(0);
          setChainMultiplier(1);
          if (process.env.NODE_ENV !== 'production') {
            console.log('[SkipRhythmTelemetry]', {
              stepIndex: state.stepIndex,
              stepSize: currentStep.meta?.stepSize,
              patternType: currentStep.meta?.patternType,
              direction: currentStep.meta?.direction,
              directionChangeOccurred: currentStep.meta?.directionChangeOccurred,
              chainLength: 0,
              maxChain,
              averageResponseTime: skipRhythmStats.current.responseCount > 0 
                ? (skipRhythmStats.current.totalResponseTime / skipRhythmStats.current.responseCount / 1000).toFixed(2) + 's' 
                : '0s',
              responseTime: 'TIMEOUT',
              correct: false
            });
          }
        }
        
        const tags = getSkillTags(currentStep, configRef.current);
        const targetTime = PracticePlanController.getCurrentLevel()?.targetResponseTime || configRef.current.targetResponseTime || 5;
        StepLogger.logStep({
          mode: currentStep.mode,
          questionLabel: currentStep.operation === 'pattern' 
            ? `Pattern: ${currentStep.meta?.sequence?.join(', ')} ... ?` 
            : `${currentStep.startNumber} ${currentStep.operation} ${currentStep.value}`,
          correct: false,
          selectedAnswer: 'TIMEOUT',
          correctAnswer: currentStep.correctAnswer,
          responseTime: configRef.current.timerSeconds || 0,
          targetResponseTime: targetTime,
          timedOut: true,
          skillKey: tags.skillKey,
          subSkill: tags.subSkill,
          timestamp: Date.now()
        });

        if (timingKernel.getRemaining() <= 0) dispatch({ type: 'TIMEOUT', config: configRef.current });
      };
      gameEngine.startStep(config, currentMode, stepId, currentStep.timerSeconds, onExpire);
    } else {
      gameEngine.stopAll();
    }
    return () => gameEngine.stopAll();
  }, [stepId, state.status, state.isPaused, state.flashState, config, currentMode, currentStep, state.timedOutLocked]);

  useEffect(() => {
    if (state.status === 'finished' && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      const stats = statsTracker.getFinalStats();
      const xpData = XPTracker.awardSessionXP(stats, config.learningMode);
      setSessionXP(xpData);
      
      const targetTime = PracticePlanController.getCurrentLevel()?.targetResponseTime || config.targetResponseTime || 5;
      
      // Grab steps before ending the logger session
      const currentLoggerSession = StepLogger.getCurrentSession();
      const logSteps = currentLoggerSession ? [...currentLoggerSession.steps] : [];

      StepLogger.endSession(targetTime);

      if (PracticePlanController.getCurrentPlan()) {
        const level = PracticePlanController.getCurrentLevel();
        if (level) {
          const formattedStepResults = logSteps.map((s, i) => ({
            stepIndex: i,
            correct: s.correct,
            responseTimeSeconds: s.responseTime,
            timeout: s.timedOut,
            questionLabel: s.questionLabel,
            skillKey: s.skillKey,
            correctAnswer: s.correctAnswer,
            mode: s.mode,
            targetResponseTime: s.targetResponseTime
          }));

          PracticePlanController.recordResult({
            levelId: level.levelId,
            mode: config.learningMode,
            accuracy: stats.accuracy / 100,
            mistakes: stats.mistakes,
            completionTimeSeconds: stats.totalTime,
            avgResponseTime: stats.avgResponseTime,
            targetResponseTime: level.targetResponseTime,
            completed: !stats.endedEarly,
            stepResults: formattedStepResults, // Now populated with actual step tags!
            timeouts: stats.timedOutCount || 0
          });

          // NEW DATA PIPELINE
          if (PracticePlanController.isLastLevel() && !stats.endedEarly) {
            const lessonSummary = PracticePlanController.getLessonSummary();
            if (lessonSummary) {
              import('../services/skillProgressService').then(({ SkillProgressService }) => {
                SkillProgressService.updateSkillProgress(lessonSummary);
                console.log('[DATA PIPELINE] Skill progress updated');
              });
              
              import('../services/skillAnalysisService').then(({ SkillAnalysisEngine }) => {
                SkillAnalysisEngine.analyzeAndGenerateReport();
                console.log('[DATA PIPELINE] Skill analysis generated');
              });

              // Persist Lesson Result
              const existing = SafeStorage.getItem<any[]>('speedmath.lessonResults', []);
              SafeStorage.setItem(
                'speedmath.lessonResults',
                [...existing, lessonSummary]
              );
              console.log('[DATA PIPELINE] Lesson committed');
            }
          }
        }
      }
    }
    if (state.status === 'playing') {
      xpAwardedRef.current = false;
      setSessionXP(null);
    }
  }, [state.status, config.learningMode]);

  const startGame = useCallback(
    (newConfig?: AppConfig) => {
      setRetryStep(null);
      setStepTries(0);
      const activeConfig = newConfig || config;
      if (activeConfig.learningMode === 'skip_rhythm') {
        setChainLength(0);
        setChainMultiplier(1);
        setMaxChain(0);
        skipRhythmStats.current = { totalResponseTime: 0, responseCount: 0 };
      }
      if (newConfig) setConfig(newConfig);
      StepLogger.startSession(activeConfig.learningMode || 'arithmetic');
      dispatch({ type: 'START_GAME', config: activeConfig });
    },
    [config]
  );

  const advanceDarkStepNow = useCallback(() => {
    const cStep = state.steps && state.steps[state.stepIndex];
    if (!cStep || cStep.mode !== 'dark' || state.status !== 'playing' || state.isPaused || state.flashState) return;
    if (darkStepAdvanceFiredRef.current) return;
    darkStepAdvanceFiredRef.current = true;
    gameEngine.stopAll();
    dispatch({ type: 'TIMEOUT', config: configRef.current });
  }, [state.status, state.isPaused, state.flashState, state.steps, state.stepIndex]);

  const finalResults = state.status === 'finished' ? statsTracker.getFinalStats() : null;
  const problem = ProblemTypeEngine.createProblem(currentStep, state.currentNumber, config);

  const getActiveScene = () => {
    const step = state.stepIndex + 1;
    if (step <= 10) return 'sky';
    if (step <= 20) return 'sunset';
    if (step <= 30) return 'night';
    return 'space';
  };

  return {
    config,
    state: { ...state, currentMode },
    distractors: state.distractors,
    flashState: state.flashState,
    opUpdateAnim: state.opUpdateAnim,
    sound,
    shake: state.shake,
    finalResults,
    sessionXP,
    problem,
    retryStep,
    stepId,
    activeScene: getActiveScene(),
    rhythmState: { chainLength, chainMultiplier, maxChain },
    actions: {
      startGame,
      handleAnswer: (ans: number) => {
        if (currentStep) {
          const isCorrect = ans === currentStep.correctAnswer;
          const responseTimeMs = performance.now() - stepStartTimeRef.current;
          
          const tags = getSkillTags(currentStep, config);
          const targetTime = PracticePlanController.getCurrentLevel()?.targetResponseTime || config.targetResponseTime || 5;
          const tries = stepTries + 1;
          setStepTries(tries);

          let confidence = 0;
          if (isCorrect) {
            if (tries === 1) confidence = 1;
            else if (tries === 2) confidence = 0.5;
            else confidence = 0;
          } else {
            confidence = 0;
          }
          
          StepLogger.logStep({
            mode: currentStep.mode,
            questionLabel: currentStep.operation === 'pattern' 
              ? `Pattern: ${currentStep.meta?.sequence?.join(', ')} ... ?` 
              : `${currentStep.startNumber} ${currentStep.operation} ${currentStep.value}`,
            correct: isCorrect,
            selectedAnswer: ans,
            correctAnswer: currentStep.correctAnswer,
            responseTime: Number((responseTimeMs / 1000).toFixed(2)),
            targetResponseTime: targetTime,
            timedOut: false,
            skillKey: tags.skillKey,
            subSkill: tags.subSkill,
            timestamp: Date.now(),
            confidenceLevel: confidence
          });

          if (!isCorrect) {
            setRetryStep(currentStep);
          } else {
            if (retryStep) {
              setRetryStep(null);
            }
            setStepTries(0);
          }
        }
        
        if (config.learningMode === 'skip_rhythm' && currentStep) {
          const isCorrect = ans === currentStep.correctAnswer;
          const responseTimeMs = performance.now() - stepStartTimeRef.current;
          
          let newChainLength = chainLength;
          let newMaxChain = maxChain;

          if (isCorrect) {
            newChainLength = chainLength + 1;
            newMaxChain = Math.max(maxChain, newChainLength);
            setChainLength(newChainLength);
            setMaxChain(newMaxChain);
            setChainMultiplier(Math.min(4, newChainLength));
            skipRhythmStats.current.totalResponseTime += responseTimeMs;
            skipRhythmStats.current.responseCount += 1;
          } else {
            newChainLength = 0;
            setChainLength(0);
            setChainMultiplier(1);
          }

          if (process.env.NODE_ENV !== 'production') {
            console.log('[SkipRhythmTelemetry]', {
              stepIndex: state.stepIndex,
              stepSize: currentStep.meta?.stepSize,
              patternType: currentStep.meta?.patternType,
              direction: currentStep.meta?.direction,
              directionChangeOccurred: currentStep.meta?.directionChangeOccurred,
              chainLength: newChainLength,
              maxChain: newMaxChain,
              averageResponseTime: skipRhythmStats.current.responseCount > 0 
                ? (skipRhythmStats.current.totalResponseTime / skipRhythmStats.current.responseCount / 1000).toFixed(2) + 's' 
                : '0s',
              responseTime: (responseTimeMs / 1000).toFixed(2) + 's',
              correct: isCorrect
            });
          }
        }
        if (config.learningMode === 'pattern' && currentStep) {
          const isCorrect = ans === currentStep.correctAnswer;
          const responseTimeMs = performance.now() - stepStartTimeRef.current;
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[PatternTelemetry]', {
              patternType: currentStep.meta?.patternType,
              step: currentStep.value,
              sequenceLength: currentStep.meta?.sequence?.length,
              responseTime: (responseTimeMs / 1000).toFixed(2),
              correct: isCorrect
            });
          }
        }
        dispatch({ type: 'SUBMIT_ANSWER', answer: ans, config });
      },
      togglePause: () => dispatch({ type: 'TOGGLE_PAUSE' }),
      setConfig,
      earlyExit: () => {
        dispatch({ type: 'EARLY_EXIT', config });
      },
      clearPlanAndExit: () => {
        PracticePlanController.clearPlan();
        dispatch({ type: 'EARLY_EXIT', config });
      },
      clearInitError: () => dispatch({ type: 'CLEAR_INIT_ERROR' }),
      exitToIdle: () => dispatch({ type: 'EXIT_TO_IDLE' }),
      advanceDarkStepNow,
    },
  };
};
