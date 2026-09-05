/**
 * The pursuit network — GRAPH_PURSUER_V2's movement space.
 *
 * The whole point of this engine is that legality is decided ONCE, here, from
 * static board geometry. Nothing downstream collides with a platform, because
 * nothing downstream is ever anywhere a platform is. The legacy engine's entire
 * physical-navigation apparatus — collision rects, corridor commitment, embedded
 * escape, axis blocking, the upward/downward asymmetry that produced F-01 — has
 * no counterpart in this file or anywhere after it.
 *
 * Topology: four vertical trunks (A exterior-left, B, C interior, D
 * exterior-right) crossed by one horizontal connector in every inter-row gap.
 * Intersections are nodes; edges are strictly vertical or horizontal. There is
 * no diagonal edge and no way to express one.
 *
 * "Four" is a target, not a promise. A trunk is admitted only if the actor can
 * travel it without its drawn body touching a drawn platform card, and at most
 * framings the exterior trunks cannot clear that bar — see `clearance` on the
 * built graph, and docs/GRAPH_CLEARANCE.md for the measured table. Building
 * three where four were asked for is the honest outcome; drawing the actor
 * through a card to keep the number is not.
 */

import type { GraphWorld } from '../../world/graphWorld';

export type TrunkId = 'A' | 'B' | 'C' | 'D';
export const TRUNK_ORDER: TrunkId[] = ['A', 'B', 'C', 'D'];

export interface Trunk {
  id: TrunkId;
  kind: 'exterior' | 'interior';
  /** Nominal centreline. */
  x: number;
  /** The band the actor's centre may occupy on this trunk, inclusive. */
  bandLeft: number;
  bandRight: number;
  width: number;
}

export interface Level {
  /** 0 is the lowest connector; index increases upward. */
  index: number;
  /** Nominal centreline of the horizontal connector. */
  y: number;
  bandTop: number;      // more negative — upper edge
  bandBottom: number;   // less negative — lower edge
  height: number;
  /** The inter-row gap this connector threads: between `row` and `row + 1`. */
  belowRow: number;
}

/**
 * A row-approach rail: the canonical horizontal lane a pursuer closes along to
 * reach a learner resting on that row.
 *
 * Its height is derived, never taken from the learner:
 *
 *     railY = platformTop − graphActorRadius − MIN_VISUAL_CLEARANCE
 *
 * so the clearance below is exactly MIN_VISUAL_CLEARANCE by construction, for
 * every row, at every framing. The actor does not need the learner's exact Y —
 * only to enter capture distance, and at 90% the rail sits 0.25 units above the
 * learner's centre against a capture distance of 28.8.
 *
 * Every generated row gets one by the same rule. There is no hand-authored set
 * for the opening rows: row 37 works for the reason row 4 works.
 */
export interface Rail {
  row: number;
  y: number;
  /** Air between the drawn body and the card below. Equals MIN_VISUAL_CLEARANCE. */
  clearanceBelow: number;
  /** Air between the drawn body and the card of the row above. */
  clearanceAbove: number;
  admitted: boolean;
}

export interface GraphNode {
  id: string;
  trunk: TrunkId;
  level: number;
  x: number;
  y: number;
}

export type EdgeAxis = 'vertical' | 'horizontal';

export interface GraphEdge {
  id: string;
  axis: EdgeAxis;
  from: string;
  to: string;
  length: number;
  /**
   * The perpendicular band this edge may be travelled within. A vertical edge
   * may sit anywhere in its trunk's x-band; a horizontal edge anywhere in its
   * level's y-band. This is what keeps passes off a single pixel line without
   * ever making a leg diagonal.
   */
  bandMin: number;
  bandMax: number;
}

export interface TrunkClearance {
  id: TrunkId;
  kind: 'exterior' | 'interior';
  admitted: boolean;
  /** Usable band width for the actor's centre. Negative means it does not fit. */
  width: number;
  /** How far short of the minimum this trunk is; 0 when admitted. */
  shortfall: number;
  reason: string;
}

export interface GraphClearance {
  percent: number;
  minLaneWidth: number;
  /** The body radius these widths were computed for. */
  actorRadius: number;
  learnerRadius: number;
  trunks: TrunkClearance[];
  admittedCount: number;
  levelHeight: number;
  /** True when all four topological channels are visually credible. */
  fourChannels: boolean;
}

export interface PursuitGraph {
  version: string;
  world: GraphWorld;
  trunks: Trunk[];
  levels: Level[];
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  /** node id -> edges touching it. */
  adjacency: Map<string, GraphEdge[]>;
  /** One row-approach rail per learner row. */
  rails: Rail[];
  /** How many learner rows this graph was built for. */
  rowCount: number;
  clearance: GraphClearance;
  /** The body this network was built for. Not necessarily the learner's. */
  actorRadius: number;
}

export const GRAPH_VERSION = 'graph-v2/1';

/**
 * A lane narrower than this is not a channel, it is a coincidence. Six units is
 * the board's own guaranteed interior corridor, so it is the width the layout
 * itself treats as the minimum passable gap.
 */
export const MIN_LANE_WIDTH = 6;

/**
 * The minimum air the drawn body must keep from a drawn card.
 *
 * The same six units the lane gate uses, applied vertically. The row-approach
 * rail is placed FROM this rather than at the learner's own resting height:
 * riding the learner's Y left only 5.75 units of clearance at 90%, which is
 * under the standard the rest of the graph is held to.
 */
export const MIN_VISUAL_CLEARANCE = 6;

const nodeId = (trunk: TrunkId, level: number) => `${trunk}${level}`;

/**
 * @param actorRadius the GRAPH ACTOR's body radius, which need not be the
 *   learner's. LAB 02A sized the pursuer like the learner and found the
 *   exterior trunks uninhabitable at 90%; that was a fact about the body, not
 *   the board, and giving the graph actor its own radius is what recovers all
 *   four channels. Defaults to the learner's radius so every LAB 02A result
 *   reproduces unchanged.
 */
/**
 * @param groundLevels connectors BELOW row 0.
 *
 *   The board's cards start at row 0 and climb, so the graph built from
 *   inter-row gaps alone has nothing beneath the learner's opening position —
 *   a pursuer spawned on its lowest connector starts ABOVE the learner and is
 *   climbed into. Production spawns its pursuer two rows below and lets it
 *   climb, and these levels are what make that expressible. The space below
 *   row 0 has no cards in it, so the bands are clear by inspection.
 *
 *   Zero by default: every LAB 02A scenario is built without them.
 */
export function buildPursuitGraph(
  world: GraphWorld,
  rowCount: number,
  actorRadius: number = world.playerRadius,
  groundLevels: number = 0,
): PursuitGraph {
  const r = actorRadius;
  const halfCard = world.platformWidth / 2;
  // Visual clearance: the drawn body must not touch the drawn card. Padding is
  // a routing concept for the learner and is deliberately not used here — the
  // gate is what a person sees.
  const forbidden = world.columns.map((cx) => [cx - halfCard - r, cx + halfCard + r] as const);
  const worldLeft = r;
  const worldRight = world.logicalWidth - r;

  const candidates: Array<{ id: TrunkId; kind: 'exterior' | 'interior'; left: number; right: number }> = [
    { id: 'A', kind: 'exterior', left: worldLeft, right: forbidden[0][0] },
    { id: 'B', kind: 'interior', left: forbidden[0][1], right: forbidden[1][0] },
    { id: 'C', kind: 'interior', left: forbidden[1][1], right: forbidden[2][0] },
    { id: 'D', kind: 'exterior', left: forbidden[2][1], right: worldRight },
  ];

  const trunkClearance: TrunkClearance[] = [];
  const trunks: Trunk[] = [];
  for (const c of candidates) {
    const width = c.right - c.left;
    const admitted = width >= MIN_LANE_WIDTH;
    trunkClearance.push({
      id: c.id,
      kind: c.kind,
      admitted,
      width,
      shortfall: admitted ? 0 : MIN_LANE_WIDTH - width,
      reason: admitted
        ? `clear band ${width.toFixed(1)}u for the actor centre`
        : width <= 0
          ? `no band at all: the actor (r=${r.toFixed(1)}) cannot stand between the card edge and the world edge`
          : `band is only ${width.toFixed(1)}u, under the ${MIN_LANE_WIDTH}u minimum passable gap`,
    });
    if (admitted) {
      trunks.push({
        id: c.id, kind: c.kind,
        x: (c.left + c.right) / 2,
        bandLeft: c.left, bandRight: c.right,
        width,
      });
    }
  }

  // Horizontal connectors live in the gap between consecutive rows: below the
  // card above, above the card below, with a full radius of air on each side.
  const levels: Level[] = [];
  // Ground connectors first, so `levels` stays ordered bottom to top.
  // Indices are negative, which keeps every existing level index unchanged.
  const cardBottom = world.platformHeight + r;
  const connectorPitch = world.rowGap;
  for (let i = groundLevels; i >= 1; i -= 1) {
    const bandTop = cardBottom + (i - 1) * connectorPitch;
    const bandBottom = bandTop + Math.max(MIN_LANE_WIDTH, connectorPitch - world.platformHeight - 2 * r);
    levels.push({
      index: -i,
      y: (bandTop + bandBottom) / 2,
      bandTop, bandBottom,
      height: bandBottom - bandTop,
      belowRow: -i,
    });
  }
  for (let belowRow = 0; belowRow < rowCount - 1; belowRow += 1) {
    const cardBelowTop = -belowRow * world.rowGap;                       // row `belowRow` card top
    const cardAboveBottom = -(belowRow + 1) * world.rowGap + world.platformHeight;
    const bandBottom = cardBelowTop - r;
    const bandTop = cardAboveBottom + r;
    if (bandBottom - bandTop < MIN_LANE_WIDTH) continue;
    levels.push({
      index: belowRow,
      y: (bandTop + bandBottom) / 2,
      bandTop, bandBottom,
      height: bandBottom - bandTop,
      belowRow,
    });
  }

  // Row-approach rails: one per learner row, derived identically for all of
  // them so a row generated at runtime is no different from row 0.
  const rails: Rail[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const cardTop = -row * world.rowGap;
    const y = cardTop - r - MIN_VISUAL_CLEARANCE;
    const cardAboveBottom = -(row + 1) * world.rowGap + world.platformHeight;
    const clearanceAbove = (y - cardAboveBottom) - r;
    rails.push({
      row, y,
      clearanceBelow: MIN_VISUAL_CLEARANCE,
      clearanceAbove,
      admitted: clearanceAbove >= MIN_VISUAL_CLEARANCE,
    });
  }

  const nodes = new Map<string, GraphNode>();
  for (const trunk of trunks) {
    for (const level of levels) {
      const id = nodeId(trunk.id, level.index);
      nodes.set(id, { id, trunk: trunk.id, level: level.index, x: trunk.x, y: level.y });
    }
  }

  const edges: GraphEdge[] = [];
  // Vertical: same trunk, adjacent levels. The band is the trunk's x-band.
  for (const trunk of trunks) {
    for (let i = 0; i < levels.length - 1; i += 1) {
      const a = nodes.get(nodeId(trunk.id, levels[i].index))!;
      const b = nodes.get(nodeId(trunk.id, levels[i + 1].index))!;
      edges.push({
        id: `V:${a.id}-${b.id}`, axis: 'vertical',
        from: a.id, to: b.id, length: Math.abs(b.y - a.y),
        bandMin: trunk.bandLeft, bandMax: trunk.bandRight,
      });
    }
  }
  // Horizontal: same level, adjacent admitted trunks. The band is the level's
  // y-band. Only adjacent pairs, so A->D is three edges and never one hop.
  for (const level of levels) {
    for (let i = 0; i < trunks.length - 1; i += 1) {
      const a = nodes.get(nodeId(trunks[i].id, level.index))!;
      const b = nodes.get(nodeId(trunks[i + 1].id, level.index))!;
      edges.push({
        id: `H:${a.id}-${b.id}`, axis: 'horizontal',
        from: a.id, to: b.id, length: Math.abs(b.x - a.x),
        bandMin: level.bandTop, bandMax: level.bandBottom,
      });
    }
  }

  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from)!.push(edge);
    adjacency.get(edge.to)!.push(edge);
  }

  return {
    version: GRAPH_VERSION,
    world,
    trunks,
    levels,
    nodes,
    edges,
    adjacency,
    rails,
    rowCount,
    actorRadius: r,
    clearance: {
      percent: world.percent,
      minLaneWidth: MIN_LANE_WIDTH,
      actorRadius: r,
      learnerRadius: world.playerRadius,
      trunks: trunkClearance,
      admittedCount: trunks.length,
      levelHeight: levels.length ? levels[0].height : 0,
      fourChannels: trunks.length === 4,
    },
  };
}

/** The other end of an edge, from one of its ends. */
export function otherEnd(edge: GraphEdge, from: string): string {
  return edge.from === from ? edge.to : edge.from;
}
