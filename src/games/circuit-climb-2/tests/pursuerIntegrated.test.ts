/**
 * CC2-02B real autonomous chase integration: no fake brain mocks, no manual
 * selection of a correct answer by the pursuer, no scripted captures.
 */
import { describe,it,expect } from 'vitest';
import { CircuitClimbChaseCore,replayChase } from '../pursuer/CircuitClimbChaseCore';
import { CircuitClimbCore } from '../core/CircuitClimbCore';
import { defaultRunConfig } from '../config/runConfig';
import { defaultPursuerPreset } from '../pursuer/pursuerPreset';

describe('CC2-02B integrated source-owned chase',()=>{
  it('eventually finds a stationary visible learner and captures by physical overlap',()=>{
    const game=new CircuitClimbChaseCore('stationary-learner');
    game.advanceTicks(1200);
    const state=game.snapshot();
    expect(state.pursuer.belief.acquisitions).toBeGreaterThan(0);
    expect(state.pursuer.activeSensedTicks).toBeGreaterThan(0);
    expect(state.learner.endReason).toBe('CAPTURED');
    expect(game.eventLog().filter(e=>e.type==='RUN_ENDED')).toHaveLength(1);
    expect(state.pursuer.routeFailures).toBe(0);
  });

  it('Practice bot visibly pursues without capturing or affecting mathematics',()=>{
    const game=new CircuitClimbChaseCore('practice-chase',
      {...defaultRunConfig(),mode:'practice'});
    game.advanceTicks(900);
    expect(game.snapshot().pursuer.belief.acquisitions).toBeGreaterThan(0);
    expect(game.snapshot().learner.phase).toBe('ready');
    expect(game.eventLog().filter(e=>e.type==='ATTEMPT_EVALUATED')).toHaveLength(0);
  });

  it('shield still protects the actual learner during automatic travel',()=>{
    const game=new CircuitClimbChaseCore('shield-chase');
    const p=game.snapshot().learner.currentProblem;
    expect(game.selectPlatform(p.correctPlatformId).ok).toBe(true);
    for(let i=0;i<8;i++){
      game.advanceTicks(1);
      expect(game.snapshot().learner.endReason).toBeNull();
    }
    expect(game.snapshot().learner.phase).toBe('outbound');
  });

  it('autonomous capture checks do not append fake CAPTURE_TEST replay inputs',()=>{
    const game=new CircuitClimbChaseCore('replay-no-probes',
      {...defaultRunConfig(),mode:'practice'});
    game.advanceTicks(200);
    expect(game.replayExport().commands).toHaveLength(0);
    expect(game.eventLog().filter(e=>e.type==='ATTEMPT_EVALUATED')).toHaveLength(0);
  });

  it('pause freezes learner and brain, resume continues and restart clears belief',()=>{
    const game=new CircuitClimbChaseCore('freeze');
    game.advanceTicks(60);
    game.pause();
    const saved=game.snapshot();
    game.advanceTicks(100);
    expect(game.snapshot()).toEqual(saved);
    game.resume();
    game.advanceTicks(1);
    expect(game.snapshot().learner.tick).toBe(saved.learner.tick+1);
    game.restart();
    expect(game.snapshot().pursuer.ticks).toBe(0);
    expect(game.snapshot().pursuer.belief.acquisitions).toBe(0);
    expect(game.snapshot().learner.completedRows).toBe(0);
  });

  it('same learner commands and seed reconstruct same bot decisions and capture',()=>{
    const game=new CircuitClimbChaseCore('golden-chase',
      {...defaultRunConfig(),mode:'practice'});
    game.advanceTicks(20);
    const first=game.learnerSnapshot().currentProblem;
    game.selectPlatform(first.correctPlatformId);
    game.advanceTicks(100);
    game.pause();game.advanceTicks(10);game.resume();
    game.advanceTicks(200);
    const replay=game.replayExport();
    const copy=replayChase(replay);
    expect(copy.stateDigest()).toBe(game.stateDigest());
    expect(copy.eventLog()).toEqual(game.eventLog());
    expect(copy.diagnostics()).toEqual(game.diagnostics());
  });

  it('direct capture authority is same in 02A and 02B; prior overlap wins',()=>{
    const core=new CircuitClimbCore('physical-overlap');
    const point=core.snapshot().spark;
    expect(core.adjudicatePursuerCapture(point.x,point.y,10)).toBe(true);
    expect(core.snapshot().endReason).toBe('CAPTURED');
    expect(core.adjudicatePursuerCapture(point.x,point.y,10)).toBe(false);
    expect(core.eventLog().filter(e=>e.type==='RUN_ENDED')).toHaveLength(1);
  });
});
