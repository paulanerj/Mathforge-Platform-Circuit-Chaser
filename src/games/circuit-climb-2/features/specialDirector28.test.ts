/**
 * CC2-28 — source-backed special-platform and Surge strategy qualification.
 *
 * Tests real mathematical ROW_COMPLETED and real FeatureProgression receipts.
 * No fabricated solved equations, guessed answer rows, score writes, or
 * second Pursuer controller. The optional policy must be replay-exact.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {FeatureProgression} from '../features/progression';
import {
  SpecialDirector28,defaultSpecialConfig28,validateSpecialConfig28,
  surgeForRow28,type SpecialConfig28,
} from '../features/specialDirector28';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';

function liveRows(n:number,c:SpecialConfig28=defaultSpecialConfig28()){
  const core=new CircuitClimbCore('cc2-28-real-math');
  const features=new FeatureProgression();
  features.consume(core.eventLog());
  const specials=new SpecialDirector28(core.snapshot().runId,c);
  specials.consume(core.eventLog(),features.eventLog(),'climb');
  const history=[];
  for(let row=1;row<=n;row++){
    const problem=core.snapshot().currentProblem;
    expect(core.selectPlatform(problem.correctPlatformId)).toMatchObject({
      ok:true,correct:true
    });
    core.advanceTicks(300);
    expect(core.snapshot().completedRows).toBe(row);
    features.consume(core.eventLog());
    specials.consume(core.eventLog(),features.eventLog(),'climb');
    specials.advance(core.snapshot().runId,core.snapshot().tick,
      core.snapshot().phase);
    history.push(specials.snapshot());
  }
  return {core,features,specials,history};
}
describe('CC2-28 exact schema and row-wide fairness',()=>{
  it('rejects additional fields, bad timings and unfair pressure',()=>{
    const c=defaultSpecialConfig28();
    for(const invalid of [
      {...c,secretCorrectPlatform:'p1'},
      {...c,schema:'cc2-specials/v2'},
      {...c,surgeMultiplier:1.9},
      {...c,surgeEveryRows:4},
      {...c,warningTicks:0},
      {...c,relayGuardRows:10},
    ])expect(()=>validateSpecialConfig28(invalid)).toThrow();
    expect(validateSpecialConfig28(c)).toEqual(c);
  });
  it('shares every Surge row across all math destinations, first four plain',()=>{
    const c=defaultSpecialConfig28();
    expect(Array.from({length:16},(_,i)=>surgeForRow28(i+1,c))
      .map((yes,i)=>yes?i+1:0).filter(Boolean)).toEqual([7,14]);
    for(const row of [7,14,21,28])
      expect(surgeForRow28(row,c)).toBe(true);
  });
  it('does not create a phantom threat from wrong choices alone',()=>{
    const core=new CircuitClimbCore('cc2-28-wrong-choice');
    const f=new FeatureProgression();f.consume(core.eventLog());
    const d=new SpecialDirector28(core.snapshot().runId);
    const wrong=core.snapshot().currentProblem.options.find(o=>
      o.platformId!==core.snapshot().currentProblem.correctPlatformId)!;
    expect(core.selectPlatform(wrong.platformId).ok).toBe(true);
    core.advanceTicks(300);f.consume(core.eventLog());
    d.consume(core.eventLog(),f.eventLog(),'climb');
    d.advance(core.snapshot().runId,core.snapshot().tick,
      core.snapshot().phase);
    expect(core.snapshot().completedRows).toBe(0);
    expect(d.snapshot().phase).toBe('IDLE');
    expect(d.snapshot().events).toEqual([]);
  });
  it('fails closed if a fake Relay/Capacitor receipt is omitted',()=>{
    const {core,features}=liveRows(1);
    const d=new SpecialDirector28(core.snapshot().runId);
    expect(()=>d.consume(core.eventLog(),[],'climb'))
      .toThrow('CC228_MISSING_CHARGE_RECEIPT');
    expect(features.eventLog().filter(e=>e.type==='CHARGE_GAINED'))
      .toHaveLength(1);
  });
});
describe('CC2-28 real Capacitor, Surge, Relay counterplay',()=>{
  it('records an actual row-6 Capacitor before a row-7 warning',()=>{
    const {core,specials,history,features}=liveRows(7);
    expect(core.snapshot().solved).toHaveLength(7);
    expect(history.slice(0,4).every(x=>x.counters.surges===0))
      .toBe(true);
    expect(history[5].counters.capacitors).toBe(1);
    expect(history[6].phase).toBe('WARNING');
    expect(history[6].activeRow).toBe(7);
    expect(features.eventLog().filter(e=>
      e.type==='CHARGE_GAINED'&&e.detail.modifier==='CAPACITOR'))
      .toHaveLength(1);
    expect(specials.snapshot().events.find(e=>
      e.type==='SURGE_WARNING')?.row).toBe(7);
    expect(specials.snapshot().events.find(e=>
      e.type==='CAPACITOR_BONUS')?.detail.earned).toBeGreaterThanOrEqual(0);
  });
  it('telegraphs 45 ticks and activates only bounded 7% pressure',()=>{
    const {core,specials}=liveRows(7);
    const tick=core.snapshot().tick,run=core.snapshot().runId;
    specials.advance(run,tick+44,'ready');
    expect(specials.snapshot().phase).toBe('WARNING');
    expect(specials.pressureFor(true)).toBe(1);
    specials.advance(run,tick+45,'ready');
    expect(specials.snapshot().phase).toBe('ACTIVE');
    expect(specials.pressureFor(false)).toBe(1);
    expect(specials.pressureFor(true)).toBeCloseTo(1.07);
    specials.advance(run,tick+45+120,'ready');
    expect(specials.snapshot().phase).toBe('IDLE');
    expect(specials.pressureFor(true)).toBe(1);
    expect(specials.snapshot().counters.expired).toBe(1);
  });
  it('a missing or missed Pulse does NOT magically disarm a Surge',()=>{
    const {core,specials}=liveRows(7);
    const tick=core.snapshot().tick,run=core.snapshot().runId;
    expect(specials.onPulse(run,tick,false)).toBe(false);
    expect(specials.snapshot().phase).toBe('WARNING');
    expect(specials.snapshot().counters.discharged).toBe(0);
  });
  it('a genuinely in-range and accepted Pulse can discharge the warning',()=>{
    const {core,features,specials}=liveRows(7);
    const tick=core.snapshot().tick,run=core.snapshot().runId;
    // The real charge economy must independently authorize activation.
    const outcome=features.activate(tick,'climb','ready',false,100);
    expect(outcome).toEqual({ok:true,affected:true});
    expect(specials.onPulse(run,tick,outcome.affected)).toBe(true);
    expect(specials.snapshot().phase).toBe('IDLE');
    expect(specials.snapshot().counters.discharged).toBe(1);
    expect(specials.pressureFor(true)).toBe(1);
  });
  it('a physically earned Relay grants one-row shield and grounds threat',()=>{
    const {core,specials,history}=liveRows(8,{
      ...defaultSpecialConfig28(),activeTicks:300,
    });
    expect(core.snapshot().solved).toHaveLength(8);
    expect(history[7].counters.relays).toBe(1);
    expect(history[7].guardRowsRemaining).toBe(1);
    expect(specials.snapshot().events.find(e=>
      e.type==='RELAY_GUARD_EARNED')?.row).toBe(8);
    expect(specials.snapshot().events.some(e=>
      e.type==='SURGE_GROUNDED'&&e.detail.reason==='RELAY_LINK'))
      .toBe(true);
    expect(specials.snapshot().phase).toBe('IDLE');
  });
  it('one-row relay shield is honest and does not last indefinitely',()=>{
    const {history}=liveRows(10);
    expect(history[7].guardRowsRemaining).toBe(1);
    expect(history[8].guardRowsRemaining).toBe(0);
    expect(history[9].guardRowsRemaining).toBe(0);
  });
  it('duplicate consumption and repeated same tick never create more events',()=>{
    const {core,features,specials}=liveRows(8);
    const before=specials.snapshot();
    specials.consume(core.eventLog(),features.eventLog(),'climb');
    specials.advance(core.snapshot().runId,core.snapshot().tick,
      core.snapshot().phase);
    expect(specials.snapshot()).toEqual(before);
  });
  it('cross-run events and backward time are rejected',()=>{
    const {core,specials}=liveRows(7);
    expect(()=>specials.advance('other',core.snapshot().tick+1,'ready'))
      .toThrow('CC228_RUN_SCOPE');
    expect(()=>specials.advance(core.snapshot().runId,0,'ready'))
      .toThrow('CC228_TICK_ORDER');
    expect(()=>specials.onPulse('other',core.snapshot().tick,true))
      .toThrow('CC228_PULSE_RUN_SCOPE');
  });
  it('terminal shutdown and reset cannot leave an active ghost surge',()=>{
    const {core,specials}=liveRows(7);
    specials.advance(core.snapshot().runId,core.snapshot().tick+45,'ready');
    expect(specials.snapshot().phase).toBe('ACTIVE');
    specials.terminate(core.snapshot().runId);
    expect(specials.snapshot().phase).toBe('IDLE');
    specials.reset('next-run');
    expect(specials.snapshot().events).toHaveLength(0);
    expect(specials.snapshot().counters.surges).toBe(0);
  });
  it('practice mode records no hazard pressure even for real solved rows',()=>{
    const core=new CircuitClimbCore('cc2-28-practice',
      {...defaultRunConfig(),mode:'practice'});
    const f=new FeatureProgression();f.consume(core.eventLog());
    const d=new SpecialDirector28(core.snapshot().runId);
    d.consume(core.eventLog(),f.eventLog(),'practice');
    d.advance(core.snapshot().runId,1,'ready');
    expect(d.snapshot().phase).toBe('IDLE');
    expect(d.pressureFor(true)).toBe(1);
  });
});
describe('CC2-28 ChaseCore backward compatibility and versioned replay',()=>{
  it('ordinary no-policy chase remains byte-identical to the source baseline',()=>{
    for(const seed of ['cc28-off-a','cc28-off-b']){
      const standard=new CircuitClimbChaseCore(seed);
      const absent=new CircuitClimbChaseCore(seed,
        defaultRunConfig(),undefined,undefined,undefined,undefined,undefined);
      for(let tick=0;tick<55;tick++){
        expect(standard.snapshot()).toEqual(absent.snapshot());
        expect(standard.stateDigest()).toBe(absent.stateDigest());
        standard.advanceTicks(1);absent.advanceTicks(1);
      }
      expect(standard.replayExport()).toEqual(absent.replayExport());
      expect(standard.specialSnapshot()).toBeNull();
    }
  });
  it('an opt-in special policy survives a deterministic real source replay',()=>{
    const config=defaultSpecialConfig28();
    const original=new CircuitClimbChaseCore('cc2-28-chase-replay',
      defaultRunConfig(),undefined,undefined,undefined,undefined,undefined,
      config);
    original.advanceTicks(70);
    const trace=original.replayExport();
    expect(trace.specialConfig).toEqual(config);
    const reconstructed=replayChase(trace);
    expect(reconstructed.stateDigest()).toEqual(original.stateDigest());
    expect(reconstructed.specialSnapshot()).toEqual(original.specialSnapshot());
    expect(reconstructed.featureEventLog()).toEqual(original.featureEventLog());
    expect(reconstructed.runSummary()).toEqual(original.runSummary());
  });
});
