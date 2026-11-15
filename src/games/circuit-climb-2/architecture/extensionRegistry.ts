/**
 * CC2-22 — Deterministic, DISCONNECTED extension discovery sandbox.
 *
 * This is deliberately not wired into the playable CC2-VIS-21. A discovery
 * candidate is a read-only recommendation, not a real spawn or ability use.
 * Future phases will implement core-authoritative spawn/effect adjudication.
 *
 * Supported now:
 *   strict definitions, opt-in visibility, evidence provenance,
 *   deterministic ordering, no leaked private math, no mutation.
 *
 * Forbidden now:
 *   calling game engine commands, creating enemies, player capture,
 *   modifying physics, grading math, spending charge, awarding achievements.
 */
import {
  CC2_EXTENSION_CANDIDATE_SCHEMA,
  type ExtensionCandidateKindV1,
  type ExtensionCandidateV1,
  type ExtensionDefinitionV1,
  type ExtensionFrameV1,
  validateExtensionDefinition,
  validateExtensionFrame,
} from './extensionContracts';

const clone = <T>(value: T): T => structuredClone(value);
const asKind = (d: ExtensionDefinitionV1): ExtensionCandidateKindV1 => {
  switch (d.kind) {
    case 'ENEMY': return 'ENCOUNTER_CANDIDATE';
    case 'HAZARD': return 'HAZARD_CANDIDATE';
    case 'ABILITY': return 'ABILITY_PRESENTATION_CANDIDATE';
    case 'SPECIAL_PLATFORM': return 'SPECIAL_PLATFORM_CANDIDATE';
  }
};

/**
 * Catalog only: candidates are available to a future authoritative host,
 * never applied to the existing run. An empty opt-in set is the production
 * default and is guaranteed to produce zero candidates.
 */
export class ExtensionRegistryV1 {
  private readonly catalog = new Map<string, ExtensionDefinitionV1>();

  register(raw: unknown): void {
    const definition = validateExtensionDefinition(raw);
    if (this.catalog.has(definition.id))
      throw new Error('CC2_EXT_DUPLICATE_ID');
    this.catalog.set(definition.id, Object.freeze(clone(definition)));
  }

  definitions(): ExtensionDefinitionV1[] {
    return [...this.catalog.values()]
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
      .map(clone);
  }

  /**
   * Qualify *advisory* candidates. Disabled game behavior is represented by
   * enabledIds=[]; active IDs must be explicitly supplied by the caller.
   * This function has no hidden state and no wall-clock or random calls.
   */
  qualify(frameValue: unknown, enabledIds: readonly string[] = []):
    ExtensionCandidateV1[] {
    const frame = validateExtensionFrame(frameValue);
    const names = new Set<string>();
    for (const id of enabledIds) {
      if (names.has(id)) throw new Error('CC2_EXT_DUPLICATE_ENABLE');
      if (!this.catalog.has(id)) throw new Error('CC2_EXT_ENABLE_UNKNOWN');
      names.add(id);
    }
    // Practice and completed runs must not schedule encounter candidates.
    if (frame.phase === 'ended' || frame.mode === 'practice') return [];

    const output: ExtensionCandidateV1[] = [];
    for (const d of this.definitions()) {
      if (!names.has(d.id) || frame.completedRows < d.minCompletedRows) continue;
      if (d.sensorPolicy === 'DETECTED_ONLY' && !frame.signal) continue;
      // Notice that even a detected signal cannot cause a hit, slow, stun or
      // capture: it is only an eligibility receipt for future qualification.
      output.push({
        schema: CC2_EXTENSION_CANDIDATE_SCHEMA,
        runId: frame.runId,
        tick: frame.tick,
        extensionId: d.id,
        kind: asKind(d),
        advisoryOnly: true,
        publicRow: frame.completedRows,
      });
    }
    return output;
  }
}

/** Immutable, explicit zero-extension state for the accepted baseline. */
export const CC2_22_PRODUCTION_EXTENSIONS = Object.freeze({
  schema: 'cc2-extension-gates/v1' as const,
  enabledIds: Object.freeze([] as string[]),
  appliesToGameplay: false as const,
  changesMathematics: false as const,
  changesPursuer: false as const,
  changesAudio: false as const,
});

/**
 * A safe example catalog for tests and future CC2-23 proposals. The
 * definitions are NOT feature activations and are NOT runtime-enemies.
 */
export function proposedExtensionCatalog(): ExtensionRegistryV1 {
  const registry = new ExtensionRegistryV1();
  registry.register({
    schema: 'cc2-extension/v1', id: 'scout',
    kind: 'ENEMY', visualToken: 'enemy-scout',
    priority: 20, minCompletedRows: 4,
    sensorPolicy: 'DETECTED_ONLY', enabledByDefault: false,
  });
  registry.register({
    schema: 'cc2-extension/v1', id: 'sentry',
    kind: 'ENEMY', visualToken: 'enemy-sentry',
    priority: 30, minCompletedRows: 8,
    sensorPolicy: 'DETECTED_ONLY', enabledByDefault: false,
  });
  registry.register({
    schema: 'cc2-extension/v1', id: 'stabilizer',
    kind: 'SPECIAL_PLATFORM', visualToken: 'platform-stabilizer',
    priority: 10, minCompletedRows: 4,
    sensorPolicy: 'NONE', enabledByDefault: false,
  });
  registry.register({
    schema: 'cc2-extension/v1', id: 'insulation',
    kind: 'ABILITY', visualToken: 'ability-insulation',
    priority: 40, minCompletedRows: 8,
    sensorPolicy: 'NONE', enabledByDefault: false,
  });
  registry.register({
    schema: 'cc2-extension/v1', id: 'overload',
    kind: 'HAZARD', visualToken: 'hazard-overload',
    priority: 50, minCompletedRows: 12,
    sensorPolicy: 'NONE', enabledByDefault: false,
  });
  return registry;
}
