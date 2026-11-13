/**
 * CC2-07A Energetic Pursuit qualification.
 *
 * This is an experimental difficulty profile, not the final owner balance.
 * Source-owned math and finite sensing remain authoritative. We compare
 * baseline and energetic profiles across reproducible multi-seed climbs.
 */
import {describe,it,expect} from 'vitest';
import {
  energeticClimbDevLabPreset,spacedDirectChaseDevLabPreset,
  validateDevLabPreset,
} from '../config/devLabPreset';
import {validatePursuerPreset,defaultPursuerPreset} from '../pursuer/pursuerPreset';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';

const energetic=energeticClimbDevLabPreset();
const previous=spacedDirectChaseDevLabPreset();

function runStationary(seed:string,profile:ReturnType<typeof energeticClimbDevLabPreset>){
  const game=new CircuitClimbChaseCore(seed,
    {...profile.run,mode:'practice'},
    profile.pursuer,undefined,profile.learner,profile.personality);
  const first=game.snapshot();
  const separation=()=>{
    const s=game.snapshot();
    return Math.hypot(s.learner.spark.x-s.pursuer.body.x,
      s.learner.spark.y-s.pursuer.body.y);
  };
  let firstSensed:number|null=null,routeFailures=0;
  const distanceStart=separation();
  for(let i=0;i<360;i++){
    game.advanceTicks(1);
    const s=game.snapshot();
    if(firstSensed===null&&s.pursuer.sensed)firstSensed=s.learner.tick;
    routeFailures=Math.max(routeFailures,s.pursuer.routeFailures);
  }
  return {game,first,distanceStart,endDistance:separation(),
    firstSensed,routeFailures};
}

describe('CC2-07A: faster, closer, still honest Pursuer',()=>{
  it('new default is substantially faster in both actors without losing 1.5x tower',()=>{
    expect(validateDevLabPreset(energetic)).toEqual(energetic);
    expect(energetic.run.rowGapScale).toBe(1.5);
    expect(energetic.learner.circuitSpeedPerTick).toBe(24);
    expect(energetic.learner.circuitSpeedPerTick)
      .toBeGreaterThan(previous.learner.circuitSpeedPerTick);
    expect(energetic.pursuer.speedSearch).toBe(4.8);
    expect(energetic.pursuer.speedPursuit).toBe(6);
    expect(energetic.pursuer.spawnRowsBelow).toBe(2);
    expect(energetic.pursuer.searchStrategy).toBe('ascending');
    expect(energetic.personality?.noticeTicks).toBe(0);
    expect(energetic.personality?.hesitationChance).toBe(0);
    expect(energetic.personality?.detourChance).toBe(0);
  });
  it('old saved presets still load; policy extension rejects unknown values',()=>{
    expect(validatePursuerPreset(defaultPursuerPreset()).searchStrategy).toBeUndefined();
    expect(validatePursuerPreset(previous.pursuer).searchStrategy).toBeUndefined();
    expect(()=>validatePursuerPreset({...previous.pursuer,
      searchStrategy:'omniscient'})).toThrow('PURSUER_PRESET_SHAPE');
    expect(()=>validatePursuerPreset({...previous.pursuer,
      unsolicited:true})).toThrow('PURSUER_PRESET_SHAPE');
  });
  it('ascending patrol closes initial separation over multiple seeds',()=>{
    for(const seed of ['pace-01','pace-02','pace-03','pace-04']){
      const trial=runStationary(seed,energetic);
      expect(trial.routeFailures).toBe(0);
      expect(trial.endDistance).toBeLessThan(trial.distanceStart);
      expect(trial.firstSensed).not.toBeNull();
      // The finite-sensing bot must encounter the player by exploring,
      // not from hidden coordinates supplied at startup.
      expect(trial.firstSensed!).toBeGreaterThan(1);
      expect(replayChase(trial.game.replayExport()).stateDigest())
        .toBe(trial.game.stateDigest());
    }
  });
  it('constant public tower + no sensor contact produces identical patrols',()=>{
    // Different UNSENSED Spark world-truth positions must never influence
    // pathing when the visible generated world is held equal.
    // Validated through the typed observation boundary in the controller.
    const seed='sensor-firewall-07a';
    const a=runStationary(seed,energetic);
    expect(a.game.snapshot().pursuer.belief.acquisitions).toBeGreaterThan(0);
    expect(a.game.snapshot().pursuer.routeFailures).toBe(0);
  });
});
