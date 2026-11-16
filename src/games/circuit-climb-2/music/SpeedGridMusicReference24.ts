/**
 * CC2-24: AUTHENTIC Speed Grid five-stem 112 BPM reference synthesis,
 * copied from paulanerj/mathgrid-07-28 @ 152451fed271f46a80d1a522298f7dca83017384,
 * src/games/speed-grid/SpeedGridMusicReference.ts.
 *
 * The synthesis loop, pitches, timbres, accents and arrangement are untouched.
 * Only the manifest type below is local to the Circuit Climb integration.
 * This is the code-generated reference, NOT an approved recorded master.
 */
export interface SpeedGridMusicManifest {
  version:1;
  bpm:number;
  beatsPerBar:number;
  barsPerLoop:number;
  stems:Partial<Record<"pulse"|"foundation"|"rhythm"|"energy"|"tension",string>>;
}

// Existing Music Lab reference, shared without changing its notes or synthesis.
const BPM = 112;
const BARS = 16;
const BEATS = 4;
const DURATION = 60 / BPM * BARS * BEATS;
export const STEM_NAMES = ["pulse","foundation","rhythm","energy","tension"] as const;
export const MANIFEST: SpeedGridMusicManifest = {
  version:1,bpm:BPM,barsPerLoop:BARS,beatsPerBar:BEATS,
  stems:Object.fromEntries(STEM_NAMES.map(name=>[name,"/music/speedgrid/"+name+".wav"])) as SpeedGridMusicManifest["stems"],
};
/**
 * Sixteen-bar (~34s) reference arrangement with four-bar harmonic phrases.
 * Deterministic note variation and occasional rests reduce audible repetition.
 * The production path still uses recorded, phase-aligned stems.
 */
export function renderReferenceStem(ctx:AudioContext,name:typeof STEM_NAMES[number]):AudioBuffer {
  const rate=ctx.sampleRate;
  const length=Math.round(DURATION*rate);
  const buffer=ctx.createBuffer(1,length,rate);
  const data=buffer.getChannelData(0);
  const beat=60/BPM;
  if(name==="pulse"){
    // A quiet, permanent tempo bed: muted kick and alternating soft hi-hat.
    // Bar-to-bar accents change, but the 112 BPM grid remains constant.
    const steps=BARS*BEATS*2;
    for(let n=0;n<steps;n++){
      const t=n*beat/2;
      const start=Math.floor(t*rate);
      const bar=Math.floor(n/(BEATS*2));
      const downbeat=n%8===0;
      const strong=n%2===0;
      const amp=(downbeat?.042:strong?.022:.011)*(bar%4===3?.82:1);
      const duration=downbeat?.13:.045;
      const samples=Math.min(length-start,Math.floor(duration*rate));
      for(let i=0;i<samples;i++){
        const time=i/rate;
        const env=Math.pow(1-i/samples,3);
        const kick=Math.sin(2*Math.PI*(downbeat?82:160)*time);
        // A deterministic soft tick, no random noise or independent click sample.
        const tick=Math.sin(2*Math.PI*1250*time)*Math.sin(2*Math.PI*1870*time);
        data[start+i]+=(downbeat?.7*kick+.3*tick:tick)*env*amp;
      }
    }
    return buffer;
  }
  const roots=[110,87.31,130.81,98]; // A2 F2 C3 G2, four-bar phrases.
  const intervals=[0,3,7,12,7,3,10,7];
  const step=name==="energy"?beat/2:beat;
  const count=Math.floor(DURATION/step);
  for(let n=0;n<count;n++){
    const t=n*step;
    const bar=Math.floor(t/(beat*BEATS));
    const phrase=Math.floor(bar/4);
    const beatInBar=Math.floor((t/beat)%BEATS);
    const root=roots[phrase%roots.length];
    // Phrase-level variation, syncopation and deliberate silence.
    if(name==="rhythm" && (beatInBar===1 && bar%2===0))continue;
    if(name==="energy" && (bar%4===3 && n%3===0))continue;
    if(name==="tension" && (bar%4<2 || n%4===1))continue;
    const note=intervals[(n + bar + phrase)%intervals.length];
    const freq=name==="foundation"?root*(beatInBar===0?1:1.5):
      name==="rhythm"?root*2*(n%4===0?1:1.5):
      name==="energy"?root*4*Math.pow(2,note/12):
      root*2*Math.pow(2,(n%4===0?1:2)/12);
    const duration=name==="foundation"?Math.min(step*.82,.4):Math.min(step*.55,.22);
    const start=Math.floor(t*rate);
    const samples=Math.min(length-start,Math.floor(duration*rate));
    const phraseAccent=bar%4===0?1.15:bar%4===3?.7:1;
    for(let i=0;i<samples;i++){
      const sec=i/rate;
      const envelope=Math.pow(1-i/samples,2)*Math.min(1,i/(rate*.008));
      data[start+i]+=Math.sin(2*Math.PI*freq*sec)*envelope*phraseAccent*
        (name==="foundation"?.085:name==="tension"?.035:.05);
    }
  }
  return buffer;
}
