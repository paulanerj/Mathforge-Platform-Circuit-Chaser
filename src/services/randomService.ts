/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
PROTECTED CORE ENGINE FILE: Do not modify without explicit PM approval.
*/

/*
AI_CONTEXT:
This service centralizes all non-deterministic (random) selection logic.
It uses a seeded PRNG (Mulberry32) to ensure deterministic cognitive load 
sequences for telemetry, debugging, and replay.
Do not spread raw Math.random() calls; route through this service.
*/

class SeededPRNG {
  private state: number;

  constructor(seed: string) {
    this.state = this.hash(seed);
  }

  private hash(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  // Mulberry32
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

let prng = new SeededPRNG('default-seed');

export const RandomService = {
  /**
   * Initializes the PRNG with a specific seed.
   */
  init(seed: string) {
    prng = new SeededPRNG(seed);
  },

  /**
   * Returns a random integer between min and max (inclusive).
   */
  getInt(min: number, max: number): number {
    return Math.floor(prng.next() * (max - min + 1)) + min;
  },

  /**
   * Returns a random element from an array.
   */
  getElement<T>(arr: T[]): T {
    return arr[Math.floor(prng.next() * arr.length)];
  },

  /**
   * Returns true with a given probability (0 to 1).
   */
  chance(probability: number): boolean {
    return prng.next() < probability;
  },

  /**
   * Shuffles an array (Fisher-Yates).
   */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Returns a random float between 0 and 1.
   */
  next(): number {
    return prng.next();
  }
};
