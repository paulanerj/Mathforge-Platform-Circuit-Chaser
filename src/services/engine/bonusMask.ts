/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatrixTile } from './matrix';

/*
AI_CONTEXT:
Future Cognitive Engine Experiment — Non-Authoritative
This file is quarantined exploratory work.
It does not replace the current baseline SpeedMath gameplay model.
Current gameplay authority remains the linear arithmetic session model driven by:
steps[], stepIndex, currentNumber, correctAnswer, distractors[], reducer transitions, and timing kernel logic.
This file must not be interpreted as active engine law.
*/

export enum BonusType {
  MULTIPLIER = 'MULTIPLIER',
  TIME_FREEZE = 'TIME_FREEZE',
  SYMBOL_CLEAR = 'SYMBOL_CLEAR',
  LOAD_REDUCTION = 'LOAD_REDUCTION'
}

export interface BonusMask {
  id: string;
  type: BonusType;
  value: number;
  duration: number; // Ticks
  active: boolean;
}

export class BonusMaskSystem {
  private activeMasks: BonusMask[] = [];

  /**
   * Evolves the current mask state based on a "Cognitive Signal".
   * For example, a "Perfect Chain" triggers a multiplier.
   */
  evolve(signal: { type: string, value: any }, virtualTime: number): BonusMask | null {
    if (signal.type === 'PERFECT_CHAIN' && signal.value >= 3) {
      const mask: BonusMask = {
        id: `mask-${virtualTime}`,
        type: BonusType.MULTIPLIER,
        value: 2,
        duration: 10,
        active: true
      };
      this.activeMasks.push(mask);
      return mask;
    }
    return null;
  }

  /**
   * Updates the duration of active masks.
   */
  tick() {
    this.activeMasks = this.activeMasks
      .map(m => ({ ...m, duration: m.duration - 1 }))
      .filter(m => m.duration > 0);
  }

  getActiveMasks(): BonusMask[] {
    return this.activeMasks;
  }

  /**
   * Applies active masks to a tile's value or score.
   */
  apply(tile: MatrixTile): MatrixTile {
    let modifiedTile = { ...tile };
    this.activeMasks.forEach(mask => {
      if (mask.type === BonusType.MULTIPLIER) {
        modifiedTile.metadata.multiplier = (modifiedTile.metadata.multiplier || 1) * mask.value;
      }
    });
    return modifiedTile;
  }
}
