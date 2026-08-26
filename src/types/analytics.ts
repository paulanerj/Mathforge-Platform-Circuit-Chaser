export interface StepResult {
  mode: string;
  questionLabel: string;
  correct: boolean;
  selectedAnswer: number | string;
  correctAnswer: number | string;
  responseTime: number;
  targetResponseTime: number;
  timedOut: boolean;
  skillKey: string;
  subSkill?: string;
  timestamp: number;
  confidenceLevel?: number;
}

export interface ActivitySessionResult {
  mode: string;
  steps: StepResult[];
  totalSteps: number;
  correct: number;
  mistakes: number;
  timeouts: number;
  avgResponseTime: number;
  targetResponseTime: number;
  maxStreak: number;
  timestamp: number;
}

export interface SubSkillAggregate {
  attempts: number;
  correct: number;
  mistakes: number;
  timeouts: number;
  totalResponseTime: number;
  avgResponseTime: number;
}

export interface SkillAggregate {
  skillKey: string;
  attempts: number;
  correct: number;
  mistakes: number;
  timeouts: number;
  totalResponseTime: number;
  avgResponseTime: number;
  targetResponseTimes: number[];
  avgTarget: number;
  subSkills: Record<string, SubSkillAggregate>;
  consistency: number;
  maxStreak: number;
  confidenceAverage: number;
  totalConfidence: number;
  currentStreak: number;
}

export interface SkillSignal {
  skillKey: string;
  category: "weak" | "slow" | "strong" | "time_pressure" | "repeated_error";
  reason: string;
  accuracy: number;
  avgResponseTime: number;
  attempts: number;
}

export interface SkillAnalysisReport {
  weak: SkillSignal[];
  slow: SkillSignal[];
  strong: SkillSignal[];
  time_pressure: SkillSignal[];
  repeated_error: SkillSignal[];
}
