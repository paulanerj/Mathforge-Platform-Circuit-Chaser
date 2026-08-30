import { describe, it, expect } from 'vitest';
import { createPursuer, updatePursuer } from '../pursuer/circuitClimbPursuer';
import type { PursuerStep } from '../pursuer/circuitClimbPursuerTrace';
import {
  BASELINE_PURSUER_TUNING,
  ALIVE_PURSUER_TUNING,
  clampTuning,
  PURSUER_TUNING_RANGES,
  PursuerTuningKey,
} from '../pursuer/circuitClimbPursuerTuning';
import { defaultTestGeometry } from './support/circuitClimbProductionFixtures';
import {
  CIRCUIT_CLIMB_GEOMETRY as CONFIG,
  computePlatformCollisionRects,
} from '../geometry/circuitClimbGeometry';

function makeProductionRow(index: number) {
  return CONFIG.columns.map((fraction, column) => ({
    id: `row-${index}-column-${column}`,
    row: index,
    column,
    x: fraction * CONFIG.logicalWidth,
    y: -index * CONFIG.rowGap,
    width: CONFIG.platformWidth,
    height: CONFIG.platformHeight,
    value: null as number | null,
    correct: false,
    dead: false,
    powered: false,
    selected: false,
    litAt: -1000,
  }));
}
const restingOn = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - CONFIG.playerRadius - 3 });
const bandOf = (p: any) => computePlatformCollisionRects([p], CONFIG.playerRadius)[0];

describe('Pursuer tuning presets', () => {
  it('createPursuer defaults to the frozen baseline, so untouched callers keep the locked behaviour', () => {
    expect(createPursuer(300, 0, undefined, defaultTestGeometry()).tuning).toBe(BASELINE_PURSUER_TUNING);
  });

  it('baseline tuning never leaves CHASE and never varies its speed', () => {
    const row = makeProductionRow(1);
    const player = restingOn(row[0]);
    let pursuer = createPursuer(row[1].x, 0, undefined, defaultTestGeometry());
    pursuer.y = bandOf(row[1]).bottom + 200;

    const behaviours = new Set<string>();
    const scales = new Set<number>();
    for (let frame = 0; frame < 200; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16, (step) => {
        behaviours.add(step.behaviour);
        scales.add(Number(step.speedScale.toFixed(6)));
      });
    }
    expect([...behaviours]).toEqual(['CHASE']);
    expect([...scales]).toEqual([1]);
  });

  it('the presets are distinct in the ways that matter', () => {
    expect(ALIVE_PURSUER_TUNING.senseRadius).toBeLessThan(BASELINE_PURSUER_TUNING.senseRadius);
    expect(ALIVE_PURSUER_TUNING.chaseSpeed).toBeGreaterThan(ALIVE_PURSUER_TUNING.searchSpeed);
    expect(ALIVE_PURSUER_TUNING.wanderAmplitude).toBeGreaterThan(0);
    expect(ALIVE_PURSUER_TUNING.reacquireOnPlayerMove).toBe(true);
  });

  it('clampTuning keeps every slider inside its range and the lock losable', () => {
    const wild = clampTuning({
      ...ALIVE_PURSUER_TUNING,
      searchSpeed: 99,
      chaseSpeed: -5,
      wanderAmplitude: 10_000,
      senseRadius: 800,
      loseRadius: 100, // below senseRadius: a lock that could never be lost
    });
    (Object.keys(PURSUER_TUNING_RANGES) as PursuerTuningKey[]).forEach((key) => {
      const range = PURSUER_TUNING_RANGES[key];
      expect(wild[key]).toBeGreaterThanOrEqual(range.min);
      expect(wild[key]).toBeLessThanOrEqual(range.max);
    });
    expect(wild.loseRadius).toBeGreaterThan(wild.senseRadius);
  });
});

describe('Pursuer SEARCH / ALERT / CHASE', () => {
  const row = makeProductionRow(1);
  const player = restingOn(row[0]);

  function alive(x: number, y: number) {
    const p = createPursuer(x, y, ALIVE_PURSUER_TUNING, defaultTestGeometry());
    p.y = y;
    return p;
  }

  it('a distant player leaves it searching', () => {
    const pursuer = alive(row[1].x, player.y + ALIVE_PURSUER_TUNING.senseRadius + 400);
    let step: PursuerStep | undefined;
    updatePursuer(pursuer, player, row, 16, (s) => { step = s; });
    expect(step!.behaviour).toBe('SEARCH');
  });

  it('coming within the sense radius raises ALERT, and hesitation resolves into CHASE', () => {
    let pursuer = alive(player.x, player.y + ALIVE_PURSUER_TUNING.senseRadius - 40);

    let first: PursuerStep | undefined;
    pursuer = updatePursuer(pursuer, player, [], 16, (s) => { first = s; });
    expect(first!.behaviour).toBe('ALERT');

    const dwellFrames = Math.ceil(ALIVE_PURSUER_TUNING.alertDwellMs / 16) + 1;
    let last: PursuerStep | undefined;
    for (let frame = 0; frame < dwellFrames; frame += 1) {
      pursuer = updatePursuer(pursuer, player, [], 16, (s) => { last = s; });
      if (pursuer.state === 'CAUGHT') break;
    }
    expect(['CHASE', 'ALERT']).toContain(last!.behaviour);
    expect(pursuer.behaviour === 'CHASE' || pursuer.state === 'CAUGHT').toBe(true);
  });

  it('it barely moves while hesitating', () => {
    const pursuer = alive(player.x, player.y + ALIVE_PURSUER_TUNING.senseRadius - 40);
    let step: PursuerStep | undefined;
    updatePursuer(pursuer, player, [], 16, (s) => { step = s; });
    expect(step!.behaviour).toBe('ALERT');
    expect(step!.speedScale).toBeLessThan(0.4);
  });

  it('a travelling spark breaks the lock and it falls back on the last sighting', () => {
    let pursuer = alive(player.x, player.y + 60);
    for (let frame = 0; frame < 60; frame += 1) {
      pursuer = updatePursuer(pursuer, player, [], 16);
      if (pursuer.behaviour === 'CHASE') break;
    }
    expect(pursuer.behaviour).toBe('CHASE');

    let step: PursuerStep | undefined;
    pursuer = updatePursuer(pursuer, { ...player, traveling: true }, [], 16, (s) => { step = s; });
    expect(step!.behaviour).toBe('SEARCH');
    expect(step!.lastKnown.x).toBeCloseTo(player.x, 3);
    expect(step!.lastKnown.y).toBeCloseTo(player.y, 3);
  });

  it('losing the player at distance drops it back to SEARCH', () => {
    let pursuer = alive(player.x, player.y + 60);
    for (let frame = 0; frame < 60 && pursuer.behaviour !== 'CHASE'; frame += 1) {
      pursuer = updatePursuer(pursuer, player, [], 16);
    }
    expect(pursuer.behaviour).toBe('CHASE');

    const faraway = { x: player.x, y: player.y - ALIVE_PURSUER_TUNING.loseRadius - 200 };
    let step: PursuerStep | undefined;
    updatePursuer(pursuer, faraway, [], 16, (s) => { step = s; });
    expect(step!.behaviour).toBe('SEARCH');
  });

  it('while searching it sweeps either side of its guess rather than tracking the player', () => {
    const pursuer = alive(row[1].x, player.y + ALIVE_PURSUER_TUNING.senseRadius + 500);
    const offsets: number[] = [];
    let running = pursuer;
    for (let frame = 0; frame < 260; frame += 1) {
      running = updatePursuer(running, player, [], 16, (s) => {
        offsets.push(s.desired.x - s.lastKnown.x);
      });
    }
    // It commits to a side and holds it, so both sides must appear across the run.
    expect(Math.max(...offsets)).toBeGreaterThan(10);
    expect(Math.min(...offsets)).toBeLessThan(-10);
    expect(new Set(offsets.map((o) => Math.sign(o))).size).toBe(2);
  });

  it('its speed surges and eases instead of holding one value', () => {
    const pursuer = alive(row[1].x, player.y + ALIVE_PURSUER_TUNING.senseRadius + 500);
    const scales: number[] = [];
    let running = pursuer;
    for (let frame = 0; frame < 260; frame += 1) {
      running = updatePursuer(running, player, [], 16, (s) => { scales.push(s.speedScale); });
    }
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.3);
    expect(Math.min(...scales)).toBeGreaterThan(0);
  });

  it('is deterministic: identical inputs replay identically', () => {
    const run = () => {
      let p = alive(row[1].x, player.y + 500);
      const path: number[] = [];
      for (let frame = 0; frame < 150; frame += 1) {
        p = updatePursuer(p, player, row, 16);
        path.push(Number(p.x.toFixed(6)), Number(p.y.toFixed(6)));
      }
      return path;
    };
    expect(run()).toEqual(run());
  });
});

describe('The living pursuer still obeys the locked physics', () => {
  const row = makeProductionRow(1);
  const player = restingOn(row[0]);

  it('never ends a frame inside a platform', () => {
    let pursuer = createPursuer(row[1].x, 0, ALIVE_PURSUER_TUNING, defaultTestGeometry());
    pursuer.y = bandOf(row[1]).bottom + 4;
    const bands = row.map(bandOf);

    for (let frame = 0; frame < 900; frame += 1) {
      pursuer = updatePursuer(pursuer, player, row, 16);
      for (const b of bands) {
        const inside =
          pursuer.x > b.left && pursuer.x < b.right &&
          pursuer.y > b.top && pursuer.y < b.bottom;
        expect(inside).toBe(false);
      }
    }
  });

  it('still reaches and captures a player standing on a platform', () => {
    const standing = { ...player, platform: row[0] };
    let pursuer = createPursuer(row[1].x, 0, ALIVE_PURSUER_TUNING, defaultTestGeometry());
    pursuer.y = bandOf(row[1]).bottom + 4;

    for (let frame = 0; frame < 4000 && pursuer.state !== 'CAUGHT'; frame += 1) {
      pursuer = updatePursuer(pursuer, standing, row, 16);
    }
    expect(pursuer.state).toBe('CAUGHT');
  });

  it('stays inside the world bounds while sweeping', () => {
    let pursuer = createPursuer(row[1].x, 0, {
      ...ALIVE_PURSUER_TUNING,
      wanderAmplitude: 260, // widest the panel allows
    }, defaultTestGeometry());
    pursuer.y = bandOf(row[1]).bottom + 600;

    for (let frame = 0; frame < 600; frame += 1) {
      pursuer = updatePursuer(pursuer, { x: 300, y: -4000 }, row, 16);
      expect(pursuer.x).toBeGreaterThanOrEqual(pursuer.radius + 6);
      expect(pursuer.x).toBeLessThanOrEqual(CONFIG.logicalWidth - pursuer.radius - 6);
    }
  });
});
