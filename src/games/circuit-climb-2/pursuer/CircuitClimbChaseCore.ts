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

export interface ChaseSnapshotV1 {
  learner:EngineStateV1;
  pursuer:PursuerSnapshot;
}
export type ChaseCommandV1={
  tick:number;
  ordinal:number;
  type:'SELECT'|'PAUSE'|'RESUME'|'RESTART'|'QUIT';
  platformId?:string;
};
export interface ChaseReplayV1 {
  schema:'cc2-chase-replay/v1';
  seed:string;
  config:RunConfigV1;
  pursuerPreset:PursuerPresetV1;
  commands:ChaseCommandV1[];
  finalTick:number;
}
const clone=<T>(x:T):T=>structuredClone(x);

export class CircuitClimbChaseCore {
  readonly seed:string;
  readonly config:RunConfigV1;
  readonly pursuerPreset:PursuerPresetV1;
  private core:CircuitClimbCore;
  private pursuer:PursuerController;
  private commands:ChaseCommandV1[]=[];

  constructor(seed:string,config:RunConfigV1=defaultRunConfig(),
    preset:PursuerPresetV1=defaultPursuerPreset()){
    this.seed=seed;
    this.config=Object.freeze(validateRunConfig(config));
    this.pursuerPreset=Object.freeze(validatePursuerPreset(preset));
    this.core=new CircuitClimbCore(seed,this.config);
    this.pursuer=new PursuerController(this.core.snapshot().world,this.pursuerPreset);
  }
  private record(type:ChaseCommandV1['type'],platformId?:string){
    this.commands.push({tick:this.core.snapshot().tick,
      ordinal:this.commands.length+1,type,...(platformId?{platformId}:{})});
  }
  /** Physical overlap from PREVIOUS snapshot precedes a new user choice. */
  private adjudicate():boolean{
    if(this.config.mode==='practice')return false; // demonstration ghost
    const bot=this.pursuer.snapshot();
    return this.core.adjudicatePursuerCapture(bot.body.x,bot.body.y,bot.radius);
  }
  selectPlatform(platformId:string):SelectionResultV1{
    this.record('SELECT',platformId);
    if(this.adjudicate())return {ok:false,reason:'CAPTURED'};
    return this.core.selectPlatform(platformId);
  }
  pause():void{this.record('PAUSE');this.core.pause();}
  resume():void{this.record('RESUME');this.core.resume();}
  quit():void{this.record('QUIT');this.core.quit();}
  restart():void{
    this.record('RESTART');
    this.core.restart();
    this.pursuer=new PursuerController(this.core.snapshot().world,this.pursuerPreset);
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
      if(after.phase==='ended')return; // authored practice/challenge goal won
      this.pursuer.step(after.world,after.spark,after.tick);
      this.adjudicate(); // physically grounded contact only
    }
  }
  snapshot():ChaseSnapshotV1{
    return {learner:this.core.snapshot(),pursuer:this.pursuer.snapshot()};
  }
  /** Compatibility for the CC2 learner board's existing source API. */
  learnerSnapshot():EngineStateV1{return this.core.snapshot();}
  eventLog():GameEventV1[]{return this.core.eventLog();}
  diagnostics():PursuerDiagnostic[]{return this.pursuer.diagnostics();}
  devGraph(){return this.pursuer.devGraph();}
  stateDigest():string{return digestState(this.snapshot());}
  replayExport():ChaseReplayV1{
    return {
      schema:'cc2-chase-replay/v1',seed:this.seed,
      config:clone(this.config),pursuerPreset:clone(this.pursuerPreset),
      commands:clone(this.commands),finalTick:this.core.snapshot().tick,
    };
  }
}
/** Deterministic independent reconstruction of the integrated chase. */
export function replayChase(trace:ChaseReplayV1):CircuitClimbChaseCore{
  if(trace.schema!=='cc2-chase-replay/v1')throw Error('CHASE_REPLAY_VERSION');
  const game=new CircuitClimbChaseCore(trace.seed,trace.config,trace.pursuerPreset);
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
  }
  if(!Number.isInteger(trace.finalTick)||trace.finalTick<game.learnerSnapshot().tick)
    throw Error('CHASE_REPLAY_FINAL_TICK');
  game.advanceTicks(trace.finalTick-game.learnerSnapshot().tick);
  return game;
}
