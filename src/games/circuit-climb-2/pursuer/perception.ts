/**
 * The one deliberate truth boundary. The Brain imports only the Observation
 * type and cannot see the player's selected answer or future route.
 *
 * Finite electrical proximity (260), optional unoccluded sight (420), and
 * recent PHYSICALLY TRAVELLED wake fragments (110 / 240 ticks) are allowed.
 */
import type { WorldV1 } from '../world/world';
import type { Point } from './pursuitGraph';
import type { PursuerPresetV1 } from './pursuerPreset';
export interface WakePoint extends Point {tick:number}
export interface SensedPoint extends Point {tick:number;source:'NEAR'|'SIGHT'|'WAKE'}
export interface PursuerObservation {
  tick:number;
  pursuer:Point;
  live:SensedPoint|null;
  wake:SensedPoint|null;
}
/** Conservative continuous LOS against drawn cards, not speculative routes. */
function lineCrossesRectangle(a:Point,b:Point,r:{left:number;right:number;top:number;bottom:number}):boolean{
  const dx=b.x-a.x,dy=b.y-a.y;
  let lo=0,hi=1;
  const checks:[number,number][]=[
    [-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y],
  ];
  for(const [p,q] of checks){
    if(Math.abs(p)<1e-10){if(q<0)return false;continue;}
    const t=q/p;
    if(p<0){lo=Math.max(lo,t);}else{hi=Math.min(hi,t);}
    if(lo>hi)return false;
  }
  return hi>=0&&lo<=1;
}
export function hasClearSight(world:WorldV1,a:Point,b:Point):boolean{
  for(const row of world.rows)for(const card of row.platforms){
    if(row.index===0&&card.column!==1)continue;
    // Intentionally uninflated obstacle: a sight ray, not a moving body.
    const rect={left:card.x-card.width/2,right:card.x+card.width/2,
      top:card.y,bottom:card.y+card.height};
    if(lineCrossesRectangle(a,b,rect))return false;
  }
  return true;
}
export function observePursuer(
  world:WorldV1,pursuer:Point,actualSpark:Point,
  actualWake:readonly WakePoint[],tick:number,preset:PursuerPresetV1,
):PursuerObservation{
  const distance=Math.hypot(actualSpark.x-pursuer.x,actualSpark.y-pursuer.y);
  const source: SensedPoint['source']|null=
    distance<=preset.nearSenseRadius?'NEAR':
    distance<=preset.clearSightRadius&&hasClearSight(world,pursuer,actualSpark)?'SIGHT':null;
  const live=source?{x:actualSpark.x,y:actualSpark.y,tick,source}:null;
  let wake:SensedPoint|null=null;
  for(const point of actualWake){
    if(point.tick>=tick||tick-point.tick>preset.trailLifetimeTicks)continue;
    if(Math.hypot(point.x-pursuer.x,point.y-pursuer.y)<=preset.trailSenseRadius){
      if(!wake||point.tick>wake.tick)
        wake={x:point.x,y:point.y,tick:point.tick,source:'WAKE'};
    }
  }
  // No truth position is forwarded when not legitimately sensed.
  return {tick,pursuer:{...pursuer},live,wake};
}
