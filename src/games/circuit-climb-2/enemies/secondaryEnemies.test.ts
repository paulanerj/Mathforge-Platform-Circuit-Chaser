/**
 * CC2-23 qualification uses real world geometry, real source core and the
 * authoritative Pursuer; no fake answer rows or custom collision solver.
 */
import {describe,it,expect} from 'vitest';
import {SecondaryEnemyDirector,defaultSecondaryConfig,
  validateSecondaryConfig,type SecondaryConfigV1} from './secondaryEnemies';
import {defaultRunConfig} from '../config/runConfig';
import {createWorld} from '../world/world';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {digestState} from '../core/CircuitClimbCore';

const world=createWorld(defaultRunConfig());
const config=(mode:'off'|'scout'|'sentry'|'both',
  more:Partial<SecondaryConfigV1>={}):SecondaryConfigV1=>({
  ...defaultSecondaryConfig(),mode,demoEarlySpawn:true,...more,
});
const input=(tick:number,spark={x:300,y:0},mode:'practice'|'climb'='climb')=>({
  runId:'cc2-23-direct/run-1',tick,phase:'ready' as const,
  mode,completedRows:0,world,spark,
});
const start=(mode:'off'|'scout'|'sentry'|'both',
  more:Partial<SecondaryConfigV1>={})=>
  new SecondaryEnemyDirector('cc2-23-direct/run-1',config(mode,more));

describe('CC2-23 safe secondary configuration',()=>{
  it('defaults to zero enemies, no reward and no gameplay change',()=>{
    const p=defaultSecondaryConfig();
    expect(p.mode).toBe('off');
    expect(start('off').advance(input(1)).actors).toEqual([]);
    expect(start('off').pressureFor(true)).toBe(1);
  });
  it('rejects unknown/malformed modes, schema and unfair pressure',()=>{
    for(const bad of [
      {...config('scout'),mode:'boss'},
      {...config('scout'),schema:'cc2-secondary-enemies/v2'},
      {...config('scout'),pressureMultiplier:1.4},
      {...config('scout'),warningTicks:0},
      {...config('scout'),secretAnswer:12},
      {...config('scout'),scoutSenseRadius:Infinity},
      {...config('scout'),sentrySenseRadius:9999},
    ])expect(()=>validateSecondaryConfig(bad)).toThrow();
  });
  it('refuses a cross-run input or reversed simulation clock',()=>{
    const d=start('scout');
    expect(()=>d.advance({...input(1),runId:'someone-else'}))
      .toThrow('CC2_SECONDARY_RUN_SCOPE');
    d.advance(input(20));
    expect(()=>d.advance(input(19))).toThrow('CC2_SECONDARY_TICK_ORDER');
  });
  it('returns snapshot clones rather than writable source references',()=>{
    const d=start('scout');
    const a=d.advance(input(1));
    (a.actors as unknown as {id:string}[])[0].id='evil';
    expect(d.snapshot().actors[0].id).toBe('scout');
    expect(d.advance(input(1)).events).toHaveLength(d.snapshot().events.length);
  });
});
describe('CC2-23 finite sensing and telegraphed support pressure',()=>{
  it('telegraphs Scout before alert, never surprises with instant acceleration',()=>{
    const d=start('scout');
    for(let tick=1;tick<=40;tick++){
      const following={x:300+120*Math.sin(tick*.016),y:0};
      const s=d.advance(input(tick,following));
      expect(s.speedMultiplier).toBe(1);
      expect(s.actors[0].phase).toBe('TELEGRAPH');
    }
    const active=d.advance(input(41,{x:300+120*Math.sin(41*.016),y:0}));
    expect(active.actors[0].phase).toBe('ALERT');
    expect(active.speedMultiplier).toBe(1.1);
    expect(active.summary.alerts).toBe(1);
    expect(d.pressureFor(false)).toBe(1);
    expect(d.pressureFor(true)).toBe(1.1);
    expect(active.events.filter(e=>e.type==='WARNING_STARTED')).toHaveLength(1);
    expect(active.events.filter(e=>e.type==='ALERT_STARTED')).toHaveLength(1);
  });
  it('cancels warning when Spark leaves real sight, no fabricated alert',()=>{
    const d=start('scout');
    d.advance(input(1));
    const far=d.advance(input(10,{x:900,y:-999}));
    expect(far.actors[0].phase).toBe('COOLDOWN');
    expect(far.summary.alerts).toBe(0);
    expect(far.events.some(e=>e.type==='WARNING_CANCELED')).toBe(true);
    expect(d.pressureFor(true)).toBe(1);
  });
  it('never reveals unsensed position in secondary events or snapshot',()=>{
    const d=start('scout');
    for(let tick=1;tick<=10;tick++)
      d.advance(input(tick,{x:800,y:-50000}));
    const s=d.snapshot();
    expect(JSON.stringify(s)).not.toContain('-50000');
    expect(s.summary.alerts).toBe(0);
    expect(s.summary.detections).toBe(0);
  });
  it('Sentry guards an actual directional zone, not every nearby Spark',()=>{
    const d=start('sentry');
    const no=d.advance(input(1,{x:440,y:250}));
    expect(no.summary.detections).toBe(0);
    for(let tick=2;tick<45;tick++)d.advance(input(tick,{x:440,y:-25}));
    const yes=d.snapshot();
    expect(yes.summary.detections).toBeGreaterThan(0);
    expect(yes.summary.alerts).toBe(1);
    expect(yes.actors[0].kind).toBe('SENTRY');
  });
  it('multiple alerts cap at 10% without stacking their multipliers',()=>{
    const d=start('both');
    for(let tick=1;tick<=110;tick++)
      d.advance(input(tick,{x:385,y:0}));
    const s=d.snapshot();
    expect(s.actors).toHaveLength(2);
    expect(s.speedMultiplier).toBeLessThanOrEqual(1.10);
    expect(d.pressureFor(false)).toBe(1);
  });
  it('never runs a Scout or Sentry in practice mode',()=>{
    const d=start('both');
    for(let tick=1;tick<=80;tick++)
      d.advance(input(tick,{x:300,y:0},'practice'));
    expect(d.snapshot().actors).toEqual([]);
    expect(d.snapshot().summary.alerts).toBe(0);
  });
  it('normal progress gates require four real rows for Scout, eight for Sentry',()=>{
    const d=start('both',{demoEarlySpawn:false});
    const ordinary=(tick:number,rows:number)=>({
      ...input(tick),completedRows:rows,
    });
    expect(d.advance(ordinary(1,0)).actors).toHaveLength(0);
    expect(d.advance(ordinary(2,4)).actors.map(a=>a.id)).toEqual(['scout']);
    expect(d.advance(ordinary(3,8)).actors.map(a=>a.id))
      .toEqual(['scout','sentry']);
  });
  it('no phantom events or state mutation after terminal end',()=>{
    const d=start('scout');
    d.advance(input(1));
    const end=d.advance({...input(2),phase:'ended' as const});
    const later=d.advance({...input(300),phase:'ended' as const});
    expect(later.summary.alerts).toBe(0);
    expect(later.speedMultiplier).toBe(1);
    expect(later.events).toEqual(end.events);
  });
  it('resets cleanly across consecutive run IDs',()=>{
    const d=start('scout');
    for(let tick=1;tick<=50;tick++)
      d.advance(input(tick,{x:300+120*Math.sin(tick*.016),y:0}));
    expect(d.snapshot().summary.alerts).toBe(1);
    d.reset('cc2-new-run');
    const after=d.snapshot();
    expect(after.events).toHaveLength(0);
    expect(after.runId).toBe('cc2-new-run');
    expect(after.actors).toHaveLength(0);
    expect(after.summary.alerts).toBe(0);
  });
  it('produces repeatable finite-sensing receipts for the same seedless fixture',()=>{
    const a=start('both'),b=start('both');
    for(let tick=1;tick<220;tick++){
      const spark={x:300+Math.sin(tick*.02)*90,y:-10};
      a.advance(input(tick,spark));
      b.advance(input(tick,spark));
    }
    expect(a.snapshot()).toEqual(b.snapshot());
  });
});
describe('CC2-23 authoritative chase compatibility and replay',()=>{
  it('off mode is byte-identical to no-secondary historical snapshot and replay',()=>{
    for(const seed of ['cc23-a','cc23-b','cc23-c']){
      const standard=new CircuitClimbChaseCore(seed);
      const off=new CircuitClimbChaseCore(seed,defaultRunConfig(),
        undefined,undefined,undefined,undefined,config('off'));
      for(let t=0;t<30;t++){
        expect(standard.stateDigest()).toBe(off.stateDigest());
        expect(standard.snapshot()).toEqual(off.snapshot());
        expect(standard.eventLog()).toEqual(off.eventLog());
        standard.advanceTicks(1);off.advanceTicks(1);
      }
      expect(standard.replayExport()).toEqual(off.replayExport());
      expect(off.secondarySnapshot()).toBeNull();
    }
  });
  it('opt-in replay reconstructs exact math, primary bot, and secondary receipts',()=>{
    const game=new CircuitClimbChaseCore('cc2-23-replay',
      defaultRunConfig(),undefined,undefined,undefined,undefined,
      config('both'));
    game.advanceTicks(80);
    const out=game.replayExport();
    expect(out.secondaryConfig?.mode).toBe('both');
    const rebuild=replayChase(out);
    expect(rebuild.stateDigest()).toBe(game.stateDigest());
    expect(rebuild.snapshot()).toEqual(game.snapshot());
    expect(rebuild.secondaryEvents()).toEqual(game.secondaryEvents());
  });
  it('secondary observation never changes arithmetic/choice identity',()=>{
    const a=new CircuitClimbChaseCore('cc2-23-equations',
      {...defaultRunConfig(),mode:'practice'});
    const b=new CircuitClimbChaseCore('cc2-23-equations',
      {...defaultRunConfig(),mode:'practice'},
      undefined,undefined,undefined,undefined,config('both'));
    for(let i=0;i<4;i++){
      const answer=a.learnerSnapshot().currentProblem.correctPlatformId;
      expect(answer).toBe(b.learnerSnapshot().currentProblem.correctPlatformId);
      expect(a.selectPlatform(answer)).toMatchObject({ok:true,correct:true});
      expect(b.selectPlatform(answer)).toMatchObject({ok:true,correct:true});
      for(let t=0;t<180;t++){a.advanceTicks(1);b.advanceTicks(1);}
      expect(a.learnerSnapshot()).toEqual(b.learnerSnapshot());
      expect(a.eventLog()).toEqual(b.eventLog());
    }
    expect(b.secondarySnapshot()?.actors).toEqual([]);
    expect(b.runSummary()).toEqual(a.runSummary());
  });
  it('secondary alerts are not scored as solved equations or achievements',()=>{
    const game=new CircuitClimbChaseCore('cc2-23-no-fake-awards',
      defaultRunConfig(),undefined,undefined,undefined,undefined,
      config('scout'));
    game.advanceTicks(50);
    expect(game.learnerSnapshot().solved).toHaveLength(0);
    expect(game.learnerSnapshot().score).toBe(0);
    expect(game.secondaryEvents().every(e=>
      !['ROW_COMPLETED','LANDING_CONFIRMED'].includes(e.type))).toBe(true);
    expect(digestState(game.runSummary())).toBe(
      digestState(game.runSummary()));
  });
});
