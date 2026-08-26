import { ProblemGenerator } from '../../../services/problemGenerator';
import { AppConfig, GameStep } from '../../../types';
import { RandomService } from '../../../services/randomService';

export type CircuitClimbProblemSnapshot = {
  problemId: string;
  operation: "addition";
  rowIndex: number;
  targetEventId: number;
  playerValue: number;
  targetValue: number;
  choices: number[];
  correctChoiceIndex: number;
  correctPlatformValue: number;
};

let problemCounter = 0;

export const CircuitClimbMathAdapter = {
  requestAdditionProblem(
    rowIndex: number, 
    incomingPlayerValue: number, 
    maxTargetValue: number,
    targetBandId: number
  ): CircuitClimbProblemSnapshot | null {
    const config: AppConfig = {
      learningMode: 'standard',
      totalSteps: 1,
      targetNumber: maxTargetValue,
      targetFlex: 0,
      rangeMin: 1,
      rangeMax: maxTargetValue,
      answerChoices: 3,
      difficultyLevel: Math.min(5, 1 + Math.floor(rowIndex / 10)),
      phaseSequence: [{ mode: 'normal', count: 1 }],
      opsEnabled: { '+': true, '-': false, '×': false, '÷': false },
      activeMode: 'normal',
      isMuted: false,
      timerOn: false,
      quickMindInterval: 10,
      darkModeInterval: 10,
      modifiersPerStep: 1,
      enableVariables: false,
      stopwatchSkin: 'default',
      progressionMode: 'adaptive',
      presentationMode: 'normal',
      scriptId: 'circuit-climb'
    } as unknown as AppConfig;

    const sequence = ProblemGenerator.generateSequence(incomingPlayerValue, config);
    
    let step = sequence && sequence.length > 0 ? sequence[0] : null;
    
    // Safety check - we strictly enforce addition mode and correct target mapping
    if (!step || step.operation !== '+' || step.correctAnswer <= step.startNumber) {
      const targetValue = Math.max(incomingPlayerValue + 1, maxTargetValue);
      const correctValue = targetValue - incomingPlayerValue;
      step = {
        startNumber: incomingPlayerValue,
        operation: '+',
        value: correctValue,
        correctAnswer: targetValue,
        distractorCount: 2,
        distractors: [],
        timerSeconds: 10,
        mode: 'normal',
        modifiers: [{ operation: '+', value: correctValue, position: 'bottom' }]
      };
    } else if (step.correctAnswer !== maxTargetValue && incomingPlayerValue < maxTargetValue) {
      // Align target answer with maxTargetValue to ensure the row's target matches the band expectation
      const correctValue = maxTargetValue - incomingPlayerValue;
      step = {
        startNumber: incomingPlayerValue,
        operation: '+',
        value: correctValue,
        correctAnswer: maxTargetValue,
        distractorCount: 2,
        distractors: [],
        timerSeconds: step.timerSeconds || 10,
        mode: step.mode || 'normal',
        modifiers: [{ operation: '+', value: correctValue, position: 'bottom' }]
      };
    }

    // The shared engine creates distractors for step.correctAnswer.
    // For Circuit Climb, we need distractors for step.value (the missing operand).
    // So we invoke the engine's distractor generator for step.value.
    const correctPlatformValue = step.value || (step.correctAnswer - step.startNumber);
    const distractors = ProblemGenerator.generateDistractors(correctPlatformValue, step, config);
    
    // Collect choices and enforce exactly 3 distinct valid values
    const choicesList = Array.from(new Set([correctPlatformValue, ...distractors]))
        .filter(v => Number.isFinite(v) && v > 0)
        .slice(0, 3);
    
    let s = rowIndex * 1337 + incomingPlayerValue;
    while (choicesList.length < 3) {
      s++;
      const extra = correctPlatformValue + (s % 2 === 0 ? -1 : 1) * (1 + (s % 4));
      if (extra > 0 && !choicesList.includes(extra)) {
        choicesList.push(extra);
      }
    }

    const shuffledChoices = RandomService.shuffle(choicesList);
    const correctChoiceIndex = shuffledChoices.indexOf(correctPlatformValue);

    return {
      problemId: `problem-${++problemCounter}`,
      operation: "addition",
      rowIndex,
      targetEventId: targetBandId,
      playerValue: step.startNumber,
      targetValue: step.correctAnswer,
      choices: shuffledChoices,
      correctChoiceIndex,
      correctPlatformValue
    };
  }
};
