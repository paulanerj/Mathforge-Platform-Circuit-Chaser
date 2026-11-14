/**
 * CC2-13 — original code-generated audition of "Circuit Ascending".
 *
 * A single 112 BPM, 16-bar, nine-role transport (one AudioContext) follows
 * verified source events through CircuitScoreDirector13. Musical voices are
 * intentionally lightweight and capped; there are NO external audio assets,
 * copyrighted themes, game-state writes or independently running tracks.
 *
 * Future recorded stems use RecordedStemManifest13 and may replace the note
 * generator without changing the event contract or gameplay engine.
 */
import {CircuitScoreDirector13,type MusicalRole13,
  type MusicalReceipt13,type ScoreEvent13} from '../music/circuitScoreDirector13';
import {summarizeAbilityEvidence14} from '../features/abilityReview14';
import {buildLearningReview15,incorrectHint15} from '../learning/learningFeedback15';

type GameplayApi={
  snapshot:()=>{runId:string;tick:number;completedRows:number;paused:boolean;
    phase:string;currentProblem:{operation:string;incomingValue:number;
      targetValue:number};endReason:string|null;score:number;
    solved:unknown[]};
  events:()=>ScoreEvent13[];
  featureEvents:()=>ScoreEvent13[];
  features:()=>{charge:number;capacity:number;pulseAvailable:boolean;
    targetInRange:boolean;nextModifier:string;pulseUntilTick:number;
    pulseRadius:number;stage:number}|null;
  pursuer:()=>{sensed:boolean;belief:{mode:string};routeFailures:number}|null;
  sessionReport:()=>{stateDigest:string;replay:{config:{curriculum:string}}};
};
const api=()=>((window as unknown as {__CC2_02A__?:GameplayApi}).__CC2_02A__);
const director=new CircuitScoreDirector13();
const byId=(id:string)=>document.getElementById(id);
const bpm=112,beatSeconds=60/bpm,bars=16,beatsPerCycle=bars*4;
const roots=[50,48,43,45,50,48,43,45,53,50,48,45,50,43,48,50];
const motif=[62,65,69,67,65,64,62,69,67,65,64,62,60,64,65,69];
const midi=(n:number)=>440*Math.pow(2,(n-69)/12);
type Mix13={enabled:boolean;musicVolume:number;lowSensory:boolean;
  roles:Record<MusicalRole13,number>};
const roles:MusicalRole13[]=['atmosphere','harmony','motion','wonder',
  'pulse','foundation','rhythm','energy','tension'];
const defaultLevels:Record<MusicalRole13,number>={
  atmosphere:0.29,harmony:0.23,motion:0.26,wonder:0.16,
  pulse:0.23,foundation:0.32,rhythm:0.13,energy:0.13,tension:0.12,
};
const defaults=():Mix13=>({enabled:true,musicVolume:0.22,
  lowSensory:false,roles:{...defaultLevels}});
function validateMix(value:unknown):Mix13{
  if(!value||typeof value!=='object')throw Error('CC2_MUSIC_MIX_OBJECT');
  const v=value as Mix13;
  if(typeof v.enabled!=='boolean'||typeof v.lowSensory!=='boolean'||
     !Number.isFinite(v.musicVolume)||v.musicVolume<0||v.musicVolume>1||
     !v.roles||Object.keys(v.roles).sort().join('|')!==roles.slice().sort().join('|'))
    throw Error('CC2_MUSIC_MIX_SCHEMA');
  for(const role of roles)if(!Number.isFinite(v.roles[role])||
    v.roles[role]<0||v.roles[role]>1)throw Error('CC2_MUSIC_ROLE_LEVEL');
  return{enabled:v.enabled,musicVolume:v.musicVolume,
    lowSensory:v.lowSensory,roles:{...v.roles}};
}

class CircuitSynth13 {
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  private groups=new Map<MusicalRole13,GainNode>();
  private voices=new Set<OscillatorNode>();
  private timer:number|null=null;
  private zero=0;
  private nextBeat=0;
  private lastBar=-1;
  private started=false;
  private stopped=false;
  private pending:MusicalReceipt13[]=[];
  private mix=defaults();
  private errors:string[]=[];
  private renderedNotes=0;
  private scheduledBars=0;
  private mutedByGame=true;
  private lastGesture=0;
  readonly identity='Circuit Ascending — D Dorian, original procedural audition';
  private readonly voiceLimit=44;

  get settings():Mix13{return validateMix(this.mix);}
  get isStarted():boolean{return this.started;}
  setMix(next:unknown):void{
    this.mix=validateMix(next);
    if(this.master&&this.ctx){
      this.master.gain.setTargetAtTime(this.mix.enabled?
        this.mix.musicVolume*.32:0,this.ctx.currentTime,.08);
    }
  }
  setGamePaused(paused:boolean):void{
    this.mutedByGame=paused;
    if(!this.ctx)return;
    if(paused&&this.ctx.state==='running'){
      void this.ctx.suspend().catch(err=>this.fail('suspend',err));
    }else if(!paused&&this.mix.enabled&&this.started&&this.ctx.state==='suspended'){
      void this.ctx.resume().catch(err=>this.fail('resume',err));
    }
  }
  private fail(scope:string,error:unknown){
    this.errors.push(scope+': '+String(error));
    if(this.errors.length>60)this.errors.shift();
  }
  /** Must be called in a direct user selection or Music button gesture. */
  unlock():void{
    if(this.stopped||!this.mix.enabled)return;
    this.lastGesture=performance.now();
    try{
      if(!this.ctx){
        const ctor=window.AudioContext;
        if(!ctor){this.fail('unlock','AudioContext unavailable');return;}
        this.ctx=new ctor({latencyHint:'interactive'});
        this.master=this.ctx.createGain();
        this.master.gain.value=0;
        this.master.connect(this.ctx.destination);
        for(const role of roles){
          const g=this.ctx.createGain();g.gain.value=0;
          g.connect(this.master);this.groups.set(role,g);
        }
        this.zero=this.ctx.currentTime+.1;
        this.nextBeat=0;
      }
      if(this.ctx.state==='suspended'){
        void this.ctx.resume().catch(e=>this.fail('unlock-resume',e));
      }
      this.started=true;
      if(this.master)this.master.gain.setTargetAtTime(
        this.mix.musicVolume*.32,this.ctx.currentTime,.13);
      if(this.timer===null)this.timer=window.setInterval(()=>this.pump(),85);
      this.pump();
    }catch(e){this.fail('unlock',e);}
  }
  queue(receipts:readonly MusicalReceipt13[]):void{
    if(!this.started||this.mutedByGame||!this.mix.enabled)return;
    const accents=receipts.filter(e=>['cell','capacitor','relay',
      'stage','pulse-hit','pulse-miss','capture','goal'].includes(e.kind));
    this.pending.push(...accents);
    if(this.pending.length>8)this.pending.splice(0,this.pending.length-8);
  }
  private note(role:MusicalRole13,hz:number,at:number,duration:number,
    loudness:number,shape:OscillatorType='sine'):void{
    const ctx=this.ctx,g=this.groups.get(role);
    if(!ctx||!g||this.voices.size>=this.voiceLimit)return;
    const o=ctx.createOscillator(),env=ctx.createGain();
    const start=Math.max(ctx.currentTime+.001,at),end=start+duration;
    o.type=shape;o.frequency.setValueAtTime(hz,start);
    env.gain.setValueAtTime(.00001,start);
    env.gain.exponentialRampToValueAtTime(Math.max(.00002,loudness),start+.022);
    env.gain.exponentialRampToValueAtTime(.00001,end);
    o.connect(env);env.connect(g);this.voices.add(o);this.renderedNotes++;
    o.onended=()=>{this.voices.delete(o);o.disconnect();env.disconnect();};
    o.start(start);o.stop(end+.04);
  }
  private roleGain(role:MusicalRole13,stage:number,pressure:boolean):number{
    const gates:Record<MusicalRole13,number>={
      atmosphere:1,harmony:1,foundation:2,pulse:3,motion:3,
      rhythm:4,energy:5,wonder:6,tension:pressure?3:7,
    };
    if(stage<gates[role])return 0;
    if(this.mix.lowSensory && ['rhythm','tension','energy'].includes(role))
      return 0;
    const scaling=Math.min(1,(stage-gates[role]+1)*.34+.2);
    return this.mix.roles[role]*scaling;
  }
  private updateStage(at:number,bar:number){
    const stage=director.commitBar(bar),pressure=director.snapshot().pressure;
    this.scheduledBars++;
    for(const role of roles){
      const group=this.groups.get(role);
      if(group)group.gain.setTargetAtTime(this.roleGain(role,stage,pressure),
        at,.45);
    }
  }
  private playBeat(beat:number,time:number):void{
    const local=beat%beatsPerCycle,bar=Math.floor(local/4);
    const hit=local%4,stage=director.snapshot().stage;
    const root=roots[bar],rootHz=midi(root);
    // Theme is authored as a repeating 16-bar harmonic/melodic arc.
    // All voices use the SAME beat origin and never restart for a streak.
    if(hit===0){
      this.note('atmosphere',rootHz*.5,time,1.8,.11,'sine');
      this.note('harmony',midi(root+12),time,1.6,.13,'sine');
      this.note('harmony',midi(root+15),time+.02,1.52,.07,'triangle');
      this.note('foundation',rootHz,time,.56,.12,'triangle');
    }
    if(hit===2)this.note('foundation',midi(root+7),time,.34,.065,'sine');
    if(stage>=3){
      this.note('pulse',midi(root-12),time,.09,hit===0?.14:.075,'sine');
      if(hit===2)this.note('rhythm',920,time,.065,.032,'sine');
    }
    if(stage>=4&&(hit===1||hit===3)){
      const pitch=motif[(bar*2+(hit===1?0:1))%motif.length];
      this.note('motion',midi(pitch),time,.28,.085,'triangle');
    }
    if(stage>=5&&hit===3)this.note('energy',midi(root+19),time,.26,.05,'sine');
    if(stage>=6&&hit===0)this.note('wonder',midi(root+24),time,.66,.048,'sine');
    if(stage>=3&&director.snapshot().pressure&&hit===2)
      this.note('tension',midi(root+13),time,.28,.045,'triangle');
    if(this.pending.length){
      // One earned special accent per beat; source receipt priority is
      // preserved. Existing 24-event SFX remain a separate immediate bus.
      const special=this.pending.shift()!;
      const phrase=special.kind==='stage'||special.kind==='goal'
        ?[root+12,root+19,root+24]:special.kind==='capture'
        ?[root+12,root+10,root+7]:[root+12,root+17,root+19];
      for(let i=0;i<phrase.length;i++)
        this.note('wonder',midi(phrase[i]),time+i*.11,.33,.08,'sine');
    }
  }
  private pump(){
    const ctx=this.ctx;
    if(!ctx||ctx.state!=='running'||this.stopped||
      this.mutedByGame||!this.mix.enabled)return;
    // A bounded lookahead prevents unbounded nodes during a suspended tab.
    let ahead=0;
    while(this.zero+this.nextBeat*beatSeconds < ctx.currentTime+.19 &&
          ahead++<4){
      const t=this.zero+this.nextBeat*beatSeconds;
      if(t<ctx.currentTime-.10){
        this.nextBeat=Math.ceil((ctx.currentTime-this.zero)/beatSeconds);
        continue;
      }
      const bar=Math.floor(this.nextBeat/4);
      if(bar!==this.lastBar){this.updateStage(t,bar);this.lastBar=bar;}
      this.playBeat(this.nextBeat,t);
      this.nextBeat++;
    }
  }
  getStatus(){
    return{schema:'cc2-audio-runtime/v1',identity:this.identity,
      bpm,bars,roles:[...roles],started:this.started,
      contextState:this.ctx?.state??'not-created',musicEnabled:this.mix.enabled,
      lowSensory:this.mix.lowSensory,stage:director.snapshot().stage,
      scheduledBars:this.scheduledBars,renderedNotes:this.renderedNotes,
      activeVoices:this.voices.size,voiceLimit:this.voiceLimit,
      errors:[...this.errors],bar:Math.floor(this.nextBeat/4),
      sourceClock:director.snapshot().lastActionTick,
      recordedStemsLoaded:false};
  }
  dispose(){
    this.stopped=true;
    if(this.timer!==null)clearInterval(this.timer);
    this.timer=null;
    for(const node of this.voices){try{node.stop();}catch{/** already ended */}}
    this.voices.clear();this.pending=[];
    const old=this.ctx;this.ctx=null;
    if(old)void old.close().catch(e=>this.fail('dispose',e));
  }
}
const synth=new CircuitSynth13();
let previousRun='',lastTick=0,lastCoreLen=0;
let hintUntil=0,lastWrongId='';
const recentErrors:string[]=[];
let frameCount=0;
let lastReport:{ability:ReturnType<typeof summarizeAbilityEvidence14>;
  learning:ReturnType<typeof buildLearningReview15>}|null=null;
function refresh(){
  try{
    const a=api();
    if(!a)return;
    const state=a.snapshot(),events=a.events(),features=a.featureEvents(),
      bot=a.pursuer(),f=a.features();
    if(previousRun!==state.runId||state.tick<lastTick||
      (lastCoreLen>events.length)){
      previousRun=state.runId;
      lastWrongId='';hintUntil=0;
      byId('cc215-hint')?.setAttribute('hidden','');
    }
    lastTick=state.tick;lastCoreLen=events.length;
    director.consume(state,events,features,Boolean(bot?.sensed));
    synth.setGamePaused(state.paused||state.phase==='ended'||
      document.hidden||!window.__cc2ChaseStarted);
    const receipts=director.drain();
    synth.queue(receipts);
    lastReport={
      ability:summarizeAbilityEvidence14(events,features,f,state.runId),
      learning:buildLearningReview15(events,state.runId,
        a.sessionReport().replay.config.curriculum),
    };
    // A hint is only permitted AFTER a real PLATFORM_SHORTED receipt.
    // It gives a rule scaffold without exposing the correct platform.
    for(const r of receipts)if(r.kind==='mistake'&&r.id!==lastWrongId){
      lastWrongId=r.id;
      const attempt=events.filter(e=>e.runId===state.runId&&
        e.type==='ATTEMPT_EVALUATED'&&
        e.detail.attemptId===events.find(x=>x.id===r.id)?.detail.attemptId).at(-1);
      if(attempt && (byId('cc215-hints') as HTMLInputElement|null)?.checked){
        const el=byId('cc215-hint');
        if(el){
          el.textContent=incorrectHint15(attempt,
            a.sessionReport().replay.config.curriculum);
          el.removeAttribute('hidden');hintUntil=performance.now()+1600;
          document.body.dataset.cc215Hint='on';
        }
      }
    }
    if(hintUntil>0&&performance.now()>hintUntil){
      byId('cc215-hint')?.setAttribute('hidden','');
      delete document.body.dataset.cc215Hint;hintUntil=0;
    }
    const status=byId('cc213-music-status');
    if(status&&frameCount%18===0){
      const audio=synth.getStatus(),s=director.snapshot();
      status.textContent=(audio.started?'Music':'Music ready')+
        ' · level '+s.stage+'/7 · '+(s.pressure?'chase':'flow');
    }
    const abilities=byId('cc214-feature-status');
    if(abilities&&f&&frameCount%18===0)
      abilities.textContent='Pulse '+f.charge+'/'+f.capacity+
        (f.pulseAvailable?(f.targetInRange?' · in range':' · out of range')
          :' · charging')+' · '+f.nextModifier.toLowerCase()+' row';
    frameCount++;
  }catch(e){
    recentErrors.push(String(e));
    if(recentErrors.length>80)recentErrors.shift();
  }
  requestAnimationFrame(refresh);
}
function controlUI(){
  const host=byId('cc209-sound-slot');
  if(!host)return;
  const section=document.createElement('section');
  section.id='cc213-music-controls';
  section.innerHTML=`
    <div class="cc213-music-title">Adaptive music · Circuit Ascending</div>
    <p>One continuous original composition. Synchronized layers build with genuine solved rows and chase pressure.</p>
    <label class="cc213-control"><input id="cc213-music-on" type="checkbox" checked> Music enabled</label>
    <label class="cc213-control">Music volume <input id="cc213-music-volume" type="range" min="0" max="1" step=".02" value=".22"></label>
    <label class="cc213-control"><input id="cc213-low-sensory" type="checkbox"> Gentle mix · no tension percussion</label>
    <div class="cc213-audio-actions"><button id="cc213-audition" type="button">Play music</button><button id="cc213-stop" type="button">Mute music</button></div>
    <div id="cc213-music-status" role="status">Music ready · level 1/7</div>
    <details id="cc213-music-lab"><summary>Developer · musical layers and presets</summary>
      <div class="cc213-roles" id="cc213-role-controls"></div>
      <div class="cc213-audio-actions"><button id="cc213-copy" type="button">Copy mix JSON</button><button id="cc213-reset" type="button">Reset music</button></div>
      <p>Recorded stems are not installed. This is the code-generated audition, with an aligned-stem replacement contract.</p>
    </details>`;
  host.append(section);
  const roleHost=byId('cc213-role-controls')!;
  for(const role of roles){
    const label=document.createElement('label');
    label.className='cc213-control';
    label.textContent=role.charAt(0).toUpperCase()+role.slice(1)+' ';
    const input=document.createElement('input');
    input.type='range';input.min='0';input.max='1';input.step='.05';
    input.id='cc213-role-'+role;input.value=String(defaultLevels[role]);
    input.addEventListener('input',()=>{
      const next=synth.settings;next.roles[role]=Number(input.value);
      synth.setMix(next);
    });
    label.append(input);roleHost.append(label);
  }
  const on=byId('cc213-music-on') as HTMLInputElement,
    volume=byId('cc213-music-volume') as HTMLInputElement,
    gentle=byId('cc213-low-sensory') as HTMLInputElement;
  const apply=()=>{
    const next=synth.settings;next.enabled=on.checked;
    next.musicVolume=Number(volume.value);next.lowSensory=gentle.checked;
    synth.setMix(next);if(next.enabled&&synth.isStarted)synth.unlock();
  };
  on.addEventListener('change',apply);
  volume.addEventListener('input',apply);
  gentle.addEventListener('change',apply);
  byId('cc213-audition')?.addEventListener('click',()=>{
    on.checked=true;apply();synth.unlock();
    synth.setGamePaused(false);
  });
  byId('cc213-stop')?.addEventListener('click',()=>{
    on.checked=false;apply();
  });
  byId('cc213-reset')?.addEventListener('click',()=>{
    synth.setMix(defaults());syncControls();
  });
  byId('cc213-copy')?.addEventListener('click',()=>{
    const content=JSON.stringify({schema:'cc2-music-mix/v1',
      ...synth.settings},null,2);
    // Native clipboard may be unavailable on a local standalone file.
    // The read-only prompt also works offline.
    window.prompt('Copy the validated music mix preset',content);
  });
  function syncControls(){
    const m=synth.settings;
    on.checked=m.enabled;volume.value=String(m.musicVolume);
    gentle.checked=m.lowSensory;
    for(const role of roles)
      (byId('cc213-role-'+role) as HTMLInputElement).value=String(m.roles[role]);
  }
  syncControls();
  // The sound engine is unlocked only by an explicit user gesture.
  document.addEventListener('click',event=>{
    const t=event.target as Element;
    if(t?.closest('button.choice')||t?.closest('#cc209c-enter')){
      if(synth.settings.enabled)synth.unlock();
    }
  },true);
}
function learningControls(){
  const help=byId('cc209-help-math');
  if(help){
    const section=document.createElement('div');
    section.id='cc215-learning-help';
    section.textContent='After an incorrect landing, a short optional hint explains the mathematical rule without giving away a platform. Only actual completed equations count as solved.';
    help.after(section);
  }
  const progress=byId('cc209c-progress-card')||byId('cc209-progress');
  if(progress){
    const section=document.createElement('section');
    section.id='cc214-feature-status';
    section.textContent='Pulse and row abilities loading';
    progress.after(section);
  }
  const settings=byId('cc209-settings');
  if(settings){
    const details=document.createElement('details');
    details.id='cc215-learning-settings';
    details.innerHTML=`<summary>Learning feedback &amp; assessment</summary>
      <label class="cc213-control"><input type="checkbox" id="cc215-hints" checked> Brief hints after an incorrect landing</label>
      <p>Make Target, Running Addition and Skip Counting use source-backed questions. Assessment receipts remain separate from visual and music effects.</p>
      <button id="cc215-export" type="button">Download learning + ability report</button>`;
    const dialog=settings.querySelector('.cc209-dialog');
    dialog?.append(details);
    byId('cc215-export')?.addEventListener('click',()=>{
      if(!lastReport)return;
      const payload=JSON.stringify({schema:'cc2-learning-ability-evidence/v1',
        runId:api()?.snapshot().runId,report:lastReport,
        music:director.snapshot(),scoreEvents:director.report(),
        replayHash:api()?.sessionReport().stateDigest},null,2);
      const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;
      a.download='CC2-15-Learning-Ability-Report.json';a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),300);
    });
  }
  const board=byId('board');
  if(board){
    const hint=document.createElement('div');
    hint.id='cc215-hint';hint.hidden=true;hint.setAttribute('role','status');
    hint.setAttribute('aria-live','polite');board.append(hint);
  }
}
window.addEventListener('DOMContentLoaded',()=>{
  controlUI();learningControls();refresh();
});
window.addEventListener('pagehide',()=>synth.dispose(),{once:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)synth.setGamePaused(true);
});
(window as unknown as {__CC2_15__?:unknown}).__CC2_15__={
  music:()=>synth.getStatus(),director:()=>director.snapshot(),
  receipts:()=>director.report(),ability:()=>lastReport?.ability??null,
  learning:()=>lastReport?.learning??null,
  errors:()=>[...recentErrors],
  mix:()=>synth.settings,
};
