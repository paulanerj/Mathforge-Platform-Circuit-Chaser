/**
 * GRAPH_V2's own locomotion cadence. Written from scratch; it shares no code
 * and no constants with the legacy locomotion module.
 *
 * The character asked for is bursts of travel broken by irregular stops —
 * move move stop / move / stop stop / move move move — and the way to get that
 * without it reading as a metronome is to DRAW each duration rather than
 * alternate on a fixed beat. Every burst and every pause is sampled from a
 * bounded range, and whether a burst is followed by a pause at all is its own
 * draw, so runs of movement and runs of stillness both occur naturally.
 *
 * The generator is a seeded PRNG, so a scenario replays identically. That is a
 * requirement, not a convenience: every parity and stress test in this lab
 * depends on the same seed producing the same run.
 *
 * One hard rule, and it is the whole reason this is a separate concern from
 * routing: a pause spends no distance and touches nothing else. It cannot clear
 * the route, change the target, pick a different edge, or move the actor's
 * graph position. It only decides whether this frame's budget is spent.
 */

export interface GraphCadenceConfig {
  /** Units per millisecond while moving. */
  speed: number;
  minBurstMs: number;
  maxBurstMs: number;
  minPauseMs: number;
  maxPauseMs: number;
  /** Probability that a finished burst is followed by a pause at all. */
  pauseChance: number;
  seed: number;
}

export const DEFAULT_GRAPH_CADENCE: GraphCadenceConfig = {
  // Comparable to the accepted chase feel. LAB 02A is about navigation
  // reliability, not difficulty, so this is a starting point and not a tuning.
  speed: 0.19,
  minBurstMs: 180,
  maxBurstMs: 620,
  minPauseMs: 90,
  maxPauseMs: 380,
  pauseChance: 0.62,
  seed: 0x02a,
};

export type CadencePhase = 'MOVING' | 'HESITATING';

export interface GraphCadenceState {
  phase: CadencePhase;
  /** Milliseconds left in the current burst or pause. */
  remainingMs: number;
  rngState: number;
  /** Diagnostics: how many bursts and pauses have been drawn. */
  bursts: number;
  pauses: number;
}

/**
 * A small integer hash used as the PRNG step.
 *
 * Deliberately written here rather than shared: the legacy engine seeds a
 * mulberry32 and this must not be able to inherit its stream, or a "new"
 * cadence would silently reproduce the old rhythm.
 */
function nextRandom(state: number): { value: number; state: number } {
  let s = (state + 0x9e3779b9) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
  t = t ^ (t >>> 15);
  return { value: (t >>> 0) / 4294967296, state: s };
}

export function createGraphCadence(config: GraphCadenceConfig = DEFAULT_GRAPH_CADENCE): GraphCadenceState {
  // Opens mid-burst rather than at a boundary, so the first frame of a run is
  // not always the same beat of the pattern.
  const first = nextRandom(config.seed | 0);
  const burst = config.minBurstMs + first.value * (config.maxBurstMs - config.minBurstMs);
  return { phase: 'MOVING', remainingMs: burst, rngState: first.state, bursts: 1, pauses: 0 };
}

export interface CadenceStep {
  state: GraphCadenceState;
  /** Distance the actor may travel this frame. Zero while hesitating. */
  budget: number;
  phase: CadencePhase;
}

export function advanceGraphCadence(
  state: GraphCadenceState,
  dtMs: number,
  config: GraphCadenceConfig = DEFAULT_GRAPH_CADENCE,
): CadenceStep {
  let next: GraphCadenceState = { ...state };
  let movingMs = 0;
  let remaining = dtMs;

  // A frame can straddle a phase boundary, so the budget is accumulated across
  // whatever phases it covers rather than attributed to whichever one happens
  // to be current at the start.
  let guard = 0;
  while (remaining > 1e-9 && guard < 64) {
    guard += 1;
    const spend = Math.min(remaining, next.remainingMs);
    if (next.phase === 'MOVING') movingMs += spend;
    next.remainingMs -= spend;
    remaining -= spend;

    if (next.remainingMs > 1e-9) break;

    if (next.phase === 'MOVING') {
      const roll = nextRandom(next.rngState);
      next.rngState = roll.state;
      if (roll.value < config.pauseChance) {
        const draw = nextRandom(next.rngState);
        next.rngState = draw.state;
        next.phase = 'HESITATING';
        next.remainingMs = config.minPauseMs + draw.value * (config.maxPauseMs - config.minPauseMs);
        next.pauses += 1;
      } else {
        // No pause drawn: another burst runs straight on, which is what makes
        // "move move move" happen without it being scripted.
        const draw = nextRandom(next.rngState);
        next.rngState = draw.state;
        next.remainingMs = config.minBurstMs + draw.value * (config.maxBurstMs - config.minBurstMs);
        next.bursts += 1;
      }
    } else {
      const draw = nextRandom(next.rngState);
      next.rngState = draw.state;
      next.phase = 'MOVING';
      next.remainingMs = config.minBurstMs + draw.value * (config.maxBurstMs - config.minBurstMs);
      next.bursts += 1;
    }
  }

  return { state: next, budget: movingMs * config.speed, phase: next.phase };
}

/** A bounded deterministic draw, for lane offsets. Same stream, same rules. */
export function drawInRange(state: number, min: number, max: number): { value: number; state: number } {
  const roll = nextRandom(state);
  return { value: min + roll.value * (max - min), state: roll.state };
}
