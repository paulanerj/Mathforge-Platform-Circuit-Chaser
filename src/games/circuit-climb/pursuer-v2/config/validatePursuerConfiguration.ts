/**
 * THE ONE VALIDATOR (04C).
 *
 * Every configuration that can reach the pursuer comes through here, whatever
 * door it arrived at: a built-in, a slider edit, a duplicate, a JSON paste
 * from a bug report, or — later — a selection made by a host that does not
 * exist yet. There is deliberately no second, gentler path for "our own"
 * configurations. A built-in that fails this validator is a bug in the
 * built-in, and the right outcome is a loud failure, not a quiet exemption.
 *
 * Two properties matter more than completeness:
 *
 *   NOTHING PARTIAL RUNS. Validation returns either a fully-formed, frozen
 *   configuration or no configuration at all. A payload missing a field does
 *   not get a default filled in silently — a run whose evidence says
 *   `pauseChance: 0.62` because a reader supplied it, not because a tester
 *   chose it, is evidence about nothing.
 *
 *   FAILURE IS VISIBLE. Issues carry the exact path, a stable code and a
 *   sentence a person can act on. An unknown schema version is the first
 *   check and is fatal on its own: a payload written against a schema this
 *   build does not know may use the same field name for a different meaning.
 */

import {
  PURSUER_CONFIG_SCHEMA_VERSION, BEHAVIOUR_LAYERS, CONFIGURATION_LIFECYCLES,
  type PursuerConfiguration, type BehaviourLayer,
} from './pursuerConfigurationSchema';

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING';
  /** Dot path into the configuration, or '' for a whole-payload issue. */
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: readonly ValidationIssue[];
  /** Deep-frozen, and present only when `ok`. */
  configuration: PursuerConfiguration | null;
}

export interface ValidationOptions {
  /**
   * The board's logical width, when it is known. Enables the one invariant
   * that cannot be checked from the payload alone: a direct-sense radius at
   * or beyond the width of the board does not make the pursuer harder, it
   * makes the trail and search layers unreachable.
   */
  logicalWidth?: number;
  /**
   * The configuration whose frozen layers this one must match. Supplied by the
   * resolver on every real path. Omitted only when validating a payload in
   * isolation — e.g. checking a paste before offering to load it.
   */
  frozenReference?: PursuerConfiguration | null;
  /**
   * Set ONLY where a separate authorization to change spawn, capture,
   * commitment or chassis values exists. There is no UI that sets this.
   */
  allowFrozenEdits?: boolean;
}

/** Layers a human may edit in this build; the rest must match the reference. */
const FROZEN_LAYERS: readonly BehaviourLayer[] = ['commitment', 'chassis', 'spawnCapture'];

interface Bound {
  min: number;
  max: number;
  /** Slider granularity, and the granularity the UI must offer. */
  step: number;
  integer?: boolean;
  unit: string;
  /** Why this bound is where it is. Shown in the tuning UI. */
  reason: string;
}

/**
 * The bounds, in one table, so the validator and the tuning UI cannot disagree
 * about what is offerable. A slider that can produce a value this rejects is a
 * slider that can waste a tester's session.
 *
 * Every bound has a reason that is about the game, not about taste.
 */
export const PARAMETER_BOUNDS: Readonly<Record<string, Bound>> = {
  'locomotion.speed': {
    min: 0.01, max: 1, step: 0.005, unit: ' u/ms',
    reason: 'The learner walks its route at 0.62 u/ms. 1.0 already outruns it by 60%; below 0.01 the pursuer cannot cross a row inside a session.',
  },
  'locomotion.minBurstMs': {
    min: 20, max: 4000, step: 10, unit: ' ms',
    reason: 'Below one frame a burst cannot be observed; above 4s a burst outlasts a whole row traversal and the cadence stops reading as bursty.',
  },
  'locomotion.maxBurstMs': {
    min: 20, max: 4000, step: 10, unit: ' ms',
    reason: 'Same range as the lower bound it must not fall below.',
  },
  'locomotion.minPauseMs': {
    min: 0, max: 4000, step: 10, unit: ' ms',
    reason: 'Zero is legitimate — it means a drawn pause can be instantaneous. Above 4s the pursuer reads as broken rather than hesitant.',
  },
  'locomotion.maxPauseMs': {
    min: 0, max: 4000, step: 10, unit: ' ms',
    reason: 'Same range as the lower bound it must not fall below.',
  },
  'locomotion.pauseChance': {
    min: 0, max: 1, step: 0.01, unit: '',
    reason: 'A probability. 0 means a burst is never followed by a pause; 1 means always.',
  },
  'locomotion.cadenceSeed': {
    min: 0, max: 2147483647, step: 1, integer: true, unit: '',
    reason: 'A 31-bit integer seed. The generator takes `seed | 0`, so anything wider is silently truncated.',
  },
  'locomotion.laneSeed': {
    min: 0, max: 2147483647, step: 1, integer: true, unit: '',
    reason: 'A 31-bit integer seed, as above.',
  },
  'perception.directSenseRadius': {
    min: 20, max: 560, step: 5, unit: ' u',
    reason: 'The board is 600 logical units wide. A radius at or beyond that senses the whole board and makes the trail and search layers dead code — an architecture change, not a difficulty setting.',
  },
  'perception.trailRowRetention': {
    min: 1, max: 32, step: 1, integer: true, unit: ' row transitions',
    reason: 'At least one, or there is no trail to track. Above 32 the retained trail spans more rows than a session produces.',
  },
  'commitment.lossConfirmationTicks': {
    min: 1, max: 600, step: 1, integer: true, unit: ' ticks',
    reason: 'At least one frame. 600 frames is ten seconds at 60Hz, well past any confirmation that could still be called one.',
  },
  'commitment.acquireConfirmationTicks': {
    min: 1, max: 600, step: 1, integer: true, unit: ' ticks', reason: 'As above.',
  },
  'commitment.trailExhaustionConfirmationTicks': {
    min: 1, max: 600, step: 1, integer: true, unit: ' ticks', reason: 'As above.',
  },
  'commitment.leadPreemptionConfirmationTicks': {
    min: 1, max: 600, step: 1, integer: true, unit: ' ticks', reason: 'As above.',
  },
  'commitment.maxRememberedFragments': {
    min: 1, max: 512, step: 1, integer: true, unit: ' fragments',
    reason: 'Bounded memory. At least one fragment, and bounded well below anything that would let memory grow without limit.',
  },
  'chassis.laneBandFraction': {
    min: 0.01, max: 0.99, step: 0.01, unit: '',
    reason: 'Strictly inside (0,1). At or beyond either end a lane offset leaves the band the graph proved clear, and the actor can clip a card.',
  },
  'chassis.targetEpsilon': {
    min: 0.01, max: 64, step: 0.01, unit: ' u',
    reason: 'Positive, or every frame counts as a new target and the retarget gate never closes.',
  },
  'chassis.arrivalEpsilon': {
    min: 0.01, max: 64, step: 0.01, unit: ' u',
    reason: 'Positive, or arrival is untestable in floating point.',
  },
  'spawnCapture.groundLevels': {
    min: 0, max: 8, step: 1, integer: true, unit: ' levels',
    reason: 'Connector levels below row 0. Zero means the pursuer cannot start beneath the learner; beyond 8 the spawn is further below the board than the search will ever look.',
  },
};

/** min/max pairs that must not cross. */
const ORDERED_PAIRS: readonly [string, string][] = [
  ['locomotion.minBurstMs', 'locomotion.maxBurstMs'],
  ['locomotion.minPauseMs', 'locomotion.maxPauseMs'],
];

function issue(severity: ValidationIssue['severity'], path: string, code: string, message: string): ValidationIssue {
  return { severity, path, code, message };
}

function readPath(root: unknown, path: string): unknown {
  let current: any = root;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) deepFreeze((value as any)[key]);
  return value;
}

/**
 * Validate a candidate payload of unknown provenance.
 *
 * Returns every issue it can find rather than the first, so a person fixing a
 * pasted configuration is not led through them one reload at a time.
 */
export function validatePursuerConfiguration(
  candidate: unknown,
  options: ValidationOptions = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fail = (): ValidationResult => ({ ok: false, issues, configuration: null });

  if (!isPlainObject(candidate)) {
    issues.push(issue('ERROR', '', 'NOT_AN_OBJECT', 'A configuration must be a JSON object.'));
    return fail();
  }

  // ── schema version, first and fatal on its own ─────────────────────────
  const version = readPath(candidate, 'identity.schemaVersion');
  if (typeof version !== 'string' || version.length === 0) {
    issues.push(issue('ERROR', 'identity.schemaVersion', 'SCHEMA_VERSION_MISSING',
      `No schema version. This build runs "${PURSUER_CONFIG_SCHEMA_VERSION}".`));
    return fail();
  }
  if (version !== PURSUER_CONFIG_SCHEMA_VERSION) {
    issues.push(issue('ERROR', 'identity.schemaVersion', 'SCHEMA_VERSION_UNKNOWN',
      `Configuration is "${version}"; this build runs "${PURSUER_CONFIG_SCHEMA_VERSION}". `
      + 'It is not loaded: a field name shared between two schema versions may not mean the same thing in both.'));
    return fail();
  }

  // ── structure ──────────────────────────────────────────────────────────
  for (const layer of [...BEHAVIOUR_LAYERS, 'identity', 'metadata'] as const) {
    if (!isPlainObject((candidate as any)[layer])) {
      issues.push(issue('ERROR', layer, 'LAYER_MISSING', `Missing or malformed layer "${layer}".`));
    }
  }
  if (issues.length) return fail();

  for (const field of ['configurationId', 'label', 'description'] as const) {
    const value = readPath(candidate, `identity.${field}`);
    if (typeof value !== 'string') {
      issues.push(issue('ERROR', `identity.${field}`, 'NOT_A_STRING', `\`identity.${field}\` must be a string.`));
    }
  }
  if (typeof readPath(candidate, 'identity.configurationId') === 'string'
    && (readPath(candidate, 'identity.configurationId') as string).trim() === '') {
    issues.push(issue('ERROR', 'identity.configurationId', 'EMPTY_ID', 'A configuration must have a non-empty id.'));
  }

  // ── every bounded numeric ──────────────────────────────────────────────
  for (const [path, bound] of Object.entries(PARAMETER_BOUNDS)) {
    const value = readPath(candidate, path);
    if (typeof value !== 'number') {
      issues.push(issue('ERROR', path, 'NOT_A_NUMBER', `\`${path}\` must be a number.`));
      continue;
    }
    if (!Number.isFinite(value)) {
      issues.push(issue('ERROR', path, 'NOT_FINITE', `\`${path}\` must be finite (got ${String(value)}).`));
      continue;
    }
    if (bound.integer && !Number.isInteger(value)) {
      issues.push(issue('ERROR', path, 'NOT_AN_INTEGER', `\`${path}\` must be a whole number (got ${value}).`));
      continue;
    }
    if (value < bound.min || value > bound.max) {
      issues.push(issue('ERROR', path, 'OUT_OF_RANGE',
        `\`${path}\` must be between ${bound.min} and ${bound.max}${bound.unit} (got ${value}). ${bound.reason}`));
    }
  }

  // ── booleans and enums ─────────────────────────────────────────────────
  const captureRail = readPath(candidate, 'spawnCapture.captureRail');
  if (typeof captureRail !== 'boolean') {
    issues.push(issue('ERROR', 'spawnCapture.captureRail', 'NOT_A_BOOLEAN', '`spawnCapture.captureRail` must be true or false.'));
  }
  const spawnRule = readPath(candidate, 'spawnCapture.spawnRule');
  if (spawnRule !== 'AUTHORITY_FURTHEST_TRUNK' && spawnRule !== 'INTEGRATION_BELOW_LEARNER') {
    issues.push(issue('ERROR', 'spawnCapture.spawnRule', 'UNKNOWN_SPAWN_RULE',
      `Unknown spawn rule ${JSON.stringify(spawnRule)}.`));
  }
  const lifecycle = readPath(candidate, 'metadata.lifecycle');
  if (!CONFIGURATION_LIFECYCLES.includes(lifecycle as any)) {
    issues.push(issue('ERROR', 'metadata.lifecycle', 'UNKNOWN_LIFECYCLE',
      `Unknown lifecycle ${JSON.stringify(lifecycle)}. One of: ${CONFIGURATION_LIFECYCLES.join(', ')}.`));
  }
  for (const flag of ['experimental', 'frozen'] as const) {
    if (typeof readPath(candidate, `metadata.${flag}`) !== 'boolean') {
      issues.push(issue('ERROR', `metadata.${flag}`, 'NOT_A_BOOLEAN', `\`metadata.${flag}\` must be true or false.`));
    }
  }

  // ── the strategy layer is reserved, and empty in v1 ────────────────────
  const strategy = (candidate as any).strategy;
  if (isPlainObject(strategy) && Object.keys(strategy).length > 0) {
    issues.push(issue('ERROR', 'strategy', 'STRATEGY_NOT_EMPTY',
      'The strategy layer is reserved and empty in this schema version. '
      + `Fields present: ${Object.keys(strategy).join(', ')}.`));
  }

  // ── relational invariants ──────────────────────────────────────────────
  for (const [lowPath, highPath] of ORDERED_PAIRS) {
    const low = readPath(candidate, lowPath);
    const high = readPath(candidate, highPath);
    if (typeof low === 'number' && typeof high === 'number' && Number.isFinite(low) && Number.isFinite(high)
      && low > high) {
      issues.push(issue('ERROR', highPath, 'RANGE_INVERTED',
        `\`${lowPath}\` (${low}) must not exceed \`${highPath}\` (${high}) — the draw would have no range to sample.`));
    }
  }

  const senseRadius = readPath(candidate, 'perception.directSenseRadius');
  if (typeof options.logicalWidth === 'number' && typeof senseRadius === 'number'
    && Number.isFinite(senseRadius) && senseRadius >= options.logicalWidth) {
    issues.push(issue('ERROR', 'perception.directSenseRadius', 'SENSE_SPANS_BOARD',
      `A direct-sense radius of ${senseRadius} spans the whole ${options.logicalWidth}-unit board. `
      + 'The pursuer would never lose the learner, and the trail and search layers would never run.'));
  }

  // ── frozen layers ──────────────────────────────────────────────────────
  if (options.frozenReference && !options.allowFrozenEdits) {
    for (const layer of FROZEN_LAYERS) {
      const reference = (options.frozenReference as any)[layer];
      const actual = (candidate as any)[layer];
      for (const key of Object.keys(reference)) {
        if (actual[key] !== reference[key]) {
          issues.push(issue('ERROR', `${layer}.${key}`, 'FROZEN_LAYER_EDITED',
            `\`${layer}.${key}\` is frozen in this build: it is ${JSON.stringify(reference[key])} `
            + `and this configuration sets ${JSON.stringify(actual[key])}. `
            + 'Spawn, capture, chassis and commitment values change only under separate authorization.'));
        }
      }
    }
  }

  if (issues.some((i) => i.severity === 'ERROR')) return fail();

  // Rebuilt field by field rather than passed through, so an unrecognised
  // extra field in a paste cannot ride along into the run or the hash.
  const source = candidate as any;
  const configuration: PursuerConfiguration = {
    identity: {
      schemaVersion: PURSUER_CONFIG_SCHEMA_VERSION,
      configurationId: source.identity.configurationId,
      label: source.identity.label,
      description: source.identity.description,
    },
    locomotion: {
      speed: source.locomotion.speed,
      minBurstMs: source.locomotion.minBurstMs,
      maxBurstMs: source.locomotion.maxBurstMs,
      minPauseMs: source.locomotion.minPauseMs,
      maxPauseMs: source.locomotion.maxPauseMs,
      pauseChance: source.locomotion.pauseChance,
      cadenceSeed: source.locomotion.cadenceSeed,
      laneSeed: source.locomotion.laneSeed,
    },
    perception: {
      directSenseRadius: source.perception.directSenseRadius,
      trailRowRetention: source.perception.trailRowRetention,
    },
    strategy: {},
    commitment: {
      lossConfirmationTicks: source.commitment.lossConfirmationTicks,
      acquireConfirmationTicks: source.commitment.acquireConfirmationTicks,
      trailExhaustionConfirmationTicks: source.commitment.trailExhaustionConfirmationTicks,
      leadPreemptionConfirmationTicks: source.commitment.leadPreemptionConfirmationTicks,
      maxRememberedFragments: source.commitment.maxRememberedFragments,
    },
    chassis: {
      laneBandFraction: source.chassis.laneBandFraction,
      targetEpsilon: source.chassis.targetEpsilon,
      arrivalEpsilon: source.chassis.arrivalEpsilon,
    },
    spawnCapture: {
      spawnRule: source.spawnCapture.spawnRule,
      groundLevels: source.spawnCapture.groundLevels,
      captureRail: source.spawnCapture.captureRail,
    },
    metadata: {
      lifecycle: source.metadata.lifecycle,
      source: source.metadata.source ?? 'PASTED',
      parentConfigurationId: source.metadata.parentConfigurationId ?? null,
      authorityCommit: source.metadata.authorityCommit ?? null,
      notes: typeof source.metadata.notes === 'string' ? source.metadata.notes : '',
      createdAt: typeof source.metadata.createdAt === 'string' ? source.metadata.createdAt : null,
      experimental: source.metadata.experimental,
      frozen: source.metadata.frozen,
    },
  };

  return { ok: true, issues, configuration: deepFreeze(configuration) };
}

/** A one-line human summary of why a payload was refused. */
export function describeValidationFailure(result: ValidationResult): string {
  const errors = result.issues.filter((i) => i.severity === 'ERROR');
  if (!errors.length) return 'valid';
  return errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join('\n');
}
