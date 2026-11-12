/**
 * CC2-02A deterministic golden-run exporter.
 *
 * Driven against the same state machine as the UI and unit tests. The JSON
 * contains no invented events or human information; every value comes from
 * a replayable seeded 20-row run.
 */
import { CircuitClimbCore, replayCore } from '../core/CircuitClimbCore';

const core = new CircuitClimbCore('cc2-02a-golden-20');
for (let row = 1; row <= 20; row += 1) {
  const before = core.snapshot();
  const problem = before.currentProblem;

  // Exercise legitimate wrong travels/shorts/returns on every fourth row.
  if (row % 4 === 2) {
    const wrong = problem.options.find(option => option.platformId !== problem.correctPlatformId);
    if (!wrong) throw new Error('GOLDEN_NO_WRONG_OPTION');
    const attempt = core.selectPlatform(wrong.platformId);
    if (!attempt.ok || attempt.correct) throw new Error('GOLDEN_WRONG_SELECTION_FAILED');
    core.advanceTicks(300);
    if (core.snapshot().phase !== 'ready') throw new Error('GOLDEN_RETURN_FAILED');
  }

  const accepted = core.selectPlatform(problem.correctPlatformId);
  if (!accepted.ok || !accepted.correct) throw new Error('GOLDEN_CORRECT_SELECTION_FAILED');
  core.advanceTicks(300);
  if (core.snapshot().completedRows !== row) throw new Error('GOLDEN_ROW_NOT_COMMITTED');
}

const replay = core.replayExport();
const reproduced = replayCore(replay);
if (reproduced.stateDigest() !== core.stateDigest()) {
  throw new Error('GOLDEN_REPLAY_NOT_DETERMINISTIC');
}

const finalState = core.snapshot();
const summary = {
  rows: finalState.completedRows,
  solvedEquations: finalState.solved,
  acceptedAttempts: finalState.attempts,
  correctAttempts: finalState.correctAttempts,
  wrongAttempts: finalState.wrongAttempts,
  completedCells: finalState.completedCells,
  score: finalState.score,
  finalTick: finalState.tick,
  stateDigest: core.stateDigest(),
};
process.stdout.write(JSON.stringify({
  schemaVersion: 'cc2-02a-golden-evidence/v1',
  summary,
  replay,
  events: core.eventLog(),
}, null, 2) + '\n');
