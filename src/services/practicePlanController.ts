import { PracticePlan, PracticeLevelConfig, PracticeLevelResult, StarThresholds, PracticePlanProgress } from '../types/practicePlan';
import { AppConfig, LearningMode } from '../types';
import { SafeStorage } from './safeStorage';
import { STORAGE_KEYS } from '../constants';

export interface ActiveSessionData {
  version: number;
  currentPlan: PracticePlan;
  currentLevelIndex: number;
  progress: PracticePlanProgress;
  timestamp: number;
}


export const SAMPLE_PRACTICE_PLAN: PracticePlan = {
  planId: 'plan_001',
  title: 'Starter Plan',
  description: 'A foundational sequence of math challenges.',
  createdAt: Date.now(),
  levels: [
    {
      levelId: 'lvl_1',
      title: 'Level 1: Skip Counting',
      mode: 'skipcount',
      difficulty: 2,
      steps: 20,
      skipStep: 2,
      starThresholds: {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.7 },
        threeStar: { accuracy: 0.85 },
        fourStar: { accuracy: 0.95 },
        fiveStar: { accuracy: 1.0, noTimeouts: true }
      }
    },
    {
      levelId: 'lvl_2',
      title: 'Level 2: Skip Rhythm',
      mode: 'skip_rhythm',
      difficulty: 3,
      steps: 20,
      skipStep: 4,
      starThresholds: {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.7 },
        threeStar: { accuracy: 0.85 },
        fourStar: { accuracy: 0.95 },
        fiveStar: { accuracy: 1.0, noTimeouts: true }
      }
    },
    {
      levelId: 'lvl_3',
      title: 'Level 3: Pattern Logic',
      mode: 'pattern',
      difficulty: 4,
      sequenceLength: 4,
      patternType: 'arithmetic',
      patternRule: '+3',
      steps: 20,
      starThresholds: {
        oneStar: { completion: true },
        twoStar: { accuracy: 0.7 },
        threeStar: { accuracy: 0.85 },
        fourStar: { accuracy: 0.95 },
        fiveStar: { accuracy: 1.0, noTimeouts: true }
      }
    }
  ]
};

class PracticePlanControllerClass {
  private currentPlan: PracticePlan | null = null;
  private currentLevelIndex: number = -1;
  private progress: PracticePlanProgress | null = null;

  constructor() {
    this.restoreActiveSession();
  }

  private persistActiveSession() {
    if (!this.currentPlan || !this.progress) {
      SafeStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      return;
    }
    const sessionData: ActiveSessionData = {
      version: 1,
      currentPlan: this.currentPlan,
      currentLevelIndex: this.currentLevelIndex,
      progress: this.progress,
      timestamp: Date.now()
    };
    SafeStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, sessionData);
  }

  restoreActiveSession(): boolean {
    const sessionData = SafeStorage.getItem<ActiveSessionData | null>(STORAGE_KEYS.ACTIVE_SESSION, null);
    if (sessionData && sessionData.version === 1 && sessionData.currentPlan && sessionData.progress) {
      this.currentPlan = sessionData.currentPlan;
      this.currentLevelIndex = sessionData.currentLevelIndex;
      this.progress = sessionData.progress;
      console.log('[PracticePlanController] Restored active session:', this.currentPlan.title);
      return true;
    }
    return false;
  }

  hasActiveSession(): boolean {
    return this.currentPlan !== null;
  }

  loadPlan(plan: PracticePlan) {
    this.currentPlan = plan;
    this.currentLevelIndex = 0;
    this.progress = {
      planId: plan.planId,
      completedLevelIds: [],
      levelResults: {},
      totalStars: 0,
      lastPlayedAt: Date.now()
    };
    this.persistActiveSession();
  }

  getCurrentPlan() {
    return this.currentPlan;
  }

  getCurrentLevel(): PracticeLevelConfig | null {
    if (!this.currentPlan || this.currentLevelIndex < 0 || this.currentLevelIndex >= this.currentPlan.levels.length) {
      return null;
    }
    return this.currentPlan.levels[this.currentLevelIndex];
  }

  getProgress() {
    return this.progress;
  }

  mapLevelToAppConfig(level: PracticeLevelConfig, baseConfig: AppConfig): AppConfig {
    const newConfig = { ...baseConfig };
    
    newConfig.learningMode = level.mode as LearningMode;
    if (level.mode === 'multiplication_fluency') {
      newConfig.learningMode = 'multiplication';
    }
    newConfig.totalSteps = level.steps;
    newConfig.difficultyLevel = level.difficulty;
    if (level.targetResponseTime) newConfig.targetResponseTime = level.targetResponseTime;

    if (level.mode === 'standard') {
      newConfig.opsEnabled = { '+': true, '-': false, '×': false, '÷': false };
    }

    if (level.mode === 'skip_rhythm' && level.skipStep) {
      newConfig.skipBase = level.skipStep;
    }

    if (level.mode === 'skipcount' && level.skipStep) {
      newConfig.skipBase = level.skipStep;
    }

    if (level.mode === 'pattern') {
      if (level.sequenceLength) newConfig.patternLength = level.sequenceLength;
      if (level.patternType) newConfig.patternFamilies = [level.patternType];
      // patternRule is conceptual for now, but could map to specific step sizes later
    }

    if (level.mode === 'multiplication' || level.mode === 'multiplication_fluency') {
      if (level.tableSelection && level.tableSelection.length > 0) {
        newConfig.selectedTables = level.tableSelection;
        newConfig.multBase = level.tableSelection[0];
      }
    }

    if (level.mode === 'multiplication_pattern' && level.tableSelection) {
      newConfig.selectedTables = level.tableSelection;
      newConfig.multBase = level.tableSelection[0];
    }

    if (level.forcedQuestion) {
      newConfig.forcedQuestion = level.forcedQuestion;
    }

    return newConfig;
  }

  calculateStars(result: Omit<PracticeLevelResult, 'starsEarned'>, thresholds: StarThresholds): number {
    if (!result.completed) return 0;
    
    // Per-Activity Target Time Evaluation (New Feature)
    if (result.targetResponseTime && result.avgResponseTime !== undefined) {
      const { accuracy, mistakes, timeouts, avgResponseTime, targetResponseTime } = result;
      
      if (accuracy === 1.0 && timeouts === 0 && avgResponseTime <= targetResponseTime) return 5;
      if (accuracy >= 0.9 && mistakes <= 1 && avgResponseTime <= targetResponseTime + 1) return 4;
      if (accuracy >= 0.75) return 3;
      if (accuracy >= 0.6) return 2;
      return 1;
    }

    // Fallback Legacy Global Evaluation
    let stars = 0;
    if (thresholds.oneStar.completion && result.completed) stars = 1;
    if (result.accuracy >= thresholds.twoStar.accuracy) stars = 2;
    if (result.accuracy >= thresholds.threeStar.accuracy) stars = 3;
    if (result.accuracy >= thresholds.fourStar.accuracy) stars = 4;
    
    let meetsFiveStar = result.accuracy >= thresholds.fiveStar.accuracy;
    if (thresholds.fiveStar.noTimeouts && result.timeouts > 0) meetsFiveStar = false;
    if (thresholds.fiveStar.timeTargetSeconds && result.completionTimeSeconds > thresholds.fiveStar.timeTargetSeconds) meetsFiveStar = false;
    
    if (meetsFiveStar) stars = 5;

    return stars;
  }

  recordResult(partialResult: Omit<PracticeLevelResult, 'starsEarned'>) {
    if (!this.currentPlan || !this.progress) return null;
    
    const level = this.getCurrentLevel();
    if (!level) return null;

    const stars = this.calculateStars(partialResult, level.starThresholds);
    const fullResult: PracticeLevelResult = {
      ...partialResult,
      starsEarned: stars
    };

    this.progress.levelResults[level.levelId] = fullResult;
    if (fullResult.completed && !this.progress.completedLevelIds.includes(level.levelId)) {
      this.progress.completedLevelIds.push(level.levelId);
      this.progress.totalStars += stars;
    }
    this.progress.lastPlayedAt = Date.now();

    console.log('[PracticePlanController] Level Result Recorded:', fullResult);
    this.persistActiveSession();
    return fullResult;
  }

  advanceToNextLevel(): boolean {
    if (!this.currentPlan) return false;
    if (this.currentLevelIndex < this.currentPlan.levels.length - 1) {
      this.currentLevelIndex++;
      this.persistActiveSession();
      return true;
    }
    return false;
  }

  getLessonSummary(): import('../types/practicePlan').LessonResult | null {
    if (!this.currentPlan || !this.progress) return null;

    const activities: import('../types/practicePlan').ActivitySessionResult[] = [];
    let totalAccuracySum = 0;
    let totalAvgTimeSum = 0;
    let totalStars = 0;
    let numPlayedLevels = 0;

    const skillCounts: Record<string, { correct: number, total: number, totalTime: number, totalConfidence: number, currentStreak: number, maxStreak: number }> = {};

    for (const level of this.currentPlan.levels) {
      const result = this.progress.levelResults[level.levelId];
      if (!result) continue;

      numPlayedLevels++;
      totalAccuracySum += result.accuracy;
      totalAvgTimeSum += result.avgResponseTime || 0;
      totalStars += result.starsEarned;

      const missedItems: string[] = [];
      result.stepResults.forEach(step => {
        if (!step.correct) {
          if (step.timeout) {
            missedItems.push('TIMEOUT');
          } else if (step.questionLabel) {
            missedItems.push(step.questionLabel);
          }
        }
        
        // Track skill counts for lesson scope weak signals
        if (step.skillKey) {
          if (!skillCounts[step.skillKey]) skillCounts[step.skillKey] = { correct: 0, total: 0, totalTime: 0, totalConfidence: 0, currentStreak: 0, maxStreak: 0 };
          
          const sk = skillCounts[step.skillKey];
          sk.total++;
          sk.totalTime += step.responseTimeSeconds || 0;
          if (step.correct) sk.correct++;
          
          if (step.confidenceLevel !== undefined) {
            sk.totalConfidence += step.confidenceLevel;
          }
          
          if (step.correct && step.confidenceLevel === 1) {
             sk.currentStreak++;
             sk.maxStreak = Math.max(sk.maxStreak, sk.currentStreak);
          } else {
             sk.currentStreak = 0;
          }
        }
      });

      activities.push({
        levelId: level.levelId,
        mode: level.mode,
        title: level.title,
        stars: result.starsEarned,
        accuracy: result.accuracy,
        avgTime: result.avgResponseTime || 0,
        targetTime: result.targetResponseTime || 5, // fallback
        missedItems: [...new Set(missedItems)] // Dedup slightly
      });
    }

    if (numPlayedLevels === 0) return null;

    const weakSkills = Object.keys(skillCounts).filter(skillKey => {
      const stats = skillCounts[skillKey];
      return (stats.correct / stats.total) < 0.75;
    });

    const skillStats = Object.keys(skillCounts).map(skillKey => {
      const stats = skillCounts[skillKey];
      return {
        skillKey,
        correct: stats.correct,
        total: stats.total,
        avgTime: stats.totalTime / Math.max(1, stats.total),
        maxStreak: stats.maxStreak,
        confidenceAvg: stats.total > 0 ? stats.totalConfidence / stats.total : 0
      };
    });

    return {
      activities,
      totalAccuracy: totalAccuracySum / numPlayedLevels,
      totalAvgTime: totalAvgTimeSum / numPlayedLevels,
      totalStars,
      weakSkills,
      skillStats
    };
  }

  completePlan() {
    const summary = this.getLessonSummary();
    if (summary) {
      import('./skillProgressService').then(({ SkillProgressService }) => {
        const { previousProgress, newProgress } = SkillProgressService.updateSkillProgress(summary);
        
        import('./achievementService').then(({ achievementService }) => {
          const newAchievements = achievementService.checkAchievements(newProgress, previousProgress);
          if (newAchievements.length > 0) {
            window.dispatchEvent(new CustomEvent('achievementsUnlocked', { detail: newAchievements }));
          }
        });
      });
    }
  }

  isLastLevel(): boolean {
    if (!this.currentPlan) return false;
    return this.currentLevelIndex === this.currentPlan.levels.length - 1;
  }

  clearPlan() {
    this.currentPlan = null;
    this.currentLevelIndex = -1;
    this.progress = null;
    SafeStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}

export const PracticePlanController = new PracticePlanControllerClass();
