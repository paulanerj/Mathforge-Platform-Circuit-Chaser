/**
 * CC2-34 — Relay source authority and creature arbitration tests.
 *
 * Actual math problems, platform identities, and completed-row receipts are
 * taken from CircuitClimbCore. No simulated "correct answers" are invented.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {
  CreatureEncounterArbiter,RelayGuidanceDirector,DEFAULT_ECOLOGY_POLICY,
} from '../features/creatureEcologyRelay34';

const core=()=>new CircuitClimbCore('relay34-seed',{
  ...defaultRunConfig(),mode:'practice',
});

describe('CC2-34 single encounter eligibility',()=>{
  it('has a conservative roster and enforces one concurrent interactive encounter',()=>{
    const engine=core(),s=engine.snapshot();
    const guard=new CreatureEncounterArbiter(s.runId);
    expect(DEFAULT_ECOLOGY_POLICY.available)
      .toEqual(['MOLASSES_GUARDIAN','RELAY']);
    expect(guard.offer('MOLASSES_GUARDIAN',s)).toEqual({
      accepted:true,species:'MOLASSES_GUARDIAN'});
    expect(guard.offer('RELAY',s)).toEqual({
      accepted:false,reason:'ENCOUNTER_BUSY'});
    expect(guard.release('RELAY')).toBe(false);
    expect(guard.release('MOLASSES_GUARDIAN')).toBe(true);
    expect(guard.offer('RELAY',s)).toEqual({
      accepted:true,species:'RELAY'});
    expect(guard.offer('PRISM_SHUFFLER',s)).toEqual({
      accepted:false,reason:'NOT_ENABLED'});
  });
  it('rejects cross-run interactions and clears the previous run on reset',()=>{
    const engine=core(),s=engine.snapshot();
    const guard=new CreatureEncounterArbiter(s.runId);
    expect(guard.offer('RELAY',{...s,runId:'wrong'})).toEqual({
      accepted:false,reason:'INVALID_RUN'});
    expect(guard.offer('RELAY',{...s,phase:'ended'})).toEqual({
      accepted:false,reason:'RUN_ENDED'});
    expect(guard.offer('RELAY',s).accepted).toBe(true);
    guard.reset('second-run');
    expect(guard.snapshot()).toEqual({runId:'second-run',occupied:null});
  });
});

describe('CC2-34 relay genuinely source-owned four-row guidance',()=>{
  it('shows only the active source-validated platform; no fabricated future IDs',()=>{
    const engine=core(),s=engine.snapshot();
    const relay=new RelayGuidanceDirector(s,4);
    const a=relay.advance(s);
    expect(a.mode).toBe('GUIDED_ACTIVE_ROW');
    expect(a.rowsRemaining).toBe(4);
    expect(a.currentPlatformId).toBe(s.currentProblem.correctPlatformId);
    expect(a.currentProblemId).toBe(s.currentProblem.problemId);
    expect(a.solvedGuidedRows).toBe(0);
    expect(relay.advance(s)).toEqual(a);
    expect(()=>relay.advance({...s,runId:'other'}))
      .toThrow('RELAY_RUN_ISOLATION');
    expect(()=>new RelayGuidanceDirector(s,9))
      .toThrow('RELAY_ROWS_BOUNDS');
    expect(()=>new RelayGuidanceDirector({...s,phase:'outbound'}))
      .toThrow('RELAY_START_REQUIRES_READY');
  });
  it('never claims progress until actual core confirms a row completion',()=>{
    const engine=core(),s0=engine.snapshot();
    const relay=new RelayGuidanceDirector(s0);
    const selection=engine.selectPlatform(s0.currentProblem.correctPlatformId);
    expect(selection).toMatchObject({ok:true,correct:true});
    const travelling=engine.snapshot();
    expect(relay.advance(travelling)).toMatchObject({
      mode:'WAITING_FOR_NEXT_ROW',rowsRemaining:4,
      currentPlatformId:null});
    engine.advanceTicks(1000);
    const s1=engine.snapshot();
    expect(s1.completedRows).toBe(1);
    expect(relay.advance(s1)).toMatchObject({
      mode:'GUIDED_ACTIVE_ROW',rowsRemaining:3,solvedGuidedRows:1,
      currentPlatformId:s1.currentProblem.correctPlatformId});
    expect(relay.advance(s1).rowsRemaining).toBe(3);
    expect(s1.solved).toHaveLength(1);
    expect(s1.correctAttempts).toBe(1);
  });
  it('never changes primary math, clock, score or solution ledger merely by looking',()=>{
    const engine=core(),initialDigest=engine.stateDigest(),s=engine.snapshot();
    const relay=new RelayGuidanceDirector(s);
    for(let i=0;i<150;i++)relay.advance(engine.snapshot());
    expect(engine.stateDigest()).toBe(initialDigest);
    expect(engine.snapshot().score).toBe(0);
    expect(engine.snapshot().attempts).toBe(0);
  });
});
