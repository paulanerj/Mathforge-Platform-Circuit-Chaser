/**
 * CC2-02A — reviewed runtime configuration authority.
 *
 * Unknown fields and schema versions are rejected rather than silently
 * dropped. Each run resolves a complete config before the first math row.
 * Actual active runs do not mutate when a settings screen changes values.
 */
export interface RunConfigV1 {
  schemaVersion: 'cc2-run-config/v1';
  mode: 'practice' | 'climb' | 'challenge';
  curriculum: 'add20';
  movement: 'circuit' | 'hop';
  framingPercent: number; // all integer percentages from 80 through 120
  routeTurns: 6 | 8 | 10 | 12;
  transitShield: boolean;
  landingGraceTicks: number;
}

export const DEFAULT_RUN_CONFIG: Readonly<RunConfigV1> = Object.freeze({
  schemaVersion: 'cc2-run-config/v1',
  mode: 'climb',
  curriculum: 'add20',
  movement: 'circuit',
  framingPercent: 100,
  routeTurns: 8,
  transitShield: true,
  landingGraceTicks: 15,
});

const keys = Object.keys(DEFAULT_RUN_CONFIG).sort();

export function validateRunConfig(value: unknown): RunConfigV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CONFIG_NOT_OBJECT');
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).sort().join('|') !== keys.join('|')) {
    throw new Error('CONFIG_UNKNOWN_OR_MISSING_FIELDS');
  }
  if (input.schemaVersion !== 'cc2-run-config/v1') throw new Error('CONFIG_UNSUPPORTED_VERSION');
  if (!['practice', 'climb', 'challenge'].includes(String(input.mode))) throw new Error('CONFIG_INVALID_MODE');
  if (input.curriculum !== 'add20') throw new Error('CONFIG_UNSUPPORTED_CURRICULUM');
  if (!['circuit', 'hop'].includes(String(input.movement))) throw new Error('CONFIG_INVALID_MOVEMENT');
  if (!Number.isInteger(input.framingPercent) ||
      (input.framingPercent as number) < 80 ||
      (input.framingPercent as number) > 120) {
    throw new Error('CONFIG_UNSAFE_FRAMING');
  }
  if (![6, 8, 10, 12].includes(input.routeTurns as number)) throw new Error('CONFIG_INVALID_TURNS');
  if (typeof input.transitShield !== 'boolean') throw new Error('CONFIG_INVALID_TRANSIT_SHIELD');
  if (!Number.isInteger(input.landingGraceTicks) ||
      (input.landingGraceTicks as number) < 0 ||
      (input.landingGraceTicks as number) > 120) {
    throw new Error('CONFIG_INVALID_LANDING_GRACE');
  }
  return { ...(input as unknown as RunConfigV1) };
}

/** FNV-1a 32-bit digest: adequate for deterministic provenance, not a security signature. */
export function configHash(value: RunConfigV1): string {
  const serialized = keys.map(key => `${key}=${JSON.stringify(value[key as keyof RunConfigV1])}`).join(';');
  let h = 2166136261;
  for (const char of serialized) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function defaultRunConfig(): RunConfigV1 {
  return { ...DEFAULT_RUN_CONFIG };
}

export function exportRunConfig(config: RunConfigV1): string {
  return JSON.stringify(validateRunConfig(config), null, 2);
}

export function importRunConfig(json: string): RunConfigV1 {
  return validateRunConfig(JSON.parse(json) as unknown);
}
