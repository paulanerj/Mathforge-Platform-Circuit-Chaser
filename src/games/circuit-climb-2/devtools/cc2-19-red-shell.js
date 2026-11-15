/**
 * CC2-19 — Red Shell Assimilation.
 *
 * Only observes existing Circuit Climb 2.0 state and paints into #board.
 * NEVER owns capture, game ticks, bot steering, math, score, achievements,
 * input, curriculum, or adaptive music.
 *
 * The same DOM Spark proxy is kept visible from collision through swallowing,
 * then reparented INSIDE the single, clipped, circular red shell. No replacement
 * eye or extra exterior blue sphere is created during the transformation.
 *
 * Source: approved 800ce478 CC2-18A observer, with unchanged terminal-receipt,
 * epoch, demo, replay, summary handoff and source-digest semantics.
 */
(() => {
  'use strict';
  const API = 'cc2-red-shell-vfx/v1';
  const $ = id => document.getElementById(id);
  const game = () => window.__CC2_02A__;
  const query = new URLSearchParams(location.search);
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const lerp = (a,b,t) => a + (b-a)*t;
  const smooth = t => { t=clamp(t,0,1); return t*t*(3-2*t); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clone = o => JSON.parse(JSON.stringify(o));
  const defaults = {
    schema:API,
    metadata:{name:'Red Shell / Blue Eye',workstream:'CC2-19',
      scope:'presentation-only',reference:'APPROVED_REFERENCE_red_shell_blue_core.png'},
    enabled:true,
    pursuitVisuals:{normalBodyToSparkDiameterRatio:1.25,
      lockedOnProximityMultiplier:3.5,criticalProximityMultiplier:1.8,
      thresholdHysteresisRatio:.15,proximitySmoothingMs:130,
      normalGlow:.35,lockedGlow:.66,criticalGlow:.9,
      normalParticleRatePerSecond:6,criticalParticleRatePerSecond:20},
    geometry:{outerShape:'circular',maxFinalAspectRatio:1.06,
      continuousEnclosingShell:true,innerEyeCenterOffsetMaxRadiusRatio:.06,
      innerEyeDiameterToOuterDiameter:.38,maxCaptureShellScale:1.1,
      blueCoreMustBeClippedWithinOuterShell:true,externalSecondSparkInFinal:false},
    timelineMs:{contactEnd:160,apertureEnd:420,swallowEnd:900,
      internalPopEnd:1220,reformEnd:1850,livingHoldEnd:2550,
      reducedMotionTotal:420},
    look:{shellInner:'#6F183B',shellMid:'#B92B62',
      shellRim:'#F34B95',hotFilament:'#FF95D5',
      innerEyeDark:'#143FA7',innerEyeCore:'#31C4FF',
      eyeHighlight:'#D6FAFF',outerGlowOpacity:.42,
      particleAccent:'#FF7CAA'},
    idleMotion:{breathingScaleAmplitude:.012,breathingPeriodMs:1400,
      eyeDriftMaxOuterRadiusRatio:.018,endHoldParticleRatePerSecond:2,
      orbitalSpeedEndMultiplier:.12},
    performance:{mobileParticleCap:36,desktopParticleCap:60,
      preferTransforms:true,reducedMotion:'final-pose-hold'},
    audio:{enabled:true,followUserMute:true,lockTensionGain:.12,
      contactTickGain:.18,ingestionWhooshGain:.22,
      internalBlueChimeGain:.18,settledCoreGain:.16},
    dev:{previewControl:true,replayControl:true,presetImportExport:true,
      resetToDefaults:true,seed:1919001}
  };
  let preset=clone(defaults), presetVersion=0;
  let stage,shell,spark,plasma,particles,shield,controls,skip,again,
    summaryReplay,devText,status,importArea;
  let initialized=false,epoch=0,animationId=0,origin=null,
    capture=null,seenTerminal=false,realCaptureShown=false,
    previewActive=false,previewRequested=query.get('eclipseDemo')==='1',
    demoStarted=false,phase='idle',proximity='NORMAL',filteredGap=null,
    priorTime=0,startedAt=0,elapsedMs=0,finalGeometry=null,
    baselineDigest=null,firstCaptureTick=null,firstCaptureRun=null,
    captureEpoch=0,sourceEpoch=0,priorPhase=null,priorTick=0,
    focusBefore=null,eyeNested=false,firstTerminalPaint=false,
    playerAudioUnlocked=false,audioContext=null,qaFrozenMs=null;
  const history=[],errors=[],warnings=[];
  let particleSeed=1919001,particleGeometry=[];
  const remember=(type,detail={})=>{
    history.push({type,time:Math.round(performance.now()),...detail});
    if(history.length>200)history.shift();
  };
  const issue=(where,e)=>{
    errors.push({where,message:String(e?.message||e)});
    if(errors.length>30)errors.shift();
  };
  function currentDigest(){
    try{return game()?.sessionReport?.()?.stateDigest??null;}
    catch{return null;}
  }
  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==API)
      throw Error('CC219_PRESET_SCHEMA_REQUIRED');
    const expected=Object.keys(defaults).sort();
    if(JSON.stringify(Object.keys(raw).sort())!==JSON.stringify(expected))
      throw Error('CC219_UNKNOWN_TOP_LEVEL_FIELDS');
    for(const section of expected.filter(k=>typeof defaults[k]==='object')){
      const fields=Object.keys(defaults[section]).sort();
      if(!raw[section]||typeof raw[section]!=='object'||
        JSON.stringify(Object.keys(raw[section]).sort())!==JSON.stringify(fields))
        throw Error('CC219_PRESET_SECTION_FIELDS_INVALID_'+section);
      for(const k of fields){
        const base=defaults[section][k],value=raw[section][k];
        if(typeof base!==typeof value||(typeof value==='number'&&!Number.isFinite(value)))
          throw Error('CC219_PRESET_TYPE_INVALID_'+section+'.'+k);
      }
    }
    if(raw.geometry.outerShape!=='circular'||
      raw.geometry.continuousEnclosingShell!==true||
      raw.geometry.blueCoreMustBeClippedWithinOuterShell!==true||
      raw.geometry.externalSecondSparkInFinal!==false||
      raw.geometry.maxFinalAspectRatio>1.06||
      raw.geometry.innerEyeCenterOffsetMaxRadiusRatio>.06||
      raw.geometry.innerEyeDiameterToOuterDiameter<.35||
      raw.geometry.innerEyeDiameterToOuterDiameter>.42||
      raw.geometry.maxCaptureShellScale>1.1||
      raw.geometry.maxCaptureShellScale<1)
      throw Error('CC219_NONNEGOTIABLE_GEOMETRY');
    const times=raw.timelineMs;
    const ordered=['contactEnd','apertureEnd','swallowEnd','internalPopEnd','reformEnd','livingHoldEnd'];
    let prev=0;
    for(const key of ordered){
      if(times[key]<=prev||times[key]>8000)throw Error('CC219_INVALID_TIMELINE_'+key);
      prev=times[key];
    }
    if(times.reducedMotionTotal<1||times.reducedMotionTotal>450)
      throw Error('CC219_REDUCED_MOTION_BUDGET');
    const pv=raw.pursuitVisuals;
    if(pv.normalBodyToSparkDiameterRatio<1.1||pv.normalBodyToSparkDiameterRatio>1.4||
      pv.criticalProximityMultiplier<=1||pv.lockedOnProximityMultiplier<=pv.criticalProximityMultiplier||
      pv.proximitySmoothingMs<20||pv.proximitySmoothingMs>1000||
      pv.thresholdHysteresisRatio<0||pv.thresholdHysteresisRatio>.3)
      throw Error('CC219_PROXIMITY_LIMITS');
    for(const [k,v] of Object.entries(raw.audio)){
      if(typeof v==='number'&&(v<0||v>1))throw Error('CC219_AUDIO_RANGE_'+k);
    }
    if(raw.performance.mobileParticleCap<0||raw.performance.mobileParticleCap>36||
      raw.performance.desktopParticleCap<0||raw.performance.desktopParticleCap>60||
      raw.dev.seed<1||raw.dev.seed>2147483647)
      throw Error('CC219_PERFORMANCE_OR_SEED');
    return clone(raw);
  }
  function hashPreset(){
    const data=JSON.stringify(preset);
    let h=2166136261;
    for(let i=0;i<data.length;i++)h=Math.imul(h^data.charCodeAt(i),16777619);
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function seeded(){
    particleSeed^=particleSeed<<13;
    particleSeed^=particleSeed>>>17;
    particleSeed^=particleSeed<<5;
    return (particleSeed>>>0)/4294967296;
  }
  function setPreset(value){
    preset=validate(value);presetVersion++;
    stage?.style.setProperty('--cc219-inner',preset.look.shellInner);
    stage?.style.setProperty('--cc219-mid',preset.look.shellMid);
    stage?.style.setProperty('--cc219-rim',preset.look.shellRim);
    stage?.style.setProperty('--cc219-hot',preset.look.hotFilament);
    stage?.style.setProperty('--cc219-blue-dark',preset.look.innerEyeDark);
    stage?.style.setProperty('--cc219-blue',preset.look.innerEyeCore);
    stage?.style.setProperty('--cc219-blue-white',preset.look.eyeHighlight);
    stage?.style.setProperty('--cc219-glow',String(preset.look.outerGlowOpacity));
    particleSeed=preset.dev.seed|0;
    particleGeometry=Array.from({length:60},()=>({
      angle:seeded()*Math.PI*2,
      reach:1+seeded()*.48,
      speed:.55+seeded()*1.2,
      phase:seeded()*Math.PI*2,
      size:.6+seeded()*1.5
    }));
    remember('PRESET_APPLIED',{hash:hashPreset(),version:presetVersion});
    if(devText)devText.textContent='Ready · '+hashPreset();
    if(importArea)importArea.value=JSON.stringify(preset,null,2);
  }
  const uiText=(msg)=>{
    if(devText)devText.textContent=msg;
    if(status)status.textContent=msg;
  };
  function saveJSON(name,value){
    const url=URL.createObjectURL(new Blob(
      [JSON.stringify(value,null,2)],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function build(){
    if(initialized)return;
    initialized=true;
    const board=$('board');
    if(!board)throw Error('CC219_GAME_BOARD_MISSING');
    stage=document.createElement('div');
    stage.id='cc219-stage';
    stage.className='cc219-stage';
    stage.setAttribute('aria-hidden','true');
    stage.innerHTML=
      '<div id="cc219-ambient" class="cc219-ambient"></div>'+
      '<div id="cc219-plasma" class="cc219-plasma"></div>'+
      '<div id="cc219-shell" class="cc219-shell" data-geometry="single-circle">'+
      ' <div class="cc219-sphere-material"></div>'+
      ' <div class="cc219-filament cc219-filament-a"></div>'+
      ' <div class="cc219-filament cc219-filament-b"></div>'+
      ' <div class="cc219-rib cc219-rib-a"></div>'+
      ' <div class="cc219-rib cc219-rib-b"></div>'+
      ' <div class="cc219-rib cc219-rib-c"></div>'+
      ' <div class="cc219-anterior"></div>'+
      '</div>'+
      '<div id="cc219-spark" class="cc219-spark" data-identity="player-spark">'+
      ' <span class="cc219-iris"></span><span class="cc219-pupil"></span>'+
      ' <span class="cc219-glint"></span>'+
      '</div>'+
      '<div id="cc219-particles" class="cc219-particles"></div>';
    board.appendChild(stage);
    shell=$('cc219-shell');spark=$('cc219-spark');
    plasma=$('cc219-plasma');particles=$('cc219-particles');
    shield=document.createElement('div');shield.id='cc219-shield';
    shield.hidden=true;shield.setAttribute('aria-hidden','true');
    document.body.appendChild(shield);
    controls=document.createElement('div');controls.id='cc219-controls';
    controls.hidden=true;
    controls.innerHTML='<span id="cc219-status">Spark is being contained</span>'+
      '<button type="button" id="cc219-skip">Skip animation</button>'+
      '<button type="button" id="cc219-again" hidden>Watch again</button>';
    document.body.appendChild(controls);
    status=$('cc219-status');skip=$('cc219-skip');again=$('cc219-again');
    skip.addEventListener('click',()=>finish('skip'));
    again.addEventListener('click',()=>{if(previewActive)open(true);else if(capture)open(false);});
    const summaryPanelElement=$('summaryPanel');
    const header=summaryPanelElement?.querySelector('.summary-header');
    if(header){
      summaryReplay=document.createElement('button');
      summaryReplay.type='button';summaryReplay.id='cc219-summary-replay';
      summaryReplay.textContent='Replay capture';summaryReplay.hidden=true;
      header.insertBefore(summaryReplay,$('summaryClose'));
      summaryReplay.addEventListener('click',()=>{
        if(capture&&game()?.snapshot?.()?.endReason==='CAPTURED')open(false);
      });
    }
    if(summaryPanelElement)new MutationObserver(()=>{
      if(!summaryPanelElement.hidden)observe();
    }).observe(summaryPanelElement,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&controls&&!controls.hidden){
        e.preventDefault();e.stopImmediatePropagation();finish('escape');
      }
    },true);
    const dev=$('cc209-developer-slot')||$('cc209-settings');
    if(dev){
      const d=document.createElement('details');d.id='cc219-lab';
      const title=document.createElement('summary');
      title.textContent='CC2-19 · Red Shell designer / diagnostics';
      d.appendChild(title);
      const p=document.createElement('p');
      p.textContent='All settings are presentation-only. A real capture still requires an authoritative CAPTURED receipt.';
      d.appendChild(p);
      const bar=document.createElement('div');bar.className='cc219-lab-actions';
      const actions=[
        ['Preview capture',()=>{if(game()?.snapshot?.()?.tick>0&&game()?.snapshot?.()?.phase!=='ended'){uiText('Preview before beginning a run or replay an actual capture');return;}
          $('cc209-settings')?.querySelector('[data-close="cc209-settings"]')?.click();preview();}],
        ['Replay',()=>capture?open(false):preview()],
        ['Export preset',()=>saveJSON('cc2-19-red-shell-preset.json',preset)],
        ['Import preset',()=>{try{setPreset(JSON.parse(importArea.value));uiText('Imported · '+hashPreset());}
          catch(e){uiText(String(e.message||e));}}],
        ['Reset defaults',()=>{setPreset(defaults);uiText('Reset · '+hashPreset());}],
        ['Download VFX report',()=>saveJSON('cc2-19-visual-diagnostics.json',report)]
      ];
      for(const [label,fn]of actions){
        const b=document.createElement('button');b.type='button';b.textContent=label;
        b.addEventListener('click',fn);bar.appendChild(b);
      }
      d.appendChild(bar);
      const fields=document.createElement('div');fields.className='cc219-fields';
      const parameters=[
        ['timelineMs','contactEnd',100,300,10],
        ['timelineMs','apertureEnd',300,700,10],
        ['timelineMs','swallowEnd',700,1400,10],
        ['timelineMs','internalPopEnd',1100,1800,10],
        ['timelineMs','reformEnd',1600,2400,10],
        ['timelineMs','livingHoldEnd',2200,4000,10],
        ['geometry','innerEyeDiameterToOuterDiameter',.35,.42,.005],
        ['pursuitVisuals','normalGlow',0,1,.05],
        ['pursuitVisuals','criticalGlow',0,1,.05],
        ['look','shellMid',0,0,0],['look','shellRim',0,0,0],
        ['look','innerEyeCore',0,0,0],
        ['audio','contactTickGain',0,1,.05],
        ['audio','ingestionWhooshGain',0,1,.05],
        ['audio','internalBlueChimeGain',0,1,.05],
        ['audio','settledCoreGain',0,1,.05]
      ];
      for(const [section,key,min,max,step]of parameters){
        const label=document.createElement('label');
        label.textContent=section+'.'+key;
        const input=document.createElement('input');
        input.type=typeof defaults[section][key]==='string'?'color':'range';
        input.min=String(min);input.max=String(max);input.step=String(step);
        input.value=String(preset[section][key]);
        input.addEventListener('change',()=>{
          const candidate=clone(preset);
          candidate[section][key]=input.type==='color'?input.value:Number(input.value);
          try{setPreset(candidate);uiText('Applied '+section+'.'+key);}
          catch(e){input.value=String(preset[section][key]);uiText(String(e.message||e));}
        });
        label.appendChild(input);
        fields.appendChild(label);
      }
      d.appendChild(fields);
      const txt=document.createElement('textarea');txt.id='cc219-preset-json';
      txt.rows=6;txt.setAttribute('aria-label','Red Shell preset JSON');
      d.appendChild(txt);importArea=txt;
      const small=document.createElement('p');small.id='cc219-lab-status';
      d.appendChild(small);devText=small;
      dev.appendChild(d);
    }
    window.__CC2_19__=Object.freeze({
      summary:()=>summary(),
      report:()=>report(),
      preview, replay:()=>capture?open(false):preview(),
      dismiss:()=>finish('api'),preset:()=>clone(preset),
      presetHash:()=>hashPreset(),
      loadPreset:value=>setPreset(value),
      resetPreset:()=>setPreset(defaults),
      geometry:()=>geometry(),
      // Step is a VISUAL clock only, never an engine tick or capture override.
      visualSeekForQA:ms=>{
        if(controls.hidden)throw Error('CC219_NO_ACTIVE_PRESENTATION');
        qaFrozenMs=clamp(ms,0,preset.timelineMs.livingHoldEnd-1);
        paintCapture(qaFrozenMs,performance.now());
        return summary();
      }
    });
    // Retain the established CC2-18 observer contract for diagnostics.
    window.__CC2_18__=Object.freeze({
      summary:()=>({schema:'cc2-18a-circuit-eclipse/v1',
        visible:!controls.hidden,phase,realCaptureSeen:realCaptureShown,
        isDemo:previewActive,captureEvidence:capture?
          {eventId:capture.eventId,endReason:'CAPTURED',
          solvedRows:capture.rows,tick:capture.tick}:null,
        reducedMotion:reduced}),
      report:()=>report(),preview,replay:()=>capture?open(false):preview(),
      dismiss:()=>finish('api')
    });
    setPreset(defaults);
    document.addEventListener('pointerdown',()=>{playerAudioUnlocked=true;},{capture:true});
    document.addEventListener('keydown',()=>{playerAudioUnlocked=true;},{capture:true});
    remember('BOOT',{reduced});
  }
  function audioPermitted(){
    if(!preset.audio.enabled||!playerAudioUnlocked)return false;
    if(!preset.audio.followUserMute)return true;
    const heritage=$('cc209b-audio-toggle');
    if(heritage&&heritage.getAttribute('aria-pressed')==='false')return false;
    const base=$('soundToggle');
    if(!heritage&&base&&base.getAttribute('aria-pressed')==='false')return false;
    return true;
  }
  function sound(kind){
    if(!audioPermitted())return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      audioContext??=new Audio();
      if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
      const map={
        contact:[510,270,.085,'triangle','contactTickGain'],
        swallow:[265,95,.43,'sine','ingestionWhooshGain'],
        pop:[830,125,.19,'sine','internalBlueChimeGain'],
        settle:[154,118,.24,'sine','settledCoreGain']
      };
      const x=map[kind];if(!x)return;
      const a=audioContext,g=a.createGain(),o=a.createOscillator();
      const begin=a.currentTime+.008;
      o.type=x[3];o.frequency.setValueAtTime(x[0],begin);
      o.frequency.exponentialRampToValueAtTime(x[1],begin+x[2]);
      const volume=.043*preset.audio[x[4]];
      g.gain.setValueAtTime(.0001,begin);
      g.gain.exponentialRampToValueAtTime(Math.max(.00012,volume),begin+.017);
      g.gain.exponentialRampToValueAtTime(.0001,begin+x[2]);
      o.connect(g);g.connect(a.destination);
      o.start(begin);o.stop(begin+x[2]+.03);
      remember('LOCAL_SOUND',{kind});
    }catch(e){issue('local-audio',e);}
  }
  function worldPoint(x,y){
    const r=game()?.rendererStats?.(),board=$('board');
    if(!r||!board)return null;
    const w=board.clientWidth;
    return {x:w/2+(x-300)*r.horizontalCameraScale*w/600,
      y:(y-r.cameraY)*r.effectiveZoom*w/600};
  }
  function sourceCoordinates(){
    const a=game(),s=a?.snapshot?.(),b=a?.pursuer?.();
    if(!s||!b||!b.body)return null;
    const visual=a.rendererStats?.();
    const sparkWorld=visual?.visualSparkPosition||s.spark;
    const botWorld=visual?.visualBotPosition||b.body;
    return {spark:worldPoint(sparkWorld.x,sparkWorld.y),
      bot:worldPoint(botWorld.x,botWorld.y),source:s,botState:b};
  }
  function position(node,x,y){
    node.style.transform='translate3d('+x.toFixed(3)+'px,'+y.toFixed(3)+
      'px,0) translate(-50%,-50%)';
  }
  function shellDiameter(){
    return ($('board')?.clientWidth||390)<500?55:65;
  }
  function applyProximity(pixelDistance,now){
    const gapRadius=shellDiameter()/2;
    const dt=priorTime?clamp(now-priorTime,0,50):16;
    filteredGap=filteredGap===null?pixelDistance:
      lerp(filteredGap,pixelDistance,1-Math.exp(-dt/preset.pursuitVisuals.proximitySmoothingMs));
    const high=preset.pursuitVisuals.lockedOnProximityMultiplier*gapRadius;
    const low=preset.pursuitVisuals.criticalProximityMultiplier*gapRadius;
    const h=preset.pursuitVisuals.thresholdHysteresisRatio;
    if(proximity==='NORMAL'&&filteredGap<high*(1-h))proximity='LOCKED_ON';
    else if(proximity==='LOCKED_ON'&&filteredGap<low*(1-h))proximity='CRITICAL_NEAR';
    else if(proximity==='CRITICAL_NEAR'&&filteredGap>low*(1+h))proximity='LOCKED_ON';
    else if(proximity==='LOCKED_ON'&&filteredGap>high*(1+h))proximity='NORMAL';
    stage.dataset.proximity=proximity;
  }
  function drawLive(now){
    if(!preset.enabled||!controls.hidden||!shell||!stage)return;
    const state=game()?.snapshot?.();
    if(!state||state.phase==='ended'||!window.__cc2ChaseStarted){
      stage.dataset.active='false';
      return;
    }
    const c=sourceCoordinates();
    if(!c?.bot||!c?.spark)return;
    stage.dataset.active='true';
    const d=shellDiameter();
    stage.style.setProperty('--cc219-diameter',d+'px');
    shell.style.width=d+'px';shell.style.height=d+'px';
    position(shell,c.bot.x,c.bot.y);
    const distance=Math.hypot(c.spark.x-c.bot.x,c.spark.y-c.bot.y);
    applyProximity(distance,now);
    stage.style.setProperty('--cc219-pressure',
      String(proximity==='NORMAL'?preset.pursuitVisuals.normalGlow:
        proximity==='LOCKED_ON'?preset.pursuitVisuals.lockedGlow:
          preset.pursuitVisuals.criticalGlow));
    if(spark.parentNode===shell){
      stage.appendChild(spark);eyeNested=false;
    }
    spark.hidden=true;
    paintParticles(now,c.bot.x,c.bot.y,d,false);
  }
  function paintParticles(now,x,y,diam,ingesting){
    const cap=($('board')?.clientWidth||390)<500?
      preset.performance.mobileParticleCap:preset.performance.desktopParticleCap;
    const count=clamp(ingesting?18:
      proximity==='NORMAL'?4:proximity==='LOCKED_ON'?9:15,0,cap);
    const t=now/1000;
    while(particles.children.length<count){
      const item=document.createElement('span');
      item.className='cc219-mote';particles.appendChild(item);
    }
    while(particles.children.length>count)particles.lastChild.remove();
    for(let i=0;i<count;i++){
      const part=particleGeometry[i];
      const orbit=t*part.speed*(ingesting?1.2:proximity==='CRITICAL_NEAR'?.9:.38);
      const angle=part.angle+orbit+part.phase*.18;
      const reach=diam*(.45+part.reach*.17);
      const mote=particles.children[i];
      mote.style.transform='translate3d('+
        (x+Math.cos(angle)*reach).toFixed(2)+'px,'+
        (y+Math.sin(angle)*reach).toFixed(2)+'px,0)';
      mote.style.width=mote.style.height=(1+part.size)+'px';
      mote.style.opacity=String(ingesting?1:proximity==='NORMAL'?.28:.64);
    }
  }
  function receipt(){
    const a=game(),s=a?.snapshot?.(),r=a?.summary?.();
    const ev=a?.events?.()||[];
    if(!s||s.phase!=='ended'||s.endReason!=='CAPTURED'||
      !r?.ended||r.endReason!=='CAPTURED')return null;
    const event=ev.filter(e=>e.type==='RUN_ENDED'&&
      e.detail?.reason==='CAPTURED'&&e.runId===s.runId).at(-1);
    if(!event)return null;
    const b=a.pursuer?.();
    return {eventId:event.id,runId:s.runId,tick:s.tick,rows:r.rowsSolved,
      score:r.score,cells:r.powerCells,
      spark:{x:s.spark.x,y:s.spark.y},
      bot:b?.body?{x:b.body.x,y:b.body.y}:null,
      digest:currentDigest()};
  }
  function capturePoint(){
    if(previewActive||!capture){
      const board=$('board');
      const w=board.clientWidth,h=board.clientHeight;
      return {bot:{x:w*.57,y:h*.50},spark:{x:w*.35,y:h*.50}};
    }
    const bot=capture.bot,sparkPoint=capture.spark;
    const a=bot?worldPoint(bot.x,bot.y):null;
    const b=worldPoint(sparkPoint.x,sparkPoint.y);
    return {bot:a||{x:stage.clientWidth/2,y:stage.clientHeight/2},
      spark:b||{x:stage.clientWidth*.32,y:stage.clientHeight/2}};
  }
  function relocateEye(){
    if(spark.parentNode===shell)return;
    shell.appendChild(spark);
    eyeNested=true;
    spark.style.left='50%';spark.style.top='50%';
    spark.style.transform='translate(-50%,-50%)';
    remember('SPARK_SAME_NODE_REPARENTED_INTO_SHELL');
  }
  function releaseEye(){
    if(spark.parentNode!==stage)stage.appendChild(spark);
    eyeNested=false;
    spark.style.left='0';spark.style.top='0';
  }
  function setPhase(next){
    if(phase===next)return;
    const old=phase;phase=next;
    stage.dataset.phase=phase;
    controls.dataset.phase=phase;
    status.textContent={
      contact:'Contact',aperture:'Red field opening',
      swallow:'Spark entering the Pursuer',pop:'Energy contained',
      reform:'Red shell reforming',hold:'One creature · blue eye enclosed'
    }[next]||'Capture sequence';
    remember('PHASE',{phase,old,elapsedMs});
    if(next==='contact')sound('contact');
    if(next==='swallow')sound('swallow');
    if(next==='pop')sound('pop');
    if(next==='reform')sound('settle');
  }
  function geometry(){
    if(!shell||!spark)return null;
    const a=shell.getBoundingClientRect(),b=spark.getBoundingClientRect();
    const cx=a.x+a.width/2,cy=a.y+a.height/2;
    const ex=b.x+b.width/2,ey=b.y+b.height/2;
    const redRadius=Math.min(a.width,a.height)/2;
    const eyeRadius=Math.max(b.width,b.height)/2;
    return {shell:{x:a.x,y:a.y,width:a.width,height:a.height,
        centerX:cx,centerY:cy,radius:redRadius},
      eye:{x:b.x,y:b.y,width:b.width,height:b.height,
        centerX:ex,centerY:ey,radius:eyeRadius},
      shellCount:stage.querySelectorAll('#cc219-shell').length,
      blueSparkCount:stage.querySelectorAll('#cc219-spark').length,
      nested:shell.contains(spark),outerAspect:a.height?a.width/a.height:null,
      eyeToShellDiameter:a.width?b.width/a.width:null,
      centerDistance:Math.hypot(ex-cx,ey-cy),
      whollyEnclosed:Math.hypot(ex-cx,ey-cy)+eyeRadius<=redRadius-1};
  }
  function paintCapture(ms,now){
    if(!stage||controls.hidden)return;
    elapsedMs=ms;
    const time=preset.timelineMs;
    const done=ms>=time.livingHoldEnd||reduced&&ms>=time.reducedMotionTotal;
    const points=capturePoint(),bot=points.bot,s=points.spark;
    const diameter=shellDiameter();
    const origSpark=diameter/preset.pursuitVisuals.normalBodyToSparkDiameterRatio;
    const eyeSize=diameter*preset.geometry.innerEyeDiameterToOuterDiameter;
    const name=reduced?'hold':
      ms<time.contactEnd?'contact':
      ms<time.apertureEnd?'aperture':
      ms<time.swallowEnd?'swallow':
      ms<time.internalPopEnd?'pop':
      ms<time.reformEnd?'reform':'hold';
    setPhase(name);
    stage.dataset.active='true';stage.dataset.capturing='true';
    shell.style.width=diameter+'px';shell.style.height=diameter+'px';
    stage.style.setProperty('--cc219-diameter',diameter+'px');
    stage.style.setProperty('--cc219-pressure','1');
    const swell=reduced?1:
      ms>=time.apertureEnd&&ms<time.reformEnd?
        1+(preset.geometry.maxCaptureShellScale-1)*
          Math.sin(Math.PI*clamp((ms-time.apertureEnd)/
            (time.reformEnd-time.apertureEnd),0,1)):1;
    shell.style.scale=String(swell);
    position(shell,bot.x,bot.y);
    if(!eyeNested){
      spark.hidden=false;
      const t=reduced?1:smooth((ms-time.apertureEnd)/
        (time.swallowEnd-time.apertureEnd));
      const ex=lerp(s.x,bot.x,t),ey=lerp(s.y,bot.y,t);
      const size=lerp(origSpark,eyeSize,t);
      spark.style.width=spark.style.height=size+'px';
      position(spark,ex,ey);
      if(reduced||ms>=time.swallowEnd){
        relocateEye();
      }
    }
    if(eyeNested){
      spark.hidden=false;
      spark.style.width=spark.style.height=eyeSize+'px';
      spark.style.left='50%';spark.style.top='50%';
      spark.style.transform='translate(-50%,-50%)';
    }
    paintParticles(now,bot.x,bot.y,diameter,
      !reduced&&ms<time.reformEnd);
    if(name==='hold'){
      // A real nested blue eye inside exactly one circular red shell.
      finalGeometry=geometry();
    }
    if(done){
      if(previewActive){
        controls.dataset.done='true';again.hidden=false;
      }else finish('completed');
    }
  }
  function open(demo){
    if(!initialized)build();
    if(!demo&&!capture)return;
    if(demo&&game()?.snapshot?.()?.tick>0&&game()?.snapshot?.()?.phase!=='ended'){
      uiText('Start a fresh run for the visual preview');return;
    }
    epoch++;cancelAnimationFrame(animationId);qaFrozenMs=null;
    releaseEye();spark.hidden=false;finalGeometry=null;
    focusBefore=document.activeElement;
    previewActive=demo;
    const summary=$('summaryPanel');
    // Preserve the actual source-owned summary, just cover it temporarily.
    document.body.classList.add('cc219-active');
    shield.hidden=false;
    controls.hidden=false;controls.dataset.done='false';
    controls.dataset.demo=demo?'true':'false';
    again.hidden=true;
    if(!demo)baselineDigest=currentDigest();
    startedAt=performance.now();elapsedMs=0;
    firstTerminalPaint=Boolean(summary&&!summary.hidden);
    remember('PRESENTATION_OPEN',{demo,sourceDigest:currentDigest(),
      captureEventId:capture?.eventId||null});
    skip.textContent=demo?'Return to game':'View run summary';
    status.textContent=demo?'VISUAL PREVIEW · NOT A REAL CAPTURE':'VERIFIED PHYSICAL CAPTURE';
    skip.focus({preventScroll:true});
    const token=epoch;
    const tick=now=>{
      if(token!==epoch||controls.hidden)return;
      const delta=now-startedAt;
      if(qaFrozenMs===null)paintCapture(delta,now);
      if(token===epoch&&!controls.hidden)animationId=requestAnimationFrame(tick);
    };
    animationId=requestAnimationFrame(tick);
  }
  function preview(){
    if(!initialized)build();
    demoStarted=true;
    if($('cc209c-intro')&&!$('cc209c-intro').hidden)$('cc209c-enter')?.click();
    remember('DEMO_REQUEST');
    open(true);
  }
  function finish(reason){
    if(!controls||controls.hidden)return;
    const wasDemo=previewActive;
    epoch++;cancelAnimationFrame(animationId);
    document.body.classList.remove('cc219-active');
    shield.hidden=true;controls.hidden=true;
    controls.dataset.done='false';
    stage.dataset.capturing='false';
    phase='idle';stage.dataset.phase='idle';controls.dataset.phase='idle';
    shell.style.scale='1';
    releaseEye();spark.hidden=true;
    previewActive=false;
    remember('PRESENTATION_CLOSE',{reason,demo:wasDemo,
      unchangedDigest:baselineDigest===null||baselineDigest===currentDigest()});
    if(!wasDemo&&baselineDigest!==null&&baselineDigest!==currentDigest())
      warnings.push('PRESENTATION_CHANGED_SOURCE_DIGEST');
    if(wasDemo){
      focusBefore?.focus?.({preventScroll:true});
    }else if(!$('summaryPanel')?.hidden){
      $('summaryRestart')?.focus?.({preventScroll:true});
    }
  }
  function observe(){
    const a=game(),state=a?.snapshot?.();
    if(!state)return;
    // Same seed/runId can repeat. An ended -> active boundary starts a new
    // presentation epoch, independent of any runId string reuse.
    if(state.phase!=='ended'){
      if(seenTerminal){
        seenTerminal=false;realCaptureShown=false;capture=null;
        captureEpoch++;firstCaptureTick=null;firstCaptureRun=null;
        if(summaryReplay)summaryReplay.hidden=true;
        if(!controls.hidden&&!previewActive)finish('new-run');
        remember('SOURCE_RUN_RESTARTED',{epoch:captureEpoch});
      }
      priorPhase=state.phase;priorTick=state.tick;
      return;
    }
    seenTerminal=true;
    if(state.endReason!=='CAPTURED'||realCaptureShown)return;
    const proof=receipt();
    if(!proof)return;
    realCaptureShown=true;capture=proof;
    firstCaptureTick=proof.tick;firstCaptureRun=proof.runId;
    if(summaryReplay)summaryReplay.hidden=false;
    remember('VERIFIED_CAPTURE',{eventId:proof.eventId,tick:proof.tick,
      rows:proof.rows,digest:proof.digest});
    if(!previewActive)open(false);
  }
  function summary(){
    return {schema:API,visible:!controls.hidden,
      phase,presentationState:proximity,phaseElapsedMs:elapsedMs,
      isDemo:previewActive,realCaptureSeen:realCaptureShown,
      reducedMotion:reduced,runId:firstCaptureRun,captureEventId:capture?.eventId||null,
      terminalTick:firstCaptureTick,sourceDigest:currentDigest(),
      artPresetHash:hashPreset(),captureEpoch,eyeNested,
      finalShellBounds:finalGeometry?.shell||null,
      innerEyeBounds:finalGeometry?.eye||null,
      geometry:finalGeometry?clone(finalGeometry):null,
      captureEvidence:capture?{eventId:capture.eventId,endReason:'CAPTURED',
        solvedRows:capture.rows,score:capture.score,
        powerCells:capture.cells,tick:capture.tick}:null,
      phaseHistory:history.filter(h=>h.type==='PHASE').slice(-20),
      warnings:[...warnings],errors:[...errors]};
  }
  function report(){return {...summary(),history:clone(history),
    geometryNow:geometry(),preset:clone(preset),
    sourceDigest:currentDigest()};}
  function heartbeat(now){
    try{
      if(!initialized)build();
      if(previewRequested&&!demoStarted&&game()?.snapshot)preview();
      if(!controls||controls.hidden){
        observe();drawLive(now);
      }else{
        // Visual animation clock is separate; still inspect source reset to
        // release the overlay, but never advance the game from here.
        observe();
      }
      priorTime=now;
    }catch(e){issue('heartbeat',e);}
    requestAnimationFrame(heartbeat);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(heartbeat),{once:true});
  else requestAnimationFrame(heartbeat);
})();
