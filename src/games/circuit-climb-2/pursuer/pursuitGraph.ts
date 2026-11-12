/**
 * CC2-02B physical pursuit graph. New source, informed by Graph V2 research
 * d7a8115, NOT an import of that unqualified experimental Brain.
 * All legs are orthogonal and checked against actor-inflated cards.
 */
import type { WorldV1 } from '../world/world';
export interface Point {x:number;y:number}
export interface GraphNode extends Point {id:string;row:number;lane:string}
export interface GraphEdge {a:string;b:string;length:number}
export interface PursuitGraph {
  minRow:number;maxRow:number;radius:number;
  nodes:GraphNode[];byId:Map<string,GraphNode>;
  links:Map<string,{id:string;length:number}[]>;edges:GraphEdge[];
  rejected:string[];
}
const MARGIN=6, EPS=1e-7;
export const nodeId=(row:number,lane:string)=>`R${row}:${lane}`;

/** Treat cards as inflated rectangles; row zero has only one real card. */
export function segmentClear(world:WorldV1,radius:number,a:Point,b:Point):boolean {
  if ((Math.abs(a.x-b.x)>EPS && Math.abs(a.y-b.y)>EPS) ||
      Math.hypot(a.x-b.x,a.y-b.y)<EPS) return false;
  if ([a.x,b.x].some(x=>x<=radius+1||x>=world.geometry.logicalWidth-radius-1)) return false;
  const pad=radius+MARGIN;
  for (const row of world.rows) for(const card of row.platforms) {
    if(row.index===0&&card.column!==1)continue;
    const left=card.x-card.width/2-pad,right=card.x+card.width/2+pad;
    const top=card.y-pad,bottom=card.y+card.height+pad;
    if(Math.abs(a.y-b.y)<=EPS){
      if(a.y>top+EPS&&a.y<bottom-EPS&&Math.max(a.x,b.x)>left+EPS&&Math.min(a.x,b.x)<right-EPS)return false;
    }else if(a.x>left+EPS&&a.x<right-EPS&&Math.max(a.y,b.y)>top+EPS&&Math.min(a.y,b.y)<bottom-EPS)return false;
  }
  return true;
}
function trunks(world:WorldV1,r:number){
  const g=world.geometry,c=g.columns,w=g.platformWidth,pad=r+MARGIN;
  const bands=[
    ['A',r+MARGIN,c[0]-w/2-pad],
    ['B',c[0]+w/2+pad,c[1]-w/2-pad],
    ['C',c[1]+w/2+pad,c[2]-w/2-pad],
    ['D',c[2]+w/2+pad,g.logicalWidth-r-MARGIN],
  ] as const;
  return bands.filter(([_,l,h])=>h-l>=MARGIN-EPS)
    .map(([lane,l,h])=>({lane,x:(l+h)/2}));
}
/** Includes only physically admitted edges, never invented fallback jumps. */
export function buildPursuitGraph(world:WorldV1,radius:number,minRow:number,maxRow:number):PursuitGraph{
  if(!Number.isFinite(radius)||radius<=0||!Number.isInteger(minRow)||!Number.isInteger(maxRow)||
     minRow>maxRow||maxRow-minRow>140)throw Error('PURSUER_INVALID_GRAPH_RANGE');
  const t=trunks(world,radius);
  if(!t.some(a=>a.lane==='B')||!t.some(a=>a.lane==='C'))throw Error('PURSUER_NO_INTERIOR_CORRIDOR');
  const lanes=[...t,...world.geometry.columns.map((x,i)=>({lane:`P${i}`,x}))].sort((a,b)=>a.x-b.x);
  const graph:PursuitGraph={minRow,maxRow,radius,nodes:[],byId:new Map(),links:new Map(),edges:[],rejected:[]};
  for(let row=minRow;row<=maxRow;row++)for(const l of lanes){
    const n={id:nodeId(row,l.lane),row,lane:l.lane,x:l.x,
      y:-row*world.geometry.rowGap-world.geometry.playerRadius-3};
    graph.nodes.push(n);graph.byId.set(n.id,n);graph.links.set(n.id,[]);
  }
  const join=(a:GraphNode,b:GraphNode)=>{
    if(!segmentClear(world,radius,a,b)){graph.rejected.push(a.id+'--'+b.id);return;}
    const length=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    graph.edges.push({a:a.id,b:b.id,length});
    graph.links.get(a.id)!.push({id:b.id,length});
    graph.links.get(b.id)!.push({id:a.id,length});
  };
  for(let row=minRow;row<=maxRow;row++){
    for(let i=1;i<lanes.length;i++)
      join(graph.byId.get(nodeId(row,lanes[i-1].lane))!,graph.byId.get(nodeId(row,lanes[i].lane))!);
    if(row>minRow)for(const l of t)
      join(graph.byId.get(nodeId(row-1,l.lane))!,graph.byId.get(nodeId(row,l.lane))!);
  }
  for(const l of graph.links.values())l.sort((a,b)=>a.id.localeCompare(b.id));
  return graph;
}
export function nearestNode(graph:PursuitGraph,p:Point):GraphNode{
  if(!graph.nodes.length)throw Error('PURSUER_EMPTY_GRAPH');
  let best=graph.nodes[0],dist=Infinity;
  for(const node of graph.nodes){
    const d=Math.hypot(node.x-p.x,node.y-p.y);
    if(d<dist-EPS||(Math.abs(d-dist)<EPS&&node.id<best.id)){best=node;dist=d;}
  }
  return best;
}
/** Deterministic Dijkstra with stable node-ID tie breaks. */
export function shortestPath(graph:PursuitGraph,start:string,goal:string):string[]|null{
  if(!graph.byId.has(start)||!graph.byId.has(goal))return null;
  const q=new Set(graph.byId.keys()),d=new Map([...q].map(id=>[id,Infinity]));
  const previous=new Map<string,string>();d.set(start,0);
  while(q.size){
    let n:string|null=null;
    for(const id of q)if(n===null||d.get(id)!<d.get(n)!-EPS||(Math.abs(d.get(id)!-d.get(n)!)<EPS&&id<n))n=id;
    if(n===null||!Number.isFinite(d.get(n)))break;
    if(n===goal)break;q.delete(n);
    for(const edge of graph.links.get(n)??[])if(q.has(edge.id)){
      const nd=d.get(n)!+edge.length,old=d.get(edge.id)!;
      if(nd<old-EPS||(Math.abs(nd-old)<EPS&&n<(previous.get(edge.id)??'￿'))){
        d.set(edge.id,nd);previous.set(edge.id,n);
      }
    }
  }
  if(start===goal)return[start];
  if(!previous.has(goal))return null;
  const path=[goal];let at=goal;
  for(let i=0;i<graph.nodes.length;i++){
    if(at===start)return path;
    const pre=previous.get(at);if(!pre)return null;
    path.unshift(pre);at=pre;
  }
  return null;
}
/** Full expanding reachable frontier prevents stale-X two-node search loops. */
export function searchFrontier(graph:PursuitGraph,anchor:string):string[]{
  if(!graph.byId.has(anchor))return graph.nodes.map(n=>n.id);
  const visited=new Set([anchor]),queue=[anchor],result:string[]=[];
  while(queue.length){
    const at=queue.shift()!;result.push(at);
    for(const next of graph.links.get(at)??[])if(!visited.has(next.id)){
      visited.add(next.id);queue.push(next.id);
    }
  }
  return result;
}
