/**
 * CC2-05A — source-owned, versioned learner motion tuning.
 *
 * These parameters affect only the transit trajectory's fixed-tick progress,
 * not the evaluation of mathematics or destination reachability. For a
 * given seed + run config + motion preset + input-at-tick trace, playback
 * must yield identical learner events and state.
 */
export interface LearnerMotionPresetV1 {
  schemaVersion: 'cc2-learner-motion/v1';
  circuitSpeedPerTick: number;
  hopTicks: number;
  returnTicks: number;
}

export const DEFAULT_LEARNER_MOTION_PRESET: Readonly<LearnerMotionPresetV1> =
  Object.freeze({
    schemaVersion: 'cc2-learner-motion/v1',
    circuitSpeedPerTick: 16,
    hopTicks: 18,
    returnTicks: 14,
  });

export function defaultLearnerMotionPreset(): LearnerMotionPresetV1 {
  return {...DEFAULT_LEARNER_MOTION_PRESET};
}

export function validateLearnerMotionPreset(input: unknown): LearnerMotionPresetV1 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Error('CC2_MOTION_NOT_OBJECT');
  }
  const v = input as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_LEARNER_MOTION_PRESET).sort().join('|');
  if (Object.keys(v).sort().join('|') !== keys) throw Error('CC2_MOTION_UNKNOWN_KEYS');
  if (v.schemaVersion !== 'cc2-learner-motion/v1') throw Error('CC2_MOTION_VERSION');
  if (typeof v.circuitSpeedPerTick !== 'number' ||
      !Number.isFinite(v.circuitSpeedPerTick) ||
      v.circuitSpeedPerTick < 1 || v.circuitSpeedPerTick > 50) {
    throw Error('CC2_MOTION_CIRCUIT_SPEED');
  }
  for (const field of ['hopTicks','returnTicks'] as const) {
    const val = v[field];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 6 || val > 90)
      throw Error('CC2_MOTION_'+field.toUpperCase());
  }
  return {...v} as unknown as LearnerMotionPresetV1;
}
