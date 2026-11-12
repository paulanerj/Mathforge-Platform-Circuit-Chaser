/**
 * CC2-06A — production camera presentation contract.
 *
 * The tower has two independent presentation scales:
 *   - xScale fits all THREE physical lanes into evenly spaced screen slots.
 *   - yScale fits TWO row levels above AND TWO below the actual Spark.
 *
 * Neither scale is fed into collision, math, pathfinding, player movement,
 * pursuer sensors, or replay state. The canvas and DOM choices MUST use the
 * same projection to avoid the disparate geometry in the owner's screenshot.
 */
export interface ProductionCameraInput {
  logicalWidth:number;
  logicalHeight:number;
  rowGap:number;
  platformHeight:number;
  columns:readonly number[];
  sparkY:number;
  previousCameraY:number;
  maxZoom:number;
  follow:number;
}
export interface ProductionCameraFrame {
  xScale:number;
  yScale:number;
  cameraY:number;
  aboveRows:number;
  belowRows:number;
  centerPositions:number[];
}
export const MIN_VISIBLE_ROWS_EACH_SIDE=2;
export const LANE_DISTANCE_FRACTION=0.28;
export function computeProductionCamera(v:ProductionCameraInput):ProductionCameraFrame {
  if(v.columns.length!==3 || !v.columns.every(Number.isFinite) ||
    v.columns[0]>=v.columns[1] || v.columns[1]>=v.columns[2] ||
    !Number.isFinite(v.logicalWidth) || v.logicalWidth<=0 ||
    !Number.isFinite(v.logicalHeight) || v.logicalHeight<=0 ||
    !Number.isFinite(v.rowGap) || v.rowGap<=0 ||
    !Number.isFinite(v.platformHeight) || v.platformHeight<=0 ||
    !Number.isFinite(v.maxZoom) || v.maxZoom<=0 || v.maxZoom>1 ||
    !Number.isFinite(v.follow) || v.follow<=0 || v.follow>1) {
    throw Error('CC2_PRODUCTION_CAMERA_INVALID');
  }
  const laneGap=(v.columns[2]-v.columns[0])/2;
  const xScale=(v.logicalWidth*LANE_DISTANCE_FRACTION)/laneGap;
  // Includes platform height and a visual margin, not just row centerlines.
  const desiredSpan=2*MIN_VISIBLE_ROWS_EACH_SIDE*v.rowGap+
    v.platformHeight+96;
  const yScale=Math.max(0.10,Math.min(v.maxZoom,v.logicalHeight/desiredSpan));
  const idealCameraY=v.sparkY-v.logicalHeight/(2*yScale);
  const spare=Math.max(0,(v.logicalHeight/yScale-desiredSpan)/2);
  const proposed=v.previousCameraY+
    (idealCameraY-v.previousCameraY)*v.follow;
  const cameraY=Math.max(idealCameraY-spare,
    Math.min(idealCameraY+spare,proposed));
  const aboveRows=(v.sparkY-cameraY)/v.rowGap;
  const belowRows=(cameraY+v.logicalHeight/yScale-v.sparkY)/v.rowGap;
  return {
    xScale,yScale,cameraY,aboveRows,belowRows,
    centerPositions:v.columns.map(x=>v.logicalWidth/2+
      (x-v.logicalWidth/2)*xScale),
  };
}
export function projectProductionPoint(
  worldX:number,worldY:number,camera:ProductionCameraFrame,
  logicalWidth:number,canvasCssWidth:number,
):{x:number;y:number}{
  if(!Number.isFinite(canvasCssWidth) || canvasCssWidth<=0 ||
     !Number.isFinite(logicalWidth) || logicalWidth<=0)
    throw Error('CC2_PRODUCTION_PROJECTOR_INVALID');
  const cssScale=canvasCssWidth/logicalWidth;
  return {
    x:(logicalWidth/2+(worldX-logicalWidth/2)*camera.xScale)*cssScale,
    y:(worldY-camera.cameraY)*camera.yScale*cssScale,
  };
}
