/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LoadSummary {
  meanLatency: number;
  maxLatency: number;
  latencyDrift: number;
  meanAttemptDepth: number;
  maxAttemptDepth: number;
  loadIndex: number; // 0.0 to 1.0
}

export class LoadPipeline {
  static compute(events: any[]): LoadSummary {
    const interactiveEvents = events.filter(e => e.type === 'ANSWER_CORRECT' || e.type === 'ANSWER_REJECT');
    
    if (interactiveEvents.length === 0) {
      return {
        meanLatency: 0,
        maxLatency: 0,
        latencyDrift: 0,
        meanAttemptDepth: 1,
        maxAttemptDepth: 1,
        loadIndex: 0
      };
    }

    const latencies = interactiveEvents.map(e => e.latency || 0).filter(l => l > 0);
    const depths = interactiveEvents.map(e => e.attemptDepth || 1);

    const meanLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const meanAttemptDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
    const maxAttemptDepth = Math.max(...depths);

    // Latency Drift (comparison of late vs early latencies)
    let latencyDrift = 0;
    if (latencies.length >= 4) {
      const early = latencies.slice(0, Math.floor(latencies.length / 2));
      const late = latencies.slice(-Math.floor(latencies.length / 2));
      const earlyMean = early.reduce((a, b) => a + b, 0) / early.length;
      const lateMean = late.reduce((a, b) => a + b, 0) / late.length;
      latencyDrift = earlyMean > 0 ? lateMean / earlyMean : 1;
    }

    // Load Index: Combination of latency drift and attempt depth
    // 1.0 = high load, 0.0 = low load
    const depthFactor = Math.min(1.0, (meanAttemptDepth - 1) / 2);
    const driftFactor = Math.min(1.0, Math.max(0, (latencyDrift - 1.0) / 1.0));
    const loadIndex = (depthFactor * 0.6) + (driftFactor * 0.4);

    return {
      meanLatency,
      maxLatency,
      latencyDrift,
      meanAttemptDepth,
      maxAttemptDepth,
      loadIndex
    };
  }
}
