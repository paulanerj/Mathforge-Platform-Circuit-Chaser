/**
 * Circuit Climb — pursuer locomotion.
 *
 * WHERE the pursuer is going is decided in circuitClimbPursuer. HOW it spends
 * the time getting there is decided here, and the two must not be able to argue
 * with each other. Everything in this module answers one of two questions about
 * the current frame:
 *
 *   - is the pursuer moving at all, or is it hesitating?
 *   - which single axis is it moving along?
 *
 * Neither question can change the pursuer's target, its committed corridor, or
 * its behaviour state. A hesitating pursuer still senses, still tracks, still
 * holds the corridor it committed to; it simply spends no budget this frame.
 * That separation is the whole point: cadence is allowed to be erratic exactly
 * because it cannot corrupt navigation.
 *
 * Everything is driven by a seeded generator, so a run replays identically and
 * a test can assert on exact sequences rather than on "it looked irregular".
 */

/**
 * The two things the pursuer can be doing with a frame.
 *
 * HESITATING is a real pause, not a slow-down: the frame's whole movement
 * budget is forfeited. It is what makes the pursuer read as nervous rather than
 * as merely slow.
 */
export type LocomotionCadence = 'MOVING' | 'HESITATING';

export type LocomotionAxis = 'x' | 'y';

export interface LocomotionState {
  /** The axis the current leg travels along. */
  axis: LocomotionAxis;
  /** Which way along it: -1, 0 or +1. 0 before the first leg is taken. */
  sign: -1 | 0 | 1;
  /** Milliseconds spent on the current leg. */
  legElapsed: number;
  cadence: LocomotionCadence;
  /** Milliseconds left in the current burst or hesitation. */
  cadenceRemaining: number;
  /** Generator position. Advancing it is the only randomness in the model. */
  rngState: number;
}

/**
 * The locomotion half of the tuning. A subset of PursuerTuning, taken
 * structurally so this module owns no tuning of its own and cannot drift from
 * the struct the dev panel drives.
 */
export interface LocomotionTuning {
  /** 0 disables leg commitment entirely and restores per-frame axis mixing. */
  legPeriodMs: number;
  /** 0 disables hesitation entirely. Higher pauses more often and less evenly. */
  agitation: number;
  /** Fraction of leg time reserved for climbing rather than sideways travel. */
  climbReserve: number;
}

/**
 * mulberry32. Small, fast, and good enough for cadence — this decides when a
 * bot twitches, not anything a player could exploit. It is here rather than
 * Math.random precisely so that every test can pin an exact sequence.
 */
function nextRandom(state: number): { value: number; state: number } {
  let a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a };
}

export function createLocomotion(seed: number): LocomotionState {
  return {
    axis: 'x',
    sign: 0,
    legElapsed: 0,
    cadence: 'MOVING',
    cadenceRemaining: 0,
    rngState: Math.floor(Math.abs(seed) * 104729) >>> 0,
  };
}

/**
 * How long a burst of movement or a hesitation lasts.
 *
 * Both are drawn from a bounded band rather than a fixed length, and the bands
 * move in opposite directions as agitation rises: bursts get shorter, pauses
 * get longer and more frequent. The point is temporal instability within
 * controlled bounds — never a duration of zero, which would produce a stutter
 * indistinguishable from the regular one it replaces, and never a pause long
 * enough for the pursuer to read as broken.
 */
const MIN_BURST_MS = 90;
const MAX_HESITATION_MS = 420;

export function burstDurationMs(agitation: number, random: number): number {
  const strength = Math.max(0, Math.min(1, agitation));
  // 900ms of unbroken travel at rest, down to ~200ms when fully agitated.
  const centre = 900 - 700 * strength;
  return Math.max(MIN_BURST_MS, centre * (0.45 + 1.1 * random));
}

export function hesitationDurationMs(agitation: number, random: number): number {
  const strength = Math.max(0, Math.min(1, agitation));
  const centre = 70 + 190 * strength;
  return Math.min(MAX_HESITATION_MS, Math.max(40, centre * (0.4 + 1.2 * random)));
}

/**
 * Whether a burst is followed by another burst or by a pause.
 *
 * This is what stops the cadence alternating. At any agitation there is a real
 * chance of running two or three bursts together, and a real chance of pausing
 * twice in a row with only a short burst between — so the sequence wanders
 * instead of ticking. At agitation 0 the chance is zero and the pursuer never
 * pauses at all, which is what the frozen baseline does.
 */
export function hesitationChance(agitation: number): number {
  const strength = Math.max(0, Math.min(1, agitation));
  return strength * 0.72;
}

/**
 * Advance the cadence clock by one frame.
 *
 * Returns whether the pursuer may move this frame. The caller is expected to
 * carry on updating everything else about the pursuer either way.
 */
export function advanceCadence(
  state: LocomotionState,
  delta: number,
  tuning: LocomotionTuning,
): { moving: boolean; state: LocomotionState } {
  const next = { ...state };

  if (!(tuning.agitation > 0)) {
    // Frozen behaviour: no hesitation model at all, and the generator is not
    // advanced, so a tuning with agitation 0 is bit-for-bit what it always was.
    next.cadence = 'MOVING';
    next.cadenceRemaining = 0;
    return { moving: true, state: next };
  }

  next.cadenceRemaining -= delta;
  if (next.cadenceRemaining <= 0) {
    if (next.cadence === 'HESITATING') {
      // A pause always ends in movement. Two pauses back to back would be one
      // long pause with a seam in it, and would read as a freeze.
      const draw = nextRandom(next.rngState);
      next.rngState = draw.state;
      next.cadence = 'MOVING';
      next.cadenceRemaining = burstDurationMs(tuning.agitation, draw.value);
    } else {
      const choice = nextRandom(next.rngState);
      next.rngState = choice.state;
      if (choice.value < hesitationChance(tuning.agitation)) {
        const draw = nextRandom(next.rngState);
        next.rngState = draw.state;
        next.cadence = 'HESITATING';
        next.cadenceRemaining = hesitationDurationMs(tuning.agitation, draw.value);
      } else {
        const draw = nextRandom(next.rngState);
        next.rngState = draw.state;
        next.cadence = 'MOVING';
        next.cadenceRemaining = burstDurationMs(tuning.agitation, draw.value);
      }
    }
  }

  return { moving: next.cadence === 'MOVING', state: next };
}

/**
 * The share of time the pursuer spends moving, at a given agitation.
 *
 * Both duration draws are uniform over their band and both bands are centred on
 * 1.0, so the expected burst and hesitation are just their centres, and the
 * expected hesitation per burst is that centre times the chance of taking one.
 *
 * This exists so that agitation can change WHEN the pursuer moves without
 * changing HOW FAR it gets. Without the compensation it derives, agitation is a
 * hidden speed cut: at 0.55 the pursuer forfeits about an eighth of its travel,
 * which took the live search speed from 0.130 to 0.114 — under the 0.1214 the
 * learner's own climb rate demands — and the pursuit died in exactly the way
 * 05B was opened to fix. Nervousness is a rhythm, not a handicap.
 */
export function movingDutyCycle(agitation: number): number {
  const strength = Math.max(0, Math.min(1, agitation));
  if (strength <= 0) return 1;
  const burst = Math.max(MIN_BURST_MS, 900 - 700 * strength);
  const hesitation = Math.min(MAX_HESITATION_MS, Math.max(40, 70 + 190 * strength));
  return burst / (burst + hesitationChance(strength) * hesitation);
}

/**
 * What to multiply a moving frame's budget by so that the average speed over a
 * burst-and-pause cycle matches the configured speed.
 */
export function cadenceSpeedCompensation(agitation: number): number {
  return 1 / movingDutyCycle(agitation);
}

export interface AxisIntent {
  /** Signed distance still wanted on each axis. */
  x: number;
  y: number;
  /** Axes that collision refused on the previous frame. */
  blockedX: boolean;
  blockedY: boolean;
}

/** Below this an intent is treated as satisfied rather than as a real leg. */
const INTENT_EPSILON = 0.1;

/**
 * How long the current axis may hold the leg before the other axis gets a turn.
 *
 * `climbReserve` already means "the share of movement held back from sideways
 * travel", so it maps straight onto leg time: sideways legs get the rest of it.
 * Each axis keeps a floor, because an axis that never gets a leg is an axis the
 * pursuer can never make progress on — that is how a pursuer stops climbing.
 */
export function legBudgetMs(axis: LocomotionAxis, tuning: LocomotionTuning): number {
  const reserve = Math.max(0, Math.min(0.95, tuning.climbReserve || 0));
  const share = axis === 'y' ? reserve : 1 - reserve;
  return tuning.legPeriodMs * Math.max(0.2, share);
}

/**
 * Pick the axis for this frame, holding the current leg where possible.
 *
 * A leg ends when its intent is spent, when collision refused it, or when its
 * time is up — the same three reasons a person walking a corner turns. Holding
 * it is what gives the pursuer the player's own movement language: long
 * horizontal runs and long vertical runs meeting at right angles, rather than
 * the two mixed every frame into a drift no one reads as either.
 *
 * `legPeriodMs` of 0 turns the whole model off and returns the axis the caller
 * would have moved on anyway, so the frozen baseline is untouched.
 */
export function chooseLegAxis(
  state: LocomotionState,
  intent: AxisIntent,
  delta: number,
  tuning: LocomotionTuning,
): { axis: LocomotionAxis; sign: -1 | 0 | 1; changed: boolean; state: LocomotionState } {
  const next = { ...state };
  const wants = (axis: LocomotionAxis) =>
    Math.abs(axis === 'x' ? intent.x : intent.y) > INTENT_EPSILON;
  const refused = (axis: LocomotionAxis) => (axis === 'x' ? intent.blockedX : intent.blockedY);
  const signOf = (axis: LocomotionAxis): -1 | 0 | 1 => {
    const value = axis === 'x' ? intent.x : intent.y;
    return (Math.abs(value) > INTENT_EPSILON ? Math.sign(value) : 0) as -1 | 0 | 1;
  };

  if (!(tuning.legPeriodMs > 0)) {
    // Per-frame mixing, as before. Still reports a direction so the turn seam
    // works at every tuning, but never holds a leg.
    const axis: LocomotionAxis = wants('x') && !refused('x') ? 'x' : 'y';
    const sign = signOf(axis);
    const changed = axis !== state.axis || (sign !== 0 && sign !== state.sign);
    next.axis = axis;
    next.sign = sign;
    next.legElapsed = 0;
    return { axis, sign, changed, state: next };
  }

  next.legElapsed += delta;

  const current = state.axis;
  const other: LocomotionAxis = current === 'x' ? 'y' : 'x';

  const legSpent = next.legElapsed >= legBudgetMs(current, tuning);
  const legDone = !wants(current) || refused(current) || legSpent;

  let axis = current;
  if (legDone && wants(other) && !refused(other)) {
    axis = other;
  } else if (legDone && !wants(current)) {
    // Nothing wanted on either axis, or the other is refused too. Prefer an
    // axis that still has somewhere to go rather than holding a spent leg.
    axis = wants(other) ? other : current;
  }

  if (axis !== current) next.legElapsed = 0;

  const sign = signOf(axis);
  // A turn is a change of axis, or a reversal along the same one. Holding
  // course reports no change however many frames the leg runs for, so a caller
  // can drive a sound from it without gating or debouncing.
  const changed = axis !== state.axis || (sign !== 0 && sign !== state.sign);

  next.axis = axis;
  if (sign !== 0) next.sign = sign;
  return { axis, sign, changed, state: next };
}
