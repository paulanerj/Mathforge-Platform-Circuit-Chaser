/**
 * CC2-46B — Molasses Guardian: source-reactive viscous surface and smear.
 *
 * IMPORTANT: The game's typed MolassesAbility remains the ONLY owner of
 * slowing the red Pursuer. This file has absolutely NO authority to alter
 * source speed, collision, math, score, bot route or tick. It observes the
 * authoritative field/contact snapshots and paints on the Heritage canvas
 * BEFORE the red Pursuer is drawn, never as a screen-covering green overlay.
 *
 * The named five developer controls are deliberately separated:
 *   1. slow strength: SOURCE PRESET (requires actual restart)
 *   2. smear length: visual-only, live
 *   3. wake persistence: visual-only, live
 *   4. bow-wave size: visual-only, live
 *   5. sticky recovery: visual-only, live
 *
 * All visual recovery tails use SOURCE ticks, not wall time. On Pause,
 * neither the projected field nor the wake advances. A new run, expiration
 * and creature source reset cannot produce phantom molasses contact.
 */
(() => {
  'use strict';
  const flags=new URLSearchParams(location.search);
  const enabled=flags.get('cc246b')==='1';
  if(enabled)document.documentElement.classList.add('cc246b-syrup');
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults=Object.freeze({
    smearLength:68,wakePersistence:65,bowWaveSize:72,recoveryTime:58,
  });
  let settings={...defaults};
  let lastRunId=null,lastTick=-1,lastBot=null,lastWakeAnchor=null,
    head={x:0,y:-1};
  let wake=[];
  let frames=0,contactFrames=0,visibleRipples=0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const rgba=(r,g,b,a)=>'rgba('+r+','+g+','+b+','+clamp(a,0,1)+')';
  function setVisual(key,value){
    if(!enabled)return false;
    if(!Object.hasOwn(defaults,key))throw Error('CC246B_UNKNOWN_CONTROL');
    if(!Number.isInteger(value)||value<0||value>100)
      throw Error('CC246B_VISUAL_RANGE');
    settings={...settings,[key]:value};
    const input=document.querySelector('#cc246b-'+key);
    const output=document.querySelector('#cc246b-'+key+'-value');
    if(input)input.value=String(value);
    if(output)output.textContent=String(value)+'%';
    return true;
  }
  const visual=()=>Object.freeze({...settings,enabled,reducedMotion:reduceMotion});
  const source=()=>window.__CC2_02A__?.creature?.()??null;
  const snapshot=()=>window.__CC2_02A__?.snapshot?.()??null;
  function resetObservation(){
    lastTick=-1;lastBot=null;lastWakeAnchor=null;
    head={x:0,y:-1};wake=[];
  }
  function drawShape(ctx,x,y,rx,ry,colors,alpha){
    ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),
      0,0,Math.PI*2);
    ctx.fillStyle=rgba(colors[0],colors[1],colors[2],alpha);ctx.fill();
  }
  /**
   * Painter runs after platform bodies and before red/blue actors.
   * A translucent, broad, LOW-CONTRAST syrup surface is drawn around the
   * actual source Pursuer; nothing is composited over its red silhouette.
   */
  function paintSurface(ctx,options){
    if(!enabled)return {enabled:false,contact:false,wakeCount:0,
      bowWave:false,sourceMultiplier:1,layer:'off'};
    const {state,creature,bot,project,width,height}=options;
    if(!state||!creature||!bot||typeof project!=='function')
      return {enabled:true,contact:false,wakeCount:wake.length,
        bowWave:false,sourceMultiplier:1,layer:'under-actors'};
    if(lastRunId!==state.runId){
      lastRunId=state.runId;resetObservation();
    }
    const field=creature.activeField;
    const contact=Boolean(field&&creature.contactActive&&
      state.phase!=='ended');
    // Only SOURCE-owned contact proves the Pursuer is stuck.
    const multiplier=contact?creature.fieldMultiplier:1;
    const tick=state.tick;
    if(!Number.isFinite(tick)||tick<0)return null;
    if(tick<lastTick)resetObservation();
    const pos=project(bot.x,bot.y);
    if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))
      return null;
    if(tick!==lastTick){
      if(lastBot){
        const dx=pos.x-lastBot.x,dy=pos.y-lastBot.y;
        const d=Math.hypot(dx,dy);
        // Slow source movement can be <0.3 CSS px PER FRAME at 20% speed.
        // Accumulate against the previous deposited wake mark; do not throw
        // away tiny but real source motion or deposit wake at rest.
        if(contact&&d>.018){
          head={x:dx/d,y:dy/d};
          const traveled=lastWakeAnchor
            ?Math.hypot(pos.x-lastWakeAnchor.x,pos.y-lastWakeAnchor.y)
            :d;
          if(traveled>=.48&&
            (wake.length===0||tick-wake[wake.length-1].tick>=2)){
            wake.push({x:pos.x,y:pos.y,tick,
              dx:head.x,dy:head.y,runId:state.runId});
            lastWakeAnchor={x:pos.x,y:pos.y};
          }
        }
      }
      lastBot={x:pos.x,y:pos.y};
      lastTick=tick;
    }
    // RecoveryTime owns absolute source-tick decay. WakePersistence owns
    // trailing syrup density AND some additional staying power. Both sliders
    // therefore produce observable differences rather than being decoration.
    const life=Math.round(24+settings.recoveryTime*3.2+
      settings.wakePersistence*.8);
    const wakeStrength=settings.wakePersistence/100;
    wake=wake.filter(p=>p.runId===state.runId&&tick-p.tick<=life);
    if(wake.length>72)wake=wake.slice(-72);
    frames++;
    if(contact)contactFrames++;

    // If the source blanket has been cast, paint ONLY a thin horizontal
    // meniscus at its actual physical world boundary. The old full-screen
    // green overlay is gone. Blankets with no contact NEVER fake a wake.
    if(field?.coverage==='BELOW_PLATFORM'){
      const boundary=project(field.x,field.y).y;
      if(boundary>0&&boundary<height){
        const band=ctx.createLinearGradient(0,boundary-4,0,boundary+15);
        band.addColorStop(0,rgba(98,132,88,0));
        band.addColorStop(.28,rgba(126,150,102,.27));
        band.addColorStop(1,rgba(112,154,111,0));
        ctx.save();ctx.fillStyle=band;
        ctx.fillRect(0,boundary-4,width,19);
        ctx.strokeStyle=rgba(92,135,97,.23);
        ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(0,boundary+1);
        ctx.lineTo(width,boundary+1);ctx.stroke();ctx.restore();
      }
    }

    ctx.save();
    // Wakes remain on the surface when the Pursuer exits the syrup but
    // decay by SOURCE ticks. They never affect a physical Pursuer position.
    for(let i=0;i<wake.length&&wakeStrength>0;i++){
      const node=wake[i],age=tick-node.tick;
      const remaining=clamp(1-age/life,0,1);
      if(remaining<=0)continue;
      const spread=(7+settings.smearLength*.30)*remaining*
        (.35+wakeStrength*.65);
      const across={x:-node.dy,y:node.dx};
      ctx.save();
      ctx.translate(node.x,node.y);
      ctx.rotate(Math.atan2(node.dy,node.dx));
      const ink=ctx.createLinearGradient(-spread,0,spread,0);
      ink.addColorStop(0,rgba(120,139,99,0));
      ink.addColorStop(.4,rgba(133,151,107,.10*remaining*wakeStrength));
      ink.addColorStop(1,rgba(95,131,101,.23*remaining*wakeStrength));
      drawShape(ctx,-spread*.45,3,spread,8*remaining+3,
        [105,136,102],.11*remaining*wakeStrength);
      ctx.beginPath();ctx.moveTo(-spread*1.6,-1);
      ctx.quadraticCurveTo(0,-4-remaining*4,spread,0);
      ctx.strokeStyle=rgba(74,121,106,.25*remaining*wakeStrength);
      ctx.lineWidth=1.7;ctx.stroke();
      ctx.restore();
    }
    let paintedBow=false;
    if(contact&&pos.x>=-75&&pos.x<=width+75&&
      pos.y>=-80&&pos.y<=height+80){
      const length=26+settings.smearLength*.49;
      const bow=14+settings.bowWaveSize*.35;
      const front={x:pos.x+head.x*(16+bow*.25),
        y:pos.y+head.y*(16+bow*.25)};
      const perp={x:-head.y,y:head.x};
      // Low, flattened 2D body of syrup beneath the red metal Pursuer.
      // Two layers create 60-inch metaphorical viscosity without 3D fog.
      const pool=ctx.createRadialGradient(pos.x,pos.y+7,1,
        pos.x,pos.y+7,length+25);
      pool.addColorStop(0,rgba(174,161,112,.46));
      pool.addColorStop(.45,rgba(158,145,97,.27));
      pool.addColorStop(1,rgba(137,128,99,0));
      ctx.fillStyle=pool;ctx.beginPath();
      ctx.ellipse(pos.x-head.x*length*.29,
        pos.y-head.y*length*.29+4,
        length+12,19,Math.atan2(head.y,head.x),0,Math.PI*2);
      ctx.fill();
      // Displaced meniscus: pronounced bow wave IN FRONT of the bot.
      // The bow curves backward along both sides like dragging a metal ball
      // through syrup. No overlay ever sits on the bot.
      ctx.beginPath();
      ctx.moveTo(front.x+perp.x*bow*.83,front.y+perp.y*bow*.83+3);
      ctx.quadraticCurveTo(
        front.x+head.x*bow*.65,front.y+head.y*bow*.65+4,
        front.x-perp.x*bow*.83,front.y-perp.y*bow*.83+3);
      ctx.strokeStyle=rgba(99,123,89,.73);
      ctx.lineWidth=3.2;ctx.lineCap='round';ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(front.x+perp.x*bow*.60,front.y+perp.y*bow*.60-2);
      ctx.quadraticCurveTo(
        front.x+head.x*bow*.44,front.y+head.y*bow*.44,
        front.x-perp.x*bow*.60,front.y-perp.y*bow*.60-2);
      ctx.strokeStyle=rgba(232,225,184,.87);
      ctx.lineWidth=1.6;ctx.stroke();
      paintedBow=true;visibleRipples++;
    }
    ctx.restore();
    return {enabled:true,contact,wakeCount:wake.length,
      bowWave:paintedBow,sourceMultiplier:multiplier,
      layer:'under-actors',frames,contactFrames};
  }

  // The helper DOM creature is intentionally interactive and readable.
  // All locomotion is derived from its existing SOURCE hop interpolation;
  // this observer changes only a CSS silhouette and trailing mass.
  let visualLast=null,visualRun=null,locomotion='IDLE';
  function updateSmear(){
    if(!enabled)return;
    const creatureNode=document.querySelector('.cc230-creature');
    const c=source(),s=snapshot();
    if(!creatureNode||!c||!s)return;
    if(visualRun!==s.runId){visualRun=s.runId;visualLast=null;}
    const x=parseFloat(creatureNode.style.left),
      y=parseFloat(creatureNode.style.top);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const moving=c.hop!=null;
    let stretch=1,compress=1,rear=0;
    if(moving){
      const t=clamp((s.tick-c.hop.startTick)/
        (c.hop.endTick-c.hop.startTick),0,1);
      // Front drags ahead, mid-section elongates, then trailing mass catches.
      stretch=1+settings.smearLength/100*
        (t<.52? .74*t/.52 : .74*(1-t)/.48);
      compress=clamp(1-(stretch-1)*.18,.80,1);
      rear=-(4+settings.smearLength*.13)*(1-t);
      locomotion=t<.52?'EXTEND':'CATCHUP';
    } else locomotion=c.gate==='AVAILABLE'?'SETTLE':'IDLE';
    if(visualLast){
      const dx=x-visualLast.x,dy=y-visualLast.y;
      if(Math.hypot(dx,dy)>1.0){
        const angle=Math.atan2(dy,dx)*180/Math.PI;
        creatureNode.style.setProperty('--cc246b-heading',angle.toFixed(1)+'deg');
      }
    }
    creatureNode.dataset.smear=locomotion;
    creatureNode.style.setProperty('--cc246b-elongation',stretch.toFixed(3));
    creatureNode.style.setProperty('--cc246b-compress',compress.toFixed(3));
    creatureNode.style.setProperty('--cc246b-rear',rear.toFixed(2)+'px');
    visualLast={x,y};
  }
  let lastVisualFrame=0;
  function frame(now){
    if(now-lastVisualFrame>33){lastVisualFrame=now;updateSmear();}
    requestAnimationFrame(frame);
  }
  if(enabled)requestAnimationFrame(frame);

  function createControls(){
    if(!enabled)return;
    const panel=document.querySelector('.cc230-studio');
    if(!panel){setTimeout(createControls,100);return;}
    if(panel.querySelector('.cc246b-developer'))return;
    const group=document.createElement('details');
    group.className='cc246b-developer';
    group.open=true;
    group.innerHTML='<summary>CC2-46B · Molasses Surface & Smear Studio</summary>'+
      '<p class="cc246b-note">The source speed setting applies only after restart. All four surface/motion sliders apply immediately, and never change mathematical or Pursuer authority.</p>'+
      '<div class="cc246b-controls"></div>'+
      '<button type="button" class="cc246b-reset">Restore syrup defaults</button>';
    const box=group.querySelector('.cc246b-controls');
    const sourceObject=window.__CC2_30__;
    const sourcePreset=sourceObject?.sourcePreset;
    if(sourcePreset?.fieldMode==='BELOW_PLATFORM'){
      const row=document.createElement('label');
      row.textContent='Slow strength · applies after restart';
      const output=document.createElement('output');
      output.id='cc246b-slow-value';
      const input=document.createElement('input');
      input.id='cc246b-slow';input.type='range';
      input.min='0';input.max='90';input.step='1';
      input.value=String(Math.round((1-sourcePreset.slowMultiplier)*100));
      output.textContent=input.value+'% slowdown';
      input.oninput=()=>{
        const remaining=Number(((100-Number(input.value))/100).toFixed(2));
        const draft=sourceObject.sourcePreset;
        sourceObject.loadSourcePreset({...draft,slowMultiplier:remaining});
        output.textContent=input.value+'% slowdown · restart needed';
      };
      row.append(input,output);
      const restart=document.createElement('button');
      restart.type='button';restart.textContent='Apply slowdown & restart';
      restart.onclick=()=>panel.querySelector('.cc230-apply-gameplay')?.click();
      row.appendChild(restart);box.appendChild(row);
    }
    const labels={
      smearLength:'Snail-like smear length',
      wakePersistence:'Wake depth and persistence',
      bowWaveSize:'Syrup bow-wave size',
      recoveryTime:'Sticky material recovery time',
    };
    for(const key of Object.keys(defaults)){
      const row=document.createElement('label');
      row.textContent=labels[key];
      const value=document.createElement('output');
      value.id='cc246b-'+key+'-value';
      const input=document.createElement('input');input.type='range';
      input.id='cc246b-'+key;input.min='0';input.max='100';
      input.step='1';input.value=String(settings[key]);
      value.textContent=settings[key]+'%';
      input.oninput=()=>setVisual(key,Number(input.value));
      row.append(input,value);box.appendChild(row);
    }
    group.querySelector('.cc246b-reset').onclick=()=>{
      for(const key of Object.keys(defaults))setVisual(key,defaults[key]);
      if(sourcePreset?.fieldMode==='BELOW_PLATFORM'){
        const input=document.getElementById('cc246b-slow');
        const output=document.getElementById('cc246b-slow-value');
        if(input){input.value='80';}
        if(output){output.textContent='80% slowdown · restart needed';}
        sourceObject.loadSourcePreset({
          ...sourceObject.sourcePreset,slowMultiplier:.20});
      }
    };
    panel.insertBefore(group,panel.querySelector('.cc230-authority'));
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(createControls,0),
      {once:true});
  }else setTimeout(createControls,0);

  window.__CC2_46B__=Object.freeze({
    enabled,settings:visual,setVisual,paintSurface,
    get diagnostics(){return {wakeCount:wake.length,frames,contactFrames,
      visibleRipples,locomotion,sourceMultiplier:source()?.fieldMultiplier??1,
      contact:source()?.contactActive??false};},
  });
})();
