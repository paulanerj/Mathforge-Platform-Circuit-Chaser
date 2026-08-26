/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CircuitClimbStatus = 'idle' | 'playing' | 'paused' | 'failed' | 'success';

export type MovementMode = 'circuit' | 'hop';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Platform {
  id: string;
  row: number; // Row index (0, 1, 2, ...)
  xPositions: [number, number, number]; // Pixel X positions for tracks
  y: number; // Pixel Y position (grows upwards)
  values: [number, number, number]; // Math numbers
  correctIndex: number; // Index (0, 1, 2) that is targetSum - baseNumber
  brokenIndices: boolean[]; // Whether each choice has been selected incorrectly
  targetSum: number;
  baseNumber: number;
}

export interface PlayerState {
  y: number; // Current vertical position in world pixels
  x: number; // Current horizontal position in world pixels
  track: number; // Track index (0, 1, 2)
  carriedNumber: number;
  visualState: 'idle' | 'jumping' | 'falling' | 'recovering';
  targetY: number;
  targetX: number;
  jumpProgress: number; // 0 to 1
  jumpDuration: number; // MS
}

export interface EnemyState {
  y: number; // Current vertical position in world pixels
  speed: number; // Pixels per second
  visualState: 'pursuit' | 'collided';
}

export interface CircuitClimbViewModel {
  status: CircuitClimbStatus;
  player: PlayerState;
  enemy: EnemyState;
  platforms: Platform[];
  cameraY: number; // Scroll coordinate
  movementMode: MovementMode;
  score: number;
  highScore: number;
  hud: {
    equation: string;
    targetSum: number;
    carriedNumber: number;
  };
}

export type CircuitClimbIntent =
  | { type: 'SELECT_PLATFORM'; index: number }
  | { type: 'TOGGLE_MOVEMENT_MODE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'EXIT' };

export const CC_GEOMETRY = {
  WORLD_WIDTH: 480,
  WORLD_HEIGHT: 600,
  PLATFORM_SPACING: 180, // Vertical distance between platform rows
  STARTING_PLAYER_Y: 100,
  STARTING_ENEMY_Y: -200,
  TRACKS: [80, 240, 400] as [number, number, number],
  BASE_ENEMY_SPEED: 25, // Pixels per second
  SPEED_INCREMENT: 3, // Speed increase per correct answer
  JUMP_DURATION: 400, // MS
};
