/**
 * CC2-44: asymmetric tower framing and user-tunable VISUAL row pitch.
 *
 * Source-owned physical row gaps, pathfinding, mathematical answers, and
 * Pursuer sensing are untouched. These tests use the same projector as the
 * Heritage canvas and three actual mathematical DOM buttons.
 */
import {describe,it,expect} from 'vitest';
import {
  computeProductionCamera,
  projectProductionPoint,
} from '../presentation/productionCamera';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';

const columns=[180,300,420] as const;
const physicalGaps=[205,307.5,576.5625,760];
const viewports=[
  {width:308,pitch:96},
  {width:376,pitch:96},
  {width:412,pitch:96},
  {width:736,pitch:108},
  {width:972,pitch:108},
];
function frame(cssWidth:number,pitch:number,worldGap:number,
  precedingY=-20000){
  const height=4*pitch+170;
  return computeProductionCamera({
    logicalWidth:600,logicalHeight:600*height/cssWidth,
    rowGap:worldGap,platformHeight:50,
    columns,sparkY:0,previousCameraY:precedingY,
    maxZoom:.7,follow:.13,fitRowGap:worldGap,
    minimumRowsEachSide:3,coverageExpansion:1.06,
    lockedRowPitchCssPx:pitch,canvasCssWidth:cssWidth,
    flowFraming:'3_UP_1_DOWN',
  });
}
function y(worldY:number,projection:ReturnType<typeof frame>,width:number){
  return projectProductionPoint(300,worldY,projection,600,width).y;
}
describe('CC2-44: exactly three rows above, one below, independent pitch',()=>{
  it('anchors the third future tier 50px from top with one true tier below',()=>{
    for(const view of viewports){
      for(const worldGap of physicalGaps){
        const v=frame(view.width,view.pitch,worldGap);
        const future3=y(-3*worldGap,v,view.width);
        const spark=y(0,v,view.width);
        const below1=y(worldGap,v,view.width);
        expect(future3).toBeGreaterThanOrEqual(41.9);
        expect(future3).toBeLessThanOrEqual(58.1);
        expect(spark-future3).toBeCloseTo(3*view.pitch,7);
        expect(below1-spark).toBeCloseTo(view.pitch,7);
        expect(4*view.pitch+170-below1).toBeGreaterThanOrEqual(111);
        expect(v.lockedRowPitchCssPx).toBe(view.pitch);
        expect(v.aboveRows).toBeGreaterThan(3.3);
        expect(v.belowRows).toBeGreaterThan(1.1);
      }
    }
  });
  it('the row-distance slider changes actual pixels, never camera-cancels spacing',()=>{
    const widths=[320,390,768];
    for(const width of widths){
      for(const pitch of [80,88,96,108,120,132,140]){
        const a=frame(width,pitch,576.5625);
        const renderedGap=y(0,a,width)-y(-576.5625,a,width);
        expect(renderedGap).toBeCloseTo(pitch,7);
      }
    }
  });
  it('persists the historical CC2-43 symmetric camera if opt-in omitted',()=>{
    const v=computeProductionCamera({
      logicalWidth:600,logicalHeight:600*720/390,
      rowGap:576.5625,platformHeight:50,columns,
      sparkY:0,previousCameraY:-2000,maxZoom:.70,follow:.13,
      minimumRowsEachSide:3,lockedRowPitchCssPx:96,canvasCssWidth:390,
    });
    const center=y(0,v,390);
    expect(center).toBeCloseTo(360,0);
  });
  it('rejects asymmetric camera without a valid visual pitch and canvas width',()=>{
    expect(()=>computeProductionCamera({
      logicalWidth:600,logicalHeight:900,
      rowGap:205,platformHeight:50,columns,sparkY:0,
      previousCameraY:0,maxZoom:.7,follow:.13,
      flowFraming:'3_UP_1_DOWN',
    })).toThrow('CC2_PRODUCTION_CAMERA_INVALID');
  });
  it('does not alter real world physical row geometry, progress, score or replay',()=>{
    const engine=new CircuitClimbCore('cc2-44-immutable-source',{
      ...defaultRunConfig(),rowGapScale:2.8125,
    });
    const before=engine.stateDigest();
    const original=engine.snapshot();
    for(const pitch of [80,96,108,120,140]){
      const v=frame(390,pitch,original.world.geometry.rowGap);
      projectProductionPoint(original.spark.x,original.spark.y,v,600,390);
    }
    expect(engine.stateDigest()).toBe(before);
    expect(engine.snapshot()).toEqual(original);
  });
});
