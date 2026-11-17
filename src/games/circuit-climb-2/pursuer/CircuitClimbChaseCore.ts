/**
 * CC2-02B integrated chase product seam.
 *
 * One deterministic 60Hz world: the accepted 02A math/learner engine owns
 * attempts, movement, correct landings and capture. The new PursuerController
 * owns only finite observation, strategic intent and collision-safe body.
 * The controller may NOT issue a capture or alter a mathematical problem.
 *
 * Standalone 02A remains playable; opt into this wrapper for chase play.
 */
import {
  CircuitClimbCore,digestState,type EngineStateV1,type GameEventV1,
  type SelectionResultV1,
} from '../core/CircuitClimbCore';
import {
  defaultRunConfig,validateRunConfig,type RunConfigV1,
} from '../config/runConfig';
import {
  PursuerController,type PursuerSnapshot,type PursuerDiagnostic,
} from './pursuerController';
import {
  defaultPursuerPreset,validatePursuerPreset,type PursuerPresetV1,
} from './pursuerPreset';
import {
  FeatureProgression,defaultFeatureConfig,validateFeatureConfig,
  type FeatureConfigV1,type FeatureSnapshotV1,type FeatureEventV1,
} from '../features/progression';
import {buildRunSummary,type RunSummaryV1} from '../progression/runSummary';
import {defaultPursuerPersonality,validatePursuerPersonality,
  type PursuerPersonalityV1} from './personality';
import {defaultLearnerMotionPreset,validateLearnerMotionPreset,type LearnerMotionPresetV1} from '../config/learnerMotionPreset';
import {
  SecondaryEnemyDirector,validateSecondaryConfig,
  type SecondaryConfigV1,type SecondarySnapshotV1,
  type SecondaryEnemyEventV1,
} from '../enemies/secondaryEnemies';
import {
  SpecialDirector28,validateSpecialConfig28,
  type SpecialConfig28,type SpecialSnapshot28,type SpecialEvent28,
} from '../features/specialDirector28';

export interface ChaseSnapshotV1 {
  learner:EngineStateV1;
  pursuer:PursuerSnapshot;
  features:FeatureSnapshotV1;
  /** Absent entirely for the exact accepted single-Pursuer baseline. */
  secondary?:SecondarySnapshotV1;
  /** Absent entirely unless the independently versioned CC2-28 experiment runs. */
  specials?:SpecialSnapshot28;
}
export type ChaseCommandV1={
  tick:number;
  ordinal:number;
  type:'SELECT'|'PAUSE'|'RESUME'|'RESTART'|'QUIT'|'PULSE';
  platformId?:string;
};
export interface ChaseReplayV1 {
  schema:'cc2-chase-replay/v1';
  seed:string;
  config:RunConfigV1;
  pursuerPreset:PursuerPresetV1;
  /** Optional for backwards-compatible 02B replay loading. */
  featureConfig?:FeatureConfigV1;
  /** Optional for backwards-compatible replay loading; default preserves old motion. */
  learnerMotion?:LearnerMotionPresetV1;
  personality?:PursuerPersonalityV1;
  /** Only present in explicit experimental enemy-enabled replays. */
  secondaryConfig?:SecondaryConfigV1;
  /** Missing means exact historical chase replay and source digest. */
  specialConfig?:SpecialConfig28;
  commands:ChaseCommandV1[];
  finalTick:number;
}
const clone=<T>(x:T):T=>structuredClone(x);

export class CircuitClimbChaseCore {
  readonly seed:string;
  readonly config:RunConfigV1;
  readonly pursuerPreset:PursuerPresetV1;
  readonly featureConfig:FeatureConfigV1;
  readonly learnerMotion:LearnerMotionPresetV1;
  readonly personality:PursuerPersonalityV1;
  readonly secondaryConfig:SecondaryConfigV1|null;
  private secondary:SecondaryEnemyDirector|null=null;
  readonly specialConfig:SpecialConfig28|null;
  private specials:SpecialDirector28|null=null;
  private core:CircuitClimbCore;
  private pursuer:PursuerController;
  private features:FeatureProgression;
  private commands:ChaseCommandV1[]=[];

  constructor(seed:string,config:RunConfigV1=defaultRunConfig(),
    preset:PursuerPresetV1=defaultPursuerPreset(),
    featureConfig:FeatureConfigV1=defaultFeatureConfig(),
    learnerMotion:LearnerMotionPresetV1=defaultLearnerMotionPreset(),
    personality:PursuerPersonalityV1=defaultPursuerPersonality(),
    secondaryConfig?:SecondaryConfigV1,
    specialConfig?:SpecialConfig28){
    this.seed=seed;
    this.config=Object.freeze(validateRunConfig(config));
    this.pursuerPreset=Object.freeze(validatePursuerPreset(preset));
    this.featureConfig=Object.freeze(validateFeatureConfig(featureConfig));
    this.learnerMotion=Object.freeze(validateLearnerMotionPreset(learnerMotion));
    this.personality=Object.freeze(validatePursuerPersonality(personality));
    const secondary=secondaryConfig?validateSecondaryConfig(secondaryConfig):null;
    this.secondaryConfig=secondary&&secondary.mode!=='off'
      ?Object.freeze(secondary):null;
    // The special strategy policy is not created or serialized on legacy runs.
    this.specialConfig=specialConfig?
      Object.freeze(validateSpecialConfig28(specialConfig)):null;
    this.core=new CircuitClimbCore(seed,this.config,this.learnerMotion);
    this.pursuer=new PursuerController(this.core.snapshot().world,
      this.pursuerPreset,this.personality,this.seed);
    this.features=new FeatureProgression(this.featureConfig);
    this.features.consume(this.core.eventLog());
    if(this.specialConfig){
      this.specials=new SpecialDirector28(
        this.core.snapshot().runId,this.specialConfig);
      this.specials.consume(this.core.eventLog(),this.features.eventLog(),
        this.config.mode);
    }
    if(this.secondaryConfig){
      this.secondary=new SecondaryEnemyDirector(
        this.core.snapshot().runId,this.secondaryConfig);
    }
  }
  private record(type:ChaseCommandV1['type'],platformId?:string){
    this.commands.push({tick:this.core.snapshot().tick,
      ordinal:this.commands.length+1,type,...(platformId?{platformId}:{})});
  }
  /** Physical overlap from PREVIOUS snapshot precedes a new user choice. */
  private adjudicate():boolean{
    if(this.config.mode==='practice')return false; // demonstration ghost
    const bot=this.pursuer.snapshot();
    const captured=this.core.adjudicatePursuerCapture(bot.body.x,bot.body.y,bot.radius);
    // A contact before a user action or before a simulation tick may end
    // the run. Consume terminal evidence immediately in every path.
    if(captured){
      this.features.consume(this.core.eventLog());
      this.secondary?.terminate(this.core.snapshot().runId);
      this.specials?.terminate(this.core.snapshot().runId);
    }
    return captured;
  }
  selectPlatform(platformId:string):SelectionResultV1{
    this.record('SELECT',platformId);
    if(this.adjudicate())return {ok:false,reason:'CAPTURED'};
    // CC2-11: this is Spark's route-style fairness guard, not a Pursuer
    // intelligence change. It reads only a legitimate LIVE sensor flag and
    // current physical separation. Bot graph, brain, sensing and speed remain
    // fully authoritative and cannot see the chosen answer or route.
    if(this.config.routeStyleVersion==='cc2-motion-styles/v1'){
      const state=this.core.snapshot(),bot=this.pursuer.snapshot();
      const separation=Math.hypot(state.spark.x-bot.body.x,
        state.spark.y-bot.body.y);
      const danger=bot.sensed && bot.belief.mode==='PURSUIT' &&
        separation<=state.world.geometry.rowGap*1.35;
      return this.core.selectPlatform(platformId,
        danger?{suppressStyle:true}:undefined);
    }
    return this.core.selectPlatform(platformId);
  }
  /** Earned Pulse is available only at a grounded READY state. */
  activatePulse():{ok:true;affected:boolean}|{ok:false;reason:string}{
    this.record('PULSE');
    // Preserve physical capture precedence: no last-second ability can
    // reverse overlap already present when the player taps the control.
    if(this.adjudicate())return {ok:false,reason:'CAPTURED'};
    const state=this.core.snapshot();
    const bot=this.pursuer.snapshot();
    const distance=Math.hypot(state.spark.x-bot.body.x,state.spark.y-bot.body.y);
    const outcome=this.features.activate(state.tick,this.config.mode,
      state.phase,state.paused,distance);
    // Only a genuinely accepted, in-range ability can discharge a Surge.
    // Failed attempts and out-of-range Pulses never alter hazard authority.
    if(outcome.ok)this.specials?.onPulse(state.runId,state.tick,
      outcome.affected);
    return outcome;
  }
  pause():void{this.record('PAUSE');this.core.pause();}
  resume():void{this.record('RESUME');this.core.resume();}
  quit():void{
    this.record('QUIT');this.core.quit();
    this.features.consume(this.core.eventLog());
    this.secondary?.terminate(this.core.snapshot().runId);
    this.specials?.terminate(this.core.snapshot().runId);
  }
  restart():void{
    this.record('RESTART');
    this.core.restart();
    this.pursuer=new PursuerController(this.core.snapshot().world,
      this.pursuerPreset,this.personality,this.seed);
    // Ignore old-run rows, but consume the new RUN_STARTED event.
    const ledger=this.core.eventLog();
    this.features=new FeatureProgression(this.featureConfig,ledger.length-1);
    this.features.consume(ledger);
    if(this.secondary)this.secondary.reset(this.core.snapshot().runId);
    if(this.specials){
      this.specials.reset(this.core.snapshot().runId,ledger.length-1);
      this.specials.consume(ledger,this.features.eventLog(),this.config.mode);
    }
  }
  /** The same world remains paused/terminal without hidden chase advances. */
  advanceTicks(ticks:number):void{
    if(!Number.isInteger(ticks)||ticks<0||ticks>100000)throw Error('INVALID_CHASE_TICK_COUNT');
    for(let i=0;i<ticks;i++){
      const before=this.core.snapshot();
      if(before.paused||before.phase==='ended')return;
      if(this.adjudicate())return;
      this.core.advanceTicks(1);
      const after=this.core.snapshot();
      this.features.consume(this.core.eventLog());
      this.features.advance(after.tick);
      // Only real completed-row and existing FeatureProgression receipts
      // authorize a special interaction; this cannot influence math.
      this.specials?.consume(this.core.eventLog(),
        this.features.eventLog(),this.config.mode);
      if(after.phase==='ended'){
        this.secondary?.terminate(after.runId);
        this.specials?.terminate(after.runId);
        return;
      } // authored practice/challenge goal won
      // The secondary ecosystem only reads this tick's world and physically
      // observed Spark. It cannot direct capture, influence mathematical RNG,
      // or leak a correct platform. Its boost does not reveal Spark to the
      // primary Pursuer; primary sensing remains independently authoritative.
      const priorPrimary=this.pursuer.snapshot();
      const primaryLive=priorPrimary.sensed&&
        priorPrimary.belief.mode==='PURSUIT';
      const secondary=this.secondary?.advance({
        runId:after.runId,tick:after.tick,phase:after.phase,
        mode:this.config.mode,completedRows:after.completedRows,
        world:after.world,spark:after.spark,
      });
      this.specials?.advance(after.runId,after.tick,after.phase);
      // Scout/Sentry pressure and Surge pressure NEVER multiply each
      // other. The highest legitimate single pressure wins (<= 1.12).
      const secondaryPressure=this.secondary&&secondary?
        this.secondary.pressureFor(primaryLive):1;
      const specialPressure=this.specials?.pressureFor(primaryLive)??1;
      const pressure=Math.max(secondaryPressure,specialPressure);
      this.pursuer.step(after.world,after.spark,after.tick,
        this.features.speedMultiplier(after.tick)*pressure);
      if(this.adjudicate())this.features.consume(this.core.eventLog());
      // Physical contact is authoritative; ability never edits the Spark.
    }
  }
  snapshot():ChaseSnapshotV1{
    const state=this.core.snapshot();
    const bot=this.pursuer.snapshot();
    const separation=Math.hypot(state.spark.x-bot.body.x,
      state.spark.y-bot.body.y);
    return {learner:state,pursuer:bot,
      features:this.features.snapshot(state.tick,this.config.mode,
        state.phase,state.paused,separation),
      ...(this.secondary?{secondary:this.secondary.snapshot()}:{}),
      ...(this.specials?{specials:this.specials.snapshot()}:{})};
  }
  /** Compatibility for the CC2 learner board's existing source API. */
  learnerSnapshot():EngineStateV1{return this.core.snapshot();}
  eventLog():GameEventV1[]{return this.core.eventLog();}
  featureEventLog():FeatureEventV1[]{return this.features.eventLog();}
  /** Source-only projection: strict parity, solved-only equations, no mastery. */
  runSummary():RunSummaryV1{
    return buildRunSummary(this.core.snapshot(),
      this.core.eventLog(),this.features.eventLog());
  }
  featureSnapshot():FeatureSnapshotV1{
    const state=this.core.snapshot();
    const bot=this.pursuer.snapshot().body;
    const separation=Math.hypot(state.spark.x-bot.x,state.spark.y-bot.y);
    return this.features.snapshot(state.tick,this.config.mode,
      state.phase,state.paused,separation);
  }
  /** Secondary threats expose only their own finite-sensing events. */
  secondarySnapshot():SecondarySnapshotV1|null{
    return this.secondary?.snapshot()??null;
  }
  secondaryEvents():SecondaryEnemyEventV1[]{
    return this.secondary?.snapshot().events.slice()??[];
  }
  /** CC2-28 never writes score or player state; these are cloned receipts. */
  specialSnapshot():SpecialSnapshot28|null{
    return this.specials?.snapshot()??null;
  }
  specialEvents():SpecialEvent28[]{
    return this.specials?.snapshot().events.slice()??[];
  }
  diagnostics():PursuerDiagnostic[]{return this.pursuer.diagnostics();}
  devGraph(){return this.pursuer.devGraph();}
  stateDigest():string{return digestState(this.snapshot());}
  replayExport():ChaseReplayV1{
    return {
      schema:'cc2-chase-replay/v1',seed:this.seed,
      config:clone(this.config),pursuerPreset:clone(this.pursuerPreset),
      featureConfig:clone(this.featureConfig),
      learnerMotion:clone(this.learnerMotion),
      personality:clone(this.personality),
      ...(this.secondaryConfig?{secondaryConfig:clone(this.secondaryConfig)}:{}),
      ...(this.specialConfig?{specialConfig:clone(this.specialConfig)}:{}),
      commands:clone(this.commands),finalTick:this.core.snapshot().tick,
    };
  }
}
/** Deterministic independent reconstruction of the integrated chase. */
export function replayChase(trace:ChaseReplayV1):CircuitClimbChaseCore{
  if(trace.schema!=='cc2-chase-replay/v1')throw Error('CHASE_REPLAY_VERSION');
  const game=new CircuitClimbChaseCore(trace.seed,trace.config,trace.pursuerPreset,
    trace.featureConfig??defaultFeatureConfig(),
    trace.learnerMotion??defaultLearnerMotionPreset(),
    trace.personality??defaultPursuerPersonality(),
    trace.secondaryConfig,trace.specialConfig);
  let lastOrdinal=0;
  for(const cmd of trace.commands){
    if(!Number.isInteger(cmd.tick)||!Number.isInteger(cmd.ordinal)||
      cmd.ordinal<=lastOrdinal||cmd.tick<game.learnerSnapshot().tick)throw Error('CHASE_REPLAY_COMMAND_ORDER');
    lastOrdinal=cmd.ordinal;
    game.advanceTicks(cmd.tick-game.learnerSnapshot().tick);
    if(cmd.type==='SELECT')game.selectPlatform(cmd.platformId??'');
    else if(cmd.type==='PAUSE')game.pause();
    else if(cmd.type==='RESUME')game.resume();
    else if(cmd.type==='RESTART')game.restart();
    else if(cmd.type==='QUIT')game.quit();
    else if(cmd.type==='PULSE')game.activatePulse();
  }
  if(!Number.isInteger(trace.finalTick)||trace.finalTick<game.learnerSnapshot().tick)
    throw Error('CHASE_REPLAY_FINAL_TICK');
  game.advanceTicks(trace.finalTick-game.learnerSnapshot().tick);
  return game;
}
