/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionSummary, InterventionSignal, InterventionCluster, SessionInterventionSummary } from '../../types/learning';
import { InterventionTaxonomy } from './interventionTaxonomy';

export class InterventionDetector {
  private static readonly FATIGUE_THRESHOLD_START = 0.7; // 70% through the session
  private static readonly LATENCY_DRIFT_THRESHOLD = 1.5; // 50% increase in latency
  private static readonly ATTEMPT_DEPTH_THRESHOLD = 2.5; // Mean depth > 2.5

  static analyze(events: any[], masterySummary: SessionSummary): SessionInterventionSummary {
    const signals: InterventionSignal[] = [];
    const totalSteps = masterySummary.totalSteps;
    
    // 1. Calculate Fatigue Index
    const fatigueIndex = this.calculateFatigueIndex(events, totalSteps);

    // 2. Detect Behavioral Signals
    this.detectBehavioralSignals(events, signals, fatigueIndex);

    // 3. Detect Conceptual Signals
    this.detectConceptualSignals(events, signals, fatigueIndex);

    // 4. Detect Cognitive Mode Signals (QMM, Dark Mode)
    this.detectCognitiveModeSignals(events, signals, fatigueIndex);

    // 5. Cluster Signals
    const clusters = this.clusterSignals(signals);

    // 6. Determine Primary Intervention
    const primaryInterventionNeeded = this.determinePrimaryIntervention(clusters);

    return {
      signals,
      clusters,
      fatigueIndex,
      primaryInterventionNeeded
    };
  }

  private static calculateFatigueIndex(events: any[], totalSteps: number): number {
    if (totalSteps < 10) return 0;
    
    const interactiveEvents = events.filter(e => e.type === 'ANSWER_CORRECT' || e.type === 'ANSWER_REJECT');
    if (interactiveEvents.length < 5) return 0;

    const earlyEvents = interactiveEvents.slice(0, Math.floor(interactiveEvents.length / 3));
    const lateEvents = interactiveEvents.slice(-Math.floor(interactiveEvents.length / 3));

    const earlyLatency = this.getMeanLatency(earlyEvents);
    const lateLatency = this.getMeanLatency(lateEvents);

    if (earlyLatency === 0) return 0;

    const drift = lateLatency / earlyLatency;
    // Normalize drift to 0.0 - 1.0 range (1.0 = 2x latency or more)
    return Math.min(1.0, Math.max(0, (drift - 1.0) / 1.0));
  }

  private static getMeanLatency(events: any[]): number {
    const latencies = events.map(e => e.latency || 0).filter(l => l > 0);
    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  private static detectBehavioralSignals(events: any[], signals: InterventionSignal[], fatigueIndex: number) {
    // Timeout Clustering
    let timeoutCount = 0;
    let lastTimeoutIndex = -1;

    events.forEach((event, index) => {
      if (event.type === 'ANSWER_REJECT' && event.reason === 'timeout') {
        if (lastTimeoutIndex !== -1 && (index - lastTimeoutIndex) <= 3) {
          timeoutCount++;
        } else {
          timeoutCount = 1;
        }
        lastTimeoutIndex = index;

        if (timeoutCount >= 3) {
          signals.push({
            type: 'TIMEOUT_CLUSTERING',
            category: 'behavioral',
            timestamp: event.timestamp,
            stepIndex: event.stepIndex,
            metadata: { count: timeoutCount },
            confidence: 0.8 * (1 - fatigueIndex * 0.5) // Lower confidence if fatigued
          });
        }
      }
    });

    // Structural Hesitation
    events.forEach(event => {
      if (event.attemptDepth > this.ATTEMPT_DEPTH_THRESHOLD) {
        signals.push({
          type: 'STRUCTURAL_HESITATION',
          category: 'behavioral',
          timestamp: event.timestamp,
          stepIndex: event.stepIndex,
          phase: event.phase,
          metadata: { depth: event.attemptDepth },
          confidence: 0.7
        });
      }
    });
  }

  private static detectConceptualSignals(events: any[], signals: InterventionSignal[], fatigueIndex: number) {
    // This is a foundation - in a real app we'd analyze the specific wrong answers
    // For now we use error motifs in specific phases
    const phaseErrors: Record<string, number> = {};
    
    events.forEach(event => {
      if (event.type === 'ANSWER_REJECT' && event.phase) {
        phaseErrors[event.phase] = (phaseErrors[event.phase] || 0) + 1;
        
        if (phaseErrors[event.phase] >= 3) {
          // If errors are occurring in a "carry" phase, it's likely a carry omission
          if (event.phase.includes('carry')) {
            signals.push({
              type: 'CARRY_OMISSION',
              category: 'conceptual',
              timestamp: event.timestamp,
              stepIndex: event.stepIndex,
              phase: event.phase,
              metadata: { errorCount: phaseErrors[event.phase] },
              confidence: 0.6 * (1 - fatigueIndex * 0.3)
            });
          }
        }
      }
    });
  }

  private static detectCognitiveModeSignals(events: any[], signals: InterventionSignal[], fatigueIndex: number) {
    // QMM Continuity Collapse
    events.forEach(event => {
      if (event.mode === 'qmm' && event.type === 'ANSWER_REJECT') {
        signals.push({
          type: 'QMM_CONTINUITY_COLLAPSE',
          category: 'cognitive_mode',
          timestamp: event.timestamp,
          stepIndex: event.stepIndex,
          metadata: { mode: 'qmm' },
          confidence: 0.75
        });
      }

      // Dark Mode Retention
      if (event.mode === 'dark' && event.type === 'ANSWER_REJECT') {
        signals.push({
          type: 'DARK_MODE_RETENTION_FAILURE',
          category: 'cognitive_mode',
          timestamp: event.timestamp,
          stepIndex: event.stepIndex,
          metadata: { mode: 'dark' },
          confidence: 0.8
        });
      }
    });
  }

  private static clusterSignals(signals: InterventionSignal[]): Record<string, InterventionCluster> {
    const clusters: Record<string, InterventionCluster> = {};

    signals.forEach(signal => {
      if (!clusters[signal.type]) {
        clusters[signal.type] = {
          type: signal.type,
          count: 0,
          meanConfidence: 0,
          firstObserved: signal.timestamp,
          lastObserved: signal.timestamp,
          recommendedClass: InterventionTaxonomy[signal.type]?.recommendedClass || 'unknown'
        };
      }

      const cluster = clusters[signal.type];
      cluster.count++;
      cluster.meanConfidence = (cluster.meanConfidence * (cluster.count - 1) + signal.confidence) / cluster.count;
      cluster.lastObserved = signal.timestamp;
    });

    return clusters;
  }

  private static determinePrimaryIntervention(clusters: Record<string, InterventionCluster>): string | null {
    let bestType: string | null = null;
    let maxScore = -1;

    Object.values(clusters).forEach(cluster => {
      // Score based on count and confidence
      const score = cluster.count * cluster.meanConfidence;
      if (score > maxScore) {
        maxScore = score;
        bestType = cluster.type;
      }
    });

    return bestType;
  }
}
