/**
 * CC2-28 — Optional, source-authoritative Special Platform Director.
 *
 * Purpose: turn established source-backed Capacitor/Relay/Pulse receipts
 * into a readable strategy loop and introduce an avoidable, telegraphed,
 * ROW-WIDE electrical Surge hazard. The surface never reads a correct
 * answer, assigns points, awards a solved row or fabricates a landing.
 *
 * All three option platforms share a surge designation. It is impossible
 * to infer the correct mathematical platform from this module. Hazards
 * become eligible only after an actual ROW_COMPLETED receipt. Only the
 * primary Pursuer's own live sensor and pursuit authority may apply the
 * bounded movement multiplier; never secret remote targeting.
 *
 * Off policy: this director is not instantiated at all. Existing replay,
 * achievement and scoring schema remain byte-compatible.
 */
import type {GameEventV1} from '../core/CircuitClimbCore';
import type {FeatureEventV1} from '../features/progression';

export const CC2_SPECIAL_SCHEMA='cc2-specials/v1' as const;
export interface SpecialConfig28 {
  readonly schema:typeof CC2_SPECIAL_SCHEMA;
  readonly surgeEveryRows:number;
  readonly warningTicks:number;
  readonly activeTicks:number;
  readonly surgeMultiplier:number;
  readonly relayGuardRows:number;
}
export type SurgePhase28='IDLE'|'WARNING'|'ACTIVE';
export type SpecialEventType28=
  'CAPACITOR_BONUS'|'RELAY_GUARD_EARNED'|'SURGE_WARNING'|
  'SURGE_ACTIVE'|'SURGE_GROUNDED'|'SURGE_DISCHARGED'|'SURGE_EXPIRED';
export interface SpecialEvent28 {
  readonly schema:'cc2-special-event/v1';
  readonly id:string;
  readonly runId:string;
  readonly tick:number;
  readonly type:SpecialEventType28;
  readonly row:number;
  readonly detail:Readonly<Record<string,string|number|boolean>>;
}
export interface SpecialSnapshot28 {
  readonly schema:'cc2-special-snapshot/v1';
  readonly runId:string;
  readonly tick:number;
  readonly mode:'climb'|'challenge'|'practice';
  readonly completedRows:number;
  readonly nextRow:number;
  readonly nextRowSurge:boolean;
  readonly phase:SurgePhase28;
  readonly activeRow:number|null;
  readonly warningProgress:number;
  readonly guardRowsRemaining:number;
  readonly pressureMultiplier:number;
  readonly counters:Readonly<{
    capacitors:number;relays:number;surges:number;
    grounded:number;discharged:number;activated:number;expired:number;
  }>;
  readonly events:readonly SpecialEvent28[];
}
const isInt=(x:unknown,min:number,max:number):x is number=>
  Number.isInteger(x)&&Number(x)>=min&&Number(x)<=max;
const exact=(x:unknown,keys:string[]):x is Record<string,unknown>=>!!x&&
  typeof x==='object'&&!Array.isArray(x)&&
  JSON.stringify(Object.keys(x).sort())===JSON.stringify([...keys].sort());
const clone=<T>(x:T):T=>structuredClone(x);
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
export function defaultSpecialConfig28():SpecialConfig28{
  return {
    schema:CC2_SPECIAL_SCHEMA,
    // First 4 rows remain hazard-free; row 6 is Capacitor, row 7 Surge,
    // row 8 Relay. Later collisions always apply to ENTIRE rows.
    surgeEveryRows:7,
    warningTicks:45,
    activeTicks:120,
    surgeMultiplier:1.07,
    relayGuardRows:1,
  };
}
export function validateSpecialConfig28(v:unknown):SpecialConfig28{
  const d=defaultSpecialConfig28();
  if(!exact(v,Object.keys(d)))throw Error('CC228_CONFIG_FIELDS');
  const p=v as unknown as SpecialConfig28;
  if(p.schema!==CC2_SPECIAL_SCHEMA)throw Error('CC228_CONFIG_SCHEMA');
  if(!isInt(p.surgeEveryRows,6,30)||
     !isInt(p.warningTicks,30,120)||
     !isInt(p.activeTicks,40,300)||
     !isInt(p.relayGuardRows,1,4))
    throw Error('CC228_CONFIG_TIMINGS');
  if(typeof p.surgeMultiplier!=='number'||
     !Number.isFinite(p.surgeMultiplier)||
     p.surgeMultiplier<1||p.surgeMultiplier>1.10)
    throw Error('CC228_CONFIG_PRESSURE');
  return clone(p);
}
/** Row-wide public fixture: never depends on correctPlatformId or numbers. */
export function surgeForRow28(row:number,c:SpecialConfig28):boolean{
  if(!isInt(row,1,Number.MAX_SAFE_INTEGER))
    throw Error('CC228_INVALID_ROW');
  return row>4&&row%c.surgeEveryRows===0;
}
type SurgeState={phase:SurgePhase28;row:number|null;
  warnedAt:number;warningUntil:number;expiresAt:number};
const clearSurge=():SurgeState=>({
  phase:'IDLE',row:null,warnedAt:0,warningUntil:0,expiresAt:0,
});
export class SpecialDirector28{
  readonly config:SpecialConfig28;
  private runId:string;
  private mode:'climb'|'challenge'|'practice'='climb';
  private tick=0;
  private lastTick=-1;
  private coreCount=0;
  private eventOrdinal=0;
  private completedRows=0;
  private guardRowsRemaining=0;
  private surge:SurgeState=clearSurge();
  private events:SpecialEvent28[]=[];
  private counters={
    capacitors:0,relays:0,surges:0,
    grounded:0,discharged:0,activated:0,expired:0
  };

  constructor(runId:string,c:SpecialConfig28=defaultSpecialConfig28()){
    if(!runId||runId.length>256)throw Error('CC228_RUN_ID');
    this.runId=runId;this.config=Object.freeze(validateSpecialConfig28(c));
  }
  private emit(type:SpecialEventType28,row:number,tick:number,
    detail:Record<string,string|number|boolean>={}):void{
    this.events.push({
      schema:'cc2-special-event/v1',
      id:this.runId+'/special-'+(++this.eventOrdinal),
      runId:this.runId,tick,type,row,detail:clone(detail)
    });
    // Bounded non-scoring telemetry; counters cover entire session.
    if(this.events.length>800)this.events.shift();
  }
  reset(runId:string):void{
    if(!runId||runId.length>256)throw Error('CC228_RUN_ID');
    this.runId=runId;this.tick=0;this.lastTick=-1;
    this.coreCount=0;this.eventOrdinal=0;this.completedRows=0;
    this.guardRowsRemaining=0;this.surge=clearSurge();this.events=[];
    this.counters={
      capacitors:0,relays:0,surges:0,
      grounded:0,discharged:0,activated:0,expired:0
    };
  }
  private cancelSurge(type:'SURGE_GROUNDED'|'SURGE_DISCHARGED',
    tick:number,reason:string):boolean{
    if(this.surge.phase==='IDLE'||this.surge.row===null)return false;
    const row=this.surge.row;
    this.emit(type,row,tick,{reason});
    if(type==='SURGE_GROUNDED')this.counters.grounded++;
    else this.counters.discharged++;
    this.surge=clearSurge();
    return true;
  }
  /**
   * Consume the REAL core stream after FeatureProgression has evaluated it.
   * A relay must have its source RELAY_CHAIN receipt; a capacitor bonus
   * must have its source CHARGE_GAINED receipt. Missing proofs are errors,
   * never a basis for inventing powers.
   */
  consume(
    coreEvents:readonly GameEventV1[],
    featureEvents:readonly FeatureEventV1[],
    mode:'climb'|'challenge'|'practice'
  ):void{
    if(coreEvents.length<this.coreCount)throw Error('CC228_CORE_REWOUND');
    this.mode=mode;
    const proof=new Map<string,FeatureEventV1[]>();
    for(const e of featureEvents){
      if(e.runId!==this.runId)continue;
      const row=Number(e.detail.row);
      if(!Number.isInteger(row)||row<1)continue;
      const key=String(row);
      const bucket=proof.get(key)??[];
      bucket.push(e);proof.set(key,bucket);
    }
    for(const e of coreEvents.slice(this.coreCount)){
      if(e.type==='RUN_STARTED'){
        if(e.runId!==this.runId)throw Error('CC228_RUN_ID_MISMATCH');
      }else if(e.type==='ROW_COMPLETED'){
        if(e.runId!==this.runId)throw Error('CC228_CROSS_RUN_ROW');
        const row=Number(e.detail.rowIndex);
        if(!Number.isInteger(row)||row!==this.completedRows+1)
          throw Error('CC228_NONCONSECUTIVE_ROW');
        this.completedRows=row;
        // Practice has no Pursuer threat and must have no hazard pressure.
        if(mode==='practice')continue;
        const receipts=proof.get(String(row))??[];
        const relay=receipts.find(r=>r.type==='RELAY_CHAIN');
        const charge=receipts.find(r=>r.type==='CHARGE_GAINED');
        if(!charge)throw Error('CC228_MISSING_CHARGE_RECEIPT');
        if(charge.detail.modifier==='CAPACITOR'){
          this.counters.capacitors++;
          this.emit('CAPACITOR_BONUS',row,e.tick,{
            earned:Number(charge.detail.earned),
            charge:Number(charge.detail.charge)
          });
        }
        if(relay){
          this.counters.relays++;
          this.guardRowsRemaining=this.config.relayGuardRows;
          this.emit('RELAY_GUARD_EARNED',row,e.tick,{
            guardRows:this.guardRowsRemaining
          });
          this.cancelSurge('SURGE_GROUNDED',e.tick,'RELAY_LINK');
        }
        if(surgeForRow28(row,this.config)){
          this.counters.surges++;
          if(this.guardRowsRemaining>0){
            this.cancelSurge('SURGE_GROUNDED',e.tick,'NEW_SURGE_REPLACED');
            this.emit('SURGE_GROUNDED',row,e.tick,{reason:'RELAY_GUARD'});
            this.counters.grounded++;
            this.guardRowsRemaining=0; // one-time protection
          }else{
            // It is impossible to have two stacked active surges: a new
            // source row expires the old one without extra pressure.
            if(this.surge.phase!=='IDLE'&&this.surge.row!==null){
              this.emit('SURGE_EXPIRED',this.surge.row,e.tick,
                {reason:'NEXT_SURGE'});
              this.counters.expired++;
            }
            this.surge={
              phase:'WARNING',row,warnedAt:e.tick,
              warningUntil:e.tick+this.config.warningTicks,
              expiresAt:e.tick+this.config.warningTicks+
                this.config.activeTicks,
            };
            this.emit('SURGE_WARNING',row,e.tick,{
              warningTicks:this.config.warningTicks,
              activeTicks:this.config.activeTicks
            });
          }
        }else if(!relay&&this.guardRowsRemaining>0){
          this.guardRowsRemaining--;
        }
      }else if(e.type==='RUN_ENDED'){
        this.terminate(e.runId);
      }
    }
    this.coreCount=coreEvents.length;
  }
  /** Only called after a successful, legitimate Pulse activation. */
  onPulse(runId:string,tick:number,affected:boolean):boolean{
    if(runId!==this.runId)throw Error('CC228_PULSE_RUN_SCOPE');
    if(!Number.isInteger(tick)||tick<this.tick)
      throw Error('CC228_PULSE_TICK');
    if(!affected)return false; // missed Pulse has no magical reach
    return this.cancelSurge('SURGE_DISCHARGED',tick,'REAL_PULSE_HIT');
  }
  advance(runId:string,tick:number,phase:string):SpecialSnapshot28{
    if(runId!==this.runId)throw Error('CC228_RUN_SCOPE');
    if(!isInt(tick,0,Number.MAX_SAFE_INTEGER)||tick<this.lastTick)
      throw Error('CC228_TICK_ORDER');
    if(tick===this.lastTick)return this.snapshot();
    this.tick=tick;this.lastTick=tick;
    if(phase==='ended'||this.mode==='practice'){
      this.terminate(runId);return this.snapshot();
    }
    if(this.surge.phase==='WARNING'&&tick>=this.surge.warningUntil){
      this.surge.phase='ACTIVE';this.counters.activated++;
      this.emit('SURGE_ACTIVE',this.surge.row!,tick,{
        pressure:this.config.surgeMultiplier
      });
    }
    if(this.surge.phase==='ACTIVE'&&tick>=this.surge.expiresAt){
      this.emit('SURGE_EXPIRED',this.surge.row!,tick,{reason:'TIMED_OUT'});
      this.counters.expired++;
      this.surge=clearSurge();
    }
    return this.snapshot();
  }
  terminate(runId:string):void{
    if(runId!==this.runId)throw Error('CC228_TERMINAL_SCOPE');
    this.surge=clearSurge();this.guardRowsRemaining=0;
  }
  /** No boost unless the original Pursuer has genuine live pursuit sight. */
  pressureFor(primaryHasLiveSight:boolean):number{
    return this.mode!=='practice'&&primaryHasLiveSight&&
      this.surge.phase==='ACTIVE'?this.config.surgeMultiplier:1;
  }
  snapshot():SpecialSnapshot28{
    return clone({
      schema:'cc2-special-snapshot/v1' as const,
      runId:this.runId,tick:this.tick,mode:this.mode,
      completedRows:this.completedRows,nextRow:this.completedRows+1,
      nextRowSurge:surgeForRow28(this.completedRows+1,this.config),
      phase:this.surge.phase,activeRow:this.surge.row,
      warningProgress:this.surge.phase==='WARNING'?
        clamp((this.tick-this.surge.warnedAt)/
          this.config.warningTicks,0,1):
        this.surge.phase==='ACTIVE'?1:0,
      guardRowsRemaining:this.guardRowsRemaining,
      pressureMultiplier:this.pressureFor(true),
      counters:this.counters,events:this.events
    });
  }
}
