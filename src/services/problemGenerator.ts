/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
PROTECTED CORE ENGINE FILE: Do not modify without explicit PM approval.
*/

import { AppConfig, GameStep, CurriculumBlock, Modifier } from '../types';
import { Telemetry } from './telemetry';
import { MathTraversalEngine, EngineContractValidator } from './mathEngine';
import { PhaseScheduler, orchestrator } from './orchestrator';
import { INITIAL_CURRICULUM_BLOCKS } from '../constants';
import { RandomService } from './randomService';
import { getModeContract } from './modeContract';
import { DifficultyEngine } from './difficulty/difficultyEngine';
import { DifficultyPlan, DifficultyVector, RampPhase } from './difficulty/difficultyTypes';
import { modeController } from './timing';

/*
AI_CONTEXT:
PROCEDURAL TAPE COMPILER
This module is the high-level pathfinder and problem constructor.
It is responsible for:
- generating mathematical paths that satisfy cognitive constraints
- decomposing operations into multiple modifiers to increase mental load
- generating distractors based on mode-specific cognitive interference goals
- applying timing semantics per mode

Do not simplify the path generation or distractor logic.
Future expansion will include "Cognitive Load Modeling" to dynamically adjust 
interference density based on real-time telemetry.
*/

const applyOp = (a: number, op: string, b: number) =>
  op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a % b === 0 ? a / b : null;

/*
AI_CONTEXT:
DecomposeStep increases working memory strain by splitting a single operation 
into multiple symbolic parts. This forces the user to maintain a running total 
while processing secondary and tertiary modifiers.
*/
const decomposeStep = (op: string, val: number, count: number, rangeMax: number, modifierMagnitude: number = 1, variableLabel?: string): Modifier[] => {
  if (variableLabel) return [{ operation: op, value: val, text: variableLabel, position: 'bottom' }];
  if (op === '×' || op === '÷' || count === 1) return [{ operation: op, value: val, position: 'bottom' }];
  const net = op === '+' ? val : -val;
  const makeMod = (n: number, pos: 'left' | 'right' | 'bottom' | 'top'): Modifier => ({
    operation: n >= 0 ? '+' : '-',
    value: Math.abs(n),
    position: pos,
  });
  const scaledRange = Math.min(rangeMax, Math.max(1, modifierMagnitude * 5));
  let pA = RandomService.getInt(net - scaledRange, net + scaledRange) || 1;
  if (count === 2) return [makeMod(pA, 'left'), makeMod(net - pA, 'right')];
  let pB = RandomService.getInt(net - pA - scaledRange, net - pA + scaledRange) || 1;
  if (count === 3) return [makeMod(pA, 'left'), makeMod(pB, 'right'), makeMod(net - pA - pB, 'bottom')];
  let pC = RandomService.getInt(net - pA - pB - scaledRange, net - pA - pB + scaledRange) || 1;
  return [makeMod(pA, 'left'), makeMod(pB, 'right'), makeMod(pC, 'top'), makeMod(net - pA - pB - pC, 'bottom')];
};

const getCurriculumForStep = (stepNumber: number): CurriculumBlock => {
  const blocks = INITIAL_CURRICULUM_BLOCKS;
  for (const block of blocks) {
    if (stepNumber >= block.start && stepNumber <= block.end) return block;
  }
  return blocks[blocks.length - 1];
};

const getSafeRange = (difficulty: number) => {
  if (difficulty <= 1) return { min: 1, max: 20 };
  if (difficulty <= 2) return { min: 1, max: 30 };
  if (difficulty <= 3) return { min: 1, max: 50 };
  return { min: 1, max: 70 };
};

export const ProblemGenerator = {
  generateSequence(startNumber: number, config: AppConfig): GameStep[] | null {
    console.log('[GEN CONFIG TRACE]', {
      mode: config.learningMode || config.activeMode || 'standard',
      operation: (config as any).operation,
      difficulty: config.difficultyLevel,
      totalSteps: config.totalSteps,
      answerChoices: config.answerChoices,
      table: config.selectedTables,
      skipSize: (config as any).skipSize,
      fullConfig: config
    });
    if (config.forcedQuestion) {
      const { questionLabel, correctAnswer, startNumber: fStart, value: fVal, operation: fOp } = config.forcedQuestion;
      const numAnswer = typeof correctAnswer === 'string' ? parseFloat(correctAnswer) : correctAnswer;
      const distractors = this.generateDistractors(numAnswer, config, 3);
      
      const step: GameStep = {
        startNumber: fStart !== undefined ? fStart : null,
        operation: fOp || 'forced',
        value: fVal !== undefined ? fVal : null,
        correctAnswer: numAnswer,
        distractorCount: distractors.length,
        distractors: distractors,
        timerSeconds: config.quickMindInterval || 10,
        mode: config.learningMode as any,
        modifiers: [{ operation: fOp || '+', value: fVal || 0, position: 'bottom', text: questionLabel }],
        meta: {
          forced: true,
          label: questionLabel
        }
      };
      return [step];
    }

    const allowedMax = (config.targetNumber ?? 20) + (config.targetFlex ?? 0);
    let safeStartNumber = startNumber;

    if (config.learningMode === 'standard') {
      safeStartNumber = Math.min(startNumber, allowedMax);
    } else if (config.learningMode === 'mixed') {
      const { min, max } = getSafeRange(config.difficultyLevel || 1);
      safeStartNumber = Math.max(min, Math.min(startNumber, max));
    }

    Telemetry.log('GENERATOR_START', { startNumber: safeStartNumber, mode: config.learningMode });
    const pluginModes = ['skipcount', 'skip_rhythm', 'multiplication', 'multiplication_linear', 'multiplication_pattern', 'pattern'];

    if (pluginModes.includes(config.learningMode)) {
      const pResult = this.buildPluginSequence(safeStartNumber, config);
      if (pResult) {
        console.log('[STEP TRACE]', pResult.slice(0, 20).map((s, i) => ({ i, startNumber: s.startNumber, value: s.value, operation: s.operation, correctAnswer: s.correctAnswer, distractors: s.distractors, distractorCount: s.distractorCount, source: s.meta?.forced ? 'forced' : 'plugin', fallbackUsed: (s as any).fallbackUsed })));
      }
      return pResult;
    }
    for (let tries = 0; tries < 250; tries++) {
      const result = this.tryGeneratePath(safeStartNumber, config.totalSteps, config);
      if (result) {
        console.log('[STEP TRACE]', result.slice(0, 20).map((s, i) => ({ i, startNumber: s.startNumber, value: s.value, operation: s.operation, correctAnswer: s.correctAnswer, distractors: s.distractors, distractorCount: s.distractorCount, source: s.meta?.forced ? 'forced' : 'engine', fallbackUsed: (s as any).fallbackUsed })));
        return result;
      }
    }

    Telemetry.log('GENERATOR_FAILSAFE_TRIGGERED', { reason: 'Path generation exhausted tries' });
    return null;
  },

  buildPluginSequence(startNumber: number, config: AppConfig): GameStep[] {
    const steps: GameStep[] = [];
    let currentValue = startNumber;
    let traversalState = {};
    const difficultyLevel = config.difficultyLevel || 5;

    // Engine Guard: Enforce single table for linear mode
    const safeConfig = { ...config };
    if (safeConfig.learningMode === 'multiplication_linear' && safeConfig.selectedTables && safeConfig.selectedTables.length > 1) {
      safeConfig.selectedTables = [safeConfig.selectedTables[0]];
      safeConfig.multBase = safeConfig.selectedTables[0];
    }

    for (let i = 0; i < safeConfig.totalSteps; i++) {
      let mode = PhaseScheduler.getModeForStep(i, safeConfig.phaseSequence);

      const isMultMode = safeConfig.learningMode === 'multiplication' || 
                         safeConfig.learningMode === 'multiplication_linear' || 
                         safeConfig.learningMode === 'multiplication_pattern';

      if (isMultMode || safeConfig.learningMode === 'pattern') {
        mode = 'normal';
      }

      const rampPhase = DifficultyEngine.getRampPhase(i, safeConfig.totalSteps);
      const difficultyPlan = DifficultyEngine.resolveDifficultyPlan(difficultyLevel, rampPhase, safeConfig);
      const diffVector = difficultyPlan.difficultyVector;

      const contract = getModeContract(mode);
      const learningContract = getModeContract(safeConfig.learningMode);

      let timerSeconds = modeController.getStepTimer(mode, safeConfig.learningMode, safeConfig, diffVector.timerSeconds);

      const state = { currentValue, stepIndex: i, totalSteps: safeConfig.totalSteps, traversalState };
      const result = MathTraversalEngine.getNextValue(state, safeConfig);

      const nextValue = result.nextValue;
      if (isNaN(nextValue)) {
        console.error('ProblemGenerator: nextValue is NaN', { state, result });
      }
      traversalState = result.traversalState;

      const op = result.operation || '+';
      const val = result.value || 0;
      const distractorCount = diffVector.distractorCount || 2;

      const step: GameStep = {
        startNumber: result.startNumber,
        operation: op,
        value: val,
        modifiers: [{ operation: op, value: val, position: 'bottom' }],
        mode,
        correctAnswer: nextValue,
        distractorCount: distractorCount,
        distractors: [],
        timerSeconds: timerSeconds,
        meta: { ...(result.meta || {}), traversalState: result.traversalState, difficultyPlan },
        _curriculumBlock: null,
        difficultyMeta: {
          level: difficultyPlan.globalLevel,
          rampPhase: difficultyPlan.rampPhase,
          difficultyVector: difficultyPlan.difficultyVector
        }
      };

      step.distractors = this.generateDistractors(step.correctAnswer, step, config, diffVector);

      const allOptions = [step.correctAnswer, ...step.distractors];
      if (new Set(allOptions).size < (config.answerChoices || 4)) {
        if (process.env.NODE_ENV !== 'production') console.error('Distractor contract failed in plugin sequence, overriding', { allOptions });
        step.distractors = this.generateDistractors(step.correctAnswer, step, {...config, answerChoices: config.answerChoices || 4}, diffVector); // Force regenerate
        // The generateDistractors method's fallback is very robust now, but if it somehow still failed we just let it pass
      }

      EngineContractValidator.validateStep(step, config);
      steps.push(step);
      Telemetry.log('GENERATOR_STEP_CREATED', { stepIndex: i, startNumber: step.startNumber, answer: step.correctAnswer });
      currentValue = nextValue;
    }
    return steps;
  },

  tryGeneratePath(startNumber: number, stepsNeeded: number, config: AppConfig): GameStep[] | null {
    orchestrator.reset();
    let currentVal = startNumber;
    const steps: GameStep[] = [];
    let lastOp: string | null = null;
    const allowedMin = config.rangeMin ?? 0;
    const allowedMax = (config.targetNumber ?? 20) + (config.targetFlex ?? 0);
    const difficultyLevel = config.difficultyLevel || 5;

    for (let i = 0; i < stepsNeeded; i++) {
      const stepNumber = i + 1;
      let mode = PhaseScheduler.getModeForStep(i, config.phaseSequence);

      if (config.learningMode === 'multiplication' || 
          config.learningMode === 'multiplication_linear' || 
          config.learningMode === 'multiplication_pattern' || 
          config.learningMode === 'pattern') mode = 'normal';

      const contract = getModeContract(mode);

      const rampPhase = DifficultyEngine.getRampPhase(i, stepsNeeded);
      const difficultyPlan = DifficultyEngine.resolveDifficultyPlan(difficultyLevel, rampPhase, config);
      const diffVector = { ...difficultyPlan.difficultyVector };

      let curriculumBlock: CurriculumBlock | null = null;
      let opsPool: string[] = [];
      
      let allowVariables = false;
      let allowComplexOps = true;

      if (config.progressionMode === 'curriculum') {
        curriculumBlock = getCurriculumForStep(stepNumber);
        // Curriculum overrides applied directly to diffVector
        diffVector.rangeMax = curriculumBlock.rangeMax;
        diffVector.modifierCount = curriculumBlock.modifiers;
        diffVector.distractorCount = curriculumBlock.distractors;
        diffVector.timerSeconds = curriculumBlock.timer;
        
        allowVariables = !!curriculumBlock.variables;
        allowComplexOps = curriculumBlock.operations.includes('×') || curriculumBlock.operations.includes('÷');
        
        opsPool = ['+', '-', '×', '÷'].filter((op) => config.opsEnabled[op] && curriculumBlock!.operations.includes(op));
        if (opsPool.length === 0) opsPool = ['+'];
      } else {
        const profile = orchestrator.getNextStepProfile(i, stepsNeeded, config.phaseSequence);
        // Orchestrator only provides non-difficulty parameters
        allowVariables = profile.tier.allowVariables;
        allowComplexOps = profile.tier.allowComplexOps;
        
        opsPool = Object.keys(config.opsEnabled).filter((k) => config.opsEnabled[k]);
        if (!allowComplexOps) opsPool = opsPool.filter((o) => o === '+' || o === '-');
      }

      const jumpMax = diffVector.jumpMax;
      const effectiveAllowedMax = Math.min(allowedMax, diffVector.rangeMax);
      let timerSeconds = diffVector.timerSeconds;

      timerSeconds = modeController.getStepTimer(mode, config.learningMode, config, timerSeconds);

      let foundStep = false;

      for (let fallbackStage = 1; fallbackStage <= 5; fallbackStage++) {
        const currentDiffVector = { ...diffVector };

        if (fallbackStage >= 2) {
          currentDiffVector.modifierCount = Math.max(1, currentDiffVector.modifierCount - 1);
        }
        if (fallbackStage >= 3) {
          currentDiffVector.jumpMax = Math.floor(currentDiffVector.jumpMax * 1.5) + 5;
          currentDiffVector.rangeMax = Math.floor(currentDiffVector.rangeMax * 1.5) + 5;
        }
        if (fallbackStage >= 4) {
          const simLevels = ['low', 'medium', 'high', 'very high', 'extreme'];
          const idx = simLevels.indexOf(currentDiffVector.distractorSimilarity);
          if (idx > 0) currentDiffVector.distractorSimilarity = simLevels[idx - 1] as any;
        }

        const jumpMax = currentDiffVector.jumpMax;
        const effectiveAllowedMax = Math.min(allowedMax, currentDiffVector.rangeMax);
        let timerSeconds = currentDiffVector.timerSeconds;
        timerSeconds = modeController.getStepTimer(mode, config.learningMode, config, timerSeconds);

        if (fallbackStage === 5) {
          const safeOp = currentVal < effectiveAllowedMax ? '+' : '-';
          let val = safeOp === '+' ? Math.min(3, effectiveAllowedMax - currentVal) : Math.min(3, currentVal - allowedMin);
          val = Math.max(1, val);
          const nextVal = applyOp(currentVal, safeOp, val);
          
          if (nextVal !== null && nextVal >= allowedMin && nextVal <= effectiveAllowedMax) {
            const step: GameStep = {
              startNumber: currentVal,
              operation: safeOp,
              value: val,
              modifiers: [{ operation: safeOp, value: val, text: undefined, position: 'bottom' }],
              mode,
              correctAnswer: nextVal,
              distractorCount: currentDiffVector.distractorCount,
              distractors: [],
              timerSeconds,
              _curriculumBlock: curriculumBlock,
              meta: { difficultyPlan },
              difficultyMeta: {
                level: difficultyPlan.globalLevel,
                rampPhase: difficultyPlan.rampPhase,
                difficultyVector: currentDiffVector
              }
            };
            
            step.distractors = this.generateDistractors(step.correctAnswer, step, config, currentDiffVector);
            
            try {
              EngineContractValidator.validateStep(step, config);
              steps.push(step);
              console.log(`Generator fallback stage ${fallbackStage} used`, { difficultyVector: currentDiffVector });
              Telemetry.log(`GENERATOR_FALLBACK_STAGE_${fallbackStage}_USED`, { difficultyVector: currentDiffVector });
              Telemetry.log('GENERATOR_STEP_CREATED', { stepIndex: i, startNumber: step.startNumber, answer: step.correctAnswer });
              currentVal = nextVal;
              lastOp = safeOp;
              foundStep = true;
              break;
            } catch (e) {
              // Fall through to emergency
            }
          }
          continue;
        }

        for (let attempt = 0; attempt < 10; attempt++) {
          opsPool = RandomService.shuffle(opsPool);
          
          for (const op of opsPool) {
            if (op === '×' && lastOp === '×') continue;
            const val = this.selectOpValue(op, currentVal, currentDiffVector.rangeMax, allowedMin, effectiveAllowedMax, jumpMax);
            if (val === null) continue;
            const nextVal = applyOp(currentVal, op, val);
            if (nextVal === null || !Number.isInteger(nextVal) || nextVal < allowedMin || nextVal > effectiveAllowedMax) continue;

            let variable = undefined, label = undefined;
            if (allowVariables && RandomService.chance(0.15)) {
              const x = RandomService.getInt(2, Math.min(9, currentDiffVector.rangeMax));
              if (val === x) label = 'x';
              else if (val === x * 2) label = '2x';
              if (label) variable = { name: 'x', value: x };
            }

            const modifiers = decomposeStep(op, val, currentDiffVector.modifierCount, currentDiffVector.rangeMax, currentDiffVector.modifierMagnitude, label);

            const step: GameStep = {
              startNumber: currentVal,
              operation: op,
              value: val,
              modifiers,
              mode,
              variable,
              correctAnswer: nextVal,
              distractorCount: currentDiffVector.distractorCount,
              distractors: [],
              timerSeconds,
              _curriculumBlock: curriculumBlock,
              meta: { difficultyPlan },
              difficultyMeta: {
                level: difficultyPlan.globalLevel,
                rampPhase: difficultyPlan.rampPhase,
                difficultyVector: currentDiffVector
              }
            };

            step.distractors = this.generateDistractors(step.correctAnswer, step, config, currentDiffVector);

            const allOptions = [step.correctAnswer, ...step.distractors];
            if (new Set(allOptions).size < (config.answerChoices || 4)) {
              if (process.env.NODE_ENV !== 'production') console.error('Distractor contract failed, rejecting step', { allOptions });
              continue; // Reject and try next op/attempt
            }

            try {
              EngineContractValidator.validateStep(step, config);
              steps.push(step);
              if (fallbackStage > 1) {
                console.log(`Generator fallback stage ${fallbackStage} used`, { difficultyVector: currentDiffVector });
                Telemetry.log(`GENERATOR_FALLBACK_STAGE_${fallbackStage}_USED`, { difficultyVector: currentDiffVector });
              }
              Telemetry.log('GENERATOR_STEP_CREATED', { stepIndex: i, startNumber: step.startNumber, answer: step.correctAnswer });

              currentVal = nextVal;
              lastOp = op;
              foundStep = true;
              break;
            } catch (e) {
              // Validation failed, try next op
              continue;
            }
          }
          if (foundStep) break;
        }
        if (foundStep) break;
      }

      if (!foundStep) {
        // Absolute emergency fallback to guarantee a valid step is returned
        const safeOp = currentVal < allowedMax ? '+' : '-';
        const val = safeOp === '+' ? 1 : (currentVal > allowedMin ? 1 : 0);
        const nextVal = safeOp === '+' ? currentVal + val : currentVal - val;
        
        const step: GameStep = {
          startNumber: currentVal,
          operation: safeOp,
          value: val,
          modifiers: [{ operation: safeOp, value: val, text: undefined, position: 'bottom' }],
          mode,
          correctAnswer: nextVal,
          distractorCount: diffVector.distractorCount || 1,
          distractors: [],
          timerSeconds: diffVector.timerSeconds,
          _curriculumBlock: curriculumBlock,
          meta: { difficultyPlan },
          difficultyMeta: {
            level: difficultyPlan.globalLevel,
            rampPhase: difficultyPlan.rampPhase,
            difficultyVector: diffVector
          }
        };
        
        const dists = new Set<number>();
        let offset = 1;
        const targetCount = Math.max(step.distractorCount, 3);
        while (dists.size < targetCount) {
            if (nextVal + offset !== nextVal) dists.add(nextVal + offset);
            if (dists.size < targetCount && nextVal - offset !== nextVal) dists.add(nextVal - offset);
            offset++;
        }
        step.distractors = Array.from(dists);
        
        steps.push(step);
        console.log(`Generator fallback emergency used`, { difficultyVector: diffVector });
        Telemetry.log(`GENERATOR_FALLBACK_EMERGENCY_USED`, { difficultyVector: diffVector });
        currentVal = nextVal;
        lastOp = safeOp;
      }

      if (config.learningMode === 'mixed') {
        const { min, max } = getSafeRange(config.difficultyLevel || 1);
        if (currentVal > max) {
          console.warn('[RANGE DRIFT DETECTED]', { currentNumber: currentVal, max, config });
        }
        currentVal = Math.max(min, Math.min(currentVal, max));
      }
    }
    return steps;
  },

  selectOpValue(op: string, curr: number, rangeMax: number, allowedMin: number, allowedMax: number, jumpMax: number = 15) {
    const maxJump = Math.min(rangeMax, jumpMax);
    if (op === '+') return RandomService.getInt(1, Math.min(maxJump, Math.max(1, allowedMax - curr)));
    if (op === '-') return Math.max(1, curr - allowedMin) < 1 ? null : RandomService.getInt(1, Math.min(maxJump, curr - allowedMin));
    if (op === '×') {
      const maxMult = Math.floor((curr + maxJump) / curr);
      return curr < 2 || Math.floor(allowedMax / curr) < 2 ? null : RandomService.getInt(2, Math.min(Math.max(2, maxMult), Math.floor(allowedMax / curr)));
    }
    const candidates = [];
    for (let i = 2; i <= 10; i++) {
      if (curr % i === 0 && curr / i >= allowedMin && curr / i <= allowedMax) {
        if (curr - (curr / i) <= maxJump) candidates.push(i);
      }
    }
    if (candidates.length === 0) {
      for (let i = 2; i <= 10; i++) {
        if (curr % i === 0 && curr / i >= allowedMin && curr / i <= allowedMax) candidates.push(i);
      }
    }
    return candidates.length ? RandomService.getElement(candidates) : null;
  },

  /*
  AI_CONTEXT:
  Tape Purity Restored — Phase S6
  Distractor Derivation Authority Path: generator → tape → reducer → UI
  
  Distractor generation is a critical cognitive interference tool.
  It must prevent "elimination by estimation" and force precise symbolic manipulation.
  Different modes have different distractor philosophies (table confusion, sequence neighbors, etc.).
  */
  generateDistractors(correct: number, step: GameStep, config: AppConfig, diffVector?: DifficultyVector) {
    if (!Number.isFinite(correct) || isNaN(correct)) {
      console.error('ProblemGenerator: generateDistractors called with invalid correct answer', { step, config });
      correct = step.startNumber + (step.value || 0); // Fallback
    }
    const targetChoices = config.answerChoices || 4;
    const count = targetChoices - 1; // e.g. 3 distractors for 4 choices
    const opts = new Set([correct]);
    const mode = step.mode;
    const learningMode = config.learningMode;
    const contract = getModeContract(mode);
    const learningContract = getModeContract(learningMode);
    const similarity = diffVector?.distractorSimilarity || 'low';

    let spread = 10;
    if (similarity === 'medium') spread = 5;
    if (similarity === 'high') spread = 3;
    if (similarity === 'very high') spread = 2;
    if (similarity === 'extreme') spread = 1;

    // QMM Distractor Policy: Interference-heavy, close plausible competitors
    if (mode === 'qmm') {
      const offsets = [-2, -1, 1, 2, -10, 10, -5, 5].filter(o => Math.abs(o) <= spread || Math.abs(o) === 10);
      const cands = RandomService.shuffle(offsets)
        .map((o) => correct + o)
        .filter((v) => v > 0 && v !== correct);
      for (const c of cands) {
        if (opts.size > count) break;
        opts.add(c);
      }
    }

    if (learningMode === 'skipcount') {
      const sb = config.skipBase || 7;
      const cands = RandomService.shuffle([-3, -2, -1, 1, 2, 3])
        .map((o) => correct + o * sb)
        .filter((v) => v > 0 && v !== correct);
      for (const c of cands) {
        if (opts.size > count) break;
        opts.add(c);
      }
      let fallbackMult = Math.max(1, Math.round(correct / sb) + 4);
      while (opts.size <= count) {
        opts.add(fallbackMult * sb);
        fallbackMult++;
      }
    } else if (learningMode === 'skip_rhythm') {
      const sb = step.meta?.stepSize || 2;
      const cands = RandomService.shuffle([-3, -2, -1, 1, 2, 3])
        .map((o) => correct + o * sb)
        .filter((v) => v > 0 && v !== correct);
      for (const c of cands) {
        if (opts.size > count) break;
        opts.add(c);
      }
    } else if (learningMode === 'multiplication' || learningMode === 'multiplication_linear' || learningMode === 'multiplication_pattern') {
      const base = step.meta?.table || step.meta?.traversalState?.currentTable || config.multBase || 4;
      const factor = Math.round(correct / base);
      
      if (isNaN(correct)) {
        console.error('ProblemGenerator: correct answer is NaN', { step, config });
      }

      if (learningMode === 'multiplication_linear') {
        // Linear Mode Distractors: neighboring multiples in both dimensions
        const cands = [
          (factor - 1) * base,
          (factor + 1) * base,
          factor * (base - 1),
          factor * (base + 1)
        ].filter(v => v > 0 && v !== correct);
        
        for (const c of RandomService.shuffle(cands)) {
          if (opts.size > count) break;
          opts.add(c);
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log({
            mode: "multiplication_linear",
            table: base,
            factor,
            currentValue: step.startNumber,
            correctAnswer: correct,
            choices: Array.from(opts)
          });
        }
      } else {
        const cands = RandomService.shuffle([-3, -2, -1, 1, 2, 3])
          .map((o) => (factor + o) * base)
          .filter((v) => v > 0 && v !== correct);
        for (const c of cands) {
          if (opts.size > count) break;
          opts.add(c);
        }
      }
      
      let fallbackFactor = factor + 4;
      while (opts.size <= count) {
        opts.add(fallbackFactor * base);
        fallbackFactor++;
      }
    } else if (learningMode === 'pattern') {
      const pStep = step.value || 3;
      const cands = RandomService.shuffle([correct - pStep, correct + pStep, correct - 1, correct + 1, correct - 2, correct + 2])
        .filter((v) => v > 0 && v !== correct);
      for (const c of cands) {
        if (opts.size > count) break;
        opts.add(c);
      }
    } else if (mode !== 'qmm') {
      const offsets = [-3, -2, -1, 1, 2, 3].filter(o => Math.abs(o) <= spread);
      const cands = RandomService.shuffle(offsets.length ? offsets : [-1, 1])
        .map((o) => correct + o)
        .filter((v) => v > 0 && v !== correct);
      for (const c of cands) {
        if (opts.size > count) break;
        opts.add(c);
      }
    }

    let attempts = 0;
    while (opts.size <= count && attempts < 200) {
      // Prioritize close distractors first
      const currentSpread = attempts > 50 ? spread * 3 : spread;
      const d = RandomService.getInt(Math.max(1, correct - currentSpread), correct + currentSpread);
      if (d > 0 && Number.isFinite(d)) opts.add(d);
      attempts++;
    }
    
    // Absolute failsafe
    let fallback = correct + spread;
    while (opts.size <= count) {
      fallback++;
      if (fallback > 0 && Number.isFinite(fallback)) opts.add(fallback);
    }
    
    const finalDistractors = Array.from(opts);
    return RandomService.shuffle(finalDistractors);
  },
};

export const ProblemTypeEngine = {
  /*
  AI_CONTEXT:
  ProblemTypeEngine maps mathematical steps to visual problem structures.
  QMM is formalized as an interference-heavy mode where the center value is hidden, 
  forcing the user to maintain the mental state of the "current number" 
  while processing incoming modifiers.
  */
  createProblem(step: GameStep | null, centerValue: number, config: AppConfig) {
    if (!step) return null;

    const mode = config.learningMode;
    let problem = {
      type: 'standard',
      centerValue: centerValue,
      context: null as string | null,
      promptTitle: null as string | null,
      correctAnswer: step.correctAnswer,
      modifiers: step.modifiers || [],
    };

    const isMultMode = mode === 'multiplication' || 
                       mode === 'multiplication_linear' || 
                       mode === 'multiplication_pattern';

    if (isMultMode && step.operation === '×') {
      problem.modifiers = [{ operation: `×${step.value}`, value: '', position: 'bottom' }];
    } else if (mode === 'skipcount' || mode === 'skip_rhythm') {
      problem.modifiers = [{ operation: `${step.operation}${step.value}`, value: '', position: 'bottom' }];
    } else if (mode === 'pattern' && step.operation === 'pattern') {
      problem.type = 'sequence';
      problem.promptTitle = 'CONTINUE THE PATTERN';

      let seq = step.meta?.sequence || [];
      problem.context = seq.join(', ');
      problem.modifiers = [];
    }

    return problem;
  },
};
