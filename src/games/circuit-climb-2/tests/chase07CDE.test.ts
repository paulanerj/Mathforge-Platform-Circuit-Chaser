/**
 * CC2-07C–07E — source-ledger telemetry, threat visual language and
 * bounded finite-sensing navigation graph on an extended public tower.
 */
import {describe,it,expect} from 'vitest';
import {paceProfile} from '../config/paceProfiles';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
import {SessionTelemetry07C,TELEMETRY_INTERVAL_TICKS,
  TELEMETRY_MAX_SAMPLES} from '../devtools/sessionTelemetry07C';
import {classifyThreat} from '../presentation/threatRadar07D';
import {PursuerController} from '../pursuer/pursuerController';
import {createWorld} from '../world/world';

describe('CC2-07C session telemetry — read only and bounded',()=>{
  it('does not mutate the authoritative game, emits physical contact evidence',()=>{
    const p=paceProfile('energetic');
    const game=new CircuitClimbChaseCore('telemetry-proof',
      {...p.run,mode:'practice'},p.pursuer,undefined,p.learner,p.personality);
    const telemetry=new SessionTelemetry07C();
    const unchanged=game.stateDigest();
    telemetry.observe(game.learnerSnapshot(),game.snapshot().pursuer);
    expect(game.stateDigest()).toBe(unchanged);
    for(let tick=1;tick<=225;tick++){
      game.advanceTicks(1);
      const learner=game.learnerSnapshot();
      telemetry.observe(learner,game.snapshot().pursuer);
    }
    const summary=telemetry.summary();
    expect(summary.tickCount).toBe(225);
    expect(summary.sampleCount).toBeGreaterThan(0);
    expect(summary.rowsCompleted).toBe(0);
    expect(summary.meanRangeWorld).not.toBeNull();
    expect(summary.maxRouteFailures).toBe(0);
    expect(telemetry.samples().length).toBe(16);
    expect(TELEMETRY_INTERVAL_TICKS).toBe(15);
    expect(TELEMETRY_MAX_SAMPLES).toBe(1200);
    expect(telemetry.samples()[0].tick).toBe(0);
    expect(telemetry.samples().at(-1)?.tick).toBe(225);
    // Reobserving the same engine tick is a complete no-op.
    const prior=JSON.stringify(telemetry.summary());
    telemetry.observe(game.learnerSnapshot(),game.snapshot().pursuer);
    expect(JSON.stringify(telemetry.summary())).toBe(prior);
    telemetry.reset();
    expect(telemetry.samples()).toHaveLength(0);
    expect(telemetry.summary().firstSensedTick).toBeNull();
    expect(telemetry.summary().sampleCount).toBe(0);
  });
  it('returns detached sample copies (UI cannot corrupt observer evidence)',()=>{
    const p=paceProfile('training');
    const game=new CircuitClimbChaseCore('detached-proof',
      {...p.run,mode:'practice'},p.pursuer,undefined,p.learner,p.personality);
    const telemetry=new SessionTelemetry07C();
    telemetry.observe(game.learnerSnapshot(),game.snapshot().pursuer);
    const copy=telemetry.samples();
    copy[0].spark.x=987654;
    if(copy[0].bot)copy[0].bot.x=987654;
    expect(telemetry.samples()[0].spark.x).not.toBe(987654);
    expect(telemetry.samples()[0].bot?.x).not.toBe(987654);
  });
});

describe('CC2-07D — honest proximity display',()=>{
  it('uses real physical Euclidean separation and row gap for severity',()=>{
    const spark={x:300,y:-307.5};
    const far=classifyThreat(spark,{x:300,y:922.5},307.5);
    const approaching=classifyThreat(spark,{x:300,y:307.5},307.5);
    const near=classifyThreat(spark,{x:300,y:0},307.5);
    const critical=classifyThreat(spark,{x:300,y:-207.5},307.5);
    expect(far.level).toBe('far');
    expect(far.relativeDirection).toBe('below');
    expect(approaching.level).toBe('approaching');
    expect(near.level).toBe('near');
    expect(critical.level).toBe('critical');
    expect(critical.rangeWorld).toBe(100);
    expect(far.magnitudePercent).toBeLessThan(approaching.magnitudePercent);
    expect(approaching.magnitudePercent).toBeLessThan(critical.magnitudePercent);
    expect(classifyThreat(spark,{x:300,y:-1200},307.5)
      .relativeDirection).toBe('above');
  });
  it('rejects unbounded or fabricated coordinates',()=>{
    expect(()=>classifyThreat({x:0,y:0},{x:0,y:0},0))
      .toThrow('CC2_THREAT_INVALID_WORLD');
    expect(()=>classifyThreat({x:NaN,y:0},{x:0,y:0},100))
      .toThrow('CC2_THREAT_INVALID_WORLD');
  });
});

describe('CC2-07E — 180-tier public tower finite navigation',()=>{
  it('retains occupied real graph edges within bounded 60-tier local window',()=>{
    const p=paceProfile('energetic');
    const world=createWorld(p.run);
    const g=world.geometry;
    // Structural-only synthetic public tower: mathematical values are not
    // provided to or used by the Pursuer strategy.
    for(let row=1;row<=180;row++){
      const y=-row*g.rowGap;
      world.rows.push({index:row,y,
        platforms:g.columns.map((x,column)=>({
          id:`row-${row}-column-${column}`,
          row,column,x,y,width:g.platformWidth,height:g.platformHeight,
          value:null,correct:false,dead:false,powered:false,selected:false,
        }))});
    }
    const bot=new PursuerController(world,p.pursuer,p.personality,'tower-180');
    for(let tick=1;tick<=110;tick++){
      const snap=bot.step(world,{x:530,y:-100000},tick);
      expect(snap.graphNodeCount).toBeLessThanOrEqual(61*7);
      expect(snap.routeFailures).toBe(0);
    }
    const end=bot.snapshot();
    expect(end.ticks).toBe(110);
    expect(end.body.distanceTravelled).toBeGreaterThan(0);
    expect(end.sensed).toBe(false);
    expect(end.belief.mode).toBe('SEARCH');
  },30000);
});
