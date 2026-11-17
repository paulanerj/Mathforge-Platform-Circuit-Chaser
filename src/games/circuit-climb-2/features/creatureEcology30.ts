/**
 * CC2-30A: Creature ecology kernel (optional, one complete Molasses prototype).
 *
 * The "ability" port is deliberately separated from creature appearance,
 * motion schedule and gate. New species register a new ability rather than
 * patching the primary mathematical engine or Pursuer brain.
 *
 * Source owned, deterministic 60Hz, headless; no browser/DOM/random clocks.
 * CC2-28 and historical replay remain byte-for-byte absent unless opted in.
 */
import type { EngineStateV1 } from '../core/CircuitClimbCore';
import {createCreatureAbility,CREATURE_SDK_SCHEMA,
  type CreatureAbilityHandler,type CreatureEffectReceipt,
} from './creatureAbilitySDK30B';

export const CREATURE_SCHEMA = 'cc2-creature/v1' as const;
export type CreatureKind = 'MOLASSES_GUARDIAN'|'CAPACITOR'|'RELAY'|
  'TETHER_SLUG'|'PRISM_SHUFFLER'|'FRACTURE_WISP';
export type EffectKind = 'PURSUER_VISCOUS_FIELD'|'SPARK_TETHER'|
  'CHARGE'|'PLATFORM_REINFORCE'|'OPTION_PERMUTATION'|'PLATFORM_FRACTURE';

export interface CreatureAbilityPort {
  readonly kind: EffectKind;
  /** A capability contract, not a promise that another species is implemented. */
  readonly authority: 'PURSUER_MOTION'|'SPARK_MOTION'|'ECONOMY'|
    'WORLD_TOPOLOGY'|'MATH_OPTION_LAYOUT';
  readonly supportsDemo: boolean;
}
export const ABILITY_CATALOG: Readonly<Record<CreatureKind,CreatureAbilityPort>>=
  Object.freeze({
    MOLASSES_GUARDIAN:{kind:'PURSUER_VISCOUS_FIELD',
      authority:'PURSUER_MOTION',supportsDemo:true},
    CAPACITOR:{kind:'CHARGE',authority:'ECONOMY',supportsDemo:false},
    RELAY:{kind:'PLATFORM_REINFORCE',
      authority:'WORLD_TOPOLOGY',supportsDemo:false},
    TETHER_SLUG:{kind:'SPARK_TETHER',
      authority:'SPARK_MOTION',supportsDemo:false},
    PRISM_SHUFFLER:{kind:'OPTION_PERMUTATION',
      authority:'MATH_OPTION_LAYOUT',supportsDemo:false},
    FRACTURE_WISP:{kind:'PLATFORM_FRACTURE',
      authority:'WORLD_TOPOLOGY',supportsDemo:false},
  });

export interface CreatureConfig {
  schema:typeof CREATURE_SCHEMA;
  species:'MOLASSES_GUARDIAN';
  firstEligibleRow:number;
  hopEveryTicks:number;
  hopTravelTicks:number;
  offerTicks:number;
  challengeWindowTicks:number;
  gateStep:number;
  fieldTicks:number;
  slowMultiplier:number;
  fieldRadiusInRowGaps:number;
  visual:{material:'clear-molasses'|'mineral-gel'|'glass';
    hue:number;opacity:number;edgeSharpness:number;motionScale:number};
}
const DEFAULT:CreatureConfig={
  schema:CREATURE_SCHEMA,species:'MOLASSES_GUARDIAN',
  firstEligibleRow:2,hopEveryTicks:125,hopTravelTicks:24,offerTicks:105,
  challengeWindowTicks:210,gateStep:3,fieldTicks:150,
  slowMultiplier:0.72,fieldRadiusInRowGaps:0.95,
  visual:{material:'clear-molasses',hue:138,
    opacity:0.55,edgeSharpness:0.88,motionScale:1},
};
export const defaultCreatureConfig=():CreatureConfig=>structuredClone(DEFAULT);
export function validateCreatureConfig(raw:unknown):CreatureConfig{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('CREATURE_CONFIG_OBJECT');
  const c=raw as CreatureConfig;
  if(c.schema!==CREATURE_SCHEMA||c.species!=='MOLASSES_GUARDIAN')
    throw Error('CREATURE_CONFIG_VERSION');
  const check=(v:unknown,min:number,max:number,int=false)=>{
    if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||
      (int&&!Number.isInteger(v)))throw Error('CREATURE_CONFIG_RANGE');
  };
  check(c.firstEligibleRow,1,15,true);check(c.hopEveryTicks,40,600,true);
  check(c.hopTravelTicks,6,80,true);
  if(c.hopTravelTicks>=c.hopEveryTicks)throw Error('CREATURE_HOP_TIMING');
  check(c.offerTicks,40,350,true);check(c.challengeWindowTicks,60,600,true);
  check(c.gateStep,2,9,true);check(c.fieldTicks,20,600,true);
  check(c.slowMultiplier,0.55,1);check(c.fieldRadiusInRowGaps,0.2,1.5);
  if(!c.visual||!['clear-molasses','mineral-gel','glass'].includes(c.visual.material))
    throw Error('CREATURE_CONFIG_MATERIAL');
  check(c.visual.hue,0,360);check(c.visual.opacity,0.1,0.92);
  check(c.visual.edgeSharpness,0,1);check(c.visual.motionScale,0.1,2);
  if(Object.keys(c).sort().join('|')!==Object.keys(DEFAULT).sort().join('|')||
    Object.keys(c.visual).sort().join('|')!==Object.keys(DEFAULT.visual).sort().join('|'))
    throw Error('CREATURE_CONFIG_FIELDS');
  return structuredClone(c);
}
export interface CreatureReceipt{
  schema:'cc2-creature-receipt/v1';id:string;runId:string;tick:number;
  type:'SPAWNED'|'HOPPED'|'GATE_OPEN'|'GATE_SOLVED'|'GATE_FAILED'|
    'GATE_DECLINED'|'GATE_EXPIRED'|'FIELD_CAST'|'FIELD_EXPIRED'|
    'FIELD_CONTACT_ENTER'|'FIELD_CONTACT_EXIT';
  creatureId:string;detail:Record<string,string|number|boolean>;
}
export interface CreatureSnapshot{
  schema:typeof CREATURE_SCHEMA;runId:string;tick:number;
  species:'MOLASSES_GUARDIAN';
  platformId:string|null;
  platformRow:number|null;
  /** Source-authored hop: renderer may interpolate ONLY between these real IDs. */
  hop:null|{fromPlatformId:string;toPlatformId:string;
    startTick:number;endTick:number};
  gate:'DORMANT'|'AVAILABLE'|'QUESTION'|'COOLDOWN';
  question:null|{sequence:number[];options:number[];deadlineTick:number};
  activeField:null|{x:number;y:number;radius:number;expiresTick:number;
    direction:'left'|'right'};
  fieldMultiplier:number;
  /** True only after an authoritative physical Pursuer/field overlap. */
  contactActive:boolean;
  config:CreatureConfig;
  receipts:CreatureReceipt[];
}
const clone=<T>(v:T):T=>structuredClone(v);
const mix=(a:number)=>{a|=0;a=Math.imul(a^(a>>>16),0x7feb352d);
  a=Math.imul(a^(a>>>15),0x846ca68b);return (a^(a>>>16))>>>0;};
function hashSeed(seed:string):number{let v=2166136261;
  for(let i=0;i<seed.length;i++)v=Math.imul(v^seed.charCodeAt(i),16777619);
  return mix(v);}
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

/** No engine mutation: receives only observable world geometry / real rows. */
export class CreatureEcologyDirector{
  readonly config:CreatureConfig;
  private readonly seedNumber:number;
  private runId:string;
  private tick=0;
  private platformId:string|null=null;
  private platformRow:number|null=null;
  private gate:CreatureSnapshot['gate']='DORMANT';
  private question:CreatureSnapshot['question']=null;
  private correctAnswer=0;
  /** Strict world-effect authority: no creature sprite can mutate the Pursuer. */
  private readonly ability:CreatureAbilityHandler;
  private lastHopTick=-1;
  private hop:CreatureSnapshot['hop']=null;
  private ordinal=0;
  private receipts:CreatureReceipt[]=[];
  private stopped=false;

  constructor(seed:string,runId:string,config:CreatureConfig=defaultCreatureConfig()){
    this.config=validateCreatureConfig(config);
    this.runId=runId;
    this.seedNumber=hashSeed(seed+':molasses/v1');
    this.ability=createCreatureAbility(this.config.species,runId);
  }
  private emit(type:CreatureReceipt['type'],
    detail:CreatureReceipt['detail']={}):void{
    this.receipts.push({schema:'cc2-creature-receipt/v1',
      id:this.runId+':molasses:'+ ++this.ordinal,runId:this.runId,
      tick:this.tick,type,creatureId:'molasses-guardian-1',detail:clone(detail)});
    if(this.receipts.length>100)this.receipts.shift();
  }
  reset(runId:string):void{
    this.runId=runId;this.tick=0;this.platformId=null;this.platformRow=null;
    this.gate='DORMANT';this.question=null;this.correctAnswer=0;
    this.ability.reset(runId);
    this.lastHopTick=-1;this.hop=null;this.ordinal=0;
    this.receipts=[];this.stopped=false;
  }
  terminate():void{this.stopped=true;this.question=null;
    this.ability.terminate();
    this.hop=null;this.gate='DORMANT';}
  advance(world:EngineStateV1):void{
    if(world.runId!==this.runId)throw Error('CREATURE_RUN_ISOLATION');
    if(world.paused||world.phase==='ended'||this.stopped)return;
    if(world.tick<this.tick)throw Error('CREATURE_TICK_REGRESSION');
    this.tick=world.tick;
    if(this.hop&&this.tick>=this.hop.endTick)this.hop=null;
    this.ability.advance(world,event=>this.emitEffect(event));
    if(this.gate==='QUESTION'&&this.question&&
      this.tick>=this.question.deadlineTick){
      this.question=null;this.gate='COOLDOWN';this.emit('GATE_EXPIRED');
    }
    if(world.completedRows<this.config.firstEligibleRow)return;
    if(this.platformId&&world.completedRows>this.platformRow!+1){
      this.platformId=null;this.hop=null;this.gate='DORMANT';this.question=null;
    }
    // Both designer controls are authoritative:
    // - offerTicks: how long the creature waits in a targetable position
    // - hopEveryTicks: maximum interval before a new autonomous hop
    // COOLDOWN cannot be reopened for free on the same platform; the
    // creature physically relocates before presenting another passkey.
    const elapsed=this.tick-this.lastHopTick;
    const needsHop=!this.platformId||
      (this.gate==='AVAILABLE'&&
        elapsed>=Math.min(this.config.offerTicks,this.config.hopEveryTicks))||
      (this.gate==='COOLDOWN'&&!this.ability.snapshot().activeField&&
        elapsed>=this.config.hopEveryTicks);
    if(needsHop){
      const rowIndex=world.currentProblem.rowIndex;
      const row=world.world.rows.find(r=>r.index===rowIndex);
      if(!row||row.platforms.length===0)return;
      const candidates=row.platforms.filter(p=>!p.dead&&p.id!==this.platformId);
      if(candidates.length===0)return;
      const index=mix(this.seedNumber+this.ordinal+rowIndex)%candidates.length;
      const chosen=candidates[index];
      const previous=this.platformId;
      this.platformId=chosen.id;this.platformRow=rowIndex;
      this.hop=previous?{
        fromPlatformId:previous,toPlatformId:chosen.id,
        startTick:this.tick,endTick:this.tick+this.config.hopTravelTicks,
      }:null;
      this.lastHopTick=this.tick;
      this.question=null;this.gate='AVAILABLE';
      this.emit(this.ordinal===0?'SPAWNED':'HOPPED',
        {platformId:chosen.id,row:rowIndex,column:chosen.column});
    }
  }
  offer(world:EngineStateV1):{ok:boolean;reason?:string}{
    if(world.runId!==this.runId||world.paused||world.phase!=='ready'||
      this.hop||
      this.stopped||this.gate!=='AVAILABLE'||!this.platformId)
      return {ok:false,reason:'CREATURE_NOT_AVAILABLE'};
    this.tick=world.tick;
    const step=this.config.gateStep;
    // Fixed-length, seeded, uniquely correct elementary skip sequence.
    const start=step*(1+mix(this.seedNumber+this.ordinal)%3);
    const correct=start+step*3;
    this.correctAnswer=correct;
    const options=[correct-step,correct,correct+step];
    const offset=mix(this.seedNumber+this.ordinal+29)%3;
    this.question={sequence:[start,start+step,start+step*2],
      options:options.map((_,i)=>options[(i+offset)%3]),
      deadlineTick:this.tick+this.config.challengeWindowTicks};
    this.gate='QUESTION';
    this.emit('GATE_OPEN',{step,deadlineTick:this.question.deadlineTick});
    return {ok:true};
  }
  answer(world:EngineStateV1,choice:number):{ok:boolean;correct?:boolean;reason?:string}{
    if(world.runId!==this.runId||world.paused||world.phase==='ended'||
      this.stopped||this.gate!=='QUESTION'||!this.question||
      !Number.isInteger(choice)||!this.question.options.includes(choice))
      return {ok:false,reason:'CREATURE_GATE_CLOSED'};
    this.tick=world.tick;
    if(this.tick>=this.question.deadlineTick){
      this.question=null;this.gate='COOLDOWN';this.emit('GATE_EXPIRED');
      return {ok:false,reason:'CREATURE_GATE_EXPIRED'};
    }
    const correct=choice===this.correctAnswer;
    this.question=null;this.gate='COOLDOWN';
    this.emit(correct?'GATE_SOLVED':'GATE_FAILED',{choice});
    if(correct){
      const platformId=this.platformId;
      if(platformId){
        const platform=world.world.rows.flatMap(r=>r.platforms)
          .find(p=>p.id===platformId);
        if(platform){
          const direction:'left'|'right'=
            world.spark.x>=platform.x?'left':'right';
          this.ability.cast({
            schema:CREATURE_SDK_SCHEMA,kind:'PURSUER_VISCOUS_FIELD',
            runId:world.runId,tick:world.tick,
            sourcePlatformId:platform.id,direction,
            fieldTicks:this.config.fieldTicks,
            radiusInRowGaps:this.config.fieldRadiusInRowGaps,
            slowMultiplier:this.config.slowMultiplier,
          },world,event=>this.emitEffect(event));
        }
      }
    }
    return {ok:true,correct};
  }
  decline(world:EngineStateV1):void{
    if(world.runId!==this.runId||this.gate!=='QUESTION')return;
    this.question=null;this.gate='COOLDOWN';this.tick=world.tick;
    this.emit('GATE_DECLINED');
  }
  /** Convert strict ability receipts to the existing source event ledger. */
  private emitEffect(event:CreatureEffectReceipt):void{
    this.emit(event.type,event.detail);
  }
  /** Compatibility projection; fully delegated to the typed runtime. */
  pressureFor(bot:{x:number;y:number}):number{
    const state=this.ability.snapshot();
    const f=state.activeField;
    if(!f||this.tick>=f.expiresTick)return 1;
    const within=Math.hypot(bot.x-f.x,bot.y-f.y)<=f.radius;
    return within&&(f.direction==='left'?bot.x<=f.x:bot.x>=f.x)
      ?state.multiplier:1;
  }
  observePursuer(bot:{x:number;y:number}):number{
    return this.ability.observePursuer(bot,this.tick,
      event=>this.emitEffect(event));
  }
  snapshot():CreatureSnapshot{
    const effect=this.ability.snapshot();
    return clone({schema:CREATURE_SCHEMA,runId:this.runId,tick:this.tick,
      species:'MOLASSES_GUARDIAN',platformId:this.platformId,
      platformRow:this.platformRow,hop:this.hop,gate:this.gate,question:this.question,
      activeField:effect.activeField,fieldMultiplier:effect.multiplier,
      contactActive:effect.contactActive,
      config:this.config,receipts:this.receipts});
  }
}
