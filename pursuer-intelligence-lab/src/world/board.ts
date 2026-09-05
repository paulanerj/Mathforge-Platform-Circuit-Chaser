/**
 * THE BOARD: rows of three platforms, generated ahead of the learner.
 *
 * Production generates rows six ahead of the learner (`ensureRows`) and culls
 * behind. The lab reproduces the generation rule exactly, because how far
 * ahead the board exists decides how far the search frontier can reach — and
 * a pursuer that looks somewhere the board does not yet have is a different
 * pursuer. It does NOT reproduce culling: the lab keeps every row so a replay
 * can be scrubbed backwards.
 */

import type { GraphWorld } from './graphWorld';

export interface Platform {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dead: boolean;
  /** Presentation only. The value shown on the card in realistic mode. */
  value: number | null;
}

export interface BoardRow {
  index: number;
  y: number;
  platforms: Platform[];
}

/** How far ahead of the learner production generates rows. */
export const ROWS_AHEAD = 6;

export function makeRow(world: GraphWorld, index: number): BoardRow {
  return {
    index,
    y: -index * world.rowGap,
    platforms: world.columns.map((x, column) => ({
      id: `row-${index}-column-${column}`,
      row: index,
      column,
      x,
      y: -index * world.rowGap,
      width: world.platformWidth,
      height: world.platformHeight,
      dead: false,
      value: null,
    })),
  };
}

export class Board {
  readonly rows: BoardRow[] = [];

  constructor(private world: GraphWorld) {
    this.rows.push(makeRow(world, 0));
    this.ensureRows(0);
  }

  get rowCount(): number { return this.rows.length; }

  getRow(index: number): BoardRow | null {
    return this.rows.find((row) => row.index === index) ?? null;
  }

  ensureRows(learnerRow: number): void {
    while (this.rows[this.rows.length - 1].index <= learnerRow + ROWS_AHEAD) {
      this.rows.push(makeRow(this.world, this.rows[this.rows.length - 1].index + 1));
    }
  }

  activePlatforms(): Platform[] {
    return this.rows.flatMap((row) => row.platforms).filter((platform) => !platform.dead);
  }
}
