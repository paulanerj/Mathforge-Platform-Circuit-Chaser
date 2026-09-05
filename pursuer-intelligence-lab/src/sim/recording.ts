/**
 * RECORD AND REPLAY.
 *
 * A Brain comparison is worthless if the learner does something different each
 * time, and a human's "that one felt smarter" is worthless if the two runs
 * were not the same run. So a recording stores the learner's ACTUAL WALKED
 * PATH and the exact simulation time it started walking it — not the column it
 * chose, and not a seed.
 *
 * Storing the path rather than the choice is the whole trick. Production's
 * learner can steer its route away from the bot, which would make the path
 * depend on which Brain is chasing; a recorded path cannot, because it is
 * already decided. Replay the same recording against Brain A, Brain B and
 * Brain C and the Spark does precisely the same thing three times.
 */

import type { RoutePoint } from '../learner/circuitClimbLearnerRouting';

export const RECORDING_SCHEMA = 'circuit-climb-lab/learner-run/v1';

export interface RecordedSelection {
  /** Simulation time the learner began walking. */
  atMs: number;
  /** 0 = LEFT, 1 = CENTRE, 2 = RIGHT. Recorded for reading, not for replay. */
  column: number;
  /** The path actually walked, in logical units. THIS is what replay follows. */
  path: RoutePoint[];
  /** The row the learner was on when it set off. */
  fromRow: number;
}

export interface RecordedRun {
  schema: string;
  id: string;
  label: string;
  createdAt: string | null;
  /** Framing the run was recorded at. A replay at another framing is refused. */
  framingPercent: number;
  /** Units per millisecond the learner walked at. */
  speed: number;
  selections: RecordedSelection[];
  /** Total simulation time the run covered, including any stationary tail. */
  durationMs: number;
  /** Free notes, for a tester describing what they were trying to do. */
  notes: string;
}

export class RunRecorder {
  private selections: RecordedSelection[] = [];

  record(selection: RecordedSelection): void {
    this.selections.push({ ...selection, path: selection.path.map((p) => ({ x: p.x, y: p.y })) });
  }

  reset(): void { this.selections = []; }

  get count(): number { return this.selections.length; }

  finish(options: {
    id: string; label: string; framingPercent: number; speed: number;
    durationMs: number; notes?: string; createdAt?: string | null;
  }): RecordedRun {
    return {
      schema: RECORDING_SCHEMA,
      id: options.id,
      label: options.label,
      createdAt: options.createdAt ?? null,
      framingPercent: options.framingPercent,
      speed: options.speed,
      selections: this.selections.map((s) => ({ ...s, path: s.path.map((p) => ({ ...p })) })),
      durationMs: options.durationMs,
      notes: options.notes ?? '',
    };
  }
}

/** Read a recording from untrusted JSON. Returns null with a reason if unusable. */
export function parseRecordedRun(value: unknown): { run: RecordedRun | null; failure: string | null } {
  if (typeof value !== 'object' || value === null) return { run: null, failure: 'Not a JSON object.' };
  const candidate = value as Partial<RecordedRun>;
  if (candidate.schema !== RECORDING_SCHEMA) {
    return { run: null, failure: `Unknown recording schema ${JSON.stringify(candidate.schema)}; this build reads "${RECORDING_SCHEMA}".` };
  }
  if (!Array.isArray(candidate.selections)) return { run: null, failure: 'No selections.' };
  for (const [index, selection] of candidate.selections.entries()) {
    if (!Array.isArray(selection?.path) || selection.path.length < 2) {
      return { run: null, failure: `Selection ${index} has no usable path.` };
    }
    if (!Number.isFinite(selection.atMs)) {
      return { run: null, failure: `Selection ${index} has no start time.` };
    }
  }
  if (!Number.isFinite(candidate.speed) || !Number.isFinite(candidate.durationMs)) {
    return { run: null, failure: 'Missing speed or duration.' };
  }
  return { run: candidate as RecordedRun, failure: null };
}
