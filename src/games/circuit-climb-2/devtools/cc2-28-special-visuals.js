/**
 * CC2-28 — Touch-responsive special platforms and truthful event VFX.
 *
 * No full-board canvas, no second enemy, no score changes and no DOM answer
 * judgement. Source: __CC2_02A__.features(), specials(), featureEvents(),
 * specialEvents(), snapshot() and the existing physically rendered buttons.
 *
 * The three mathematical options ALWAYS get identical special markers. A
 * preview in Developer Settings is explicitly visual-only and must NEVER
 * grant a Pulse, charge, points, a Relay shield or a solved row.
 */
(() => {
  'use strict';
  const SCHEMA='cc2-28-vfx/v1';
  const params=new URLSearchParams(location.search);
  const enabled=params.get('cc228')==='1';
  const $=id=>document.getElementById(id);
  const api=()=>window.__CC2_02A__;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const clone=x=>JSON.parse(JSON.stringify(x));
  const defaultPreset=Object.freeze({
    schema:SCHEMA,material:'mineral',intensity:.75,
    loopSpeed:.8,particleCount:8,lowSensory:false,
    soundEnabled:true,soundVolume:.32
  });
  const allowedMaterials=['mineral','glass','wire'];
  let preset=clone(defaultPreset),audioCtx=null,audioUnlocked=false;
  let runId=null,sourceTick=-1,frames=0,paintCount=0,shown=0;
  let seenSpecial=new Set(),seenFeature=new Set(),lastVisual=0;
  let liveChip=null,announcement=null,briefUntil=0;
  let currentTag='NORMAL',currentHazard='IDLE',lastDigest=null;
  let materialPreviewCount=0,primaryInputs=0,errors=[];
  let sequence=0,ring=null,ringUntil=0,ringOrigin=null;
  let sampleStatus=null,settingsPanel=null,configText=null;
  let demoPreview=null;

  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||
      JSON.stringify(Object.keys(raw).sort())!==
      JSON.stringify(Object.keys(defaultPreset).sort())||
      raw.schema!==SCHEMA)throw Error('CC228_VFX_SCHEMA');
    if(!allowedMaterials.includes(raw.material))throw Error('CC228_MATERIAL');
    for(const [key,a,b] of [
      ['intensity',0,1],['loopSpeed',.2,2.2],
      ['particleCount',0,20],['soundVolume',0,1]
    ]){
      if(typeof raw[key]!=='number'||!Number.isFinite(raw[key])||
        raw[key]<a||raw[key]>b)
        throw Error('CC228_VFX_RANGE_'+key);
    }
    if(!Number.isInteger(raw.particleCount)||
      typeof raw.lowSensory!=='boolean'||
      typeof raw.soundEnabled!=='boolean')
      throw Error('CC228_VFX_BOOLEAN');
    return clone(raw);
  }
  function isReduced(){
    return preset.lowSensory||
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function applyPreset(raw){
    const next=validate(raw),before=api()?.sessionReport?.()?.stateDigest??null;
    preset=next;
    const root=document.documentElement;
    root.dataset.cc228Material=preset.material;
    root.dataset.cc228Reduced=isReduced()?'yes':'no';
    root.style.setProperty('--cc228-intensity',String(preset.intensity));
    root.style.setProperty('--cc228-loop',String(1/preset.loopSpeed));
    root.style.setProperty('--cc228-density',
      String(Math.max(0,Math.min(20,preset.particleCount))));
    const after=api()?.sessionReport?.()?.stateDigest??null;
    if(before!==null&&before!==after)
      throw Error('CC228_VFX_MODIFIED_GAME_DIGEST');
    if(configText)configText.value=JSON.stringify(preset,null,2);
    if(sampleStatus)sampleStatus.textContent=
      'Material '+preset.material+' · '+(isReduced()?'low-motion':'animated')+
      ' · game authority unchanged';
    return clone(preset);
  }
  function buildLabel(kind,modifier,special){
    const pieces=[];
    if(modifier==='CAPACITOR')pieces.push('CAPACITOR · bonus charge');
    if(modifier==='RELAY')pieces.push('RELAY · grounding protection');
    if(special?.nextRowSurge)pieces.push('SURGE · row-wide hazard');
    return pieces.length?pieces.join(' + '):'STANDARD';
  }
  function decorateChoice(button,kind,description){
    if(button.dataset.cc228Kind!==kind)button.dataset.cc228Kind=kind;
    button.dataset.cc228Special=description;
    if(!button.querySelector('.cc228-sigil')){
      const sigil=document.createElement('span');
      sigil.className='cc228-sigil';sigil.setAttribute('aria-hidden','true');
      const mark=document.createElement('span');
      mark.className='cc228-glyph';mark.setAttribute('aria-hidden','true');
      const circuits=document.createElement('span');
      circuits.className='cc228-circuits';
      const trail=document.createElement('span');
      trail.className='cc228-loop';
      const motes=document.createElement('span');
      motes.className='cc228-motes';
      for(let i=0;i<4;i++){
        const m=document.createElement('i');m.style.setProperty('--index',String(i));
        motes.append(m);
      }
      sigil.append(circuits,trail,motes,mark);
      button.append(sigil);
      // An apparent press animates instantly without submitting a second
      // selection or changing any platform input handler.
      button.addEventListener('pointerdown',()=>{
        button.dataset.cc228Touch='on';primaryInputs++;
      });
      for(const event of ['pointerup','pointercancel','pointerleave'])
        button.addEventListener(event,()=>{
          delete button.dataset.cc228Touch;
        });
    }
    const mark=button.querySelector('.cc228-glyph');
    if(mark)mark.textContent=kind==='CAPACITOR'?'✦':
      kind==='RELAY'?'⟡':kind==='SURGE'?'ϟ':'';
    button.title=description==='STANDARD'?'Normal mathematical platform':
      description+'; all three options have the same special property.';
    button.setAttribute('aria-describedby','cc228-description');
    button.dataset.cc228Combo=kind==='SURGE'&&
      description.includes('RELAY')?'on':'off';
  }
  function syncOptions(){
    const game=api(),s=game?.snapshot?.(),f=game?.features?.(),
      special=game?.specials?.();
    if(!s||!f||!special)return;
    const mod=f.nextModifier||'NORMAL';
    const kind=special.nextRowSurge?'SURGE':
      mod==='CAPACITOR'||mod==='RELAY'?mod:'NORMAL';
    const description=buildLabel(kind,mod,special);
    currentTag=kind;currentHazard=special.phase;
    const buttons=[...document.querySelectorAll('#choices button.choice')];
    for(const button of buttons)decorateChoice(button,kind,description);
    if(liveChip){
      const guard=special.guardRowsRemaining;
      const active=special.phase==='ACTIVE',warning=special.phase==='WARNING';
      let message='';
      if(warning)message='⚡ SURGE WARNING · '+Math.round(
        (1-special.warningProgress)*100)+'% until active';
      else if(active)message='⚡ SURGE ACTIVE · +7% only if Pursuer sees Spark';
      else if(guard>0)message='⟡ RELAY GUARD · protects next row ('+guard+')';
      else if(kind==='SURGE')message='ϟ NEXT ROW · SURGE · correct landing starts warning';
      else if(mod==='CAPACITOR')message='✦ CAPACITOR · correct landing earns bonus charge';
      else if(mod==='RELAY')message='⟡ RELAY · correct landing grounds an active surge';
      liveChip.textContent=message;liveChip.hidden=!message;
      liveChip.dataset.cc228Phase=special.phase;
    }
    const pulse=$('pulse');
    if(pulse){
      pulse.dataset.cc228Ready=f.pulseAvailable?'yes':'no';
      pulse.dataset.cc228Range=f.targetInRange?'in':'out';
      const meaning=f.pulseAvailable?
        f.targetInRange?
          'Circuit Pulse ready. Nearby Pursuer in range. Will slow it and discharge an active Surge.':
          'Circuit Pulse ready, but Pursuer is out of range. Using Pulse will SPEND charge without slowing it.':
        'Circuit Pulse charging. '+f.charge+' of '+f.capacity+
          ' units. Requires full charge and grounded Spark.';
      pulse.title=meaning;
      pulse.setAttribute('aria-label',meaning);
    }
    const desc=$('cc228-description');
    if(desc&&desc.textContent!==description)
      desc.textContent=description+'; same status on all three choices.';
    const guide=$('cc228-next');
    if(guide){
      const row=s.completedRows+1;
      const nextCap=Array.from({length:16},(_,i)=>row+i)
        .find(x=>x>4&&x%6===0&&x%4!==0);
      const nextRelay=Array.from({length:16},(_,i)=>row+i)
        .find(x=>x>4&&x%4===0);
      const nextSurge=Array.from({length:14},(_,i)=>row+i)
        .find(x=>x>4&&x%7===0);
      const parts=[
        nextCap?'Capacitor '+nextCap:null,
        nextRelay?'Relay '+nextRelay:null,
        nextSurge?'Surge '+nextSurge:null
      ].filter(Boolean);
      guide.textContent='Upcoming · '+parts.join(' · ');
    }
  }
  function audioAvailable(){
    if(!preset.soundEnabled||!audioUnlocked||!enabled)return false;
    const a=$('cc209b-audio-toggle'),b=$('soundToggle');
    if(a?.getAttribute('aria-pressed')==='false'||
       b?.getAttribute('aria-pressed')==='false')
      return false;
    return true;
  }
  function sound(kind){
    if(!audioAvailable()||isReduced())return;
    try{
      const Type=window.AudioContext||window.webkitAudioContext;
      if(!Type)return;
      audioCtx??=new Type();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
      const data={
        surge:[220,118,.13,'sawtooth'],
        active:[106,92,.13,'triangle'],
        ground:[225,340,.18,'sine'],
        discharge:[440,142,.22,'triangle']
      }[kind];
      if(!data)return;
      const [start,end,duration,type]=data;
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      osc.type=type;
      const at=audioCtx.currentTime+.005;
      osc.frequency.setValueAtTime(start,at);
      osc.frequency.exponentialRampToValueAtTime(end,at+duration);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(.00011,.019*preset.soundVolume),at+.016);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain);gain.connect(audioCtx.destination);
      osc.start(at);osc.stop(at+duration+.025);
    }catch(e){errors.push('AUDIO '+String(e?.message||e));}
  }
  function flash(text,kind,fromDemo=false){
    if(!announcement)return;
    announcement.textContent=text;
    announcement.hidden=false;
    announcement.dataset.cc228Type=kind;
    announcement.style.animation='none';
    // Force a local animation restart only; no layout of the game board.
    announcement.offsetWidth;
    announcement.style.animation='';
    briefUntil=performance.now()+1250;shown++;
    if(fromDemo)materialPreviewCount++;
  }
  function pulseRing(kind){
    if(isReduced()||!ring)return;
    const board=$('board'),shell=$('cc219-shell');
    if(!board||!shell)return;
    const a=board.getBoundingClientRect(),b=shell.getBoundingClientRect();
    if(!a.width||!b.width)return;
    const x=b.left+b.width/2-a.left,y=b.top+b.height/2-a.top;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    ring.style.left=x+'px';ring.style.top=y+'px';
    ring.dataset.cc228Type=kind;
    ring.hidden=false;
    ring.style.animation='none';ring.offsetWidth;ring.style.animation='';
    ringUntil=performance.now()+680;ringOrigin={x,y};
  }
  function onSpecial(e){
    const val=Number(e.detail?.earned??0);
    if(e.type==='CAPACITOR_BONUS'){
      flash(val>0?'CAPACITOR · +'+val+' CHARGE':'CAPACITOR · CHARGE FULL',
        'capacitor');
      return;
    }
    if(e.type==='RELAY_GUARD_EARNED'){
      flash('RELAY · GROUND LINK CHARGED','relay');
      return;
    }
    if(e.type==='SURGE_WARNING'){
      flash('SURGE · ELECTRICAL FIELD CHARGING','surge');sound('surge');
      return;
    }
    if(e.type==='SURGE_ACTIVE'){
      flash('SURGE ACTIVE · MOVE OR BREAK PURSUER SIGHT','surge');
      sound('active');return;
    }
    if(e.type==='SURGE_GROUNDED'){
      flash('RELAY GROUNDS SURGE','ground');
      pulseRing('ground');sound('ground');return;
    }
    if(e.type==='SURGE_DISCHARGED'){
      flash('PULSE DISCHARGES SURGE','discharge');
      pulseRing('discharge');sound('discharge');return;
    }
  }
  function onFeature(e){
    if(e.type!=='ABILITY_ACTIVATED')return;
    if(e.detail.affected){
      flash('PULSE HIT · PURSUER SLOWED','discharge');
      pulseRing('discharge');
    }else flash('PULSE MISS · CHARGE SPENT','miss');
  }
  /**
   * Post-run special record is read-only: no extra score, points, badges or
   * solved equations. It appears within the EXISTING optional statistics,
   * after the primary CC2-25 replay and verified score hierarchy.
   */
  function renderFinalRecord(){
    const game=api(),s=game?.snapshot?.(),special=game?.specials?.();
    const panel=$('summaryPanel');
    if(!s||!special||s.phase!=='ended'||!panel||panel.hidden)return;
    const parent=panel.querySelector('.cc225-breakdown')||
      panel.querySelector('.summary-card');
    if(!parent)return;
    let box=$('cc228-final-record');
    if(!box){
      box=document.createElement('section');
      box.id='cc228-final-record';
      box.setAttribute('aria-label','Source-verified special platform record');
      parent.append(box);
    }
    const key=s.runId+':'+special.completedRows+':'+
      JSON.stringify(special.counters);
    if(box.dataset.reportKey===key)return;
    box.dataset.reportKey=key;
    const heading=document.createElement('strong');
    heading.textContent='SPECIAL PLATFORMS · VERIFIED EVENTS';
    const description=document.createElement('p');
    const c=special.counters;
    description.textContent='Capacitors '+c.capacitors+
      ' · Relays '+c.relays+
      ' · Surge rows '+c.surges+
      ' · Grounded '+c.grounded+
      ' · Pulse discharged '+c.discharged+
      ' · Activated '+c.activated;
    box.replaceChildren(heading,description);
  }
  function sourceEvents(){
    const game=api(),s=game?.snapshot?.();
    if(!s||!game?.specials?.())return;
    if(runId!==s.runId){
      runId=s.runId;sourceTick=-1;sequence=0;
      seenSpecial.clear();seenFeature.clear();lastDigest=null;
      if(announcement)announcement.hidden=true;
      if(ring)ring.hidden=true;
    }
    const newSpecial=game.specialEvents?.()||[];
    for(const e of newSpecial){
      if(e.runId!==s.runId||seenSpecial.has(e.id))continue;
      seenSpecial.add(e.id);
      onSpecial(e);sequence++;
    }
    const features=game.featureEvents?.()||[];
    for(const e of features){
      const id=e.runId+'/'+e.id;
      if(e.runId!==s.runId||seenFeature.has(id))continue;
      seenFeature.add(id);onFeature(e);
    }
    sourceTick=s.tick;
    lastDigest=game.sessionReport?.()?.stateDigest??null;
  }
  function designer(){
    const host=$('cc209-developer-slot');
    if(!host||$('cc228-panel'))return;
    const panel=document.createElement('details');
    panel.id='cc228-panel';settingsPanel=panel;
    const title=document.createElement('summary');
    title.textContent='CC2-28 · Special Platform Studio';
    const p=document.createElement('p');
    p.textContent='Optional real Surge, Relay counterplay and Pulse strategy. '+ 
      'The samples below are VFX PREVIEWS ONLY and do not solve equations, '+ 
      'earn charge or trigger actual hazards.';
    panel.append(title,p);
    const enable=document.createElement('button');
    enable.type='button';enable.textContent=enabled?
      'Return to original specials':'Enable source-backed special gameplay';
    enable.id='cc228-mode-toggle';
    enable.onclick=()=>{
      const q=new URLSearchParams(location.search);
      if(enabled)q.delete('cc228');else q.set('cc228','1');
      location.search=q.toString();
    };
    panel.append(enable);
    const samples=document.createElement('div');
    samples.className='cc228-samples';
    for(const [kind,label] of [
      ['capacitor','✦ Capacitor'],['relay','⟡ Relay'],
      ['surge','ϟ Surge'],['discharge','◈ Pulse']
    ]){
      const button=document.createElement('button');
      button.type='button';button.textContent=label;
      button.dataset.cc228Sample=kind;
      button.onclick=()=>{
        const before=api()?.sessionReport?.()?.stateDigest??null;
        flash('VISUAL PREVIEW ONLY · '+kind.toUpperCase(),kind,true);
        if(sampleStatus)sampleStatus.textContent='Preview '+kind+
          ' · NO gameplay event or charge granted';
        const after=api()?.sessionReport?.()?.stateDigest??null;
        if(before!==after)errors.push('PREVIEW_CHANGED_GAME_DIGEST');
      };
      samples.append(button);
    }
    panel.append(samples);
    const label=document.createElement('label');
    label.textContent='Material ';const material=document.createElement('select');
    for(const name of allowedMaterials){
      const op=document.createElement('option');
      op.value=name;op.textContent=name;material.append(op);
    }
    material.value=preset.material;
    material.onchange=()=>applyPreset({...preset,material:material.value});
    label.append(material);panel.append(label);
    for(const [key,min,max,step] of [
      ['intensity',0,1,.05],['loopSpeed',.2,2.2,.1],
      ['particleCount',0,20,1],['soundVolume',0,1,.05]
    ]){
      const label=document.createElement('label');
      label.textContent=' '+key+' ';
      const input=document.createElement('input');
      input.type='range';input.min=String(min);input.max=String(max);
      input.step=String(step);input.value=String(preset[key]);
      const value=document.createElement('output');value.textContent=input.value;
      input.oninput=()=>value.textContent=input.value;
      input.onchange=()=>applyPreset({...preset,[key]:Number(input.value)});
      label.append(input,value);panel.append(label);
    }
    for(const [key,text] of [
      ['lowSensory','Low-sensory / motion'],
      ['soundEnabled','Special-event audio']
    ]){
      const label=document.createElement('label');
      const input=document.createElement('input');input.type='checkbox';
      input.checked=preset[key];
      input.onchange=()=>applyPreset({...preset,[key]:input.checked});
      label.append(input,document.createTextNode(' '+text));panel.append(label);
    }
    const controls=document.createElement('div');
    controls.className='cc228-settings-actions';
    const addButton=(label,fn)=>{
      const b=document.createElement('button');b.type='button';
      b.textContent=label;b.onclick=fn;controls.append(b);
    };
    addButton('Reset look',()=>applyPreset(defaultPreset));
    addButton('Export preset',()=>{
      const text=JSON.stringify(preset,null,2);
      const url=URL.createObjectURL(new Blob(
        [text],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;
      link.download='cc2-28-special-vfx.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    addButton('Apply pasted JSON',()=>{
      try{applyPreset(JSON.parse(configText.value))}
      catch(e){if(sampleStatus)sampleStatus.textContent=
        'Preset rejected: '+String(e?.message||e)}
    });
    panel.append(controls);
    configText=document.createElement('textarea');
    configText.id='cc228-config';configText.rows=7;
    configText.setAttribute('aria-label','Special VFX configuration JSON');
    panel.append(configText);
    sampleStatus=document.createElement('p');
    sampleStatus.id='cc228-sample-status';
    sampleStatus.setAttribute('aria-live','polite');panel.append(sampleStatus);
    host.append(panel);
    applyPreset(preset);
  }
  function install(){
    designer();
    if(!enabled)return;
    const guide=$('cc209c-special-guide');
    if(guide&&!$('cc228-help-note')){
      const p=document.createElement('p');p.id='cc228-help-note';
      p.textContent='NEW EXPERIMENT — SURGE: every seventh completed row is a row-wide '+
        'electrical hazard, clearly marked on ALL three choices. A correct '+
        'landing begins a 45-tick warning and then a brief +7% Pursuer '+
        'pressure only when it really sees Spark. A completed Relay '+
        'grounds a live Surge and protects the following row; an in-range '+
        'earned Pulse also discharges it. Neither changes your equation.';
      guide.append(p);
    }
    const board=$('board');
    const metadata=document.querySelector('.hud-metadata');
    if(!board||!metadata){errors.push('BOARD_OR_HUD_MISSING');return;}
    const chip=document.createElement('div');
    chip.id='cc228-live';chip.hidden=true;
    chip.setAttribute('role','status');
    chip.setAttribute('aria-live','off');
    metadata.append(chip);liveChip=chip;
    const desc=document.createElement('span');
    desc.id='cc228-description';desc.className='cc228-sr-only';
    metadata.append(desc);
    const upcoming=document.createElement('div');
    upcoming.id='cc228-next';upcoming.className='cc228-next';
    upcoming.setAttribute('aria-live','off');
    metadata.append(upcoming);
    const feedback=document.createElement('div');
    feedback.id='cc228-feedback';feedback.hidden=true;
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    board.append(feedback);announcement=feedback;
    const wave=document.createElement('div');
    wave.id='cc228-wave';wave.hidden=true;
    wave.setAttribute('aria-hidden','true');
    board.append(wave);ring=wave;
    document.documentElement.dataset.cc228='on';
    applyPreset(preset);
    // Audio unlock is always a direct user gesture, never an autoplay.
    document.addEventListener('pointerdown',()=>{
      audioUnlocked=true;
    },{capture:true,passive:true});
    requestAnimationFrame(frame);
  }
  function frame(now){
    requestAnimationFrame(frame);
    frames++;
    if(now-lastVisual<32)return;
    lastVisual=now;
    try{
      if(api()?.specials?.()){
        syncOptions();sourceEvents();renderFinalRecord();paintCount++;
      }
      if(briefUntil>0&&now>briefUntil&&announcement){
        announcement.hidden=true;briefUntil=0;
      }
      if(ringUntil>0&&now>ringUntil&&ring){
        ring.hidden=true;ringUntil=0;
      }
    }catch(error){
      errors.push(String(error?.message||error));
      if(errors.length>50)errors.shift();
    }
  }
  function report(){
    const special=api()?.specials?.();
    const f=api()?.features?.();
    const buttons=[...document.querySelectorAll('#choices button.choice')];
    return {
      schema:SCHEMA,enabled,frames,paintCount,runId,sourceTick,
      currentTag,currentHazard,shown,primaryInputs,
      materialPreviewCount,preset:clone(preset),
      choices:buttons.map(b=>({
        platformId:b.dataset.platformId,kind:b.dataset.cc228Kind??null,
        special:b.dataset.cc228Special??null
      })),
      allChoicesSameTag:buttons.length>0&&
        buttons.every(b=>b.dataset.cc228Kind===buttons[0].dataset.cc228Kind),
      special:special??null,features:f?{
        charge:f.charge,capacity:f.capacity,
        pulseAvailable:f.pulseAvailable,targetInRange:f.targetInRange
      }:null,
      sourceDigest:lastDigest,
      extraCanvasCount:document.querySelectorAll('#cc228-canvas').length,
      feedbackText:announcement?.hidden?null:announcement?.textContent,
      liveText:liveChip?.hidden?null:liveChip?.textContent,
      errors:errors.slice(-30),
    };
  }
  window.__CC2_28__=Object.freeze({
    report,enabled:()=>enabled,config:()=>clone(preset),
    applyConfig:raw=>applyPreset(raw),
    reset:()=>applyPreset(defaultPreset),
    preview:kind=>{
      if(!['capacitor','relay','surge','discharge'].includes(kind))
        throw Error('CC228_PREVIEW_KIND');
      const before=api()?.sessionReport?.()?.stateDigest??null;
      flash('VISUAL PREVIEW ONLY · '+kind.toUpperCase(),kind,true);
      const after=api()?.sessionReport?.()?.stateDigest??null;
      if(before!==after)throw Error('CC228_PREVIEW_SOURCE_EDIT');
      return report();
    }
  });
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
