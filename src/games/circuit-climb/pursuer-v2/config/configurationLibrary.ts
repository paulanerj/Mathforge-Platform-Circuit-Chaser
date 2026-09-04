/**
 * THE BUILT-IN CONFIGURATION LIBRARY (04C).
 *
 * Exactly one built-in configuration exists today, and that is the point of
 * this file rather than a gap in it.
 *
 * ── 04B-R1 BASELINE ─────────────────────────────────────────────────────
 * The authority baseline: the pursuer as commit 99fc8145 runs it. Every value
 * is IMPORTED from the module that owns it rather than transcribed, so the
 * baseline cannot drift away from the code it claims to describe — if somebody
 * edits `DEFAULT_GRAPH_CADENCE`, the baseline changes with it and
 * `pursuerV2Configuration.test.ts` fails, which is the correct outcome for an
 * unannounced change to the accepted behaviour.
 *
 * Its lifecycle is BASELINE, it is frozen, and nothing in this module can
 * promote or replace it.
 *
 * ── THE EXPERIMENTS ─────────────────────────────────────────────────────
 * The addendum names four experiments — PURPOSEFUL MOTION, PERSISTENT HUNTER,
 * HIGHER PRESSURE, and a COMBINED CANDIDATE built only after the first three
 * — and then says, plainly, not to invent their numbers before the PM tasks
 * that establish the real production parameter semantics.
 *
 * Those tasks have not reached this build. The 04C addendum arrived without
 * the main brief that carries them.
 *
 * So the experiments are DECLARED here and not instantiated. Each carries its
 * parent, its hypothesis, the player-visible effect it is meant to produce,
 * and the exact set of parameters it is allowed to touch — everything the
 * addendum asks an experiment to state EXCEPT the values, which are not mine
 * to choose. The library and the tuning UI both list them as awaiting
 * authorization, so the shape of the work is visible and the missing input is
 * impossible to overlook. Supplying the numbers later is a data change to this
 * file and nothing else; no architecture moves.
 */

import {
  PURSUER_CONFIG_SCHEMA_VERSION,
  type PursuerConfiguration,
  type BehaviourLayer,
} from './pursuerConfigurationSchema';
import { DEFAULT_GRAPH_CADENCE } from '../graph/graphCadence';
import { DEFAULT_GRAPH_PURSUER_CONFIG, LANE_BAND_FRACTION, TARGET_EPSILON } from '../graph/graphPursuerV2';
import { SPARK_SENSE_RADIUS } from '../brain/sensors';
import { DEFAULT_ROW_RETENTION } from '../contracts/trailRecorder';
import {
  LOSS_CONFIRMATION_TICKS, ACQUIRE_CONFIRMATION_TICKS,
  TRAIL_EXHAUSTION_CONFIRMATION_TICKS, LEAD_PREEMPTION_CONFIRMATION_TICKS,
  MAX_REMEMBERED_FRAGMENTS, ARRIVAL_EPSILON,
} from '../brain/graphBrainV1';

/** The commit whose behaviour the baseline reproduces. */
export const BASELINE_AUTHORITY_COMMIT = '99fc81456c7c3c7b1f39aadf86101aaa8f444cf6';

export const BASELINE_CONFIGURATION_ID = 'builtin/04b-r1-baseline';

/**
 * THE AUTHORITY BASELINE. Frozen, and the reference every diff is taken
 * against.
 *
 * Note what is NOT here: the actor's radius and the trail-sensing radius. Both
 * are derived from the live board, and a baseline that pinned them would claim
 * authority over a value the geometry owns.
 */
export const BASELINE_04B_R1: PursuerConfiguration = Object.freeze({
  identity: Object.freeze({
    schemaVersion: PURSUER_CONFIG_SCHEMA_VERSION,
    configurationId: BASELINE_CONFIGURATION_ID,
    label: '04B-R1 BASELINE',
    description:
      'The accepted 04B-R1 pursuer exactly as commit 99fc8145 runs it. '
      + 'The reference for every comparison, and never a starting point that has been quietly edited.',
  }),
  locomotion: Object.freeze({
    speed: DEFAULT_GRAPH_CADENCE.speed,
    minBurstMs: DEFAULT_GRAPH_CADENCE.minBurstMs,
    maxBurstMs: DEFAULT_GRAPH_CADENCE.maxBurstMs,
    minPauseMs: DEFAULT_GRAPH_CADENCE.minPauseMs,
    maxPauseMs: DEFAULT_GRAPH_CADENCE.maxPauseMs,
    pauseChance: DEFAULT_GRAPH_CADENCE.pauseChance,
    cadenceSeed: DEFAULT_GRAPH_CADENCE.seed,
    laneSeed: DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed,
  }),
  perception: Object.freeze({
    directSenseRadius: SPARK_SENSE_RADIUS,
    trailRowRetention: DEFAULT_ROW_RETENTION,
  }),
  strategy: Object.freeze({}),
  commitment: Object.freeze({
    lossConfirmationTicks: LOSS_CONFIRMATION_TICKS,
    acquireConfirmationTicks: ACQUIRE_CONFIRMATION_TICKS,
    trailExhaustionConfirmationTicks: TRAIL_EXHAUSTION_CONFIRMATION_TICKS,
    leadPreemptionConfirmationTicks: LEAD_PREEMPTION_CONFIRMATION_TICKS,
    maxRememberedFragments: MAX_REMEMBERED_FRAGMENTS,
  }),
  chassis: Object.freeze({
    laneBandFraction: LANE_BAND_FRACTION,
    targetEpsilon: TARGET_EPSILON,
    arrivalEpsilon: ARRIVAL_EPSILON,
  }),
  spawnCapture: Object.freeze({
    // The 04B-R1 repair. NOT `DEFAULT_GRAPH_PURSUER_CONFIG`'s declarations,
    // which say `groundLevels: 0` and `captureRail: false` and are overridden
    // by the controller on every construction — see `AUTHORITY_CONFLICTS`.
    spawnRule: 'AUTHORITY_FURTHEST_TRUNK' as const,
    groundLevels: 2,
    captureRail: true,
  }),
  metadata: Object.freeze({
    lifecycle: 'BASELINE' as const,
    source: 'BUILT_IN' as const,
    parentConfigurationId: null,
    authorityCommit: BASELINE_AUTHORITY_COMMIT,
    notes: 'Human-accepted spawn authority and lost-pursuer repair. Do not edit; duplicate instead.',
    createdAt: null,
    experimental: false,
    frozen: true,
  }),
});

/**
 * An experiment that is described but not yet instantiable.
 *
 * Everything an experiment must declare, minus the values. `allowedLayers` and
 * `allowedPaths` record which parameters the experiment is permitted to touch,
 * so when values do arrive there is already a written answer to "was this
 * experiment allowed to change that?".
 */
export interface DeclaredExperiment {
  key: 'A' | 'B' | 'C' | 'D';
  label: string;
  parentConfigurationId: string;
  hypothesis: string;
  /** What a player should notice if the hypothesis holds. */
  intendedPlayerVisibleEffect: string;
  allowedLayers: readonly BehaviourLayer[];
  allowedPaths: readonly string[];
  /** What must be supplied before this can be instantiated. */
  blockedBy: string;
  /** Experiments that must be run and read before this one is built. */
  requires: readonly ('A' | 'B' | 'C')[];
}

export const DECLARED_EXPERIMENTS: readonly DeclaredExperiment[] = [
  {
    key: 'A',
    label: 'A · PURPOSEFUL MOTION',
    parentConfigurationId: BASELINE_CONFIGURATION_ID,
    hypothesis:
      'The pursuer reads as aimless not because it is slow but because its motion is chopped. '
      + 'Longer bursts, shorter pauses and a lower chance of pausing at all should make the same '
      + 'speed read as deliberate.',
    intendedPlayerVisibleEffect:
      'It looks like it is going somewhere. A player glancing at it should be able to tell where.',
    allowedLayers: ['locomotion'],
    allowedPaths: [
      'locomotion.minBurstMs', 'locomotion.maxBurstMs',
      'locomotion.minPauseMs', 'locomotion.maxPauseMs', 'locomotion.pauseChance',
    ],
    blockedBy:
      'Values not supplied. The addendum forbids inventing them before the PM task that establishes '
      + 'the real Graph V2 parameter authority, and that task did not reach this build.',
    requires: [],
  },
  {
    key: 'B',
    label: 'B · PERSISTENT HUNTER',
    parentConfigurationId: BASELINE_CONFIGURATION_ID,
    hypothesis:
      'The pursuer gives up on evidence too readily, so a player who breaks line of sight is safe '
      + 'sooner than they should be. More persistent memory of where the learner was should make '
      + 'breaking away buy less.',
    intendedPlayerVisibleEffect:
      'Hiding stops being a reset. The pursuer keeps coming to where you were.',
    allowedLayers: ['perception', 'strategy'],
    allowedPaths: ['perception.trailRowRetention'],
    blockedBy:
      'Blocked twice over. The values are not supplied, AND the persistence parameters this experiment '
      + 'would move live in the FROZEN `commitment` layer: `trailRowRetention` is the only persistence '
      + 'parameter presently settable. Promoting one or two commitment windows into `strategy` requires '
      + 'the PM task that demonstrates which of them matters, and a v2 schema.',
    requires: [],
  },
  {
    key: 'C',
    label: 'C · HIGHER PRESSURE',
    parentConfigurationId: BASELINE_CONFIGURATION_ID,
    hypothesis:
      'The pursuer is simply not threatening enough. Raising locomotion speed and the cadence duty '
      + 'cycle should make it feel like a clock running down.',
    intendedPlayerVisibleEffect:
      'Time pressure. The player hurries, and rushing the maths starts to cost them.',
    allowedLayers: ['locomotion'],
    allowedPaths: ['locomotion.speed', 'locomotion.pauseChance', 'locomotion.maxPauseMs'],
    blockedBy:
      'Values not supplied. Note also the product finding standing against it: at BASELINE speed, '
      + '6.3 seconds of standing still already ends a run. Raising pressure without a PM decision on '
      + 'that finding would be tuning past a known problem.',
    requires: [],
  },
  {
    key: 'D',
    label: 'D · COMBINED CANDIDATE',
    parentConfigurationId: BASELINE_CONFIGURATION_ID,
    hypothesis:
      'Whatever A, B and C each demonstrate, combined into one candidate.',
    intendedPlayerVisibleEffect: 'To be stated once A, B and C have been read.',
    allowedLayers: ['locomotion', 'perception', 'strategy'],
    allowedPaths: [],
    blockedBy:
      'The addendum builds D only after A, B and C have been run and read. None has been instantiated.',
    requires: ['A', 'B', 'C'],
  },
];

/** Every configuration this build ships with. Exactly one, on purpose. */
export const BUILT_IN_CONFIGURATIONS: readonly PursuerConfiguration[] = [BASELINE_04B_R1];

export function findBuiltInConfiguration(configurationId: string): PursuerConfiguration | null {
  return BUILT_IN_CONFIGURATIONS.find((c) => c.identity.configurationId === configurationId) ?? null;
}

/**
 * A copy of a configuration, re-identified as somebody's experiment.
 *
 * The only way a human-created configuration comes into existence. It always
 * lands as EXPERIMENTAL and never inherits BASELINE, APPROVED or a
 * predecessor's authority commit — a duplicate of the baseline is a new thing
 * that happens to start with the baseline's numbers, and calling it anything
 * else is how an unreviewed tuning ends up in a build.
 */
export function deriveConfiguration(
  parent: PursuerConfiguration,
  options: {
    configurationId: string;
    label: string;
    description?: string;
    notes?: string;
    source?: PursuerConfiguration['metadata']['source'];
    createdAt?: string | null;
  },
): PursuerConfiguration {
  return {
    identity: {
      schemaVersion: PURSUER_CONFIG_SCHEMA_VERSION,
      configurationId: options.configurationId,
      label: options.label,
      description: options.description ?? `Derived from ${parent.identity.label}.`,
    },
    locomotion: { ...parent.locomotion },
    perception: { ...parent.perception },
    strategy: {},
    commitment: { ...parent.commitment },
    chassis: { ...parent.chassis },
    spawnCapture: { ...parent.spawnCapture },
    metadata: {
      lifecycle: 'EXPERIMENTAL',
      source: options.source ?? 'DUPLICATED',
      parentConfigurationId: parent.identity.configurationId,
      authorityCommit: null,
      notes: options.notes ?? '',
      createdAt: options.createdAt ?? null,
      experimental: true,
      frozen: false,
    },
  };
}
