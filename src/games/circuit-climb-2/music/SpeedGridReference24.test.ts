import {describe,it,expect} from 'vitest';
import {MANIFEST,STEM_NAMES,renderReferenceStem}
  from './SpeedGridMusicReference24';
import {SpeedGridReferenceBridge24}
  from './SpeedGridReferenceBridge24';

/**
 * Contract tests for the UNMODIFIED Speed Grid reference arrangement
 * copied from commit 152451fed271f46a80d1a522298f7dca83017384.
 * Tests use in-memory fake AudioBuffer to avoid browser audio autoplay.
 */
function makeContext(sampleRate=8000){
  return{
    sampleRate,
    createBuffer(channels:number,length:number,rate:number){
      const data=Array.from({length:channels},()=>new Float32Array(length));
      return{
        length,numberOfChannels:channels,sampleRate:rate,
        duration:length/rate,getChannelData:(i:number)=>data[i]
      };
    }
  };
}
describe('CC2-24 original Speed Grid reference music',()=>{
  it('retains exactly the authentic 112 BPM, 16x4 bar stem clock',()=>{
    expect(MANIFEST).toMatchObject({
      version:1,bpm:112,barsPerLoop:16,beatsPerBar:4
    });
    expect(STEM_NAMES).toEqual([
      'pulse','foundation','rhythm','energy','tension'
    ]);
  });
  it('renders all five distinct original aligned buffers, no randomness',()=>{
    const ctx=makeContext() as unknown as AudioContext;
    const buffers=STEM_NAMES.map(role=>renderReferenceStem(ctx,role));
    expect(new Set(buffers.map(x=>x.length)).size).toBe(1);
    expect(buffers[0].length).toBe(
      Math.round(60/112*16*4*ctx.sampleRate));
    for(let i=0;i<buffers.length;i++){
      const x=buffers[i].getChannelData(0);
      expect(x.length).toBeGreaterThan(250000);
      expect(x.every(v=>Number.isFinite(v))).toBe(true);
      expect(x.some(v=>Math.abs(v)>0.00001)).toBe(true);
      const repeated=renderReferenceStem(ctx,STEM_NAMES[i]);
      expect(repeated.getChannelData(0)).toEqual(x);
    }
    expect(buffers[0].getChannelData(0)).not.toEqual(
      buffers[1].getChannelData(0));
  });
  it('is source-only audio, creating zero additional AudioContexts',()=>{
    const ctx={...makeContext(),state:'running',currentTime:0,
      createGain:()=>({gain:{value:0,setTargetAtTime(){},
        cancelScheduledValues(){}},connect(){},disconnect(){}}),
      createBufferSource:()=>({
        buffer:null,loop:false,loopStart:0,loopEnd:0,
        connect(){},start(){},stop(){},disconnect(){}
      }),
    } as unknown as AudioContext;
    const transport=new SpeedGridReferenceBridge24(ctx,
      {} as AudioNode);
    transport.start();
    const a=transport.snapshot();
    expect(a.decodedStemCount).toBe(5);
    expect(a.transportStarted).toBe(true);
    expect(a.createdContexts).toBe(0);
    expect(a.sourceRepo).toContain('paulanerj/mathgrid-07-28');
    transport.update(7,true,true,false);
    expect(transport.snapshot().stage).toBe(7);
    transport.dispose();
    expect(transport.snapshot().decodedStemCount).toBe(0);
  });
});
