/**
 * CC2-07B — deterministic, owner-facing pace profiles.
 *
 * Trial profiles are intentionally candidates, not final difficulty
 * promises. They preserve the source-owned 1.5x geometry, finite sensing,
 * current generated curriculum, physical route planner, and clean replay.
 *
 * A/B method: reuse the exact same seed, mode and curriculum; alter only
 * motion/perception/patrol parameters. Mathematical choices must remain
 * deterministic even when bot difficulty changes.
 */
import {energeticClimbDevLabPreset,
  validateDevLabPreset,type DevLabPresetV1} from './devLabPreset';

export type PaceProfileId='training'|'energetic'|'intense';
export const PACE_LABELS:Readonly<Record<PaceProfileId,string>>={
  training:'WARM-UP · learn the routes',
  energetic:'ENERGETIC · default chase',
  intense:'INTENSE · aggressive pursuit',
};
export const PACE_PROFILE_IDS:ReadonlyArray<PaceProfileId>=
  ['training','energetic','intense'];

export function paceProfile(id:PaceProfileId):DevLabPresetV1{
  if(!PACE_PROFILE_IDS.includes(id))
    throw Error('CC2_PACE_PROFILE_UNKNOWN');
  const base=energeticClimbDevLabPreset();
  if(id==='energetic')return validateDevLabPreset(base);
  if(id==='training')return validateDevLabPreset({
    ...base,
    learner:{...base.learner,circuitSpeedPerTick:26,
      hopTicks:14,returnTicks:12},
    pursuer:{...base.pursuer,speedSearch:3.8,speedPursuit:4.9,
      nearSenseRadius:320,clearSightRadius:500,
      spawnRowsBelow:2},
    run:{...base.run,landingGraceTicks:60},
  });
  return validateDevLabPreset({
    ...base,
    learner:{...base.learner,circuitSpeedPerTick:25,
      hopTicks:15,returnTicks:12},
    pursuer:{...base.pursuer,speedSearch:6.4,speedPursuit:7.8,
      nearSenseRadius:390,clearSightRadius:580,
      spawnRowsBelow:2},
    run:{...base.run,landingGraceTicks:30},
  });
}

/** Stable declared test settings; not coupled to UI/animation frame rate. */
export const PACE_QUALIFICATION={
  seeds:['cc2-pace-11','cc2-pace-12','cc2-pace-13','cc2-pace-14',
    'cc2-pace-15','cc2-pace-16'] as const,
  seconds:40,
  sampleEveryTicks:30,
} as const;
