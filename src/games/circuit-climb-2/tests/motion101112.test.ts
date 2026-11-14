/**
 * CC2-10–12 owner-candidate source tests:
 * real 25% seeded Spark route variants, legal corridors, replay receipts,
 * source-visible pursuit state, original game custody and fairness.
 */
import {describe,it,expect} from 'vitest';
import {defaultRunConfig,validateRunConfig,configHash} from '../config/runConfig';
import {CircuitClimbCore,replayCore} from '../core/CircuitClimbCore';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {planRoute,findPlatform} from '../world/world';
import {expressiveRoute10} from '../world/expressiveRoute10';
import {paceProfile} from '../config/paceProfiles';

const run={
  ...defaultRunConfig(),mode:'practice' as const,
  rowGapScale:2.8125,routeStyleVersion:'cc2-motion-styles/v1' as const,
};

describe('CC2-10 deterministic real-route motion',()=>{
  it('validates strict opt-in version and preserves all historical replay hashes',()=>{
    const classic=defaultRunConfig();
    expect(configHash(validateRunConfig(classic))).toBe(configHash(classic));
    expect(validateRunConfig(run).routeStyleVersion).toBe('cc2-motion-styles/v1');
    expect(configHash(run)).not.toBe(configHash({...run,routeStyleVersion:undefined}));
    expect(()=>validateRunConfig({...run,routeStyleVersion:'v2'}))
      .toThrow('CONFIG_INVALID_MOTION_STYLE_VERSION');
    expect(()=>validateRunConfig({...run,thirdController:true}))
      .toThrow('CONFIG_UNKNOWN_OR_MISSING_FIELDS');
  });
  it('produces about one-quarter varied safe source-routed journeys',()=>{
    const core=new CircuitClimbCore('route-style-geometry',run);
    const s=core.snapshot();
    const src=findPlatform(s.world,s.spark.sourcePlatformId)!;
    const dst=findPlatform(s.world,s.currentProblem.correctPlatformId)!;
    const path=planRoute(s.world,src,dst);
    expect(path.ok).toBe(true);
    if(path.ok===false)throw Error('SOURCE_BASE_ROUTE_REJECTED');
    let varied=0;const styles=new Set<string>();
    for(let k=0;k<420;k++){
      const next=expressiveRoute10(s.world,src,dst,path.points,
        'route-style-seed-'+k);
      expect(next.totalLength).toBeGreaterThanOrEqual(path.totalLength-1e-6);
      expect(next.totalLength).toBeLessThanOrEqual(path.totalLength+150+1e-6);
      expect(next.points[0]).toEqual(path.points[0]);
      expect(next.points.at(-1)).toEqual(path.points.at(-1));
      if(next.varied){
        varied++;styles.add(next.style);
        expect(next.sections).toBeGreaterThanOrEqual(1);
        expect(next.sections).toBeLessThanOrEqual(2);
        expect(next.points.length-1).toBeLessThanOrEqual((path.points.length-1)*2);
      }
    }
    // Validated collision clearance may lower the percentage modestly,
    // but must never exceed the seed's 25%-eligibility decision by much.
    expect(varied).toBeGreaterThan(32);
    expect(varied).toBeLessThan(155);
    expect(styles).toEqual(new Set(['LIVELY_WEAVE','FEINT_RECOVER','OVERSHOOT_SETTLE']));
  });
  it('makes physical paths deterministic; wrong/correct math and landing remain authoritative',()=>{
    let sawVariation=0;
    for(let index=0;index<32;index++){
      const seed='cc2-route-replay-'+index;
      const game=new CircuitClimbCore(seed,run);
      const before=game.snapshot();
      const target=before.currentProblem.correctPlatformId;
      expect(game.selectPlatform(target).ok).toBe(true);
      const travel=game.snapshot().travel!;
      expect(travel.points[0].x).toBeCloseTo(before.spark.x,6);
      expect(travel.points[0].y).toBeCloseTo(before.spark.y,6);
      const event=game.eventLog().filter(e=>e.type==='TRAVEL_STARTED').at(-1)!;
      expect(event.detail.routeStyle).toBe(travel.routeStyle);
      if(event.detail.routeVaried===true)sawVariation++;
      let previous=game.snapshot().spark;
      for(let tick=0;tick<250;tick++){
        game.advanceTicks(1);
        const state=game.snapshot();
        expect(Math.hypot(state.spark.x-previous.x,state.spark.y-previous.y))
          .toBeLessThanOrEqual(26.00001);
        previous=state.spark;
        if(state.phase==='ready'||state.phase==='ended')break;
      }
      const settled=game.snapshot();
      expect(settled.completedRows).toBe(1);
      expect(settled.solved.length).toBe(1);
      expect(settled.solved[0].result).toBe(before.currentProblem.targetValue);
      expect(replayCore(game.replayExport()).stateDigest()).toBe(game.stateDigest());
    }
    expect(sawVariation).toBeGreaterThan(0);
  });
  it('threat suppression is part of the replay transcript, not an unrecorded override',()=>{
    for(let k=0;k<15;k++){
      const game=new CircuitClimbCore('suppression-'+k,run);
      const target=game.snapshot().currentProblem.correctPlatformId;
      expect(game.selectPlatform(target,{suppressStyle:true}).ok).toBe(true);
      const event=game.eventLog().filter(e=>e.type==='TRAVEL_STARTED').at(-1)!;
      expect(event.detail.routeStyle).toBe('FOCUSED_SPRINT');
      expect(event.detail.routeVaried).toBe(false);
      expect(event.detail.routeSuppressed).toBe(true);
      expect(game.replayExport().commands.at(-1)?.suppressStyle).toBe(true);
      game.advanceTicks(120);
      expect(replayCore(game.replayExport()).stateDigest()).toBe(game.stateDigest());
    }
  });
  it('legacy runs remain byte-semantically clean with no new source event fields',()=>{
    const game=new CircuitClimbCore('legacy-route-no-optin',{
      ...defaultRunConfig(),mode:'practice',rowGapScale:2.8125});
    const target=game.snapshot().currentProblem.correctPlatformId;
    expect(game.selectPlatform(target).ok).toBe(true);
    expect(game.snapshot().travel?.routeStyle).toBeUndefined();
    const event=game.eventLog().filter(e=>e.type==='TRAVEL_STARTED').at(-1)!;
    expect(Object.keys(event.detail).sort()).toEqual(['attemptId','movement','platformId']);
    game.advanceTicks(150);
    expect(replayCore(game.replayExport()).stateDigest()).toBe(game.stateDigest());
  });
});

describe('CC2-11 protected Pursuer fairness and human calibration evidence',()=>{
  for(const tier of ['training','energetic','intense'] as const){
    it(tier+' source-backed matched-seed profile retains finite-sensing chase/replay',()=>{
      const p=paceProfile(tier);
      for(let k=0;k<4;k++){
        const game=new CircuitClimbChaseCore('cc2-11-'+tier+'-'+k,
          {...p.run,mode:'practice',rowGapScale:2.8125,
           routeStyleVersion:'cc2-motion-styles/v1'},
          p.pursuer,undefined,p.learner,p.personality);
        const source=game.learnerSnapshot();
        expect(game.selectPlatform(source.currentProblem.correctPlatformId).ok).toBe(true);
        game.advanceTicks(180);
        const snap=game.snapshot();
        expect(snap.pursuer.routeFailures).toBe(0);
        expect(snap.pursuer.activeSensedTicks).toBeGreaterThanOrEqual(0);
        expect(snap.learner.world.geometry.rowGap).toBe(576.5625);
        expect(replayChase(game.replayExport()).stateDigest()).toBe(game.stateDigest());
      }
    });
  }
});
