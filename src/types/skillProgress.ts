export interface SkillHistoryEntry {
  accuracy: number;
  avgTime: number;
  timestamp: number;
}

export interface SkillProgress {
  skillKey: string;

  stars: number; // 0-5
  masteryLevel: "weak" | "developing" | "strong" | "mastered";

  bestAccuracy: number;
  bestAvgTime: number;

  lastAccuracy: number;
  lastAvgTime: number;

  attempts: number;
  
  maxStreak: number;
  confidenceAverage: number;
  
  trend?: "up" | "down" | "flat";

  history: SkillHistoryEntry[];
}
