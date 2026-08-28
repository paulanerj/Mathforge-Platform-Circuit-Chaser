import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformCollisionRects, pathIsClear, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';

export interface PursuerState {
  x: number;
  y: number;
  radius: number;
  speed: number;
  state: 'PURSUING';
}

export function createPursuer(playerX: number, playerY: number): PursuerState {
  return {
    x: playerX,
    y: playerY + 2 * CONFIG.rowGap,
    radius: CONFIG.playerRadius,
    speed: 0.35, // conservative speed (player is ~0.62)
    state: 'PURSUING',
  };
}

export function updatePursuer(
  pursuer: PursuerState,
  player: { x: number; y: number },
  activePlatforms: any[],
  delta: number
): PursuerState {
  const next = { ...pursuer };
  
  if (next.state !== 'PURSUING') return next;

  const step = next.speed * delta;
  
  // Group platform Ys to find the row immediately above the pursuer
  const platformYs = Array.from(new Set(activePlatforms.map(p => p.y))).sort((a, b) => b - a);
  const nextRowY = platformYs.find(y => y < next.y);

  let targetX = player.x;

  if (nextRowY !== undefined) {
    const rowPlatforms = activePlatforms.filter(p => p.y === nextRowY).sort((a, b) => a.x - b.x);
    if (rowPlatforms.length === 3) {
      const p0 = { center: rowPlatforms[0].x, left: rowPlatforms[0].x - rowPlatforms[0].width / 2, right: rowPlatforms[0].x + rowPlatforms[0].width / 2 };
      const p1 = { center: rowPlatforms[1].x, left: rowPlatforms[1].x - rowPlatforms[1].width / 2, right: rowPlatforms[1].x + rowPlatforms[1].width / 2 };
      const p2 = { center: rowPlatforms[2].x, left: rowPlatforms[2].x - rowPlatforms[2].width / 2, right: rowPlatforms[2].x + rowPlatforms[2].width / 2 };
      
      const corridors = computeActorSafeCorridors(p0, p1, p2);
      
      let bestCorridor = corridors[0];
      let minDiff = Infinity;
      for (const c of corridors) {
        const diff = Math.abs(c.center - player.x);
        if (diff < minDiff) {
          minDiff = diff;
          bestCorridor = c;
        }
      }
      
      if (bestCorridor) {
        targetX = bestCorridor.center;
      }
    }
  }

  // To navigate safely, move towards targetX and also move upwards.
  // If we are far from targetX, prioritize X alignment so we don't hit the platform from below.
  const dx = targetX - next.x;
  
  // We want to move towards (targetX, next.y - some_amount)
  // Let's create a local target point.
  let localTarget = { x: targetX, y: next.y - step };
  
  // If we need to move X significantly, move diagonally, but don't move Y so fast that we hit the bottom of the platform before aligning.
  // Actually, we can just try moving directly to targetX in X, and moving up in Y.
  let moveX = 0;
  let moveY = -step; // Upward base movement

  // Normalize diagonal
  const dist = Math.sqrt(dx * dx + moveY * moveY);
  if (dist > 0) {
    moveX = (dx / dist) * step;
    moveY = (moveY / dist) * step;
  }
  
  // If we are very close to X, just snap to it
  if (Math.abs(dx) <= Math.abs(moveX)) {
    moveX = dx;
    // Recalculate moveY to use the rest of the step
    moveY = -Math.sqrt(Math.max(0, step * step - moveX * moveX));
  }

  const candidate = { x: next.x + moveX, y: next.y + moveY };
  const rects = computePlatformCollisionRects(activePlatforms, pursuer.radius);
  
  if (pathIsClear([{ x: next.x, y: next.y }, candidate], rects)) {
    next.x = candidate.x;
    next.y = candidate.y;
  } else {
    // Blocked. Try pure horizontal to targetX.
    const candX = { x: next.x + moveX, y: next.y };
    if (moveX !== 0 && pathIsClear([{ x: next.x, y: next.y }, candX], rects)) {
      next.x = candX.x;
    } else {
      // Try pure vertical (might be blocked by platform, but if not, move)
      const candY = { x: next.x, y: next.y - step };
      if (pathIsClear([{ x: next.x, y: next.y }, candY], rects)) {
        next.y = candY.y;
      } else {
        // completely blocked? Try moving away from center of closest rect?
        // For this minimal version, we can just slide along X if blocked vertically
        // If dx is very small, we might be stuck directly under a platform.
        // We shouldn't be under a platform if we aimed for a corridor, unless we started there.
        // Let's add a fallback: if stuck, just move X towards targetX forcefully if clear.
        const fallbackX = next.x + (dx > 0 ? step : -step);
        if (pathIsClear([{ x: next.x, y: next.y }, { x: fallbackX, y: next.y }], rects)) {
            next.x = fallbackX;
        }
      }
    }
  }

  // Keep pursuer within logical width bounds
  const minClearance = pursuer.radius + 6;
  next.x = Math.max(minClearance, Math.min(CONFIG.logicalWidth - minClearance, next.x));

  return next;
}
