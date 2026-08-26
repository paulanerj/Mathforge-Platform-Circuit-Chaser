import { SkillProgressService } from './skillProgressService';
import { normalizeSkillKey } from './utils/skillKeyUtils';

export interface Recommendation {
  skillKey: string;
  reason: string;
  label: string;
}

export const recommendationService = {
  getNextRecommendedSkill(): Recommendation | null {
    const analysisStr = localStorage.getItem('speedmath.skillAnalysis');
    const progressData = SkillProgressService.loadAll();

    let analysis: any = null;
    if (analysisStr) {
      try {
        analysis = JSON.parse(analysisStr);
      } catch (e) {}
    }

    let rec: Recommendation | null = null;

    if (analysis) {
      if (analysis.repeated_error && analysis.repeated_error.length > 0) {
        const key = normalizeSkillKey(analysis.repeated_error[0]);
        rec = { 
          skillKey: key, 
          reason: 'Repeated errors detected', 
          label: this.formatLabel(analysis.repeated_error[0]) 
        };
      }
      else if (analysis.weak && analysis.weak.length > 0) {
        const key = normalizeSkillKey(analysis.weak[0]);
        rec = { 
          skillKey: key, 
          reason: 'Identified as a weak point', 
          label: this.formatLabel(analysis.weak[0]) 
        };
      }
      else if (analysis.slow && analysis.slow.length > 0) {
        const key = normalizeSkillKey(analysis.slow[0]);
        rec = { 
          skillKey: key, 
          reason: 'Slow response times detected', 
          label: this.formatLabel(analysis.slow[0]) 
        };
      }
    }

    if (!rec && Object.keys(progressData).length > 0) {
      let lowestSkill = null;
      let lowestScore = Infinity;
      Object.entries(progressData).forEach(([key, prog]: [string, any]) => {
        if (prog.stars < lowestScore) {
          lowestScore = prog.stars;
          lowestSkill = key;
        }
      });
      if (lowestSkill) {
        const key = normalizeSkillKey(lowestSkill);
        rec = { 
          skillKey: key, 
          reason: 'Let\'s practice this to build mastery', 
          label: this.formatLabel(lowestSkill) 
        };
      }
    }

    if (rec) {
      localStorage.setItem('speedmath.lastRecommendation', JSON.stringify(rec));
    }
    
    return rec;
  },

  getLastRecommendation(): Recommendation | null {
    const item = localStorage.getItem('speedmath.lastRecommendation');
    if (item) {
      try {
        return JSON.parse(item);
      } catch (e) {}
    }
    return this.getNextRecommendedSkill();
  },

  formatLabel(rawInput: any) {
    const skillKey = normalizeSkillKey(rawInput);
    
    if (!skillKey) return 'Unknown Skill';

    if (skillKey.startsWith('multiplication.table')) {
      const table = parseInt(skillKey.split('.').pop() || '0', 10);
      if (table > 12) {
        return 'Multiplication Practice';
      }
      return `Multiplication Table ${table}`;
    }

    if (skillKey.startsWith('skipcount.step')) {
      const step = skillKey.split('.').pop();
      return `Skip Counting by ${step}`;
    }

    if (skillKey.startsWith('pattern.arithmetic')) {
      const rule = skillKey.split('.').pop();
      return `Pattern ${rule}`;
    }

    return skillKey;
  }
};
