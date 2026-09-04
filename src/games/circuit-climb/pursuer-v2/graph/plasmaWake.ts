/**
 * The pursuer's plasma wake — presentation only.
 *
 * Not the learner's circuit trail, and not an input to anything: it is never
 * read by routing, sensing, capture or collision. It exists so the red actor
 * reads as charged rather than as a sliding disc.
 *
 * Bounded by ARC LENGTH rather than by time or sample count, which is what makes
 * it behave: a stationary pursuer's wake does not stretch, and a fast one's does
 * not grow. Total path length is held at roughly two pursuer diameters, so the
 * tail is always short and always disappearing.
 */

export interface WakePoint { x: number; y: number }

export class PlasmaWake {
  private points: WakePoint[] = [];
  private length = 0;

  constructor(private maxArcLength: number) {}

  get arcLength() { return this.length; }
  /** Oldest first: the tail tip is index 0, the actor is the last entry. */
  get path(): readonly WakePoint[] { return this.points; }

  reset(at: WakePoint) {
    this.points = [{ x: at.x, y: at.y }];
    this.length = 0;
  }

  push(at: WakePoint) {
    const last = this.points[this.points.length - 1];
    if (last) {
      const step = Math.hypot(at.x - last.x, at.y - last.y);
      if (step < 1e-9) return;
      this.length += step;
    }
    this.points.push({ x: at.x, y: at.y });
    this.trim();
  }

  /**
   * Drops arc length from the oldest end, splitting the oldest segment rather
   * than removing it whole. Removing whole segments makes the tip jump back and
   * forth by a segment's length every few frames, which reads as a flicker.
   */
  private trim() {
    while (this.length > this.maxArcLength && this.points.length > 1) {
      const a = this.points[0];
      const b = this.points[1];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      const excess = this.length - this.maxArcLength;
      if (seg <= excess + 1e-9) {
        this.points.shift();
        this.length -= seg;
      } else {
        const t = excess / seg;
        this.points[0] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        this.length -= excess;
      }
    }
  }
}
