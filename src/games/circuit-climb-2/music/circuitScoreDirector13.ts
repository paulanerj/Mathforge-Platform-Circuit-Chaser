/**
 * CC2-13 — source-owned event -> performance -> musical director contract.
 *
 * The mathematics, Pursuer and abilities are NOT dependencies of this module.
 * The musical layer observes immutable receipts, does not invent success,
 * maintains a common 112 BPM / 16-bar transport and changes orchestration
 * only at a bar boundary. It cannot mutate or decide gameplay.
 *
 * Speed Grid pattern: five transport roles (pulse, foundation, rhythm,
 * energy, tension) are distinct from the suite's four compositional roles
 * (Atmosphere, Harmony, Motion, Wonder).
 */
export type MusicalRole13 =
  'atmosphere'|'harmony'|'motion'|'wonder'|'pulse'|
  'foundation'|'rhythm'|'energy'|'tension';

export const SCORE_ROLES13:readonly MusicalRole13[]=[
  'atmosphere','harmony','motion','wonder','pulse',
  'foundation','rhythm','energy','tension',
];
export interface ScoreEvent13 {
  readonly id:string;
  readonly runId:string;
  readonly tick:number;
  readonly type:string;
  readonly detail:Readonly<Record<string,string|number|boolean>>;
}
export interface ScoreSource13 {
  readonly runId:string;
  readonly tick:number;
  readonly completedRows:number;
  readonly paused:boolean;
  readonly phase:string;
}
export interface MusicalReceipt13 {
  readonly id:string;
  readonly runId:string;
  readonly tick:number;
  readonly kind:
    'selection'|'solved'|'mistake'|'cell'|'capacitor'|'relay'|
    'stage'|'pulse-hit'|'pulse-miss'|'pulse-expired'|'capture'|
    'goal'|'quit'|'pause'|'resume';
  readonly sourceType:string;
}
export interface ScoreSnapshot13 {
  readonly schema:'cc2-score-director/v1';
  readonly runId:string;
  readonly stage:number;
  readonly desiredStage:number;
  readonly streak:number;
  readonly completedRows:number;
  readonly pressure:boolean;
  readonly paused:boolean;
  readonly ended:boolean;
  readonly lastActionTick:number;
  readonly barIndex:number;
  readonly receipts:number;
}
const mapCore:Readonly<Record<string,MusicalReceipt13['kind']|undefined>>={
  ATTEMPT_EVALUATED:'selection',ROW_COMPLETED:'solved',
  PLATFORM_SHORTED:'mistake',CELL_COMPLETED:'cell',
  RUN_PAUSED:'pause',RUN_RESUMED:'resume',
};
const mapFeature:Readonly<Record<string,MusicalReceipt13['kind']|undefined>>={
  RELAY_CHAIN:'relay',STAGE_REACHED:'stage',ABILITY_EXPIRED:'pulse-expired',
};
export class CircuitScoreDirector13 {
  private runId='';
  private stage=1;
  private desiredStage=1;
  private streak=0;
  private completedRows=0;
  private pressure=false;
  private paused=false;
  private ended=false;
  private lastActionTick=0;
  private lastTick=0;
  private barIndex=-1;
  private seen=new Set<string>();
  private receipts:MusicalReceipt13[]=[];
  private queued:MusicalReceipt13[]=[];

  private reset(runId:string):void {
    this.runId=runId;this.stage=1;this.desiredStage=1;
    this.streak=0;this.completedRows=0;this.pressure=false;
    this.paused=false;this.ended=false;this.lastActionTick=0;
    this.barIndex=-1;this.lastTick=0;this.seen.clear();
    this.receipts=[];this.queued=[];
  }
  private record(e:ScoreEvent13,kind:MusicalReceipt13['kind']):void{
    const entry:MusicalReceipt13={id:e.id,runId:e.runId,tick:e.tick,
      kind,sourceType:e.type};
    this.receipts.push(entry);
    this.queued.push(entry);
    if(this.receipts.length>500)this.receipts.shift();
    if(this.queued.length>80)this.queued.shift();
    if(kind==='solved'){this.streak++;this.completedRows++;
      this.lastActionTick=e.tick;}
    if(kind==='mistake'){this.streak=0;this.lastActionTick=e.tick;}
    if(kind==='selection')this.lastActionTick=e.tick;
    if(kind==='pause')this.paused=true;
    if(kind==='resume')this.paused=false;
    if(kind==='capture'||kind==='goal'||kind==='quit')this.ended=true;
  }
  /**
   * Idempotent, run-scoped, chronological reading of ACTUAL ledger receipts.
   * Source event IDs are deduplicated; no clicks/frames award streak credit.
   */
  consume(source:ScoreSource13,core:readonly ScoreEvent13[],
    features:readonly ScoreEvent13[],sensed:boolean):void{
    if(!source||!source.runId)return;
    if(source.runId!==this.runId||source.tick<this.lastTick)this.reset(source.runId);
    this.lastTick=source.tick;
    const joined=[
      ...core.filter(e=>e.runId===source.runId).map(e=>({e,order:0})),
      ...features.filter(e=>e.runId===source.runId).map(e=>({e,order:1})),
    ].sort((a,b)=>a.e.tick-b.e.tick||a.order-b.order);
    for(const {e} of joined){
      const key=e.runId+'|'+e.id+'|'+e.type;
      if(this.seen.has(key))continue;
      this.seen.add(key);
      let kind:MusicalReceipt13['kind']|undefined;
      if(e.type==='RUN_ENDED'){
        kind=e.detail.reason==='CAPTURED'?'capture':
          ['CHALLENGE_GOAL','PRACTICE_GOAL'].includes(String(e.detail.reason))
          ?'goal':'quit';
      }else if(e.type==='CHARGE_GAINED'){
        // No reward/special accent if the capacity clamp awarded 0.
        if(e.detail.modifier==='CAPACITOR'&&Number(e.detail.earned)>0)
          kind='capacitor';
      }else if(e.type==='ABILITY_ACTIVATED'){
        kind=e.detail.affected===true?'pulse-hit':'pulse-miss';
      }else kind=mapCore[e.type]||mapFeature[e.type];
      if(kind)this.record(e,kind);
    }
    this.completedRows=source.completedRows;
    this.pressure=Boolean(sensed);
    this.paused=source.paused;
    this.ended=source.phase==='ended'||this.ended;
    // The score reacts to actual completed rows and correct streaks,
    // not tapping speed, inferred answers or unsolved attempts.
    const age=Math.max(0,source.tick-this.lastActionTick);
    const relaxed=age>480?Math.min(2,this.streak):this.streak;
    this.desiredStage=Math.max(1,Math.min(7,
      1+Math.floor(relaxed/2)+Math.min(2,Math.floor(this.completedRows/5))
      +(this.pressure?1:0)));
    if(this.ended)this.desiredStage=1;
  }
  /** Commit only at distinct bar boundaries, never on each tap. */
  commitBar(bar:number):number{
    if(!Number.isInteger(bar)||bar<0)throw Error('CC2_MUSIC_INVALID_BAR');
    if(bar!==this.barIndex){
      this.barIndex=bar;
      this.stage=this.desiredStage;
    }
    return this.stage;
  }
  drain():MusicalReceipt13[]{
    const out=this.queued.map(r=>({...r}));
    this.queued=[];return out;
  }
  snapshot():ScoreSnapshot13{
    return{schema:'cc2-score-director/v1',runId:this.runId,
      stage:this.stage,desiredStage:this.desiredStage,
      streak:this.streak,completedRows:this.completedRows,
      pressure:this.pressure,paused:this.paused,ended:this.ended,
      lastActionTick:this.lastActionTick,barIndex:this.barIndex,
      receipts:this.receipts.length};
  }
  report():MusicalReceipt13[]{return this.receipts.map(r=>({...r}));}
}

/**
 * Manifest format for later synchronized MP3/M4A/WAV stems.
 * Current CC2-13 audition remains completely code-generated.
 */
export interface RecordedStemManifest13 {
  schema:'cc2-recorded-score/v1';
  bpm:112;
  bars:16;
  masterSampleRate:number;
  stems:ReadonlyArray<{role:MusicalRole13;url:string;
    durationSeconds:number;originSamples:0;licenseId:string}>;
}
export function validateStemManifest13(m:RecordedStemManifest13):void{
  if(m.schema!=='cc2-recorded-score/v1'||m.bpm!==112||m.bars!==16||
    !Number.isInteger(m.masterSampleRate)||m.masterSampleRate<22050)
    throw Error('CC2_STEM_MANIFEST_SCHEMA');
  if(m.stems.length!==SCORE_ROLES13.length||
    new Set(m.stems.map(s=>s.role)).size!==SCORE_ROLES13.length)
    throw Error('CC2_STEM_MANIFEST_ROLES');
  const expected=16*4*60/112;
  for(const s of m.stems){
    if(!SCORE_ROLES13.includes(s.role)||s.originSamples!==0||
      !Number.isFinite(s.durationSeconds)||
      Math.abs(s.durationSeconds-expected)>0.04||
      !/^https:\/\//.test(s.url)||!s.licenseId.trim())
      throw Error('CC2_STEM_MANIFEST_ALIGNMENT');
  }
}
