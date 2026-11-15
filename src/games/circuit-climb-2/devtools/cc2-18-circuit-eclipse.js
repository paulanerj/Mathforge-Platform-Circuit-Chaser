/**
 * CC2-18A — Circuit Eclipse, experimental read-only capture choreography.
 *
 * This module is an observer of AUTHORITATIVE game state. It can neither
 * end a run nor change Spark, the Pursuer, mathematics, score or achievements.
 *
 * Two modes:
 *  - Actual CAPTURED terminal: play contact -> containment -> eclipse ->
 *    afterglow, then reveal the EXISTING ledger-backed results screen.
 *  - ?eclipseDemo=1: plainly marked visual preview with NO terminal event
 *    and NO fabricated results. Return to the ordinary introductory menu.
 *
 * Preserving the previous candidate is a branch-level release invariant.
 */
(() => {
  'use strict';

  const SCHEMA = 'cc2-18a-circuit-eclipse/v1';
  const query = new URLSearchParams(location.search);
  const demoRequested = query.get('eclipseDemo') === '1';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const get = id => document.getElementById(id);
  const api = () => window.__CC2_02A__;
  const errors = [], history = [];
  const remember = (event, info = {}) => {
    history.push({event, at: Math.round(performance.now()), ...info});
    if (history.length > 120) history.shift();
  };
  const error = (where, e) => {
    errors.push({where, message: String(e?.message || e)});
    if (errors.length > 30) errors.shift();
  };

  let layer, phaseLabel, title, tagline, highlight, metrics, trace,
    skip, replay, replayInSummary, tower, orb, focusBefore;
  let initialized = false, demoStarted = false, captureStarted = false;
  let lastWasEnded = false, captureInfo = null, stateName = 'idle';
  let begunAt = 0, frameId = 0, epoch = 0, activeDemo = false;
  let lastTerminalTick = null, lastTerminalRun = null, demoClip = null;

  const durations = Object.freeze({
    contact: 180, containment: 780, eclipse: 1420, afterglow: 2150,
    reduced: 420
  });

  // All graphics are native HTML and CSS; no remote images, libraries,
  // external fonts or audio are fetched. Decorative markup is hidden from AT.
  function build() {
    if (initialized) return;
    initialized = true;

    const root = document.createElement('section');
    root.id = 'cc218-eclipse';
    root.className = 'cc218-eclipse';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'cc218-title');
    root.hidden = true;
    root.innerHTML = `
      <div class="cc218-backdrop" aria-hidden="true"></div>
      <div class="cc218-layout">
        <header class="cc218-bar">
          <span class="cc218-brand">MATHFORGE <i aria-hidden="true"></i> CIRCUIT CLIMB</span>
          <span class="cc218-mark" id="cc218-mode">SOURCE-VERIFIED CAPTURE</span>
        </header>
        <div class="cc218-stage" aria-hidden="true">
          <div class="cc218-architecture">
            <div class="cc218-lattice"></div>
            <div id="cc218-tower" class="cc218-tower"></div>
          </div>
          <div class="cc218-event">
            <span class="cc218-ring cc218-ring-one"></span>
            <span class="cc218-ring cc218-ring-two"></span>
            <span class="cc218-connection"></span>
            <span class="cc218-wave cc218-wave-one"></span>
            <span class="cc218-wave cc218-wave-two"></span>
            <div class="cc218-spark">
              <span class="cc218-spark-core"></span>
              <span class="cc218-spark-trail"></span>
            </div>
            <div class="cc218-pursuer">
              <div class="cc218-outer">
                <span class="cc218-slot cc218-slot-a"></span>
                <span class="cc218-slot cc218-slot-b"></span>
                <span class="cc218-slot cc218-slot-c"></span>
                <span class="cc218-slot cc218-slot-d"></span>
                <div class="cc218-chamber">
                  <span id="cc218-orb" class="cc218-orb"></span>
                </div>
              </div>
            </div>
          </div>
          <div class="cc218-stage-label">
            <span class="cc218-stage-dot"></span>
            <span id="cc218-stage-name">CONTACT CONFIRMED</span>
          </div>
        </div>
        <div class="cc218-content">
          <p id="cc218-label" class="cc218-eyebrow">THE CHASE HAS ENDED</p>
          <h2 id="cc218-title">Circuit <em>Eclipse</em></h2>
          <p id="cc218-caption" class="cc218-caption">
            The Pursuer has contained Spark's energy.
          </p>
          <div id="cc218-metrics" class="cc218-metrics"></div>
          <p id="cc218-trace" class="cc218-trace"></p>
          <div class="cc218-actions">
            <button id="cc218-skip" class="cc218-primary" type="button">
              View run results
            </button>
            <button id="cc218-replay" class="cc218-secondary" type="button" hidden>
              Watch again
            </button>
          </div>
          <p class="cc218-footnote">
            Experimental capture presentation · gameplay and scoring unchanged
          </p>
        </div>
      </div>`;
    document.body.appendChild(root);

    layer = root;
    phaseLabel = get('cc218-stage-name');
    title = get('cc218-title');
    tagline = get('cc218-caption');
    highlight = get('cc218-label');
    metrics = get('cc218-metrics');
    trace = get('cc218-trace');
    skip = get('cc218-skip');
    replay = get('cc218-replay');
    tower = get('cc218-tower');
    orb = get('cc218-orb');

    skip.addEventListener('click', () => finish('skip'));
    replay.addEventListener('click', () => {
      if (activeDemo) open(true);
      else if (captureInfo) open(false);
    });

    // Keep replay out of the game's main HUD: only a captured run displays it
    // in the existing results modal. Do not alter its source-owned statistics.
    const header = get('summaryPanel')?.querySelector('.summary-header');
    if (header) {
      replayInSummary = document.createElement('button');
      replayInSummary.type = 'button';
      replayInSummary.id = 'cc218-summary-replay';
      replayInSummary.textContent = 'Replay capture';
      replayInSummary.hidden = true;
      header.insertBefore(replayInSummary, header.querySelector('#summaryClose'));
      replayInSummary.addEventListener('click', () => {
        if (captureInfo && api()?.snapshot?.()?.endReason === 'CAPTURED')
          open(false);
      });
    }

    // The existing source shows its real results synchronously on RUN_ENDED.
    // The microtask observer starts the cinematic before the browser paints
    // those results, eliminating the previous abrupt summary-screen jump.
    const summary = get('summaryPanel');
    if (summary) {
      new MutationObserver(() => { if (!summary.hidden) observe(); })
        .observe(summary, {attributes: true, attributeFilter: ['hidden']});
    }

    // Escape means "skip this cinematic", never "close the source summary".
    // Capture phase precedes other keyboard handlers.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || layer.hidden) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      finish('escape');
    }, true);

    // Developer-facing presentation preview. It is NOT a mock game outcome.
    const dev = get('cc209-developer-slot') || get('cc209-settings');
    if (dev) {
      const details = document.createElement('details');
      details.id = 'cc218-lab';
      details.innerHTML = `
        <summary>Circuit Eclipse · experimental capture visuals</summary>
        <p>Preview the visual sequence without changing the run. Actual
        capture still requires real physical contact with the Pursuer.</p>
        <button id="cc218-lab-preview" type="button">
          Preview Circuit Eclipse
        </button>`;
      dev.appendChild(details);
      get('cc218-lab-preview').addEventListener('click', () => {
        get('cc209-settings')?.querySelector('[data-close="cc209-settings"]')?.click();
        preview();
      });
    }

    window.__CC2_18__ = Object.freeze({
      summary: () => ({
        schema: SCHEMA,
        state: stateName,
        phase: layer.hidden ? 'hidden' : layer.dataset.phase,
        visible: !layer.hidden,
        isDemo: activeDemo,
        reducedMotion,
        realCaptureSeen: captureStarted,
        terminalTick: lastTerminalTick,
        terminalRunId: lastTerminalRun,
        captureEvidence: captureInfo ? {
          eventId: captureInfo.eventId,
          endReason: captureInfo.endReason,
          solvedRows: captureInfo.rows,
          powerCells: captureInfo.cells,
          score: captureInfo.score,
          tick: captureInfo.tick,
          separation: captureInfo.separation
        } : null,
        eventCount: history.length,
        errors: [...errors]
      }),
      report: () => ({
        schema: SCHEMA,
        history: history.map(e => ({...e})),
        errors: [...errors],
        sourceDigest: api()?.sessionReport?.()?.stateDigest ?? null
      }),
      // Intentionally read-only visual-only controls.
      preview,
      replay: () => captureInfo ? open(false) : preview(),
      dismiss: () => finish('api')
    });
    remember('BOOT', {reducedMotion});
  }

  function buildTower(rows, cells) {
    tower.replaceChildren();
    const illuminated = Math.min(Math.max(0, rows), 9);
    const count = Math.max(6, illuminated);
    for (let i = 0; i < count; i++) {
      const bar = document.createElement('span');
      bar.className = 'cc218-step' + (i < illuminated ? ' cc218-step-earned' : '');
      bar.style.setProperty('--step', String(i));
      bar.style.setProperty('--height-factor', String(i % 3));
      tower.appendChild(bar);
    }
    tower.dataset.solved = String(rows);
    tower.dataset.cells = String(cells);
  }

  function appendStat(label, value) {
    const tile = document.createElement('div');
    tile.className = 'cc218-stat';
    const number = document.createElement('strong');
    number.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    tile.append(number, caption);
    metrics.appendChild(tile);
  }

  function captureEvidence() {
    const a = api();
    const state = a?.snapshot?.();
    const result = a?.summary?.();
    const events = a?.events?.() || [];
    const terminal = events.filter(e =>
      e.type === 'RUN_ENDED' && e.detail?.reason === 'CAPTURED' &&
      e.runId === state?.runId
    ).at(-1);
    if (!state || state.phase !== 'ended' || state.endReason !== 'CAPTURED' ||
        !result?.ended || result.endReason !== 'CAPTURED' || !terminal) {
      remember('AUTHORITATIVE_CAPTURE_NOT_PRESENT');
      return null;
    }
    const bot = a.pursuer?.();
    const separation = bot
      ? Math.hypot(bot.body.x - state.spark.x, bot.body.y - state.spark.y)
      : null;
    return Object.freeze({
      runId: state.runId, tick: state.tick,
      eventId: terminal.id, endReason: 'CAPTURED',
      rows: result.rowsSolved, cells: result.powerCells,
      score: result.score, accuracy: result.accuracyPercent,
      separation: Number.isFinite(separation) ? separation : null
    });
  }

  function renderFacts(demo) {
    const a = api();
    const state = a?.snapshot?.();
    const facts = demo ? null : captureInfo;
    if (!demo && !facts) return;

    get('cc218-mode').textContent = demo
      ? 'VISUAL PREVIEW · NOT A CAPTURE'
      : 'SOURCE-VERIFIED CAPTURE';
    highlight.textContent = demo ? 'EXPERIMENTAL ANIMATION PREVIEW'
      : 'THE CHASE HAS ENDED';
    title.innerHTML = 'Circuit <em>Eclipse</em>';
    tagline.textContent = demo
      ? 'See how the Pursuer could contain Spark. Your game has not ended.'
      : "The Pursuer has contained Spark's energy. Your circuits remain.";
    metrics.replaceChildren();
    if (demo) {
      appendStat('Actual solved rows so far', state?.completedRows ?? 0);
      appendStat('Actual game state', state?.phase === 'ended' ? 'Ended' : 'Unchanged');
      trace.textContent = 'Demo only · no collision, score or run result created';
    } else {
      appendStat('Rows climbed', facts.rows);
      appendStat('Power cells', facts.cells);
      appendStat('Points earned', facts.score);
      trace.textContent = 'Physical capture verified · simulation tick ' +
        facts.tick + ' · ' + facts.rows + ' completed rows';
    }
    buildTower(demo ? (state?.completedRows || 0) : facts.rows,
      demo ? (state?.completedCells || 0) : facts.cells);
    skip.textContent = demo ? 'Return to game' : 'View run results';
    replay.hidden = !demo;
    layer.dataset.demo = demo ? 'true' : 'false';
    orb.dataset.kind = demo ? 'preview' : 'capture';
  }

  function setPhase(next) {
    if (layer.hidden || layer.dataset.phase === next) return;
    layer.dataset.phase = next;
    stateName = next;
    phaseLabel.textContent = {
      contact: '01 / CONTACT CONFIRMED',
      containment: '02 / ENERGY CONTAINMENT',
      eclipse: '03 / CORE TRANSFORMATION',
      afterglow: '04 / COMPLETED CIRCUITS',
      hold: 'VISUAL PREVIEW COMPLETE'
    }[next] || 'CIRCUIT ECLIPSE';
    remember('PHASE', {phase: next, demo: activeDemo});
  }

  function animate(now, token) {
    if (token !== epoch || layer.hidden) return;
    const elapsed = now - begunAt;
    if (reducedMotion) {
      setPhase('afterglow');
      if (elapsed >= durations.reduced) {
        if (activeDemo) {setPhase('hold'); replay.hidden = false;}
        else finish('completed');
        return;
      }
    } else if (elapsed < durations.contact) setPhase('contact');
    else if (elapsed < durations.containment) setPhase('containment');
    else if (elapsed < durations.eclipse) setPhase('eclipse');
    else if (elapsed < durations.afterglow) setPhase('afterglow');
    else {
      if (activeDemo) {setPhase('hold'); replay.hidden = false;}
      else finish('completed');
      return;
    }
    frameId = requestAnimationFrame(t => animate(t, token));
  }

  function open(demo) {
    build();
    if (!demo && !captureInfo) return;
    activeDemo = demo;
    epoch++;
    cancelAnimationFrame(frameId);
    focusBefore = document.activeElement;
    renderFacts(demo);
    layer.hidden = false;
    layer.dataset.phase = 'initial';
    stateName = 'initial';
    skip.focus({preventScroll: true});
    begunAt = performance.now();
    const token = epoch;
    remember('OPEN', {demo, token, tick: api()?.snapshot?.()?.tick ?? null});
    frameId = requestAnimationFrame(t => animate(t, token));
  }

  function finish(cause) {
    if (!layer || layer.hidden) return;
    const wasDemo = activeDemo;
    epoch++;
    cancelAnimationFrame(frameId);
    layer.hidden = true;
    layer.dataset.phase = 'hidden';
    stateName = 'idle';
    remember('CLOSE', {cause, demo: wasDemo});
    if (wasDemo) {
      // Never show fake summary or alter current game state.
      (get('cc209c-intro') && !get('cc209c-intro').hidden
        ? get('cc209c-enter') : focusBefore)?.focus?.({preventScroll: true});
    } else {
      // The existing source-owned results were already populated and checked.
      // Show those very same results without recomputing or awarding anything.
      const summary = get('summaryPanel');
      if (summary && summary.hidden === false)
        (get('summaryRestart') || get('summaryClose'))?.focus({preventScroll: true});
    }
    activeDemo = false;
  }

  function preview() {
    build();
    demoStarted = true;
    remember('VISUAL_PREVIEW_REQUEST');
    open(true);
  }

  function observe() {
    const a = api();
    const state = a?.snapshot?.();
    if (!state) return;

    // On restart the seed and runId can repeat, so reset from actual
    // terminal -> nonterminal state, not a fragile runId-only guard.
    if (state.phase !== 'ended') {
      if (lastWasEnded) {
        lastWasEnded = false;
        captureStarted = false;
        captureInfo = null;
        lastTerminalTick = null;
        lastTerminalRun = null;
        if (replayInSummary) replayInSummary.hidden = true;
        if (!layer.hidden && !activeDemo) finish('new-run');
        remember('RUN_RESET');
      }
      return;
    }
    lastWasEnded = true;
    if (state.endReason !== 'CAPTURED' || captureStarted) return;

    const receipt = captureEvidence();
    if (!receipt) return;
    captureStarted = true;
    captureInfo = receipt;
    lastTerminalTick = receipt.tick;
    lastTerminalRun = receipt.runId;
    if (replayInSummary) replayInSummary.hidden = false;
    remember('CAPTURE_RECEIPT', {
      tick: receipt.tick, eventId: receipt.eventId, rows: receipt.rows
    });
    // Demo mode remains an independent visual preview until dismissed.
    if (!activeDemo) open(false);
  }

  function heartbeat() {
    try {
      if (!initialized) build();
      const ready = !!api()?.snapshot;
      if (ready && demoRequested && !demoStarted) preview();
      if (ready) observe();
    } catch (e) {error('heartbeat', e);}
    requestAnimationFrame(heartbeat);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', heartbeat, {once: true});
  else heartbeat();
})();
