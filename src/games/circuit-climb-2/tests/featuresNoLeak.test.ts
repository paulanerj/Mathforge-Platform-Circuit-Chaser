/**
 * Regression: modifiers and feature descriptions are row-wide, independent
 * of which numbered platform is mathematically correct.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {FeatureProgression,defaultFeatureConfig,modifierForRow} from '../features/progression';
describe('CC2-03 answer-leak and replay isolation',()=>{
  it('the same row modifier applies to all three unequal operands over 50 seeds',()=>{
    const c=defaultFeatureConfig();
    for(let i=0;i<50;i++){
      const game=new CircuitClimbCore('no-leak-'+i);
      const problem=game.snapshot().currentProblem;
      const rowModifier=modifierForRow(problem.rowIndex,c);
      const labels=problem.options.map(()=>rowModifier);
      expect(new Set(labels).size).toBe(1);
      expect(problem.options.filter(p=>p.platformId===problem.correctPlatformId))
        .toHaveLength(1);
    }
  });
  it('a wrong answer cannot earn charge or a relay milestone',()=>{
    const game=new CircuitClimbCore('wrong-no-reward',defaultRunConfig());
    const features=new FeatureProgression();
    features.consume(game.eventLog());
    const p=game.snapshot().currentProblem;
    const bad=p.options.find(o=>o.platformId!==p.correctPlatformId)!;
    game.selectPlatform(bad.platformId);
    game.advanceTicks(300);
    features.consume(game.eventLog());
    expect(game.snapshot().wrongAttempts).toBe(1);
    expect(features.snapshot(game.snapshot().tick,'climb','ready',false).charge).toBe(0);
    expect(features.eventLog()).toHaveLength(0);
  });
});
