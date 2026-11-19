/**
 * CC2-46B — source-only, authoritative 20%-speed Molasses contract.
 * No rendering, DOM or sound participates in slowing the Pursuer.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {
  defaultCreatureConfig,validateCreatureConfig,
  CreatureEcologyDirector,
} from '../features/creatureEcology30';
import {
  CREATURE_SDK_SCHEMA,MolassesAbility,
} from '../features/creatureAbilitySDK30B';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';

function makeCast(multiplier:number){
  const core=new CircuitClimbCore('cc246b-field-proof');
  const state=core.snapshot();
  const platform=state.world.rows.find(r=>r.index===state.currentProblem.rowIndex)!
    .platforms[0];
  const ability=new MolassesAbility(state.runId);
  const events:string[]=[];
  ability.cast({
    schema:CREATURE_SDK_SCHEMA,kind:'PURSUER_VISCOUS_FIELD',
    runId:state.runId,tick:state.tick,
    sourcePlatformId:platform.id,direction:'left',
    fieldTicks:150,radiusInRowGaps:.95,
    slowMultiplier:multiplier,coverage:'BELOW_PLATFORM',
  },state,e=>events.push(e.type));
  return {core,state,platform,ability,events};
}
describe('CC2-46B real viscous slowdown',()=>{
  it('validates 20% remaining Pursuer speed and rejects unsafe values',()=>{
    const standard=defaultCreatureConfig();
    const newSyrup={...standard,fieldMode:'BELOW_PLATFORM' as const,
      slowMultiplier:.20};
    expect(validateCreatureConfig(newSyrup).slowMultiplier).toBe(.20);
    expect(()=>validateCreatureConfig({...newSyrup,slowMultiplier:.09}))
      .toThrow('CREATURE_CONFIG_RANGE');
    expect(()=>validateCreatureConfig({...standard,slowMultiplier:.20}))
      .toThrow('CREATURE_CONFIG_RANGE');
    expect(defaultCreatureConfig().slowMultiplier).toBe(.72);
  });
  it('actually returns .20 on true source contact, and 1 above boundary',()=>{
    const {core,platform,ability,events}=makeCast(.20);
    const before=core.stateDigest();
    const atOrBelow={x:platform.x+60,y:platform.y+40};
    const over={x:platform.x+60,y:platform.y-2};
    expect(ability.observePursuer(atOrBelow,1,e=>events.push(e.type)))
      .toBe(.20);
    expect(ability.snapshot().contactActive).toBe(true);
    expect(events).toContain('FIELD_CONTACT_ENTER');
    expect(ability.observePursuer(over,2,e=>events.push(e.type)))
      .toBe(1);
    expect(ability.snapshot().contactActive).toBe(false);
    expect(events).toContain('FIELD_CONTACT_EXIT');
    expect(core.stateDigest()).toBe(before);
  });
  it('blanket never expires mid-run, but terminates cleanly',()=>{
    const {platform,ability}=makeCast(.2);
    expect(ability.observePursuer({x:platform.x,y:platform.y+10},
      100000,()=>{})).toBe(.2);
    ability.terminate();
    expect(ability.observePursuer({x:platform.x,y:platform.y+10},
      100001,()=>{})).toBe(1);
    expect(ability.snapshot().activeField).toBeNull();
  });
  it('source effect remains replay-configured and never touches learner math',()=>{
    const cfg=validateCreatureConfig({...defaultCreatureConfig(),
      fieldMode:'BELOW_PLATFORM',slowMultiplier:.2,firstEligibleRow:1});
    const game=new CircuitClimbChaseCore('cc246b-slow-replay',
      defaultRunConfig(),undefined,undefined,undefined,undefined,
      undefined,undefined,cfg);
    const source=game.learnerSnapshot(),before=game.stateDigest();
    expect(game.creatureSnapshot()?.config.slowMultiplier).toBe(.2);
    expect(game.replayExport().creatureConfig?.slowMultiplier).toBe(.2);
    expect(game.learnerSnapshot()).toEqual(source);
    expect(game.stateDigest()).toBe(before);
  });
});
