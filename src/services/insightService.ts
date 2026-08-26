import { SkillProgress } from '../types/skillProgress';

export function classifySkills(skillProgress: SkillProgress[]) {
  const strong: SkillProgress[] = [];
  const improving: SkillProgress[] = [];
  const weak: SkillProgress[] = [];

  skillProgress.forEach(skill => {
    if (skill.masteryLevel === 'mastered' || skill.masteryLevel === 'strong') {
      strong.push(skill);
    } else if (skill.masteryLevel === 'developing') {
      improving.push(skill);
    } else {
      weak.push(skill);
    }
  });

  return { strong, improving, weak };
}
