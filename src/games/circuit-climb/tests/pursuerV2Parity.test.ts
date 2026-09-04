/**
 * BEHAVIOURAL PARITY — is the production pursuer actually the accepted Lab
 * candidate?
 *
 * A transplant is only worth anything if it transplanted the behaviour. Test
 * counts cannot show that: the Lab suite and this suite could both be green
 * while the integrated pursuer decides something different. So this file
 * re-runs the accepted Lab's own closed-loop geometries through the
 * PRODUCTION-INTEGRATED graph and Brain, and compares the result against a
 * signature captured from Lab commit f22acf6 itself.
 *
 * The comparison is not a summary. `streamSha256` covers every decision field
 * on every one of 900 frames — strategic mode, target source, projected node,
 * pursuer position, pursuer node, the raw sensor bit, the named commitment end
 * reason, commitment age, trail consumption, retarget flags — for each of nine
 * geometries. A single frame choosing a different node fails it.
 *
 * This is possible at all because production geometry and the Lab's standalone
 * framing reimplementation agree bit for bit (see pursuerV2Geometry.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { runClosedLoop } from '../pursuer-v2/testing/closedLoopRun';
import type { TrunkId } from '../pursuer-v2/graph/pursuitGraph';
import accepted from '../pursuer-v2/testing/fixtures/acceptedLabParity.json';

/** The accepted Lab's nine closed-loop geometries, reproduced exactly. */
const LEARNERS = [
  { x: 490, y: -2245.8 },
  { x: 490, y: -2061.3 },
  { x: 300, y: -2245.8 },
];
const STARTS: Array<{ trunk: TrunkId; level: number }> = [
  { trunk: 'A', level: 11 },
  { trunk: 'B', level: 12 },
  { trunk: 'C', level: 10 },
];

function priorTrailFor(learner: { x: number; y: number }) {
  const points: Array<{ x: number; y: number; tMs: number }> = [];
  let tMs = 0;
  const push = (x: number, y: number) => { tMs += 16.7; points.push({ x, y, tMs }); };
  for (let x = 300; x <= 490; x += 5) push(x, -2061.3);
  for (let y = -2061.3; y >= learner.y; y -= 5) push(490, y);
  return points;
}

function runScenario(learner: { x: number; y: number }, start: { trunk: TrunkId; level: number }) {
  const prior = priorTrailFor(learner);
  return runClosedLoop({
    framingPercent: accepted.framingPercent,
    rowCount: accepted.rowCount,
    frames: accepted.frames,
    learnerAt: () => learner,
    pursuerStart: start,
    priorTrail: prior,
    startTMs: prior[prior.length - 1].tMs,
  });
}

/** The exact canonical encoding the accepted fixture was hashed over. */
function streamHash(result: ReturnType<typeof runScenario>) {
  const lines = result.samples.map((s) => [
    s.frame, s.tMs, s.mode, s.targetSource, s.projectedNode,
    s.pursuerX, s.pursuerY, s.pursuerNode, s.rawSensed,
    s.commitmentEndReason, s.commitmentHeld, s.commitmentAgeMs,
    s.trailLeadConsumed, s.sensedFragmentCount, s.retargeted,
    s.newFragmentEvidence, s.distanceToLearner,
  ].join('|'));
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

describe('GRAPH_PURSUER_V2 parity with the accepted Lab candidate', () => {
  it('the fixture names the accepted Lab authority it came from', () => {
    expect(accepted.source.labCommit).toBe('f22acf63e168807b566a307e83d9c8556de582e1');
    expect(accepted.source.labTree).toBe('e8eb1ce620d617c621a6ffb3a98463c97f5a0d4d');
    expect(accepted.scenarios).toHaveLength(LEARNERS.length * STARTS.length);
  });

  const cases = LEARNERS.flatMap((learner) =>
    STARTS.map((start) => ({ learner, start, key: `${learner.x},${learner.y}|${start.trunk}${start.level}` })));

  for (const { learner, start, key } of cases) {
    it(`reproduces the accepted decision stream exactly: ${key}`, () => {
      const expected = accepted.scenarios.find((s) => s.key === key);
      expect(expected, `no accepted signature for ${key}`).toBeDefined();

      const result = runScenario(learner, start);

      // FIELD-LEVEL first, so a failure says WHAT diverged rather than only
      // that a hash moved.
      expect(result.metrics.modeTransitions).toBe(expected!.metrics.modeTransitions);
      expect(result.metrics.rawDirectSensorEdges).toBe(expected!.metrics.rawDirectSensorEdges);
      expect(result.metrics.strategicDirectAcquisitions).toBe(expected!.metrics.strategicDirectAcquisitions);
      expect(result.metrics.confirmedDirectLosses).toBe(expected!.metrics.confirmedDirectLosses);
      expect(result.metrics.stableReacquisitions).toBe(expected!.metrics.stableReacquisitions);
      expect(result.metrics.oneTickModeEpisodes).toBe(expected!.metrics.oneTickModeEpisodes);
      expect(result.metrics.episodesUnder60ms).toBe(expected!.metrics.episodesUnder60ms);
      expect(result.metrics.targetReversals).toBe(expected!.metrics.targetReversals);
      expect(result.metrics.maxSameNodeDwellFrames).toBe(expected!.metrics.maxSameNodeDwellFrames);
      expect(result.metrics.maxABACyclesIn2s).toBe(expected!.metrics.maxABACyclesIn2s);
      expect(result.metrics.maxRedundantModeRevisitsIn2s).toBe(expected!.metrics.maxRedundantModeRevisitsIn2s);
      expect(result.metrics.distinctNodesVisited).toBe(expected!.metrics.distinctNodesVisited);
      expect(result.metrics.finalDistanceToLearner).toBeCloseTo(expected!.metrics.finalDistanceToLearner, 9);
      expect(result.metrics.minDistanceToLearner).toBeCloseTo(expected!.metrics.minDistanceToLearner, 9);
      expect(result.metrics.modeEpisodeMedianMs).toBeCloseTo(expected!.metrics.modeEpisodeMedianMs, 9);
      expect(result.metrics.pursuerXRange.min).toBeCloseTo(expected!.metrics.pursuerXRange.min, 9);
      expect(result.metrics.pursuerXRange.max).toBeCloseTo(expected!.metrics.pursuerXRange.max, 9);

      // ...then exactness over every field of every frame.
      expect(streamHash(result)).toBe(expected!.streamSha256);
    }, 60000);
  }

  it('the combined signature over all nine geometries matches the accepted Lab', () => {
    const hashes = cases.map(({ learner, start }) => streamHash(runScenario(learner, start)));
    const combined = createHash('sha256').update(hashes.join('\n')).digest('hex');
    expect(combined).toBe(accepted.combinedSha256);
  }, 120000);
});
