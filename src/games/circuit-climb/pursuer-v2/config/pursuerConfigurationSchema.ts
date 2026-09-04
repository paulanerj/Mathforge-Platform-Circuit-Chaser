/**
 * PURSUER CONFIGURATION — THE SCHEMA CONTRACT (04C).
 *
 * Until now every number that shapes GRAPH_PURSUER_V2's behaviour lived where
 * it was first written: a cadence default in `graph/graphCadence.ts`, a sense
 * radius in `brain/sensors.ts`, four confirmation windows in
 * `brain/graphBrainV1.ts`, spawn semantics in `runtime/graphPursuerController.ts`.
 * That was fine while there was exactly one candidate and a human could read
 * the diff. It stops being fine the moment somebody wants to ask "what did the
 * pursuer I just played actually have set?" — because the answer was spread
 * across five modules, three of which the runtime silently overrode.
 *
 * This file makes the answer a single object.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IS AND IS NOT SETTABLE, AND WHY
 *
 * The layers below are not a taxonomy invented for tidiness. They record the
 * result of the parameter-authority audit in `PARAMETER_AUTHORITY` (see
 * `parameterAuthority.ts`): every behaviour-affecting quantity that actually
 * reaches the production pursuer, where it comes from, and whether anyone is
 * presently authorized to change it.
 *
 *   locomotion    Real, settable. The cadence generator reads these directly.
 *   perception    Real, settable. What the Brain is allowed to notice.
 *   strategy      RESERVED AND EMPTY in v1. The addendum permits one or two
 *                 parameters here once a PM task has demonstrated which
 *                 persistence parameters matter. None has, so none is here.
 *   commitment    Real, behaviour-affecting, FROZEN. The four confirmation
 *                 windows were derived from measured oscillation, not chosen,
 *                 and are carried in the payload so a run is reproducible —
 *                 but they are not tuning dials until that same PM task says
 *                 which of them is one.
 *   chassis       Graph V2 construction invariants. Frozen: these are not
 *                 difficulty, they are what keeps motion on the graph.
 *   spawnCapture  Frozen unless separately authorized, per the brief.
 *   metadata      Provenance. Never behaviour.
 *
 * A quantity that is DERIVED does not appear here at all. The trail-sensing
 * radius is half the smallest trunk spacing plus the actor's radius, computed
 * live from whatever graph the current framing produced; the actor's radius is
 * itself derived from world clearance. Writing either into a configuration
 * would let a stored value disagree with the board it is running on, which is
 * the precise failure this contract exists to prevent. They are reported as
 * `ResolvedDerivedValues` at resolve time and never authored.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * The schema version, carried inside every configuration.
 *
 * An unknown version is a hard, visible failure and never a silent
 * best-effort read: a payload written against a schema this build does not
 * know may name the same field with a different meaning, and running it
 * anyway would produce evidence attributed to parameters that were never
 * applied.
 */
export const PURSUER_CONFIG_SCHEMA_VERSION = 'circuit-climb-pursuer-config/v1';

/**
 * Where a configuration sits in its life.
 *
 * Nothing in this module ever promotes a configuration. Promotion is a human
 * decision and the only transition the code performs is the one a human asks
 * for explicitly. In particular a configuration a tester liked does not become
 * APPROVED by being liked, and an APPROVED configuration does not become the
 * production default by existing.
 */
export type ConfigurationLifecycle =
  | 'BASELINE'
  | 'EXPERIMENTAL'
  | 'CANDIDATE'
  | 'APPROVED'
  | 'DEPRECATED';

export const CONFIGURATION_LIFECYCLES: readonly ConfigurationLifecycle[] = [
  'BASELINE', 'EXPERIMENTAL', 'CANDIDATE', 'APPROVED', 'DEPRECATED',
];

/** How the pursuer is placed at the start of a run. */
export type SpawnRule = 'AUTHORITY_FURTHEST_TRUNK' | 'INTEGRATION_BELOW_LEARNER';

export interface ConfigurationIdentity {
  /** Always `PURSUER_CONFIG_SCHEMA_VERSION` for a payload this build can run. */
  schemaVersion: string;
  /** Stable, unique, and quotable in a bug report. Not behaviour. */
  configurationId: string;
  /** What a human calls it. Not behaviour. */
  label: string;
  /** What it is for. Not behaviour. */
  description: string;
}

/**
 * LOCOMOTION — how the body moves.
 *
 * Read by `graphCadence.ts` (everything but `laneSeed`) and by the chassis's
 * lane-offset draw (`laneSeed`). Both seeds are behaviour-affecting: they
 * select a stream, and a different stream is a different run. They are in the
 * hash for exactly that reason.
 */
export interface LocomotionConfig {
  /** Units per millisecond while moving. Zero would be a pursuer that cannot pursue. */
  speed: number;
  minBurstMs: number;
  maxBurstMs: number;
  minPauseMs: number;
  maxPauseMs: number;
  /** Probability that a finished burst is followed by a pause at all. 0..1. */
  pauseChance: number;
  /** Cadence PRNG seed. Determinism, and therefore behaviour. */
  cadenceSeed: number;
  /** Lane-offset PRNG seed. Determinism, and therefore behaviour. */
  laneSeed: number;
}

/**
 * PERCEPTION — what the pursuer is allowed to notice.
 *
 * `trailSenseRadius` is deliberately absent; see the header. It is derived
 * from the live graph and reported in `ResolvedDerivedValues`.
 */
export interface PerceptionConfig {
  /** Electrical-proximity direct-perception radius, in logical units. */
  directSenseRadius: number;
  /**
   * Learner ROW TRANSITIONS of trail retained, including the one currently
   * underway. A count of transitions, not of milliseconds or of points —
   * that is the shape the accepted contract asks for.
   */
  trailRowRetention: number;
}

/**
 * STRATEGY — reserved, and empty in v1.
 *
 * The addendum authorizes one or two parameters here, "only those a PM task
 * has demonstrated to matter". No such demonstration has been supplied to this
 * build, so putting anything here would be inventing an authority. The layer
 * exists so that when the demonstration arrives, a parameter can be promoted
 * out of `commitment` into `strategy` in a v2 schema without the surrounding
 * architecture moving.
 */
export interface StrategyConfig {
  /* intentionally empty in v1 */
}

/**
 * COMMITMENT — the four confirmation windows, plus bounded Brain memory.
 *
 * FROZEN. Every one of these was derived from a measured oscillation rather
 * than chosen (see the long derivations in `brain/graphBrainV1.ts`), and each
 * is counted in TICKS — frames — not milliseconds. That distinction is not
 * cosmetic and is recorded in the audit: on the 144Hz display the 04B tester
 * used, every one of these windows elapses in roughly 40% of the wall-clock
 * time it was derived at.
 */
export interface CommitmentConfig {
  lossConfirmationTicks: number;
  acquireConfirmationTicks: number;
  trailExhaustionConfirmationTicks: number;
  leadPreemptionConfirmationTicks: number;
  maxRememberedFragments: number;
}

/**
 * CHASSIS — Graph V2's own construction and arrival invariants.
 *
 * FROZEN, and not difficulty parameters. `laneBandFraction` outside (0,1) puts
 * a lane offset outside the band the graph proved clear; a non-positive
 * epsilon makes "arrived" untestable in floating point. Both are carried in
 * the payload because a run is not reproducible without them.
 */
export interface ChassisConfig {
  laneBandFraction: number;
  targetEpsilon: number;
  arrivalEpsilon: number;
}

/**
 * SPAWN AND CAPTURE — frozen unless separately authorized, per the brief.
 *
 * The spawn rule is the one 04B-R1 repaired: `AUTHORITY_FURTHEST_TRUNK` is the
 * accepted Lab placement, `INTEGRATION_BELOW_LEARNER` the rejected 04A one,
 * retained only so a harness can A/B them.
 *
 * `captureRail` governs how the actor physically closes the last units. It is
 * NOT capture adjudication — production adjudicates capture itself, and the
 * Brain never sees capture distance.
 */
export interface SpawnCaptureConfig {
  spawnRule: SpawnRule;
  /** Connector levels below row 0 the pursuer may start on. */
  groundLevels: number;
  captureRail: boolean;
}

/**
 * METADATA — provenance. Never behaviour, and never in the hash.
 */
export interface ConfigurationMetadata {
  lifecycle: ConfigurationLifecycle;
  /** Where this came from: a built-in, a human edit, a paste, a host selection. */
  source: ConfigurationSource;
  /** The configuration this was derived from, if any. */
  parentConfigurationId: string | null;
  /**
   * The commit whose behaviour this configuration reproduces, when it is a
   * frozen record of one. Null for anything a human made up.
   */
  authorityCommit: string | null;
  /** Free human notes. */
  notes: string;
  /** ISO-8601, or null for a built-in that has no creation moment. */
  createdAt: string | null;
  /**
   * True for anything that must never be mistaken for a shippable default.
   * Everything a human makes in the tuning panel is experimental.
   */
  experimental: boolean;
  /** True when the payload's frozen layers may not be edited in this build. */
  frozen: boolean;
}

export type ConfigurationSource =
  | 'BUILT_IN'
  | 'HUMAN_TUNED'
  | 'PASTED'
  | 'DUPLICATED'
  | 'HOST_SELECTED';

/**
 * ONE configuration. The whole of what shapes a run's pursuit behaviour.
 */
export interface PursuerConfiguration {
  identity: ConfigurationIdentity;
  locomotion: LocomotionConfig;
  perception: PerceptionConfig;
  strategy: StrategyConfig;
  commitment: CommitmentConfig;
  chassis: ChassisConfig;
  spawnCapture: SpawnCaptureConfig;
  metadata: ConfigurationMetadata;
}

/**
 * The layers that decide behaviour, in canonical order.
 *
 * Used by the hash, by the diff, and by the validator, so that all three agree
 * on exactly one definition of "behaviour-affecting" and cannot drift apart.
 */
export const BEHAVIOUR_LAYERS = [
  'locomotion', 'perception', 'strategy', 'commitment', 'chassis', 'spawnCapture',
] as const;

export type BehaviourLayer = (typeof BEHAVIOUR_LAYERS)[number];

/** The layers a human may edit in this build. Everything else is frozen. */
export const EDITABLE_LAYERS: readonly BehaviourLayer[] = ['locomotion', 'perception'];

/**
 * Values the pursuer runs on that NOBODY authors — they are computed from the
 * live board. Reported alongside a resolved configuration so a diagnostic
 * export explains the run completely, and never accepted as input.
 */
export interface ResolvedDerivedValues {
  /** The graph actor's own body radius, from world clearance. */
  actorRadius: number;
  /** Half the smallest trunk spacing plus the actor radius. */
  trailSenseRadius: number;
  /** Trunks the current framing admitted. */
  trunkCount: number;
  /**
   * The four commitment windows expressed in milliseconds AT THE FRAME RATE
   * THE RUN ACTUALLY SAW. Reported because the windows are counted in frames:
   * the same configuration on a 144Hz display is a materially faster-reacting
   * pursuer than on a 60Hz one, and no amount of reading the payload reveals
   * that. Null until a run has measured its own frame time.
   */
  commitmentWindowMs: {
    frameMs: number;
    loss: number;
    acquire: number;
    trailExhaustion: number;
    leadPreemption: number;
  } | null;
}
