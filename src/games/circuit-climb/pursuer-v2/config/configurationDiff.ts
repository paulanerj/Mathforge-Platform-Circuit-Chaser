/**
 * CONFIGURATION DIFF (04C).
 *
 * "COMPARE TO BASELINE" has to answer one question — what did I actually
 * change? — and it answers it badly if it prints forty rows of which two
 * differ. So this returns ONLY the differing parameters, and says for each
 * whether the difference is one a player could feel.
 *
 * The behaviour-affecting judgement is not a second opinion: it is the same
 * `BEHAVIOUR_LAYERS` the hash uses. If a diff reports a behaviour-affecting
 * change, the hash has changed too, and `pursuerV2Configuration.test.ts`
 * asserts that the two agree on every case rather than trusting them to.
 */

import { BEHAVIOUR_LAYERS, type PursuerConfiguration } from './pursuerConfigurationSchema';

export interface ConfigurationDifference {
  path: string;
  layer: string;
  baseline: unknown;
  candidate: unknown;
  /** True for anything inside a behaviour layer. Metadata differences are not. */
  behaviourAffecting: boolean;
}

export interface ConfigurationDiffReport {
  baselineId: string;
  candidateId: string;
  differences: readonly ConfigurationDifference[];
  /** True when the two configurations describe the same pursuer. */
  identicalBehaviour: boolean;
}

/**
 * Differences from `baseline` to `candidate`.
 *
 * `includeMetadata` is off by default: a tester comparing their tuning to the
 * baseline does not want to be told the notes field differs.
 */
export function diffConfigurations(
  baseline: PursuerConfiguration,
  candidate: PursuerConfiguration,
  options: { includeMetadata?: boolean } = {},
): ConfigurationDiffReport {
  const differences: ConfigurationDifference[] = [];

  for (const layer of BEHAVIOUR_LAYERS) {
    const before = baseline[layer] as Record<string, unknown>;
    const after = candidate[layer] as Record<string, unknown>;
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      if (!Object.is(before[key], after[key])) {
        differences.push({
          path: `${layer}.${key}`, layer, baseline: before[key], candidate: after[key],
          behaviourAffecting: true,
        });
      }
    }
  }

  const identicalBehaviour = differences.length === 0
    && baseline.identity.schemaVersion === candidate.identity.schemaVersion;

  if (baseline.identity.schemaVersion !== candidate.identity.schemaVersion) {
    differences.unshift({
      path: 'identity.schemaVersion', layer: 'identity',
      baseline: baseline.identity.schemaVersion, candidate: candidate.identity.schemaVersion,
      behaviourAffecting: true,
    });
  }

  if (options.includeMetadata) {
    for (const key of Object.keys(baseline.metadata).sort()) {
      const before = (baseline.metadata as unknown as Record<string, unknown>)[key];
      const after = (candidate.metadata as unknown as Record<string, unknown>)[key];
      if (!Object.is(before, after)) {
        differences.push({
          path: `metadata.${key}`, layer: 'metadata', baseline: before, candidate: after,
          behaviourAffecting: false,
        });
      }
    }
    for (const key of ['label', 'description'] as const) {
      if (baseline.identity[key] !== candidate.identity[key]) {
        differences.push({
          path: `identity.${key}`, layer: 'identity',
          baseline: baseline.identity[key], candidate: candidate.identity[key],
          behaviourAffecting: false,
        });
      }
    }
  }

  return {
    baselineId: baseline.identity.configurationId,
    candidateId: candidate.identity.configurationId,
    differences,
    identicalBehaviour,
  };
}

/** The diff as lines a person can paste into a report. */
export function formatDiff(report: ConfigurationDiffReport): string[] {
  if (!report.differences.length) {
    return [`${report.candidateId} is behaviourally identical to ${report.baselineId}.`];
  }
  return report.differences.map((d) =>
    `${d.path}: ${JSON.stringify(d.baseline)} -> ${JSON.stringify(d.candidate)}`
    + (d.behaviourAffecting ? '' : '  (presentation only)'));
}
