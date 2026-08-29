export const CIRCUIT_CLIMB_GEOMETRY = {
  logicalWidth: 600,
  platformWidth: 104,
  platformHeight: 62,
  playerRadius: 32,
  rowGap: 205,
  columns: [110 / 600, 300 / 600, 490 / 600],
  routePlatformPadding: 8,
};

export type ShiftOffsetType = 'left' | 'center' | 'right';
export const SHIFT_OFFSETS: Record<ShiftOffsetType, number> = {
  left: -24,
  center: 0,
  right: 24,
};

export interface PlatformBounds {
  center: number;
  left: number;
  right: number;
}

export function computePlatformBounds(
  columnIndex: number,
  shiftOffset: number = 0
): PlatformBounds {
  const fraction = CIRCUIT_CLIMB_GEOMETRY.columns[columnIndex];
  const centerX = fraction * CIRCUIT_CLIMB_GEOMETRY.logicalWidth + shiftOffset;
  const halfW = CIRCUIT_CLIMB_GEOMETRY.platformWidth / 2;
  
  return {
    center: centerX,
    left: centerX - halfW,
    right: centerX + halfW,
  };
}

export interface Corridor {
  id: string;
  type: 'interior' | 'exterior';
  left: number; // Actor-center safe left bound
  right: number; // Actor-center safe right bound
  width: number;
  center: number;
}

export function computeActorSafeCorridors(
  p0: PlatformBounds,
  p1: PlatformBounds,
  p2: PlatformBounds
): Corridor[] {
  const corridors: Corridor[] = [];
  const padding = CIRCUIT_CLIMB_GEOMETRY.routePlatformPadding;
  const radius = CIRCUIT_CLIMB_GEOMETRY.playerRadius;
  const safetyMargin = 6;
  
  const minActorClearance = radius + safetyMargin;

  // Exterior Left (Corridor A)
  const aLeft = minActorClearance;
  const aRight = p0.left - padding - radius;
  if (aRight >= aLeft) {
    corridors.push({
      id: 'A',
      type: 'exterior',
      left: aLeft,
      right: aRight,
      width: aRight - aLeft,
      center: (aLeft + aRight) / 2,
    });
  }

  // Interior Left-Center (Corridor B)
  const bLeft = p0.right + padding + radius;
  const bRight = p1.left - padding - radius;
  if (bRight >= bLeft) {
    corridors.push({
      id: 'B',
      type: 'interior',
      left: bLeft,
      right: bRight,
      width: bRight - bLeft,
      center: (bLeft + bRight) / 2,
    });
  }

  // Interior Center-Right (Corridor C)
  const cLeft = p1.right + padding + radius;
  const cRight = p2.left - padding - radius;
  if (cRight >= cLeft) {
    corridors.push({
      id: 'C',
      type: 'interior',
      left: cLeft,
      right: cRight,
      width: cRight - cLeft,
      center: (cLeft + cRight) / 2,
    });
  }

  // Exterior Right (Corridor D)
  const dLeft = p2.right + padding + radius;
  const dRight = CIRCUIT_CLIMB_GEOMETRY.logicalWidth - minActorClearance;
  if (dRight >= dLeft) {
    corridors.push({
      id: 'D',
      type: 'exterior',
      left: dLeft,
      right: dRight,
      width: dRight - dLeft,
      center: (dLeft + dRight) / 2,
    });
  }

  return corridors;
}

export function computeInversePointerTransform(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  worldScale: number
) {
  return {
    logicalX: (clientX - rect.left) / worldScale,
    logicalY: (clientY - rect.top) / worldScale,
  };
}

/**
 * Margin by which a route's crossing altitude must clear the collision band of
 * the row it passes beneath.
 */
export const ROUTE_CROSSING_CLEARANCE = 9;

/**
 * How far below a destination row a route crosses on its way to a corridor.
 *
 * This MUST stay below the row's actor-inflated collision band. Getting it
 * wrong is not a cosmetic routing wobble: a crossing altitude inside the band
 * is rejected by pathIsClear on every candidate corridor, buildCircuitPath
 * returns null, and the learner cannot select any platform at all. That was the
 * SOT-20 first-move failure. The formula lives here, beside the rect inflation
 * it has to agree with, so the two cannot drift apart again.
 */
export function computeRouteCrossingOffset(config: {
  platformHeight: number;
  routePlatformPadding: number;
  playerRadius: number;
}) {
  return (
    config.platformHeight +
    config.routePlatformPadding +
    config.playerRadius +
    ROUTE_CROSSING_CLEARANCE
  );
}

export function computePlatformCollisionRects(platforms: any[], actorRadius = CIRCUIT_CLIMB_GEOMETRY.playerRadius) {
  const pad = CIRCUIT_CLIMB_GEOMETRY.routePlatformPadding + actorRadius;
  const rects: any[] = [];
  platforms.forEach((platform) => {
    // Platform row 0 logic normally handled by caller filtering, but we can do it here if needed.
    // Or assume caller passes exactly the platforms to check.
    rects.push({
      platform,
      left: platform.x - platform.width / 2 - pad,
      right: platform.x + platform.width / 2 + pad,
      top: platform.y - pad,
      bottom: platform.y + platform.height + pad,
    });
  });
  return rects;
}

export function segmentHitsRect(a: any, b: any, rect: any) {
  if (a.x === b.x) {
    if (a.x <= rect.left || a.x >= rect.right) return false;
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return bottom > rect.top && top < rect.bottom;
  }
  if (a.y === b.y) {
    if (a.y <= rect.top || a.y >= rect.bottom) return false;
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return right > rect.left && left < rect.right;
  }
  return true;
}

/** Shortest distance from a point to a line segment. */
export function distancePointToSegment(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * How close a route passes to a point, at its closest.
 *
 * `skipDistance` ignores that much arc length from the start of the route.
 * Every candidate route leaves from the same place, so when the threat is near
 * the actor — which is exactly when it is dangerous — the shared opening leg
 * dominates the measurement and every candidate scores the same. Skipping it
 * measures the part of the route the candidates actually differ on.
 */
export function pathClearance(
  points: any[],
  point: { x: number; y: number },
  skipDistance = 0,
) {
  if (!points || points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y);

  let travelled = 0;
  let closest = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const segmentEnd = travelled + length;

    if (segmentEnd > skipDistance) {
      // Clip the segment to the part beyond the skipped opening.
      let start = a;
      if (travelled < skipDistance && length > 0) {
        const t = (skipDistance - travelled) / length;
        start = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      closest = Math.min(closest, distancePointToSegment(point, start, b));
    }
    travelled = segmentEnd;
  }
  // A route shorter than the skip distance has nothing left to judge.
  return closest;
}

/**
 * Picks which of several already-validated routes to travel, given a threat to
 * steer around.
 *
 * The threat only ever REORDERS candidates. It cannot reject one, and this
 * function is never given a route that collision has not already approved.
 * That separation is deliberate: route rejection is what made every platform
 * unclickable in SOT 20, and a pursuer that can veto routes would be able to
 * reproduce that by standing in the wrong place.
 *
 * `avoidance` 0 returns the first candidate — exactly the "first clear route
 * wins" ordering that shipped before threat awareness existed. At 1 a route
 * passing right through the threat loses to any route that keeps its distance.
 */
export function chooseRouteAgainstThreat(
  candidates: { points: any[] }[],
  threat: { x: number; y: number } | null,
  avoidance: number,
  threatRadius: number,
  skipDistance = 0,
) {
  if (candidates.length === 0) return -1;
  const weight = Math.max(0, Math.min(1, avoidance));
  if (!threat || weight === 0 || threatRadius <= 0) return 0;

  // Natural preference and exposure are both normalised to 0..1 and blended, so
  // `avoidance` reads as the balance between them rather than as an arbitrary
  // magnitude. Raw list position cannot be used directly: a rank gap of 1 buries
  // an exposure of 0.26, which is how a genuinely exposed route kept winning
  // against a clean alternative.
  //
  // Exposure carries double weight so that at avoidance 0.5 a route running
  // straight through the threat still loses to a clear detour. A tiny rank term
  // survives at every weight to break ties in favour of the natural route.
  let bestIndex = 0;
  let bestScore = Infinity;
  const span = Math.max(1, candidates.length - 1);
  candidates.forEach((candidate, index) => {
    const rank = index / span;
    const clearance = pathClearance(candidate.points, threat, skipDistance);
    const exposure = Math.max(0, 1 - clearance / threatRadius);
    const score = rank * (1 - weight) + exposure * weight * 2 + rank * 1e-3;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function pathIsClear(
  points: any[], 
  rects: any[], 
  options?: { destinationPlatform?: any; landingPoint?: { x: number, y: number }; sourcePlatform?: any }
) {
  const destinationPlatform = options?.destinationPlatform;
  const sourcePlatform = options?.sourcePlatform;
  const landingPoint = options?.landingPoint;
  
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const isTerminalSegment = i === points.length - 1;

    for (const rect of rects) {
      if (segmentHitsRect(a, b, rect)) {
        if (sourcePlatform && rect.platform.id === sourcePlatform.id) {
          const stricterRect = { ...rect, top: rect.platform.y };
          if (!segmentHitsRect(a, b, stricterRect)) {
            continue;
          }
        }

        if (
          isTerminalSegment &&
          destinationPlatform &&
          rect.platform.id === destinationPlatform.id &&
          landingPoint
        ) {
          // Terminal segment, vertical, exact endpoint match
          if (
            a.x === b.x &&
            Math.abs(b.x - landingPoint.x) < 0.1 &&
            Math.abs(b.y - landingPoint.y) < 0.1
          ) {
            const topPointY = Math.min(a.y, b.y);
            if (topPointY < rect.platform.y) {
              const stricterRect = { ...rect, top: rect.platform.y };
              if (!segmentHitsRect(a, b, stricterRect)) {
                continue;
              }
            }
          }
        }
        return false;
      }
    }
  }
  return true;
}
