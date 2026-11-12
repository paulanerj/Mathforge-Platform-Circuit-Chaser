/**
 * CC2-06A — presentation-only production camera qualification.
 *
 * The owner spotted a genuine mismatch: real selectable buttons were
 * horizontally spread while canvas tower platforms remained compressed.
 * A camera is now one mathematical transform shared by Canvas and DOM.
 */
import {describe,it,expect} from 'vitest';
import {
  computeProductionCamera,projectProductionPoint,
  MIN_VISIBLE_ROWS_EACH_SIDE,LANE_DISTANCE_FRACTION,
} from '../presentation/productionCamera';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {intermediateDevLabPreset} from '../config/devLabPreset';

const geometry={logicalWidth:600,rowGap:205,platformHeight:50,
  columns:[180,300,420] as const,sparkY:0,maxZoom:.70,follow:.13};

describe('CC2-06A: two up/two down readable production optics',()=>{
  it('always fits two row levels each way at 320/390/768/826 widths',()=>{
    expect(MIN_VISIBLE_ROWS_EACH_SIDE).toBe(2);
    for(const [width,height] of [
      [320,370],[390,440],[768,650],[826,550],[1280,700],
    ]){
      const heightLogical=600*height/width;
      const frame=computeProductionCamera({
        ...geometry,logicalHeight:heightLogical,
        previousCameraY:0,
      });
      expect(frame.aboveRows).toBeGreaterThanOrEqual(2);
      expect(frame.belowRows).toBeGreaterThanOrEqual(2);
      expect(frame.yScale).toBeLessThanOrEqual(geometry.maxZoom);
      expect(frame.xScale).toBeCloseTo(
        600*LANE_DISTANCE_FRACTION/120,10);
      const centers=geometry.columns.map(x=>projectProductionPoint(
        x,0,frame,600,width).x);
      expect(centers[0]/width).toBeCloseTo(.22,10);
      expect(centers[1]/width).toBeCloseTo(.50,10);
      expect(centers[2]/width).toBeCloseTo(.78,10);
    }
  });
  it('center projection remains independent of user vertical zoom',()=>{
    const base={...geometry,logicalHeight:490,previousCameraY:-600};
    const close=computeProductionCamera({...base,maxZoom:.70});
    const far=computeProductionCamera({...base,maxZoom:.25});
    expect(close.xScale).toBe(far.xScale);
    for(const x of geometry.columns){
      const a=projectProductionPoint(x,-205,close,600,390);
      const b=projectProductionPoint(x,-205,far,600,390);
      expect(a.x).toBe(b.x);
    }
    expect(far.yScale).toBeLessThanOrEqual(close.yScale);
  });
  it('cannot influence the authoritative arithmetic, Pursuer or replay',()=>{
    const p=intermediateDevLabPreset();
    const game=new CircuitClimbChaseCore('production-camera-proof',
      {...p.run,mode:'practice'},p.pursuer,undefined,p.learner,p.personality);
    game.advanceTicks(400);
    const before=game.stateDigest();
    for(let i=0;i<200;i++){
      const frame=computeProductionCamera({
        ...geometry,logicalHeight:520,previousCameraY:-400,
        maxZoom:.25+i/1000,
      });
      projectProductionPoint(300,game.learnerSnapshot().spark.y,
        frame,600,390);
    }
    expect(game.stateDigest()).toBe(before);
    expect(replayChase(game.replayExport()).stateDigest()).toBe(before);
  });
});
