export interface StarThresholds {
  oneStar: { completion: boolean };
  twoStar: { accuracy: number };
  threeStar: { accuracy: number };
  fourStar: { accuracy: number };
  fiveStar: { accuracy: number, timeTargetSeconds?: number, noTimeouts?: boolean };
}

export interface PracticeLevelConfig {
  levelId: string;
  title: string;
  mode: string; // e.g., 'addition_traversal', 'skip_rhythm', 'pattern_logic', 'multiplication_pattern'
  difficulty: number;
  steps: number;
  timeLimitSeconds?: number;
  targetResponseTime?: number;
  sequenceLength?: number;
  patternType?: string; // e.g., 'arithmetic'
  patternRule?: string; // e.g., '+4'
  skipStep?: number;
  tableSelection?: number[];
  starThresholds: StarThresholds;
  forcedQuestion?: {
    questionLabel: string;
    correctAnswer: number | string;
    startNumber?: number | null;
    value?: number | null;
    operation?: string;
  };
}

export interface PracticePlan {
  version?: number;
  planId: string;
  title: string;
  description: string;
  levels: PracticeLevelConfig[];
  createdAt: number;
  updatedAt?: number;
}

export interface ActivitySessionResult {
  levelId: string;
  mode: string;
  title: string;
  stars: number;
  accuracy: number;
  avgTime: number;
  targetTime: number;
  missedItems: string[];
}

export interface LessonSkillStat {
  skillKey: string;
  correct: number;
  total: number;
  avgTime: number;
  maxStreak?: number;
  confidenceAvg?: number;
}

export interface LessonResult {
  activities: ActivitySessionResult[];
  totalAccuracy: number;
  totalAvgTime: number;
  totalStars: number;
  weakSkills: string[];
  skillStats: LessonSkillStat[];
}

export interface StepResultDetail {
  stepIndex: number;
  correct: boolean;
  responseTimeSeconds: number;
  timeout: boolean;
  questionLabel?: string;
  skillKey?: string;
  correctAnswer?: number | string;
  mode?: string;
  targetResponseTime?: number;
  confidenceLevel?: number;
}

export interface PracticeLevelResult {
  levelId: string;
  mode: string;
  accuracy: number;
  mistakes: number;
  completionTimeSeconds: number;
  avgResponseTime?: number;
  targetResponseTime?: number;
  starsEarned: number;
  completed: boolean;
  stepResults: StepResultDetail[];
  timeouts: number;
}

export interface PracticePlanProgress {
  planId: string;
  completedLevelIds: string[];
  levelResults: Record<string, PracticeLevelResult>;
  totalStars: number;
  lastPlayedAt: number;
}
