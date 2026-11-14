/**
 * CC2-10 — seeded, opt-in Spark motion language.
 *
 * This is an ALTERNATE REAL LEARNER ROUTE, never a cosmetic displacement.
 * Every detour retraces a subsection of an already collision-qualified
 * source path. We still run the original clearance predicate on the complete
 * candidate, and refuse any candidate that fails. Destination, scoring,
 * mathematical correctness and Pursuer state are not accessible here.
 */
import {SeededRandom} from '../config/prng';
import {isRouteClear,collectActivePlatforms,type RoutePoint} from './legacyLearnerRouting';
import type {WorldV1,WorldPlatformV1} from './world';

export type SparkTravelStyle10 =
  'FOCUSED_SPRINT'|'LIVELY_WEAVE'|'FEINT_RECOVER'|'OVERSHOOT_SETTLE';
export interface ExpressiveRoute10 {
  readonly style:SparkTravelStyle10;
  readonly points:RoutePoint[];
  readonly totalLength:number;
  readonly varied:boolean;
  readonly suppressed:boolean;
  readonly sections:number;
}
const len=(a:RoutePoint,b:RoutePoint)=>
  Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
const length=(points:readonly RoutePoint[])=>
  points.slice(1).reduce((n,p,i)=>n+len(points[i],p),0);
const lerp=(a:RoutePoint,b:RoutePoint,t:number):RoutePoint=>({
  x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
});
const same=(a:RoutePoint,b:RoutePoint)=>
  Math.abs(a.x-b.x)<1e-7&&Math.abs(a.y-b.y)<1e-7;

export function expressiveRoute10(
  world:WorldV1,source:WorldPlatformV1,destination:WorldPlatformV1,
  base:readonly RoutePoint[],seed:string,suppress=false,
):ExpressiveRoute10 {
  const original=base.map(p=>({...p}));
  const baseline={style:'FOCUSED_SPRINT' as SparkTravelStyle10,
    points:original,totalLength:length(original),
    varied:false,suppressed:suppress,sections:0};
  if(original.length<4||suppress)return baseline;
  // Independent named random stream; never consume mathematics or Pursuer RNG.
  const rng=new SeededRandom(seed+':cc2-motion-styles/v1');
  if(rng.next()>=0.25)return baseline;
  const possibilities:[SparkTravelStyle10,...SparkTravelStyle10[]]=
    ['LIVELY_WEAVE','FEINT_RECOVER','OVERSHOOT_SETTLE'];
  const style=possibilities[rng.integer(0,possibilities.length-1)];
  // Avoid the physical departure and terminal landing: these are governed
  // by stricter source/destination collision exemptions.
  const viable:number[]=[];
  for(let i=2;i<original.length-1;i++){
    const a=original[i-1],b=original[i];
    if(len(a,b)>=55 && (Math.abs(a.x-b.x)<1e-7 ||
                        Math.abs(a.y-b.y)<1e-7))viable.push(i);
  }
  if(!viable.length)return baseline;
  const count=style==='LIVELY_WEAVE'?Math.min(2,viable.length):1;
  const chosen=rng.shuffle(viable).slice(0,count).sort((a,b)=>a-b);
  const sections=new Set(chosen);
  const candidate:RoutePoint[]=[{...original[0]}];
  for(let i=1;i<original.length;i++){
    const a=original[i-1],b=original[i];
    if(sections.has(i)){
      if(style==='OVERSHOOT_SETTLE'){
        // Overshoot a local approach marker inside a proven-clear segment,
        // recover and continue; NEVER overshoot a landing platform.
        const pivot=lerp(a,b,0.67),overshoot=lerp(a,b,0.73);
        candidate.push(pivot,overshoot,pivot,overshoot);
      }else{
        // A short real retreat along a source-verified circuit segment.
        const pivot=lerp(a,b,0.53);
        const retreat=lerp(a,b,style==='FEINT_RECOVER'?0.33:0.43);
        candidate.push(pivot,retreat,pivot);
      }
    }
    candidate.push({...b});
  }
  // Bounded local variation: never double an entire journey's distance.
  // A repeated source corridor is actor safe, but the complete route must
  // also pass the original authoritative geometry predicate.
  const total=length(candidate);
  const legalStructure=candidate.length>=2 &&
    candidate.every((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&
      (i===0|| (len(candidate[i-1],p)>1e-6 &&
      (Math.abs(candidate[i-1].x-p.x)<1e-7 ||
       Math.abs(candidate[i-1].y-p.y)<1e-7)))) &&
    same(candidate[0],original[0]) &&
    same(candidate[candidate.length-1],original[original.length-1]) &&
    candidate.length-1 <= (original.length-1)*2 &&
    total>=baseline.totalLength&&total<=baseline.totalLength+150;
  if(!legalStructure)return baseline;
  const clear=isRouteClear({
    config:world.geometry,
    activePlatforms:collectActivePlatforms(world.rows),
    getRow:index=>world.rows.find(row=>row.index===index)??null,
    sourcePlatform:source,threat:null,avoidance:0,
  },candidate,destination);
  if(!clear)return baseline;
  return {style,points:candidate,totalLength:total,
    varied:true,suppressed:false,sections:chosen.length};
}
