/**
 * CC2-43 — owner-locked presentation geometry.
 *
 * Protects against the historical feedback loop: increasing the physical
 * source row gap caused the old camera to zoom back out, preserving cramped
 * screen spacing and then losing symmetry at the beginning of a run.
 *
 * All assertions use the SAME projection as the actual buttons and painter.
 * These tests do not create future mathematical rows.
 */
import {describe,it,expect} from 'vitest';
import {
  computeProductionCamera,projectProductionPoint,
} from '../presentation/productionCamera';
import {CircuitClimbCore} from '../core/CircuitClimbCore';
import {defaultRunConfig} from '../config/runConfig';

const columns=[180,300,420] as const;
const layouts=[
  {width:308,height:720,pitch:96},
  {width:376,height:720,pitch:96},
  {width:412,height:720,pitch:96},
  {width:736,height:800,pitch:108},
  {width:927,height:800,pitch:108},
  {width:1150,height:850,pitch:108},
];
function camera(width:number,height:number,pitch:number,rowGap:number,
  maxZoom=.70,previousCameraY=-5000){
  return computeProductionCamera({
    logicalWidth:600,logicalHeight:600*height/width,
    rowGap,platformHeight:50,columns,
    sparkY:0,previousCameraY,maxZoom,follow:.13,
    fitRowGap:rowGap,coverageExpansion:1.06,
    minimumRowsEachSide:3,canvasCssWidth:width,
    lockedRowPitchCssPx:pitch,
  });
}
describe('CC2-43 fixed tier pitch and symmetric viewport',()=>{
  it('maintains exact CSS-pixel pitch across screen sizes and physical row gaps',()=>{
    for(const layout of layouts){
      for(const rowGap of [205,307.5,576.5625,768]){
        const frame=camera(layout.width,layout.height,layout.pitch,rowGap);
        const y=(worldY:number)=>projectProductionPoint(
          300,worldY,frame,600,layout.width).y;
        expect(y(-rowGap)-y(0)).toBeCloseTo(-layout.pitch,8);
        expect(y(0)-y(rowGap)).toBeCloseTo(-layout.pitch,8);
        expect(frame.lockedRowPitchCssPx).toBe(layout.pitch);
        expect(frame.aboveRows).toBeGreaterThanOrEqual(3.2);
        expect(frame.belowRows).toBeGreaterThanOrEqual(3.2);
        expect(Math.abs(frame.aboveRows-frame.belowRows)*layout.pitch)
          .toBeLessThanOrEqual(16.1);
      }
    }
  });
  it('does not silently change pitch when camera zoom preferences change',()=>{
    for(const layout of layouts){
      const a=camera(layout.width,layout.height,layout.pitch,576.5625,.25);
      const b=camera(layout.width,layout.height,layout.pitch,576.5625,.70);
      expect(a.yScale).toBeCloseTo(b.yScale,10);
      expect(a.xScale).toBeCloseTo(b.xScale,10);
    }
  });
  it('retains old camera algorithm without explicit opt-in',()=>{
    const historical=computeProductionCamera({
      logicalWidth:600,logicalHeight:670,
      rowGap:205,platformHeight:50,columns,
      sparkY:0,previousCameraY:-400,maxZoom:.70,follow:.13,
    });
    expect(historical.lockedRowPitchCssPx).toBeNull();
    expect(historical.yScale).toBeLessThanOrEqual(.70);
    expect(historical.aboveRows).toBeGreaterThanOrEqual(2);
    expect(historical.belowRows).toBeGreaterThanOrEqual(2);
  });
  it('rejects unsafe presentation parameters instead of corrupting geometry',()=>{
    expect(()=>camera(308,720,75,576.5625))
      .toThrow('CC2_PRODUCTION_CAMERA_INVALID');
    expect(()=>camera(308,720,151,576.5625))
      .toThrow('CC2_PRODUCTION_CAMERA_INVALID');
  });
  it('never changes source math, actual row gap, score, movement or replay',()=>{
    const core=new CircuitClimbCore('cc2-43-camera-firewall',{
      ...defaultRunConfig(),rowGapScale:2.8125,
    });
    const digest=core.stateDigest(),initial=core.snapshot();
    for(const layout of layouts){
      const frame=camera(layout.width,layout.height,layout.pitch,
        initial.world.geometry.rowGap);
      projectProductionPoint(initial.spark.x,initial.spark.y,frame,600,layout.width);
    }
    expect(core.stateDigest()).toBe(digest);
    expect(core.snapshot()).toEqual(initial);
  });
});
