import { CircuitClimbMathAdapter } from '../services/CircuitClimbMathAdapter';
import { useState, useEffect, useRef } from 'react';

export interface CircuitClimbViewModel {
  started: boolean;
  paused: boolean;
  score: number;
  bestRow: number;
  movementMode: 'circuit' | 'hop';
  soundEnabled: boolean;
  playerValue: number;
  targetValue: number;
  messageText: string;
  messageTone: 'neutral' | 'success' | 'error';
  viewScalePercent: number;
  routeTurnCount: number;
  showViewSettings: boolean;
  showCollisionHitboxes: boolean;
  showSumToCue: boolean;
  showConfig: boolean;
  configText: string;
  debug?: any;
}

export function useCircuitClimbPrototypeRuntime() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<HTMLDivElement | null>(null);

  // React state to feed back into the HUD overlays
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [bestRow, setBestRow] = useState(0);
  const [movementMode, setMovementMode] = useState<'circuit' | 'hop'>('circuit');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playerValue, setPlayerValue] = useState(4);
  const [targetValue, setTargetValue] = useState(10);
  const [messageText, setMessageText] = useState('');
  const [messageTone, setMessageTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [viewScalePercent, setViewScalePercent] = useState(100);
  const [routeTurnCount, setRouteTurnCount] = useState(8);
  const [showCollisionHitboxes, setShowCollisionHitboxes] = useState(false);
  const [showSumToCue, setShowSumToCue] = useState(true);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configText, setConfigText] = useState('');
  const settingsWasPausedRef = useRef(false);

  // Control reference to trigger game engine actions from React components
  const loopControlRef = useRef<{
    beginGame?: () => void;
    restart?: (opts?: { preserveOverlay?: boolean }) => void;
    togglePause?: (force?: boolean) => void;
    toggleMode?: () => void;
    toggleSound?: () => void;
    selectByIndex?: (idx: number) => void;
    applyViewScale?: (val: number, opts?: { reflow?: boolean; persist?: boolean }) => void;
    applyRouteTurnCount?: (val: number, opts?: { persist?: boolean }) => void;
    resetViewSettings?: () => void;
    exportSettings?: () => void;
    closeViewSettings?: () => void;
  }>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const app = appRef.current;
    if (!canvas || !app) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- GAME ENGINE INTERNAL CONFIGURATION & VARIABLES ---
    const CONFIG = {
      rowGap: 205,
      routeSegmentGrid: 14,
      routeTurnCount: 8,
      routeMaxStraightRun: 72,
      routeHorizontalJitter: 46,
      routePlatformPadding: 8,
      farParallax: 0.08,
      midParallax: 0.24,
      foregroundParallax: 0.62,
      platformWidth: 104,
      platformHeight: 62,
      columns: [0.18, 0.50, 0.82],
      playerRadius: 32,
      routeSpeed: 0.62,
      hopDuration: 470,
      hopHeight: 82,
      returnDuration: 360,
      cullMargin: 240,

      cameraAnchor: 0.25,
    };

    const BASE_VIEW = Object.freeze({
      rowGap: 205,
      platformWidth: 104,
      platformHeight: 62,
      playerRadius: 32,
      routeSegmentGrid: 14,
      routeTurnCount: 8,
      routeMaxStraightRun: 72,
      routeHorizontalJitter: 46,
      routePlatformPadding: 8,
      hopHeight: 82,
    });

    const COLORS = {
      bg: '#f0f6fc',
      bgDepth: '#e2eef7',
      structure: '#cbd5e1',
      text: '#0E1B33',
      player: '#2563eb',
      playerHighlight: '#93c5fd',
      target: '#0f172a',
      targetGlow: 'rgba(37, 99, 235, 0.15)',
      cueSurface: '#ffffff',
      cueBorder: '#D8E4F7',
      background: '#f0f6fc',
      gridDot: '#cbd5e1',
      gridLine: '#e2effc',
      platform: '#ffffff',
      platformEdge: '#cbd5e1',
      platformFace: '#ffffff',
      platformDead: '#f1f5f9',
      platformDeadEdge: '#cbd5e1',
      platformPowered: '#f0fdf4',
      platformPoweredEdge: '#22c55e',
      number: '#0f172a',
      numberDim: '#94a3b8',
      cyan: '#0ea5e9',
      cyanCore: '#e0f2fe',
      lime: '#2563eb',
      limeCore: '#93c5fd',
      amber: '#f59e0b',
      red: '#ef4444',
      redDark: '#991b1b',
      white: '#ffffff',
    };

    // Canvas color safety validator
    function isSafeCanvasColor(value: any): boolean {
      if (!value) return false;
      if (typeof value !== 'string') return false;
      if (value.includes('var(')) return false;
      return true;
    }

    const SAFE_FALLBACK_COLOR = '#ff00ff';

    // Validate the palette once on initialization
    for (const key of Object.keys(COLORS) as Array<keyof typeof COLORS>) {
      const val = COLORS[key];
      if (!isSafeCanvasColor(val)) {
        console.warn(`Circuit Climb Canvas Warning: Invalid color for ${key}): ${val}. Falling back to safe known color.`);
        COLORS[key] = SAFE_FALLBACK_COLOR;
      }
    }

    // Mutable states matching standalone script
    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrame = 0;
    let lastTimestamp = 0;
    let elapsed = 0;
    let engineStarted = false;
    let enginePaused = false;
    let engineSoundEnabled = true;
    let engineMovementMode: 'circuit' | 'hop' = 'circuit';
    let rows: any[] = [];
    let obstacleRevision = 0;
    let nextRowIndex = 0;
    let traces: any[] = [];
    let particles: any[] = [];
    let travel: any = null;
    let cameraY = 0;
    let engineBestRow = 0;
    let viewScalePercentInternal = 100;
    let routeTurnCountInternal = 8;

    // Load High Scores
    try {
      engineBestRow = Number(window.localStorage.getItem('circuitClimbPrototypeBest') || 0);
      setBestRow(engineBestRow);
    } catch {
      engineBestRow = 0;
    }

    let audioContext: AudioContext | null = null;
    let messageTimer = 0;
    

    type PlayerNumberPhase = 'visible' | 'clearing' | 'hidden-transit';

    const playerNumberPresentation = {
      phase: 'visible' as PlayerNumberPhase,
      phaseStartedAt: 0,
      displayedValue: 4 as number | null,
      pendingValue: null as number | null,
    };
    type TargetRevealPhase = 'dominant-enter' | 'dominant-hold' | 'receding' | 'resting';
    const targetPresentation = {
      targetValue: 10,
      targetEventId: 0,
      phase: 'resting' as TargetRevealPhase,
      phaseStartedAt: 0,
      progress: 0,
    };


    const player = {
      row: 0,
      x: 0,
      y: 0,
      value: 4,
      platform: null as any,
      pulseAt: -1000,
    };

    function clamp(value: number, min: number, max: number) {
      return Math.max(min, Math.min(max, value));
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function roundTo(value: number, digits = 1) {
      const multiplier = 10 ** digits;
      return Math.round(value * multiplier) / multiplier;
    }

    function readSavedViewScale() {
      try {
        const saved = Number(window.localStorage.getItem('circuitClimbViewScale'));
        if (Number.isFinite(saved)) {
          return clamp(saved, 80, 120);
        }
      } catch {
        // Safe fallback
      }
      return 100;
    }

    function readSavedRouteTurns() {
      try {
        const saved = Number(window.localStorage.getItem('circuitClimbRouteTurns'));
        if (Number.isFinite(saved)) {
          return clamp(Math.round(saved / 2) * 2, 6, 12);
        }
      } catch {
        // Safe fallback
      }
      return 8;
    }

    function saveViewScale() {
      try {
        window.localStorage.setItem('circuitClimbViewScale', String(viewScalePercentInternal));
        window.localStorage.setItem('circuitClimbRouteTurns', String(routeTurnCountInternal));
      } catch {
        // Safe fallback
      }
    }

    function refreshTravelMetrics(activeTravel: any) {
      if (!activeTravel || !activeTravel.points || activeTravel.points.length < 2) {
        return;
      }
      const progress = activeTravel.total > 0
        ? clamp(activeTravel.distance / activeTravel.total, 0, 1)
        : 0;
      const metrics = pathMetrics(activeTravel.points);
      activeTravel.lengths = metrics.lengths;
      activeTravel.total = metrics.total;
      activeTravel.distance = metrics.total * progress;
    }

    function reflowWorldForView(oldRowGap: number) {
      if (!rows.length || !oldRowGap || oldRowGap === CONFIG.rowGap) {
        return;
      }
      obstacleRevision += 1;
      const verticalRatio = CONFIG.rowGap / oldRowGap;

      rows.forEach((row) => {
        row.y = -row.index * CONFIG.rowGap;
        row.platforms.forEach((platform: any) => {
          platform.y = row.y;
          platform.width = Math.min(CONFIG.platformWidth, width * 0.30);
          platform.height = CONFIG.platformHeight;
        });
      });

      traces.forEach((trace) => {
        trace.points.forEach((point: any) => { point.y *= verticalRatio; });
      });

      particles.forEach((particle) => {
        particle.y *= verticalRatio;
        particle.vy *= verticalRatio;
      });

      if (travel) {
        if (travel.points) {
          travel.points.forEach((point: any) => { point.y *= verticalRatio; });
          refreshTravelMetrics(travel);
        }
        if (travel.from) travel.from.y *= verticalRatio;
        if (travel.to) travel.to.y *= verticalRatio;
      }

      player.y *= verticalRatio;

      if (!travel && player.platform) {
        player.x = player.platform.x;
        player.y = landingPoint(player.platform).y;
      }
      cameraY = player.y - height * CONFIG.cameraAnchor;
    }

    function updateViewReadouts() {
      setViewScalePercent(viewScalePercentInternal);
      setRouteTurnCount(routeTurnCountInternal);
    }

    function applyViewScale(percent: number, { reflow = true, persist = true } = {}) {
      const nextPercent = clamp(Math.round(Number(percent) || 100), 80, 120);
      const oldRowGap = CONFIG.rowGap;
      const zoom = nextPercent / 100;

      viewScalePercentInternal = nextPercent;

      CONFIG.rowGap = BASE_VIEW.rowGap * zoom;
      CONFIG.platformWidth = BASE_VIEW.platformWidth * (0.98 + 0.02 * zoom);
      CONFIG.platformHeight = BASE_VIEW.platformHeight * Math.pow(zoom, 0.48);
      CONFIG.playerRadius = BASE_VIEW.playerRadius * zoom;
      CONFIG.routeSegmentGrid = BASE_VIEW.routeSegmentGrid * zoom;
      CONFIG.routeMaxStraightRun = BASE_VIEW.routeMaxStraightRun * zoom;
      CONFIG.routeHorizontalJitter = BASE_VIEW.routeHorizontalJitter * zoom;
      CONFIG.routePlatformPadding = BASE_VIEW.routePlatformPadding;
      CONFIG.hopHeight = BASE_VIEW.hopHeight * zoom;

      CONFIG.routeTurnCount = routeTurnCountInternal;
      CONFIG.cameraAnchor = lerp(0.585, 0.615, (nextPercent - 80) / 40);

      const hudScale = lerp(0.93, 1.03, (nextPercent - 80) / 40);
      document.documentElement.style.setProperty('--live-ui-scale', hudScale.toFixed(3));

      if (reflow) {
        reflowWorldForView(oldRowGap);
      }
      updateViewReadouts();
      if (persist) {
        saveViewScale();
      }
    }

    function applyRouteTurnCount(value: number, { persist = true } = {}) {
      routeTurnCountInternal = clamp(Math.round(Number(value) / 2) * 2 || 8, 6, 12);
      CONFIG.routeTurnCount = routeTurnCountInternal;
      updateViewReadouts();
      if (persist) {
        saveViewScale();
      }
    }

    function exportedViewConfig() {
      return {
        prototype: 'Circuit Climb V3.6',
        viewScalePercent: viewScalePercentInternal,
        routeTurnCount: routeTurnCountInternal,
        derived: {
          rowGap: roundTo(CONFIG.rowGap),
          platformWidth: roundTo(CONFIG.platformWidth),
          platformHeight: roundTo(CONFIG.platformHeight),
          playerRadius: roundTo(CONFIG.playerRadius),
          routeSegmentGrid: roundTo(CONFIG.routeSegmentGrid),
          routeTurnCount: CONFIG.routeTurnCount,
          routeMaxStraightRun: roundTo(CONFIG.routeMaxStraightRun),
          cameraAnchor: roundTo(CONFIG.cameraAnchor, 3),
        },
        instruction: 'Paste this JSON back into the project-manager chat so the framing and corner count can be frozen into the next build.',
      };
    }

    function refreshConfigOutput() {
      const config = exportedViewConfig();
      setConfigText(JSON.stringify(config, null, 2));
    }

    function randomInt(min: number, max: number) {
      return Math.floor(min + Math.random() * (max - min + 1));
    }


    function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
      const r = Math.min(radius, w / 2, h / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + w, y, x + w, y + h, r);
      context.arcTo(x + w, y + h, x, y + h, r);
      context.arcTo(x, y + h, x, y, r);
      context.arcTo(x, y, x + w, y, r);
      context.closePath();
    }

    function targetBandFor(rowIndex: number) {
      return Math.floor(Math.max(0, rowIndex - 1) / 6);
    }


    function makeRow(index: number) {
      const y = -index * CONFIG.rowGap;
      const platforms = CONFIG.columns.map((fraction, column) => ({
        row: index,
        column,
        x: fraction * width,
        y,
        width: Math.min(CONFIG.platformWidth, width * 0.30),
        height: CONFIG.platformHeight,
        value: null as number | null,
        correct: false,
        dead: false,
        powered: false,
        selected: false,
        litAt: -1000,
      }));

      const row: any = {
        index,
        y,
        platforms,
        id: `row-${index}`,
        disabledOptionIndexes: [] as number[],
        status: 'future' as 'buffer' | 'future' | 'active' | 'resolved-correct' | 'resolved-wrong' | 'passed',
      };

      if (index >= 1) {
        const targetEventId = targetBandFor(index);
        const maxTargetValue = Math.min(20, 10 + 2 * targetEventId);

        let incomingPlayerValue = 0;
        if (index === 1) {
          incomingPlayerValue = randomInt(1, Math.max(2, maxTargetValue - 1));
        } else {
          const prev = rows[index - 1];
          if (prev && prev.problemSnapshot) {
            incomingPlayerValue = randomInt(1, Math.max(2, maxTargetValue - 1));
          } else {
            incomingPlayerValue = randomInt(1, Math.max(2, maxTargetValue - 1));
          }
        }
        
        let snapshot = CircuitClimbMathAdapter.requestAdditionProblem(
          index,
          incomingPlayerValue,
          maxTargetValue,
          targetEventId
        );

        if (!snapshot) {
          console.error("CIRCUIT_CLIMB_MATH_ENGINE_FAILURE", { index, incomingPlayerValue, maxTargetValue });
          snapshot = {
            problemId: `fallback-${index}`,
            operation: "addition",
            rowIndex: index,
            targetEventId,
            playerValue: incomingPlayerValue,
            targetValue: incomingPlayerValue + 1,
            choices: [1, 2, 3],
            correctChoiceIndex: 0,
            correctPlatformValue: 1
          };
          snapshot.choices[0] = 1;
          snapshot.choices[1] = 2;
          snapshot.choices[2] = 3;
        }

        row.problemSnapshot = snapshot;
        row.targetEventId = snapshot.targetEventId;
        row.targetValue = snapshot.targetValue;
        row.incomingPlayerValue = snapshot.playerValue;
        row.correctPlatformValue = snapshot.correctPlatformValue;
        row.correctOptionIndex = snapshot.correctChoiceIndex;
        row.options = snapshot.choices;

        row.platforms.forEach((platform: any, colIdx: number) => {
          if (colIdx < 3) {
            platform.value = snapshot!.choices[colIdx];
            platform.correct = colIdx === snapshot!.correctChoiceIndex;
          }
        });
      }

      return row;
    }

    function ensureRows() {
      let added = false;
      while (nextRowIndex <= player.row + 6) {
        rows.push(makeRow(nextRowIndex));
        nextRowIndex += 1;
        added = true;
      }
      if (added) {
        obstacleRevision += 1;
      }
    }

    function getRow(index: number) {
      return rows.find((row) => row.index === index) || null;
    }

    function rowAbove() {
      return getRow(player.row + 1);
    }


    function validateActiveCircuitClimbRow(row: any, committedPlayerValue: number) {
      if (!row) return;
      let error = null;
      if (row.incomingPlayerValue !== committedPlayerValue) error = 'incomingPlayerValue mismatch';
      else if (row.correctPlatformValue !== row.targetValue - row.incomingPlayerValue) error = 'correctPlatformValue mismatch';
      else if (row.options[row.correctOptionIndex] !== row.correctPlatformValue) error = 'correctOptionIndex mismatch';
      else if (row.options.filter((o: number) => o === row.correctPlatformValue).length !== 1) error = 'multiple or zero correct options';
      
      if (error) {
        console.error('CIRCUIT_CLIMB_INVALID_ACTIVE_ROW', {
          id: row.id,
          index: row.index,
          targetEventId: row.targetEventId,
          targetValue: row.targetValue,
          incomingPlayerValue: row.incomingPlayerValue,
          options: row.options,
          correctOptionIndex: row.correctOptionIndex,
          computedRequiredOption: row.targetValue - row.incomingPlayerValue,
          reason: error
        });
      }
    }

    function armNextRow() {
      const row = rowAbove();
      if (!row) return;
      validateActiveCircuitClimbRow(row, player.value);
      row.platforms.forEach((platform) => {
        platform.dead = false;
        platform.selected = false;
      });
    }

    function updateHud() {
      const activeRow = getRow(player.row + 1);
      if (!activeRow) return;
      
      const target = activeRow.targetValue;
      const targetEventId = activeRow.targetEventId !== undefined ? activeRow.targetEventId : targetBandFor(player.row + 1);

      if (targetEventId !== targetPresentation.targetEventId) {
        targetPresentation.targetValue = target;
        targetPresentation.targetEventId = targetEventId;
        targetPresentation.phase = 'dominant-enter';
        targetPresentation.phaseStartedAt = elapsed;
      }
      setPlayerValue(player.value);
      setTargetValue(target);
      setScore(player.row);
      setMovementMode(engineMovementMode);
    }

    function setMessage(text: string, tone: 'neutral' | 'success' | 'error' = 'neutral', duration = 0) {
      setMessageText(text);
      setMessageTone(tone);
      messageTimer = duration > 0 ? elapsed + duration : 0;
    }

    function getAudioContext() {
      if (!engineSoundEnabled) return null;
      if (!audioContext) {
        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch {
          engineSoundEnabled = false;
          setSoundEnabled(false);
          return null;
        }
      }
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    }

    function tone(frequency: number, duration = 0.16, volume = 0.05, type: OscillatorType = 'sine', delay = 0) {
      const audio = getAudioContext();
      if (!audio) return;
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    }

    const sound = {
      launch() {
        tone(310, 0.12, 0.045, 'sine');
        tone(465, 0.18, 0.035, 'triangle', 0.05);
      },
      corner() {
        tone(1300, 0.04, 0.018, 'triangle');
      },
      correct() {
        tone(392, 0.36, 0.05, 'sine');
        tone(494, 0.38, 0.045, 'sine', 0.07);
        tone(659, 0.48, 0.05, 'sine', 0.15);
      },
      wrong() {
        tone(230, 0.28, 0.055, 'sawtooth');
        tone(174, 0.35, 0.045, 'triangle', 0.08);
      },
    };

    function resize() {
      const rect = app.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const oldWidth = width;
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (rows.length > 0) {
        const ratio = oldWidth > 0 ? width / oldWidth : 1;
        rows.forEach((row) => {
          row.platforms.forEach((platform: any) => {
            platform.x = CONFIG.columns[platform.column] * width;
            platform.width = Math.min(CONFIG.platformWidth, width * 0.30);
          });
        });

        if (oldWidth > 0 && ratio !== 1) {
          traces.forEach((trace) => trace.points.forEach((point: any) => { point.x *= ratio; }));
          particles.forEach((particle) => { particle.x *= ratio; });
          if (travel) {
            if (travel.points) travel.points.forEach((point: any) => { point.x *= ratio; });
            if (travel.from) travel.from.x *= ratio;
            if (travel.to) travel.to.x *= ratio;
          }
        }
        if (!travel && player.platform) player.x = player.platform.x;
        else player.x *= ratio;
      }
      if (!engineStarted || player.row === 0) cameraY = player.y - height * CONFIG.cameraAnchor;
    }

    function restart({ preserveOverlay = false } = {}) {
      setShowViewSettings(false);
      rows = [];
      obstacleRevision = 0;
      traces = [];
      particles = [];
      travel = null;
      nextRowIndex = 0;
      elapsed = 0;
      lastTimestamp = 0;
      
      enginePaused = false;
      setPaused(false);

      ensureRows();
      const baseRow = getRow(0);
      const basePlatform = baseRow.platforms[1];
      baseRow.platforms[0].dead = true;
      baseRow.platforms[2].dead = true;
      basePlatform.value = null;
      basePlatform.powered = true;

      player.row = 0;
      player.platform = basePlatform;
      player.x = basePlatform.x;
      player.y = basePlatform.y - CONFIG.playerRadius - 3;
      const firstRow = getRow(1);
      player.value = firstRow && firstRow.problemSnapshot ? firstRow.problemSnapshot.playerValue : 4;
      player.pulseAt = -1000;

      playerNumberPresentation.phase = 'visible';
      playerNumberPresentation.phaseStartedAt = 0;
      playerNumberPresentation.displayedValue = player.value;
      playerNumberPresentation.pendingValue = null;
      targetPresentation.targetValue = firstRow && firstRow.problemSnapshot ? firstRow.problemSnapshot.targetValue : 10;
      targetPresentation.targetEventId = targetBandFor(1);
      targetPresentation.phase = 'dominant-enter';
      targetPresentation.phaseStartedAt = 0;
      targetPresentation.progress = 0;

      cameraY = player.y - height * CONFIG.cameraAnchor;

      ensureRows();
      armNextRow();
      updateHud();
      setMessage('Tap the platform that completes the equation.');

      if (!preserveOverlay) {
        setStarted(true);
        engineStarted = true;
      }
    }

    function beginGame() {
      setStarted(true);
      engineStarted = true;
      restart();
      try { getAudioContext(); } catch { engineSoundEnabled = false; setSoundEnabled(false); }
    }

    function landingPoint(platform: any) {
      return {
        x: platform.x,
        y: platform.y - CONFIG.playerRadius - 3,
      };
    }

    function platformCollisionRects() {
      const pad = CONFIG.routePlatformPadding;
      const rects: any[] = [];
      rows.forEach((row) => row.platforms.forEach((platform) => {
        if (platform.row === 0 && platform.column !== 1) return;
        rects.push({
          left: platform.x - platform.width / 2 - pad,
          right: platform.x + platform.width / 2 + pad,
          top: platform.y - pad,
          bottom: platform.y + platform.height + pad,
        });
      }));
      return rects;
    }

    function segmentHitsRect(a: any, b: any, rect: any) {
      if (a.x === b.x) {
        if (a.x <= rect.left || a.x >= rect.right) return false;
        const top = Math.min(a.y, b.y);
        const bottom = Math.max(a.y, b.y);
        return bottom > rect.top && top < rect.bottom;
      }
      if (a.y === b.y) {
        if (a.y <= rect.top || a.y >= rect.bottom) return false;
        const left = Math.min(a.x, b.x);
        const right = Math.max(a.x, b.x);
        return right > rect.left && left < rect.right;
      }
      return true;
    }

    function pathIsClear(points: any[]) {
      const rects = platformCollisionRects();
      for (let i = 1; i < points.length; i += 1) {
        for (const rect of rects) {
          if (segmentHitsRect(points[i - 1], points[i], rect)) return false;
        }
      }
      return true;
    }

    function cleanCircuitPath(points: any[]) {
      const out = [points[0]];
      for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        const last = out[out.length - 1];
        if (point.x === last.x && point.y === last.y) continue;
        if (out.length >= 2) {
          const previous = out[out.length - 2];
          if ((previous.x === last.x && last.x === point.x) ||
              (previous.y === last.y && last.y === point.y)) {
            out[out.length - 1] = point;
            continue;
          }
        }
        out.push(point);
      }
      return out;
    }

    function destinationCorridors(row: any) {
      const padding = CONFIG.routePlatformPadding;
      const rectangles = row.platforms
        .map((platform: any) => ({
          left: platform.x - platform.width / 2 - padding,
          right: platform.x + platform.width / 2 + padding,
        }))
        .sort((first: any, second: any) => first.left - second.left);

      const corridors: any[] = [];
      let cursor = 2;

      rectangles.forEach((rectangle: any) => {
        if (rectangle.left - cursor >= 12) {
          corridors.push({
            left: cursor,
            right: rectangle.left,
            center: (cursor + rectangle.left) / 2,
          });
        }
        cursor = Math.max(cursor, rectangle.right);
      });

      const rightEdge = width - 2;
      if (rightEdge - cursor >= 12) {
        corridors.push({
          left: cursor,
          right: rightEdge,
          center: (cursor + rightEdge) / 2,
        });
      }
      return corridors;
    }

    function chooseDestinationCorridor(row: any, targetX: number, startX: number) {
      const corridors = destinationCorridors(row);
      if (!corridors.length) {
        const edge = targetX < width / 2 ? width * 0.965 : width * 0.035;
        return {
          left: edge - 12,
          right: edge + 12,
          center: edge,
        };
      }
      return corridors
        .slice()
        .sort((first, second) => {
          const firstScore =
            Math.abs(first.center - targetX) * 0.72 +
            Math.abs(first.center - startX) * 0.28;
          const secondScore =
            Math.abs(second.center - targetX) * 0.72 +
            Math.abs(second.center - startX) * 0.28;
          return firstScore - secondScore;
        })[0];
    }

    function buildSteppedRoute(from: any, to: any, destinationPlatform: any, corridor: any) {
      const turns = clamp(Math.round(CONFIG.routeTurnCount / 2) * 2, 6, 12);
      const horizontalCount = turns / 2;
      const verticalCount = horizontalCount + 1;
      const destinationRow = getRow(destinationPlatform.row);

      const landingY = to.y;
      const apexY =
        destinationRow.y -
        CONFIG.playerRadius -
        Math.max(18, CONFIG.routePlatformPadding * 1.8);

      const crossingStartY =
        destinationRow.y +
        CONFIG.platformHeight +
        CONFIG.routePlatformPadding +
        9;

      const midCrossY =
        destinationRow.y +
        CONFIG.platformHeight * 0.34;

      const verticalEndpoints = [];
      const preCorridorVerticalCount = verticalCount - 3;

      for (let index = 1; index <= preCorridorVerticalCount; index += 1) {
        verticalEndpoints.push(
          lerp(from.y, crossingStartY, index / preCorridorVerticalCount),
        );
      }
      verticalEndpoints.push(midCrossY, apexY, landingY);

      const corridorInset = Math.min(
        16,
        Math.max(3, (corridor.right - corridor.left) * 0.2),
      );

      let corridorA = clamp(
        corridor.center - corridorInset,
        corridor.left + 2,
        corridor.right - 2,
      );

      let corridorB = clamp(
        corridor.center + corridorInset,
        corridor.left + 2,
        corridor.right - 2,
      );

      if (Math.abs(corridorB - corridorA) < 4) {
        corridorA = corridor.center;
        corridorB = clamp(
          corridor.center + (to.x < corridor.center ? -4 : 4),
          corridor.left + 1.5,
          corridor.right - 1.5,
        );
      }

      if (to.x < corridor.center) {
        [corridorA, corridorB] = [corridorB, corridorA];
      }

      const horizontalEndpoints = [];
      const freeHorizontalCount = horizontalCount - 3;
      let currentX = from.x;

      for (let index = 0; index < freeHorizontalCount; index += 1) {
        const progress = (index + 1) / (freeHorizontalCount + 1);
        const guide = lerp(from.x, corridorA, progress);
        const alternatingDirection = index % 2 === 0 ? -1 : 1;
        const targetDirection = Math.sign(corridorA - from.x) || 1;

        let candidate =
          guide +
          alternatingDirection *
            targetDirection *
            CONFIG.routeHorizontalJitter;

        candidate = clamp(
          candidate,
          width * 0.045,
          width * 0.955,
        );

        const deltaX = candidate - currentX;
        const maximumRun = CONFIG.routeMaxStraightRun;
        const minimumRun = Math.min(24, maximumRun * 0.42);

        if (Math.abs(deltaX) > maximumRun) {
          candidate = currentX + Math.sign(deltaX) * maximumRun;
        } else if (Math.abs(deltaX) < minimumRun) {
          candidate = currentX + alternatingDirection * minimumRun;
          candidate = clamp(candidate, width * 0.045, width * 0.955);
        }

        horizontalEndpoints.push(candidate);
        currentX = candidate;
      }

      horizontalEndpoints.push(corridorA, corridorB, to.x);

      const points = [{ x: from.x, y: from.y }];
      let currentPoint = points[0];

      for (let segmentIndex = 0; segmentIndex < horizontalCount; segmentIndex += 1) {
        const nextY = verticalEndpoints[segmentIndex];
        if (nextY !== currentPoint.y) {
          currentPoint = { x: currentPoint.x, y: nextY };
          points.push(currentPoint);
        }
        const nextX = horizontalEndpoints[segmentIndex];
        if (nextX !== currentPoint.x) {
          currentPoint = { x: nextX, y: currentPoint.y };
          points.push(currentPoint);
        }
      }

      const finalY = verticalEndpoints[verticalEndpoints.length - 1];
      if (finalY !== currentPoint.y) {
        points.push({ x: currentPoint.x, y: finalY });
      }
      return cleanCircuitPath(points);
    }

    function buildCircuitPath(from: any, to: any, destinationPlatform: any = null) {
      const platform = destinationPlatform || rowAbove()?.platforms.find(
        (candidate) => candidate.x === to.x,
      );
      const destinationRow = platform ? getRow(platform.row) : rowAbove();

      if (!platform || !destinationRow) {
        return cleanCircuitPath([
          { x: from.x, y: from.y },
          { x: from.x, y: to.y - 24 },
          { x: to.x, y: to.y - 24 },
          { x: to.x, y: to.y },
        ]);
      }

      const corridors = destinationCorridors(destinationRow);
      const preferred = chooseDestinationCorridor(
        destinationRow,
        platform.x,
        from.x,
      );

      const orderedCorridors = [
        preferred,
        ...corridors.filter((corridor) => corridor !== preferred),
      ];

      for (const corridor of orderedCorridors) {
        const candidate = buildSteppedRoute(
          from,
          to,
          platform,
          corridor,
        );
        if (pathIsClear(candidate)) {
          return candidate;
        }
      }

      const edgeCorridor = {
        left: from.x < width / 2 ? 1 : width - 15,
        right: from.x < width / 2 ? 15 : width - 1,
        center: from.x < width / 2 ? 8 : width - 8,
      };

      return buildSteppedRoute(
        from,
        to,
        platform,
        edgeCorridor,
      );
    }

    function pathMetrics(points: any[]) {
      const lengths = [];
      let total = 0;
      for (let i = 1; i < points.length; i += 1) {
        const length = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
        lengths.push(length);
        total += length;
      }
      return { lengths, total };
    }

    function pointOnPath(currentTravel: any) {
      let distance = currentTravel.distance;
      for (let i = 0; i < currentTravel.lengths.length; i += 1) {
        const length = currentTravel.lengths[i];
        if (distance <= length || i === currentTravel.lengths.length - 1) {
          const a = currentTravel.points[i];
          const b = currentTravel.points[i + 1];
          const amount = length === 0 ? 1 : clamp(distance / length, 0, 1);
          return { x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount), segment: i };
        }
        distance -= length;
      }
      const end = currentTravel.points[currentTravel.points.length - 1];
      return { x: end.x, y: end.y, segment: currentTravel.lengths.length - 1 };
    }




    function selectPlatform(platform: any) {
      if (!engineStarted || enginePaused || travel || platform.dead) return;
      if (platform.row !== player.row + 1) return;

      getAudioContext();
      platform.selected = true;
      const destination = landingPoint(platform);
      const from = { x: player.x, y: player.y };

      if (engineMovementMode === 'circuit') {
        const points = buildCircuitPath(from, destination);
        const metrics = pathMetrics(points);
        travel = {
          type: 'circuit',
          platform,
          points,
          lengths: metrics.lengths,
          total: metrics.total,
          distance: 0,
          segment: 0,
          correct: platform.correct,
        };
      } else {
        travel = {
          type: 'hop',
          platform,
          from,
          to: destination,
          duration: CONFIG.hopDuration,
          time: 0,
          correct: platform.correct,
        };
      }

      if (platform.correct) {
        playerNumberPresentation.phase = 'clearing';
        playerNumberPresentation.phaseStartedAt = elapsed;
        const nextActiveRow = getRow(platform.row + 1);
        if (nextActiveRow && nextActiveRow.problemSnapshot) {
          playerNumberPresentation.pendingValue = nextActiveRow.problemSnapshot.playerValue;
        } else {
          // Fallback if somehow not prepared
          playerNumberPresentation.pendingValue = 4;
        }
      }

      setMessage(`${player.value}) + ${platform.value} = ${player.value + platform.value}`, platform.correct ? 'success' : 'error', 800);
      sound.launch();
    }

    function spawnBurst(x: number, y: number, color: string, amount = 24, speed = 0.18) {
      for (let i = 0; i < amount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.45 + Math.random());
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          radius: 1.5 + Math.random() * 2.8,
          life: 0,
          maxLife: 350 + Math.random() * 420,
          color,
        });
      }
    }

    function arrive(currentTravel: any) {
      const platform = currentTravel.platform;
      const destination = landingPoint(platform);
      player.x = destination.x;
      player.y = destination.y;

      if (currentTravel.correct) {
        platform.powered = true;
        platform.litAt = elapsed;
        platform.selected = false;

        if (currentTravel.type === 'circuit') {
          traces.push({
            points: currentTravel.points.map((point: any) => ({ ...point })),
            born: elapsed,
          });
        }

        player.row += 1;
        player.platform = platform;
        player.pulseAt = elapsed;
        engineBestRow = Math.max(engineBestRow, player.row);
        setBestRow(engineBestRow);
        try {
          window.localStorage.setItem('circuitClimbPrototypeBest', String(engineBestRow));
        } catch {
          // Safe fallback
        }
        
        travel = null;

        ensureRows();
        const nextActiveRow = getRow(player.row + 1);
        if (nextActiveRow && nextActiveRow.problemSnapshot) {
          player.value = nextActiveRow.problemSnapshot.playerValue;
        } else {
          player.value = 4;
        }

        if (playerNumberPresentation.pendingValue !== null) {
          playerNumberPresentation.displayedValue = playerNumberPresentation.pendingValue;
          playerNumberPresentation.pendingValue = null;
        } else {
          playerNumberPresentation.displayedValue = player.value;
        }
        
        // Immediately visible on exact landing frame
        playerNumberPresentation.phase = 'visible';
        playerNumberPresentation.phaseStartedAt = elapsed;

        armNextRow();
        updateHud();

        spawnBurst(player.x, player.y, COLORS.lime, 30, 0.22);
        spawnBurst(player.x, player.y, COLORS.cyanCore, 12, 0.12);
        sound.correct();
        return;
      }

      platform.dead = true;
      platform.selected = false;
      spawnBurst(player.x, player.y, COLORS.red, 32, 0.25);
      sound.wrong();
      setMessage('Short circuit. That platform is offline. Choose another.', 'error', 1300);

      const back = landingPoint(player.platform);
      travel = {
        type: 'return',
        from: { x: destination.x, y: destination.y },
        to: back,
        time: 0,
        duration: CONFIG.returnDuration,
      };
    }

    function updateTravel(delta: number) {
      if (!travel) return;

      if (travel.type === 'circuit') {
        travel.distance += CONFIG.routeSpeed * delta;
        const point = pointOnPath(travel);
        if (point.segment > travel.segment) {
          travel.segment = point.segment;
          sound.corner();
        }
        player.x = point.x;
        player.y = point.y;
        if (travel.distance >= travel.total) arrive(travel);
        return;
      }

      if (travel.type === 'hop') {
        travel.time += delta;
        const amount = clamp(travel.time / travel.duration, 0, 1);
        player.x = lerp(travel.from.x, travel.to.x, amount);
        player.y = lerp(travel.from.y, travel.to.y, amount) - Math.sin(amount * Math.PI) * CONFIG.hopHeight;
        if (amount >= 1) arrive(travel);
        return;
      }

      if (travel.type === 'return') {
        travel.time += delta;
        const amount = clamp(travel.time / travel.duration, 0, 1);
        player.x = lerp(travel.from.x, travel.to.x, amount);
        player.y = lerp(travel.from.y, travel.to.y, amount) - Math.sin(amount * Math.PI) * 72;
        if (amount >= 1) {
          player.x = travel.to.x;
          player.y = travel.to.y;
          travel = null;
        }
      }
    }

    function updateParticles(delta: number) {
      particles.forEach((particle) => {
        particle.life += delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.00042 * delta;
      });
      particles = particles.filter((particle) => particle.life < particle.maxLife);
    }

    function cullWorld() {
      const bottom = cameraY + height + CONFIG.cullMargin;
      const originalCount = rows.length;
      rows = rows.filter((row) => row.y < bottom || row.index >= player.row - 2);
      if (rows.length !== originalCount) {
        obstacleRevision += 1;
      }
      traces = traces.filter((trace) => Math.min(...trace.points.map((point: any) => point.y)) < bottom);
    }

    function update(delta: number) {
      elapsed += delta;
      if (messageTimer && elapsed >= messageTimer) {
        messageTimer = 0;
        setMessage('Tap the platform that completes the equation.');
      }

      if (playerNumberPresentation.phase === 'clearing') {
        if (elapsed - playerNumberPresentation.phaseStartedAt >= 110) {
          playerNumberPresentation.phase = 'hidden-transit';
          playerNumberPresentation.phaseStartedAt += 110;
        }
      }

      const targetAge = elapsed - targetPresentation.phaseStartedAt;
      if (targetPresentation.phase === 'dominant-enter' && targetAge >= 180) {
        targetPresentation.phase = 'dominant-hold';
      } else if (targetPresentation.phase === 'dominant-hold' && targetAge >= 650) {
        targetPresentation.phase = 'receding';
      } else if (targetPresentation.phase === 'receding' && targetAge >= 1500) {
        targetPresentation.phase = 'resting';
      }
      targetPresentation.progress = clamp(targetAge / 1500, 0, 1);

      updateTravel(delta);
      updateParticles(delta);

      const desiredCamera = player.y - height * CONFIG.cameraAnchor;
      cameraY += (desiredCamera - cameraY) * (1 - Math.pow(0.0008, delta / 1000));

      cullWorld();
      updateHud();
    }

    function worldToScreenY(worldY: number) {
      return worldY - cameraY;
    }

    function parallaxOffset(factor: number, period: number) {
      return ((-cameraY * factor) % period + period) % period;
    }

    function drawFarParallax() {
      const offset = parallaxOffset(CONFIG.farParallax, 260);
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = COLORS.bgDepth;
      ctx.lineWidth = 2;
      for (let i = -1; i < 6; i += 1) {
        const y = i * 260 + offset;
        ctx.beginPath();
        ctx.arc(width * 0.18, y + 70, 78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width * 0.82, y + 160, 112, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }


    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawTargetPresentation() {
      const p = targetPresentation;
      const targetAge = elapsed - p.phaseStartedAt;
      let alpha = 0.22;
      let yOffset = 0;
      
      const restSize = Math.min(width * 0.62, height * 0.31);
      const domSize = Math.min(width * 0.75, height * 0.45);
      let size = restSize;
      
      let flash = 0;
      let haloAlpha = 0;
      
      if (p.phase === 'dominant-enter') {
        const pr = clamp(targetAge / 180, 0, 1);
        alpha = 0.22 + pr * 0.68; // up to ~0.9
        size = domSize;
        flash = pr;
        yOffset = (1 - pr) * 20; // slight drop in
        haloAlpha = pr * 0.6;
      } else if (p.phase === 'dominant-hold') {
        alpha = 0.9;
        size = domSize;
        flash = 1;
        haloAlpha = 0.6;
      } else if (p.phase === 'receding') {
        const pr = clamp((targetAge - 650) / 850, 0, 1);
        const ease = pr < 0.5 ? 2 * pr * pr : 1 - Math.pow(-2 * pr + 2, 2) / 2;
        alpha = 0.9 - ease * (0.9 - 0.22);
        size = domSize - ease * (domSize - restSize);
        flash = 1 - ease;
        haloAlpha = 0.6 - ease * 0.6;
      } else {
        alpha = 0.22;
        size = restSize;
        flash = 0;
        haloAlpha = 0;
      }

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        yOffset = 0;
        size = restSize + (size - restSize) * 0.3; // Less scale
      }
      const drift = prefersReducedMotion ? 0 : parallaxOffset(CONFIG.farParallax, 420) - 210;
      const baseY = height * 0.42 + drift * 0.10 + yOffset;
      
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${size}px ui-monospace, monospace`;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flash > 0.25 ? COLORS.text : '#bacde6';
      ctx.shadowColor = flash > 0.25 ? COLORS.targetGlow : COLORS.gridDot;
      ctx.shadowBlur = 12 + flash * 46;
      ctx.fillText(String(p.targetValue), width / 2, baseY);
      ctx.restore();

      // SUM TO cue
      if (showSumToCue) {
        let cueAlpha = alpha * 1.5;
        if (cueAlpha > 1) cueAlpha = 1;
        
        const floatDrift = prefersReducedMotion ? 0 : Math.sin(elapsed / 800) * 4;
        const cueY = baseY - size * 0.55 - 30 + floatDrift;
        
        ctx.save();
        ctx.globalAlpha = cueAlpha;
        
        // Background chip
        const chipW = 90;
        const chipH = 28;
        const chipX = width / 2 - chipW / 2;
        const chipY = cueY - chipH / 2;
        
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = COLORS.cueSurface;
        roundRect(chipX, chipY, chipW, chipH, 14);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = COLORS.cueBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = COLORS.text;
        ctx.font = '900 12px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '1px';
        ctx.fillText('SUM TO', width / 2, cueY + 1);
        ctx.restore();
      }
    }


    function drawMidParallax() {
      const grid = 30;
      const offsetY = parallaxOffset(CONFIG.midParallax, grid);
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += grid) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = offsetY; y <= height; y += grid) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      ctx.fillStyle = COLORS.gridDot;
      for (let x = 15; x < width; x += grid) {
        for (let y = offsetY + 15; y < height; y += grid) {
          ctx.globalAlpha = 0.24 + 0.10 * Math.sin((x + y + elapsed * 0.02) * 0.04);
          ctx.beginPath();
          ctx.arc(x, y, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawForegroundParallax() {
      const offset = parallaxOffset(CONFIG.foregroundParallax, 190);
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = COLORS.bgDepth;
      ctx.lineWidth = 5;
      for (let i = -1; i < 7; i += 1) {
        const y = i * 190 + offset;
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(8, y + 68);
        ctx.lineTo(30, y + 68);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width - 8, y + 92);
        ctx.lineTo(width - 8, y + 162);
        ctx.lineTo(width - 32, y + 162);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBackground() {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);
      drawFarParallax();
      drawTargetPresentation();
      drawMidParallax();
    }

    function drawTrace(points: any[], alpha = 1, color = '#007BFF') {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.translate(0, -cameraY);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.globalAlpha = alpha;
      
      // Outline
      ctx.strokeStyle = '#0E1B33';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();

      // Inner fill
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();

      ctx.restore();
    }

    function drawTraces() {
      traces.forEach((trace) => {
        const age = elapsed - trace.born;
        const alpha = clamp(age / 240, 0.32, 0.88);
        drawTrace(trace.points, alpha, '#007BFF');
      });

      if (travel && travel.type === 'circuit') {
        const current = pointOnPath(travel);
        const partial = [];
        let remaining = travel.distance;
        partial.push({ ...travel.points[0] });
        for (let i = 0; i < travel.lengths.length; i += 1) {
          const length = travel.lengths[i];
          if (remaining >= length) {
            partial.push({ ...travel.points[i + 1] });
            remaining -= length;
          } else {
            partial.push({ x: current.x, y: current.y });
            break;
          }
        }
        drawTrace(partial, 1, '#007BFF');
      }
    }

    function drawPlatform(platform: any, activeRow: number) {
      if (platform.row === 0 && platform.column !== 1) {
        return;
      }
      const x = platform.x - platform.width / 2;
      const y = worldToScreenY(platform.y);

      if (y < -110 || y > height + 110) {
        return;
      }

      const active = platform.row === activeRow;
      const bob = active && !travel && !platform.dead
        ? Math.sin(elapsed * 0.003 + platform.column) * 1.5
        : 0;

      const drawY = y + bob;
      const cornerRadius = 4;

      ctx.save();
      
      let fill = '#ffffff';
      let border = '#D8E4F7';
      let bottomBar = '#D8E4F7';
      let textColor = '#0E1B33';
      let shadowColor = 'rgba(14, 27, 51, 0.04)';
      let shimmer = false;
      const isPoweredActivation = platform.powered && platform.row > 0;
      
      if (platform.dead) {
        fill = '#f1f5f9';
        border = '#cbd5e1';
        bottomBar = '#cbd5e1';
        textColor = '#94a3b8';
        shadowColor = 'transparent';
      } else if (isPoweredActivation) {
        fill = '#ffffff';
        border = COLORS.cyan;
        bottomBar = COLORS.lime;
        textColor = COLORS.cyan;
        shadowColor = 'rgba(14, 165, 233, 0.15)';
        shimmer = true;
      } else if (platform.powered || platform.selected) {
        fill = '#ffffff';
        border = '#007BFF';
        bottomBar = '#007BFF';
        textColor = '#007BFF';
        shadowColor = 'rgba(0, 123, 255, 0.1)';
      } else if (active) {
        fill = '#ffffff';
        border = '#D8E4F7';
        bottomBar = '#007BFF';
        textColor = '#0E1B33';
        shadowColor = 'rgba(14, 27, 51, 0.08)';
      }

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = platform.dead ? 0 : 8;
      ctx.shadowOffsetY = platform.dead ? 0 : 4;

      // Draw Main Box
      roundedRectPath(ctx, x, drawY, platform.width, platform.height, cornerRadius);
      ctx.fillStyle = fill;
      ctx.fill();
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = border;
      ctx.stroke();

      // Plasma/shimmer effect
      if (shimmer) {
         const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
         if (!prefersReducedMotion) {
             const age = elapsed - (platform.litAt || elapsed);
             
             // Activation pulse
             if (age < 180) {
                 ctx.save();
                 roundedRectPath(ctx, x, drawY, platform.width, platform.height, cornerRadius);
                 ctx.clip();
                 ctx.fillStyle = 'rgba(14, 165, 233, ' + (1 - age/180) * 0.25 + ')';
                 ctx.fill();
                 ctx.restore();
             }
             
             // Steady internal shimmer
             ctx.save();
             roundedRectPath(ctx, x, drawY, platform.width, platform.height, cornerRadius);
             ctx.clip();
             
             const phase1 = elapsed * 0.002 + platform.column;
             const phase2 = elapsed * 0.0015 + platform.row;
             const yOff = Math.sin(phase1) * 8;
             const xOff = Math.cos(phase2) * 12;
             
             ctx.beginPath();
             ctx.moveTo(platform.x - 20 + xOff, drawY + 10 + yOff);
             ctx.quadraticCurveTo(platform.x + xOff, drawY + 20, platform.x + 20 - xOff, drawY + 30 - yOff);
             ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
             ctx.lineWidth = 2;
             ctx.stroke();

             const phase3 = elapsed * 0.0025 - platform.column;
             const yOff2 = Math.cos(phase3) * 10;
             const xOff2 = Math.sin(phase1) * 10;
             ctx.beginPath();
             ctx.moveTo(platform.x + 15 + xOff2, drawY + 15 + yOff2);
             ctx.quadraticCurveTo(platform.x - 5 - xOff2, drawY + 25 - yOff2, platform.x - 25, drawY + 10 + yOff2);
             ctx.strokeStyle = 'rgba(37, 99, 235, 0.08)';
             ctx.lineWidth = 1.5;
             ctx.stroke();
             
             ctx.restore();
         }
      }

      // Draw Bottom Bar
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = bottomBar;
      
      ctx.beginPath();
      ctx.moveTo(x + cornerRadius, drawY + platform.height - 4);
      ctx.lineTo(x + platform.width - cornerRadius, drawY + platform.height - 4);
      ctx.lineTo(x + platform.width, drawY + platform.height - cornerRadius);
      ctx.lineTo(x + platform.width, drawY + platform.height - cornerRadius);
      ctx.arcTo(x + platform.width, drawY + platform.height, x + platform.width - cornerRadius, drawY + platform.height, cornerRadius);
      ctx.lineTo(x + cornerRadius, drawY + platform.height);
      ctx.arcTo(x, drawY + platform.height, x, drawY + platform.height - cornerRadius, cornerRadius);
      ctx.lineTo(x, drawY + platform.height - 4);
      ctx.fill();

      // Draw Text or Power Symbol
      if (platform.value !== null && platform.row > 0) {
        if (isPoweredActivation) {
           const age = elapsed - (platform.litAt || elapsed);
           let alpha = 1;
           if (age < 260) {
             alpha = Math.max(0, (age - 60) / 200);
           }
           if (alpha > 0) {
               ctx.save();
               ctx.globalAlpha = alpha;
               ctx.strokeStyle = textColor;
               ctx.lineWidth = 3;
               ctx.lineCap = 'round';
               const cx = platform.x;
               const cy = drawY + platform.height / 2;
               
               // arc
               ctx.beginPath();
               ctx.arc(cx, cy, 10, -Math.PI * 0.4, Math.PI * 1.4);
               ctx.stroke();
               
               // vertical line
               ctx.beginPath();
               ctx.moveTo(cx, cy - 12);
               ctx.lineTo(cx, cy);
               ctx.stroke();
               
               ctx.restore();
           }
        } else {
          if (platform.dead) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(platform.x - 18, drawY + 13);
            ctx.lineTo(platform.x - 4, drawY + 26);
            ctx.lineTo(platform.x - 12, drawY + platform.height - 11);
            ctx.moveTo(platform.x + 16, drawY + 12);
            ctx.lineTo(platform.x + 3, drawY + 25);
            ctx.lineTo(platform.x + 14, drawY + platform.height - 11);
            ctx.stroke();
          }
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${Math.max(22, Math.min(29, platform.width * 0.26))}px ui-sans-serif, system-ui, sans-serif`;
          ctx.fillStyle = textColor;
          ctx.fillText(String(platform.value), platform.x, drawY + platform.height / 2);
        }
      }

      ctx.restore();
    }

    function drawPlatforms() {
      const activeRow = player.row + 1;
      rows.forEach((row) => row.platforms.forEach((platform) => drawPlatform(platform, activeRow)));
    }

    function drawPlayer() {
      // draw hitbox if enabled
      if (showCollisionHitboxes) {
         ctx.save();
         ctx.strokeStyle = '#00FF00';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(player.x, worldToScreenY(player.y), CONFIG.playerRadius, 0, Math.PI * 2);
         ctx.stroke();
         ctx.restore();
      }

      const screenY = worldToScreenY(player.y);
      const pulseAge = elapsed - player.pulseAt;
      const pulse = pulseAge >= 0 && pulseAge < 700 ? Math.sin((pulseAge / 700) * Math.PI) : 0;
      const radius = CONFIG.playerRadius + pulse * 5;

      ctx.save();
      ctx.translate(player.x, screenY);

      if (engineMovementMode === 'hop') {
        ctx.shadowColor = COLORS.lime;
        ctx.shadowBlur = 24;
        ctx.fillStyle = COLORS.bgDepth;
        ctx.strokeStyle = COLORS.lime;
        ctx.lineWidth = 2.4;
        roundedRectPath(ctx, -radius, -radius * 0.84, radius * 2, radius * 1.68, radius * 0.68);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#007bff';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '1000 24px ui-monospace, monospace';
      ctx.fillStyle = COLORS.white;

      if (playerNumberPresentation.phase !== 'hidden-transit' && playerNumberPresentation.displayedValue !== null) {
        let opacity = 1;
        let scale = 1;
        const phaseElapsed = elapsed - playerNumberPresentation.phaseStartedAt;

        if (playerNumberPresentation.phase === 'clearing') {
          const progress = clamp(phaseElapsed / 110, 0, 1);
          opacity = 1 - progress;
          scale = 1 - progress * 0.12;
        }

        if (opacity > 0) {
          ctx.save();
          ctx.globalAlpha = opacity;
          if (scale !== 1) {
            ctx.scale(scale, scale);
          }
          ctx.fillText(String(playerNumberPresentation.displayedValue), 0, engineMovementMode === 'hop' ? 2 : 1);
          ctx.restore();
        }
      }

      ctx.restore();
    }

    function drawParticles() {
      particles.forEach((particle) => {
        const alpha = 1 - particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(particle.x, worldToScreenY(particle.y), particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawNextRowIndicator() {
      const row = rowAbove();
      if (!row) return;
      const y = worldToScreenY(row.y) - 23;
      if (y < 105 || y > height - 80) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 9px ui-monospace, monospace';
      ctx.fillStyle = COLORS.structure;
      ctx.fillText(`TARGET ${row.targetValue}`, width / 2, y);
      ctx.restore();
    }

    function render() {
      drawBackground();
      drawTraces();
      drawPlatforms();
      drawNextRowIndicator();
      drawParticles();
      drawPlayer();
      drawForegroundParallax();
    }


    function togglePause(force?: boolean) {
      if (!showViewSettings) {
        closeViewSettings();
      }
      if (!engineStarted) return;
      enginePaused = typeof force === 'boolean' ? force : !enginePaused;
      setPaused(enginePaused);
      if (!enginePaused) lastTimestamp = performance.now();
    }

    function toggleMode() {
      if (travel) {
        setMessage('Change movement after the current jump.');
        return;
      }
      engineMovementMode = engineMovementMode === 'circuit' ? 'hop' : 'circuit';
      setMovementMode(engineMovementMode);
      setMessage(
        engineMovementMode === 'circuit'
          ? 'Circuit mode routes the spark through powered traces.'
          : 'Hop mode shows the same math loop as a direct platform jump.',
        'neutral',
        1600,
      );
    }

    function chooseByIndex(index: number) {
      const row = rowAbove();
      if (!row) return;
      const platform = row.platforms[index];
      if (platform) selectPlatform(platform);
    }

    function pointerPosition(event: any) {
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches && event.touches[0];
      const clientX = touch ? touch.clientX : event.clientX;
      const clientY = touch ? touch.clientY : event.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function handlePointer(event: any) {
      if (!engineStarted || enginePaused || travel) return;
      const point = pointerPosition(event);
      const row = rowAbove();
      if (!row) return;

      for (const platform of row.platforms) {
        const screenY = worldToScreenY(platform.y);
        const left = platform.x - platform.width / 2 - 9;
        const right = platform.x + platform.width / 2 + 9;
        const top = screenY - 12;
        const bottom = screenY + platform.height + 18;
        if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
          selectPlatform(platform);
          event.preventDefault();
          return;
        }
      }
    }

    function frame(timestamp: number) {
      animationFrame = requestAnimationFrame(frame);
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = clamp(timestamp - lastTimestamp, 0, 34);
      lastTimestamp = timestamp;

      if (engineStarted && !enginePaused) update(delta);
      render();
    }

    function closeViewSettings() {
      setShowViewSettings(false);
      enginePaused = settingsWasPausedRef.current;
      setPaused(enginePaused);
      if (!enginePaused) {
        lastTimestamp = performance.now();
      }
    }

    // Connect Engine callbacks to React Ref controllers
    loopControlRef.current = {
      beginGame,
      restart,
      togglePause,
      toggleMode,
      toggleSound() {
        engineSoundEnabled = !engineSoundEnabled;
        setSoundEnabled(engineSoundEnabled);
        if (engineSoundEnabled) getAudioContext();
      },
      selectByIndex(idx) {
        chooseByIndex(idx);
      },
      applyViewScale(val, opts) {
        applyViewScale(val, opts);
      },
      applyRouteTurnCount(val, opts) {
        applyRouteTurnCount(val, opts);
      },
      resetViewSettings() {
        applyRouteTurnCount(8, { persist: false });
        applyViewScale(100);
      },
      exportSettings() {
        refreshConfigOutput();
        setShowConfig(true);
      },
      closeViewSettings() {
        closeViewSettings();
      },
      debugGetRows: () => rows,
      debugGetPlayer: () => player,
      debugGetPlayerPresentation: () => playerNumberPresentation,
      debugGetCONFIG: () => CONFIG,
      debugGetTravel: () => travel,
      setShowSumToCue: (v: boolean) => setShowSumToCue(v),
      debugGetElapsed: () => elapsed,
      debugMakeRow: makeRow,
      debugEnsureRows: ensureRows,
      debugGetRow: getRow,
      debugArrive: arrive,
      
      debugSelectPlatform: selectPlatform,
      debugUpdate: (delta: number) => { update(delta); },
      debugDraw: () => { render(); }
    };

    // DOM Event Listeners matching index.html
    canvas.addEventListener('pointerdown', handlePointer, { passive: false });
    window.addEventListener('resize', resize);

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resize)
      : null;
    if (observer) {
      observer.observe(app);
    }

    // Set initial values
    const savedScale = readSavedViewScale();
    const savedTurns = readSavedRouteTurns();
    applyRouteTurnCount(savedTurns, { persist: false });
    applyViewScale(savedScale, { reflow: false, persist: false });
    resize();
    restart({ preserveOverlay: true });

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('resize', resize);
      if (observer) {
        observer.disconnect();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  // Expose callbacks to React components
  const beginGame = () => loopControlRef.current.beginGame?.();
  const restartGame = () => loopControlRef.current.restart?.();
  const togglePause = (force?: boolean) => loopControlRef.current.togglePause?.(force);
  const toggleMode = () => loopControlRef.current.toggleMode?.();
  const toggleSound = () => loopControlRef.current.toggleSound?.();
  const selectByIndex = (idx: number) => loopControlRef.current.selectByIndex?.(idx);

  const openViewSettings = () => {
    settingsWasPausedRef.current = paused;
    loopControlRef.current.togglePause?.(true);
    setShowViewSettings(true);
    setShowConfig(false);
  };

  const closeViewSettings = () => {
    loopControlRef.current.closeViewSettings?.();
  };

  const setViewScale = (val: number) => {
    loopControlRef.current.applyViewScale?.(val);
    if (showConfig) loopControlRef.current.exportSettings?.();
  };

  const setRouteTurns = (val: number) => {
    loopControlRef.current.applyRouteTurnCount?.(val);
    if (showConfig) loopControlRef.current.exportSettings?.();
  };

  const resetViewSettings = () => {
    loopControlRef.current.resetViewSettings?.();
    if (showConfig) loopControlRef.current.exportSettings?.();
  };

  const exportViewConfig = () => {
    loopControlRef.current.exportSettings?.();
  };

  return {
    canvasRef,
    appRef,
    viewModel: {
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
    } as CircuitClimbViewModel,
    beginGame,
    restartGame,
    togglePause,
    toggleMode,
    toggleSound,
    selectByIndex,
    openViewSettings,
    closeViewSettings,
    setViewScale,
    setRouteTurns,
    resetViewSettings,
    exportViewConfig,
    setShowConfig,
    setShowCollisionHitboxes,
    setShowSumToCue: (v: boolean) => setShowSumToCue(v),
    debug: {
      getRows: () => (loopControlRef.current as any).debugGetRows?.() || [],
      getPlayer: () => (loopControlRef.current as any).debugGetPlayer?.() || null,
      getPlayerPresentation: () => (loopControlRef.current as any).debugGetPlayerPresentation?.() || null,
      getCONFIG: () => (loopControlRef.current as any).debugGetCONFIG?.() || null,
      getTravel: () => (loopControlRef.current as any).debugGetTravel?.() || null,
      getElapsed: () => (loopControlRef.current as any).debugGetElapsed?.() || 0,
      makeRow: (idx: number) => (loopControlRef.current as any).debugMakeRow?.(idx),
      ensureRows: () => (loopControlRef.current as any).debugEnsureRows?.(),
      getRow: (idx: number) => (loopControlRef.current as any).debugGetRow?.(idx) || null,
      arrive: (currentTravel: any) => (loopControlRef.current as any).debugArrive?.(currentTravel),
      selectPlatform: (platform: any) => (loopControlRef.current as any).debugSelectPlatform?.(platform),
      update: (delta: number) => (loopControlRef.current as any).debugUpdate?.(delta),
      draw: () => (loopControlRef.current as any).debugDraw?.(),
    },
  };
};
