/**
 * CC2-04 optional, host-neutral learning-event bridge.
 *
 * The host receives semantic facts after the game has already evaluated
 * attempts. There is no host math calculation, no identity, no storage,
 * no network access, no SDK import and no replay mutation.
 *
 * Subscriber errors are isolated: one failing adapter cannot block another
 * and receives the undelivered event again next pump.
 */
import type {GameEventV1,EngineStateV1} from '../core/CircuitClimbCore';
import type {FeatureEventV1} from '../features/progression';
import {deriveRunResult,type RunResultV1} from '../results/runResult';

export type LearningTopicV1 =
  'cc2.attempt_evaluated'|'cc2.problem_solved'|
  'cc2.run_ended'|'cc2.ability_activated'|
  'cc2.milestone_reached';
export interface LearningEventV1 {
  schema:'mathforge-learning-event/v1';
  id:string;
  runId:string;
  tick:number;
  topic:LearningTopicV1;
  details:Readonly<Record<string,string|number|boolean>>;
}
export type LearningSubscriberV1=(event:LearningEventV1)=>void;
export interface DeliveryReportV1 {
  projected:number;
  delivered:number;
  failed:number;
  subscriberCount:number;
}
const clone=<T>(x:T):T=>structuredClone(x);
/** One-to-one projection from AUTHORITATIVE source events. */
export function projectLearningEvents(
  coreEvents:readonly GameEventV1[],
  featureEvents:readonly FeatureEventV1[]=[],
):LearningEventV1[]{
  const projected:LearningEventV1[]=[];
  const project=(id:string,runId:string,tick:number,
    topic:LearningTopicV1,details:Record<string,string|number|boolean>)=>{
    projected.push({
      schema:'mathforge-learning-event/v1',
      id:`${runId}/${id}/${topic}`,runId,tick,topic,details:{...details},
    });
  };
  for(const e of coreEvents){
    if(e.type==='ATTEMPT_EVALUATED'){
      project(e.id,e.runId,e.tick,'cc2.attempt_evaluated',{
        attemptId:String(e.detail.attemptId),
        problemId:String(e.detail.problemId),
        rowIndex:Number(e.detail.rowIndex),
        operation:String(e.detail.operation),
        incomingValue:Number(e.detail.incomingValue),
        submittedOperand:Number(e.detail.selectedValue),
        targetValue:Number(e.detail.targetValue),
        correct:e.detail.correct===true,
        supportUsed:e.detail.supportUsed===true,
      });
    }else if(e.type==='ROW_COMPLETED'){
      project(e.id,e.runId,e.tick,'cc2.problem_solved',{
        attemptId:String(e.detail.attemptId),
        problemId:String(e.detail.problemId),
        rowIndex:Number(e.detail.rowIndex),
        resultValue:Number(e.detail.resultValue),
      });
    }else if(e.type==='RUN_ENDED'){
      project(e.id,e.runId,e.tick,'cc2.run_ended',{
        reason:String(e.detail.reason),
        rowsCompleted:Number(e.detail.completedRows),
        attempts:Number(e.detail.attempts),
        score:Number(e.detail.score),
      });
    }
  }
  for(const e of featureEvents){
    if(e.type==='ABILITY_ACTIVATED'){
      project(e.id,e.runId,e.tick,'cc2.ability_activated',{
        ability:String(e.detail.ability),
        affected:e.detail.affected===true,
        expiresAtTick:Number(e.detail.expiresAtTick),
      });
    }else if(e.type==='STAGE_REACHED'){
      project(e.id,e.runId,e.tick,'cc2.milestone_reached',{
        stage:Number(e.detail.stage),
        completedRows:Number(e.detail.completedRows),
      });
    }
  }
  // Stable order even when ROW_COMPLETED and stage milestone share a tick.
  // Sort by tick, then source-projection order (JS stable Array.sort).
  return projected.sort((a,b)=>a.tick-b.tick);
}
export class MathForgeLearningBridge {
  private readonly subscriptions=new Map<number,{
    callback:LearningSubscriberV1;delivered:Set<string>;
  }>();
  private nextSubscription=0;
  subscribe(callback:LearningSubscriberV1):()=>void{
    const id=++this.nextSubscription;
    this.subscriptions.set(id,{callback,delivered:new Set()});
    return ()=>{this.subscriptions.delete(id);};
  }
  pump(coreEvents:readonly GameEventV1[],
    featureEvents:readonly FeatureEventV1[]=[]):DeliveryReportV1{
    const events=projectLearningEvents(coreEvents,featureEvents);
    let delivered=0,failed=0;
    for(const subscriber of this.subscriptions.values()){
      for(const event of events){
        if(subscriber.delivered.has(event.id))continue;
        try{
          subscriber.callback(clone(event));
          subscriber.delivered.add(event.id);
          delivered++;
        }catch{
          failed++;
          // Preserve source order: stop this subscriber's delivery batch
          // until the failed event can be retried. Other hosts still advance.
          break;
        }
      }
    }
    return {projected:events.length,delivered,failed,
      subscriberCount:this.subscriptions.size};
  }
  /** Exact-source run result; host cannot recompute or overwrite correctness. */
  runResult(state:EngineStateV1,
    coreEvents:readonly GameEventV1[],featureEvents:readonly FeatureEventV1[]=[]):RunResultV1{
    return deriveRunResult(state,coreEvents,featureEvents);
  }
}
