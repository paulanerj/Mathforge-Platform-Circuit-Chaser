/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
VERSION: Multiplication Engine v1.0
STATUS: Stable & Frozen
PROTECTED CORE ENGINE FILE: Do not modify without explicit PM approval.
*/

import { Telemetry } from './telemetry';
import { RandomService } from './randomService';
import { PatternEngine } from './patternEngine';

/*
AI_CONTEXT:
ARITHMETIC TRAVERSAL BASELINE
Arithmetic Traversal Model — Baseline Cognitive Execution Strategy
This module is the core deterministic traversal engine.
It defines how the game state moves through mathematical space.
Do not simplify the traversal logic; it exists to increase symbolic manipulation fluency.
Future mastery inference depends on the deterministic exposure cadence defined here.
*/

export const EngineContractValidator = {
  validateStep: (step: any, config?: any) => {
    if (typeof step.startNumber !== 'number') throw new Error('EngineContractViolation: invalid startNumber');
    if (typeof step.correctAnswer !== 'number') throw new Error('EngineContractViolation: invalid correctAnswer');
    if (!step.operation) throw new Error('EngineContractViolation: missing operation');

    if (step.distractors && Array.isArray(step.distractors)) {
      const unique = new Set(step.distractors);
      if (unique.size !== step.distractors.length) {
        throw new Error('EngineContractViolation: distractors are not unique');
      }
      const correctCount = step.distractors.filter((d: number) => d === step.correctAnswer).length;
      if (correctCount > 1) {
        throw new Error('EngineContractViolation: distractors contain multiple correctAnswers');
      }
      if (correctCount === 0) {
        throw new Error('EngineContractViolation: correct answer missing from distractors');
      }
    }

    if (config) {
      const allowedMin = config.rangeMin ?? 0;
      const rangeMax = step.difficultyMeta?.difficultyVector?.rangeMax ?? config.rangeMax ?? 100;
      const allowedMax = (config.targetNumber ?? 20) + (config.targetFlex ?? 0);
      const effectiveMax = Math.min(allowedMax, rangeMax);
      
      if (step.correctAnswer < allowedMin || step.correctAnswer > effectiveMax) {
        // Only enforce bounds for standard arithmetic, plugins might exceed
        if (step.mode === 'normal' || step.mode === 'qmm' || step.mode === 'dark') {
          if (config.learningMode === 'standard') {
             throw new Error(`EngineContractViolation: correctAnswer ${step.correctAnswer} out of bounds [${allowedMin}, ${effectiveMax}]`);
          }
        }
      }
    }
  },
  validateGeneratedStep: (step: any, answers: number[]) => {
    if (!answers.includes(step.correctAnswer)) throw new Error('EngineContractViolation: correct answer missing');
    const duplicates = answers.filter((a) => a === step.correctAnswer);
    if (duplicates.length > 1) throw new Error('EngineContractViolation: multiple correct answers');
  },
  validateTraversal: (result: any) => {
    if (!Number.isInteger(result.nextValue)) throw new Error('EngineContractViolation: traversal produced non integer');
    if (result.nextValue === result.startNumber) throw new Error('EngineContractViolation: traversal produced no change');
  },
};

/*
AI_CONTEXT:
SkipCountTraversal trains directional mental modeling and sequence anticipation.
It uses a phase-based approach (ascend, descend, mixed) to increase cognitive load.
Do not simplify the "mixed" phase; it is designed to disrupt linear comfort.
*/
export const skipCountTraversal = (state: any, config: any) => {
  const base = config.skipBase || 7;
  let rMin = config.rangeMin !== undefined ? config.rangeMin : 0;
  let rMax = config.rangeMax !== undefined ? config.rangeMax : 100;

  let minF = Math.max(1, Math.ceil(rMin / base));
  let maxF = Math.max(minF + 1, Math.floor(rMax / base));

  let tState = state.traversalState || {};

  if (state.stepIndex === 0 || !tState.phase) {
    tState = {
      phase: 'ascend',
      currentFactor: minF,
      minFactor: minF,
      maxFactor: maxF,
      hasReachedMax: false,
      hasReturnedToMin: false,
      coverageCyclesCompleted: 0,
      recentFactors: [],
    };
  } else {
    tState.minFactor = minF;
    tState.maxFactor = maxF;
    if (tState.currentFactor > maxF) tState.currentFactor = maxF;
    if (tState.currentFactor < minF) tState.currentFactor = minF;
  }

  let prevFactor = tState.currentFactor;
  let nextFactor;
  let oldPhase = tState.phase;

  if (tState.phase === 'ascend') {
    nextFactor = prevFactor + 1;
    if (nextFactor >= tState.maxFactor) {
      nextFactor = tState.maxFactor;
      tState.phase = 'descend';
      tState.hasReachedMax = true;
    }
  } else if (tState.phase === 'descend') {
    nextFactor = prevFactor - 1;
    if (nextFactor <= tState.minFactor) {
      nextFactor = tState.minFactor;
      tState.phase = 'mixed';
      tState.hasReturnedToMin = true;
      tState.coverageCyclesCompleted += 1;
    }
  } else {
    let candidates = [prevFactor + 1, prevFactor - 1, prevFactor + 2, prevFactor - 2].filter(
      (f) => f >= tState.minFactor && f <= tState.maxFactor && f !== prevFactor
    );
    let validCandidates = candidates.filter((f) => !(tState.recentFactors || []).includes(f));
    if (validCandidates.length === 0) validCandidates = candidates;

    if (validCandidates.length === 0) {
      nextFactor =
        tState.maxFactor === tState.minFactor
          ? tState.minFactor
          : prevFactor === tState.maxFactor
          ? prevFactor - 1
          : prevFactor + 1;
    } else {
      let step1 = validCandidates.filter((f) => Math.abs(f - prevFactor) === 1);
      let step2 = validCandidates.filter((f) => Math.abs(f - prevFactor) === 2);

      if (RandomService.chance(0.6) && step1.length > 0) {
        nextFactor = RandomService.getElement(step1);
      } else if (step2.length > 0) {
        nextFactor = RandomService.getElement(step2);
      } else {
        nextFactor = RandomService.getElement(validCandidates);
      }
    }
  }

  if (oldPhase !== tState.phase) {
    Telemetry.log('TRAVERSAL_PHASE_CHANGE', { base, factor: nextFactor, oldPhase, newPhase: tState.phase });
  }
  Telemetry.log('TRAVERSAL_DECISION', { base, prevFactor, nextFactor, phase: tState.phase, moveSize: nextFactor - prevFactor });

  tState.recentFactors = tState.recentFactors || [];
  tState.recentFactors.push(prevFactor);
  if (tState.recentFactors.length > 4) tState.recentFactors.shift();

  tState.currentFactor = nextFactor;

  let startValue = prevFactor * base;
  let nextValue = nextFactor * base;
  let move = nextValue - startValue;

  return {
    startNumber: startValue,
    nextValue: nextValue,
    operation: move >= 0 ? '+' : '-',
    value: Math.abs(move),
    traversalState: tState,
    meta: {},
  };
};

export const findNearestMultiple = (targetTable: number, currentNumber: number) => {
  const remainder = currentNumber % targetTable;
  if (remainder === 0) return currentNumber;
  const lower = currentNumber - remainder;
  const upper = lower + targetTable;
  if (lower <= 0) return upper;
  return (currentNumber - lower < upper - currentNumber) ? lower : upper;
};

/*
AI_CONTEXT:
MultiplicationPatternTraversal (formerly multiplicationTraversal) 
trains symbolic retrieval and factor-neighbor discrimination.
It supports transitioning between multiple tables using arithmetic steps.

STATUS: FROZEN (v1.0)
Do not modify unless a critical bug is discovered.
*/
export const multiplicationPatternTraversal = (state: any, config: any): any => {
  const selectedTables = config.selectedTables && config.selectedTables.length > 0 
    ? config.selectedTables 
    : [config.multBase || 4];
  const maxFactor = config.multMaxFactor || 10;
  const difficultyLevel = config.difficultyLevel || 5;

  let tState = state.traversalState || {};

  if (state.stepIndex === 0 || !tState.initialized) {
    tState = {
      initialized: true,
      currentTable: RandomService.getElement(selectedTables),
      stepsInCurrentTable: 0,
      targetRunLength: RandomService.getInt(6, 10),
      subPhase: 'multiplication',
      bridgePatternUsed: false,
    };
  }
  
  if (!tState.targetRunLength) {
    tState.targetRunLength = RandomService.getInt(6, 10);
  }

  const logTelemetry = (
    nextValue: number,
    skipSize: number,
    modifierUsed: boolean,
    bridgePatternUsed: boolean,
    transitionOccurred: boolean
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MultiplicationTelemetry]', {
        stepIndex: state.stepIndex,
        difficultyLevel,
        currentTable: tState.currentTable,
        stepsInCurrentTable: tState.stepsInCurrentTable,
        targetRunLength: tState.targetRunLength,
        skipSize,
        modifierUsed,
        bridgePatternUsed,
        overlapLanding: selectedTables.filter((t: number) => nextValue % t === 0).length > 1,
        transitionOccurred
      });
    }
  };

  const currentValue = state.currentValue;
  let depth = 0;
  const MAX_TRAVERSAL_DEPTH = 50;

  while (depth < MAX_TRAVERSAL_DEPTH) {
    depth++;
    let { currentTable, stepsInCurrentTable, targetRunLength, subPhase } = tState;
    let transitionOccurred = false;

    // Check if we should switch tables
    if (subPhase === 'arithmetic' && stepsInCurrentTable >= targetRunLength) {
      const availableTables = selectedTables.filter((t: number) => t !== currentTable);
      if (availableTables.length > 0) {
        let bestTable = availableTables[0];
        let minDistance = Infinity;
        for (const t of availableTables) {
          const nearest = findNearestMultiple(t, currentValue);
          const dist = Math.abs(nearest - currentValue);
          if (dist < minDistance) {
            minDistance = dist;
            bestTable = t;
          } else if (dist === minDistance && RandomService.chance(0.5)) {
            bestTable = t;
          }
        }
        currentTable = bestTable;
        stepsInCurrentTable = 0;
        targetRunLength = RandomService.getInt(6, 10);
        tState.currentTable = currentTable;
        tState.stepsInCurrentTable = stepsInCurrentTable;
        tState.targetRunLength = targetRunLength;
        transitionOccurred = true;
      }
    }

    if (subPhase === 'arithmetic') {
      let targetValue = currentValue;
      const maxVal = currentTable * maxFactor;

      if (currentValue % currentTable !== 0) {
        targetValue = findNearestMultiple(currentTable, currentValue);
        if (targetValue > maxVal) targetValue -= currentTable;
        if (targetValue <= 0) targetValue += currentTable;

        const diff = targetValue - currentValue;
        
        tState.currentTable = currentTable;
        tState.stepsInCurrentTable = stepsInCurrentTable + 1;
        tState.subPhase = 'arithmetic';

        logTelemetry(targetValue, 0, false, false, transitionOccurred);

        return {
          startNumber: currentValue,
          nextValue: targetValue,
          operation: diff >= 0 ? '+' : '-',
          value: Math.abs(diff),
          traversalState: tState,
          meta: {},
        };
      } else {
        const BRIDGE_TO_FACT_PROBABILITY = 0.20;
        if (RandomService.chance(BRIDGE_TO_FACT_PROBABILITY)) {
           tState.subPhase = 'multiplication';
           tState.bridgePatternUsed = true;
           continue;
        }

        const MULTIPLY_MODIFIER_PROBABILITY = 0.25;
        if (RandomService.chance(MULTIPLY_MODIFIER_PROBABILITY)) {
           let maxMod = 2;
           if (difficultyLevel >= 4 && difficultyLevel <= 6) maxMod = 3;
           if (difficultyLevel >= 7) maxMod = 4;
           
           const mod = RandomService.getInt(2, maxMod);
           if (currentValue * mod <= maxVal) {
             tState.currentTable = currentTable;
             tState.stepsInCurrentTable = stepsInCurrentTable + 1;
             
             logTelemetry(currentValue * mod, 0, true, false, transitionOccurred);

             return {
               startNumber: currentValue,
               nextValue: currentValue * mod,
               operation: '×',
               value: mod,
               traversalState: tState,
               meta: {},
             };
           }
        }

        let stepsToJump = 1;
        const r = RandomService.next();
        if (difficultyLevel <= 3) {
           if (r < 0.40) stepsToJump = 1;
           else if (r < 0.75) stepsToJump = 2;
           else if (r < 0.95) stepsToJump = 3;
           else stepsToJump = 4;
        } else if (difficultyLevel <= 6) {
           if (r < 0.25) stepsToJump = 1;
           else if (r < 0.60) stepsToJump = 2;
           else if (r < 0.85) stepsToJump = 3;
           else if (r < 0.95) stepsToJump = 4;
           else stepsToJump = 5;
        } else {
           if (r < 0.15) stepsToJump = 1;
           else if (r < 0.45) stepsToJump = 2;
           else if (r < 0.70) stepsToJump = 3;
           else if (r < 0.85) stepsToJump = 4;
           else if (r < 0.95) stepsToJump = 5;
           else stepsToJump = 6;
        }

        let direction = RandomService.chance(0.5) ? 1 : -1;
        if (currentValue + direction * stepsToJump * currentTable > maxVal) direction = -1;
        if (currentValue + direction * stepsToJump * currentTable <= 0) direction = 1;
        
        targetValue = currentValue + direction * stepsToJump * currentTable;
        
        if (targetValue > maxVal || targetValue <= 0) {
           targetValue = currentValue + (currentValue > currentTable ? -currentTable : currentTable);
        }
        
        const diff = targetValue - currentValue;
        
        tState.currentTable = currentTable;
        tState.stepsInCurrentTable = stepsInCurrentTable + 1;

        logTelemetry(targetValue, stepsToJump, false, false, transitionOccurred);

        return {
          startNumber: currentValue,
          nextValue: targetValue,
          operation: diff >= 0 ? '+' : '-',
          value: Math.abs(diff),
          traversalState: tState,
          meta: {},
        };
      }
    } else {
      // subPhase === 'multiplication'
      if (currentValue % currentTable !== 0) {
        tState.subPhase = 'arithmetic';
        continue; // Loop instead of recurse
      }

      const factor = Math.round(currentValue / currentTable);
      
      tState.currentTable = currentTable;
      tState.stepsInCurrentTable = stepsInCurrentTable + 1;
      tState.subPhase = 'arithmetic';

      const bridgeUsed = !!tState.bridgePatternUsed;
      tState.bridgePatternUsed = false;

      logTelemetry(currentValue, 0, false, bridgeUsed, transitionOccurred);

      return {
        startNumber: factor,
        nextValue: currentValue,
        operation: '×',
        value: currentTable,
        traversalState: tState,
        meta: {},
      };
    }
  }

  console.warn('Multiplication traversal fallback triggered', {
    depth,
    currentTable: tState.currentTable,
    selectedTables
  });

  return {
    startNumber: currentValue,
    nextValue: currentValue + 3,
    operation: '+',
    value: 3,
    traversalState: tState,
    meta: {},
  };
};

export const multiplicationTraversal = multiplicationPatternTraversal;


/**
 * MultiplicationLinearMode Traversal
 * Purpose: Teach pure multiplication table fluency through strictly linear progression.
 * 
 * STATUS: FROZEN (v1.0)
 * Do not modify unless a critical bug is discovered.
 */
export const linearMultiplicationTraversal = (state: any, config: any): any => {
  const table = config.selectedTables && config.selectedTables.length > 0 
    ? config.selectedTables[0] 
    : (config.multBase || 7);
  
  const maxFactor = config.multMaxFactor || 10; 
  const allowReverse = config.multAllowReverse ?? true;

  let tState = state.traversalState || {};

  if (state.stepIndex === 0 || !tState.initialized) {
    tState = {
      initialized: true,
      currentTable: table,
      currentFactor: 1,
      direction: 'forward',
    };
  }

  const prevFactor = tState.currentFactor;
  
  // Advance state for next step
  if (tState.direction === 'forward') {
    tState.currentFactor = prevFactor + 1;
    if (tState.currentFactor > maxFactor) {
      if (allowReverse) {
        tState.direction = 'backward';
        tState.currentFactor = maxFactor - 1;
      } else {
        tState.currentFactor = 1;
      }
    }
  } else {
    tState.currentFactor = prevFactor - 1;
    if (tState.currentFactor < 1) {
      tState.direction = 'forward';
      tState.currentFactor = 2;
    }
  }

  return {
    startNumber: prevFactor,
    nextValue: prevFactor * table,
    operation: '×',
    value: table,
    traversalState: tState,
    meta: { factor: prevFactor, table },
  };
};

/*
AI_CONTEXT:
PatternTraversal trains structural pattern recognition and predictive arithmetic flow.
It uses dynamic step sizes and reverse sequences to increase cognitive load.
Do not simplify the sequence generation; it is designed to disrupt linear pattern recognition.
*/
export const patternTraversal = (state: any, config: any) => {
  const result = PatternEngine.generateSequence(config);
  
  return {
    startNumber: result.sequence[0],
    nextValue: result.correctAnswer,
    operation: 'pattern',
    value: result.descriptor.parameters?.step || 3, // fallback value
    meta: { 
      sequence: result.sequence, 
      patternType: result.descriptor.patternType,
      descriptor: result.descriptor
    },
    traversalState: {},
  };
};

/**
 * Skip Rhythm Traversal
 * Purpose: Train multiplication intuition and number rhythm through structured skip-count sequences.
 */
export const skipRhythmTraversal = (state: any, config: any): any => {
  const difficultyLevel = config.difficultyLevel || 5;
  let tState = state.traversalState || {};

  if (state.stepIndex === 0 || !tState.initialized) {
    // Initialize step size based on difficulty
    let allowedStepSizes = [2, 3];
    if (difficultyLevel >= 4 && difficultyLevel <= 6) allowedStepSizes = [4, 5, 6];
    if (difficultyLevel >= 7) allowedStepSizes = [7, 8, 9];
    
    const stepSize = RandomService.getElement(allowedStepSizes) || 2;
    
    // Initialize pattern type based on difficulty
    let allowedPatterns: ('linear' | 'oscillating' | 'elastic')[] = ['linear'];
    if (difficultyLevel >= 4 && difficultyLevel <= 6) allowedPatterns = ['linear', 'oscillating'];
    if (difficultyLevel >= 7) allowedPatterns = ['linear', 'oscillating', 'elastic'];
    
    const patternType = RandomService.getElement(allowedPatterns) || 'linear';
    
    // Initialize peak limit
    const peakLimit = stepSize * RandomService.getInt(4, 8);
    
    tState = {
      initialized: true,
      stepSize,
      direction: 1,
      patternType,
      peakLimit,
      sequenceIndex: 0,
      anchor: stepSize, // For elastic expansion
      previousValue: 0
    };
  }

  const currentValue = (state.currentValue !== undefined && !isNaN(state.currentValue)) ? state.currentValue : tState.stepSize;
  let nextValue = currentValue + (tState.direction || 1) * (tState.stepSize || 2);
  let directionChangeOccurred = false;

  if (tState.patternType === 'oscillating') {
    if (nextValue >= tState.peakLimit) {
      tState.direction = -1;
      nextValue = currentValue + tState.direction * tState.stepSize;
      directionChangeOccurred = true;
    } else if (nextValue <= tState.stepSize) {
      tState.direction = 1;
      nextValue = currentValue + tState.direction * tState.stepSize;
      directionChangeOccurred = true;
    }
  } else if (tState.patternType === 'elastic') {
    if (Math.abs(nextValue - tState.anchor) >= tState.peakLimit) {
      tState.direction *= -1;
      nextValue = currentValue + tState.direction * tState.stepSize;
      directionChangeOccurred = true;
    } else if (nextValue === tState.anchor && tState.direction === -1) {
       tState.direction = 1;
       nextValue = currentValue + tState.direction * tState.stepSize;
       directionChangeOccurred = true;
    }
  }

  // Surprise Reversal (Momentum Chain mechanic)
  const REVERSAL_CHANCE = difficultyLevel >= 7 ? 0.15 : (difficultyLevel >= 4 ? 0.05 : 0);
  if (tState.patternType !== 'linear' && RandomService.chance(REVERSAL_CHANCE)) {
    tState.direction *= -1;
    nextValue = currentValue + tState.direction * tState.stepSize;
    directionChangeOccurred = true;
  }

  // Guard against negative values in skip rhythm
  if (nextValue < 0) {
    tState.direction *= -1;
    nextValue = currentValue + tState.direction * tState.stepSize;
    directionChangeOccurred = true;
  }

  // Final safety check to ensure movement
  if (nextValue === currentValue) {
    tState.direction = tState.direction === 1 ? -1 : 1;
    nextValue = currentValue + tState.direction * tState.stepSize;
    directionChangeOccurred = true;
    if (nextValue < 0) nextValue = currentValue + tState.stepSize; // Absolute fallback
  }

  const move = nextValue - currentValue;
  tState.sequenceIndex++;
  tState.previousValue = currentValue;

  return {
    startNumber: currentValue,
    nextValue: nextValue,
    operation: move >= 0 ? '+' : '-',
    value: Math.abs(move),
    traversalState: tState,
    meta: {
      stepSize: tState.stepSize,
      patternType: tState.patternType,
      direction: tState.direction,
      directionChangeOccurred
    },
  };
};

export const MathTraversalEngine = {
  getNextValue: (state: any, config: any) => {
    const plugins: Record<string, Function> = {
      skipcount: skipCountTraversal,
      multiplication: multiplicationPatternTraversal,
      multiplication_pattern: multiplicationPatternTraversal,
      multiplication_linear: linearMultiplicationTraversal,
      pattern: patternTraversal,
      skip_rhythm: skipRhythmTraversal,
    };
    const plugin = plugins[config.learningMode];
    let result;

    if (plugin) {
      result = plugin(state, config);
    } else {
      result = {
        nextValue: state.currentValue,
        operation: '+',
        value: 0,
        traversalState: state.traversalState,
        meta: {},
      };
    }

    EngineContractValidator.validateTraversal(result);
    return result;
  },
};

/**
 * DEVELOPMENT HELPER: Traversal Simulation Tool
 * Use this to verify engine behavior against baseline snapshots.
 * Example: simulateTraversal("multiplication_linear", 20)
 */
export const simulateTraversal = (mode: string, runs: number = 20, configOverrides: any = {}) => {
  const config = {
    learningMode: mode,
    selectedTables: [7],
    multBase: 7,
    multMaxFactor: 10,
    difficultyLevel: 5,
    ...configOverrides
  };

  let state = {
    stepIndex: 0,
    currentValue: 7,
    traversalState: {}
  };

  console.log(`\n--- SIMULATION: ${mode} (${runs} steps) ---`);
  
  for (let i = 0; i < runs; i++) {
    const result = MathTraversalEngine.getNextValue(state, config);
    
    if (mode === 'multiplication_linear') {
      console.log(`${result.startNumber} × ${result.value} = ${result.nextValue}`);
    } else {
      console.log(`${state.currentValue} ${result.operation} ${result.value} -> ${result.nextValue}`);
    }

    state.currentValue = result.nextValue;
    state.traversalState = result.traversalState;
    state.stepIndex++;
  }
  console.log(`--- END SIMULATION ---\n`);
};
