/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SkillDefinition {
  id: string;
  title: string;
  description: string;
}

export interface SkillOntology {
  skills: Record<string, SkillDefinition>;
}

export interface SkillScore {
  skillId: string;
  weightedScore: number; // 0.0 to 1.0
  attempts: number;
  meanAttemptDepth: number;
  isReliable: boolean;
}

export interface PhaseBreakdown {
  phase: string;
  attempts: number;
  meanAttemptDepth: number;
  accuracy: number;
}

export interface MasteryConfidence {
  overallScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  band: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  isReliable: boolean;
  lastUpdated: string;
  skillBreakdown: Record<string, SkillScore>;
}

export interface SessionSummary {
  sessionId: string;
  timestamp: string;
  totalSteps: number;
  correctCount: number;
  errorCount: number;
  timeoutCount: number;
  meanAttemptDepth: number;
  maxAttemptDepth: number;
  mastery: MasteryConfidence;
  phases: PhaseBreakdown[];
}

export interface InterventionSignal {
  type: string;
  category: 'conceptual' | 'behavioral' | 'cognitive_mode';
  timestamp: string;
  stepIndex: number;
  skillId?: string;
  phase?: string;
  metadata: Record<string, any>;
  confidence: number; // 0.0 to 1.0
}

export interface InterventionCluster {
  type: string;
  count: number;
  meanConfidence: number;
  firstObserved: string;
  lastObserved: string;
  recommendedClass: string;
}

export interface SessionInterventionSummary {
  signals: InterventionSignal[];
  clusters: Record<string, InterventionCluster>;
  fatigueIndex: number; // 0.0 to 1.0
  primaryInterventionNeeded: string | null;
}

export interface ErrorWeights {
  INCORRECT: number;
  TIMEOUT: number;
  HINT_USED: number;
}
