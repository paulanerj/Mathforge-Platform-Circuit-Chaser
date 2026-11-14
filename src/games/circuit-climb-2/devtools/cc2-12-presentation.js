/**
 * CC2-11/12 — finite-sensing Pursuer states and restrained original-style energy.
 *
 * READ-ONLY PRESENTATION. The Pursuer's Brain, perception, graph and
 * chassis remain exactly as accepted. These labels never receive the answer,
 * pending route or a future position.
 */
window.addEventListener('DOMContentLoaded',()=>{
 'use strict';
 const api=()=>window.__CC2_02A__;
 const board=document.getElementById('board');
 if(!board)return;
 const indicator=document.createElement('div');
 indicator.id='cc212-chase-indicator';
 indicator.textContent='SEARCH';
 indicator.setAttribute('role','status');
 indicator.setAttribute('aria-live','polite');
 indicator.setAttribute('aria-label','Pursuer searching');
 indicator.hidden=true;
 board.append(indicator);
 const motion=document.createElement('div');
 motion.id='cc212-motion-signal';
 motion.setAttribute('aria-hidden','true');
 motion.hidden=true;
 board.append(motion);
 const notes={
  SEARCH:{label:'SEARCH',spoken:'Pursuer searching',tone:'search'},
  ACQUIRE:{label:'CONTACT',spoken:'Pursuer has noticed Spark',tone:'contact'},
  PRESSURE:{label:'PURSUIT',spoken:'Pursuer pursuing Spark',tone:'pursuit'},
  RECOVER:{label:'REACQUIRE',spoken:'Pursuer looking for a lost trail',tone:'recover'},
 };
 let run=null,phase='SEARCH',lastSensed=false,lastSeenTick=-99999,
  acquiredAt=-99999,frameCount=0,lastEventKey='',styleShownAt=0;
 const transitions=[],errors=[],seenRoutes=new Set();
 const counts={SEARCH:0,ACQUIRE:0,PRESSURE:0,RECOVER:0,
  varied:0,focused:0,suppressed:0};
 function reset(id){
  run=id;phase='SEARCH';lastSensed=false;lastSeenTick=-99999;
  acquiredAt=-99999;lastEventKey='';styleShownAt=0;seenRoutes.clear();
 }
 function present(now){
  try{
   const a=api(),state=a?.snapshot?.(),bot=a?.pursuer?.();
   if(state&&bot){
    if(run!==state.runId)reset(state.runId);
    const time=state.tick;
    if(bot.sensed&&!lastSensed)acquiredAt=time;
    if(bot.sensed)lastSeenTick=time;
    lastSensed=Boolean(bot.sensed);
    // Every state derives from current real finite-sensing observations.
    // RECOVER is visual-only and time-bounded; not a new AI knowledge mode.
    const next=bot.sensed
      ?time-acquiredAt<=18?'ACQUIRE':'PRESSURE'
      :time-lastSeenTick<=90?'RECOVER':'SEARCH';
    if(next!==phase){
     phase=next;counts[next]++;
     transitions.push({runId:run,tick:time,phase:next,
      sensed:bot.sensed,source:bot.lastSensorSource,
      beliefMode:bot.belief.mode});
     if(transitions.length>240)transitions.shift();
     board.dataset.cc212ChasePhase=next;
     const label=notes[next];indicator.textContent=label.label;
     indicator.setAttribute('aria-label',label.spoken);
    }
    indicator.hidden=state.phase==='ended'||
      !window.__cc2ChaseStarted;
    board.dataset.cc212ChasePhase=phase;
    const travel=state.travel;
    if(travel?.kind==='outbound'){
     const key=travel.attemptId;
     if(key!==lastEventKey){
      lastEventKey=key;styleShownAt=now;
      const recent=a?.events?.().filter(e=>e.type==='TRAVEL_STARTED'
        &&e.detail.attemptId===key).at(-1);
      if(recent&&!seenRoutes.has(key)){
       seenRoutes.add(key);
       if(recent.detail.routeVaried===true)counts.varied++;
       else counts.focused++;
       if(recent.detail.routeSuppressed===true)counts.suppressed++;
      }
     }
     const style=travel.routeStyle||'FOCUSED_SPRINT';
     const show=style!=='FOCUSED_SPRINT';
     motion.hidden=!show;
     if(show){
      motion.dataset.style=style;
      motion.textContent=style==='LIVELY_WEAVE'?'WEAVE':
        style==='FEINT_RECOVER'?'FEINT':'SETTLE';
     }
    }else motion.hidden=true;
    frameCount++;
   }
  }catch(err){
   errors.push(String(err instanceof Error?err.message:err));
   if(errors.length>200)errors.shift();
  }
  requestAnimationFrame(present);
 }
 window.__CC2_12__={
  summary:()=>({schema:'cc2-12-visual-trace/v1',
   phase,frames:frameCount,counts:{...counts},
   transitions:transitions.length,errors:errors.length,
   sourceDigest:api()?.sessionReport?.()?.stateDigest??null,
   routeStylesEnabled:api()?.replay?.()?.config?.routeStyleVersion==='cc2-motion-styles/v1'}),
  report:()=>({schema:'cc2-12-visual-trace/v1',
    counts:{...counts},transitions:transitions.map(x=>({...x})),
    errors:[...errors],sourceDigest:api()?.sessionReport?.()?.stateDigest??null}),
 };
 requestAnimationFrame(present);
});
