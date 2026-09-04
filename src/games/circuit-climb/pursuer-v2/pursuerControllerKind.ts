/**
 * THE PURSUER SELECTOR SEAM — one place, deliberately tiny.
 *
 * Circuit Climb now carries two independent pursuer implementations:
 *
 *   LEGACY_PURSUER    src/games/circuit-climb/pursuer/        (rollback authority)
 *   GRAPH_PURSUER_V2  src/games/circuit-climb/pursuer-v2/     (04A candidate)
 *
 * They are NOT two configurations of one engine. Graph V2 was built as a
 * separate chassis precisely so the legacy behaviour could stay intact and
 * reachable, and progressively mutating one into the other would have thrown
 * that away. The runtime therefore branches on this kind in exactly one place
 * — the pursuer update block — and nowhere else. If you find yourself adding a
 * second `if (kind === ...)` somewhere in the application, that is the signal
 * that the seam is in the wrong place, not that another branch is needed.
 *
 * ON THIS INTEGRATION BRANCH the candidate is the default, so a normal launch
 * exercises what is under review without anyone having to remember a hidden
 * toggle. The frozen predecessor branch is unchanged, so rollback authority
 * does not depend on this default.
 */

export type PursuerControllerKind = 'LEGACY_PURSUER' | 'GRAPH_PURSUER_V2';

/**
 * The launch candidate for the 04A integration branch.
 *
 * PM direction: a normal browser launch of this branch must exercise Graph V2.
 */
export const DEFAULT_PURSUER_CONTROLLER: PursuerControllerKind = 'GRAPH_PURSUER_V2';

/** Where a developer override is remembered between reloads. */
export const PURSUER_CONTROLLER_STORAGE_KEY = 'circuitClimbPursuerController';

function normalize(value: string | null | undefined): PursuerControllerKind | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'LEGACY_PURSUER' || upper === 'LEGACY' || upper === 'V1') return 'LEGACY_PURSUER';
  if (upper === 'GRAPH_PURSUER_V2' || upper === 'GRAPH' || upper === 'V2') return 'GRAPH_PURSUER_V2';
  return null;
}

/**
 * Which pursuer this launch should run.
 *
 * DEVELOPER-ONLY override, in precedence order: a `?pursuer=` query parameter,
 * then a stored preference. Neither is a player-facing setting and neither
 * appears in the product HUD — this exists so a reviewer can put the legacy
 * pursuer back on screen for comparison, and for nothing else.
 *
 * Deliberately total: any unreadable storage, absent window, or unrecognised
 * value yields the default rather than throwing, because a diagnostic switch
 * must never be able to stop the game from starting.
 */
export function resolvePursuerController(
  search?: string,
  storage?: Pick<Storage, 'getItem'> | null,
): PursuerControllerKind {
  try {
    const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    if (query) {
      const fromQuery = normalize(new URLSearchParams(query).get('pursuer'));
      if (fromQuery) return fromQuery;
    }
  } catch {
    // fall through to storage
  }

  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const fromStorage = normalize(store?.getItem(PURSUER_CONTROLLER_STORAGE_KEY) ?? null);
    if (fromStorage) return fromStorage;
  } catch {
    // fall through to the default
  }

  return DEFAULT_PURSUER_CONTROLLER;
}


/** Where a developer override for capture arming is remembered. */
export const PURSUER_CAPTURE_STORAGE_KEY = 'circuitClimbCaptureArmed';

/**
 * Whether capture is ARMED for this launch. It is, unless a developer
 * explicitly disarms it.
 *
 * DIAGNOSTIC ONLY, and normal gameplay must never reach the disarmed path:
 * a run that cannot end is a measuring instrument, not a game. It exists
 * because engineering verification needs long sessions the pursuer would
 * otherwise cut short after a handful of selections — and because how quickly
 * it DOES cut them short is itself a product finding, to be reported rather
 * than tuned away.
 *
 * Total, like `resolvePursuerController`: anything unreadable yields ARMED.
 */
export function resolveCaptureArmed(
  search?: string,
  storage?: Pick<Storage, 'getItem'> | null,
): boolean {
  const disarmed = (value: string | null | undefined) => {
    if (!value) return false;
    const upper = value.trim().toUpperCase();
    return upper === 'DISARMED' || upper === 'OFF' || upper === '0' || upper === 'FALSE';
  };

  try {
    const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
    if (query && disarmed(new URLSearchParams(query).get('capture'))) return false;
  } catch {
    // fall through
  }
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (disarmed(store?.getItem(PURSUER_CAPTURE_STORAGE_KEY) ?? null)) return false;
  } catch {
    // fall through
  }
  return true;
}
