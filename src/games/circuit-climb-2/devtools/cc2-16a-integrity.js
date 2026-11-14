/**
 * CC2-16A — owner-facing Pursuer Integrity Lab.
 *
 * Normal play: one-click complete diagnostics export.
 * ?manual=1: three explicitly selected, source-driven test scenarios.
 * The lab NEVER changes the Brain, selected answer, math reducer or graph.
 * Buttons emit real DOM selections and advance the SAME game only through
 * the existing authorized manual QA tick API. All AI parameters remain in
 * the existing Developer Settings, independently tunable.
 */
(() => {
 'use strict';
 const manual=new URLSearchParams(location.search).get('manual')==='1';
 const api=()=>window.__CC2_02A__;
 const elt=id=>document.getElementById(id);
 const runtime={schema:'cc2-16a-integrity-lab/v1',running:false,
   runCount:0,latest:null,errors:[],routeWarnings:[],scenarios:[]};
 let lastTelemetryTick=-1,lastRun='',lastY=null,bestY=Infinity;
 let seenContact=false,contactLosses=0,maxDownhill=0,downSteps=0,peakWake=0;
 let recentDecisions=[],unhandled=[];
 const recent=(arr,item,limit)=>{arr.push(item);if(arr.length>limit)arr.shift();};
 window.addEventListener('error',e=>recent(unhandled,{kind:'error',
   message:String(e.message),time:performance.now()},60));
 window.addEventListener('unhandledrejection',e=>recent(unhandled,{
   kind:'unhandledrejection',message:String(e.reason),time:performance.now()},60));

 function progressSnapshot(){
   const a=api(),s=a?.snapshot?.(),b=a?.pursuer?.();
   if(!s||!b)return;
   if(lastRun!==s.runId){
     lastRun=s.runId;lastTelemetryTick=-1;lastY=null;
     bestY=Infinity;seenContact=false;contactLosses=0;maxDownhill=0;
     downSteps=0;peakWake=0;recentDecisions=[];
   }
   if(s.tick===lastTelemetryTick)return;
   if(b.sensed)seenContact=true;
   if(seenContact&&!b.sensed&&lastTelemetryTick>=0&&
      recentDecisions.at(-1)?.sensed===true)contactLosses++;
   peakWake=Math.max(peakWake,b.wakeCount||0);
   const gap=s.world.geometry.rowGap;
   if(b.belief.mode==='SEARCH'&&!b.sensed&&seenContact){
     bestY=Math.min(bestY,b.body.y);
     maxDownhill=Math.max(maxDownhill,b.body.y-bestY);
     if(lastY!==null&&b.body.y>lastY+1e-7)downSteps++;
     if(b.body.y-bestY>gap*1.12){
       const last=runtime.routeWarnings.at(-1);
       if(!last||last.runId!==s.runId||s.tick-last.tick>45)
         recent(runtime.routeWarnings,{
           runId:s.runId,tick:s.tick,downhill:b.body.y-bestY,
           node:b.body.nodeId,goal:b.belief.goalId,
           reason:b.belief.reason,mode:b.belief.mode
         },60);
     }
   }
   lastY=b.body.y;lastTelemetryTick=s.tick;
   recent(recentDecisions,{
     tick:s.tick,row:s.spark.row,sparkY:s.spark.y,
     botY:b.body.y,sensed:b.sensed,wakeCount:b.wakeCount,
     mode:b.belief.mode,reason:b.belief.reason,
     goal:b.belief.goalId,node:b.body.nodeId,
     range:Math.hypot(s.spark.x-b.body.x,s.spark.y-b.body.y)
   },1500);
 }
 function diagnostics(){
   const a=api();
   if(!a?.sessionReport)return null;
   progressSnapshot();
   const source=a.sessionReport(),trace=a.pursuerTrace?.()||[],
     bot=a.pursuer?.(),s=a.snapshot();
   return{
     schema:'cc2-16a-complete-session/v1',
     description:'Authoritative exact replay + every retained source 15-tick position sample, 700 latest per-tick Pursuer goal records, visual and audio events.',
     capturedAt:new Date().toISOString(),
     branchPolicy:'ascending-search-after-all-lost-contacts',
     origin:{url:location.origin,pathname:location.pathname,
       viewport:{width:innerWidth,height:innerHeight},
       reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
       manualQA:manual},
     source,
     pursuer:{
       latest:bot,sourceDecisionTrace:trace,
       decisionTraceWindow:'last 700 controller ticks; entire run reconstructible from source.replay',
       graph:a.devGraph?.()||null,
       sampledLiveDecisions:recentDecisions.slice(),
       observed:{
         sensedEver:seenContact,contactLosses,peakWake,
         maxSearchDownhill:maxDownhill,
         downhillSampleSteps:downSteps,
         routeWarnings:[...runtime.routeWarnings],
       }
     },
     independent:{
       music:window.__CC2_15__?.music?.()||null,
       score:window.__CC2_15__?.director?.()||null,
       learning:window.__CC2_15__?.learning?.()||null,
       ability:window.__CC2_15__?.ability?.()||null,
       presentation:window.__CC2_12__?.report?.()||null,
       originalEffects:window.__CC2_09D__?.report?.()||null,
       renderer:a.rendererStats?.()||null,
       audioErrors:window.__CC2_15__?.errors?.()||[],
       browserErrors:unhandled.slice(),
       labErrors:runtime.errors.slice(),
       scenarioResults:runtime.scenarios.slice(),
     },
     integrity:{
       runId:s.runId,replayIncluded:Boolean(source.replay),
       deterministicSourceDigest:source.stateDigest,
       telemetrySampleCount:source.samples?.length||0,
       retainedBotTickCount:trace.length,
       unresolvedNavigationFailures:bot?.routeFailures??null,
       mathOnlySolved:source.runSummary?.rowsSolved??null,
       explanation:'A finite-sensing pursuer cannot guarantee contact with an indefinitely accelerating Spark; an inactive Spark on public tower topology must eventually be re-encountered.'
     },
   };
 }
 function download(value,name){
   const blob=new Blob([JSON.stringify(value,null,2)],
     {type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=name;
   document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 function setStatus(text){const out=elt('cc216-status');
   if(out)out.textContent=text;}
 function refresh(){
   try{progressSnapshot();}
   catch(e){recent(runtime.errors,String(e),60);}
   requestAnimationFrame(refresh);
 }
 const idle=()=>new Promise(resolve=>setTimeout(resolve,0));
 function advance(steps){
   const a=api();
   if(!manual||!a?.advanceForQA)throw Error('CC2_16A_MANUAL_QA_REQUIRED');
   const s=a.snapshot();
   if(s.paused)throw Error('CC2_16A_PAUSED');
   a.advanceForQA(steps);
   progressSnapshot();
 }
 async function stepUntilReady(limit=260){
   for(let step=0;step<limit;step+=12){
     if(api().snapshot().phase==='ready'||api().snapshot().phase==='ended')break;
     advance(Math.min(12,limit-step));
     await idle();
   }
   return api().snapshot().phase;
 }
 function choose(sourceId=null){
   const a=api(),state=a.snapshot();
   if(state.phase!=='ready')throw Error('CC2_16A_NOT_READY');
   const correct=state.currentProblem.correctPlatformId;
   const platformId=sourceId||correct;
   const button=document.querySelector('button.choice[data-platform-id="'+platformId+'"]');
   if(!button||button.disabled)throw Error('CC2_16A_CHOICE_UNAVAILABLE '+platformId);
   button.click();
   return platformId;
 }
 async function advanceUntil(tick,maxChunk=18){
   const a=api();
   while(a.snapshot().tick<tick&&a.snapshot().phase!=='ended'){
     const delta=tick-a.snapshot().tick;
     advance(Math.min(maxChunk,delta));await idle();
   }
 }
 async function reset(){
   elt('cc209-settings')?.querySelector('[data-close="cc209-settings"]')?.click();
   await idle();await idle();
   elt('restart')?.click();await idle();
   if(elt('cc209c-enter')&&
      !elt('cc209c-intro')?.hidden)elt('cc209c-enter').click();
   await idle();
   if(api().snapshot().paused)elt('pause')?.click();
   if(api().snapshot().paused)throw Error('CC2_16A_CANNOT_UNPAUSE');
   if(api().snapshot().tick!==0)throw Error('CC2_16A_RESET_NOT_AT_ZERO');
 }
 const range=()=>{
   const a=api(),s=a.snapshot(),bot=a.pursuer();
   return bot?Math.hypot(s.spark.x-bot.body.x,s.spark.y-bot.body.y):NaN;
 };
 async function scenarioCloseFour(){
   await reset();
   choose('row-1-column-1');await advanceUntil(116);
   if(api().snapshot().phase!=='ready')throw Error('FIRST_ROW_NOT_LANDED');
   choose('row-2-column-2');await advanceUntil(581);
   const closeRange=range();
   if(!Number.isFinite(closeRange))throw Error('NO_PURSUER');
   if(api().snapshot().phase==='ended')throw Error('CAPTURED_BEFORE_SPRINT');
   let completed=0;
   for(let i=0;i<4;i++){
     if(api().snapshot().phase!=='ready')break;
     choose();
     const status=await stepUntilReady(270);
     if(status==='ended')break;
     completed++;
     setStatus('Rapid chase: '+completed+'/4 real landings · bot range '+
       range().toFixed(0)+' · no goal teleports');
   }
   const afterSprint=range();
   await advanceUntil(api().snapshot().tick+2300);
   const a=api(),state=a.snapshot(),p=a.pursuer();
   return{scenario:'close-behind-then-4-rapid',closeRange,
     completedRapid:completed,sprintRange:afterSprint,finalRange:range(),
     finalTick:state.tick,rows:state.completedRows,ended:state.endReason,
     botMode:p?.belief.mode,reacquisitions:p?.belief.reacquisitions,
     routeFailures:p?.routeFailures,downhill:maxDownhill,
     seenContact,contactLosses,peakWake,
     evaluated:(completed>=3&&p?.routeFailures===0&&
       maxDownhill<=state.world.geometry.rowGap*1.12&&
       (p?.belief.reacquisitions>0||state.endReason==='CAPTURED'||
        range()<=state.world.geometry.rowGap))};
 }
 async function scenarioOriginal(){
   await reset();
   const recorded=[
     [0,'row-1-column-1'],[116,'row-2-column-2'],
     [581,'row-3-column-0'],[699,'row-4-column-2'],
     [806,'row-5-column-1'],[937,'row-6-column-1'],
     [1389,'row-7-column-2'],[1654,'row-8-column-0']
   ];
   let choices=0;
   for(const [tick,id] of recorded){
     await advanceUntil(tick);
     if(api().snapshot().phase==='ended')break;
     if(api().snapshot().phase==='ready'){
       choose(id);choices++;
     }
   }
   await advanceUntil(3360);
   const a=api(),s=a.snapshot(),b=a.pursuer();
   return{scenario:'uploaded-owner-8-row-schedule',
     choicesAccepted:choices,finalTick:s.tick,rows:s.completedRows,
     finalRange:range(),endReason:s.endReason,
     routeFailures:b?.routeFailures,downhill:maxDownhill,
     reacquisitions:b?.belief.reacquisitions,peakWake,
     fixed:!runtime.routeWarnings.length};
 }
 async function scenarioIdle(){
   await reset();
   choose();
   await advanceUntil(2200);
   const s=api().snapshot(),b=api().pursuer();
   return{scenario:'idle-after-first-solved-row',
     finalTick:s.tick,solved:s.completedRows,phase:s.phase,
     botRange:range(),captured:s.endReason==='CAPTURED',
     routeFailures:b?.routeFailures,downhill:maxDownhill};
 }
 async function runScenario(kind){
   if(runtime.running)return;
   runtime.running=true;runtime.routeWarnings=[];
   const buttons=document.querySelectorAll('.cc216-qa-button');
   buttons.forEach(b=>b.disabled=true);
   setStatus('Running '+kind+' using real source ticks and choices…');
   try{
     const data=kind==='close-four'?await scenarioCloseFour():
       kind==='owner-replay'?await scenarioOriginal():await scenarioIdle();
     runtime.latest=data;runtime.runCount++;
     recent(runtime.scenarios,data,20);
     setStatus(JSON.stringify(data,null,2));
   }catch(e){
     const error=String(e);
     recent(runtime.errors,error,60);
     runtime.latest={scenario:kind,error,failed:true};
     setStatus('SCENARIO FAILED: '+error);
   }finally{runtime.running=false;buttons.forEach(b=>b.disabled=false);}
 }
 window.__CC2_16A__={
   report:diagnostics,
   summary:()=>({schema:runtime.schema,latest:runtime.latest,
     runCount:runtime.runCount,errors:[...runtime.errors],
     routeWarnings:[...runtime.routeWarnings],maxDownhill,
     seenContact,contactLosses,peakWake}),
   runScenario,download:()=>download(diagnostics(),
     'CC2-16A-FULL-PURSUER-SESSION.json'),
 };
 window.addEventListener('DOMContentLoaded',()=>{
   const settings=elt('cc209-settings');
   if(!settings)return;
   const host=settings.querySelector('.cc209-dialog');
   if(!host)return;
   const d=document.createElement('details');
   d.id='cc216-pursuer-lab';
   d.innerHTML='<summary>Pursuer Integrity · full session and testing</summary>'+
     '<p>Full replay, game state, actual pursuit decisions, finite sensor evidence, ability and math events, music, renderer and errors.</p>'+
     '<button type="button" id="cc216-download">Download FULL Pursuer Session (JSON)</button>'+
     '<p class="cc216-note">The current source trace retains its last 700 ticks; exact replay and all retained 15-tick samples cover the session. Attach the JSON in this chat for diagnosis.</p>'+
     (manual?'<div id="cc216-qa-actions">'+
       '<p><strong>Simulation-only lab</strong> — buttons drive real source choices and ticks. They start a new test run; they do not modify AI tuning.</p>'+
       '<button class="cc216-qa-button" data-kind="close-four" type="button">Close bot → 4 rapid climbs → search</button>'+
       '<button class="cc216-qa-button" data-kind="owner-replay" type="button">Replay reported 8-row timing</button>'+
       '<button class="cc216-qa-button" data-kind="idle" type="button">Idle capture / reacquisition</button>'+
       '</div>':'<p class="cc216-note">For repeatable scenario controls, open this same preview with <code>?manual=1</code> appended.</p>')+
     '<pre id="cc216-status" role="status" aria-live="polite">Ready. No source state modified.</pre>';
   host.append(d);
   elt('cc216-download')?.addEventListener('click',()=>window.__CC2_16A__.download());
   host.querySelectorAll('.cc216-qa-button').forEach(btn=>
     btn.addEventListener('click',()=>runScenario(btn.dataset.kind)));
   requestAnimationFrame(refresh);
 });
})();
