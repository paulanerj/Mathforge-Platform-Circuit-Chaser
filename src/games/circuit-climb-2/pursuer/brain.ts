/**
 * CC2-02B — explainable pursuit strategy. This module intentionally imports
 * only admitted OBSERVATIONS and PUBLIC GEOMETRY. It cannot see world truth,
 * a future learner route, equation correctness or the selected answer.
 *
 * A previous search pathology became trapped in lastKnownX +/- amplitude;
 * this Brain uses a full reachable breadth-first frontier across every row
 * and lane. Repeated stale wake fragments are consumed, never retried forever.
 */
import type { PursuerObservation,SensedPoint } from './perception';
import { nearestNode,nodeId,searchFrontier,type PursuitGraph } from './pursuitGraph';

export type PursuerMode='PURSUIT'|'INVESTIGATE'|'SEARCH';
export type PursuerReason='LIVE_CONTACT'|'STALE_CONTACT'|'WAKE_EVIDENCE'|
  'SEARCH_FRONTIER'|'INITIAL_PATROL'|'NO_PATH_RECOVERY';
export interface PursuerBelief {
  mode:PursuerMode;
  reason:PursuerReason;
  goalId:string;
  lastDirect:SensedPoint|null;
  lastWake:SensedPoint|null;
  consumedWakeTick:number;
  visitedIds:string[];
  acquisitions:number;
  reacquisitions:number;
  lastSearchAnchor:string;
  lastModeChangeTick:number;
  contactLostAtTick:number|null;
}
export interface BrainDecision {
  belief:PursuerBelief;
  targetId:string;
}
export function freshBelief():PursuerBelief{
  return {
    mode:'SEARCH',reason:'INITIAL_PATROL',goalId:nodeId(0,'P1'),
    lastDirect:null,lastWake:null,consumedWakeTick:-1,visitedIds:[],
    acquisitions:0,reacquisitions:0,lastSearchAnchor:nodeId(0,'P1'),
    lastModeChangeTick:0,contactLostAtTick:null,
  };
}
/** Deterministic choice, never reads a secret learner position. */
export function choosePursuitGoal(
  before:PursuerBelief,observation:PursuerObservation,graph:PursuitGraph,
  currentNodeId:string,arrivedGoal:boolean,routeBlocked:boolean,
  staleTicks:number,
  searchStrategy:'frontier'|'ascending'='frontier',
  highestPublicRow=0,
):BrainDecision{
  const b:PursuerBelief={...before,visitedIds:[...before.visitedIds]};
  const tick=observation.tick;
  const prevMode=b.mode;
  const prevDirect=b.lastDirect;
  const hasNewLive=Boolean(observation.live);
  if(observation.live){
    if(!prevDirect)b.acquisitions++;
    else if(tick-prevDirect.tick>staleTicks){
      b.acquisitions++;b.reacquisitions++;
    }
    b.mode='PURSUIT';b.reason='LIVE_CONTACT';
    b.lastDirect={...observation.live};
    b.contactLostAtTick=null;
    b.lastSearchAnchor=nearestNode(graph,observation.live).id;
    b.goalId=b.lastSearchAnchor;
    b.visitedIds=[];
  }else if(prevDirect && tick-prevDirect.tick<=staleTicks){
    // A stale observation is explicitly tagged STALE; it is not a new sample.
    if(b.contactLostAtTick===null)b.contactLostAtTick=tick;
    b.mode='PURSUIT';b.reason='STALE_CONTACT';
    b.goalId=nearestNode(graph,prevDirect).id;
  }else if(observation.wake &&
    observation.wake.tick>b.consumedWakeTick &&
    (!b.lastWake||observation.wake.tick>=b.lastWake.tick)){
    b.mode='INVESTIGATE';b.reason='WAKE_EVIDENCE';
    b.lastWake={...observation.wake};
    b.lastSearchAnchor=nearestNode(graph,observation.wake).id;
    b.goalId=b.lastSearchAnchor;
  }else{
    b.mode='SEARCH';
    b.reason=routeBlocked?'NO_PATH_RECOVERY':
      prevDirect?'SEARCH_FRONTIER':'INITIAL_PATROL';
    const anchor=b.lastDirect?nearestNode(graph,b.lastDirect).id:
      b.lastWake?nearestNode(graph,b.lastWake).id:nodeId(0,'P1');
    b.lastSearchAnchor=anchor;
    if(arrivedGoal||routeBlocked){
      if(!b.visitedIds.includes(before.goalId))b.visitedIds.push(before.goalId);
    }
    const candidates=searchFrontier(graph,anchor);
    // Avoid selecting the stationary current node when it has been inspected.
    let next=candidates.find(id=>!b.visitedIds.includes(id) && id!==currentNodeId);
    if(!next){
      // Complete a full finite sweep before restarting; no two-node trap.
      b.visitedIds=currentNodeId?[currentNodeId]:[];
      next=candidates.find(id=>id!==currentNodeId);
    }
    if(next)b.goalId=next;
  }
  // A wake is exhausted on physical graph arrival, not an impossible
  // comparison to its off-graph raw sensor coordinates.
  if(before.mode==='INVESTIGATE' && (arrivedGoal||routeBlocked)){
    b.consumedWakeTick=Math.max(b.consumedWakeTick,b.lastWake?.tick??-1);
    if(!observation.live){
      b.lastWake=null;
      b.mode='SEARCH';
      b.reason='SEARCH_FRONTIER';
      const candidates=searchFrontier(graph,b.lastSearchAnchor);
      if(!b.visitedIds.includes(before.goalId))b.visitedIds.push(before.goalId);
      b.goalId=candidates.find(id=>!b.visitedIds.includes(id)&&id!==currentNodeId)??currentNodeId;
    }
  }
  // CC2-07A: a physically present, public tower grows upward. An energetic
  // patrol explores that geometry rather than repeatedly revisiting the
  // original basement. Only the generated tower's public top is passed here;
  // there is NO Spark position, answer, future route, or hidden row signal.
  // Live sensor / stale contact / wake evidence ALWAYS take precedence.
  if(searchStrategy==='ascending' && b.mode==='SEARCH' &&
     b.reason==='INITIAL_PATROL'){
    const publicTop=Math.min(graph.maxRow,
      Math.max(0,Math.floor(highestPublicRow)));
    const anchor=nodeId(publicTop,'B');
    const at=graph.byId.get(currentNodeId);
    if(at && graph.byId.has(anchor)){
      if(at.row<publicTop){
        b.goalId=anchor;
        b.lastSearchAnchor=anchor;
        b.visitedIds=[];
      }else{
        // Once at the newest publicly constructed tier, inspect nearby
        // horizontal lanes and no more than one floor below. Graph edges
        // determine reachability; this cannot jump through platforms.
        const candidates=searchFrontier(graph,anchor).filter(id=>
          (graph.byId.get(id)?.row??-Infinity)>=publicTop-1);
        if(arrivedGoal||routeBlocked){
          if(!b.visitedIds.includes(before.goalId))
            b.visitedIds.push(before.goalId);
        }
        let next=candidates.find(id=>
          !b.visitedIds.includes(id)&&id!==currentNodeId);
        if(!next){
          b.visitedIds=[currentNodeId];
          next=candidates.find(id=>id!==currentNodeId);
        }
        if(next)b.goalId=next;
      }
    }
  }
  if(!graph.byId.has(b.goalId))b.goalId=nearestNode(graph,observation.pursuer).id;
  if(prevMode!==b.mode)b.lastModeChangeTick=tick;
  return {belief:b,targetId:b.goalId};
}
