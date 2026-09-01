/**
 * Circuit Climb — pursuer tuning.
 *
 * Every number that shapes how the pursuer feels lives here, in one struct, so
 * it can be driven from the dev panel and later from a difficulty setting
 * without touching navigation code. Navigation itself — corridors, collision,
 * capture distance — is NOT tunable: it is physics, and it is locked.
 */

export interface PursuerTuning {
  /** World units per ms while it has not locked on. */
  searchSpeed: number;
  /** World units per ms once locked on. */
  chaseSpeed: number;
  /** Locks on when the player comes within this distance. */
  senseRadius: number;
  /** Loses the lock when the player gets further away than this. */
  loseRadius: number;
  /** How long it hesitates between sensing the player and committing. */
  alertDwellMs: number;
  /** Lateral sweep while searching, in world units either side of its guess. */
  wanderAmplitude: number;
  /** Period of that sweep, in ms. Shorter reads as more frantic. */
  wanderPeriodMs: number;
  /**
   * 0 = constant speed. Higher surges and eases more.
   *
   * Speed only. It never reaches zero, so it cannot produce a pause — pausing
   * is `agitation`'s job, and keeping the two apart is what stopped raising
   * this one from simply exaggerating a move/stop metronome.
   */
  speedJitter: number;
  /**
   * How nervous the locomotion is: 0 never hesitates, 1 hesitates often and
   * unevenly. It sets pause propensity and the spread of burst and hesitation
   * lengths, not a cadence — the sequence itself is drawn, so it wanders
   * instead of alternating. It cannot affect where the pursuer is going.
   */
  agitation: number;
  /**
   * How long the pursuer commits to one axis before the other may have a turn,
   * in ms. This is what gives it the learner's orthogonal movement language:
   * runs along one axis meeting at right angles, rather than both axes mixed
   * every frame into a diagonal drift. 0 restores per-frame mixing.
   */
  legPeriodMs: number;
  /**
   * When true, a travelling spark breaks the lock: the pursuer drops to the
   * player's last known position and has to pick the trail up again.
   */
  reacquireOnPlayerMove: boolean;
  /**
   * Fraction of each frame's movement budget held back from sideways motion.
   *
   * Without this a wide, quick sweep outruns the pursuer: the target crosses
   * faster than it can follow, every frame's budget is spent chasing it
   * sideways, and it vibrates in place instead of climbing. 0 reproduces the
   * frozen baseline, where sideways motion may consume the whole frame.
   */
  climbReserve: number;
}

/**
 * PURSUER BASELINE 01, frozen at commit 0eff8f8.
 *
 * Sensing off, no hesitation, no sweep, no speed variation: a pursuer that has
 * always seen the player and moves at one constant speed. This reproduces the
 * locked behaviour exactly and is what `createPursuer` uses unless something
 * asks for otherwise, so the capability lock suite keeps testing the frozen
 * behaviour no matter what the live tuning becomes.
 */
export const BASELINE_PURSUER_TUNING: Readonly<PursuerTuning> = Object.freeze({
  searchSpeed: 0.08,
  chaseSpeed: 0.08,
  senseRadius: Infinity,
  loseRadius: Infinity,
  alertDwellMs: 0,
  wanderAmplitude: 0,
  wanderPeriodMs: 1000,
  speedJitter: 0,
  agitation: 0,
  legPeriodMs: 0,
  reacquireOnPlayerMove: false,
  climbReserve: 0,
});

/**
 * Starting point for the living pursuer. Deliberately provisional — these are
 * the numbers the dev panel exists to argue with.
 *
 * `searchSpeed` is the continuity setting, not `chaseSpeed`.
 *
 * The pursuer spends nearly the whole run in SEARCH: acquisition needs the
 * learner inside `senseRadius`, and closing that distance is itself a SEARCH
 * job. At 0.095 it was travelling at almost exactly the learner's own average
 * climb rate — 205 units per (travel + think) cycle is 0.0956 u/ms at a
 * 1200 ms think, against a 0.095 search speed — so the gap froze wherever the
 * opening transient left it, about two rows, and never re-entered sensing
 * range. The pursuer then trailed the climb forever without ever chasing:
 * visible, moving, and permanently harmless. That is the "it gives up after
 * about five moves" report; five is where the spawn transient ends and the
 * speed-matched equilibrium begins.
 *
 * Measured over 20 landings, share of frames spent in CHASE:
 *
 *            fast(300ms)  brisk(800ms)  typical(1200ms)  slow(2000ms)
 *   0.095        0%            0%              0%             27%
 *   0.130        0%            9%             21%             34%
 *
 * Raising `chaseSpeed` does not move those numbers at all — the pursuer is not
 * in CHASE to benefit. Raising `senseRadius` does not either: a wider radius
 * grabs a lock the pursuer cannot hold, and it drops straight back out.
 *
 * A genuinely fast learner still escapes at every value tested, which is the
 * product rule; 0.130 buys presence at ordinary pace without removing that.
 */
export const ALIVE_PURSUER_TUNING: Readonly<PursuerTuning> = Object.freeze({
  searchSpeed: 0.13,
  // Live chase pace, +20% over the previous 0.16 at PM request.
  chaseSpeed: 0.192,
  senseRadius: 260,
  loseRadius: 420,
  alertDwellMs: 260,
  wanderAmplitude: 80,
  wanderPeriodMs: 2200,
  speedJitter: 0.45,
  // Frantic, not stuttering: bursts of travel broken by short irregular
  // hesitations, drawn rather than alternated.
  agitation: 0.55,
  // Long enough to read as a leg at the live chase pace — 0.192 u/ms over
  // ~230ms of horizontal share is about 44 units of unbroken travel — and
  // short enough that the pursuer still turns often while threading a row.
  legPeriodMs: 420,
  reacquireOnPlayerMove: true,
  climbReserve: 0.45,
});

export type PursuerTuningPreset = 'baseline' | 'alive';

export const PURSUER_TUNING_PRESETS: Record<PursuerTuningPreset, Readonly<PursuerTuning>> = {
  baseline: BASELINE_PURSUER_TUNING,
  alive: ALIVE_PURSUER_TUNING,
};

/** Slider bounds for the dev panel. Ranges, not policy. */
export const PURSUER_TUNING_RANGES = {
  searchSpeed: { min: 0.01, max: 0.3, step: 0.005, label: 'Search speed', unit: 'u/ms' },
  chaseSpeed: { min: 0.01, max: 0.4, step: 0.005, label: 'Chase speed', unit: 'u/ms' },
  senseRadius: { min: 60, max: 900, step: 10, label: 'Sense radius', unit: 'u' },
  loseRadius: { min: 80, max: 1200, step: 10, label: 'Lose-lock radius', unit: 'u' },
  alertDwellMs: { min: 0, max: 1200, step: 20, label: 'Alert hesitation', unit: 'ms' },
  wanderAmplitude: { min: 0, max: 260, step: 5, label: 'Search sweep', unit: 'u' },
  wanderPeriodMs: { min: 300, max: 4000, step: 50, label: 'Sweep period', unit: 'ms' },
  speedJitter: { min: 0, max: 1, step: 0.05, label: 'Speed jitter', unit: '' },
  agitation: { min: 0, max: 1, step: 0.05, label: 'Agitation', unit: '' },
  legPeriodMs: { min: 0, max: 1200, step: 20, label: 'Leg period', unit: 'ms' },
  climbReserve: { min: 0, max: 0.9, step: 0.05, label: 'Climb reserve', unit: '' },
} as const;

export type PursuerTuningKey = keyof typeof PURSUER_TUNING_RANGES;

export function clampTuning(tuning: PursuerTuning): PursuerTuning {
  const next = { ...tuning };
  (Object.keys(PURSUER_TUNING_RANGES) as PursuerTuningKey[]).forEach((key) => {
    const range = PURSUER_TUNING_RANGES[key];
    const value = Number(next[key]);
    if (!Number.isFinite(value)) return; // Infinity is legitimate for the radii
    next[key] = Math.min(range.max, Math.max(range.min, value)) as never;
  });
  // A lock you can never lose is a lock you can never regain.
  if (Number.isFinite(next.loseRadius) && Number.isFinite(next.senseRadius)) {
    next.loseRadius = Math.max(next.loseRadius, next.senseRadius + 20);
  }
  return next;
}
