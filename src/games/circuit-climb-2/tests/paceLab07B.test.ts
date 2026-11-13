/**
 * CC2-07B — deterministic six-seed pace-lab gameplay trials.
 *
 * Trial actor: waits 45 simulation ticks before making a correct choice,
 * then lets the actual accepted Spark circuit route and Pursuer advance.
 * This is an automated reproducible baseline, NOT a substitute for human
 * difficulty testing. The report contains captures, distance, contact,
 * completed rows and graph failures for the three owner-selectable modes.
 */
import {describe,it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {paceProfile,PACE_PROFILE_IDS,PACE_QUALIFICATION,
  type PaceProfileId} from '../config/paceProfiles';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';

interface PaceResult{
  profile:PaceProfileId;seed:string;simulatedTicks:number;
  rowsCompleted:number;attempts:number;
  captured:boolean;capturedAtTick:number|null;
  firstSensedAtTick:number|null;
  sensedTicks:number;routeFailures:number;
  minSeparation:number;meanSeparation:number;
}
function simulate(profile:PaceProfileId,seed:string):{
  game:CircuitClimbChaseCore;result:PaceResult
}{
  const p=paceProfile(profile);
  const game=new CircuitClimbChaseCore(seed,p.run,p.pursuer,
    undefined,p.learner,p.personality);
  const tickBudget=PACE_QUALIFICATION.seconds*60;
  let lastReady=-1,firstSensedAtTick:number|null=null;
  let sensedTicks=0,routeFailures=0,minSeparation=Infinity,
    totalDistance=0,measurements=0;
  for(let t=0;t<tickBudget;t++){
    const s=game.snapshot();
    if(s.learner.phase==='ended')break;
    if(s.learner.phase==='ready'){
      if(lastReady<0)lastReady=s.learner.tick;
      if(s.learner.tick-lastReady>=45){
        const answer=s.learner.currentProblem.correctPlatformId;
        const selection=game.selectPlatform(answer);
        if(selection.ok)lastReady=-1;
      }
    }else lastReady=-1;
    game.advanceTicks(1);
    const after=game.snapshot();
    if(after.pursuer.sensed){
      sensedTicks++;
      if(firstSensedAtTick===null)firstSensedAtTick=after.learner.tick;
    }
    const distance=Math.hypot(after.learner.spark.x-after.pursuer.body.x,
      after.learner.spark.y-after.pursuer.body.y);
    minSeparation=Math.min(minSeparation,distance);
    totalDistance+=distance;measurements++;
    routeFailures=Math.max(routeFailures,after.pursuer.routeFailures);
  }
  const last=game.snapshot();
  return {game,result:{
    profile,seed,simulatedTicks:last.learner.tick,
    rowsCompleted:last.learner.completedRows,
    attempts:last.learner.attempts,
    captured:last.learner.endReason==='CAPTURED',
    capturedAtTick:last.learner.endReason==='CAPTURED'?last.learner.tick:null,
    firstSensedAtTick,sensedTicks,routeFailures,
    minSeparation,meanSeparation:measurements?
      totalDistance/measurements:Infinity,
  }};
}

describe('CC2-07B — repeatable pace lab (not final human difficulty)',()=>{
  it('profiles are complete, versioned, and preserve mathematics and geometry',()=>{
    for(const id of PACE_PROFILE_IDS){
      const p=paceProfile(id);
      expect(p.schemaVersion).toBe('cc2-dev-lab/v1');
      expect(p.run.rowGapScale).toBe(1.5);
      expect(p.pursuer.searchStrategy).toBe('ascending');
      expect(p.personality?.detourChance).toBe(0);
      expect(p.personality?.hesitationChance).toBe(0);
      expect(p.run.curriculum).toBe('makeTarget20');
      expect(p.run.movement).toBe('circuit');
    }
    expect(paceProfile('training').learner.circuitSpeedPerTick)
      .toBeGreaterThan(paceProfile('energetic').learner.circuitSpeedPerTick);
    expect(paceProfile('training').pursuer.speedPursuit)
      .toBeLessThan(paceProfile('energetic').pursuer.speedPursuit);
    expect(paceProfile('intense').pursuer.speedPursuit)
      .toBeGreaterThan(paceProfile('energetic').pursuer.speedPursuit);
    expect(()=>paceProfile('unbounded' as PaceProfileId))
      .toThrow('CC2_PACE_PROFILE_UNKNOWN');
  });

  it('gameplay trials record six seeds per profile, protect routes and export metrics',()=>{
    const metrics:PaceResult[]=[];
    for(const profile of PACE_PROFILE_IDS){
      for(const seed of PACE_QUALIFICATION.seeds){
        const {game,result}=simulate(profile,seed);
        metrics.push(result);
        expect(result.simulatedTicks).toBeGreaterThan(0);
        expect(result.rowsCompleted).toBeGreaterThanOrEqual(0);
        expect(result.routeFailures).toBe(0);
        expect(Number.isFinite(result.minSeparation)).toBe(true);
        expect(Number.isFinite(result.meanSeparation)).toBe(true);
        expect(result.attempts).toBeGreaterThan(0);
        // One full replay per profile verifies deterministic math and chase.
        if(seed===PACE_QUALIFICATION.seeds[0])
          expect(replayChase(game.replayExport()).stateDigest())
            .toBe(game.stateDigest());
      }
    }
    const aggregates=PACE_PROFILE_IDS.map(profile=>{
      const a=metrics.filter(m=>m.profile===profile);
      return {
        profile,runs:a.length,
        captures:a.filter(m=>m.captured).length,
        avgRows:Number((a.reduce((s,m)=>s+m.rowsCompleted,0)/a.length).toFixed(2)),
        avgFirstSensedTicks:Number((a.reduce((s,m)=>s+
          (m.firstSensedAtTick??m.simulatedTicks),0)/a.length).toFixed(1)),
        avgMeanSeparation:Number((a.reduce((s,m)=>s+m.meanSeparation,0)/a.length).toFixed(1)),
      };
    });
    mkdirSync('cc2-07b-results',{recursive:true});
    writeFileSync('cc2-07b-results/pace-matrix.json',
      JSON.stringify({schema:'cc2-07b-pace-matrix/v1',
        generatedFrom:'source-owned 60Hz deterministic trial',
        humanBalanceProven:false,secondsPerTrial:PACE_QUALIFICATION.seconds,
        aggregates,metrics},null,2)+'\n');
    console.log('CC2-07B PACE MATRIX',JSON.stringify(aggregates));
    expect(metrics).toHaveLength(PACE_PROFILE_IDS.length*
      PACE_QUALIFICATION.seeds.length);
  },120000);
});
