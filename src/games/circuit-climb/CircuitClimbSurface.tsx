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
    showCollisionHitboxes,
    showSumToCue,
    showConfig,
    configText,
  } = viewModel;

  const copyStatusRef = useRef<HTMLDivElement | null>(null);
  const configOutputRef = useRef<HTMLTextAreaElement | null>(null);

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
          <div className="mathforge-level-pill">LEVEL 1</div>
          <div className="mathforge-right-actions">
            <button className="mathforge-icon-btn" onClick={openViewSettings}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            </button>
          </div>
        </div>
        <div className="mathforge-progress-row">
          <div className="mathforge-progress-bar">
            <div className="mathforge-progress-fill" style={{width: `${Math.min(100, (score / 50) * 100)}%`}}></div>
            <span className="mathforge-progress-text">STEP {score} / 50</span>
            <div className="mathforge-star-icon">★</div>
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


          <div className="rangeHeading" style={{ marginTop: '24px', alignItems: 'center' }}>
            <label htmlFor="sumToToggle">Show SUM TO cue</label>
            <input
              id="sumToToggle"
              type="checkbox"
              checked={viewModel.showSumToCue}
              onChange={(e) => runtime.setShowSumToCue(e.target.checked)}
              style={{ accentColor: 'var(--lime)', transform: 'scale(1.2)' }}
            />
          </div>

          <div className="settingsActions">
            <button id="resetViewButton" className="settingsAction" type="button" onClick={resetViewSettings}>
              Reset
            </button>
            <button id="exportSettingsButton" className="settingsAction primary" type="button" onClick={exportViewConfig}>
              Show config
            </button>
          </div>

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
              Keys 1–3 choose platforms · M changes movement · P pauses · View tunes framing and circuit corners
            </div>
          </div>
        </section>
      )}

      {/* C. Paused screen */}
      {started && paused && (
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
