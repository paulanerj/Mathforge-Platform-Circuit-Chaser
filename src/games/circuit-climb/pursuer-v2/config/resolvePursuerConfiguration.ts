/**
 * RESOLUTION — ONE configuration per run (04C).
 *
 * Every door into the pursuer leads here, and this is the only thing the
 * runtime is given. What comes out is a `ResolvedPursuerConfiguration`:
 * validated, frozen, hashed, and stripped of any account of WHY it was
 * chosen.
 *
 * That stripping is deliberate and is the architectural point of the file.
 * The future the addendum describes — player evidence feeding a policy that
 * selects an approved configuration — must be able to arrive without the
 * pursuer changing at all, and the way to guarantee that is to make it
 * impossible for pursuit code to branch on the reason. The reason lives in
 * `ConfigurationSelection`, which the diagnostic export reads and the
 * controller never sees.
 *
 *   PLAYER EVIDENCE -> POLICY -> SELECT APPROVED CONFIGURATION -> VALIDATE -> RUN
 *                                                                  ^^^^^^^^
 *                                                                  here
 *
 * Note what is NOT here: any per-frame path. A resolved configuration is made
 * once, at the start of a run, and is frozen for that run's duration. There is
 * no function in this module that a frame loop could call to move a constant,
 * and that absence is the safety boundary — see
 * `SAFE_TRANSITION_BOUNDARIES` for what a future build could safely change and
 * when, none of which is active.
 */

import type { PursuerConfiguration, ResolvedDerivedValues } from './pursuerConfigurationSchema';
import { validatePursuerConfiguration, describeValidationFailure, type ValidationIssue } from './validatePursuerConfiguration';
import { canonicalizeConfiguration, configurationHash, shortConfigurationHash } from './configurationHash';
import { BASELINE_04B_R1 } from './configurationLibrary';

/** Everything the runtime gets, and nothing else. */
export interface ResolvedPursuerConfiguration {
  readonly configuration: PursuerConfiguration;
  readonly hash: string;
  readonly shortHash: string;
  readonly canonical: string;
}

/** Why a configuration was selected. For evidence. The runtime never sees it. */
export type SelectionReason =
  | 'DEFAULT_BASELINE'
  | 'HUMAN_SELECTED'
  | 'HUMAN_TUNED'
  | 'PASTED'
  | 'RESTORED_FROM_STORAGE'
  | 'HOST_POLICY';

export interface ConfigurationSelection {
  resolved: ResolvedPursuerConfiguration;
  reason: SelectionReason;
  /** ISO-8601, or null where the moment does not matter (a built-in default). */
  selectedAt: string | null;
  /** What was asked for, when that differs from what was resolved. */
  requestedConfigurationId: string | null;
  /** Set when the request could not be honoured and the baseline was used. */
  fallbackFrom: { requestedConfigurationId: string | null; failure: string } | null;
}

export type ResolveOutcome =
  | {
    ok: true; resolved: ResolvedPursuerConfiguration; issues: readonly ValidationIssue[];
    /** Never set on success. Declared so the union reads without narrowing. */
    failure?: undefined;
  }
  | { ok: false; resolved: null; issues: readonly ValidationIssue[]; failure: string };

export interface ResolveOptions {
  /** The board's logical width, for the no-omniscience invariant. */
  logicalWidth?: number;
  /**
   * Set ONLY under a separate authorization to change frozen layers. Nothing
   * in the shipped UI sets it; the reproduction harness does, so it can A/B
   * the two spawn rules.
   */
  allowFrozenEdits?: boolean;
}

/**
 * Validate a candidate and, if it holds up, freeze it into the one
 * configuration a run may use.
 */
export function resolvePursuerConfiguration(
  candidate: unknown,
  options: ResolveOptions = {},
): ResolveOutcome {
  const validation = validatePursuerConfiguration(candidate, {
    logicalWidth: options.logicalWidth,
    frozenReference: BASELINE_04B_R1,
    allowFrozenEdits: options.allowFrozenEdits,
  });

  if (!validation.ok || !validation.configuration) {
    return {
      ok: false, resolved: null, issues: validation.issues,
      failure: describeValidationFailure(validation),
    };
  }

  const configuration = validation.configuration;
  return {
    ok: true,
    issues: validation.issues,
    resolved: Object.freeze({
      configuration,
      hash: configurationHash(configuration),
      shortHash: shortConfigurationHash(configuration),
      canonical: canonicalizeConfiguration(configuration),
    }),
  };
}

/**
 * The baseline, resolved. Used wherever a run must start from the accepted
 * pursuer — which is every run nobody has deliberately changed.
 *
 * Throws if the baseline fails validation, and should: a build whose own
 * authority baseline is invalid must not start a game and pretend the pursuer
 * is the accepted one.
 */
export function resolveBaselineConfiguration(options: ResolveOptions = {}): ResolvedPursuerConfiguration {
  const outcome = resolvePursuerConfiguration(BASELINE_04B_R1, options);
  if (!outcome.ok) {
    throw new Error(`The 04B-R1 baseline configuration is invalid in this build:\n${outcome.failure}`);
  }
  return outcome.resolved;
}

/** A selection that is simply "the accepted pursuer". */
export function baselineSelection(options: ResolveOptions = {}): ConfigurationSelection {
  return {
    resolved: resolveBaselineConfiguration(options),
    reason: 'DEFAULT_BASELINE',
    selectedAt: null,
    requestedConfigurationId: null,
    fallbackFrom: null,
  };
}

/**
 * Resolve a candidate, falling back to the baseline if it will not resolve.
 *
 * A configuration that cannot be loaded must never stop the game from
 * starting — but it must also never be silently swallowed, so the returned
 * selection records exactly what was refused and why, and the tuning UI shows
 * it. Losing an experiment is annoying; losing an evening because the pursuer
 * quietly reverted and nobody said so is worse.
 */
export function selectConfiguration(
  candidate: unknown,
  reason: SelectionReason,
  options: ResolveOptions & { requestedConfigurationId?: string | null; selectedAt?: string | null } = {},
): ConfigurationSelection {
  const outcome = resolvePursuerConfiguration(candidate, options);
  if (outcome.ok) {
    return {
      resolved: outcome.resolved,
      reason,
      selectedAt: options.selectedAt ?? null,
      requestedConfigurationId: options.requestedConfigurationId
        ?? outcome.resolved.configuration.identity.configurationId,
      fallbackFrom: null,
    };
  }
  return {
    resolved: resolveBaselineConfiguration(options),
    reason: 'DEFAULT_BASELINE',
    selectedAt: options.selectedAt ?? null,
    requestedConfigurationId: options.requestedConfigurationId ?? null,
    fallbackFrom: {
      requestedConfigurationId: options.requestedConfigurationId ?? null,
      failure: outcome.failure,
    },
  };
}

/**
 * The values the run computes for itself, reported alongside the resolved
 * configuration so a diagnostic explains the run completely.
 *
 * `frameMs` turns the commitment windows — which are counted in FRAMES — into
 * the wall-clock quantities a person can reason about. This is the number that
 * explains the 04B report: the same configuration on a 144Hz display confirms
 * a loss in 21ms rather than the 50ms it was derived at.
 */
export function describeDerivedValues(input: {
  actorRadius: number;
  trailSenseRadius: number;
  trunkCount: number;
  frameMs?: number | null;
  configuration: PursuerConfiguration;
}): ResolvedDerivedValues {
  const { configuration, frameMs } = input;
  return {
    actorRadius: input.actorRadius,
    trailSenseRadius: input.trailSenseRadius,
    trunkCount: input.trunkCount,
    commitmentWindowMs: typeof frameMs === 'number' && frameMs > 0
      ? {
        frameMs,
        loss: configuration.commitment.lossConfirmationTicks * frameMs,
        acquire: configuration.commitment.acquireConfirmationTicks * frameMs,
        trailExhaustion: configuration.commitment.trailExhaustionConfirmationTicks * frameMs,
        leadPreemption: configuration.commitment.leadPreemptionConfirmationTicks * frameMs,
      }
      : null,
  };
}

/**
 * DOCUMENTED, NOT ACTIVE.
 *
 * The addendum asks for the safe boundaries at which a configuration could
 * change to be written down and left switched off. The default — and the only
 * behaviour this build implements — is the first row: one configuration,
 * frozen for one active run.
 *
 * Nothing reads this table. It exists so that the next person to want a
 * mid-session change has to argue against a written analysis rather than
 * discover the hazards by shipping them.
 */
export const SAFE_TRANSITION_BOUNDARIES: readonly {
  boundary: string; safe: boolean; active: boolean; why: string;
}[] = [
  {
    boundary: 'Run start (a fresh run, after restart)',
    safe: true,
    active: true,
    why: 'The controller is rebuilt from scratch: position, Brain memory, the consumed-trail watermark, '
      + 'the search episode, commitment, sensor counters, cadence and trail. Nothing survives, so nothing '
      + 'can be left describing the previous configuration. THIS IS THE ONLY ACTIVE BOUNDARY.',
  },
  {
    boundary: 'Between problems, while the learner is stationary and unsensed',
    safe: false,
    active: false,
    why: 'Looks safe and is not. Cadence state, an in-flight commitment and a search episode all carry '
      + 'forward, and a changed sense radius mid-episode can retire evidence the Brain has already '
      + 'committed to — which is the exact class of defect 03A-R2 was built to eliminate.',
  },
  {
    boundary: 'On capture, before the next run begins',
    safe: true,
    active: false,
    why: 'Equivalent to run start, because the run has ended. Would be the natural place for a future '
      + 'host policy to act. Not active: nothing selects configurations automatically in this build.',
  },
  {
    boundary: 'Per frame',
    safe: false,
    active: false,
    why: 'Explicitly ruled out by the addendum, and independently by evidence integrity: a run whose '
      + 'parameters moved during it cannot be attributed to any configuration, so every diagnostic it '
      + 'produces is unattributable. This is why no function in this module can be called from a frame loop.',
  },
];
