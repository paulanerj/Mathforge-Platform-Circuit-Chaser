/**
 * CC2-04 host-neutral adapter. A host must not re-evaluate arithmetic, assert
 * mastery, change simulation state, duplicate evidence or block gameplay.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {MathForgeLearningBridge,projectLearningEvents} from '../sdk/learningBridge';
import {FeatureProgression} from '../features/progression';
describe('CC2-04 MathForge SDK event boundary',()=>{
  it('projects exact source values and delivers once per subscriber',()=>{
    const core=new CircuitClimbCore('sdk-events');
    const start=core.snapshot();
    const chosen=start.currentProblem.options.find(x=>
      x.platformId!==start.currentProblem.correctPlatformId)!;
    core.selectPlatform(chosen.platformId);core.advanceTicks(300);
    const events=projectLearningEvents(core.eventLog());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topic:'cc2.attempt_evaluated',
      details:{
        submittedOperand:chosen.value,
        incomingValue:start.currentProblem.incomingValue,
        targetValue:start.currentProblem.targetValue,
        correct:false,
      },
    });
    const a:unknown[]=[],b:unknown[]=[];
    const bridge=new MathForgeLearningBridge();
    const unsubA=bridge.subscribe(e=>a.push(e));
    bridge.subscribe(e=>b.push(e));
    expect(bridge.pump(core.eventLog()).delivered).toBe(2);
    expect(bridge.pump(core.eventLog()).delivered).toBe(0);
    expect(a).toHaveLength(1);expect(b).toHaveLength(1);
    unsubA();
    core.selectPlatform(start.currentProblem.correctPlatformId);
    core.advanceTicks(300);
    const summary=bridge.pump(core.eventLog());
    expect(summary.delivered).toBe(2); // accepted correct + solved
    expect(a).toHaveLength(1);expect(b).toHaveLength(3);
    expect((b[2] as {topic:string}).topic).toBe('cc2.problem_solved');
  });
  it('one faulty host retries in source order while another continues',()=>{
    const core=new CircuitClimbCore('adapter-fault');
    const p=core.snapshot().currentProblem;
    core.selectPlatform(p.correctPlatformId);
    core.advanceTicks(300);
    const bridge=new MathForgeLearningBridge();
    const good:string[]=[],later:string[]=[];
    let throws=true;
    bridge.subscribe(e=>{if(throws)throw Error('host transient');later.push(e.id);});
    bridge.subscribe(e=>good.push(e.id));
    const first=bridge.pump(core.eventLog());
    expect(first.failed).toBe(1);
    expect(first.delivered).toBe(2);
    expect(good).toHaveLength(2);
    expect(later).toHaveLength(0);
    throws=false;
    const retry=bridge.pump(core.eventLog());
    expect(retry.delivered).toBe(2);
    expect(later).toEqual(good);
    expect(bridge.pump(core.eventLog()).delivered).toBe(0);
  });
  it('host data cannot change the game state or mathematical verdict',()=>{
    const core=new CircuitClimbCore('sdk-no-mutation');
    const before=core.stateDigest();
    const bridge=new MathForgeLearningBridge();
    bridge.subscribe(event=>{
      (event.details as Record<string,unknown>).correct=true;
      throw Error('host failure');
    });
    bridge.pump(core.eventLog());
    expect(core.stateDigest()).toBe(before);
  });
  it('feature events project ability/stage without exposing correctness distribution',()=>{
    const core=new CircuitClimbCore('sdk-milestone');
    const feature=new FeatureProgression();feature.consume(core.eventLog());
    for(let row=1;row<=12;row++){
      const p=core.snapshot().currentProblem;
      core.selectPlatform(p.correctPlatformId);core.advanceTicks(300);
      feature.consume(core.eventLog());
    }
    const events=projectLearningEvents(core.eventLog(),feature.eventLog());
    const stage=events.filter(e=>e.topic==='cc2.milestone_reached');
    expect(stage).toHaveLength(1);
    expect(stage[0].details).toMatchObject({stage:2,completedRows:12});
    expect(events.filter(e=>e.topic==='cc2.problem_solved')).toHaveLength(12);
    expect(events.filter(e=>e.topic==='cc2.attempt_evaluated')).toHaveLength(12);
    expect(events.every(e=>!('correctPlatformId' in e.details))).toBe(true);
  });
});
