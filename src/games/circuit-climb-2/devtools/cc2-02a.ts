/**
 * CC2-02A minimal, directly playable browser harness.
 *
 * It intentionally uses the production candidate's actual deterministic core.
 * The canvas only renders snapshots; the DOM buttons send platform commands.
 * It contains NO pursuer simulation and NO invented answer assessment.
 */
import { CircuitClimbCore } from '../core/CircuitClimbCore';
import { RunConfigV1, defaultRunConfig } from '../config/runConfig';
import { getRow, findPlatform } from '../world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#worldCanvas')!;
const board = document.querySelector<HTMLElement>('#board')!;
const choices = document.querySelector<HTMLElement>('#choices')!;
const equation = document.querySelector<HTMLElement>('#equation')!;
const height = document.querySelector<HTMLElement>('#height')!;
const status = document.querySelector<HTMLElement>('#status')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const framingSelect = document.querySelector<HTMLSelectElement>('#framing')!;
const movementSelect = document.querySelector<HTMLSelectElement>('#movement')!;
const log = document.querySelector<HTMLElement>('#events')!;
const context = canvas.getContext('2d')!;
let engine = new CircuitClimbCore(seedInput.value);
let cameraY = 0;
let logicalHeight = 800;
let lastTime = 0;
let accumulator = 0;
let currentProblemId = '';
let previousEventCount = 0;
let buttons: HTMLButtonElement[] = [];

function worldY(y: number): number { return y - cameraY; }

function configFromControls(): RunConfigV1 {
  return {
    ...defaultRunConfig(),
    framingPercent: Number(framingSelect.value) as RunConfigV1['framingPercent'],
    movement: movementSelect.value as RunConfigV1['movement'],
  };
}

function updateMessage(): void {
  const state = engine.snapshot();
  const events = engine.eventLog();
  const event = events.at(-1);
  const message: Record<string, string> = {
    RUN_STARTED: 'Choose the numbered platform that completes the equation.',
    ATTEMPT_EVALUATED: 'Selection accepted. Watch the mathematical route.',
    LANDING_CONFIRMED: 'Arrival confirmed.',
    PLATFORM_SHORTED: 'Wrong operand: that platform shorted. Returning to try again.',
    RETURN_FINISHED: 'Back safely. Choose one of the remaining numbers.',
    ROW_COMPLETED: 'Correct. The Spark climbs and its value advances.',
    CELL_COMPLETED: 'Power cell completed: four correct landings.',
    VOLTAGE_REBASE: `Cell recharged: new starting number ${String(event?.detail.newValue ?? state.spark.value)}.`,
    RUN_PAUSED: 'Paused. Simulation time and travel are frozen.',
    RUN_RESUMED: 'Resumed.',
    RUN_ENDED: 'Run ended. Select New run to restart.',
  };
  status.textContent = event ? message[event.type] ?? 'Ready.' : 'Ready.';
  log.textContent = events.slice(-14).map(item =>
    `T${item.tick} ${item.type} ${JSON.stringify(item.detail)}`).join('\n');
}

function updateChoices(): void {
  const state = engine.snapshot();
  const problem = state.currentProblem;
  if (currentProblemId !== problem.problemId) {
    currentProblemId = problem.problemId;
    choices.replaceChildren();
    buttons = [];
    for (const option of problem.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.dataset.platformId = option.platformId;
      button.textContent = String(option.value);
      button.setAttribute('aria-label', `Choose ${option.value} to complete ${problem.incomingValue} plus blank equals ${problem.targetValue}`);
      button.onclick = () => { engine.selectPlatform(option.platformId); updateMessage(); };
      choices.appendChild(button);
      buttons.push(button);
    }
  }
  for (const button of buttons) {
    const platform = findPlatform(state.world, button.dataset.platformId!);
    if (!platform) continue;
    const width = canvas.clientWidth * platform.width / state.world.geometry.logicalWidth;
    const scale = canvas.clientWidth / state.world.geometry.logicalWidth;
    const y = worldY(platform.y) * scale;
    button.style.left = `${100 * platform.x / state.world.geometry.logicalWidth}%`;
    button.style.top = `${y}px`;
    button.style.width = `${width}px`;
    button.style.height = `${platform.height * scale}px`;
    button.disabled = state.phase !== 'ready' || state.paused || platform.dead;
    button.classList.toggle('short', platform.dead);
    button.classList.toggle('selected', platform.selected);
    button.hidden = y < -80 || y > canvas.clientHeight;
  }
}

function fitCanvas(): void {
  const box = board.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(box.width * dpr));
  canvas.height = Math.max(1, Math.round(box.height * dpr));
  logicalHeight = 600 * box.height / box.width;
  context.setTransform(canvas.width / 600, 0, 0, canvas.width / 600, 0, 0);
}

function roundedRect(x: number, y: number, width: number, height: number, radius = 10): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function draw(): void {
  const state = engine.snapshot();
  const g = state.world.geometry;
  fitCanvas();
  const targetCamera = state.spark.y - logicalHeight * 0.72;
  cameraY += (targetCamera - cameraY) * 0.13;
  const h = logicalHeight;

  const background = context.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, '#07131f');
  background.addColorStop(0.6, '#10283a');
  background.addColorStop(1, '#08111b');
  context.fillStyle = background;
  context.fillRect(0, 0, 600, h);

  // Three vertical architectural lanes establish strong visual continuity.
  for (const x of g.columns) {
    context.fillStyle = 'rgba(59,117,151,.06)';
    context.fillRect(x - 68, 0, 136, h);
    context.strokeStyle = 'rgba(106,177,203,.13)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, h);
    context.stroke();
  }

  for (const row of state.world.rows) {
    const y = worldY(row.y);
    if (y > h + 100 || y < -150) continue;
    for (const p of row.platforms) {
      const x = p.x - p.width / 2;
      context.save();
      context.shadowColor = p.powered ? '#5edcc8' : p.dead ? '#d06466' : '#315772';
      context.shadowBlur = p.powered ? 19 : 5;
      context.fillStyle = p.powered ? 'rgba(37,126,110,.72)' : p.dead ? 'rgba(98,38,48,.64)' : 'rgba(39,74,95,.4)';
      context.strokeStyle = p.powered ? '#83e5bc' : p.dead ? '#cf7d79' : '#507691';
      context.lineWidth = 2;
      roundedRect(x, y, p.width, p.height);
      context.fill();
      context.stroke();
      context.restore();
      if (p.powered) {
        context.fillStyle = '#b2ffe7';
        context.textAlign = 'center';
        context.font = 'bold 15px system-ui';
        context.fillText('✓', p.x, y + p.height * .58);
      }
    }
  }

  // The planned path is drawn in light cyan and the already travelled part
  // uses the same fixed-tick state that controls the physical Spark.
  if (state.travel?.movement === 'circuit' && state.travel.points.length > 1) {
    const pts = state.travel.points;
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(105,220,244,.42)';
    context.beginPath();
    context.moveTo(pts[0].x, worldY(pts[0].y));
    for (const p of pts.slice(1)) context.lineTo(p.x, worldY(p.y));
    context.stroke();
  }

  context.save();
  context.shadowBlur = 23;
  context.shadowColor = '#78dcfe';
  context.fillStyle = '#0f739e';
  context.strokeStyle = '#a4edff';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(state.spark.x, worldY(state.spark.y), g.playerRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
  context.fillStyle = '#ffffff';
  context.font = 'bold 19px system-ui';
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.fillText(String(state.spark.value), state.spark.x, worldY(state.spark.y));

  equation.textContent = `${state.currentProblem.incomingValue} + ? = ${state.currentProblem.targetValue}`;
  height.innerHTML = `ROW ${state.completedRows}<br>${state.attempts} attempts · ${state.score} pts`;
  pause.textContent = state.paused ? 'Resume' : 'Pause';
  updateChoices();
  if (previousEventCount !== engine.eventLog().length) {
    previousEventCount = engine.eventLog().length;
    updateMessage();
  }
}

function beginNewRun(): void {
  engine = new CircuitClimbCore(seedInput.value.trim() || 'cc2-02a-demo', configFromControls());
  currentProblemId = '';
  previousEventCount = 0;
  cameraY = engine.snapshot().spark.y - logicalHeight * 0.72;
  accumulator = 0;
  lastTime = performance.now();
  updateMessage();
  draw();
}

pause.onclick = () => {
  if (engine.snapshot().paused) engine.resume();
  else engine.pause();
  updateMessage();
};
restart.onclick = beginNewRun;
framingSelect.onchange = beginNewRun;
movementSelect.onchange = beginNewRun;
exportButton.onclick = () => {
  const output = JSON.stringify({
    replay: engine.replayExport(),
    stateDigest: engine.stateDigest(),
    events: engine.eventLog(),
    finalState: engine.snapshot(),
  }, null, 2);
  const url = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cc2-02a-core-replay.json';
  link.click();
  URL.revokeObjectURL(url);
};

window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === ' ') { event.preventDefault(); pause.click(); return; }
  if (!['1','2','3'].includes(event.key)) return;
  const option = engine.snapshot().currentProblem.options[Number(event.key) - 1];
  if (option) {
    engine.selectPlatform(option.platformId);
    updateMessage();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !engine.snapshot().paused) engine.pause();
});

// Lab-only introspection allows browser smoke to verify the real engine.
// It is not exposed by the final learner UI or a future SDK adapter.
(window as Window & { __CC2_02A__?: object }).__CC2_02A__ = {
  snapshot: () => engine.snapshot(),
  events: () => engine.eventLog(),
  replay: () => engine.replayExport(),
};

function frame(time: number): void {
  if (!lastTime) lastTime = time;
  accumulator += Math.min(100, Math.max(0, time - lastTime));
  lastTime = time;
  let steps = 0;
  while (accumulator >= 1000 / 60 && steps < 6) {
    engine.advanceTicks(1);
    accumulator -= 1000 / 60;
    steps += 1;
  }
  if (steps === 6 && accumulator > 1000 / 60) accumulator = 0;
  draw();
  requestAnimationFrame(frame);
}

beginNewRun();
requestAnimationFrame(frame);
