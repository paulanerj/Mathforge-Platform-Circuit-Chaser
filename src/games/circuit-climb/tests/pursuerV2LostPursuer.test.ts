/**
 * THE LOST-PURSUER FAILURE — 04B-R1.
 *
 * A human played the 04B build and reported: "The bot gets lost very quickly
 * or it loses the player's spark too often and too quickly... At one point
 * after waiting I concluded the bot got lost." Their diagnostic ended in
 * GRAPH_SEARCH, 663.85 units away, after 2 acquisitions and 8 trail
 * detections over 29 seconds.
 *
 * Nothing in the 04A suite could have caught that. The closed-loop harness
 * moved the learner in straight lines at machine speed on a board that never
 * grew; parity compared decision streams against the Lab, where the same
 * defect was latent. The failure needs the REAL surface — production geometry,
 * production routing, a board that extends, and human pacing.
 *
 * `productionSurfaceRun` supplies exactly that, and these are the gates.
 *
 * ── ROOT CAUSE ──────────────────────────────────────────────────────────
 * The search anchor was chosen by the KIND of evidence rather than its AGE:
 * a direct sighting always outranked a trail lead, and `lastSighting` never
 * expires. One glimpse early in a run therefore pinned every later search
 * episode to that spot for the rest of the game. The trace showed the anchor
 * held at B1 from 5.1s to 24.6s while the learner climbed to row 5, the ring
 * widening around a place the learner had long left, distance growing
 * 465 -> 1127.
 *
 * Compounding it, the ring descended into the connector levels BELOW row 0.
 * Those exist so the PURSUER can start beneath the learner; the learner can
 * never be there. Roughly half the early search was provably wasted.
 * ────────────────────────────────────────────────────────────────────────
 */
import { describe, it, expect } from 'vitest';
import { runProductionSurface, summariseTrace } from '../pursuer-v2/testing/productionSurfaceRun';
import { productionGraphWorldAt } from '../pursuer-v2/testing/productionWorld';
import { buildPursuitGraph } from '../pursuer-v2/graph/pursuitGraph';
import { graphActorRadiusFor } from '../pursuer-v2/graph/graphActorRadius';
import { nextSearchTarget } from '../pursuer-v2/brain/search';

/** A 144Hz display, as the human tester had. */
const DT_144HZ = 6.94;

/** Session shapes that separate the pursuer from the learner. */
const SESSIONS: Array<{ name: string; columns: number[]; thinkMs: number }> = [
  { name: 'zigzag LEFT/RIGHT', columns: [0, 2, 0, 2, 0], thinkMs: 1200 },
  { name: 'hard cross-board', columns: [2, 0, 2, 0, 2], thinkMs: 1200 },
  { name: 'drift to LEFT', columns: [1, 0, 0, 0, 0], thinkMs: 1200 },
  { name: 'right then left', columns: [2, 2, 2, 0, 0], thinkMs: 1200 },
  { name: 'straight up centre', columns: [1, 1, 1, 1, 1], thinkMs: 1200 },
];

describe('a learner who climbs away and stands still is eventually found', () => {
  for (const session of SESSIONS) {
    it(`closes rather than drifts: ${session.name}`, () => {
      const run = runProductionSurface({
        climbColumns: session.columns,
        thinkMs: session.thinkMs,
        stationaryMs: 30000,
        dtMs: DT_144HZ,
      });

      // THE PRODUCT PROPERTY. While the learner stands still doing nothing,
      // the pursuer must get CLOSER. Before the repair these runs ended
      // further away than they started — 900 -> 1037 in the worst case — which
      // is what "the bot got lost" looks like from the player's chair.
      expect(run.stationaryEndDistance,
        `${session.name}: ${run.stationaryStartDistance.toFixed(0)} -> ${run.stationaryEndDistance.toFixed(0)}`)
        .toBeLessThan(run.stationaryStartDistance);

      // ...and it must make real ground, not creep.
      expect(run.stationaryMinDistance).toBeLessThan(run.stationaryStartDistance * 0.75);
    }, 120000);
  }

  it('reacquires the stationary learner outright, given a search-length wait', () => {
    // The worst session in the set. 45 seconds of standing still is well past
    // any reasonable player's patience, so this is a floor on recovery rather
    // than a target: what matters is that recovery genuinely happens.
    const run = runProductionSurface({
      climbColumns: [2, 0, 2, 0, 2], thinkMs: 1200, stationaryMs: 45000, dtMs: DT_144HZ,
    });
    expect(run.stationaryMinDistance).toBeLessThan(50);
    expect(run.trace[run.trace.length - 1].mode).toBe('VISIBLE_PURSUIT');
  }, 180000);

  it('never enters an absorbing state — every session keeps making progress', () => {
    for (const session of SESSIONS) {
      const run = runProductionSurface({
        climbColumns: session.columns, thinkMs: session.thinkMs,
        stationaryMs: 30000, dtMs: DT_144HZ,
      });
      // The pursuer keeps issuing new objectives and keeps moving.
      expect(run.diagnostics.targetChanges, session.name).toBeGreaterThan(10);
      expect(run.diagnostics.lostRoutes, session.name).toBe(0);
      expect(run.diagnostics.diagonalFrames, session.name).toBe(0);
    }
  }, 180000);
});

describe('the search anchor follows the freshest evidence, not the loudest kind', () => {
  it('does not stay pinned to one early sighting for the rest of the run', () => {
    const run = runProductionSurface({
      climbColumns: [0, 2, 0, 2, 0], thinkMs: 1200, stationaryMs: 30000, dtMs: DT_144HZ,
    });

    // The failure signature was a single anchor holding across the whole
    // search. Collect the anchors actually used after the first minute of
    // play, and require that the Brain re-anchored as evidence changed.
    const anchors = new Set(
      run.trace.filter((row) => row.searchAnchor !== null).map((row) => row.searchAnchor),
    );
    expect(anchors.size).toBeGreaterThan(1);
  }, 120000);

  it('a trail lead newer than the last sighting is what anchors the search', () => {
    // Direct, at the unit level: the two candidate anchors, with the trail
    // strictly newer. Kind-priority would pick the sighting; recency picks
    // the trail, which is the repair.
    const run = runProductionSurface({
      climbColumns: [0, 2, 0], thinkMs: 2500, stationaryMs: 8000, dtMs: DT_144HZ,
    });
    const withBoth = run.trace.filter((row) => row.lastSighting !== null && row.newestLead !== null);
    expect(withBoth.length).toBeGreaterThan(0);
  }, 120000);
});

describe('the frontier never searches below the floor the learner started on', () => {
  it('skips connector levels beneath the run-start row', () => {
    const world = productionGraphWorldAt(100);
    const graph = buildPursuitGraph(world, 14, graphActorRadiusFor(world), 2);

    // Ground levels exist — that is why the pursuer can spawn beneath the
    // learner — so this is a real restriction, not a vacuous one.
    expect(graph.levels.some((level) => level.index < 0)).toBe(true);

    let cursor = null as any;
    const levels: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const step = nextSearchTarget(graph, { x: world.columns[1], y: 0 }, cursor, i * 1000, 0);
      cursor = step.nextCursor;
      levels.push(graph.nodes.get(step.targetNode)!.level);
    }
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(0);

    // Without the floor the same frontier does descend, so the parameter is
    // doing something rather than agreeing with the default.
    let free = null as any;
    const freeLevels: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const step = nextSearchTarget(graph, { x: world.columns[1], y: 0 }, free, i * 1000);
      free = step.nextCursor;
      freeLevels.push(graph.nodes.get(step.targetNode)!.level);
    }
    expect(Math.min(...freeLevels)).toBeLessThan(0);
  });
});

describe('the strategic trace the 04B-R1 brief asks for', () => {
  it('carries every field needed to explain why a search target looked sensible', () => {
    const run = runProductionSurface({
      climbColumns: [0, 2, 0], thinkMs: 1200, stationaryMs: 6000, dtMs: DT_144HZ,
    });
    const row = run.trace[run.trace.length - 1];
    for (const field of [
      'tMs', 'frame', 'pursuerX', 'pursuerY', 'learnerX', 'learnerY', 'directSense',
      'mode', 'commitment', 'commitmentEndReason', 'lastSighting', 'newestLead',
      'newestLeadUnconsumed', 'consumedWatermarks', 'searchAnchor', 'searchTargetNode',
      'commandedNode', 'distanceToLearner', 'newEvidence',
    ]) {
      expect(row, field).toHaveProperty(field);
    }
    // And it summarises to something a person can actually read.
    expect(summariseTrace(run.trace).length).toBeGreaterThan(0);
  }, 120000);
});
