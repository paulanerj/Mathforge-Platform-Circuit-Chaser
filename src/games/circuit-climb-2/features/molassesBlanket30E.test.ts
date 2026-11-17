/**
 * CC2-30E — Molasses Blanket authority regression suite.
 *
 * A successful optional Guardian gate anchors a permanent, full-width
 * elevation boundary at the source platform. Since world Y becomes MORE
 * negative uphill, a Pursuer is inside the blanket when bot.y >= field.y.
 *
 * This is a real movement modifier, not a sprite overlap or audio illusion.
 * The old circular field is retained for legacy CC2-30C replays.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {CREATURE_SDK_SCHEMA,MolassesAbility,type GelCastRequest}
  from './creatureAbilitySDK30B';
import {CircuitClimbChaseCore,replayChase}
  from '../pursuer/CircuitClimbChaseCore';
import {defaultCreatureConfig,validateCreatureConfig}
  from './creatureEcology30';

const makeWorld=()=>{
  const core=new CircuitClimbCore('blanket-unit',
    {...defaultRunConfig(),mode:'practice'});
  return core.snapshot();
};
const makeRequest=(world:ReturnType<typeof makeWorld>):GelCastRequest=>({
  schema:CREATURE_SDK_SCHEMA,
  kind:'PURSUER_VISCOUS_FIELD',
  runId:world.runId,tick:world.tick,
  sourcePlatformId:world.currentProblem.correctPlatformId,
  direction:'right',fieldTicks:150,radiusInRowGaps:.95,
  slowMultiplier:.5,coverage:'BELOW_PLATFORM',
});
function advanceFirstTwoRows(game:CircuitClimbChaseCore){
  for(let i=0;i<2;i++){
    const s=game.learnerSnapshot();
    expect(game.selectPlatform(s.currentProblem.correctPlatformId).ok).toBe(true);
    for(let j=0;j<3000;j++){
      if(game.learnerSnapshot().phase==='ready')break;
      expect(game.learnerSnapshot().phase).not.toBe('ended');
      game.advanceTicks(1);
    }
    expect(game.learnerSnapshot().phase).toBe('ready');
  }
  game.advanceTicks(1);
}
describe('CC2-30E: source owned full-width descending Molasses blanket',()=>{
  it('strictly opts in without changing older v1 source presets or old replays',()=>{
    const normal=defaultCreatureConfig();
    expect(normal.fieldMode).toBeUndefined();
    expect(validateCreatureConfig(normal)).toEqual(normal);
    const blanket=validateCreatureConfig({
      ...normal,fieldMode:'BELOW_PLATFORM',slowMultiplier:.5,
    });
    expect(blanket.fieldMode).toBe('BELOW_PLATFORM');
    expect(()=>validateCreatureConfig({...normal,slowMultiplier:.5})).toThrow();
    expect(()=>validateCreatureConfig({...blanket,fieldMode:'ANYWHERE'}))
      .toThrow();
    expect(()=>validateCreatureConfig({...blanket,slowMultiplier:.2})).toThrow();
  });
  it('anchors below platform across ALL columns and 10,000 ticks',()=>{
    const world=makeWorld(),ability=new MolassesAbility(world.runId);
    const receipts:string[]=[];
    const emit=(e:{type:string})=>receipts.push(e.type);
    expect(ability.cast(makeRequest(world),world,emit)).toBe(true);
    const f=ability.snapshot().activeField!;
    expect(f.coverage).toBe('BELOW_PLATFORM');
    expect(f.sourcePlatformId).toBe(world.currentProblem.correctPlatformId);
    expect(f.expiresTick).toBe(Number.MAX_SAFE_INTEGER);
    const below=f.y+world.world.geometry.rowGap*4;
    const above=f.y-world.world.geometry.rowGap*.01;
    for(const x of [-200000,-200,0,200,200000]){
      expect(ability.observePursuer({x,y:below},world.tick,emit))
        .toBe(.5);
    }
    expect(ability.observePursuer({x:5000,y:f.y},world.tick,emit))
      .toBe(.5);
    expect(receipts.filter(x=>x==='FIELD_CONTACT_ENTER')).toHaveLength(1);
    expect(ability.observePursuer({x:-99999,y:above},world.tick,emit))
      .toBe(1);
    expect(receipts.filter(x=>x==='FIELD_CONTACT_EXIT')).toHaveLength(1);
    ability.advance({...world,tick:world.tick+10000},emit);
    expect(ability.snapshot().activeField).toEqual(f);
    expect(receipts).not.toContain('FIELD_EXPIRED');
    expect(ability.observePursuer({x:9999,y:below},world.tick+10000,emit))
      .toBe(.5);
  });
  it('rejects overlapping fields and releases on reset and quit',()=>{
    const world=makeWorld(),ability=new MolassesAbility(world.runId);
    const request=makeRequest(world);
    expect(ability.cast(request,world,()=>{})).toBe(true);
    expect(ability.cast(request,world,()=>{})).toBe(false);
    ability.reset('next-run');
    expect(ability.snapshot().activeField).toBeNull();
    expect(()=>ability.cast(request,world,()=>{}))
      .toThrow('CREATURE_EFFECT_AUTHORITY');
    ability.terminate();
    expect(ability.snapshot().multiplier).toBe(1);
  });
  it('optional math passkey casts blanket and preserves separate core credit',()=>{
    const config=validateCreatureConfig({
      ...defaultCreatureConfig(),fieldMode:'BELOW_PLATFORM',slowMultiplier:.5,
    });
    const game=new CircuitClimbChaseCore('cc2-30e-replay',
      {...defaultRunConfig(),mode:'practice'},
      undefined,undefined,undefined,undefined,undefined,undefined,config);
    advanceFirstTwoRows(game);
    const before=game.learnerSnapshot();
    expect(game.offerCreature().ok).toBe(true);
    const q=game.creatureSnapshot()!.question!;
    const answer=q.sequence[2]+q.sequence[1]-q.sequence[0];
    expect(game.answerCreature(answer)).toEqual({ok:true,correct:true});
    const after=game.learnerSnapshot();
    expect(after.solved).toEqual(before.solved);
    expect(after.score).toBe(before.score);
    const f=game.creatureSnapshot()!.activeField!;
    expect(f.coverage).toBe('BELOW_PLATFORM');
    expect(game.creatureSnapshot()!.fieldMultiplier).toBe(.5);
    expect(game.creatureSnapshot()!.receipts
      .filter(r=>r.type==='FIELD_CAST')).toHaveLength(1);
    game.advanceTicks(720);
    expect(game.creatureSnapshot()?.activeField).toEqual(f);
    const trace=game.replayExport();
    expect(trace.creatureConfig?.fieldMode).toBe('BELOW_PLATFORM');
    expect(replayChase(trace).creatureSnapshot()).toEqual(game.creatureSnapshot());
  });
});
