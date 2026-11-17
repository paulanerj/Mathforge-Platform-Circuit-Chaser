/**
 * CC2-30B Creature SDK: strict capability and source-effect runtime.
 *
 * Creatures emit typed, bounded requests, never callbacks into arbitrary game
 * state. The approved adapter owns one distinct authority. This file has no
 * browser, audio or renderer dependencies and no direct learner math mutation.
 *
 * NON-GOALS: unimplemented five creatures are declared only as reserved
 * capabilities. Their missing adapters must reject activation at runtime.
 */
import type {EngineStateV1} from '../core/CircuitClimbCore';

export const CREATURE_SDK_SCHEMA='cc2-creature-sdk/v1' as const;
export type CreatureSpecies =
  'MOLASSES_GUARDIAN'|'TETHER_SLUG'|'CAPACITOR'|'RELAY'|
  'PRISM_SHUFFLER'|'FRACTURE_WISP';
export type CreatureAuthority =
  'PURSUER_MOTION'|'SPARK_MOTION'|'ECONOMY'|
  'WORLD_TOPOLOGY'|'MATH_OPTION_LAYOUT';
export type CreatureAbilityId =
  'PURSUER_VISCOUS_FIELD'|'SPARK_TETHER'|'CHARGE'|
  'PLATFORM_REINFORCE'|'OPTION_PERMUTATION'|'PLATFORM_FRACTURE';
export interface CreatureManifest {
  readonly sdk:typeof CREATURE_SDK_SCHEMA;
  readonly species:CreatureSpecies;
  readonly ability:CreatureAbilityId;
  readonly authority:CreatureAuthority;
  readonly enabled:boolean;
  readonly gateKind:'SKIP_COUNT';
  readonly team:'HELPFUL'|'HARMFUL';
  readonly visualFamily:string;
  readonly soundVoice:string;
}
const manifest=(
  species:CreatureSpecies,ability:CreatureAbilityId,
  authority:CreatureAuthority,team:'HELPFUL'|'HARMFUL',
  enabled:boolean,visualFamily:string,soundVoice:string
):CreatureManifest=>Object.freeze({
  sdk:CREATURE_SDK_SCHEMA,species,ability,authority,team,enabled,
  gateKind:'SKIP_COUNT',visualFamily,soundVoice,
});
/**
 * Manifest alone never enables an ability; createCreatureAbility also checks
 * the explicit implementation registry below. It has no plug-in eval path.
 */
export const CREATURE_MANIFESTS:Readonly<Record<CreatureSpecies,CreatureManifest>>=
  Object.freeze({
    MOLASSES_GUARDIAN:manifest('MOLASSES_GUARDIAN','PURSUER_VISCOUS_FIELD',
      'PURSUER_MOTION','HELPFUL',true,'viscoelastic-gel','wet-low'),
    TETHER_SLUG:manifest('TETHER_SLUG','SPARK_TETHER',
      'SPARK_MOTION','HARMFUL',false,'elastic-mass','strained-low'),
    CAPACITOR:manifest('CAPACITOR','CHARGE',
      'ECONOMY','HELPFUL',false,'metallic-amber','high-syncopation'),
    RELAY:manifest('RELAY','PLATFORM_REINFORCE',
      'WORLD_TOPOLOGY','HELPFUL',false,'cyan-filament','harmonic-wire'),
    PRISM_SHUFFLER:manifest('PRISM_SHUFFLER','OPTION_PERMUTATION',
      'MATH_OPTION_LAYOUT','HARMFUL',false,'prismatic-glass','glissando'),
    FRACTURE_WISP:manifest('FRACTURE_WISP','PLATFORM_FRACTURE',
      'WORLD_TOPOLOGY','HARMFUL',false,'mineral-fracture','copper-click'),
  });

/** All effects are finite, typed and bound to the current run. */
export interface GelCastRequest {
  readonly schema:typeof CREATURE_SDK_SCHEMA;
  readonly kind:'PURSUER_VISCOUS_FIELD';
  readonly runId:string;
  readonly tick:number;
  readonly sourcePlatformId:string;
  readonly direction:'left'|'right';
  readonly fieldTicks:number;
  readonly radiusInRowGaps:number;
  readonly slowMultiplier:number;
}
export interface GelFieldState {
  readonly x:number;
  readonly y:number;
  readonly radius:number;
  readonly expiresTick:number;
  readonly direction:'left'|'right';
}
export interface CreatureEffectReceipt {
  readonly type:'FIELD_CAST'|'FIELD_EXPIRED'|
    'FIELD_CONTACT_ENTER'|'FIELD_CONTACT_EXIT';
  readonly detail:Record<string,string|number|boolean>;
}
export interface CreatureAbilitySnapshot {
  readonly kind:CreatureAbilityId;
  readonly authority:CreatureAuthority;
  readonly activeField:GelFieldState|null;
  readonly multiplier:number;
  readonly contactActive:boolean;
}
export interface CreatureAbilityHandler {
  readonly kind:CreatureAbilityId;
  readonly authority:CreatureAuthority;
  reset(runId:string):void;
  terminate():void;
  advance(state:EngineStateV1,emit:(event:CreatureEffectReceipt)=>void):void;
  /**
   * The only mutation operation accepted by this ability is a validated gel
   * cast. Other abilities must define their own typed requests & adapters.
   */
  cast(request:GelCastRequest,state:EngineStateV1,
    emit:(event:CreatureEffectReceipt)=>void):boolean;
  observePursuer(body:{x:number;y:number},tick:number,
    emit:(event:CreatureEffectReceipt)=>void):number;
  snapshot():CreatureAbilitySnapshot;
}
const check=(v:number,min:number,max:number)=>{
  if(!Number.isFinite(v)||v<min||v>max)throw Error('CREATURE_EFFECT_BOUNDS');
};

/**
 * Implemented world authority 01: Pursuer movement. No actor position, game
 * score, platform answer, timing clock or route graph is mutated here.
 * Physical overlap alone controls the finite multiplier.
 */
export class MolassesAbility implements CreatureAbilityHandler {
  readonly kind='PURSUER_VISCOUS_FIELD' as const;
  readonly authority='PURSUER_MOTION' as const;
  private runId:string;
  private field:GelFieldState|null=null;
  private multiplier=1;
  private contact=false;
  constructor(runId:string){this.runId=runId;}
  reset(runId:string):void{
    this.runId=runId;this.field=null;this.multiplier=1;this.contact=false;
  }
  terminate():void{this.field=null;this.multiplier=1;this.contact=false;}
  advance(state:EngineStateV1,emit:(e:CreatureEffectReceipt)=>void):void{
    if(state.runId!==this.runId)throw Error('CREATURE_EFFECT_RUN_ISOLATION');
    if(!this.field||state.paused||state.phase==='ended')return;
    if(state.tick>=this.field.expiresTick){
      if(this.contact)emit({type:'FIELD_CONTACT_EXIT',
        detail:{reason:'FIELD_EXPIRED'}});
      this.contact=false;this.field=null;this.multiplier=1;
      emit({type:'FIELD_EXPIRED',detail:{}});
    }
  }
  cast(request:GelCastRequest,state:EngineStateV1,
    emit:(e:CreatureEffectReceipt)=>void):boolean{
    if(request.schema!==CREATURE_SDK_SCHEMA||
      request.kind!==this.kind||request.runId!==this.runId||
      request.runId!==state.runId||request.tick!==state.tick||
      state.paused||state.phase==='ended')throw Error('CREATURE_EFFECT_AUTHORITY');
    check(request.fieldTicks,20,600);
    check(request.radiusInRowGaps,.2,1.5);
    check(request.slowMultiplier,.55,1);
    if(request.direction!=='left'&&request.direction!=='right')
      throw Error('CREATURE_EFFECT_DIRECTION');
    const platform=state.world.rows.flatMap(r=>r.platforms)
      .find(p=>p.id===request.sourcePlatformId);
    if(!platform||platform.row!==state.currentProblem.rowIndex)
      return false;
    // This runtime must never accept cast while a live field is active:
    // one creature challenge -> one active source effect.
    if(this.field)return false;
    this.multiplier=request.slowMultiplier;
    this.contact=false;
    this.field={
      x:platform.x,y:platform.y,
      radius:state.world.geometry.rowGap*request.radiusInRowGaps,
      expiresTick:state.tick+request.fieldTicks,
      direction:request.direction,
    };
    emit({type:'FIELD_CAST',detail:{
      platformId:platform.id,expiresTick:this.field.expiresTick,
      direction:request.direction,
    }});
    return true;
  }
  observePursuer(bot:{x:number;y:number},tick:number,
    emit:(e:CreatureEffectReceipt)=>void):number{
    const f=this.field;
    const within=Boolean(f&&tick<f.expiresTick&&
      Math.hypot(bot.x-f.x,bot.y-f.y)<=f.radius&&
      (f.direction==='left'?bot.x<=f.x:bot.x>=f.x));
    if(within!==this.contact){
      this.contact=within;
      emit({type:within?'FIELD_CONTACT_ENTER':'FIELD_CONTACT_EXIT',
        detail:{x:bot.x,y:bot.y}});
    }
    return within?this.multiplier:1;
  }
  snapshot():CreatureAbilitySnapshot{
    return {kind:this.kind,authority:this.authority,
      activeField:this.field?structuredClone(this.field):null,
      multiplier:this.field?this.multiplier:1,
      contactActive:this.contact};
  }
}
/**
 * Factory: a declaration is not an implementation. No missing creature can
 * silently receive Molasses powers. Future adapters must be explicitly added.
 */
export function createCreatureAbility(species:CreatureSpecies,
  runId:string):CreatureAbilityHandler{
  const info=CREATURE_MANIFESTS[species];
  if(!info||!info.enabled)throw Error('CREATURE_ABILITY_NOT_IMPLEMENTED:'+species);
  if(species==='MOLASSES_GUARDIAN')return new MolassesAbility(runId);
  throw Error('CREATURE_ABILITY_NOT_IMPLEMENTED:'+species);
}
