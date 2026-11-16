/**
 * CC2-24 — Circuit Climb's source-backed playback adapter for authentic
 * Speed Grid reference stem synthesis (112 BPM, 16 bars, five aligned stems).
 *
 * The actual sample data comes unmodified from SpeedGridMusicReference24.
 * This adapter owns Web Audio PLAYBACK only. It cannot mutate or query game
 * physics, math, player choices, scoring, enemy state, or achievements.
 *
 * All five buffer sources start at one sample-aligned transport origin and
 * remain phase-locked. Gameplay source receipts determine seven-stage gains
 * through the already-qualified CircuitScoreDirector13.
 */
import {STEM_NAMES,MANIFEST,renderReferenceStem}
  from './SpeedGridMusicReference24';
export type SpeedGridRole24=(typeof STEM_NAMES)[number];
export type SpeedGridCue24='selection'|'solved'|'mistake'|'cell'|
 'capacitor'|'relay'|'stage'|'pulse-hit'|'pulse-miss'|'pulse-expired'|
 'capture'|'goal'|'quit'|'pause'|'resume';
const clamp=(x:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,x));
const roleGate:Record<SpeedGridRole24,number>={
  pulse:1,foundation:1,rhythm:2,energy:4,tension:5,
};
export interface ReferenceStatus24{
  schema:'cc2-speedgrid-reference/v1';
  identity:string;
  sourceRepo:string;
  kind:'reference';
  bpm:number;
  bars:number;
  transportStarted:boolean;
  decodedStemCount:number;
  decodedBytes:number;
  stage:number;
  pressure:boolean;
  cues:number;
  createdContexts:0;
}
export class SpeedGridReferenceBridge24 {
  readonly identity='Speed Grid — five-stem reference, 112 BPM / 16 bars';
  private outputs=new Map<SpeedGridRole24,GainNode>();
  private sources=new Map<SpeedGridRole24,AudioBufferSourceNode>();
  private buffers=new Map<SpeedGridRole24,AudioBuffer>();
  private decodedBytes=0;
  private started=false;
  private disposed=false;
  private active=false;
  private stage=1;
  private pressure=false;
  private cues=0;
  private initialized=false;
  private voices=new Set<OscillatorNode>();
  constructor(
    private readonly ctx:AudioContext,
    private readonly destination:AudioNode
  ){}
  /**
   * All buffers share exact original SpeedGrid musical material.
   * Initialization happens only after the source-owning user gesture.
   */
  start():void{
    if(this.disposed||this.started||this.ctx.state!=='running')return;
    if(!this.initialized){
      for(const role of STEM_NAMES){
        const b=renderReferenceStem(this.ctx,role);
        this.buffers.set(role,b);
        this.decodedBytes+=b.length*b.numberOfChannels*4;
      }
      if(this.decodedBytes>48*1024*1024)
        throw Error('CC2_SG_REFERENCE_MEMORY_BUDGET');
      const lengths=[...this.buffers.values()].map(b=>b.length);
      if(new Set(lengths).size!==1)
        throw Error('CC2_SG_REFERENCE_STEMS_NOT_ALIGNED');
      this.initialized=true;
    }
    const origin=this.ctx.currentTime+0.09;
    for(const role of STEM_NAMES){
      const source=this.ctx.createBufferSource();
      const gain=this.ctx.createGain();
      source.buffer=this.buffers.get(role)!;
      source.loop=true;source.loopStart=0;
      source.loopEnd=source.buffer.duration;
      gain.gain.value=0;
      source.connect(gain);gain.connect(this.destination);
      source.start(origin,0);
      this.sources.set(role,source);this.outputs.set(role,gain);
    }
    this.started=true;
    this.update(this.stage,this.pressure,this.active,false);
  }
  update(
    stage:number,pressure:boolean,enabled:boolean,lowSensory:boolean,
    levels?:Partial<Record<SpeedGridRole24,number>>
  ):void{
    if(this.disposed)return;
    this.stage=clamp(Math.floor(stage),1,7);
    this.pressure=pressure;
    this.active=enabled;
    if(!this.started)return;
    for(const role of STEM_NAMES){
      const gate=role==='tension'&&pressure?3:roleGate[role];
      const allowed=enabled&&this.stage>=gate&&
        !(lowSensory&&(role==='tension'||role==='energy'||role==='rhythm'));
      const ramp=allowed?clamp(.42+(this.stage-gate)*.15,.42,1):0;
      const base:Record<SpeedGridRole24,number>={
        pulse:.85,foundation:.88,rhythm:.72,energy:.7,tension:.65
      };
      const authoredLevels:Record<SpeedGridRole24,number>={
        pulse:.23,foundation:.32,rhythm:.13,energy:.13,tension:.12
      };
      const amount=levels?.[role]??authoredLevels[role];
      const editorGain=Number.isFinite(amount)?
        clamp(amount/authoredLevels[role],0,3):1;
      // Original stems are quiet by design. The gain is bounded and remains
      // under the existing user music-volume control/master safety bus.
      this.outputs.get(role)!.gain.setTargetAtTime(
        allowed?base[role]*ramp*2.7*editorGain:0,this.ctx.currentTime,
        allowed?.24:.16);
    }
  }
  /** Short local accents are tied to real, unique source ledger receipts. */
  cue(kind:SpeedGridCue24):void{
    if(!this.started||this.disposed||!this.active||
      this.ctx.state!=='running')return;
    if(['pause','resume','quit','selection','pulse-expired'].includes(kind))
      return;
    const ctx=this.ctx,now=ctx.currentTime;
    const pitches:Partial<Record<SpeedGridCue24,number[]>>={
      solved:[523.25,659.25],mistake:[196,164.81],
      cell:[523.25,659.25,783.99],capacitor:[587.33,783.99,1046.5],
      relay:[392,523.25,783.99],stage:[440,659.25,880],
      'pulse-hit':[349.23,523.25], 'pulse-miss':[220,174.61],
      capture:[246.94,185,138.59],goal:[392,523.25,659.25,783.99]
    };
    const seq=pitches[kind];if(!seq)return;
    this.cues++;
    for(let i=0;i<seq.length;i++){
      if(this.voices.size>=14)break;
      const o=ctx.createOscillator(),v=ctx.createGain(),
        start=now+i*.085,end=start+(kind==='capture'?.27:.17);
      o.type=kind==='capture'?'triangle':'sine';
      o.frequency.setValueAtTime(seq[i],start);
      v.gain.setValueAtTime(.00001,start);
      v.gain.exponentialRampToValueAtTime(.055,start+.012);
      v.gain.exponentialRampToValueAtTime(.00001,end);
      o.connect(v);v.connect(this.destination);
      this.voices.add(o);
      o.onended=()=>{this.voices.delete(o);o.disconnect();v.disconnect();};
      o.start(start);o.stop(end+.025);
    }
  }
  snapshot():ReferenceStatus24{
    return{
      schema:'cc2-speedgrid-reference/v1',
      identity:this.identity,
      sourceRepo:'paulanerj/mathgrid-07-28 @ 152451fed271f46a80d1a522298f7dca83017384',
      kind:'reference',bpm:MANIFEST.bpm,bars:MANIFEST.barsPerLoop,
      transportStarted:this.started,
      decodedStemCount:this.buffers.size,decodedBytes:this.decodedBytes,
      stage:this.stage,pressure:this.pressure,cues:this.cues,
      createdContexts:0,
    };
  }
  dispose():void{
    if(this.disposed)return;
    this.disposed=true;this.active=false;
    for(const output of this.outputs.values()){
      output.gain.cancelScheduledValues(this.ctx.currentTime);
      output.gain.value=0;
      output.disconnect();
    }
    for(const source of this.sources.values()){
      try{source.stop();}catch{/** already terminated */}
      source.disconnect();
    }
    for(const v of this.voices){try{v.stop();}catch{/** ended */}}
    this.voices.clear();this.outputs.clear();this.sources.clear();
    this.buffers.clear();this.decodedBytes=0;
  }
}
