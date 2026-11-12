/**
 * CC2-04 — authoritative end-of-run and solved-equation review.
 *
 * Only *physically landed, successfully solved* equations from the core's
 * state.solved list may appear in the review. Wrong or overshot choices are
 * counted as attempts, NOT smuggled into the solved list.
 *
 * This module enforces ledger/state parity rather than silently accepting
 * contradictory accounting. There is NO grade/mastery inference.
 */
import type {
  EngineStateV1,GameEventV1,EndReasonV1,
} from '../core/CircuitClimbCore';
import type {FeatureEventV1} from '../features/progression';
import {deriveAchievements,type AchievementV1} from './achievements';

export interface EquationReviewV1 {
  problemId:string;
  attemptId:string;
  row:number;
  equation:string;
  incoming:number;
  operand:number;
  result:number;
}
export interface RunSummaryV1 {
  schema:'cc2-run-summary/v1';
  runId:string;
  seed:string;
  ended:boolean;
  endReason:EndReasonV1|null;
  outcome:string;
  totalTicks:number;
  simulatedSeconds:number;
  rowsSolved:number;
  powerCells:number;
  attempts:number;
  correctAttempts:number;
  wrongAttempts:number;
  accuracyPercent:number|null;
  score:number;
  equations:EquationReviewV1[];
  achievements:AchievementV1[];
}
const labels:Readonly<Record<EndReasonV1,string>>={
  CAPTURED:'The Pursuer caught the Spark',
  PRACTICE_GOAL:'Practice circuit completed',
  CHALLENGE_GOAL:'Challenge completed',
  QUIT:'Run ended by player',
  RESTARTED:'Run restarted',
  SYSTEM_ABORT:'Run interrupted',
};
export function buildRunSummary(
  state:EngineStateV1,
  coreLedger:readonly GameEventV1[],
  featureLedger:readonly FeatureEventV1[],
):RunSummaryV1{
  const events=coreLedger.filter(event=>event.runId===state.runId);
  const attempts=events.filter(event=>event.type==='ATTEMPT_EVALUATED');
  const landings=events.filter(event=>event.type==='ROW_COMPLETED');
  if(attempts.length!==state.attempts||
    state.correctAttempts+state.wrongAttempts!==state.attempts)
    throw Error('CC2_SUMMARY_ATTEMPT_LEDGER_MISMATCH');
  if(landings.length!==state.completedRows||
    state.solved.length!==state.completedRows)
    throw Error('CC2_SUMMARY_LANDING_LEDGER_MISMATCH');
  if(attempts.filter(e=>e.detail.correct===true).length!==state.correctAttempts||
    attempts.filter(e=>e.detail.correct===false).length!==state.wrongAttempts)
    throw Error('CC2_SUMMARY_CORRECTNESS_LEDGER_MISMATCH');
  if(state.completedCells!==Math.floor(state.completedRows/4))
    throw Error('CC2_SUMMARY_CELL_LEDGER_MISMATCH');
  if(state.phase==='ended'){
    const endings=events.filter(e=>e.type==='RUN_ENDED');
    if(endings.length!==1||endings[0].detail.reason!==state.endReason)
      throw Error('CC2_SUMMARY_TERMINAL_LEDGER_MISMATCH');
  }
  const equations:EquationReviewV1[]=state.solved.map((solved,i)=>{
    const attempt=attempts.find(event=>event.detail.attemptId===solved.attemptId);
    const operation=attempt?.detail.operation;
    // Skip-count platforms show the destination total, not an addend.
    // Reading the source-owned attempt prevents a false "2 + 4 = 4" review.
    const arithmeticValid=operation==='skip-count-by-2'
      ? solved.operand===solved.result &&
        solved.result===solved.incoming+2
      : operation==='add' &&
        solved.incoming+solved.operand===solved.result;
    if(!Number.isFinite(solved.incoming)||
      !Number.isFinite(solved.operand)||
      !arithmeticValid ||
      attempt?.detail.correct!==true ||
      attempt?.detail.selectedValue!==solved.operand ||
      solved.rowIndex!==i+1 ||
      landings[i]?.detail.attemptId!==solved.attemptId)
      throw Error('CC2_SUMMARY_EQUATION_LEDGER_MISMATCH');
    return {
      problemId:solved.problemId,attemptId:solved.attemptId,
      row:solved.rowIndex,
      equation:operation==='skip-count-by-2'
        ? `${solved.incoming} → ${solved.result} (count by 2)`
        : `${solved.incoming} + ${solved.operand} = ${solved.result}`,
      incoming:solved.incoming,operand:solved.operand,result:solved.result,
    };
  });
  return {
    schema:'cc2-run-summary/v1',runId:state.runId,seed:state.seed,
    ended:state.phase==='ended',endReason:state.endReason,
    outcome:state.endReason?labels[state.endReason]:'Run in progress',
    totalTicks:state.tick,simulatedSeconds:state.tick/60,
    rowsSolved:state.completedRows,powerCells:state.completedCells,
    attempts:state.attempts,correctAttempts:state.correctAttempts,
    wrongAttempts:state.wrongAttempts,
    accuracyPercent:state.attempts===0?null:
      Math.round(state.correctAttempts/state.attempts*100),
    score:state.score,equations,
    achievements:deriveAchievements(state.runId,coreLedger,featureLedger),
  };
}
