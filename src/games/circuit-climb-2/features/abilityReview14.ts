/**
 * CC2-14 — read-only audit of REAL Pulse, Capacitor, Relay and stage receipts.
 *
 * This verifier cannot award charge, slow the Pursuer, change a collision,
 * reveal a correct answer, or edit stage/score. It documents actual results
 * and flags contradictory presentation evidence for QA.
 */
import {defaultFeatureConfig,modifierForRow} from './progression';
import type {ScoreEvent13} from '../music/circuitScoreDirector13';

export interface AbilityEvidence14{
  schema:'cc2-ability-evidence/v1';
  runId:string;
  chargedRows:number;
  genuineChargeEarned:number;
  cappedChargeEvents:number;
  capacitors:number;
  relays:number;
  stageEvents:number;
  pulseActivations:number;
  pulseHits:number;
  pulseMisses:number;
  pulseExpirations:number;
  featureEvents:number;
  eventsByType:Record<string,number>;
  pulseInRangeNow:boolean|null;
  pulseReadyNow:boolean|null;
  chargeNow:number|null;
  errors:string[];
}
export function summarizeAbilityEvidence14(core:readonly ScoreEvent13[],
  features:readonly ScoreEvent13[],
  snapshot:{charge:number;capacity:number;targetInRange:boolean;
    pulseAvailable:boolean;pulseUntilTick:number}|null,
  runId:string):AbilityEvidence14{
  const config=defaultFeatureConfig(),errors:string[]=[];
  const rows=core.filter(e=>e.runId===runId&&e.type==='ROW_COMPLETED');
  const validRows=new Map<string,ScoreEvent13>();
  for(const e of rows){
    const row=Number(e.detail.rowIndex);
    const key=e.runId+':'+row;
    if(validRows.has(key))errors.push('Duplicate source completed row '+row);
    validRows.set(key,e);
  }
  const relevant=features.filter(e=>e.runId===runId)
    .sort((a,b)=>a.tick-b.tick);
  const seen=new Set<string>();
  let charge=0,cap=0,relay=0,stage=0,pulses=0,hits=0,
    misses=0,expired=0,earned=0,capped=0;
  const byType:Record<string,number>={};
  const chargedRows=new Set<number>();
  const relayRows=new Set<number>();
  for(const e of relevant){
    const id=e.runId+':'+e.id;
    if(seen.has(id)){errors.push('Duplicate feature event ID '+id);continue;}
    seen.add(id);byType[e.type]=(byType[e.type]||0)+1;
    if(e.type==='CHARGE_GAINED'){
      const row=Number(e.detail.row),actual=Number(e.detail.earned),
        modifier=modifierForRow(row,config);
      if(!Number.isInteger(row)||row<1||!Number.isFinite(actual)){
        errors.push('Invalid charge receipt '+id);continue;
      }
      if(!validRows.has(e.runId+':'+row))
        errors.push('Charge without completed source row '+row);
      if(chargedRows.has(row))errors.push('Duplicate charge for row '+row);
      chargedRows.add(row);
      if(e.detail.modifier!==modifier)
        errors.push('Modifier mismatch at '+row);
      const expected=Math.min(config.chargeCapacity-charge,
        modifier==='CAPACITOR'?config.capacitorBonus:1);
      if(actual!==expected)errors.push('Charge delta mismatch at '+row);
      if(actual===0)capped++;
      if(modifier==='CAPACITOR'&&actual>0)cap++;
      earned+=actual;charge=Number(e.detail.charge);
      if(charge<0||charge>config.chargeCapacity)
        errors.push('Out-of-range charged value at '+row);
    }else if(e.type==='RELAY_CHAIN'){
      const row=Number(e.detail.row);
      if(modifierForRow(row,config)!=='RELAY'||!validRows.has(e.runId+':'+row))
        errors.push('Relay not supported by completed row '+row);
      if(relayRows.has(row))errors.push('Duplicate relay for row '+row);
      relayRows.add(row);relay++;
    }else if(e.type==='STAGE_REACHED'){
      const row=Number(e.detail.completedRows);
      if(row%12!==0||!validRows.has(e.runId+':'+row)||
        Number(e.detail.stage)!==row/12+1)
        errors.push('Invalid stage milestone at '+row);
      stage++;
    }else if(e.type==='ABILITY_ACTIVATED'){
      pulses++;
      if(e.detail.affected===true)hits++;else misses++;
      if(charge!==config.chargeCapacity)
        errors.push('Pulse activated before full charge');
      charge=0;
      if(e.detail.affected===false&&e.detail.speedMultiplier!==1)
        errors.push('Missed Pulse falsely slowed Pursuer');
    }else if(e.type==='ABILITY_EXPIRED')expired++;
  }
  for(const key of validRows.keys()){
    const row=Number(key.slice(key.lastIndexOf(':')+1));
    if(!chargedRows.has(row))
      errors.push('Missing charge for genuine solved row '+row);
    if(modifierForRow(row,config)==='RELAY'&&!relayRows.has(row))
      errors.push('Missing relay at '+row);
  }
  if(snapshot&&snapshot.charge!==charge)
    errors.push('Present charge does not match feature ledger');
  return{
    schema:'cc2-ability-evidence/v1',runId,
    chargedRows:chargedRows.size,genuineChargeEarned:earned,
    cappedChargeEvents:capped,capacitors:cap,relays:relay,stageEvents:stage,
    pulseActivations:pulses,pulseHits:hits,pulseMisses:misses,
    pulseExpirations:expired,featureEvents:relevant.length,
    eventsByType:byType,pulseInRangeNow:snapshot?.targetInRange??null,
    pulseReadyNow:snapshot?.pulseAvailable??null,
    chargeNow:snapshot?.charge??null,errors,
  };
}
