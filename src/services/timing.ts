/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameMode } from '../types';
import { getModeContract } from './modeContract';

/*
AI_CONTEXT:
TimingKernel is the low-level heartbeat of the game's temporal mechanics.
It manages the 1s tick interval used for step timers and dark-mode stopwatches.
Do not change the 1s tick granularity in this packet; future packets will 
introduce sub-second "Cognitive Rhythm" mechanics.
*/
export class TimingKernel {
  isRunning: boolean = false;
  intervalId: NodeJS.Timeout | null = null;
  remaining: number = 0;
  duration: number = 0;
  activeMode: GameMode = 'none';
  callbacks: { onTick?: (rem: number, dur: number) => void; onExpire?: () => void } = {};

  constructor() {
    this.stop();
  }

  startStep(config: { mode: GameMode; durationSeconds: number; onTick?: any; onExpire?: any }) {
    this.stop();
    this.activeMode = config.mode;
    this.duration = config.durationSeconds;
    this.remaining = config.durationSeconds;
    this.callbacks = { onTick: config.onTick, onExpire: config.onExpire };
    if (this.activeMode === 'none') return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  tick() {
    if (!this.isRunning) return;
    this.remaining--;
    if (this.callbacks.onTick) this.callbacks.onTick(this.remaining, this.duration);
    if (this.remaining <= 0) {
      this.stop();
      if (this.callbacks.onExpire) this.callbacks.onExpire();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.remaining = 0;
    this.activeMode = 'none';
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  resume() {
    if (this.isRunning) return;
    if (this.activeMode !== 'none' && this.remaining > 0) {
      this.isRunning = true;
      this.intervalId = setInterval(() => this.tick(), 1000);
    }
  }

  getRemaining() {
    return this.remaining;
  }
}

export const timingKernel = new TimingKernel();

/*
AI_CONTEXT:
ModeController maps high-level GameModes to low-level timing behaviors.
It uses the ModeContract to determine how time should be interpreted 
(e.g., as pressure, concealment, or interruption).
*/
export const modeController = {
  getModeConfig(mode: GameMode) {
    const contract = getModeContract(mode);
    
    // Map timing philosophy to visual component requirements
    const map: Record<string, any> = {
      normal: { usesStepTimer: true, usesRingTimer: true, usesDarkStopwatch: false },
      qmm: { usesStepTimer: true, usesRingTimer: true, usesDarkStopwatch: false },
      survival: { usesStepTimer: true, usesRingTimer: true, usesDarkStopwatch: false },
      dark: { usesStepTimer: false, usesRingTimer: false, usesDarkStopwatch: true },
    };

    // Ensure QMM timing is interpreted as concealment pressure
    if (contract.timingPhilosophy === 'concealment') {
      // QMM currently uses standard timers but with tighter constraints applied in generation
    }

    return map[mode] || map.normal;
  },

  getStepTimer(mode: GameMode, learningMode: string, config: any, difficultyTimer?: number): number {
    let baseTimer = difficultyTimer ?? config.quickMindInterval;
    
    if (learningMode === 'pattern') return 0;
    
    if (mode === 'dark') {
       return Math.max(baseTimer, config.darkModeInterval || 5);
    }
    
    if (mode === 'qmm') {
       return Math.max(2, Math.min(baseTimer, 8));
    }
    
    return baseTimer;
  }
};

/*
AI_CONTEXT:
GameEngine orchestrates the lifecycle of a single game step's timing.
It ensures that the TimingKernel is correctly initialized based on the 
current mode's behavioral contract.
*/
export const gameEngine = {
  currentStepId: '',
  startStep(config: any, currentModeStr: GameMode, stepId: string, durationSeconds: number, onExpire: () => void) {
    const modeConfig = modeController.getModeConfig(currentModeStr);
    const isNewStep = stepId !== this.currentStepId;
    this.currentStepId = stepId;
    if (!isNewStep && timingKernel.getRemaining() > 0) return timingKernel.resume();
    if (durationSeconds <= 0) return timingKernel.stop();
    if (modeConfig.usesDarkStopwatch) timingKernel.startStep({ mode: 'dark', durationSeconds, onExpire });
    else if (modeConfig.usesStepTimer && config.timerOn) timingKernel.startStep({ mode: 'normal', durationSeconds, onExpire });
    else timingKernel.stop();
  },
  stopAll() {
    timingKernel.pause();
  },
};
