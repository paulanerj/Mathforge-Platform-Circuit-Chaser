import { RandomService } from './randomService';
import { AppConfig } from '../types';

export type PatternFamily = 'arithmetic' | 'skip' | 'geometric' | 'alternating' | 'square' | 'fibonacci' | 'stepGrowth';

export interface PatternDescriptor {
  patternType: PatternFamily;
  parameters?: any;
  difficultyTier?: 'basic' | 'standard' | 'advanced';
  minLength: number;
  maxLength: number;
}

export const PatternEngine = {
  generateSequence(config: AppConfig): { sequence: number[], correctAnswer: number, descriptor: PatternDescriptor } {
    const enabledFamilies = config.patternFamilies || ['arithmetic', 'skip', 'geometric', 'alternating', 'square', 'fibonacci', 'stepGrowth'];
    let complexity = config.patternComplexity || 'standard';

    // Filter families based on complexity if needed, but the prompt says:
    // "This should act as a filter on the pattern families list."
    // Actually, the prompt says:
    // "Basic: Arithmetic, Skip. Standard: Geometric, Alternating. Advanced: Fibonacci, Step Growth, Squares."
    // So if complexity is 'basic', we only allow 'arithmetic' and 'skip' from the enabled families.
    let allowedByComplexity: PatternFamily[] = [];
    if (complexity === 'basic') {
      allowedByComplexity = ['arithmetic', 'skip'];
    } else if (complexity === 'standard') {
      allowedByComplexity = ['arithmetic', 'skip', 'geometric', 'alternating'];
    } else {
      allowedByComplexity = ['arithmetic', 'skip', 'geometric', 'alternating', 'square', 'fibonacci', 'stepGrowth'];
    }

    let validFamilies = enabledFamilies.filter(f => allowedByComplexity.includes(f as PatternFamily)) as PatternFamily[];
    if (validFamilies.length === 0) {
      validFamilies = ['arithmetic']; // Fallback
    }

    const selectedFamily = RandomService.getElement(validFamilies) || 'arithmetic';
    const length = config.patternLength || 4;
    
    const descriptor: PatternDescriptor = {
      patternType: selectedFamily,
      minLength: length,
      maxLength: length,
      difficultyTier: complexity as any
    };

    let fullSequence: number[] = [];

    switch (selectedFamily) {
      case 'arithmetic': {
        const step = RandomService.getInt(2, 10) * (RandomService.chance(0.5) ? 1 : -1);
        const start = RandomService.getInt(Math.max(1, -step * length + 1), 50);
        for (let i = 0; i <= length; i++) {
          fullSequence.push(start + i * step);
        }
        descriptor.parameters = { step };
        break;
      }
      case 'skip': {
        const step = RandomService.getInt(2, 10);
        const startMult = RandomService.getInt(1, 10);
        for (let i = 0; i <= length; i++) {
          fullSequence.push((startMult + i) * step);
        }
        descriptor.parameters = { step };
        break;
      }
      case 'geometric': {
        const multiplier = RandomService.getInt(2, 4);
        const start = RandomService.getInt(1, 5);
        for (let i = 0; i <= length; i++) {
          fullSequence.push(start * Math.pow(multiplier, i));
        }
        descriptor.parameters = { multiplier };
        break;
      }
      case 'alternating': {
        const step1 = RandomService.getInt(2, 5);
        const step2 = -RandomService.getInt(1, step1 - 1); // Ensure it generally grows or stays positive
        const start = RandomService.getInt(5, 20);
        let current = start;
        fullSequence.push(current);
        for (let i = 0; i < length; i++) {
          current += (i % 2 === 0) ? step1 : step2;
          fullSequence.push(current);
        }
        descriptor.parameters = { pattern: [step1, step2] };
        break;
      }
      case 'square': {
        const startBase = RandomService.getInt(1, 5);
        for (let i = 0; i <= length; i++) {
          fullSequence.push(Math.pow(startBase + i, 2));
        }
        break;
      }
      case 'fibonacci': {
        let a = RandomService.getInt(1, 5);
        let b = RandomService.getInt(a, a + 5);
        fullSequence.push(a);
        fullSequence.push(b);
        for (let i = 2; i <= length; i++) {
          const next = a + b;
          fullSequence.push(next);
          a = b;
          b = next;
        }
        break;
      }
      case 'stepGrowth': {
        const startStep = RandomService.getInt(1, 3);
        const start = RandomService.getInt(1, 10);
        let current = start;
        let currentStep = startStep;
        fullSequence.push(current);
        for (let i = 0; i < length; i++) {
          current += currentStep;
          fullSequence.push(current);
          currentStep++;
        }
        descriptor.parameters = { startStep };
        break;
      }
    }

    const correctAnswer = fullSequence.pop()!;
    return {
      sequence: fullSequence,
      correctAnswer,
      descriptor
    };
  }
};
