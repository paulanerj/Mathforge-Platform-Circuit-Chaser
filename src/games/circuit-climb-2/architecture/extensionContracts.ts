/**
 * CC2-22 — Contract boundary for future enemy, hazard, and ability modules.
 *
 * This module is an ADDITIVE, host-neutral architecture seam.
 * It is intentionally NOT imported into CircuitClimbCore or its chase wrapper:
 * CC2-22 must remain source-digest-identical to approved CC2-VIS-21.
 *
 * Non-negotiable rules:
 * - Math is authoritative in CircuitClimbCore; extensions cannot grade.
 * - Only finite, previously observed sensing signals may be delivered to an
 *   enemy. No hidden Spark position, correct answer, future path, or target ID.
 * - Candidate output is a REQUEST for future authoritative adjudication,
 *   never a collision, grade, spend, reward, capture, or state change.
 * - All outputs are versioned, bounded, reproducible and run-scoped.
 * - Definitions are opt-in; the accepted game has ZERO enabled extensions.
 */
export const CC2_EXTENSION_SCHEMA = 'cc2-extension/v1' as const;
export const CC2_EXTENSION_FRAME_SCHEMA = 'cc2-extension-frame/v1' as const;
export const CC2_EXTENSION_CANDIDATE_SCHEMA = 'cc2-extension-candidate/v1' as const;

export type ExtensionKindV1 = 'ENEMY' | 'HAZARD' | 'ABILITY' | 'SPECIAL_PLATFORM';
export type SignalSourceV1 = 'NEAR' | 'SIGHT' | 'WAKE';
export type PublicPhaseV1 = 'ready' | 'outbound' | 'return' | 'ended';
export type PublicModeV1 = 'practice' | 'climb' | 'challenge';

export interface ExtensionDefinitionV1 {
  readonly schema: typeof CC2_EXTENSION_SCHEMA;
  readonly id: string;
  readonly kind: ExtensionKindV1;
  readonly visualToken: string;
  /** Priority for deterministic ordering, not collision precedence. */
  readonly priority: number;
  readonly minCompletedRows: number;
  readonly sensorPolicy: 'NONE' | 'DETECTED_ONLY';
  /** Must remain false for all CC2-22 extension definitions. */
  readonly enabledByDefault: false;
}

export interface ObservedSignalV1 {
  readonly source: SignalSourceV1;
  readonly observedTick: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Public, finite-data projection — NOT an EngineStateV1 or ChaseSnapshotV1.
 * Deliberately no "spark" / "currentProblem" / "correctPlatformId" fields.
 */
export interface ExtensionFrameV1 {
  readonly schema: typeof CC2_EXTENSION_FRAME_SCHEMA;
  readonly runId: string;
  readonly tick: number;
  readonly phase: PublicPhaseV1;
  readonly mode: PublicModeV1;
  readonly completedRows: number;
  readonly signal: ObservedSignalV1 | null;
}

export type ExtensionCandidateKindV1 =
  | 'ENCOUNTER_CANDIDATE'
  | 'HAZARD_CANDIDATE'
  | 'ABILITY_PRESENTATION_CANDIDATE'
  | 'SPECIAL_PLATFORM_CANDIDATE';

export interface ExtensionCandidateV1 {
  readonly schema: typeof CC2_EXTENSION_CANDIDATE_SCHEMA;
  readonly runId: string;
  readonly tick: number;
  readonly extensionId: string;
  readonly kind: ExtensionCandidateKindV1;
  /** Candidate output cannot change a core state or award anything. */
  readonly advisoryOnly: true;
  readonly publicRow: number;
}

const idPattern = /^[a-z][a-z0-9-]{1,47}$/;
const maxKeys = (a: object): string[] => Object.keys(a).sort();
const sameKeys = (o: object, expected: readonly string[]): boolean =>
  JSON.stringify(maxKeys(o)) === JSON.stringify([...expected].sort());
const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const uint = (x: unknown, max: number): x is number =>
  Number.isSafeInteger(x) && (x as number) >= 0 && (x as number) <= max;
const finitePoint = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1_000_000;

export function validateExtensionDefinition(input: unknown): ExtensionDefinitionV1 {
  if (!isRecord(input) || !sameKeys(input, [
    'schema', 'id', 'kind', 'visualToken', 'priority',
    'minCompletedRows', 'sensorPolicy', 'enabledByDefault',
  ])) throw new Error('CC2_EXT_DEFINITION_FIELDS');
  if (input.schema !== CC2_EXTENSION_SCHEMA) throw new Error('CC2_EXT_SCHEMA');
  if (typeof input.id !== 'string' || !idPattern.test(input.id))
    throw new Error('CC2_EXT_ID');
  if (!['ENEMY', 'HAZARD', 'ABILITY', 'SPECIAL_PLATFORM'].includes(String(input.kind)))
    throw new Error('CC2_EXT_KIND');
  if (typeof input.visualToken !== 'string' ||
      !idPattern.test(input.visualToken))
    throw new Error('CC2_EXT_VISUAL_TOKEN');
  if (!uint(input.priority, 100) || !uint(input.minCompletedRows, 10_000))
    throw new Error('CC2_EXT_PRIORITY_OR_ROW');
  if (!['NONE', 'DETECTED_ONLY'].includes(String(input.sensorPolicy)))
    throw new Error('CC2_EXT_SENSOR_POLICY');
  if (input.enabledByDefault !== false)
    throw new Error('CC2_EXT_MUST_DEFAULT_DISABLED');
  if (input.kind !== 'ENEMY' && input.sensorPolicy !== 'NONE')
    throw new Error('CC2_EXT_ONLY_ENEMY_USES_SENSING');
  return structuredClone(input) as unknown as ExtensionDefinitionV1;
}

/**
 * Exact-field validation is an explicit information firewall:
 * passing the full world state or the hidden answer is a hard rejection.
 * Source-observation policy belongs to the authoritative Pursuer/World,
 * not to the presentation layer.
 */
export function validateExtensionFrame(input: unknown): ExtensionFrameV1 {
  if (!isRecord(input) || !sameKeys(input, [
    'schema', 'runId', 'tick', 'phase', 'mode', 'completedRows', 'signal',
  ])) throw new Error('CC2_EXT_FRAME_FIELDS');
  if (input.schema !== CC2_EXTENSION_FRAME_SCHEMA)
    throw new Error('CC2_EXT_FRAME_SCHEMA');
  if (typeof input.runId !== 'string' || input.runId.length < 1 ||
      input.runId.length > 256)
    throw new Error('CC2_EXT_FRAME_RUN');
  if (!uint(input.tick, Number.MAX_SAFE_INTEGER) ||
      !uint(input.completedRows, 10_000))
    throw new Error('CC2_EXT_FRAME_TICK_OR_ROWS');
  if (!['ready', 'outbound', 'return', 'ended'].includes(String(input.phase)) ||
      !['practice', 'climb', 'challenge'].includes(String(input.mode)))
    throw new Error('CC2_EXT_FRAME_PHASE_OR_MODE');
  if (input.signal !== null) {
    if (!isRecord(input.signal) || !sameKeys(input.signal, [
      'source', 'observedTick', 'x', 'y',
    ])) throw new Error('CC2_EXT_SIGNAL_FIELDS');
    if (!['NEAR', 'SIGHT', 'WAKE'].includes(String(input.signal.source)) ||
        !uint(input.signal.observedTick, input.tick as number) ||
        !finitePoint(input.signal.x) || !finitePoint(input.signal.y))
      throw new Error('CC2_EXT_SIGNAL_INVALID');
    // Reject ancient wake sightings and fabricated future observations.
    if (input.signal.source === 'WAKE' &&
        (input.tick as number) - (input.signal.observedTick as number) > 240)
      throw new Error('CC2_EXT_STALE_WAKE');
  }
  return structuredClone(input) as unknown as ExtensionFrameV1;
}
