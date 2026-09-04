/**
 * THE CONFIGURATION CONTRACT — 04C.
 *
 * The architecture these tests guard exists to answer one question reliably:
 * what was the pursuer in that run? Every test below is a way that question
 * could get a wrong answer — a manifest that drifted from the code, a hash
 * that moved when somebody renamed a configuration, a slider that edited a
 * frozen baseline, a paste that was silently repaired, a parameter that was
 * wired into the payload but not into the pursuer.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';

import {
  PURSUER_CONFIG_SCHEMA_VERSION, BEHAVIOUR_LAYERS, EDITABLE_LAYERS,
  type PursuerConfiguration,
} from '../pursuer-v2/config/pursuerConfigurationSchema';
import {
  PARAMETER_AUTHORITY, AUTHORITY_CONFLICTS, ABSENT_PARAMETERS,
} from '../pursuer-v2/config/parameterAuthority';
import {
  validatePursuerConfiguration, PARAMETER_BOUNDS, describeValidationFailure,
} from '../pursuer-v2/config/validatePursuerConfiguration';
import {
  canonicalizeConfiguration, configurationHash, sha256Hex, shortConfigurationHash,
} from '../pursuer-v2/config/configurationHash';
import {
  BASELINE_04B_R1, BASELINE_CONFIGURATION_ID, BASELINE_AUTHORITY_COMMIT,
  DECLARED_EXPERIMENTS, BUILT_IN_CONFIGURATIONS, deriveConfiguration,
} from '../pursuer-v2/config/configurationLibrary';
import { diffConfigurations, formatDiff } from '../pursuer-v2/config/configurationDiff';
import {
  resolvePursuerConfiguration, resolveBaselineConfiguration, selectConfiguration,
  describeDerivedValues, SAFE_TRANSITION_BOUNDARIES,
} from '../pursuer-v2/config/resolvePursuerConfiguration';
import * as store from '../pursuer-v2/config/configurationStore';
import {
  emptyTestSessionNotes, normalizeTestSessionNotes, hasAnyTestNote, TEST_NOTE_DIMENSIONS,
} from '../pursuer-v2/config/testSessionNotes';

import { DEFAULT_GRAPH_CADENCE } from '../pursuer-v2/graph/graphCadence';
import { DEFAULT_GRAPH_PURSUER_CONFIG, LANE_BAND_FRACTION, TARGET_EPSILON } from '../pursuer-v2/graph/graphPursuerV2';
import { SPARK_SENSE_RADIUS } from '../pursuer-v2/brain/sensors';
import { DEFAULT_ROW_RETENTION } from '../pursuer-v2/contracts/trailRecorder';
import {
  LOSS_CONFIRMATION_TICKS, ACQUIRE_CONFIRMATION_TICKS, TRAIL_EXHAUSTION_CONFIRMATION_TICKS,
  LEAD_PREEMPTION_CONFIRMATION_TICKS, MAX_REMEMBERED_FRAGMENTS, ARRIVAL_EPSILON,
} from '../pursuer-v2/brain/graphBrainV1';
import { GROUND_LEVELS, GraphPursuerController } from '../pursuer-v2/runtime/graphPursuerController';
import { runProductionSurface } from '../pursuer-v2/testing/productionSurfaceRun';

/** A mutable deep copy, since every shipped configuration is deep-frozen. */
function copy(configuration: PursuerConfiguration): any {
  return JSON.parse(JSON.stringify(configuration));
}

// ─────────────────────────────────────────────────────────────────────────
describe('1. the parameter-authority audit describes the code that is actually there', () => {
  it('quotes every declared default from the module that owns it', () => {
    const row = (path: string) => PARAMETER_AUTHORITY.find((r) => r.path === path)!;
    expect(row('locomotion.speed').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.speed);
    expect(row('locomotion.minBurstMs').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.minBurstMs);
    expect(row('locomotion.maxBurstMs').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.maxBurstMs);
    expect(row('locomotion.minPauseMs').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.minPauseMs);
    expect(row('locomotion.maxPauseMs').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.maxPauseMs);
    expect(row('locomotion.pauseChance').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.pauseChance);
    expect(row('locomotion.cadenceSeed').declaredDefault).toBe(DEFAULT_GRAPH_CADENCE.seed);
    expect(row('locomotion.laneSeed').declaredDefault).toBe(DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed);
    expect(row('perception.directSenseRadius').declaredDefault).toBe(SPARK_SENSE_RADIUS);
    expect(row('perception.trailRowRetention').declaredDefault).toBe(DEFAULT_ROW_RETENTION);
    expect(row('commitment.lossConfirmationTicks').declaredDefault).toBe(LOSS_CONFIRMATION_TICKS);
    expect(row('commitment.acquireConfirmationTicks').declaredDefault).toBe(ACQUIRE_CONFIRMATION_TICKS);
    expect(row('commitment.trailExhaustionConfirmationTicks').declaredDefault).toBe(TRAIL_EXHAUSTION_CONFIRMATION_TICKS);
    expect(row('commitment.leadPreemptionConfirmationTicks').declaredDefault).toBe(LEAD_PREEMPTION_CONFIRMATION_TICKS);
    expect(row('commitment.maxRememberedFragments').declaredDefault).toBe(MAX_REMEMBERED_FRAGMENTS);
    expect(row('chassis.laneBandFraction').declaredDefault).toBe(LANE_BAND_FRACTION);
    expect(row('chassis.targetEpsilon').declaredDefault).toBe(TARGET_EPSILON);
    expect(row('chassis.arrivalEpsilon').declaredDefault).toBe(ARRIVAL_EPSILON);
    // The three literals the manifest quotes rather than imports, so that it
    // can stay a leaf the controller may import without a cycle.
    expect(row('spawnCapture.groundLevels').declaredDefault).toBe(GROUND_LEVELS);
  });

  it('records the three places the module default is NOT what production runs', () => {
    // These are findings, not decoration: reading the "default" object would
    // have described the shipped pursuer wrongly on all three.
    expect(DEFAULT_GRAPH_PURSUER_CONFIG.captureRail).toBe(false);
    expect(BASELINE_04B_R1.spawnCapture.captureRail).toBe(true);
    expect(DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels).toBe(0);
    expect(BASELINE_04B_R1.spawnCapture.groundLevels).toBe(GROUND_LEVELS);
    expect(DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius).toBeNull();
    expect(AUTHORITY_CONFLICTS.map((c) => c.symbol)).toEqual([
      'DEFAULT_GRAPH_PURSUER_CONFIG.captureRail',
      'DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels',
      'DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius',
    ]);
  });

  it('names the parameters a brief asks for that do not exist, rather than inventing them', () => {
    const requested = ABSENT_PARAMETERS.map((p) => p.requested);
    expect(requested).toContain('perception.lastSightingGraceMs');
    // And the schema really does not carry it.
    expect(Object.keys(BASELINE_04B_R1.perception)).not.toContain('lastSightingGraceMs');
    // The real quantity is a tick count, and it is in the payload.
    expect(BASELINE_04B_R1.commitment.lossConfirmationTicks).toBe(LOSS_CONFIRMATION_TICKS);
  });

  it('gives every settable parameter a bound, and every bound a parameter', () => {
    const settable = PARAMETER_AUTHORITY
      .filter((r) => r.path && (r.authority === 'SETTABLE' || r.authority === 'FROZEN'))
      .map((r) => r.path!)
      .filter((p) => p !== 'spawnCapture.spawnRule' && p !== 'spawnCapture.captureRail');
    for (const path of settable) expect(PARAMETER_BOUNDS[path], path).toBeDefined();
    for (const path of Object.keys(PARAMETER_BOUNDS)) {
      expect(PARAMETER_AUTHORITY.some((r) => r.path === path), path).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('2. the baseline is the accepted pursuer, and says so', () => {
  it('takes every value from the module that owns it', () => {
    expect(BASELINE_04B_R1.locomotion).toEqual({
      speed: DEFAULT_GRAPH_CADENCE.speed,
      minBurstMs: DEFAULT_GRAPH_CADENCE.minBurstMs,
      maxBurstMs: DEFAULT_GRAPH_CADENCE.maxBurstMs,
      minPauseMs: DEFAULT_GRAPH_CADENCE.minPauseMs,
      maxPauseMs: DEFAULT_GRAPH_CADENCE.maxPauseMs,
      pauseChance: DEFAULT_GRAPH_CADENCE.pauseChance,
      cadenceSeed: DEFAULT_GRAPH_CADENCE.seed,
      laneSeed: DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed,
    });
  });

  it('is BASELINE, frozen, not experimental, and names its authority commit', () => {
    expect(BASELINE_04B_R1.metadata.lifecycle).toBe('BASELINE');
    expect(BASELINE_04B_R1.metadata.frozen).toBe(true);
    expect(BASELINE_04B_R1.metadata.experimental).toBe(false);
    expect(BASELINE_04B_R1.metadata.authorityCommit).toBe(BASELINE_AUTHORITY_COMMIT);
    expect(BASELINE_AUTHORITY_COMMIT).toMatch(/^[0-9a-f]{40}$/);
  });

  it('cannot be mutated, even by code that tries', () => {
    expect(Object.isFrozen(BASELINE_04B_R1)).toBe(true);
    expect(Object.isFrozen(BASELINE_04B_R1.locomotion)).toBe(true);
    expect(() => { (BASELINE_04B_R1 as any).locomotion.speed = 99; }).toThrow();
    expect(BASELINE_04B_R1.locomotion.speed).toBe(DEFAULT_GRAPH_CADENCE.speed);
  });

  it('validates and resolves', () => {
    const outcome = resolvePursuerConfiguration(BASELINE_04B_R1, { logicalWidth: 600 });
    expect(outcome.ok, outcome.ok ? '' : outcome.failure).toBe(true);
    expect(resolveBaselineConfiguration().configuration.identity.configurationId)
      .toBe(BASELINE_CONFIGURATION_ID);
  });

  it('is the only built-in this build ships', () => {
    expect(BUILT_IN_CONFIGURATIONS).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('3. the schema version is checked first and fails visibly', () => {
  it('refuses a payload from an unknown schema', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.identity.schemaVersion = 'circuit-climb-pursuer-config/v9';
    const result = validatePursuerConfiguration(candidate);
    expect(result.ok).toBe(false);
    expect(result.configuration).toBeNull();
    expect(result.issues[0].code).toBe('SCHEMA_VERSION_UNKNOWN');
    // Visible, not silent: the message names both versions.
    expect(describeValidationFailure(result)).toContain('v9');
    expect(describeValidationFailure(result)).toContain(PURSUER_CONFIG_SCHEMA_VERSION);
  });

  it('refuses a payload with no schema version at all', () => {
    const candidate = copy(BASELINE_04B_R1);
    delete candidate.identity.schemaVersion;
    expect(validatePursuerConfiguration(candidate).issues[0].code).toBe('SCHEMA_VERSION_MISSING');
  });

  it('does not report anything else once the version is wrong', () => {
    // A payload written for another schema cannot have its fields judged by
    // this one's rules, so the version failure stands alone.
    const candidate = copy(BASELINE_04B_R1);
    candidate.identity.schemaVersion = 'other/v1';
    candidate.locomotion.speed = -5;
    expect(validatePursuerConfiguration(candidate).issues).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('4. one validator, and nothing partial gets through it', () => {
  const invalid: Array<[string, (c: any) => void, string]> = [
    ['a non-numeric speed', (c) => { c.locomotion.speed = '0.19' as any; }, 'NOT_A_NUMBER'],
    ['an infinite speed', (c) => { c.locomotion.speed = Infinity; }, 'NOT_FINITE'],
    ['a NaN pause chance', (c) => { c.locomotion.pauseChance = NaN; }, 'NOT_FINITE'],
    ['a negative duration', (c) => { c.locomotion.minPauseMs = -10; }, 'OUT_OF_RANGE'],
    ['a probability above one', (c) => { c.locomotion.pauseChance = 1.5; }, 'OUT_OF_RANGE'],
    ['a zero sense radius', (c) => { c.perception.directSenseRadius = 0; }, 'OUT_OF_RANGE'],
    ['a fractional tick count', (c) => { c.commitment.lossConfirmationTicks = 2.5; }, 'NOT_AN_INTEGER'],
    ['a fractional retention', (c) => { c.perception.trailRowRetention = 6.5; }, 'NOT_AN_INTEGER'],
    ['a lane fraction of 1', (c) => { c.chassis.laneBandFraction = 1; }, 'OUT_OF_RANGE'],
    ['a non-boolean capture rail', (c) => { c.spawnCapture.captureRail = 'yes'; }, 'NOT_A_BOOLEAN'],
    ['an unknown spawn rule', (c) => { c.spawnCapture.spawnRule = 'TELEPORT'; }, 'UNKNOWN_SPAWN_RULE'],
    ['an unknown lifecycle', (c) => { c.metadata.lifecycle = 'SHIPPED'; }, 'UNKNOWN_LIFECYCLE'],
    ['a populated strategy layer', (c) => { c.strategy = { aggression: 0.5 }; }, 'STRATEGY_NOT_EMPTY'],
    ['an empty id', (c) => { c.identity.configurationId = '   '; }, 'EMPTY_ID'],
  ];

  for (const [name, mutate, code] of invalid) {
    it(`refuses ${name}`, () => {
      const candidate = copy(BASELINE_04B_R1);
      mutate(candidate);
      const result = validatePursuerConfiguration(candidate);
      expect(result.ok).toBe(false);
      expect(result.configuration).toBeNull();
      expect(result.issues.map((i) => i.code)).toContain(code);
    });
  }

  it('refuses a burst range that is inverted', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.minBurstMs = 900;
    candidate.locomotion.maxBurstMs = 200;
    const result = validatePursuerConfiguration(candidate);
    expect(result.issues.map((i) => i.code)).toContain('RANGE_INVERTED');
  });

  it('refuses a pause range that is inverted', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.minPauseMs = 400;
    candidate.locomotion.maxPauseMs = 100;
    expect(validatePursuerConfiguration(candidate).issues.map((i) => i.code)).toContain('RANGE_INVERTED');
  });

  it('refuses a sense radius that spans the whole board', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.perception.directSenseRadius = 550;
    // Inside the static bound, and still refused against a 500-wide board:
    // omniscience is an architecture change, not a difficulty setting.
    expect(validatePursuerConfiguration(candidate, { logicalWidth: 500 }).issues
      .map((i) => i.code)).toContain('SENSE_SPANS_BOARD');
    expect(validatePursuerConfiguration(candidate, { logicalWidth: 600 }).ok).toBe(true);
  });

  it('never fills a missing field in silently', () => {
    const candidate = copy(BASELINE_04B_R1);
    delete candidate.locomotion.pauseChance;
    const result = validatePursuerConfiguration(candidate);
    expect(result.ok).toBe(false);
    expect(result.configuration).toBeNull();
  });

  it('reports every problem at once rather than one per attempt', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.speed = -1;
    candidate.locomotion.pauseChance = 4;
    candidate.perception.trailRowRetention = 0;
    expect(validatePursuerConfiguration(candidate).issues.length).toBeGreaterThanOrEqual(3);
  });

  it('drops unrecognised extra fields rather than carrying them into the run', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.secretMultiplier = 3;
    candidate.somethingElse = true;
    const result = validatePursuerConfiguration(candidate);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.configuration!.locomotion)).not.toContain('secretMultiplier');
    expect(Object.keys(result.configuration!)).not.toContain('somethingElse');
  });

  it('refuses anything that is not an object', () => {
    for (const value of [null, 42, 'config', [], undefined]) {
      expect(validatePursuerConfiguration(value).ok).toBe(false);
    }
  });

  it('returns a deep-frozen configuration, so nothing can edit it after validation', () => {
    const result = validatePursuerConfiguration(copy(BASELINE_04B_R1));
    expect(Object.isFrozen(result.configuration!.locomotion)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('5. frozen layers stay frozen', () => {
  for (const layer of ['commitment', 'chassis', 'spawnCapture'] as const) {
    it(`refuses an edit to ${layer}`, () => {
      const candidate = copy(BASELINE_04B_R1);
      const key = Object.keys(candidate[layer])[0];
      const current = candidate[layer][key];
      candidate[layer][key] = typeof current === 'number' ? current + 1
        : typeof current === 'boolean' ? !current : 'INTEGRATION_BELOW_LEARNER';
      const result = validatePursuerConfiguration(candidate, { frozenReference: BASELINE_04B_R1 });
      expect(result.ok).toBe(false);
      expect(result.issues.map((i) => i.code)).toContain('FROZEN_LAYER_EDITED');
    });
  }

  it('allows an edit only under an explicit separate authorization', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.spawnCapture.spawnRule = 'INTEGRATION_BELOW_LEARNER';
    expect(validatePursuerConfiguration(candidate, {
      frozenReference: BASELINE_04B_R1, allowFrozenEdits: true,
    }).ok).toBe(true);
  });

  it('leaves only locomotion and perception editable', () => {
    expect([...EDITABLE_LAYERS].sort()).toEqual(['locomotion', 'perception']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('6. the behaviour hash is a hash of behaviour', () => {
  it('is real SHA-256', () => {
    for (const text of ['', 'abc', 'the pursuer', canonicalizeConfiguration(BASELINE_04B_R1), 'x'.repeat(1000)]) {
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  it('is unchanged by the label, the description, the id, or any metadata', () => {
    const before = configurationHash(BASELINE_04B_R1);
    const renamed = copy(BASELINE_04B_R1);
    renamed.identity.configurationId = 'custom/whatever';
    renamed.identity.label = 'Something Else Entirely';
    renamed.identity.description = 'a different description';
    renamed.metadata.notes = 'played it on a Tuesday';
    renamed.metadata.createdAt = '2026-01-01T00:00:00.000Z';
    renamed.metadata.lifecycle = 'CANDIDATE';
    renamed.metadata.parentConfigurationId = 'builtin/04b-r1-baseline';
    renamed.metadata.experimental = true;
    renamed.metadata.frozen = false;
    expect(configurationHash(validatePursuerConfiguration(renamed).configuration!)).toBe(before);
  });

  it('changes for every single behaviour-affecting parameter', () => {
    const before = configurationHash(BASELINE_04B_R1);
    const paths: string[] = [];
    for (const layer of BEHAVIOUR_LAYERS) {
      for (const key of Object.keys(BASELINE_04B_R1[layer] as object)) paths.push(`${layer}.${key}`);
    }
    // The strategy layer is empty in v1, so there is nothing to perturb there.
    expect(paths.length).toBeGreaterThanOrEqual(18);
    for (const path of paths) {
      const [layer, key] = path.split('.');
      const candidate = copy(BASELINE_04B_R1);
      const current = candidate[layer][key];
      candidate[layer][key] = typeof current === 'number' ? current + 1
        : typeof current === 'boolean' ? !current
          : 'INTEGRATION_BELOW_LEARNER';
      expect(configurationHash(candidate), path).not.toBe(before);
    }
  });

  it('changes when the schema version changes', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.identity.schemaVersion = 'circuit-climb-pursuer-config/v2';
    expect(configurationHash(candidate)).not.toBe(configurationHash(BASELINE_04B_R1));
  });

  it('is unaffected by object key order or a JSON round trip', () => {
    const reordered = JSON.parse(JSON.stringify(BASELINE_04B_R1, ['identity', 'schemaVersion',
      'configurationId', 'label', 'description', 'spawnCapture', 'spawnRule', 'groundLevels',
      'captureRail', 'chassis', 'laneBandFraction', 'targetEpsilon', 'arrivalEpsilon',
      'commitment', 'lossConfirmationTicks', 'acquireConfirmationTicks',
      'trailExhaustionConfirmationTicks', 'leadPreemptionConfirmationTicks',
      'maxRememberedFragments', 'perception', 'directSenseRadius', 'trailRowRetention',
      'strategy', 'locomotion', 'speed', 'minBurstMs', 'maxBurstMs', 'minPauseMs', 'maxPauseMs',
      'pauseChance', 'cadenceSeed', 'laneSeed', 'metadata', 'lifecycle', 'source',
      'parentConfigurationId', 'authorityCommit', 'notes', 'createdAt', 'experimental', 'frozen']));
    expect(configurationHash(reordered)).toBe(configurationHash(BASELINE_04B_R1));
  });

  it('treats negative zero as zero', () => {
    const a = copy(BASELINE_04B_R1); a.locomotion.minPauseMs = 0;
    const b = copy(BASELINE_04B_R1); b.locomotion.minPauseMs = -0;
    expect(configurationHash(a)).toBe(configurationHash(b));
  });

  it('gives a short form that is a prefix of the long one', () => {
    expect(configurationHash(BASELINE_04B_R1).startsWith(shortConfigurationHash(BASELINE_04B_R1))).toBe(true);
    expect(shortConfigurationHash(BASELINE_04B_R1)).toHaveLength(12);
  });

  it('canonicalizes to something a person can read a difference out of', () => {
    const lines = canonicalizeConfiguration(BASELINE_04B_R1).split('\n');
    expect(lines[0]).toBe(`identity.schemaVersion="${PURSUER_CONFIG_SCHEMA_VERSION}"`);
    expect(lines).toContain(`locomotion.speed=${DEFAULT_GRAPH_CADENCE.speed}`);
    expect(lines.some((l) => l.startsWith('metadata.'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('7. the diff shows only what differs, and agrees with the hash', () => {
  it('reports nothing for a configuration compared with itself', () => {
    const report = diffConfigurations(BASELINE_04B_R1, BASELINE_04B_R1);
    expect(report.differences).toHaveLength(0);
    expect(report.identicalBehaviour).toBe(true);
    expect(formatDiff(report)[0]).toContain('behaviourally identical');
  });

  it('reports exactly the parameters that were changed, and no others', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.pauseChance = 0.3;
    candidate.perception.directSenseRadius = 300;
    candidate.identity.label = 'renamed';
    const report = diffConfigurations(BASELINE_04B_R1, candidate);
    expect(report.differences.map((d) => d.path))
      .toEqual(['locomotion.pauseChance', 'perception.directSenseRadius']);
    expect(report.identicalBehaviour).toBe(false);
  });

  it('shows a rename only when metadata is asked for, and marks it presentation-only', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.identity.label = 'renamed';
    candidate.metadata.notes = 'a note';
    expect(diffConfigurations(BASELINE_04B_R1, candidate).differences).toHaveLength(0);
    const withMetadata = diffConfigurations(BASELINE_04B_R1, candidate, { includeMetadata: true });
    expect(withMetadata.differences.length).toBeGreaterThan(0);
    expect(withMetadata.differences.every((d) => !d.behaviourAffecting)).toBe(true);
  });

  it('never disagrees with the hash about whether two pursuers are the same', () => {
    const cases = [
      (c: any) => { c.locomotion.speed = 0.25; },
      (c: any) => { c.perception.trailRowRetention = 9; },
      (c: any) => { c.identity.label = 'x'; },
      (c: any) => { c.metadata.notes = 'y'; },
      (c: any) => { c.locomotion.cadenceSeed = 7; },
      (c: any) => { /* untouched */ },
    ];
    for (const mutate of cases) {
      const candidate = copy(BASELINE_04B_R1);
      mutate(candidate);
      const sameHash = configurationHash(candidate) === configurationHash(BASELINE_04B_R1);
      expect(diffConfigurations(BASELINE_04B_R1, candidate).identicalBehaviour).toBe(sameHash);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('8. resolution: one configuration per run, and the runtime is not told why', () => {
  it('hands the runtime a payload with no account of why it was chosen', () => {
    const selection = selectConfiguration(BASELINE_04B_R1, 'HOST_POLICY', { logicalWidth: 600 });
    expect(Object.keys(selection.resolved).sort())
      .toEqual(['canonical', 'configuration', 'hash', 'shortHash']);
    expect(JSON.stringify(selection.resolved)).not.toContain('HOST_POLICY');
    // The reason lives beside the resolved payload, not inside it.
    expect(selection.reason).toBe('HOST_POLICY');
  });

  it('falls back to the baseline rather than refusing to start, and says what it refused', () => {
    const broken = copy(BASELINE_04B_R1);
    broken.locomotion.speed = -1;
    broken.identity.configurationId = 'custom/broken';
    const selection = selectConfiguration(broken, 'RESTORED_FROM_STORAGE', {
      requestedConfigurationId: 'custom/broken',
    });
    expect(selection.resolved.configuration.identity.configurationId).toBe(BASELINE_CONFIGURATION_ID);
    expect(selection.fallbackFrom).not.toBeNull();
    expect(selection.fallbackFrom!.requestedConfigurationId).toBe('custom/broken');
    expect(selection.fallbackFrom!.failure).toContain('locomotion.speed');
  });

  it('reports the derived values nobody authors', () => {
    const derived = describeDerivedValues({
      actorRadius: 19.28, trailSenseRadius: 114.024, trunkCount: 4,
      frameMs: 6.94, configuration: BASELINE_04B_R1,
    });
    // The finding that explains the 04B report: the windows are counted in
    // frames, so on a 144Hz display a loss is confirmed in ~21ms, not the
    // ~50ms the constant was derived at.
    expect(derived.commitmentWindowMs!.loss).toBeCloseTo(3 * 6.94, 6);
    expect(derived.commitmentWindowMs!.acquire).toBeCloseTo(6 * 6.94, 6);
    expect(describeDerivedValues({
      actorRadius: 19.28, trailSenseRadius: 114, trunkCount: 4,
      frameMs: null, configuration: BASELINE_04B_R1,
    }).commitmentWindowMs).toBeNull();
  });

  it('documents the safe transition boundaries and activates exactly one', () => {
    const active = SAFE_TRANSITION_BOUNDARIES.filter((b) => b.active);
    expect(active).toHaveLength(1);
    expect(active[0].boundary).toContain('Run start');
    expect(SAFE_TRANSITION_BOUNDARIES.some((b) => b.boundary === 'Per frame' && !b.safe && !b.active)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('9. the store never mutates what it is not allowed to', () => {
  it('turns an edit into a draft and leaves the baseline alone', () => {
    let state = store.emptyStoreState();
    const before = configurationHash(BASELINE_04B_R1);
    state = store.editParameter(state, 'locomotion.speed', 0.3);
    expect(store.isModified(state)).toBe(true);
    expect(store.effectiveConfiguration(state).locomotion.speed).toBe(0.3);
    expect(store.selectedConfiguration(state).locomotion.speed).toBe(DEFAULT_GRAPH_CADENCE.speed);
    expect(configurationHash(BASELINE_04B_R1)).toBe(before);
  });

  it('marks a draft EXPERIMENTAL and unfrozen even when it came from the baseline', () => {
    const state = store.editParameter(store.emptyStoreState(), 'locomotion.speed', 0.25);
    expect(state.draft!.metadata.lifecycle).toBe('EXPERIMENTAL');
    expect(state.draft!.metadata.experimental).toBe(true);
    expect(state.draft!.metadata.frozen).toBe(false);
  });

  it('resets to the selection and to the baseline', () => {
    let state = store.editParameter(store.emptyStoreState(), 'locomotion.speed', 0.3);
    expect(store.effectiveConfiguration(store.resetToSelected(state)).locomotion.speed)
      .toBe(DEFAULT_GRAPH_CADENCE.speed);
    state = store.saveAsNew(state, 'Faster');
    state = store.editParameter(state, 'perception.directSenseRadius', 400);
    state = store.resetToBaseline(state);
    expect(state.selectedId).toBe(BASELINE_CONFIGURATION_ID);
    expect(store.effectiveConfiguration(state)).toEqual(BASELINE_04B_R1);
  });

  it('saves a new configuration as EXPERIMENTAL with the parent recorded, never as BASELINE', () => {
    let state = store.editParameter(store.emptyStoreState(), 'locomotion.speed', 0.3);
    state = store.saveAsNew(state, 'Purposeful test', { now: '2026-09-04T00:00:00.000Z' });
    const saved = state.saved[0];
    expect(saved.metadata.lifecycle).toBe('EXPERIMENTAL');
    expect(saved.metadata.parentConfigurationId).toBe(BASELINE_CONFIGURATION_ID);
    expect(saved.metadata.authorityCommit).toBeNull();
    expect(saved.locomotion.speed).toBe(0.3);
    expect(saved.identity.configurationId).toBe('custom/purposeful-test');
    expect(store.isModified(state)).toBe(false);
  });

  it('never assigns the same id twice', () => {
    let state = store.emptyStoreState();
    state = store.saveAsNew(state, 'Trial');
    state = store.select(state, BASELINE_CONFIGURATION_ID);
    state = store.saveAsNew(state, 'Trial');
    expect(state.saved.map((c) => c.identity.configurationId)).toEqual(['custom/trial', 'custom/trial-2']);
  });

  it('refuses to rename or delete a built-in', () => {
    let state = store.emptyStoreState();
    state = store.rename(state, BASELINE_CONFIGURATION_ID, 'Mine now');
    expect(store.selectedConfiguration(state).identity.label).toBe('04B-R1 BASELINE');
    state = store.remove(state, BASELINE_CONFIGURATION_ID);
    expect(store.findConfiguration(state, BASELINE_CONFIGURATION_ID)).not.toBeNull();
  });

  it('validates a paste through the same validator, and refuses a bad one visibly', () => {
    const state = store.emptyStoreState();
    expect(store.pasteConfiguration(state, 'not json').ok).toBe(false);
    const broken = copy(BASELINE_04B_R1);
    broken.locomotion.pauseChance = 9;
    const refused = store.pasteConfiguration(state, JSON.stringify(broken));
    expect(refused.ok).toBe(false);
    expect(refused.failure).toContain('pauseChance');
    expect(refused.state).toBe(state);
  });

  it('lands a pasted baseline as somebody else’s experiment, not as the baseline', () => {
    const outcome = store.pasteConfiguration(store.emptyStoreState(), JSON.stringify(BASELINE_04B_R1));
    expect(outcome.ok).toBe(true);
    const pasted = outcome.state.saved[0];
    expect(pasted.metadata.lifecycle).toBe('EXPERIMENTAL');
    expect(pasted.metadata.source).toBe('PASTED');
    expect(pasted.identity.configurationId).not.toBe(BASELINE_CONFIGURATION_ID);
    // ...and behaviourally it is still the same pursuer, which the hash says.
    expect(configurationHash(pasted)).toBe(configurationHash(BASELINE_04B_R1));
  });

  it('survives storage that is missing, unreadable or full', () => {
    expect(store.loadStoreState(null).selectedId).toBe(BASELINE_CONFIGURATION_ID);
    expect(store.loadStoreState({ getItem: () => { throw new Error('blocked'); } }).saved).toHaveLength(0);
    expect(store.loadStoreState({ getItem: () => '{ not json' }).loadWarnings.length).toBe(1);
    expect(store.saveStoreState(store.emptyStoreState(), {
      setItem: () => { throw new Error('quota'); },
    })).toBe(false);
  });

  it('round-trips through storage and drops anything that no longer validates', () => {
    let state = store.editParameter(store.emptyStoreState(), 'locomotion.speed', 0.3);
    state = store.saveAsNew(state, 'Keeper');
    let written = '';
    expect(store.saveStoreState(state, { setItem: (_k, v) => { written = v; } })).toBe(true);
    const restored = store.loadStoreState({ getItem: () => written });
    expect(restored.saved).toHaveLength(1);
    expect(restored.saved[0].locomotion.speed).toBe(0.3);
    expect(restored.selectedId).toBe('custom/keeper');

    const corrupted = JSON.parse(written);
    corrupted.saved[0].locomotion.speed = 'fast';
    const salvaged = store.loadStoreState({ getItem: () => JSON.stringify(corrupted) });
    expect(salvaged.saved).toHaveLength(0);
    expect(salvaged.selectedId).toBe(BASELINE_CONFIGURATION_ID);
    expect(salvaged.loadWarnings.join(' ')).toContain('custom/keeper');
  });

  it('ignores a store written by a different build rather than guessing at it', () => {
    const foreign = JSON.stringify({ version: 2, saved: [], selectedId: 'x', draft: null, notes: {} });
    const state = store.loadStoreState({ getItem: () => foreign });
    expect(state.selectedId).toBe(BASELINE_CONFIGURATION_ID);
    expect(state.loadWarnings[0]).toContain('different build');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('10. test notes are recorded and never interpreted', () => {
  it('offers exactly the dimensions the brief asks for', () => {
    expect(TEST_NOTE_DIMENSIONS.map((d) => d.label)).toEqual([
      'THREAT', 'PURPOSEFUL MOVEMENT', 'TOO STAGGERED',
      'SEEMS TO GET LOST', 'MATH THINKING TIME', 'FAIRNESS',
    ]);
  });

  it('starts unrated rather than at a middle default', () => {
    const notes = emptyTestSessionNotes();
    expect(Object.values(notes.ratings).every((r) => r === null)).toBe(true);
    expect(hasAnyTestNote(notes)).toBe(false);
  });

  it('never invents a rating when reading notes back', () => {
    const notes = normalizeTestSessionNotes({
      ratings: { threat: 5, fairness: 0, purposefulMovement: 'high', seemsToGetLost: 3.5 },
      freeText: 'it hunted me',
    });
    expect(notes.ratings.threat).toBe(5);
    expect(notes.ratings.fairness).toBeNull();
    expect(notes.ratings.purposefulMovement).toBeNull();
    expect(notes.ratings.seemsToGetLost).toBeNull();
    expect(notes.freeText).toBe('it hunted me');
  });

  it('has no scoring, thresholding or aggregation anywhere in the module', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/games/circuit-climb/pursuer-v2/config/testSessionNotes.ts', 'utf8'));
    // A rating is a tester's word. Nothing may turn it into a measurement.
    for (const forbidden of ['score', 'average', 'threshold', 'weight', 'recommend']) {
      expect(source.toLowerCase().split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
        .join('\n')).not.toContain(forbidden);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('11. the experiments are declared, and honestly not instantiated', () => {
  it('declares A, B, C and D with a parent, a hypothesis and an intended effect', () => {
    expect(DECLARED_EXPERIMENTS.map((e) => e.key)).toEqual(['A', 'B', 'C', 'D']);
    for (const experiment of DECLARED_EXPERIMENTS) {
      expect(experiment.parentConfigurationId).toBe(BASELINE_CONFIGURATION_ID);
      expect(experiment.hypothesis.length).toBeGreaterThan(40);
      expect(experiment.intendedPlayerVisibleEffect.length).toBeGreaterThan(10);
      expect(experiment.blockedBy.length).toBeGreaterThan(20);
    }
  });

  it('ships none of them as a configuration, so none can become a default by accident', () => {
    expect(BUILT_IN_CONFIGURATIONS.map((c) => c.identity.configurationId))
      .toEqual([BASELINE_CONFIGURATION_ID]);
  });

  it('builds D only after A, B and C', () => {
    expect(DECLARED_EXPERIMENTS.find((e) => e.key === 'D')!.requires).toEqual(['A', 'B', 'C']);
  });

  it('records that B is blocked by the frozen commitment layer as well as by missing values', () => {
    const b = DECLARED_EXPERIMENTS.find((e) => e.key === 'B')!;
    expect(b.blockedBy).toContain('commitment');
    // The only persistence parameter presently settable really is that one.
    expect(b.allowedPaths).toEqual(['perception.trailRowRetention']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('12. derivation makes a copy, never a promotion', () => {
  it('never inherits BASELINE, an authority commit, or frozen status', () => {
    const derived = deriveConfiguration(BASELINE_04B_R1, {
      configurationId: 'custom/x', label: 'X',
    });
    expect(derived.metadata.lifecycle).toBe('EXPERIMENTAL');
    expect(derived.metadata.authorityCommit).toBeNull();
    expect(derived.metadata.frozen).toBe(false);
    expect(derived.metadata.experimental).toBe(true);
    expect(derived.metadata.parentConfigurationId).toBe(BASELINE_CONFIGURATION_ID);
    // ...and is behaviourally identical until something is changed.
    expect(configurationHash(derived)).toBe(configurationHash(BASELINE_04B_R1));
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('13. the configuration actually reaches the pursuer', () => {
  const SESSION = { climbColumns: [0, 2, 0], thinkMs: 1200, stationaryMs: 4000, dtMs: 16.7 };

  it('produces byte-identical behaviour whether the baseline is passed explicitly or not', () => {
    const implicit = runProductionSurface({ ...SESSION });
    const explicit = runProductionSurface({
      ...SESSION, configuration: resolveBaselineConfiguration({ logicalWidth: 600 }),
    });
    expect(explicit.trace.map((r) => `${r.mode}:${r.commandedNode}:${r.pursuerX.toFixed(6)}`))
      .toEqual(implicit.trace.map((r) => `${r.mode}:${r.commandedNode}:${r.pursuerX.toFixed(6)}`));
  }, 120000);

  it('changes the run when locomotion changes — the wiring is live, not decorative', () => {
    const baseline = runProductionSurface({ ...SESSION });
    const candidate = copy(BASELINE_04B_R1);
    candidate.locomotion.speed = 0.3;
    candidate.identity.configurationId = 'custom/faster';
    const outcome = resolvePursuerConfiguration(candidate, { logicalWidth: 600 });
    expect(outcome.ok).toBe(true);
    const faster = runProductionSurface({ ...SESSION, configuration: outcome.resolved! });
    expect(faster.trace[faster.trace.length - 1].pursuerX)
      .not.toBe(baseline.trace[baseline.trace.length - 1].pursuerX);
    // Faster locomotion covers more ground, which is the point of the parameter.
    const distance = (run: typeof baseline) => run.trace.reduce((total, row, i) => (
      i === 0 ? 0 : total + Math.hypot(row.pursuerX - run.trace[i - 1].pursuerX,
        row.pursuerY - run.trace[i - 1].pursuerY)), 0);
    expect(distance(faster)).toBeGreaterThan(distance(baseline));
  }, 120000);

  it('changes the run when the sense radius changes', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.perception.directSenseRadius = 60;
    const outcome = resolvePursuerConfiguration(candidate, { logicalWidth: 600 });
    const blind = runProductionSurface({ ...SESSION, configuration: outcome.resolved! });
    const baseline = runProductionSurface({ ...SESSION });
    const sensed = (run: typeof blind) => run.trace.filter((r) => r.directSense).length;
    expect(sensed(blind)).toBeLessThan(sensed(baseline));
  }, 120000);

  it('changes the run when trail retention changes', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.perception.trailRowRetention = 1;
    const outcome = resolvePursuerConfiguration(candidate, { logicalWidth: 600 });
    const forgetful = runProductionSurface({ ...SESSION, configuration: outcome.resolved! });
    const baseline = runProductionSurface({ ...SESSION });
    expect(forgetful.trace.map((r) => r.commandedNode).join('|'))
      .not.toBe(baseline.trace.map((r) => r.commandedNode).join('|'));
  }, 120000);

  it('refuses loudly if a configuration names a frozen value this build does not read', () => {
    // The one way an unimplemented override could reach the controller: a
    // caller that legitimately holds `allowFrozenEdits` for a spawn A/B and
    // then changes something else in the same layer.
    const candidate = copy(BASELINE_04B_R1);
    candidate.commitment.lossConfirmationTicks = 9;
    const outcome = resolvePursuerConfiguration(candidate, { allowFrozenEdits: true });
    expect(outcome.ok).toBe(true);
    expect(() => new GraphPursuerController({
      world: runProductionSurface({ ...SESSION, stationaryMs: 100 }).world,
      rowCount: 8,
      learnerStart: { x: 100, y: 0, row: 0 },
      configuration: outcome.resolved!,
    })).toThrow(/lossConfirmationTicks/);
  }, 120000);

  it('honours the frozen spawn rule when one is authorized, which the A/B path needs', () => {
    const candidate = copy(BASELINE_04B_R1);
    candidate.spawnCapture.spawnRule = 'INTEGRATION_BELOW_LEARNER';
    const outcome = resolvePursuerConfiguration(candidate, { allowFrozenEdits: true });
    const integration = runProductionSurface({ ...SESSION, configuration: outcome.resolved! });
    const authority = runProductionSurface({ ...SESSION });
    // The rejected 04A placement starts the pursuer directly beneath the
    // learner; the accepted one starts it across the board.
    expect(integration.trace[0].distanceToLearner)
      .toBeLessThan(authority.trace[0].distanceToLearner);
  }, 120000);
});
