/**
 * CC2-07D — honest Pursuer proximity presentation.
 *
 * Read-only. This module uses the REAL, currently simulated Spark/Pursuer
 * coordinates and the ACTUAL world rowGap. It does not claim the Pursuer
 * senses Spark merely because the learner's screen shows a threat radar.
 */
export interface ThreatPoint {x:number;y:number}
export type ThreatLevel='far'|'approaching'|'near'|'critical';
export interface ThreatReadout {
  level:ThreatLevel;
  rangeWorld:number;
  rangeInTiers:number;
  magnitudePercent:number;
  relativeDirection:'above'|'below'|'level';
  label:string;
}
export function classifyThreat(
  spark:ThreatPoint,pursuer:ThreatPoint,rowGap:number,
):ThreatReadout{
  if(!Number.isFinite(rowGap)||rowGap<=0 ||
    ![spark.x,spark.y,pursuer.x,pursuer.y].every(Number.isFinite))
    throw Error('CC2_THREAT_INVALID_WORLD');
  const distance=Math.hypot(spark.x-pursuer.x,spark.y-pursuer.y);
  const tiers=distance/rowGap;
  const level:ThreatLevel=tiers<=.85?'critical':
    tiers<=1.55?'near':tiers<=2.75?'approaching':'far';
  const dy=pursuer.y-spark.y;
  const direction=Math.abs(dy)<rowGap*.3?'level':dy>0?'below':'above';
  const percent=Math.round(100*Math.max(0,Math.min(1,
    (3.5-tiers)/3.5)));
  const label=level==='critical'?'CONTACT IMMINENT':
    level==='near'?'CLOSE PURSUIT':
    level==='approaching'?'PURSUER APPROACHING':'PURSUER DISTANT';
  return {level,rangeWorld:distance,rangeInTiers:tiers,
    magnitudePercent:percent,relativeDirection:direction,label};
}
