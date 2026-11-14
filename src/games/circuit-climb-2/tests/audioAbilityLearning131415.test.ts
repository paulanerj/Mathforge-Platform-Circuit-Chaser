/**
 * CC2-13–15 qualification: source-only audio, abilities and learning.
 * Never imports browser, writes to protected mathematics or changes bot AI.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore,replayCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {FeatureProgression,defaultFeatureConfig,modifierForRow}
  from '../features/progression';
import {CircuitScoreDirector13,SCORE_ROLES13,validateStemManifest13,
  type ScoreEvent13,type RecordedStemManifest13}
  from '../music/circuitScoreDirector13';
import {summarizeAbilityEvidence14} from '../features/abilityReview14';
import {buildLearningReview15,incorrectHint15}
  from '../learning/learningFeedback15';

const rows=(curriculum:'add20'|'makeTarget20'|'skip2to10',seed:string,count=12)=>{
  const core=new CircuitClimbCore(seed,{...defaultRunConfig(),
    curriculum,mode:'climb',rowGapScale:2.8125});
  const progress=new FeatureProgression();
  progress.consume(core.eventLog());
  for(let i=0;i<count;i++){
    const before=core.snapshot();
    if(before.phase==='ended')break;
    const result=core.selectPlatform(before.currentProblem.correctPlatformId);
    expect(result.ok).toBe(true);
    core.advanceTicks(200);
    progress.consume(core.eventLog());
    progress.advance(core.snapshot().tick);
    expect(core.snapshot().completedRows).toBe(i+1);
    expect(core.snapshot().solved.length).toBe(i+1);
  }
  return{core,progress};
};
const asEvents=(xs:readonly ScoreEvent13[])=>xs;

describe('CC2-15 mathematical curriculum and learning authority',()=>{
  for(const curriculum of ['add20','makeTarget20','skip2to10'] as const){
    it(curriculum+' stays solvable, unique and replay-exact over 32 seeds × 16 rows',()=>{
      for(let seed=0;seed<32;seed++){
        const {core}=rows(curriculum,curriculum+'-property-'+seed,16);
        const state=core.snapshot();
        expect(state.solved.length).toBe(16);
        expect(state.completedRows).toBe(16);
        expect(replayCore(core.replayExport()).stateDigest()).toBe(core.stateDigest());
        const review=buildLearningReview15(asEvents(core.eventLog()),
          state.runId,curriculum);
        expect(review.errors).toEqual([]);
        expect(review.attempts).toBe(16);
        expect(review.confirmedSolved).toBe(16);
        expect(review.receipts.every(x=>x.landingConfirmed&&
          x.completedEquation!==null&&x.selectedCorrect)).toBe(true);
      }
    });
  }
  it('does not count an accepted correct selection before physical landing',()=>{
    const game=new CircuitClimbCore('learn-travel',{...defaultRunConfig(),
      mode:'climb',curriculum:'makeTarget20'});
    const state=game.snapshot();
    game.selectPlatform(state.currentProblem.correctPlatformId);
    const review=buildLearningReview15(asEvents(game.eventLog()),
      state.runId,'makeTarget20');
    expect(review.correctSelections).toBe(1);
    expect(review.confirmedSolved).toBe(0);
    expect(review.receipts[0].completedEquation).toBeNull();
    expect(review.errors).toEqual([]);
  });
  it('distinguishes wrong selections, never invents solved rows and gives restrained rules',()=>{
    const game=new CircuitClimbCore('learn-error',{...defaultRunConfig(),
      mode:'climb',curriculum:'makeTarget20'});
    const before=game.snapshot();
    const wrong=before.currentProblem.options.find(
      p=>p.platformId!==before.currentProblem.correctPlatformId)!;
    game.selectPlatform(wrong.platformId);
    game.advanceTicks(220);
    const attempt=game.eventLog().find(e=>e.type==='ATTEMPT_EVALUATED')!;
    const review=buildLearningReview15(asEvents(game.eventLog()),
      before.runId,'makeTarget20');
    expect(review.incorrectSelections).toBe(1);
    expect(review.confirmedSolved).toBe(0);
    expect(review.receipts[0].completedEquation).toBeNull();
    expect(review.receipts[0].shorted).toBe(true);
    expect(incorrectHint15(attempt,'makeTarget20')).toMatch(/too small|too large/);
    expect(()=>incorrectHint15({...attempt,detail:{...attempt.detail,correct:true}},
      'makeTarget20')).toThrow();
  });
});

describe('CC2-14 actual Pulse and special-row ledger completeness',()=>{
  it('documents 12 source-verified rows with correct Capacitor, Relay and stage',()=>{
    const {core,progress}=rows('add20','cc2-14-twelve-rows');
    const s=core.snapshot(),snap=progress.snapshot(s.tick,'climb','ready',false,1000);
    const evidence=summarizeAbilityEvidence14(asEvents(core.eventLog()),
      asEvents(progress.eventLog()),snap,s.runId);
    expect(evidence.errors).toEqual([]);
    expect(evidence.chargedRows).toBe(12);
    expect(evidence.capacitors).toBe(0); // capacity full, no phantom bonus
    expect(evidence.cappedChargeEvents).toBeGreaterThan(0);
    expect(evidence.relays).toBe(2); // rows 8, 12
    expect(evidence.stageEvents).toBe(1); // stage 2
    expect(modifierForRow(12,defaultFeatureConfig())).toBe('RELAY');
  });
  it('out-of-range Pulse spends charge but never claims a slowdown',()=>{
    const core=new CircuitClimbCore('cc2-14-pulse',{...defaultRunConfig(),
      mode:'climb'});
    const feature=new FeatureProgression();
    feature.consume(core.eventLog());
    for(let row=0;row<4;row++){
      core.selectPlatform(core.snapshot().currentProblem.correctPlatformId);
      core.advanceTicks(150);feature.consume(core.eventLog());
    }
    const now=core.snapshot();
    const before=feature.snapshot(now.tick,'climb','ready',false,900);
    expect(before.charge).toBe(4);
    const used=feature.activate(now.tick,'climb','ready',false,900);
    expect(used).toEqual({ok:true,affected:false});
    expect(feature.speedMultiplier(now.tick)).toBe(1);
    const audit=summarizeAbilityEvidence14(asEvents(core.eventLog()),
      asEvents(feature.eventLog()),feature.snapshot(now.tick,'climb','ready',false,900),now.runId);
    expect(audit.errors).toEqual([]);
    expect(audit.pulseMisses).toBe(1);
    expect(audit.pulseHits).toBe(0);
    expect(audit.chargeNow).toBe(0);
    const replay=replayCore(core.replayExport());
    expect(replay.stateDigest()).toBe(core.stateDigest());
  });
});

describe('CC2-13 Speed Grid-aligned but independently composed adaptive music',()=>{
  it('deduplicates all real source receipts; only solved ROW_COMPLETED improves streak',()=>{
    const core=new CircuitClimbCore('cc2-13-stems',{
      ...defaultRunConfig(),mode:'climb'});
    const s=core.snapshot(),d=new CircuitScoreDirector13();
    core.selectPlatform(s.currentProblem.correctPlatformId);
    let n=core.snapshot();
    d.consume(n,asEvents(core.eventLog()),[],false);
    expect(d.snapshot().streak).toBe(0);
    expect(d.drain().filter(r=>r.kind==='solved')).toHaveLength(0);
    core.advanceTicks(150);n=core.snapshot();
    d.consume(n,asEvents(core.eventLog()),[],false);
    expect(d.snapshot().streak).toBe(1);
    expect(d.drain().filter(r=>r.kind==='solved')).toHaveLength(1);
    d.consume(n,asEvents(core.eventLog()),[],false);
    expect(d.drain()).toHaveLength(0);
  });
  it('stage changes only at bars and the 9-role manifest is strictly aligned',()=>{
    const {core,progress}=rows('add20','cc2-director-12-rows');
    const state=core.snapshot(),director=new CircuitScoreDirector13();
    director.consume(state,asEvents(core.eventLog()),
      asEvents(progress.eventLog()),true);
    expect(director.snapshot().stage).toBe(1);
    expect(director.snapshot().desiredStage).toBeGreaterThan(1);
    const stage=director.commitBar(0);
    expect(stage).toBeGreaterThan(1);
    expect(director.commitBar(0)).toBe(stage);
    const seconds=16*4*60/112;
    const manifest:RecordedStemManifest13={
      schema:'cc2-recorded-score/v1',bpm:112,bars:16,
      masterSampleRate:48000,stems:SCORE_ROLES13.map(role=>({
        role,url:'https://assets.example.org/'+role+'.wav',
        durationSeconds:seconds,originSamples:0,licenseId:'original-composer-v1',
      })),
    };
    expect(()=>validateStemManifest13(manifest)).not.toThrow();
    expect(()=>validateStemManifest13({...manifest,
      stems:manifest.stems.map((x,i)=>i===0?{...x,durationSeconds:seconds+1}:x)}))
      .toThrow('CC2_STEM_MANIFEST_ALIGNMENT');
  });
});
