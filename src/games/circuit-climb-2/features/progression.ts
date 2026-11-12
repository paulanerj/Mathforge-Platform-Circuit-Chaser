/**
 * CC2-03 — deterministic, source-owned progression and earnable Pulse.
 *
 * No mathematical facts or answer indices enter the modifier schedule.
 * Modifiers belong to the ENTIRE row, not the correct platform, to prevent
 * answer leaks. Only a real ROW_COMPLETED event awards charge.
 *
 * This module consumes CC2 events after the fact, never grades a learner or
 * modifies physics, routing, platform values, and solved equations.
 */
import type {GameEventV1} from '../core/CircuitClimbCore';

export type ModifierV1='NORMAL'|'CAPACITOR'|'RELAY';
export interface FeatureConfigV1 {
  schema:'cc2-features/v1';
  chargeCapacity:number;
  capacitorInterval:number;
  relayInterval:number;
  capacitorBonus:number;
  pulseRadius:number;
  pulseSpeedMultiplier:number;
  pulseTicks:number;
}
export const DEFAULT_FEATURE_CONFIG:Readonly<FeatureConfigV1>=Object.freeze({
  schema:'cc2-features/v1',
  chargeCapacity:4,
  capacitorInterval:6,
  relayInterval:4,
  capacitorBonus:2,
  pulseRadius:220,
  pulseSpeedMultiplier:0.65,
  pulseTicks:150,
});
export function defaultFeatureConfig():FeatureConfigV1{return {...DEFAULT_FEATURE_CONFIG};}
export function validateFeatureConfig(value:unknown):FeatureConfigV1{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('CC2_FEATURE_CONFIG_OBJECT');
  const v=value as Record<string,unknown>,d=DEFAULT_FEATURE_CONFIG as unknown as Record<string,unknown>;
  if(Object.keys(v).sort().join('|')!==Object.keys(d).sort().join('|') ||
     v.schema!=='cc2-features/v1')throw Error('CC2_FEATURE_CONFIG_SCHEMA');
  const ranges:Record<string,[number,number]> ={
    chargeCapacity:[1,8],capacitorInterval:[4,30],relayInterval:[4,30],
    capacitorBonus:[1,4],pulseRadius:[60,500],
    pulseSpeedMultiplier:[0.2,1],pulseTicks:[30,600],
  };
  for(const [key,[low,high]] of Object.entries(ranges)){
    if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<low||v[key]>high)
      throw Error('CC2_FEATURE_INVALID_'+key);
  }
  for(const key of ['chargeCapacity','capacitorInterval','relayInterval','capacitorBonus','pulseTicks']){
    if(!Number.isInteger(v[key]))throw Error('CC2_FEATURE_INTEGER_'+key);
  }
  return {...v} as unknown as FeatureConfigV1;
}
/**
 * Rows 1–4 are deliberately plain tutorial. A relay on row 12 takes
 * priority over the overlapping capacitor schedule; all three tiles show
 * the same motif and all three retain their correct/incorrect math values.
 */
export function modifierForRow(row:number,c:FeatureConfigV1):ModifierV1{
  if(!Number.isInteger(row)||row<1)throw Error('CC2_FEATURE_INVALID_ROW');
  if(row<=4)return 'NORMAL';
  if(row%c.relayInterval===0)return 'RELAY';
  if(row%c.capacitorInterval===0)return 'CAPACITOR';
  return 'NORMAL';
}
export interface FeatureEventV1 {
  schema:'cc2-feature-event/v1';
  id:string;
  tick:number;
  runId:string;
  type:'CHARGE_GAINED'|'RELAY_CHAIN'|'ABILITY_ACTIVATED'|'ABILITY_EXPIRED'|'STAGE_REACHED';
  detail:Readonly<Record<string,string|number|boolean>>;
}
export interface FeatureSnapshotV1 {
  charge:number;
  capacity:number;
  pulseUntilTick:number;
  pulseTargetAffected:boolean;
  completedRows:number;
  stage:number;
  nextModifier:ModifierV1;
  pulseAvailable:boolean;
  pulseRadius:number;
  targetInRange:boolean;
  events:FeatureEventV1[];
}
const clone=<T>(x:T):T=>structuredClone(x);
export class FeatureProgression {
  readonly config:FeatureConfigV1;
  private consumedCount:number;
  private events:FeatureEventV1[]=[];
  private ordinal=0;
  private charge=0;
  private completedRows=0;
  private pulseUntilTick=0;
  private pulseTargetAffected=false;
  private ended=false;
  private runId='';
  constructor(config:FeatureConfigV1=defaultFeatureConfig(),initialEventOffset=0){
    this.config=Object.freeze(validateFeatureConfig(config));
    this.consumedCount=initialEventOffset;
  }
  private emit(tick:number,type:FeatureEventV1['type'],
    detail:Record<string,string|number|boolean>){
    this.events.push({
      schema:'cc2-feature-event/v1',id:`cc2-feature-${++this.ordinal}`,
      tick,runId:this.runId,type,detail:{...detail},
    });
  }
  /** Idempotent processing; called AFTER core advances, even during skips. */
  consume(coreEvents:readonly GameEventV1[]){
    if(coreEvents.length<this.consumedCount)throw Error('CC2_FEATURE_LEDGER_REWOUND');
    for(const event of coreEvents.slice(this.consumedCount)){
      if(event.type==='RUN_STARTED'){
        this.runId=event.runId;this.charge=0;
        this.completedRows=0;this.pulseUntilTick=0;
        this.pulseTargetAffected=false;this.ended=false;
      }
      if(event.type==='ROW_COMPLETED'){
        const row=Number(event.detail.rowIndex);
        if(row<=this.completedRows)throw Error('CC2_FEATURE_DUPLICATE_ROW');
        const modifier=modifierForRow(row,this.config);
        this.completedRows=row;
        const bonus=modifier==='CAPACITOR'?this.config.capacitorBonus:1;
        const before=this.charge;
        this.charge=Math.min(this.config.chargeCapacity,this.charge+bonus);
        this.emit(event.tick,'CHARGE_GAINED',{
          row,modifier,earned:this.charge-before,charge:this.charge,
        });
        if(modifier==='RELAY')
          this.emit(event.tick,'RELAY_CHAIN',{row,visualOnly:true});
        if(row%12===0)
          this.emit(event.tick,'STAGE_REACHED',{stage:row/12+1,completedRows:row});
      }
      if(event.type==='RUN_ENDED'){
        this.ended=true;
        // An end cannot leave a live slow effect in a future run.
        this.pulseUntilTick=0;this.pulseTargetAffected=false;
      }
    }
    this.consumedCount=coreEvents.length;
  }
  /** Returns a named rejection. A failed use must not spend any charge. */
  activate(tick:number,mode:string,phase:string,paused:boolean,
    targetDistance:number):
    {ok:true;affected:boolean}|{ok:false;reason:string}{
    if(this.ended||phase==='ended')return {ok:false,reason:'RUN_ENDED'};
    if(paused)return {ok:false,reason:'PAUSED'};
    if(mode==='practice')return {ok:false,reason:'PRACTICE_DEMO_ONLY'};
    if(phase!=='ready')return {ok:false,reason:'NOT_GROUNDED'};
    // Four new correct rows can be solved in less than a 150-tick Pulse.
    // Do not permit an active slow effect to be rearmed or overwritten.
    if(this.pulseUntilTick>tick)return {ok:false,reason:'ABILITY_ALREADY_ACTIVE'};
    if(this.charge!==this.config.chargeCapacity)return {ok:false,reason:'CHARGE_NOT_FULL'};
    if(!Number.isFinite(targetDistance)||targetDistance<0)throw Error('CC2_PULSE_DISTANCE_INVALID');
    const affected=targetDistance<=this.config.pulseRadius;
    this.charge=0;this.pulseUntilTick=tick+this.config.pulseTicks;
    this.pulseTargetAffected=affected;
    this.emit(tick,'ABILITY_ACTIVATED',{
      ability:'CIRCUIT_PULSE',affected,range:this.config.pulseRadius,
      speedMultiplier:affected?this.config.pulseSpeedMultiplier:1,
      expiresAtTick:this.pulseUntilTick,
    });
    return {ok:true,affected};
  }
  /** End-exclusive expiry. Exactly one expiration event per activation. */
  advance(tick:number){
    if(this.pulseUntilTick>0&&tick>=this.pulseUntilTick){
      this.emit(tick,'ABILITY_EXPIRED',{
        ability:'CIRCUIT_PULSE',affected:this.pulseTargetAffected,
      });
      this.pulseUntilTick=0;this.pulseTargetAffected=false;
    }
  }
  speedMultiplier(tick:number):number{
    return this.pulseTargetAffected && this.pulseUntilTick>tick
      ?this.config.pulseSpeedMultiplier:1;
  }
  snapshot(tick:number,mode:string,phase:string,paused:boolean,
    actualTargetDistance:number|null=null):FeatureSnapshotV1{
    return {
      charge:this.charge,capacity:this.config.chargeCapacity,
      pulseUntilTick:this.pulseUntilTick,
      pulseTargetAffected:this.pulseTargetAffected,
      completedRows:this.completedRows,
      stage:Math.floor(this.completedRows/12)+1,
      nextModifier:modifierForRow(this.completedRows+1,this.config),
      pulseRadius:this.config.pulseRadius,
      // This is displayed to the learner and NEVER enters the Brain.
      // Null signifies that a no-bot consumer cannot truthfully report range.
      targetInRange:actualTargetDistance!==null &&
        actualTargetDistance<=this.config.pulseRadius,
      pulseAvailable:!this.ended&&!paused&&mode!=='practice'&&
        phase==='ready'&&this.pulseUntilTick<=tick&&
        this.charge===this.config.chargeCapacity,
      events:clone(this.events),
    };
  }
  eventLog():FeatureEventV1[]{return clone(this.events);}
}
