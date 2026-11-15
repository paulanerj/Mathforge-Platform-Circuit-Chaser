/**
 * CC2-22 — Real-engine host evidence and terminal ledger boundaries.
 *
 * Tests do NOT connect to the Gen2 SDK. They prove that any future host
 * adapter receives only truthful, source-owned attempt/landing outcomes.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbChaseCore} from '../pursuer/CircuitClimbChaseCore';
import {defaultRunConfig} from '../config/runConfig';
import {projectHostNeutralEvidence} from './hostEvidenceBoundary';

function completedPractice():CircuitClimbChaseCore {
  const game=new CircuitClimbChaseCore('cc2-22-host-proof',
    {...defaultRunConfig(),mode:'practice'});
  for(let row=1;row<=4;row++){
    const correct=game.learnerSnapshot().currentProblem.correctPlatformId;
    expect(game.selectPlatform(correct)).toMatchObject({ok:true,correct:true});
    let ticks=0;
    while(game.learnerSnapshot().completedRows<row&&ticks++<400)
      game.advanceTicks(1);
    expect(game.learnerSnapshot().completedRows).toBe(row);
  }
  expect(game.learnerSnapshot().endReason).toBe('PRACTICE_GOAL');
  return game;
}

describe('CC2-22 host-neutral evidence port',()=>{
  it('exports real physically landed practice equations, no host reward',()=>{
    const game=completedPractice();
    const r=game.runSummary();
    const receipt=projectHostNeutralEvidence(r,game.eventLog());
    expect(receipt.gameplayOutcome).toBe('PRACTICE_GOAL');
    expect(receipt.completedRows).toBe(4);
    expect(receipt.solvedEquations).toHaveLength(4);
    expect(receipt.correctAttempts).toBe(4);
    expect(receipt.wrongAttempts).toBe(0);
    expect(receipt.masteryInference).toBe(false);
    expect(receipt.hostRewardGranted).toBe(false);
    expect(receipt.terminalEventId).toBeTruthy();
    expect(new Set(receipt.solvedEquations.map(e=>e.attemptId)).size).toBe(4);
  });

  it('does not publish evidence for a run that has not ended',()=>{
    const game=new CircuitClimbChaseCore('cc2-22-open-run');
    expect(()=>projectHostNeutralEvidence(game.runSummary(),game.eventLog()))
      .toThrow('CC2_HOST_REQUIRES_AUTHORITATIVE_TERMINAL');
  });

  it('keeps a capture outcome separate from wrong mathematical answers',()=>{
    const game=new CircuitClimbChaseCore('cc2-22-capture-proof');
    game.advanceTicks(1500);
    expect(game.learnerSnapshot().endReason).toBe('CAPTURED');
    const receipt=projectHostNeutralEvidence(game.runSummary(),game.eventLog());
    expect(receipt.gameplayOutcome).toBe('CAPTURED');
    expect(receipt.wrongAttempts).toBe(0);
    expect(receipt.solvedEquations).toHaveLength(0);
    expect(receipt.masteryInference).toBe(false);
    expect(receipt.hostRewardGranted).toBe(false);
  });

  it('rejects counterfeit terminal reason and duplicate end receipts',()=>{
    const game=completedPractice();
    const r=game.runSummary(),ledger=game.eventLog();
    expect(()=>projectHostNeutralEvidence(
      {...r,endReason:'CAPTURED'},ledger,
    )).toThrow('CC2_HOST_TERMINAL_LEDGER_MISMATCH');
    const end=ledger.find(e=>e.type==='RUN_ENDED')!;
    expect(()=>projectHostNeutralEvidence(r,[...ledger,end]))
      .toThrow('CC2_HOST_TERMINAL_LEDGER_MISMATCH');
  });

  it('rejects fabricated rows, wrong math, and phantom attempt counts',()=>{
    const game=completedPractice(),r=game.runSummary(),ledger=game.eventLog();
    expect(()=>projectHostNeutralEvidence(
      {...r,rowsSolved:5},ledger,
    )).toThrow('CC2_HOST_SOURCE_ACCOUNTING_MISMATCH');
    expect(()=>projectHostNeutralEvidence(
      {...r,correctAttempts:99},ledger,
    )).toThrow('CC2_HOST_SOURCE_ACCOUNTING_MISMATCH');
    expect(()=>projectHostNeutralEvidence(
      {...r,equations:[...r.equations,{...r.equations[0],attemptId:'ghost'}]},
      ledger,
    )).toThrow('CC2_HOST_SOURCE_ACCOUNTING_MISMATCH');
    expect(()=>projectHostNeutralEvidence(
      {...r,equations:[{...r.equations[0],attemptId:'ghost'},...r.equations.slice(1)]},
      ledger,
    )).toThrow('CC2_HOST_UNVERIFIED_SOLVED_EQUATION');
  });

  it('does not share mutable solved-equation arrays with the game',()=>{
    const game=completedPractice(),before=game.stateDigest();
    const report=game.runSummary();
    const receipt=projectHostNeutralEvidence(report,game.eventLog());
    (receipt.solvedEquations as Array<{equation:string}>)[0].equation='forged';
    expect(game.stateDigest()).toBe(before);
    expect(game.runSummary().equations[0].equation).not.toBe('forged');
  });

  it('is deterministic for repeated projection of the same source ledger',()=>{
    const game=completedPractice(),r=game.runSummary(),e=game.eventLog();
    const one=projectHostNeutralEvidence(r,e);
    const two=projectHostNeutralEvidence(r,e);
    expect(one).toEqual(two);
  });
});
