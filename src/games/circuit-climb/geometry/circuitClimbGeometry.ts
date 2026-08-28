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
