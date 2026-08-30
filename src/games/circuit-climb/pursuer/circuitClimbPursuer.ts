import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformCollisionRects, pathIsClear, computeActorSafeCorridors } from '../geometry/circuitClimbGeometry';
import type { PursuerMode, PursuerStep, PursuerStallReason } from './circuitClimbPursuerTrace';
import { BASELINE_PURSUER_TUNING, PursuerTuning } from './circuitClimbPursuerTuning';

/**
 * Current game geometry used by pursuer calculations.
 * Passed explicitly to avoid hardcoding default geometry,
 * allowing off-default view scales to work correctly.
 */
export interface CurrentGameGeometry {
  rowGap: number;
  platformHeight: number;
  playerRadius: number;
  logicalWidth: number;
  routePlatformPadding: number;
}


export type PursuerLifecycle = 'PURSUING' | 'CAUGHT';

/**
 * What the pursuer currently believes about the player. SEARCH -> ALERT ->
 * CHASE, with CAUGHT as the terminal lifecycle in `state`.
 */
export type PursuerBehaviour = 'SEARCH' | 'ALERT' | 'CHASE';

export interface PursuerState {
  x: number;
  y: number;
  radius: number;
  /** Legacy constant speed. Live speed comes from the tuning. */
  speed: number;
  state: PursuerLifecycle;
  behaviour: PursuerBehaviour;
  /** Where it last had eyes on the player — what it searches around. */
  lastKnownX: number;
  lastKnownY: number;
  /** Time spent in ALERT, against tuning.alertDwellMs. */
  alertElapsed: number;
  /** Total ms alive. Drives the wander and jitter, so both are deterministic. */
  age: number;
  /** Fixed phase offset so the sweep does not start dead centre. */
  seed: number;
  /** The row it is currently threading, and the corridor it committed to. */
  crossingRowY: number | null;
  crossingCorridorX: number | null;
  tuning: PursuerTuning;
  /** Current game geometry at time of creation/update. Used for all calculations. */
  geometry: CurrentGameGeometry;
}

/**
 * Centre-to-centre distance at which the pursuer has the player. The actors
 * carry a radius each, so this is a solid overlap rather than a graze.
 * Computed from geometry, not hardcoded to CONFIG.
 */
export function getPursuerCaptureDistance(geometry: CurrentGameGeometry): number {
  return geometry.playerRadius;
}

/**
 * Defaults to the frozen baseline tuning, so anything that does not explicitly
 * ask for a living pursuer gets the locked behaviour — including the whole
 * capability lock suite.
 *
 * Geometry is REQUIRED and must be provided by the runtime to ensure
 * the pursuer consumes current scaled geometry, not module-default constants.
 * The runtime calls captureRuntimeGeometry() to snapshot its LOCAL CONFIG.
 */
export function createPursuer(
  playerX: number,
  playerY: number,
  tuning: PursuerTuning = BASELINE_PURSUER_TUNING,
  geometry: CurrentGameGeometry,
): PursuerState {
  return {
    x: playerX,
    y: playerY + 2 * geometry.rowGap,
    radius: geometry.playerRadius,
    speed: 0.08, // Conservative speed within foundation range (0.06 - 0.10)
    state: 'PURSUING',
    behaviour: 'SEARCH',
    lastKnownX: playerX,
    lastKnownY: playerY,
    alertElapsed: 0,
    age: 0,
    seed: 1.7,
    crossingRowY: null,
    crossingCorridorX: null,
    tuning,
    geometry,
  };
}

/**
 * Two out-of-phase sines. Deterministic, so a run replays identically and the
 * behaviour is testable, but irregular enough not to read as a metronome.
 */
function wobble(age: number, periodMs: number, seed: number) {
  const a = Math.sin((age / periodMs) * Math.PI * 2 + seed);
  const b = Math.sin((age / (periodMs * 0.37)) * Math.PI * 2 + seed * 1.9);
  return a * 0.68 + b * 0.32;
}

/**
 * Which way the search is currently sweeping.
 *
 * The sweep commits to a side and holds it for half a period, rather than
 * following a sine. A sine target crosses far faster than the actor can move,
 * so the pursuer only ever vibrates around the centre and the sweep is
 * invisible. Committing to a direction makes it travel — a patrol at its own
 * speed, reversing on a beat.
 */
function sweepDirection(age: number, periodMs: number, seed: number) {
  return Math.sin((age / periodMs) * Math.PI * 2 + seed) >= 0 ? 1 : -1;
}

export function updatePursuer(
  pursuer: PursuerState,
  player: {
    x: number;
    y: number;
    platform?: any;
    traveling?: boolean;
    /** false while the spark cannot be taken — see the shielded-transit rule. */
    capturable?: boolean;
  },
  activePlatforms: any[],
  delta: number,
  onStep?: (step: PursuerStep) => void,
  geometry: CurrentGameGeometry = pursuer.geometry
): PursuerState {
  const next = { ...pursuer };
  next.geometry = geometry;
  // The actor's own body has to track the world it is standing in. World
  // framing can change mid-life, and radius is set once at creation, so
  // without this a pursuer created at one scale keeps that body forever —
  // its collision rects, its bounds clamp and its drawn size all stay at the
  // old scale while every other calculation moves to the new one. At an
  // unchanged scale this is the value it already had, so the frozen default
  // behaviour is untouched.
  next.radius = geometry.playerRadius;

  if (next.state !== 'PURSUING') return next;

  const tuning = next.tuning || BASELINE_PURSUER_TUNING;
  next.age += delta;

  const distanceToPlayer = Math.hypot(player.x - next.x, player.y - next.y);
  // A spark mid-route is a moving target: the lock breaks and the pursuer has to
  // pick the trail up again from where it last had eyes on the player.
  const playerElusive = tuning.reacquireOnPlayerMove && player.traveling === true;
  const canSense = distanceToPlayer <= tuning.senseRadius;

  const loseLock = () => {
    next.behaviour = 'SEARCH';
    next.alertElapsed = 0;
    next.lastKnownX = player.x;
    next.lastKnownY = player.y;
  };

  if (next.behaviour === 'CHASE') {
    if (playerElusive || distanceToPlayer > tuning.loseRadius) loseLock();
  } else if (next.behaviour === 'ALERT') {
    if (playerElusive || !canSense) {
      loseLock();
    } else {
      next.alertElapsed += delta;
      if (next.alertElapsed >= tuning.alertDwellMs) next.behaviour = 'CHASE';
    }
  } else if (canSense && !playerElusive) {
    // Sensed. With no hesitation configured it commits in this same frame, which
    // is what makes the baseline tuning reproduce the frozen behaviour exactly.
    next.behaviour = tuning.alertDwellMs > 0 ? 'ALERT' : 'CHASE';
    next.alertElapsed = 0;
  }

  if (next.behaviour === 'CHASE') {
    next.lastKnownX = player.x;
    next.lastKnownY = player.y;
  }

  // Where it is trying to get to: the player when locked on, otherwise its guess
  // — the last sighting, swept from side to side.
  const searching = next.behaviour !== 'CHASE';
  const sweep = searching
    ? tuning.wanderAmplitude * sweepDirection(next.age, tuning.wanderPeriodMs, next.seed)
    : 0;
  // Two different questions. Where it is *heading* — swept, expressive, this is
  // the searching behaviour. And which side of the world it is *navigating*
  // toward — unswept, because a corridor choice that flips with the sweep is a
  // choice it can never travel far enough to act on.
  const desiredX = searching ? next.lastKnownX + sweep : player.x;
  const navigationX = searching ? next.lastKnownX : player.x;
  // Searching heads for the last sighting, and once it is past that it keeps
  // pushing upward, because up is the only way the player ever goes.
  //
  // The second term used to be `next.y - 1`. Once the pursuer drew level with
  // the sighting that branch won every frame, and a vertical intent of one unit
  // caps the move at one unit — the pursuer crawled at a fixed 1 unit per frame
  // however fast it was configured to search, and looked like it had given up.
  // A whole row of intent gives the frame budget something to spend itself on.
  //
  // It has to stay a `min` against the sighting rather than a tolerance band: an
  // "arrived yet?" test flips back and forth as the pursuer crosses the band and
  // leaves it oscillating around the sighting instead of searching onward.
  const desiredY = searching
    ? Math.min(next.lastKnownY, next.y - geometry.rowGap)
    : player.y;

  const baseSpeed = next.behaviour === 'CHASE' ? tuning.chaseSpeed : tuning.searchSpeed;
  const jitter = tuning.speedJitter > 0
    ? Math.max(0.12, 1 + tuning.speedJitter * wobble(next.age, tuning.wanderPeriodMs * 0.61, next.seed * 2.3))
    : 1;
  // ALERT is the beat where it has noticed but not yet committed: it nearly stops.
  const alertScale = next.behaviour === 'ALERT' ? 0.18 : 1;

  const step = baseSpeed * jitter * alertScale * delta;
  const platformYs = Array.from(new Set(activePlatforms.map(p => p.y))).sort((a, b) => b - a);

  // Find the next blocking row ABOVE the pursuer
  const nextRowY = platformYs.find(y => y < next.y);

  let targetX = desiredX;
  let isTargetingCorridor = false;
  let rowTop: number | null = null;
  let rowBottom: number | null = null;
  let rowPlatformCount = 0;
  let tracedCorridors: Array<{ left: number; right: number; center: number }> = [];
  let chosenCorridor: number | null = null;

  if (nextRowY !== undefined) {
    const pad = geometry.routePlatformPadding + geometry.playerRadius;
    rowTop = nextRowY - pad;

    const rowPlatforms = activePlatforms.filter(p => p.y === nextRowY).sort((a, b) => a.x - b.x);
    rowPlatformCount = rowPlatforms.length;
    rowBottom = rowPlatforms.length
      ? nextRowY + rowPlatforms[0].height + pad
      : nextRowY + geometry.platformHeight + pad;

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
        const minClear = geometry.playerRadius + 6;

        // Left exterior corridor
        const aLeft = minClear;
        const aRight = pLeft - pad;
        if (aRight >= aLeft) {
          corridors.push({ left: aLeft, right: aRight, center: (aLeft + aRight) / 2 });
        }

        // Right exterior corridor
        const bLeft = pRight + pad;
        const bRight = geometry.logicalWidth - minClear;
        if (bRight >= bLeft) {
          corridors.push({ left: bLeft, right: bRight, center: (bLeft + bRight) / 2 });
        }
      }

      tracedCorridors = corridors.map(c => ({ left: c.left, right: c.right, center: c.center }));

      if (corridors.length > 0) {
        // Commit to one corridor for the whole transit of this row. Re-deciding
        // every frame lets a moving target drag the pursuer back and forth
        // across the middle of the row, never travelling far enough to reach
        // any corridor and never getting through.
        if (next.crossingRowY !== nextRowY || next.crossingCorridorX === null) {
          let bestCorridor = corridors[0];
          let minDiff = Infinity;
          for (const c of corridors) {
            const diff = Math.abs(c.center - navigationX);
            if (diff < minDiff) {
              minDiff = diff;
              bestCorridor = c;
            }
          }
          next.crossingRowY = nextRowY;
          next.crossingCorridorX = bestCorridor.center;
        }
        targetX = next.crossingCorridorX;
        chosenCorridor = next.crossingCorridorX;
      }
    }
  }

  if (!isTargetingCorridor) {
    next.crossingRowY = null;
    next.crossingCorridorX = null;
  }

  // Purely Orthogonal Movement
  let remainingStep = step;
  const rects = computePlatformCollisionRects(activePlatforms, next.radius).map((rect) => {
    // The player rests inside the top padding of the platform it stands on, so
    // that band has to be enterable or the pursuer can never close the last few
    // units. Scoped to that one platform by id, and only its padding: the
    // platform body below platform.y stays solid, so nothing is passed through.
    if (
      player.platform &&
      rect.platform.id !== undefined &&
      rect.platform.id === player.platform.id
    ) {
      return { ...rect, top: rect.platform.y };
    }
    return rect;
  });

  // 1. Horizontal Movement
  //
  // Capped at the share of the budget the climb reserve leaves, so a sweep that
  // moves faster than the pursuer can follow cannot eat the whole frame.
  const horizontalBudget = remainingStep * (1 - Math.min(0.95, Math.max(0, tuning.climbReserve || 0)));
  const dx = targetX - next.x;
  let hAttempted = 0;
  let hBlocked = false;
  let hApplied = 0;
  if (Math.abs(dx) > 0.1) {
    const moveX = Math.sign(dx) * Math.min(Math.abs(dx), horizontalBudget);
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
      // No blocking row between us and where we are headed: close the vertical
      // gap to the target point (the player, or the last sighting).
      const dy = desiredY - next.y;
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
  const minClearance = next.radius + 6;
  next.x = Math.max(minClearance, Math.min(geometry.logicalWidth - minClearance, next.x));

  if (
    player.capturable !== false &&
    Math.hypot(player.x - next.x, player.y - next.y) <= getPursuerCaptureDistance(geometry)
  ) {
    next.state = 'CAUGHT';
  }

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
      behaviour: next.behaviour,
      distanceToPlayer,
      desired: { x: desiredX, y: desiredY },
      lastKnown: { x: next.lastKnownX, y: next.lastKnownY },
      speedScale: jitter * alertScale,
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
