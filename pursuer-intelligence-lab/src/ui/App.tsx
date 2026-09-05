/**
 * THE PURSUER INTELLIGENCE LAB.
 *
 * One screen: the game on the left, the instruments on the right.
 *
 * The layout is not decoration. The whole reason this sandbox exists is that
 * the human's report — "it bumps around with its eyes closed" — could not be
 * connected to anything the pursuer was actually doing. So the board and the
 * reason the pursuer is doing what it is doing are on screen at the same time,
 * and a tester who sees something stupid can pause and read the answer without
 * leaving the page or opening a JSON file.
 */
import React from 'react';

import { Simulation, type PlayMode } from '../sim/simulation';
import { SIM_STEP_MS, type TimebaseMode } from '../sim/timebase';
import { render, DEFAULT_OVERLAYS, type OverlayFlags } from '../render/renderer';
import { BRAINS, brainById, PERCEPTION_MODELS, perceptionModelById, productionEligible, REGISTRY_VIEW } from '../pursuer/registry';
import { BASELINE_LOCOMOTION, type LocomotionConfig } from '../pursuer/rig';
import { computeRunMetrics, metricsRow } from '../pursuer/metrics/runMetrics';
import { analyseCapture } from '../pursuer/metrics/captureDeliberateness';
import { LEARNER_SCRIPTS, scriptById } from '../learner/scripts';
import { runScript } from '../sim/scriptRunner';
import { makeRound, type MathRound } from '../learner/mathTask';
import { parseRecordedRun, type RecordedRun } from '../sim/recording';
import {
  baselineLabConfiguration, validateLabConfiguration, labConfigurationHash, shortLabHash,
  diffLabConfigurations, LAB_CONFIG_SCHEMA_VERSION, type LabConfiguration,
} from '../pursuer/config/labConfiguration';
import { Card, Row, Slider, Transfer, styles, MONO } from './panels';

const RATINGS = [
  ['smartOpponent', 'SMART OPPONENT'],
  ['purposeful', 'PURPOSEFUL'],
  ['threatening', 'THREATENING'],
  ['seemsBlind', 'SEEMS BLIND'],
  ['arbitraryTurns', 'ARBITRARY TURNS'],
  ['tooStaggered', 'TOO STAGGERED'],
  ['fair', 'FAIR'],
  ['mathThinkingTime', 'ENOUGH MATH THINKING TIME'],
  ['captureFeltEarned', 'CAPTURE FELT EARNED'],
] as const;

type RatingKey = (typeof RATINGS)[number][0];

export const App: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simRef = React.useRef<Simulation | null>(null);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  // ── what is being run ───────────────────────────────────────────────────
  const [brainId, setBrainId] = React.useState(BRAINS[0].id);
  const [perceptionId, setPerceptionId] = React.useState('P0_PRODUCTION');
  const [brainConfig, setBrainConfig] = React.useState<Record<string, number>>({});
  const [perceptionConfig, setPerceptionConfig] = React.useState<Record<string, number>>({});
  const [locomotion, setLocomotion] = React.useState<LocomotionConfig>({ ...BASELINE_LOCOMOTION });
  const [timebase, setTimebase] = React.useState<TimebaseMode>('FIXED');
  const [mode, setMode] = React.useState<PlayMode>('PURSUIT_TEST');
  const [captureArmed, setCaptureArmed] = React.useState(true);

  const [overlays, setOverlays] = React.useState<OverlayFlags>(DEFAULT_OVERLAYS);
  const [paused, setPaused] = React.useState(false);
  const [reviewIndex, setReviewIndex] = React.useState<number | null>(null);
  const [transfer, setTransfer] = React.useState<{ title: string; text: string; editable?: boolean; onLoad?: (t: string) => void } | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [replay, setReplay] = React.useState<RecordedRun | null>(null);
  const [comparison, setComparison] = React.useState<Record<string, string>[] | null>(null);
  const [ratings, setRatings] = React.useState<Partial<Record<RatingKey, number>>>({});
  const [ratingNotes, setRatingNotes] = React.useState('');
  const [round, setRound] = React.useState<MathRound | null>(null);

  const brain = brainById(brainId)!;
  const perception = perceptionModelById(perceptionId)!;
  const eligible = productionEligible(brainId, perceptionId);
  const say = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(null), 4500); };

  // ── the configuration, as a first-class object ──────────────────────────
  const configuration: LabConfiguration = React.useMemo(() => ({
    ...baselineLabConfiguration(brainId, brain.defaultConfig as any),
    configurationId: `session/${brainId}`,
    label: `${brain.label} · session`,
    brainId,
    perceptionModelId: perceptionId,
    brainConfig: { ...(brain.defaultConfig as any), ...brainConfig },
    perceptionConfig: { ...(perception.defaultConfig as any), ...perceptionConfig },
    locomotion,
    timebase,
    stepMs: SIM_STEP_MS,
    lifecycle: 'EXPERIMENTAL',
  }), [brainId, perceptionId, brainConfig, perceptionConfig, locomotion, timebase, brain, perception]);

  const hash = React.useMemo(() => labConfigurationHash(configuration), [configuration]);

  const restart = React.useCallback(() => {
    simRef.current = new Simulation({
      brain, perception,
      brainConfig: configuration.brainConfig,
      perceptionConfig: configuration.perceptionConfig,
      locomotion, timebase, captureArmed, replay,
    });
    setReviewIndex(null);
    setPaused(false);
    setRound(mode === 'REALISTIC' ? makeRound(1, 1) : null);
    forceRender();
  }, [brain, perception, configuration, locomotion, timebase, captureArmed, replay, mode]);

  React.useEffect(() => { restart(); /* eslint-disable-next-line */ }, []);

  // ── the frame loop ──────────────────────────────────────────────────────
  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const frameMs = now - last;
      last = now;
      const simulation = simRef.current;
      if (simulation) {
        if (!paused && reviewIndex === null) simulation.advance(frameMs);
        if (canvasRef.current) render(canvasRef.current, simulation, overlays, reviewIndex);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, overlays, reviewIndex]);

  // Readouts refresh on a timer rather than every frame: re-rendering the
  // whole instrument panel at 120Hz would cost more than the simulation does.
  React.useEffect(() => {
    const id = window.setInterval(forceRender, 200);
    return () => window.clearInterval(id);
  }, []);

  const choose = React.useCallback((column: number) => {
    const simulation = simRef.current;
    if (!simulation || simulation.captured) return;
    if (mode === 'REALISTIC' && round) {
      if (column !== round.correctColumn) { say('Wrong answer — the Spark stays put.'); return; }
      if (simulation.select(column)) {
        setRound(makeRound(simulation.learner.row + 2, round.target));
      }
      return;
    }
    simulation.select(column);
  }, [mode, round]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === '1') choose(0);
      else if (event.key === '2') choose(1);
      else if (event.key === '3') choose(2);
      else if (event.key === ' ') { event.preventDefault(); setPaused((p) => !p); }
      else if (event.key === 'r' || event.key === 'R') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, restart]);

  const simulation = simRef.current;
  const sample = simulation && (reviewIndex !== null
    ? simulation.samples[reviewIndex]
    : simulation.samples[simulation.samples.length - 1]);
  const metrics = simulation && simulation.samples.length
    ? computeRunMetrics({
      samples: simulation.samples, events: simulation.events,
      durationMs: simulation.timebase.elapsedMs,
      captured: simulation.captured, capturedAtMs: simulation.capturedAtMs,
    })
    : null;
  const capture = simulation ? analyseCapture(simulation.samples, simulation.capturedAtMs) : null;

  // ── A/B/C comparison over one recorded learner run ──────────────────────
  const compare = () => {
    const recording = replay ?? (simulation && simulation.recorder.count
      ? simulation.finishRecording({ id: 'session', label: 'this session' })
      : null);
    if (!recording || !recording.selections.length) {
      say('Record a learner run first — play a few climbs, then press COMPARE.');
      return;
    }
    const script = { id: 'REPLAY', label: 'replay', description: '', steps: [], stationaryMs: recording.durationMs };
    const rows = BRAINS.map((candidate) => {
      const result = runScript(script as any, {
        brain: candidate, perception, locomotion, timebase, captureArmed, replay: recording,
      });
      return { ...metricsRow(result.metrics), verdict: result.capture.verdict };
    });
    setComparison(rows);
    say(`Replayed the same learner run against ${rows.length} Brains.`);
  };

  const exportRun = () => {
    if (!simulation) return;
    setTransfer({
      title: 'Run export',
      text: JSON.stringify({
        schema: 'circuit-climb-lab/run/v1',
        configuration, configurationHash: hash, productionEligible: eligible,
        metrics, capture,
        ratings, ratingNotes,
        events: simulation.events,
        samples: simulation.samples,
      }, null, 1),
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 460px', height: '100%' }}>
      {/* ── the game ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', background: '#f0f6fc' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <div style={{
          position: 'absolute', left: 10, top: 10, right: 10, display: 'flex', gap: 8,
          alignItems: 'center', flexWrap: 'wrap', color: '#0E1B33',
        }}>
          <strong>{brain.label}</strong>
          <span style={{ opacity: 0.7 }}>{perception.label}</span>
          <span style={{ opacity: 0.55 }}>{shortLabHash(configuration)}</span>
          {!eligible && (
            <span style={{ background: '#8b1d1d', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
              CHEATING REFERENCE — NOT PRODUCTION ELIGIBLE
            </span>
          )}
          {simulation?.captured && <span style={{ color: '#8b1d1d' }}>CAPTURED</span>}
        </div>

        {mode === 'REALISTIC' && round && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 78, textAlign: 'center', color: '#0E1B33',
          }}>
            <div style={{ fontSize: 20 }}>{round.held} + ? = {round.target}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, fontSize: 18 }}>
              {round.options.map((value, index) => <span key={index}>{value}</span>)}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
          {['LEFT (1)', 'CENTRE (2)', 'RIGHT (3)'].map((label, index) => (
            <button key={label} style={{ ...styles.primary, padding: '8px 16px' }} onClick={() => choose(index)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── the instruments ────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', padding: 12, borderLeft: '1px solid #22314a' }}>
        {notice && <div style={{ ...styles.card, borderColor: '#2f6f4f', color: '#a8e6c0' }}>{notice}</div>}

        <Card title="What the bot is doing"
          right={<span style={{ opacity: 0.6 }}>{simulation ? `${(simulation.timebase.elapsedMs / 1000).toFixed(1)}s` : ''}</span>}>
          {sample ? (
            <div style={{ lineHeight: 1.7 }}>
              <div>MODE: <b style={{ color: '#9fd0ff' }}>{sample.pursuer.modeLabel}</b></div>
              <div>WHY: {sample.pursuer.explanation}</div>
              <div>REASON CODE: <span style={{ color: '#c9a6ff' }}>{sample.pursuer.reasonCode}</span></div>
              <div>CONFIDENCE: {sample.pursuer.confidence.toFixed(2)}</div>
              <div>PERCEIVING: {sample.pursuer.perceptionActive ? (sample.pursuer.perceptionLive ? 'yes, live' : 'yes, held') : 'no'}</div>
              <div>TARGET: {sample.pursuer.targetNode ?? (sample.pursuer.target ? `${sample.pursuer.target.x.toFixed(0)}, ${sample.pursuer.target.y.toFixed(0)}` : '—')}</div>
              <div>ROUTE: {sample.pursuer.routeNodes.join(' → ') || '—'}</div>
              <div>DISTANCE: {sample.pursuer.distanceToLearner.toFixed(0)}u straight ·
                {' '}{sample.pursuer.graphDistanceToLearner?.toFixed(0) ?? '—'}u by legal route
                {sample.pursuer.closedUsefulDistance ? ' (closing)' : ''}</div>
            </div>
          ) : <span style={{ opacity: 0.6 }}>waiting for the first tick…</span>}
        </Card>

        <Card title="Run">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button style={styles.primary} onClick={restart}>APPLY AND RESTART (R)</button>
            <button style={styles.button} onClick={() => setPaused((p) => !p)}>{paused ? 'RESUME' : 'PAUSE'} (space)</button>
            <button style={styles.button} onClick={() => setCaptureArmed((c) => !c)}>
              CAPTURE {captureArmed ? 'ARMED' : 'DISARMED'}
            </button>
            <button style={styles.button} onClick={exportRun}>EXPORT RUN</button>
          </div>
          <Row label="Play mode">
            <select data-testid="play-mode" value={mode} onChange={(e) => setMode(e.target.value as PlayMode)} style={styles.button}>
              <option value="PURSUIT_TEST">B · PURSUIT TEST — pick a column, no maths</option>
              <option value="REALISTIC">A · REALISTIC — solve to move</option>
            </select>
          </Row>
          <Row label="Timebase" title="FIXED decouples the simulation from the display. RENDER_COUPLED reproduces production's refresh dependence.">
            <select data-testid="timebase" value={timebase} onChange={(e) => setTimebase(e.target.value as TimebaseMode)} style={styles.button}>
              <option value="FIXED">FIXED — 120Hz simulation, display-independent</option>
              <option value="RENDER_COUPLED">RENDER_COUPLED — production behaviour</option>
            </select>
          </Row>
          {/* The scrubber. Pause, then drag back to the moment it did something odd. */}
          <Row label="Review">
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="range" min={0} max={Math.max(0, (simulation?.samples.length ?? 1) - 1)}
                value={reviewIndex ?? Math.max(0, (simulation?.samples.length ?? 1) - 1)}
                onChange={(e) => { setPaused(true); setReviewIndex(Number(e.target.value)); }}
                style={{ flex: 1 }} />
              <button style={styles.button} onClick={() => setReviewIndex(null)}>LIVE</button>
            </span>
          </Row>
        </Card>

        <Card title="Brain and perception">
          <Row label="Brain">
            <select data-testid="brain" value={brainId} onChange={(e) => { setBrainId(e.target.value); setBrainConfig({}); }} style={{ ...styles.button, width: '100%' }}>
              {BRAINS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
            </select>
          </Row>
          <div style={{ opacity: 0.65, margin: '2px 0 8px' }}>{brain.description}</div>
          <Row label="Perception">
            <select data-testid="perception" value={perceptionId} onChange={(e) => { setPerceptionId(e.target.value); setPerceptionConfig({}); }} style={{ ...styles.button, width: '100%' }}>
              {PERCEPTION_MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
          </Row>
          <div style={{ opacity: 0.65, margin: '2px 0 4px' }}>{perception.description}</div>
          {perception.warning && (
            <div style={{ color: '#ffb4b4', marginBottom: 6 }}>{perception.warning}</div>
          )}
          {brain.parameters.map((parameter) => (
            <Row key={parameter.path} label={parameter.label} title={parameter.reason}>
              <Slider min={parameter.min} max={parameter.max} step={parameter.step} unit={parameter.unit}
                value={(brainConfig[parameter.path] ?? (brain.defaultConfig as any)[parameter.path]) as number}
                onChange={(value) => setBrainConfig((c) => ({ ...c, [parameter.path]: value }))} />
            </Row>
          ))}
          {perception.parameters.map((parameter) => (
            <Row key={parameter.path} label={parameter.label} title={parameter.reason}>
              <Slider min={parameter.min} max={parameter.max} step={parameter.step} unit={parameter.unit}
                value={(perceptionConfig[parameter.path] ?? (perception.defaultConfig as any)[parameter.path]) as number}
                onChange={(value) => setPerceptionConfig((c) => ({ ...c, [parameter.path]: value }))} />
            </Row>
          ))}
        </Card>

        <Card title="Locomotion — shared by every Brain">
          {([
            ['speed', 0.01, 1, 0.005, ' u/ms'], ['minBurstMs', 20, 4000, 10, ' ms'],
            ['maxBurstMs', 20, 4000, 10, ' ms'], ['minPauseMs', 0, 4000, 10, ' ms'],
            ['maxPauseMs', 0, 4000, 10, ' ms'], ['pauseChance', 0, 1, 0.01, ''],
          ] as const).map(([key, min, max, step, unit]) => (
            <Row key={key} label={key}>
              <Slider min={min} max={max} step={step} unit={unit} value={locomotion[key]}
                onChange={(value) => setLocomotion((l) => ({ ...l, [key]: value }))} />
            </Row>
          ))}
        </Card>

        <Card title="Configuration"
          right={<span style={{ opacity: 0.6 }}>{LAB_CONFIG_SCHEMA_VERSION}</span>}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={styles.button} onClick={() => setTransfer({ title: 'Configuration JSON', text: JSON.stringify(configuration, null, 2) })}>COPY CONFIG</button>
            <button style={styles.button} onClick={() => setTransfer({
              title: 'Paste a configuration', text: '', editable: true,
              onLoad: (text) => {
                let parsed: unknown;
                try { parsed = JSON.parse(text); } catch (error) { say(`Not valid JSON: ${(error as Error).message}`); return; }
                const result = validateLabConfiguration(parsed, REGISTRY_VIEW);
                if (!result.ok) { say(`Refused: ${result.issues.map((i) => i.message).join(' ')}`); return; }
                const loaded = result.configuration!;
                setBrainId(loaded.brainId);
                setPerceptionId(loaded.perceptionModelId);
                setBrainConfig(loaded.brainConfig as any);
                setPerceptionConfig(loaded.perceptionConfig as any);
                setLocomotion(loaded.locomotion);
                setTimebase(loaded.timebase);
                setTransfer(null);
                say(`Loaded ${loaded.label}. Press APPLY AND RESTART.`);
              },
            })}>PASTE CONFIG</button>
            <button style={styles.button} onClick={() => setTransfer({ title: 'Configuration id and hash', text: `${configuration.configurationId}\n${hash}` })}>COPY ID+HASH</button>
            <button style={styles.button} onClick={() => {
              const baseline = baselineLabConfiguration(BRAINS[0].id, BRAINS[0].defaultConfig as any);
              const diff = diffLabConfigurations(baseline, configuration);
              setTransfer({
                title: 'Difference from the Graph V2 baseline',
                text: diff.identicalBehaviour ? 'Behaviourally identical to the baseline.'
                  : diff.differences.map((d) => `${d.path}: ${d.baseline} -> ${d.candidate}`).join('\n'),
              });
            }}>COMPARE TO BASELINE</button>
            <button style={styles.button} onClick={() => {
              setBrainId(BRAINS[0].id); setPerceptionId('P0_PRODUCTION');
              setBrainConfig({}); setPerceptionConfig({});
              setLocomotion({ ...BASELINE_LOCOMOTION }); setTimebase('FIXED');
              say('Back to the Graph V2 baseline.');
            }}>RESET</button>
          </div>
        </Card>

        <Card title="Learner — scripts, record and replay">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <select data-testid="script" style={{ ...styles.button, flex: 1 }} defaultValue=""
              onChange={(event) => {
                const script = scriptById(event.target.value);
                if (!script || !simulation) return;
                const result = runScript(script, {
                  brain, perception, brainConfig: configuration.brainConfig,
                  perceptionConfig: configuration.perceptionConfig,
                  locomotion, timebase, captureArmed,
                });
                simRef.current = result.simulation;
                setReviewIndex(result.simulation.samples.length - 1);
                setPaused(true);
                say(`Ran "${script.label}" headlessly. Scrub the review slider to watch it back.`);
              }}>
              <option value="">run a scripted learner…</option>
              {LEARNER_SCRIPTS.map((script) => <option key={script.id} value={script.id}>{script.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={styles.button} onClick={() => {
              if (!simulation || !simulation.recorder.count) { say('Play a few climbs first — there is nothing to record yet.'); return; }
              const recording = simulation.finishRecording({ id: `run-${Date.now()}`, label: 'recorded run', createdAt: new Date().toISOString() });
              setReplay(recording);
              say(`Recorded ${recording.selections.length} selections. RESTART now replays them exactly.`);
            }}>RECORD MY RUN</button>
            <button style={{ ...styles.button, opacity: replay ? 1 : 0.4 }} disabled={!replay}
              onClick={() => { setReplay(null); say('Back to live play.'); }}>STOP REPLAYING</button>
            <button style={styles.button} onClick={() => replay && setTransfer({ title: 'Recorded learner run', text: JSON.stringify(replay, null, 1) })}>COPY RUN</button>
            <button style={styles.button} onClick={() => setTransfer({
              title: 'Paste a recorded learner run', text: '', editable: true,
              onLoad: (text) => {
                let parsed: unknown;
                try { parsed = JSON.parse(text); } catch (error) { say(`Not valid JSON: ${(error as Error).message}`); return; }
                const { run, failure } = parseRecordedRun(parsed);
                if (!run) { say(`Refused: ${failure}`); return; }
                setReplay(run); setTransfer(null);
                say(`Loaded a ${run.selections.length}-selection run. RESTART to replay it.`);
              },
            })}>PASTE RUN</button>
            <button style={styles.primary} onClick={compare}>COMPARE A / B / C</button>
          </div>
          {replay && <div style={{ marginTop: 6, color: '#ffcf7a' }}>
            REPLAYING {replay.selections.length} recorded selections — the learner does the same thing every time.
          </div>}
        </Card>

        {comparison && (
          <Card title="A / B / C on the same learner run" right={<button style={styles.button} onClick={() => setComparison(null)}>CLOSE</button>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', font: `10px ${MONO}` }}>
                <thead><tr>{Object.keys(comparison[0]).map((key) => (
                  <th key={key} style={{ textAlign: 'left', padding: '2px 6px', color: '#8fb6e0' }}>{key}</th>
                ))}</tr></thead>
                <tbody>{comparison.map((row, index) => (
                  <tr key={index}>{Object.values(row).map((value, i) => (
                    <td key={i} style={{ padding: '2px 6px', borderTop: '1px solid #22314a' }}>{value}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        )}

        <Card title="Overlays">
          {(Object.keys(overlays) as (keyof OverlayFlags)[]).map((key) => (
            <label key={key} style={{ marginRight: 12 }}>
              <input type="checkbox" checked={overlays[key]}
                onChange={(e) => setOverlays((o) => ({ ...o, [key]: e.target.checked }))} />
              {' '}{key === 'brainVision' ? 'SHOW WHAT THE BOT KNOWS' : key}
            </label>
          ))}
        </Card>

        {metrics && (
          <Card title="This run">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' }}>
              {Object.entries(metricsRow(metrics)).map(([key, value]) => (
                <div key={key}><span style={{ opacity: 0.6 }}>{key}</span> {value}</div>
              ))}
            </div>
            {capture && capture.verdict !== 'NO_CAPTURE' && (
              <div style={{ marginTop: 8, color: capture.verdict === 'DELIBERATE_PURSUIT_CAPTURE' ? '#a8e6c0' : '#ffcf7a' }}>
                {capture.verdict}: {capture.summary}
              </div>
            )}
          </Card>
        )}

        <Card title="How did it feel? — recorded, never interpreted">
          {RATINGS.map(([key, label]) => (
            <Row key={key} label={label}>
              <span style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value}
                    style={{ ...styles.button, padding: '2px 8px', background: ratings[key] === value ? '#2b5b86' : '#16202e' }}
                    onClick={() => setRatings((r) => ({ ...r, [key]: r[key] === value ? undefined : value }))}>
                    {value}
                  </button>
                ))}
              </span>
            </Row>
          ))}
          <textarea placeholder="What did it actually feel like? This is the most useful field on the page."
            value={ratingNotes} onChange={(e) => setRatingNotes(e.target.value)}
            style={{ ...styles.textarea, minHeight: 64, marginTop: 6 }} />
          <div style={{ opacity: 0.6, marginTop: 6 }}>
            Bound to {brain.id} / {perception.id} / {shortLabHash(configuration)}
            {replay ? ` / recording ${replay.id}` : ''} and exported with the run.
            Nothing scores or averages these.
          </div>
        </Card>

        {transfer && (
          <Transfer title={transfer.title} text={transfer.text} editable={transfer.editable}
            onLoad={transfer.onLoad} onClose={() => setTransfer(null)} />
        )}
      </div>
    </div>
  );
};
