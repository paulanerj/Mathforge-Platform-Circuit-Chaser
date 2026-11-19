/**
 * CC2-30A: a small optional creature overlay using the real browser source.
 * The CC2 engine owns every answer, lifetime, hop and Pursuer field.
 * This controller is deliberately replaceable by a future character renderer.
 */
(() => {
'use strict';
if(new URLSearchParams(location.search).get('cc230')!=='1')return;
const api=()=>window.__CC2_02A__;
const board=document.querySelector('#board');
if(!board)return;
const root=document.createElement('div');
root.className='cc230-root';
root.innerHTML=`<button type="button" class="cc230-creature" aria-label="Challenge Molasses Guardian to cast a slowing field" title="Optional creature: solve a short skip count to slow the pursuer">◉</button>
<div class="cc230-gel" aria-hidden="true">
<span class="cc230-fluid-core"></span><span class="cc230-fluid-thread"></span>
</div>
<section class="cc230-gate" hidden aria-label="Optional creature puzzle" aria-live="polite">
<div class="cc230-kicker">MOLASSES GUARDIAN · OPTIONAL</div>
<div class="cc230-question"></div>
<div class="cc230-options"></div>
<button type="button" class="cc230-decline">Ignore and climb</button>
</section>
<div class="cc230-status" aria-live="polite"></div>`;
board.appendChild(root);
const creature=root.querySelector('.cc230-creature'),gel=root.querySelector('.cc230-gel'),
  gate=root.querySelector('.cc230-gate'),question=root.querySelector('.cc230-question'),
  options=root.querySelector('.cc230-options'),decline=root.querySelector('.cc230-decline'),
  status=root.querySelector('.cc230-status');
let lastQuestion='',lastStatus='',lastEvent='',lastPosition='',lastTick=-1;
let lastDrawAt=0,draws=0,hopFrames=0;
let fluidFrames=0,smoothedPoint=null,fieldProjection=null;
let config={material:'clear-molasses',glow:0.7,flowRate:1,viscosity:0.55,
  bodySize:36,sound:true,gelDensity:.72,slosh:.48,trailLength:.7};
const defaults={...config};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const sound=(pitch=180)=>{if(!config.sound)return;try{
  const A=window.AudioContext||window.webkitAudioContext;
  if(!A)return;
  if(!sound.ctx)sound.ctx=new A();
  if(sound.ctx.state==='suspended')sound.ctx.resume();
  const t=sound.ctx.currentTime,osc=sound.ctx.createOscillator(),
    g=sound.ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(pitch,t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(60,pitch*.57),t+.16);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(.025,t+.015);
  g.gain.exponentialRampToValueAtTime(.0001,t+.2);
  osc.connect(g);g.connect(sound.ctx.destination);osc.start(t);osc.stop(t+.21);
}catch{}};
function validate(raw){
  if(!raw||typeof raw!=='object'||
    Object.keys(raw).sort().join('|')!==Object.keys(defaults).sort().join('|')||
    !['clear-molasses','glass','mineral-gel'].includes(raw.material)||
    typeof raw.sound!=='boolean')throw Error('CC230_VFX_SCHEMA');
  for(const [k,min,max] of [['glow',0,1],['flowRate',.1,2],
    ['viscosity',0,1],['bodySize',26,55],['gelDensity',.1,1],
    ['slosh',0,1],['trailLength',0,1]]){
    if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||
      raw[k]<min||raw[k]>max)throw Error('CC230_VFX_RANGE_'+k);
  }
  return {...raw};
}
function apply(raw){
  config=validate(raw);
  root.style.setProperty('--cc230-glow',String(config.glow));
  root.style.setProperty('--cc230-flow',String(config.flowRate));
  root.style.setProperty('--cc230-viscosity',String(config.viscosity));
  root.style.setProperty('--cc230-size',config.bodySize+'px');
  root.style.setProperty('--cc230-density',String(config.gelDensity));
  root.style.setProperty('--cc230-slosh',String(config.slosh));
  root.style.setProperty('--cc230-trail',String(config.trailLength));
  root.dataset.material=config.material;
  return {...config};
}
function refresh(){
  const a=api(),state=a?.snapshot?.(),c=a?.creature?.();
  if(!state||!c)return;
  if(state.runId!==refresh.runId){
    refresh.runId=state.runId;lastQuestion='';lastEvent='';
    lastPosition='';smoothedPoint=null;fieldProjection=null;
    status.textContent='';
  }
  // Primary platform buttons remain authoritative world projection.
  // The character has its own hitbox and never relocates primary answer controls.
  const buttons=[...board.querySelectorAll('button.choice')];
  const findButton=id=>buttons.find(b=>b.dataset.platformId===id);
  const btn=findButton(c.platformId);
  const boardRect=board.getBoundingClientRect();
  const getPoint=b=>{
    const r=b.getBoundingClientRect();
    return {x:r.left+r.width/2-boardRect.left,
      y:r.top-boardRect.top-31};
  };
  const visible=btn&&c.gate!=='DORMANT'&&
    state.phase!=='ended'&&!state.paused;
  creature.hidden=!visible;
  // Expose the power's existence without fabricating an encounter or
  // granting its mathematical gate. This status is purely instructional.
  if(state.phase==='ready'&&!c.activeField&&!c.question &&
      (!c.receipts.length||!c.receipts.some(e=>e.type==='GATE_SOLVED'))){
    if(c.gate==='AVAILABLE'&&visible){
      status.textContent='GREEN GUARDIAN · tap the creature to slow the killer bot';
    }else if(c.gate==='DORMANT'&&state.completedRows===0){
      status.textContent='Green Guardian arrives after your first climb';
    }
  }
  if(visible){
    const dest=getPoint(btn);
    let {x,y}=dest;
    // Source-owned hop endpoints and ticks: visual physics cannot invent a hop.
    if(c.hop){
      const prior=findButton(c.hop.fromPlatformId);
      if(prior){
        const from=getPoint(prior);
        const fraction=clamp((state.tick-c.hop.startTick)/
          (c.hop.endTick-c.hop.startTick),0,1);
        const eased=fraction*fraction*(3-2*fraction);
        x=from.x+(dest.x-from.x)*eased;
        y=from.y+(dest.y-from.y)*eased-
          Math.sin(Math.PI*fraction)*clamp(boardRect.width*.055,8,26);
        hopFrames++;
      }
    }
    const pos=Math.round(x)+'|'+Math.round(y);
    if(pos!==lastPosition){
      // Viscoelastic body with limited inertia: it follows the SOURCE hop
      // rather than inventing its own destinations. The terminal position
      // is exact; smoothing affects only visible mass/trail displacement.
      if(!smoothedPoint||Math.hypot(x-smoothedPoint.x,y-smoothedPoint.y)>
          boardRect.width*.8)smoothedPoint={x,y};
      const lagX=clamp(smoothedPoint.x-x,-config.bodySize*.62,config.bodySize*.62);
      const lagY=clamp(smoothedPoint.y-y,-config.bodySize*.62,config.bodySize*.62);
      creature.style.setProperty('--cc230-lag-x',
        (lagX*config.trailLength).toFixed(2)+'px');
      creature.style.setProperty('--cc230-lag-y',
        (lagY*config.trailLength).toFixed(2)+'px');
      const response=1-config.viscosity*.58;
      smoothedPoint.x+=(x-smoothedPoint.x)*response;
      smoothedPoint.y+=(y-smoothedPoint.y)*response;
      creature.style.left=x+'px';creature.style.top=y+'px';
      lastPosition=pos;
    }
    creature.disabled=c.gate!=='AVAILABLE'||Boolean(c.hop);
    creature.dataset.phase=c.hop?'HOPPING':c.gate;
  }
  const q=c.question,qKey=q?c.runId+':'+q.deadlineTick:'';
  gate.hidden=!q;
  // Position question near its real creature, rather than an unrelated
  // full-width banner. Keep safe fallback inside the visible board.
  if(q&&visible){
    const top=clamp(parseFloat(creature.style.top||'20')+36,
      8,boardRect.height-190);
    gate.style.top=top+'px';
    gate.style.left=clamp(parseFloat(creature.style.left||'0'),
      170,boardRect.width-170)+'px';
  }
  if(q&&qKey!==lastQuestion){
    lastQuestion=qKey;
    question.textContent=q.sequence.join(' · ')+' · ?';
    options.replaceChildren();
    q.options.forEach(n=>{
      const button=document.createElement('button');
      button.type='button';button.className='cc230-answer';
      button.textContent=String(n);
      button.onclick=()=>{
        const r=a.answerCreature(n);
        status.textContent=r.correct?
          (a.creature()?.activeField?.coverage==='BELOW_PLATFORM'?
            'Molasses blanket active · Pursuer 50% speed below line':
            'Field charged · Pursuer slows in gel'):
          'No field earned · keep climbing';
        sound(r.correct?320:130);lastStatus=status.textContent;
        refresh();
      };
      options.appendChild(button);
    });
    sound(250);
  }
  if(!q)lastQuestion='';
  const field=c.activeField;
  root.dataset.contact=c.contactActive?'stuck':'clear';
  if(field){
    // Only the source runtime defines the real field and contact. The
    // blanket mode is world-wide BELOW a fixed activation elevation, not
    // a radius around the currently moving creature.
    const blanket=field.coverage==='BELOW_PLATFORM';
    const target=findButton(blanket?field.sourcePlatformId:c.platformId);
    const reference=target||buttons[0]||null;
    if(reference){
      const b=reference.getBoundingClientRect();
      let x=b.left+b.width/2-boardRect.left;
      let y=b.top+b.height/2-boardRect.top;
      if(blanket){
        // Project the permanently anchored WORLD Y through the same actual
        // source camera that paints Spark and the platform network.
        // This stays correct after arbitrarily many scrolling rows.
        const view=a.rendererStats?.();
        if(view&&Number.isFinite(view.cameraY)&&
          Number.isFinite(view.effectiveZoom)){
          y=(field.y-view.cameraY)*view.effectiveZoom*
            (boardRect.width/state.world.geometry.logicalWidth);
        }
      }
      gel.hidden=false;
      gel.dataset.coverage=blanket?'blanket':'local';
      gel.dataset.contact=c.contactActive?'stuck':'clear';
      gel.style.opacity=String(.24+config.gelDensity*.45);
      if(blanket){
        // Entire horizontal playfield from source demarcation DOWN.
        // Display only the portion actually within the camera/board.
        const top=clamp(y,0,boardRect.height);
        const height=Math.max(0,boardRect.height-top);
        gel.style.left='0px';gel.style.top=top+'px';
        gel.style.width=boardRect.width+'px';
        gel.style.height=height+'px';
        // The blanket affects only the killer bot. Keep the learner Spark
        // visually unobscured, even when it is below the boundary.
        const view=a.rendererStats?.();
        if(view?.visualSparkPosition){
          const sx=(boardRect.width/2+
            (view.visualSparkPosition.x-state.world.geometry.logicalWidth/2)*
              view.horizontalCameraScale)*
              (boardRect.width/state.world.geometry.logicalWidth);
          const sy=(view.visualSparkPosition.y-view.cameraY)*
            view.effectiveZoom*(boardRect.width/state.world.geometry.logicalWidth)-top;
          gel.style.setProperty('--cc230-spark-x',sx.toFixed(1)+'px');
          gel.style.setProperty('--cc230-spark-y',sy.toFixed(1)+'px');
        }
        gel.style.removeProperty('--cc230-field-diameter');
        gel.dataset.direction='down';
        const tickPhase=state.tick;
        gel.style.setProperty('--cc230-slosh-x',
          (Math.sin(tickPhase*.04*config.flowRate)*config.slosh*9).toFixed(2)+'px');
        gel.style.setProperty('--cc230-slosh-y',
          (Math.cos(tickPhase*.025*config.flowRate)*config.slosh*5).toFixed(2)+'px');
        fieldProjection={
          coverage:'BELOW_PLATFORM',
          sourcePlatformId:field.sourcePlatformId,
          sourceRow:field.sourceRow,
          boundaryWorldY:field.y,
          visibleBoundaryY:top,
          cameraAligned:true,playerExcluded:true,
          width:boardRect.width,height,
          fullWidth:true,extendsDown:true,
          sourceContact:c.contactActive,
        };
      }else{
        const colPx=buttons.length>=2?
          Math.abs(getPoint(buttons[1]).x-getPoint(buttons[0]).x):
          boardRect.width/3;
        const radiusRows=field.radius/state.world.geometry.rowGap;
        const radiusPx=clamp(radiusRows*Math.max(36,Math.min(colPx,boardRect.height*.24)),
          24,boardRect.width*.38);
        const diameter=radiusPx*2;
        gel.style.left=x+'px';gel.style.top=y+'px';
        gel.style.removeProperty('width');gel.style.removeProperty('height');
        gel.style.setProperty('--cc230-field-diameter',diameter+'px');
        gel.dataset.direction=field.direction;
        const tickPhase=state.tick-(field.expiresTick-c.config.fieldTicks);
        gel.style.setProperty('--cc230-slosh-x',
          (Math.sin(tickPhase*.055*config.flowRate)*config.slosh*radiusPx*.22).toFixed(2)+'px');
        gel.style.setProperty('--cc230-slosh-y',
          (Math.cos(tickPhase*.044*config.flowRate)*config.slosh*radiusPx*.15).toFixed(2)+'px');
        fieldProjection={x,y,diameter,radiusPx,direction:field.direction,
          projectedHalfDisc:true,sourceContact:c.contactActive};
      }
      fluidFrames++;
    }else{gel.hidden=true;fieldProjection=null;}
  }else{gel.hidden=true;fieldProjection=null;}
  if(c.receipts.length){
    const ev=c.receipts[c.receipts.length-1];
    if(ev.id!==lastEvent){
      lastEvent=ev.id;
      if(ev.type==='FIELD_CAST'){
        status.textContent=field?.coverage==='BELOW_PLATFORM'?
          'Molasses blanket deployed below guardian platform':
          'Molasses field deployed';
        sound(115);
      }
      if(ev.type==='FIELD_CONTACT_ENTER'){
        status.textContent='Pursuer caught in molasses';sound(88);
      }
      if(ev.type==='FIELD_CONTACT_EXIT'){
        status.textContent=field?.coverage==='BELOW_PLATFORM'?
          'Pursuer crossed above molasses boundary · normal speed':
          'Pursuer broke free of molasses';
        sound(200);
      }
      if(ev.type==='FIELD_EXPIRED')status.textContent='Molasses field evaporated';
      if(ev.type==='GATE_EXPIRED')status.textContent='Creature opportunity expired';
    }
  }
  if(state.tick!==lastTick)lastTick=state.tick;
  draws++;
}
creature.onclick=()=>{
  const r=api()?.offerCreature?.();
  if(r?.ok){sound(290);refresh();}
  else status.textContent=r?.reason||'Creature not ready';
};
decline.onclick=()=>{api()?.declineCreature?.();refresh();};
apply(defaults);
const panel=document.createElement('details');
panel.className='cc230-studio';
panel.innerHTML=`<summary>Molasses Creature Studio · experimental</summary>
<div class="cc230-controls"></div><button class="cc230-reset" type="button">Reset visual defaults</button>
<button class="cc230-export" type="button">Copy visual preset</button>
<label>Import visual preset<textarea rows="3" placeholder="Paste cc2-30-vfx JSON"></textarea></label>
<button class="cc230-import" type="button">Apply preset</button>
<p>Visual controls affect only presentation. Source controls below change gameplay only after an explicit restart, with the authoritative preset exported in replay.</p>
<details class="cc230-authority"><summary>Creature physics & timing (restart required)</summary>
<div class="cc230-gameplay-controls"></div>
<button class="cc230-apply-gameplay" type="button">Apply source settings & restart</button>
<button class="cc230-reset-gameplay" type="button">Reset creature gameplay defaults</button>
<button class="cc230-export-gameplay" type="button">Copy creature gameplay preset</button>
<label>Import creature gameplay preset<textarea class="cc230-import-gameplay-data" rows="3" placeholder="Paste cc2-creature/v1 JSON"></textarea></label>
<button class="cc230-import-gameplay" type="button">Load source preset into controls</button>
<output class="cc230-gameplay-message" aria-live="polite"></output>
</details>`;
const controls=panel.querySelector('.cc230-controls');
[['glow',0,1,.05],['flowRate',.1,2,.05],['viscosity',0,1,.05],
  ['bodySize',26,55,1],['gelDensity',.1,1,.05],['slosh',0,1,.05],
  ['trailLength',0,1,.05]].forEach(([key,min,max,step])=>{
  const label=document.createElement('label');
  label.textContent=key+' ';
  const input=document.createElement('input');input.type='range';
  input.min=min;input.max=max;input.step=step;input.value=config[key];
  input.oninput=()=>apply({...config,[key]:Number(input.value)});
  label.appendChild(input);controls.appendChild(label);
});
const material=document.createElement('select');
['clear-molasses','glass','mineral-gel'].forEach(value=>{
  const opt=document.createElement('option');opt.value=value;
  opt.textContent=value;material.appendChild(opt);
});
material.onchange=()=>apply({...config,material:material.value});
controls.appendChild(material);
panel.querySelector('.cc230-reset').onclick=()=>{apply(defaults);material.value=config.material;
  controls.querySelectorAll('input').forEach((el,i)=>
    el.value=config[['glow','flowRate','viscosity','bodySize',
      'gelDensity','slosh','trailLength'][i]]);
};
panel.querySelector('.cc230-export').onclick=()=>navigator.clipboard?.writeText(
  JSON.stringify({schema:'cc2-30-vfx/v2',...config},null,2));
panel.querySelector('.cc230-import').onclick=()=>{
  try{const v=JSON.parse(panel.querySelector('textarea').value);
    if(v.schema==='cc2-30-vfx/v1'){
      delete v.schema;
      apply({...defaults,...v});
    }else if(v.schema==='cc2-30-vfx/v2'){
      delete v.schema;apply(v);
    }else throw Error('Preset version mismatch');
    panel.querySelector('textarea').value='Applied';
  }catch(e){panel.querySelector('textarea').value='Invalid preset: '+e.message;}
};
/**
 * Creature SDK v1 behavior editor. The rendered sprite has NO permission to
 * edit mechanics during a run. A copy of the strict source configuration is
 * round-tripped through the isolated ?cc230Cfg= URL and revalidated by TS.
 */
const sourceDefaults=api()?.creatureConfig?.()||api()?.creature?.()?.config;
let sourceDraft=sourceDefaults?structuredClone(sourceDefaults):null;
const gameplayMessage=panel.querySelector('.cc230-gameplay-message');
const gameplayControls=panel.querySelector('.cc230-gameplay-controls');
const sourceInputs=new Map();
const numericalControls=[
  ['firstEligibleRow',1,15,1,'First encounter row'],
  ['hopEveryTicks',40,600,1,'Hop interval · 60Hz ticks'],
  ['hopTravelTicks',6,80,1,'Hop travel · ticks'],
  ['offerTicks',40,350,1,'Invitation lifetime · ticks'],
  ['challengeWindowTicks',60,600,1,'Passkey time · ticks'],
  ['gateStep',2,9,1,'Skip-count increment'],
  ['fieldTicks',20,600,1,'Local field lifetime · blanket persists all run'],
  ['slowMultiplier',sourceDraft?.fieldMode==='BELOW_PLATFORM'?.10:.55,
    1,.01,'Pursuer remaining speed (0.20 = 80% slowdown)'],
  ['fieldRadiusInRowGaps',.2,1.5,.05,'Gel collision radius · row gaps'],
];
if(sourceDraft){
  for(const [key,min,max,step,label] of numericalControls){
    const control=document.createElement('label');
    control.textContent=label+' ';
    const input=document.createElement('input');
    input.type='range';input.min=min;input.max=max;input.step=step;
    input.value=sourceDraft[key];
    const number=document.createElement('output');
    number.textContent=String(sourceDraft[key]);
    input.oninput=()=>{
      sourceDraft[key]=Number(input.value);
      number.textContent=input.value;
    };
    sourceInputs.set(key,{input,number});
    control.appendChild(input);control.appendChild(number);
    gameplayControls.appendChild(control);
  }
}
function showDraft(){
  if(!sourceDraft)return;
  for(const [key,ui] of sourceInputs){
    ui.input.value=sourceDraft[key];
    ui.number.textContent=String(sourceDraft[key]);
  }
}
function validateDraft(raw){
  if(!raw||raw.schema!=='cc2-creature/v1'||raw.species!=='MOLASSES_GUARDIAN')
    throw Error('Creature preset version/species mismatch');
  const expected=Object.keys(sourceDefaults).sort().join('|');
  if(Object.keys(raw).sort().join('|')!==expected)
    throw Error('Unknown or missing source preset keys');
  if(!raw.visual||typeof raw.visual!=='object'||
    Object.keys(raw.visual).sort().join('|')!==
    Object.keys(sourceDefaults.visual).sort().join('|'))
    throw Error('Creature visual schema mismatch');
  for(const [key,min,max,step] of numericalControls){
    const v=raw[key];
    if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||
      (Number.isInteger(step)&&!Number.isInteger(v)))
      throw Error('Out-of-range creature parameter: '+key);
  }
  if(raw.hopTravelTicks>=raw.hopEveryTicks)
    throw Error('A hop cannot last longer than its interval');
  if(!['clear-molasses','mineral-gel','glass'].includes(raw.visual.material))
    throw Error('Invalid source material');
  for(const [key,min,max] of [
    ['hue',0,360],['opacity',.1,.92],
    ['edgeSharpness',0,1],['motionScale',.1,2]]){
    const n=raw.visual[key];
    if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)
      throw Error('Invalid creature visual parameter '+key);
  }
  return structuredClone(raw);
}
function loadDraft(next){
  sourceDraft=validateDraft(next);
  showDraft();
  gameplayMessage.textContent='Source preset loaded; Apply & Restart to activate';
}
panel.querySelector('.cc230-reset-gameplay').onclick=()=>{
  loadDraft(sourceDefaults);
};
panel.querySelector('.cc230-apply-gameplay').onclick=()=>{
  try{
    const preset=validateDraft(sourceDraft);
    // Revalidation and engine instantiation happen after page reload. This
    // never edits a live run, so old replay/authoritative receipts stay valid.
    const url=new URL(location.href);
    url.searchParams.set('cc230','1');
    url.searchParams.set('cc230Cfg',JSON.stringify(preset));
    gameplayMessage.textContent='Restarting with validated source settings…';
    location.assign(url.toString());
  }catch(error){gameplayMessage.textContent='Not applied: '+error.message;}
};
panel.querySelector('.cc230-export-gameplay').onclick=()=>{
  try{
    const value=JSON.stringify(validateDraft(sourceDraft),null,2);
    navigator.clipboard?.writeText(value);
    gameplayMessage.textContent='Source gameplay preset copied';
  }catch(error){gameplayMessage.textContent='Not exported: '+error.message;}
};
panel.querySelector('.cc230-import-gameplay').onclick=()=>{
  try{
    loadDraft(JSON.parse(panel.querySelector('.cc230-import-gameplay-data').value));
  }catch(error){gameplayMessage.textContent='Not imported: '+error.message;}
};
// CC2-09 owner menu intentionally hides game-shell details; place this
// inside the designated developer slot instead of inventing a new panel.
const developerSlot=document.querySelector('#cc209-developer-slot');
if(developerSlot){
  developerSlot.appendChild(panel);
  // In an opt-in Creature Studio build, never bury the source controls
  // behind the inherited nested-accordion default (physical owner blocker).
  const developerAccordion=developerSlot.closest('details');
  if(developerAccordion)developerAccordion.open=true;
  panel.open=true;
  const authorityAccordion=panel.querySelector('.cc230-authority');
  if(authorityAccordion)authorityAccordion.open=true;
}else console.error('CC2-30B developer slot missing; source controls hidden');
window.__CC2_30__={
  get config(){return {...config}},
  get source(){return api()?.creature?.()??null},
  apply,
  get events(){return api()?.creature?.()?.receipts??[]},
  get sourcePreset(){return sourceDraft?structuredClone(sourceDraft):null},
  loadSourcePreset(next){loadDraft(next)},
  get presentation(){return {draws,hopFrames,fluidFrames,
    fieldProjection,creatureVisible:!creature.hidden,
    questionVisible:!gate.hidden,gelVisible:!gel.hidden,
    verifiedContact:Boolean(api()?.creature?.()?.contactActive)}},
};
function frame(t){
  // 30Hz max for DOM projection: avoid a large source snapshot/layout pass
  // every 60Hz RAF on lower-powered tablets.
  if(t-lastDrawAt>=1000/30){lastDrawAt=t;refresh();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
