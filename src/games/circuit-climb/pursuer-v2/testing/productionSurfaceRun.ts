/**
 * PRODUCTION-SURFACE REPRODUCTION HARNESS — 04B-R1.
 *
 * The human tester reported that the pursuer "gets lost" and does not recover.
 * The 04A closed-loop harness could not have shown that: it moved the learner
 * in straight lines at machine speed, on a board that never grew.
 *
 * This runs the real thing, headlessly and deterministically:
 *
 *   REAL production geometry     `productionWorld` -> live `circuitClimbGeometry`
 *   REAL learner traversal       production's own `buildSteppedRoute`, walked
 *                                at production's `routeSpeed`
 *   REAL Graph V2 + Brain        through `GraphPursuerController`, the same
 *                                object the runtime drives
 *   REAL graph extension         rows are generated ahead as the learner climbs
 *
 * It is NOT the Lab HumanSandbox and shares no code with it.
 *
 * The learner's route is the actual production route: a stepped, right-angled
 * circuit with the same turn count, corridor choice and crossing offsets the
 * game draws. Human pacing is modelled explicitly — a person reads a problem
 * for several seconds before committing — because pacing turned out to be the
 * difference between "keeps up" and "lost".
 */

import {
  buildSteppedRoute,
  landingPointFor,
  collectActivePlatforms,
  destinationCorridors,
  type LearnerRoutingWorld,
  type RoutePoint,
} from '../../runtime/circuitClimbLearnerRouting';
import { GraphPursuerController, type LearnerPhysicalState } from '../runtime/graphPursuerController';
import { productionGraphWorldAt, type GraphWorld } from './productionWorld';

/** Production's own learner speed, in logical units per millisecond. */
export const PRODUCTION_ROUTE_SPEED = 0.62;

/** How far ahead of the learner production generates rows (`ensureRows`). */
const ROWS_AHEAD = 6;

export interface SurfaceRunOptions {
  framingPercent?: number;
  /** Milliseconds per simulated frame. 16.7 = 60Hz; 6.94 = 144Hz. */
  dtMs?: number;
  /** Destination column per climb, 0=LEFT 1=CENTRE 2=RIGHT. */
  climbColumns: number[];
  /** Milliseconds the learner spends reading before each selection. */
  thinkMs?: number;
  /** Milliseconds the learner stands still at the end, doing nothing. */
  stationaryMs?: number;
  /** Spawn override, for comparing spawn semantics. */
  spawn?: 'integration' | 'authority';
}

/** One frame of the strategic trace the 04B-R1 brief asks for. */
export interface SurfaceTraceRow {
  tMs: number;
  frame: number;
  pursuerX: number;
  pursuerY: number;
  /** DIAGNOSTIC OBSERVER ONLY. Never reaches the Brain. */
  learnerX: number;
  learnerY: number;
  learnerRow: number;
  directSense: boolean;
  mode: string;
  commitment: string | null;
  commitmentEndReason: string | null;
  /** The Brain's own frozen last sighting, if it has one. */
  lastSighting: string | null;
  /** Newest remembered trail lead and whether it is still unconsumed. */
  newestLead: string | null;
  newestLeadUnconsumed: boolean;
  consumedWatermarks: number;
  searchAnchor: string | null;
  searchTargetNode: string | null;
  searchTier: number | null;
  commandedNode: string | null;
  /** DIAGNOSTIC OBSERVER ONLY, for adjudication after the decision. */
  distanceToLearner: number;
  newEvidence: boolean;
}

export interface SurfaceRunResult {
  trace: SurfaceTraceRow[];
  diagnostics: GraphPursuerController['diagnostics'];
  finalDistance: number;
  minDistance: number;
  /** Smallest distance reached during the closing stationary period alone. */
  stationaryMinDistance: number;
  stationaryStartDistance: number;
  stationaryEndDistance: number;
  highestLearnerRow: number;
  world: GraphWorld;
}

/** A row of three platforms at the production geometry. */
function makeRow(world: GraphWorld, index: number) {
  return {
    index,
    y: -index * world.rowGap,
    platforms: world.columns.map((x, column) => ({
      id: `row-${index}-column-${column}`,
      row: index,
      column,
      x,
      y: -index * world.rowGap,
      width: world.platformWidth,
      height: world.platformHeight,
      dead: false,
    })),
  };
}

export function runProductionSurface(options: SurfaceRunOptions): SurfaceRunResult {
  const world = productionGraphWorldAt(options.framingPercent ?? 100);
  const dtMs = options.dtMs ?? 16.7;
  const thinkMs = options.thinkMs ?? 4500;
  const stationaryMs = options.stationaryMs ?? 15000;

  const routingConfig = {
    logicalWidth: world.logicalWidth,
    platformHeight: world.platformHeight,
    playerRadius: world.playerRadius,
    routePlatformPadding: world.routePlatformPadding,
    routeTurnCount: 8,
    routeMaxStraightRun: 72,
    routeHorizontalJitter: 44,
  };

  const rows = [makeRow(world, 0)];
  const getRow = (index: number) => rows.find((r) => r.index === index) ?? null;
  const ensureRows = (learnerRow: number) => {
    while (rows[rows.length - 1].index <= learnerRow + ROWS_AHEAD) {
      rows.push(makeRow(world, rows[rows.length - 1].index + 1));
    }
  };
  ensureRows(0);

  let learnerPlatform = rows[0].platforms[1];
  let learner: RoutePoint = landingPointFor(routingConfig, learnerPlatform);
  let learnerRow = 0;
  let highestLearnerRow = 0;

  const controller = new GraphPursuerController({
    world,
    rowCount: rows.length,
    learnerStart: { x: learner.x, y: learner.y, row: 0 },
    spawn: options.spawn,
  });

  const trace: SurfaceTraceRow[] = [];
  let tMs = 0;
  let frame = 0;
  let minDistance = Infinity;
  const seenFragmentIds = new Set<string>();

  const tick = (moving: boolean) => {
    tMs += dtMs;
    frame += 1;
    ensureRows(learnerRow);

    const state: LearnerPhysicalState = {
      x: learner.x, y: learner.y, row: learnerRow, moving,
    };
    const result = controller.step(dtMs, state, world, rows.length);
    const brain = controller.state;

    let newEvidence = false;
    for (const fragment of brain.rememberedFragments) {
      if (!seenFragmentIds.has(fragment.id)) { seenFragmentIds.add(fragment.id); newEvidence = true; }
    }

    // Newest remembered lead, and whether the Brain still considers any of it
    // unconsumed. Read from the Brain's own memory — nothing hidden.
    let newest: { id: string; tEndMs: number } | null = null;
    for (const fragment of brain.rememberedFragments) {
      if (!newest || fragment.tEndMs > newest.tEndMs) newest = { id: fragment.id, tEndMs: fragment.tEndMs };
    }
    const watermark = newest ? brain.consumedUntilMsByFragment[newest.id] : undefined;

    const distance = Math.hypot(learner.x - result.x, learner.y - result.y);
    minDistance = Math.min(minDistance, distance);

    trace.push({
      tMs, frame,
      pursuerX: result.x, pursuerY: result.y,
      learnerX: learner.x, learnerY: learner.y, learnerRow,
      directSense: result.evidence.sensedSparkNow,
      mode: result.mode,
      commitment: brain.commitment ? `${brain.commitment.mode}:${brain.commitment.evidenceKey}` : null,
      commitmentEndReason: result.evidence.commitmentEndReason,
      lastSighting: brain.lastSighting
        ? `${brain.lastSighting.x.toFixed(0)},${brain.lastSighting.y.toFixed(0)}` : null,
      newestLead: newest ? newest.id : null,
      newestLeadUnconsumed: newest ? (watermark === undefined || newest.tEndMs > watermark) : false,
      consumedWatermarks: Object.keys(brain.consumedUntilMsByFragment).length,
      searchAnchor: brain.search ? brain.search.anchorNodeId : null,
      searchTargetNode: brain.search ? brain.search.lastTargetNode : null,
      searchTier: brain.search ? brain.search.lastTargetTier : null,
      commandedNode: result.commandedNode,
      distanceToLearner: distance,
      newEvidence,
    });
  };

  // --- the session ---------------------------------------------------------
  for (const column of options.climbColumns) {
    // Think time: the learner stands on its platform and reads.
    for (let i = 0; i < Math.round(thinkMs / dtMs); i += 1) tick(false);

    ensureRows(learnerRow);
    const destinationRow = getRow(learnerRow + 1)!;
    const destinationPlatform = destinationRow.platforms[column];
    const routingWorld: LearnerRoutingWorld = {
      config: routingConfig,
      activePlatforms: collectActivePlatforms(rows),
      getRow,
      sourcePlatform: learnerPlatform,
      threat: null,
      avoidance: 0,
    };
    const corridors = destinationCorridors(destinationRow, routingConfig);
    const corridor = corridors[Math.min(column, corridors.length - 1)];
    const to = landingPointFor(routingConfig, destinationPlatform);
    const path = buildSteppedRoute(routingWorld, learner, to, destinationPlatform, corridor, -1);

    // Walk the real route at production's own speed.
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < path.length; i += 1) {
      const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      lengths.push(d);
      total += d;
    }
    let travelled = 0;
    while (travelled < total) {
      travelled = Math.min(total, travelled + PRODUCTION_ROUTE_SPEED * dtMs);
      let remaining = travelled;
      let segment = 0;
      while (segment < lengths.length && remaining > lengths[segment]) {
        remaining -= lengths[segment];
        segment += 1;
      }
      const a = path[Math.min(segment, path.length - 1)];
      const b = path[Math.min(segment + 1, path.length - 1)];
      const span = lengths[segment] || 1;
      learner = { x: a.x + (b.x - a.x) * (remaining / span), y: a.y + (b.y - a.y) * (remaining / span) };
      tick(true);
    }

    learnerPlatform = destinationPlatform;
    learner = to;
    learnerRow += 1;
    highestLearnerRow = Math.max(highestLearnerRow, learnerRow);
  }

  // --- the learner stops entirely -----------------------------------------
  const stationaryFrom = trace.length;
  for (let i = 0; i < Math.round(stationaryMs / dtMs); i += 1) tick(false);
  const stationarySlice = trace.slice(stationaryFrom);

  return {
    trace,
    diagnostics: controller.diagnostics,
    finalDistance: trace[trace.length - 1].distanceToLearner,
    minDistance,
    stationaryMinDistance: Math.min(...stationarySlice.map((r) => r.distanceToLearner)),
    stationaryStartDistance: stationarySlice[0].distanceToLearner,
    stationaryEndDistance: stationarySlice[stationarySlice.length - 1].distanceToLearner,
    highestLearnerRow,
    world,
  };
}

/** A compact, readable strategic trace: one line per change, not per frame. */
export function summariseTrace(trace: SurfaceTraceRow[]): string[] {
  const lines: string[] = [];
  let previous: SurfaceTraceRow | null = null;
  for (const row of trace) {
    const changed = !previous
      || row.mode !== previous.mode
      || row.commitment !== previous.commitment
      || row.searchAnchor !== previous.searchAnchor
      || row.searchTargetNode !== previous.searchTargetNode;
    if (!changed) { previous = row; continue; }
    lines.push(
      `${row.tMs.toFixed(0).padStart(6)}ms `
      + `${row.mode.padEnd(15)} `
      + `commit=${(row.commitment ?? '-').padEnd(26)} `
      + `end=${(row.commitmentEndReason ?? '-').padEnd(28)} `
      + `anchor=${(row.searchAnchor ?? '-').padEnd(5)} `
      + `target=${(row.searchTargetNode ?? '-').padEnd(5)} `
      + `lead=${(row.newestLead ?? '-').padEnd(14)}${row.newestLeadUnconsumed ? '(open)' : '(spent)'} `
      + `sense=${row.directSense ? 'Y' : 'n'} `
      + `p=(${row.pursuerX.toFixed(0)},${row.pursuerY.toFixed(0)}) `
      + `l=(${row.learnerX.toFixed(0)},${row.learnerY.toFixed(0)}) row=${row.learnerRow} `
      + `d=${row.distanceToLearner.toFixed(0)}`,
    );
    previous = row;
  }
  return lines;
}
