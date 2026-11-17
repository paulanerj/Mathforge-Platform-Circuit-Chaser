/**
 * CC2-23 — Secondary Enemy Ecosystem, versioned and sandboxed.
 *
 * Scout and Sentry provide finite-sensor, telegraphed tactical pressure.
 * Neither entity is permitted to capture Spark, change arithmetic, decide
 * the correct answer, redirect Spark, or replace the accepted Pursuer.
 *
 * Scout: moving patrol that reports a genuinely sighted Spark position.
 * Sentry: fixed forward-arc observer that reports only visible Spark.
 * Both: 40-tick warning, then a bounded 10% Pursuer speed boost. The
 * boost applies ONLY while the accepted Pursuer is genuinely sensing Spark
 * and in PURSUIT mode; there is no remote targeting or privileged signal.
 *
 * No enemies exist unless an experimental configuration explicitly enables
 * them. The production/default config is entirely disabled, and unmodified
 * CC2-22 engines do not import or execute this module.
 */
import type {WorldV1} from '../world/world';
import {hasClearSight} from '../pursuer/perception';
import {
  CC2_EXTENSION_FRAME_SCHEMA,validateExtensionFrame,
} from '../architecture/extensionContracts';
import {proposedExtensionCatalog} from '../architecture/extensionRegistry';

export type SecondaryModeV1='off'|'scout'|'sentry'|'both';
export type SecondaryActorKindV1='SCOUT'|'SENTRY';
export type SecondaryActorPhaseV1='PATROL'|'TELEGRAPH'|'ALERT'|'COOLDOWN';

export interface SecondaryConfigV1 {
  readonly schema:'cc2-secondary-enemies/v1';
  readonly mode:SecondaryModeV1;
  readonly demoEarlySpawn:boolean;
  readonly warningTicks:number;
  readonly alertTicks:number;
  readonly cooldownTicks:number;
  readonly pressureMultiplier:number;
  readonly scoutSenseRadius:number;
  readonly sentrySenseRadius:number;
  readonly patrolAmplitude:number;
  /** Optional CC2-27 role tuning. Omission preserves exact CC2-23 replay. */
  readonly encounterPolicy?:'cc2-27-distinct/v1';
}
export interface SecondaryEnemyViewV1{
  readonly id:'scout'|'sentry';
  readonly kind:SecondaryActorKindV1;
  readonly x:number;
  readonly y:number;
  readonly radius:number;
  readonly phase:SecondaryActorPhaseV1;
  readonly active:boolean;
  readonly signalSource:'NEAR'|'SIGHT'|null;
  readonly warningProgress:number;
  readonly lastDetectedTick:number|null;
  /** Only present under the explicitly enabled CC2-27 role policy. */
  readonly role?:'MOBILE_RECON'|'DIRECTIONAL_LOCK';
  readonly heading?:number|null;
}
export interface SecondaryEnemyEventV1{
  readonly schema:'cc2-secondary-event/v1';
  readonly id:string;
  readonly runId:string;
  readonly tick:number;
  readonly type:'ENEMY_SPAWNED'|'SENSOR_CONFIRMED'|'WARNING_STARTED'|
    'WARNING_CANCELED'|'ALERT_STARTED'|'ALERT_EXPIRED';
  readonly enemyId:'scout'|'sentry';
  readonly detail:Readonly<Record<string,string|number|boolean>>;
}
export interface SecondarySnapshotV1{
  readonly schema:'cc2-secondary-snapshot/v1';
  readonly mode:SecondaryModeV1;
  readonly policy?:'cc2-27-distinct/v1';
  readonly tick:number;
  readonly runId:string;
  readonly actors:readonly SecondaryEnemyViewV1[];
  readonly speedMultiplier:number;
  readonly events:readonly SecondaryEnemyEventV1[];
  readonly summary:{readonly alerts:number;readonly detections:number};
}

const clone=<T>(x:T):T=>structuredClone(x);
const exact=(x:unknown,keys:string[]):x is Record<string,unknown>=>!!x&&
  typeof x==='object'&&!Array.isArray(x)&&
  JSON.stringify(Object.keys(x).sort())===JSON.stringify(keys.sort());
const isInt=(x:unknown,min:number,max:number):x is number=>
  Number.isInteger(x)&&Number(x)>=min&&Number(x)<=max;
const limit=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const tau=Math.PI*2;

export function defaultSecondaryConfig():SecondaryConfigV1{
  return {
    schema:'cc2-secondary-enemies/v1',mode:'off',demoEarlySpawn:false,
    warningTicks:40,alertTicks:88,cooldownTicks:230,
    pressureMultiplier:1.10,scoutSenseRadius:245,
    sentrySenseRadius:220,patrolAmplitude:120,
  };
}
export function validateSecondaryConfig(value:unknown):SecondaryConfigV1{
  const defaults=defaultSecondaryConfig();
  // The v1 shape remains byte-identical for all historical records.
  // Explicit opt-in adds ONE strictly validated, versioned field.
  const policyPresent=!!value&&typeof value==='object'&&
    'encounterPolicy' in value;
  if(!exact(value,[...Object.keys(defaults),
    ...(policyPresent?['encounterPolicy']:[])]))
    throw Error('CC2_SECONDARY_CONFIG_FIELDS');
  const p=value as unknown as SecondaryConfigV1;
  if(p.schema!=='cc2-secondary-enemies/v1')throw Error('CC2_SECONDARY_SCHEMA');
  if(p.encounterPolicy!==undefined&&
    p.encounterPolicy!=='cc2-27-distinct/v1')
    throw Error('CC2_SECONDARY_POLICY');
  if(!['off','scout','sentry','both'].includes(p.mode))
    throw Error('CC2_SECONDARY_MODE');
  if(typeof p.demoEarlySpawn!=='boolean')throw Error('CC2_SECONDARY_DEMO_FLAG');
  if(!isInt(p.warningTicks,25,120)||
     !isInt(p.alertTicks,30,180)||
     !isInt(p.cooldownTicks,120,600))throw Error('CC2_SECONDARY_TIMING');
  if(typeof p.pressureMultiplier!=='number'||p.pressureMultiplier<1||
     p.pressureMultiplier>1.12||!Number.isFinite(p.pressureMultiplier))
    throw Error('CC2_SECONDARY_PRESSURE_LIMIT');
  if(typeof p.scoutSenseRadius!=='number'||p.scoutSenseRadius<80||
     p.scoutSenseRadius>300||!Number.isFinite(p.scoutSenseRadius)||
     typeof p.sentrySenseRadius!=='number'||p.sentrySenseRadius<80||
     p.sentrySenseRadius>260||!Number.isFinite(p.sentrySenseRadius))
    throw Error('CC2_SECONDARY_SENSOR_LIMIT');
  if(typeof p.patrolAmplitude!=='number'||p.patrolAmplitude<20||
     p.patrolAmplitude>160||!Number.isFinite(p.patrolAmplitude))
    throw Error('CC2_SECONDARY_PATROL_LIMIT');
  return clone(p);
}
type InternalActor={
  id:'scout'|'sentry';kind:SecondaryActorKindV1;
  x:number;y:number;radius:number;phase:SecondaryActorPhaseV1;
  eligible:boolean;warningAt:number;until:number;cooldownUntil:number;
  lastDetectedTick:number|null;source:'NEAR'|'SIGHT'|null;
  priorSensed:boolean;lastSignal:number|null;
};

export class SecondaryEnemyDirector {
  readonly config:SecondaryConfigV1;
  private readonly events:SecondaryEnemyEventV1[]=[];
  private runId:string;
  private tick=0;
  private lastTick=-1;
  private actors:InternalActor[]=[];
  private eventNumber=0;
  private alertCount=0;
  private detectionCount=0;
  private multiplier=1;
  constructor(runId:string,config:SecondaryConfigV1=defaultSecondaryConfig()){
    if(typeof runId!=='string'||runId.length<1||runId.length>256)
      throw Error('CC2_SECONDARY_RUN_ID');
    this.config=validateSecondaryConfig(config);
    this.runId=runId;
    this.createActors();
  }
  private createActors():void{
    this.actors=[];
    for(const [kind,id,radius] of [
      ['SCOUT','scout',13],['SENTRY','sentry',16],
    ] as const){
      if(this.config.mode!=='both'&&this.config.mode!==id)continue;
      this.actors.push({
        id,kind,radius,x:id==='scout'?178:440,y:0,
        phase:'PATROL',eligible:false,warningAt:-1,until:-1,
        cooldownUntil:-1,lastDetectedTick:null,source:null,
        priorSensed:false,lastSignal:null,
      });
    }
  }
  reset(runId:string):void{
    if(!runId||runId.length>256)throw Error('CC2_SECONDARY_RUN_ID');
    this.runId=runId;
    this.tick=0;this.lastTick=-1;this.eventNumber=0;
    this.alertCount=0;this.detectionCount=0;this.multiplier=1;
    this.events.length=0;
    this.createActors();
  }
  /** Drop all live threats at a source-authoritative terminal outcome. */
  terminate(runId:string):void{
    if(runId!==this.runId)throw Error('CC2_SECONDARY_RUN_SCOPE');
    this.multiplier=1;
    for(const a of this.actors){
      a.eligible=false;a.phase='PATROL';a.priorSensed=false;
      a.source=null;a.lastSignal=null;a.warningAt=-1;a.until=-1;
    }
  }
  private emit(type:SecondaryEnemyEventV1['type'],a:InternalActor,
    detail:Record<string,string|number|boolean>={}):void{
    this.events.push({
      schema:'cc2-secondary-event/v1',
      id:this.runId+'/secondary-'+(++this.eventNumber),
      runId:this.runId,tick:this.tick,type,enemyId:a.id,detail:clone(detail),
    });
    if(this.events.length>500)this.events.shift();
  }
  /**
   * Only the sensing producer receives the real Spark position.
   * It does not receive any mathematical problem, selected option,
   * route decision, future waypoint, score or achievement data.
   */
  private observe(world:WorldV1,a:InternalActor,spark:{x:number;y:number}):
    'NEAR'|'SIGHT'|null{
    const dx=spark.x-a.x,dy=spark.y-a.y,dist=Math.hypot(dx,dy);
    const range=a.kind==='SCOUT'?this.config.scoutSenseRadius:
      this.config.sentrySenseRadius;
    if(dist>range)return null;
    // Sentry's 100° fan sweeps deterministically around its fixed anchor.
    if(a.kind==='SENTRY'){
      const pointing=-Math.PI/2+Math.sin(this.tick*.006)*.72;
      const angle=Math.atan2(dy,dx);
      const deviation=Math.atan2(Math.sin(angle-pointing),
        Math.cos(angle-pointing));
      if(Math.abs(deviation)>Math.PI*.28)return null;
    }
    if(dist>64&&!hasClearSight(world,a,spark))return null;
    return dist<=64?'NEAR':'SIGHT';
  }
  /** Fixed-tick stepping. This cannot mutate the supplied world or spark. */
  advance(input:{readonly runId:string;readonly tick:number;
    readonly phase:'ready'|'outbound'|'return'|'ended';
    readonly mode:'practice'|'climb'|'challenge';
    readonly completedRows:number;readonly world:WorldV1;
    readonly spark:Readonly<{x:number;y:number}>}):SecondarySnapshotV1{
    if(input.runId!==this.runId)throw Error('CC2_SECONDARY_RUN_SCOPE');
    if(!isInt(input.tick,0,Number.MAX_SAFE_INTEGER)||
       input.tick<this.lastTick)throw Error('CC2_SECONDARY_TICK_ORDER');
    // Duplicate ticks are idempotent, never another detection or event.
    if(input.tick===this.lastTick)return this.snapshot();
    this.lastTick=input.tick;this.tick=input.tick;
    if(input.phase==='ended'){
      this.terminate(input.runId);
      return this.snapshot();
    }
    if(input.mode==='practice'){
      this.multiplier=1;
      return this.snapshot();
    }
    const registry=proposedExtensionCatalog();
    const distinct=this.config.encounterPolicy==='cc2-27-distinct/v1';
    let boost=false,rolePressure=1;
    for(const a of this.actors){
      const minRows=a.kind==='SCOUT'?4:8;
      const eligible=input.completedRows>=(this.config.demoEarlySpawn?0:minRows);
      if(!eligible)continue;
      if(!a.eligible){
        a.eligible=true;
        this.emit('ENEMY_SPAWNED',a,{publicRow:input.completedRows});
      }
      // Patrol trajectories are solely based on tick, public completed
      // rows, and public world geometry. No unsensed Spark x/y is used.
      const g=input.world.geometry;
      const lane=-input.completedRows*g.rowGap;
      a.y=lane+(a.kind==='SCOUT'?g.rowGap*.22:g.rowGap*.08);
      a.x=a.kind==='SCOUT'
        ?300+this.config.patrolAmplitude*Math.sin(this.tick*.016)
        :g.columns[2]-g.platformWidth*.14;

      const sensed=this.observe(input.world,a,input.spark);
      const frame=validateExtensionFrame({
        schema:CC2_EXTENSION_FRAME_SCHEMA,
        runId:this.runId,tick:this.tick,
        phase:input.phase,mode:input.mode,
        completedRows:input.completedRows,
        signal:sensed?{
          source:sensed,observedTick:this.tick,x:input.spark.x,y:input.spark.y,
        }:null,
      });
      // CC2-22's extension-visibility guard must be honored: its public
      // row threshold is deliberately replaced by an explicit DEMO gate
      // only for our controlled owner-playtest URL.
      const qualified=registry.qualify({...frame,
        completedRows:this.config.demoEarlySpawn?
          Math.max(frame.completedRows,minRows):frame.completedRows},[a.id]);
      // A legitimately UNSENSED enemy must produce no registry receipt.
      // The fail-closed registry only qualifies detected enemies; absence of
      // sight is not an engine error and never authorizes target knowledge.
      if(sensed&&!qualified.length)
        throw Error('CC2_SECONDARY_REGISTRY_DISAGREEMENT');

      if(sensed&&!a.priorSensed){
        a.lastDetectedTick=this.tick;
        a.source=sensed;
        a.lastSignal=this.tick;
        this.detectionCount++;
        this.emit('SENSOR_CONFIRMED',a,{source:sensed});
      }
      a.priorSensed=Boolean(sensed);
      if(distinct&&!sensed)a.source=null;
      if(a.phase==='COOLDOWN'&&this.tick>=a.cooldownUntil){
        a.phase='PATROL';a.source=null;
      }
      if(a.phase==='PATROL'&&sensed&&this.tick>=a.cooldownUntil){
        const warning=distinct&&a.kind==='SENTRY'?
          Math.max(64,this.config.warningTicks):this.config.warningTicks;
        a.phase='TELEGRAPH';a.warningAt=this.tick;
        a.until=this.tick+warning;
        this.emit('WARNING_STARTED',a,{
          warningTicks:warning,
          ...(distinct?{role:a.kind==='SCOUT'?'MOBILE_RECON':
            'DIRECTIONAL_LOCK'}:{})});
      }
      if(a.phase==='TELEGRAPH'){
        if(!sensed){
          a.phase='COOLDOWN';
          a.cooldownUntil=this.tick+this.config.cooldownTicks/3;
          this.emit('WARNING_CANCELED',a,{reason:'LINE_OF_SIGHT_LOST'});
        }else if(this.tick>=a.until){
          const alert=distinct&&a.kind==='SCOUT'?
            Math.min(56,this.config.alertTicks):this.config.alertTicks;
          a.phase='ALERT';a.until=this.tick+alert;
          this.alertCount++;
          this.emit('ALERT_STARTED',a,{
            maxPressureMultiplier:distinct&&a.kind==='SCOUT'?
              Math.min(this.config.pressureMultiplier,1.06):
              this.config.pressureMultiplier,
            ...(distinct?{role:a.kind==='SCOUT'?'MOBILE_RECON':
              'DIRECTIONAL_LOCK',alertTicks:alert}:{})});
        }
      }
      if(a.phase==='ALERT'){
        // A broken mobile sight line or avoided directional cone disarms
        // pressure immediately; there is no magical residual tracking.
        if(this.tick>=a.until||(distinct&&!sensed)){
          a.phase='COOLDOWN';
          a.cooldownUntil=this.tick+this.config.cooldownTicks;
          this.emit('ALERT_EXPIRED',a,{
            cooldownTicks:this.config.cooldownTicks,
            ...(distinct?{reason:sensed?'TIMED_OUT':'SIGHT_LOST'}:{})});
        }else if(distinct){
          // Different strategic roles: mobile Scout provides modest brief
          // reconnaissance pressure (<=6%), Sentry gives stronger fixed
          // directional pressure (<=10%). Multiple alerts NEVER stack.
          const influence=a.kind==='SCOUT'?
            Math.min(this.config.pressureMultiplier,1.06):
            this.config.pressureMultiplier;
          rolePressure=Math.max(rolePressure,influence);
        }else boost=true;
      }
    }
    // Multiple enemies DO NOT STACK their boost or multiply each other's
    // threat. Fairness cap is always <=12% in a Pursuer-observed chase.
    this.multiplier=distinct?rolePressure:
      boost?this.config.pressureMultiplier:1;
    return this.snapshot();
  }
  /** Boost must be called with accepted Pursuer's ORIGINAL sensor outcome. */
  pressureFor(primaryPursuerHasLiveSight:boolean):number{
    return primaryPursuerHasLiveSight?this.multiplier:1;
  }
  snapshot():SecondarySnapshotV1{
    return clone({
      schema:'cc2-secondary-snapshot/v1' as const,
      mode:this.config.mode,runId:this.runId,tick:this.tick,
      ...(this.config.encounterPolicy?{policy:this.config.encounterPolicy}:{}),
      actors:this.actors.filter(a=>a.eligible).map(a=>({
        id:a.id,kind:a.kind,x:a.x,y:a.y,radius:a.radius,
        phase:a.phase,active:a.eligible,
        signalSource:a.source,lastDetectedTick:a.lastDetectedTick,
        ...(this.config.encounterPolicy?{
          role:a.kind==='SCOUT'?'MOBILE_RECON' as const:
            'DIRECTIONAL_LOCK' as const,
          heading:a.kind==='SENTRY'?
            -Math.PI/2+Math.sin(this.tick*.006)*.72:null,
        }:{}),
        warningProgress:a.phase==='TELEGRAPH'
          ?limit((this.tick-a.warningAt)/
            (this.config.encounterPolicy&&a.kind==='SENTRY'?
              Math.max(64,this.config.warningTicks):
              this.config.warningTicks),0,1)
          :a.phase==='ALERT'?1:0,
      })),
      speedMultiplier:this.multiplier,
      events:this.events,
      summary:{alerts:this.alertCount,detections:this.detectionCount},
    });
  }
}
