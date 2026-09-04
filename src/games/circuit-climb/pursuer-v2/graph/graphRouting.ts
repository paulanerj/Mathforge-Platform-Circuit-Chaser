/**
 * Routing on the pursuit network: Dijkstra, target projection, and the
 * conversion from a node path into the legs the actor actually travels.
 *
 * The network is tiny — four trunks by a dozen levels — so Dijkstra with a
 * linear scan is both fast enough and easier to prove deterministic than a
 * heap. Ties are broken by node id, so the same request always returns the same
 * path; a route that varied run to run would make every downstream test a
 * coin-flip.
 *
 * Nothing here consults a platform. Legality was settled when the graph was
 * built, which is the entire architectural bet of GRAPH_V2.
 */

import type { GraphEdge, GraphNode, PursuitGraph, TrunkId } from './pursuitGraph';
import { otherEnd } from './pursuitGraph';

export type LegDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface RouteLeg {
  axis: 'vertical' | 'horizontal';
  direction: LegDirection;
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  /** The perpendicular coordinate this leg is travelled at. */
  laneOffset: number;
  bandMin: number;
  bandMax: number;
  /** The graph nodes this leg passes through, in order. */
  nodes: string[];
}

export interface Route {
  /** Ordered node ids, start to goal. */
  nodes: string[];
  legs: RouteLeg[];
  /** How the requested point was reconciled with the network. */
  projection: TargetProjection;
  totalLength: number;
}

export type ProjectionKind = 'NODE' | 'EDGE_POINT' | 'TERMINAL_APPROACH';

export interface TargetProjection {
  kind: ProjectionKind;
  /** The graph node the route ends at. */
  node: string;
  /** Where on the graph the actor will actually finish. */
  point: { x: number; y: number };
  /** Straight-line distance from that point to the requested target. */
  residual: number;
  requested: { x: number; y: number };
}

/** Dijkstra over the node graph. Deterministic: ties break on node id. */
export function shortestPath(graph: PursuitGraph, startId: string, goalId: string): string[] | null {
  if (startId === goalId) return [startId];
  if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) return null;

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(graph.nodes.keys());
  for (const id of unvisited) dist.set(id, Infinity);
  dist.set(startId, 0);

  while (unvisited.size) {
    let current: string | null = null;
    let best = Infinity;
    // Linear scan with an id tiebreak — the network is small and this is
    // reproducible, which a heap's internal ordering would not be.
    for (const id of unvisited) {
      const d = dist.get(id)!;
      if (d < best || (d === best && current !== null && id < current)) { best = d; current = id; }
    }
    if (current === null || best === Infinity) break;
    if (current === goalId) break;
    unvisited.delete(current);

    for (const edge of graph.adjacency.get(current) ?? []) {
      const next = otherEnd(edge, current);
      if (!unvisited.has(next)) continue;
      const candidate = best + edge.length;
      const known = dist.get(next)!;
      if (candidate < known || (candidate === known && current < (prev.get(next) ?? '￿'))) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }
  }

  if (!Number.isFinite(dist.get(goalId) ?? Infinity)) return null;
  const path: string[] = [goalId];
  let cursor = goalId;
  while (cursor !== startId) {
    const p = prev.get(cursor);
    if (p === undefined) return null;
    path.unshift(p);
    cursor = p;
  }
  return path;
}

/** The graph node nearest a point, by straight-line distance. Ties break on id. */
export function nearestNode(graph: PursuitGraph, point: { x: number; y: number }): GraphNode {
  let best: GraphNode | null = null;
  let bestD = Infinity;
  for (const node of graph.nodes.values()) {
    const d = Math.hypot(node.x - point.x, node.y - point.y);
    if (d < bestD || (d === bestD && best !== null && node.id < best.id)) { bestD = d; best = node; }
  }
  return best!;
}

/**
 * Reconcile an arbitrary point with the network.
 *
 * The smallest coherent model: land on the nearest node, and report honestly how
 * far short of the requested point that leaves the actor. A caller that wants
 * the last few units closes them with a terminal approach, which is a separate,
 * bounded, opt-in thing — see graphPursuerV2. No platform test is involved at
 * any stage.
 */
export function projectTarget(graph: PursuitGraph, target: { x: number; y: number }): TargetProjection {
  const node = nearestNode(graph, target);
  const residual = Math.hypot(node.x - target.x, node.y - target.y);
  return {
    kind: residual < 1e-9 ? 'NODE' : 'EDGE_POINT',
    node: node.id,
    point: { x: node.x, y: node.y },
    residual,
    requested: { x: target.x, y: target.y },
  };
}

/**
 * A node path becomes the legs the actor travels.
 *
 * Collinear runs collapse: A -> B -> C -> D at one level is ONE horizontal leg,
 * which is what makes a connector read as a single route rather than three
 * hops with two spurious turns in the middle.
 *
 * Offsets are assigned first, then endpoints are chained so consecutive legs
 * share an exact corner. Doing it the other way round leaves a sub-unit
 * diagonal at every junction, which is precisely the thing this engine must
 * never produce.
 */
export function legsForPath(
  graph: PursuitGraph,
  path: string[],
  start: { x: number; y: number },
  pickOffset: (bandMin: number, bandMax: number, axis: 'vertical' | 'horizontal') => number,
): RouteLeg[] {
  if (path.length < 2) return [];

  type Run = { axis: 'vertical' | 'horizontal'; nodes: string[]; bandMin: number; bandMax: number };
  const runs: Run[] = [];

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = graph.nodes.get(path[i])!;
    const b = graph.nodes.get(path[i + 1])!;
    const edge = (graph.adjacency.get(a.id) ?? []).find(
      (e) => otherEnd(e, a.id) === b.id,
    );
    if (!edge) continue;
    const last = runs[runs.length - 1];
    if (last && last.axis === edge.axis && sameLine(graph, last, edge, a)) {
      last.nodes.push(b.id);
    } else {
      runs.push({ axis: edge.axis, nodes: [a.id, b.id], bandMin: edge.bandMin, bandMax: edge.bandMax });
    }
  }

  // 1. offsets
  const offsets = runs.map((run) => pickOffset(run.bandMin, run.bandMax, run.axis));

  // The first leg cannot simply adopt its drawn offset: sliding sideways onto
  // the new lane while also travelling along the leg is a diagonal, measured at
  // exactly one diagonal frame per route change.
  //
  // Nor can it simply inherit the actor's current perpendicular, which was the
  // first fix and turned out worse in a different way: a route that is one
  // vertical leg never changes x, so a pursuer sent up and down the same trunk
  // rode a single line for ever — precisely the on-rails look the band exists
  // to avoid.
  //
  // So the offset changes at the intersection, as its own orthogonal ENTRY leg:
  // step across to the new lane first, then travel. Two orthogonal moves, no
  // diagonal, and a visibly different line on each pass.
  //
  // The entry leg is only safe where the perpendicular move itself is in clear
  // air — a horizontal step is safe inside a level band, a vertical step inside
  // a trunk band. Anywhere else (mid-climb, beside a card) the actor keeps the
  // perpendicular it has, which is always legal because it is already there.
  const firstPerp = runs[0].axis === 'vertical' ? start.x : start.y;
  const entrySafe = runs[0].axis === 'vertical'
    ? graph.levels.some((l) => start.y >= l.bandTop - 1e-6 && start.y <= l.bandBottom + 1e-6)
    : graph.trunks.some((t) => start.x >= t.bandLeft - 1e-6 && start.x <= t.bandRight + 1e-6);
  if (!entrySafe) {
    // Mid-climb, beside a card: keep the lane the actor is already on, clamped
    // back into the band if it has drifted outside it (which a terminal
    // approach can do — it leaves the network on purpose).
    offsets[0] = Math.max(runs[0].bandMin, Math.min(runs[0].bandMax, firstPerp));
  }

  // The entry leg is MANDATORY whenever the chosen lane is not the one the actor
  // is standing on, whatever the reason — a fresh draw, or a clamp back into the
  // band after leaving the network.
  //
  // Making it conditional was a real defect. When a route was re-issued while
  // the actor sat off-lane, the leg line and the actor disagreed, and finishing
  // that leg set BOTH coordinates at once to land on the corner: one frame that
  // moved x and y together, which is a diagonal however it is justified. The
  // perpendicular move is always its own orthogonal leg now, so there is
  // nothing left for a corner to silently correct.
  const wantsEntry = Math.abs(offsets[0] - firstPerp) > 1e-9;

  // 2. chain the corners
  const legs: RouteLeg[] = [];
  let cursor = { x: start.x, y: start.y };

  if (wantsEntry) {
    const to = runs[0].axis === 'vertical'
      ? { x: offsets[0], y: start.y }
      : { x: start.x, y: offsets[0] };
    legs.push({
      axis: runs[0].axis === 'vertical' ? 'horizontal' : 'vertical',
      direction: runs[0].axis === 'vertical'
        ? (to.x > start.x ? 'RIGHT' : 'LEFT')
        : (to.y < start.y ? 'UP' : 'DOWN'),
      from: { ...cursor }, to,
      length: Math.abs(runs[0].axis === 'vertical' ? to.x - start.x : to.y - start.y),
      // The entry step has no freedom of its own: it travels at the coordinate
      // the actor is already standing at.
      laneOffset: runs[0].axis === 'vertical' ? start.y : start.x,
      bandMin: runs[0].axis === 'vertical' ? start.y : start.x,
      bandMax: runs[0].axis === 'vertical' ? start.y : start.x,
      nodes: [],
    });
    cursor = to;
  }
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    const endNode = graph.nodes.get(run.nodes[run.nodes.length - 1])!;
    let to: { x: number; y: number };
    if (run.axis === 'vertical') {
      // Travel at this run's x; finish at the y the NEXT run wants, so the
      // corner is exact rather than nearly-exact.
      const nextOffset = runs[i + 1] ? offsets[i + 1] : endNode.y;
      to = { x: offsets[i], y: runs[i + 1]?.axis === 'horizontal' ? nextOffset : endNode.y };
      cursor = { x: offsets[i], y: cursor.y };
    } else {
      const nextOffset = runs[i + 1] ? offsets[i + 1] : endNode.x;
      to = { x: runs[i + 1]?.axis === 'vertical' ? nextOffset : endNode.x, y: offsets[i] };
      cursor = { x: cursor.x, y: offsets[i] };
    }
    const from = { x: cursor.x, y: cursor.y };
    const length = run.axis === 'vertical' ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x);
    if (length > 1e-9) {
      legs.push({
        axis: run.axis,
        direction: run.axis === 'vertical'
          ? (to.y < from.y ? 'UP' : 'DOWN')
          : (to.x > from.x ? 'RIGHT' : 'LEFT'),
        from, to, length,
        laneOffset: offsets[i],
        bandMin: run.bandMin, bandMax: run.bandMax,
        nodes: run.nodes.slice(),
      });
    }
    cursor = to;
  }
  return legs;
}

/** Two same-axis edges continue one another when they share a perpendicular band. */
function sameLine(graph: PursuitGraph, run: { bandMin: number; bandMax: number }, edge: GraphEdge, _at: GraphNode) {
  return Math.abs(run.bandMin - edge.bandMin) < 1e-9 && Math.abs(run.bandMax - edge.bandMax) < 1e-9;
}

/** The trunk order left to right, restricted to what the graph admitted. */
export function admittedTrunks(graph: PursuitGraph): TrunkId[] {
  return graph.trunks.map((t) => t.id);
}
