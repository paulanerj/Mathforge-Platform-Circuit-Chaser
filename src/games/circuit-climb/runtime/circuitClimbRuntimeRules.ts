/**
 * Small pure rules lifted out of the runtime closure so they can be tested.
 *
 * Both of these were silent defects that shipped: neither threw, neither logged,
 * and neither was reachable by a test while it lived inside the loop.
 */

/**
 * Reads a number out of storage, treating "nothing stored" as nothing.
 *
 * The trap this exists to close: `localStorage.getItem` returns `null` for a key
 * that was never written, `Number(null)` is `0`, and `Number.isFinite(0)` is
 * `true`. A guard written as `Number.isFinite(Number(getItem(k)))` therefore
 * accepts the ABSENCE of a value as the value zero. In Circuit Climb that handed
 * every fresh install a view scale of 80 and 6 route turns — clamped up from a
 * zero nobody chose — while the documented defaults of 100 and 8 sat in
 * unreachable fallback branches.
 */
export function parseStoredNumber(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The lowest row index worth keeping when culling the world.
 *
 * Rows below this and off the bottom of the camera are dropped. The pursuer's
 * row is negative while it is still beneath world row 0, and clamping that at 0
 * before subtracting 1 pinned the result at -1 for the whole early game: every
 * row satisfied `index >= -1`, nothing was ever culled, and the collision set
 * that both the learner's routing and the pursuer scan every frame grew without
 * bound.
 */
export function computeKeepBehindRow(playerRow: number, pursuerRow: number) {
  return Math.min(playerRow - 2, pursuerRow - 1);
}

/** The pursuer's row index, negative while it is still below world row 0. */
export function pursuerRowFromWorldY(pursuerY: number, rowGap: number) {
  if (!Number.isFinite(rowGap) || rowGap <= 0) return 0;
  // `+ 0` normalises the -0 that Math.floor(-0 / n) produces, so callers and
  // tests never have to reason about signed zero.
  return Math.floor(-pursuerY / rowGap) + 0;
}
