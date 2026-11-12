/**
 * CC2-04 — source-backed achievement and equation-review acceptance tests.
 * No fake assessments, statically created unlocked badges, or invented solved
 * equations. All source ledgers come from actual accepted core attempts.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {FeatureProgression} from '../features/progression';
import {buildRunSummary} from '../progression/runSummary';
import {deriveAchievements} from '../progression/achievements';

function initialize(seed:string,mode:'practice'|'climb'|'challenge'='climb'){
  const core=new CircuitClimbCore(seed,{...defaultRunConfig(),mode});
  const features=new FeatureProgression();
  features.consume(core.eventLog());
  return {core,features};
}
function solve(core:CircuitClimbCore,features:FeatureProgression){
  const before=core.snapshot();
  const result=core.selectPlatform(before.currentProblem.correctPlatformId);
  expect(result).toMatchObject({ok:true,correct:true});
  core.advanceTicks(300);
  features.consume(core.eventLog());
  return core.snapshot();
}
describe('CC2-04 strict real-run summary',()=>{
  it('lists only solved equations and counts wrong accepted choices separately',()=>{
    const {core,features}=initialize('summary-wrong-correct');
    const first=core.snapshot().currentProblem;
    const bad=first.options.find(p=>p.platformId!==first.correctPlatformId)!;
    expect(core.selectPlatform(bad.platformId)).toMatchObject({ok:true,correct:false});
    core.advanceTicks(300);
    features.consume(core.eventLog());
    let summary=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(summary.equations).toHaveLength(0);
    expect(summary.rowsSolved).toBe(0);
    expect(summary.attempts).toBe(1);
    expect(summary.correctAttempts).toBe(0);
    expect(summary.wrongAttempts).toBe(1);
    expect(summary.accuracyPercent).toBe(0);

    solve(core,features);
    summary=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(summary.rowsSolved).toBe(1);
    expect(summary.equations).toEqual([expect.objectContaining({
      row:1,equation:`${first.incomingValue} + ${first.correctValue} = ${first.targetValue}`,
    })]);
    expect(summary.attempts).toBe(2);
    expect(summary.wrongAttempts).toBe(1);
    expect(summary.accuracyPercent).toBe(50);
    expect(summary.achievements.some(a=>a.id==='PERFECT_CELL')).toBe(false);
  });

  it('practice ends at real four-row goal with First Cell and Clean Current',()=>{
    const {core,features}=initialize('practice-summary','practice');
    for(let i=0;i<4;i++)solve(core,features);
    const summary=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(summary.ended).toBe(true);
    expect(summary.endReason).toBe('PRACTICE_GOAL');
    expect(summary.outcome).toBe('Practice circuit completed');
    expect(summary.rowsSolved).toBe(4);
    expect(summary.powerCells).toBe(1);
    expect(summary.attempts).toBe(4);
    expect(summary.accuracyPercent).toBe(100);
    expect(summary.equations).toHaveLength(4);
    expect(summary.achievements.map(a=>a.id)).toEqual(['FIRST_CELL','PERFECT_CELL']);
    expect(deriveAchievements(summary.runId,core.eventLog(),features.eventLog()))
      .toEqual(summary.achievements);
  });

  it('a wrong choice inside the cell denies Perfect Cell but not First Cell',()=>{
    const {core,features}=initialize('practice-imperfect','practice');
    solve(core,features);
    const second=core.snapshot().currentProblem;
    const wrong=second.options.find(p=>p.platformId!==second.correctPlatformId)!;
    core.selectPlatform(wrong.platformId);
    core.advanceTicks(300);
    features.consume(core.eventLog());
    for(let i=1;i<4;i++)solve(core,features);
    const summary=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(summary.equations).toHaveLength(4);
    expect(summary.wrongAttempts).toBe(1);
    expect(summary.accuracyPercent).toBe(80);
    expect(summary.achievements.map(a=>a.id)).toEqual(['FIRST_CELL']);
  });

  it('challenge awards the three-cell milestone and win badge ONLY at row 12',()=>{
    const {core,features}=initialize('challenge-summary','challenge');
    for(let row=1;row<=11;row++)solve(core,features);
    const before=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(before.ended).toBe(false);
    expect(before.achievements.map(a=>a.id)).not.toContain('THREE_CELLS');
    expect(before.achievements.map(a=>a.id)).not.toContain('BEAT_CHALLENGE');
    solve(core,features);
    const after=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(after.rowsSolved).toBe(12);
    expect(after.powerCells).toBe(3);
    expect(after.endReason).toBe('CHALLENGE_GOAL');
    expect(after.achievements.map(a=>a.id)).toEqual([
      'FIRST_CELL','PERFECT_CELL','THREE_CELLS','BEAT_CHALLENGE',
    ]);
    expect(after.achievements.filter(a=>a.id==='THREE_CELLS')).toHaveLength(1);
    expect(after.achievements.filter(a=>a.id==='BEAT_CHALLENGE')).toHaveLength(1);
  });

  it('unfinished accepted correct travel is never shown as a solved equation',()=>{
    const {core,features}=initialize('aborted-travel');
    const p=core.snapshot().currentProblem;
    core.selectPlatform(p.correctPlatformId);
    core.advanceTicks(1);
    core.quit();features.consume(core.eventLog());
    const result=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    expect(result.ended).toBe(true);
    expect(result.endReason).toBe('QUIT');
    expect(result.correctAttempts).toBe(1);
    expect(result.rowsSolved).toBe(0);
    expect(result.equations).toHaveLength(0);
  });

  it('successful Pulse is a once-only achievement regardless of distance',()=>{
    const {core,features}=initialize('pulse-achievement');
    for(let i=0;i<4;i++)solve(core,features);
    const tick=core.snapshot().tick;
    expect(features.activate(tick,'climb','ready',false,10000))
      .toEqual({ok:true,affected:false});
    const summary=buildRunSummary(core.snapshot(),core.eventLog(),features.eventLog());
    const pulse=summary.achievements.filter(a=>a.id==='CIRCUIT_PULSE_USED');
    expect(pulse).toHaveLength(1);
    expect(pulse[0].tick).toBe(tick);
    expect(pulse[0].unlockedAtRow).toBe(4);
    expect(pulse[0].evidenceEventId).toBeTruthy();
  });

  it('restart separates the two runs even when old events remain in the ledger',()=>{
    const {core,features}=initialize('two-runs');
    for(let i=0;i<4;i++)solve(core,features);
    const priorRun=core.snapshot().runId;
    core.restart();
    // Actual core emits a new RUN_STARTED and keeps original run's events.
    const newEvents=core.eventLog();
    const active=core.snapshot().runId;
    expect(active).not.toBe(priorRun);
    const report=buildRunSummary(core.snapshot(),newEvents,[]);
    expect(report.rowsSolved).toBe(0);
    expect(report.attempts).toBe(0);
    expect(report.equations).toEqual([]);
    expect(report.achievements).toEqual([]);
  });

  it('detects contradictory ledger/accounting rather than inventing results',()=>{
    const {core,features}=initialize('audit-tamper');
    solve(core,features);
    const state=core.snapshot();
    state.solved=[];
    expect(()=>buildRunSummary(state,core.eventLog(),features.eventLog()))
      .toThrow('CC2_SUMMARY_LANDING_LEDGER_MISMATCH');
  });
});
