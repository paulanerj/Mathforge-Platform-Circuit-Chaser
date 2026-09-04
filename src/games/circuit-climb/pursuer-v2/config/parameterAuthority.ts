/**
 * THE PARAMETER-AUTHORITY AUDIT (04C).
 *
 * A machine-readable record of every behaviour-affecting quantity that reaches
 * GRAPH_PURSUER_V2 in production, where it is declared, what it is declared
 * as, what production actually runs it at, and who — if anyone — is presently
 * authorized to change it.
 *
 * This exists because those four things were NOT the same. The audit found
 * three quantities whose module-level "default" is not the value production
 * uses: the runtime controller overrides `captureRail`, `groundLevels` and
 * `actorRadius` on construction. A reader who trusted
 * `DEFAULT_GRAPH_PURSUER_CONFIG` would have described the shipped pursuer
 * wrongly on all three. `AUTHORITY_CONFLICTS` below names them.
 *
 * It also found the mismatch that matters most for tuning: two of the
 * quantities a configuration brief naturally wants to express in milliseconds
 * — the last-sighting grace and the reacquisition window — do not exist in
 * milliseconds anywhere in the code. They are counted in TICKS. A schema field
 * called `lastSightingGraceMs` would therefore have been a fabrication, and is
 * not present. `lossConfirmationTicks` is, under its real name and its real
 * unit, with the frame-rate consequence reported as a derived value.
 *
 * Every row here was read off the source, not remembered. The accompanying
 * test walks the real modules and fails if a row stops matching them. The
 * three values quoted as literals rather than imported — the two Brain
 * constants that are module-private and the controller's `GROUND_LEVELS` —
 * are quoted that way only to keep this module a leaf that the controller can
 * safely import; the test asserts each against its real symbol.
 */

import { DEFAULT_GRAPH_CADENCE } from '../graph/graphCadence';
import { DEFAULT_GRAPH_PURSUER_CONFIG, LANE_BAND_FRACTION, TARGET_EPSILON } from '../graph/graphPursuerV2';
import { SPARK_SENSE_RADIUS } from '../brain/sensors';
import { DEFAULT_ROW_RETENTION } from '../contracts/trailRecorder';
import {
  LOSS_CONFIRMATION_TICKS, ACQUIRE_CONFIRMATION_TICKS,
  TRAIL_EXHAUSTION_CONFIRMATION_TICKS, LEAD_PREEMPTION_CONFIRMATION_TICKS,
} from '../brain/graphBrainV1';

/**
 * SETTABLE  a human may change it in this build.
 * FROZEN    behaviour-affecting, carried in the payload, not editable here.
 * DERIVED   computed from the live board; authoring it would be a lie.
 * RESERVED  a layer exists for it, but nothing is authorized into it yet.
 */
export type ParameterAuthority = 'SETTABLE' | 'FROZEN' | 'DERIVED' | 'RESERVED';

export interface ParameterAuthorityRow {
  /** Dot path inside a `PursuerConfiguration`, or null when not representable. */
  path: string | null;
  /** Where the value is declared in the source tree. */
  module: string;
  /** The exported or module-level symbol carrying it. */
  symbol: string;
  /** What that symbol declares. `null` where the declaration is "unset". */
  declaredDefault: number | string | boolean | null;
  /** What a normal production launch actually runs. */
  productionEffective: number | string | boolean | null;
  authority: ParameterAuthority;
  unit: string;
  note: string;
}

export const PARAMETER_AUTHORITY: readonly ParameterAuthorityRow[] = [
  // ── LOCOMOTION ────────────────────────────────────────────────────────
  {
    path: 'locomotion.speed',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.speed',
    declaredDefault: DEFAULT_GRAPH_CADENCE.speed,
    productionEffective: DEFAULT_GRAPH_CADENCE.speed,
    authority: 'SETTABLE',
    unit: 'units/ms while moving',
    note: 'The learner walks its route at 0.62 u/ms, so the pursuer is slower outright and closes only because the learner stops to think.',
  },
  {
    path: 'locomotion.minBurstMs',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.minBurstMs',
    declaredDefault: DEFAULT_GRAPH_CADENCE.minBurstMs,
    productionEffective: DEFAULT_GRAPH_CADENCE.minBurstMs,
    authority: 'SETTABLE',
    unit: 'ms',
    note: 'Lower bound of the burst draw.',
  },
  {
    path: 'locomotion.maxBurstMs',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.maxBurstMs',
    declaredDefault: DEFAULT_GRAPH_CADENCE.maxBurstMs,
    productionEffective: DEFAULT_GRAPH_CADENCE.maxBurstMs,
    authority: 'SETTABLE',
    unit: 'ms',
    note: 'Upper bound of the burst draw.',
  },
  {
    path: 'locomotion.minPauseMs',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.minPauseMs',
    declaredDefault: DEFAULT_GRAPH_CADENCE.minPauseMs,
    productionEffective: DEFAULT_GRAPH_CADENCE.minPauseMs,
    authority: 'SETTABLE',
    unit: 'ms',
    note: 'A pause spends no distance and touches nothing else.',
  },
  {
    path: 'locomotion.maxPauseMs',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.maxPauseMs',
    declaredDefault: DEFAULT_GRAPH_CADENCE.maxPauseMs,
    productionEffective: DEFAULT_GRAPH_CADENCE.maxPauseMs,
    authority: 'SETTABLE',
    unit: 'ms',
    note: 'Upper bound of the pause draw.',
  },
  {
    path: 'locomotion.pauseChance',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.pauseChance',
    declaredDefault: DEFAULT_GRAPH_CADENCE.pauseChance,
    productionEffective: DEFAULT_GRAPH_CADENCE.pauseChance,
    authority: 'SETTABLE',
    unit: 'probability 0..1',
    note: 'Whether a finished burst is followed by a pause at all. Drives how staggered the motion reads.',
  },
  {
    path: 'locomotion.cadenceSeed',
    module: 'pursuer-v2/graph/graphCadence.ts',
    symbol: 'DEFAULT_GRAPH_CADENCE.seed',
    declaredDefault: DEFAULT_GRAPH_CADENCE.seed,
    productionEffective: DEFAULT_GRAPH_CADENCE.seed,
    authority: 'SETTABLE',
    unit: 'integer seed',
    note: 'Behaviour-affecting: it selects a stream, and a different stream is a different run.',
  },
  {
    path: 'locomotion.laneSeed',
    module: 'pursuer-v2/graph/graphPursuerV2.ts',
    symbol: 'DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed',
    declaredDefault: DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed,
    productionEffective: DEFAULT_GRAPH_PURSUER_CONFIG.laneSeed,
    authority: 'SETTABLE',
    unit: 'integer seed',
    note: 'Seeds the lane-offset draw, so two passes along one edge are visibly different lines.',
  },

  // ── PERCEPTION ────────────────────────────────────────────────────────
  {
    path: 'perception.directSenseRadius',
    module: 'pursuer-v2/brain/sensors.ts',
    symbol: 'SPARK_SENSE_RADIUS',
    declaredDefault: SPARK_SENSE_RADIUS,
    productionEffective: SPARK_SENSE_RADIUS,
    authority: 'SETTABLE',
    unit: 'logical units',
    note: 'Hard-coded before 04C — there was no configuration path to it at all.',
  },
  {
    path: 'perception.trailRowRetention',
    module: 'pursuer-v2/contracts/trailRecorder.ts',
    symbol: 'DEFAULT_ROW_RETENTION',
    declaredDefault: DEFAULT_ROW_RETENTION,
    productionEffective: DEFAULT_ROW_RETENTION,
    authority: 'SETTABLE',
    unit: 'learner row transitions',
    note: 'A count of row transitions, not of milliseconds or points. The controller took the constructor default; there was no path to it.',
  },
  {
    path: null,
    module: 'pursuer-v2/brain/sensors.ts',
    symbol: 'deriveTrailSenseRadius(graph)',
    declaredDefault: null,
    productionEffective: 'half smallest trunk spacing + actorRadius',
    authority: 'DERIVED',
    unit: 'logical units',
    note: 'Recomputed from the live graph every call. NOT a configuration field: a stored value could disagree with the board it runs on.',
  },
  {
    path: null,
    module: 'pursuer-v2/brain/sensors.ts',
    symbol: 'maxContinuityGapMs',
    declaredDefault: null,
    productionEffective: 'max(dtMs * 3, 50)',
    authority: 'DERIVED',
    unit: 'ms',
    note: 'Per-frame, from the frame time. Governs only whether a sighting velocity is continuous.',
  },

  // ── STRATEGY ──────────────────────────────────────────────────────────
  {
    path: 'strategy',
    module: '—',
    symbol: '—',
    declaredDefault: null,
    productionEffective: null,
    authority: 'RESERVED',
    unit: '—',
    note: 'Empty in v1. One or two parameters may be promoted here once a PM task demonstrates which persistence parameters matter. None has been supplied to this build.',
  },

  // ── COMMITMENT (frozen) ───────────────────────────────────────────────
  {
    path: 'commitment.lossConfirmationTicks',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'LOSS_CONFIRMATION_TICKS',
    declaredDefault: LOSS_CONFIRMATION_TICKS,
    productionEffective: LOSS_CONFIRMATION_TICKS,
    authority: 'FROZEN',
    unit: 'ticks (frames)',
    note: 'THIS, not a millisecond grace, is the real last-sighting grace. Derived from measured one-tick boundary chatter. Counted in frames, so its wall-clock length depends on the display.',
  },
  {
    path: 'commitment.acquireConfirmationTicks',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'ACQUIRE_CONFIRMATION_TICKS',
    declaredDefault: ACQUIRE_CONFIRMATION_TICKS,
    productionEffective: ACQUIRE_CONFIRMATION_TICKS,
    authority: 'FROZEN',
    unit: 'ticks (frames)',
    note: 'Derived from a measured 3-tick self-sustained flutter with a 2x margin. A first acquisition is still immediate.',
  },
  {
    path: 'commitment.trailExhaustionConfirmationTicks',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'TRAIL_EXHAUSTION_CONFIRMATION_TICKS',
    declaredDefault: TRAIL_EXHAUSTION_CONFIRMATION_TICKS,
    productionEffective: TRAIL_EXHAUSTION_CONFIRMATION_TICKS,
    authority: 'FROZEN',
    unit: 'ticks (frames)',
    note: 'Derived from a measured worst run of 2 non-actionable ticks with a 3x margin.',
  },
  {
    path: 'commitment.leadPreemptionConfirmationTicks',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'LEAD_PREEMPTION_CONFIRMATION_TICKS',
    declaredDefault: LEAD_PREEMPTION_CONFIRMATION_TICKS,
    productionEffective: LEAD_PREEMPTION_CONFIRMATION_TICKS,
    authority: 'FROZEN',
    unit: 'ticks (frames)',
    note: 'Applies only to an already-consumed lead that has resurfaced. Applying it to all leads made TRAIL_TRACK unreachable — measured, and reverted.',
  },
  {
    path: 'commitment.maxRememberedFragments',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'MAX_REMEMBERED_FRAGMENTS',
    declaredDefault: 24,
    productionEffective: 24,
    authority: 'FROZEN',
    unit: 'fragments',
    note: 'Bounded Brain memory. Module-private before 04C.',
  },

  // ── CHASSIS (frozen) ──────────────────────────────────────────────────
  {
    path: 'chassis.laneBandFraction',
    module: 'pursuer-v2/graph/graphPursuerV2.ts',
    symbol: 'LANE_BAND_FRACTION',
    declaredDefault: LANE_BAND_FRACTION,
    productionEffective: LANE_BAND_FRACTION,
    authority: 'FROZEN',
    unit: 'fraction of the clear band',
    note: 'Outside (0,1) a lane offset leaves the band the graph proved clear. Not a difficulty parameter.',
  },
  {
    path: 'chassis.targetEpsilon',
    module: 'pursuer-v2/graph/graphPursuerV2.ts',
    symbol: 'TARGET_EPSILON',
    declaredDefault: TARGET_EPSILON,
    productionEffective: TARGET_EPSILON,
    authority: 'FROZEN',
    unit: 'logical units',
    note: 'How far a target must move to count as a different target.',
  },
  {
    path: 'chassis.arrivalEpsilon',
    module: 'pursuer-v2/brain/graphBrainV1.ts',
    symbol: 'ARRIVAL_EPSILON',
    declaredDefault: 4,
    productionEffective: 4,
    authority: 'FROZEN',
    unit: 'logical units',
    note: 'Fallback arrival test alongside the chassis arrival signal. Module-private before 04C.',
  },

  // ── SPAWN AND CAPTURE (frozen unless separately authorized) ───────────
  {
    path: 'spawnCapture.spawnRule',
    module: 'pursuer-v2/runtime/graphPursuerController.ts',
    symbol: "options.spawn ?? 'authority'",
    declaredDefault: 'AUTHORITY_FURTHEST_TRUNK',
    productionEffective: 'AUTHORITY_FURTHEST_TRUNK',
    authority: 'FROZEN',
    unit: 'rule',
    note: '04B-R1 repaired this. The rejected 04A placement put the pursuer one row gap directly beneath the learner and is retained only for A/B.',
  },
  {
    path: 'spawnCapture.groundLevels',
    module: 'pursuer-v2/runtime/graphPursuerController.ts',
    symbol: 'GROUND_LEVELS',
    declaredDefault: 2,
    productionEffective: 2,
    authority: 'FROZEN',
    unit: 'connector levels below row 0',
    note: 'AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels declares 0. The controller overrides it to 2 on every construction.',
  },
  {
    path: 'spawnCapture.captureRail',
    module: 'pursuer-v2/runtime/graphPursuerController.ts',
    symbol: 'options.captureRail ?? true',
    declaredDefault: true,
    productionEffective: true,
    authority: 'FROZEN',
    unit: 'boolean',
    note: 'AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.captureRail declares false. The controller overrides it to true. Governs approach only; production adjudicates capture itself.',
  },
  {
    path: null,
    module: 'pursuer-v2/graph/graphActorRadius.ts',
    symbol: 'graphActorRadiusFor(world)',
    declaredDefault: null,
    productionEffective: 'derived from world clearance',
    authority: 'DERIVED',
    unit: 'logical units',
    note: 'AUTHORITY CONFLICT: DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius declares null ("size like the learner"). The controller overrides it with a live derivation on every construction. It DECREASES as framing widens.',
  },
];

/**
 * The rows where the module-level declaration and the value production
 * actually runs disagree. Reported rather than quietly reconciled: each is a
 * place where reading the "default" would have described the shipped pursuer
 * wrongly, and that is the whole argument for this contract existing.
 */
export const AUTHORITY_CONFLICTS: readonly {
  symbol: string; declares: string; productionRuns: string; resolvedBy: string;
}[] = [
  {
    symbol: 'DEFAULT_GRAPH_PURSUER_CONFIG.captureRail',
    declares: 'false',
    productionRuns: 'true',
    resolvedBy: 'GraphPursuerController.buildPursuer, `this.options.captureRail ?? true`',
  },
  {
    symbol: 'DEFAULT_GRAPH_PURSUER_CONFIG.groundLevels',
    declares: '0',
    productionRuns: '2',
    resolvedBy: 'GraphPursuerController.buildPursuer, `this.options.groundLevels ?? GROUND_LEVELS`',
  },
  {
    symbol: 'DEFAULT_GRAPH_PURSUER_CONFIG.actorRadius',
    declares: 'null (size like the learner)',
    productionRuns: 'graphActorRadiusFor(world)',
    resolvedBy: 'GraphPursuerController.buildPursuer, derived per world',
  },
];

/**
 * Quantities a configuration brief might reasonably expect to exist, that do
 * NOT exist in the code, and what the real quantity is instead. Recorded so
 * that no future schema silently invents them.
 */
export const ABSENT_PARAMETERS: readonly {
  requested: string; realQuantity: string; why: string;
}[] = [
  {
    requested: 'perception.lastSightingGraceMs',
    realQuantity: 'commitment.lossConfirmationTicks (3 ticks)',
    why: 'There is no millisecond grace anywhere in the Brain. The grace is counted in frames, which is why its effective length changed on the tester\'s 144Hz display.',
  },
  {
    requested: 'perception.trailSenseRadius',
    realQuantity: 'deriveTrailSenseRadius(graph), computed live',
    why: 'It is a function of the framing-dependent trunk spacing and the derived actor radius. A stored value would disagree with the board.',
  },
  {
    requested: 'locomotion.chaseSpeed / searchSpeed (separate speeds)',
    realQuantity: 'locomotion.speed, one speed for all modes',
    why: 'Graph V2 has a single cadence. Separate per-mode speeds are the LEGACY pursuer\'s model and do not exist in this chassis.',
  },
];
