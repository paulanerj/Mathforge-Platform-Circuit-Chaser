/**
 * CC2-34C: source-owned, opt-in Relay Weaver challenge and earned guide.
 *
 * Domain-only candidate: no DOM/browser, no Math.random, no audio callback,
 * and no mutation of the learner core. Integration into ChaseCore and real
 * creature UI requires a separate versioned adapter and replay commands.
 * The active primary correct answer is NEVER used to choose where the
 * independent creature spawns; this avoids accidental answer leakage.
 */
import type {EngineStateV1} from '../core/CircuitClimbCore';
import {
  CreatureEncounterArbiter,RelayGuidanceDirector,
  type RelayGuidanceView,
} from './creatureEcologyRelay34';

export const RELAY_CREATURE_SCHEMA='cc2-relay-creature/v1' as const;
export type RelayPhase='DORMANT'|'AVAILABLE'|'QUESTION'|'ARMED'|'GUIDING'|'COOLDOWN';
export interface RelayCreatureConfig {
  readonly schema:typeof RELAY_CREATURE_SCHEMA;
  readonly firstEligibleRow:number;
  readonly gateStep:number;
  readonly windowTicks:number;
  readonly guideRows:number;
}
export const DEFAULT_RELAY_CREATURE_CONFIG:RelayCreatureConfig=Object.freeze({
  schema:RELAY_CREATURE_SCHEMA,
  firstEligibleRow:1,
  gateStep:3,
  windowTicks:180,
  guideRows:4,
});
export interface RelayCreatureReceipt {
  readonly schema:'cc2-relay-receipt/v1';
  readonly id:string;
  readonly runId:string;
  readonly tick:number;
  readonly type:'SPAWNED'|'GATE_OFFERED'|'GATE_SOLVED'|'GATE_FAILED'|
    'GATE_EXPIRED'|'GATE_DECLINED'|'GUIDED_ROW_COMPLETED'|
    'GUIDANCE_FINISHED';
  readonly detail:Readonly<Record<string,number|string|boolean>>;
}
export interface RelayCreatureSnapshot {
  readonly schema:typeof RELAY_CREATURE_SCHEMA;
  readonly runId:string;
  readonly phase:RelayPhase;
  readonly platformId:string|null;
  readonly activeRow:number|null;
  readonly question:null|{sequence:number[];options:number[];deadlineTick:number};
  readonly guidance:RelayGuidanceView|null;
  readonly receipts:ReadonlyArray<RelayCreatureReceipt>;
}
const clone=<T>(a:T):T=>structuredClone(a);
const hash=(seed:string)=>{
  let h=2166136261;
  for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);
  return h>>>0;
};
export function validateRelayConfig(c:RelayCreatureConfig):RelayCreatureConfig{
  if(!c||c.schema!==RELAY_CREATURE_SCHEMA||
    Object.keys(c).sort().join('|')!==
      ['schema','firstEligibleRow','gateStep','windowTicks','guideRows'].sort().join('|'))
    throw Error('CC2_RELAY_SCHEMA');
  const ranges:[
    keyof RelayCreatureConfig,number,number
  ][]=[
    ['firstEligibleRow',1,12],['gateStep',2,9],
    ['windowTicks',60,600],['guideRows',1,8],
  ];
  for(const [k,min,max] of ranges){
    const v=c[k];
    if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)
      throw Error('CC2_RELAY_CONFIG_RANGE_'+k);
  }
  return clone(c);
}
export class RelayWeaverDirector {
  readonly config:RelayCreatureConfig;
  private runId:string;
  private seed:number;
  private phase:RelayPhase='DORMANT';
  private platformId:string|null=null;
  private activeRow:number|null=null;
  private question:RelayCreatureSnapshot['question']=null;
  private correct=0;
  private guide:RelayGuidanceDirector|null=null;
  // Read-only snapshots must not advance guidance or consume source row changes.
  private guidanceView:RelayGuidanceView|null=null;
  private ordinal=0;
  private receipts:RelayCreatureReceipt[]=[];
  private lastGuidedRows=0;
  private readonly encounters:CreatureEncounterArbiter;
  constructor(seed:string,runId:string,
    arbiter:CreatureEncounterArbiter,
    config:RelayCreatureConfig=DEFAULT_RELAY_CREATURE_CONFIG){
    if(!seed||!runId)throw Error('CC2_RELAY_ID_REQUIRED');
    this.config=validateRelayConfig(config);
    this.runId=runId;this.seed=hash(seed+':relay/v1');
    this.encounters=arbiter;
  }
  private emit(t:RelayCreatureReceipt['type'],
    tick:number,detail:RelayCreatureReceipt['detail']={}):void{
    const receipt:RelayCreatureReceipt={
      schema:'cc2-relay-receipt/v1',
      id:this.runId+':relay:'+ ++this.ordinal,
      runId:this.runId,tick,type:t,detail:clone(detail),
    };
    this.receipts.push(receipt);
    if(this.receipts.length>256)this.receipts.shift();
  }
  private requireRun(state:EngineStateV1):void{
    if(state.runId!==this.runId)throw Error('CC2_RELAY_RUN_ISOLATION');
  }
  /** Visually eligible, but never overlays or changes a mathematical button. */
  advance(state:EngineStateV1):void{
    this.requireRun(state);
    // Terminal transitions must release the exclusive encounter immediately.
    // A final snapshot can arrive without a separate UI terminate() call.
    if(state.phase==='ended'){
      this.terminate();
      return;
    }
    if(state.paused)return;
    if(this.phase==='DORMANT'&&
      state.completedRows>=this.config.firstEligibleRow&&
      state.phase==='ready'){
      const row=state.world.rows.find(r=>r.index===state.currentProblem.rowIndex);
      const candidates=row?.platforms.filter(p=>!p.dead)??[];
      if(candidates.length===0)return;
      // Spawn location is seeded independent of which platform is correct.
      const p=candidates[this.seed%candidates.length];
      this.platformId=p.id;
      this.activeRow=p.row;
      this.phase='AVAILABLE';
      this.emit('SPAWNED',state.tick,{platformId:p.id,row:p.row});
    }
    if(this.phase==='QUESTION'&&this.question&&
      state.tick>=this.question.deadlineTick){
      this.phase='COOLDOWN';this.question=null;
      this.encounters.release('RELAY');
      this.emit('GATE_EXPIRED',state.tick);
    }
    // A correct passkey may finish while Spark is travelling. Arm until
    // the next source READY state; never stop or rewrite the physical route.
    if(this.phase==='ARMED'&&state.phase==='ready'){
      this.guide=new RelayGuidanceDirector(state,this.config.guideRows);
      this.phase='GUIDING';this.lastGuidedRows=0;
      this.guidanceView=this.guide.advance(state);
    }
    if(this.phase==='GUIDING'&&this.guide){
      const view=this.guide.advance(state);
      this.guidanceView=view;
      while(this.lastGuidedRows<view.solvedGuidedRows){
        this.lastGuidedRows++;
        this.emit('GUIDED_ROW_COMPLETED',state.tick,
          {count:this.lastGuidedRows});
      }
      if(view.mode==='COMPLETE'){
        this.phase='COOLDOWN';
        this.emit('GUIDANCE_FINISHED',state.tick,
          {guided:this.lastGuidedRows});
      }
    }
  }
  offer(state:EngineStateV1):{ok:boolean;reason?:string}{
    this.requireRun(state);
    if(state.paused||state.phase!=='ready'||this.phase!=='AVAILABLE')
      return {ok:false,reason:'RELAY_NOT_AVAILABLE'};
    const offered=this.encounters.offer('RELAY',state);
    if(offered.accepted===false)return {ok:false,reason:offered.reason};
    const step=this.config.gateStep;
    const start=step*(1+(this.seed%4));
    const answer=start+step*3;
    this.correct=answer;
    const choices=[answer-step,answer,answer+step];
    const rotation=(this.seed>>>3)%3;
    const options=[...choices.slice(rotation),...choices.slice(0,rotation)];
    this.question={sequence:[start,start+step,start+step*2],
      options,deadlineTick:state.tick+this.config.windowTicks};
    this.phase='QUESTION';
    this.emit('GATE_OFFERED',state.tick,{
      deadlineTick:this.question.deadlineTick,gateStep:step});
    return {ok:true};
  }
  answer(state:EngineStateV1,choice:number):
    {ok:boolean;correct?:boolean;reason?:string}{
    this.requireRun(state);
    // A terminal source state must release the exclusive encounter even when
    // the final incoming UI action is an answer rather than an update tick.
    if(state.phase==='ended'){
      this.advance(state);
      return {ok:false,reason:'RELAY_GATE_CLOSED'};
    }
    if(state.paused||this.phase!=='QUESTION'||
      !this.question||!Number.isInteger(choice)||
      !this.question.options.includes(choice))
      return {ok:false,reason:'RELAY_GATE_CLOSED'};
    if(state.tick>=this.question.deadlineTick){
      this.advance(state);
      return {ok:false,reason:'RELAY_GATE_EXPIRED'};
    }
    const correct=choice===this.correct;
    this.question=null;this.encounters.release('RELAY');
    this.emit(correct?'GATE_SOLVED':'GATE_FAILED',state.tick,{choice});
    if(correct){
      if(state.phase==='ready'){
        this.guide=new RelayGuidanceDirector(state,this.config.guideRows);
        this.phase='GUIDING';
        this.guidanceView=this.guide.advance(state);
      }else this.phase='ARMED';
      this.lastGuidedRows=0;
    }else this.phase='COOLDOWN';
    return {ok:true,correct};
  }
  decline(state:EngineStateV1):boolean{
    this.requireRun(state);
    // Declining is a gameplay command, not a way to bypass logical expiry.
    // A stale UI click after the deadline must record expiry exactly once.
    if(state.phase==='ended'){
      this.advance(state);
      return false;
    }
    if(state.paused||this.phase!=='QUESTION'||!this.question)return false;
    if(state.tick>=this.question.deadlineTick){
      this.advance(state);
      return false;
    }
    this.encounters.release('RELAY');this.question=null;
    this.phase='COOLDOWN';this.emit('GATE_DECLINED',state.tick);
    return true;
  }
  terminate():void{
    this.encounters.release('RELAY');
    this.question=null;this.guide=null;this.guidanceView=null;
    this.phase='COOLDOWN';
  }
  reset(runId:string):void{
    if(!runId)throw Error('CC2_RELAY_ID_REQUIRED');
    this.encounters.reset(runId);
    this.runId=runId;this.phase='DORMANT';this.platformId=null;
    this.activeRow=null;this.question=null;this.guide=null;
    this.guidanceView=null;
    this.ordinal=0;this.receipts=[];this.lastGuidedRows=0;
  }
  snapshot(state?:EngineStateV1):RelayCreatureSnapshot{
    if(state)this.requireRun(state);
    // Querying presentation state cannot advance authoritative progress.
    const guidance=this.guidanceView;
    return clone({schema:RELAY_CREATURE_SCHEMA,runId:this.runId,
      phase:this.phase,platformId:this.platformId,activeRow:this.activeRow,
      question:this.question,guidance,receipts:this.receipts});
  }
}
