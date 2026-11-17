/**
 * CC2-27 — qualification of genuinely different tactical enemy roles.
 *
 * Tested against real world geometry and the existing source director.
 * Legacy omitted-policy configurations remain exact CC2-23 behavior.
 */
import {describe,it,expect} from 'vitest';
import {
  SecondaryEnemyDirector,defaultSecondaryConfig,
  validateSecondaryConfig,type SecondaryConfigV1
} from './secondaryEnemies';
import {createWorld} from '../world/world';
import {defaultRunConfig} from '../config/runConfig';
import {CircuitClimbChaseCore,replayChase} from
  '../pursuer/CircuitClimbChaseCore';

const world=createWorld(defaultRunConfig());
const policy='cc2-27-distinct/v1' as const;
const config=(mode:'off'|'scout'|'sentry'|'both',distinct=true):
  SecondaryConfigV1=>({
    ...defaultSecondaryConfig(),mode,demoEarlySpawn:true,
    ...(distinct?{encounterPolicy:policy}:{})
  });
const input=(tick:number,spark={x:300,y:0},mode:'climb'|'practice'='climb')=>({
  runId:'cc2-27/run-1',tick,phase:'ready' as const,mode,
  completedRows:0,world,spark
});

describe('CC2-27 opt-in versioning and source fidelity',()=>{
  it('preserves existing 23 config byte-for-byte when optional policy omitted',()=>{
    const before=defaultSecondaryConfig();
    expect(Object.hasOwn(before,'encounterPolicy')).toBe(false);
    expect(validateSecondaryConfig(before)).toEqual(before);
    const original=new SecondaryEnemyDirector('cc2-27/run-1',config('scout',false));
    for(let t=1;t<=41;t++){
      const spark={x:300+120*Math.sin(t*.016),y:0};
      original.advance(input(t,spark));
    }
    expect(original.snapshot().speedMultiplier).toBe(1.1);
    expect(original.snapshot().policy).toBeUndefined();
  });
  it('rejects unknown policy and refuses extra game-authority fields',()=>{
    expect(()=>validateSecondaryConfig({
      ...config('scout'),encounterPolicy:'unverified'
    })).toThrow('CC2_SECONDARY_POLICY');
    expect(()=>validateSecondaryConfig({
      ...config('scout'),correctAnswer:20
    })).toThrow('CC2_SECONDARY_CONFIG_FIELDS');
  });
  it('off and practice never activate a tactical enemy',()=>{
    const off=new SecondaryEnemyDirector('cc2-27/run-1',config('off'));
    const practice=new SecondaryEnemyDirector('cc2-27/run-1',config('both'));
    for(let t=1;t<=120;t++){
      off.advance(input(t));
      practice.advance(input(t,{x:300,y:0},'practice'));
    }
    expect(off.snapshot().actors).toHaveLength(0);
    expect(practice.snapshot().actors).toHaveLength(0);
    expect(off.pressureFor(true)).toBe(1);
    expect(practice.pressureFor(true)).toBe(1);
  });
});
describe('CC2-27 Scout reconnaissance vs Sentry directional lock',()=>{
  it('Scout creates brief <=6% recon pressure only after real sight/warning',()=>{
    const director=new SecondaryEnemyDirector('cc2-27/run-1',config('scout'));
    for(let t=1;t<=40;t++){
      const observed={x:300+120*Math.sin(t*.016),y:0};
      expect(director.advance(input(t,observed)).speedMultiplier).toBe(1);
    }
    const active=director.advance(input(41,{
      x:300+120*Math.sin(41*.016),y:0
    }));
    expect(active.policy).toBe(policy);
    expect(active.actors[0]).toMatchObject({
      role:'MOBILE_RECON',phase:'ALERT'
    });
    expect(active.speedMultiplier).toBeCloseTo(1.06);
    expect(director.pressureFor(false)).toBe(1);
    expect(director.pressureFor(true)).toBeCloseTo(1.06);
    const escaped=director.advance(input(42,{x:1100,y:1100}));
    expect(escaped.actors[0].phase).toBe('COOLDOWN');
    expect(escaped.speedMultiplier).toBe(1);
    expect(escaped.events.filter(e=>e.type==='ALERT_EXPIRED')
      .at(-1)?.detail.reason).toBe('SIGHT_LOST');
    expect(JSON.stringify(escaped)).not.toContain('1100');
  });
  it('Sentry has a longer warning, source-aligned cone and stronger lock',()=>{
    const d=new SecondaryEnemyDirector('cc2-27/run-1',config('sentry'));
    d.advance(input(1,{x:900,y:500}));
    const enemy=d.snapshot().actors[0];
    const spark={x:enemy.x,y:enemy.y-35};
    for(let t=2;t<=65;t++){
      const s=d.advance(input(t,spark));
      expect(s.actors[0].phase).toBe('TELEGRAPH');
      expect(s.speedMultiplier).toBe(1);
    }
    const armed=d.advance(input(66,spark));
    expect(armed.actors[0]).toMatchObject({
      role:'DIRECTIONAL_LOCK',phase:'ALERT'
    });
    expect(typeof armed.actors[0].heading).toBe('number');
    expect(armed.speedMultiplier).toBe(1.1);
    expect(d.pressureFor(false)).toBe(1);
    const avoided=d.advance(input(67,{x:1100,y:1100}));
    expect(avoided.actors[0].phase).toBe('COOLDOWN');
    expect(avoided.speedMultiplier).toBe(1);
  });
  it('two roles do not multiply each other even under simultaneous alerts',()=>{
    const d=new SecondaryEnemyDirector('cc2-27/run-1',config('both'));
    for(let t=1;t<=130;t++){
      const s=d.advance(input(t,{x:390,y:0}));
      expect(s.speedMultiplier).toBeLessThanOrEqual(1.1);
      expect(s.speedMultiplier).toBeGreaterThanOrEqual(1);
    }
    expect(d.snapshot().actors).toHaveLength(2);
  });
  it('deterministic replay preserves role policy, source receipts and math',()=>{
    const seed='cc2-27-ledger-replay';
    const a=new CircuitClimbChaseCore(seed,defaultRunConfig(),
      undefined,undefined,undefined,undefined,config('both'));
    a.advanceTicks(120);
    const replay=a.replayExport();
    expect(replay.secondaryConfig?.encounterPolicy).toBe(policy);
    const b=replayChase(replay);
    expect(b.stateDigest()).toBe(a.stateDigest());
    expect(b.secondaryEvents()).toEqual(a.secondaryEvents());
    expect(b.learnerSnapshot()).toEqual(a.learnerSnapshot());
    expect(b.runSummary()).toEqual(a.runSummary());
  });
});
