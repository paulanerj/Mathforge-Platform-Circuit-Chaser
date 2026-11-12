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
import type { RunSummaryV1 } from '../progression/runSummary';
import { RunConfigV1, defaultRunConfig } from '../config/runConfig';
import {defaultPursuerPreset,type PursuerPresetV1} from '../pursuer/pursuerPreset';
import {defaultFeatureConfig} from '../features/progression';
import {defaultLearnerMotionPreset,type LearnerMotionPresetV1} from '../config/learnerMotionPreset';
import {
  defaultDevLabPreset,intermediateDevLabPreset,
  validateCameraView,validateDevLabPreset,
  exportDevLabPreset,importDevLabPreset,projectCameraPoint,
  type DevLabPresetV1,type CameraViewPresetV1,
} from '../config/devLabPreset';
import { getRow, findPlatform } from '../world/world';
import {defaultPursuerPersonality,validatePursuerPersonality,
  type PursuerPersonalityV1,type PursuerEmotionV1} from '../pursuer/personality';
import {
  defaultFeedbackPreset,validateFeedbackPreset,
  CUE_CATALOG,CORE_CUES,FEATURE_CUES,
  type FeedbackPresetV1,type FeedbackCueId,
} from '../presentation/feedback';
import {CircuitClimbFeedbackAudio} from './feedbackAudio';

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
const log = document.querySelector<HTMLElement>('#events')!;
const pulseButton = document.querySelector<HTMLButtonElement>('#pulse');
const energy = document.querySelector<HTMLElement>('#energy');
const rowKind = document.querySelector<HTMLElement>('#rowKind');
const cellProgress = document.querySelector<HTMLElement>('#cellProgress');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const curriculumSelect = document.querySelector<HTMLSelectElement>('#curriculum');
const curriculumBadge = document.querySelector<HTMLElement>('#curriculumBadge');
const modeBadge = document.querySelector<HTMLElement>('#modeBadge');
const summaryPanel = document.querySelector<HTMLElement>('#summaryPanel');
const summaryTitle = document.querySelector<HTMLElement>('#summaryTitle');
const summaryOutcome = document.querySelector<HTMLElement>('#summaryOutcome');
const summaryStats = document.querySelector<HTMLElement>('#summaryStats');
const summaryBadges = document.querySelector<HTMLElement>('#summaryBadges');
const summaryEquations = document.querySelector<HTMLElement>('#summaryEquations');
const summaryClose = document.querySelector<HTMLButtonElement>('#summaryClose');
const summaryRestart = document.querySelector<HTMLButtonElement>('#summaryRestart');
const reviewSummary = document.querySelector<HTMLButtonElement>('#reviewSummary');
const endRunButton = document.querySelector<HTMLButtonElement>('#endRun');
const achievementToast = document.querySelector<HTMLElement>('#achievementToast');
const tuningPanel=document.querySelector<HTMLDetailsElement>('#tuningPanel');
const cameraZoomInput=document.querySelector<HTMLInputElement>('#cameraZoom');
const cameraFollowInput=document.querySelector<HTMLInputElement>('#cameraFollow');
const zoomValue=document.querySelector<HTMLOutputElement>('#zoomValue');
const labStatus=document.querySelector<HTMLElement>('#labStatus');
const presetData=document.querySelector<HTMLTextAreaElement>('#presetData');
const botReadout=document.querySelector<HTMLElement>('#botReadout');
const applyTuning=document.querySelector<HTMLButtonElement>('#applyTuning');
const resetTuning=document.querySelector<HTMLButtonElement>('#resetTuning');
const exportPreset=document.querySelector<HTMLButtonElement>('#exportPreset');
const importPreset=document.querySelector<HTMLButtonElement>('#importPreset');
const viewReadout=document.querySelector<HTMLElement>('#viewReadout');
const cueNotice=document.querySelector<HTMLElement>('#cueNotice');
const soundToggle=document.querySelector<HTMLButtonElement>('#soundToggle');
const testSound=document.querySelector<HTMLButtonElement>('#testSound');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio=new CircuitClimbFeedbackAudio();
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
  quit():void;
  summary():RunSummaryV1|null;
}
const botEnabled=document.body.dataset.pursuer==='on';
const featuresEnabled=document.body.dataset.features==='on';
const summaryEnabled=document.body.dataset.summary==='on';
const manualQA=featuresEnabled && new URLSearchParams(location.search).get('manual')==='1';
const graphDebug=new URLSearchParams(location.search).get('graph')==='1';
function makeSurfaceEngine(
  seed:string,config:RunConfigV1=defaultRunConfig(),
  learnerMotion:LearnerMotionPresetV1=defaultLearnerMotionPreset(),
  pursuerPreset:PursuerPresetV1=defaultPursuerPreset(),
  personality:PursuerPersonalityV1=defaultPursuerPersonality(),
):SurfaceEngine{
  if(botEnabled){
    const game=new CircuitClimbChaseCore(seed,config,pursuerPreset,
      defaultFeatureConfig(),learnerMotion,personality);
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
      quit:()=>game.quit(),
      summary:()=>game.runSummary(),
    };
  }
  const game=new CircuitClimbCore(seed,config,learnerMotion);
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
    quit:()=>game.quit(),
    summary:()=>null,
  };
}
let engine:SurfaceEngine=makeSurfaceEngine(seedInput.value);
let cameraView:CameraViewPresetV1={...intermediateDevLabPreset().camera};
let appliedLabPreset:DevLabPresetV1=intermediateDevLabPreset();
let currentFeedback:FeedbackPresetV1=defaultFeedbackPreset();
let activeCue:{id:FeedbackCueId;until:number;started:number}|null=null;
let previousBotEmotion:PursuerEmotionV1|null=null;
let cameraY = 0;
let previewRowsRendered=0;
let effectiveCameraZoom=0.70;
let cameraRowGap=205;
let viewportCoverage={above:0,below:0};
let logicalHeight = 800;
let lastTime = 0;
let accumulator = 0;
let currentProblemId = '';
let previousEventCount = 0;
let previousFeatureEventCount = 0;
let featureNoticeUntil = 0;
let toastUntil=0;
const seenAchievements=new Set<string>();
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
  if(achievementToast)achievementToast.hidden=!(now<toastUntil);
}

function worldY(y: number): number { return y - cameraY; }

/**
 * Developer input is read ONLY at explicit new-run boundaries.
 * The complete preset is validated before any new runtime is created.
 */
function numericControl(id:string):number {
  const element=document.querySelector<HTMLInputElement>('#'+id);
  if(!element || element.value.trim()==='')throw Error('TUNING_MISSING_'+id);
  return Number(element.value);
}
function boolControl(id:string):boolean {
  const element=document.querySelector<HTMLInputElement>('#'+id);
  if(!element)throw Error('TUNING_MISSING_'+id);
  return element.checked;
}
function configFromControls():RunConfigV1 {
  return {
    ...defaultRunConfig(),
    mode:(modeSelect?.value as RunConfigV1['mode'])??defaultRunConfig().mode,
    curriculum:(curriculumSelect?.value as RunConfigV1['curriculum'])??defaultRunConfig().curriculum,
    framingPercent:Number(framingSelect.value),
    movement:movementSelect.value as RunConfigV1['movement'],
    routeTurns:numericControl('routeTurns') as RunConfigV1['routeTurns'],
    transitShield:boolControl('transitShield'),
    landingGraceTicks:numericControl('landingGraceTicks'),
  };
}
function collectLabPreset():DevLabPresetV1 {
  const learnerMotion:LearnerMotionPresetV1={
    ...defaultLearnerMotionPreset(),
    circuitSpeedPerTick:numericControl('circuitSpeedPerTick'),
    hopTicks:numericControl('hopTicks'),
    returnTicks:numericControl('returnTicks'),
  };
  const pursuerPreset:PursuerPresetV1={...defaultPursuerPreset()};
  for(const field of [
    'nearSenseRadius','clearSightRadius','trailSenseRadius',
    'trailLifetimeTicks','staleContactTicks','speedSearch','speedPursuit',
    'actorRadiusRatio','spawnRowsBelow',
  ] as const) {
    pursuerPreset[field]=numericControl(field);
  }
  const camera:CameraViewPresetV1={
    zoom:numericControl('cameraZoom'),
    follow:numericControl('cameraFollow'),
  };
  return validateDevLabPreset({
    schemaVersion:'cc2-dev-lab/v1',
    run:configFromControls(),learner:learnerMotion,
    pursuer:pursuerPreset,camera,
    personality:{
      ...defaultPursuerPersonality(),
      style:(document.querySelector<HTMLSelectElement>('#personalityStyle')?.value??'curious') as 'curious'|'relentless',
      hesitationChance:numericControl('hesitationChance'),
      hesitationMinTicks:numericControl('hesitationMinTicks'),
      hesitationMaxTicks:numericControl('hesitationMaxTicks'),
      hesitationCooldownTicks:numericControl('hesitationCooldownTicks'),
      noticeTicks:numericControl('noticeTicks'),
      detourChance:numericControl('detourChance'),
      detourTicks:numericControl('detourTicks'),
      frustrationTicks:numericControl('frustrationTicks'),
    },
    feedback:{
      ...defaultFeedbackPreset(),
      enabled:boolControl('feedbackEnabled'),
      volume:numericControl('feedbackVolume'),
      vfxEnabled:boolControl('vfxEnabled'),
      vfxIntensity:numericControl('vfxIntensity'),
    },
  });
}
function loadLabPreset(preset:DevLabPresetV1):void {
  const p=validateDevLabPreset(preset);
  const fields:Record<string,number>={
    framing:p.run.framingPercent,routeTurns:p.run.routeTurns,
    landingGraceTicks:p.run.landingGraceTicks,
    ...{
      circuitSpeedPerTick:p.learner.circuitSpeedPerTick,
      hopTicks:p.learner.hopTicks,
      returnTicks:p.learner.returnTicks,
    },
    nearSenseRadius:p.pursuer.nearSenseRadius,
    clearSightRadius:p.pursuer.clearSightRadius,
    trailSenseRadius:p.pursuer.trailSenseRadius,
    trailLifetimeTicks:p.pursuer.trailLifetimeTicks,
    staleContactTicks:p.pursuer.staleContactTicks,
    speedSearch:p.pursuer.speedSearch,
    speedPursuit:p.pursuer.speedPursuit,
    actorRadiusRatio:p.pursuer.actorRadiusRatio,
    spawnRowsBelow:p.pursuer.spawnRowsBelow,
    cameraZoom:p.camera.zoom,cameraFollow:p.camera.follow,
    hesitationChance:p.personality!.hesitationChance,
    hesitationMinTicks:p.personality!.hesitationMinTicks,
    hesitationMaxTicks:p.personality!.hesitationMaxTicks,
    hesitationCooldownTicks:p.personality!.hesitationCooldownTicks,
    noticeTicks:p.personality!.noticeTicks,
    detourChance:p.personality!.detourChance,
    detourTicks:p.personality!.detourTicks,
    frustrationTicks:p.personality!.frustrationTicks,
    feedbackVolume:p.feedback!.volume,vfxIntensity:p.feedback!.vfxIntensity,
  };
  for(const [id,value] of Object.entries(fields)){
    const element=document.querySelector<HTMLInputElement|HTMLSelectElement>('#'+id);
    if(element)element.value=String(value);
  }
  const shield=document.querySelector<HTMLInputElement>('#transitShield');
  if(shield)shield.checked=p.run.transitShield;
  const persona=document.querySelector<HTMLSelectElement>('#personalityStyle');
  if(persona)persona.value=p.personality!.style;
  const feedbackCheckbox=document.querySelector<HTMLInputElement>('#feedbackEnabled');
  const vfxCheckbox=document.querySelector<HTMLInputElement>('#vfxEnabled');
  if(feedbackCheckbox)feedbackCheckbox.checked=p.feedback!.enabled;
  if(vfxCheckbox)vfxCheckbox.checked=p.feedback!.vfxEnabled;
  if(modeSelect)modeSelect.value=p.run.mode;
  if(curriculumSelect)curriculumSelect.value=p.run.curriculum;
  movementSelect.value=p.run.movement;
  cameraView=p.camera;
  currentFeedback=p.feedback!;
  audio.configure(currentFeedback);
  if(soundToggle){
    soundToggle.textContent=currentFeedback.enabled?'Sound: On':'Sound: Off';
    soundToggle.setAttribute('aria-pressed',String(currentFeedback.enabled));
  }
  if(zoomValue)zoomValue.textContent=Math.round(100*p.camera.zoom)+'%';
}
function labMessage(message:string,error=false):void {
  if(!labStatus)return;
  labStatus.textContent=message;
  labStatus.dataset.error=error?'yes':'no';
}

function updateMessage(): void {
  const events = engine.eventLog();
  // ROW_COMPLETED and VOLTAGE_REBASE can occur in the same simulation tick.
  // Consume all new events; reading events.at(-1) would hide the equation.
  const newEvents = events.slice(previousEventCount);
  const messages: Record<string, string> = {
    RUN_STARTED: 'Choose a numbered platform according to the displayed math rule.',
    ATTEMPT_EVALUATED: 'Choice accepted. Watch the arithmetic along the circuit.',
    LANDING_CONFIRMED: 'The Spark reached the selected platform.',
    PLATFORM_SHORTED: 'Wrong mathematical choice: the selected platform shorted.',
    RETURN_FINISHED: 'Back safely. The remaining choices are still available.',
    ROW_COMPLETED: 'Correct landing. The Spark now carries the solved total.',
    CELL_COMPLETED: 'Four correct rows completed. The cell is charged.',
    VOLTAGE_REBASE: 'Starting number reset — the transition is not an equation.',
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
      const skip = d.operation === 'skip-count-by-2';
      const actual = Number(d.incomingValue) + Number(d.selectedValue);
      mathWorking.textContent = skip
        ? `Count by 2: ${d.incomingValue} → ${d.selectedValue} · next ${d.targetValue}`
        : `${d.incomingValue} + ${d.selectedValue} = ${actual}  ·  target ${d.targetValue}`;
      mathWorking.dataset.kind = 'active';
      workingUntil = Infinity;
    }
    if (event.type === 'PLATFORM_SHORTED') {
      const d = events.find(item => item.type === 'ATTEMPT_EVALUATED' &&
        item.detail.attemptId === event.detail.attemptId)?.detail;
      if (d) {
        const sum = Number(d.incomingValue) + Number(d.selectedValue);
        mathWorking.textContent = d.operation === 'skip-count-by-2'
          ? `${d.incomingValue} → ${d.selectedValue} · expected next ${d.targetValue}`
          : `${d.incomingValue} + ${d.selectedValue} = ${sum}  ≠  ${d.targetValue}`;
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
        const attempt = events.find(item => item.type === 'ATTEMPT_EVALUATED' &&
          item.detail.attemptId === solved.attemptId);
        mathWorking.textContent = attempt?.detail.operation === 'skip-count-by-2'
          ? `${solved.incoming} → ${solved.result} · count by 2 ✓`
          : `${solved.incoming} + ${solved.operand} = ${solved.result}  ✓`;
        mathWorking.dataset.kind = 'correct';
        workingUntil = performance.now() + 1700;
      }
    }
    if (event.type === 'VOLTAGE_REBASE') {
      const d = event.detail;
      cellNotice.textContent = d.cause === 'NEXT_TARGET_PROBLEM'
        ? `NEW QUESTION · Spark resets ${d.oldValue} → ${d.newValue}`
        : `CELL ${d.completedCell} RECHARGED · ${d.oldValue} → ${d.newValue} (new start)`;
      noticeUntil = performance.now() + 2600;
    }
  }
  previousEventCount = events.length;
  log.textContent = events.slice(-14).map(item =>
    `T${item.tick} ${item.type} ${JSON.stringify(item.detail)}`).join('\n');
  renderFeedback();
  updateFeatureEvents();
  updateAchievements();
  if(newEvents.some(e=>e.type==='RUN_ENDED'))showSummary();
}

/**
 * Feature events are independently sourced and keep the math ledger intact.
 * A Relay is a visual-only wave; no feedback may reveal answer identity.
 */

/** Newly earned badges come only from source ledgers; no score shortcuts. */
function updateAchievements():void{
  if(!summaryEnabled)return;
  const report=engine.summary();
  if(!report)return;
  const fresh=report.achievements.filter(a=>!seenAchievements.has(a.id));
  if(!fresh.length)return;
  for(const earned of fresh)seenAchievements.add(earned.id);
  if(achievementToast){
    achievementToast.textContent='UNLOCKED · '+fresh.map(a=>a.title).join(' · ');
    toastUntil=performance.now()+1900;
    renderFeedback();
  }
}

/** Exact solved-only, run-scoped, read-only result from the core authority. */
function showSummary():void{
  if(!summaryEnabled||!summaryPanel)return;
  const report=engine.summary();
  if(!report?.ended)return;
  if(summaryTitle)summaryTitle.textContent='Circuit Climb · Run Summary';
  if(summaryOutcome)summaryOutcome.textContent=report.outcome;
  if(summaryStats){
    summaryStats.replaceChildren();
    const metrics=[
      ['Height',report.rowsSolved+' solved rows'],
      ['Power cells',String(report.powerCells)],
      ['Score',String(report.score)],
      ['Accepted choices',String(report.attempts)],
      ['Correct choices',String(report.correctAttempts)],
      ['Wrong choices',String(report.wrongAttempts)],
      ['Choice accuracy',report.accuracyPercent===null?'—':report.accuracyPercent+'%'],
      ['Simulated time',report.simulatedSeconds.toFixed(1)+'s'],
    ];
    for(const [key,value] of metrics){
      const line=document.createElement('div');
      line.className='summary-metric';
      const keyEl=document.createElement('span');keyEl.textContent=key;
      const valueEl=document.createElement('strong');valueEl.textContent=value;
      line.append(keyEl,valueEl);summaryStats.append(line);
    }
  }
  if(summaryBadges){
    summaryBadges.replaceChildren();
    if(!report.achievements.length){
      summaryBadges.textContent='No achievements unlocked in this run.';
    }else for(const badge of report.achievements){
      const chip=document.createElement('span');
      chip.className='summary-achievement';
      chip.textContent=badge.title;chip.title=badge.description;
      summaryBadges.append(chip);
    }
  }
  if(summaryEquations){
    summaryEquations.replaceChildren();
    if(!report.equations.length){
      const empty=document.createElement('li');
      empty.textContent='No completed equations in this run.';
      summaryEquations.append(empty);
    }else for(const eq of report.equations){
      const li=document.createElement('li');
      li.textContent='Row '+eq.row+' · '+eq.equation;
      summaryEquations.append(li);
    }
  }
  summaryPanel.hidden=false;
  if(reviewSummary)reviewSummary.disabled=false;
  summaryClose?.focus({preventScroll:true});
}

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
    }else if(event.type==='ABILITY_EXPIRED'){
      status.textContent='Circuit Pulse expired · Pursuer returns to full speed';
      featureNoticeUntil=performance.now()+1400;
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
      button.setAttribute('aria-label', problem.operation === 'skip-count-by-2'
        ? `Choose ${option.value} as the next value after ${problem.incomingValue} when counting by two`
        : `Choose ${option.value} to complete ${problem.incomingValue} plus blank equals ${problem.targetValue}`);
      button.onclick = () => { engine.selectPlatform(option.platformId); updateMessage(); };
      choices.appendChild(button);
      buttons.push(button);
    }
  }
  for (const button of buttons) {
    const platform = findPlatform(state.world, button.dataset.platformId!);
    if (!platform) continue;
    const scale=canvas.clientWidth/state.world.geometry.logicalWidth*effectiveCameraZoom;
    // DOM hit zones and Canvas share EXACTLY the same render-only projector.
    // Keep a >=52x44px real touch target on compact screens.
    const width=Math.max(52,platform.width*scale);
    const height=Math.max(44,platform.height*scale);
    const centre=projectCameraPoint(platform.x,
      platform.y+platform.height/2,cameraY,canvas.clientWidth,
      state.world.geometry.logicalWidth,effectiveCameraZoom);
    const y=centre.y-height/2;
    button.style.left=`${centre.x}px`;
    button.style.top=`${y}px`;
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
  const features = featuresEnabled ? engine.features() : null;
  fitCanvas();
  // Camera is a presentation-only viewport. To reveal at least three
  // FULL platform rows above and three below the player we calculate a
  // resolution-specific maximum zoom. Physics, pursuer and math are not scaled.
  // Include vertical card heights + canvas padding so 3-row reach is not
  // marginally clipped on narrow phones.
  cameraRowGap=g.rowGap;
  const totalWorldSpan=6*g.rowGap+g.platformHeight+54;
  const fitZoom=logicalHeight/totalWorldSpan;
  const zoom=Math.max(0.15,Math.min(cameraView.zoom,fitZoom));
  effectiveCameraZoom=zoom;
  const targetCamera=state.spark.y-logicalHeight/(2*zoom);
  // Follow smoothing is retained only inside the free margin and cannot
  // push one of the six guaranteed rows outside the visible viewport.
  const spare=Math.max(0,(logicalHeight/zoom-totalWorldSpan)/2);
  cameraY+=(targetCamera-cameraY)*cameraView.follow;
  cameraY=Math.max(targetCamera-spare,Math.min(targetCamera+spare,cameraY));
  const h=logicalHeight/zoom;
  viewportCoverage={above:(state.spark.y-cameraY)/g.rowGap,
    below:(cameraY+h-state.spark.y)/g.rowGap};

  // Paint the entire physical viewport BEFORE applying world-only zoom.
  // Neither hitboxes nor physics coordinate space are modified.
  const background = context.createLinearGradient(0, 0, 0, logicalHeight);
  background.addColorStop(0, '#07131f');
  background.addColorStop(0.6, '#10283a');
  background.addColorStop(1, '#08111b');
  context.fillStyle = background;
  context.fillRect(0, 0, 600, logicalHeight);
  context.save();
  context.translate(300,0);
  context.scale(zoom,zoom);
  context.translate(-300,0);

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

  // This lab preview deliberately does not generate future equations or
  // publish future platform IDs. The silhouettes are noninteractive
  // architectural scaffolding only; current math stays hidden until READY.
  previewRowsRendered=0;
  const sparkIndex=state.spark.row;
  // Render future and past *structural* scaffolding with NO numbers,
  // no problem IDs, no correct answers, and no interactive hit targets.
  // Keep the closest 3 rows in each direction visible even at row zero.
  const previewIndices=[];
  for(let index=sparkIndex-3;index<=sparkIndex+4;index++){
    if(index===sparkIndex || state.world.rows.some(row=>row.index===index))continue;
    previewIndices.push(index);
  }
  for(const futureIndex of previewIndices){
    const y=worldY(-futureIndex*g.rowGap);
    if(y>h+g.platformHeight||y<-g.platformHeight)continue;
    previewRowsRendered++;
    context.save();
    context.setLineDash([6,7]);
    // Previews must be visible at 60–70% camera zoom, yet clearly
    // secondary to the numbered, selectable platforms.
    context.strokeStyle='rgba(125,177,202,.42)';
    context.fillStyle='rgba(48,88,116,.19)';
    context.lineWidth=1.7;
    for(const x of g.columns){
      roundedRect(x-g.platformWidth/2,y,g.platformWidth,g.platformHeight,10);
      context.fill();context.stroke();
    }
    context.restore();
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

  // A row modifier is a WHOLE-ROW attribute. Never mark only the correct
  // numbered platform: doing so would leak mathematical correctness.
  if(features && features.nextModifier!=='NORMAL' && state.phase!=='ended'){
    const activeRow=state.world.rows.find(row=>row.index===state.currentProblem.rowIndex);
    if(activeRow){
      const y=worldY(activeRow.y);
      if(y>=-130 && y<=h+100){
        context.save();
        context.fillStyle=features.nextModifier==='CAPACITOR'?'#e4c785':'#ace8f0';
        context.textAlign='center';
        context.textBaseline='middle';
        context.font='bold 16px system-ui';
        context.fillText(
          features.nextModifier==='CAPACITOR'?'CAPACITOR · +2 CHARGE':'RELAY · POWER CHAIN',
          300,y-28);
        context.restore();
      }
    }
  }

  // A Relay completion illuminates ALL actual solved platforms in the
  // retained world. The deterministic event tick drives the pulse;
  // nothing is allowed to create fictional solved math evidence.
  if(features){
    const relay=features.events.filter(event=>event.type==='RELAY_CHAIN').at(-1);
    if(relay && state.tick>=relay.tick && state.tick-relay.tick<70){
      const age=state.tick-relay.tick;
      const level=reducedMotion?0.32:0.65*(1-age/70);
      context.save();
      context.strokeStyle=`rgba(151,238,250,${Math.max(0,level).toFixed(3)})`;
      context.shadowColor='#9be8ec';
      context.shadowBlur=reducedMotion?0:15;
      context.lineWidth=5;
      for(const row of state.world.rows){
        if(row.index===0||row.index>Number(relay.detail.row))continue;
        const powered=row.platforms.find(card=>card.powered);
        if(!powered)continue;
        const y=worldY(powered.y);
        context.beginPath();
        context.roundRect(powered.x-powered.width/2-7,y-7,
          powered.width+14,powered.height+14,12);
        context.stroke();
      }
      context.restore();
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

  // Circuit Pulse is rendered from a source-owned ABILITY_ACTIVATED event.
  // It can MISS a distant pursuer; the wave never implies that an out-of-
  // range target was affected. Reduced motion shows a static bounded ring.
  if(features){
    const active=features.events.filter(event=>event.type==='ABILITY_ACTIVATED').at(-1);
    if(active && state.tick>=active.tick && state.tick-active.tick<50){
      const age=state.tick-active.tick;
      const progress=reducedMotion?1:Math.min(1,age/48);
      const ringRadius=34+(featuresEnabled?220:0)*progress;
      context.save();
      context.strokeStyle=active.detail.affected===true
        ?`rgba(122,236,221,${(0.85*(1-age/50)).toFixed(3)})`
        :`rgba(255,211,156,${(0.7*(1-age/50)).toFixed(3)})`;
      context.lineWidth=reducedMotion?3:5;
      context.shadowBlur=reducedMotion?0:18;
      context.shadowColor='#90f9e7';
      context.beginPath();
      context.arc(state.spark.x,worldY(state.spark.y),
        ringRadius,0,Math.PI*2);
      context.stroke();
      context.restore();
    }
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
      context.fillText((state.currentProblem.operation === 'skip-count-by-2' ? '→' : '+') + option.value, x, y);
    }
  }
  context.restore(); // Close render-only camera transform before any DOM work.

  equation.textContent = state.currentProblem.operation === 'skip-count-by-2'
    ? `Count by 2: ${state.currentProblem.incomingValue} → ?`
    : `${state.currentProblem.incomingValue} + ? = ${state.currentProblem.targetValue}`;
  if(curriculumBadge)curriculumBadge.textContent =
    state.currentProblem.operation === 'skip-count-by-2' ? 'SKIP COUNT · TO 10'
    : (curriculumSelect?.value === 'makeTarget20'
        ? `MAKE TARGET · ${state.currentProblem.targetValue}`
        : 'RUNNING ADDITION · TO 20');
  const botHud=engine.bot();
  if(botReadout && botHud && state.tick%15===0) {
    const report=[
      'MODE: '+botHud.belief.mode+' · '+botHud.belief.reason,
      'SENSOR: '+(botHud.sensed?'LIVE ':'NO LIVE ')+botHud.lastSensorSource,
      'PURSUER: X '+botHud.body.x.toFixed(1)+
        ' · Y '+botHud.body.y.toFixed(1),
      'GOAL: '+botHud.belief.goalId+' · NODE: '+botHud.body.nodeId,
      'ACQUISITIONS: '+botHud.belief.acquisitions+
        ' · REACQUISITIONS: '+botHud.belief.reacquisitions,
      'GRAPH NODES: '+botHud.graphNodeCount+
        ' · ROUTE FAILURES: '+botHud.routeFailures,
      'TRAIL SAMPLES: '+botHud.wakeCount+
        ' · SENSED TICKS: '+botHud.activeSensedTicks,
    ].join('\n');
    if(botReadout.textContent!==report)botReadout.textContent=report;
  }
  if(featuresEnabled){
    const feature=engine.features();
    if(feature){
      if(energy) energy.textContent='PULSE '+feature.charge+'/'+feature.capacity+
        (feature.pulseUntilTick>state.tick
          ? ' · ACTIVE '+Math.ceil((feature.pulseUntilTick-state.tick)/60)+'s'
          : feature.charge===feature.capacity
            ? feature.targetInRange?' · BOT IN RANGE':' · BOT OUT OF RANGE'
            : '');
      if(rowKind)rowKind.textContent='STAGE '+feature.stage+
        ' · '+feature.nextModifier+' ROW';
      if(cellProgress){
        const withinCell=state.completedRows%4;
        const cellNumber=Math.floor(state.completedRows/4)+1;
        const filled='●'.repeat(withinCell)+'○'.repeat(4-withinCell);
        const label='CELL '+cellNumber+' · '+filled+
          ' · '+withinCell+'/4 powered';
        if(cellProgress.textContent!==label)cellProgress.textContent=label;
        cellProgress.setAttribute('aria-label',
          'Power cell '+cellNumber+': '+withinCell+' of four rows completed');
      }
      if(pulseButton){
        pulseButton.textContent=feature.pulseUntilTick>state.tick
          ? 'Pulse active · '+Math.ceil((feature.pulseUntilTick-state.tick)/60)+'s'
          : feature.charge===feature.capacity
            ? feature.targetInRange?'Pulse · IN RANGE':'Pulse · OUT OF RANGE'
            : 'Pulse '+feature.charge+'/'+feature.capacity;
        pulseButton.disabled=!feature.pulseAvailable;
        pulseButton.setAttribute('aria-label',feature.pulseAvailable
          ? feature.targetInRange
            ? 'Activate charged Circuit Pulse; the pursuer is in range'
            : 'Pursuer out of range. Activating Circuit Pulse now will spend charge without slowing it.'
          : 'Circuit Pulse unavailable; charge '+feature.charge+' of '+feature.capacity);
      }
    }
  }
  height.innerHTML = `ROW ${state.completedRows}<br>${state.attempts} attempts · ${state.score} pts`
    + (botHud ? `<br><span style="color:#ff9db6">BOT ${botHud.belief.mode}</span>` : '');
  pause.textContent = state.paused ? 'Resume' : 'Pause';
  updateChoices();
  if (previousEventCount !== engine.eventLog().length) updateMessage();
  else renderFeedback();
  // A timer-based ability can expire without any new math/core event.
  // Observe the independently sourced feature ledger as well.
  if(featuresEnabled && engine.featureEvents().length!==previousFeatureEventCount){
    updateFeatureEvents();
    updateAchievements();
  }
  if(modeBadge)modeBadge.textContent=(modeSelect?.value??'climb').toUpperCase();
}

function beginNewRun(): void {
  // A new engine is constructed only after COMPLETE validation succeeds.
  // An invalid imported/edited field leaves the existing run untouched.
  let next:DevLabPresetV1;
  try {
    next=collectLabPreset();
  }catch(error){
    labMessage('Invalid tuning: '+String(error instanceof Error?error.message:error),true);
    return;
  }
  const nextEngine=makeSurfaceEngine(
    seedInput.value.trim()||'cc2-02a-demo',
    next.run,next.learner,next.pursuer,
  );
  engine=nextEngine;
  cameraView=next.camera;
  appliedLabPreset=next;
  if(zoomValue)zoomValue.textContent=Math.round(next.camera.zoom*100)+'%';
  currentProblemId = '';
  previousEventCount = 0;
  previousFeatureEventCount = 0;
  featureNoticeUntil = 0;
  toastUntil=0;
  seenAchievements.clear();
  if(summaryPanel)summaryPanel.hidden=true;
  if(reviewSummary)reviewSummary.disabled=true;
  workingUntil = 0;
  noticeUntil = 0;
  fitCanvas();
  cameraY=engine.snapshot().spark.y-logicalHeight/(2*effectiveCameraZoom);
  accumulator = 0;
  lastTime = performance.now();
  updateMessage();
  draw();
}

function liveCameraChange():void {
  try {
    if(!cameraZoomInput||!cameraFollowInput)return;
    const next=validateCameraView({
      zoom:Number(cameraZoomInput.value),
      follow:Number(cameraFollowInput.value),
    });
    cameraView=next;
    if(zoomValue)zoomValue.textContent=Math.round(100*next.zoom)+'%';
    // Camera framing is resolved inside draw() against the real viewport.
    // A control change has no engine/ledger side effects.
    cameraY=engine.snapshot().spark.y-logicalHeight/(2*effectiveCameraZoom);
    labMessage('Visual zoom '+Math.round(next.zoom*100)+
      '% applied live; simulation and mathematical state unchanged.');
    draw();
  }catch(error){
    labMessage('Camera setting rejected: '+
      String(error instanceof Error?error.message:error),true);
  }
}
if(cameraZoomInput)cameraZoomInput.oninput=liveCameraChange;
if(cameraFollowInput)cameraFollowInput.onchange=liveCameraChange;
if(applyTuning)applyTuning.onclick=()=>{
  const prior=engine;
  beginNewRun();
  if(engine!==prior)labMessage('Validated tuning applied. New run started; replay includes source-owned learner and pursuer presets.');
};
if(resetTuning)resetTuning.onclick=()=>{
  const base=defaultDevLabPreset();
  loadLabPreset({...base,run:{...base.run,curriculum:'makeTarget20'}});
  beginNewRun();
  labMessage('Lab defaults restored. New Make Target run started.');
};
if(exportPreset)exportPreset.onclick=()=>{
  try{
    const payload=exportDevLabPreset(collectLabPreset());
    if(presetData)presetData.value=payload;
    const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download='cc2-05a-behavior-preset.json';link.click();
    URL.revokeObjectURL(url);
    labMessage('Validated versioned tuning preset exported. Paste its JSON here to restore.');
  }catch(error){
    labMessage('Preset export rejected: '+
      String(error instanceof Error?error.message:error),true);
  }
};
if(importPreset)importPreset.onclick=()=>{
  try{
    if(!presetData)throw Error('PRESET_TEXTAREA_MISSING');
    const next=importDevLabPreset(presetData.value);
    // Validation is complete before ANY control or engine is modified.
    loadLabPreset(next);
    beginNewRun();
    labMessage('Preset imported and applied. New run started from the same seed.');
  }catch(error){
    labMessage('Preset import rejected: '+
      String(error instanceof Error?error.message:error),true);
  }
};

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
if(modeSelect)modeSelect.onchange=beginNewRun;
if(curriculumSelect)curriculumSelect.onchange=beginNewRun;
framingSelect.onchange = beginNewRun;
movementSelect.onchange = beginNewRun;
if(summaryClose)summaryClose.onclick=()=>{if(summaryPanel)summaryPanel.hidden=true;};
if(summaryRestart)summaryRestart.onclick=beginNewRun;
if(reviewSummary)reviewSummary.onclick=showSummary;
if(endRunButton)endRunButton.onclick=()=>{engine.quit();updateMessage();};
exportButton.onclick = () => {
  const output = JSON.stringify({
    replay: engine.replayExport(),
    appliedLabPreset: {...appliedLabPreset,camera:cameraView},
    stateDigest: engine.stateDigest(),
    events: engine.eventLog(),
    finalState: engine.snapshot(),
    runSummary: engine.summary(),
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
  if(summaryPanel && !summaryPanel.hidden){
    if(event.key==='Escape')summaryClose?.click();
    return;
  }
  if (event.key === ' ') { event.preventDefault(); pause.click(); return; }
  if ((event.key==='p'||event.key==='P') && pulseButton){
    event.preventDefault();if(!pulseButton.disabled)pulseButton.click();return;
  }
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
  rendererStats: () => ({canvasResizes,zoom:cameraView.zoom,
    effectiveZoom:effectiveCameraZoom,follow:cameraView.follow,
    previewRowsRendered,cameraY,viewportCoverage,cameraRowGap,
    framingPercent:engine.snapshot().world.geometry.rowGap}),
  pursuer: () => engine.bot(),
  features: () => engine.features(),
  featureEvents: () => engine.featureEvents(),
  summary: () => engine.summary(),
  pulse: () => {const outcome=engine.pulse();updateFeatureEvents();return outcome;},
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
