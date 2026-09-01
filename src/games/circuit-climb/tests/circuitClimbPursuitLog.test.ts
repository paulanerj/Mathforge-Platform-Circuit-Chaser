import { describe, it, expect } from 'vitest';
import {
  PursuitLog,
  behaviourTransitionReason,
  classifyTargetSource,
  type PursuitPursuerSample,
} from '../diagnostics/circuitClimbPursuitLog';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import { ALIVE_PURSUER_TUNING } from '../pursuer/circuitClimbPursuerTuning';
import { CIRCUIT_CLIMB_GEOMETRY as G } from '../geometry/circuitClimbGeometry';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';

/**
 * PURSUIT OBSERVABILITY.
 *
 * The log has one job and one prohibition: record enough to explain a pursuit
 * decision, and change nothing. Most of what follows tests the prohibition,
 * because a diagnostic that alters the thing it observes is worse than no
 * diagnostic at all — it produces confident, wrong evidence.
 */

const samplePursuer = (over: Partial<PursuitPursuerSample> = {}): PursuitPursuerSample => ({
  x: 300, y: -100, row: 0, behaviour: 'SEARCH', targetSource: 'LAST_KNOWN',
  desired: { x: 300, y: -300 }, lastKnown: { x: 300, y: -100 }, distance: 200,
  mode: 'DIRECT', targetX: 300, chosenCorridor: null, cadence: 'MOVING',
  direction: { axis: 'y', sign: -1, changed: false }, budget: 2.2,
  hBlocked: false, vBlocked: false, stalled: false, stallReason: null,
  ...over,
});

const samplePlayer = (over: Record<string, any> = {}) => ({
  x: 300, y: 0, row: 0, platformId: 'row-0-column-1', destinationId: null,
  travelType: 'NONE' as const, settled: true, correct: null, segment: null, progress: null,
  ...over,
});

describe('the log records a run', () => {
  it('exports a schema, an identity, counts, routes, events and frames', () => {
    const log = new PursuitLog(10, 10, 10, 1);
    log.reset({ build: 'abc1234', branch: 'test-branch', viewScalePercent: 90, routeTurnCount: 10 });
    log.frame(16, samplePlayer(), samplePursuer());

    const exported = log.toExport();
    expect(exported.schema).toBe('circuit-climb-pursuit-log/1');
    expect(exported.identity.build).toBe('abc1234');
    expect(exported.identity.branch).toBe('test-branch');
    expect(exported.identity.viewScalePercent).toBe(90);
    expect(exported.identity.routeTurnCount).toBe(10);
    expect(exported.counts.framesRetained).toBe(1);
    expect(exported.frames[0].pursuer!.behaviour).toBe('SEARCH');
  });

  it('serialises to JSON a human can paste', () => {
    const log = new PursuitLog(10, 10, 10, 1);
    log.frame(16, samplePlayer(), samplePursuer());
    const parsed = JSON.parse(log.toJSON(2));
    expect(parsed.schema).toBe('circuit-climb-pursuit-log/1');
    expect(Array.isArray(parsed.frames)).toBe(true);
  });

  it('records movement direction between samples', () => {
    const log = new PursuitLog(10, 10, 10, 1);
    log.frame(0, samplePlayer({ x: 300, y: 0 }), null);
    log.frame(16, samplePlayer({ x: 320, y: -40 }), null);
    log.frame(32, samplePlayer({ x: 310, y: -40 }), null);

    const frames = log.toExport().frames;
    expect([frames[0].player.dx, frames[0].player.dy]).toEqual([0, 0]);   // nothing to compare to
    expect([frames[1].player.dx, frames[1].player.dy]).toEqual([1, -1]);  // right and up
    expect([frames[2].player.dx, frames[2].player.dy]).toEqual([-1, 0]);  // left, level
  });
});

describe('LOCKED: logging cannot change what it observes', () => {
  /**
   * The whole prohibition, mechanically enforced. Everything handed to the log
   * is frozen first: if any method wrote through a reference it was given, the
   * assignment throws in strict mode and this test fails.
   */
  it('never writes through anything it is handed', () => {
    const log = new PursuitLog();
    const route = Object.freeze([
      Object.freeze({ x: 300, y: 0 }),
      Object.freeze({ x: 300, y: -100 }),
      Object.freeze({ x: 110, y: -100 }),
    ]);
    const player = Object.freeze(samplePlayer({ travelType: 'CIRCUIT', settled: false, segment: 0 }));
    const pursuer = Object.freeze(samplePursuer({
      desired: Object.freeze({ x: 300, y: -300 }) as any,
      lastKnown: Object.freeze({ x: 300, y: -100 }) as any,
      direction: Object.freeze({ axis: 'y', sign: -1, changed: true }) as any,
    }));

    expect(() => {
      log.routeStarted(0, route as any, 290, 'row-1-column-0', true);
      log.routeSegmentEntered(16, 1, { x: 300, y: -100 }, 100);
      log.frame(16, player as any, pursuer as any);
      log.routeCompleted(32, { x: 110, y: -100 }, 290, true);
      log.capture(48, { x: 110, y: -100 }, { x: 110, y: -100 });
      log.toJSON();
    }).not.toThrow();
  });

  it('copies the planned route rather than holding the caller\'s array', () => {
    const log = new PursuitLog();
    const route = [{ x: 300, y: 0 }, { x: 300, y: -100 }];
    log.routeStarted(0, route, 100, 'p', true);

    // The runtime keeps mutating its own travel points; the log's copy must not
    // follow, or an export would describe a route that was never flown.
    route[1].x = 999;
    route.push({ x: 0, y: 0 });

    const recorded = log.toExport().routes[0];
    expect(recorded.plannedRoute).toEqual([{ x: 300, y: 0 }, { x: 300, y: -100 }]);
  });

  /**
   * The one test that ties the prohibition to the real pursuer: the same
   * scenario, once with logging and once without, must produce identical
   * positions and identical state transitions.
   */
  it('a logged pursuit and an unlogged pursuit are frame-for-frame identical', () => {
    const geometry = defaultTestGeometry();
    const run = (log: PursuitLog | null) => {
      let pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
      const player = { x: 110, y: -3 * G.rowGap - 35, traveling: false, capturable: true };
      const path: string[] = [];
      for (let frame = 0; frame < 400; frame += 1) {
        pursuer = updatePursuer(pursuer, player, [], 16.7, (step) => {
          if (!log) return;
          log.frame(frame * 16.7, samplePlayer({ x: player.x, y: player.y }), samplePursuer({
            x: pursuer.x, y: pursuer.y, behaviour: step.behaviour,
            targetSource: classifyTargetSource(step),
            desired: step.desired, lastKnown: step.lastKnown,
            distance: step.distanceToPlayer, mode: step.mode,
            direction: step.direction, cadence: step.cadence,
          }));
        }, geometry);
        path.push(`${pursuer.x.toFixed(9)},${pursuer.y.toFixed(9)},${pursuer.behaviour},${pursuer.state}`);
        if (pursuer.state === 'CAUGHT') break;
      }
      return path.join('|');
    };

    const withLog = run(new PursuitLog());
    const withoutLog = run(null);
    expect(withLog).toBe(withoutLog);
    expect(withLog.length).toBeGreaterThan(100);
  });
});

describe('bounded memory', () => {
  it('retains a tail and says how much it dropped', () => {
    const log = new PursuitLog(10, 5, 3, 1);
    for (let i = 0; i < 250; i += 1) log.frame(i, samplePlayer({ x: i }), null);

    const exported = log.toExport();
    expect(exported.counts.framesRetained).toBe(10);
    expect(exported.counts.framesRecorded).toBe(250);
    expect(exported.counts.framesObserved).toBe(250);
    // The tail, not the head: the interesting part of a pursuit run is the end.
    expect(exported.frames[exported.frames.length - 1].player.x).toBe(249);
  });

  /**
   * Sampling is declared, so nobody can mistake a thinned log for a complete
   * one — the export says how many frames the game ran, how many were sampled,
   * and how many survived the buffer.
   */
  it('samples frames, and says so in the counts', () => {
    const log = new PursuitLog(1000, 100, 10, 3);
    for (let i = 0; i < 300; i += 1) log.frame(i, samplePlayer({ x: i }), null);

    const counts = log.toExport().counts;
    expect(counts.framesObserved).toBe(300);
    expect(counts.frameStride).toBe(3);
    expect(counts.framesRecorded).toBe(100);
    expect(counts.framesRetained).toBe(100);
  });

  /**
   * The line the sampling must not cross. Thinning routine context is a size
   * decision; losing a transition would be a diagnostic that lies by omission.
   */
  it('no event is ever sampled away', () => {
    const strided = new PursuitLog(1000, 500, 10, 7);
    const complete = new PursuitLog(1000, 500, 10, 1);
    for (const log of [strided, complete]) {
      for (let i = 0; i < 60; i += 1) {
        // A behaviour flip every frame, so an event is due on every one of them.
        log.frame(i, samplePlayer(), samplePursuer({ behaviour: i % 2 ? 'CHASE' : 'SEARCH' }));
      }
    }
    const count = (log: PursuitLog) =>
      log.toExport().events.filter((e) => e.name === 'PURSUER_BEHAVIOUR_CHANGED').length;
    expect(count(strided)).toBe(count(complete));
    expect(count(strided)).toBe(59);
  });

  it('bounds events and routes too', () => {
    const log = new PursuitLog(10, 5, 3);
    for (let i = 0; i < 40; i += 1) log.event('CAPTURE', i);
    for (let i = 0; i < 20; i += 1) log.routeStarted(i, [{ x: 0, y: 0 }], 0, `p${i}`, true);

    const exported = log.toExport();
    expect(exported.counts.eventsRetained).toBeLessThanOrEqual(5);
    expect(exported.counts.routesRetained).toBe(3);
    expect(exported.counts.routesRecorded).toBe(20);
  });

  it('a long run stays a size a person can paste', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 30000; i += 1) {
      log.frame(i * 16.7, samplePlayer({ x: 300 + (i % 100) }), samplePursuer({ y: -i }));
    }
    // Well past the default capacity: the export must be bounded by capacity,
    // not by how long someone played, and small enough to hand over by hand.
    expect(log.toExport().counts.framesObserved).toBe(30000);
    expect(log.toExport().counts.framesRetained).toBe(1200);
    expect(log.toJSON(0).length).toBeLessThan(1_000_000);
  });
});

describe('semantic events fire once per transition', () => {
  it('a behaviour that holds reports one change, not one per frame', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 50; i += 1) log.frame(i, samplePlayer(), samplePursuer({ behaviour: 'SEARCH' }));
    for (let i = 0; i < 50; i += 1) log.frame(50 + i, samplePlayer(), samplePursuer({ behaviour: 'CHASE' }));

    const changes = log.toExport().events.filter((e) => e.name === 'PURSUER_BEHAVIOUR_CHANGED');
    expect(changes).toHaveLength(1);
    expect(changes[0].data!.from).toBe('SEARCH');
    expect(changes[0].data!.to).toBe('CHASE');
  });

  it('the same holds for the target source', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 30; i += 1) log.frame(i, samplePlayer(), samplePursuer({ targetSource: 'LAST_KNOWN' }));
    for (let i = 0; i < 30; i += 1) log.frame(30 + i, samplePlayer(), samplePursuer({ targetSource: 'PLAYER_CURRENT' }));
    for (let i = 0; i < 30; i += 1) log.frame(60 + i, samplePlayer(), samplePursuer({ targetSource: 'PLAYER_CURRENT' }));

    expect(log.toExport().events.filter((e) => e.name === 'PURSUER_TARGET_SOURCE_CHANGED')).toHaveLength(1);
  });

  /**
   * The turn signal is the pursuer's own, so the log must pass it through
   * exactly — one event per genuine turn, silence while it holds course.
   */
  it('a direction change is recorded exactly when the pursuer reports one', () => {
    const log = new PursuitLog();
    const held = { axis: 'x', sign: 1, changed: false };
    const turned = { axis: 'y', sign: -1, changed: true };
    for (let i = 0; i < 20; i += 1) log.frame(i, samplePlayer(), samplePursuer({ direction: held }));
    log.frame(20, samplePlayer(), samplePursuer({ direction: turned }));
    for (let i = 0; i < 20; i += 1) log.frame(21 + i, samplePlayer(), samplePursuer({ direction: { axis: 'y', sign: -1, changed: false } }));

    expect(log.toExport().events.filter((e) => e.name === 'PURSUER_DIRECTION_CHANGED')).toHaveLength(1);
  });

  it('names why the lifecycle moved, from the state that moved it', () => {
    expect(behaviourTransitionReason('CHASE', 'SEARCH', false)).toBe('PLAYER_TRAVELLING_BREAKS_LOCK');
    expect(behaviourTransitionReason('CHASE', 'SEARCH', true)).toBe('LOST_AT_DISTANCE');
    expect(behaviourTransitionReason('SEARCH', 'ALERT', true)).toBe('SENSED_WITHIN_RADIUS');
    expect(behaviourTransitionReason('ALERT', 'CHASE', true)).toBe('ALERT_DWELL_ELAPSED');
    expect(behaviourTransitionReason('SEARCH', 'CHASE', true)).toBe('SENSED_WITH_NO_DWELL');
  });
});

describe('LOCKED: planned route never leaks into traversed route', () => {
  /**
   * The invariant a trail-based pursuer will one day depend on. The router
   * knows the whole route the instant a destination is chosen; a bot that could
   * read that would be pursuing the future. Traversed grows only on physical
   * arrival at a vertex, so at every instant it is a prefix of what has actually
   * been flown.
   */
  it('traversed points appear only as segments are physically entered', () => {
    const log = new PursuitLog();
    const planned = [
      { x: 300, y: 0 }, { x: 300, y: -50 }, { x: 110, y: -50 },
      { x: 110, y: -180 }, { x: 200, y: -180 },
    ];
    log.routeStarted(0, planned, 500, 'row-1-column-0', true);

    const openRoute = () => log.toExport().routes[0];
    // At the start only the point the spark is standing on is traversed.
    expect(openRoute().traversedPoints).toEqual([{ x: 300, y: 0 }]);
    expect(openRoute().plannedRoute).toHaveLength(5);

    log.routeSegmentEntered(20, 1, { x: 300, y: -50 }, 50);
    expect(openRoute().traversedPoints).toHaveLength(2);
    expect(openRoute().traversedDistance).toBe(50);

    log.routeSegmentEntered(40, 2, { x: 110, y: -50 }, 240);
    expect(openRoute().traversedPoints).toHaveLength(3);

    // Three of five vertices flown: the rest is still only ever `plannedRoute`.
    const midway = openRoute();
    expect(midway.traversedPoints.length).toBeLessThan(midway.plannedRoute.length);
    midway.traversedPoints.forEach((point, index) => {
      expect(point).toEqual(midway.plannedRoute[index]);
    });
  });

  it('the planned route lives under a key that says what it is', () => {
    const log = new PursuitLog();
    log.routeStarted(0, [{ x: 1, y: 2 }, { x: 3, y: 4 }], 10, 'p', true);
    const record = log.toExport().routes[0];
    expect(Object.keys(record)).toContain('plannedRoute');
    expect(Object.keys(record)).toContain('traversedPoints');
    // A reader looking for what was actually flown cannot reach the remainder
    // by accident: the two are separate arrays with separate names.
    expect(record.plannedRoute).not.toBe(record.traversedPoints);
  });

  it('an abandoned route is marked, not silently completed', () => {
    const log = new PursuitLog();
    log.routeStarted(0, [{ x: 0, y: 0 }, { x: 0, y: -10 }], 10, 'first', true);
    log.routeStarted(50, [{ x: 0, y: 0 }, { x: 0, y: -20 }], 20, 'second', true);

    const routes = log.toExport().routes;
    expect(routes[0].outcome).toBe('ABANDONED');
    expect(routes[1].outcome).toBe('IN_PROGRESS');
  });
});

describe('the wrong-answer round trip is recorded end to end', () => {
  it('records the ascent, the rejection and the return in order', () => {
    const log = new PursuitLog();
    log.routeStarted(0, [{ x: 300, y: 0 }, { x: 300, y: -200 }], 200, 'row-1-column-2', false);
    log.routeSegmentEntered(100, 1, { x: 300, y: -200 }, 200);
    log.routeCompleted(200, { x: 300, y: -200 }, 200, false);
    log.wrongReturnStarted(200, { x: 300, y: -200 }, { x: 300, y: 0 }, 360);
    log.wrongReturnCompleted(560, { x: 300, y: 0 });

    const names = log.toExport().events.map((e) => e.name);
    expect(names).toEqual([
      'PLAYER_ROUTE_STARTED',
      'PLAYER_ROUTE_SEGMENT_ENTERED',
      'PLAYER_ROUTE_COMPLETED',
      'PLAYER_WRONG_RETURN_STARTED',
      'PLAYER_WRONG_RETURN_COMPLETED',
    ]);
    expect(log.toExport().routes[0].correct).toBe(false);
    expect(log.toExport().routes[0].outcome).toBe('ARRIVED');
  });

  it('the return carries where it came from and where it goes', () => {
    const log = new PursuitLog();
    log.wrongReturnStarted(0, { x: 490, y: -400 }, { x: 300, y: -200 }, 360);
    const event = log.toExport().events[0];
    expect(event.data!.from).toEqual({ x: 490, y: -400 });
    expect(event.data!.to).toEqual({ x: 300, y: -200 });
    expect(event.data!.durationMs).toBe(360);
  });
});

describe('the target source is read off the decision, never guessed', () => {
  const base = {
    mode: 'DIRECT', behaviour: 'CHASE', mustCrossRow: false,
    desired: { x: 300, y: -100 }, lastKnown: { x: 300, y: -100 }, player: { x: 300, y: -100 },
  };

  it('names each source the current architecture actually has', () => {
    expect(classifyTargetSource(base)).toBe('PLAYER_CURRENT');
    expect(classifyTargetSource({ ...base, mode: 'ESCAPE' })).toBe('OBSTACLE_RECOVERY');
    expect(classifyTargetSource({ ...base, mustCrossRow: true, mode: 'CORRIDOR' })).toBe('CORRIDOR_COMMITMENT');
    expect(classifyTargetSource({ ...base, behaviour: 'SEARCH' })).toBe('LAST_KNOWN');
    expect(classifyTargetSource({
      ...base, behaviour: 'SEARCH', desired: { x: 380, y: -100 },
    })).toBe('SEARCH_SWEEP');
  });

  it('the live pursuer produces sources that match its own behaviour', () => {
    const geometry = defaultTestGeometry();
    let pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
    pursuer.y = -600;
    const seen = new Set<string>();
    for (let frame = 0; frame < 300; frame += 1) {
      pursuer = updatePursuer(pursuer, { x: 300, y: -650, traveling: false, capturable: true }, [], 16.7, (step) => {
        const source = classifyTargetSource(step);
        seen.add(source);
        if (step.behaviour === 'CHASE' && !step.mustCrossRow && step.mode !== 'ESCAPE') {
          expect(source).toBe('PLAYER_CURRENT');
        }
      }, geometry);
      if (pursuer.state === 'CAUGHT') break;
    }
    expect(seen.size).toBeGreaterThan(0);
  });
});

/**
 * OBSERVED BEHAVIOUR, RECORDED FOR 07B.
 *
 * These change nothing. They pin down two properties of the pursuit model that
 * the 07A audit found and that a later phase is expected to address, so that
 * whatever 07B does, the starting point is written down and cannot be
 * misremembered.
 */
describe('AUDIT: what the current pursuit model does when the learner reverses', () => {
  const geometry = defaultTestGeometry();

  /**
   * `desiredY = Math.min(lastKnownY, y - rowGap)` on an axis where up is
   * negative. The second term is always above the pursuer, so the minimum is
   * too — whatever the sighting says. A searching pursuer cannot aim downward.
   */
  it('a SEARCHING pursuer can never aim below itself, however far below the sighting is', () => {
    for (const sightingBelow of [0, 100, 500, 2000]) {
      const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
      pursuer.y = -1000;
      pursuer.behaviour = 'SEARCH';
      pursuer.lastKnownX = 300;
      pursuer.lastKnownY = -1000 + sightingBelow;

      let step: any;
      updatePursuer(pursuer, { x: 300, y: -1000 + sightingBelow, traveling: true }, [], 16, (s) => { step = s; }, geometry);
      expect(step.desired.y, `sighting ${sightingBelow} below`).toBeLessThanOrEqual(-1000 - geometry.rowGap);
    }
  });

  it('a CHASING pursuer aims at the learner even when the learner is below it', () => {
    const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
    pursuer.y = -900;
    pursuer.behaviour = 'CHASE';
    let step: any;
    updatePursuer(pursuer, { x: 300, y: -650, traveling: false, capturable: true }, [], 16, (s) => { step = s; }, geometry);
    expect(step.desired.y).toBe(-650);
  });

  /**
   * And the reason the searching case is the one that matters: a travelling
   * spark breaks the lock, so the whole of a wrong-answer round trip is spent
   * in the state that cannot descend.
   */
  it('a travelling learner puts the pursuer into the state that cannot descend', () => {
    const pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
    pursuer.y = -900;
    pursuer.behaviour = 'CHASE';
    const next = updatePursuer(pursuer, { x: 300, y: -650, traveling: true, capturable: true }, [], 16, undefined, geometry);
    expect(next.behaviour).toBe('SEARCH');
  });

  /**
   * The sighting is written on the frame the lock breaks and then left alone
   * for the whole travel, so a wrong-answer round trip is pursued against a
   * point the learner left at the start of it.
   */
  it('the last sighting is frozen for the whole of a travel', () => {
    let pursuer = createPursuer(300, 0, ALIVE_PURSUER_TUNING, geometry);
    pursuer.y = -400;
    pursuer.behaviour = 'CHASE';
    pursuer = updatePursuer(pursuer, { x: 300, y: -650, traveling: true, capturable: true }, [], 16, undefined, geometry);
    const frozen = { x: pursuer.lastKnownX, y: pursuer.lastKnownY };

    for (let frame = 0; frame < 120; frame += 1) {
      pursuer = updatePursuer(pursuer, { x: 300 + frame, y: -650 - frame * 2, traveling: true, capturable: true }, [], 16, undefined, geometry);
    }
    expect({ x: pursuer.lastKnownX, y: pursuer.lastKnownY }).toEqual(frozen);
  });
});

/**
 * STALL EPISODES.
 *
 * `stalledFrames = 208` is not an answer. 208 frames spread over forty brief
 * routing blocks and 208 frames in one unbroken freeze are opposite
 * behaviours, and the count cannot tell them apart. These tests hold the
 * distinction the count was missing.
 */
describe('stall episodes separate routing from deadlock', () => {
  const stalled = (over: Record<string, any> = {}) =>
    samplePursuer({ stalled: true, stallReason: 'VERTICAL_BLOCKED', ...over });

  it('groups consecutive stalled frames into one episode', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 5; i += 1) log.frame(i * 16.7, samplePlayer(), samplePursuer());
    for (let i = 0; i < 20; i += 1) log.frame((5 + i) * 16.7, samplePlayer(), stalled());
    for (let i = 0; i < 5; i += 1) log.frame((25 + i) * 16.7, samplePlayer(), samplePursuer({ targetX: 400 }));

    const { stalls, stallEpisodes } = log.toExport();
    expect(stalls.stallFrames).toBe(20);
    expect(stalls.stallEpisodes).toBe(1);
    expect(stallEpisodes[0].frames).toBe(20);
    expect(stallEpisodes[0].recovered).toBe(true);
    expect(stallEpisodes[0].severity).toBe('TRANSIENT');
  });

  /**
   * The distinction the PM asked for, in one test: the same total, two
   * completely different behaviours.
   */
  it('the same stall count reads differently when it is scattered or solid', () => {
    const scattered = new PursuitLog();
    for (let block = 0; block < 20; block += 1) {
      for (let i = 0; i < 10; i += 1) scattered.frame((block * 20 + i) * 16.7, samplePlayer(), stalled());
      for (let i = 0; i < 10; i += 1) scattered.frame((block * 20 + 10 + i) * 16.7, samplePlayer(), samplePursuer({ targetX: 300 + block }));
    }
    const solid = new PursuitLog();
    for (let i = 0; i < 200; i += 1) solid.frame(i * 16.7, samplePlayer(), stalled());

    expect(scattered.toExport().stalls.stallFrames).toBe(200);
    expect(solid.toExport().stalls.stallFrames).toBe(200);

    // Identical totals, opposite shapes.
    expect(scattered.toExport().stalls.stallEpisodes).toBe(20);
    expect(scattered.toExport().stalls.maximumConsecutiveStallFrames).toBe(10);
    expect(scattered.toExport().stalls.unrecoveredEpisodes).toBe(0);

    expect(solid.toExport().stalls.stallEpisodes).toBe(1);
    expect(solid.toExport().stalls.maximumConsecutiveStallFrames).toBe(200);
    expect(solid.toExport().stalls.unrecoveredEpisodes).toBe(1);
  });

  it('an episode still open when the run ends is a DEADLOCK, not an omission', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 10; i += 1) log.frame(i * 16.7, samplePlayer(), samplePursuer());
    for (let i = 0; i < 120; i += 1) log.frame((10 + i) * 16.7, samplePlayer(), stalled());

    const { stalls, stallEpisodes } = log.toExport();
    expect(stallEpisodes).toHaveLength(1);
    expect(stallEpisodes[0].severity).toBe('DEADLOCK');
    expect(stallEpisodes[0].recovered).toBe(false);
    expect(stalls.unrecoveredEpisodes).toBe(1);
    expect(stalls.maximumStallDurationMs).toBeGreaterThan(1900);
  });

  it('a recovered episode past the threshold is SUSTAINED, never DEADLOCK', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 60; i += 1) log.frame(i * 16.7, samplePlayer(), stalled());
    log.frame(60 * 16.7, samplePlayer(), samplePursuer({ targetX: 480 }));

    const episode = log.toExport().stallEpisodes[0];
    expect(episode.severity).toBe('SUSTAINED');
    expect(episode.recovered).toBe(true);
    expect(log.toExport().stalls.sustainedThresholdFrames).toBe(45);
  });

  it('names what changed to end the episode', () => {
    const cause = (recoveryFrame: Record<string, any>) => {
      const log = new PursuitLog();
      for (let i = 0; i < 10; i += 1) {
        log.frame(i * 16.7, samplePlayer(), stalled({ targetX: 300, mode: 'DIRECT', chosenCorridor: null, behaviour: 'CHASE' }));
      }
      log.frame(200, samplePlayer(), samplePursuer({ targetX: 300, mode: 'DIRECT', chosenCorridor: null, behaviour: 'CHASE', ...recoveryFrame }));
      return log.toExport().stallEpisodes[0].recoveryCause;
    };
    expect(cause({ targetX: 480 })).toBe('TARGET_X_CHANGED');
    expect(cause({ chosenCorridor: 205 })).toBe('CORRIDOR_CHANGED');
    expect(cause({ mode: 'CORRIDOR' })).toBe('MODE_CHANGED');
    expect(cause({ behaviour: 'SEARCH' })).toBe('BEHAVIOUR_CHANGED');
    expect(cause({})).toBe('UNCHANGED_INPUTS');
  });

  it('reports the reason the episode mostly held, not merely its first frame', () => {
    const log = new PursuitLog();
    log.frame(0, samplePlayer(), stalled({ stallReason: 'HORIZONTAL_BLOCKED' }));
    for (let i = 0; i < 40; i += 1) log.frame((i + 1) * 16.7, samplePlayer(), stalled({ stallReason: 'VERTICAL_BLOCKED' }));
    log.frame(999, samplePlayer(), samplePursuer({ targetX: 400 }));

    expect(log.toExport().stallEpisodes[0].reason).toBe('VERTICAL_BLOCKED');
  });

  /**
   * Episodes are counted on every frame, so a sampled log still reports true
   * durations. Counting them off the stored frames would divide by the stride.
   */
  it('sampling does not distort episode length', () => {
    const build = (stride: number) => {
      const log = new PursuitLog(1000, 500, 10, stride);
      for (let i = 0; i < 90; i += 1) log.frame(i * 16.7, samplePlayer(), stalled());
      log.frame(90 * 16.7, samplePlayer(), samplePursuer({ targetX: 400 }));
      return log.toExport();
    };
    expect(build(3).stalls.maximumConsecutiveStallFrames).toBe(90);
    expect(build(1).stalls.maximumConsecutiveStallFrames).toBe(90);
    expect(build(3).stalls.stallFrames).toBe(build(1).stalls.stallFrames);
  });

  it('a deliberate cadence hesitation is not a stall', () => {
    const log = new PursuitLog();
    for (let i = 0; i < 60; i += 1) {
      // The pursuer reports hesitation as cadence, never as stalled — see 07A.
      log.frame(i * 16.7, samplePlayer(), samplePursuer({ cadence: 'HESITATING', stalled: false }));
    }
    expect(log.toExport().stalls.stallFrames).toBe(0);
    expect(log.toExport().stalls.stallEpisodes).toBe(0);
  });
});
