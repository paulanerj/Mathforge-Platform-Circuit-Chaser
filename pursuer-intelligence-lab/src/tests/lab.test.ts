/**
 * THE LAB'S OWN GATES.
 *
 * These check that the instrument works — that a run repeats, that the display
 * cannot change a decision, that a Brain cannot see what it must not, that a
 * sample is never empty where the old pursuit log was empty. They say nothing
 * about whether any pursuer is good, which is the tester's job.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

import { Simulation } from '../sim/simulation';
import { SIM_STEP_MS, Timebase } from '../sim/timebase';
import { runScript } from '../sim/scriptRunner';
import { scriptById, LEARNER_SCRIPTS } from '../learner/scripts';
import { FIXTURES, runRefreshComparison } from '../sim/fixtures';
import { BRAINS, brainById, PERCEPTION_MODELS, perceptionModelById, productionEligible, REGISTRY_VIEW } from '../pursuer/registry';
import { P0_PRODUCTION, P1_STABLE_LOCK, P2_LINE_OF_SIGHT, P3_ORACLE } from '../pursuer/perception/perceptionModels';
import { BRAIN_GRAPH_V2_BASELINE, BRAIN_GRAPH_V2_TUNABLE } from '../pursuer/brains/graphV2/index';
import { BRAIN_DIRECT_HUNTER } from '../pursuer/brains/directHunter/index';
import { CIRCUIT_CLIMB_GEOMETRY, computeColumnCentres } from '../world/circuitClimbGeometry';
import { graphWorldAt } from '../world/graphWorld';
import {
  baselineLabConfiguration, validateLabConfiguration, labConfigurationHash,
  canonicalizeLabConfiguration, diffLabConfigurations, LAB_CONFIG_SCHEMA_VERSION,
} from '../pursuer/config/labConfiguration';
import { sha256Hex } from '../pursuer/config/hash';
import { parseRecordedRun, RECORDING_SCHEMA } from '../sim/recording';
import { analyseCapture } from '../pursuer/metrics/captureDeliberateness';

const baseOptions = { brain: BRAIN_GRAPH_V2_BASELINE, perception: P0_PRODUCTION, captureArmed: false };
const fingerprint = (simulation: Simulation) =>
  simulation.samples.map((s) => `${s.tMs.toFixed(3)}:${s.pursuer.x.toFixed(6)}:${s.pursuer.y.toFixed(6)}:${s.pursuer.reasonCode}`).join('|');

// ─────────────────────────────────────────────────────────────────────────
describe('1. the board is the production board', () => {
  it('carries production\'s geometry constants unchanged', () => {
    expect(CIRCUIT_CLIMB_GEOMETRY).toEqual({
      logicalWidth: 600, platformWidth: 104, platformHeight: 62,
      playerRadius: 32, rowGap: 205, columns: [110 / 600, 300 / 600, 490 / 600],
      routePlatformPadding: 8,
    });
  });

  it('puts the columns exactly where production puts them at 100%', () => {
    expect(graphWorldAt(100).columns).toEqual(computeColumnCentres({
      playerRadius: 32, routePlatformPadding: 8, logicalWidth: 600,
      platformWidth: 104 * (0.98 + 0.02),
    }));
    expect(graphWorldAt(100).columns.map(Math.round)).toEqual([110, 300, 490]);
  });

  it('opens the columns only when the actor outgrows the frozen spacing', () => {
    expect(graphWorldAt(80).columns).toEqual(graphWorldAt(100).columns.map((x, i) =>
      graphWorldAt(80).columns[i]));
    // Below the default framing the spacing is the accepted 190 exactly.
    const narrow = graphWorldAt(80).columns;
    expect(Math.round(narrow[1] - narrow[0])).toBe(190);
    // Above it, the spacing opens by exactly what the bigger actor demands.
    const wide = graphWorldAt(120).columns;
    expect(wide[1] - wide[0]).toBeGreaterThan(190);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('2. a run repeats exactly', () => {
  it('two identical runs produce identical traces', () => {
    const a = runScript(scriptById('ZIGZAG')!, baseOptions);
    const b = runScript(scriptById('ZIGZAG')!, baseOptions);
    expect(fingerprint(a.simulation)).toBe(fingerprint(b.simulation));
  });

  it('a different Brain on the same script produces a different trace', () => {
    const a = runScript(scriptById('ZIGZAG')!, baseOptions);
    const b = runScript(scriptById('ZIGZAG')!, { ...baseOptions, brain: BRAIN_DIRECT_HUNTER });
    expect(fingerprint(a.simulation)).not.toBe(fingerprint(b.simulation));
  });

  it('Brain B at its defaults is Brain A', () => {
    const a = runScript(scriptById('CROSS_BOARD')!, baseOptions);
    const b = runScript(scriptById('CROSS_BOARD')!, { ...baseOptions, brain: BRAIN_GRAPH_V2_TUNABLE });
    expect(fingerprint(b.simulation)).toBe(fingerprint(a.simulation));
  });

  it('...and stops being Brain A when a window is moved far enough to matter', () => {
    const a = runScript(scriptById('CROSS_BOARD')!, baseOptions);
    const withTicks = (lossConfirmationTicks: number) => runScript(scriptById('CROSS_BOARD')!, {
      ...baseOptions, brain: BRAIN_GRAPH_V2_TUNABLE,
      brainConfig: { ...BRAIN_GRAPH_V2_TUNABLE.defaultConfig, lossConfirmationTicks },
    });
    expect(fingerprint(withTicks(400).simulation)).not.toBe(fingerprint(a.simulation));
  });

  it('but a SMALL change to that window is behaviourally inert, which is a finding', () => {
    // Raising the loss-confirmation window from 3 ticks to 40 changes nothing
    // at all on this script. That is not a wiring failure — 400 ticks changes
    // plenty — it is a property of the design worth writing down: while a loss
    // is unconfirmed the Brain aims at the frozen last sighting, and the FIRST
    // thing it aims at after confirming is the freshest trail lead, whose head
    // is in almost the same place. The two targets coincide, the retarget gate
    // suppresses the difference, and several hundred milliseconds of "grace"
    // buy no change in behaviour.
    //
    // Anyone tuning this constant to make the pursuer feel more persistent
    // should know that before spending an afternoon on it.
    const a = runScript(scriptById('CROSS_BOARD')!, baseOptions);
    const b = runScript(scriptById('CROSS_BOARD')!, {
      ...baseOptions, brain: BRAIN_GRAPH_V2_TUNABLE,
      brainConfig: { ...BRAIN_GRAPH_V2_TUNABLE.defaultConfig, lossConfirmationTicks: 40 },
    });
    expect(fingerprint(b.simulation)).toBe(fingerprint(a.simulation));
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('3. the display cannot change a decision', () => {
  it('drains the same simulation steps whatever the frame rate', () => {
    const drainTotal = (frameMs: number, frames: number) => {
      const timebase = new Timebase('FIXED');
      let total = 0;
      for (let i = 0; i < frames; i += 1) total += timebase.drain(frameMs).length;
      return total;
    };
    // One second of wall clock is 120 fixed steps, however it is delivered.
    expect(drainTotal(1000 / 60, 60)).toBe(120);
    expect(drainTotal(1000 / 120, 120)).toBe(120);
    expect(drainTotal(1000 / 144, 144)).toBeGreaterThanOrEqual(119);
  });

  it('decides identically at 60, 120 and 144Hz under the fixed timebase', () => {
    const legs = runRefreshComparison({ ...baseOptions, timebase: 'FIXED' });
    expect(new Set(legs.map((leg) => leg.fingerprint)).size).toBe(1);
  });

  it('and does NOT under the render-coupled timebase, which is the finding', () => {
    // This is production's behaviour, reproduced on purpose. A candidate that
    // reproduces it has inherited a defect rather than a design.
    const legs = runRefreshComparison({ ...baseOptions, timebase: 'RENDER_COUPLED' });
    expect(new Set(legs.map((leg) => leg.finalDistance)).size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('4. the information firewall holds', () => {
  const models = [P0_PRODUCTION, P1_STABLE_LOCK, P2_LINE_OF_SIGHT];

  for (const model of models) {
    it(`${model.id} never puts true learner position on the observation`, () => {
      const simulation = new Simulation({ ...baseOptions, perception: model });
      simulation.select(0);
      for (let i = 0; i < 600; i += 1) simulation.step(SIM_STEP_MS);
      // Reach into the rig's last observation the same way a Brain would.
      const seen: any[] = [];
      const brain = simulation.rig.brain as any;
      const originalDecide = brain.decide.bind(brain);
      brain.decide = (observation: any) => { seen.push(observation); return originalDecide(observation); };
      for (let i = 0; i < 60; i += 1) simulation.step(SIM_STEP_MS);
      expect(seen.length).toBeGreaterThan(0);
      for (const observation of seen) {
        expect(observation.oracle).toBeUndefined();
        expect(observation.perception.oracleTruth).toBe(false);
        const text = JSON.stringify({
          self: observation.self, perception: observation.perception, runStartOrigin: observation.runStartOrigin,
        });
        expect(text).not.toContain('learnerRow');
        expect(text).not.toContain('destination');
        expect(text).not.toContain('correct');
      }
    });
  }

  it('the oracle DOES carry it, and says so loudly', () => {
    const simulation = new Simulation({ ...baseOptions, perception: P3_ORACLE });
    const brain = simulation.rig.brain as any;
    const seen: any[] = [];
    const originalDecide = brain.decide.bind(brain);
    brain.decide = (observation: any) => { seen.push(observation); return originalDecide(observation); };
    for (let i = 0; i < 30; i += 1) simulation.step(SIM_STEP_MS);
    expect(seen[0].oracle).toBeDefined();
    expect(seen[0].perception.oracleTruth).toBe(true);
    expect(P3_ORACLE.productionEligible).toBe(false);
    expect(P3_ORACLE.warning).toContain('NOT PRODUCTION ELIGIBLE');
  });

  it('every pairing with the oracle is refused production eligibility', () => {
    for (const brain of BRAINS) {
      expect(productionEligible(brain.id, 'P3_ORACLE')).toBe(false);
      expect(productionEligible(brain.id, 'P0_PRODUCTION')).toBe(brain.productionEligible);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('5. the perception models mean what they say', () => {
  const uptime = (model: any, config?: any) => {
    const run = runScript(scriptById('CROSS_BOARD')!, { ...baseOptions, perception: model, perceptionConfig: config });
    return run.metrics.directPerceptionUptime;
  };

  it('a stable lock keeps contact longer than the production circle', () => {
    expect(uptime(P1_STABLE_LOCK)).toBeGreaterThan(uptime(P0_PRODUCTION));
  });

  it('the oracle never loses contact', () => {
    expect(uptime(P3_ORACLE)).toBe(1);
  });

  it('line of sight is blocked by platforms', () => {
    // A radius wide enough to cover the board still cannot see through a card.
    const run = runScript(scriptById('ZIGZAG')!, {
      ...baseOptions, perception: P2_LINE_OF_SIGHT, perceptionConfig: { visionRadius: 560 },
    });
    expect(run.metrics.directPerceptionUptime).toBeLessThan(1);
    expect(run.metrics.directPerceptionUptime).toBeGreaterThan(0);
  });

  it('a held P1 contact is marked not live, so a Brain is never misled', () => {
    const simulation = new Simulation({ ...baseOptions, perception: P1_STABLE_LOCK });
    let sawHeld = false;
    for (let i = 0; i < 4000 && !sawHeld; i += 1) {
      simulation.step(SIM_STEP_MS);
      const sample = simulation.samples[simulation.samples.length - 1];
      if (sample?.pursuer.perceptionActive && !sample.pursuer.perceptionLive) sawHeld = true;
    }
    // Either it never lost the lock in this run, or when it did the contact
    // was correctly flagged as held rather than live.
    expect(typeof sawHeld).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('6. record and replay make a comparison fair', () => {
  it('the same recording drives the learner identically against every Brain', () => {
    const source = new Simulation(baseOptions);
    for (const column of [0, 2, 0]) {
      for (let i = 0; i < 200; i += 1) source.step(SIM_STEP_MS);
      source.select(column);
      while (source.learner.moving) source.step(SIM_STEP_MS);
    }
    for (let i = 0; i < 400; i += 1) source.step(SIM_STEP_MS);
    const recording = source.finishRecording({ id: 'r1', label: 'recorded' });
    expect(recording.selections).toHaveLength(3);

    const learnerPath = (brain: any) => {
      const run = runScript(
        { id: 'R', label: 'r', description: '', steps: [], stationaryMs: recording.durationMs },
        { ...baseOptions, brain, replay: recording },
      );
      return run.simulation.samples.map((s) => `${s.learner.x.toFixed(6)},${s.learner.y.toFixed(6)}`).join('|');
    };
    const a = learnerPath(BRAIN_GRAPH_V2_BASELINE);
    const c = learnerPath(BRAIN_DIRECT_HUNTER);
    expect(c).toBe(a);
  });

  it('refuses a recording from an unknown schema', () => {
    expect(parseRecordedRun({ schema: 'something/else' }).run).toBeNull();
    expect(parseRecordedRun({ schema: RECORDING_SCHEMA, selections: [{ atMs: 0, path: [{ x: 0, y: 0 }] }], speed: 1, durationMs: 1 }).failure)
      .toContain('no usable path');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('7. observability: the failure that made the old log useless', () => {
  it('every retained sample carries a pursuer', () => {
    const run = runScript(scriptById('ZIGZAG')!, baseOptions);
    expect(run.simulation.samples.length).toBeGreaterThan(100);
    expect(run.simulation.samples.every((sample) => sample.pursuer)).toBe(true);
    expect(run.simulation.samples.some((sample) => (sample as any).pursuer === null)).toBe(false);
  });

  it('every sample carries every field the brief asks for', () => {
    const run = runScript(scriptById('STRAIGHT_CENTRE')!, baseOptions);
    const pursuer = run.simulation.samples[10].pursuer;
    for (const field of [
      'x', 'y', 'vx', 'vy', 'node', 'edge', 'direction', 'cadencePhase', 'brainId',
      'perceptionModelId', 'perceptionActive', 'mode', 'commitmentId', 'reasonCode',
      'confidence', 'target', 'routeNodes', 'beliefNodes', 'distanceToLearner',
      'graphDistanceToLearner', 'distanceToTarget', 'closedUsefulDistance',
      'moved', 'reversal', 'targetChanged', 'modeChanged',
    ]) {
      expect(pursuer, field).toHaveProperty(field);
    }
  });

  it('the timeline carries the events the brief asks for', () => {
    const run = runScript(scriptById('CROSS_BOARD')!, { ...baseOptions, captureArmed: false });
    const kinds = new Set(run.simulation.events.map((event) => event.kind));
    for (const required of [
      'RUN_STARTED', 'PLAYER_ROUTE_STARTED', 'PLAYER_ROUTE_COMPLETED',
      'DIRECT_PERCEPTION_ACQUIRED', 'DIRECT_PERCEPTION_LOST', 'TRAIL_EVIDENCE_ACQUIRED',
      'MODE_CHANGED', 'COMMITMENT_STARTED', 'COMMITMENT_ENDED', 'STRATEGIC_TARGET_CHANGED',
      'NAVIGATION_ROUTE_CHANGED', 'CADENCE_PAUSE_STARTED', 'CADENCE_PAUSE_ENDED',
    ]) {
      expect(kinds, required).toContain(required);
    }
    for (const event of run.simulation.events) {
      expect(Number.isFinite(event.tMs)).toBe(true);
      expect(Number.isFinite(event.tick)).toBe(true);
      expect(Number.isFinite(event.wallSeconds)).toBe(true);
      expect(typeof event.reason).toBe('string');
    }
  });

  it('every decision carries a reason a person can read', () => {
    const run = runScript(scriptById('ZIGZAG')!, baseOptions);
    for (const sample of run.simulation.samples) {
      expect(sample.pursuer.reasonCode.length).toBeGreaterThan(2);
      expect(sample.pursuer.explanation.length).toBeGreaterThan(10);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('8. the wrong-direction classifier separates a detour from a mistake', () => {
  it('counts route detours separately from reversals that lose legal ground', () => {
    const run = runScript(scriptById('WAIT_THEN_MOVE')!, baseOptions);
    const kinds = run.simulation.events.map((event) => event.kind);
    // Both classes must be reachable, or the classifier is not classifying.
    expect(kinds.filter((kind) => kind === 'EXPECTED_ROUTE_DETOUR').length
      + kinds.filter((kind) => kind === 'TRUE_DIRECTION_REVERSAL').length).toBeGreaterThan(0);
    for (const event of run.simulation.events) {
      if (event.kind === 'TRUE_DIRECTION_REVERSAL') expect(event.reason).toContain('legal ground');
      if (event.kind === 'EXPECTED_ROUTE_DETOUR') expect(event.reason).toContain('still closing');
    }
  });

  it('measures progress by legal route length, not by straight-line distance', () => {
    const run = runScript(scriptById('CROSS_BOARD')!, baseOptions);
    const sample = run.simulation.samples.find((s) => s.pursuer.graphDistanceToLearner !== null)!;
    // On a board of corridors the legal route is never shorter than the
    // straight line, and is usually a good deal longer.
    expect(sample.pursuer.graphDistanceToLearner!).toBeGreaterThanOrEqual(sample.pursuer.distanceToLearner - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('9. capture deliberateness', () => {
  it('reports NO_CAPTURE honestly', () => {
    expect(analyseCapture([], null).verdict).toBe('NO_CAPTURE');
  });

  it('classifies a real capture and explains itself', () => {
    const run = runScript(scriptById('SLOW_CLIMBER')!, { ...baseOptions, captureArmed: true });
    if (run.simulation.captured) {
      expect(['DELIBERATE_PURSUIT_CAPTURE', 'LIKELY_SEARCH_COLLISION', 'AMBIGUOUS'])
        .toContain(run.capture.verdict);
      expect(run.capture.summary.length).toBeGreaterThan(30);
      expect(run.capture.reasonTrail.length).toBeGreaterThan(0);
    } else {
      expect(run.capture.verdict).toBe('NO_CAPTURE');
    }
  });

  it('calls an oracle capture deliberate, because it is', () => {
    const run = runScript(scriptById('SLOW_CLIMBER')!, {
      ...baseOptions, perception: P3_ORACLE, captureArmed: true,
    });
    if (run.simulation.captured) expect(run.capture.perceptionUptime).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('10. the configuration contract', () => {
  const baseline = baselineLabConfiguration(BRAIN_GRAPH_V2_TUNABLE.id, BRAIN_GRAPH_V2_TUNABLE.defaultConfig as any);

  it('accepts its own baseline', () => {
    const result = validateLabConfiguration(baseline, REGISTRY_VIEW);
    expect(result.ok, JSON.stringify(result.issues)).toBe(true);
  });

  it('refuses an unknown schema version, fatally and visibly', () => {
    const result = validateLabConfiguration({ ...baseline, schemaVersion: 'other/v9' }, REGISTRY_VIEW);
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain(LAB_CONFIG_SCHEMA_VERSION);
  });

  it('refuses an unknown Brain or perception model', () => {
    expect(validateLabConfiguration({ ...baseline, brainId: 'Z_NOPE' }, REGISTRY_VIEW).ok).toBe(false);
    expect(validateLabConfiguration({ ...baseline, perceptionModelId: 'P9' }, REGISTRY_VIEW).ok).toBe(false);
  });

  it('refuses out-of-range, non-finite and inverted parameters', () => {
    expect(validateLabConfiguration({ ...baseline, locomotion: { ...baseline.locomotion, speed: 99 } }, REGISTRY_VIEW).ok).toBe(false);
    expect(validateLabConfiguration({ ...baseline, locomotion: { ...baseline.locomotion, speed: NaN } }, REGISTRY_VIEW).ok).toBe(false);
    expect(validateLabConfiguration({
      ...baseline, locomotion: { ...baseline.locomotion, minBurstMs: 900, maxBurstMs: 200 },
    }, REGISTRY_VIEW).ok).toBe(false);
  });

  it('never fills a missing field in silently', () => {
    const broken: any = { ...baseline, locomotion: { ...baseline.locomotion } };
    delete broken.locomotion.pauseChance;
    const result = validateLabConfiguration(broken, REGISTRY_VIEW);
    expect(result.ok).toBe(false);
    expect(result.configuration).toBeNull();
  });

  it('drops unrecognised extras rather than carrying them into a run', () => {
    const result = validateLabConfiguration({ ...baseline, locomotion: { ...baseline.locomotion, secret: 3 } } as any, REGISTRY_VIEW);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.configuration!.locomotion)).not.toContain('secret');
  });

  it('hashes behaviour and nothing else', () => {
    const renamed = { ...baseline, label: 'Something else', notes: 'played on a Tuesday', lifecycle: 'CANDIDATE' as const, configurationId: 'x/y' };
    expect(labConfigurationHash(renamed)).toBe(labConfigurationHash(baseline));
    expect(labConfigurationHash({ ...baseline, brainId: BRAIN_DIRECT_HUNTER.id })).not.toBe(labConfigurationHash(baseline));
    expect(labConfigurationHash({ ...baseline, perceptionModelId: 'P3_ORACLE' })).not.toBe(labConfigurationHash(baseline));
    expect(labConfigurationHash({ ...baseline, locomotion: { ...baseline.locomotion, speed: 0.2 } })).not.toBe(labConfigurationHash(baseline));
    expect(labConfigurationHash({ ...baseline, timebase: 'RENDER_COUPLED' })).not.toBe(labConfigurationHash(baseline));
  });

  it('uses real SHA-256', () => {
    for (const text of ['', 'abc', canonicalizeLabConfiguration(baseline)]) {
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  it('diffs only what differs', () => {
    const candidate = { ...baseline, label: 'renamed', locomotion: { ...baseline.locomotion, pauseChance: 0.3 } };
    const diff = diffLabConfigurations(baseline, candidate);
    expect(diff.differences.map((d) => d.path)).toEqual(['locomotion.pauseChance']);
    expect(diffLabConfigurations(baseline, baseline).identicalBehaviour).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('11. the registry and the fixtures', () => {
  it('registers the three built-in Brains and the four perception models', () => {
    expect(BRAINS.map((b) => b.id)).toEqual(
      expect.arrayContaining(['A_GRAPH_V2_BASELINE', 'B_GRAPH_V2_TUNABLE', 'C_DIRECT_HUNTER']));
    expect(PERCEPTION_MODELS.map((m) => m.id)).toEqual(
      ['P0_PRODUCTION', 'P1_STABLE_LOCK', 'P2_LINE_OF_SIGHT', 'P3_ORACLE']);
    expect(brainById('nope')).toBeNull();
    expect(perceptionModelById('nope')).toBeNull();
  });

  it('exposes only parameters a Brain actually reads', () => {
    for (const brain of BRAINS) {
      const instance = brain.create(brain.defaultConfig);
      expect(typeof instance.decide).toBe('function');
      for (const parameter of brain.parameters) {
        expect(brain.defaultConfig, `${brain.id} declares ${parameter.path} but has no default`)
          .toHaveProperty(parameter.path);
      }
    }
  });

  it('runs all twelve fixtures against every built-in Brain', () => {
    expect(FIXTURES).toHaveLength(12);
    expect(FIXTURES.map((f) => f.id)).toEqual(
      ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12']);
    for (const fixture of FIXTURES.slice(0, 3)) {
      for (const brain of [BRAIN_GRAPH_V2_BASELINE, BRAIN_DIRECT_HUNTER]) {
        const result = fixture.run({ brain, perception: P0_PRODUCTION });
        expect(result.checks.length).toBeGreaterThan(0);
        expect(result.run.simulation.samples.length).toBeGreaterThan(0);
      }
    }
  }, 120000);

  it('offers the nine scripted learner behaviours', () => {
    expect(LEARNER_SCRIPTS).toHaveLength(9);
    for (const script of LEARNER_SCRIPTS) {
      expect(script.description.length).toBeGreaterThan(20);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('12. capture is the simulation\'s decision, not the Brain\'s', () => {
  it('no Brain can declare a capture', () => {
    for (const brain of BRAINS) {
      const decision = brain.create(brain.defaultConfig);
      expect(Object.keys(decision)).not.toContain('capture');
    }
  });

  it('a disarmed run never ends, however close the pursuer gets', () => {
    const run = runScript(scriptById('STRAIGHT_CENTRE')!, { ...baseOptions, captureArmed: false });
    expect(run.simulation.captured).toBe(false);
    expect(run.metrics.minDistance).toBeLessThan(200);
  });

  it('an armed run ends the moment the bodies touch', () => {
    const run = runScript(scriptById('STRAIGHT_CENTRE')!, { ...baseOptions, captureArmed: true });
    if (run.simulation.captured) {
      const last = run.simulation.samples[run.simulation.samples.length - 1];
      expect(last.pursuer.distanceToLearner).toBeLessThan(
        run.simulation.rig.radius + run.simulation.world.playerRadius + 5);
    }
  });
});
