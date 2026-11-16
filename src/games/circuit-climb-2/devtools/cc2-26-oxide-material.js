/**
 * CC2-26 — owner-reviewable Living Pursuer material and intent controller.
 *
 * Reuses the already source-locked CC2-20 physical material simulation.
 * This is NOT a second Pursuer, a second physics engine, a new canvas, or
 * an enemy AI. The exact CC2-24/25 visuals remain the ordinary default.
 *
 * Enable the experiment with ?cc226=1. Full material JSON can be exported
 * from Developer Settings. Only the CC2-20 visual preset and the CSS state
 * of the existing enemy shell are touched. Simulation math, navigation,
 * collision, scoring, and end-of-run authority are never written here.
 */
(() => {
  'use strict';
  const SCHEMA='cc2-26-living-pursuer/v1';
  const params=new URLSearchParams(location.search);
  const enabled=params.get('cc226')==='1';
  const root=document.documentElement;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const records=[];
  const errors=[];
  const counts={SEARCHING:0,TARGET_ACQUIRED:0,HUNTING:0,
    FRUSTRATION:0,IMMINENT:0,CAPTURED:0};
  let ready=false,frames=0,sourceTick=-1,sourceRunId=null;
  let lastIntent='SEARCHING',paletteHash=null,lastPaintAt=0,raf=0;
  let beforeDigest=null,afterDigest=null;
  const stage=()=>document.getElementById('cc219-stage');
  const game=()=>window.__CC2_02A__;
  const visual=()=>window.__CC2_VIS20__;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const shortHash=x=>{
    const t=JSON.stringify(x);let h=2166136261;
    for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);
    return (h>>>0).toString(16).padStart(8,'0');
  };
  /**
   * Color values deliberately move this away from the formerly detached
   * candy-pink cloud toward a compact scarlet/oxide creature. Source motion
   * still defines the creature's location, and CC2-21 still clamps visible
   * envelope offset to <13.1% of the body diameter.
   */
  function candidate(base){
    const preset=copy(base);
    Object.assign(preset.material,{
      coreScale:.88,envelopeRadius:1.16,membraneOpacity:.87,
      plasmaDensity:.76,internalGlow:.69,turbulence:.20,
      filamentCount:5,particleBudget:16,shellThickness:2.3,
      translucency:.30,
      shell:'#b73a45',edge:'#ea6c63',hot:'#ffd8bd',
      smoke:'#71323c',blue:'#31c4ff'
    });
    Object.assign(preset.physics,{
      envelopeMass:3.1,springStiffness:46,damping:11.8,drag:.73,
      maxLagWorld:46,velocitySmoothingMs:105,angularInertia:.34,
      tailLifetimeMs:1300,trailSamples:28,turbulence:.21,
      idleBreath:.032,directionLag:1.08,recoil:.65
    });
    Object.assign(preset.performance,{
      trailBudget:28,maxDpr:1.5,resolutionScale:1,
      glowQuality:.88,reducedMotion:'system'
    });
    preset.meta={...preset.meta,name:'Living Pursuer · Oxide Mass (CC2-26)'};
    // The accepted CC2-19 swallow/capture timings and ALL sound event
    // levels are intentionally inherited without modification.
    return preset;
  }
  function record(type,details={}){
    records.push({type,sourceTick,runId:sourceRunId,...details});
    if(records.length>80)records.shift();
  }
  function configure(){
    if(!enabled||ready)return ready;
    const v=visual(),g=game();
    if(!v?.summary?.()?.initialized||!g?.sessionReport)return false;
    try{
      const existing=v.config();
      const next=candidate(existing);
      beforeDigest=g.sessionReport().stateDigest;
      paletteHash=v.loadConfig(next);
      afterDigest=g.sessionReport().stateDigest;
      if(beforeDigest!==afterDigest)
        throw Error('CC226_VISUAL_PRESET_CHANGED_GAME_DIGEST');
      if(JSON.stringify(v.config().capture)!==
        JSON.stringify(existing.capture))
        throw Error('CC226_CAPTURE_TIMING_DRIFT');
      if(JSON.stringify(v.config().sound)!==
        JSON.stringify(existing.sound))
        throw Error('CC226_ACCEPTED_SOUND_DRIFT');
      root.dataset.cc226='on';
      if(stage())stage().dataset.cc226='on';
      ready=true;record('CONFIG_VERIFIED',{paletteHash});
      return true;
    }catch(error){
      errors.push(String(error?.message||error));
      root.dataset.cc226='error';
      return false;
    }
  }
  function selectIntent(){
    // The CC2-20 controller has already projected intent from the source
    // Pursuer sensor, movement and real proximity. Do not second-guess its
    // observer with unsensed Spark coordinates or speculative AI.
    const g=game(),v=visual(),s=g?.snapshot?.();
    const bot=v?.summary?.();
    if(s?.phase==='ended'&&s.endReason==='CAPTURED')
      return 'CAPTURED';
    if(s?.phase==='ended'||!bot)return 'SEARCHING';
    const source=bot.persona;
    return Object.hasOwn(counts,source)?source:'SEARCHING';
  }
  function paint(now){
    raf=requestAnimationFrame(paint);
    if(!enabled)return;
    if(!ready){configure();return;}
    if(now-lastPaintAt<33)return; // bounded 30 Hz material state labels
    lastPaintAt=now;frames++;
    const s=game()?.snapshot?.();
    const view=visual()?.summary?.();
    if(!s||!view)return;
    const area=stage();
    if(!area)return;
    if(s.runId!==sourceRunId){
      sourceRunId=s.runId;sourceTick=-1;
      record('RUN_BOUNDARY');
    }
    const intent=selectIntent();
    if(intent!==lastIntent){
      record('INTENT',{from:lastIntent,to:intent});
      lastIntent=intent;
    }
    if(s.tick!==sourceTick){
      counts[intent]=(counts[intent]||0)+1;
      sourceTick=s.tick;
    }
    area.dataset.cc226Intent=intent;
    // Perception controls only a CSS gradient/tint. Source-owned velocity
    // and mass remain solely in the CC2-20 material simulator.
    const radiance={
      SEARCHING:.23,TARGET_ACQUIRED:.42,HUNTING:.61,
      FRUSTRATION:.73,IMMINENT:.88,CAPTURED:.28
    }[intent]??.23;
    area.style.setProperty('--cc226-heat',String(clamp(radiance,0,1)));
    area.style.setProperty('--cc226-phase',
      String(clamp(view.personaIntensity??.35,0,1)));
  }
  function report(){
    const g=game(),v=visual(),st=stage();
    return copy({
      schema:SCHEMA,enabled,ready,frames,sourceTick,sourceRunId,
      intent:lastIntent,counts,materialHash:paletteHash,
      sourceDigest:g?.sessionReport?.()?.stateDigest??null,
      beforeDigest,afterDigest,
      attached:v?.summary?.()?.visualAttachment??null,
      sourcePosition:v?.summary?.()?.sample?.source??null,
      existingCanvasCount:document.querySelectorAll('#cc220-fluid').length,
      additionalCanvasCount:document.querySelectorAll('#cc226-fluid').length,
      stageIntent:st?.dataset.cc226Intent??null,
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      errors,records
    });
  }
  function settings(){
    const host=document.getElementById('cc209-developer-slot');
    if(!host||document.getElementById('cc226-panel'))return;
    const d=document.createElement('details');d.id='cc226-panel';
    const h=document.createElement('summary');
    h.textContent='CC2-26 · Oxide Mass / Pursuer Intent';
    const p=document.createElement('p');
    p.textContent='Read-only, opt-in material study. Original AI, capture, sound and arithmetic remain unchanged.';
    const b=document.createElement('button');b.type='button';
    b.id='cc226-toggle';
    b.textContent=enabled?'Use accepted Pursuer':'Preview Oxide Mass';
    b.onclick=()=>{
      const q=new URLSearchParams(location.search);
      if(enabled)q.delete('cc226');else q.set('cc226','1');
      location.search=q.toString();
    };
    const exportButton=document.createElement('button');
    exportButton.type='button';exportButton.textContent='Export material and telemetry';
    exportButton.onclick=()=>{
      const payload={report:report(),config:visual()?.config?.()??null};
      const url=URL.createObjectURL(new Blob(
        [JSON.stringify(payload,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;
      a.download='cc2-26-living-pursuer-review.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    d.append(h,p,b,exportButton);host.append(d);
  }
  window.__CC2_26__=Object.freeze({
    report,candidate:()=>candidate(visual()?.config?.()??{}),
    enabled:()=>enabled
  });
  function boot(){
    settings();
    if(!enabled)return;
    if(!configure()&&errors.length)return;
    raf=requestAnimationFrame(paint);
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
