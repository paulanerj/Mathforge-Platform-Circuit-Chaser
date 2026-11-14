/**
 * CC2-09D presentation observer. Never writes to the math, AI, world,
 * collision, answer, replay or feature systems. Every impact follows a
 * source-owned core/feature event, not a guessed animation outcome.
 *
 * CC2-09E: remove the redundant giant target reveal entirely.
 * The real in-board equation gets a <=3% scale / gentle glow for 520 ms.
 */
window.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const el=id=>document.getElementById(id),api=()=>window.__CC2_02A__;
 const source=el('worldCanvas'),board=el('board'),preend=el('cc209-preend');
 if(!source||!board||!preend)return;
 const canvas=document.createElement('canvas');canvas.id='cc209d-effects';
 canvas.setAttribute('aria-hidden','true');
 (el('cc209b-heritage-canvas')||source).insertAdjacentElement('afterend',canvas);
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const counts={targetReveal:0,correct:0,wrong:0,cell:0,rebase:0,capacitor:0,
  relay:0,stage:0,pulse:0,pulseMiss:0,pulseEnd:0,capture:0,goal:0,quit:0};
 const colors={correct:'#11a878',wrong:'#c43e5a',cell:'#009e9d',
  rebase:'#3797c8',capacitor:'#ba7f20',relay:'#008caa',stage:'#7055b5',
  pulse:'#158f71',pulseMiss:'#ad5668',pulseEnd:'#5d7caa',
  capture:'#c33756',goal:'#20a16b',quit:'#62849b'};
 const duration={correct:700,wrong:560,cell:850,rebase:600,
  capacitor:1000,relay:1000,stage:1250,pulse:1000,pulseMiss:600,
  pulseEnd:480,capture:1450,goal:1450,quit:420};
 let frames=0,clock=0,prevFrame=0,runId=null,previousCore=0,
   previousFeature=0,previousTarget='',targetStarted=0,phase='resting',
   active=[],endingRun=null,dropped=0;
 const errors=[],history=[];
 function record(type,e){counts[type]=(counts[type]||0)+1;
  history.push({type,tick:e?.tick??null,id:e?.id??null});
  if(history.length>200)history.shift();}
 function reset(next){runId=next;previousCore=0;previousFeature=0;
  previousTarget='';targetStarted=clock;phase='resting';active=[];
  endingRun=null;preend.dataset.outcome='';}
 function effect(type,event,state,extra={}){
  record(type,event);
  if(reduced||!state)return;
  // Ignore stale effects from QA fast-forwarding many simulation ticks.
  if(Number.isFinite(event?.tick)&&state.tick-event.tick>6)return;
  active.push({type,tick:event?.tick??state.tick,born:clock,
   x:state.spark.x,y:state.spark.y,extra});
  if(active.length>24){active.shift();dropped++;}
 }
 function finale(state,kind){
  if(endingRun===state.runId)return;
  endingRun=state.runId;preend.dataset.outcome=kind;
  const inner=preend.querySelector('.cc209-preend-inner');
  if(!inner)return;
  let meta=el('cc209d-final-meta');
  if(!meta){meta=document.createElement('div');meta.id='cc209d-final-meta';inner.append(meta);}
  meta.replaceChildren();
  const report=api()?.summary?.();
  for(const value of [(Number(report?.rowsSolved??state.completedRows)||0)+' rows climbed',
    (Number(report?.score??state.score)||0)+' points']){
   const pill=document.createElement('span');pill.textContent=value;meta.append(pill);
  }
  let subtitle=el('cc209d-final-subtitle');
  if(!subtitle){subtitle=document.createElement('span');subtitle.id='cc209d-final-subtitle';inner.append(subtitle);}
  subtitle.textContent=kind==='capture'
   ?'The Pursuer caught Spark. Your completed equations remain recorded.'
   :kind==='goal'
   ?'The goal was earned through completed mathematical rows.'
   :'The run ended. Only completed equations appear in your review.';
 }
 function readEvents(state){
  const a=api(),core=a?.events?.()||[],features=a?.featureEvents?.()||[];
  if(previousCore>core.length)previousCore=0;
  for(const event of core.slice(previousCore)){
   if(event.type==='ROW_COMPLETED')effect('correct',event,state);
   if(event.type==='PLATFORM_SHORTED')effect('wrong',event,state);
   if(event.type==='CELL_COMPLETED')effect('cell',event,state);
   if(event.type==='VOLTAGE_REBASE')effect('rebase',event,state);
   if(event.type==='RUN_ENDED'){
    const reason=event.detail?.reason||state.endReason;
    const kind=reason==='CAPTURED'?'capture':
      reason==='CHALLENGE_GOAL'||reason==='PRACTICE_GOAL'?'goal':'quit';
    effect(kind,event,state);finale(state,kind);
   }
  }
  previousCore=core.length;
  if(previousFeature>features.length)previousFeature=0;
  for(const event of features.slice(previousFeature)){
   if(event.type==='CHARGE_GAINED'&&event.detail?.modifier==='CAPACITOR')
    effect('capacitor',event,state);
   if(event.type==='RELAY_CHAIN')effect('relay',event,state);
   if(event.type==='STAGE_REACHED')effect('stage',event,state);
   if(event.type==='ABILITY_ACTIVATED')
    effect(event.detail?.affected?'pulse':'pulseMiss',event,state,
     {range:Number(event.detail?.range)||0,affected:Boolean(event.detail?.affected)});
   if(event.type==='ABILITY_EXPIRED')effect('pulseEnd',event,state);
  }
  previousFeature=features.length;
  if(state.phase==='ended'&&endingRun!==state.runId){
   const reason=state.endReason;
   finale(state,reason==='CAPTURED'?'capture':
    reason==='CHALLENGE_GOAL'||reason==='PRACTICE_GOAL'?'goal':'quit');
  }
 }
 function resize(){
  const w=source.clientWidth,h=source.clientHeight;
  if(w<=0||h<=0)return null;
  const dpr=Math.min(devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  return{w,h};
 }
 const xy=(x,y,cam,w)=>({
  x:w/2+(x-300)*cam.horizontalCameraScale*w/600,
  y:(y-cam.cameraY)*cam.effectiveZoom*w/600
 });
 /**
  * Presentation-only target acknowledgment. The equation chip already
  * displays the real target; never draw a duplicate center-screen number.
  * A short, bounded 3% scale and halo signals the new equation instead.
  */
 function target(state){
  if(state.phase==='ended'||!state.currentProblem){phase='resting';return;}
  const problem=state.currentProblem;
  const key=[state.completedRows,problem.incomingValue,problem.targetValue,problem.operation].join(':');
  if(key!==previousTarget){
   previousTarget=key;targetStarted=clock;counts.targetReveal++;
   const chip=el('cc209-equation');
   if(chip&&!reduced){
    chip.classList.remove('cc209e-target-glow');
    // Restart the effect only on a genuinely new source-owned problem.
    void chip.offsetWidth;
    chip.classList.add('cc209e-target-glow');
   }
  }
  phase=(!reduced&&clock-targetStarted<520)?'subtle-glow':'resting';
 }
 function wave(point,r,color,opacity,weight=2){
  if(r<1||opacity<=0)return;
  ctx.save();ctx.globalAlpha=clamp(opacity,0,1);ctx.strokeStyle=color;
  ctx.shadowColor=color;ctx.shadowBlur=9;ctx.lineWidth=weight;
  ctx.beginPath();ctx.arc(point.x,point.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 function drawEffect(f,cam,w,h){
  const age=clock-f.born,life=duration[f.type]||700;
  if(age>=life)return false;
  const p=xy(f.x,f.y,cam,w);if(p.y<-140||p.y>h+140)return true;
  const t=clamp(age/life,0,1),fade=1-t,color=colors[f.type]||'#1784ad';
  if(f.type==='pulse'||f.type==='pulseMiss'){
   // This radius comes from the source feature ledger, not a guessed range.
   const radius=clamp((f.extra.range||0)*cam.effectiveZoom*w/600,0,w*.85);
   wave(p,radius*(.24+.76*t),color,.76*fade,3);
   wave(p,radius*(.17+.54*t),color,.30*fade,1.4);
  }else{
   const boost=['stage','capture'].includes(f.type)?1.55:1;
   wave(p,(15+72*t)*boost,color,.70*fade,2.5);
   wave(p,(10+46*t)*boost,color,.35*fade,4);
  }
  if(['cell','capacitor','relay','stage','capture','goal'].includes(f.type)){
   const n=f.type==='capture'?18:12;
   ctx.save();ctx.strokeStyle=color;ctx.shadowColor=color;
   ctx.shadowBlur=5;ctx.lineWidth=1.7;ctx.globalAlpha=.76*fade;
   for(let i=0;i<n;i++){
    const a=i*2*Math.PI/n+f.tick*.073,r=(14+t*75)*(1+.12*Math.sin(i*2.4));
    ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r*.72,p.y+Math.sin(a)*r*.72);
    ctx.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.stroke();
   }
   ctx.restore();
  }
  if(f.type==='stage'){
   ctx.save();ctx.strokeStyle=color;ctx.lineWidth=9;ctx.globalAlpha=.15*fade;
   ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(w,p.y);ctx.stroke();ctx.restore();
  }
  return true;
 }
 function frame(now){
  try{
   const a=api(),state=a?.snapshot?.(),cam=a?.rendererStats?.();
   const delta=prevFrame?clamp(now-prevFrame,0,45):0;prevFrame=now;
   if(state&&cam){
    if(runId!==state.runId)reset(state.runId);
    const intro=el('cc209c-intro');
    const frozen=state.paused||(intro&&!intro.hidden);
    if(!frozen)clock+=delta;
    readEvents(state);
    const dims=resize();
    if(dims){
     const{w,h}=dims;
     if(!intro||intro.hidden){
      target(state);
      active=active.filter(f=>drawEffect(f,cam,w,h));
     }
     frames++;
    }
   }
  }catch(e){errors.push(String(e?.message||e));if(errors.length>200)errors.shift();}
  requestAnimationFrame(frame);
 }
 // Audit-only observability. Detached values, no mutation APIs.
 window.__CC2_09D__={
  summary:()=>({schemaVersion:'cc2-09d-presentation/v1',frames,
   phase,reducedMotion:reduced,styles:{...counts},
   activeEffects:active.length,droppedEffects:dropped,errors:errors.length,
   outcome:preend.dataset.outcome||null,
   coreEventsConsumed:previousCore,featureEventsConsumed:previousFeature,
   sourceDigest:api()?.sessionReport?.()?.stateDigest??null}),
  report:()=>({schemaVersion:'cc2-09d-animation-trace/v1',
   styleCounts:{...counts},history:history.map(x=>({...x})),
   errors:[...errors],sourceDigest:api()?.sessionReport?.()?.stateDigest??null}),
 };
 requestAnimationFrame(frame);
});
