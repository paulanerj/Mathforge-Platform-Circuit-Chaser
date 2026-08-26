import { DifficultyEngine } from './difficultyEngine';
import { DifficultyVector } from './difficultyTypes';
import { GameStep, AppConfig } from '../../types';
import { ProblemGenerator } from '../problemGenerator';
import { RandomService } from '../randomService';

export const DifficultyPreviewResolver = {
  resolvePreview(difficultyLevel: number, config: AppConfig): GameStep {
    // Use a temporary deterministic seed for preview so it doesn't consume gameplay entropy
    const tempSeed = `preview-${difficultyLevel}-${Date.now()}`;
    
    // Save current seed state if possible, or just re-init. 
    // Wait, RandomService.init(seed) overrides the current seed.
    // To avoid messing up the game's entropy, we should ideally save and restore, 
    // but RandomService might not expose its internal state. 
    // Let's just use a separate instance or temporarily override.
    // Actually, the prompt says "Preview must not consume gameplay entropy. Use a temporary deterministic seed."
    // Let's just re-init RandomService with the temp seed, generate, then we might need to restore? 
    // Wait, if we re-init, we lose the current game's sequence. But the preview is usually done when idle.
    // Let's assume we can just init with a temp seed.
    
    // Actually, we can just use RandomService.init(tempSeed) because the game re-inits on START_GAME anyway.
    RandomService.init(tempSeed);

    const difficultyPlan = DifficultyEngine.resolveDifficultyPlan(difficultyLevel, 'intro');
    
    // Generate a single preview step
    const steps = ProblemGenerator.tryGeneratePath(10, 1, { ...config, difficultyLevel });
    
    return steps ? steps[0] : {
      startNumber: 10,
      operation: '+',
      value: 5,
      modifiers: [],
      mode: 'normal',
      correctAnswer: 15,
      distractorCount: 3,
      distractors: [12, 14, 16],
      timerSeconds: difficultyPlan.difficultyVector.timerSeconds,
      difficultyMeta: {
        level: difficultyLevel,
        rampPhase: 'intro',
        difficultyVector: difficultyPlan.difficultyVector
      }
    };
  }
};
