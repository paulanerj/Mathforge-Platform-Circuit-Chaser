/**
 * CC2-22 — Extension architecture qualification.
 *
 * These tests intentionally use the ACTUAL CC2 mathematical engine to prove
 * that advisory extension discovery cannot alter the source-of-truth state.
 * No new enemy, power-up, hazard, or mathematical rule is activated here.
 */
import {describe, it, expect} from 'vitest';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';
import {
  CC2_EXTENSION_FRAME_SCHEMA,
  CC2_EXTENSION_SCHEMA,
  validateExtensionDefinition,
  validateExtensionFrame,
} from './extensionContracts';
import {
  CC2_22_PRODUCTION_EXTENSIONS,
  ExtensionRegistryV1,
  proposedExtensionCatalog,
} from './extensionRegistry';

const frame = () => ({
  schema: CC2_EXTENSION_FRAME_SCHEMA,
  runId: 'cc2/test/run-1',
  tick: 120,
  phase: 'ready',
  mode: 'climb',
  completedRows: 12,
  signal: {source: 'SIGHT', observedTick: 119, x: 304, y: -150},
});

const definition = () => ({
  schema: CC2_EXTENSION_SCHEMA,
  id: 'scout', kind: 'ENEMY',
  visualToken: 'enemy-scout', priority: 20, minCompletedRows: 4,
  sensorPolicy: 'DETECTED_ONLY', enabledByDefault: false,
});

describe('CC2-22 extension information firewall', () => {
  it('accepts an exact, finite, run-scoped public sensor frame', () => {
    expect(validateExtensionFrame(frame())).toEqual(frame());
  });

  it.each(['currentProblem', 'correctPlatformId', 'spark', 'world',
    'futureRow', 'nextRoute', 'score', 'answerIndex'])(
    'rejects leaked/private frame field: %s', (field) => {
      expect(() => validateExtensionFrame({...frame(), [field]: 7}))
        .toThrow('CC2_EXT_FRAME_FIELDS');
    });

  it('rejects hidden private answer and sensor fields', () => {
    expect(() => validateExtensionFrame({
      ...frame(), signal: {...frame().signal, correctPlatformId: 'C'},
    })).toThrow('CC2_EXT_SIGNAL_FIELDS');
    expect(() => validateExtensionFrame({
      ...frame(), signal: {...frame().signal, actualSparkX: 200},
    })).toThrow('CC2_EXT_SIGNAL_FIELDS');
  });

  it('rejects stale wakes, future sensing and impossible coordinates', () => {
    expect(() => validateExtensionFrame({
      ...frame(), signal: {source:'WAKE',observedTick: -200,x:0,y:0},
    })).toThrow('CC2_EXT_SIGNAL_INVALID');
    expect(() => validateExtensionFrame({
      ...frame(), signal: {source:'WAKE',observedTick:0,x:0,y:0},
      tick: 241,
    })).toThrow('CC2_EXT_STALE_WAKE');
    expect(() => validateExtensionFrame({
      ...frame(), signal: {source:'NEAR',observedTick:121,x:0,y:0},
    })).toThrow('CC2_EXT_SIGNAL_INVALID');
    for (const x of [NaN, Infinity, -Infinity, 1e12]) {
      expect(() => validateExtensionFrame({
        ...frame(), signal: {...frame().signal, x},
      })).toThrow('CC2_EXT_SIGNAL_INVALID');
    }
  });

  it('rejects malformed or negative ticks, oversized rows and invalid mode', () => {
    expect(() => validateExtensionFrame({...frame(),tick:-1}))
      .toThrow('CC2_EXT_FRAME_TICK_OR_ROWS');
    expect(() => validateExtensionFrame({...frame(),completedRows:10001}))
      .toThrow('CC2_EXT_FRAME_TICK_OR_ROWS');
    expect(() => validateExtensionFrame({...frame(),mode:'admin'}))
      .toThrow('CC2_EXT_FRAME_PHASE_OR_MODE');
    expect(() => validateExtensionFrame({...frame(),schema:'cc2-extension-frame/v2'}))
      .toThrow('CC2_EXT_FRAME_SCHEMA');
  });

  it('does not mutate caller input during validation', () => {
    const source=frame(),copy=structuredClone(source);
    const validated=validateExtensionFrame(source);
    (validated.signal as {x:number}).x=1;
    expect(source).toEqual(copy);
  });
});

describe('CC2-22 extensibility and fail-closed defaults', () => {
  it('accepts one valid opt-in contract with strict version', () => {
    expect(validateExtensionDefinition(definition())).toEqual(definition());
    expect(() => validateExtensionDefinition({...definition(),schema:'cc2-extension/v2'}))
      .toThrow('CC2_EXT_SCHEMA');
  });

  it('rejects unapproved default-on extensions', () => {
    expect(() => validateExtensionDefinition({...definition(),enabledByDefault:true}))
      .toThrow('CC2_EXT_MUST_DEFAULT_DISABLED');
  });

  it('rejects sensing for non-enemy roles', () => {
    expect(() => validateExtensionDefinition({
      ...definition(),kind:'HAZARD',sensorPolicy:'DETECTED_ONLY',
    })).toThrow('CC2_EXT_ONLY_ENEMY_USES_SENSING');
  });

  it('rejects unexpected definition fields and duplicate IDs', () => {
    expect(() => validateExtensionDefinition({...definition(),correctAnswer:12}))
      .toThrow('CC2_EXT_DEFINITION_FIELDS');
    const registry=new ExtensionRegistryV1();
    registry.register(definition());
    expect(() => registry.register(definition())).toThrow('CC2_EXT_DUPLICATE_ID');
  });

  it('keeps every future capability disabled in the accepted game', () => {
    expect(CC2_22_PRODUCTION_EXTENSIONS.enabledIds).toEqual([]);
    expect(Object.isFrozen(CC2_22_PRODUCTION_EXTENSIONS.enabledIds)).toBe(true);
    expect(CC2_22_PRODUCTION_EXTENSIONS.appliesToGameplay).toBe(false);
    const registry=proposedExtensionCatalog();
    expect(registry.qualify(frame())).toEqual([]);
  });

  it('returns a deterministic, advisory-only order for explicitly named IDs', () => {
    const registry=proposedExtensionCatalog();
    const enabled=['overload','sentry','scout','insulation','stabilizer'];
    const values=registry.qualify(frame(),enabled);
    expect(values.map(v=>v.extensionId))
      .toEqual(['stabilizer','scout','sentry','insulation','overload']);
    expect(values.every(v=>v.advisoryOnly&&v.runId===frame().runId&&
      v.tick===frame().tick)).toBe(true);
    expect(registry.qualify(structuredClone(frame()),[...enabled])).toEqual(values);
  });

  it('rejects unknown, duplicate or malformed enabled IDs', () => {
    const r=proposedExtensionCatalog();
    expect(()=>r.qualify(frame(),['dragon'])).toThrow('CC2_EXT_ENABLE_UNKNOWN');
    expect(()=>r.qualify(frame(),['scout','scout']))
      .toThrow('CC2_EXT_DUPLICATE_ENABLE');
  });

  it('will never propose Scout or Sentry without finite observed signal', () => {
    const r=proposedExtensionCatalog();
    const without={...frame(),signal:null};
    const results=r.qualify(without,['scout','sentry','stabilizer']);
    expect(results.map(v=>v.extensionId)).toEqual(['stabilizer']);
  });

  it('waits for public completed-row thresholds and ignores future rows', () => {
    const r=proposedExtensionCatalog();
    const low={...frame(),completedRows:3};
    expect(r.qualify(low,['scout','sentry','stabilizer','overload']))
      .toEqual([]);
    const four={...frame(),completedRows:4};
    expect(r.qualify(four,['scout','sentry','stabilizer','overload'])
      .map(v=>v.extensionId)).toEqual(['stabilizer','scout']);
  });

  it('does not propose encounters in practice or after an ended run', () => {
    const r=proposedExtensionCatalog(),ids=['scout','overload'];
    expect(r.qualify({...frame(),mode:'practice'},ids)).toEqual([]);
    expect(r.qualify({...frame(),phase:'ended'},ids)).toEqual([]);
  });

  it('returns detached arrays and catalog objects, not mutable references', () => {
    const r=proposedExtensionCatalog();
    const a=r.definitions();
    (a[0] as {visualToken:string}).visualToken='wrong';
    expect(r.definitions()[0].visualToken).not.toBe('wrong');
    const first=r.qualify(frame(),['scout']);
    (first[0] as {extensionId:string}).extensionId='wrong';
    expect(r.qualify(frame(),['scout'])[0].extensionId).toBe('scout');
  });

  it('is invariant to registration order and independent concurrent callers', () => {
    const a=new ExtensionRegistryV1(),b=new ExtensionRegistryV1();
    const d=definition(),other={...d,id:'scout-b',priority:20};
    a.register(d);a.register(other);
    b.register(other);b.register(d);
    expect(a.qualify(frame(),['scout-b','scout'])).toEqual(
      b.qualify(frame(),['scout','scout-b']));
    expect(a.qualify({...frame(),runId:'run-A'},['scout'])[0].runId)
      .toBe('run-A');
    expect(b.qualify({...frame(),runId:'run-B'},['scout'])[0].runId)
      .toBe('run-B');
  });
});

describe('CC2-22 accepted core noninterference', () => {
  it.each(['add20','makeTarget20','skip2to10'] as const)(
    'extension discovery cannot affect real %s source core', curriculum => {
      for(let i=0;i<6;i++){
        const c=new CircuitClimbCore('cc2-22-source-'+curriculum+'-'+i,
          {...defaultRunConfig(),mode:'practice',curriculum});
        const r=proposedExtensionCatalog();
        const first=c.stateDigest(),snapshot=c.snapshot(),events=c.eventLog();
        const publicFrame={...frame(),
          runId:snapshot.runId,tick:snapshot.tick,
          phase:snapshot.phase,mode:'practice',
          completedRows:snapshot.completedRows,signal:null};
        for(let k=0;k<50;k++){
          expect(r.qualify(publicFrame,['scout','stabilizer'])).toEqual([]);
        }
        expect(c.stateDigest()).toBe(first);
        expect(c.snapshot()).toEqual(snapshot);
        expect(c.eventLog()).toEqual(events);
        const answer=c.snapshot().currentProblem.correctPlatformId;
        expect(c.selectPlatform(answer)).toMatchObject({ok:true,correct:true});
        let count=0;
        while(c.snapshot().completedRows===0&&count++<400)c.advanceTicks(1);
        expect(c.snapshot().completedRows).toBe(1);
        expect(c.snapshot().solved).toHaveLength(1);
        expect(c.snapshot().attempts).toBe(1);
      }
    },
  );
});
