import { describe, expect, it } from 'vitest';
import { SeededRandom, makeRandomStreams } from '../config/prng';
import {
  defaultRunConfig, configHash, exportRunConfig, importRunConfig, validateRunConfig,
} from '../config/runConfig';
import {
  freshCellValue, generateAdd20Problem, validateAdd20Problem,
} from '../math/add20';

describe('CC2-02A: source-owned deterministic four-row addition', () => {
  it('produces 4,000 valid problems across 1,000 seeded cells with true continuity', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const rng = makeRandomStreams('qualification-' + seed).math;
      let incoming = freshCellValue(rng);
      const seen = new Set<string>();
      for (let row = 1; row <= 4; row += 1) {
        const problem = generateAdd20Problem('qa-' + seed, row, incoming, rng);
        expect(() => validateAdd20Problem(problem)).not.toThrow();
        expect(problem.rowInCell).toBe(row - 1);
        expect(problem.targetValue).toBe(problem.incomingValue + problem.correctValue);
        expect(problem.targetValue).toBeLessThanOrEqual(20);
        expect(problem.options).toHaveLength(3);
        expect(new Set(problem.options.map(o => o.value)).size).toBe(3);
        expect(problem.options.filter(o => o.value === problem.correctValue)).toHaveLength(1);
        expect(seen.has(problem.problemId)).toBe(false);
        seen.add(problem.problemId);
        incoming = problem.targetValue;
      }
    }
  });

  it('repeats math without a shared VFX or pursuer RNG dependency', () => {
    const first = makeRandomStreams('seed-A');
    const second = makeRandomStreams('seed-A');
    // Intentionally consume other streams between mathematical decisions.
    for (let i = 0; i < 1000; i += 1) {
      first.vfx.next();
      first.pursuer.next();
    }
    const p = generateAdd20Problem('same', 1, 3, first.math);
    const q = generateAdd20Problem('same', 1, 3, second.math);
    expect(p).toEqual(q);
    expect(new SeededRandom('X').integer(1, 4)).toBe(new SeededRandom('X').integer(1, 4));
  });

  it('rejects incorrect or tampered mathematical identities', () => {
    const source = generateAdd20Problem('t', 1, 4, new SeededRandom('fixed'));
    const broken = { ...source, targetValue: 100 };
    expect(() => validateAdd20Problem(broken)).toThrow();
  });
});

describe('CC2-02A: versioned configuration authority', () => {
  it('exports and imports exact validated defaults without changing digest', () => {
    const config = defaultRunConfig();
    const restored = importRunConfig(exportRunConfig(config));
    expect(restored).toEqual(config);
    expect(configHash(restored)).toBe(configHash(config));
    expect(config.transitShield).toBe(true);
    expect(config.landingGraceTicks).toBe(15);
    expect(validateRunConfig({ ...config, framingPercent: 87 }).framingPercent).toBe(87);
    expect(validateRunConfig({ ...config, framingPercent: 119 }).framingPercent).toBe(119);
  });

  it('rejects unknown fields and impossible config values', () => {
    const base = defaultRunConfig();
    expect(() => validateRunConfig({ ...base, unexpected: 'yes' })).toThrow('CONFIG_UNKNOWN_OR_MISSING_FIELDS');
    expect(() => validateRunConfig({ ...base, schemaVersion: 'v9' })).toThrow('CONFIG_UNSUPPORTED_VERSION');
    expect(() => validateRunConfig({ ...base, framingPercent: 200 })).toThrow('CONFIG_UNSAFE_FRAMING');
    expect(() => validateRunConfig({ ...base, framingPercent: 88.5 })).toThrow('CONFIG_UNSAFE_FRAMING');
    expect(() => validateRunConfig({ ...base, landingGraceTicks: -1 })).toThrow('CONFIG_INVALID_LANDING_GRACE');
    expect(() => validateRunConfig({ ...base, curriculum: 'multiply' })).toThrow('CONFIG_UNSUPPORTED_CURRICULUM');
  });
});
