/**
 * GRAPH_PURSUER_V2 — an independent movement chassis.
 *
 * It imports nothing from the legacy pursuer. No updatePursuer, no
 * SEARCH/ALERT/CHASE, no searchDescent, no corridor commitment, no
 * computeRectEscape, no pathIsClear, no legacy cadence. `tests/11-independence`
 * asserts that by reading this file's transitive import graph, so the claim is
 * checked rather than promised.
 *
 * The bet: platforms are avoided by graph design, not by runtime collision.
 * There is no platform test anywhere in this file — not a rect, not a probe,
 * not a band check. If the actor is on the network it is legal, and the network
 * was built legal.
 *
 * There is no Brain here. Targets are handed in from outside, by a fixture or
 * later by a pursuit Brain. LAB 02A proves the chassis; the hunting logic is a
 * separate phase and deliberately absent.
 */

import type { GraphWorld } from '../runtime/graphWorld';
import {
  buildPursuitGraph, MIN_VISUAL_CLEARANCE,
  type PursuitGraph, type TrunkId,
} from './pursuitGraph';
import {
  legsForPath, nearestNode, projectTarget, shortestPath,
  type LegDirection, type Route, type RouteLeg, type TargetProjection,
} from './graphRouting';
import {
  advanceGraphCadence, createGraphCadence, drawInRange,
  DEFAULT_GRAPH_CADENCE, type GraphCadenceConfig, type GraphCadenceState,
} from './graphCadence';
import { PlasmaWake } from './plasmaWake';

export interface GraphPursuerConfig {
  cadence: GraphCadenceConfig;
  /** Lane-band draw seed, kept separate from the cadence stream. */
  laneSeed: number;
  /**
   * Whether the actor may close the last units onto a target using the SAFE
   * CAPTURE RAIL.
   *
   * This replaces the generic off-network terminal approach removed in 02A-I.
   * The rail is not an escape hatch from the graph — it is graph topology:
   *
   *     vertical along the current trunk band
   *       -> the row-approach rail (the connector band at the target's level)
   *       -> horizontal close along that rail
   *       -> Simulation adjudicates capture
   *
   * Both legs are inside bands the graph already proved clear at construction,
   * so no platform test runs, no card is penetrated, and no motion is diagonal.
   * A target whose height is not inside a connector band is simply refused.
   */
  captureRail: boolean;
  /**
   * The graph actor's own body radius.
   *
   * Separate from the learner's on purpose: the exterior channels at 90% only
   * exist for a slightly smaller body. `null` means "size like the learner",
   * which is what every LAB 02A scenario does.
   */
  actorRadius: number | null;
  /** Connectors below row 0, so the pursuer can start beneath the learner. */
  groundLevels: number;
}

/**
 * How much of an edge's clear band a lane offset may use.
 *
 * Enough that two passes along the same edge are visibly different lines,
 * little enough that the route still reads as one corridor.
 */
export const LANE_BAND_FRACTION = 0.55;

/** How far a target must move before it counts as a different target. */
export const TARGET_EPSILON = 1;

export const DEFAULT_GRAPH_PURSUER_CONFIG: GraphPursuerConfig = {
  cadence: DEFAULT_GRAPH_CADENCE,
  laneSeed: 0x51de,
  captureRail: false,
  actorRadius: null,
  groundLevels: 0,
};

export interface GraphEvidence {
  engine: 'GRAPH_V2';
  graphVersion: string;
  /** Nearest node to the actor right now. */
  node: string;
  /** The leg being travelled, as `from->to` node ids, or null when idle. */
  edge: string | null;
  routeNodes: string[];
  routeIndex: number;
  targetProjection: TargetProjection | null;
  legDirection: LegDirection | null;
  laneOffset: number | null;
  /**
   * A stable identity for the leg being travelled, bumped on every change.
   *
   * `edge` cannot serve: legs synthesised to close on a node or a target carry
   * no node ids, so two consecutive different legs both report `edge: null` and
   * are indistinguishable in the log.
   */
  legId: number;
  cadenceState: 'MOVING' | 'HESITATING';
  turnEvent: boolean;
  turnCount: number;
  trailArcLength: number;
  arrived: boolean;
  /** True while the actor is closing on the target along the capture rail. */
  onCaptureRail: boolean;
  /** Never anything but false. Present so the log can prove it. */
  platformCollisionUsed: false;
}

export class GraphPursuerV2 {
  readonly id = 'GRAPH_V2';
  readonly label = 'GRAPH PURSUER V2';
  /**
   * Mutable, because the world grows. Replaced only by `ensureLevelsThrough`,
   * which proves the old topology came through unchanged before swapping it in.
   */
  private currentGraph: PursuitGraph;

  private x: number;
  private y: number;
  /** The drawn and routed body. Clearance was computed for exactly this. */
  readonly radius: number;
  private cadence: GraphCadenceState;
  private laneState: number;
  private wake: PlasmaWake;

  private route: Route | null = null;
  private legIndex = 0;
  private target: { x: number; y: number } | null = null;
  private direction: LegDirection | null = null;
  private turnCount = 0;
  private turnedThisFrame = false;
  private arrivedFlag = false;
  private approach: { legs: RouteLeg[]; index: number } | null = null;
  /** The leg the last travelled frame was spent on. Held through hesitations. */
  private legThisFrame: RouteLeg | null = null;
  private legId = 0;
  private extensionCount = 0;
  private lastExtensionRow: number | null = null;

  constructor(
    private world: GraphWorld,
    rowCount: number,
    start: { x: number; y: number } | { trunk: TrunkId; level: number },
    private config: GraphPursuerConfig = DEFAULT_GRAPH_PURSUER_CONFIG,
  ) {
    this.currentGraph = buildPursuitGraph(
      world, rowCount, config.actorRadius ?? world.playerRadius, config.groundLevels,
    );
    if (this.graph.trunks.length === 0 || this.graph.levels.length === 0) {
      throw new Error(
        `no pursuit network at ${world.percent}% framing: `
        + `${this.graph.trunks.length} trunks, ${this.graph.levels.length} levels`,
      );
    }
    const spawn = 'trunk' in start
      ? this.graph.nodes.get(`${start.trunk}${start.level}`)
      : nearestNode(this.graph, start);
    if (!spawn) throw new Error(`no such graph node: ${JSON.stringify(start)}`);
    this.x = spawn.x;
    this.y = spawn.y;
    this.cadence = createGraphCadence(config.cadence);
    this.laneState = config.laneSeed | 0;
    // Two pursuer diameters of path, per the wake spec — of the GRAPH actor's
    // own diameter, since that is the body the wake trails.
    this.radius = config.actorRadius ?? world.playerRadius;
    void MIN_VISUAL_CLEARANCE;
    this.wake = new PlasmaWake(4 * this.radius);
    this.wake.reset({ x: this.x, y: this.y });
  }

  get graph(): PursuitGraph { return this.currentGraph; }
  get extensions() { return this.extensionCount; }
  get lastExtensionAtRow() { return this.lastExtensionRow; }

  get position() { return { x: this.x, y: this.y }; }
  get wakePath() { return this.wake.path; }
  get currentRoute() { return this.route; }
  get turns() { return this.turnCount; }

  /**
   * GRAPH EXTENSION — the world grows, and the graph grows with it.
   *
   * Circuit Climb is an ongoing upward climb, so a graph built to a fixed
   * ceiling is a defect waiting for a patient player: a real session reached
   * row 15 while the graph topped out at connector 14, and the pursuer sat 180
   * units away with nothing wrong with it. Raising 16 to 32 only moves that.
   *
   * The topology is a pure function of the row index, so extending is a rebuild
   * at a larger `rowCount` — and every trunk, level, node, coordinate and band
   * that existed before comes back identical. That is asserted here rather than
   * assumed: if anything moved, the extension is refused and the old graph is
   * kept, because a silently shifted node would invalidate a route in flight.
   *
   * Nothing else is touched. Position, cadence, wake, the in-progress route and
   * the Oracle's incumbent all survive, because none of them live in the graph.
   *
   * Growth is a CHASSIS responsibility. No Brain is involved, and the eventual
   * Brain should simply find legal topology already present above the learner.
   */
  ensureLevelsThrough(rowCount: number): { extended: boolean; from: number; to: number } {
    const from = this.currentGraph.rowCount;
    if (rowCount <= from) return { extended: false, from, to: from };

    const next = buildPursuitGraph(
      this.world, rowCount,
      this.config.actorRadius ?? this.world.playerRadius,
      this.config.groundLevels,
    );

    const drift = compareOldTopology(this.currentGraph, next);
    if (drift.length) {
      // Refused. Keeping a graph that is too short is recoverable; swapping in
      // one whose old nodes have moved is not.
      throw new Error(`graph extension would move existing topology: ${drift.slice(0, 3).join('; ')}`);
    }

    this.currentGraph = next;
    this.extensionCount += 1;
    this.lastExtensionRow = rowCount;
    return { extended: true, from, to: rowCount };
  }

  /**
   * Ask for a new destination.
   *
   * Routing happens once, here — not per frame. The actor then simply travels
   * the legs it was given, which is why a hesitation cannot lose the route:
   * there is nothing to recompute and nothing to re-decide.
   */
  setTarget(target: { x: number; y: number }): Route | null {
    // Idempotent for an unchanged goal.
    //
    // A driver that re-states the same target on a timer must not cost the
    // actor its progress. Without this, each restatement recomputed the route
    // from the NEAREST NODE — sending a pursuer that was two thirds of the way
    // through a terminal approach back to the node it started from, then
    // forward again. Measured as a permanent saw between 67 and 95 units, never
    // closing. This is the engine half of "no route replacement when the goal
    // has not materially changed".
    if (
      this.target
      && Math.abs(this.target.x - target.x) < TARGET_EPSILON
      && Math.abs(this.target.y - target.y) < TARGET_EPSILON
      && !this.arrivedFlag
      && (this.route !== null || this.approach !== null)
    ) {
      return this.route;
    }

    this.target = { x: target.x, y: target.y };
    this.arrivedFlag = false;
    this.approach = null;

    const from = nearestNode(this.graph, { x: this.x, y: this.y });
    const projection = projectTarget(this.graph, target);
    const path = shortestPath(this.graph, from.id, projection.node);
    if (!path) { this.route = null; this.legIndex = 0; return null; }

    const legs = legsForPath(this.graph, path, { x: this.x, y: this.y }, (min, max) => {
      // A SMALL band, per the brief — a fraction of the clear space, centred.
      // Drawing across the whole band is legal (it is all clear air) but a
      // horizontal connector 68 units tall then puts successive passes two
      // thirds of a row apart, which reads as sloppiness rather than as life.
      const centre = (min + max) / 2;
      const reach = (max - min) / 2 * LANE_BAND_FRACTION;
      const draw = drawInRange(this.laneState, centre - reach, centre + reach);
      this.laneState = draw.state;
      return draw.value;
    });

    this.route = {
      nodes: path,
      legs,
      projection,
      totalLength: legs.reduce((sum, l) => sum + l.length, 0),
    };
    this.legIndex = 0;
    if (legs.length === 0) {
      // The route's start node IS its goal node — but that says nothing about
      // where the ACTOR is. `nearestNode` rounds the actor to a node, so a
      // pursuer halfway along a connector is told it has arrived while it is
      // still 55 units from the node and 150 from the learner. Measured: it
      // stopped dead and never moved again.
      //
      // So close the gap to the node explicitly, as two orthogonal legs.
      const goal = this.graph.nodes.get(projection.node)!;
      const toNode = this.legsToPoint({ x: goal.x, y: goal.y });
      if (toNode.length) {
        this.route.legs = toNode;
        this.route.totalLength = toNode.reduce((sum, l) => sum + l.length, 0);
      } else {
        // Genuinely standing on the node.
        this.beginCaptureRail();
        if (!this.approach) this.arrivedFlag = true;
      }
    }
    return this.route;
  }

  /**
   * One simulation frame.
   *
   * The whole method: get a budget from the cadence, spend it along the legs.
   * There is no obstacle reasoning because there are no obstacles reachable.
   */
  step(dtMs: number): GraphEvidence {
    this.turnedThisFrame = false;
    // `legThisFrame` deliberately PERSISTS across frames that spend no distance.
    // A hesitation holds its heading, so it must hold the matching lane offset
    // too; clearing it made a paused frame report the next leg's offset beside
    // the current leg's direction.
    const beat = advanceGraphCadence(this.cadence, dtMs, this.config.cadence);
    this.cadence = beat.state;

    let budget = beat.budget;
    let guard = 0;
    while (budget > 1e-9 && guard < 32) {
      guard += 1;
      const leg = this.activeLeg();
      if (!leg) break;

      // The leg this frame's travel is actually spent on. Evidence must report
      // THIS one: reading the active leg afterwards can report the next leg's
      // lane offset beside the previous leg's direction, which is a mismatched
      // pair in the log on every transition frame.
      if (this.legThisFrame !== leg) { this.legThisFrame = leg; this.legId += 1; }
      this.faceLeg(leg.direction);

      const remaining = leg.axis === 'vertical'
        ? Math.abs(leg.to.y - this.y)
        : Math.abs(leg.to.x - this.x);

      if (remaining <= budget + 1e-9) {
        // Land exactly on the corner, then STOP for this frame.
        //
        // Two reasons. Landing exactly matters because approximate corners
        // accumulate into a drift that eventually reads as a diagonal. And
        // surrendering the leftover budget matters because spending it on the
        // next leg would move both axes within one frame — geometrically two
        // orthogonal moves, but a single frame-to-frame delta that is diagonal,
        // which is exactly what a viewer sees and what the invariant forbids.
        // The cost is at most one frame's travel per turn, around three units.
        this.x = leg.to.x;
        this.y = leg.to.y;
        this.advanceLeg();
        this.wake.push({ x: this.x, y: this.y });
        break;
      } else {
        const sign = leg.axis === 'vertical'
          ? Math.sign(leg.to.y - this.y)
          : Math.sign(leg.to.x - this.x);
        if (leg.axis === 'vertical') this.y += sign * budget;
        else this.x += sign * budget;
        budget = 0;
      }
      this.wake.push({ x: this.x, y: this.y });
    }
    if (beat.budget > 0) this.wake.push({ x: this.x, y: this.y });

    return this.evidence(beat.phase);
  }

  /**
   * Two orthogonal legs from where the actor is to an arbitrary point.
   *
   * Order matters and is decided by which band the actor currently occupies:
   * travel ALONG the band you are in first, then across into the target's. An
   * actor on a horizontal connector moves sideways then up; one on a trunk
   * moves up then sideways. Either way both legs stay in clear air, and no
   * platform test is consulted to work that out.
   */
  private legsToPoint(to: { x: number; y: number }): RouteLeg[] {
    const dx = to.x - this.x;
    const dy = to.y - this.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return [];

    const onLevel = this.graph.levels.some((l) => this.y >= l.bandTop - 1e-6 && this.y <= l.bandBottom + 1e-6);
    const horizontalFirst = onLevel;
    const legs: RouteLeg[] = [];
    let cursor = { x: this.x, y: this.y };

    const pushHorizontal = () => {
      if (Math.abs(to.x - cursor.x) < 1e-9) return;
      const next = { x: to.x, y: cursor.y };
      legs.push({
        axis: 'horizontal', direction: to.x > cursor.x ? 'RIGHT' : 'LEFT',
        from: { ...cursor }, to: next, length: Math.abs(to.x - cursor.x),
        laneOffset: cursor.y, bandMin: cursor.y, bandMax: cursor.y, nodes: [],
      });
      cursor = next;
    };
    const pushVertical = () => {
      if (Math.abs(to.y - cursor.y) < 1e-9) return;
      const next = { x: cursor.x, y: to.y };
      legs.push({
        axis: 'vertical', direction: to.y < cursor.y ? 'UP' : 'DOWN',
        from: { ...cursor }, to: next, length: Math.abs(to.y - cursor.y),
        laneOffset: cursor.x, bandMin: cursor.x, bandMax: cursor.x, nodes: [],
      });
      cursor = next;
    };

    if (horizontalFirst) { pushHorizontal(); pushVertical(); }
    else { pushVertical(); pushHorizontal(); }
    return legs;
  }

  private activeLeg(): RouteLeg | null {
    if (this.approach) return this.approach.legs[this.approach.index] ?? null;
    if (!this.route) return null;
    return this.route.legs[this.legIndex] ?? null;
  }

  private advanceLeg() {
    if (this.approach) {
      this.approach.index += 1;
      if (this.approach.index >= this.approach.legs.length) {
        this.approach = null;
        this.arrivedFlag = true;
      }
      return;
    }
    this.legIndex += 1;
    if (this.route && this.legIndex >= this.route.legs.length) {
      this.beginCaptureRail();
      if (!this.approach) this.arrivedFlag = true;
    }
  }

  /**
   * The bounded off-network close, when it is enabled.
   *
   * Two orthogonal legs, horizontal then vertical, so the movement language is
   * unchanged. No platform test is consulted to build it — the cap is a plain
   * distance limit, not a clearance calculation.
   */
  /**
   * THE SAFE CAPTURE RAIL.
   *
   * The generic off-network terminal approach this replaces was capped by a
   * plain distance limit and could put the body anywhere within it. The rail
   * cannot: it only ever travels two bands the graph has already proved clear.
   *
   *   1. VERTICAL, inside the trunk band the actor is standing in. A trunk
   *      band's x-range is clear of every card at EVERY height, by
   *      construction, so a vertical move anywhere along it is legal.
   *   2. HORIZONTAL, at the target's own height, inside a connector band. A
   *      connector band's y-range is clear across the FULL board width, by
   *      construction, so a horizontal move anywhere along it is legal.
   *
   * The learner's resting height falls inside its own row's connector band at
   * every row — at 90% the learner rests 31.8 units above the card top and the
   * actor needs 26.05, a 5.75-unit margin — which is what makes the rail reach
   * a learner standing on a platform without ever entering the card.
   *
   * A target whose height is NOT inside a connector band is refused outright.
   * No platform test is consulted at any point: the bands are structure, not
   * collision.
   */
  private beginCaptureRail() {
    if (!this.config.captureRail || !this.target) return;
    if (Math.hypot(this.target.x - this.x, this.target.y - this.y) < 1e-9) return;

    // The CANONICAL row-approach rail for the row the target is on — derived
    // from the card, never from the learner. Riding the learner's own Y left
    // 5.75 units of clearance at 90%; the rail is placed at
    // platformTop − actorRadius − MIN_VISUAL_CLEARANCE, so the clearance is
    // exactly 6.00 for every row the world will ever generate.
    let rail = null as { row: number; y: number } | null;
    let nearest = Infinity;
    for (const candidate of this.graph.rails) {
      if (!candidate.admitted) continue;
      const gap = Math.abs(candidate.y - this.target.y);
      if (gap < nearest) { nearest = gap; rail = candidate; }
    }
    // Only rail to the row the target is actually on.
    if (!rail || nearest > this.world.rowGap / 2) return;

    // The rail must also sit in clear air laterally, which the connector band
    // for that row is what guarantees.
    const band = this.graph.levels.find(
      (l) => rail!.y >= l.bandTop - 1e-6 && rail!.y <= l.bandBottom + 1e-6,
    );
    if (!band) return;

    // And the vertical leg must run inside a trunk band the actor occupies.
    const trunk = this.graph.trunks.find(
      (t) => this.x >= t.bandLeft - 1e-6 && this.x <= t.bandRight + 1e-6,
    );
    if (!trunk) return;

    const legs: RouteLeg[] = [];
    let cursor = { x: this.x, y: this.y };
    if (Math.abs(rail.y - cursor.y) > 1e-9) {
      const to = { x: cursor.x, y: rail.y };
      legs.push({
        axis: 'vertical', direction: to.y < cursor.y ? 'UP' : 'DOWN',
        from: { ...cursor }, to, length: Math.abs(to.y - cursor.y),
        laneOffset: cursor.x, bandMin: trunk.bandLeft, bandMax: trunk.bandRight, nodes: [],
      });
      cursor = to;
    }
    if (Math.abs(this.target.x - cursor.x) > 1e-9) {
      const to = { x: this.target.x, y: cursor.y };
      legs.push({
        axis: 'horizontal', direction: to.x > cursor.x ? 'RIGHT' : 'LEFT',
        from: { ...cursor }, to, length: Math.abs(to.x - cursor.x),
        laneOffset: cursor.y, bandMin: band.bandTop, bandMax: band.bandBottom, nodes: [],
      });
    }
    if (legs.length) this.approach = { legs, index: 0 };
  }

  /** One event per real change of heading — never repeated along a leg. */
  private faceLeg(direction: LegDirection) {
    if (this.direction === direction) return;
    if (this.direction !== null) { this.turnCount += 1; this.turnedThisFrame = true; }
    this.direction = direction;
  }

  private evidence(phase: 'MOVING' | 'HESITATING'): GraphEvidence {
    const leg = this.legThisFrame ?? this.activeLeg();
    const here = nearestNode(this.graph, { x: this.x, y: this.y });
    return {
      engine: 'GRAPH_V2',
      graphVersion: this.graph.version,
      node: here.id,
      edge: leg && leg.nodes.length >= 2 ? `${leg.nodes[0]}->${leg.nodes[leg.nodes.length - 1]}` : null,
      routeNodes: this.route ? this.route.nodes.slice() : [],
      routeIndex: this.approach ? -1 : this.legIndex,
      targetProjection: this.route ? this.route.projection : null,
      legDirection: this.direction,
      laneOffset: leg ? leg.laneOffset : null,
      legId: this.legId,
      cadenceState: phase,
      turnEvent: this.turnedThisFrame,
      turnCount: this.turnCount,
      trailArcLength: this.wake.arcLength,
      arrived: this.arrivedFlag,
      onCaptureRail: this.approach !== null,
      platformCollisionUsed: false,
    };
  }
}


/**
 * Field-by-field comparison of the topology an extension must not disturb.
 *
 * Returns a list of everything that moved. Empty means the old graph is present
 * in the new one exactly — same trunks, same levels, same nodes, same
 * coordinates, same bands — and an in-flight route stays valid across the swap.
 */
function compareOldTopology(before: PursuitGraph, after: PursuitGraph): string[] {
  const drift: string[] = [];
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

  if (after.trunks.length !== before.trunks.length) drift.push('trunk count changed');
  before.trunks.forEach((t, i) => {
    const n = after.trunks[i];
    if (!n || n.id !== t.id || !same(n.x, t.x) || !same(n.bandLeft, t.bandLeft) || !same(n.bandRight, t.bandRight)) {
      drift.push(`trunk ${t.id} moved`);
    }
  });

  for (const level of before.levels) {
    const n = after.levels.find((l) => l.index === level.index);
    if (!n || !same(n.y, level.y) || !same(n.bandTop, level.bandTop) || !same(n.bandBottom, level.bandBottom)) {
      drift.push(`level ${level.index} moved`);
    }
  }

  for (const [id, node] of before.nodes) {
    const n = after.nodes.get(id);
    if (!n || !same(n.x, node.x) || !same(n.y, node.y) || n.trunk !== node.trunk || n.level !== node.level) {
      drift.push(`node ${id} moved`);
    }
  }

  for (const rail of before.rails) {
    const n = after.rails.find((r) => r.row === rail.row);
    if (!n || !same(n.y, rail.y) || n.admitted !== rail.admitted) drift.push(`rail ${rail.row} moved`);
  }

  return drift;
}
