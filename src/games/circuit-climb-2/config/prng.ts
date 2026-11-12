/**
 * CC2-02A — deterministic, independent random streams.
 *
 * Simulation outcomes must not change if a renderer consumes extra random
 * numbers for particles. Each named stream derives its own state from the
 * same run seed, rather than advancing a shared Math.random() sequence.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    const input = String(seed);
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    this.state = hash >>> 0;
  }

  /** Mulberry32: a deterministic unsigned-32-bit generator. */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error('INVALID_RNG_RANGE');
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.integer(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export function makeRandomStreams(seed: string): {
  math: SeededRandom;
  world: SeededRandom;
  pursuer: SeededRandom;
  special: SeededRandom;
  vfx: SeededRandom;
} {
  return {
    math: new SeededRandom(`${seed}:math:v1`),
    world: new SeededRandom(`${seed}:world:v1`),
    pursuer: new SeededRandom(`${seed}:pursuer:v1`),
    special: new SeededRandom(`${seed}:special:v1`),
    vfx: new SeededRandom(`${seed}:vfx:v1`),
  };
}
