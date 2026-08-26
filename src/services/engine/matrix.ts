/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RandomService } from '../randomService';

/*
AI_CONTEXT:
Future Cognitive Engine Experiment — Non-Authoritative
This file is quarantined exploratory work.
It does not replace the current baseline SpeedMath gameplay model.
Current gameplay authority remains the linear arithmetic session model driven by:
steps[], stepIndex, currentNumber, correctAnswer, distractors[], reducer transitions, and timing kernel logic.
This file must not be interpreted as active engine law.
*/

export interface MatrixTile {
  id: string;
  value: number;
  operation: string;
  target: number;
  active: boolean;
  metadata: Record<string, any>;
}

export class CognitiveMatrix {
  private grid: (MatrixTile | null)[][];
  private rows: number;
  private cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  /**
   * Fills empty cells in the matrix using deterministic generation.
   */
  fill(generator: (row: number, col: number) => MatrixTile) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          this.grid[r][c] = generator(r, c);
        }
      }
    }
  }

  /**
   * Clears a tile at a specific position.
   */
  clear(row: number, col: number) {
    if (this.isValid(row, col)) {
      this.grid[row][col] = null;
    }
  }

  /**
   * Applies "Gravity" to the matrix, shifting tiles down to fill gaps.
   * Returns a list of movements for animation projection.
   */
  applyGravity(): { from: [number, number], to: [number, number] }[] {
    const movements: { from: [number, number], to: [number, number] }[] = [];
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
            movements.push({ from: [r, c], to: [emptyRow, c] });
          }
          emptyRow--;
        }
      }
    }
    return movements;
  }

  isValid(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getTile(row: number, col: number): MatrixTile | null {
    return this.isValid(row, col) ? this.grid[row][col] : null;
  }

  serialize() {
    return JSON.stringify(this.grid);
  }
}
