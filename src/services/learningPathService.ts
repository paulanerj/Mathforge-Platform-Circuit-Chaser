import { LearningPath } from '../types/learningPath';
import { SkillProgress } from '../types/skillProgress';

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'multiplication',
    title: 'Multiplication Mastery',
    description: 'Master all primary multiplication tables',
    skills: [
      'multiplication.table.2',
      'multiplication.table.3',
      'multiplication.table.4',
      'multiplication.table.5',
      'multiplication.table.6',
      'multiplication.table.7',
      'multiplication.table.8',
      'multiplication.table.9',
      'multiplication.table.10',
      'multiplication.table.11',
      'multiplication.table.12'
    ]
  },
  {
    id: 'skipcount',
    title: 'Skip Counting',
    description: 'Master intervals and foundational leaping',
    skills: [
      'skipcount.step.2',
      'skipcount.step.3',
      'skipcount.step.4',
      'skipcount.step.5',
      'skipcount.step.10'
    ]
  },
  {
    id: 'patterns',
    title: 'Pattern Logic',
    description: 'Understand sequences and geometric rules',
    skills: [
      'pattern.arithmetic.plus.2',
      'pattern.arithmetic.minus.2',
      'pattern.arithmetic.plus.3',
      'pattern.alternating',
      'pattern.geometric'
    ]
  }
];

export function getPathProgress(path: LearningPath, skillProgressRecord: Record<string, SkillProgress>) {
  const total = path.skills.length;
  const completed = path.skills.filter(skillKey => {
    const skill = skillProgressRecord[skillKey];
    return skill?.masteryLevel === 'mastered';
  }).length;

  return {
    completed,
    total,
    percent: total > 0 ? completed / total : 0
  };
}
