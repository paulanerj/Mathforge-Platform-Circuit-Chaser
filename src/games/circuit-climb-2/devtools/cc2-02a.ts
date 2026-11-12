/**
 * CC2-02A minimal, directly playable browser harness.
 *
 * It intentionally uses the production candidate's actual deterministic core.
 * The canvas only renders snapshots; the DOM buttons send platform commands.
 * It contains NO pursuer simulation and NO invented answer assessment.
 */
import {
  CircuitClimbCore,type EngineStateV1,type GameEventV1,type SelectionResultV1,
} from '../core/CircuitClimbCore';
import { CircuitClimbChaseCore } from '../pursuer/CircuitClimbChaseCore';
import type { PursuerSnapshot } from '../pursuer/pursuerController';
import type { FeatureSnapshotV1, FeatureEventV1 } from '../features/progression';
import type { RunResultV1 } from '../results/runResult';
import { RunConfigV1, defaultRunConfig } from '../config/runConfig';
import { getRow, findPlatform } from '../world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#worldCanvas')!;
const board = document.querySelector<HTMLElement>('#board')!;
const choices = document.querySelector<HTMLElement>('#choices')!;
const equation = document.querySelector<HTMLElement>('#equation')!;
const height = document.querySelector<HTMLElement>('#height')!;
const status = document.querySelector<HTMLElement>('#status')!;
const mathWorking = document.querySelector<HTMLElement>('#mathWorking')!;
const cellNotice = document.querySelector<HTMLElement>('#cellNotice')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const framingSelect = document.querySelector<HTMLSelectElement>('#framing')!;
const movementSelect = document.querySelector<HTMLSelectElement>('#movement')!;
const modeSelect = document.querySelector<HTMLSelectElement>('#gameMode');
const resultButton = document.querySelector<HTMLButtonElement>('#resultButton');
const summaryDialog = document.querySelector<HTMLDialogElement>('#summaryDialog');
const closeSummary = document.querySelector<HTMLButtonElement>('#closeSummary');
const summaryTitle = document.querySelector<HTMLElement>('#summaryTitle');
const summaryStats = document.querySelector<HTMLElement>('#summaryStats');
const equationReview = document.querySelector<HTMLElement>('#equationReview');
const achievementReview = document.querySelector<HTMLElement>('#achievementReview');
const log = document.querySelector<HTMLElement>('#events')!;
const pulseButton = document.querySelector<HTMLButtonElement>('#pulse');
const energy = document.querySelector<HTMLElement>('#energy');
const rowKind = document.querySelector<HTMLElement>('#rowKind');
const context = canvas.getContext('2d')!;
/**
 * One presentation port for two actual authoritative engines. Without the
 * data-pursuer flag we reproduce CC2-02A/Q1 exactly; with it, the source
 * owns a real finite-sense Pursuer and the same learner transaction ledger.
 */
interface SurfaceEngine {
  snapshot():EngineStateV1;
  eventLog():GameEventV1[];
  selectPlatform(id:string):SelectionResultV1;
  advanceTicks(n:number):void;
  pause():void;resume():void;
  stateDigest():string;replayExport():unknown;
  bot():PursuerSnapshot|null;
  devGraph():ReturnType<CircuitClimbChaseCore['devGraph']>|null;
  features():FeatureSnapshotV1|null;
  featureEvents():FeatureEventV1[];
  pulse():{ok:boolean;affected?:boolean;reason?:string};
  results():RunResultV1|null;
}
const botEnabled=document.body.dataset.pursuer==='on';
const featuresEnabled=document.body.dataset.features==='on';
const resultEnabled=document.body.dataset.results==='on';
let lastPresentedRun='';
const manualQA=featuresEnabled && new URLSearchParams(location.search).get('manual')==='1';
const graphDebug=new URLSearchParams(location.search).get('graph')==='1';
function makeSurfaceEngine(seed:string,config:RunConfigV1=defaultRunConfig()):SurfaceEngine{
  if(botEnabled){
    const game=new CircuitClimbChaseCore(seed,config);
    return {
      snapshot:()=>game.learnerSnapshot(),
      eventLog:()=>game.eventLog(),
      selectPlatform:id=>game.selectPlatform(id),
      advanceTicks:n=>game.advanceTicks(n),
      pause:()=>game.pause(),resume:()=>game.resume(),
      stateDigest:()=>game.stateDigest(),
      replayExport:()=>game.replayExport(),
      bot:()=>game.snapshot().pursuer,
      devGraph:()=>game.devGraph(),
      features:()=>game.featureSnapshot(),
      featureEvents:()=>game.featureEventLog(),
      pulse:()=>game.activatePulse(),
      results:()=>game.runResult(),
    };
  }
  const game=new CircuitClimbCore(seed,config);
  return {
    snapshot:()=>game.snapshot(),
    eventLog:()=>game.eventLog(),
    selectPlatform:id=>game.selectPlatform(id),
    advanceTicks:n=>game.advanceTicks(n),
    pause:()=>game.pause(),resume:()=>game.resume(),
    stateDigest:()=>game.stateDigest(),
    replayExport:()=>game.replayExport(),
    bot:()=>null,
    devGraph:()=>null,
    features:()=>null,
    featureEvents:()=>[],
    pulse:()=>({ok:false,reason:'PURSUER_OFF'}),
    results:()=>null,
  };
}
let engine:SurfaceEngine=makeSurfaceEngine(seedInput.value);
let cameraY = 0;
let logicalHeight = 800;
let lastTime = 0;
let accumulator = 0;
let currentProblemId = '';
let previousEventCount = 0;
let previousFeatureEventCount = 0;
let featureNoticeUntil = 0;
let buttons: HTMLButtonElement[] = [];
let canvasResizes = 0;
let workingUntil = 0;
let noticeUntil = 0;

/**
 * Render-only timing never alters gameplay. The core owns every event and
 * arithmetic result; DOM notices are temporary explanations of those facts.
 */
function renderFeedback(): void {
  const now = performance.now();
  mathWorking.hidden = !(workingUntil === Infinity || now < workingUntil);
  cellNotice.hidden = !(now < noticeUntil);
}

function worldY(y: number): number { return y - cameraY; }

function configFromControls(): RunConfigV1 {
  return {
    ...defaultRunConfig(),
    framingPercent: Number(framingSelect.value) as RunConfigV1['framingPercent'],
    movement: movementSelect.value as RunConfigV1['movement'],
    mode:modeSelect?modeSelect.value as RunConfigV1['mode']:'climb',
  };
}

function updateMessage(): void {
  const events = engine.eventLog();
  // ROW_COMPLETED and VOLTAGE_REBASE can occur in the same simulation tick.
  // Consume all new events; reading events.at(-1) would hide the equation.
  const newEvents = events.slice(previousEventCount);
  const messages: Record<string, string> = {
    RUN_STARTED: 'Choose a numbered platform to complete the equation.',
    ATTEMPT_EVALUATED: 'Choice accepted. Watch the arithmetic along the circuit.',
    LANDING_CONFIRMED: 'The Spark reached the selected platform.',
    PLATFORM_SHORTED: 'Wrong sum: the selected platform shorted.',
    RETURN_FINISHED: 'Back safely. The remaining choices are still available.',
    ROW_COMPLETED: 'Correct landing. The Spark now carries the solved total.',
    CELL_COMPLETED: 'Four correct rows completed. The cell is charged.',
    VOLTAGE_REBASE: 'Checkpoint recharge: a new starting number is shown.',
    RUN_PAUSED: 'Paused. Movement and simulation time are frozen.',
    RUN_RESUMED: 'Resumed. Choose your next platform.',
    RUN_ENDED: 'Run ended. Choose New run to restart.',
  };
  for (const event of newEvents) {
    status.textContent = event.type==='RUN_ENDED' && event.detail.reason==='CAPTURED'
      ? 'The red pursuer reached the grounded Spark. Capture is physical and terminal.'
      : messages[event.type] ?? status.textContent;
    if (event.type === 'RUN_STARTED') {
      workingUntil = 0;
      noticeUntil = 0;
    }
    if (event.type === 'ATTEMPT_EVALUATED') {
      const d = event.detail;
      const actual = Number(d.incomingValue) + Number(d.selectedValue);
      mathWorking.textContent = `${d.incomingValue} + ${d.selectedValue} = ${actual}  ·  target ${d.targetValue}`;
      mathWorking.dataset.kind = 'active';
      workingUntil = Infinity;
    }
    if (event.type === 'PLATFORM_SHORTED') {
      const d = events.find(item => item.type === 'ATTEMPT_EVALUATED' &&
        item.detail.attemptId === event.detail.attemptId)?.detail;
      if (d) {
        const sum = Number(d.incomingValue) + Number(d.selectedValue);
        mathWorking.textContent = `${d.incomingValue} + ${d.selectedValue} = ${sum}  ≠  ${d.targetValue}`;
        mathWorking.dataset.kind = 'incorrect';
      }
      workingUntil = performance.now() + 1700;
    }
    if (event.type === 'RETURN_FINISHED') {
      workingUntil = Math.max(workingUntil, performance.now() + 1000);
    }
    if (event.type === 'ROW_COMPLETED') {
      const solved = engine.snapshot().solved.at(-1);
      if (solved) {
        mathWorking.textContent = `${solved.incoming} + ${solved.operand} = ${solved.result}  ✓`;
        mathWorking.dataset.kind = 'correct';
        workingUntil = performance.now() + 1700;
      }
    }
    if (event.type === 'VOLTAGE_REBASE') {
      const d = event.detail;
      cellNotice.textContent = `CELL ${d.completedCell} RECHARGED · ${d.oldValue} → ${d.newValue} (new start)`;
      noticeUntil = performance.now() + 2600;
    }
  }
  previousEventCount = events.length;
  log.textContent = events.slice(-14).map(item =>
    `T${item.tick} ${item.type} ${JSON.stringify(item.detail)}`).join('\n');
  renderFeedback();
  updateFeatureEvents();
}

/**
 * Feature events are independently sourced and keep the math ledger intact.
 * A Relay is a visual-only wave; no feedback may reveal answer identity.
 */
function updateFeatureEvents():void{
  if(!featuresEnabled)return;
  const all=engine.featureEvents();
  for(const event of all.slice(previousFeatureEventCount)){
    if(event.type==='ABILITY_ACTIVATED'){
      const affected=event.detail.affected===true;
      status.textContent=affected
        ? 'CIRCUIT PULSE · red Pursuer slowed temporarily'
        : 'CIRCUIT PULSE · no Pursuer in range; charge spent';
      featureNoticeUntil=performance.now()+1750;
    }else if(event.type==='RELAY_CHAIN'){
      status.textContent='Relay powered · previous solved links illuminated';
      featureNoticeUntil=performance.now()+900;
    }else if(event.type==='CHARGE_GAINED' && event.detail.modifier==='CAPACITOR'){
      status.textContent='Capacitor row powered · earned extra Pulse charge';
      featureNoticeUntil=performance.now()+1100;
    }else if(event.type==='STAGE_REACHED'){
      status.textContent='Stage '+event.detail.stage+' reached · tower continues';
      featureNoticeUntil=performance.now()+1600;
    }
  }
  previousFeatureEventCount=all.length;
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
      const modifier=featuresEnabled?engine.features()?.nextModifier:'NORMAL';
      button.dataset.modifier=modifier??'NORMAL';
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
    const scale = canvas.clientWidth / state.world.geometry.logicalWidth;
    // World geometry stays fixed; only the DOM's finger hit area expands.
    // At 320px width an unexpanded tile would be only ~31px tall.
    const width = Math.max(52, platform.width * scale);
    const height = Math.max(44, platform.height * scale);
    const y = worldY(platform.y + platform.height / 2) * scale - height / 2;
    button.style.left = `${100 * platform.x / state.world.geometry.logicalWidth}%`;
    button.style.top = `${y}px`;
    button.style.width = `${width}px`;
    button.style.height = `${height}px`;
    button.disabled = state.phase !== 'ready' || state.paused || platform.dead;
    button.classList.toggle('short', platform.dead);
    button.classList.toggle('selected', platform.selected);
    button.hidden = y < -80 || y > canvas.clientHeight;
  }
}

function fitCanvas(): void {
  const box = board.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(box.width * dpr));
  const h = Math.max(1, Math.round(box.height * dpr));
  // Assigning width/height reallocates and clears the backing store.
  // Resize only when the CSS size or device pixel ratio actually changes.
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvasResizes += 1;
  }
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
      // Row zero has one real source platform. Its outer two entries are
      // geometry placeholders marked dead internally, NOT past wrong answers.
      // Painting them red would falsely suggest the learner began with errors.
      if (row.index === 0 && p.column !== 1) continue;
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
      if (p.powered && row.index > 0) {
        context.fillStyle = '#b2ffe7';
        context.textAlign = 'center';
        context.font = 'bold 15px system-ui';
        context.fillText('✓', p.x, y + p.height * .58);
      }
    }
  }

  // Draw planned topology quietly, then illuminate only the portion that
  // has been PHYSICALLY travelled. This visual never grades a learner answer.
  if (state.travel?.movement === 'circuit' && state.travel.points.length > 1) {
    const pts = state.travel.points;
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(105,220,244,.27)';
    context.beginPath();
    context.moveTo(pts[0].x, worldY(pts[0].y));
    for (const p of pts.slice(1)) context.lineTo(p.x, worldY(p.y));
    context.stroke();

    let remaining = state.travel.distance;
    context.beginPath();
    context.moveTo(pts[0].x, worldY(pts[0].y));
    for (let i = 1; i < pts.length; i += 1) {
      const start = pts[i - 1];
      const finish = pts[i];
      const length = Math.abs(finish.x - start.x) + Math.abs(finish.y - start.y);
      if (remaining >= length) {
        context.lineTo(finish.x, worldY(finish.y));
        remaining -= length;
      } else {
        const ratio = length === 0 ? 1 : Math.max(0, remaining / length);
        context.lineTo(
          start.x + (finish.x - start.x) * ratio,
          worldY(start.y + (finish.y - start.y) * ratio),
        );
        break;
      }
    }
    context.save();
    context.strokeStyle = '#9aeaf6';
    context.shadowColor = '#9beef9';
    context.shadowBlur = 12;
    context.lineWidth = 5;
    context.stroke();
    context.restore();
  }

  // During the automatic wrong-answer return, a clearly different trail
  // indicates the short circuit and the direction of safe retreat.
  if (state.travel?.kind === 'return') {
    const travel = state.travel;
    context.save();
    context.setLineDash([8, 7]);
    context.strokeStyle = 'rgba(253,151,139,.75)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(travel.from.x, worldY(travel.from.y));
    context.lineTo(travel.to.x, worldY(travel.to.y));
    context.stroke();
    context.restore();
  }

  // Developer-only geometry mode: the physics network is not invented by
  // the UI. It displays edges issued by the same real pursuit controller.
  const bot=engine.bot();
  if(botEnabled && graphDebug){
    const graph=engine.devGraph();
    if(graph){
      const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
      context.save();
      context.lineWidth=1.2;
      context.strokeStyle='rgba(255,126,155,.19)';
      for(const edge of graph.edges){
        const a=nodes.get(edge.a),b=nodes.get(edge.b);
        if(!a||!b)continue;
        context.beginPath();context.moveTo(a.x,worldY(a.y));
        context.lineTo(b.x,worldY(b.y));context.stroke();
      }
      context.restore();
    }
  }
  if(bot){
    // All bot coordinates and its sensing flag come from the real sim state.
    context.save();
    context.shadowBlur=18;
    context.shadowColor=bot.sensed?'#ff6d8d':'#c54b75';
    context.fillStyle=bot.sensed?'#a52e59':'#61263f';
    context.strokeStyle=bot.sensed?'#ffd0da':'#ff8bab';
    context.lineWidth=2.5;
    context.beginPath();
    context.arc(bot.body.x,worldY(bot.body.y),bot.radius,0,2*Math.PI);
    context.fill();context.stroke();
    context.fillStyle='#fff0f6';
    context.font='bold 12px system-ui';
    context.textAlign='center';
    context.textBaseline='middle';
    context.fillText('◆',bot.body.x,worldY(bot.body.y));
    context.restore();
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
  if (state.travel?.kind === 'outbound') {
    const option = findPlatform(state.world, state.travel.platformId);
    if (option?.value !== null && option?.value !== undefined) {
      // The selected addend accompanies the blue Spark and reinforces why
      // the new result will only be carried after a correct landing.
      const x = state.spark.x + g.playerRadius + 13;
      const y = worldY(state.spark.y) - g.playerRadius - 4;
      context.font = 'bold 17px system-ui';
      context.textBaseline = 'middle';
      context.textAlign = 'center';
      context.fillStyle = '#e6fcff';
      context.fillText('+' + option.value, x, y);
    }
  }

  equation.textContent = `${state.currentProblem.incomingValue} + ? = ${state.currentProblem.targetValue}`;
  const botHud=engine.bot();
  if(featuresEnabled){
    const feature=engine.features();
    if(feature){
      if(energy) energy.textContent='PULSE '+feature.charge+'/'+feature.capacity+
        (feature.pulseUntilTick>state.tick
          ? ' · ACTIVE '+Math.ceil((feature.pulseUntilTick-state.tick)/60)+'s':'');
      if(rowKind)rowKind.textContent='STAGE '+feature.stage+
        ' · '+feature.nextModifier+' ROW';
      if(pulseButton){
        pulseButton.textContent='Pulse '+feature.charge+'/'+feature.capacity;
        pulseButton.disabled=!feature.pulseAvailable;
        pulseButton.setAttribute('aria-label',feature.pulseAvailable
          ? 'Activate charged Circuit Pulse to slow nearby pursuer'
          : 'Circuit Pulse unavailable; charge '+feature.charge+' of '+feature.capacity);
      }
    }
  }
  height.innerHTML = `ROW ${state.completedRows}<br>${state.attempts} attempts · ${state.score} pts`
    + (botHud ? `<br><span style="color:#ff9db6">BOT ${botHud.belief.mode}</span>` : '');
  pause.textContent = state.paused ? 'Resume' : 'Pause';
  if(resultEnabled){
    if(resultButton)resultButton.hidden=state.phase!=='ended';
    pause.hidden=state.phase==='ended';
    if(state.phase==='ended'&&lastPresentedRun!==state.runId){
      lastPresentedRun=state.runId;
      showRunSummary();
    }
  }
  updateChoices();
  if (previousEventCount !== engine.eventLog().length) updateMessage();
  else renderFeedback();
}

function beginNewRun(): void {
  if(summaryDialog?.open)summaryDialog.close();
  lastPresentedRun='';
  engine = makeSurfaceEngine(seedInput.value.trim() || 'cc2-02a-demo', configFromControls());
  currentProblemId = '';
  previousEventCount = 0;
  previousFeatureEventCount = 0;
  featureNoticeUntil = 0;
  workingUntil = 0;
  noticeUntil = 0;
  cameraY = engine.snapshot().spark.y - logicalHeight * 0.72;
  accumulator = 0;
  lastTime = performance.now();
  updateMessage();
  draw();
}

/**
 * Product results are drawn exclusively from source-validated landed
 * equations. Do not display accepted wrong or unlanded attempts as solved.
 */
function showRunSummary():void{
  const result=engine.results();
  if(!result||!summaryDialog||!summaryTitle||
      !summaryStats||!equationReview||!achievementReview)return;
  const endings:Record<string,string>={
    CAPTURED:'Pursuer captured the Spark',
    PRACTICE_GOAL:'Practice cell complete',
    CHALLENGE_GOAL:'Challenge completed',
    QUIT:'Run ended',RESTARTED:'Run restarted',
  };
  summaryTitle.textContent=endings[result.endReason??'']??'Current run results';
  summaryStats.textContent=
    result.rowsCompleted+' rows · '+result.cellsCompleted+' cells · '+
    result.attemptsAccepted+' attempts · '+
    (result.accuracyPercent===null?'—':result.accuracyPercent.toFixed(0)+'%')+
    ' accuracy · '+result.score+' pts';
  equationReview.replaceChildren();
  if(result.solvedEquations.length===0){
    const empty=document.createElement('li');
    empty.textContent='No completed equations yet.';
    equationReview.appendChild(empty);
  }
  for(const item of result.solvedEquations){
    const line=document.createElement('li');
    line.textContent='Row '+item.rowIndex+': '+item.incoming+
      ' + '+item.operand+' = '+item.result;
    equationReview.appendChild(line);
  }
  achievementReview.replaceChildren();
  for(const achievement of result.achievements){
    const label=document.createElement('li');
    label.textContent=achievement.description;
    achievementReview.appendChild(label);
  }
  if(result.achievements.length===0){
    const none=document.createElement('li');
    none.textContent='No milestones earned this run.';
    achievementReview.appendChild(none);
  }
  if(!summaryDialog.open)summaryDialog.showModal();
}
if(closeSummary)closeSummary.onclick=()=>summaryDialog?.close();
if(resultButton)resultButton.onclick=showRunSummary;

if(pulseButton)pulseButton.onclick=()=>{
  const result=engine.pulse();
  if(!result.ok)status.textContent='Pulse unavailable · '+(result.reason??'not ready');
  updateFeatureEvents();
  draw();
};
pause.onclick = () => {
  if (engine.snapshot().paused) engine.resume();
  else engine.pause();
  updateMessage();
};
restart.onclick = beginNewRun;
framingSelect.onchange = beginNewRun;
movementSelect.onchange = beginNewRun;
if(modeSelect)modeSelect.onchange=beginNewRun;
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
  rendererStats: () => ({ canvasResizes }),
  pursuer: () => engine.bot(),
  features: () => engine.features(),
  featureEvents: () => engine.featureEvents(),
  pulse: () => {const outcome=engine.pulse();updateFeatureEvents();return outcome;},
  results: () => engine.results(),
  advanceForQA: (ticks:number) => {
    if(!manualQA)throw new Error('QA_MANUAL_MODE_REQUIRED');
    engine.advanceTicks(ticks);draw();
    return engine.snapshot();
  },
};

function frame(time: number): void {
  if (!lastTime) lastTime = time;
  accumulator += Math.min(100, Math.max(0, time - lastTime));
  lastTime = time;
  let steps = 0;
  while (!manualQA && accumulator >= 1000 / 60 && steps < 6) {
    engine.advanceTicks(1);
    accumulator -= 1000 / 60;
    steps += 1;
  }
  if (steps === 6 && accumulator > 1000 / 60) accumulator = 0;
  if (manualQA) accumulator=0;
  draw();
  requestAnimationFrame(frame);
}

beginNewRun();
requestAnimationFrame(frame);
