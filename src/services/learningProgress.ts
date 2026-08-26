/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORAGE_KEYS } from '../constants';
import { Telemetry } from './telemetry';

export const LearningProgressMap = {
  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return stored ? JSON.parse(stored) : { multiplication: {} };
    } catch (e) {
      return { multiplication: {} };
    }
  },
  save(data: any) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data));
  },

  recordMultiplicationAttempt(base: number, factor: number, isCorrect: boolean) {
    const data = this.load();
    const key = `${base}x${factor}`;
    if (!data.multiplication[key]) {
      data.multiplication[key] = { attempts: 0, correct: 0, streak: 0, lastSeen: null };
    }
    const rec = data.multiplication[key];
    rec.attempts += 1;
    if (isCorrect) {
      rec.correct += 1;
      rec.streak += 1;
    } else {
      rec.streak = 0;
    }
    rec.lastSeen = Date.now();
    this.save(data);

    const isNowMastered = this.isMastered(base, factor);
    Telemetry.log('MASTERY_UPDATE', {
      factKey: key,
      attempts: rec.attempts,
      correct: rec.correct,
      streak: rec.streak,
      mastered: isNowMastered,
    });
  },

  isMastered(base: number, factor: number) {
    const data = this.load();
    const key = `${base}x${factor}`;
    const rec = data.multiplication[key];
    if (!rec) return false;
    return rec.attempts >= 5 && rec.correct / rec.attempts >= 0.9 && rec.streak >= 3;
  },

  getMultiplicationMastery(base: number) {
    const data = this.load();
    let res = { mastered: 0, learning: 0, weak: 0 };
    for (let i = 1; i <= 12; i++) {
      const rec = data.multiplication[`${base}x${i}`];
      if (!rec) res.weak++;
      else if (this.isMastered(base, i)) res.mastered++;
      else if (rec.correct / rec.attempts < 0.6) res.weak++;
      else res.learning++;
    }
    return res;
  },
};
