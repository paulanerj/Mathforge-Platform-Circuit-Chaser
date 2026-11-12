/**
 * CC2-04 — verified, non-mastering achievements.
 *
 * This is a PURE projection of the authoritative source-owned CORE and
 * FEATURE event ledgers. It cannot grade math, invent a landing, control an
 * enemy or persist a claim of academic mastery.
 *
 * Multiple consumers/replays receive the same achievement set. The original
 * event logs are never mutated, and an achievement may unlock only once in
 * a run even if the source events are inspected repeatedly.
 */
import type {GameEventV1} from '../core/CircuitClimbCore';
import type {FeatureEventV1} from '../features/progression';

export type AchievementIdV1=
  'FIRST_CELL'|'THREE_CELLS'|'PERFECT_CELL'|'CIRCUIT_PULSE_USED'|'BEAT_CHALLENGE';
export interface AchievementV1 {
  id:AchievementIdV1;
  runId:string;
  tick:number;
  unlockedAtRow:number;
  evidenceEventId:string;
  title:string;
  description:string;
}
const names:Readonly<Record<AchievementIdV1,{title:string;description:string}>>={
  FIRST_CELL:{
    title:'First Circuit',
    description:'Complete one four-row power cell.',
  },
  THREE_CELLS:{
    title:'Tower Builder',
    description:'Complete three four-row power cells.',
  },
  PERFECT_CELL:{
    title:'Clean Current',
    description:'Complete a full power cell without a wrong accepted answer.',
  },
  CIRCUIT_PULSE_USED:{
    title:'Circuit Pulse',
    description:'Activate an earned Circuit Pulse.',
  },
  BEAT_CHALLENGE:{
    title:'Challenge Complete',
    description:'Complete the authored twelve-row challenge.',
  },
};

/**
 * Source events each carry a runId; retain only the active run to prevent
 * stale achievements from surviving a Restart.
 */
export function deriveAchievements(
  runId:string,coreEvents:readonly GameEventV1[],
  featureEvents:readonly FeatureEventV1[],
):AchievementV1[]{
  const core=coreEvents.filter(e=>e.runId===runId);
  const features=featureEvents.filter(e=>e.runId===runId);
  const wrongRows=new Set<number>();
  const unlocked=new Map<AchievementIdV1,AchievementV1>();
  let completedRows=0;
  function award(
    id:AchievementIdV1,tick:number,row:number,evidenceEventId:string,
  ){
    if(unlocked.has(id))return;
    const label=names[id];
    unlocked.set(id,{
      id,runId,tick,unlockedAtRow:row,evidenceEventId,
      title:label.title,description:label.description,
    });
  }
  for(const event of core){
    if(event.type==='ATTEMPT_EVALUATED' && event.detail.correct===false){
      const row=Number(event.detail.rowIndex);
      if(!Number.isInteger(row)||row<1)throw Error('CC2_ACH_INVALID_ATTEMPT_ROW');
      wrongRows.add(row);
    }
    if(event.type==='ROW_COMPLETED'){
      const row=Number(event.detail.rowIndex);
      if(!Number.isInteger(row)||row!==completedRows+1)
        throw Error('CC2_ACH_ROW_SEQUENCE_INVALID');
      completedRows=row;
    }
    if(event.type==='CELL_COMPLETED'){
      const row=Number(event.detail.rowIndex);
      if(row!==completedRows||row%4!==0)
        throw Error('CC2_ACH_CELL_EVIDENCE_MISMATCH');
      if(row===4)award('FIRST_CELL',event.tick,row,event.id);
      if(row===12)award('THREE_CELLS',event.tick,row,event.id);
      let clean=true;
      for(let r=row-3;r<=row;r++)if(wrongRows.has(r)){clean=false;break;}
      if(clean)award('PERFECT_CELL',event.tick,row,event.id);
    }
    if(event.type==='RUN_ENDED' && event.detail.reason==='CHALLENGE_GOAL')
      award('BEAT_CHALLENGE',event.tick,completedRows,event.id);
  }
  for(const event of features){
    if(event.type==='ABILITY_ACTIVATED')
      award('CIRCUIT_PULSE_USED',event.tick,
        completedRowsAtTick(core,event.tick),event.id);
  }
  return [...unlocked.values()].sort((a,b)=>
    a.tick-b.tick||a.id.localeCompare(b.id));
}
/** Exact completed-row count at the ability's simulation tick. */
function completedRowsAtTick(core:readonly GameEventV1[],tick:number):number{
  let rows=0;
  for(const event of core){
    if(event.tick>tick)break;
    if(event.type==='ROW_COMPLETED')rows++;
  }
  return rows;
}
