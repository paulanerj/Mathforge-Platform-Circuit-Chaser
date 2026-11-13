/**
 * CC2-06B: 1.5x authoritative rows, 25%-slower Spark and historical replay
 * compatibility. Tests must not alter any accepted SOT-02 source.
 */
import {describe,it,expect} from 'vitest';
import {defaultRunConfig,validateRunConfig,configHash} from '../config/runConfig';
import {resolveWorldGeometry} from '../world/world';
import {spacedDirectChaseDevLabPreset,validateDevLabPreset} from '../config/devLabPreset';
import {CircuitClimbCore,replayCore} from '../core/CircuitClimbCore';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';

describe('CC2-06B: expanded Direct Chase geometry and exact slower Spark',()=>{
  const p=spacedDirectChaseDevLabPreset();
  it('physical gap is 307.5 vs legacy 205 at 100% framing',()=>{
    const legacy=resolveWorldGeometry(defaultRunConfig());
    const expanded=resolveWorldGeometry(p.run);
    expect(legacy.rowGap).toBe(205);
    expect(expanded.rowGap).toBe(307.5);
    expect(expanded.rowGap/legacy.rowGap).toBe(1.5);
    expect(expanded.columns).toEqual(legacy.columns);
    expect(expanded.platformWidth).toBe(legacy.platformWidth);
  });
  it('Spark circuit speed is exactly 25% below R2 26; hop/return slower',()=>{
    expect(p.learner.circuitSpeedPerTick).toBe(19.5);
    expect(p.learner.circuitSpeedPerTick/26).toBe(0.75);
    expect(p.learner.hopTicks).toBe(19);
    expect(p.learner.returnTicks).toBe(16);
    expect(p.pursuer.speedSearch).toBe(2.20);
    expect(p.pursuer.speedPursuit).toBe(3.10);
    expect(p.personality?.detourChance).toBe(0);
    expect(p.personality?.hesitationChance).toBe(0);
    expect(validateDevLabPreset(p).run.rowGapScale).toBe(1.5);
  });
  it('rejects unsupported extension and preserves old replay digests',()=>{
    const original=defaultRunConfig();
    const oldHash=configHash(original);
    const old=validateRunConfig(original);
    expect(old.rowGapScale).toBeUndefined();
    expect(configHash(old)).toBe(oldHash);
    expect(configHash(validateRunConfig({...original,rowGapScale:1.5})))
      .not.toBe(oldHash);
    expect(()=>validateRunConfig({...original,rowGapScale:1.4}))
      .toThrow('CONFIG_INVALID_ROW_SPACING');
    expect(()=>validateRunConfig({...original,rowGapScale:1.5,
      unexpected:true})).toThrow('CONFIG_UNKNOWN_OR_MISSING_FIELDS');
  });
  it('player physically follows legal longer route without teleporting',()=>{
    const game=new CircuitClimbCore('cc2-06b-proof',
      {...p.run,mode:'practice'},p.learner);
    const initial=game.snapshot();
    const target=initial.currentProblem.correctPlatformId;
    const selection=game.selectPlatform(target);
    expect(selection.ok).toBe(true);
    let previous=game.snapshot().spark;
    let largest=0,steps=0;
    for(let i=0;i<200;i++){
      game.advanceTicks(1);
      const now=game.snapshot();
      largest=Math.max(largest,Math.hypot(now.spark.x-previous.x,
        now.spark.y-previous.y));
      previous=now.spark;steps++;
      if(now.phase==='ready'||now.phase==='ended')break;
    }
    expect(steps).toBeGreaterThanOrEqual(20);
    expect(steps).toBeLessThan(200);
    expect(largest).toBeLessThanOrEqual(19.5+1e-6);
    expect(game.snapshot().completedRows).toBe(1);
    expect(game.snapshot().spark.y).toBeLessThan(-307.5);
    expect(replayCore(game.replayExport()).stateDigest()).toBe(game.stateDigest());
  });
  it('Pursuer graph and full chase replay remain deterministic at 1.5x',()=>{
    const run={...p.run,mode:'practice' as const};
    const game=new CircuitClimbChaseCore('cc2-06b-chase',
      run,p.pursuer,undefined,p.learner,p.personality);
    game.advanceTicks(120);
    expect(game.snapshot().learner.world.geometry.rowGap).toBe(307.5);
    expect(game.snapshot().pursuer.routeFailures).toBe(0);
    expect(game.snapshot().pursuer.body.distanceTravelled).toBeGreaterThan(0);
    expect(replayChase(game.replayExport()).stateDigest()).toBe(game.stateDigest());
  });
});
