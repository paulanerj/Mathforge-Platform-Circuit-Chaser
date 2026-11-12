/**
 * CC2-02B graph chassis. The only movement allowed is along graph edges.
 * A changing goal is queued until the current edge ends; there is no
 * mid-edge diagonal correction, teleport, platform clipping or fake success.
 */
import { shortestPath,segmentClear,type Point,type PursuitGraph } from './pursuitGraph';
import type { WorldV1 } from '../world/world';

export interface PursuerBody extends Point {
  nodeId:string;
  edgeTo:string|null;
  route:string[];
  routeGoal:string|null;
  distanceTravelled:number;
  routeFailures:number;
  blockedTicks:number;
  arrivedGoals:number;
}
export interface ChassisTick {
  body:PursuerBody;
  moved:number;
  arrived:boolean;
  failedRoute:boolean;
  failureReason?:string;
}
export function makeBody(graph:PursuitGraph,node:string):PursuerBody{
  const at=graph.byId.get(node);
  if(!at)throw Error('PURSUER_INVALID_SPAWN');
  return {...at,nodeId:node,edgeTo:null,route:[],routeGoal:null,
    distanceTravelled:0,routeFailures:0,blockedTicks:0,arrivedGoals:0};
}
const EPS=1e-7;
export function stepChassis(
  old:PursuerBody,graph:PursuitGraph,world:WorldV1,
  desiredGoal:string,speed:number,
):ChassisTick{
  const body:PursuerBody={...old,route:[...old.route]};
  if(!Number.isFinite(speed)||speed<=0)throw Error('PURSUER_BAD_SPEED');
  if(!graph.byId.has(desiredGoal))throw Error('PURSUER_GOAL_NOT_IN_GRAPH');
  const startTravel=body.distanceTravelled;
  let failedRoute=false;
  let failureReason:string|undefined;
  let budget=speed,guard=12;
  while(budget>EPS&&guard-->0){
    if(!body.edgeTo){
      // Reroute only at exact nodes: no sideways tunneling during a turn.
      if(body.routeGoal!==desiredGoal||body.route.length<2){
        const path=shortestPath(graph,body.nodeId,desiredGoal);
        if(!path){
          body.routeFailures++;
          failedRoute=true;failureReason='PURSUER_NO_GRAPH_ROUTE';break;
        }
        body.route=path;body.routeGoal=desiredGoal;
      }
      if(body.route.length<2)break; // goal is actually reached, not faked.
      body.edgeTo=body.route[1];
    }
    const destination=graph.byId.get(body.edgeTo);
    if(!destination){
      body.routeFailures++;
      failedRoute=true;failureReason='PURSUER_LOST_EDGE_TARGET';
      body.edgeTo=null;body.route=[];break;
    }
    const remaining=Math.abs(destination.x-body.x)+Math.abs(destination.y-body.y);
    if(remaining<EPS){
      body.x=destination.x;body.y=destination.y;
      body.nodeId=destination.id;body.edgeTo=null;
      body.route.shift();
      continue;
    }
    if(!segmentClear(world,graph.radius,body,destination)){
      body.routeFailures++;
      failedRoute=true;failureReason='PURSUER_UNSAFE_LEG';
      body.edgeTo=null;body.route=[];body.routeGoal=null;break;
    }
    const distance=Math.min(remaining,budget);
    if(Math.abs(destination.x-body.x)>EPS){
      body.x+=Math.sign(destination.x-body.x)*distance;
    }else{
      body.y+=Math.sign(destination.y-body.y)*distance;
    }
    body.distanceTravelled+=distance;budget-=distance;
    if(remaining-distance<=EPS){
      body.x=destination.x;body.y=destination.y;
      body.nodeId=destination.id;body.edgeTo=null;
      body.route.shift();
    }
  }
  const moved=body.distanceTravelled-startTravel;
  if(moved<=EPS&&body.nodeId!==desiredGoal){
    body.blockedTicks++;
  }else{
    body.blockedTicks=0;
  }
  if(body.blockedTicks>=90){
    failedRoute=true;failureReason='PURSUER_STALLED_90_TICKS';
    body.routeFailures++;body.blockedTicks=0;body.route=[];
    body.routeGoal=null;
  }
  const arrived=!body.edgeTo&&body.nodeId===desiredGoal;
  if(arrived&&!(!old.edgeTo&&old.nodeId===desiredGoal))body.arrivedGoals++;
  return {body,moved,arrived,failedRoute,failureReason};
}
