/**
 * SHARED GRAPH UTILITY, not a strategy.
 *
 * EXTRACTED from production `pursuer-v2/brain/search.ts` at commit d7a8115 and
 * MOVED here because it is not Graph V2's property: an expanding ring over the
 * board's own topology is the obvious way for ANY Brain to sweep a graph, and
 * making the Direct-Hunter reference import Brain A to get one would have tied
 * two candidates together that are supposed to be independent.
 *
 * The cursor type moved with it, for the same reason.
 */

/** Where a search episode has got to. Owned by whichever Brain is searching. */
export interface SearchCursorState {
  /** The node the current search episode is anchored at. */
  anchorNodeId: string;
  /** Flat frontier position to resume scanning FROM on the next advance. */
  index: number;
  episodeStartMs: number;
  trunksVisited: readonly TrunkId[];
  levelsVisited: readonly number[];
  targetsIssued: number;
  lastTargetNode: string | null;
  /** The ring step and flat frontier position the last issued target came from. */
  lastTargetTier: number;
  lastFrontierIndex: number;
  consecutiveRepeats: number;
}

/**
 * GRAPH_SEARCH's frontier — a real graph search, not a stale-x sweep.
 *
 * The old defect this replaces: rising near one stale learner x and
 * oscillating narrowly around it forever. The fix is a DETERMINISTIC,
 * NON-REPEATING frontier that covers the whole board width before it ever
 * drifts further out — level offsets in the order origin, +1, -1, +2, -2,
 * ... (a modest, non-exclusive upward bias, since +k is always visited
 * before -k), and at every level in that sequence, every admitted trunk in
 * a serpentine order (A→B→C→D, then D→C→B→A, alternating tier to tier) —
 * so the search cannot get stuck oscillating between two adjacent trunks
 * while the far side of the board goes unvisited.
 *
 * This module knows nothing about Sparks, sightings, or trails — it is pure
 * graph geometry plus a small amount of bookkeeping for the coverage
 * metrics LAB 03A's acceptance gates ask for. `graphBrainV1.ts` decides
 * WHEN to ask this module for the next target (only on entering search
 * fresh, or on believing it has arrived at the current one); this module
 * just answers, deterministically, from the state it is handed.
 */
import type { GraphNode, PursuitGraph, TrunkId } from './pursuitGraph';
import { nearestNode } from './graphRouting';


export interface SearchStep {
  targetNode: string;
  targetPoint: { x: number; y: number };
  /** Signed ring step: 0, +1, -1, +2, -2, ... */
  tier: number;
  frontierIndex: number;
  nextCursor: SearchCursorState;
}

/** The level offset for ring step k, in the order 0, +1, -1, +2, -2, ... */
function levelOffsetForStep(k: number): number {
  if (k === 0) return 0;
  return k % 2 === 1 ? (k + 1) / 2 : -(k / 2);
}

/**
 * The next search target, given the current graph and where the search is
 * anchored right now.
 *
 * A fresh episode starts (tier 0, frontier index 0, empty coverage) whenever
 * there is no prior cursor or the anchor's nearest node has changed — a
 * genuinely different anchor is a new search, not a continuation of the old
 * frontier's bookkeeping. Otherwise the cursor's own position is where this
 * call resumes, which is what makes "only advance on arrival" produce broad
 * coverage rather than a fresh random-looking jump every tick.
 */
export function nextSearchTarget(
  graph: PursuitGraph,
  anchorPoint: { x: number; y: number },
  cursor: SearchCursorState | null,
  nowMs: number,
  /**
   * Lowest graph level worth searching, if the caller knows one.
   *
   * PRODUCTION INTEGRATION 04B-R1. The board carries connector levels BELOW
   * row 0 so the pursuer can start beneath the learner. The learner never
   * can: it begins on its starting row and the only way off it is upward, or
   * back down to a row it has already been on. Ring tiers that descend into
   * the ground levels are therefore provably empty, and on the real surface
   * they were costing roughly half the early search — measured in
   * `tests/pursuerV2LostPursuer`, where a learner who climbed away and stood
   * still went unfound for 30-60 seconds.
   *
   * This is not knowledge of where the learner IS. It is the run-start cue
   * the Brain is already given, plus the fact that a floor is a floor.
   */
  minLevel?: number,
): SearchStep {
  const anchor = nearestNode(graph, anchorPoint);
  const admitted: TrunkId[] = graph.trunks.map((t) => t.id);

  const fresh = !cursor || cursor.anchorNodeId !== anchor.id;
  let index = fresh ? 0 : cursor!.index;
  const trunksVisited: TrunkId[] = fresh ? [] : [...cursor!.trunksVisited];
  const levelsVisited: number[] = fresh ? [] : [...cursor!.levelsVisited];
  const episodeStartMs = fresh ? nowMs : cursor!.episodeStartMs;
  const targetsIssuedSoFar = fresh ? 0 : cursor!.targetsIssued;
  const lastTargetNode = fresh ? null : cursor!.lastTargetNode;
  const consecutiveRepeatsSoFar = fresh ? 0 : cursor!.consecutiveRepeats;

  let resolved: GraphNode | null = null;
  let resolvedTier = 0;
  let guard = 0;
  // Bounded rather than unbounded: a board with at least one admitted trunk
  // and one level always resolves within a handful of steps, so this only
  // ever runs long on a degenerate graph, and the fallback below covers that.
  while (guard < 4000 && admitted.length > 0) {
    guard += 1;
    const k = Math.floor(index / admitted.length);
    const posInTier = index % admitted.length;
    const order = k % 2 === 0 ? admitted : [...admitted].reverse();
    const trunkId = order[posInTier];
    const level = anchor.level + levelOffsetForStep(k);
    const node = graph.nodes.get(`${trunkId}${level}`);
    index += 1;
    if (!node) continue;
    // Below the floor the learner started on: skip without spending a target.
    if (minLevel !== undefined && level < minLevel) continue;
    // Never immediately re-issue the node the search is already standing on
    // as its own "next" target — with a single admitted trunk this would
    // otherwise land back on frontier index 0 forever without progressing.
    if (node.id === lastTargetNode) continue;
    resolved = node;
    resolvedTier = k;
    break;
  }
  if (!resolved) resolved = anchor;

  const nextTrunks = trunksVisited.includes(resolved.trunk) ? trunksVisited : [...trunksVisited, resolved.trunk];
  const nextLevels = levelsVisited.includes(resolved.level) ? levelsVisited : [...levelsVisited, resolved.level];
  const repeated = resolved.id === lastTargetNode;

  const nextCursor: SearchCursorState = Object.freeze({
    anchorNodeId: anchor.id,
    index,
    episodeStartMs,
    trunksVisited: Object.freeze(nextTrunks),
    levelsVisited: Object.freeze(nextLevels),
    targetsIssued: targetsIssuedSoFar + 1,
    lastTargetNode: resolved.id,
    lastTargetTier: resolvedTier,
    lastFrontierIndex: index - 1,
    consecutiveRepeats: repeated ? consecutiveRepeatsSoFar + 1 : 0,
  });

  return {
    targetNode: resolved.id,
    targetPoint: { x: resolved.x, y: resolved.y },
    tier: resolvedTier,
    frontierIndex: index - 1,
    nextCursor,
  };
}
