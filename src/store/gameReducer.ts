/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
PROTECTED CORE ENGINE FILE: Do not modify without explicit PM approval.
*/

import { AppConfig, GameState, GameStep, GameMode } from '../types';
import { Telemetry } from '../services/telemetry';
import { LearningProgressMap } from '../services/learningProgress';
import { ProblemGenerator } from '../services/problemGenerator';
import { orchestrator, PhaseScheduler } from '../services/orchestrator';
import { gameEngine } from '../services/timing';
import { STORAGE_KEYS } from '../constants';
import { RandomService } from '../services/randomService';
import { CognitiveLoadModel } from '../services/cognitiveLoadModel';
import { MasteryPipeline } from '../services/learning/mastery';
import { PlatformSkillOntology } from '../services/learning/ontology';
import { InterventionDetector } from '../services/learning/interventionDetector';
import { LoadPipeline } from '../services/learning/load';
import { SafeStorage } from '../services/safeStorage';

/*
AI_CONTEXT:
DETERMINISTIC PROJECTION EXECUTOR
GameReducer is the authoritative state machine for the game loop.
It manages transitions between idle, playing, paused, and finished states.
Do not bypass the reducer for state changes; all gameplay events must flow 
through these action handlers to ensure deterministic state tracking.
*/

export const getHighScores = () => {
  return SafeStorage.getItem<any[]>(STORAGE_KEYS.SCORES, []);
};

export const saveHighScore = (score: number, totalSteps: number, time: number) => {
  const existing = getHighScores();
  existing.push({ date: new Date().toLocaleDateString(), score, totalSteps, time });
  existing.sort((a: any, b: any) => {
    const ratioA = a.score / a.totalSteps;
    const ratioB = b.score / b.totalSteps;
    if (ratioA !== ratioB) return ratioB - ratioA;
    return a.time - b.time;
  });
  SafeStorage.setItem(STORAGE_KEYS.SCORES, existing.slice(0, 5));
};

/*
AI_CONTEXT:
XPTracker manages the long-term engagement signals.
While not the primary cognitive engine, it provides the feedback loop 
necessary for sustained mental load exposure.
*/
export const XPTracker = {
  load() {
    return SafeStorage.getItem<any>(STORAGE_KEYS.XP, {});
  },
  save(data: any) {
    SafeStorage.setItem(STORAGE_KEYS.XP, data);
  },
  awardSessionXP(stats: any, mode: string) {
    const data = this.load();
    if (!data[mode]) data[mode] = { xp: 0, level: 1, bestStreak: 0, bestAccuracy: 0, sessionsPlayed: 0 };
    const mData = data[mode];

    let earned = stats.correct * 5;
    if (stats.incorrect === 0 && stats.timedOutCount === 0 && stats.totalAttempted > 0 && !stats.endedEarly) earned += 25;
    if (stats.accuracy >= 90) earned += 15;
    else if (stats.accuracy >= 75) earned += 8;
    if (!stats.endedEarly) earned += 10;

    let maxStreak = 0;
    let curStreak = 0;
    stats.steps.forEach((s: any) => {
      if (s.correct) {
        curStreak++;
        maxStreak = Math.max(maxStreak, curStreak);
      } else curStreak = 0;
    });
    if (maxStreak >= 10) earned += 10;

    mData.xp += earned;
    mData.level = Math.floor(mData.xp / 100) + 1;
    mData.bestStreak = Math.max(mData.bestStreak, maxStreak);
    mData.bestAccuracy = Math.max(mData.bestAccuracy, stats.accuracy);
    mData.sessionsPlayed += 1;

    this.save(data);
    return {
      earned,
      total: mData.xp,
      level: mData.level,
      progress: mData.xp % 100,
      bestStreak: mData.bestStreak,
      bestAccuracy: mData.bestAccuracy,
    };
  },
};

/*
AI_CONTEXT:
StatsTracker is the primary telemetry source for cognitive performance.
It records timing, accuracy, and mode-specific results.
Future mastery inference depends on the integrity of these recorded steps.
*/
export class StatsTracker {
  correctCount = 0;
  incorrectCount = 0;
  timeoutCount = 0;
  steps: any[] = [];
  endedEarly = false;
  currentStepStart = 0;

  constructor() {
    this.reset();
  }
  reset() {
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.timeoutCount = 0;
    this.steps = [];
    this.endedEarly = false;
    this.currentStepStart = 0;
  }
  setEndedEarly(v: boolean) {
    this.endedEarly = v;
  }
  startStep(virtualTime: number) {
    this.currentStepStart = virtualTime;
  }
  isInteractive(mode: GameMode) {
    return mode === 'normal' || mode === 'qmm';
  }

  recordCorrect(stepIndex: number, mode: GameMode, stepData: GameStep, config: AppConfig, virtualTime: number) {
    if (this.isInteractive(mode)) this.correctCount++;
    const timeTaken = virtualTime - this.currentStepStart;
    this.steps.push({ 
      step: stepIndex, 
      correct: true, 
      timeTakenMs: timeTaken * 1000, 
      timedOut: false, 
      mode,
      questionLabel: stepData.meta?.label,
      correctAnswer: stepData.correctAnswer
    });

    Telemetry.log('ANSWER_CORRECT', { timeTaken, mode, stepIndex, phase: stepData.meta?.traversalState?.phase || 'EXECUTE' }, stepIndex, mode, config, virtualTime);
    if (stepData && stepData.operation === '×') {
      LearningProgressMap.recordMultiplicationAttempt(stepData.value, stepData.startNumber, true);
    }
  }

  recordIncorrect(stepIndex: number, mode: GameMode, stepData: GameStep, selectedAnswer: number, config: AppConfig, virtualTime: number) {
    if (this.isInteractive(mode)) this.incorrectCount++;
    const timeTaken = virtualTime - this.currentStepStart;
    this.steps.push({ 
      step: stepIndex, 
      correct: false, 
      timeTakenMs: timeTaken * 1000, 
      timedOut: false, 
      mode,
      questionLabel: stepData.meta?.label,
      correctAnswer: stepData.correctAnswer
    });

    Telemetry.log('ANSWER_REJECT', { selectedAnswer, correctValue: stepData.correctAnswer, timeTaken, phase: stepData.meta?.traversalState?.phase || 'EXECUTE' }, stepIndex, mode, config, virtualTime);
    if (stepData && stepData.operation === '×') {
      LearningProgressMap.recordMultiplicationAttempt(stepData.value, stepData.startNumber, false);
    }
  }

  recordTimeout(stepIndex: number, mode: GameMode, stepData: GameStep, config: AppConfig, virtualTime: number) {
    const interactive = this.isInteractive(mode);
    if (interactive) this.timeoutCount++;
    const timeTaken = virtualTime - this.currentStepStart;
    this.steps.push({
      step: stepIndex,
      correct: !interactive,
      timeTakenMs: timeTaken * 1000,
      timedOut: true,
      mode,
      questionLabel: stepData.meta?.label,
      correctAnswer: stepData.correctAnswer
    });

    Telemetry.log('ANSWER_REJECT', { timedOut: true, timeTaken, phase: stepData.meta?.traversalState?.phase || 'EXECUTE' }, stepIndex, mode, config, virtualTime);
    if (interactive && stepData && stepData.operation === '×') {
      LearningProgressMap.recordMultiplicationAttempt(stepData.value, stepData.startNumber, false);
    }
  }

  getFinalStats(config?: AppConfig) {
    const total = this.steps.filter((s) => this.isInteractive(s.mode)).length;
    let stars = 1;
    if (this.endedEarly) stars = 0;
    else if (this.incorrectCount === 0) stars = this.timeoutCount === 0 ? 3 : 2;

    // Phase 4B: Compute Mastery Session Summary
    let masterySummary = null;
    let loadSummary = null;
    let interventionSummary = null;

    try {
      const errorWeights = config?.errorWeights || undefined;
      masterySummary = MasteryPipeline.compute(Telemetry.events, PlatformSkillOntology, errorWeights);
      
      // Phase 4C: Compute Load and Intervention Summaries
      if (masterySummary) {
        loadSummary = LoadPipeline.compute(Telemetry.events);
        interventionSummary = InterventionDetector.analyze(Telemetry.events, masterySummary);
      }
    } catch (e) {
      console.error('Learning computation failed', e);
    }

    const totalTimeSeconds = this.steps.reduce((acc, s) => acc + (s.timeTakenMs / 1000), 0);
    const avgResponseTime = total > 0 ? (totalTimeSeconds / total) : 0;

    return {
      correct: this.correctCount,
      incorrect: this.incorrectCount,
      mistakes: this.incorrectCount,
      totalAttempted: total,
      accuracy: total > 0 ? Math.round((this.correctCount / total) * 100) : 0,
      totalTime: totalTimeSeconds,
      avgResponseTime,
      timedOutCount: this.timeoutCount,
      stars,
      steps: [].concat(this.steps as any),
      endedEarly: this.endedEarly,
      masterySummary,
      loadSummary,
      interventionSummary
    };
  }
}

export const statsTracker = new StatsTracker();

export const GameStateMachine = {
  isValidTransition(from: string, to: string) {
    if (from === 'idle') return to === 'playing';
    if (from === 'playing') return to === 'paused' || to === 'finished' || to === 'playing';
    if (from === 'paused') return to === 'playing' || to === 'finished';
    if (from === 'finished') return to === 'playing' || to === 'idle';
    return false;
  },
  canSubmitAnswer(status: string, isEffectActive: boolean) {
    return status === 'playing' && !isEffectActive;
  },
};

export const gameReducer = (state: GameState, action: any): GameState => {
  console.log("Reducer received action:", action.type);
  const step = state.steps && state.steps[state.stepIndex];
  const isSystemTick = ['TICK', 'TOGGLE_PAUSE', 'CLEAR_EFFECTS', 'CLEAR_INIT_ERROR', 'EARLY_EXIT'].includes(action.type);
  if (state.status === 'playing' && step && step.mode === 'dark' && !isSystemTick) {
    if (action.type !== 'SUBMIT_ANSWER' && action.type !== 'TIMEOUT') return state;
  }

  switch (action.type) {
    case 'START_GAME': {
      if (!GameStateMachine.isValidTransition(state.status, 'playing')) return state;
      
      const seed = action.seed || Math.random().toString(36).substring(7);
      RandomService.init(seed);
      
      statsTracker.reset();
      orchestrator.reset();
      gameEngine.currentStepId = '';

      let startNum = RandomService.getInt(action.config.rangeMin, action.config.rangeMax);
      // Baseline Mode-Aware Execution Logic
      if (action.config.learningMode === 'skipcount') {
        const sb = action.config.skipBase || 7;
        let rMin = action.config.rangeMin || 0;
        let rMax = action.config.rangeMax || 100;
        let startMultMin = Math.ceil(rMin / sb);
        let startMultMax = Math.floor(rMax / sb);
        if (startMultMin > startMultMax) startMultMax = startMultMin;
        startNum = sb * RandomService.getInt(startMultMin, startMultMax);
      }

      console.log("Generating initial sequence for mode:", action.config.learningMode);
      let steps;
      try {
        steps = ProblemGenerator.generateSequence(startNum, action.config);
        console.log("Generated steps:", steps);
      } catch (e) {
        console.error("CRITICAL: ProblemGenerator.generateSequence threw an error:", e);
        return { ...state, status: 'idle', initError: `Generation Error: ${e instanceof Error ? e.message : String(e)}` };
      }
      
      if (!steps) {
        console.error("Generator failed to create a valid step path.");
        return { ...state, status: 'idle', initError: 'Generator failed to create a valid step path.' };
      }

      const initNum = steps[0].startNumber !== undefined ? steps[0].startNumber : startNum;
      const distractors = steps[0].distractors;

      statsTracker.startStep(0);
      
      return {
        status: 'playing',
        currentNumber: initNum,
        stepIndex: 0,
        steps,
        errorCount: 0,
        elapsedTime: 0,
        virtualTime: 0,
        seed,
        // Future Cognitive Engine Layer — Non-Authoritative in Current Gameplay Model
        matrix: '[]', // Inert placeholder for experimental schema
        activeMasks: [], // Inert placeholder for experimental schema
        isPaused: false,
        lives: action.config.activeMode === 'survival' ? 3 : 999,
        distractors,
        flashState: null,
        shake: false,
        opUpdateAnim: false,
        lastEvent: 'start',
        initError: null,
        timedOutLocked: false,
        streakCount: 0,
      };
    }
    case 'TICK':
      return !GameStateMachine.canSubmitAnswer(state.status, false) || state.isPaused
        ? state
        : { ...state, elapsedTime: state.elapsedTime + 1, virtualTime: state.virtualTime + 1 };
    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused };
    case 'SUBMIT_ANSWER': {
      if (!GameStateMachine.canSubmitAnswer(state.status, !!state.flashState)) return state;
      const step = state.steps[state.stepIndex];
      const isCorrect = Number(action.answer) === Number(step.correctAnswer);

      if (action.config.progressionMode === 'adaptive') orchestrator.recordStepResult(isCorrect);
      if (isCorrect) {
        statsTracker.recordCorrect(state.stepIndex + 1, step.mode, step, action.config, state.virtualTime);
        if (state.stepIndex >= state.steps.length - 1) {
          return { ...state, status: 'finished', lastEvent: 'win', flashState: 'correct', streakCount: state.streakCount + 1 };
        }
        const nextStep = state.steps[state.stepIndex + 1];
        const nxtNum = nextStep.startNumber !== undefined ? nextStep.startNumber : step.correctAnswer;
        const distractors = nextStep.distractors;

        statsTracker.startStep(state.virtualTime);

        return {
          ...state,
          currentNumber: nxtNum,
          stepIndex: state.stepIndex + 1,
          distractors,
          flashState: 'correct',
          opUpdateAnim: true,
          timedOutLocked: false,
          streakCount: state.streakCount + 1,
          lastEvent: nextStep.mode !== step.mode ? 'mode_change' : 'correct',
          failedCurrentStep: false
        };
      }
      statsTracker.recordIncorrect(state.stepIndex + 1, step.mode, step, action.answer, action.config, state.virtualTime);
      const lives = Math.max(0, state.lives - 1);
      if (action.config.activeMode === 'survival' && lives <= 0) {
        statsTracker.setEndedEarly(true);
        return {
          ...state,
          errorCount: state.errorCount + 1,
          lives: 0,
          status: 'finished',
          flashState: 'incorrect',
          lastEvent: 'incorrect',
          streakCount: 0,
        };
      }
      return { 
        ...state, 
        errorCount: state.errorCount + 1, 
        lives, 
        flashState: 'incorrect', 
        shake: true, 
        lastEvent: 'incorrect', 
        streakCount: 0, 
        failedCurrentStep: action.config.pedagogicalFailSafe !== false 
      };
    }
    case 'TIMEOUT': {
      const step = state.steps[state.stepIndex];
      statsTracker.recordTimeout(state.stepIndex + 1, step.mode, step, action.config, state.virtualTime);
      if (action.config.progressionMode === 'adaptive' && step.mode !== 'dark') orchestrator.recordStepResult(false);
      if (step.mode === 'dark') {
        if (state.stepIndex >= state.steps.length - 1) {
          return { ...state, status: 'finished', lastEvent: 'timeout' };
        }
        const nextStep = state.steps[state.stepIndex + 1];
        const nxtNum = nextStep.startNumber !== undefined ? nextStep.startNumber : step.correctAnswer;
        const distractors = nextStep.distractors;

        statsTracker.startStep(state.virtualTime);

        return {
          ...state,
          currentNumber: nxtNum,
          stepIndex: state.stepIndex + 1,
          distractors,
          opUpdateAnim: true,
          timedOutLocked: false,
          streakCount: 0,
          lastEvent: nextStep.mode !== step.mode ? 'mode_change' : 'step_advance',
          failedCurrentStep: false
        };
      } else {
        const lives = Math.max(0, state.lives - (action.config.activeMode === 'survival' ? 1 : 0));
        if (action.config.activeMode === 'survival' && lives <= 0) {
          statsTracker.setEndedEarly(true);
          return {
            ...state,
            errorCount: state.errorCount + 1,
            lives: 0,
            status: 'finished',
            flashState: 'incorrect',
            streakCount: 0,
            lastEvent: 'timeout',
          };
        }
        return { 
          ...state, 
          lives, 
          timedOutLocked: true, 
          lastEvent: 'timeout', 
          streakCount: 0,
          failedCurrentStep: false 
        };
      }
    }
    case 'EARLY_EXIT':
      statsTracker.setEndedEarly(true);
      return { ...state, status: 'finished', lastEvent: 'none' };
    case 'CLEAR_EFFECTS':
      return { ...state, flashState: null, shake: false, opUpdateAnim: false, lastEvent: 'none' };
    case 'CLEAR_INIT_ERROR':
      return { ...state, initError: null };
    case 'EXIT_TO_IDLE':
      statsTracker.setEndedEarly(true);
      return { ...state, status: 'idle', lastEvent: 'none', steps: [] };
    default:
      return state;
  }
};

export const telemetryGameReducer = (state: GameState, action: any): GameState => {
  const nextState = gameReducer(state, action);
  
  if (action.type !== 'TICK' && action.type !== 'CLEAR_EFFECTS') {
    Telemetry.log('STATE_TRANSITION', { action: action.type, nextStateStatus: nextState.status, step: nextState.stepIndex }, nextState.stepIndex, nextState.currentMode || null, action.config, nextState.virtualTime);
  }
  
  if (action.type === 'START_GAME') {
    Telemetry.log('SESSION_START', { config: action.config, seed: nextState.seed }, 0, null, action.config, 0);
    Telemetry.log('SETTINGS_APPLIED', { config: action.config }, 0, null, action.config, 0);
  }

  // Handle side effects when game finishes
  if (nextState.status === 'finished' && state.status !== 'finished') {
    const finalStats = statsTracker.getFinalStats(action.config);
    saveHighScore(finalStats.correct, nextState.steps.length, nextState.elapsedTime);
    XPTracker.awardSessionXP(finalStats, action.config.activeMode || 'normal');
    Telemetry.log('SESSION_END', { stats: finalStats }, nextState.stepIndex, null, action.config, nextState.virtualTime);
  }

  // Log cognitive load when a new step is initialized or advanced
  const isNewStep = (action.type === 'START_GAME' && nextState.status === 'playing') || 
                    (nextState.stepIndex !== state.stepIndex && nextState.status === 'playing');
  
  if (isNewStep) {
    const currentStep = nextState.steps[nextState.stepIndex];
    const config = action.config || (state as any).config;
    const load = CognitiveLoadModel.computeLoadForStep(currentStep, config, { 
      stepIndex: nextState.stepIndex, 
      totalSteps: nextState.steps.length 
    });
    Telemetry.log('COGNITIVE_LOAD_STEP', { stepIndex: nextState.stepIndex, load, phase: currentStep.meta?.traversalState?.phase || 'EXECUTE' }, nextState.stepIndex, currentStep.mode, config, nextState.virtualTime);
  }

  return nextState;
};
