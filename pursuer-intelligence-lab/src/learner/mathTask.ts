/**
 * THE MATHS, kept because the pacing it produces is the point.
 *
 * Circuit Climb is an arithmetic game and the pursuit is tuned against a
 * learner who has to stop and think. Reproducing the exact curriculum would be
 * out of scope here, but reproducing the SHAPE — "you are holding 1, the
 * target is 7, which platform is 6?" — costs almost nothing and keeps
 * realistic mode honest about how long a selection takes.
 *
 * MODE B removes it entirely. That is not a simplification of the maths, it is
 * a different instrument: dozens of pursuit tests without solving dozens of
 * sums.
 */

export interface MathRound {
  /** The value the learner is carrying. */
  held: number;
  /** The sum to reach. */
  target: number;
  /** The number on each of the three platforms, left to right. */
  options: [number, number, number];
  /** Which column is correct. */
  correctColumn: number;
}

/**
 * A round, from a seeded generator so a scripted or replayed session poses the
 * same problems in the same order.
 */
export function makeRound(seed: number, held: number): MathRound {
  const random = (n: number) => {
    let t = (seed + n * 0x9e3779b9) | 0;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
  const answer = 1 + Math.floor(random(1) * 9);
  const target = held + answer;
  const correctColumn = Math.floor(random(2) * 3);
  const options = [0, 1, 2].map((column) => {
    if (column === correctColumn) return answer;
    // Distractors are near misses, because a distractor nobody would pick
    // makes the thinking time unrealistically short.
    const offset = 1 + Math.floor(random(10 + column) * 4);
    const candidate = random(20 + column) < 0.5 ? answer - offset : answer + offset;
    return Math.max(1, candidate === answer ? answer + 1 : candidate);
  }) as [number, number, number];
  return { held, target, options, correctColumn };
}
