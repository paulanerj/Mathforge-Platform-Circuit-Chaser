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
  /** Optional presentation-only fit reference for expanded CC2-09B geometry. */
  fitRowGap?:number;
  /** Presentation-only extra world around the active Spark. */
  coverageExpansion?:number;
  /** CC2-30F visual-only six-row flowing-world mode. */
  minimumRowsEachSide?:2|3;
  /**
   * CC2-43: a presentation-only, screen-pixel pitch that does NOT depend on
   * the game's physical rowGap, viewport width, or a camera zoom preset.
   * Used only by the opted-in 3+3 flowing tower. Camera/projector and the
   * visible Heritage canvas must consume this one transform.
   */
  lockedRowPitchCssPx?:number;
  /** Required when lockedRowPitchCssPx is supplied. */
  canvasCssWidth?:number;
}
export interface ProductionCameraFrame {
  xScale:number;
  yScale:number;
  cameraY:number;
  aboveRows:number;
  belowRows:number;
  centerPositions:number[];
  /** Null in historical free-fit mode. Screen-space centre-to-centre gap. */
  lockedRowPitchCssPx:number|null;
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
    !Number.isFinite(v.follow) || v.follow<=0 || v.follow>1 ||
    (v.fitRowGap!==undefined && (!Number.isFinite(v.fitRowGap)||v.fitRowGap<=0)) ||
    (v.minimumRowsEachSide!==undefined &&
      v.minimumRowsEachSide!==2&&v.minimumRowsEachSide!==3) ||
    (v.coverageExpansion!==undefined &&
      (!Number.isFinite(v.coverageExpansion)||v.coverageExpansion<1||v.coverageExpansion>1.5)) ||
    (v.lockedRowPitchCssPx!==undefined &&
      (!Number.isFinite(v.lockedRowPitchCssPx)||
       v.lockedRowPitchCssPx<80||v.lockedRowPitchCssPx>150||
       !Number.isFinite(v.canvasCssWidth)||v.canvasCssWidth!<=0))) {
    throw Error('CC2_PRODUCTION_CAMERA_INVALID');
  }
  const laneGap=(v.columns[2]-v.columns[0])/2;
  const xScale=(v.logicalWidth*LANE_DISTANCE_FRACTION)/laneGap;
  // CC2-06C: preserve two entire levels each way, but reserve an extra
  // 0.8 tier of tracking headroom. Without this buffer the camera snaps
  // perfectly onto Spark on every physics tick and creates a "teleporting
  // platforms" illusion even while source-owned Spark moves continuously.
  // With a bounded follow lag, Spark visibly moves inside its own viewport.
  const locked=v.lockedRowPitchCssPx!==undefined;
  const fitGap=v.fitRowGap??v.rowGap;
  const desiredSpan=2*(v.minimumRowsEachSide??MIN_VISIBLE_ROWS_EACH_SIDE)*
    fitGap+v.platformHeight+96;
  const trackingHeadroom=(v.minimumRowsEachSide===3?1.0:.8)*fitGap;
  // CC2-43: the former camera fitted all rows by shrinking yScale after
  // every physical rowGap increase, making 2.8125x source spacing look
  // almost identical to the original compressed view. A locked CSS pixel
  // pitch breaks that feedback loop without changing world, AI, or math.
  const yScale=locked
    ?(v.lockedRowPitchCssPx!*v.logicalWidth/(v.canvasCssWidth!*v.rowGap))
    :Math.max(0.10,Math.min(v.maxZoom,
      v.logicalHeight/(desiredSpan+trackingHeadroom))/(v.coverageExpansion??1));
  const idealCameraY=v.sparkY-v.logicalHeight/(2*yScale);
  const proposed=v.previousCameraY+
    (idealCameraY-v.previousCameraY)*v.follow;
  // Old free-fit camera retains its historical tracking behavior. The
  // locked mode constrains Spark's drift to at most eight CSS pixels from
  // viewport center so that structural tiers stay visually symmetrical.
  const spare=locked
    ?8*v.logicalWidth/(v.canvasCssWidth!*yScale)
    :Math.max(0,(v.logicalHeight/yScale-desiredSpan)/2);
  const cameraY=Math.max(idealCameraY-spare,
    Math.min(idealCameraY+spare,proposed));
  const aboveRows=(v.sparkY-cameraY)/v.rowGap;
  const belowRows=(cameraY+v.logicalHeight/yScale-v.sparkY)/v.rowGap;
  return {
    xScale,yScale,cameraY,aboveRows,belowRows,
    lockedRowPitchCssPx:v.lockedRowPitchCssPx??null,
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
