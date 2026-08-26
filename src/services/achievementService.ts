import { Achievement } from '../types/achievement';
import { SkillProgress } from '../types/skillProgress';
import { formatSkillLabel } from '../components/UI/InstructorDashboard';
import { getProgressionStage, getStageLevel } from './progressionService';
import { LEARNING_PATHS, getPathProgress } from './learningPathService';

const STORAGE_KEY = 'speedmath.achievements';

export const achievementService = {
  loadAll(): Achievement[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  saveAll(achievements: Achievement[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
    } catch (e) {}
  },

  checkAchievements(currentProgress: Record<string, SkillProgress>, previousProgress: Record<string, SkillProgress>): Achievement[] {
    const existing = this.loadAll();
    const newAchievements: Achievement[] = [];
    const unlockedIds = new Set(existing.map(a => a.id));

    for (const [skillKey, current] of Object.entries(currentProgress)) {
      const previous = previousProgress[skillKey];
      const label = formatSkillLabel(skillKey);

      // Mastery: masteryLevel === 'mastered'
      if (current.masteryLevel === 'mastered') {
        const id = `mastery_${skillKey}`;
        if (!unlockedIds.has(id)) {
          newAchievements.push({
            id,
            title: `Mastered ${label}`,
            description: `You can now solve these quickly and consistently.`,
            type: 'mastery',
            priority: 'high',
            skillKey,
            unlockedAt: Date.now()
          });
          unlockedIds.add(id);
        }
      }

      // Recovery: previous <= developing, current == mastered
      if (previous && (previous.masteryLevel === 'weak' || previous.masteryLevel === 'developing') && current.masteryLevel === 'mastered') {
        const id = `recovery_${skillKey}`;
        if (!unlockedIds.has(id)) {
          newAchievements.push({
            id,
            title: `Recovered ${label}`,
            description: `You turned a weak area into a strength.`,
            type: 'recovery',
            priority: 'high',
            skillKey,
            unlockedAt: Date.now()
          });
          unlockedIds.add(id);
        }
      }

      // Consistency: maxStreak >= 5
      if (current.maxStreak >= 5) {
        const id = `consistency_${skillKey}`;
        if (!unlockedIds.has(id)) {
          newAchievements.push({
            id,
            title: `Perfect Run`,
            description: `You answered 5 correctly in a row without mistakes.`,
            type: 'consistency',
            priority: 'medium',
            skillKey,
            unlockedAt: Date.now()
          });
          unlockedIds.add(id);
        }
      }

      // Speed: avgResponseTime <= 2
      if (current.lastAvgTime > 0 && current.lastAvgTime <= 2) {
        const id = `speed_${skillKey}`;
        if (!unlockedIds.has(id)) {
          newAchievements.push({
            id,
            title: `Lightning Fast ⚡`,
            description: `You are solving problems in under 2 seconds.`,
            type: 'speed',
            priority: 'medium',
            skillKey,
            unlockedAt: Date.now()
          });
          unlockedIds.add(id);
        }
      }

      // Confidence: confidenceAverage >= 0.9
      if (current.confidenceAverage >= 0.9) {
         const id = `confidence_${skillKey}`;
         if (!unlockedIds.has(id)) {
           newAchievements.push({
             id,
             title: `Confident Thinker`,
             description: `You are solving correctly on the first try.`,
             type: 'confidence',
             priority: 'low',
             skillKey,
             unlockedAt: Date.now()
           });
           unlockedIds.add(id);
         }
      }

      // Progression: stage changed from previousStage
      if (previous) {
        const prevStage = getProgressionStage(previous.masteryLevel);
        const currStage = getProgressionStage(current.masteryLevel);

        if (getStageLevel(currStage) > getStageLevel(prevStage)) {
          let desc = `You are getting more consistent with this skill.`;
          if (currStage === 'strong') desc = `You are showing strong mastery of this skill.`;
          if (currStage === 'mastered') desc = `You have fully mastered this skill!`;

          const id = `progression_${currStage}_${skillKey}`;
          if (!unlockedIds.has(id)) {
            newAchievements.push({
              id,
              title: `${currStage.charAt(0).toUpperCase() + currStage.slice(1)} ${label}`,
              description: desc,
              type: 'progression',
              priority: 'medium', // Setting priority to medium as it's a good milestone
              skillKey,
              unlockedAt: Date.now()
            });
            unlockedIds.add(id);
          }
        }
      }
    }

    // Check Learning Paths Complete
    for (const path of LEARNING_PATHS) {
        const pathProgress = getPathProgress(path, currentProgress);
        
        if (pathProgress.total > 0 && pathProgress.completed === pathProgress.total) {
            const id = `path_${path.id}`;
            if (!unlockedIds.has(id)) {
                newAchievements.push({
                    id,
                    title: `Path Complete: ${path.title}`,
                    description: `You've mastered every skill in the ${path.title} path!`,
                    type: 'path',
                    priority: 'high',
                    unlockedAt: Date.now()
                });
                unlockedIds.add(id);
            }
        }
    }

    if (newAchievements.length > 0) {
      this.saveAll([...existing, ...newAchievements]);
    }

    return newAchievements;
  }
};
