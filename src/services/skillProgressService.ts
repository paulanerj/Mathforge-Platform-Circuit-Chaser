import { SkillProgress } from '../types/skillProgress';
import { LessonResult } from '../types/practicePlan';

const STORAGE_KEY = 'speedmath.skillProgress';

class SkillProgressServiceClass {
  loadAll(): Record<string, SkillProgress> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load skill progress:", e);
    }
    return {};
  }

  saveAll(data: Record<string, SkillProgress>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save skill progress:", e);
    }
  }

  updateSkillProgress(lessonResult: LessonResult) {
    if (!lessonResult.skillStats || lessonResult.skillStats.length === 0) return { previousProgress: {}, newProgress: {} };

    const allProgress = this.loadAll();
    const previousProgress = JSON.parse(JSON.stringify(allProgress)); // Deep clone for previous state

    for (const stat of lessonResult.skillStats) {
      const skillKey = stat.skillKey;
      const lessonAccuracy = stat.total > 0 ? stat.correct / stat.total : 0;
      const lessonAvgTime = stat.avgTime;

      let progress = allProgress[skillKey];

      if (!progress) {
        progress = {
          skillKey,
          stars: 0,
          masteryLevel: 'weak',
          bestAccuracy: 0,
          bestAvgTime: Infinity,
          lastAccuracy: 0,
          lastAvgTime: 0,
          attempts: 0,
          maxStreak: 0,
          confidenceAverage: 0,
          history: []
        };
      }

      // Calculate trend before updating full history
      let tempTrend: 'up' | 'down' | 'flat' = 'flat';
      if (progress.history.length > 0) {
        const lastEntry = progress.history[progress.history.length - 1];
        if (lessonAccuracy > lastEntry.accuracy || (Math.abs(lessonAccuracy - lastEntry.accuracy) < 0.05 && lessonAvgTime < lastEntry.avgTime * 0.95)) {
          tempTrend = 'up';
        } else if (lessonAccuracy < lastEntry.accuracy || (Math.abs(lessonAccuracy - lastEntry.accuracy) < 0.05 && lessonAvgTime > lastEntry.avgTime * 1.05)) {
          tempTrend = 'down';
        }
      }
      progress.trend = tempTrend;

      // Update basic stats
      progress.attempts += stat.total;
      progress.lastAccuracy = lessonAccuracy;
      progress.lastAvgTime = lessonAvgTime;
      
      const newMaxStreak = stat.maxStreak || 0;
      progress.maxStreak = Math.max(progress.maxStreak, newMaxStreak);
      
      // Moving average for confidence (weighted by attempts would be better, but we replace for phase 1 or keep latest)
      progress.confidenceAverage = stat.confidenceAvg !== undefined ? stat.confidenceAvg : progress.confidenceAverage;

      // Update bests
      progress.bestAccuracy = Math.max(progress.bestAccuracy || 0, lessonAccuracy);
      progress.bestAvgTime = progress.bestAvgTime === Infinity 
        ? lessonAvgTime 
        : Math.min(progress.bestAvgTime, lessonAvgTime);

      // Append history
      progress.history.push({
        accuracy: lessonAccuracy,
        avgTime: lessonAvgTime,
        timestamp: Date.now()
      });

      // Calculate Stars and new Mastery Classification
      let stars = 0;
      let targetTimeInfo = 5; // Assume 5s avg as standard if unknown

      if (
        lessonAccuracy >= 0.95 &&
        lessonAvgTime <= targetTimeInfo &&
        progress.maxStreak >= 3 &&
        progress.confidenceAverage >= 0.8
      ) {
        stars = 5;
      } else if (lessonAccuracy >= 0.85) {
        stars = 4;
      } else if (lessonAccuracy >= 0.70) {
        stars = 3;
      } else if (lessonAccuracy >= 0.60) {
        stars = 2;
      } else {
        stars = 1;
      }

      progress.stars = stars;

      // Map Mastery Level
      if (stars <= 1) progress.masteryLevel = 'weak';
      else if (stars <= 3) progress.masteryLevel = 'developing';
      else if (stars === 4) progress.masteryLevel = 'strong';
      else if (stars === 5) progress.masteryLevel = 'mastered';

      allProgress[skillKey] = progress;
    }

    this.saveAll(allProgress);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("[SkillProgressService] Updated progress across", lessonResult.skillStats.length, "skills.");
    }
    
    return { previousProgress, newProgress: allProgress };
  }
}

export const SkillProgressService = new SkillProgressServiceClass();
