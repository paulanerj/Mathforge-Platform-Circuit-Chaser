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
  /** 0 = constant speed. Higher surges and hesitates more. */
  speedJitter: number;
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
  reacquireOnPlayerMove: false,
  climbReserve: 0,
});

/**
 * Starting point for the living pursuer. Deliberately provisional — these are
 * the numbers the dev panel exists to argue with.
 */
export const ALIVE_PURSUER_TUNING: Readonly<PursuerTuning> = Object.freeze({
  searchSpeed: 0.095,
  chaseSpeed: 0.16,
  senseRadius: 260,
  loseRadius: 420,
  alertDwellMs: 260,
  wanderAmplitude: 80,
  wanderPeriodMs: 2200,
  speedJitter: 0.45,
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
