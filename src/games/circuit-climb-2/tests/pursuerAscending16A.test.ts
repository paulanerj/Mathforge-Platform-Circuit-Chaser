/**
 * CC2-16A correctness gate — reproduced owner loss-of-contact regression.
 *
 * The 2026-11-14 owner JSON showed 8 solved rows, 72 sampled DESCENDING
 * intervals, no path failures and a stationary Spark 3,460 units above
 * the bot. We commit only a minimal, de-identified action schedule here,
 * never the private full session report or a player's metadata.
 *
 * Three separate requirements:
 *   1. After a real contact is lost, unsensed SEARCH keeps advancing toward
 *      publicly generated upper topology, instead of a stale basement goal.
 *   2. Source-authored close pursuit followed by four rapid legal landings
 *      must remain replay-exact, route-safe and rediscover a stopped Spark.
 *   3. The original default "frontier" policy and legitimate finite-sense
 *      WAKE / STALE / LIVE precedence remain unchanged.
 */
import {describe,it,expect} from 'vitest';
import {createWorld} from '../world/world';
import {defaultRunConfig} from '../config/runConfig';
import {buildPursuitGraph,nodeId} from '../pursuer/pursuitGraph';
import {choosePursuitGoal,freshBelief} from '../pursuer/brain';
import type {PursuerObservation} from '../pursuer/perception';
import {CircuitClimbChaseCore,replayChase} from '../pursuer/CircuitClimbChaseCore';
import {energeticClimbDevLabPreset} from '../config/devLabPreset';

const p=energeticClimbDevLabPreset(),rowGap=576.5625;
const config={
  ...p.run,mode:'climb' as const,rowGapScale:2.8125,
  routeStyleVersion:'cc2-motion-styles/v1' as const,
};
function game(seed:string,mode:'climb'|'practice'='climb'){
  return new CircuitClimbChaseCore(seed,{...config,mode},
    p.pursuer,undefined,p.learner,p.personality);
}
function publicTower(){
  const world=createWorld({...config,mode:'practice'});
  const g=world.geometry;
  for(let row=1;row<=9;row++){
    const y=-row*g.rowGap;
    world.rows.push({index:row,y,
      platforms:g.columns.map((x,column)=>({
        id:`row-${row}-column-${column}`,row,column,x,y,
        width:g.platformWidth,height:g.platformHeight,value:null,
        correct:false,dead:false,powered:false,selected:false,
      }))});
  }
  return buildPursuitGraph(world,world.geometry.playerRadius*.52,-2,10);
}
function observation(tick:number):PursuerObservation{
  return{tick,pursuer:{x:205,y:-5*rowGap},live:null,wake:null};
}
function separation(g:CircuitClimbChaseCore){
  const s=g.snapshot();
  return Math.hypot(s.learner.spark.x-s.pursuer.body.x,
    s.learner.spark.y-s.pursuer.body.y);
}
type RunEvidence={
  steps:number;contactSeen:boolean;lostContact:boolean;recontact:boolean;
  completedRows:number;routeFailures:number;maximumDownhill:number;
  ended:string|null;closest:number;initialCloseRange:number;
  peakWake:number;finalWake:number;sampledDownIntervals:number;
};
function observeTicks(g:CircuitClimbChaseCore,steps:number,
  sample:(s:ReturnType<CircuitClimbChaseCore['snapshot']>)=>void){
  for(let i=0;i<steps;i++){
    const previous=g.snapshot().learner.tick;
    g.advanceTicks(1);
    const now=g.snapshot();
    sample(now);
    if(now.learner.phase==='ended'||now.learner.tick===previous)break;
  }
}
function meter(g:CircuitClimbChaseCore){
  const initial=g.snapshot(),h=initial.learner.world.geometry.rowGap;
  let contactSeen=false,lostContact=false,recontact=false;
  let firstLost=false,bestY=Infinity,downhill=0,previousY=initial.pursuer.body.y;
  let downwardSamples=0,peakWake=0,closest=separation(g);
  let lastTick=initial.learner.tick;
  const sample=(s:ReturnType<CircuitClimbChaseCore['snapshot']>)=>{
    const y=s.pursuer.body.y,contact=s.pursuer.sensed;
    if(contact){if(lostContact)recontact=true;contactSeen=true;}
    if(contactSeen&&!contact)lostContact=true;
    if(lostContact&&!contact){
      // SEARCH may inspect one neighboring public top floor, but must
      // not revisit the basement after a prior legitimate contact.
      if(s.pursuer.belief.mode==='SEARCH'){
        bestY=Math.min(bestY,y);
        downhill=Math.max(downhill,y-bestY);
        if(y-previousY>1e-6)downwardSamples++;
      }
    }
    previousY=y;lastTick=s.learner.tick;
    peakWake=Math.max(peakWake,s.pursuer.wakeCount);
    closest=Math.min(closest,separation(g));
  };
  const evidence=():RunEvidence=>({
    steps:lastTick-initial.learner.tick,contactSeen,lostContact,recontact,
    completedRows:g.snapshot().learner.completedRows,
    routeFailures:g.snapshot().pursuer.routeFailures,
    maximumDownhill:downhill,ended:g.snapshot().learner.endReason,
    closest,initialCloseRange:separation(g),
    peakWake,finalWake:g.snapshot().pursuer.wakeCount,
    sampledDownIntervals:downwardSamples,
  });
  return{sample,evidence,h};
}
describe('CC2-16A brain fallback: no lost-contact basement regression',()=>{
  it('uses ascending policy even when reason is SEARCH_FRONTIER',()=>{
    const graph=publicTower(),belief=freshBelief();
    const b={...belief,mode:'SEARCH' as const,
      reason:'SEARCH_FRONTIER' as const,
      goalId:'R2:P0',lastDirect:{x:300,y:-2*rowGap,tick:100,
        source:'NEAR' as const},lastSearchAnchor:'R2:P0',
      visitedIds:['R1:B','R2:P0']};
    const result=choosePursuitGoal(b,observation(900),graph,
      'R5:B',false,false,90,'ascending',9);
    expect(result.belief.mode).toBe('SEARCH');
    expect(result.belief.reason).toBe('SEARCH_FRONTIER');
    expect(result.targetId).toBe('R9:B');
    expect(graph.byId.get(result.targetId)?.row).toBe(9);
  });
  it('never retains a preview node above publicly available top when resuming SEARCH',()=>{
    const graph=publicTower(),belief={
      ...freshBelief(),mode:'SEARCH' as const,
      reason:'SEARCH_FRONTIER' as const,goalId:'R10:B',
      lastDirect:{x:205,y:-4*rowGap,tick:10,source:'NEAR' as const},
    };
    const result=choosePursuitGoal(belief,observation(900),graph,
      'R9:B',false,false,90,'ascending',9);
    const row=graph.byId.get(result.targetId)?.row;
    expect(row).toBeGreaterThanOrEqual(8);
    expect(row).toBeLessThanOrEqual(9);
  });
  it('does not erase authentic LIVE, STALE or WAKE sensor evidence',()=>{
    const graph=publicTower(),base=freshBelief();
    const live=choosePursuitGoal(base,{
      ...observation(300),live:{x:110,y:-3*rowGap,tick:300,source:'NEAR'},
    },graph,'R5:B',false,false,90,'ascending',9);
    expect(live.belief.mode).toBe('PURSUIT');
    expect(graph.byId.get(live.targetId)?.row).toBe(3);
    const stale=choosePursuitGoal(live.belief,observation(340),graph,
      'R5:B',false,false,90,'ascending',9);
    expect(stale.belief.reason).toBe('STALE_CONTACT');
    expect(graph.byId.get(stale.targetId)?.row).toBe(3);
    const wake=choosePursuitGoal(stale.belief,{
      ...observation(500),wake:{x:490,y:-4*rowGap,tick:480,source:'WAKE'},
    },graph,'R5:B',false,false,90,'ascending',9);
    expect(wake.belief.reason).toBe('WAKE_EVIDENCE');
    expect(graph.byId.get(wake.targetId)?.row).toBe(4);
    expect(wake.belief.mode).toBe('INVESTIGATE');
  });
  it('surveys at most one tier below top with no legitimate contact',()=>{
    const graph=publicTower(),b={
      ...freshBelief(),mode:'SEARCH' as const,
      reason:'SEARCH_FRONTIER' as const,goalId:nodeId(5,'B'),
      lastDirect:{x:205,y:-3*rowGap,tick:1,source:'NEAR' as const},
    };
    const output=choosePursuitGoal(b,observation(900),graph,
      nodeId(9,'B'),false,false,90,'ascending',9);
    expect(graph.byId.get(output.targetId)!.row).toBeGreaterThanOrEqual(8);
    expect(graph.byId.get(output.targetId)!.row).toBeLessThanOrEqual(9);
    const historical=choosePursuitGoal(b,observation(900),graph,
      nodeId(9,'B'),false,false,90,'frontier',9);
    expect(historical.targetId).not.toBe(output.targetId);
  });
});
describe('CC2-16A owner regression: close bot, four rapid climbs, recapture',()=>{
  it('recreates close range and confirms real 4-choice sprint never loses the upper frontier',()=>{
    const g=game('cc2-02a-demo','climb'),m=meter(g);
    // Owner's recorded seed and timing establish two genuine landed rows.
    g.selectPlatform('row-1-column-1');observeTicks(g,116,m.sample);
    expect(g.snapshot().learner.completedRows).toBe(1);
    g.selectPlatform('row-2-column-2');observeTicks(g,465,m.sample);
    expect(g.snapshot().learner.completedRows).toBe(2);
    expect(m.evidence().contactSeen).toBe(true);
    const close=separation(g);
    expect(close).toBeLessThan(rowGap*.65);
    // The player accelerates through four SOURCE-CHECKED next targets as
    // soon as Spark grounds. No artificial row insertion or bot teleport.
    for(let i=0;i<4;i++){
      const problem=g.snapshot().learner.currentProblem;
      expect(g.selectPlatform(problem.correctPlatformId).ok).toBe(true);
      for(let t=0;t<220&&g.snapshot().learner.phase==='outbound';t++)
        observeTicks(g,1,m.sample);
      expect(g.snapshot().learner.phase).toBe('ready');
      expect(g.snapshot().learner.completedRows).toBe(3+i);
    }
    expect(g.snapshot().learner.completedRows).toBe(6);
    // Spark stops on the last real platform; search has plenty of time.
    observeTicks(g,2800,m.sample);
    const e=m.evidence();
    console.log('CC2_16A_CLOSE_FOUR_REAL_SPRINT',JSON.stringify(e));
    expect(e.routeFailures).toBe(0);
    expect(e.lostContact).toBe(true);
    expect(e.peakWake).toBeGreaterThan(0);
    expect(e.maximumDownhill).toBeLessThan(rowGap*1.1);
    // A stopped Spark must be sensed again or physically captured.
    expect(e.recontact||e.ended==='CAPTURED').toBe(true);
    expect(replayChase(g.replayExport()).stateDigest()).toBe(g.stateDigest());
  },30000);
  it('replays the de-identified 8-row owner command schedule without the 72-downhill-floor pathology',()=>{
    const g=game('cc2-02a-demo','climb'),m=meter(g);
    const clicks=[
      {tick:0,platform:'row-1-column-1'},
      {tick:116,platform:'row-2-column-2'},
      {tick:581,platform:'row-3-column-0'},
      {tick:699,platform:'row-4-column-2'},
      {tick:806,platform:'row-5-column-1'},
      {tick:937,platform:'row-6-column-1'},
      {tick:1389,platform:'row-7-column-2'},
      {tick:1654,platform:'row-8-column-0'},
    ];
    let visited=0;
    for(let tick=0;tick<=3650;tick++){
      const cmd=clicks.find(x=>x.tick===tick);
      if(cmd&&g.snapshot().learner.phase!=='ended'){
        // Only execute if source is ready; it may have captured under
        // honest improved behavior, which ends the test scenario.
        if(g.snapshot().learner.phase==='ready'){
          const result=g.selectPlatform(cmd.platform);
          expect(result.ok).toBe(true);
          visited++;
        }
      }
      if(g.snapshot().learner.phase==='ended')break;
      observeTicks(g,1,m.sample);
    }
    const e=m.evidence();
    console.log('CC2_16A_UPLOADED_REPORT_SCHEDULE',JSON.stringify({e,visited}));
    expect(e.routeFailures).toBe(0);
    expect(e.contactSeen).toBe(true);
    expect(e.peakWake).toBeGreaterThan(0);
    expect(e.maximumDownhill).toBeLessThan(rowGap*1.1);
    expect(visited).toBeGreaterThanOrEqual(5);
    // If Spark stopped on a solved platform long enough, a finite-sensed
    // pursuer must close enough to rediscover it or capture it.
    expect(e.recontact||e.ended==='CAPTURED').toBe(true);
    expect(replayChase(g.replayExport()).stateDigest()).toBe(g.stateDigest());
  },45000);
  it('retains original collision, no third controller and replay for stationary sentry',()=>{
    for(const seed of ['short-stop-01','short-stop-02','short-stop-03']){
      const g=game(seed,'practice'),m=meter(g);
      g.selectPlatform(g.snapshot().learner.currentProblem.correctPlatformId);
      observeTicks(g,45,m.sample);
      observeTicks(g,1200,m.sample);
      expect(m.evidence().routeFailures).toBe(0);
      expect(replayChase(g.replayExport()).stateDigest()).toBe(g.stateDigest());
    }
  },45000);
});
