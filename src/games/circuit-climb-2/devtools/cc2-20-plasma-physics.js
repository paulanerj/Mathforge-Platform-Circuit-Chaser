/**
 * CC2-VIS-20 — Deterministic secondary motion only.
 *
 * The authoritative pursuer position is INPUT, never OUTPUT. This pure module
 * has no game imports, DOM, audio, or game-event APIs. The material envelope
 * has independently integrated position, velocity and angular inertia.
 *
 * Fixed-step integration at 120 Hz makes motion stable at 30/60/120 FPS.
 * Long background gaps reset the VISUAL envelope, not the source actor.
 * A bounded wake retains old movement direction and naturally expires.
 */
(function installPlasmaPhysics(scope) {
  'use strict';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const hypot = (x,y) => Math.hypot(x,y);
  const TAU = Math.PI*2;

  const DEFAULTS = Object.freeze({
    envelopeMass:2.2, springStiffness:58, damping:13.4, drag:0.62,
    maxLagWorld:58, velocitySmoothingMs:85, angularInertia:0.24,
    tailLifetimeMs:1050, trailSamples:32, turbulence:.18,
    idleBreath:.035, directionLag:.75, recoil:.5
  });

  function validate(input) {
    const c={...DEFAULTS,...input};
    const ranges={
      envelopeMass:[.3,8],springStiffness:[5,150],damping:[1,35],
      drag:[0,5],maxLagWorld:[4,110],velocitySmoothingMs:[20,500],
      angularInertia:[0,1],tailLifetimeMs:[100,2500],
      trailSamples:[4,64],turbulence:[0,.5],idleBreath:[0,.15],
      directionLag:[0,2],recoil:[0,2]
    };
    for(const [k,[lo,hi]] of Object.entries(ranges)) {
      if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)
        throw Error('CC220_PHYSICS_CONFIG_INVALID_'+k);
    }
    c.trailSamples=Math.floor(c.trailSamples);
    return c;
  }
  class PlasmaMotion {
    constructor(input={}) {
      this.config=validate(input);
      this.clear();
    }
    clear() {
      this.target=null;
      this.outer=null;
      this.velocity={x:0,y:0};
      this.sourceVelocity={x:0,y:0};
      this.lastSource=null;
      this.lastTime=null;
      this.elapsed=0;
      this.angular=0;
      this.angularVelocity=0;
      this.turn=0;
      this.acceleration=0;
      this.prevHeading=0;
      this.prevSpeed=0;
      this.trail=[];
      this.peakLag=0;
      this.stepCount=0;
      this._trailTime=0;
    }
    reset(x,y,now=0) {
      this.clear();
      this.target={x,y};
      this.outer={x,y};
      this.lastSource={x,y};
      this.lastTime=now;
      this._trailTime=now;
      return this.sample();
    }
    configure(next) { this.config=validate(next);return this.sample(); }
    advance(x,y,now) {
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(now))
        throw Error('CC220_SOURCE_COORDINATES_NOT_FINITE');
      if(this.lastTime===null) return this.reset(x,y,now);
      const dMs=now-this.lastTime;
      // A negative timeline or a suspended-tab time jump is a reset,
      // not an instantaneous physics explosion or a fabricated game motion.
      if(dMs<0||dMs>400) return this.reset(x,y,now);
      this.target={x,y};
      if(dMs===0) return this.sample();
      const dt=clamp(dMs/1000,.00001,.066667);
      const sx=(x-this.lastSource.x)/dt;
      const sy=(y-this.lastSource.y)/dt;
      const f=1-Math.exp(-dMs/this.config.velocitySmoothingMs);
      const oldX=this.sourceVelocity.x,oldY=this.sourceVelocity.y;
      this.sourceVelocity.x+=(sx-this.sourceVelocity.x)*f;
      this.sourceVelocity.y+=(sy-this.sourceVelocity.y)*f;
      const speed=hypot(this.sourceVelocity.x,this.sourceVelocity.y);
      this.acceleration=hypot(this.sourceVelocity.x-oldX,
        this.sourceVelocity.y-oldY)/Math.max(dt,.001);
      const heading=speed>10?Math.atan2(this.sourceVelocity.y,
        this.sourceVelocity.x):this.prevHeading;
      let turn=heading-this.prevHeading;
      while(turn>Math.PI)turn-=TAU;
      while(turn<-Math.PI)turn+=TAU;
      this.turn=turn;
      this.prevHeading=heading;
      this.prevSpeed=speed;
      const c=this.config;
      let remaining=dt;
      // Fixed-step integrator with a bounded final step. The spring is
      // grounded on the SAME observed physical pursuer coordinates.
      while(remaining>1e-8) {
        const h=Math.min(remaining,1/120);
        const ax=(c.springStiffness*(x-this.outer.x)
          -(c.damping+c.drag)*this.velocity.x)/c.envelopeMass;
        const ay=(c.springStiffness*(y-this.outer.y)
          -(c.damping+c.drag)*this.velocity.y)/c.envelopeMass;
        this.velocity.x+=ax*h;
        this.velocity.y+=ay*h;
        this.outer.x+=this.velocity.x*h;
        this.outer.y+=this.velocity.y*h;
        const lagX=this.outer.x-x,lagY=this.outer.y-y;
        const lag=hypot(lagX,lagY);
        if(lag>c.maxLagWorld) {
          const ratio=c.maxLagWorld/lag;
          this.outer.x=x+lagX*ratio;
          this.outer.y=y+lagY*ratio;
          this.velocity.x*=.7;this.velocity.y*=.7;
        }
        // Directional shear itself has inertia and overshoot.
        const wanted=clamp(turn/dt,-7,7)*c.angularInertia;
        this.angularVelocity+=(wanted-this.angularVelocity)*Math.min(1,h*8);
        this.angular+=this.angularVelocity*h;
        this.angular*=Math.exp(-h*3.5);
        remaining-=h;
        this.stepCount++;
      }
      const lag=hypot(this.outer.x-x,this.outer.y-y);
      this.peakLag=Math.max(lag,this.peakLag);
      this.elapsed+=dt;
      this.lastTime=now;
      this.lastSource={x,y};
      // A small history of SOURCE movements, not synthetic physics motion.
      // All frames expire by their timestamp even if the actor stops moving.
      if(now-this._trailTime>=30&&
         (this.trail.length===0||
          hypot(x-this.trail[this.trail.length-1].x,
                y-this.trail[this.trail.length-1].y)>1.25)) {
        this.trail.push({x,y,at:now,vx:this.sourceVelocity.x,
          vy:this.sourceVelocity.y,turn:this.turn});
        this._trailTime=now;
      }
      while(this.trail.length&&now-this.trail[0].at>c.tailLifetimeMs)
        this.trail.shift();
      if(this.trail.length>c.trailSamples)
        this.trail.splice(0,this.trail.length-c.trailSamples);
      return this.sample();
    }
    sample() {
      if(!this.target)return null;
      return {
        source:{...this.target},outer:{...this.outer},
        lag:{x:this.outer.x-this.target.x,y:this.outer.y-this.target.y},
        lagDistance:hypot(this.outer.x-this.target.x,
          this.outer.y-this.target.y),
        velocity:{...this.sourceVelocity},
        outerVelocity:{...this.velocity},
        speed:hypot(this.sourceVelocity.x,this.sourceVelocity.y),
        angular:this.angular,angularVelocity:this.angularVelocity,
        acceleration:this.acceleration,turn:this.turn,
        trail:this.trail.map(p=>({...p})),peakLag:this.peakLag,
        stepCount:this.stepCount,time:this.lastTime
      };
    }
  }
  const SCENARIOS=Object.freeze([
    'idle','horizontal','turn90','reverse180','stop','rapidTurns',
    'reacquire','approach','capture','final'
  ]);
  /** Synthetic VISUAL lab paths; NEVER fed into the game engine. */
  function scenarioPoint(name,ms) {
    const t=Math.max(0,ms)/1000;
    const start={x:300,y:260},speed=180;
    switch(name) {
      case 'idle':return {x:start.x+Math.sin(t*2.1)*3,
        y:start.y+Math.cos(t*1.7)*2};
      case 'horizontal':return {x:180+speed*t,y:260};
      case 'turn90':return t<.9?{x:190+speed*t,y:260}:
        {x:352,y:260-speed*(t-.9)};
      case 'reverse180':return t<.9?{x:190+speed*t,y:260}:
        {x:352-speed*(t-.9),y:260};
      case 'stop':return {x:190+speed*Math.min(t,1),y:260};
      case 'rapidTurns':{
        const seg=.46,step=Math.floor(t/seg),u=(t%seg)/seg;
        const pts=[[210,300],[335,300],[335,180],
          [230,180],[230,280],[365,280],[365,165]];
        const i=Math.min(step,pts.length-2);
        return {x:pts[i][0]+(pts[i+1][0]-pts[i][0])*u,
          y:pts[i][1]+(pts[i+1][1]-pts[i][1])*u};
      }
      case 'reacquire':return t<.75?{x:220+speed*t,y:260}:
        t<1.25?{x:355-speed*(t-.75)*.45,
          y:260+Math.sin((t-.75)*Math.PI*2)*30}:
          {x:314+speed*(t-1.25)*.75,y:260};
      case 'approach':return {x:130+Math.min(260,speed*t),y:260};
      case 'capture':return {x:300,y:260};
      case 'final':return {x:300,y:260};
      default:throw Error('CC220_LAB_SCENARIO_UNKNOWN_'+name);
    }
  }
  const module=Object.freeze({PlasmaMotion,validate,DEFAULTS,
    SCENARIOS,scenarioPoint});
  scope.__CC2_20_PHYSICS__=module;
  if(typeof module!=='undefined'&&typeof exports!=='undefined')
    exports.CC2_20_PHYSICS=module;
})(typeof window!=='undefined'?window:globalThis);
