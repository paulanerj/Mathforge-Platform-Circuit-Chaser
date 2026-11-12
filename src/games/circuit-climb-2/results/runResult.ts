/**
 * CC2-04 — verifiable end-of-run results and achievement evidence.
 *
 * This model ONLY reports source-owned attempts and successful landings.
 * It never converts overshoots, selected-but-unlanded attempts or bot movement
 * into solved math. Achievements are game milestones, not educational mastery.
 * Runs survive restart in the log; this report filters by current run ID.
 */
import type {
  EngineStateV1,GameEventV1,SolvedEquationV1,
} from '../core/CircuitClimbCore';
import type { FeatureEventV1 } from '../features/progression';

export type AchievementId=
  'FIRST_CELL'|'THREE_CELLS'|'PERFECT_CELL'|
  'CIRCUIT_PULSE_USED'|'BEAT_CHALLENGE';
export interface AchievementV1 {
  id:AchievementId;
  earnedAtTick:number;
  sourceEventIds:string[];
  description:string;
  /** No educational mastery inferred. */
  isMasteryEvidence:false;
}
export interface RunResultV1 {
  schema:'cc2-run-result/v1';
  runId:string;
  status:'LIVE'|'ENDED';
  endReason:string|null;
  rowsCompleted:number;
  cellsCompleted:number;
  attemptsAccepted:number;
  correctAttemptsAccepted:number;
  incorrectAttemptsAccepted:number;
  accuracyPercent:number|null;
  score:number;
  solvedEquations:SolvedEquationV1[];
  bestCompletedRow:number;
  stage:number;
  pulseUses:number;
  relayMilestones:number;
  perfectCells:number;
  achievements:AchievementV1[];
  accounting:{
    complete:boolean;
    acceptedEvents:number;
    landedEvents:number;
    missingLandingCount:number;
  };
}
const clone=<T>(x:T):T=>structuredClone(x);
export function deriveRunResult(
  state:EngineStateV1,
  engineEvents:readonly GameEventV1[],
  featureEvents:readonly FeatureEventV1[]=[],
):RunResultV1 {
  const run=engineEvents.filter(e=>e.runId===state.runId);
  const features=featureEvents.filter(e=>e.runId===state.runId);
  const accepted=run.filter(e=>e.type==='ATTEMPT_EVALUATED');
  const landed=run.filter(e=>e.type==='ROW_COMPLETED');
  const solved=state.solved;
  const landedIds=new Set(landed.map(e=>String(e.detail.attemptId)));
  const correctAccepted=accepted.filter(e=>e.detail.correct===true);
  const missingLanding=correctAccepted.filter(e=>!landedIds.has(String(e.detail.attemptId)));
  const attempts=accepted.length;
  const accounting=attempts===state.attempts &&
    landed.length===state.completedRows &&
    solved.length===landed.length &&
    correctAccepted.length===state.correctAttempts &&
    accepted.length-correctAccepted.length===state.wrongAttempts &&
    solved.every(x=>x.incoming+x.operand===x.result &&
      landedIds.has(x.attemptId));
  if(!accounting)throw Error('CC2_RESULT_LEDGER_MISMATCH');

  const achievements:AchievementV1[]=[];
  const award=(id:AchievementId,e:GameEventV1|FeatureEventV1,
    description:string,additional:string[]=[]):void=>{
    if(achievements.some(a=>a.id===id))return;
    achievements.push({
      id,earnedAtTick:e.tick,
      sourceEventIds:[e.id,...additional],
      description,isMasteryEvidence:false,
    });
  };
  const fourth=landed.find(e=>Number(e.detail.rowIndex)===4);
  if(fourth)award('FIRST_CELL',fourth,'First four-row power cell completed');
  const twelfth=landed.find(e=>Number(e.detail.rowIndex)===12);
  if(twelfth)award('THREE_CELLS',twelfth,'Three power cells completed');
  let perfectCells=0;
  for(let cell=0;cell<Math.floor(state.completedRows/4);cell++){
    const low=cell*4+1,high=low+3;
    const cellLandings=landed.filter(e=>
      Number(e.detail.rowIndex)>=low&&Number(e.detail.rowIndex)<=high);
    const cellAttempts=accepted.filter(e=>
      Number(e.detail.rowIndex)>=low&&Number(e.detail.rowIndex)<=high);
    if(cellLandings.length===4&&cellAttempts.length===4&&
      cellAttempts.every(e=>e.detail.correct===true)){
      perfectCells++;
      const last=cellLandings.find(e=>Number(e.detail.rowIndex)===high)!;
      award('PERFECT_CELL',last,'Power cell solved with no wrong attempts',
        cellAttempts.map(e=>e.id));
    }
  }
  const pulse=features.find(e=>e.type==='ABILITY_ACTIVATED');
  if(pulse)award('CIRCUIT_PULSE_USED',pulse,'Activated an earned Circuit Pulse');
  if(state.endReason==='CHALLENGE_GOAL'){
    const end=run.find(e=>e.type==='RUN_ENDED'&&e.detail.reason==='CHALLENGE_GOAL');
    if(end)award('BEAT_CHALLENGE',end,'Finished the authored Challenge goal');
  }
  return {
    schema:'cc2-run-result/v1',runId:state.runId,
    status:state.phase==='ended'?'ENDED':'LIVE',
    endReason:state.endReason,
    rowsCompleted:state.completedRows,
    cellsCompleted:state.completedCells,
    attemptsAccepted:attempts,
    correctAttemptsAccepted:correctAccepted.length,
    incorrectAttemptsAccepted:attempts-correctAccepted.length,
    accuracyPercent:attempts?100*correctAccepted.length/attempts:null,
    score:state.score,
    solvedEquations:clone(solved),
    bestCompletedRow:state.completedRows,
    stage:Math.floor(state.completedRows/12)+1,
    pulseUses:features.filter(e=>e.type==='ABILITY_ACTIVATED').length,
    relayMilestones:features.filter(e=>e.type==='RELAY_CHAIN').length,
    perfectCells,achievements,
    accounting:{
      complete:missingLanding.length===0,
      acceptedEvents:accepted.length,
      landedEvents:landed.length,
      missingLandingCount:missingLanding.length,
    },
  };
}
