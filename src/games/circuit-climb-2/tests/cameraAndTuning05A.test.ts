/**
 * CC2-05A — independent, executable tuning and zoom evidence.
 * Exact source engines, never mocked movement or fake pursuer decisions.
 */
import {describe,it,expect} from 'vitest';
import {
  defaultLearnerMotionPreset,validateLearnerMotionPreset,
} from '../config/learnerMotionPreset';
import {
  defaultDevLabPreset,validateDevLabPreset,
  exportDevLabPreset,importDevLabPreset,projectCameraPoint,
} from '../config/devLabPreset';
import {defaultPursuerPreset,validatePursuerPreset} from '../pursuer/pursuerPreset';
import {CircuitClimbCore,replayCore} from '../core/CircuitClimbCore';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';

describe('CC2-05A: versioned, independent tuning and camera authority',()=>{
  it('round-trips every editable domain and fails closed on unknown fields',()=>{
    const preset=defaultDevLabPreset();
    const copy=importDevLabPreset(exportDevLabPreset(preset));
    expect(copy).toEqual(preset);
    expect(()=>validateDevLabPreset({...preset,mathHack:true})).toThrow('CC2_DEV_PRESET_VERSION_OR_KEYS');
    expect(()=>validateDevLabPreset({...preset,camera:{zoom:0.3,follow:0.13}})).toThrow('CC2_CAMERA_INVALID');
    expect(()=>validateDevLabPreset({...preset,pursuer:{
      ...preset.pursuer,speedPursuit:-2,
    }})).toThrow();
    expect(()=>validateDevLabPreset({...preset,learner:{
      ...preset.learner,returnTicks:1,
    }})).toThrow('CC2_MOTION_RETURNTICKS');
    expect(()=>validateLearnerMotionPreset({...preset.learner,arbitrary:42})).toThrow('CC2_MOTION_UNKNOWN_KEYS');
  });

  it('camera projector expands visible rows without changing authoritative geometry',()=>{
    const preset=defaultDevLabPreset();
    const width=390,height=600;
    const x=300,y=-205,camera=-800;
    const at100=projectCameraPoint(x,y,camera,width,600,1);
    const at70=projectCameraPoint(x,y,camera,width,600,0.70);
    expect(at100.x).toBe(width/2);
    expect(at70.x).toBe(width/2);
    expect(at70.y).toBeLessThan(at100.y);
    expect(projectCameraPoint(110,y,camera,width,600,0.70).x)
      .toBeLessThan(width/2);
    expect(projectCameraPoint(490,y,camera,width,600,0.70).x)
      .toBeGreaterThan(width/2);
    expect(preset.camera.zoom).toBeLessThan(1);
    expect(height).toBe(600);
  });

  it('custom Circuit speed actually advances Spark faster without changing answer',()=>{
    const base={...defaultRunConfig(),mode:'practice' as const};
    const slow=new CircuitClimbCore('speed-proof',base,{
      ...defaultLearnerMotionPreset(),circuitSpeedPerTick:8,
    });
    const fast=new CircuitClimbCore('speed-proof',base,{
      ...defaultLearnerMotionPreset(),circuitSpeedPerTick:32,
    });
    const p=slow.snapshot().currentProblem;
    expect(fast.snapshot().currentProblem).toEqual(p);
    expect(slow.selectPlatform(p.correctPlatformId).ok).toBe(true);
    expect(fast.selectPlatform(p.correctPlatformId).ok).toBe(true);
    slow.advanceTicks(1);fast.advanceTicks(1);
    expect(fast.snapshot().travel?.distance).toBe(32);
    expect(slow.snapshot().travel?.distance).toBe(8);
    expect(fast.snapshot().spark.value).toBe(slow.snapshot().spark.value);
    expect(replayCore(fast.replayExport()).stateDigest()).toBe(fast.stateDigest());
    expect(replayCore(slow.replayExport()).stateDigest()).toBe(slow.stateDigest());
  });

  it('custom Hop ticks and wrong return ticks genuinely affect trajectory',()=>{
    const config={...defaultRunConfig(),mode:'practice' as const,movement:'hop' as const};
    const quicker=new CircuitClimbCore('hop-actual',config,{
      ...defaultLearnerMotionPreset(),hopTicks:6,returnTicks:6,
    });
    const slower=new CircuitClimbCore('hop-actual',config,{
      ...defaultLearnerMotionPreset(),hopTicks:60,returnTicks:60,
    });
    const wrong=quicker.snapshot().currentProblem.options.find(option=>
      option.platformId!==quicker.snapshot().currentProblem.correctPlatformId)!;
    expect(quicker.selectPlatform(wrong.platformId).ok).toBe(true);
    expect(slower.selectPlatform(wrong.platformId).ok).toBe(true);
    quicker.advanceTicks(6);
    slower.advanceTicks(6);
    expect(quicker.snapshot().phase).toBe('return');
    expect(slower.snapshot().phase).toBe('outbound');
    quicker.advanceTicks(6);
    expect(quicker.snapshot().phase).toBe('ready');
    expect(quicker.snapshot().spark.value).toBe(slower.snapshot().spark.value);
    expect(replayCore(quicker.replayExport()).snapshot()).toEqual(quicker.snapshot());
  });

  it('pursuer speed and near sensing are active physical/AI parameters',()=>{
    const config={...defaultRunConfig(),mode:'practice' as const};
    const slowPreset=validatePursuerPreset({
      ...defaultPursuerPreset(),speedSearch:0.3,speedPursuit:0.3,
      nearSenseRadius:50,clearSightRadius:50,
    });
    const fastPreset=validatePursuerPreset({
      ...defaultPursuerPreset(),speedSearch:7,speedPursuit:8,
      nearSenseRadius:500,clearSightRadius:600,
    });
    const slow=new CircuitClimbChaseCore('real-bot-tune',config,slowPreset);
    const fast=new CircuitClimbChaseCore('real-bot-tune',config,fastPreset);
    slow.advanceTicks(60);fast.advanceTicks(60);
    const a=slow.snapshot(),b=fast.snapshot();
    expect(b.pursuer.body.distanceTravelled).toBeGreaterThan(a.pursuer.body.distanceTravelled);
    expect(b.learner.currentProblem).toEqual(a.learner.currentProblem);
    expect(b.learner.attempts).toBe(0);
    expect(a.learner.attempts).toBe(0);
    const trace=fast.replayExport();
    expect(trace.pursuerPreset.speedPursuit).toBe(8);
    expect(replayChase(trace).stateDigest()).toBe(fast.stateDigest());
    expect(replayChase(trace).diagnostics()).toEqual(fast.diagnostics());
  });

  it('combined pursuit and learner motion preserve precise replay and math',()=>{
    const config={...defaultRunConfig(),mode:'practice' as const};
    const learner={...defaultLearnerMotionPreset(),circuitSpeedPerTick:25};
    const pursuer={...defaultPursuerPreset(),speedPursuit:6};
    const game=new CircuitClimbChaseCore('tuned-replay',config,
      pursuer,undefined,learner);
    const problem=game.learnerSnapshot().currentProblem;
    game.selectPlatform(problem.correctPlatformId);
    game.advanceTicks(200);
    const trace=game.replayExport();
    expect(trace.learnerMotion?.circuitSpeedPerTick).toBe(25);
    expect(trace.pursuerPreset.speedPursuit).toBe(6);
    const copy=replayChase(trace);
    expect(copy.stateDigest()).toBe(game.stateDigest());
    expect(copy.eventLog()).toEqual(game.eventLog());
    expect(copy.featureEventLog()).toEqual(game.featureEventLog());
  });
});
