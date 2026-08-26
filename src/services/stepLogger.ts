import { StepResult, ActivitySessionResult } from '../types/analytics';

const STORAGE_KEY = 'speedmath.stepResults';

class StepLoggerService {
  private currentSession: ActivitySessionResult | null = null;
  private currentMode: string = '';
  private currentStreak = 0;
  private maxStreak = 0;

  startSession(mode: string) {
    this.currentMode = mode;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.currentSession = {
      mode,
      steps: [],
      totalSteps: 0,
      correct: 0,
      mistakes: 0,
      timeouts: 0,
      avgResponseTime: 0,
      targetResponseTime: 0,
      maxStreak: 0,
      timestamp: Date.now()
    };
  }

  logStep(result: StepResult) {
    if (!this.currentSession) return;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[StepLogger] Step Logged:', JSON.stringify(result, null, 2));
    }

    this.currentSession.steps.push(result);
    this.currentSession.totalSteps++;
    if (result.timedOut) {
      this.currentSession.timeouts++;
      this.currentStreak = 0;
    } else if (result.correct) {
      this.currentSession.correct++;
      this.currentStreak++;
      this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
    } else {
      this.currentSession.mistakes++;
      this.currentStreak = 0;
    }
    
    // Update summary
    this.currentSession.maxStreak = this.maxStreak;
    
    const answeredSteps = this.currentSession.steps.filter(s => !s.timedOut);
    if (answeredSteps.length > 0) {
      const totalTime = answeredSteps.reduce((acc, s) => acc + s.responseTime, 0);
      this.currentSession.avgResponseTime = Number((totalTime / answeredSteps.length).toFixed(2));
    }
  }

  endSession(targetResponseTime: number) {
    if (!this.currentSession) return;
    this.currentSession.targetResponseTime = targetResponseTime;
    
    // Persist to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let data = stored ? JSON.parse(stored) : { sessions: [] };
      data.sessions.push(this.currentSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[StepLogger] Session Ended, Persisted to Local Storage:', this.currentSession);
      }
    } catch (e) {
      console.warn("Failed to persist step results to localStorage:", e);
    }
    
    this.currentSession = null;
  }

  getCurrentSession() {
    return this.currentSession;
  }
}

export const StepLogger = new StepLoggerService();
