import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformCollisionRects, pathIsClear, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';
import type { PursuerMode, PursuerStep, PursuerStallReason } from './circuitClimbPursuerTrace';

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
  delta: number,
  onStep?: (step: PursuerStep) => void
): PursuerState {
  const next = { ...pursuer };

  if (next.state !== 'PURSUING') return next;

  const step = next.speed * delta;
  const platformYs = Array.from(new Set(activePlatforms.map(p => p.y))).sort((a, b) => b - a);

  // Find the next blocking row ABOVE the pursuer
  const nextRowY = platformYs.find(y => y < next.y);

  let targetX = player.x;
  let isTargetingCorridor = false;
  let rowTop: number | null = null;
  let rowBottom: number | null = null;
  let rowPlatformCount = 0;
  let tracedCorridors: Array<{ left: number; right: number; center: number }> = [];
  let chosenCorridor: number | null = null;

  if (nextRowY !== undefined) {
    const pad = CONFIG.routePlatformPadding + CONFIG.playerRadius;
    rowTop = nextRowY - pad;

    const rowPlatforms = activePlatforms.filter(p => p.y === nextRowY).sort((a, b) => a.x - b.x);
    rowPlatformCount = rowPlatforms.length;
    rowBottom = rowPlatforms.length
      ? nextRowY + rowPlatforms[0].height + pad
      : nextRowY + CONFIG.platformHeight + pad;

    // The pursuer has to cross this row whenever the player is not strictly
    // below it. Comparing against the band's lower edge (rowBottom) rather than
    // its upper edge (rowTop) is what keeps a player standing ON this row from
    // reading as "straight ahead, no obstacle" — the player's resting position
    // sits inside the band, not above it.
    if (player.y < rowBottom) {
      isTargetingCorridor = true;
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

      tracedCorridors = corridors.map(c => ({ left: c.left, right: c.right, center: c.center }));

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
        chosenCorridor = bestCorridor.center;
      }
    }
  }

  // Purely Orthogonal Movement
  let remainingStep = step;
  const rects = computePlatformCollisionRects(activePlatforms, pursuer.radius);

  // 1. Horizontal Movement
  const dx = targetX - next.x;
  let hAttempted = 0;
  let hBlocked = false;
  let hApplied = 0;
  if (Math.abs(dx) > 0.1) {
    const moveX = Math.sign(dx) * Math.min(Math.abs(dx), remainingStep);
    const candX = next.x + moveX;
    hAttempted = moveX;

    // Validate horizontal segment
    if (pathIsClear([{ x: next.x, y: next.y }, { x: candX, y: next.y }], rects)) {
      next.x = candX;
      hApplied = moveX;
      remainingStep -= Math.abs(moveX);
    } else {
      // A blocked sideways step must not also cancel this frame's climb. The
      // budget is left intact so the pursuer can still make vertical progress.
      hBlocked = true;
    }
  }

  const budgetAfterHorizontal = remainingStep;

  // 2. Vertical Movement
  let vIntent = 0;
  let vAttempted = 0;
  let vBlocked = false;
  let vApplied = 0;
  if (remainingStep > 0) {
    let moveY = 0;

    if (isTargetingCorridor) {
      // Keep moving upwards through the corridor to pass the blocking row
      vIntent = -Infinity;
      moveY = -remainingStep;
    } else {
      // No blocking row between us and the player!
      // Move vertically toward the player's Y if we aren't already there.
      const dy = player.y - next.y;
      vIntent = dy;
      if (Math.abs(dy) > 0.1) {
        moveY = Math.sign(dy) * Math.min(Math.abs(dy), remainingStep);
      }
    }

    vAttempted = moveY;

    if (moveY !== 0) {
      const candY = next.y + moveY;
      if (pathIsClear([{ x: next.x, y: next.y }, { x: next.x, y: candY }], rects)) {
        next.y = candY;
        vApplied = moveY;
      } else {
        vBlocked = true;
      }
    }
  }

  // Keep pursuer within logical width bounds
  const minClearance = pursuer.radius + 6;
  next.x = Math.max(minClearance, Math.min(CONFIG.logicalWidth - minClearance, next.x));

  if (onStep) {
    const mode: PursuerMode =
      nextRowY === undefined ? 'NO_ROW' : isTargetingCorridor ? 'CORRIDOR' : 'DIRECT';
    const stalled = next.x === pursuer.x && next.y === pursuer.y;

    let stallReason: PursuerStallReason | null = null;
    if (stalled) {
      if (step <= 0) stallReason = 'NO_BUDGET';
      else if (hBlocked && vBlocked) stallReason = 'HORIZONTAL_BLOCKED';
      else if (vBlocked) stallReason = 'VERTICAL_BLOCKED';
      else if (hBlocked && budgetAfterHorizontal <= 0) stallReason = 'HORIZONTAL_BLOCKED_CONSUMED_BUDGET';
      else if (hBlocked) stallReason = 'HORIZONTAL_BLOCKED';
      else if (vAttempted === 0) stallReason = 'ALREADY_AT_TARGET_AND_PLAYER_LEVEL';
      else stallReason = 'NO_VERTICAL_INTENT';
    }

    onStep({
      frame: 0,
      delta,
      budget: step,
      from: { x: pursuer.x, y: pursuer.y },
      to: { x: next.x, y: next.y },
      player: { x: player.x, y: player.y },
      nextRowY: nextRowY === undefined ? null : nextRowY,
      rowTop,
      rowBottom,
      mustCrossRow: isTargetingCorridor,
      mode,
      rowPlatformCount,
      corridors: tracedCorridors,
      chosenCorridor,
      targetX,
      horizontal: { intent: dx, attempted: hAttempted, blocked: hBlocked, applied: hApplied },
      vertical: { intent: vIntent, attempted: vAttempted, blocked: vBlocked, applied: vApplied },
      budgetAfterHorizontal,
      stalled,
      stallReason,
    });
  }

  return next;
}
