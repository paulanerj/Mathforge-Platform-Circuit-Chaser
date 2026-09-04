import { runProductionSurface, summariseTrace } from './src/games/circuit-climb/pursuer-v2/testing/productionSurfaceRun';

// The human's session shape: five accepted climbs across LEFT/CENTRE/RIGHT
// with a cross-board change, human pacing, then the learner stops.
const climbs = [1, 0, 2, 0, 1];

for (const [label, opts] of [
  ['04A spawn (rejected)  @60Hz ', { spawn: 'integration' as const, dtMs: 16.7 }],
  ['04A spawn (rejected)  @144Hz', { spawn: 'integration' as const, dtMs: 6.94 }],
  ['AUTHORITY spawn       @60Hz ', { spawn: 'authority' as const, dtMs: 16.7 }],
  ['AUTHORITY spawn       @144Hz', { spawn: 'authority' as const, dtMs: 6.94 }],
] as const) {
  const r = runProductionSurface({ climbColumns: climbs, thinkMs: 4500, stationaryMs: 15000, ...opts });
  console.log(`${label}  final=${r.finalDistance.toFixed(0)}  min=${r.minDistance.toFixed(0)}  `
    + `stationary ${r.stationaryStartDistance.toFixed(0)}->${r.stationaryEndDistance.toFixed(0)} (min ${r.stationaryMinDistance.toFixed(0)})  `
    + `row=${r.highestLearnerRow}  mode=${r.trace[r.trace.length-1].mode}  `
    + `frames=${r.diagnostics.frames} modeCh=${r.diagnostics.modeChanges} commitEnds=${r.diagnostics.commitmentEnds} `
    + `acq=${r.diagnostics.rawSenseAcquired} lost=${r.diagnostics.rawSenseLost} trail=${r.diagnostics.trailFragmentsDetected} `
    + `targets=${r.diagnostics.targetChanges} ext=${r.diagnostics.graphExtensions}`);
}
