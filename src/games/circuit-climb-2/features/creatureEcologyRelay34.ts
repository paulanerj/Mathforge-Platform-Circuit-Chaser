/**
 * CC2-33/34 — deterministic creature-encounter arbitration and Relay guidance.
 *
 * This is an opt-in HEADLESS DOMAIN MODULE, not yet bound to the browser or
 * gameplay UI. The accepted core remains the single authority for arithmetic,
 * landing, score, and the solved equation ledger.
 *
 * Why only show one active relay step today? The core generates each future
 * mathematical problem AFTER the preceding authentic landing. Inventing four
 * answer IDs in advance would be mathematically dishonest. This controller
 * reserves four source-verified future steps, and reveals each only once the
 * real problem is available. A genuine four-row lookahead requires a separate
 * core-owned deterministic projection API and replay verification.
 */
import {replayCore,type EngineStateV1,type ReplayV1,type CircuitClimbCore} from '../core/CircuitClimbCore';

export const CREATURE_ECOLOGY_V1='cc2-creature-ecology-policy/v1' as const;
export type EncounterSpecies='MOLASSES_GUARDIAN'|'RELAY'|'TETHER_SLUG'|
  'CAPACITOR'|'PRISM_SHUFFLER'|'FRACTURE_WISP';

/** No two interactive creature challenges may occupy the player's tap lane. */
export type EncounterResult=
  |{accepted:true;species:EncounterSpecies}
  |{accepted:false;reason:'ENCOUNTER_BUSY'|'NOT_ENABLED'|'RUN_ENDED'|'INVALID_RUN'};

export interface EcologyPolicy {
  readonly schema:typeof CREATURE_ECOLOGY_V1;
  readonly maxInteractiveCreatures:1;
  readonly available:ReadonlyArray<EncounterSpecies>;
  /** Lingering environmental effects belong to separate source authorities. */
  readonly lingerEffectMode:'SOURCE_SCOPED_NONSTACKING';
  readonly relayRows:number;
  readonly fractureSupportSeconds:number;
}
export const DEFAULT_ECOLOGY_POLICY:EcologyPolicy=Object.freeze({
  schema:CREATURE_ECOLOGY_V1,
  maxInteractiveCreatures:1,
  available:Object.freeze(['MOLASSES_GUARDIAN','RELAY'] as EncounterSpecies[]),
  lingerEffectMode:'SOURCE_SCOPED_NONSTACKING',
  relayRows:4,
  fractureSupportSeconds:2,
});

/**
 * One active encounter at a time; historical Molasses residue may remain
 * visible and authoritative AFTER the creature itself is no longer targeted.
 * An unrelated source domain such as Relay guidance never multiplies or
 * silently cancels the Pursuer-only Molasses field.
 */
export class CreatureEncounterArbiter {
  readonly policy:EcologyPolicy;
  private runId:string;
  private occupied:EncounterSpecies|null=null;
  constructor(runId:string,policy:EcologyPolicy=DEFAULT_ECOLOGY_POLICY){
    if(!runId)throw Error('CREATURE_RUN_REQUIRED');
    this.runId=runId;this.policy=policy;
  }
  offer(species:EncounterSpecies,state:Pick<EngineStateV1,'runId'|'phase'>):EncounterResult{
    if(state.runId!==this.runId)return {accepted:false,reason:'INVALID_RUN'};
    if(state.phase==='ended')return {accepted:false,reason:'RUN_ENDED'};
    if(!this.policy.available.includes(species))
      return {accepted:false,reason:'NOT_ENABLED'};
    if(this.occupied)return {accepted:false,reason:'ENCOUNTER_BUSY'};
    this.occupied=species;
    return {accepted:true,species};
  }
  release(species:EncounterSpecies):boolean{
    if(this.occupied!==species)return false;
    this.occupied=null;return true;
  }
  snapshot():{runId:string;occupied:EncounterSpecies|null}{
    return {runId:this.runId,occupied:this.occupied};
  }
  reset(nextRunId:string):void{
    if(!nextRunId)throw Error('CREATURE_RUN_REQUIRED');
    this.runId=nextRunId;this.occupied=null;
  }
}

/** The primary engine alone decides the answer. */
export interface RelayGuidanceView {
  readonly schema:'cc2-relay-guidance/v1';
  readonly runId:string;
  readonly rowsRemaining:number;
  readonly sourceRow:number;
  readonly currentPlatformId:string|null;
  readonly currentProblemId:string|null;
  readonly mode:'GUIDED_ACTIVE_ROW'|'WAITING_FOR_NEXT_ROW'|'COMPLETE';
  readonly solvedGuidedRows:number;
}
export class RelayGuidanceDirector {
  private readonly runId:string;
  private readonly startingRows:number;
  private remaining:number;
  private lastCompletedRows:number;
  private lastProblemId:string|null=null;
  private enabled=true;
  constructor(state:EngineStateV1,rows=4){
    if(!Number.isInteger(rows)||rows<1||rows>8)
      throw Error('RELAY_ROWS_BOUNDS');
    if(state.phase==='ended'||state.paused||state.phase!=='ready')
      throw Error('RELAY_START_REQUIRES_READY');
    this.runId=state.runId;
    this.startingRows=rows;this.remaining=rows;
    this.lastCompletedRows=state.completedRows;
  }
  /** Update only from authoritative state. Never tick down on animations. */
  advance(state:EngineStateV1):RelayGuidanceView{
    if(state.runId!==this.runId)throw Error('RELAY_RUN_ISOLATION');
    if(state.phase==='ended'){this.enabled=false;this.remaining=0;}
    if(state.completedRows<this.lastCompletedRows)
      throw Error('RELAY_PROGRESS_REGRESSION');
    const delta=state.completedRows-this.lastCompletedRows;
    if(delta>0){
      this.remaining=Math.max(0,this.remaining-delta);
      this.lastCompletedRows=state.completedRows;
    }
    const ready=this.enabled&&this.remaining>0&&!state.paused&&state.phase==='ready';
    const currentProblemId=ready?state.currentProblem.problemId:null;
    const currentPlatformId=ready?state.currentProblem.correctPlatformId:null;
    // Only reveal a genuine source-owned platform on a READY row.
    this.lastProblemId=currentProblemId;
    return {
      schema:'cc2-relay-guidance/v1',
      runId:this.runId,
      rowsRemaining:this.remaining,
      sourceRow:state.currentProblem.rowIndex,
      currentPlatformId,
      currentProblemId,
      mode:this.remaining===0||!this.enabled?'COMPLETE':
        ready?'GUIDED_ACTIVE_ROW':'WAITING_FOR_NEXT_ROW',
      solvedGuidedRows:this.startingRows-this.remaining,
    };
  }
}

/**
 * CC2-34B: observational source-backed four-platform advance projection.
 *
 * This operates on a DISTINCT core constructed by the existing deterministic
 * replay engine. The live core is not advanced, mutated, or inspected for
 * unrevealed correct answers. The caller must verify source digest identity.
 * Cache this receipt at Relay activation; NEVER invoke every rendering frame.
 *
 * Future math may be invalidated by later topology-changing powers. Do not
 * show a stale projection after a new source topology/version event.
 */
export interface RelayProjectedPlatform {
  readonly row:number;
  readonly problemId:string;
  readonly platformId:string;
  readonly value:number;
  readonly x:number;
  readonly y:number;
}
export interface RelayForecast {
  readonly schema:'cc2-relay-forecast/v1';
  readonly runId:string;
  readonly originTick:number;
  readonly originDigest:string;
  readonly projected:ReadonlyArray<RelayProjectedPlatform>;
  readonly terminatedEarly:boolean;
}
export function projectRelayFutureRows(
  authoritative:Pick<CircuitClimbCore,'snapshot'|'stateDigest'|'replayExport'>,
  maxRows=4,
):RelayForecast{
  if(!Number.isInteger(maxRows)||maxRows<1||maxRows>8)
    throw Error('RELAY_ROWS_BOUNDS');
  const before=authoritative.snapshot();
  if(before.paused||before.phase!=='ready')
    throw Error('RELAY_FORECAST_REQUIRES_READY');
  const digest=authoritative.stateDigest();
  const trace:ReplayV1=authoritative.replayExport();
  const projection=replayCore(trace);
  if(projection.stateDigest()!==digest)
    throw Error('RELAY_FORECAST_REPLAY_MISMATCH');
  const platforms:RelayProjectedPlatform[]=[];
  let terminatedEarly=false;
  for(let row=0;row<maxRows;row++){
    const state=projection.snapshot();
    if(state.phase==='ended'){terminatedEarly=true;break;}
    if(state.phase!=='ready')throw Error('RELAY_FORECAST_PHASE');
    const correctId=state.currentProblem.correctPlatformId;
    const platform=state.world.rows.flatMap(r=>r.platforms)
      .find(p=>p.id===correctId);
    if(!platform||platform.dead||platform.row!==state.currentProblem.rowIndex)
      throw Error('RELAY_FORECAST_PLATFORM_UNAVAILABLE');
    platforms.push({
      row:platform.row,problemId:state.currentProblem.problemId,
      platformId:platform.id,value:platform.value!,
      x:platform.x,y:platform.y,
    });
    const answer=projection.selectPlatform(correctId);
    if(!answer.ok||!answer.correct)
      throw Error('RELAY_FORECAST_INVALID_MATH');
    // Entirely on the clone: bounded source ticks; no wall-clock timers.
    let ticks=0;
    while(projection.snapshot().phase==='outbound'&&ticks<3000){
      projection.advanceTicks(60);
      ticks+=60;
    }
    const next=projection.snapshot();
    if(next.completedRows!==state.completedRows+1)
      throw Error('RELAY_FORECAST_LANDING_FAILED');
  }
  return {
    schema:'cc2-relay-forecast/v1',
    runId:before.runId,
    originTick:before.tick,originDigest:digest,
    projected:platforms,terminatedEarly,
  };
}
