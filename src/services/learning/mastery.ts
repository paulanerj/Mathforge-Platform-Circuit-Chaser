/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  MasteryConfidence, 
  SkillScore, 
  PhaseBreakdown, 
  SessionSummary, 
  ErrorWeights, 
  SkillOntology 
} from '../../types/learning';
import { 
  PlatformDefaultErrorWeights, 
  RELIABILITY_RATIO, 
  PHASE_COVERAGE_THRESHOLD 
} from './config';

/*
AI_CONTEXT:
The MasteryPipeline is the core inference engine for the platform.
It transforms raw telemetry events into pedagogical insights.
This module is deterministic and agnostic to the execution engine.
*/

export class MasteryPipeline {
  static compute(
    events: any[], 
    ontology: SkillOntology, 
    errorWeights: ErrorWeights = PlatformDefaultErrorWeights
  ): SessionSummary {
    if (!events || events.length === 0) {
      return this.emptySummary();
    }

    const sessionId = events[0]?.payload?.sessionId || 'unknown';
    const timestamp = new Date(events[0]?.timestamp || Date.now()).toISOString();
    
    // Group events by step to calculate attempt depth and outcomes
    const steps: Record<number, any[]> = {};
    events.forEach(ev => {
      if (ev.gameStep !== null && ev.gameStep !== undefined) {
        const stepIdx = Number(ev.gameStep);
        if (!steps[stepIdx]) steps[stepIdx] = [];
        steps[stepIdx].push(ev);
      }
    });

    const stepIndices = Object.keys(steps).map(Number).sort((a, b) => a - b);
    const totalSteps = stepIndices.length;

    const skillStats: Record<string, { 
      weightedScoreSum: number; 
      attempts: number; 
      depthSum: number; 
      acceptedPhases: Set<string>;
      presentPhases: Set<string>;
    }> = {};

    const phaseStats: Record<string, {
      attempts: number;
      depthSum: number;
      correctCount: number;
    }> = {};

    const phasesInTape = new Set<string>();
    const acceptedPhasesInTape = new Set<string>();

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalTimeout = 0;
    let maxSessionDepth = 0;
    let totalDepthSum = 0;

    stepIndices.forEach(stepIndex => {
      const stepEvents = steps[stepIndex];
      
      // Determine final outcome for the step
      const finalEvent = stepEvents[stepEvents.length - 1];
      const isCorrect = finalEvent.type === 'ANSWER_CORRECT';
      const isTimeout = finalEvent.payload?.timedOut === true;
      const isIncorrect = finalEvent.type === 'ANSWER_REJECT' && !isTimeout;

      if (isCorrect) totalCorrect++;
      if (isIncorrect) totalIncorrect++;
      if (isTimeout) totalTimeout++;

      // Attempt depth: count interactive attempts (CORRECT or REJECT)
      const attempts = stepEvents.filter(e => 
        ['ANSWER_CORRECT', 'ANSWER_REJECT'].includes(e.type)
      ).length;
      
      totalDepthSum += attempts;
      maxSessionDepth = Math.max(maxSessionDepth, attempts);

      // Extract metadata from the first event of the step
      const firstEvent = stepEvents[0];
      const phase = firstEvent.payload?.phase || 'EXECUTE';
      const config = firstEvent.configSnapshot || {};
      const skillId = this.mapToSkillId(config.learningMode);
      
      phasesInTape.add(phase);
      if (isCorrect) acceptedPhasesInTape.add(phase);

      // Skill Stats
      if (!skillStats[skillId]) {
        skillStats[skillId] = { 
          weightedScoreSum: 0, 
          attempts: 0, 
          depthSum: 0, 
          acceptedPhases: new Set(),
          presentPhases: new Set()
        };
      }
      const sStats = skillStats[skillId];
      sStats.attempts++;
      sStats.depthSum += attempts;
      sStats.presentPhases.add(phase);
      if (isCorrect) sStats.acceptedPhases.add(phase);

      // Score calculation (Evidence-weighted)
      let stepScore = isCorrect ? 1.0 : 0.0;
      if (isCorrect && attempts > 1) {
        // Penalty for multiple attempts: 1.0 - (extra attempts * weight)
        // We use a 0.5 multiplier to ensure score doesn't drop too fast, but still penalizes
        stepScore = Math.max(0, 1.0 - (attempts - 1) * errorWeights.INCORRECT * 0.5);
      }
      sStats.weightedScoreSum += stepScore;

      // Phase Stats
      if (!phaseStats[phase]) {
        phaseStats[phase] = { attempts: 0, depthSum: 0, correctCount: 0 };
      }
      const pStats = phaseStats[phase];
      pStats.attempts++;
      pStats.depthSum += attempts;
      if (isCorrect) pStats.correctCount++;
    });

    // Global Session Reliability Gate
    const sessionPhaseCoverage = phasesInTape.size > 0 ? acceptedPhasesInTape.size / phasesInTape.size : 0;
    const sessionIsReliable = totalSteps >= Math.max(5, totalSteps * RELIABILITY_RATIO) && 
                             sessionPhaseCoverage >= PHASE_COVERAGE_THRESHOLD;

    // Skill Breakdown and Composite Score
    const skillBreakdown: Record<string, SkillScore> = {};
    let totalWeightedScore = 0;
    let totalReliableAttempts = 0;

    Object.keys(skillStats).forEach(skillId => {
      const stats = skillStats[skillId];
      const weightedScore = stats.attempts > 0 ? stats.weightedScoreSum / stats.attempts : 0;
      const meanAttemptDepth = stats.attempts > 0 ? stats.depthSum / stats.attempts : 1;
      
      // Skill-level reliability gate per directive
      // We use session-level phaseCoverage for the gate as per literal directive interpretation
      const isReliable = stats.attempts >= Math.max(5, totalSteps * RELIABILITY_RATIO) && 
                         sessionPhaseCoverage >= PHASE_COVERAGE_THRESHOLD;

      skillBreakdown[skillId] = {
        skillId,
        weightedScore,
        attempts: stats.attempts,
        meanAttemptDepth,
        isReliable
      };

      if (isReliable) {
        totalWeightedScore += weightedScore * stats.attempts;
        totalReliableAttempts += stats.attempts;
      }
    });

    // Evidence-weighted mastery composite
    const overallScore = totalReliableAttempts > 0 ? totalWeightedScore / totalReliableAttempts : 0;
    
    const mastery: MasteryConfidence = {
      overallScore,
      confidenceLevel: this.getConfidenceLevel(totalReliableAttempts),
      band: sessionIsReliable ? this.getBand(overallScore) : null,
      isReliable: sessionIsReliable,
      lastUpdated: new Date().toISOString(),
      skillBreakdown
    };

    const phases: PhaseBreakdown[] = Object.keys(phaseStats).map(phase => {
      const stats = phaseStats[phase];
      return {
        phase,
        attempts: stats.attempts,
        meanAttemptDepth: stats.attempts > 0 ? stats.depthSum / stats.attempts : 1,
        accuracy: stats.attempts > 0 ? stats.correctCount / stats.attempts : 0
      };
    });

    return {
      sessionId,
      timestamp,
      totalSteps,
      correctCount: totalCorrect,
      errorCount: totalIncorrect,
      timeoutCount: totalTimeout,
      meanAttemptDepth: totalSteps > 0 ? totalDepthSum / totalSteps : 1,
      maxAttemptDepth: maxSessionDepth,
      mastery,
      phases
    };
  }

  private static emptySummary(): SessionSummary {
    return {
      sessionId: 'none',
      timestamp: new Date().toISOString(),
      totalSteps: 0,
      correctCount: 0,
      errorCount: 0,
      timeoutCount: 0,
      meanAttemptDepth: 1,
      maxAttemptDepth: 0,
      mastery: {
        overallScore: 0,
        confidenceLevel: 'low',
        band: null,
        isReliable: false,
        lastUpdated: new Date().toISOString(),
        skillBreakdown: {}
      },
      phases: []
    };
  }

  private static mapToSkillId(learningMode: string): string {
    switch (learningMode) {
      case 'multiplication': return 'arithmetic.multiplication.fluency';
      case 'skipcount': return 'arithmetic.skipcount.sequence';
      case 'pattern': return 'arithmetic.pattern.recognition';
      default: return 'arithmetic.multiplication.retrieval';
    }
  }

  private static getConfidenceLevel(attempts: number): 'low' | 'medium' | 'high' {
    if (attempts < 10) return 'low';
    if (attempts < 30) return 'medium';
    return 'high';
  }

  private static getBand(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }
}
