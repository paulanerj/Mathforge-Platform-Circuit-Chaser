/**
 * CC2-45A: future numbers must be genuine generated source problems.
 * These tests deliberately simulate the learner's real correct landings
 * on an independent learner core, comparing projected option values and
 * all three platform IDs with the next actual source state.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';
import {projectFutureNumberedRows45} from '../features/futureNumberedRows45';

function finishCorrectRow(core:CircuitClimbCore):boolean{
  const start=core.snapshot();
  if(start.phase!=='ready')return false;
  const answer=core.selectPlatform(start.currentProblem.correctPlatformId);
  expect(answer.ok).toBe(true);
  if(!answer.ok)return false;
  expect(answer.correct).toBe(true);
  for(let i=0;i<150;i++){
    if(core.snapshot().phase!=='outbound')break;
    core.advanceTicks(20);
  }
  const result=core.snapshot();
  expect(result.completedRows).toBe(start.completedRows+1);
  return result.phase!=='ended';
}
describe('CC2-45 source-authentic pre-numbered rows',()=>{
  for(const curriculum of ['add20','makeTarget20','skip2to10'] as const){
    it('matches all actual options for three projected rows: '+curriculum,()=>{
      const config={...defaultRunConfig(),mode:'practice' as const,
        curriculum,rowGapScale:2.8125};
      const live=new CircuitClimbCore('cc245-future-'+curriculum,config);
      const digest=live.stateDigest();
      const forecast=projectFutureNumberedRows45(live,3);
      expect(forecast.schema).toBe('cc2-future-numbered-rows/v1');
      expect(forecast.rows.length).toBe(3);
      expect(live.stateDigest()).toBe(digest);
      expect(live.snapshot().completedRows).toBe(0);
      for(let i=0;i<3;i++){
        const state=live.snapshot();
        const match=forecast.rows[i];
        expect(match.row).toBe(state.currentProblem.rowIndex);
        expect(match.problemId).toBe(state.currentProblem.problemId);
        expect(match.platforms.map(p=>p.id)).toEqual(
          state.currentProblem.options.map(o=>o.platformId));
        expect(match.platforms.map(p=>p.value)).toEqual(
          state.currentProblem.options.map(o=>o.value));
        expect(match.platforms.every(p=>!Object.hasOwn(p,'correct')))
          .toBe(true);
        if(i<2)expect(finishCorrectRow(live)).toBe(true);
      }
    });
  }
  it('withholds invented option values if a run has ended',()=>{
    const core=new CircuitClimbCore('cc245-ended');
    core.quit();
    const before=core.stateDigest();
    const projection=projectFutureNumberedRows45(core,3);
    expect(projection.rows).toHaveLength(0);
    expect(projection.terminatedEarly).toBe(true);
    expect(core.stateDigest()).toBe(before);
  });
  it('leaves the authoritative paused source paused and bitwise unchanged',()=>{
    const core=new CircuitClimbCore('cc245-paused');
    core.pause();
    const before=core.stateDigest();
    const result=projectFutureNumberedRows45(core,2);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(core.stateDigest()).toBe(before);
    expect(core.snapshot().paused).toBe(true);
  });
  it('refuses unsafe forecast length without changing source',()=>{
    const core=new CircuitClimbCore('cc245-bounds');
    const before=core.stateDigest();
    for(const n of [0,-1,4,5,1.5,NaN]){
      expect(()=>projectFutureNumberedRows45(core,n)).toThrow(
        'CC245_FORECAST_ROW_BOUND');
    }
    expect(core.stateDigest()).toBe(before);
  });
  it('Chase facade exposes the same real math with zero AI/gameplay side effects',()=>{
    const config={...defaultRunConfig(),mode:'practice' as const,
      curriculum:'makeTarget20' as const};
    const game=new CircuitClimbChaseCore('cc245-chase',config);
    const before=game.stateDigest();
    const response=game.futureNumberedRows(3);
    expect(response.rows).toHaveLength(3);
    expect(response.rows[0].problemId)
      .toBe(game.learnerSnapshot().currentProblem.problemId);
    expect(game.stateDigest()).toBe(before);
  });
});
