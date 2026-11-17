/**
 * CC2-27 — encounter readability layer for opt-in distinct roles.
 *
 * Only the source-owned SecondaryEnemyDirector owns sight cones, ticks,
 * spawn/cooldown, pressure, and event receipts. This layer visualizes its
 * public, finite observations. It never guesses Spark position or applies
 * pressure from CSS/DOM. No canvas or full-board compositor is created.
 */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const enabled=params.get('cc227')==='1';
  const SCHEMA='cc2-27-role-readability/v1';
  const SVG='http://www.w3.org/2000/svg';
  const events=[];
  let frames=0,painted=0,addedCones=0,runId=null,tick=-1,raf=0;
  const errors=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const game=()=>window.__CC2_02A__;
  const source=()=>game()?.secondary?.()??null;
  const role=(a)=>a.kind==='SCOUT'?'MOBILE_RECON':'DIRECTIONAL_LOCK';
  function pathForHeading(angle){
    // Same world-to-screen orientation as the source observer:
    // its heading is the actual deterministic -PI/2+sine sweep.
    const a=angle-Math.PI*.28,b=angle+Math.PI*.28,r=28;
    const x=n=>Number((36+r*Math.cos(n)).toFixed(3));
    const y=n=>Number((36+r*Math.sin(n)).toFixed(3));
    return 'M36 36 L'+x(a)+' '+y(a)+' A28 28 0 0 1 '+
      x(b)+' '+y(b)+' Z';
  }
  function decorate(view){
    const node=document.querySelector(
      '#cc223-secondary-layer .cc223-actor[data-id="'+view.id+'"]');
    if(!node)return false;
    node.dataset.cc227Role=view.role??role(view);
    node.dataset.cc227Signal=view.signalSource??'NONE';
    if(view.phase==='TELEGRAPH'||view.phase==='ALERT'){
      node.style.setProperty('--cc227-warning',
        String(clamp(view.warningProgress,0,1)));
    }else node.style.setProperty('--cc227-warning','0');
    if(view.kind==='SENTRY'){
      const svg=node.querySelector('svg');
      if(!svg)return false;
      let cone=svg.querySelector('.cc227-sentry-cone');
      if(!cone){
        cone=document.createElementNS(SVG,'path');
        cone.setAttribute('class','cc227-sentry-cone');
        cone.setAttribute('aria-hidden','true');
        svg.insertBefore(cone,svg.querySelector('.cc223-warning-ring'));
        addedCones++;
      }
      if(typeof view.heading==='number'&&Number.isFinite(view.heading))
        cone.setAttribute('d',pathForHeading(view.heading));
    }
    const hull=node.querySelector('.cc223-hull');
    if(hull&&view.phase==='COOLDOWN')hull.setAttribute('opacity','.70');
    else if(hull)hull.setAttribute('opacity','1');
    return true;
  }
  function report(){
    const s=source();
    return {
      schema:SCHEMA,enabled,frames,painted,addedCones,
      policy:s?.policy??null,mode:s?.mode??'off',
      runId,tick,actors:s?.actors?.map(a=>({
        id:a.id,kind:a.kind,role:a.role,phase:a.phase,
        signalSource:a.signalSource,heading:a.heading,
        warningProgress:a.warningProgress
      }))??[],
      pressure:s?.speedMultiplier??1,
      sourceEvents:s?.events?.length??0,
      blackOverlayCanvases:document.querySelectorAll(
        '#cc223-secondary-canvas,#cc227-canvas').length,
      errors:errors.slice(),recent:events.slice(-20),
      digest:game()?.sessionReport?.()?.stateDigest??null
    };
  }
  function frame(){
    raf=requestAnimationFrame(frame);
    if(!enabled)return;
    frames++;
    // 20Hz is sufficient for short-lived threat labels and mobile gesture
    // budgets. Source simulation already updates its own sprite positions.
    if(frames%3!==0)return;
    const s=source(),g=game()?.snapshot?.();
    if(!s||!g||s.policy!=='cc2-27-distinct/v1')return;
    if(g.runId!==runId){runId=g.runId;tick=-1;events.length=0;}
    if(g.tick===tick)return;
    tick=g.tick;
    for(const actor of s.actors)if(decorate(actor))painted++;
    if(s.events.length){
      const newest=s.events.at(-1);
      if(newest&&events.at(-1)?.id!==newest.id){
        events.push({id:newest.id,tick:newest.tick,
          enemyId:newest.enemyId,type:newest.type});
        if(events.length>50)events.shift();
      }
    }
    const status=document.getElementById('cc227-status');
    if(status&&frames%15===0){
      const scout=s.actors.find(a=>a.id==='scout');
      const sentry=s.actors.find(a=>a.id==='sentry');
      status.textContent=
        'Scout: '+(scout?.phase??'not spawned')+
        ' · Sentry: '+(sentry?.phase??'not spawned')+
        ' · Pressure: '+Math.round((s.speedMultiplier-1)*100)+'%'+
        ' (only if original Pursuer sees Spark)';
    }
  }
  function install(){
    const host=document.getElementById('cc209-developer-slot');
    if(!host||document.getElementById('cc227-panel'))return;
    const panel=document.createElement('details');
    panel.id='cc227-panel';
    const heading=document.createElement('summary');
    heading.textContent='CC2-27 · Scout / Sentry differentiated encounters';
    panel.append(heading);
    const explanation=document.createElement('p');
    explanation.textContent=
      'Scout: mobile scout; break sight to cancel its brief, capped 6% support pressure. '+
      'Sentry: fixed swept sight cone; longer warning, stronger capped 10% lock. '+
      'Pressure never stacks and only acts when the original Pursuer also sees Spark. '+
      'Both remain nonlethal and cannot read platform answers.';
    panel.append(explanation);
    const toggle=document.createElement('button');
    toggle.type='button';toggle.id='cc227-launch';
    toggle.textContent=enabled?
      'Restore normal single-Pursuer game':'Try both roles from the first row';
    toggle.onclick=()=>{
      const q=new URLSearchParams(location.search);
      if(enabled){
        q.delete('cc227');q.delete('cc223Demo');q.delete('cc223');
      }else{
        q.set('cc227','1');q.set('cc223','both');
        q.set('cc223Demo','1');
      }
      location.search=q.toString();
    };
    const status=document.createElement('p');status.id='cc227-status';
    status.setAttribute('aria-live','off');
    status.textContent=enabled?'Waiting for first real simulation tick':
      'Normal experience: no optional secondary enemies';
    panel.append(toggle,status);host.append(panel);
  }
  window.__CC2_27__=Object.freeze({report});
  function init(){
    install();
    if(!enabled)return;
    raf=requestAnimationFrame(frame);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
