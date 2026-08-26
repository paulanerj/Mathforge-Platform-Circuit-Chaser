import { GameStep } from '../types';

export function getHint(step: GameStep, selectedAnswer?: number | string): string {
  if (!step) return '';

  if (step.mode === 'multiplication') {
    return `Try counting by ${step.startNumber || step.value}s`;
  }

  if (step.mode === 'pattern') {
    return 'Look at how the numbers are changing';
  }

  if (step.mode === 'skipcount') {
    return `Add ${step.meta?.stepSize || ''} to the last number.`;
  }

  return 'Double check your addition/subtraction';
}
