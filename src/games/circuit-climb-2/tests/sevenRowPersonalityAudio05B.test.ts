/**
 * CC2-05B: verifiable 7-row camera, beginner-intermediate difficulty,
 * personality bound, replay and feedback-event catalog.
 */
import {describe,it,expect} from 'vitest';
import {
  defaultDevLabPreset,intermediateDevLabPreset,exportDevLabPreset,
  importDevLabPreset,
} from '../config/devLabPreset';
import {defaultPursuerPreset} from '../pursuer/pursuerPreset';
import {
  curiousPursuerPersonality,defaultPursuerPersonality,
  validatePursuerPersonality,
} from '../pursuer/personality';
import {
  CUE_CATALOG,CORE_CUES,FEATURE_CUES,defaultFeedbackPreset,
  validateFeedbackPreset,
} from '../presentation/feedback';
import {defaultRunConfig} from '../config/runConfig';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';

describe('CC2-05B: owner intermediate difficulty baseline',()=>{
  it('uses precisely 20% faster bot search and pursuit than the last playtest',()=>{
    const p=intermediateDevLabPreset();
    expect(p.pursuer.speedSearch).toBeCloseTo(1.2*1.2,8);
    expect(p.pursuer.speedPursuit).toBeCloseTo(1.9*1.2,8);
    expect(p.pursuer.speedPursuit).toBeLessThan(3.7);
    expect(p.pursuer.speedSearch).toBeLessThan(2.6);
    expect(p.learner.circuitSpeedPerTick).toBe(26);
    expect(p.run.landingGraceTicks).toBe(45);
    expect(p.pursuer.spawnRowsBelow).toBe(3);
    expect(p.personality?.style).toBe('curious');
    expect(importDevLabPreset(exportDevLabPreset(p))).toEqual(p);
  });
  it('accepts original 05A JSON without invented fields, rejects unknown changes',()=>{
    const orig=defaultDevLabPreset();
    const old={schemaVersion:orig.schemaVersion,
      run:orig.run,learner:orig.learner,pursuer:orig.pursuer,camera:orig.camera};
    const v=importDevLabPreset(JSON.stringify(old));
    expect(v.personality).toEqual(defaultPursuerPersonality());
    expect(v.feedback).toEqual(defaultFeedbackPreset());
    expect(()=>importDevLabPreset(JSON.stringify({...old,hiddenMathHint:true})))
      .toThrow('CC2_DEV_PRESET_VERSION_OR_KEYS');
    expect(()=>validatePursuerPersonality({...curiousPursuerPersonality(),detourChance:1}))
      .toThrow('CC2_PERSONALITY_INVALID_detourChance');
  });
});

describe('CC2-05B: source-owned bounded curious behavior',()=>{
  it('never edits math or publishes future player route, with exact seeded replay',()=>{
    const p=intermediateDevLabPreset();
    const game=new CircuitClimbChaseCore('personality-qa',
      {...p.run,mode:'practice'},p.pursuer,undefined,p.learner,p.personality);
    game.advanceTicks(2300);
    const state=game.snapshot();
    expect(state.learner.phase).toBe('ready');
    expect(state.learner.currentProblem.targetValue).toBe(10);
    expect(state.learner.attempts).toBe(0);
    expect(state.pursuer.personalityHesitations).toBeGreaterThan(0);
    expect(state.pursuer.routeFailures).toBe(0);
    expect(state.pursuer.ticks).toBe(2300);
    expect(game.diagnostics().length).toBeLessThanOrEqual(700);
    const replay=game.replayExport();
    expect(replay.personality?.style).toBe('curious');
    const copy=replayChase(replay);
    expect(copy.stateDigest()).toBe(game.stateDigest());
    expect(copy.diagnostics()).toEqual(game.diagnostics());
  });
  it('always reactivates pursuit against stationary Spark in climb mode',()=>{
    const p=intermediateDevLabPreset();
    const game=new CircuitClimbChaseCore('persistent-threat',
      {...p.run,mode:'climb'},p.pursuer,undefined,p.learner,p.personality);
    game.advanceTicks(6000);
    expect(game.snapshot().learner.endReason).toBe('CAPTURED');
    expect(game.eventLog().filter(e=>e.type==='RUN_ENDED')).toHaveLength(1);
    expect(game.snapshot().pursuer.routeFailures).toBe(0);
  });
  it('leaves old hard Pursuer behavior available without personality interruptions',()=>{
    const config=defaultRunConfig();
    const game=new CircuitClimbChaseCore('old-hard',config,defaultPursuerPreset());
    game.advanceTicks(1200);
    expect(game.snapshot().pursuer.personalityHesitations).toBe(0);
    expect(game.snapshot().pursuer.personalityDetours).toBe(0);
    expect(game.snapshot().learner.endReason).toBe('CAPTURED');
  });
});

describe('CC2-05B: complete configurable audio/visual contract',()=>{
  it('maps every game event, bot emotion and key feature to a real cue definition',()=>{
    const core=[
      'RUN_STARTED','ATTEMPT_EVALUATED','TRAVEL_STARTED','LANDING_CONFIRMED',
      'PLATFORM_SHORTED','RETURN_FINISHED','ROW_COMPLETED','CELL_COMPLETED',
      'VOLTAGE_REBASE','RUN_PAUSED','RUN_RESUMED',
    ];
    expect(core.every(key=>CORE_CUES[key] in CUE_CATALOG)).toBe(true);
    expect(Object.values(FEATURE_CUES).every(key=>key in CUE_CATALOG)).toBe(true);
    for(const id of ['capture','quit','notice','hesitate','frustrated',
      'focus','curious','achievement','pulse','pulseMiss']){
      expect(CUE_CATALOG[id as keyof typeof CUE_CATALOG]?.duration).toBeGreaterThan(0);
    }
    const v=defaultFeedbackPreset();
    expect(validateFeedbackPreset({...v,volume:0})).toMatchObject({volume:0});
    expect(()=>validateFeedbackPreset({...v,volume:3})).toThrow('FEEDBACK_INVALID_VALUE');
  });
});
