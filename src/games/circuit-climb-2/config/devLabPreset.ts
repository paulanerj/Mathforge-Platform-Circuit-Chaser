/**
 * CC2-05A — portable developer-laboratory preset with independent domains.
 *
 * Import rejects malformed, unknown or unsafe keys. Nothing in the visual
 * camera section is passed into the deterministic physics or math engine.
 * A full preset is applied ONLY when the user explicitly starts a new run.
 */
import {defaultRunConfig,validateRunConfig,type RunConfigV1} from './runConfig';
import {
  defaultLearnerMotionPreset,validateLearnerMotionPreset,
  type LearnerMotionPresetV1,
} from './learnerMotionPreset';
import {
  defaultPursuerPreset,validatePursuerPreset,
  type PursuerPresetV1,
} from '../pursuer/pursuerPreset';

import {curiousPursuerPersonality,defaultPursuerPersonality,
  validatePursuerPersonality,type PursuerPersonalityV1} from '../pursuer/personality';
import {defaultFeedbackPreset,validateFeedbackPreset,
  type FeedbackPresetV1} from '../presentation/feedback';

export interface CameraViewPresetV1 {
  zoom: number;
  follow: number;
}

export interface DevLabPresetV1 {
  schemaVersion: 'cc2-dev-lab/v1';
  run: RunConfigV1;
  learner: LearnerMotionPresetV1;
  pursuer: PursuerPresetV1;
  camera: CameraViewPresetV1;
  /** Optional so historical CC2-05A presets still load exactly. */
  personality?: PursuerPersonalityV1;
  feedback?: FeedbackPresetV1;
}

export function validateCameraView(value:unknown): CameraViewPresetV1 {
  if (!value || typeof value!=='object' || Array.isArray(value))
    throw Error('CC2_CAMERA_NOT_OBJECT');
  const v=value as Record<string,unknown>;
  if (Object.keys(v).sort().join('|') !== 'follow|zoom' ||
      typeof v.zoom !== 'number' || !Number.isFinite(v.zoom) ||
      v.zoom<0.60 || v.zoom>1 ||
      typeof v.follow !== 'number' || !Number.isFinite(v.follow) ||
      v.follow<0.05 || v.follow>0.50) throw Error('CC2_CAMERA_INVALID');
  return {zoom:v.zoom,follow:v.follow};
}

export function defaultDevLabPreset():DevLabPresetV1 {
  return {
    schemaVersion:'cc2-dev-lab/v1',
    run:defaultRunConfig(),
    learner:defaultLearnerMotionPreset(),
    pursuer:defaultPursuerPreset(),
    camera:{zoom:0.72,follow:0.13},
    personality:defaultPursuerPersonality(),
    feedback:defaultFeedbackPreset(),
  };
}

/**
 * Beginner-middle owner candidate: 20% faster Pursuer than the owner's
 * previous test (1.2 search/1.9 chase => 1.44/2.28). Both are still
 * comfortably below the old 2.6/3.7 relentless high-difficulty settings.
 * The Spark keeps its previously tested 26 world-units/tick.
 */
export function intermediateDevLabPreset():DevLabPresetV1{
  const base=defaultDevLabPreset();
  return {
    ...base,
    run:{...base.run,curriculum:'makeTarget20',landingGraceTicks:45},
    learner:{...base.learner,circuitSpeedPerTick:26,hopTicks:14,returnTicks:12},
    pursuer:{...base.pursuer,nearSenseRadius:180,clearSightRadius:270,
      trailSenseRadius:90,trailLifetimeTicks:360,staleContactTicks:18,
      speedSearch:1.44,speedPursuit:2.28,spawnRowsBelow:3},
    personality:curiousPursuerPersonality(),
    camera:{zoom:0.70,follow:0.13},
  };
}

export function validateDevLabPreset(input:unknown):DevLabPresetV1 {
  if (!input || typeof input!=='object' || Array.isArray(input))
    throw Error('CC2_DEV_PRESET_NOT_OBJECT');
  const v=input as Record<string,unknown>;
  const allowed=['camera','feedback','learner','personality','pursuer','run','schemaVersion'];
  if (Object.keys(v).some(key=>!allowed.includes(key))||
      !['camera','learner','pursuer','run','schemaVersion'].every(key=>key in v)||
      v.schemaVersion!=='cc2-dev-lab/v1') throw Error('CC2_DEV_PRESET_VERSION_OR_KEYS');
  return {
    schemaVersion:'cc2-dev-lab/v1',
    run:validateRunConfig(v.run),
    learner:validateLearnerMotionPreset(v.learner),
    pursuer:validatePursuerPreset(v.pursuer),
    camera:validateCameraView(v.camera),
    personality:validatePursuerPersonality(v.personality??defaultPursuerPersonality()),
    feedback:validateFeedbackPreset(v.feedback??defaultFeedbackPreset()),
  };
}

export function exportDevLabPreset(input:DevLabPresetV1):string {
  return JSON.stringify(validateDevLabPreset(input),null,2);
}

export function importDevLabPreset(json:string):DevLabPresetV1 {
  return validateDevLabPreset(JSON.parse(json) as unknown);
}

/** Render-only normalized projection, independent of any gameplay config. */
export function projectCameraPoint(
  worldX:number,worldY:number,cameraY:number,
  canvasWidth:number,worldWidth:number,zoom:number,
):{x:number;y:number}{
  if(!Number.isFinite(canvasWidth)||canvasWidth<=0||
     !Number.isFinite(worldWidth)||worldWidth<=0)throw Error('CC2_CAMERA_SIZE');
  validateCameraView({zoom,follow:0.13});
  const scale=canvasWidth/worldWidth*zoom;
  return {
    x:canvasWidth/2+(worldX-worldWidth/2)*scale,
    y:(worldY-cameraY)*scale,
  };
}
