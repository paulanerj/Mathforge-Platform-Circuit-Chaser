/**
 * CC2-34C: real mathematical challenge authority for earned Relay guidance.
 *
 * Uses an authentic deterministic learner core. No DOM and no visual timing
 * claims; all guide charges are counted from actual completedRows.
 */
import {describe,it,expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {CreatureEncounterArbiter} from '../features/creatureEcologyRelay34';
import {
  RelayWeaverDirector,DEFAULT_RELAY_CREATURE_CONFIG,
  validateRelayConfig,
} from '../features/relayWeaverCreature34C';

function fixture(){
  const core=new CircuitClimbCore('cc2-34c-fixture',
    {...defaultRunConfig(),mode:'challenge'});
  const arbiter=new CreatureEncounterArbiter(core.snapshot().runId);
  const relay=new RelayWeaverDirector('cc2-34c-fixture',
    core.snapshot().runId,arbiter);
  return {core,arbiter,relay};
}
function climbOnce(core:CircuitClimbCore){
  const initial=core.snapshot();
  expect(core.selectPlatform(initial.currentProblem.correctPlatformId))
    .toMatchObject({ok:true,correct:true});
  core.advanceTicks(2000);
  expect(core.snapshot().completedRows).toBe(initial.completedRows+1);
}
const answer=(relay:RelayWeaverDirector,core:CircuitClimbCore)=>{
  const q=relay.snapshot(core.snapshot()).question!;
  return q.sequence[2]+q.sequence[1]-q.sequence[0];
};
describe('CC2-34C earned Relay Weaver source contract',()=>{
  it('starts dormant, spawns after real row, and uses independent seeded passkey',()=>{
    const {core,relay}=fixture();
    const initial=core.stateDigest();
    relay.advance(core.snapshot());
    expect(relay.snapshot().phase).toBe('DORMANT');
    climbOnce(core);
    relay.advance(core.snapshot());
    expect(relay.snapshot().phase).toBe('AVAILABLE');
    const digest=core.stateDigest();
    expect(relay.offer(core.snapshot())).toEqual({ok:true});
    const question=relay.snapshot(core.snapshot()).question!;
    expect(question.options).toHaveLength(3);
    expect(new Set(question.options).size).toBe(3);
    expect(question.options).toContain(answer(relay,core));
    expect(core.stateDigest()).toBe(digest);
    expect(initial).not.toBe(digest);
  });
  it('requires independent correct math, then guides exactly four real rows',()=>{
    const {core,relay}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    relay.offer(core.snapshot());
    const before=core.snapshot(),digest=core.stateDigest();
    expect(relay.answer(core.snapshot(),answer(relay,core)))
      .toEqual({ok:true,correct:true});
    expect(relay.snapshot(core.snapshot()).phase).toBe('GUIDING');
    expect(core.stateDigest()).toBe(digest);
    expect(core.snapshot().solved).toEqual(before.solved);
    for(let row=1;row<=4;row++){
      climbOnce(core);
      relay.advance(core.snapshot());
      const snap=relay.snapshot(core.snapshot());
      expect(snap.guidance?.solvedGuidedRows).toBe(row);
      expect(snap.receipts.filter(r=>r.type==='GUIDED_ROW_COMPLETED'))
        .toHaveLength(row);
    }
    const result=relay.snapshot(core.snapshot());
    expect(result.phase).toBe('COOLDOWN');
    expect(result.receipts.filter(r=>r.type==='GUIDANCE_FINISHED'))
      .toHaveLength(1);
    expect(core.snapshot().solved).toHaveLength(5);
    relay.advance(core.snapshot());
    expect(relay.snapshot(core.snapshot()).receipts
      .filter(r=>r.type==='GUIDANCE_FINISHED')).toHaveLength(1);
  });
  it('keeps snapshots observational until the source advance emits row receipts',()=>{
    const {core,relay}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    expect(relay.offer(core.snapshot()).ok).toBe(true);
    expect(relay.answer(core.snapshot(),answer(relay,core)).correct).toBe(true);
    const before=relay.snapshot(core.snapshot());
    expect(before.guidance?.solvedGuidedRows).toBe(0);
    climbOnce(core);
    // Rendering and diagnostics may read repeatedly before the next source tick.
    for(let i=0;i<5;i++){
      const view=relay.snapshot(core.snapshot());
      expect(view.guidance?.solvedGuidedRows).toBe(0);
      expect(view.receipts.filter(r=>r.type==='GUIDED_ROW_COMPLETED'))
        .toHaveLength(0);
    }
    relay.advance(core.snapshot());
    const after=relay.snapshot(core.snapshot());
    expect(after.guidance?.solvedGuidedRows).toBe(1);
    expect(after.receipts.filter(r=>r.type==='GUIDED_ROW_COMPLETED'))
      .toHaveLength(1);
    relay.advance(core.snapshot());
    expect(relay.snapshot(core.snapshot()).receipts
      .filter(r=>r.type==='GUIDED_ROW_COMPLETED')).toHaveLength(1);
  });
  it('never grants guidance on a failed/declined optional challenge',()=>{
    const {core,relay}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    relay.offer(core.snapshot());
    const correct=answer(relay,core);
    const wrong=relay.snapshot(core.snapshot()).question!.options
      .find(n=>n!==correct)!;
    expect(relay.answer(core.snapshot(),wrong))
      .toEqual({ok:true,correct:false});
    expect(relay.snapshot().phase).toBe('COOLDOWN');
    expect(relay.snapshot().guidance).toBeNull();
    expect(core.snapshot().score).toBeGreaterThan(0);
  });
  it('respects exclusive creature targets while Molasses is interacting',()=>{
    const {core,relay,arbiter}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    expect(arbiter.offer('MOLASSES_GUARDIAN',core.snapshot()).accepted)
      .toBe(true);
    expect(relay.offer(core.snapshot()))
      .toMatchObject({ok:false,reason:'ENCOUNTER_BUSY'});
    expect(arbiter.release('MOLASSES_GUARDIAN')).toBe(true);
    expect(relay.offer(core.snapshot())).toEqual({ok:true});
    expect(relay.decline(core.snapshot())).toBe(true);
    expect(arbiter.snapshot().occupied).toBeNull();
  });
  it('expires on logical source ticks and freezes while paused',()=>{
    const {core,relay}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    relay.offer(core.snapshot());
    const expiry=relay.snapshot().question!.deadlineTick;
    core.pause();
    core.advanceTicks(1000);
    relay.advance(core.snapshot());
    expect(relay.snapshot().phase).toBe('QUESTION');
    core.resume();
    core.advanceTicks(expiry-core.snapshot().tick);
    relay.advance(core.snapshot());
    expect(relay.snapshot().phase).toBe('COOLDOWN');
    expect(relay.snapshot().receipts.filter(r=>r.type==='GATE_EXPIRED'))
      .toHaveLength(1);
  });
  it('arms guidance after travel without modifying the physical Spark route',()=>{
    const {core,relay}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    relay.offer(core.snapshot());
    const next=core.snapshot().currentProblem.correctPlatformId;
    core.selectPlatform(next);
    expect(core.snapshot().phase).toBe('outbound');
    const digest=core.stateDigest();
    expect(relay.answer(core.snapshot(),answer(relay,core))).toEqual({
      ok:true,correct:true,
    });
    expect(relay.snapshot().phase).toBe('ARMED');
    expect(core.stateDigest()).toBe(digest);
    core.advanceTicks(1000);
    relay.advance(core.snapshot());
    expect(relay.snapshot().phase).toBe('GUIDING');
  });
  it('releases exclusive creature interaction on terminal source state',()=>{
    const {core,relay,arbiter}=fixture();
    climbOnce(core);relay.advance(core.snapshot());
    expect(relay.offer(core.snapshot())).toEqual({ok:true});
    expect(arbiter.snapshot().occupied).toBe('RELAY');
    // Terminal state is source authoritative, even if the presentation
    // controller never receives a separate terminate() call.
    const ended={...core.snapshot(),phase:'ended' as const};
    relay.advance(ended);
    expect(arbiter.snapshot().occupied).toBeNull();
    expect(relay.snapshot().question).toBeNull();
    expect(relay.snapshot().phase).toBe('COOLDOWN');
    relay.advance(ended);
    expect(arbiter.snapshot().occupied).toBeNull();
    expect(relay.snapshot().receipts.filter(r=>r.type==='GATE_EXPIRED'))
      .toHaveLength(0);
  });
  it('fails closed on invalid input and resets without leaking old run',()=>{
    const {core,relay,arbiter}=fixture();
    expect(()=>validateRelayConfig({...DEFAULT_RELAY_CREATURE_CONFIG,
      windowTicks:0})).toThrow('CC2_RELAY_CONFIG_RANGE_windowTicks');
    climbOnce(core);relay.advance(core.snapshot());
    relay.offer(core.snapshot());
    const runId=core.snapshot().runId;
    expect(()=>relay.advance({...core.snapshot(),runId:'other'}))
      .toThrow('CC2_RELAY_RUN_ISOLATION');
    expect(relay.answer(core.snapshot(),9999).ok).toBe(false);
    core.restart();
    relay.reset(core.snapshot().runId);
    expect(relay.snapshot().phase).toBe('DORMANT');
    expect(relay.snapshot().receipts).toHaveLength(0);
    expect(arbiter.snapshot().runId).not.toBe(runId);
    expect(arbiter.snapshot().occupied).toBeNull();
  });
});
