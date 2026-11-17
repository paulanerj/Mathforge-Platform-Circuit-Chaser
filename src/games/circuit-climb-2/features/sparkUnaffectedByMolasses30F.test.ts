/**
 * CC2-30F: Molasses is strictly Pursuer-only, including while the player
 * traverses the same world region. Independently compare deterministic
 * learner math and Spark paths under identical inputs and tick sequences.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';
import {defaultCreatureConfig} from './creatureEcology30';

describe('CC2-30F: special ability cannot slow the player Spark',()=>{
  it('uses identical learner route/time/math under blanket and normal chasing',()=>{
    const seed='cc2-30f-spark-immutability';
    const config={...defaultRunConfig(),mode:'practice' as const};
    const baseline=new CircuitClimbChaseCore(seed,config);
    const withGuardian=new CircuitClimbChaseCore(seed,config,
      undefined,undefined,undefined,undefined,undefined,undefined,{
        ...defaultCreatureConfig(),fieldMode:'BELOW_PLATFORM',
        slowMultiplier:.5,
      });
    // Both games must take the exact SAME physical learner commands at
    // the exact SAME logical game tick. When a game has ended, compare
    // terminal accounting rather than advancing a nonexistent actor.
    for(let row=0;row<3;row++){
      const old=baseline.learnerSnapshot();
      const special=withGuardian.learnerSnapshot();
      expect(special.currentProblem).toEqual(old.currentProblem);
      expect(special.spark).toEqual(old.spark);
      if(old.phase==='ended')break;
      const id=old.currentProblem.correctPlatformId;
      expect(baseline.selectPlatform(id).ok).toBe(true);
      expect(withGuardian.selectPlatform(id).ok).toBe(true);
      for(let tick=0;tick<700;tick++){
        baseline.advanceTicks(1);
        withGuardian.advanceTicks(1);
        const a=baseline.learnerSnapshot(),b=withGuardian.learnerSnapshot();
        expect(b.spark).toEqual(a.spark);
        expect(b.travel).toEqual(a.travel);
        expect(b.score).toEqual(a.score);
        expect(b.solved).toEqual(a.solved);
        expect(b.tick).toEqual(a.tick);
        if(a.phase==='ready'||a.phase==='ended')break;
      }
      if(row===1&&withGuardian.learnerSnapshot().phase==='ready'){
        withGuardian.advanceTicks(1);
        baseline.advanceTicks(1);
        const gate=withGuardian.creatureSnapshot();
        if(gate?.gate==='AVAILABLE'){
          expect(withGuardian.offerCreature().ok).toBe(true);
          const q=withGuardian.creatureSnapshot()!.question!;
          const answer=q.sequence[2]+q.sequence[1]-q.sequence[0];
          expect(withGuardian.answerCreature(answer)).toEqual({ok:true,correct:true});
          expect(withGuardian.creatureSnapshot()?.activeField?.coverage)
            .toBe('BELOW_PLATFORM');
        }
      }
    }
    const a=baseline.learnerSnapshot(),b=withGuardian.learnerSnapshot();
    expect(b.spark).toEqual(a.spark);
    expect(b.solved).toEqual(a.solved);
    expect(b.score).toBe(a.score);
  });
});
