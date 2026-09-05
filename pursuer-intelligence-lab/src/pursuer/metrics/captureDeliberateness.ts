/**
 * DID IT HUNT ME, OR DID IT BUMP INTO ME?
 *
 * This is the tester's central complaint turned into a diagnostic:
 *
 *   "it seems to arbitrarily bump into the player's Spark ... more like tag
 *    where the chaser has its eyes closed and may happen to run into you by
 *    sheer luck"
 *
 * A capture proves nothing on its own. A pursuer sweeping a graph at random
 * will eventually cross the learner's platform, and the run ends identically
 * to one where it hunted the learner down. So this looks at the seconds BEFORE
 * contact and asks what the pursuer was actually doing.
 *
 * DIAGNOSTIC ONLY. It never touches gameplay, and it is not a score: it is a
 * label that tells a human which captures are worth watching the replay of.
 */

import type { LabSample } from '../../sim/simulation';

export type CaptureVerdict = 'DELIBERATE_PURSUIT_CAPTURE' | 'LIKELY_SEARCH_COLLISION' | 'AMBIGUOUS' | 'NO_CAPTURE';

export interface CaptureAnalysis {
  verdict: CaptureVerdict;
  /** The window examined, in ms before contact. */
  windowMs: number;
  /** Fraction of the window the learner was directly perceived. */
  perceptionUptime: number;
  /** Fraction of the window spent in DIRECT_PURSUIT. */
  directPursuitFraction: number;
  /** Fraction of the window spent in SEARCH. */
  searchFraction: number;
  /**
   * Of the intervals where the body actually MOVED, the fraction that reduced
   * legal graph distance. Cadence pauses are excluded: a pursuer that pauses
   * 62% of the time by design is not thereby failing to hunt.
   */
  closingFraction: number;
  /** Legal distance at the start of the window minus at contact. */
  graphDistanceClosed: number | null;
  strategicTargetChanges: number;
  routeReplans: number;
  trueReversals: number;
  captureRangeEntries: number;
  /** The reason codes the Brain gave during the window, most recent last. */
  reasonTrail: string[];
  /** One sentence a human can read. */
  summary: string;
}

const DEFAULT_WINDOW_MS = 5000;

export function analyseCapture(
  samples: readonly LabSample[],
  capturedAtMs: number | null,
  windowMs = DEFAULT_WINDOW_MS,
): CaptureAnalysis {
  const empty: CaptureAnalysis = {
    verdict: 'NO_CAPTURE', windowMs, perceptionUptime: 0, directPursuitFraction: 0,
    searchFraction: 0, closingFraction: 0, graphDistanceClosed: null,
    strategicTargetChanges: 0, routeReplans: 0, trueReversals: 0, captureRangeEntries: 0,
    reasonTrail: [], summary: 'The run did not end in a capture.',
  };
  if (capturedAtMs === null) return empty;

  const window = samples.filter((s) => s.tMs >= capturedAtMs - windowMs && s.tMs <= capturedAtMs);
  if (!window.length) return empty;

  const perceived = window.filter((s) => s.pursuer.perceptionActive).length / window.length;
  const direct = window.filter((s) => s.pursuer.mode === 'DIRECT_PURSUIT').length / window.length;
  const searching = window.filter((s) => s.pursuer.mode === 'SEARCH').length / window.length;
  const moving = window.filter((s) => s.pursuer.moved);
  const closing = moving.length
    ? moving.filter((s) => s.pursuer.closedUsefulDistance).length / moving.length : 0;
  const reversals = window.filter((s) => s.pursuer.reversal).length;

  const startGraph = window[0].pursuer.graphDistanceToLearner;
  const endGraph = window[window.length - 1].pursuer.graphDistanceToLearner;
  const closedDistance = startGraph !== null && endGraph !== null ? startGraph - endGraph : null;

  let targetChanges = 0;
  let routeReplans = 0;
  let previousTarget: string | null = null;
  let previousRoute: string | null = null;
  const reasons: string[] = [];
  for (const sample of window) {
    const target = sample.pursuer.targetNode
      ?? (sample.pursuer.target ? `${Math.round(sample.pursuer.target.x)},${Math.round(sample.pursuer.target.y)}` : 'none');
    if (previousTarget !== null && target !== previousTarget) targetChanges += 1;
    previousTarget = target;
    const route = sample.pursuer.routeNodes.join('>');
    if (previousRoute !== null && route !== previousRoute) routeReplans += 1;
    previousRoute = route;
    if (reasons[reasons.length - 1] !== sample.pursuer.reasonCode) reasons.push(sample.pursuer.reasonCode);
  }
  const rangeEntries = window.filter((s, i) =>
    i > 0 && s.pursuer.distanceToLearner <= 60 && window[i - 1].pursuer.distanceToLearner > 60).length;

  // ── the classification ────────────────────────────────────────────────
  // DELIBERATE means the pursuer knew where the learner was for most of the
  // approach, was committed to going there, and was actually shortening the
  // legal route. Anything can collide; only a hunter does all three.
  let verdict: CaptureVerdict;
  let summary: string;
  if (perceived >= 0.6 && direct >= 0.5 && closing >= 0.5) {
    verdict = 'DELIBERATE_PURSUIT_CAPTURE';
    summary = `Perceived the Spark for ${(perceived * 100).toFixed(0)}% of the last `
      + `${(windowMs / 1000).toFixed(0)}s, held direct pursuit for ${(direct * 100).toFixed(0)}% of it, `
      + `and closed legal distance on ${(closing * 100).toFixed(0)}% of the intervals it was moving. It hunted.`;
  } else if (searching >= 0.5 || (perceived < 0.3 && closing < 0.5)) {
    verdict = 'LIKELY_SEARCH_COLLISION';
    summary = `Spent ${(searching * 100).toFixed(0)}% of the last ${(windowMs / 1000).toFixed(0)}s searching `
      + `and perceived the Spark only ${(perceived * 100).toFixed(0)}% of it. This capture looks like the `
      + 'sweep happening to cross the learner rather than a hunt.';
  } else {
    verdict = 'AMBIGUOUS';
    summary = `Mixed: perceived ${(perceived * 100).toFixed(0)}%, direct pursuit ${(direct * 100).toFixed(0)}%, `
      + `closing ${(closing * 100).toFixed(0)}%. Worth watching the replay before believing either story.`;
  }

  return {
    verdict, windowMs,
    perceptionUptime: perceived,
    directPursuitFraction: direct,
    searchFraction: searching,
    closingFraction: closing,
    graphDistanceClosed: closedDistance,
    strategicTargetChanges: targetChanges,
    routeReplans,
    trueReversals: reversals,
    captureRangeEntries: rangeEntries,
    reasonTrail: reasons.slice(-12),
    summary,
  };
}
