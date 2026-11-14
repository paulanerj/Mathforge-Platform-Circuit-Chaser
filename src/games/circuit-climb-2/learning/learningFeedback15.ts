/**
 * CC2-15 — independent, source-backed learning assessment receipts.
 *
 * Only ROW_COMPLETED confirms a solved equation. ATTEMPT_EVALUATED is
 * an attempt, not proof of progress. Feedback after PLATFORM_SHORTED
 * may explain the rule but does not disclose an unearned correct platform.
 * No mastery inference is made from a single play session.
 */
import type {ScoreEvent13} from '../music/circuitScoreDirector13';
export type Skill15='MAKE_TARGET'|'RUNNING_ADDITION'|'SKIP_COUNT_BY_TWO';
export type Misconception15=
  'UNDERSHOOT'|'OVERSHOOT'|'WRONG_COUNT_STEP'|'NONE';
export interface LearningAttempt15{
  schema:'cc2-learning-attempt/v1';
  runId:string;
  attemptId:string;
  problemId:string;
  rowIndex:number;
  acceptedAtTick:number;
  responseTicks:number|null;
  operation:'add'|'skip-count-by-2';
  skill:Skill15;
  incoming:number;
  selected:number;
  target:number;
  selectedCorrect:boolean;
  landingConfirmed:boolean;
  shorted:boolean;
  misconception:Misconception15;
  completedEquation:string|null;
}
export interface LearningReview15{
  schema:'cc2-learning-review/v1';
  runId:string;
  curriculum:string;
  skill:Skill15;
  attempts:number;
  correctSelections:number;
  incorrectSelections:number;
  confirmedSolved:number;
  responseTicks:number[];
  misconceptions:Record<Misconception15,number>;
  receipts:LearningAttempt15[];
  errors:string[];
}
const skillFor=(curriculum:string):Skill15=>
  curriculum==='skip2to10'?'SKIP_COUNT_BY_TWO':
  curriculum==='makeTarget20'?'MAKE_TARGET':'RUNNING_ADDITION';
export function buildLearningReview15(events:readonly ScoreEvent13[],
  runId:string,curriculum:string):LearningReview15{
  const relevant=events.filter(e=>e.runId===runId);
  const attempts=relevant.filter(e=>e.type==='ATTEMPT_EVALUATED');
  const completions=new Set(relevant.filter(e=>e.type==='ROW_COMPLETED')
    .map(e=>String(e.detail.attemptId)));
  const shorted=new Set(relevant.filter(e=>e.type==='PLATFORM_SHORTED')
    .map(e=>String(e.detail.attemptId)));
  const errors:string[]=[],ids=new Set<string>();
  const counts:Record<Misconception15,number>={
    UNDERSHOOT:0,OVERSHOOT:0,WRONG_COUNT_STEP:0,NONE:0,
  };
  let previousOpportunityTick=0;
  const receipts:LearningAttempt15[]=[];
  for(const e of attempts){
    const d=e.detail,attemptId=String(d.attemptId);
    if(ids.has(attemptId)){errors.push('Duplicate attempt '+attemptId);continue;}
    ids.add(attemptId);
    const skip=d.operation==='skip-count-by-2';
    const incoming=Number(d.incomingValue),selected=Number(d.selectedValue),
      target=Number(d.targetValue);
    const correct=Boolean(d.correct);
    const confirmed=completions.has(attemptId),failed=shorted.has(attemptId);
    if(confirmed&&!correct)errors.push('Wrong attempt was credited '+attemptId);
    if(failed&&correct)errors.push('Correct selection was shorted '+attemptId);
    const misconception:Misconception15=correct?'NONE':
      skip?'WRONG_COUNT_STEP':
      incoming+selected>target?'OVERSHOOT':'UNDERSHOOT';
    if(!correct)counts[misconception]++;
    const last=e.tick-previousOpportunityTick;
    const responseTicks=Number.isInteger(last)&&last>=0?last:null;
    receipts.push({
      schema:'cc2-learning-attempt/v1',runId,
      attemptId,problemId:String(d.problemId),
      rowIndex:Number(d.rowIndex),
      acceptedAtTick:e.tick,responseTicks,
      operation:skip?'skip-count-by-2':'add',skill:skillFor(curriculum),
      incoming,selected,target,
      selectedCorrect:correct,landingConfirmed:confirmed,
      shorted:failed,misconception,
      completedEquation:confirmed
        ?skip?`${incoming} → ${target} (count by 2)`
          :`${incoming} + ${selected} = ${target}`
        :null,
    });
    const finished=relevant.find(x=>
      x.type==='ROW_COMPLETED'&&String(x.detail.attemptId)===attemptId);
    if(finished)previousOpportunityTick=finished.tick;
  }
  const actualRows=relevant.filter(e=>e.type==='ROW_COMPLETED');
  if(actualRows.length!==receipts.filter(r=>r.landingConfirmed).length)
    errors.push('Some completed rows have no matching accepted attempt');
  return{
    schema:'cc2-learning-review/v1',runId,curriculum,
    skill:skillFor(curriculum),attempts:receipts.length,
    correctSelections:receipts.filter(r=>r.selectedCorrect).length,
    incorrectSelections:receipts.filter(r=>!r.selectedCorrect).length,
    confirmedSolved:receipts.filter(r=>r.landingConfirmed).length,
    responseTicks:receipts.map(r=>r.responseTicks)
      .filter((t):t is number=>t!==null),
    misconceptions:counts,receipts,errors,
  };
}
export function incorrectHint15(attempt:ScoreEvent13,curriculum:string):string{
  if(attempt.type!=='ATTEMPT_EVALUATED'||attempt.detail.correct!==false)
    throw Error('CC2_HINT_REQUIRES_CONFIRMED_INCORRECT_ATTEMPT');
  const d=attempt.detail;
  if(curriculum==='skip2to10'||d.operation==='skip-count-by-2')
    return 'Count by twos from '+d.incomingValue+'. Find the next number, not a later one.';
  const sum=Number(d.incomingValue)+Number(d.selectedValue);
  if(!Number.isFinite(sum)||!Number.isFinite(Number(d.targetValue)))
    return 'Check the addition again before choosing.';
  return sum>Number(d.targetValue)
    ?'That sum is too large. Try a smaller addend.'
    :'That sum is too small. Try a larger addend.';
}
