import { CIRCUIT_CLIMB_GEOMETRY as CONFIG, computePlatformCollisionRects, pathIsClear, computeActorSafeCorridors, computeRectEscape } from '../geometry/circuitClimbGeometry';
import type { PursuerMode, PursuerStep, PursuerStallReason } from './circuitClimbPursuerTrace';
import { BASELINE_PURSUER_TUNING, PursuerTuning } from './circuitClimbPursuerTuning';
import {
  advanceCadence,
  cadenceSpeedCompensation,
  chooseLegAxis,
  createLocomotion,
  type LocomotionState,
} from './circuitClimbPursuerLocomotion';

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
  /**
   * How the pursuer is spending time, as opposed to where it is going. Kept
   * deliberately separate — see circuitClimbPursuerLocomotion. Nothing in here
   * may change the target, the committed corridor, or the behaviour state.
   */
  locomotion: LocomotionState;
  /**
   * Axis and direction of the leg the pursuer is currently travelling, for
   * anything that needs to draw or sound the turn.
   */
  facingAxis: 'x' | 'y';
  facingSign: -1 | 0 | 1;
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
    locomotion: createLocomotion(1.7),
    facingAxis: 'x',
    facingSign: 0,
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
    // The sighting that caused this transition is the freshest information the
    // pursuer will ever have, so record it. Without this, an ALERT beat orients
    // on whatever the previous sighting was and spends its dwell drifting
    // toward a place the learner has already left. Only the acquisition frame
    // writes here; a continuous refresh while searching was measured and makes
    // pursuit worse, because horizontal tracking then competes with the climb
    // for the same frame budget.
    next.lastKnownX = player.x;
    next.lastKnownY = player.y;
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
  // Speed variation only. The floor keeps it from ever reaching a standstill:
  // when this could stop the pursuer it was also the only source of pausing,
  // and because it is a pair of fixed-period sines the pauses arrived on a
  // beat — raising the setting just made a louder metronome. Pausing now
  // belongs to `agitation`, which draws its timings instead. At both shipped
  // tunings (0 and 0.45) this floor is never reached, so neither changes.
  const jitter = tuning.speedJitter > 0
    ? Math.max(0.35, 1 + tuning.speedJitter * wobble(next.age, tuning.wanderPeriodMs * 0.61, next.seed * 2.3))
    : 1;
  // ALERT is the beat where it has noticed but not yet committed: it nearly stops.
  const alertScale = next.behaviour === 'ALERT' ? 0.18 : 1;

  // Bursts of travel broken by irregular hesitations. This decides only whether
  // the frame's budget is spent, never where it would have been spent: a
  // hesitating pursuer still senses, still tracks the learner, and still holds
  // the corridor it committed to, so the pause cannot cost it its route.
  const cadence = advanceCadence(next.locomotion, delta, tuning);
  next.locomotion = cadence.state;
  const hesitating = !cadence.moving;

  // A moving frame carries the travel the hesitating frames gave up, so
  // agitation changes the rhythm of the pursuit without quietly slowing it.
  const step = hesitating
    ? 0
    : baseSpeed * jitter * alertScale * delta * cadenceSpeedCompensation(tuning.agitation);
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

        // Same shared authority the learner uses, given the same current
        // world, so the two actors can never disagree about what is passable.
        corridors = computeActorSafeCorridors(p0, p1, p2, {
          playerRadius: geometry.playerRadius,
          routePlatformPadding: geometry.routePlatformPadding,
          logicalWidth: geometry.logicalWidth,
          platformWidth: rowPlatforms[0].width,
        });
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

  // 0. Escape, if the pursuer is somehow already inside an inflated rect.
  //
  // It can get there legitimately. The exception above lets it into the top
  // padding of the platform the learner is standing on; when the learner moves
  // on, that exception is withdrawn and the full rect closes over a pursuer
  // sitting in the band. A world-framing change can do the same by moving a
  // platform. From inside, every direction overlaps the rect, so `pathIsClear`
  // refuses all of them — including the way out — and the pursuer is stuck
  // forever, reporting HORIZONTAL_BLOCKED while still tracking the learner
  // perfectly. That was observed for 1605 consecutive frames.
  //
  // Leaving by the nearest edge is the whole of the repair. It cannot be used
  // to travel through a platform: it only runs while the pursuer is inside one,
  // it always heads for the closest boundary, and it stops on reaching it.
  const escape = computeRectEscape({ x: next.x, y: next.y }, rects);
  if (escape) {
    // Move at the pursuer's own pace, and never further than just past the
    // edge, so the frame after this one is a normal collision-checked frame.
    const reach = Math.min(remainingStep, escape.distance + 0.5);
    if (escape.dx !== 0) next.x += Math.sign(escape.dx) * reach;
    else next.y += Math.sign(escape.dy) * reach;

    if (onStep) {
      onStep({
        frame: 0,
        behaviour: next.behaviour,
        distanceToPlayer,
        desired: { x: desiredX, y: desiredY },
        lastKnown: { x: next.lastKnownX, y: next.lastKnownY },
        speedScale: jitter * alertScale,
        delta,
        budget: step,
        cadence: hesitating ? 'HESITATING' : 'MOVING',
        // Leaving a rect is not a route decision, so it reports the leg the
        // pursuer is already on and never claims a turn.
        direction: { axis: next.facingAxis, sign: next.facingSign, changed: false },
        from: { x: pursuer.x, y: pursuer.y },
        to: { x: next.x, y: next.y },
        player: { x: player.x, y: player.y },
        nextRowY: nextRowY === undefined ? null : nextRowY,
        rowTop,
        rowBottom,
        mustCrossRow: isTargetingCorridor,
        mode: 'ESCAPE',
        rowPlatformCount,
        corridors: tracedCorridors,
        chosenCorridor,
        targetX,
        horizontal: { intent: escape.dx, attempted: escape.dx, blocked: false, applied: escape.dx === 0 ? 0 : Math.sign(escape.dx) * reach },
        vertical: { intent: escape.dy, attempted: escape.dy, blocked: false, applied: escape.dy === 0 ? 0 : Math.sign(escape.dy) * reach },
        budgetAfterHorizontal: remainingStep,
        stalled: false,
        stallReason: null,
      });
    }
    return next;
  }

  // 1. Intent, on each axis independently.
  //
  // Both intents are worked out before either is spent, because the leg model
  // has to choose between them and cannot do that from a move it has already
  // made. Nothing here decides where the pursuer is going — targetX and
  // desiredY were settled above and are not touched.
  const legMode = tuning.legPeriodMs > 0;
  // In leg mode the whole frame goes to one axis, so the per-frame climb
  // reserve does not apply; it becomes a share of LEG TIME instead, which is
  // the same average split expressed over a longer window. With the leg model
  // off this is exactly the cap it always was.
  const horizontalBudget = legMode
    ? remainingStep
    : remainingStep * (1 - Math.min(0.95, Math.max(0, tuning.climbReserve || 0)));
  const dx = targetX - next.x;

  /**
   * Can the pursuer go this way at all? A one-unit probe, because what ends a
   * leg is the direction being refused, not the exact distance being refused.
   */
  const refused = (axis: 'x' | 'y', direction: number) => {
    if (direction === 0) return false;
    const reach = Math.sign(direction);
    const to = axis === 'x'
      ? { x: next.x + reach, y: next.y }
      : { x: next.x, y: next.y + reach };
    return !pathIsClear([{ x: next.x, y: next.y }, to], rects);
  };

  const wantsX = Math.abs(dx) > 0.1;
  const blockedXProbe = wantsX && refused('x', dx);
  // What stopped it: if this frame also turns out to have no vertical intent to
  // spend, that rect is the thing to climb around.
  const blockingRect = blockedXProbe
    ? rects.find((rect) => !pathIsClear(
        [{ x: next.x, y: next.y }, { x: next.x + Math.sign(dx), y: next.y }],
        [rect],
      )) || null
    : null;

  let vIntent = 0;
  let verticalDirection = 0;
  if (isTargetingCorridor) {
    // Keep moving upwards through the corridor to pass the blocking row.
    vIntent = -Infinity;
    verticalDirection = -1;
  } else {
    // No blocking row between us and where we are headed: close the vertical
    // gap to the target point (the player, or the last sighting).
    const dy = desiredY - next.y;
    vIntent = dy;
    verticalDirection = Math.abs(dy) > 0.1 ? Math.sign(dy) : 0;

    // Level with the target, and walled off from it.
    //
    // DIRECT mode assumes the way to the learner is open, because the only
    // obstacle it reasons about is the row it has to cross — and when the
    // learner is on the pursuer's own row there is no such row, so no corridor
    // is ever chosen. With the vertical gap already closed there is nothing
    // left to spend the frame on either, so a pursuer standing beside a
    // platform in its own row simply pressed against it forever. Observed for
    // 767 frames, level with the learner, 282 units of horizontal intent, every
    // frame refused.
    //
    // Going around begins with leaving the band that platform occupies, so when
    // the frame's own vertical move would not do that, aim for whichever of its
    // edges is nearer instead. Checking where the move ENDS rather than where
    // the pursuer currently stands is what keeps a sufficient move intact and
    // stops the pursuer lifting clear then dropping straight back, which is a
    // slower way of standing still.
    //
    // This is intent only. Every move below is collision-checked, so a
    // genuinely boxed-in pursuer still cannot pass through anything.
    if (blockedXProbe && blockingRect) {
      const provisional = verticalDirection * Math.min(Math.abs(dy), remainingStep);
      const candidateY = next.y + provisional;
      const stillInBand = candidateY > blockingRect.top && candidateY < blockingRect.bottom;
      if (stillInBand) {
        const toTop = next.y - blockingRect.top;
        const toBottom = blockingRect.bottom - next.y;
        const clearance = Math.min(toTop, toBottom) + 1;
        vIntent = toTop <= toBottom ? -clearance : clearance;
        verticalDirection = Math.sign(vIntent);
      }
    }
  }

  const blockedYProbe = verticalDirection !== 0 && refused('y', verticalDirection);

  // 2. Which axis this frame belongs to.
  //
  // Cadence and leg choice are the only things decided here, and neither can
  // reach the target, the committed corridor or the behaviour state.
  const leg = chooseLegAxis(
    next.locomotion,
    {
      x: wantsX ? dx : 0,
      y: verticalDirection === 0 ? 0 : (Number.isFinite(vIntent) ? vIntent : verticalDirection * Infinity),
      blockedX: blockedXProbe,
      blockedY: blockedYProbe,
    },
    delta,
    tuning,
  );
  next.locomotion = leg.state;
  next.facingAxis = leg.axis;
  if (leg.sign !== 0) next.facingSign = leg.sign;

  // With the leg model off the order is the one it always was: sideways first,
  // then whatever budget the climb reserve left. With it on, the committed leg
  // goes first and the other axis sees a budget only once the leg's own intent
  // is spent — the learner's behaviour at a corner of its route.
  const axisOrder: Array<'x' | 'y'> = legMode
    ? (leg.axis === 'x' ? ['x', 'y'] : ['y', 'x'])
    : ['x', 'y'];

  // 3. Move.
  let hAttempted = 0;
  let hBlocked = false;
  let hApplied = 0;
  let vAttempted = 0;
  let vBlocked = false;
  let vApplied = 0;
  let budgetAfterHorizontal = remainingStep;

  const moveHorizontal = () => {
    const budget = Math.min(remainingStep, horizontalBudget);
    if (wantsX && budget > 0) {
      const moveX = Math.sign(dx) * Math.min(Math.abs(dx), budget);
      const candX = next.x + moveX;
      hAttempted = moveX;
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
    budgetAfterHorizontal = remainingStep;
  };

  const moveVertical = () => {
    if (remainingStep <= 0 || verticalDirection === 0) return;
    const moveY = Number.isFinite(vIntent)
      ? Math.sign(vIntent) * Math.min(Math.abs(vIntent), remainingStep)
      : verticalDirection * remainingStep;
    vAttempted = moveY;
    if (moveY !== 0) {
      const candY = next.y + moveY;
      if (pathIsClear([{ x: next.x, y: next.y }, { x: next.x, y: candY }], rects)) {
        next.y = candY;
        vApplied = moveY;
        remainingStep -= Math.abs(moveY);
      } else {
        vBlocked = true;
      }
    }
  };

  for (const axis of axisOrder) {
    if (axis === 'x') moveHorizontal();
    else moveVertical();
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
    // A hesitating frame is motionless on purpose. Counting it as a stall would
    // make the diagnostic that finds real deadlocks fire on the cadence doing
    // its job, so the pause is reported as itself and nothing more.
    const stalled = next.x === pursuer.x && next.y === pursuer.y && !hesitating;

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
      cadence: hesitating ? 'HESITATING' : 'MOVING',
      direction: { axis: leg.axis, sign: leg.sign, changed: leg.changed },
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
