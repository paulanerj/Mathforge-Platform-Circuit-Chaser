/**
 * CC2-05B — configurable ORIGINAL synthesized audio and coherent VFX.
 *
 * All sounds are short original procedural cues. This module does not import
 * external music, media, CDN packages, or the authoritative game core.
 * Game and pursuer events are mapped declaratively to presentation cues.
 */
export type FeedbackCueId =
  'start'|'select'|'travel'|'land'|'wrong'|'return'|'solve'|'cell'|
  'rebase'|'pause'|'resume'|'capture'|'quit'|'pulse'|'pulseMiss'|
  'pulseEnd'|'charge'|'relay'|'stage'|'notice'|'hesitate'|'curious'|
  'frustrated'|'focus'|'achievement';
export interface FeedbackPresetV1 {
  schemaVersion:'cc2-feedback/v1';
  enabled:boolean;
  volume:number;
  vfxEnabled:boolean;
  vfxIntensity:number;
}
export const DEFAULT_FEEDBACK_PRESET:Readonly<FeedbackPresetV1>=Object.freeze({
  schemaVersion:'cc2-feedback/v1',enabled:true,volume:0.24,
  vfxEnabled:true,vfxIntensity:0.70,
});
export function defaultFeedbackPreset():FeedbackPresetV1{
  return {...DEFAULT_FEEDBACK_PRESET};
}
export function validateFeedbackPreset(value:unknown):FeedbackPresetV1{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw Error('FEEDBACK_NOT_OBJECT');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).sort().join('|')!==Object.keys(DEFAULT_FEEDBACK_PRESET).sort().join('|')||
    v.schemaVersion!=='cc2-feedback/v1')throw Error('FEEDBACK_VERSION_OR_KEYS');
  if(typeof v.enabled!=='boolean'||typeof v.vfxEnabled!=='boolean'||
    typeof v.volume!=='number'||!Number.isFinite(v.volume)||v.volume<0||v.volume>1||
    typeof v.vfxIntensity!=='number'||!Number.isFinite(v.vfxIntensity)||
    v.vfxIntensity<0||v.vfxIntensity>1)throw Error('FEEDBACK_INVALID_VALUE');
  return {...v} as unknown as FeedbackPresetV1;
}
export const CUE_CATALOG:Record<FeedbackCueId,{
  label:string;hz:number;endHz:number;duration:number;osc:'sine'|'triangle'|'square';
  color:string;target:'spark'|'pursuer';
}>={
  start:{label:'Ready',hz:392,endHz:588,duration:0.22,osc:'sine',color:'#93d9f4',target:'spark'},
  select:{label:'Select',hz:510,endHz:600,duration:0.07,osc:'triangle',color:'#8bd5fa',target:'spark'},
  travel:{label:'Travel',hz:280,endHz:390,duration:0.09,osc:'sine',color:'#6fdfe5',target:'spark'},
  land:{label:'Landing',hz:500,endHz:620,duration:0.12,osc:'sine',color:'#a7fce0',target:'spark'},
  wrong:{label:'Short circuit',hz:330,endHz:120,duration:0.28,osc:'square',color:'#ff9793',target:'spark'},
  return:{label:'Safe return',hz:220,endHz:360,duration:0.16,osc:'triangle',color:'#f2c6a1',target:'spark'},
  solve:{label:'Equation solved',hz:560,endHz:840,duration:0.29,osc:'sine',color:'#a5ffda',target:'spark'},
  cell:{label:'Cell charged',hz:490,endHz:980,duration:0.36,osc:'triangle',color:'#87f4e6',target:'spark'},
  rebase:{label:'New number',hz:400,endHz:330,duration:0.15,osc:'sine',color:'#b5e4ff',target:'spark'},
  pause:{label:'Paused',hz:330,endHz:300,duration:0.10,osc:'sine',color:'#b0cee4',target:'spark'},
  resume:{label:'Resumed',hz:330,endHz:510,duration:0.11,osc:'sine',color:'#b0cee4',target:'spark'},
  capture:{label:'Captured',hz:360,endHz:65,duration:0.46,osc:'sawtooth' as 'square',color:'#ff647e',target:'pursuer'},
  quit:{label:'Ended',hz:270,endHz:160,duration:0.19,osc:'sine',color:'#b0bccc',target:'spark'},
  pulse:{label:'Pulse',hz:195,endHz:740,duration:0.35,osc:'triangle',color:'#86ffe9',target:'spark'},
  pulseMiss:{label:'Pulse missed',hz:320,endHz:200,duration:0.18,osc:'triangle',color:'#ffdfa4',target:'spark'},
  pulseEnd:{label:'Pulse ended',hz:510,endHz:270,duration:0.18,osc:'sine',color:'#b6f9e5',target:'spark'},
  charge:{label:'Charge gained',hz:600,endHz:840,duration:0.15,osc:'sine',color:'#fff1a7',target:'spark'},
  relay:{label:'Relay powered',hz:425,endHz:760,duration:0.24,osc:'triangle',color:'#a9f1fa',target:'spark'},
  stage:{label:'New stage',hz:440,endHz:880,duration:0.30,osc:'sine',color:'#e6d8ff',target:'spark'},
  notice:{label:'Surprised!',hz:460,endHz:850,duration:0.16,osc:'triangle',color:'#ff9bc7',target:'pursuer'},
  hesitate:{label:'Hesitating',hz:360,endHz:290,duration:0.13,osc:'sine',color:'#ffd0a3',target:'pursuer'},
  curious:{label:'Investigating',hz:305,endHz:440,duration:0.13,osc:'sine',color:'#ffcbb2',target:'pursuer'},
  frustrated:{label:'Frustrated!',hz:220,endHz:155,duration:0.22,osc:'square',color:'#ff798c',target:'pursuer'},
  focus:{label:'Target spotted',hz:400,endHz:610,duration:0.14,osc:'triangle',color:'#ff6687',target:'pursuer'},
  achievement:{label:'Achievement',hz:680,endHz:1040,duration:0.32,osc:'sine',color:'#efe1ff',target:'spark'},
};
export const CORE_CUES:Readonly<Record<string,FeedbackCueId>>={
  RUN_STARTED:'start',ATTEMPT_EVALUATED:'select',
  TRAVEL_STARTED:'travel',LANDING_CONFIRMED:'land',
  PLATFORM_SHORTED:'wrong',RETURN_FINISHED:'return',
  ROW_COMPLETED:'solve',CELL_COMPLETED:'cell',
  VOLTAGE_REBASE:'rebase',RUN_PAUSED:'pause',RUN_RESUMED:'resume',
};
export const FEATURE_CUES:Readonly<Record<string,FeedbackCueId>>={
  ABILITY_EXPIRED:'pulseEnd',RELAY_CHAIN:'relay',
  CHARGE_GAINED:'charge',STAGE_REACHED:'stage',
};
