/**
 * CC2-46C — MOLASSES SIGNATURE / Activation and Struggle Choreography.
 *
 * This is a camera-projected PRESENTATION of SOURCE events, never a second
 * ability engine. Source records alone authorize CAST, CONTACT and RELEASE.
 *
 * ACT I  (0–8 source ticks): Guardian gathers its thick syrup
 * ACT II (8–32): it expels one substantial, coherent bolus and tether
 * ACT III(32–57): bolus splats into a thick, green horizontal liquid meniscus
 * ACT IV (thereafter): the true Pursuer struggles through the pool, creasing
 *                     a bright forward bow wave and heavy dragged wake
 * ACT V  (SOURCE exits): suction release; wake decays at source tick rate
 *
 * The ordinary 46B source speed remains 0.20x on real contact. All phase
 * and material controls affect appearance only. WebAudio triggers on actual
 * receipt IDs, not frame count; never play unearned sounds.
 *
 * This script is inlined AFTER the 46B source-painted underlay, and BEFORE
 * the actual Heritage visible canvas adapter. ?cc246c=0 restores exact 46B.
 */
(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  const enabled=params.get('cc246c')==='1'&&
    params.get('cc246b')==='1';
  if(enabled)document.documentElement.classList.add('cc246c-syrup');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULT=Object.freeze({
    thickness:86,sheen:75,splash:86,struggle:78,volume:62,
  });
  let config={...DEFAULT},seen=new Set(),runId=null,lastReceipt=null;
  let audio=null,played=0,cues=[],lastSquelchTick=-1;
  let rendered=0,contactFrames=0,activePhase='IDLE',lastStage=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const color=(r,g,b,a)=>'rgba('+r+','+g+','+b+','+clamp(a,0,1)+')';
  const api=()=>window.__CC2_02A__;
  function settings(){return Object.freeze({...config,enabled,reducedMotion:reduced});}
  function setControl(key,value){
    if(!enabled)return false;
    if(!Object.hasOwn(DEFAULT,key))throw Error('CC246C_CONTROL_UNKNOWN');
    if(!Number.isInteger(value)||value<0||value>100)
      throw Error('CC246C_CONTROL_BOUNDS');
    config={...config,[key]:value};
    const input=document.getElementById('cc246c-'+key);
    const output=document.getElementById('cc246c-'+key+'-value');
    if(input)input.value=String(value);
    if(output)output.textContent=value+'%';
    return true;
  }
  const AUDIO_MAX=.036;
  function unlock(){
    if(!enabled||audio)return;
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    try{
      audio=new A();
      if(audio.state==='suspended')void audio.resume().catch(()=>{});
    }catch{audio=null;}
  }
  // A real user gesture is the ONLY way to initialize sound; no autoplays.
  if(enabled)document.addEventListener('pointerdown',unlock,
    {passive:true,capture:true});
  function soundAllowed(){
    return enabled&&config.volume>0&&audio&&audio.state==='running'&&
      window.__CC2_30__?.config?.sound!==false;
  }
  function tone(ctx,frequency,delay,duration,gain,kind='triangle',bend=.58){
    const t=ctx.currentTime+delay;
    const osc=ctx.createOscillator(),amp=ctx.createGain(),
      filter=ctx.createBiquadFilter();
    osc.type=kind;osc.frequency.setValueAtTime(frequency,t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(42,frequency*bend),
      t+duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(760,t);
    filter.frequency.exponentialRampToValueAtTime(170,t+duration);
    amp.gain.setValueAtTime(.00001,t);
    amp.gain.exponentialRampToValueAtTime(
      Math.min(AUDIO_MAX,gain*config.volume/100),t+.013);
    amp.gain.exponentialRampToValueAtTime(.00001,t+duration);
    osc.connect(filter);filter.connect(amp);amp.connect(ctx.destination);
    osc.start(t);osc.stop(t+duration+.014);
  }
  function playCue(kind,tick){
    if(!soundAllowed())return false;
    try{
      const c=audio;
      // Tight, slightly wet percussion: distinct wood-suction and bass
      // bubbles, not a layer of uncontrolled rapid high-frequency clicks.
      if(kind==='CAST'){
        tone(c,230,0,.12,.027,'triangle',.51);
        tone(c,108,.06,.27,.024,'sine',.48);
        tone(c,160,.18,.15,.011,'triangle',.45);
      }else if(kind==='TRAP'){
        tone(c,127,0,.21,.035,'triangle',.49);
        tone(c,68,.072,.34,.029,'sine',.65);
      }else if(kind==='RELEASE'){
        tone(c,72,0,.13,.023,'sine',1.73);
        tone(c,170,.11,.14,.014,'triangle',1.33);
      }else if(kind==='SQUELCH'){
        const note=98+((tick%3)*17);
        tone(c,note,0,.13,.015,'triangle',.53);
        tone(c,note*.58,.05,.13,.011,'sine',.64);
      }else return false;
      played++;return true;
    }catch{return false;}
  }
  function processReceipts(creature,state){
    if(!creature||!state)return;
    if(runId!==state.runId){
      runId=state.runId;seen=new Set();cues=[];played=0;
      lastReceipt=null;lastSquelchTick=-1;activePhase='IDLE';
    }
    for(const receipt of creature.receipts||[]){
      if(receipt.runId!==state.runId||seen.has(receipt.id))continue;
      seen.add(receipt.id);
      if(seen.size>180)seen=new Set([...seen].slice(-120));
      const kind=receipt.type;
      if(kind==='FIELD_CAST'||kind==='FIELD_CONTACT_ENTER'||
        kind==='FIELD_CONTACT_EXIT'){
        lastReceipt={id:receipt.id,type:kind,tick:receipt.tick};
        const cue=kind==='FIELD_CAST'?'CAST':
          kind==='FIELD_CONTACT_ENTER'?'TRAP':'RELEASE';
        const sounded=playCue(cue,receipt.tick);
        cues.push({id:receipt.id,type:cue,tick:receipt.tick,
          sounded});
        if(cues.length>32)cues.shift();
      }
    }
  }
  const circle=(ctx,x,y,rx,ry,fill,rotate=0)=>{
    ctx.beginPath();ctx.ellipse(x,y,Math.max(.5,rx),Math.max(.5,ry),
      rotate,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  };
  const ease=t=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
  const phaseAt=age=>age<8?'GATHER':
    age<20?'EJECT':age<32?'STRETCH':age<50?'SPLAT':
    age<75?'SETTLE':'FIELD_LIVE';

  /**
   * Called once per Heritage frame, AFTER 46B surface but BEFORE the actor.
   * All locations are transformed from real WORLD coordinates using the
   * authoritative camera projector. No absolute screen-space assumptions.
   */
  function paintStage(ctx,{state,creature,bot,project,width,height}){
    const baseline={enabled,phase:'IDLE',contact:false,
      eventId:null,syrupDrawn:false,bolusVisible:false,
      surfaceLayer:'under-pursuer',greenHoney:true,played};
    if(!enabled||!state||!creature||!bot||typeof project!=='function')
      return baseline;
    processReceipts(creature,state);
    const field=creature.activeField;
    const contact=Boolean(field&&creature.contactActive&&
      state.phase!=='ended');
    let cast=null;
    if(field)cast=(creature.receipts||[]).slice().reverse().find(e=>
      e.runId===state.runId&&e.type==='FIELD_CAST'&&
      e.detail?.platformId===field.sourcePlatformId)??null;
    const age=cast?Math.max(0,state.tick-cast.tick):Infinity;
    let phase=cast?phaseAt(age):'IDLE';
    if(contact&&phase==='FIELD_LIVE')phase='BOT_STUCK';
    if(!field)phase='IDLE';
    activePhase=phase;
    rendered++;
    if(contact)contactFrames++;
    const pos=project(bot.x,bot.y);
    const thick=clamp(config.thickness/100,0,1);
    const gleam=config.sheen/100,splash=config.splash/100;
    let syrupDrawn=false,bolusVisible=false;
    if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))
      return {...baseline,contact,phase,eventId:cast?.id??null};
    ctx.save();
    try{
      if(field){
        const source=project(field.x,field.y);
        // The FIELD_CAST origin is genuinely the platform where the
        // Guardian was challenged. A detached copy of its source coords,
        // never the current creature screen pos after another source hop.
        if(Number.isFinite(source.x)&&Number.isFinite(source.y)){
          const target=contact?pos:
            project(field.x,field.y+state.world.geometry.rowGap*.55);
          if(age<75){
            const travel=ease((age-8)/31);
            const tetherFade=clamp((52-age)/20,0,1);
            if(age>=8&&age<49){
              const cx=source.x+(target.x-source.x)*travel;
              const cy=source.y+(target.y-source.y)*travel-
                Math.sin(Math.PI*travel)*Math.min(54,width*.12);
              const radius=(10+16*splash)*(.8+Math.sin(Math.PI*travel)*.20);
              ctx.save();
              // A thick coherent spur exits the original Guardian platform;
              // its tail stretches instead of scattering into unrelated dots.
              ctx.lineCap='round';ctx.lineJoin='round';
              ctx.beginPath();ctx.moveTo(source.x,source.y);
              ctx.quadraticCurveTo(
                source.x+(target.x-source.x)*.27,
                source.y-35,
                cx,cy);
              ctx.strokeStyle=color(45,129,55,.25*tetherFade);
              ctx.lineWidth=9+15*thick;ctx.stroke();
              ctx.strokeStyle=color(124,224,86,.58*tetherFade);
              ctx.lineWidth=3.5+5.5*thick;ctx.stroke();
              const bolus=ctx.createRadialGradient(cx-6,cy-7,1,
                cx,cy,radius*1.2);
              bolus.addColorStop(0,color(235,255,155,.94));
              bolus.addColorStop(.37,color(113,196,61,.94));
              bolus.addColorStop(.78,color(36,135,55,.94));
              bolus.addColorStop(1,color(18,91,58,.4));
              circle(ctx,cx,cy,radius*1.15,radius*.86,bolus,
                Math.atan2(target.y-source.y,target.x-source.x));
              ctx.restore();bolusVisible=true;syrupDrawn=true;
            }
            if(age>=29){
              // Impact: the bolus FLATTENS, spreads laterally, then settles.
              const impact=ease((age-29)/23);
              const fade=age<56?1:clamp((75-age)/19,0,1);
              ctx.save();
              const rx=(16+95*impact*splash)*(.65+.35*thick);
              const ry=5+19*thick*(1-impact*.60);
              circle(ctx,target.x,target.y+8,rx,ry,
                color(66,157,49,.34*fade));
              ctx.strokeStyle=color(215,245,143,.68*fade);
              ctx.lineWidth=1.4+3*thick;
              ctx.beginPath();
              ctx.ellipse(target.x,target.y+7,rx,ry*.67,
                0,0,Math.PI*2);ctx.stroke();
              ctx.restore();syrupDrawn=true;
            }
          }
          if(field.coverage==='BELOW_PLATFORM'){
            // A broad GREEN HONEY meniscus, not a full-height green screen.
            const boundary=source.y;
            if(boundary>=-25&&boundary<=height+25){
              const film=ctx.createLinearGradient(
                0,boundary-8,0,boundary+27);
              film.addColorStop(0,color(62,118,48,0));
              film.addColorStop(.25,color(78,158,48,.24*thick));
              film.addColorStop(.48,color(93,192,61,.52*thick));
              film.addColorStop(.67,color(42,132,55,.31*thick));
              film.addColorStop(1,color(34,125,51,0));
              ctx.fillStyle=film;
              ctx.fillRect(0,boundary-8,width,35);
              ctx.beginPath();ctx.moveTo(0,boundary+4);
              ctx.lineTo(width,boundary+4);
              ctx.strokeStyle=color(194,237,124,.55*gleam);
              ctx.lineWidth=1.4+2*thick;ctx.stroke();
              syrupDrawn=true;
            }
          }
        }
      }
      if(contact&&pos.x>=-90&&pos.x<=width+90&&
        pos.y>=-95&&pos.y<=height+95){
        // Not an overlay: this dense footprint lives underneath the
        // Pursuer. Rich translucent green + golden syrup striations impart
        // volume while keeping red bot visibility intact.
        const length=46+47*thick;
        const depth=16+24*thick;
        const angle=(window.__CC2_46B__?.diagnostics?.wakeCount??0)%2;
        const o=ctx.createRadialGradient(pos.x,pos.y+7,1,
          pos.x,pos.y+7,length*.99);
        o.addColorStop(0,color(109,188,67,.79*thick));
        o.addColorStop(.37,color(53,146,53,.71*thick));
        o.addColorStop(.72,color(30,112,58,.50*thick));
        o.addColorStop(1,color(17,90,62,0));
        circle(ctx,pos.x,pos.y+7,length,depth,o);
        circle(ctx,pos.x-13,pos.y+6,length*.68,depth*.46,
          color(80,166,48,.27*thick));
        ctx.beginPath();
        ctx.ellipse(pos.x,pos.y+6,length*.87,depth*.71,
          0,Math.PI*.05,Math.PI*.95);
        ctx.strokeStyle=color(201,230,123,.76*gleam);
        ctx.lineWidth=1.5+3*thick;ctx.stroke();
        // Stretching honey strings/rolls on both sides of the scraping bot.
        for(let i=-1;i<=1;i+=2){
          const sx=pos.x+i*(17+13*thick);
          ctx.beginPath();ctx.moveTo(sx,pos.y-3);
          ctx.bezierCurveTo(sx+i*7,pos.y+5,
            sx+i*17,pos.y+14,sx+i*34,pos.y+11);
          ctx.strokeStyle=color(150,216,80,(.30+.28*gleam)*thick);
          ctx.lineWidth=2+2*thick;ctx.lineCap='round';ctx.stroke();
        }
        // Restrained 2–3 glints on thick viscous surface; no particles
        // that could look like accidental numerical choice highlights.
        for(let i=0;i<3;i++){
          const xx=pos.x+(i-1)*length*.43;
          const yy=pos.y+depth*.53+(i%2?3:-3);
          circle(ctx,xx,yy,3+i*.8,1.3,
            color(236,250,151,.42*gleam));
        }
        syrupDrawn=true;
        if(!reduced&&state.tick>lastSquelchTick+22&&
          state.tick>0&&lastSquelchTick!==-1){
          // Movement-synchronised sound; source contact verified. This
          // is bounded to ONE small squelch in at least 22 source ticks.
          playCue('SQUELCH',state.tick);
          lastSquelchTick=state.tick;
        }else if(lastSquelchTick<0){
          lastSquelchTick=state.tick;
        }
      }else if(!contact)lastSquelchTick=-1;
    }finally{ctx.restore();}
    lastStage={enabled,phase,contact,
      eventId:cast?.id??null,syrupDrawn,bolusVisible,
      played,surfaceLayer:'under-pursuer',greenHoney:true,
      sourceSpeed:contact?creature.fieldMultiplier:1};
    return {...lastStage};
  }
  /**
   * Applied after the actual Pursuer's source canvas translate. It deforms
   * ONLY the pictured bot, never its world collision body or x/y.
   * A slow push, a negative recoil and tail catch-up make effort visible.
   */
  function transformBot(ctx,tick){
    if(!enabled)return false;
    const intensity=config.struggle/100;
    if(intensity<=0)return false;
    const phase=reduced?0:(tick%50)/50*Math.PI*2;
    const drive=Math.sin(phase);
    const compress=1-intensity*(.08+.07*Math.max(0,drive));
    const stretch=1+intensity*(.12+.08*Math.max(0,-drive));
    const tilt=reduced?0:Math.sin(phase*.5)*.055*intensity;
    ctx.translate(0,Math.max(0,drive)*1.9*intensity);
    ctx.transform(stretch,tilt,tilt*.18,compress,0,0);
    return true;
  }
  function updateGuardian(){
    if(!enabled)return;
    const s=api()?.snapshot?.(),c=api()?.creature?.();
    const node=document.querySelector('.cc230-creature');
    if(!s||!c||!node)return;
    if(s.runId!==runId)seen=new Set();
    processReceipts(c,s);
    let phase='IDLE';
    if(c.gate==='QUESTION')phase='GATHER';
    else if(c.activeField){
      const cast=(c.receipts||[]).slice().reverse().find(x=>
        x.type==='FIELD_CAST'&&x.runId===s.runId);
      const age=cast?s.tick-cast.tick:1000;
      phase=age<28?'EJECT':age<62?'DRAIN':'SPENT';
    }else if(c.hop)phase='MOVING';
    else if(c.gate==='AVAILABLE')phase='READY';
    node.dataset.molassesPhase=phase;
    const status=document.querySelector('.cc230-status');
    // A compact causal label persists for the effects' visible life.
    if(status&&c.activeField&&c.contactActive&&
      status.dataset.cc246cContact!=='1'){
      status.textContent='Pursuer stuck in green molasses · 20% speed';
      status.dataset.cc246cContact='1';
    }else if(status&&!c.contactActive)
      status.dataset.cc246cContact='0';
  }
  function setupControls(attempt=0){
    if(!enabled)return;
    const studio=document.querySelector('.cc246b-developer');
    if(!studio){if(attempt<40)setTimeout(()=>setupControls(attempt+1),100);return;}
    if(studio.querySelector('.cc246c-controls'))return;
    const more=document.createElement('details');
    more.open=false;
    more.className='cc246c-controls';
    more.innerHTML='<summary>Green Honey · Signature Effect Lab</summary>'+
      '<p class="cc246c-note">These change syrup material, bot struggle and sound. The already-tested 20% speed is unchanged. Only the independent Molasses challenge activates the real effect.</p>'+
      '<div class="cc246c-grid"></div>'+
      '<button type="button" class="cc246c-reset">Reset honey effect defaults</button>';
    const group=more.querySelector('.cc246c-grid');
    const labels={
      thickness:'Liquid body and coating thickness',
      sheen:'Wet, golden-green gloss',
      splash:'Guardian ejection and splat size',
      struggle:'Pursuer push-and-recoil strength',
      volume:'Suction, sticky motion and release sound',
    };
    for(const key of Object.keys(DEFAULT)){
      const label=document.createElement('label');
      label.textContent=labels[key];
      const input=document.createElement('input');
      input.id='cc246c-'+key;input.type='range';
      input.min='0';input.max='100';input.step='1';
      input.value=String(config[key]);
      const output=document.createElement('output');
      output.id='cc246c-'+key+'-value';
      output.textContent=config[key]+'%';
      input.addEventListener('input',()=>setControl(key,Number(input.value)));
      label.append(input,output);group.appendChild(label);
    }
    more.querySelector('.cc246c-reset').onclick=()=>{
      for(const k of Object.keys(DEFAULT))setControl(k,DEFAULT[k]);
    };
    studio.appendChild(more);
  }
  let lastUpdate=0;
  function frame(now){
    if(now-lastUpdate>=67){lastUpdate=now;updateGuardian();}
    requestAnimationFrame(frame);
  }
  if(enabled){
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',()=>setupControls(),{once:true});
    else setupControls();
    requestAnimationFrame(frame);
  }
  window.__CC2_46C__=Object.freeze({
    enabled,settings,setControl,paintStage,transformBot,
    get diagnostics(){return {
      enabled,phase:activePhase,rendered,contactFrames,played,
      cues:cues.map(x=>({...x})),seen:seen.size,
      layer:'under-pursuer',lastStage:lastStage?{...lastStage}:null,
    };},
  });
})();
