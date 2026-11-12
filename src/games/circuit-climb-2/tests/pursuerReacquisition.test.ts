/**
 * CC2-02B adversarial F08 / 07A regression: lose contact, change lanes,
 * then stand still. This tests the REAL perception firewall + Brain + graph
 * chassis, not an authored target assignment or a fake capture.
 *
 * The controlled Spark follows a physically plausible 16-unit/tick lateral
 * path along the above-platform rail, then stops. Search must acquire again
 * WITHOUT using the current hidden Spark position in Brain inputs.
 */
import {describe,it,expect} from 'vitest';
import {createWorld,addProblemRow} from '../world/world';
import {SeededRandom} from '../config/prng';
import {defaultRunConfig} from '../config/runConfig';
import {generateAdd20Problem} from '../math/add20';
import {PursuerController} from '../pursuer/pursuerController';
import {defaultPursuerPreset} from '../pursuer/pursuerPreset';

function encounter(percent:number,reverse:boolean,transitTicks:number){
  const world=createWorld({...defaultRunConfig(),framingPercent:percent});
  const rng=new SeededRandom('cross-board-'+percent);
  const problem=generateAdd20Problem('F08',1,4,rng);
  addProblemRow(world,problem);
  const y=-world.geometry.playerRadius-3;
  const left=world.geometry.columns[0];
  const right=world.geometry.columns[2];
  const start={x:reverse?right:left,y};
  const end={x:reverse?left:right,y};
  const preset={
    ...defaultPursuerPreset(),
    nearSenseRadius:150,clearSightRadius:150,
    trailSenseRadius:0,staleContactTicks:12,
  };
  const agent=new PursuerController(world,preset);
  let tick=0,observedFirst=false;
  for(let i=0;i<1000;i++){
    const bot=agent.step(world,start,++tick);
    if(bot.sensed){observedFirst=true;break;}
  }
  if(!observedFirst)return {first:false,lost:false,reacquired:false,
    tick,bot:agent.snapshot()};

  // Dwell a few ticks to establish a legitimate, timestamped initial lock.
  for(let i=0;i<8;i++)agent.step(world,start,++tick);
  let lost=false,wasLostFor=0;
  for(let i=1;i<=transitTicks;i++){
    const at={x:start.x+(end.x-start.x)*i/transitTicks,y};
    const bot=agent.step(world,at,++tick);
    if(!bot.sensed)wasLostFor++;
  }
  let reacquired=false,searchSteps=0;
  for(let i=0;i<720;i++){
    const bot=agent.step(world,end,++tick);searchSteps++;
    if(!bot.sensed)wasLostFor++;
    if(wasLostFor>=12)lost=true;
    if(lost&&bot.sensed&&bot.belief.reacquisitions>0){
      reacquired=true;break;
    }
  }
  return {first:true,lost,reacquired,tick,searchSteps,bot:agent.snapshot()};
}

describe('CC2-02B real-body cross-board intelligence regression',()=>{
  it('reacquires after actual left-to-right loss with stationary final learner',()=>{
    const result=encounter(100,false,24);
    expect(result.first).toBe(true);
    expect(result.lost).toBe(true);
    expect(result.reacquired).toBe(true);
    expect(result.bot.routeFailures).toBe(0);
    expect(result.searchSteps).toBeLessThanOrEqual(720);
  });

  it('reacquires right-to-left and at 80%, 100%, 120% world geometries',()=>{
    for(const zoom of [80,100,120])for(const reverse of [false,true]){
      const result=encounter(zoom,reverse,24);
      expect(result.first,`${zoom}% / reverse=${reverse}: initial contact`).toBe(true);
      expect(result.lost,`${zoom}% / reverse=${reverse}: genuine loss`).toBe(true);
      expect(result.reacquired,`${zoom}% / reverse=${reverse}: reacquire`).toBe(true);
      expect(result.bot.routeFailures,`${zoom}% / reverse=${reverse}: route failures`).toBe(0);
    }
  });
});
