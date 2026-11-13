/**
 * CC2-02B — owned perception/brain/planner/chassis orchestration.
 *
 * This layer alone receives actual Spark positions. It passes a narrow
 * finite-sensor observation to the strategy, never a selected answer,
 * upcoming path, future row or world-truth reference.
 *
 * All timing is fixed simulation ticks. State/traces are serializable;
 * no React, timers, Math.random, network or module-level mutable state.
 */
import type { WorldV1 } from '../world/world';
import {
  buildPursuitGraph,nearestNode,nodeId,type Point,type PursuitGraph,
} from './pursuitGraph';
import { observePursuer,type WakePoint,type PursuerObservation } from './perception';
import { freshBelief,choosePursuitGoal,type PursuerBelief } from './brain';
import {SeededRandom} from '../config/prng';
import {defaultPursuerPersonality,validatePursuerPersonality,
  type PursuerPersonalityV1,type PursuerEmotionV1} from './personality';
import { makeBody,stepChassis,type PursuerBody } from './chassis';
import {
  defaultPursuerPreset,validatePursuerPreset,type PursuerPresetV1,
} from './pursuerPreset';

export interface PursuerDiagnostic {
  tick:number;
  x:number;y:number;
  mode:PursuerBelief['mode'];
  reason:PursuerBelief['reason'];
  live:boolean;
  seenSource:string;
  goal:string;
  node:string;
  moved:number;
  routeFailure:string|null;
  emotion:PursuerEmotionV1;
  hesitation:boolean;
}
export interface PursuerSnapshot {
  body:PursuerBody;
  belief:PursuerBelief;
  radius:number;
  sensed:boolean;
  lastSensorSource:string;
  wakeCount:number;
  graphNodeCount:number;
  graphRejectedEdges:number;
  ticks:number;
  activeSensedTicks:number;
  distanceClosedWhileSensed:number;
  routeFailures:number;
  probeReason:string|null;
  emotion:PursuerEmotionV1;
  hesitation:boolean;
  personalityDetours:number;
  personalityHesitations:number;
}
const clone=<T>(x:T):T=>structuredClone(x);
export class PursuerController {
  readonly preset:PursuerPresetV1;
  readonly personality:PursuerPersonalityV1;
  readonly radius:number;
  private graph:PursuitGraph;
  private graphKey='';
  private body:PursuerBody;
  private belief:PursuerBelief;
  private lastSpark:Point|null=null;
  private wake:WakePoint[]=[];
  private trace:PursuerDiagnostic[]=[];
  private tickCount=0;
  private sensed=false;
  private sensorSource='NONE';
  private totalSensedTicks=0;
  private distanceClosed=0;
  private failures=0;
  private lastFailure:string|null=null;
  private personaRng:SeededRandom;
  private emotion:PursuerEmotionV1='SEARCHING';
  private pauseUntil=0;
  private nextPauseEligible=0;
  private noticeUntil=0;
  private frustratedUntil=0;
  private detourUntil=0;
  private detourGoal:string|null=null;
  private detours=0;
  private hesitations=0;

  constructor(world:WorldV1,preset:PursuerPresetV1=defaultPursuerPreset(),
    personality:PursuerPersonalityV1=defaultPursuerPersonality(),
    seed='default-pursuer-personality'){
    this.preset=Object.freeze(validatePursuerPreset(preset));
    this.personality=Object.freeze(validatePursuerPersonality(personality));
    this.personaRng=new SeededRandom(seed+':pursuer-personality:v1');
    this.radius=world.geometry.playerRadius*this.preset.actorRadiusRatio;
    this.graph=buildPursuitGraph(world,this.radius,-this.preset.spawnRowsBelow,3);
    this.graphKey=this.makeKey(world,-this.preset.spawnRowsBelow,3);
    this.body=makeBody(this.graph,nodeId(-this.preset.spawnRowsBelow,'B'));
    this.belief=freshBelief();
  }

  private makeKey(world:WorldV1,min:number,max:number){
    return [min,max,world.geometry.rowGap,world.rows.length,
      world.rows[0]?.index,world.rows.at(-1)?.index].join(':');
  }
  private ensureGraph(world:WorldV1){
    const h=world.geometry.rowGap;
    const observedRow=Math.floor(-this.body.y/h);
    let min=Math.min(-this.preset.spawnRowsBelow,
      observedRow-2,(world.rows[0]?.index??0)-2);
    // CRITICAL: the pursuit graph may extend only from generated PUBLIC
    // tower topology and the bot's own location. Using the hidden Spark's
    // actual Y here would leak its unseen row through navigation geometry.
    let max=Math.max(3,(world.rows.at(-1)?.index??0)+2);
    // CC2-07E: previously, long climbs eventually exceeded the 140-tier
    // constructor limit (and exploded shortest-path work), because the
    // oldest spawn node remained pinned forever. Once >60 tiers are needed,
    // switch to a bot-centered local physical graph. Never use the secret
    // actual Spark coordinates or future selected math here.
    if(max-min>60){
      const rowOf=(id:string):number=>{
        const match=/^R(-?\\d+):/.exec(id);
        if(!match)throw Error('PURSUER_BAD_NODE_ROW');
        return Number(match[1]);
      };
      const fromRow=rowOf(this.body.nodeId);
      const edgeRow=this.body.edgeTo?rowOf(this.body.edgeTo):fromRow;
      const low=Math.min(fromRow,edgeRow,observedRow);
      const high=Math.max(fromRow,edgeRow,observedRow);
      min=low-4;
      max=Math.min(max,Math.max(3,high+28));
      // Both the current source node and mid-edge destination are retained.
      // Capping only the public look-ahead cannot erase an occupied edge.
      if(max-min>60)max=min+60;
    }
    const key=this.makeKey(world,min,max);
    if(this.graphKey!==key){
      this.graph=buildPursuitGraph(world,this.radius,min,max);
      this.graphKey=key;
      if(!this.graph.byId.has(this.body.nodeId))
        throw Error('PURSUER_CURRENT_NODE_DISAPPEARED');
    }
  }
  /** One world step; called exactly once per 60Hz core tick. */
  step(world:WorldV1,actualSpark:Point,tick:number,speedMultiplier=1):PursuerSnapshot{
    // This is a PHYSICAL movement modifier, not a sensor/Brain disable.
    // Pursuit perception and memory advance normally during Circuit Pulse.
    if(!Number.isFinite(speedMultiplier)||speedMultiplier<=0||speedMultiplier>1)
      throw Error('PURSUER_SPEED_MULTIPLIER_INVALID');
    if(!Number.isInteger(tick)||tick<=this.tickCount)
      throw Error('PURSUER_TICK_NOT_MONOTONIC');
    this.ensureGraph(world);
    // Keep ONLY historical actual positions, not selected future routes.
    if(this.lastSpark&&Math.hypot(actualSpark.x-this.lastSpark.x,
      actualSpark.y-this.lastSpark.y)>3){
      this.wake.push({...this.lastSpark,tick:tick-1});
    }
    this.lastSpark={...actualSpark};
    this.wake=this.wake.filter(p=>tick-p.tick<=this.preset.trailLifetimeTicks).slice(-300);
    const observation:PursuerObservation=observePursuer(
      world,this.body,actualSpark,this.wake,tick,this.preset);
    const before=this.belief;
    const arrived=!this.body.edgeTo&&this.body.nodeId===before.goalId;
    // Last failure is explicit to Brain; no silent successful path claim.
    const decision=choosePursuitGoal(before,observation,this.graph,
      this.body.nodeId,arrived,Boolean(this.lastFailure),this.preset.staleContactTicks,
      this.preset.searchStrategy??'frontier',
      // Publicly generated geometry is allowed; never provide the true Spark
      // row/position or the destination from a learner's pending selection.
      world.rows.at(-1)?.index??0);
    this.belief=decision.belief;
    // A new legitimate contact causes a short visible surprise.
    // The bot never receives a future answer or the unseen exact location.
    if(observation.live && !this.sensed && this.personality.noticeTicks>0)
      this.noticeUntil=tick+this.personality.noticeTicks;
    if(!observation.live && this.sensed && this.personality.frustrationTicks>0)
      this.frustratedUntil=tick+this.personality.frustrationTicks;

    // Ticks are the ONLY clock; all random choices are seeded independently
    // from world, math, particles and the historical Pursuer search policy.
    if(this.personality.style==='curious' && tick>=this.nextPauseEligible &&
       tick%60===0 && !observation.live &&
       this.personaRng.next()<this.personality.hesitationChance){
      const duration=this.personaRng.integer(
        this.personality.hesitationMinTicks,
        this.personality.hesitationMaxTicks,
      );
      if(duration>0){
        this.pauseUntil=tick+duration;
        this.hesitations++;
      }
      this.nextPauseEligible=tick+this.personality.hesitationCooldownTicks;
    }
    if(this.personality.style==='curious' && tick>=this.detourUntil &&
       tick>=this.nextPauseEligible && tick%90===0 &&
       this.personaRng.next()<this.personality.detourChance){
      // Side route is selected ONLY from public graph edges at the physical
      // current node. The original Brain resumes search after a bounded delay.
      const options=this.graph.edges.filter(edge=>
        edge.a===this.body.nodeId||edge.b===this.body.nodeId)
        .map(edge=>edge.a===this.body.nodeId?edge.b:edge.a)
        .filter(id=>id!==decision.targetId);
      if(options.length>0){
        this.detourGoal=options[this.personaRng.integer(0,options.length-1)];
        this.detourUntil=tick+this.personality.detourTicks;
        this.detours++;
        this.nextPauseEligible=tick+this.personality.hesitationCooldownTicks;
      }
    }
    const startDistance=observation.live?
      Math.hypot(actualSpark.x-this.body.x,actualSpark.y-this.body.y):0;
    const speed=this.belief.mode==='PURSUIT'?
      this.preset.speedPursuit:this.preset.speedSearch;
    const hesitant=tick<this.pauseUntil || tick<this.noticeUntil;
    const goal=this.detourGoal && tick<this.detourUntil
      ? this.detourGoal:decision.targetId;
    if(tick>=this.detourUntil)this.detourGoal=null;
    // Zero speed never reaches stepChassis, whose strict speed validator
    // and blocked-route accounting must remain intact.
    const result=hesitant
      ? {body:this.body,moved:0,failedRoute:false,failureReason:undefined}
      : stepChassis(this.body,this.graph,world,goal,speed*speedMultiplier);
    this.body=result.body;
    this.emotion=tick<this.noticeUntil?'NOTICE'
      : tick<this.pauseUntil?'HESITATING'
      : tick<this.frustratedUntil?'FRUSTRATED'
      : this.detourGoal?'CURIOUS'
      : observation.live?'FOCUSED':'SEARCHING';
    this.lastFailure=result.failureReason??null;
    if(result.failedRoute)this.failures++;
    if(observation.live){
      this.totalSensedTicks++;
      const afterDistance=Math.hypot(actualSpark.x-this.body.x,actualSpark.y-this.body.y);
      this.distanceClosed+=startDistance-afterDistance;
    }
    this.sensed=Boolean(observation.live);
    this.sensorSource=observation.live?.source??observation.wake?.source??'NONE';
    this.tickCount=tick;
    this.trace.push({
      tick,x:this.body.x,y:this.body.y,mode:this.belief.mode,
      reason:this.belief.reason,live:this.sensed,seenSource:this.sensorSource,
      goal:decision.targetId,node:this.body.nodeId,moved:result.moved,
      routeFailure:this.lastFailure,
      emotion:this.emotion,hesitation:hesitant,
    });
    this.trace=this.trace.slice(-700);
    return this.snapshot();
  }
  snapshot():PursuerSnapshot{
    return {
      body:clone(this.body),belief:clone(this.belief),radius:this.radius,
      sensed:this.sensed,lastSensorSource:this.sensorSource,
      wakeCount:this.wake.length,
      graphNodeCount:this.graph.nodes.length,
      graphRejectedEdges:this.graph.rejected.length,
      ticks:this.tickCount,activeSensedTicks:this.totalSensedTicks,
      distanceClosedWhileSensed:this.distanceClosed,
      routeFailures:this.failures,probeReason:this.lastFailure,
      emotion:this.emotion,hesitation:this.pauseUntil>this.tickCount||
        this.noticeUntil>this.tickCount,
      personalityDetours:this.detours,personalityHesitations:this.hesitations,
    };
  }
  diagnostics():PursuerDiagnostic[]{return clone(this.trace);}
  /** Developer-only geometry; no Brain is permitted to read this view. */
  devGraph():{nodes:{id:string;x:number;y:number}[];edges:{a:string;b:string}[]}{
    return {nodes:this.graph.nodes.map(n=>({id:n.id,x:n.x,y:n.y})),
      edges:this.graph.edges.map(e=>({a:e.a,b:e.b}))};
  }
}
