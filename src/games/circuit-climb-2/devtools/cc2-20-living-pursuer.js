/**
 * CC2-VIS-20 — Living Pursuer presentation controller.
 *
 * Seven separable responsibilities:
 *   1. Read-only source projection (never updates simulation).
 *   2. Deterministic fixed-step plasma dynamics (cc2-20-plasma-physics.js).
 *   3. Procedural canvas material, eddies, and persistent bounded wake.
 *   4. Read-only pursuit personality and restrained Spark field.
 *   5. Animated physical engulfment around an actual CAPTURED receipt
 *      (the existing CC2-19 owner invokes renderCapture ONLY on its event).
 *   6. Low-gain local sound events; existing adaptive music stays untouched.
 *   7. Source-independent designer lab, presets, timeline and diagnostics.
 *
 * Absolutely no access to game input methods, core ticks, bot steering,
 * collision adjudication, scoring, achievements or authoritative camera.
 */
(() => {
  'use strict';
  const ID='cc2-vis20-living-pursuer/v1';
  const physics=window.__CC2_20_PHYSICS__;
  if(!physics)throw Error('CC220_PHYSICS_MODULE_NOT_LOADED');
  const $=id=>document.getElementById(id);
  const game=()=>window.__CC2_02A__;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
  const TWO=Math.PI*2;
  const envReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params=new URLSearchParams(location.search);
  const allowedScenarios=physics.SCENARIOS;
  const timings={anticipation:100,engulf:280,swallow:500,burst:750,
    recovery:1250,hold:1850};
  const defaults={
    schema:ID,meta:{name:'Living Pursuer · Controlled Plasma',version:1,
      source:'CC2-19 Red Shell',authority:'visual-only'},
    material:{coreScale:.77,envelopeRadius:1.18,
      membraneOpacity:.8,plasmaDensity:.72,internalGlow:.64,
      turbulence:.18,filamentCount:4,particleBudget:22,
      shellThickness:2,translucency:.36,
      shell:'#b92b62',edge:'#ff72b2',hot:'#ffd0f3',
      smoke:'#8d2769',blue:'#31c4ff'},
    physics:{...physics.DEFAULTS},
    personality:{searching:.35,lock:.65,hunting:.86,
      frustration:.9,imminent:1,visualSmoothingMs:160},
    capture:{...timings,engulfRadius:1.45,snapIntensity:1,
      internalPulse:.8,shellClosure:.85,reduceMotionTotal:400},
    performance:{resolutionScale:1,trailBudget:32,maxDpr:1.5,
      glowQuality:1,reducedMotion:'system'},
    sound:{enabled:true,plasma:.1,acceleration:.12,
      lock:.17,recoil:.19,engulf:.36,swallow:.28,
      internal:.2,settle:.14},
    laboratory:{seed:202020,slowMotion:.5,showSourceCrosshair:true}
  };
  const ranges={
    'material.coreScale':[.6,1],'material.envelopeRadius':[.9,1.7],
    'material.membraneOpacity':[.1,1],'material.plasmaDensity':[0,1],
    'material.internalGlow':[0,1],'material.turbulence':[0,.5],
    'material.filamentCount':[1,8],'material.particleBudget':[0,48],
    'material.shellThickness':[.5,5],'material.translucency':[0,1],
    'physics.envelopeMass':[.3,8],'physics.springStiffness':[5,150],
    'physics.damping':[1,35],'physics.drag':[0,5],
    'physics.maxLagWorld':[4,110],'physics.velocitySmoothingMs':[20,500],
    'physics.angularInertia':[0,1],'physics.tailLifetimeMs':[100,2500],
    'physics.trailSamples':[4,64],'physics.turbulence':[0,.5],
    'physics.idleBreath':[0,.15],'physics.directionLag':[0,2],
    'physics.recoil':[0,2],
    'personality.searching':[0,1],'personality.lock':[0,1],
    'personality.hunting':[0,1],'personality.frustration':[0,1],
    'personality.imminent':[0,1],
    'personality.visualSmoothingMs':[30,1000],
    'capture.anticipation':[50,170],'capture.engulf':[170,400],
    'capture.swallow':[350,700],'capture.burst':[600,1000],
    'capture.recovery':[950,1550],'capture.hold':[1450,3000],
    'capture.engulfRadius':[1,2.2],'capture.snapIntensity':[.2,1.8],
    'capture.internalPulse':[0,1.5],'capture.shellClosure':[.2,1.5],
    'capture.reduceMotionTotal':[120,450],
    'performance.resolutionScale':[.5,1.5],
    'performance.trailBudget':[4,64],
    'performance.maxDpr':[1,2],'performance.glowQuality':[0,1.5],
    'sound.plasma':[0,1],'sound.acceleration':[0,1],
    'sound.lock':[0,1],'sound.recoil':[0,1],
    'sound.engulf':[0,1],'sound.swallow':[0,1],
    'sound.internal':[0,1],'sound.settle':[0,1],
    'laboratory.slowMotion':[.1,2]
  };
  const hexColor=s=>/^#[0-9a-fA-F]{6}$/.test(s);
  function validate(raw){
    if(!raw||raw.schema!==ID)throw Error('CC220_PRESET_SCHEMA_INVALID');
    const p=clone(defaults);
    for(const key of Object.keys(defaults)){
      if(!(key in raw))throw Error('CC220_PRESET_MISSING_'+key);
    }
    if(Object.keys(raw).sort().join('|')!==
       Object.keys(defaults).sort().join('|'))
      throw Error('CC220_PRESET_UNKNOWN_FIELD');
    for(const sec of Object.keys(defaults).filter(x=>x!=='schema')){
      if(!raw[sec]||Object.keys(raw[sec]).sort().join('|')!==
         Object.keys(defaults[sec]).sort().join('|'))
        throw Error('CC220_PRESET_SECTION_FIELDS_'+sec);
      for(const [key,value]of Object.entries(defaults[sec])){
        const n=raw[sec][key];
        if(typeof n!==typeof value)
          throw Error('CC220_PRESET_FIELD_TYPE_'+sec+'.'+key);
        if(typeof n==='number'&&!Number.isFinite(n))
          throw Error('CC220_NONFINITE_'+sec+'.'+key);
        if(typeof n==='number'&&ranges[sec+'.'+key]){
          const [lo,hi]=ranges[sec+'.'+key];
          if(n<lo||n>hi)throw Error('CC220_PRESET_RANGE_'+sec+'.'+key);
        }
        if(typeof n==='string'&&sec==='material'&&
          ['shell','edge','hot','smoke','blue'].includes(key)&&!hexColor(n))
          throw Error('CC220_COLOR_INVALID_'+key);
        p[sec][key]=n;
      }
    }
    const c=p.capture;
    if(!(c.anticipation<c.engulf&&c.engulf<c.swallow&&
         c.swallow<c.burst&&c.burst<c.recovery&&c.recovery<c.hold))
      throw Error('CC220_CAPTURE_TIMELINE_ORDER');
    if(!['system','force-reduce','full'].includes(p.performance.reducedMotion))
      throw Error('CC220_REDUCED_MOTION_MODE');
    if(!Number.isInteger(p.laboratory.seed)||p.laboratory.seed<1||
       p.laboratory.seed>2147483647)
      throw Error('CC220_SEED_INVALID');
    physics.validate(p.physics);
    return p;
  }
  let config=clone(defaults),sim=new physics.PlasmaMotion(config.physics);
  let root,canvas,ctx,labUi,readout,scrub,speedSelect,selector,presetText,
    optionsPanel,devReadout,labButton,prevPresentation=null;
  let lab=null,initialized=false,canvasWidth=0,canvasHeight=0,dpr=1,
    runToken=null,mode='IDLE',persona='SEARCHING',personaIntensity=.35,
    sample=null,frameIndex=0,lastRenderAt=0,visualErrors=[],
    history=[],audioCtx=null,hum=null,lastSfxAt=-1e9,
    audioUnlocked=false,visible=false,liveCount=0,captureCount=0,
    captureAuthorized=false,phase='none',sceneSnapshot=null,labRaf=0;
  let randomState=202020,ornaments=[];
  function log(type,extra={}){
    history.push({type,at:Math.round(performance.now()),...extra});
    if(history.length>180)history.shift();
  }
  function failure(context,e){
    visualErrors.push({context,message:String(e?.message||e)});
    if(visualErrors.length>30)visualErrors.shift();
  }
  function xorshift(){
    randomState^=randomState<<13;
    randomState^=randomState>>>17;
    randomState^=randomState<<5;
    return (randomState>>>0)/4294967296;
  }
  function seedOrnaments(){
    randomState=config.laboratory.seed|0;
    ornaments=Array.from({length:48},(_,i)=>({
      angle:xorshift()*TWO,
      radius:.65+xorshift()*.75,
      rate:.27+xorshift()*.8,
      offset:xorshift()*TWO,
      size:.7+xorshift()*1.8,
      id:i
    }));
  }
  function reduced(){
    return config.performance.reducedMotion==='force-reduce'||
      config.performance.reducedMotion==='system'&&envReduced;
  }
  function hash(o){
    const text=JSON.stringify(o);let h=2166136261;
    for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function save(name,value){
    const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function audioAllowed(){
    if(!config.sound.enabled||!audioUnlocked)return false;
    const toggle=$('cc209b-audio-toggle');
    if(toggle?.getAttribute('aria-pressed')==='false')return false;
    const base=$('soundToggle');
    if(!toggle&&base?.getAttribute('aria-pressed')==='false')return false;
    return true;
  }
  function audioBus(){
    if(!audioAllowed())return null;
    try{
      const Type=window.AudioContext||window.webkitAudioContext;
      if(!Type)return null;
      audioCtx??=new Type();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
      return audioCtx;
    }catch(e){failure('audio-init',e);return null;}
  }
  function cue(kind){
    const cfg=config.sound;
    if(!audioAllowed()||!cfg[kind])return;
    const t=performance.now();
    if(kind!=='engulf'&&kind!=='swallow'&&kind!=='internal'&&
       kind!=='settle'&&t-lastSfxAt<410)return;
    lastSfxAt=t;
    try{
      const context=audioBus();if(!context)return;
      const sounds={
        acceleration:[180,310,.11,'triangle'],
        lock:[340,520,.085,'sine'],
        recoil:[290,110,.18,'triangle'],
        engulf:[145,75,.14,'triangle'],
        swallow:[420,95,.16,'sine'],
        internal:[690,460,.14,'sine'],
        settle:[170,118,.21,'sine']
      };
      const x=sounds[kind];if(!x)return;
      const oscillator=context.createOscillator(),gain=context.createGain();
      const when=context.currentTime+.005;
      oscillator.type=x[3];
      oscillator.frequency.setValueAtTime(x[0],when);
      oscillator.frequency.exponentialRampToValueAtTime(x[1],when+x[2]);
      const volume=.03*cfg[kind];
      gain.gain.setValueAtTime(.0001,when);
      gain.gain.exponentialRampToValueAtTime(Math.max(.00012,volume),when+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,when+x[2]);
      oscillator.connect(gain);gain.connect(context.destination);
      oscillator.start(when);oscillator.stop(when+x[2]+.03);
      log('LOCAL_AUDIO',{kind});
    }catch(e){failure('cue',e);}
  }
  function humGain(value){
    try{
      if(!audioAllowed()||!value){
        if(hum)hum.gain.gain.setTargetAtTime(0,audioCtx.currentTime,.05);
        return;
      }
      const a=audioBus();if(!a)return;
      if(!hum){
        const oscillator=a.createOscillator(),g=a.createGain();
        oscillator.type='sine';oscillator.frequency.value=82;
        g.gain.value=0;oscillator.connect(g);g.connect(a.destination);
        oscillator.start();
        hum={oscillator,gain:g};
      }
      hum.gain.gain.setTargetAtTime(clamp(value,0,.004),a.currentTime,.15);
    }catch(e){failure('hum',e);}
  }
  function sourceState(){
    const a=game(),s=a?.snapshot?.();
    return {snapshot:s,bot:a?.pursuer?.(),renderer:a?.rendererStats?.(),
      digest:a?.sessionReport?.()?.stateDigest??null};
  }
  function projectWorld(p){
    const r=game()?.rendererStats?.(),board=$('board');
    if(!r||!board)return null;
    const w=board.clientWidth;
    return {x:w/2+(p.x-300)*r.horizontalCameraScale*w/600,
      y:(p.y-r.cameraY)*r.effectiveZoom*w/600};
  }
  function labProject(p){
    const w=root?.clientWidth||390,h=root?.clientHeight||570;
    return {x:p.x/600*w,y:(p.y-260)/460*h+h*.49};
  }
  function sizeCanvas(){
    const w=Math.max(1,root?.clientWidth||1);
    const h=Math.max(1,root?.clientHeight||1);
    const scale=Math.min(config.performance.maxDpr,
      window.devicePixelRatio||1)*config.performance.resolutionScale;
    const px=Math.max(1,Math.floor(w*scale));
    const py=Math.max(1,Math.floor(h*scale));
    if(canvas.width!==px||canvas.height!==py){
      canvas.width=px;canvas.height=py;
    }
    canvasWidth=w;canvasHeight=h;dpr=scale;
    ctx.setTransform(scale,0,0,scale,0,0);
  }
  function clear(){
    if(!canvas)return;
    sizeCanvas();
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
  }
  function color(hex,alpha){
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+((n>>>16)&255)+','+((n>>>8)&255)+','+
      (n&255)+','+clamp(alpha,0,1).toFixed(3)+')';
  }
  // Smoke is composed of old source positions, colored eddies, changing
  // widths and direction-aware curls. It is not a straight streak sprite.
  function drawWake(s,project,now,diameter,intensity){
    if(reduced()||!s?.trail?.length)return;
    const rows=s.trail.filter(p=>now-p.at<config.physics.tailLifetimeMs)
      .slice(-config.performance.trailBudget);
    const steps=rows.map(p=>({p:project(p),age:clamp((now-p.at)/
      config.physics.tailLifetimeMs,0,1),heading:Math.atan2(p.vy,p.vx),
      speed:Math.hypot(p.vx,p.vy)})).filter(q=>q.p);
    if(!steps.length)return;
    const head=project(s.source);
    if(!head)return;
    steps.push({p:head,age:0,heading:Math.atan2(s.velocity.y,s.velocity.x)});
    const m=config.material;
    // Three translucent smoke layers with independent curl frequencies.
    for(let layer=2;layer>=0;layer--){
      const thickness=diameter*(.13+layer*.09)*m.plasmaDensity;
      for(let i=1;i<steps.length;i++){
        const a=steps[i-1],b=steps[i];
        const age=(a.age+b.age)*.5;
        const alpha=(1-age)*(1-age)*(.075+layer*.035)*intensity;
        if(alpha<.002)continue;
        const time=now*.001;
        const curl=Math.sin(i*.83+time*(.56+layer*.24)+layer*1.35)*
          m.turbulence*diameter*(1-age);
        const midX=(a.p.x+b.p.x)*.5+Math.sin(a.heading)*curl;
        const midY=(a.p.y+b.p.y)*.5-Math.cos(a.heading)*curl;
        ctx.save();
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.lineWidth=Math.max(.5,thickness*(1-age));
        ctx.strokeStyle=color(layer===0?m.hot:layer===1?m.edge:m.smoke,alpha);
        ctx.shadowColor=m.edge;
        ctx.shadowBlur=(6+layer*7)*config.performance.glowQuality;
        ctx.beginPath();ctx.moveTo(a.p.x,a.p.y);
        ctx.quadraticCurveTo(midX,midY,b.p.x,b.p.y);ctx.stroke();
        ctx.restore();
      }
    }
    // Old envelopes curl and detach as dissipating eddies, not points on a
    // permanent circle. Every eddy has bounded life; no hidden DOM growth.
    for(let i=0;i<steps.length-1;i+=2){
      const item=steps[i],fade=(1-item.age)**2;
      if(fade<.06)continue;
      const t=now*.001,rad=diameter*(.08+.12*fade);
      ctx.beginPath();
      ctx.ellipse(item.p.x+Math.sin(t*.83+i)*rad*.7,
        item.p.y+Math.cos(t*.71+i*.3)*rad*.7,
        rad*(1+item.age),rad*.7,item.heading,0,TWO);
      ctx.fillStyle=color(config.material.smoke,.085*fade*intensity);
      ctx.fill();
    }
  }
  function drawEnvelope(s,project,now,diameter,intensity,personality){
    const p=project(s.outer),core=project(s.source);
    if(!p||!core)return;
    const m=config.material;
    const speed=clamp(s.speed/230,0,1.4);
    const lag={x:p.x-core.x,y:p.y-core.y};
    const mag=Math.hypot(lag.x,lag.y);
    const vx=s.velocity.x,vy=s.velocity.y;
    const vmag=Math.hypot(vx,vy)||1;
    const back={x:-vx/vmag,y:-vy/vmag};
    const ang=now*.001;
    const r=diameter*.50*m.envelopeRadius;
    const deformation=clamp((mag/Math.max(1,diameter))*.85+
      speed*.075,0,.4);
    const fill=ctx.createRadialGradient(core.x-diameter*.12,
      core.y-diameter*.16,diameter*.07,p.x,p.y,r*1.6);
    fill.addColorStop(0,color(m.hot,.22*m.internalGlow*intensity));
    fill.addColorStop(.34,color(m.shell,.66*m.membraneOpacity));
    fill.addColorStop(.68,color(m.smoke,.35*m.membraneOpacity));
    fill.addColorStop(1,color(m.edge,.07*m.membraneOpacity));
    ctx.save();
    ctx.beginPath();
    const points=56;
    for(let i=0;i<=points;i++){
      const theta=i%points/points*TWO,
        c=Math.cos(theta),ss=Math.sin(theta);
      const rear=Math.max(0,c*back.x+ss*back.y);
      const front=Math.max(0,-(c*back.x+ss*back.y));
      const ripples=reduced()?0:
        Math.sin(theta*3-ang*1.12+s.angular)*m.turbulence*.36+
        Math.sin(theta*5+ang*.66)*m.turbulence*.19+
        Math.sin(theta*7-ang*.4)*m.turbulence*.095;
      const shape=1+rear*deformation*.48-front*deformation*.2+ripples;
      const xx=p.x+c*r*shape+lag.x*.10;
      const yy=p.y+ss*r*shape+lag.y*.10;
      if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.closePath();
    ctx.shadowColor=m.edge;ctx.shadowBlur=diameter*.17*
      config.performance.glowQuality*intensity;
    ctx.fillStyle=fill;ctx.fill();
    ctx.lineWidth=m.shellThickness;
    ctx.strokeStyle=color(m.edge,.24+.37*intensity);
    ctx.stroke();
    ctx.restore();

    // Coherent inner plasma vortices, never decorative rotating metal rings.
    for(let i=0;i<m.filamentCount;i++){
      const r0=r*(.25+i*.09),a0=i*2.13+ang*(i%2?-.38:.49);
      const x0=core.x+Math.cos(a0)*r0*.48,y0=core.y+Math.sin(a0)*r0*.48;
      ctx.save();ctx.globalAlpha=(.27+.17*intensity)*m.internalGlow;
      ctx.beginPath();ctx.moveTo(x0,y0);
      ctx.bezierCurveTo(
        core.x+Math.cos(a0+1.1)*r*.8,core.y+Math.sin(a0+1.1)*r*.7,
        p.x+Math.cos(a0+2.1)*r*.8,p.y+Math.sin(a0+2.1)*r*.8,
        p.x+Math.cos(a0+3)*r0,p.y+Math.sin(a0+3)*r0);
      ctx.lineWidth=.8+(i%3)*.4;
      ctx.strokeStyle=i%2?m.hot:m.edge;
      ctx.shadowColor=m.hot;ctx.shadowBlur=3;
      ctx.stroke();ctx.restore();
    }
  }
  function drawMotes(s,project,now,diameter,intensity){
    if(reduced())return;
    const p=project(s.outer);if(!p)return;
    const m=config.material;
    const count=Math.min(m.particleBudget,
      canvasWidth<500?20:48,ornaments.length);
    for(let i=0;i<count;i++){
      const dot=ornaments[i],a=dot.angle+now*.0005*dot.rate,
        curl=Math.sin(now*.001*dot.rate+dot.offset);
      const reach=diameter*(.40+dot.radius*.28)+curl*diameter*.075;
      const x=p.x+Math.cos(a)*reach,y=p.y+Math.sin(a)*reach;
      const alpha=.10+Math.abs(curl)*.24*intensity;
      ctx.beginPath();ctx.arc(x,y,dot.size*.68,0,TWO);
      ctx.fillStyle=color(i%3===0?m.hot:m.edge,alpha);
      ctx.fill();
    }
  }
  function drawSparkReaction(screen,source,speed){
    if(!screen||reduced())return;
    const angle=Math.atan2(source?.y||0,source?.x||0)+Math.PI;
    const strength=clamp(speed/240,0,1);
    ctx.save();ctx.globalAlpha=.14+strength*.16;
    const r=11+strength*6;
    const grad=ctx.createRadialGradient(screen.x,screen.y,1,
      screen.x,screen.y,r*1.7);
    grad.addColorStop(0,'rgba(80,224,255,.16)');
    grad.addColorStop(1,'rgba(36,132,225,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(screen.x,screen.y,r*1.7,0,TWO);
    ctx.fill();
    if(strength>.12){
      ctx.strokeStyle='rgba(105,228,255,.42)';
      ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(
        screen.x+Math.cos(angle)*12,screen.y+Math.sin(angle)*12);
      ctx.quadraticCurveTo(screen.x+Math.cos(angle)*17,
        screen.y+Math.sin(angle)*17,
        screen.x+Math.cos(angle)*r*2,screen.y+Math.sin(angle)*r*2);
      ctx.stroke();
    }
    ctx.restore();
  }
  function selectPersona(data,s){
    const source=data.botState||{};
    const distance=data.screenSpark&&data.screenBot?
      Math.hypot(data.screenSpark.x-data.screenBot.x,
        data.screenSpark.y-data.screenBot.y):Infinity;
    const d=55;
    const previous=persona;
    if(data.proximity==='CRITICAL_NEAR'||distance<d*1.8)
      persona='IMMINENT';
    else if(Math.abs(s.turn)>1.0&&s.speed>40)
      persona='FRUSTRATION';
    else if(s.speed>90||source.belief?.mode==='PURSUE')
      persona='HUNTING';
    else if(source.sensed||data.proximity==='LOCKED_ON')
      persona='TARGET_ACQUIRED';
    else persona='SEARCHING';
    const target={
      SEARCHING:config.personality.searching,
      TARGET_ACQUIRED:config.personality.lock,
      HUNTING:config.personality.hunting,
      FRUSTRATION:config.personality.frustration,
      IMMINENT:config.personality.imminent
    }[persona];
    const f=1-Math.exp(-16/config.personality.visualSmoothingMs);
    personaIntensity=lerp(personaIntensity,target,f);
    if(previous!==persona){
      log('PERSONALITY',{state:persona,from:previous});
      if(persona==='TARGET_ACQUIRED')cue('lock');
      if(persona==='FRUSTRATION')cue('recoil');
    }
    if(s.acceleration>900&&s.speed>50)cue('acceleration');
  }
  function paintScene(s,project,now,diam,screenSpark,sourceSpark){
    clear();
    if(!s)return;
    const intensity=personaIntensity;
    drawWake(s,project,now,diam,intensity);
    drawEnvelope(s,project,now,diam,intensity,persona);
    drawMotes(s,project,now,diam,intensity);
    drawSparkReaction(screenSpark,sourceSpark,s.speed);
    sample=s;visible=true;frameIndex++;lastRenderAt=now;
  }
  function ensure(){
    if(initialized)return true;
    const stage=$('cc219-stage');
    if(!stage)return false;
    root=stage;
    const shell=$('cc219-shell');
    canvas=document.createElement('canvas');
    canvas.id='cc220-fluid';
    canvas.setAttribute('aria-hidden','true');
    canvas.style.pointerEvents='none';
    root.insertBefore(canvas,shell);
    ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx)throw Error('CC220_CANVAS_CONTEXT_UNAVAILABLE');
    root.dataset.cc220='on';
    root.dataset.cc220Mode='normal';
    document.addEventListener('pointerdown',()=>{audioUnlocked=true;},
      {capture:true,passive:true});
    document.addEventListener('keydown',()=>{audioUnlocked=true;},
      {capture:true});
    installLab();
    seedOrnaments();
    applyConfig(defaults);
    initialized=true;
    log('INITIALIZED',{source:'cc2-19-presentation'});
    return true;
  }
  function syncCapture(){
    const a=window.__CC2_19__;
    if(!a?.preset||!a?.loadPreset)return;
    const p=a.preset(),t=config.capture;
    p.timelineMs.contactEnd=t.anticipation;
    p.timelineMs.apertureEnd=t.engulf;
    p.timelineMs.swallowEnd=t.swallow;
    p.timelineMs.internalPopEnd=t.burst;
    p.timelineMs.reformEnd=t.recovery;
    p.timelineMs.livingHoldEnd=t.hold;
    p.timelineMs.reducedMotionTotal=t.reduceMotionTotal;
    p.performance.reducedMotion=reduced()?'force-reduce':'final-pose-hold';
    a.loadPreset(p);
    log('CAPTURE_TIMING_LINKED',{duration:t.hold});
  }
  function applyConfig(value){
    config=validate(value);
    sim.configure(config.physics);
    seedOrnaments();
    if(root)root.style.setProperty('--cc220-core-scale',
      String(config.material.coreScale));
    if(root)root.style.setProperty('--cc220-shell',config.material.shell);
    if(root)root.style.setProperty('--cc220-edge',config.material.edge);
    if(root)root.style.setProperty('--cc220-hot',config.material.hot);
    if(root)root.dataset.cc220Reduced=reduced()?'yes':'no';
    if(window.__CC2_19__?.loadPreset)syncCapture();
    if(presetText)presetText.value=JSON.stringify(config,null,2);
    if(devReadout)devReadout.textContent='Preset '+hash(config)+
      ' · visual-only · '+config.capture.hold+' ms capture';
    log('CONFIG_APPLIED',{hash:hash(config)});
    return hash(config);
  }
  function projectLive(data){
    if(!ensure()||lab?.active)return false;
    if(!data?.botWorld||!data?.screenBot)return false;
    const snapshot=data.source;
    if(!snapshot||snapshot.phase==='ended')return false;
    const key=String(snapshot.runId)+'|'+snapshot.tick;
    if(runToken!==snapshot.runId){
      sim.reset(data.botWorld.x,data.botWorld.y,data.now);
      runToken=snapshot.runId;
      log('VISUAL_RUN_BOUNDARY',{runId:String(snapshot.runId)});
    }
    const s=reduced()?sim.reset(data.botWorld.x,data.botWorld.y,data.now):
      sim.advance(data.botWorld.x,data.botWorld.y,data.now);
    selectPersona(data,s);
    const d=data.diameter||55;
    const r=$('cc219-shell');
    if(r){
      r.style.scale=String(config.material.coreScale);
      r.style.setProperty('--cc220-core-scale',String(config.material.coreScale));
    }
    mode='PURSUIT';
    root.dataset.cc220Mode='pursuit';
    root.dataset.cc220Persona=persona;
    root.dataset.cc220Reduced=reduced()?'yes':'no';
    paintScene(s,projectWorld,data.now,d,data.screenSpark,
      data.source?.travel?{x:s.velocity.x,y:s.velocity.y}:null);
    liveCount++;
    humGain(.0026*config.sound.plasma*(.5+personaIntensity));
    return true;
  }
  function drawEngulf(blob,now,ms){
    if(!ctx)return;
    const m=config.material,t=config.capture;
    const bot=blob.bot,spark=blob.spark;
    const d=blob.diameter||55;
    const dirX=spark.x-bot.x,dirY=spark.y-bot.y;
    const length=Math.hypot(dirX,dirY)||1;
    const nx=dirX/length,ny=dirY/length;
    const px=-ny,py=nx;
    const snap=clamp((ms-t.anticipation)/(t.engulf-t.anticipation),0,1);
    const strength=ease(snap)*config.capture.snapIntensity;
    const tip={x:lerp(bot.x,spark.x,strength),
      y:lerp(bot.y,spark.y,strength)};
    const red=ctx.createRadialGradient(bot.x,bot.y,2,
      tip.x,tip.y,d*.86);
    red.addColorStop(0,color(m.shell,.45));
    red.addColorStop(.64,color(m.shell,.62));
    red.addColorStop(1,color(m.edge,.08));
    ctx.save();
    ctx.shadowColor=m.edge;ctx.shadowBlur=d*.24;
    ctx.beginPath();
    const w=d*.31*(.45+strength*.7);
    // A single lunging membrane with two curved closing lips,
    // rather than a second independent spherical lobe.
    ctx.moveTo(bot.x+px*d*.3,bot.y+py*d*.3);
    ctx.bezierCurveTo(
      lerp(bot.x,tip.x,.38)+px*w,
      lerp(bot.y,tip.y,.38)+py*w,
      tip.x+px*w*.48,tip.y+py*w*.48,
      tip.x+nx*d*.16,tip.y+ny*d*.16);
    ctx.bezierCurveTo(
      tip.x+px*w*.2,tip.y+py*w*.2,
      tip.x-px*w*.2,tip.y-py*w*.2,
      tip.x-nx*d*.07,tip.y-ny*d*.07);
    ctx.bezierCurveTo(
      tip.x-px*w*.48,tip.y-py*w*.48,
      lerp(bot.x,tip.x,.38)-px*w,
      lerp(bot.y,tip.y,.38)-py*w,
      bot.x-px*d*.3,bot.y-py*d*.3);
    ctx.closePath();ctx.fillStyle=red;ctx.fill();
    ctx.strokeStyle=color(m.hot,.42*strength);ctx.lineWidth=1.5;
    ctx.stroke();
    ctx.restore();
  }
  function renderCapture(blob){
    if(!ensure()||!blob)return;
    const {ms,now,bot,spark,diameter}=blob;
    if(!Number.isFinite(ms)||!bot||!spark)return;
    const t=config.capture;
    if(!captureAuthorized&&!blob.demo&&!blob.verified) {
      log('REJECTED_UNVERIFIED_CAPTURE_RENDER');
      return;
    }
    mode='CAPTURE';
    root.dataset.cc220Mode='capture';
    root.dataset.cc220Persona='CAPTURED';
    root.dataset.cc220Reduced=reduced()?'yes':'no';
    clear();
    const d=diameter||55;
    const core={source:bot,outer:bot,velocity:{x:0,y:0},
      speed:0,angular:0,turn:0,trail:[]};
    const identity=x=>x;
    // Retain inertial wake at the start, then pull it into the creature.
    if(!reduced()&&sample&&ms<t.recovery){
      const factor=Math.max(0,1-ms/t.recovery);
      ctx.save();ctx.globalAlpha=factor;
      drawWake(sample,projectWorld,now,d,.8*factor);ctx.restore();
    }
    if(!reduced()&&ms>=t.anticipation&&ms<t.swallow)
      drawEngulf(blob,now,ms);
    const energy=ms<t.anticipation?.85:ms<t.engulf?1:
      ms<t.swallow?1.12:ms<t.burst?1.2:
        ms<t.recovery?.72:.2;
    drawEnvelope(core,identity,now,d,energy,'CAPTURED');
    if(!reduced()&&ms>=t.swallow&&ms<t.burst){
      const p=(ms-t.swallow)/(t.burst-t.swallow);
      const rad=d*(.42+.6*ease(p));
      ctx.beginPath();ctx.arc(bot.x,bot.y,rad,0,TWO);
      ctx.lineWidth=1.2+(1-p)*2;
      ctx.strokeStyle=color(config.material.hot,(1-p)*.6);
      ctx.stroke();
    }
    if(!reduced()&&ms<t.recovery){
      drawMotes(core,identity,now,d,.7);
    }
    phase=blob.phase||phase;captureCount++;
    if(root)root.dataset.cc220Phase=phase;
  }
  function capturePhase(phaseName,demo,verified){
    if(!ensure())return;
    if(!demo&&!verified)return;
    captureAuthorized=verified;
    phase=phaseName;
    if(phaseName==='aperture')cue('engulf');
    if(phaseName==='swallow')cue('swallow');
    if(phaseName==='pop')cue('internal');
    if(phaseName==='reform')cue('settle');
    humGain(0);
    log('CAPTURE_PHASE',{phase:phaseName,demo,verified});
  }
  function captureEnded(){
    captureAuthorized=false;
    if(root)root.dataset.cc220Mode=lab?.active?'lab':'normal';
    mode=lab?.active?'LAB':'IDLE';
    humGain(0);
    log('CAPTURE_PRESENTATION_CLOSED');
  }
  function labScene(name,elapsedMs){
    const at=Math.max(0,elapsedMs);
    const bot=physics.scenarioPoint(name,at);
    let eye={x:425,y:260};
    if(name==='approach')eye={x:420,y:260};
    if(name==='capture'||name==='final')eye={x:355,y:260};
    const s=sim.advance(bot.x,bot.y,at);
    return {s,bot,eye};
  }
  function labStep(delta){
    if(!lab?.active)return;
    lab.elapsed=clamp(lab.elapsed+delta,0,5000);
    labDraw();
  }
  function labDraw(){
    if(!lab?.active||!ensure())return;
    root.dataset.active='true';
    mode='LAB';
    root.dataset.cc220Mode='lab';
    document.body.classList.add('cc220-lab-active');
    const {s,bot,eye}=labScene(lab.scenario,lab.elapsed);
    const screenBot=labProject(bot),screenEye=labProject(eye);
    const shell=$('cc219-shell'),spark=$('cc219-spark');
    if(shell){
      shell.style.width='55px';shell.style.height='55px';
      shell.style.scale=String(config.material.coreScale);
      shell.style.transform='translate3d('+screenBot.x+'px,'+
        screenBot.y+'px,0) translate(-50%,-50%)';
    }
    if(spark){
      if(spark.parentElement!==root)root.appendChild(spark);
      spark.hidden=false;spark.style.width='35px';spark.style.height='35px';
      spark.style.transform='translate3d('+screenEye.x+'px,'+
        screenEye.y+'px,0) translate(-50%,-50%)';
    }
    root.style.setProperty('--cc219-diameter','55px');
    root.style.setProperty('--cc220-core-scale',config.material.coreScale);
    persona=lab.scenario==='idle'?'SEARCHING':
      lab.scenario==='approach'?'IMMINENT':'HUNTING';
    personaIntensity=config.personality.hunting;
    paintScene(s,labProject,lab.elapsed,55,screenEye,
      {x:s.velocity.x,y:s.velocity.y});
    if(config.laboratory.showSourceCrosshair){
      ctx.save();ctx.strokeStyle='#ffffffdd';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(screenBot.x-6,screenBot.y);
      ctx.lineTo(screenBot.x+6,screenBot.y);
      ctx.moveTo(screenBot.x,screenBot.y-6);
      ctx.lineTo(screenBot.x,screenBot.y+6);ctx.stroke();ctx.restore();
    }
    if(readout)readout.textContent=lab.scenario+
      ' · SOURCE ('+bot.x.toFixed(0)+','+bot.y.toFixed(0)+')'+
      ' · plasma lag '+s.lagDistance.toFixed(1)+
      ' · '+lab.elapsed.toFixed(0)+' ms';
    if(scrub)scrub.value=String(Math.round(lab.elapsed));
  }
  function labLoop(now){
    if(!lab?.active)return;
    const dt=lab.lastNow?clamp(now-lab.lastNow,0,64):0;
    lab.lastNow=now;
    if(!lab.paused){
      lab.elapsed+=dt*lab.speed;
      if(lab.elapsed>5000){
        lab.elapsed=0;sim.reset(
          physics.scenarioPoint(lab.scenario,0).x,
          physics.scenarioPoint(lab.scenario,0).y,0);
      }
    }
    labDraw();
    labRaf=requestAnimationFrame(labLoop);
  }
  function startLab(name='turn90'){
    if(!allowedScenarios.includes(name))throw Error('CC220_LAB_UNKNOWN_SCENARIO');
    if(!ensure())return false;
    const state=game()?.snapshot?.();
    if(state&&state.phase!=='ended'&&state.tick>0)
      throw Error('CC220_LAB_REQUIRES_IDLE_OR_TERMINAL_RUN');
    stopLab();
    prevPresentation={stage:root.dataset.active||'false'};
    lab={active:true,scenario:name,elapsed:0,lastNow:0,
      paused:false,speed:1};
    const p=physics.scenarioPoint(name,0);
    sim.reset(p.x,p.y,0);
    labUi.hidden=false;
    selector.value=name;scrub.value='0';speedSelect.value='1';
    log('LAB_STARTED',{scenario:name,sourceTick:state?.tick||0});
    labRaf=requestAnimationFrame(labLoop);
    return true;
  }
  function stopLab(){
    cancelAnimationFrame(labRaf);
    if(!lab?.active)return;
    lab.active=false;
    document.body.classList.remove('cc220-lab-active');
    labUi.hidden=true;
    mode='IDLE';
    if(root){
      root.dataset.cc220Mode='normal';
      root.dataset.active='false';
    }
    const spark=$('cc219-spark');if(spark)spark.hidden=true;
    sim.clear();runToken=null;
    clear();humGain(0);
    log('LAB_ENDED');
  }
  function installLab(){
    const settings=$('cc209-developer-slot')||$('cc209-settings');
    if(settings){
      optionsPanel=document.createElement('details');
      optionsPanel.id='cc220-designer';
      const head=document.createElement('summary');
      head.textContent='CC2-20 · Living Pursuer Lab & configuration';
      optionsPanel.appendChild(head);
      const help=document.createElement('p');
      help.textContent='Render-only settings: mass, momentum, plume, wake, encounter, audio. Never changes pursuit, scoring or math.';
      optionsPanel.appendChild(help);
      const actions=document.createElement('div');actions.className='cc220-actions';
      const action=(label,fn)=>{
        const b=document.createElement('button');b.type='button';
        b.textContent=label;b.onclick=fn;actions.appendChild(b);
      };
      action('Open visual lab',()=>{
        $('cc209-settings')?.querySelector('[data-close="cc209-settings"]')?.click();
        try{startLab('turn90')}catch(e){labMessage(String(e.message||e))}
      });
      action('Preview capture',()=>window.__CC2_19__?.preview?.());
      action('Copy full configuration',async()=>{
        const json=JSON.stringify(config,null,2);
        try{await navigator.clipboard.writeText(json);
          labMessage('Full JSON copied');}
        catch{if(presetText){presetText.value=json;presetText.select();}
          labMessage('Select and copy the JSON text');}
      });
      action('Download JSON',()=>save('cc2-20-living-pursuer.json',config));
      action('Apply pasted JSON',()=>{
        try{applyConfig(JSON.parse(presetText.value));labMessage('Applied JSON '+hash(config));}
        catch(e){labMessage(String(e.message||e));}
      });
      action('Reset defaults',()=>{
        try{applyConfig(defaults);labMessage('Defaults restored');}
        catch(e){labMessage(String(e.message||e));}
      });
      action('Export diagnostic report',()=>save('cc2-20-vfx-session.json',report()));
      optionsPanel.appendChild(actions);
      const section=document.createElement('div');
      section.className='cc220-fields';
      const tuning=[
        ['material','coreScale',.6,1,.02],
        ['material','envelopeRadius',.9,1.7,.05],
        ['material','plasmaDensity',0,1,.05],
        ['material','turbulence',0,.5,.02],
        ['material','particleBudget',0,48,1],
        ['physics','envelopeMass',.3,8,.1],
        ['physics','springStiffness',5,150,2],
        ['physics','damping',1,35,.5],
        ['physics','drag',0,5,.1],
        ['physics','directionLag',0,2,.1],
        ['physics','tailLifetimeMs',100,2500,50],
        ['physics','trailSamples',4,64,1],
        ['capture','anticipation',50,170,10],
        ['capture','engulf',170,400,10],
        ['capture','swallow',350,700,10],
        ['capture','burst',600,1000,10],
        ['capture','recovery',950,1550,10],
        ['capture','hold',1450,3000,50],
        ['capture','engulfRadius',1,2.2,.1],
        ['sound','plasma',0,1,.05],
        ['sound','engulf',0,1,.05],
        ['sound','swallow',0,1,.05],
        ['sound','internal',0,1,.05]
      ];
      for(const [sec,key,min,max,step]of tuning){
        const label=document.createElement('label');
        label.textContent=sec+' · '+key;
        const input=document.createElement('input');
        input.type='range';input.min=String(min);input.max=String(max);
        input.step=String(step);input.value=String(config[sec][key]);
        const output=document.createElement('span');
        output.textContent=String(config[sec][key]);
        input.oninput=()=>output.textContent=input.value;
        input.onchange=()=>{
          const next=clone(config);next[sec][key]=Number(input.value);
          try{applyConfig(next);labMessage('Updated '+sec+'.'+key);}
          catch(e){input.value=String(config[sec][key]);
            output.textContent=input.value;labMessage(String(e.message||e));}
        };
        label.append(input,output);section.append(label);
      }
      optionsPanel.appendChild(section);
      const palettes=document.createElement('div');
      palettes.className='cc220-actions';
      for(const name of ['Calm','Viscous','Hunter']){
        const button=document.createElement('button');
        button.type='button';button.textContent=name+' preset';
        button.onclick=()=>useNamedPreset(name);
        palettes.appendChild(button);
      }
      optionsPanel.appendChild(palettes);
      const modeLabel=document.createElement('label');
      modeLabel.textContent='Motion mode';
      const select=document.createElement('select');
      for(const value of ['system','force-reduce','full']){
        const op=document.createElement('option');op.value=value;
        op.textContent=value;select.appendChild(op);
      }
      select.onchange=()=>{const v=clone(config);
        v.performance.reducedMotion=select.value;applyConfig(v);};
      modeLabel.appendChild(select);optionsPanel.appendChild(modeLabel);
      presetText=document.createElement('textarea');
      presetText.id='cc220-preset';
      presetText.setAttribute('aria-label','Full Living Pursuer visual configuration JSON');
      presetText.rows=11;
      optionsPanel.appendChild(presetText);
      devReadout=document.createElement('p');
      devReadout.id='cc220-designer-status';
      optionsPanel.appendChild(devReadout);
      settings.appendChild(optionsPanel);
    }
    labUi=document.createElement('div');
    labUi.id='cc220-lab-ui';labUi.hidden=true;
    const title=document.createElement('strong');title.textContent='LIVING PURSUER · VISUAL LAB';
    selector=document.createElement('select');
    selector.id='cc220-lab-scenario';
    for(const name of allowedScenarios){
      const o=document.createElement('option');o.value=name;
      o.textContent=name;selector.appendChild(o);
    }
    selector.onchange=()=>{
      if(lab?.active)startLab(selector.value);
    };
    const bar=document.createElement('div');bar.className='cc220-lab-controls';
    const pause=document.createElement('button');
    pause.id='cc220-lab-pause';pause.textContent='Pause';
    pause.onclick=()=>{
      if(!lab?.active)return;
      lab.paused=!lab.paused;
      pause.textContent=lab.paused?'Play':'Pause';
    };
    const step=document.createElement('button');
    step.textContent='Frame +';
    step.onclick=()=>{if(!lab?.active)return;lab.paused=true;
      pause.textContent='Play';labStep(1000/60)};
    const restart=document.createElement('button');restart.textContent='Replay';
    restart.onclick=()=>lab?.active&&startLab(lab.scenario);
    const slow=document.createElement('button');slow.textContent='¼ speed';
    slow.onclick=()=>{if(lab?.active){lab.speed=.25;speedSelect.value='.25';}};
    const close=document.createElement('button');close.textContent='Close';
    close.onclick=stopLab;
    speedSelect=document.createElement('select');speedSelect.id='cc220-lab-speed';
    for(const value of [.25,.5,1,2]){
      const o=document.createElement('option');o.value=String(value);
      o.textContent=value+'×';speedSelect.appendChild(o);
    }
    speedSelect.onchange=()=>{if(lab?.active)lab.speed=Number(speedSelect.value);};
    bar.append(selector,pause,step,restart,slow,speedSelect,close);
    scrub=document.createElement('input');scrub.type='range';
    scrub.min='0';scrub.max='5000';scrub.step='16.66667';
    scrub.value='0';scrub.id='cc220-lab-time';
    scrub.oninput=()=>{
      if(!lab?.active)return;
      const p=physics.scenarioPoint(lab.scenario,0);
      sim.reset(p.x,p.y,0);
      // Seek from origin to preserve deterministic spring state.
      const target=Number(scrub.value);
      const stepMs=1000/60;
      for(let t=stepMs;t<target;t+=stepMs){
        const q=physics.scenarioPoint(lab.scenario,t);
        sim.advance(q.x,q.y,t);
      }
      lab.elapsed=target;lab.paused=true;pause.textContent='Play';
      labDraw();
    };
    readout=document.createElement('p');
    readout.id='cc220-lab-readout';
    labUi.append(title,bar,scrub,readout);
    document.body.appendChild(labUi);
  }
  function useNamedPreset(name){
    const p=clone(defaults);
    p.meta.name='Living Pursuer · '+name;
    if(name==='Calm'){p.physics.envelopeMass=1.3;
      p.physics.damping=18;p.material.turbulence=.08;
      p.material.particleBudget=7;}
    if(name==='Viscous'){p.physics.envelopeMass=3.5;
      p.physics.springStiffness=31;p.physics.damping=7;
      p.material.turbulence=.24;p.physics.tailLifetimeMs=1500;}
    if(name==='Hunter'){p.physics.envelopeMass=2.2;
      p.physics.springStiffness=60;
      p.material.internalGlow=.92;p.material.particleBudget=30;
      p.personality.hunting=1;}
    applyConfig(p);
    log('NAMED_PRESET',{name});
  }
  function labMessage(msg){
    if(devReadout)devReadout.textContent=msg;
    if(readout&&lab?.active)readout.textContent=msg;
  }
  function scenarioEvidence(name,fps=60) {
    if(!allowedScenarios.includes(name))throw Error('CC220_SCENARIO_UNKNOWN');
    const m=new physics.PlasmaMotion(config.physics);
    const initial=physics.scenarioPoint(name,0);
    m.reset(initial.x,initial.y,0);
    let hashValue=2166136261;
    let samples=0,peak=0;
    for(let frame=1;frame<=Math.floor(2000*fps/1000);frame++){
      const at=frame*1000/fps;
      const p=physics.scenarioPoint(name,at);
      const s=m.advance(p.x,p.y,at);
      peak=Math.max(peak,s.lagDistance);
      // Quantized deterministic state hash. Never reads or writes game state.
      const bits=[s.outer.x,s.outer.y,s.lagDistance,s.angular]
        .map(x=>Math.round(x*1000)).join('|');
      for(const ch of bits){
        hashValue=Math.imul(hashValue^ch.charCodeAt(0),16777619);
      }
      samples++;
    }
    return {name,fps,samples,peakLag:peak,
      digest:(hashValue>>>0).toString(16).padStart(8,'0'),
      last:m.sample(),sourceReadOnly:true};
  }
  function summary(){
    return {schema:ID,initialized,mode,persona,personaIntensity,
      configHash:hash(config),reducedMotion:reduced(),
      liveFrames:liveCount,captureFrames:captureCount,
      lab:lab?.active?{scenario:lab.scenario,elapsed:lab.elapsed,
        paused:lab.paused,speed:lab.speed}:null,
      sample:sample?{lagDistance:sample.lagDistance,
        velocity:sample.velocity,turn:sample.turn,
        angular:sample.angular,trailCount:sample.trail.length,
        peakLag:sample.peakLag,source:sample.source,outer:sample.outer}:null,
      captureAuthorized,phase,
      gameDigest:game()?.sessionReport?.()?.stateDigest??null,
      sourceTick:game()?.snapshot?.()?.tick??null,
      errorCount:visualErrors.length};
  }
  function report(){
    return {summary:summary(),config:clone(config),
      events:clone(history),errors:clone(visualErrors),
      scenarios:allowedScenarios.map(name=>scenarioEvidence(name))};
  }
  window.__CC2_VIS20__=Object.freeze({
    summary,report,
    config:()=>clone(config),loadConfig:value=>applyConfig(value),
    reset:()=>applyConfig(defaults),useNamedPreset,
    projectLive,renderCapture,capturePhase,captureEnded,
    startLab,stopLab,isLabActive:()=>Boolean(lab?.active),
    labSetTime:ms=>{if(!lab?.active)throw Error('LAB_NOT_ACTIVE');
      lab.paused=true;
      const p=physics.scenarioPoint(lab.scenario,0);sim.reset(p.x,p.y,0);
      const limit=clamp(ms,0,5000),step=1000/60;
      for(let t=step;t<limit;t+=step){
        const q=physics.scenarioPoint(lab.scenario,t);
        sim.advance(q.x,q.y,t);
      }
      lab.elapsed=limit;labDraw();return summary();
    },
    labAdvance:ms=>{labStep(ms);return summary();},
    labScenario:scenarioEvidence, labScenarios:()=>[...allowedScenarios]
  });
  window.addEventListener('DOMContentLoaded',()=>{
    const start=()=>{
      try{
        if(!ensure()){requestAnimationFrame(start);return;}
        const name=params.get('vis20Lab');
        if(name&&allowedScenarios.includes(name))startLab(name);
      }catch(e){failure('boot',e);}
    };
    requestAnimationFrame(start);
  },{once:true});
})();
