/**
 * CC2-45A — SOURCE-AUTHENTIC future platform value projection.
 *
 * The existing learner core creates the NEXT mathematical problem only after
 * the prior real landing. An ordinary decorative "future" board therefore
 * has no legitimate numerals to paint. We MUST NOT fabricate random answers.
 *
 * Instead, reconstruct an isolated deterministic learner core from its own
 * replay, follow its genuine correct route for at most three additional
 * problems, and return the option values in each generated source row.
 *
 * The live core, its PRNG, source world, Pursuer, scoring, equations, events
 * and replay are never written to by this read-only projection. The caller
 * should cache per currentProblem.problemId; do not recompute on each frame.
 *
 * Values are exposed without any correct-answer styling or hint flags.
 * Gameplay still accepts ONLY the three authoritative current-row targets.
 */
import {
  replayCore,type CircuitClimbCore,type EngineStateV1,
} from '../core/CircuitClimbCore';

export interface FutureNumberedPlatform45 {
  readonly id:string;
  readonly row:number;
  readonly column:number;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
  readonly value:number;
}

export interface FutureNumberedRow45 {
  readonly row:number;
  readonly problemId:string;
  readonly platforms:ReadonlyArray<FutureNumberedPlatform45>;
}

export interface FutureChoiceProjection45 {
  readonly schema:'cc2-future-numbered-rows/v1';
  readonly runId:string;
  readonly originProblemId:string;
  readonly rows:ReadonlyArray<FutureNumberedRow45>;
  readonly terminatedEarly:boolean;
}

/** A single local projection is limited to 3 prospective source levels. */
export function projectFutureNumberedRows45(
  original:CircuitClimbCore,maximumRows=3,
):FutureChoiceProjection45{
  if(!Number.isInteger(maximumRows)||maximumRows<1||maximumRows>3)
    throw Error('CC245_FORECAST_ROW_BOUND');
  const source=original.snapshot();
  if(source.phase==='ended')return {
    schema:'cc2-future-numbered-rows/v1',
    runId:source.runId,originProblemId:source.currentProblem.problemId,
    rows:[],terminatedEarly:true,
  };
  const digest=original.stateDigest();
  const copy=replayCore(original.replayExport());
  if(copy.stateDigest()!==digest)
    throw Error('CC245_PROJECTION_REPLAY_PARITY');
  // A paused live run can still display future architecture. Resume ONLY
  // the disconnected clone after exact replay parity has been established.
  if(copy.snapshot().paused)copy.resume();
  const results:FutureNumberedRow45[]=[];
  const ready=():EngineStateV1|null=>{
    let s=copy.snapshot();
    for(let ticks=0;ticks<3000 &&
      (s.phase==='outbound'||s.phase==='return');ticks+=20){
      copy.advanceTicks(20);s=copy.snapshot();
    }
    if(s.phase==='ended')return null;
    if(s.phase!=='ready')throw Error('CC245_PROJECTION_NOT_READY');
    return s;
  };
  for(let i=0;i<maximumRows;i++){
    const state=ready();
    if(!state)break;
    const p=state.currentProblem;
    const worldRow=state.world.rows.find(row=>row.index===p.rowIndex);
    if(!worldRow||worldRow.platforms.length!==3)
      throw Error('CC245_PROJECTION_ROW_MISSING');
    const platforms=worldRow.platforms.map(t=>{
      if(t.value===null||!Number.isFinite(t.value))
        throw Error('CC245_PROJECTION_OPTION_MISSING');
      return {id:t.id,row:t.row,column:t.column,x:t.x,y:t.y,
        width:t.width,height:t.height,value:t.value};
    });
    // Expose no correctness bits. The mathematics is not pre-awarded.
    results.push({row:p.rowIndex,problemId:p.problemId,platforms});
    if(i===maximumRows-1)break;
    const attempt=copy.selectPlatform(p.correctPlatformId);
    if(!attempt.ok||!attempt.correct)
      throw Error('CC245_PROJECTION_ROUTE_INVALID');
  }
  return {
    schema:'cc2-future-numbered-rows/v1',
    runId:source.runId,
    originProblemId:source.currentProblem.problemId,
    rows:results,
    terminatedEarly:results.length<maximumRows,
  };
}
