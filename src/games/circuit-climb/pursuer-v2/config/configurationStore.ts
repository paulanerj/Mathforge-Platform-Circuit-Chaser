/**
 * THE CONFIGURATION STORE (04C).
 *
 * Where saved configurations, the current draft and the current test notes
 * live between reloads.
 *
 * Plain TypeScript on purpose. The tuning UI is React; Graph V2 is not, and
 * must never become so. Everything a panel needs to do — select, duplicate,
 * rename, edit, reset, paste — is a pure function here, and the panel is a
 * rendering of the result. That is what keeps the pursuer independent of the
 * tool that tunes it, and it is why a future host that selects configurations
 * without any UI at all can use exactly the same functions.
 *
 * Three rules the store enforces rather than trusts:
 *
 *   BUILT-INS ARE NEVER MUTATED. An edit to a built-in produces a new
 *   EXPERIMENTAL configuration derived from it. There is no code path that
 *   writes back to `BASELINE_04B_R1`, and the object is frozen besides.
 *
 *   NOTHING PARTIAL IS STORED. Everything read back from storage goes through
 *   the one validator. A payload written by an older build, hand-edited, or
 *   truncated is dropped with a recorded reason, not repaired by guesswork.
 *
 *   STORAGE FAILURE IS NEVER FATAL. Private windows, disabled site data and
 *   quota errors all end with the baseline selected and the game running.
 */

import type { PursuerConfiguration } from './pursuerConfigurationSchema';
import { validatePursuerConfiguration, describeValidationFailure } from './validatePursuerConfiguration';
import {
  BASELINE_04B_R1, BASELINE_CONFIGURATION_ID, BUILT_IN_CONFIGURATIONS,
  deriveConfiguration, findBuiltInConfiguration,
} from './configurationLibrary';
import { emptyTestSessionNotes, normalizeTestSessionNotes, type TestSessionNotes } from './testSessionNotes';

export const PURSUER_CONFIG_STORAGE_KEY = 'circuitClimbPursuerConfiguration';

export interface ConfigurationStoreState {
  /** Configurations a human has made. Built-ins are not duplicated in here. */
  saved: readonly PursuerConfiguration[];
  /** Which configuration id is selected. */
  selectedId: string;
  /**
   * The live draft: the selected configuration plus any unapplied slider
   * edits. Null when the selection has not been edited.
   */
  draft: PursuerConfiguration | null;
  notes: TestSessionNotes;
  /** Anything dropped on load, so it can be shown rather than swallowed. */
  loadWarnings: readonly string[];
}

export function emptyStoreState(): ConfigurationStoreState {
  return {
    saved: [],
    selectedId: BASELINE_CONFIGURATION_ID,
    draft: null,
    notes: emptyTestSessionNotes(),
    loadWarnings: [],
  };
}

/** Every configuration the UI can offer: built-ins first, then saved ones. */
export function allConfigurations(state: ConfigurationStoreState): readonly PursuerConfiguration[] {
  return [...BUILT_IN_CONFIGURATIONS, ...state.saved];
}

export function findConfiguration(
  state: ConfigurationStoreState, configurationId: string,
): PursuerConfiguration | null {
  return allConfigurations(state).find((c) => c.identity.configurationId === configurationId) ?? null;
}

/** The selected configuration, falling back to the baseline if it has gone. */
export function selectedConfiguration(state: ConfigurationStoreState): PursuerConfiguration {
  return findConfiguration(state, state.selectedId) ?? BASELINE_04B_R1;
}

/**
 * What a run would actually use: the draft if one exists, else the selection.
 */
export function effectiveConfiguration(state: ConfigurationStoreState): PursuerConfiguration {
  return state.draft ?? selectedConfiguration(state);
}

/** True when there are unapplied edits sitting on top of the selection. */
export function isModified(state: ConfigurationStoreState): boolean {
  return state.draft !== null;
}

export function isBuiltIn(configurationId: string): boolean {
  return findBuiltInConfiguration(configurationId) !== null;
}

// ── operations, all pure ──────────────────────────────────────────────────

export function select(state: ConfigurationStoreState, configurationId: string): ConfigurationStoreState {
  if (!findConfiguration(state, configurationId)) return state;
  return { ...state, selectedId: configurationId, draft: null };
}

/**
 * Change one parameter.
 *
 * ALWAYS produces a draft and never touches the stored configuration, whether
 * that configuration is a built-in or one of the tester's own. A slider is an
 * experiment in progress, not a save.
 */
export function editParameter(
  state: ConfigurationStoreState, path: string, value: number,
): ConfigurationStoreState {
  const [layer, key] = path.split('.');
  const base = effectiveConfiguration(state);
  const layerValues = (base as any)[layer];
  if (!layerValues || !(key in layerValues)) return state;
  const draft: PursuerConfiguration = {
    ...base,
    [layer]: { ...layerValues, [key]: value },
    metadata: { ...base.metadata, lifecycle: 'EXPERIMENTAL', experimental: true, frozen: false },
  } as PursuerConfiguration;
  return { ...state, draft };
}

/** Throw away unapplied edits and go back to the selected configuration. */
export function resetToSelected(state: ConfigurationStoreState): ConfigurationStoreState {
  return { ...state, draft: null };
}

/** Go all the way back to the accepted pursuer. */
export function resetToBaseline(state: ConfigurationStoreState): ConfigurationStoreState {
  return { ...state, selectedId: BASELINE_CONFIGURATION_ID, draft: null };
}

function uniqueId(state: ConfigurationStoreState, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'configuration';
  let candidate = `custom/${slug}`;
  let n = 2;
  while (findConfiguration(state, candidate)) {
    candidate = `custom/${slug}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * Save the current draft (or the selection) as a new named configuration.
 *
 * Always EXPERIMENTAL. Nothing in this module can produce a CANDIDATE or an
 * APPROVED configuration: those are human decisions taken outside the tool.
 */
export function saveAsNew(
  state: ConfigurationStoreState,
  label: string,
  options: { notes?: string; now?: string } = {},
): ConfigurationStoreState {
  const parent = selectedConfiguration(state);
  const body = effectiveConfiguration(state);
  const id = uniqueId(state, label);
  const created = deriveConfiguration(parent, {
    configurationId: id,
    label,
    description: `Created from ${parent.identity.label}.`,
    notes: options.notes ?? '',
    source: state.draft ? 'HUMAN_TUNED' : 'DUPLICATED',
    createdAt: options.now ?? null,
  });
  const configuration: PursuerConfiguration = {
    ...created,
    locomotion: { ...body.locomotion },
    perception: { ...body.perception },
    commitment: { ...body.commitment },
    chassis: { ...body.chassis },
    spawnCapture: { ...body.spawnCapture },
  };
  return { ...state, saved: [...state.saved, configuration], selectedId: id, draft: null };
}

/** Rename a saved configuration. Built-ins refuse to be renamed. */
export function rename(
  state: ConfigurationStoreState, configurationId: string, label: string,
): ConfigurationStoreState {
  if (isBuiltIn(configurationId)) return state;
  return {
    ...state,
    saved: state.saved.map((c) => (c.identity.configurationId === configurationId
      ? { ...c, identity: { ...c.identity, label } }
      : c)),
  };
}

export function remove(state: ConfigurationStoreState, configurationId: string): ConfigurationStoreState {
  if (isBuiltIn(configurationId)) return state;
  const saved = state.saved.filter((c) => c.identity.configurationId !== configurationId);
  const selectedId = state.selectedId === configurationId ? BASELINE_CONFIGURATION_ID : state.selectedId;
  return { ...state, saved, selectedId, draft: state.selectedId === configurationId ? null : state.draft };
}

export interface PasteOutcome {
  state: ConfigurationStoreState;
  ok: boolean;
  /** The reason a paste was refused, verbatim from the one validator. */
  failure: string | null;
}

/**
 * Load a configuration from pasted JSON.
 *
 * Goes through the same validator as everything else — a paste from a bug
 * report is exactly the case where a silently-repaired payload would produce
 * evidence about a pursuer nobody ran.
 */
export function pasteConfiguration(
  state: ConfigurationStoreState, json: string, options: { now?: string } = {},
): PasteOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { state, ok: false, failure: `That is not valid JSON: ${(error as Error).message}` };
  }

  const validation = validatePursuerConfiguration(parsed, { frozenReference: BASELINE_04B_R1 });
  if (!validation.ok || !validation.configuration) {
    return { state, ok: false, failure: describeValidationFailure(validation) };
  }

  // A paste always lands as a distinct saved configuration, even when its id
  // matches something already here: two people's "custom/faster" are not the
  // same configuration, and overwriting one with the other loses a session.
  const incoming = validation.configuration;
  const id = findConfiguration(state, incoming.identity.configurationId)
    ? uniqueId(state, `${incoming.identity.label} (pasted)`)
    : incoming.identity.configurationId;
  const configuration: PursuerConfiguration = {
    ...incoming,
    identity: { ...incoming.identity, configurationId: id },
    metadata: {
      ...incoming.metadata,
      source: 'PASTED',
      lifecycle: incoming.metadata.lifecycle === 'BASELINE' ? 'EXPERIMENTAL' : incoming.metadata.lifecycle,
      experimental: true,
      frozen: false,
      createdAt: incoming.metadata.createdAt ?? options.now ?? null,
    },
  };
  return {
    state: { ...state, saved: [...state.saved, configuration], selectedId: id, draft: null },
    ok: true,
    failure: null,
  };
}

export function setNotes(state: ConfigurationStoreState, notes: TestSessionNotes): ConfigurationStoreState {
  return { ...state, notes };
}

// ── persistence ───────────────────────────────────────────────────────────

interface StoredShape {
  version: 1;
  saved: unknown[];
  selectedId: string;
  draft: unknown;
  notes: unknown;
}

/**
 * Read the store back. Total: any failure yields a usable default state, with
 * what was dropped recorded in `loadWarnings` rather than swallowed.
 */
export function loadStoreState(storage?: Pick<Storage, 'getItem'> | null): ConfigurationStoreState {
  const state = emptyStoreState();
  const warnings: string[] = [];
  let raw: string | null = null;
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    raw = store?.getItem(PURSUER_CONFIG_STORAGE_KEY) ?? null;
  } catch {
    return state;
  }
  if (!raw) return state;

  let parsed: StoredShape;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...state, loadWarnings: ['Stored pursuer configurations could not be read and were ignored.'] };
  }
  if (!parsed || parsed.version !== 1) {
    return { ...state, loadWarnings: ['Stored pursuer configurations were written by a different build and were ignored.'] };
  }

  const saved: PursuerConfiguration[] = [];
  for (const candidate of Array.isArray(parsed.saved) ? parsed.saved : []) {
    const validation = validatePursuerConfiguration(candidate, { frozenReference: BASELINE_04B_R1 });
    if (validation.ok && validation.configuration) saved.push(validation.configuration);
    else {
      const id = (candidate as any)?.identity?.configurationId ?? 'an unnamed configuration';
      warnings.push(`Dropped ${id}: ${describeValidationFailure(validation).split('\n')[0]}`);
    }
  }

  let draft: PursuerConfiguration | null = null;
  if (parsed.draft) {
    const validation = validatePursuerConfiguration(parsed.draft, { frozenReference: BASELINE_04B_R1 });
    if (validation.ok && validation.configuration) draft = validation.configuration;
    else warnings.push('Dropped unapplied edits that no longer validate.');
  }

  const next: ConfigurationStoreState = {
    saved,
    selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : BASELINE_CONFIGURATION_ID,
    draft,
    notes: normalizeTestSessionNotes(parsed.notes),
    loadWarnings: warnings,
  };
  // A selection pointing at something that was dropped falls back visibly.
  if (!findConfiguration(next, next.selectedId)) {
    if (next.selectedId !== BASELINE_CONFIGURATION_ID) {
      warnings.push(`Selected configuration ${next.selectedId} is no longer available; using the baseline.`);
    }
    return { ...next, selectedId: BASELINE_CONFIGURATION_ID, draft: null, loadWarnings: warnings };
  }
  return next;
}

/** Persist. Failure is reported by returning false, never by throwing. */
export function saveStoreState(
  state: ConfigurationStoreState, storage?: Pick<Storage, 'setItem'> | null,
): boolean {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return false;
    const payload: StoredShape = {
      version: 1,
      saved: state.saved as unknown[],
      selectedId: state.selectedId,
      draft: state.draft,
      notes: state.notes,
    };
    store.setItem(PURSUER_CONFIG_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
