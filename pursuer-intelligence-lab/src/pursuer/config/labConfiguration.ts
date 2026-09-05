/**
 * THE LAB CONFIGURATION CONTRACT.
 *
 * ADAPTED from production's 04C first-class configuration philosophy, with the
 * scope a research sandbox needs: a lab configuration names WHICH BRAIN, WHICH
 * PERCEPTION MODEL and which parameters, because in here all three are
 * variables.
 *
 * The rules that carry across unchanged, because they are what make a tester's
 * report reproducible:
 *
 *   ONE validator, for built-ins, edits and pastes alike.
 *   NOTHING PARTIAL runs — a missing field is a refusal, not a default.
 *   An unknown schema version is fatal and says so.
 *   The hash covers behaviour and nothing else, so a rename is not a new
 *   pursuer and two people who dial in the same numbers agree.
 *   NOTHING here promotes a configuration. `APPROVED_FOR_LAB` is a human
 *   decision, and it is still not production authority.
 */

import { sha256Hex, canonicalizeParameters } from './hash';
import type { TimebaseMode } from '../../sim/timebase';
import { SIM_STEP_MS } from '../../sim/timebase';
import { BASELINE_LOCOMOTION, type LocomotionConfig } from '../rig';

export const LAB_CONFIG_SCHEMA_VERSION = 'circuit-climb-lab-config/v1';

/**
 * Lifecycle. Note the ceiling: the best a lab configuration can reach is
 * APPROVED_FOR_LAB. Production authority is a separate, PM-controlled
 * integration phase and nothing in this sandbox can grant it.
 */
export type LabLifecycle = 'BASELINE' | 'EXPERIMENTAL' | 'CANDIDATE' | 'APPROVED_FOR_LAB' | 'REJECTED';

export const LAB_LIFECYCLES: readonly LabLifecycle[] = [
  'BASELINE', 'EXPERIMENTAL', 'CANDIDATE', 'APPROVED_FOR_LAB', 'REJECTED',
];

export interface LabConfiguration {
  schemaVersion: string;
  configurationId: string;
  label: string;
  description: string;
  brainId: string;
  perceptionModelId: string;
  /** The Brain's own parameters. Shape is the Brain's business. */
  brainConfig: Record<string, unknown>;
  /** The perception model's own parameters. */
  perceptionConfig: Record<string, unknown>;
  /** Shared by every Brain, because they all drive the same chassis. */
  locomotion: LocomotionConfig;
  timebase: TimebaseMode;
  stepMs: number;
  parentConfigurationId: string | null;
  notes: string;
  lifecycle: LabLifecycle;
  createdAt: string | null;
}

export interface LabValidationIssue { path: string; message: string }

export interface LabValidationResult {
  ok: boolean;
  issues: LabValidationIssue[];
  configuration: LabConfiguration | null;
}

/** Everything the validator needs to know about the Brain and model named. */
export interface RegistryView {
  brainIds: readonly string[];
  perceptionIds: readonly string[];
  brainParameters(brainId: string): ReadonlyArray<{ path: string; min: number; max: number; integer?: boolean }>;
  perceptionParameters(id: string): ReadonlyArray<{ path: string; min: number; max: number; integer?: boolean }>;
}

const LOCOMOTION_BOUNDS: Record<keyof LocomotionConfig, { min: number; max: number; integer?: boolean }> = {
  speed: { min: 0.01, max: 1 },
  minBurstMs: { min: 20, max: 4000 },
  maxBurstMs: { min: 20, max: 4000 },
  minPauseMs: { min: 0, max: 4000 },
  maxPauseMs: { min: 0, max: 4000 },
  pauseChance: { min: 0, max: 1 },
  cadenceSeed: { min: 0, max: 2147483647, integer: true },
  laneSeed: { min: 0, max: 2147483647, integer: true },
};

export function validateLabConfiguration(candidate: unknown, registry: RegistryView): LabValidationResult {
  const issues: LabValidationIssue[] = [];
  const fail = (): LabValidationResult => ({ ok: false, issues, configuration: null });
  const add = (path: string, message: string) => issues.push({ path, message });

  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    add('', 'A configuration must be a JSON object.');
    return fail();
  }
  const source = candidate as Record<string, any>;

  if (source.schemaVersion !== LAB_CONFIG_SCHEMA_VERSION) {
    add('schemaVersion',
      `Configuration is ${JSON.stringify(source.schemaVersion)}; this build runs "${LAB_CONFIG_SCHEMA_VERSION}". `
      + 'It is not loaded: the same field name may not mean the same thing in two schema versions.');
    return fail();
  }

  for (const field of ['configurationId', 'label'] as const) {
    if (typeof source[field] !== 'string' || !source[field].trim()) add(field, `\`${field}\` must be a non-empty string.`);
  }
  if (!registry.brainIds.includes(source.brainId)) {
    add('brainId', `Unknown Brain ${JSON.stringify(source.brainId)}. Registered: ${registry.brainIds.join(', ')}.`);
  }
  if (!registry.perceptionIds.includes(source.perceptionModelId)) {
    add('perceptionModelId', `Unknown perception model ${JSON.stringify(source.perceptionModelId)}. Registered: ${registry.perceptionIds.join(', ')}.`);
  }
  if (!LAB_LIFECYCLES.includes(source.lifecycle)) {
    add('lifecycle', `Unknown lifecycle ${JSON.stringify(source.lifecycle)}. One of: ${LAB_LIFECYCLES.join(', ')}.`);
  }
  if (source.timebase !== 'FIXED' && source.timebase !== 'RENDER_COUPLED') {
    add('timebase', `Timebase must be FIXED or RENDER_COUPLED, not ${JSON.stringify(source.timebase)}.`);
  }
  if (!Number.isFinite(source.stepMs) || source.stepMs <= 0 || source.stepMs > 100) {
    add('stepMs', 'The simulation step must be a positive number of milliseconds no greater than 100.');
  }
  if (issues.length) return fail();

  const checkGroup = (
    groupName: string,
    values: Record<string, unknown>,
    bounds: ReadonlyArray<{ path: string; min: number; max: number; integer?: boolean }>,
  ) => {
    if (typeof values !== 'object' || values === null) {
      add(groupName, `\`${groupName}\` must be an object.`);
      return;
    }
    for (const bound of bounds) {
      const value = values[bound.path];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        add(`${groupName}.${bound.path}`, `\`${groupName}.${bound.path}\` must be a finite number.`);
      } else if (bound.integer && !Number.isInteger(value)) {
        add(`${groupName}.${bound.path}`, `\`${groupName}.${bound.path}\` must be a whole number.`);
      } else if (value < bound.min || value > bound.max) {
        add(`${groupName}.${bound.path}`, `\`${groupName}.${bound.path}\` must be between ${bound.min} and ${bound.max} (got ${value}).`);
      }
    }
  };

  checkGroup('brainConfig', source.brainConfig, registry.brainParameters(source.brainId));
  checkGroup('perceptionConfig', source.perceptionConfig, registry.perceptionParameters(source.perceptionModelId));
  checkGroup('locomotion', source.locomotion,
    Object.entries(LOCOMOTION_BOUNDS).map(([path, bound]) => ({ path, ...bound })));

  if (source.locomotion && source.locomotion.minBurstMs > source.locomotion.maxBurstMs) {
    add('locomotion.maxBurstMs', 'The minimum burst must not exceed the maximum — the draw would have no range.');
  }
  if (source.locomotion && source.locomotion.minPauseMs > source.locomotion.maxPauseMs) {
    add('locomotion.maxPauseMs', 'The minimum pause must not exceed the maximum.');
  }
  if (issues.length) return fail();

  // Rebuilt field by field, so an unrecognised extra cannot ride into a run.
  const brainBounds = registry.brainParameters(source.brainId);
  const perceptionBounds = registry.perceptionParameters(source.perceptionModelId);
  const pick = (values: Record<string, unknown>, bounds: ReadonlyArray<{ path: string }>) =>
    Object.fromEntries(bounds.map((bound) => [bound.path, values[bound.path]]));

  const configuration: LabConfiguration = {
    schemaVersion: LAB_CONFIG_SCHEMA_VERSION,
    configurationId: source.configurationId,
    label: source.label,
    description: typeof source.description === 'string' ? source.description : '',
    brainId: source.brainId,
    perceptionModelId: source.perceptionModelId,
    brainConfig: pick(source.brainConfig, brainBounds),
    perceptionConfig: pick(source.perceptionConfig, perceptionBounds),
    locomotion: Object.fromEntries(
      Object.keys(LOCOMOTION_BOUNDS).map((key) => [key, source.locomotion[key]]),
    ) as unknown as LocomotionConfig,
    timebase: source.timebase,
    stepMs: source.stepMs,
    parentConfigurationId: typeof source.parentConfigurationId === 'string' ? source.parentConfigurationId : null,
    notes: typeof source.notes === 'string' ? source.notes : '',
    lifecycle: source.lifecycle,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : null,
  };
  return { ok: true, issues, configuration };
}

/** The canonical text a configuration hashes to. Behaviour only. */
export function canonicalizeLabConfiguration(configuration: LabConfiguration): string {
  return [
    `schemaVersion=${JSON.stringify(configuration.schemaVersion)}`,
    `brainId=${JSON.stringify(configuration.brainId)}`,
    `perceptionModelId=${JSON.stringify(configuration.perceptionModelId)}`,
    `timebase=${JSON.stringify(configuration.timebase)}`,
    `stepMs=${configuration.stepMs}`,
    ...canonicalizeParameters('brainConfig', configuration.brainConfig),
    ...canonicalizeParameters('perceptionConfig', configuration.perceptionConfig),
    ...canonicalizeParameters('locomotion', configuration.locomotion as unknown as Record<string, unknown>),
  ].join('\n');
}

export function labConfigurationHash(configuration: LabConfiguration): string {
  return sha256Hex(canonicalizeLabConfiguration(configuration));
}

export function shortLabHash(configuration: LabConfiguration): string {
  return labConfigurationHash(configuration).slice(0, 12);
}

/** Only the parameters that differ. Presentation fields are never behaviour. */
export function diffLabConfigurations(baseline: LabConfiguration, candidate: LabConfiguration) {
  const lines = (configuration: LabConfiguration) =>
    new Map(canonicalizeLabConfiguration(configuration).split('\n').map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)] as const;
    }));
  const before = lines(baseline);
  const after = lines(candidate);
  const paths = new Set([...before.keys(), ...after.keys()]);
  const differences: Array<{ path: string; baseline: string; candidate: string }> = [];
  for (const path of [...paths].sort()) {
    const a = before.get(path) ?? '—';
    const b = after.get(path) ?? '—';
    if (a !== b) differences.push({ path, baseline: a, candidate: b });
  }
  return { differences, identicalBehaviour: differences.length === 0 };
}

/** A copy, re-identified. Always EXPERIMENTAL; never inherits a baseline. */
export function deriveLabConfiguration(
  parent: LabConfiguration,
  options: { configurationId: string; label: string; notes?: string; createdAt?: string | null },
): LabConfiguration {
  return {
    ...parent,
    configurationId: options.configurationId,
    label: options.label,
    description: `Derived from ${parent.label}.`,
    brainConfig: { ...parent.brainConfig },
    perceptionConfig: { ...parent.perceptionConfig },
    locomotion: { ...parent.locomotion },
    parentConfigurationId: parent.configurationId,
    notes: options.notes ?? '',
    lifecycle: 'EXPERIMENTAL',
    createdAt: options.createdAt ?? null,
  };
}

/** The starting point: the production pursuer, as this lab runs it. */
export function baselineLabConfiguration(brainId: string, brainConfig: Record<string, unknown>): LabConfiguration {
  return {
    schemaVersion: LAB_CONFIG_SCHEMA_VERSION,
    configurationId: `builtin/${brainId.toLowerCase()}`,
    label: `${brainId} · default`,
    description: '',
    brainId,
    perceptionModelId: 'P0_PRODUCTION',
    brainConfig: { ...brainConfig },
    perceptionConfig: { directSenseRadius: 260 },
    locomotion: { ...BASELINE_LOCOMOTION },
    timebase: 'FIXED',
    stepMs: SIM_STEP_MS,
    parentConfigurationId: null,
    notes: '',
    lifecycle: 'BASELINE',
    createdAt: null,
  };
}
