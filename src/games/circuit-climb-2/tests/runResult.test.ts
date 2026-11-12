/**
 * CC2-04 exact run-result evidence. Every solved equation must correspond to
 * a real correct landing, not an attempted route or an uncommitted overshoot.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {FeatureProgression} from '../features/progression';
import {deriveRunResult} from '../results/runResult';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
function complete(core:CircuitClimbCore,feature:FeatureProgression,count:number){
  for(let row=1;row<=count;row++){
    const p=core.snapshot().currentProblem;
    expect(core.selectPlatform(p.correctPlatformId).ok).toBe(true);
    core.advanceTicks(300);
    feature.consume(core.eventLog());
    expect(core.snapshot().completedRows).toBe(row);
  }
}
describe('CC2-04 source-grounded results',()=>{
  it('records one wrong then four real landings; review excludes the wrong attempt',()=>{
    const core=new CircuitClimbCore('review-wrong-then-right');
    const feature=new FeatureProgression();feature.consume(core.eventLog());
    const p=core.snapshot().currentProblem;
    const bad=p.options.find(o=>o.platformId!==p.correctPlatformId)!;
    core.selectPlatform(bad.platformId);core.advanceTicks(300);
    feature.consume(core.eventLog());
    complete(core,feature,4);
    const result=deriveRunResult(core.snapshot(),core.eventLog(),feature.eventLog());
    expect(result.attemptsAccepted).toBe(5);
    expect(result.correctAttemptsAccepted).toBe(4);
    expect(result.incorrectAttemptsAccepted).toBe(1);
    expect(result.accuracyPercent).toBe(80);
    expect(result.solvedEquations).toHaveLength(4);
    expect(result.solvedEquations.every(e=>e.incoming+e.operand===e.result)).toBe(true);
    expect(result.accounting).toMatchObject({
      complete:true,acceptedEvents:5,landedEvents:4,missingLandingCount:0,
    });
    expect(result.achievements.map(x=>x.id)).toContain('FIRST_CELL');
    expect(result.achievements.map(x=>x.id)).not.toContain('PERFECT_CELL');
  });
  it('never counts selected correct answer as solved before the physical landing',()=>{
    const core=new CircuitClimbCore('accepted-unlanded');
    const feature=new FeatureProgression();feature.consume(core.eventLog());
    const p=core.snapshot().currentProblem;
    core.selectPlatform(p.correctPlatformId);
    core.advanceTicks(1);feature.consume(core.eventLog());
    const live=deriveRunResult(core.snapshot(),core.eventLog(),feature.eventLog());
    expect(live.correctAttemptsAccepted).toBe(1);
    expect(live.rowsCompleted).toBe(0);
    expect(live.solvedEquations).toHaveLength(0);
    expect(live.accounting.complete).toBe(false);
    expect(live.accounting.missingLandingCount).toBe(1);
  });
  it('recognizes perfect first cell, three-cell milestone and challenge goal',()=>{
    const core=new CircuitClimbCore('twelve-row-end',{
      ...defaultRunConfig(),mode:'challenge',
    });
    const feature=new FeatureProgression();feature.consume(core.eventLog());
    complete(core,feature,12);
    const result=deriveRunResult(core.snapshot(),core.eventLog(),feature.eventLog());
    expect(result.status).toBe('ENDED');
    expect(result.endReason).toBe('CHALLENGE_GOAL');
    expect(result.solvedEquations).toHaveLength(12);
    expect(result.perfectCells).toBe(3);
    expect(result.achievements.map(x=>x.id).sort()).toEqual([
      'BEAT_CHALLENGE','FIRST_CELL','PERFECT_CELL','THREE_CELLS',
    ]);
    expect(result.achievements.every(x=>x.isMasteryEvidence===false)).toBe(true);
  });
  it('run isolation after restart never carries historical solved equations',()=>{
    const core=new CircuitClimbCore('restart-isolation');
    const feature=new FeatureProgression();
    feature.consume(core.eventLog());
    complete(core,feature,2);
    const prior=core.snapshot().runId;
    core.restart();
    const ledger=core.eventLog();
    const nextFeature=new FeatureProgression(undefined,ledger.length-1);
    nextFeature.consume(ledger);
    const result=deriveRunResult(core.snapshot(),ledger,nextFeature.eventLog());
    expect(result.runId).not.toBe(prior);
    expect(result.solvedEquations).toHaveLength(0);
    expect(result.attemptsAccepted).toBe(0);
    expect(result.rowsCompleted).toBe(0);
  });
  it('chase wrapper publishes the exact same source-derived summary',()=>{
    const game=new CircuitClimbChaseCore('wrapper-result');
    const result=game.runResult();
    expect(result.schema).toBe('cc2-run-result/v1');
    expect(result.status).toBe('LIVE');
    expect(result.attemptsAccepted).toBe(0);
    expect(result.accuracyPercent).toBeNull();
  });
});
