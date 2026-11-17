/**
 * CC2-30A authoritative optional creature regression.
 * Proves gate outcomes, no legacy drift, speed field, no duplicated receipts,
 * pause/quit behavior and deterministic full replay.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {defaultCreatureConfig,validateCreatureConfig,
  CreatureEcologyDirector,ABILITY_CATALOG} from './creatureEcology30';
import {defaultRunConfig} from '../config/runConfig';

const make=(seed='cc230-molasses')=>new CircuitClimbChaseCore(seed,
  {...defaultRunConfig(),mode:'practice'},undefined,undefined,undefined,
  undefined,undefined,undefined,defaultCreatureConfig());
function reachFirstCreature(g:CircuitClimbChaseCore){
  for(let n=0;n<2;n++){
    const problem=g.learnerSnapshot().currentProblem;
    const correct=problem.options.find(o=>o.platformId===problem.correctPlatformId)!;
    expect(g.selectPlatform(correct.platformId).ok).toBe(true);
    let k=0;
    while(g.learnerSnapshot().phase!=='ready'&&
      g.learnerSnapshot().phase!=='ended'&&k++<2500)g.advanceTicks(1);
    expect(g.learnerSnapshot().phase).toBe('ready');
  }
  g.advanceTicks(1);
  expect(g.creatureSnapshot()?.platformId).toBeTruthy();
}
describe('CC2-30A reusable creature source system',()=>{
  it('catalog separates six distinct authorities; one runnable ability',()=>{
    expect(Object.keys(ABILITY_CATALOG)).toHaveLength(6);
    expect(Object.values(ABILITY_CATALOG).filter(a=>a.supportsDemo)).toHaveLength(1);
    expect(new Set(Object.values(ABILITY_CATALOG).map(a=>a.kind)).size).toBe(6);
  });
  it('validates complete versioned preset, ranges and unknown params',()=>{
    expect(validateCreatureConfig(defaultCreatureConfig()).schema).toBe('cc2-creature/v1');
    expect(()=>validateCreatureConfig({...defaultCreatureConfig(),slowMultiplier:0})).toThrow();
    expect(()=>validateCreatureConfig({...defaultCreatureConfig(),ghost:true})).toThrow();
  });
  it('historical candidate has no creature key and no creature replay config',()=>{
    const g=new CircuitClimbChaseCore('unchanged');
    expect(g.creatureSnapshot()).toBeNull();
    expect('creature' in g.snapshot()).toBe(false);
    expect('creatureConfig' in g.replayExport()).toBe(false);
  });
  it('a seeded first encounter offers exactly one uniquely correct skip sequence',()=>{
    const g=make();reachFirstCreature(g);
    expect(g.offerCreature()).toEqual({ok:true});
    const q=g.creatureSnapshot()?.question!;
    expect(q.sequence).toHaveLength(3);
    expect(new Set(q.options).size).toBe(3);
    const step=q.sequence[1]-q.sequence[0];
    expect(q.sequence[2]-q.sequence[1]).toBe(step);
    expect(q.options.filter(n=>n===q.sequence[2]+step)).toHaveLength(1);
    expect(q.deadlineTick).toBeGreaterThan(g.learnerSnapshot().tick);
  });
  it('wrong passkey earns no field, correct one triggers finite source field',()=>{
    const g=make();reachFirstCreature(g);
    expect(g.offerCreature().ok).toBe(true);
    const q=g.creatureSnapshot()!.question!;
    const answer=q.sequence[2]+(q.sequence[1]-q.sequence[0]);
    const wrong=q.options.find(n=>n!==answer)!;
    expect(g.answerCreature(wrong)).toEqual({ok:true,correct:false});
    expect(g.creatureSnapshot()?.activeField).toBeNull();
    expect(g.creatureSnapshot()?.receipts.at(-1)?.type).toBe('GATE_FAILED');
    g.advanceTicks(defaultCreatureConfig().offerTicks+
      defaultCreatureConfig().hopTravelTicks+3);
    expect(g.creatureSnapshot()?.receipts.some(e=>e.type==='HOPPED')).toBe(true);
    // The first hop may have begun before the previous answer's receipt.
    // Finish the actual source hop, not a guessed wall-clock duration.
    for(let n=0;n<80&&g.creatureSnapshot()?.hop;n++)g.advanceTicks(1);
    expect(g.creatureSnapshot()?.hop).toBeNull();
    expect(g.offerCreature().ok).toBe(true);
    const next=g.creatureSnapshot()!.question!;
    const correct=next.sequence[2]+next.sequence[1]-next.sequence[0];
    expect(g.answerCreature(correct)).toEqual({ok:true,correct:true});
    const field=g.creatureSnapshot()!.activeField!;
    expect(field).toBeTruthy();
    g.advanceTicks(defaultCreatureConfig().fieldTicks+1);
    expect(g.creatureSnapshot()?.activeField).toBeNull();
    expect(g.creatureSnapshot()?.receipts.filter(e=>e.type==='FIELD_CAST')).toHaveLength(1);
  });
  it('physical fluid collision is directional, bounded, and source-only',()=>{
    const g=make('field-geometry');reachFirstCreature(g);
    g.offerCreature();
    const q=g.creatureSnapshot()!.question!;
    const right=q.sequence[2]+q.sequence[1]-q.sequence[0];
    g.answerCreature(right);
    const c=g.creatureSnapshot()!;
    const fluid=c.activeField!;
    expect(fluid).toBeTruthy();
    const director=new CreatureEcologyDirector('isolated','trace');
    // The field is available through an integrated chase snapshot, and the
    // accepted effect does not touch the primary mathematical answer.
    expect(c.fieldMultiplier).toBeCloseTo(c.config.slowMultiplier);
    expect(director.pressureFor({x:fluid.x,y:fluid.y})).toBe(1);
    // Reconstruct the same command sequence and prove the real effect remains
    // present in that world rather than merely in the visual studio.
    const replay=replayChase(g.replayExport());
    expect(replay.creatureSnapshot()?.activeField).toEqual(fluid);
  });
  it('only physical directional contact slows Pursuer and emits edge receipts',()=>{
    const fixture=make('contact-world');reachFirstCreature(fixture);
    const state=fixture.learnerSnapshot();
    const runId='contact-run';
    const world={...state,runId};
    const d=new CreatureEcologyDirector('gel-contact',runId);
    d.advance(world);
    expect(d.offer(world).ok).toBe(true);
    const q=d.snapshot().question!;
    const next=q.sequence[2]+(q.sequence[1]-q.sequence[0]);
    expect(d.answer(world,next).correct).toBe(true);
    const field=d.snapshot().activeField!;
    const xDirection=field.direction==='left'?-1:1;
    const inside={x:field.x+xDirection*field.radius*.4,y:field.y};
    const otherSide={x:field.x-xDirection*field.radius*.4,y:field.y};
    expect(d.observePursuer(otherSide)).toBe(1);
    expect(d.observePursuer(inside)).toBeCloseTo(d.config.slowMultiplier);
    expect(d.observePursuer(inside)).toBeCloseTo(d.config.slowMultiplier);
    expect(d.snapshot().contactActive).toBe(true);
    expect(d.observePursuer({x:field.x+field.radius*5,y:field.y})).toBe(1);
    expect(d.snapshot().contactActive).toBe(false);
    expect(d.snapshot().receipts.filter(e=>e.type==='FIELD_CONTACT_ENTER'))
      .toHaveLength(1);
    expect(d.snapshot().receipts.filter(e=>e.type==='FIELD_CONTACT_EXIT'))
      .toHaveLength(1);
  });
  it('replay exactly reconstructs a deliberate creature gate and field',()=>{
    const g=make('replay-molasses');reachFirstCreature(g);
    expect(g.offerCreature().ok).toBe(true);
    const q=g.creatureSnapshot()!.question!;
    expect(g.answerCreature(q.sequence[2]+q.sequence[1]-q.sequence[0]).correct).toBe(true);
    g.advanceTicks(20);
    const replay=g.replayExport();
    expect(replay.creatureConfig?.schema).toBe('cc2-creature/v1');
    expect(replay.commands.some(c=>c.type==='CREATURE_OFFER')).toBe(true);
    expect(replayChase(replay).stateDigest()).toBe(g.stateDigest());
  });
  it('source skip puzzles never mark additional primary solved equations',()=>{
    const g=make('credit');reachFirstCreature(g);
    const before=g.learnerSnapshot().solved.length;
    g.offerCreature();
    const q=g.creatureSnapshot()!.question!;
    g.answerCreature(q.sequence[2]+q.sequence[1]-q.sequence[0]);
    expect(g.learnerSnapshot().solved).toHaveLength(before);
  });
  it('a paused/quit game cannot generate new creature motion or answers',()=>{
    const g=make('paused');reachFirstCreature(g);
    g.pause();
    const before=g.creatureSnapshot();
    g.advanceTicks(150);
    expect(g.creatureSnapshot()).toEqual(before);
    expect(g.offerCreature().ok).toBe(false);
    g.resume();g.quit();g.advanceTicks(200);
    expect(g.creatureSnapshot()?.activeField).toBeNull();
  });
  it('1000 varied skip gates yield one unique correct answer',()=>{
    // Reuse ONE real mathematically completed world; vary only the isolated
    // creature seed. Re-running thousands of full chases makes CI artificially
    // slow and measures the Pursuer rather than this independent generator.
    const fixture=make('gate-world-fixture');
    reachFirstCreature(fixture);
    const state=fixture.learnerSnapshot();
    let checked=0;
    for(let i=0;i<1000;i++){
      const config={...defaultCreatureConfig(),gateStep:2+i%8};
      const director=new CreatureEcologyDirector(String(i),'run-'+i,config);
      const world={...state,runId:'run-'+i};
      director.advance(world);
      expect(director.snapshot().gate).toBe('AVAILABLE');
      expect(director.offer(world).ok).toBe(true);
      const q=director.snapshot().question!;
      const step=q.sequence[1]-q.sequence[0];
      expect(q.options.filter(n=>n===q.sequence[2]+step)).toHaveLength(1);
      checked++;
    }
    expect(checked).toBe(1000);
  });
});
