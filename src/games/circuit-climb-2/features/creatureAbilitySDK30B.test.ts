/**
 * CC2-30B Creature SDK tests.
 *
 * These tests demonstrate that an ability is registered by its world
 * authority, unimplemented creatures cannot secretly inherit Molasses, and
 * all cast requests have finite source-validated bounds and run ownership.
 */
import {describe,it,expect} from 'vitest';
import {defaultRunConfig} from '../config/runConfig';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {
  CREATURE_SDK_SCHEMA,CREATURE_MANIFESTS,createCreatureAbility,
  MolassesAbility,type GelCastRequest,
} from './creatureAbilitySDK30B';

function fixture(seed='sdk-fixture'){
  const core=new CircuitClimbCore(seed,{...defaultRunConfig(),mode:'practice'});
  return core.snapshot();
}
function request(state:ReturnType<typeof fixture>):GelCastRequest{
  return {schema:CREATURE_SDK_SCHEMA,
    kind:'PURSUER_VISCOUS_FIELD',runId:state.runId,tick:state.tick,
    sourcePlatformId:state.currentProblem.correctPlatformId,
    direction:'left',fieldTicks:140,radiusInRowGaps:.9,slowMultiplier:.73};
}
describe('CC2-30B typed capability registry',()=>{
  it('all six declarative creatures have distinct ability IDs and truthful activation flags',()=>{
    const manifests=Object.values(CREATURE_MANIFESTS);
    expect(manifests).toHaveLength(6);
    expect(new Set(manifests.map(m=>m.species)).size).toBe(6);
    expect(new Set(manifests.map(m=>m.ability)).size).toBe(6);
    expect(manifests.filter(m=>m.enabled).map(m=>m.species))
      .toEqual(['MOLASSES_GUARDIAN']);
    for(const m of manifests){
      expect(m.sdk).toBe(CREATURE_SDK_SCHEMA);
      expect(m.visualFamily.length).toBeGreaterThan(0);
      expect(m.soundVoice.length).toBeGreaterThan(0);
      expect(m.gateKind).toBe('SKIP_COUNT');
    }
  });
  it('unimplemented species do not get Molasses world authority by accident',()=>{
    for(const key of Object.keys(CREATURE_MANIFESTS) as
      (keyof typeof CREATURE_MANIFESTS)[]){
      if(key==='MOLASSES_GUARDIAN')continue;
      expect(()=>createCreatureAbility(key,'run-2'))
        .toThrow('CREATURE_ABILITY_NOT_IMPLEMENTED');
    }
    const implemented=createCreatureAbility('MOLASSES_GUARDIAN','run-3');
    expect(implemented.authority).toBe('PURSUER_MOTION');
    expect(implemented.kind).toBe('PURSUER_VISCOUS_FIELD');
  });
  it('blocks cross-run injection, stale tick, unbounded effects and bad platform',()=>{
    const state=fixture();
    const ability=new MolassesAbility(state.runId);
    const out:unknown[]=[];
    const emit=(e:unknown)=>out.push(e);
    expect(()=>ability.cast({...request(state),runId:'other'},state,emit))
      .toThrow('CREATURE_EFFECT_AUTHORITY');
    expect(()=>ability.cast({...request(state),tick:state.tick+1},state,emit))
      .toThrow('CREATURE_EFFECT_AUTHORITY');
    expect(()=>ability.cast({...request(state),slowMultiplier:.2},state,emit))
      .toThrow('CREATURE_EFFECT_BOUNDS');
    expect(()=>ability.cast({...request(state),fieldTicks:2000},state,emit))
      .toThrow('CREATURE_EFFECT_BOUNDS');
    expect(ability.cast({...request(state),sourcePlatformId:'fake'},state,emit))
      .toBe(false);
    expect(out).toHaveLength(0);
    expect(ability.snapshot().activeField).toBeNull();
  });
  it('owns only one finite source effect and records unique physical contact edges',()=>{
    const state=fixture();
    const events:{type:string;detail:unknown}[]=[];
    const ability=new MolassesAbility(state.runId);
    const emit=(event:{type:string;detail:unknown})=>events.push(event);
    expect(ability.cast(request(state),state,emit)).toBe(true);
    expect(ability.cast(request(state),state,emit)).toBe(false);
    const f=ability.snapshot().activeField!;
    expect(f).toBeTruthy();
    expect(ability.observePursuer({x:f.x-3,y:f.y},state.tick,emit))
      .toBeCloseTo(.73);
    ability.observePursuer({x:f.x-3,y:f.y},state.tick,emit);
    expect(events.filter(e=>e.type==='FIELD_CONTACT_ENTER')).toHaveLength(1);
    expect(ability.observePursuer({x:f.x+f.radius*2,y:f.y},state.tick,emit))
      .toBe(1);
    expect(events.filter(e=>e.type==='FIELD_CONTACT_EXIT')).toHaveLength(1);
    ability.advance({...state,tick:state.tick+141},emit);
    expect(ability.snapshot().activeField).toBeNull();
    expect(events.filter(e=>e.type==='FIELD_EXPIRED')).toHaveLength(1);
  });
  it('reset and terminate do not carry effects into the next run',()=>{
    const state=fixture();
    const ability=new MolassesAbility(state.runId);
    expect(ability.cast(request(state),state,()=>{})).toBe(true);
    ability.reset('run-second');
    expect(ability.snapshot().activeField).toBeNull();
    expect(ability.snapshot().contactActive).toBe(false);
    expect(()=>ability.advance(state,()=>{}))
      .toThrow('CREATURE_EFFECT_RUN_ISOLATION');
    ability.terminate();
    expect(ability.snapshot().multiplier).toBe(1);
  });
});
