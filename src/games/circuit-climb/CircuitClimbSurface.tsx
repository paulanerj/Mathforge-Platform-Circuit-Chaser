/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { useCircuitClimbPrototypeRuntime } from './runtime/useCircuitClimbPrototypeRuntime';
import './styles/circuit-climb.css';

interface CircuitClimbSurfaceProps {
  runtime: ReturnType<typeof useCircuitClimbPrototypeRuntime>;
  onExit: () => void;
}

/**
 * The dev sliders, in the order they matter when tuning: how fast it moves, how
 * far it can sense, how long it hesitates, then how erratic it looks.
 */
const PURSUER_SLIDERS = ([
  ['searchSpeed', 'Search speed', ' u/ms', 0.01, 0.3, 0.005, (v: number) => v.toFixed(3)],
  ['chaseSpeed', 'Chase speed', ' u/ms', 0.01, 0.4, 0.005, (v: number) => v.toFixed(3)],
  ['senseRadius', 'Sense radius', ' u', 60, 900, 10, (v: number) => Math.round(v)],
  ['loseRadius', 'Lose-lock radius', ' u', 80, 1200, 10, (v: number) => Math.round(v)],
  ['alertDwellMs', 'Alert hesitation', ' ms', 0, 1200, 20, (v: number) => Math.round(v)],
  ['wanderAmplitude', 'Search sweep', ' u', 0, 260, 5, (v: number) => Math.round(v)],
  ['wanderPeriodMs', 'Sweep period', ' ms', 300, 4000, 50, (v: number) => Math.round(v)],
  ['speedJitter', 'Speed jitter', '', 0, 1, 0.05, (v: number) => v.toFixed(2)],
  ['agitation', 'Agitation', '', 0, 1, 0.05, (v: number) => v.toFixed(2)],
  ['legPeriodMs', 'Leg period', ' ms', 0, 1200, 20, (v: number) => Math.round(v)],
  ['climbReserve', 'Climb reserve', '', 0, 0.9, 0.05, (v: number) => v.toFixed(2)],
] as const).map(([key, label, unit, min, max, step, format]) => ({
  key: key as any, label, unit, min, max, step, format: format as (v: number) => string | number,
}));

export const CircuitClimbSurface: React.FC<CircuitClimbSurfaceProps> = ({
  runtime,
  onExit,
}) => {
  const {
    canvasRef,
    appRef,
    viewModel,
    beginGame,
    restartGame,
    togglePause,
    toggleMode,
    toggleSound,
    openViewSettings,
    closeViewSettings,
    setViewScale,
    setRouteTurns,
    resetViewSettings,
    exportViewConfig,
    setShowConfig,
    setShowCollisionHitboxes,
  } = runtime;

  const {
    started,
    paused,
    score,
    bestRow,
    movementMode,
    soundEnabled,
    playerValue,
    targetValue,
    messageText,
    messageTone,
    viewScalePercent,
    routeTurnCount,
    showViewSettings,
    pursuerPreset,
    pursuerTuning,
    pursuerBehaviour,
    sparkAvoidance,
    sparkShielded,
    showCollisionHitboxes,
    showSumToCue,
    showConfig,
    configText,
  } = viewModel;

  const copyStatusRef = useRef<HTMLDivElement | null>(null);
  const configOutputRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * The pursuit log, in the game's own UI.
   *
   * The evidence has to reach the PM from wherever the run happened, and the
   * host may offer no file saving at all — "Saving is not available in this
   * view" must not be the end of the road. So the text itself is always
   * produced and always shown; the clipboard is an attempt, not a requirement,
   * and a failed attempt leaves the text selected with an instruction rather
   * than an error. No devtools, no console.
   */
  const [pursuitLogText, setPursuitLogText] = React.useState('');
  const [pursuitLogTitle, setPursuitLogTitle] = React.useState('Pursuit log');
  const [showPursuitLog, setShowPursuitLog] = React.useState(false);
  const pursuitLogRef = React.useRef<HTMLTextAreaElement | null>(null);
  const pursuitStatusRef = React.useRef<HTMLDivElement | null>(null);

  const copyFrom = async (
    field: HTMLTextAreaElement | null,
    status: HTMLDivElement | null,
    noun: string,
  ) => {
    if (!field) return;
    const text = field.value;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = `${noun} copied.`;
        return;
      }
    } catch {
      // Clipboard refused or is unavailable: fall through to selection.
    }
    field.focus();
    field.select();
    try {
      const copied = document.execCommand('copy');
      if (status) {
        status.textContent = copied
          ? `${noun} copied.`
          : `${noun} selected. Use Copy from the selection menu.`;
      }
    } catch {
      if (status) status.textContent = `${noun} selected. Use Copy from the selection menu.`;
    }
  };

  const handleShowPursuitLog = () => {
    setPursuitLogTitle('Pursuit log');
    const json = runtime.getPursuitLogJson?.() ?? '';
    const summary = runtime.getPursuitLogSummary?.() ?? { frames: 0, events: 0, routes: 0, bytes: 0 };
    setPursuitLogText(json);
    setShowPursuitLog(true);
    window.requestAnimationFrame(() => {
      if (pursuitStatusRef.current) {
        pursuitStatusRef.current.textContent =
          `${summary.frames} frames, ${summary.events} events, ${summary.routes} routes — ${Math.round(summary.bytes / 1024)} KB. Copy it, or select the text and copy by hand.`;
      }
    });
  };

  const handleCopyPursuitLog = () =>
    copyFrom(pursuitLogRef.current, pursuitStatusRef.current, pursuitLogTitle);

  /**
   * The way out of a host that cannot save. Whatever produced the text, showing
   * it in a selectable field is always possible, so no diagnostic control is
   * ever allowed to end at "saving is not available in this view".
   */
  const showLogAsText = (title: string, text: string, note: string) => {
    setPursuitLogTitle(title);
    setPursuitLogText(text);
    setShowPursuitLog(true);
    window.requestAnimationFrame(() => {
      if (pursuitStatusRef.current) pursuitStatusRef.current.textContent = note;
    });
  };

  /**
   * A file, when the host allows one. Never the only way out — if this silently
   * does nothing, the text above is still on screen and still selectable.
   */
  const handleDownloadPursuitLog = () => {
    try {
      const blob = new Blob([pursuitLogText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `circuit-climb-pursuit-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (pursuitStatusRef.current) {
        pursuitStatusRef.current.textContent =
          'Download attempted. If nothing arrived, this view blocks saving — copy the text instead.';
      }
    } catch {
      if (pursuitStatusRef.current) {
        pursuitStatusRef.current.textContent =
          'This view cannot save files. Copy the text instead.';
      }
    }
  };

  const handleCopyConfig = async () => {
    if (!configOutputRef.current) return;
    const text = configOutputRef.current.value;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (copyStatusRef.current) {
          copyStatusRef.current.textContent = 'Configuration copied.';
        }
        return;
      }
    } catch {
      // Fallback
    }

    configOutputRef.current.focus();
    configOutputRef.current.select();

    try {
      const copied = document.execCommand('copy');
      if (copyStatusRef.current) {
        copyStatusRef.current.textContent = copied
          ? 'Configuration copied.'
          : 'Text selected. Use Copy from the iPhone selection menu.';
      }
    } catch {
      if (copyStatusRef.current) {
        copyStatusRef.current.textContent = 'Text selected. Use Copy from the selection menu.';
      }
    }
  };

  const [logStatus, setLogStatus] = React.useState<string>('');

  const downloadBotLog = async () => {
    const log = runtime.debug?.buildPursuerLog?.();
    if (!log) {
      setLogStatus('No bot log available yet.');
      return;
    }
    const filename = `circuit-climb-bot-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const text = JSON.stringify(log, null, 2);
    setLogStatus(`Preparing ${log.summary.framesRecorded} frames…`);

    // Published artifacts hand files to the viewer through the downloads
    // capability, and block object-URL saves outright — so where that host is
    // present it is the only path, and a null capability means saving is off
    // rather than a reason to fall through to a link that would do nothing.
    const host = (window as any).claude;
    if (host && typeof host.use === 'function') {
      try {
        const downloads = await host.use('downloads');
        if (!downloads) {
          // Not a dead end. The host will not hand over a file, so hand over
          // the text: it is the same evidence, and it is the whole reason this
          // control exists.
          setLogStatus('Saving is off in this view — the log is shown below.');
          showLogAsText('Bot event log', text,
            'Saving is unavailable here. Copy this text, or select it and copy by hand.');
          return;
        }
        await downloads.save({ filename, data: text });
        setLogStatus(`Saved ${log.summary.framesRecorded} frames.`);
      } catch (error: any) {
        if (error?.code === 'declined') {
          setLogStatus('Save cancelled.');
        } else {
          setLogStatus(error?.message ? `Save failed: ${error.message}` : 'Save failed.');
          showLogAsText('Bot event log', text,
            'Saving failed here. Copy this text, or select it and copy by hand.');
        }
      }
      return;
    }

    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setLogStatus(`Saved ${log.summary.framesRecorded} frames.`);
    } catch {
      setLogStatus('This view cannot save files — the log is shown below.');
      showLogAsText('Bot event log', text,
        'This view cannot save files. Copy this text, or select it and copy by hand.');
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowCollisionHitboxes(!showCollisionHitboxes);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCollisionHitboxes, setShowCollisionHitboxes]);

  return (
    <div className="circuit-climb-surface" ref={appRef} id="app">
      {/* 1. HTML5 Game Canvas */}
      <canvas ref={canvasRef} id="gameCanvas" aria-label="Circuit Climb math game" />

      {/* 2. Top HUD layer */}
      <div id="topHud" className="mathforge-hud">
        <div className="mathforge-top-row">
          <div className="mathforge-left-actions">
            <button className="mathforge-btn" onClick={onExit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span>HOME</span>
            </button>
            <button className="mathforge-btn" onClick={onExit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
              <span>MENU</span>
            </button>
          </div>
          <div className="mathforge-right-actions">
            <button className="mathforge-icon-btn" onClick={openViewSettings}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Message ticker banner */}
      <div id="message" className={messageTone}>
        {messageText}
      </div>

      {/* 4. Bottom action bar controls */}
      <div id="bottomBar" className="mathforge-bottom-bar">
        <button className="mathforge-action-btn" type="button" onClick={() => togglePause()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          PAUSE
        </button>
        <button className="mathforge-action-btn" type="button" onClick={restartGame}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
          RESTART
        </button>
      </div>

      {/* 5. Visual tuner live-view settings */}
      {showViewSettings && (
        <aside id="viewSettingsPanel" aria-label="Live view settings">
          <div className="settingsHeader">
            <div className="settingsTitle">Live view tuner</div>
            <button id="closeSettingsButton" className="settingsClose" type="button" aria-label="Close settings" onClick={closeViewSettings}>
              ×
            </button>
          </div>

          <p className="settingsExplanation">
            The 100% position matches the reference framing: the current row, the next row, and part of the row above. World framing changes the complete playfield live. Circuit corners controls the number of right-angle direction changes in each climb.
          </p>

          <div className="rangeHeading">
            <label htmlFor="viewScaleSlider">World framing</label>
            <output id="viewScaleValue">{viewScalePercent}%</output>
          </div>

          <input
            id="viewScaleSlider"
            type="range"
            min="80"
            max="120"
            step="1"
            value={viewScalePercent}
            onChange={(e) => setViewScale(Number(e.target.value))}
          />

          <div className="rangeEnds">
            <span>More world</span>
            <span>Closer view</span>
          </div>

          <div className="rangeHeading secondaryRangeHeading">
            <label htmlFor="routeTurnsSlider">Circuit corners</label>
            <output id="routeTurnsValue">{routeTurnCount} turns</output>
          </div>

          <input
            id="routeTurnsSlider"
            type="range"
            min="6"
            max="12"
            step="2"
            value={routeTurnCount}
            onChange={(e) => setRouteTurns(Number(e.target.value))}
          />

          <div className="rangeEnds">
            <span>Calmer</span>
            <span>More chaotic</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B3B3B3', marginTop: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <input 
              type="checkbox" 
              checked={showCollisionHitboxes} 
              onChange={(e) => setShowCollisionHitboxes(e.target.checked)} 
              style={{ accentColor: '#4CAF50' }}
            />
            Show Collision Shapes
          </label>

          <div className="rangeHeading secondaryRangeHeading">
            <label htmlFor="sumToCueToggle">Show SUM TO cue</label>
            <input
              id="sumToCueToggle"
              type="checkbox"
              checked={showSumToCue}
              onChange={(e) => runtime.setShowSumToCue(e.target.checked)}
              style={{ accentColor: 'var(--lime)', transform: 'scale(1.2)' }}
            />
          </div>

          <div className="liveValues">
            <div className="liveValue"><span>Row gap</span><strong>{Math.round(205 * (viewScalePercent / 100))}</strong></div>
            <div className="liveValue"><span>Platform</span><strong>{Math.round(104 * (0.98 + 0.02 * (viewScalePercent / 100)))}</strong></div>
            <div className="liveValue"><span>Player</span><strong>{Math.round(32 * (viewScalePercent / 100))}</strong></div>
            <div className="liveValue"><span>Corners</span><strong>{routeTurnCount}</strong></div>
          </div>

          <div className="rangeHeading secondaryRangeHeading" style={{ marginTop: '20px' }}>
            <label htmlFor="sparkAvoidanceSlider">Spark avoidance</label>
            <output>{sparkAvoidance.toFixed(2)}</output>
          </div>
          <input
            id="sparkAvoidanceSlider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sparkAvoidance}
            onChange={(e) => runtime.setSparkAvoidance(Number(e.target.value))}
          />
          <p className="settingsExplanation" style={{ marginTop: '6px' }}>
            How hard the spark steers its route away from the bot. It only ever
            reorders routes collision has already approved, so it can make a climb
            safer but never make a platform unselectable. 0 is the original
            routing, which ignores the bot entirely.
          </p>

          <div className="rangeHeading secondaryRangeHeading">
            <label htmlFor="sparkShieldedToggle">Shield spark in transit</label>
            <input
              id="sparkShieldedToggle"
              type="checkbox"
              checked={sparkShielded}
              onChange={(e) => runtime.setSparkShielded(e.target.checked)}
              style={{ accentColor: 'var(--lime)', transform: 'scale(1.2)' }}
            />
          </div>
          <p className="settingsExplanation" style={{ marginTop: '6px' }}>
            When on, a spark already travelling cannot be taken — only a landed
            one can. The learner picks a destination, not a path, so a collision
            they had no way to avoid is a harsh way to lose. Hesitating still is.
          </p>

          <div className="rangeHeading secondaryRangeHeading" style={{ marginTop: '20px' }}>
            <label htmlFor="pursuerPresetSelect">Bot behaviour</label>
            <output id="pursuerBehaviourReadout">{pursuerBehaviour}</output>
          </div>
          <select
            id="pursuerPresetSelect"
            value={pursuerPreset}
            onChange={(e) => runtime.setPursuerPreset(e.target.value as any)}
            style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px' }}
          >
            <option value="alive">Alive — searches, locks on, loses the trail</option>
            <option value="baseline">Locked baseline — always knows where you are</option>
          </select>
          <p className="settingsExplanation" style={{ marginTop: '6px' }}>
            Locked baseline is the frozen pursuer: constant speed, permanent lock,
            no searching. It is kept so a tuning experiment can always be
            abandoned without a rebuild. Moving any slider below switches to Alive.
          </p>

          {PURSUER_SLIDERS.map(({ key, label, unit, min, max, step, format }) => (
            <React.Fragment key={key}>
              <div className="rangeHeading secondaryRangeHeading">
                <label htmlFor={`pursuer-${key}`}>{label}</label>
                <output>{format(pursuerTuning[key])}{unit}</output>
              </div>
              <input
                id={`pursuer-${key}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number.isFinite(pursuerTuning[key]) ? pursuerTuning[key] : max}
                onChange={(e) => runtime.setPursuerTuning({ [key]: Number(e.target.value) } as any)}
              />
            </React.Fragment>
          ))}

          <div className="rangeHeading secondaryRangeHeading" style={{ marginTop: '18px' }}>
            <label htmlFor="downloadBotLogButton">Bot event log</label>
            <output>{logStatus}</output>
          </div>
          <button
            id="downloadBotLogButton"
            className="settingsAction primary"
            type="button"
            style={{ width: '100%' }}
            onClick={downloadBotLog}
          >
            Download bot log (.json)
          </button>
          <p className="settingsExplanation" style={{ marginTop: '8px' }}>
            Every frame the red pursuer has decided on, most recent first to roll off:
            its mode, the row it treats as an obstacle and that row's collision band,
            the corridors it considered, what it attempted on each axis, what collision
            refused, and why any frame produced no movement.
          </p>

          <div className="settingsActions">
            <button id="resetViewButton" className="settingsAction" type="button" onClick={resetViewSettings}>
              Reset
            </button>
            <button id="exportSettingsButton" className="settingsAction primary" type="button" onClick={exportViewConfig}>
              Show config
            </button>
            <button id="pursuitLogButton" className="settingsAction primary" type="button" onClick={handleShowPursuitLog}>
              Copy pursuit log
            </button>
          </div>

          {showPursuitLog && (
            <div id="pursuitLogArea">
              <textarea
                ref={pursuitLogRef}
                id="pursuitLogOutput"
                readOnly
                aria-label="Pursuit log JSON"
                value={pursuitLogText}
              />
              <div className="settingsActions">
                <button id="copyPursuitLogButton" className="settingsAction primary" type="button" onClick={handleCopyPursuitLog}>
                  Copy {pursuitLogTitle.toLowerCase()}
                </button>
                <button id="downloadPursuitLogButton" className="settingsAction" type="button" onClick={handleDownloadPursuitLog}>
                  Save file
                </button>
                <button id="hidePursuitLogButton" className="settingsAction" type="button" onClick={() => setShowPursuitLog(false)}>
                  Hide
                </button>
              </div>
              <div id="pursuitLogStatus" ref={pursuitStatusRef}>
                The whole run, as JSON. Copy it even if saving is unavailable.
              </div>
            </div>
          )}

          {showConfig && (
            <div id="configExportArea">
              <textarea
                ref={configOutputRef}
                id="configOutput"
                readOnly
                aria-label="Exported view configuration"
                value={configText}
              />
              <div className="settingsActions">
                <button id="copyConfigButton" className="settingsAction primary" type="button" onClick={handleCopyConfig}>
                  Copy config
                </button>
                <button id="hideConfigButton" className="settingsAction" type="button" onClick={() => setShowConfig(false)}>
                  Hide text
                </button>
              </div>
              <div id="copyStatus" ref={copyStatusRef}>
                You can also select this text manually on iPhone.
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 6. Overlays */}
      {/* A. Intro Startup Screen */}
      {!started && (
        <section id="introOverlay" className="overlay">
          <div className="overlayPanel">
            <div className="eyebrow">MathForge experimental surface</div>
            <h1>Circuit <span>Climb</span></h1>
            <p className="overlayCopy">
              Jump upward by choosing the number that completes each target sum. Correct choices power the tower. Wrong choices short a platform and send your spark back so you can choose again.
            </p>
            <div className="ruleGrid">
              <div className="rule">
                <span className="ruleIcon">+</span>
                <span>Read the value inside your spark and complete the equation at the top.</span>
              </div>
              <div className="rule">
                <span className="ruleIcon">↟</span>
                <span>Tap one of the three numbered platforms to climb.</span>
              </div>
              <div className="rule">
                <span className="ruleIcon">!</span>
                <span>A wrong platform shorts out for that row. Choose one of the remaining platforms to continue climbing.</span>
              </div>
            </div>
            <button id="startButton" className="primaryButton" type="button" onClick={beginGame}>
              Start prototype
            </button>
            <button
              id="backButton"
              className="primaryButton"
              type="button"
              style={{
                marginTop: '10px',
                background: 'linear-gradient(180deg, #334155, #1e293b)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                color: '#cbd5e1',
                boxShadow: 'none',
              }}
              onClick={onExit}
            >
              Back to Menu
            </button>
            <div className="secondaryText">
              Choose a numbered platform to climb · Pause, Restart, and View settings are available during play
            </div>
          </div>
        </section>
      )}

      {/* C. Paused screen.
             Opening the tuner pauses the game, so the paused card is suppressed
             while it is open — at z-index 24 it sits above the panel (23) and
             swallows every click meant for it. */}
      {started && paused && !showViewSettings && (
        <section id="pauseOverlay" className="overlay">
          <div className="overlayPanel">
            <div className="eyebrow">Circuit suspended</div>
            <h1>Paused</h1>
            <button id="resumeButton" className="primaryButton" type="button" onClick={() => togglePause(false)}>
              Resume
            </button>
            <button
              className="primaryButton"
              type="button"
              style={{
                marginTop: '10px',
                background: 'linear-gradient(180deg, #334155, #1e293b)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                color: '#cbd5e1',
                boxShadow: 'none',
              }}
              onClick={onExit}
            >
              Exit to Menu
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CircuitClimbSurface;
