/**
 * CC2-02B: actual graph, sensing and legal-body proof.
 * No hidden-answer or future-route access is available to the Brain.
 */
import { describe,it,expect } from 'vitest';
import { createWorld,addProblemRow,landingFor } from '../world/world';
import { defaultRunConfig } from '../config/runConfig';
import { SeededRandom } from '../config/prng';
import { generateAdd20Problem } from '../math/add20';
import {
  buildPursuitGraph,segmentClear,shortestPath,nodeId,nearestNode,searchFrontier,
} from '../pursuer/pursuitGraph';
import { observePursuer,hasClearSight } from '../pursuer/perception';
import { defaultPursuerPreset } from '../pursuer/pursuerPreset';
import {makeBody,stepChassis} from '../pursuer/chassis';
import {PursuerController} from '../pursuer/pursuerController';

function worldAt(framingPercent:number){
  const world=createWorld({...defaultRunConfig(),framingPercent});
  const rng=new SeededRandom('pursuer-graph');
  let incoming=4;
  for(let row=1;row<=3;row++){
    const problem=generateAdd20Problem('graph',row,incoming,rng);
    addProblemRow(world,problem);incoming=problem.targetValue;
  }
  return world;
}

describe('CC2-02B: collision-qualified physical graph',()=>{
  it('has a route to every lane on every row at ALL integer 80–120% framings',()=>{
    for(let framing=80;framing<=120;framing++){
      const world=worldAt(framing),radius=world.geometry.playerRadius*0.52;
      const graph=buildPursuitGraph(world,radius,-2,5);
      for(const edge of graph.edges){
        const a=graph.byId.get(edge.a)!,b=graph.byId.get(edge.b)!;
        expect(a.x===b.x||a.y===b.y).toBe(true);
        expect(segmentClear(world,radius,a,b),
          `${framing}% edge ${edge.a}->${edge.b}`).toBe(true);
      }
      for(const target of [nodeId(0,'P0'),nodeId(1,'P1'),nodeId(3,'P2')]){
        expect(shortestPath(graph,nodeId(-2,'B'),target),
          `${framing}% route to ${target}`).not.toBeNull();
      }
    }
  });

  it('search frontier reaches both sides and above/below the last sighting',()=>{
    const world=worldAt(100),graph=buildPursuitGraph(world,16,-2,4);
    const frontier=searchFrontier(graph,nodeId(1,'P0'));
    expect(frontier).toContain(nodeId(1,'P2'));
    expect(frontier).toContain(nodeId(-1,'B'));
    expect(frontier).toContain(nodeId(3,'C'));
    expect(new Set(frontier).size).toBe(frontier.length);
  });

  it('locomotion follows real checked graph edges; never teleports or crosses cards',()=>{
    const world=worldAt(100),radius=16;
    const graph=buildPursuitGraph(world,radius,-2,5);
    let body=makeBody(graph,nodeId(-2,'B'));
    const initial={x:body.x,y:body.y};
    const target=nodeId(2,'P2');
    let travelled=0,failures=0;
    for(let i=0;i<1000 && body.nodeId!==target;i++){
      const result=stepChassis(body,graph,world,target,3.7);
      const jump=Math.hypot(result.body.x-body.x,result.body.y-body.y);
      expect(jump).toBeLessThanOrEqual(3.70001);
      expect(Number.isFinite(result.body.x)&&Number.isFinite(result.body.y)).toBe(true);
      failures+=Number(result.failedRoute);
      travelled+=result.moved;body=result.body;
    }
    expect(body.nodeId).toBe(target);
    expect(body.x).toBe(graph.byId.get(target)!.x);
    expect(failures).toBe(0);
    expect(travelled).toBeGreaterThan(Math.abs(initial.y-body.y));
  });
});

describe('CC2-02B finite perception firewall',()=>{
  it('omits the hidden Spark position beyond sensor range',()=>{
    const world=worldAt(100),config=defaultPursuerPreset();
    const p={x:100,y:400},hidden={x:490,y:-250};
    const seen=observePursuer(world,p,hidden,[],100,config);
    expect(seen.live).toBeNull();
    expect(seen.wake).toBeNull();
    expect(JSON.stringify(seen)).not.toContain('490');
  });
  it('admits a nearby direct observation with source and tick',()=>{
    const world=worldAt(100),config=defaultPursuerPreset();
    const seen=observePursuer(world,{x:210,y:-40},{x:300,y:-40},[],8,config);
    expect(seen.live).toEqual({x:300,y:-40,tick:8,source:'NEAR'});
    expect(Object.keys(seen).sort()).toEqual(['live','pursuer','tick','wake']);
  });
  it('never expands graph topology from an unseen Spark exact altitude',()=>{
    const world=worldAt(100);
    const farBelow=new PursuerController(world);
    const farAbove=new PursuerController(world);
    const a=farBelow.step(world,{x:80,y:-8500},1);
    const b=farAbove.step(world,{x:500,y:-13000},1);
    expect(a.sensed).toBe(false);
    expect(b.sensed).toBe(false);
    expect(a.graphNodeCount).toBe(b.graphNodeCount);
    expect(a.body.x).toBe(b.body.x);
    expect(a.body.y).toBe(b.body.y);
    expect(a.belief.goalId).toBe(b.belief.goalId);
  });
  it('only admits physical past wake, within finite range and lifetime',()=>{
    const world=worldAt(100),config=defaultPursuerPreset();
    const far={x:200,y:300},actual={x:500,y:-500};
    const wake=[
      {x:210,y:300,tick:90},
      {x:215,y:300,tick:91},
      {x:207,y:300,tick:100}, // future current tick may NOT leak
      {x:205,y:301,tick:1}, // expired
      {x:450,y:300,tick:96}, // spatially outside wake radius
    ];
    const seen=observePursuer(world,far,actual,wake,100,config);
    expect(seen.live).toBeNull();
    expect(seen.wake).toMatchObject({x:215,tick:91,source:'WAKE'});
    expect(hasClearSight(world,{x:220,y:-35},{x:490,y:-35})).toBe(true);
  });
});
