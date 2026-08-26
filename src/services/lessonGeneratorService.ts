import { PracticePlan, PracticeLevelConfig } from '../types/practicePlan';
import { StepResult } from '../types/analytics';
import { normalizeSkillKey } from './utils/skillKeyUtils';

export class LessonGeneratorService {
  /**
   * Generates a PracticePlan focused heavily on a specific weakness skill key.
   */
  public generateLessonFromSkill(rawSkillKey: any): PracticePlan {
    const skillKey = normalizeSkillKey(rawSkillKey);
    const levelConfig = this.mapSkillToLevelConfig(skillKey);
    
    return {
      planId: `generated-${Date.now()}`,
      title: `Practice — ${this.formatSkillLabel(skillKey)}`,
      description: `Targeted practice plan automatically generated to build fluency in ${this.formatSkillLabel(skillKey)}.`,
      levels: [levelConfig],
      createdAt: Date.now()
    };
  }

  public generateLessonFromMistakes(stepResults: any[]): PracticePlan {
    const mistakes = stepResults.filter(
      step => !step.correct || step.timedOut || step.timeout
    );

    // Limit to top 10 to avoid overload
    const selected = mistakes.slice(0, 10);

    const levels: PracticeLevelConfig[] = selected.map((step, index) => {
      // Create a specific star threshold for an exact replay step
      const exactReplayThresholds = {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.0 }, // Not applicable for 1 question
        threeStar: { accuracy: 0.0 },
        fourStar: { accuracy: 0.0 },
        fiveStar: { accuracy: 1.0, noTimeouts: true }
      };

      return {
        levelId: `mistake-${index}`,
        title: `Review: ${step.questionLabel}`,
        mode: step.mode || 'normal',
        difficulty: 1,
        steps: 1,
        targetResponseTime: step.targetResponseTime || 5,
        timeLimitSeconds: (step.targetResponseTime || 5) + 3,
        starThresholds: exactReplayThresholds,

        // 🔴 KEY PART — FORCE EXACT QUESTION
        forcedQuestion: {
          questionLabel: step.questionLabel,
          correctAnswer: step.correctAnswer,
        }
      };
    });

    return {
      planId: `review-mistakes-${Date.now()}`,
      title: 'Review Mistakes',
      description: 'Replay the exact questions you missed.',
      levels,
      createdAt: Date.now()
    };
  }

  public generateLessonFromSkills(rawSkillKeys: any[]): PracticePlan {
    const validKeys = rawSkillKeys.map(normalizeSkillKey).filter(k => !!k);
    if (validKeys.length === 0) {
      return this.generateLessonFromSkill('arithmetic.mixed'); // Fallback
    }

    const levels = validKeys.map((key, i) => {
      const config = this.mapSkillToLevelConfig(key);
      config.levelId = `level-${i + 1}`;
      return config;
    });

    return {
      planId: `generated-mixed-${Date.now()}`,
      title: `Review Mistakes`,
      description: `Targeted practice plan automatically generated to review multiple areas of struggle.`,
      levels,
      createdAt: Date.now()
    };
  }

  private mapSkillToLevelConfig(rawSkillKey: any): PracticeLevelConfig {
    const skillKey = normalizeSkillKey(rawSkillKey);
    const baseConfig: Partial<PracticeLevelConfig> = {
      levelId: 'level-1',
      title: 'Targeted Practice',
      difficulty: 1,
      steps: 15,
      targetResponseTime: 4,
      timeLimitSeconds: 5,
      starThresholds: {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.7 },
        threeStar: { accuracy: 0.85 },
        fourStar: { accuracy: 0.95 },
        fiveStar: { accuracy: 1.0, noTimeouts: true }
      }
    };

    // multiplication.table.7.factor.8
    if (skillKey.startsWith('multiplication.table.')) {
      const parts = skillKey.split('.');
      const table = parseInt(parts[2], 10);
      
      let focusFactor: number | undefined;
      // if it has specific factor target e.g. multiplication.table.7.factor.8
      if (parts.length === 5 && parts[3] === 'factor') {
        focusFactor = parseInt(parts[4], 10);
      }

      return {
        ...baseConfig,
        levelId: 'level-1',
        title: focusFactor ? `Multiplication: ${table} × ${focusFactor}` : `Multiplication: Table of ${table}`,
        mode: 'multiplication_linear', // using standard available modes
        tableSelection: [table],
        // The AppConfig might need "focusFactors" support, but standard mode uses tableSelection
        // For standard "multiplication_fluent" / "multiplication_linear" usually tableSelection sets the table.
      } as PracticeLevelConfig;
    }

    if (skillKey.startsWith('skipcount.step.')) {
      const parts = skillKey.split('.');
      const step = parseInt(parts[2], 10);
      return {
        ...baseConfig,
        levelId: 'level-1',
        title: `Skip Count by ${step}`,
        mode: 'skipcount',
        skipStep: step,
      } as PracticeLevelConfig;
    }

    if (skillKey.startsWith('pattern.')) {
      const parts = skillKey.split('.');
      const type = parts[1]; // arithmetic, geometric, etc
      const rule = parts[2]; // +4, *2, etc

      return {
        ...baseConfig,
        levelId: 'level-1',
        title: `Pattern Logic: ${rule}`,
        mode: 'pattern', // or 'pattern_logic'
        patternType: type,
        patternRule: rule,
        sequenceLength: 4,
        steps: 10, // slightly fewer steps for patterns
      } as PracticeLevelConfig;
    }

    if (skillKey.startsWith('skip_rhythm.step.')) {
      const parts = skillKey.split('.');
      const step = parseInt(parts[2], 10);
      const rhythmType = parts[3] || 'standard';

      return {
        ...baseConfig,
        levelId: 'level-1',
        title: `Skip Rhythm: ${step}`,
        mode: 'skip_rhythm',
        skipStep: step,
        patternType: rhythmType,
      } as PracticeLevelConfig;
    }

    // Default Fallback
    return {
      ...baseConfig,
      levelId: 'level-1',
      title: 'General Math Practice',
      mode: 'normal',
      steps: 15
    } as PracticeLevelConfig;
  }

  private formatSkillLabel(rawKey: any): string {
    const key = normalizeSkillKey(rawKey);
    if (!key) return 'Unknown Skill';
    if (key.startsWith('multiplication.table.')) {
      const parts = key.split('.');
      if (parts.length === 3) {
        const table = parseInt(parts[2], 10);
        if (table > 12) return 'Multiplication Practice';
        return `Multiplication Table ${parts[2]}`;
      }
      if (parts.length === 5 && parts[3] === 'factor') {
        const table = parseInt(parts[2], 10);
        if (table > 12) return 'Multiplication Practice';
        return `${parts[2]} × ${parts[4]}`;
      }
    }
    if (key.startsWith('skipcount.step.')) {
      const parts = key.split('.');
      return `Skip Counting by ${parts[2]}`;
    }
    if (key.startsWith('pattern.')) {
      const parts = key.split('.');
      return `Pattern ${parts[2]}`;
    }
    if (key.startsWith('skip_rhythm.step.')) {
      const parts = key.split('.');
      const type = parts[3] || 'standard';
      return `Skip Rhythm ${parts[2]} (${type.charAt(0).toUpperCase() + type.slice(1)})`;
    }
    return key;
  }
}

export const lessonGeneratorService = new LessonGeneratorService();
