/**
 * CC2-23 — Read-only enemy rendering and honest owner test controls.
 *
 * Game logic lives in the source-owned SecondaryEnemyDirector, not here.
 * All positions are projected from its source snapshots. No collision logic,
 * world ticks, mathematics, change to adaptive audio, or DOM events on board.
 */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const configuredMode=params.get('cc223')||'off';
  const active=['scout','sentry','both'].includes(configuredMode);
  let board,canvas,ctx,raf=0,lastTick=-1,events=0,failures=[];
  let width=0,height=0,scale=1;
  const pick=(id)=>document.getElementById(id);
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const report=()=>({
    schema:'cc2-23-presentation/v1',
    mode:active?configuredMode:'off',
    active,frames:events,lastTick,
    drawn:canvas?getComputedStyle(canvas).display!=='none':false,
    errors:failures.slice(),
    source:window.__CC2_02A__?.secondary?.()??null,
    digest:window.__CC2_02A__?.sessionReport?.()?.stateDigest??null,
  });
  window.__CC2_23__=Object.freeze({report});
  function local(p,renderer){
    const x=width*.5+(p.x-300)*renderer.horizontalCameraScale*width/600;
    const y=(p.y-renderer.cameraY)*renderer.effectiveZoom*width/600;
    return{x,y};
  }
  function shape(a,p,t){
    const radius=clamp(a.radius*width/600,10,19);
    const scout=a.kind==='SCOUT';
    const fill=scout?'#e8a04c':'#956da7';
    const edge=scout?'#fbdba1':'#e7c9ff';
    const strength=a.phase==='ALERT'?1:a.phase==='TELEGRAPH'?.75:.25;
    ctx.save();ctx.translate(p.x,p.y);
    ctx.shadowColor=fill;ctx.shadowBlur=6+8*strength;
    ctx.globalAlpha=a.phase==='COOLDOWN'?.67:1;
    if(a.phase==='TELEGRAPH'||a.phase==='ALERT'){
      ctx.beginPath();
      ctx.arc(0,0,radius*(1.85+.08*Math.sin(t*.009)),0,Math.PI*2);
      ctx.strokeStyle=scout?'rgba(203,121,46,.65)':'rgba(123,75,163,.65)';
      ctx.lineWidth=a.phase==='ALERT'?2:1.5;
      ctx.stroke();
      if(a.phase==='TELEGRAPH'){
        // Telegraph completion progress, no ability until full warning.
        ctx.beginPath();ctx.arc(0,0,radius*1.86,-Math.PI/2,
          -Math.PI/2+Math.PI*2*a.warningProgress);
        ctx.strokeStyle=edge;ctx.lineWidth=3;ctx.stroke();
      }
    }
    // A restrained thick geometric shell; no free-floating circular sticker.
    ctx.beginPath();
    const sides=scout?3:4;
    for(let i=0;i<sides;i++){
      const angle=-Math.PI/2+(i+.0)*Math.PI*2/sides+
        (scout?.06*Math.sin(t*.004):Math.PI/4);
      const xx=Math.cos(angle)*radius,yy=Math.sin(angle)*radius;
      if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.closePath();
    const grad=ctx.createRadialGradient(-radius*.3,-radius*.3,1,0,0,radius*1.5);
    grad.addColorStop(0,edge);
    grad.addColorStop(.4,fill);
    grad.addColorStop(1,scout?'#794523':'#523263');
    ctx.fillStyle=grad;ctx.fill();
    ctx.lineWidth=1.8;ctx.strokeStyle=edge;ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle=scout?'#57331e':'#37213a';
    ctx.beginPath();ctx.arc(0,0,radius*.28,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff0df';
    ctx.beginPath();ctx.arc(-radius*.12,-radius*.18,radius*.12,0,Math.PI*2);ctx.fill();
    // Tiny legible label, below organism, no mathematical number or answer.
    ctx.fillStyle=scout?'#7b4922':'#6a4079';
    ctx.font='800 9px system-ui';
    ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(scout?'SCOUT':'SENTRY',0,radius+5);
    ctx.restore();
  }
  function paint(){
    raf=requestAnimationFrame(paint);
    const api=window.__CC2_02A__;
    if(!api?.secondary||!api?.snapshot||!board||!canvas)return;
    const source=api.secondary();
    const game=api.snapshot();
    const hidden=game?.phase==='ended'||
      document.body.classList.contains('cc219-active')||
      document.body.classList.contains('cc220-lab-active');
    const rect=board.getBoundingClientRect(),w=Math.max(1,rect.width),
      h=Math.max(1,rect.height);
    scale=Math.min(1.5,devicePixelRatio||1);
    const sw=Math.round(w*scale),sh=Math.round(h*scale);
    if(canvas.width!==sw||canvas.height!==sh){
      canvas.width=sw;canvas.height=sh;
    }
    width=w;height=h;
    ctx.setTransform(scale,0,0,scale,0,0);
    ctx.clearRect(0,0,w,h);
    if(!source||!source.actors?.length||hidden)return;
    const r=api.rendererStats();
    if(!r||!Number.isFinite(r.cameraY)||!Number.isFinite(r.effectiveZoom))
      return;
    const t=performance.now();
    for(const a of source.actors){
      if(!a.active)continue;
      const p=local(a,r);
      if(p.x< -40||p.x>w+40||p.y< -40||p.y>h+40)continue;
      shape(a,p,t);
    }
    lastTick=game.tick;events++;
    const readout=pick('cc223-readout');
    if(readout){
      const actors=source.actors.map(a=>a.id.toUpperCase()+': '+
        a.phase).join(' · ');
      readout.textContent='Actual secondary entities · '+actors+
        ' · alerts '+source.summary.alerts+
        ' · Pursuer support '+(source.speedMultiplier>1?'ACTIVE':'idle');
    }
  }
  function init(){
    board=pick('board');
    const host=pick('cc209-developer-slot');
    if(host&&!pick('cc223-panel')){
      const d=document.createElement('details');
      d.id='cc223-panel';
      const title=document.createElement('summary');
      title.textContent='CC2-23 · Secondary enemy experiments';
      d.append(title);
      const expl=document.createElement('p');
      expl.textContent='Opt-in Scout / Sentry support enemies. No secondary capture, correct-answer changes or stacked instant damage. Changes start a NEW run.';
      d.append(expl);
      const buttons=document.createElement('div');buttons.className='cc223-buttons';
      for(const [id,label] of [
        ['off','Original Pursuer only'],
        ['scout','Scout only'],
        ['sentry','Sentry only'],
        ['both','Scout + Sentry'],
      ]){
        const b=document.createElement('button');
        b.type='button';b.textContent=label;
        b.dataset.cc223Mode=id;
        b.setAttribute('aria-pressed',String(
          (active?configuredMode:'off')===id));
        b.onclick=()=>{
          const q=new URLSearchParams(location.search);
          if(id==='off'){q.delete('cc223');q.delete('cc223Demo');}
          else{q.set('cc223',id);q.set('cc223Demo','1');}
          location.search=q.toString();
        };
        buttons.appendChild(b);
      }
      d.appendChild(buttons);
      const detail=document.createElement('p');
      detail.id='cc223-readout';
      detail.setAttribute('aria-live','polite');
      detail.textContent=active?'Experiment active; start a run to see enemies':
        'No secondary enemies; accepted single-Pursuer gameplay';
      d.append(detail);
      host.append(d);
    }
    if(!active)return;
    if(!board){failures.push('BOARD_NOT_READY');return;}
    canvas=document.createElement('canvas');
    canvas.id='cc223-secondary-canvas';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.pointerEvents='none';
    board.appendChild(canvas);
    ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx){failures.push('CANVAS_CONTEXT');return;}
    const banner=document.createElement('span');
    banner.id='cc223-mode-banner';
    banner.textContent='EXPERIMENT · '+configuredMode.toUpperCase();
    banner.setAttribute('aria-label','Experimental secondary enemies active');
    board.appendChild(banner);
    raf=requestAnimationFrame(paint);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
