/**
 * CC2-03 — adversarial gameplay and event-ledger invariants.
 *
 * This is direct source-backed testing, not a modeled scoreboard. It checks
 * overlapping Pulse rejection, protected timing, source-owned end-of-run
 * behavior, exact row modifiers and ability-driven replay identity.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';
import {defaultPursuerPreset} from '../pursuer/pursuerPreset';
import {
  FeatureProgression,defaultFeatureConfig,modifierForRow,
} from '../features/progression';

function climb(core:CircuitClimbCore,features:FeatureProgression,row:number){
  const p=core.snapshot().currentProblem;
  expect(core.selectPlatform(p.correctPlatformId)).toMatchObject({ok:true,correct:true});
  let count=0;
  while(core.snapshot().completedRows<row&&count++<300)core.advanceTicks(1);
  expect(core.snapshot().completedRows).toBe(row);
  features.consume(core.eventLog());
  features.advance(core.snapshot().tick);
}
describe('CC2-03 adversarial Pulse and stage rules',()=>{
  it('rejects reactivation while active even after four newly solved rows',()=>{
    const core=new CircuitClimbCore('cc2-pulse-overlap');
    const cfg={...defaultFeatureConfig(),pulseTicks:600};
    const features=new FeatureProgression(cfg);
    features.consume(core.eventLog());
    for(let row=1;row<=4;row++)climb(core,features,row);
    let tick=core.snapshot().tick;
    expect(features.activate(tick,'climb','ready',false,100))
      .toEqual({ok:true,affected:true});
    for(let row=5;row<=8;row++)climb(core,features,row);
    tick=core.snapshot().tick;
    expect(tick).toBeLessThan(features.snapshot(tick,'climb','ready',false).pulseUntilTick);
    expect(features.snapshot(tick,'climb','ready',false).charge).toBe(4);
    expect(features.snapshot(tick,'climb','ready',false).pulseAvailable).toBe(false);
    expect(features.activate(tick,'climb','ready',false,100))
      .toEqual({ok:false,reason:'ABILITY_ALREADY_ACTIVE'});
    expect(features.snapshot(tick,'climb','ready',false).charge).toBe(4);
    features.advance(600+core.eventLog().find(e=>e.type==='ROW_COMPLETED')!.tick);
    // Expiry event is required and cannot occur twice when repeatedly advanced.
    features.advance(10000);
    expect(features.eventLog().filter(e=>e.type==='ABILITY_EXPIRED')).toHaveLength(1);
    expect(features.snapshot(10000,'climb','ready',false).pulseAvailable).toBe(true);
    expect(features.activate(10000,'climb','ready',false,100))
      .toEqual({ok:true,affected:true});
  });

  it('stage increases only after real landing at row 12; relay has no math mutation',()=>{
    const core=new CircuitClimbCore('cc2-stage-12');
    const features=new FeatureProgression();
    features.consume(core.eventLog());
    for(let row=1;row<=12;row++){
      const before=core.snapshot().currentProblem;
      climb(core,features,row);
      expect(core.snapshot().solved.at(-1)?.result).toBe(before.targetValue);
      const stage=features.snapshot(core.snapshot().tick,'climb','ready',false).stage;
      expect(stage).toBe(row>=12?2:1);
    }
    const milestones=features.eventLog().filter(e=>e.type==='STAGE_REACHED');
    expect(milestones).toHaveLength(1);
    expect(milestones[0].detail).toMatchObject({stage:2,completedRows:12});
    expect(modifierForRow(12,features.config)).toBe('RELAY');
    expect(features.eventLog().filter(e=>e.type==='RELAY_CHAIN').map(e=>e.detail.row))
      .toEqual([8,12]);
    features.consume(core.eventLog());
    expect(features.eventLog().filter(e=>e.type==='STAGE_REACHED')).toHaveLength(1);
  });

  it('physical capture and Quit immediately terminalize feature availability',()=>{
    const config={...defaultRunConfig(),mode:'climb' as const};
    const bot={...defaultPursuerPreset(),speedSearch:0.1,speedPursuit:0.1};
    const quit=new CircuitClimbChaseCore('quit-feature',config,bot);
    quit.quit();
    const ended=quit.snapshot();
    expect(ended.learner.endReason).toBe('QUIT');
    expect(ended.features.pulseAvailable).toBe(false);
    expect(quit.featureEventLog()).toHaveLength(0);
    expect(quit.activatePulse()).toEqual({ok:false,reason:'RUN_ENDED'});
    quit.restart();
    expect(quit.snapshot().learner.phase).toBe('ready');
    expect(quit.snapshot().features.completedRows).toBe(0);
    expect(quit.snapshot().features.charge).toBe(0);

    const captured=new CircuitClimbChaseCore('capture-feature');
    captured.advanceTicks(1200);
    expect(captured.snapshot().learner.endReason).toBe('CAPTURED');
    expect(captured.snapshot().features.pulseAvailable).toBe(false);
    expect(captured.activatePulse()).toEqual({ok:false,reason:'RUN_ENDED'});
    expect(captured.featureEventLog().filter(e=>e.type==='ABILITY_ACTIVATED')).toHaveLength(0);
  });

  it('Pulse action rejection/pausing preserves replay and does not spend charge',()=>{
    const game=new CircuitClimbChaseCore('feature-paused',
      {...defaultRunConfig(),mode:'practice'});
    game.advanceTicks(40);
    game.pause();
    const before=game.snapshot();
    expect(game.activatePulse()).toEqual({ok:false,reason:'PAUSED'});
    game.advanceTicks(100);
    expect(game.snapshot()).toEqual(before);
    game.resume();
    game.advanceTicks(30);
    const replay=game.replayExport();
    const replica=replayChase(replay);
    expect(replica.stateDigest()).toBe(game.stateDigest());
    expect(replica.featureEventLog()).toEqual(game.featureEventLog());
  });
});
