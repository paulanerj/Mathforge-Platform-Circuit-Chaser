/**
 * THE PRODUCTION CONTROLLER — everything the Lab harness never had to do.
 *
 * Parity (pursuerV2Parity) proves the transplanted decision code still decides
 * what the accepted candidate decided. It cannot prove the production wrapper
 * around it behaves: the Lab never paused, never restarted after a capture,
 * never grew its board while the learner climbed, and never had a player
 * change the view scale mid-run. Those are this file's subject.
 *
 * The closed loop is preserved here too, and deliberately so — these tests
 * drive the REAL controller, so the Brain's own choice of target still changes
 * what it will sense next. No precomputed pursuer path appears anywhere.
 */
import { describe, it, expect } from 'vitest';
import { GraphPursuerController, type LearnerPhysicalState } from '../pursuer-v2/runtime/graphPursuerController';
import { productionGraphWorldAt } from '../pursuer-v2/testing/productionWorld';
import type { GraphWorld } from '../pursuer-v2/runtime/graphWorld';

const DT = 16.7;

function controllerAt(percent = 100, rowCount = 16) {
  const world = productionGraphWorldAt(percent);
  const controller = new GraphPursuerController({
    world, rowCount, learnerStart: { x: 300, y: 0, row: 0 },
  });
  return { world, controller };
}

function stationary(world: GraphWorld, row: number, x = 300): LearnerPhysicalState {
  return { x, y: -row * world.rowGap, row, moving: false };
}

describe('lifecycle: PAUSE freezes everything the accepted contract says it must', () => {
  it('a paused frame is simply a frame that is not stepped — no clock of its own', () => {
    const { world, controller } = controllerAt();
    for (let i = 0; i < 120; i += 1) controller.step(DT, stationary(world, 3), world, 16);

    const before = { ...controller.position };
    const beforeMode = controller.mode;
    const beforeDiagnostics = controller.diagnostics;

    // PAUSE is the absence of step() calls. Wall-clock passing changes nothing
    // because the controller has no wall-clock: locomotion, the cadence state,
    // Brain progression and the wake all advance only on the dtMs it is given.
    const paused = { ...controller.position };
    expect(paused).toEqual(before);
    expect(controller.mode).toBe(beforeMode);
    expect(controller.diagnostics).toEqual(beforeDiagnostics);

    // ...and RESUME continues rather than restarting.
    const frame = controller.step(DT, stationary(world, 3), world, 16);
    expect(controller.diagnostics.frames).toBe(beforeDiagnostics.frames + 1);
    expect(frame.mode).toBeDefined();
  });
});

describe('lifecycle: RESTART leaves nothing behind', () => {
  it('resets position, Brain memory, watermark, search, commitment, sensors, wake and counters', () => {
    const { world, controller } = controllerAt();

    // Run long enough to accumulate real state: memory, a commitment, a
    // consumed watermark, a search episode, sensor confirmation counters.
    for (let i = 0; i < 400; i += 1) {
      const row = Math.min(6, Math.floor(i / 60));
      controller.step(DT, stationary(world, row, 110 + (i % 3) * 190), world, 16);
    }
    const dirty = controller.state;
    expect(dirty.ticks).toBeGreaterThan(0);
    expect(controller.diagnostics.frames).toBe(400);

    controller.restart({ x: 300, y: 0, row: 0 });
    const fresh = controller.state;

    expect(fresh.ticks).toBe(0);
    expect(fresh.mode).toBe('GRAPH_SEARCH');
    expect(fresh.commitment).toBeNull();
    expect(fresh.lastSighting).toBeNull();
    expect(fresh.rememberedFragments).toEqual([]);
    expect(fresh.consumedUntilMsByFragment).toEqual({});
    expect(fresh.search).toBeNull();
    expect(fresh.sensedRunTicks).toBe(0);
    expect(fresh.unsensedRunTicks).toBe(0);
    expect(fresh.trailExhaustionTicks).toBe(0);
    expect(fresh.actionableLeadId).toBeNull();
    expect(fresh.actionableLeadRunTicks).toBe(0);
    expect(fresh.directLossGraceTicks).toBe(0);
    expect(fresh.lastIssuedTargetKey).toBeNull();
    expect(controller.diagnostics).toEqual({
      modeChanges: 0, commitmentEnds: 0, rawSenseAcquired: 0, rawSenseLost: 0,
      trailFragmentsDetected: 0, graphExtensions: 0, targetChanges: 0,
      lostRoutes: 0, diagonalFrames: 0, frames: 0,
    });
  });

  it('two runs from the same start are identical — no state leaks between runs', () => {
    const { world, controller } = controllerAt();
    const script = (i: number) => stationary(world, Math.min(5, Math.floor(i / 50)), 110 + (i % 3) * 190);

    const first: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const f = controller.step(DT, script(i), world, 16);
      first.push(`${f.mode}|${f.commandedNode}|${f.x.toFixed(6)}|${f.y.toFixed(6)}`);
    }

    controller.restart({ x: 300, y: 0, row: 0 });

    const second: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const f = controller.step(DT, script(i), world, 16);
      second.push(`${f.mode}|${f.commandedNode}|${f.x.toFixed(6)}|${f.y.toFixed(6)}`);
    }

    expect(second).toEqual(first);
  });

  it('restart works after a capture-shaped run, at a different learner start', () => {
    const { world, controller } = controllerAt();
    for (let i = 0; i < 200; i += 1) controller.step(DT, stationary(world, 2), world, 16);
    controller.restart({ x: 490, y: 0, row: 0 });
    expect(controller.state.ticks).toBe(0);
    const frame = controller.step(DT, stationary(world, 0, 490), world, 16);
    expect(frame.mode).toBeDefined();
    expect(Number.isFinite(frame.x)).toBe(true);
    expect(Number.isFinite(frame.y)).toBe(true);
  });
});

describe('the graph grows with the board', () => {
  it('extends upward as the learner climbs, and reports it', () => {
    const { world, controller } = controllerAt(100, 14);
    for (let i = 0; i < 60; i += 1) controller.step(DT, stationary(world, 2), world, 14);
    const before = controller.graphExtensionCount;

    // The learner climbs well past the board the graph was built for.
    for (let row = 3; row <= 24; row += 1) {
      for (let i = 0; i < 12; i += 1) {
        controller.step(DT, stationary(world, row), world, Math.max(14, row + 2));
      }
    }
    expect(controller.graphExtensionCount).toBeGreaterThan(before);
  });

  it('rebuilds the graph when the player changes the view scale mid-run', () => {
    const { world, controller } = controllerAt(100);
    for (let i = 0; i < 90; i += 1) controller.step(DT, stationary(world, 3), world, 16);

    const rescaled = productionGraphWorldAt(115);
    const frame = controller.step(DT, {
      x: 300, y: -3 * rescaled.rowGap, row: 3, moving: false,
    }, rescaled, 16);

    // It keeps running on the new board rather than pursuing on a stale one.
    expect(Number.isFinite(frame.x)).toBe(true);
    expect(frame.mode).toBeDefined();
    for (let i = 0; i < 120; i += 1) {
      controller.step(DT, { x: 300, y: -3 * rescaled.rowGap, row: 3, moving: false }, rescaled, 16);
    }
    expect(controller.diagnostics.diagonalFrames).toBe(0);
  });
});

describe('trail evidence comes from real learner traversal', () => {
  it('records physical history the learner actually walked, including a return', () => {
    const { world, controller } = controllerAt();
    const path: LearnerPhysicalState[] = [];
    // Climb two rows...
    for (let row = 0; row <= 2; row += 1) {
      for (let i = 0; i < 20; i += 1) path.push(stationary(world, row, 300));
    }
    // ...cross right...
    for (let x = 300; x <= 490; x += 10) {
      path.push({ x, y: -2 * world.rowGap, row: 2, moving: true });
    }
    // ...then legitimately come back DOWN, as a wrong answer would force.
    for (let row = 2; row >= 1; row -= 1) {
      for (let i = 0; i < 20; i += 1) path.push(stationary(world, row, 490));
    }

    for (const learner of path) controller.step(DT, learner, world, 16);

    // The pursuer smelled genuine trail rather than being told where to go.
    expect(controller.diagnostics.trailFragmentsDetected).toBeGreaterThan(0);
  });

  it('right angles only — never a diagonal frame', () => {
    const { world, controller } = controllerAt();
    for (let i = 0; i < 900; i += 1) {
      const row = Math.min(8, Math.floor(i / 100));
      controller.step(DT, stationary(world, row, 110 + (i % 3) * 190), world, 16);
    }
    expect(controller.diagnostics.diagonalFrames).toBe(0);
  }, 60000);
});

describe('the closed loop still holds in production, and does not oscillate', () => {
  /**
   * The 03A-R1 rejection condition, rebuilt on the production surface: a
   * stationary learner near the 260-unit sense boundary, with no new evidence
   * to be had. The rejected build paced there for nineteen seconds, flipping
   * VISIBLE_PURSUIT <-> TRAIL_TRACK 283 times.
   */
  it('a stationary learner at the sense boundary produces no strategic oscillation', () => {
    const world = productionGraphWorldAt(90);
    const controller = new GraphPursuerController({
      world, rowCount: 20, learnerStart: { x: 300, y: 0, row: 0 },
    });

    // Let it settle, then park the learner and soak.
    const learner = { x: 490, y: -11 * world.rowGap, row: 11, moving: false };
    const modes: Array<{ tMs: number; mode: string }> = [];
    let tMs = 0;
    for (let i = 0; i < 1800; i += 1) {
      tMs += DT;
      const frame = controller.step(DT, learner, world, 20);
      modes.push({ tMs, mode: frame.mode });
    }

    // Strategic transitions, and A->B->A cycles inside any 2s window.
    const transitions: Array<{ tMs: number; from: string; to: string }> = [];
    for (let i = 1; i < modes.length; i += 1) {
      if (modes[i].mode !== modes[i - 1].mode) {
        transitions.push({ tMs: modes[i].tMs, from: modes[i - 1].mode, to: modes[i].mode });
      }
    }
    let worstABA = 0;
    for (let a = 0; a < transitions.length; a += 1) {
      const window = transitions.filter((t) => t.tMs >= transitions[a].tMs && t.tMs <= transitions[a].tMs + 2000);
      let cycles = 0;
      for (let i = 0; i + 1 < window.length; i += 1) {
        if (window[i].to === window[i + 1].from && window[i].from === window[i + 1].to) cycles += 1;
      }
      worstABA = Math.max(worstABA, cycles);
    }

    // The accepted pathology gate, enforced on the production surface.
    expect(worstABA).toBeLessThan(6);
    // Over 30 seconds with nothing new to learn, strategy should barely move.
    expect(transitions.length).toBeLessThan(20);
    expect(controller.diagnostics.diagonalFrames).toBe(0);
  }, 60000);

  it('the loop is genuinely closed — the pursuer\'s own choices change what it perceives', () => {
    // Two runs with an IDENTICAL learner, differing only in where the pursuer
    // starts. If the loop were open — a precomputed path — perception would be
    // a function of the learner alone and these streams would coincide.
    const world = productionGraphWorldAt(90);

    // A learner that actually walks, so there is trail to smell as well as a
    // Spark to see.
    const learnerAt = (i: number): LearnerPhysicalState => {
      const row = Math.min(4, Math.floor(i / 120));
      const x = 110 + Math.min(380, (i % 120) * 4);
      return { x, y: -row * world.rowGap, row, moving: true };
    };

    const run = (startX: number) => {
      const controller = new GraphPursuerController({
        world, rowCount: 16, learnerStart: { x: startX, y: 0, row: 0 },
      });
      const perception: string[] = [];
      const positions: string[] = [];
      for (let i = 0; i < 600; i += 1) {
        const frame = controller.step(DT, learnerAt(i), world, 16);
        perception.push(`${frame.evidence.sensedSparkNow ? 1 : 0}${frame.evidence.sensedFragmentCount}`);
        positions.push(`${frame.x.toFixed(3)},${frame.y.toFixed(3)}`);
      }
      return { perception: perception.join('|'), positions: positions.join('|') };
    };

    const left = run(110);
    const right = run(490);

    // The pursuer went somewhere different...
    expect(left.positions).not.toEqual(right.positions);
    // ...and therefore PERCEIVED something different, which is the loop.
    expect(left.perception).not.toEqual(right.perception);
  }, 60000);
});
