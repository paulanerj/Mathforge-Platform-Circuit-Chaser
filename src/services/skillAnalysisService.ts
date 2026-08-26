import { ActivitySessionResult, SkillAggregate, SkillAnalysisReport, SkillSignal } from "../types/analytics";

const RESULTS_STORAGE_KEY = 'speedmath.stepResults';
const ANALYSIS_STORAGE_KEY = 'speedmath.skillAnalysis';

class SkillAnalysisService {
  /**
   * Reads raw step results from local storage and performs full aggregation & signal detection.
   * Computes the new report, saves it, and returns it.
   */
  public analyzeAndGenerateReport(): SkillAnalysisReport {
    const rawSessions = this.loadRawSessions();
    const aggregates = this.aggregateSkills(rawSessions);
    const report = this.detectSignals(aggregates, rawSessions);
    
    this.saveReport(report);
    
    return report;
  }

  private loadRawSessions(): ActivitySessionResult[] {
    try {
      const stored = localStorage.getItem(RESULTS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.sessions || [];
      }
    } catch (e) {
      console.warn("Failed to load raw sessions for analysis", e);
    }
    return [];
  }

  /**
   * Part 4: Aggregation Process
   * Groups every step result by skillKey, tallies correct/mistakes/timeouts,
   * accumulates responseTime, and similarly aggregates subSkills.
   */
  private aggregateSkills(sessions: ActivitySessionResult[]): Record<string, SkillAggregate> {
    const output: Record<string, SkillAggregate> = {};

    sessions.forEach(session => {
      session.steps.forEach(step => {
        const { skillKey, subSkill, correct, timedOut, targetResponseTime } = step;
        const isAnswered = !timedOut; // Only answered queries have valid response times to average generally, but prompts states to accumulate response time. The prompt says "Also: Timeouts should: count as mistakes, count separately as timeouts".

        if (!output[skillKey]) {
          output[skillKey] = {
            skillKey,
            attempts: 0,
            correct: 0,
            mistakes: 0,
            timeouts: 0,
            totalResponseTime: 0,
            avgResponseTime: 0,
            targetResponseTimes: [],
            avgTarget: 0,
            subSkills: {},
            consistency: 0,
            maxStreak: 0,
            confidenceAverage: 0,
            totalConfidence: 0,
            currentStreak: 0,
          };
        }

        const agg = output[skillKey];
        agg.attempts++;
        if (correct) {
          agg.correct++;
        } else if (timedOut) {
          agg.timeouts++;
          agg.mistakes++; // count timeout as mistake per edge case #3
        } else {
          agg.mistakes++;
        }

        if (step.confidenceLevel !== undefined) {
          agg.totalConfidence += step.confidenceLevel;
        }

        if (correct && step.confidenceLevel === 1) {
          agg.currentStreak++;
          agg.maxStreak = Math.max(agg.maxStreak, agg.currentStreak);
        } else {
          agg.currentStreak = 0;
        }

        // We only add response times for non-timeout steps. Timeouts shouldn't skew the time avg.
        if (isAnswered) {
          agg.totalResponseTime += step.responseTime;
        }
        agg.targetResponseTimes.push(targetResponseTime);

        if (subSkill) {
          if (!agg.subSkills[subSkill]) {
            agg.subSkills[subSkill] = {
              attempts: 0,
              correct: 0,
              mistakes: 0,
              timeouts: 0,
              totalResponseTime: 0,
              avgResponseTime: 0,
            };
          }

          const sub = agg.subSkills[subSkill];
          sub.attempts++;
          if (correct) {
            sub.correct++;
          } else if (timedOut) {
            sub.timeouts++;
            sub.mistakes++;
          } else {
            sub.mistakes++;
          }

          if (isAnswered) {
            sub.totalResponseTime += step.responseTime;
          }
        }
      });
    });

    // Compute averages
    for (const key of Object.keys(output)) {
      const agg = output[key];
      const validAttempts = agg.attempts - agg.timeouts;
      agg.avgResponseTime = validAttempts > 0 ? agg.totalResponseTime / validAttempts : 0;
      agg.avgTarget = agg.targetResponseTimes.length > 0 
        ? agg.targetResponseTimes.reduce((a, b) => a + b, 0) / agg.targetResponseTimes.length 
        : 5;
      
      agg.confidenceAverage = agg.attempts > 0 ? agg.totalConfidence / agg.attempts : 0;
      // Define consistency as some measure, eg. accuracy smoothed by streaks or confidence. 
      // The prompt suggests just adding it, accuracy is commonly used, or streak / attempts.
      // We will set consistency = agg.maxStreak > 0 ? Math.min(1, agg.maxStreak / 5) : 0, or just based on confidence.
      agg.consistency = agg.attempts > 0 ? agg.maxStreak / Math.max(agg.attempts, 1) : 0; // naive consistency

      for (const subKey of Object.keys(agg.subSkills)) {
        const sub = agg.subSkills[subKey];
        const subValidAttempts = sub.attempts - sub.timeouts;
        sub.avgResponseTime = subValidAttempts > 0 ? sub.totalResponseTime / subValidAttempts : 0;
      }
    }

    return output;
  }

  /**
   * Part 5: Signal Detection Rules
   * Applies the rule set over the aggregated skills maps.
   */
  private detectSignals(aggregates: Record<string, SkillAggregate>, sessions: ActivitySessionResult[]): SkillAnalysisReport {
    const report: SkillAnalysisReport = {
      weak: [],
      slow: [],
      strong: [],
      time_pressure: [],
      repeated_error: []
    };

    // Build timeline to check sliding window "last 10 attempts" for time_pressure
    const skillTimelines: Record<string, boolean[]> = {};
    sessions.forEach(session => {
      session.steps.forEach(step => {
        if (!skillTimelines[step.skillKey]) {
          skillTimelines[step.skillKey] = [];
        }
        skillTimelines[step.skillKey].push(step.timedOut);
      });
    });

    for (const key of Object.keys(aggregates)) {
      const agg = aggregates[key];
      
      const accuracy = agg.attempts > 0 ? agg.correct / agg.attempts : 0;
      const target = agg.avgTarget;

      // Ensure minimum attempts
      if (agg.attempts >= 5) {
        // RULE A - WEAK
        if (accuracy < 0.7) {
          report.weak.push({
            skillKey: agg.skillKey,
            category: "weak",
            reason: `Accuracy is low (${(accuracy * 100).toFixed(0)}%) across ${agg.attempts} attempts.`,
            accuracy,
            avgResponseTime: agg.avgResponseTime,
            attempts: agg.attempts
          });
        }
        
        // RULE B - SLOW
        if (accuracy >= 0.8 && agg.avgResponseTime > target + 2) {
          report.slow.push({
            skillKey: agg.skillKey,
            category: "slow",
            reason: `Good accuracy but slow (avg ${agg.avgResponseTime.toFixed(1)}s vs target ${target.toFixed(1)}s).`,
            accuracy,
            avgResponseTime: agg.avgResponseTime,
            attempts: agg.attempts
          });
        }

        // RULE E - STRONG
        if (accuracy >= 0.95 && agg.avgResponseTime <= target) {
          report.strong.push({
            skillKey: agg.skillKey,
            category: "strong",
            reason: `High mastery. Excellent accuracy (${(accuracy * 100).toFixed(0)}%) and fast speed (${agg.avgResponseTime.toFixed(1)}s).`,
            accuracy,
            avgResponseTime: agg.avgResponseTime,
            attempts: agg.attempts
          });
        }
      }

      // RULE C - TIME PRESSURE (last 10 attempts window)
      const timeline = skillTimelines[key] || [];
      const recent = timeline.slice(-10); // get up to last 10
      const recentTimeouts = recent.filter(t => t).length;
      
      if (recentTimeouts >= 2) {
        report.time_pressure.push({
          skillKey: agg.skillKey,
          category: "time_pressure",
          reason: `Student ran out of time ${recentTimeouts} times in the last 10 attempts on this skill.`,
          accuracy,
          avgResponseTime: agg.avgResponseTime,
          attempts: agg.attempts
        });
      }

      // RULE D - REPEATED ERROR (SUBSKILL)
      for (const subKey of Object.keys(agg.subSkills)) {
        const sub = agg.subSkills[subKey];
        if (sub.mistakes >= 3) {
          const subAcc = sub.attempts > 0 ? sub.correct / sub.attempts : 0;
          report.repeated_error.push({
            skillKey: subKey, // Labeling with the specific subskill key
            category: "repeated_error",
            reason: `Student repeatedly makes mistakes on this specific variation (${sub.mistakes} errors).`,
            accuracy: subAcc,
            avgResponseTime: sub.avgResponseTime,
            attempts: sub.attempts
          });
        }
      }
    }

    return report;
  }

  private saveReport(report: SkillAnalysisReport) {
    try {
      localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(report));
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SkillAnalysisEngine] Report generated and saved.', report);
      }
    } catch(e) {
      console.warn("Failed to save skill analysis report to local storage", e);
    }
  }

  /**
   * Part 7: Human-Readable Summary
   */
  public generateInstructorSummary(report: SkillAnalysisReport): string {
    const parseKey = (k: string) => {
      // transform "multiplication.table.7" -> "Multiplication Table 7"
      return k.split('.')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace(/_/g, ' ');
    };

    const weakText = report.weak.length > 0 
      ? `Weak Areas\n${report.weak.map(s => `- ${parseKey(s.skillKey)}`).join('\n')}` 
      : `Weak Areas\n- None`;

    const slowText = report.slow.length > 0 
      ? `Slow Areas\n${report.slow.map(s => `- ${parseKey(s.skillKey)}`).join('\n')}` 
      : `Slow Areas\n- None`;

    const strongText = report.strong.length > 0 
      ? `Strong Areas\n${report.strong.map(s => `- ${parseKey(s.skillKey)}`).join('\n')}` 
      : `Strong Areas\n- None`;

    return `${weakText}\n\n${slowText}\n\n${strongText}`;
  }
}

export const SkillAnalysisEngine = new SkillAnalysisService();
