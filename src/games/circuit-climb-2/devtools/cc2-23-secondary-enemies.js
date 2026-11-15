/**
 * CC2-23-BLACKOUT-01: Bounded secondary enemy presentation.
 *
 * Rationale: The CC2-23 experiment previously stacked an additional
 * FULL-BOARD animated 2D canvas above the accepted opaque Heritage board.
 * On some mobile compositors the extra canvas can present a dark layer while
 * the run is active. At actual capture that painter stopped, matching the
 * reported black-then-normal sequence. We avoid the risky composition path:
 * only two small, transparent DOM/SVG organisms are ever composited.
 *
 * All geometry, sensing, warnings, alerts and authoritative results come
 * exclusively from __CC2_02A__.secondary(). This module NEVER steps the
 * engine, creates game entities, grades answers or changes audio.
 */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const configuredMode=params.get('cc223')||'off';
  const active=['scout','sentry','both'].includes(configuredMode);
  const $=id=>document.getElementById(id);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const SVG='http://www.w3.org/2000/svg';
  let board=null,layer=null,raf=0,frames=0,lastTick=-1;
  const actors=new Map();
  const failures=[];
  let nextTextUpdate=0;

  function readSource(){
    return window.__CC2_02A__?.secondary?.()??null;
  }
  function report(){
    return {
      schema:'cc2-23-presentation/v2',
      mode:active?configuredMode:'off',active,
      renderer:'bounded-dom-svg',
      frames,lastTick,errors:failures.slice(),
      drawn:!!layer&&getComputedStyle(layer).display!=='none',
      source:readSource(),
      blackOverlayCanvasCount:document.querySelectorAll(
        '#cc223-secondary-canvas').length,
      actorCount:actors.size,
      digest:window.__CC2_02A__?.sessionReport?.()?.stateDigest??null,
    };
  }
  window.__CC2_23__=Object.freeze({report});

  function element(name,className){
    const e=document.createElement(name);
    if(className)e.className=className;
    return e;
  }
  function makeActor(id,kind){
    const el=element('div','cc223-actor');
    el.dataset.kind=kind.toLowerCase();
    el.dataset.id=id;
    el.setAttribute('aria-hidden','true');
    el.style.display='none';

    const wrap=element('div','cc223-body');
    const svg=document.createElementNS(SVG,'svg');
    svg.setAttribute('viewBox','0 0 72 72');
    svg.setAttribute('focusable','false');
    svg.setAttribute('aria-hidden','true');
    const isScout=kind==='SCOUT';
    const points=isScout?'36,13 57,52 15,52':'36,11 61,36 36,61 11,36';
    const color=isScout?'#cf8743':'#9361af';
    const rim=isScout?'#ffe7bb':'#efdbff';
    const dark=isScout?'#713e24':'#4c2c66';
    svg.innerHTML=
      '<defs><radialGradient id="cc223-grad-'+id+'" cx="32%" cy="27%" r="75%">'+
      '<stop offset="0" stop-color="'+rim+'"/>'+
      '<stop offset=".48" stop-color="'+color+'"/>'+
      '<stop offset="1" stop-color="'+dark+'"/></radialGradient></defs>'+
      '<circle class="cc223-warning-ring" cx="36" cy="36" r="29" '+
        'fill="none" stroke="'+rim+'" stroke-width="2" '+
        'stroke-dasharray="182.212" stroke-dashoffset="182.212"/>'+
      '<polygon class="cc223-hull" points="'+points+'" '+
        'fill="url(#cc223-grad-'+id+')" stroke="'+rim+'" stroke-width="2.3"/>'+
      '<circle cx="36" cy="36" r="8.1" fill="'+dark+'" opacity=".86"/>'+
      '<circle cx="34" cy="33" r="3.2" fill="#fff2df"/>';
    wrap.append(svg);
    el.append(wrap);
    const label=element('span','cc223-label');
    label.textContent=id.toUpperCase();
    el.append(label);
    layer.append(el);
    actors.set(id,{el,ring:svg.querySelector('.cc223-warning-ring')});
  }
  function positionActor(view,projection,viewportWidth,boardRect){
    const x=boardRect.width*.5+
      (view.x-300)*projection.horizontalCameraScale*boardRect.width/600;
    const y=(view.y-projection.cameraY)*
      projection.effectiveZoom*boardRect.width/600;
    const entry=actors.get(view.id);
    if(!entry)return;
    const visible=x>-45&&x<boardRect.width+45&&y>-45&&y<boardRect.height+45;
    if(!visible){entry.el.style.display='none';return;}
    entry.el.style.display='block';
    entry.el.style.transform='translate3d('+x.toFixed(2)+'px,'+
      y.toFixed(2)+'px,0) translate(-50%,-50%)';
    entry.el.dataset.phase=view.phase;
    const progress=view.phase==='TELEGRAPH'?
      clamp(view.warningProgress,0,1):view.phase==='ALERT'?1:0;
    entry.ring.style.strokeDashoffset=String(182.212*(1-progress));
    entry.el.style.setProperty('--cc223-pressure',
      String(view.phase==='ALERT'?1:view.phase==='TELEGRAPH'?.72:.20));
  }
  function paint(){
    raf=requestAnimationFrame(paint);
    const api=window.__CC2_02A__;
    if(!api?.snapshot||!layer||!board)return;
    const state=api.snapshot();
    const source=readSource();
    const hiding=state.phase==='ended'||
      document.body.classList.contains('cc219-active')||
      document.body.classList.contains('cc220-lab-active');
    layer.hidden=hiding||!source?.actors?.length;
    if(layer.hidden){
      for(const entry of actors.values())entry.el.style.display='none';
      return;
    }
    const projection=api.rendererStats?.();
    if(!projection||!Number.isFinite(projection.cameraY)||
      !Number.isFinite(projection.effectiveZoom))return;
    const bounds=board.getBoundingClientRect();
    for(const enemy of source.actors){
      if(!enemy.active)continue;
      if(!actors.has(enemy.id))makeActor(enemy.id,enemy.kind);
      positionActor(enemy,projection,bounds.width,bounds);
    }
    for(const [id,entry] of actors){
      if(!source.actors.some(a=>a.id===id&&a.active))
        entry.el.style.display='none';
    }
    lastTick=state.tick;frames++;
    if(performance.now()-nextTextUpdate>160){
      const readout=$('cc223-readout');
      if(readout){
        const names=source.actors.map(a=>a.id.toUpperCase()+': '+
          a.phase).join(' · ');
        readout.textContent='Source-owned enemies · '+names+
          ' · alerts '+source.summary.alerts+
          ' · Pursuer support '+(source.speedMultiplier>1?'ACTIVE':'idle');
      }
      nextTextUpdate=performance.now();
    }
  }
  function installControls(){
    const host=$('cc209-developer-slot');
    if(!host||$('cc223-panel'))return;
    const d=element('details');d.id='cc223-panel';
    const title=element('summary');
    title.textContent='CC2-23 · Secondary enemy experiments';
    d.append(title);
    const expl=element('p');
    expl.textContent='Opt-in Scout / Sentry support enemies. They cannot capture Spark, alter answers or stack an instant-damage effect. Changing mode starts a NEW run.';
    d.append(expl);
    const buttons=element('div','cc223-buttons');
    for(const [id,label] of [
      ['off','Original Pursuer only'],
      ['scout','Scout only'],
      ['sentry','Sentry only'],
      ['both','Scout + Sentry'],
    ]){
      const b=element('button');
      b.type='button';b.textContent=label;b.dataset.cc223Mode=id;
      b.setAttribute('aria-pressed',String(
        (active?configuredMode:'off')===id));
      b.addEventListener('click',()=>{
        const q=new URLSearchParams(location.search);
        if(id==='off'){q.delete('cc223');q.delete('cc223Demo');}
        else{q.set('cc223',id);q.set('cc223Demo','1');}
        location.search=q.toString();
      });
      buttons.append(b);
    }
    d.append(buttons);
    const detail=element('p');
    detail.id='cc223-readout';
    detail.setAttribute('aria-live','polite');
    detail.textContent=active?'Experiment active; start a run to see enemies':
      'No secondary enemies; accepted single-Pursuer gameplay';
    d.append(detail);
    host.append(d);
  }
  function init(){
    board=$('board');
    installControls();
    if(!active)return;
    if(!board){failures.push('BOARD_NOT_READY');return;}
    // A transparent DOM layer contains ONLY two bounded actor boxes.
    // NO full-board canvas is allocated or painted.
    layer=element('div','cc223-secondary-layer');
    layer.id='cc223-secondary-layer';
    layer.setAttribute('aria-hidden','true');
    layer.style.pointerEvents='none';
    board.append(layer);
    const badge=element('span');
    badge.id='cc223-mode-banner';
    badge.textContent='EXPERIMENT · '+configuredMode.toUpperCase();
    badge.setAttribute('aria-label','Experimental secondary enemies active');
    board.append(badge);
    raf=requestAnimationFrame(paint);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
