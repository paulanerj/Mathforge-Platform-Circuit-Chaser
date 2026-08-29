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
    speed: 0.08, // Conservative speed within foundation range (0.06 - 0.10)
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
  const platformYs = Array.from(new Set(activePlatforms.map(p => p.y))).sort((a, b) => b - a);
  
  // Find the next blocking row ABOVE the pursuer
  const nextRowY = platformYs.find(y => y < next.y);

  let targetX = player.x;
  let isTargetingCorridor = false;

  if (nextRowY !== undefined) {
    const pad = CONFIG.routePlatformPadding + CONFIG.playerRadius;
    const rowTop = nextRowY - pad;
    
    // Check if the player is above the top of this row's collision bounds.
    // If so, we MUST navigate through this row via a corridor.
    if (player.y < rowTop) {
      isTargetingCorridor = true;
      const rowPlatforms = activePlatforms.filter(p => p.y === nextRowY).sort((a, b) => a.x - b.x);
      let corridors: { center: number; left: number; right: number }[] = [];

      if (rowPlatforms.length === 3) {
        const p0 = { center: rowPlatforms[0].x, left: rowPlatforms[0].x - rowPlatforms[0].width / 2, right: rowPlatforms[0].x + rowPlatforms[0].width / 2 };
        const p1 = { center: rowPlatforms[1].x, left: rowPlatforms[1].x - rowPlatforms[1].width / 2, right: rowPlatforms[1].x + rowPlatforms[1].width / 2 };
        const p2 = { center: rowPlatforms[2].x, left: rowPlatforms[2].x - rowPlatforms[2].width / 2, right: rowPlatforms[2].x + rowPlatforms[2].width / 2 };
        
        corridors = computeActorSafeCorridors(p0, p1, p2);
      } else if (rowPlatforms.length === 1) {
        // Row 0 single-platform case
        const p = rowPlatforms[0];
        const pLeft = p.x - p.width / 2;
        const pRight = p.x + p.width / 2;
        const minClear = CONFIG.playerRadius + 6;

        // Left exterior corridor
        const aLeft = minClear;
        const aRight = pLeft - pad;
        if (aRight >= aLeft) {
          corridors.push({ left: aLeft, right: aRight, center: (aLeft + aRight) / 2 });
        }

        // Right exterior corridor
        const bLeft = pRight + pad;
        const bRight = CONFIG.logicalWidth - minClear;
        if (bRight >= bLeft) {
          corridors.push({ left: bLeft, right: bRight, center: (bLeft + bRight) / 2 });
        }
      }

      if (corridors.length > 0) {
        let bestCorridor = corridors[0];
        let minDiff = Infinity;
        for (const c of corridors) {
          const diff = Math.abs(c.center - player.x);
          if (diff < minDiff) {
            minDiff = diff;
            bestCorridor = c;
          }
        }
        targetX = bestCorridor.center;
      }
    }
  }

  // Purely Orthogonal Movement
  let remainingStep = step;
  const rects = computePlatformCollisionRects(activePlatforms, pursuer.radius);
  
  // 1. Horizontal Movement
  const dx = targetX - next.x;
  if (Math.abs(dx) > 0.1) {
    const moveX = Math.sign(dx) * Math.min(Math.abs(dx), remainingStep);
    const candX = next.x + moveX;
    
    // Validate horizontal segment
    if (pathIsClear([{ x: next.x, y: next.y }, { x: candX, y: next.y }], rects)) {
      next.x = candX;
      remainingStep -= Math.abs(moveX);
    } else {
      remainingStep = 0; // Stop X movement if blocked
    }
  }

  // 2. Vertical Movement
  if (remainingStep > 0) {
    let moveY = 0;
    
    if (isTargetingCorridor) {
      // Keep moving upwards through the corridor to pass the blocking row
      moveY = -remainingStep;
    } else {
      // No blocking row between us and the player!
      // Move vertically toward the player's Y if we aren't already there.
      const dy = player.y - next.y;
      if (Math.abs(dy) > 0.1) {
        moveY = Math.sign(dy) * Math.min(Math.abs(dy), remainingStep);
      }
    }

    if (moveY !== 0) {
      const candY = next.y + moveY;
      if (pathIsClear([{ x: next.x, y: next.y }, { x: next.x, y: candY }], rects)) {
        next.y = candY;
      }
    }
  }

  // Keep pursuer within logical width bounds
  const minClearance = pursuer.radius + 6;
  next.x = Math.max(minClearance, Math.min(CONFIG.logicalWidth - minClearance, next.x));

  return next;
}
