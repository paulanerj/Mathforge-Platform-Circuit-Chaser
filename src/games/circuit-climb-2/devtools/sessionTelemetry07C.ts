/**
 * CC2-07C — Read-only source-owned gameplay session telemetry.
 *
 * This observer never changes the learner, pursuer, replay, sound engine,
 * animation, or mathematical questions. It records only a capped, fixed-tick
 * subset of the live source state for reproducible owner playtesting.
 */
import type {EngineStateV1} from '../core/CircuitClimbCore';
import type {PursuerSnapshot} from '../pursuer/pursuerController';

export interface SessionSampleV1 {
  tick:number;
  spark:{x:number;y:number;row:number;phase:EngineStateV1['phase']};
  bot:{x:number;y:number;mode:string;goal:string;
    sensed:boolean;emotion:string;routeFailures:number}|null;
  rangeWorld:number|null;
  completedRows:number;
}
export interface SessionSummaryV1 {
  tickCount:number;
  sampleCount:number;
  samplesRetained:number;
  firstSensedTick:number|null;
  sensingSamples:number;
  minRangeWorld:number|null;
  meanRangeWorld:number|null;
  maxRouteFailures:number;
  rowsCompleted:number;
  endReason:EngineStateV1['endReason'];
}
export const TELEMETRY_INTERVAL_TICKS=15;
export const TELEMETRY_MAX_SAMPLES=1200;

export class SessionTelemetry07C {
  private points:SessionSampleV1[]=[];
  private lastTick=-1;
  private sensing=0;
  private totalRange=0;
  private rangeCount=0;
  private firstSensed:number|null=null;
  private minRange=Infinity;
  private maxFailures=0;
  private rowsCompleted=0;
  private endReason:EngineStateV1['endReason']=null;

  observe(s:EngineStateV1,bot:PursuerSnapshot|null,forceSample=false):void{
    if(s.tick<=this.lastTick)return;
    this.lastTick=s.tick;
    this.rowsCompleted=s.completedRows;
    this.endReason=s.endReason;
    const range=bot?Math.hypot(
      s.spark.x-bot.body.x,s.spark.y-bot.body.y):null;
    if(range!==null){
      this.totalRange+=range;this.rangeCount++;
      this.minRange=Math.min(this.minRange,range);
      this.maxFailures=Math.max(this.maxFailures,bot!.routeFailures);
      if(bot!.sensed){
        this.sensing++;
        if(this.firstSensed===null)this.firstSensed=s.tick;
      }
    }
    if(!forceSample && s.tick%TELEMETRY_INTERVAL_TICKS!==0 &&
       s.phase!=='ended' && s.tick!==0)return;
    this.points.push({
      tick:s.tick,
      spark:{x:s.spark.x,y:s.spark.y,row:s.spark.row,phase:s.phase},
      bot:bot?{x:bot.body.x,y:bot.body.y,mode:bot.belief.mode,
        goal:bot.belief.goalId,sensed:bot.sensed,
        emotion:bot.emotion,routeFailures:bot.routeFailures}:null,
      rangeWorld:range,completedRows:s.completedRows,
    });
    if(this.points.length>TELEMETRY_MAX_SAMPLES)this.points.shift();
  }
  reset():void{
    this.points=[];this.lastTick=-1;
    this.sensing=0;this.totalRange=0;this.rangeCount=0;
    this.firstSensed=null;this.minRange=Infinity;
    this.maxFailures=0;this.rowsCompleted=0;this.endReason=null;
  }
  samples():SessionSampleV1[]{return this.points.map(p=>({
    ...p,spark:{...p.spark},bot:p.bot?{...p.bot}:null,
  }));}
  summary():SessionSummaryV1{
    return {
      tickCount:Math.max(0,this.lastTick),
      sampleCount:this.rangeCount,
      samplesRetained:this.points.length,
      firstSensedTick:this.firstSensed,
      sensingSamples:this.sensing,
      minRangeWorld:Number.isFinite(this.minRange)?this.minRange:null,
      meanRangeWorld:this.rangeCount?this.totalRange/this.rangeCount:null,
      maxRouteFailures:this.maxFailures,
      rowsCompleted:this.rowsCompleted,
      endReason:this.endReason,
    };
  }
}
