/**
 * CC2-05B presentation-only audio renderer.
 *
 * Audio starts only after a real user gesture. Every cue is a short original,
 * synthesized musical gesture with a bounded amplitude envelope. No sample
 * files, external network, autoplay or gameplay dependencies are required.
 *
 * Playwright manual/QA runs may omit audio activation; the source engine and
 * presentation traces remain valid with AudioContext suspended/unavailable.
 */
import {
  CUE_CATALOG,defaultFeedbackPreset,validateFeedbackPreset,
  type FeedbackCueId,type FeedbackPresetV1,
} from '../presentation/feedback';

export class CircuitClimbFeedbackAudio {
  private ctx:AudioContext|null=null;
  private state:FeedbackPresetV1=defaultFeedbackPreset();
  private activated=false;
  private recent:FeedbackCueId[]=[];
  configure(value:FeedbackPresetV1):void{
    this.state=validateFeedbackPreset(value);
  }
  settings():FeedbackPresetV1{return {...this.state};}
  history():readonly FeedbackCueId[]{return [...this.recent];}
  /** Invoke only from a click/key handler, never animation or event effects. */
  unlock():void{
    this.activated=true;
    if(!this.ctx && typeof AudioContext!=='undefined'){
      try{this.ctx=new AudioContext();}catch{this.ctx=null;}
    }
    if(this.ctx?.state==='suspended')void this.ctx.resume().catch(()=>{});
  }
  close():void{
    if(this.ctx){void this.ctx.close().catch(()=>{});this.ctx=null;}
    this.activated=false;
  }
  cue(id:FeedbackCueId):void{
    this.recent.push(id);
    if(this.recent.length>24)this.recent.shift();
    if(!this.activated||!this.state.enabled||this.state.volume===0||
      !this.ctx||this.ctx.state!=='running')return;
    const definition=CUE_CATALOG[id];
    const now=this.ctx.currentTime;
    const oscillator=this.ctx.createOscillator();
    const level=this.ctx.createGain();
    const filter=this.ctx.createBiquadFilter();
    oscillator.type=definition.osc;
    oscillator.frequency.setValueAtTime(definition.hz,now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(35,definition.endHz),now+definition.duration);
    filter.type='lowpass';filter.frequency.setValueAtTime(2200,now);
    // Always envelope with an initial silence boundary so cue bursts cannot
    // retain oscillator DC jumps or sound harsh.
    const amp=Math.min(0.11,this.state.volume*0.17);
    level.gain.setValueAtTime(0,now);
    level.gain.linearRampToValueAtTime(amp,now+Math.min(0.024,definition.duration*.22));
    level.gain.exponentialRampToValueAtTime(0.0001,now+definition.duration);
    oscillator.connect(filter);filter.connect(level);level.connect(this.ctx.destination);
    oscillator.start(now);oscillator.stop(now+definition.duration+0.02);
    oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();level.disconnect();};
  }
}
