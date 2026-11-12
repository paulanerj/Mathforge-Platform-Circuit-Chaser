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
}
const clone=<T>(x:T):T=>structuredClone(x);
export class PursuerController {
  readonly preset:PursuerPresetV1;
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

  constructor(world:WorldV1,preset:PursuerPresetV1=defaultPursuerPreset()){
    this.preset=Object.freeze(validatePursuerPreset(preset));
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
  private ensureGraph(world:WorldV1,learner:Point){
    const h=world.geometry.rowGap;
    const observedRow=Math.floor(-this.body.y/h);
    const min=Math.min(-this.preset.spawnRowsBelow,
      observedRow-2,world.rows[0]?.index-2??-2);
    const max=Math.max(3,Math.ceil(-learner.y/h)+2,
      (world.rows.at(-1)?.index??0)+2);
    const key=this.makeKey(world,min,max);
    if(this.graphKey!==key){
      this.graph=buildPursuitGraph(world,this.radius,min,max);
      this.graphKey=key;
      if(!this.graph.byId.has(this.body.nodeId))
        throw Error('PURSUER_CURRENT_NODE_DISAPPEARED');
    }
  }
  /** One world step; called exactly once per 60Hz core tick. */
  step(world:WorldV1,actualSpark:Point,tick:number):PursuerSnapshot{
    if(!Number.isInteger(tick)||tick<=this.tickCount)
      throw Error('PURSUER_TICK_NOT_MONOTONIC');
    this.ensureGraph(world,actualSpark);
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
      this.body.nodeId,arrived,Boolean(this.lastFailure),this.preset.staleContactTicks);
    this.belief=decision.belief;
    const startDistance=observation.live?
      Math.hypot(actualSpark.x-this.body.x,actualSpark.y-this.body.y):0;
    const speed=this.belief.mode==='PURSUIT'?
      this.preset.speedPursuit:this.preset.speedSearch;
    const result=stepChassis(this.body,this.graph,world,decision.targetId,speed);
    this.body=result.body;
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
    };
  }
  diagnostics():PursuerDiagnostic[]{return clone(this.trace);}
  /** Developer-only geometry; no Brain is permitted to read this view. */
  devGraph():{nodes:{id:string;x:number;y:number}[];edges:{a:string;b:string}[]}{
    return {nodes:this.graph.nodes.map(n=>({id:n.id,x:n.x,y:n.y})),
      edges:this.graph.edges.map(e=>({a:e.a,b:e.b}))};
  }
}
