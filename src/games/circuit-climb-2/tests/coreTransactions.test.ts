import { describe, expect, it } from 'vitest';
import { CircuitClimbCore, replayCore } from '../core/CircuitClimbCore';
import { defaultRunConfig } from '../config/runConfig';

function solveOne(core: CircuitClimbCore): void {
  const before = core.snapshot();
  const answer = core.selectPlatform(before.currentProblem.correctPlatformId);
  expect(answer.ok).toBe(true);
  core.advanceTicks(300);
  const after = core.snapshot();
  expect(after.completedRows).toBe(before.completedRows + 1);
  expect(after.solved.at(-1)!.result).toBe(before.currentProblem.targetValue);
}

function completeTravel(core: CircuitClimbCore): void {
  for (let i = 0; i < 300 && ['outbound', 'return'].includes(core.snapshot().phase); i += 1) {
    core.advanceTicks(1);
  }
  expect(core.snapshot().phase).toBe('ready');
}

describe('CC2-02A: actual source-backed learner transaction core', () => {
  it('begins with exactly three reachable choices, not a derived answer index', () => {
    const core = new CircuitClimbCore('first');
    const state = core.snapshot();
    expect(state.phase).toBe('ready');
    expect(state.currentProblem.options).toHaveLength(3);
    expect(state.currentProblem.options.filter(o => state.spark.value + o.value === state.currentProblem.targetValue)).toHaveLength(1);
  });

  it('accepts wrong, travels to that destination, shorts it and returns without resetting the problem', () => {
    const core = new CircuitClimbCore('wrong-twice');
    const original = core.snapshot();
    const wrong = original.currentProblem.options.filter(o => o.platformId !== original.currentProblem.correctPlatformId);
    for (const option of wrong) {
      const attempt = core.selectPlatform(option.platformId);
      expect(attempt).toMatchObject({ ok: true, correct: false });
      expect(core.snapshot().phase).toBe('outbound');
      completeTravel(core);
      const state = core.snapshot();
      expect(state.spark.value).toBe(original.spark.value);
      expect(state.currentProblem).toEqual(original.currentProblem);
      expect(state.world.rows[1].platforms[option.ordinal].dead).toBe(true);
      expect(core.selectPlatform(option.platformId)).toEqual({ ok: false, reason: 'DEAD_OPTION' });
    }
    solveOne(core);
    const state = core.snapshot();
    expect(state.completedRows).toBe(1);
    expect(state.attempts).toBe(3);
    expect(state.wrongAttempts).toBe(2);
    expect(state.correctAttempts).toBe(1);
    expect(state.solved).toHaveLength(1);
    const events = core.eventLog();
    expect(events.filter(e => e.type === 'ATTEMPT_EVALUATED')).toHaveLength(3);
    expect(events.filter(e => e.type === 'ROW_COMPLETED')).toHaveLength(1);
    expect(events.filter(e => e.type === 'PLATFORM_SHORTED')).toHaveLength(2);
  });

  it('chains true numerical totals and announces the only rebase after four correct landings', () => {
    const core = new CircuitClimbCore('cell-sequence');
    let previous = core.snapshot().currentProblem;
    for (let row = 1; row <= 4; row += 1) {
      const problem = core.snapshot().currentProblem;
      if (row > 1) expect(problem.incomingValue).toBe(previous.targetValue);
      const currentValue = core.snapshot().spark.value;
      expect(currentValue).toBe(problem.incomingValue);
      solveOne(core);
      const after = core.snapshot();
      expect(after.solved.at(-1)!.result).toBe(currentValue + problem.correctValue);
      previous = problem;
    }
    const final = core.snapshot();
    expect(final.completedCells).toBe(1);
    expect(final.currentProblem.cellIndex).toBe(1);
    expect(final.currentProblem.incomingValue).toBeGreaterThanOrEqual(2);
    expect(final.currentProblem.incomingValue).toBeLessThanOrEqual(4);
    const rebases = core.eventLog().filter(event => event.type === 'VOLTAGE_REBASE');
    expect(rebases).toHaveLength(1);
    expect(rebases[0].detail.oldValue).toBe(previous.targetValue);
    expect(rebases[0].detail.newValue).toBe(final.spark.value);
  });

  it('does not count rejected, duplicate, paused or busy selections as math attempts', () => {
    const core = new CircuitClimbCore('reject');
    expect(core.selectPlatform('missing')).toEqual({ ok: false, reason: 'UNKNOWN_PLATFORM' });
    core.pause();
    const p = core.snapshot().currentProblem.options[1].platformId;
    expect(core.selectPlatform(p)).toEqual({ ok: false, reason: 'PAUSED' });
    core.resume();
    expect(core.selectPlatform(p).ok).toBe(true);
    expect(core.selectPlatform(p)).toEqual({ ok: false, reason: 'BUSY' });
    expect(core.snapshot().attempts).toBe(1);
  });

  it('freezes the entire simulation, including a partially travelled route', () => {
    const core = new CircuitClimbCore('pause');
    core.selectPlatform(core.snapshot().currentProblem.correctPlatformId);
    core.advanceTicks(2);
    core.pause();
    const frozen = core.snapshot();
    core.advanceTicks(50);
    expect(core.snapshot()).toEqual(frozen);
    core.resume();
    core.advanceTicks(300);
    expect(core.snapshot().completedRows).toBe(1);
  });

  it('enforces transit protection, grounded capture and exact once terminal result', () => {
    const core = new CircuitClimbCore('shield');
    core.selectPlatform(core.snapshot().currentProblem.correctPlatformId);
    const during = core.snapshot();
    expect(core.attemptCaptureAt(during.spark.x, during.spark.y, 20)).toBe(false);
    completeTravel(core);
    const landed = core.snapshot();
    expect(landed.landingGraceTicks).toBeGreaterThan(0);
    expect(core.attemptCaptureAt(landed.spark.x, landed.spark.y, 20)).toBe(false);
    core.advanceTicks(landed.landingGraceTicks);
    expect(core.attemptCaptureAt(landed.spark.x, landed.spark.y, 20)).toBe(true);
    expect(core.snapshot().endReason).toBe('CAPTURED');
    expect(core.selectPlatform(core.snapshot().currentProblem.correctPlatformId)).toEqual({ ok: false, reason: 'CAPTURED' });
    expect(core.eventLog().filter(e => e.type === 'RUN_ENDED')).toHaveLength(1);
  });

  it('restores an independent run on restart without leaving stale completion', () => {
    const core = new CircuitClimbCore('restart');
    core.selectPlatform(core.snapshot().currentProblem.correctPlatformId);
    const before = core.snapshot().runId;
    core.restart();
    const after = core.snapshot();
    expect(after.runId).not.toBe(before);
    expect(after.tick).toBe(0);
    expect(after.attempts).toBe(0);
    expect(after.phase).toBe('ready');
    expect(core.eventLog().filter(e => e.type === 'RUN_ENDED')).toHaveLength(1);
    expect(core.eventLog().filter(e => e.type === 'RUN_STARTED')).toHaveLength(2);
  });

  it('gives Practice four solved rows, an explicit goal and no falsely completed next row', () => {
    const core = new CircuitClimbCore('practice', { ...defaultRunConfig(), mode: 'practice' });
    for (let i = 0; i < 4; i += 1) solveOne(core);
    expect(core.snapshot().phase).toBe('ended');
    expect(core.snapshot().endReason).toBe('PRACTICE_GOAL');
    expect(core.eventLog().filter(e => e.type === 'ROW_COMPLETED')).toHaveLength(4);
    expect(core.eventLog().filter(e => e.type === 'VOLTAGE_REBASE')).toHaveLength(0);
  });

  it('replays the same input sequence and final tick with an identical world and event ledger', () => {
    const core = new CircuitClimbCore('replay-seed');
    core.selectPlatform(core.snapshot().currentProblem.correctPlatformId);
    core.advanceTicks(300);
    const wrong = core.snapshot().currentProblem.options.find(o => o.platformId !== core.snapshot().currentProblem.correctPlatformId)!;
    core.selectPlatform(wrong.platformId);
    core.advanceTicks(340);
    core.pause();
    core.advanceTicks(25); // no simulation progression while paused
    core.resume();
    core.advanceTicks(57);
    const trace = core.replayExport();
    const replayed = replayCore(trace);
    expect(replayed.stateDigest()).toBe(core.stateDigest());
    expect(replayed.eventLog()).toEqual(core.eventLog());
  });
});
