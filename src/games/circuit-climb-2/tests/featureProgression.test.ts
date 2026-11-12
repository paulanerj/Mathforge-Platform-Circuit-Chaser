/**
 * CC2-03: reward/ability proof against genuine CC2-02A ROW_COMPLETED events.
 *
 * A feature is NOT a math judgement. The module sees only completed rows and
 * stage boundaries; it never receives which answer is correct or future routes.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {
  FeatureProgression,defaultFeatureConfig,validateFeatureConfig,
  modifierForRow,
} from '../features/progression';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {defaultPursuerPreset} from '../pursuer/pursuerPreset';

function completeRows(number:number){
  const core=new CircuitClimbCore('cc2-03-ledger-source');
  const features=new FeatureProgression();
  features.consume(core.eventLog());
  for(let row=1;row<=number;row++){
    const p=core.snapshot().currentProblem;
    const accepted=core.selectPlatform(p.correctPlatformId);
    expect(accepted.ok).toBe(true);
    core.advanceTicks(300);
    expect(core.snapshot().completedRows).toBe(row);
    features.consume(core.eventLog());
    features.consume(core.eventLog()); // proves duplicate consumption idempotent
  }
  return {core,features};
}
describe('CC2-03 row modifiers and earned charge',()=>{
  it('has normal first cell, known frequency and relay priority on overlap',()=>{
    const c=defaultFeatureConfig();
    expect(Array.from({length:4},(_,i)=>modifierForRow(i+1,c)))
      .toEqual(['NORMAL','NORMAL','NORMAL','NORMAL']);
    expect(modifierForRow(5,c)).toBe('NORMAL');
    expect(modifierForRow(6,c)).toBe('CAPACITOR');
    expect(modifierForRow(8,c)).toBe('RELAY');
    expect(modifierForRow(12,c)).toBe('RELAY');
    expect(modifierForRow(18,c)).toBe('CAPACITOR');
    expect(modifierForRow(24,c)).toBe('RELAY');
  });
  it('never changes arithmetic, paths or platform correctness distribution',()=>{
    const {core,features}=completeRows(18);
    const rows=core.snapshot().solved;
    expect(rows).toHaveLength(18);
    expect(rows.every(s=>s.incoming+s.operand===s.result)).toBe(true);
    expect(features.eventLog().filter(e=>e.type==='CHARGE_GAINED')).toHaveLength(18);
    const cap=features.eventLog().filter(e=>
      e.type==='CHARGE_GAINED'&&e.detail.modifier==='CAPACITOR');
    expect(cap.map(e=>e.detail.row)).toEqual([6,18]);
    expect(cap.every(e=>Number(e.detail.earned)<=2)).toBe(true);
    expect(features.eventLog().filter(e=>e.type==='RELAY_CHAIN')
      .map(e=>e.detail.row)).toEqual([8,12,16]);
    expect(features.eventLog().filter(e=>e.type==='STAGE_REACHED')
      .map(e=>e.detail.stage)).toEqual([2]);
    expect(features.snapshot(core.snapshot().tick,'climb','ready',false).charge).toBe(4);
  });
  it('Pulse requires full charge, READY, proper mode; wrong uses spend nothing',()=>{
    const {core,features}=completeRows(4);
    const tick=core.snapshot().tick;
    expect(features.snapshot(tick,'climb','ready',false).charge).toBe(4);
    expect(features.activate(tick,'climb','outbound',false,100))
      .toEqual({ok:false,reason:'NOT_GROUNDED'});
    expect(features.activate(tick,'practice','ready',false,100))
      .toEqual({ok:false,reason:'PRACTICE_DEMO_ONLY'});
    expect(features.activate(tick,'climb','ready',true,100))
      .toEqual({ok:false,reason:'PAUSED'});
    expect(features.snapshot(tick,'climb','ready',false).charge).toBe(4);
    expect(features.activate(tick,'climb','ready',false,100))
      .toEqual({ok:true,affected:true});
    expect(features.snapshot(tick,'climb','ready',false).charge).toBe(0);
    expect(features.speedMultiplier(tick+149)).toBe(0.65);
    features.advance(tick+149);
    expect(features.eventLog().filter(e=>e.type==='ABILITY_EXPIRED')).toHaveLength(0);
    features.advance(tick+150);
    features.advance(tick+151);
    expect(features.speedMultiplier(tick+150)).toBe(1);
    expect(features.eventLog().filter(e=>e.type==='ABILITY_EXPIRED')).toHaveLength(1);
    expect(features.activate(tick+151,'climb','ready',false,100))
      .toEqual({ok:false,reason:'CHARGE_NOT_FULL'});
  });
  it('out-of-range Pulse spends charge but does not affect body speed',()=>{
    const {core,features}=completeRows(4);
    const tick=core.snapshot().tick;
    expect(features.activate(tick,'climb','ready',false,1000))
      .toEqual({ok:true,affected:false});
    expect(features.speedMultiplier(tick+1)).toBe(1);
    const event=features.eventLog().find(e=>e.type==='ABILITY_ACTIVATED');
    expect(event?.detail.affected).toBe(false);
  });
  it('strict versioned designer validation rejects unsafe/unknown values',()=>{
    const c=defaultFeatureConfig();
    expect(()=>validateFeatureConfig({...c,anything:42})).toThrow('CC2_FEATURE_CONFIG_SCHEMA');
    expect(()=>validateFeatureConfig({...c,pulseSpeedMultiplier:3})).toThrow();
    expect(()=>validateFeatureConfig({...c,chargeCapacity:4.5})).toThrow();
  });
});

describe('CC2-03 integrated pursuer replay with earned ability',()=>{
  it('keeps complete replay identity and actual slowdown when Pulse is in range',()=>{
    const config={...defaultRunConfig(),mode:'climb' as const};
    const preset={...defaultPursuerPreset(),speedPursuit:0.1,speedSearch:0.1};
    const featureConfig={...defaultFeatureConfig(),pulseRadius:500};
    const game=new CircuitClimbChaseCore('pulse-replay',config,preset,featureConfig);
    for(let row=1;row<=4;row++){
      const p=game.learnerSnapshot().currentProblem;
      expect(game.selectPlatform(p.correctPlatformId).ok).toBe(true);
      let frames=0;
      while(game.learnerSnapshot().completedRows<row && frames++<200)
        game.advanceTicks(1);
      expect(game.learnerSnapshot().completedRows).toBe(row);
    }
    expect(game.featureSnapshot().charge).toBe(4);
    const used=game.activatePulse();
    expect(used).toEqual({ok:true,affected:true});
    expect(game.featureSnapshot().pulseUntilTick).toBeGreaterThan(game.learnerSnapshot().tick);
    game.advanceTicks(15);
    const replay=game.replayExport();
    expect(replay.commands.some(c=>c.type==='PULSE')).toBe(true);
    const copy=replayChase(replay);
    expect(copy.stateDigest()).toBe(game.stateDigest());
    expect(copy.featureEventLog()).toEqual(game.featureEventLog());
    expect(copy.diagnostics()).toEqual(game.diagnostics());
  });
});
