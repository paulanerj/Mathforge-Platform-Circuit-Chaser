/**
 * SCRIPTED LEARNER BEHAVIOURS.
 *
 * A human cannot play the same run twice, and a Brain comparison needs the
 * same run three times. These are the shapes of play worth testing a pursuer
 * against, written down so the same one can be run against every candidate.
 *
 * `thinkMs` is the interesting parameter and it is not arbitrary: a person
 * solving arithmetic under threat takes seconds per selection, and the 04B
 * acceptance session averaged roughly six. A pursuer tuned against a learner
 * that clicks as fast as the UI allows is tuned against nobody.
 */

export interface ScriptStep {
  /** Milliseconds the learner stands still before committing. */
  waitMs: number;
  /** 0 = LEFT, 1 = CENTRE, 2 = RIGHT. */
  column: number;
  /** Climb (1) or, where the board allows it, drop back down (-1). */
  rowDelta?: 1 | -1;
}

export interface LearnerScript {
  id: string;
  label: string;
  description: string;
  steps: ScriptStep[];
  /** Milliseconds the learner stands completely still at the end. */
  stationaryMs: number;
}

const climb = (columns: number[], waitMs: number): ScriptStep[] =>
  columns.map((column) => ({ waitMs, column }));

export const LEARNER_SCRIPTS: readonly LearnerScript[] = [
  {
    id: 'STRAIGHT_CENTRE',
    label: 'Straight centre climb',
    description: 'Straight up the middle at a human pace. The simplest thing a learner can do.',
    steps: climb([1, 1, 1, 1, 1], 3000),
    stationaryMs: 15000,
  },
  {
    id: 'ZIGZAG',
    label: 'Left-right zigzag',
    description: 'Alternating outer columns, so every climb is a full board crossing.',
    steps: climb([0, 2, 0, 2, 0], 3000),
    stationaryMs: 20000,
  },
  {
    id: 'CROSS_BOARD',
    label: 'Hard cross-board',
    description: 'Starts on the right and crosses every row. The hardest shape to keep up with.',
    steps: climb([2, 0, 2, 0, 2], 2500),
    stationaryMs: 20000,
  },
  {
    id: 'WAIT_THEN_MOVE',
    label: 'Wait, then move',
    description: 'Stands still long enough to be found, then leaves. Tests whether a commitment survives the learner actually going somewhere.',
    steps: [{ waitMs: 12000, column: 0 }, { waitMs: 1000, column: 2 }, { waitMs: 1000, column: 0 }],
    stationaryMs: 15000,
  },
  {
    id: 'FAST_CLIMBER',
    label: 'Fast climber',
    description: 'A confident learner who barely pauses. The pursuer is always behind.',
    steps: climb([1, 0, 2, 1, 0, 2, 1], 700),
    stationaryMs: 12000,
  },
  {
    id: 'SLOW_CLIMBER',
    label: 'Slow climber',
    description: 'Six seconds of thinking per selection — the pace the 04B acceptance session actually ran at.',
    steps: climb([1, 2, 1, 0], 6000),
    stationaryMs: 20000,
  },
  {
    id: 'LONG_THINK',
    label: 'Long thinking pause',
    description: 'One climb, then twenty-five seconds of standing still. This is the shape the human was watching when they concluded the bot was lost.',
    steps: [{ waitMs: 2000, column: 0 }, { waitMs: 25000, column: 2 }],
    stationaryMs: 25000,
  },
  {
    id: 'MOVE_STOP_MOVE',
    label: 'Move / stop / move',
    description: 'Bursts of climbing separated by long stillness. Tests reacquisition rather than tracking.',
    steps: [
      { waitMs: 800, column: 0 }, { waitMs: 800, column: 2 }, { waitMs: 14000, column: 0 },
      { waitMs: 800, column: 2 }, { waitMs: 14000, column: 1 },
    ],
    stationaryMs: 15000,
  },
  {
    id: 'RETURN_DOWNWARD',
    label: 'Return downward',
    description:
      'Climbs, then drops back down a row. NOTE: production\'s learner transaction only ever climbs, '
      + 'so this exercises a movement the shipped game does not currently allow. It is here because a '
      + 'pursuer that assumes the learner can only go up is making an assumption worth testing.',
    steps: [
      { waitMs: 2500, column: 0 }, { waitMs: 2500, column: 2 },
      { waitMs: 6000, column: 1, rowDelta: -1 }, { waitMs: 4000, column: 0 },
    ],
    stationaryMs: 18000,
  },
];

export function scriptById(id: string): LearnerScript | null {
  return LEARNER_SCRIPTS.find((script) => script.id === id) ?? null;
}

/** Total simulation time a script needs, including its stationary tail. */
export function scriptDurationMs(script: LearnerScript, walkAllowanceMs = 4000): number {
  return script.steps.reduce((total, step) => total + step.waitMs + walkAllowanceMs, 0) + script.stationaryMs;
}
