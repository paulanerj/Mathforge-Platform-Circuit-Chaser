/**
 * MathForge Circuit Climb 2.0 — CC2-46 Liquid-Crystal Plasma Conduction.
 *
 * Presentation-only. Paints energy INSIDE real, already-powered platform
 * rectangles and on real, source-verified successful Spark travel routes.
 * It must never calculate math, mark a platform powered, award points,
 * alter movement, manipulate a Pursuer or invent a path.
 *
 * There are three user-adjustable Developer settings:
 *   energy = inner luminance (0–100)
 *   flow   = how fast the plasma circulates, in source ticks (0–100)
 *   trail  = strength of the connection between confirmed landings (0–100)
 * At "0 energy", the claimed body retains its existing mineral material.
 * At reduced-motion, all time-driven movement freezes but the energy remains.
 *
 * This script is INLINED by buildPortable16A.mjs BEFORE the Heritage renderer.
 * A ?cc246=0 URL removes this visualization and retains exact CC2-45.
 */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const enabled = params.get('cc246') === '1';
  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults = Object.freeze({energy: 78, flow: 44, trail: 72});
  let values = {...defaults};
  const unit = n => Math.max(0, Math.min(1, n));
  const asValue = n => {
    const v = Number(n);
    if (!Number.isInteger(v) || v < 0 || v > 100) throw Error('CC246_CONTROL_OUT_OF_RANGE');
    return v;
  };
  const activePhase = tick => motionReduced ? 0 :
    Math.max(0, tick) * (0.004 + values.flow * 0.00044);
  const colorWithAlpha = (red,green,blue,alpha) =>
    `rgba(${red},${green},${blue},${unit(alpha)})`;

  function setControl(name, number) {
    if (!Object.hasOwn(defaults,name)) throw Error('CC246_UNKNOWN_CONTROL');
    if (!enabled) return false;
    values = {...values,[name]:asValue(number)};
    const input=document.getElementById('cc246-'+name);
    const output=document.getElementById('cc246-'+name+'-value');
    if (input) input.value=String(values[name]);
    if (output) output.textContent=values[name]+'%';
    return true;
  }
  function settings() {
    return Object.freeze({enabled, motionReduced,
      energy:values.energy, flow:values.flow, trail:values.trail});
  }

  /**
   * One luminous mineral volume. The caller supplies the REAL platform
   * rectangle (identical to the visible source-backed current answers).
   * No layout, hitbox, transform or geometry changes occur in this routine.
   */
  function paintClaimedCore(ctx, x, y, width, height, platform, sourceTick) {
    if (!enabled || !platform?.powered || platform.dead || values.energy===0)
      return false;
    if (![x,y,width,height,sourceTick].every(Number.isFinite) ||
      width<=0 || height<=0) return false;
    const energy = values.energy/100;
    const phase = activePhase(sourceTick) + platform.row*0.67 +
      platform.column*1.13;
    const pulse = motionReduced ? 0 : Math.sin(phase)*0.11;
    const cy=y+height*0.50, cx=x+width*0.50;

    ctx.save();
    try {
      ctx.beginPath();
      ctx.roundRect(x+2,y+2,Math.max(1,width-4),Math.max(1,height-4),
        Math.min(8,height*.18));
      ctx.clip();
      // The liquid-crystal core is luminous WITHIN the existing ceramic.
      const core=ctx.createRadialGradient(cx,cy,2,cx,cy,width*.65);
      core.addColorStop(0,colorWithAlpha(245,255,255,(.76+pulse)*energy));
      core.addColorStop(.30,colorWithAlpha(127,248,246,.66*energy));
      core.addColorStop(.70,colorWithAlpha(35,167,211,.42*energy));
      core.addColorStop(1,colorWithAlpha(31,119,168,.08*energy));
      ctx.fillStyle=core;
      ctx.fillRect(x+2,y+2,width-4,height-4);

      // Three internal conductor ribbons. Each follows a smooth, predictable
      // waveform. No per-frame random particles and no broad neon halos.
      for(let line=0;line<3;line++){
        const fraction=(line+1)/4;
        const baseline=y+6+(height-12)*fraction;
        const drift = motionReduced ? 0 : Math.sin(phase+line*1.23)*3.3;
        ctx.beginPath();
        ctx.moveTo(x+7,baseline);
        ctx.bezierCurveTo(
          x+width*.27,baseline-4-drift,
          x+width*.62,baseline+4+drift,
          x+width-7,baseline-1);
        ctx.strokeStyle=line===1
          ?colorWithAlpha(255,255,255,.82*energy)
          :colorWithAlpha(50,171,212,(.45+line*.08)*energy);
        ctx.lineWidth=line===1?2.5:1.65;
        ctx.stroke();
      }
      // A hot, focused conductor, deliberately smaller than the Spark digit.
      ctx.beginPath();
      ctx.moveTo(x+width*.18,cy+6);
      ctx.lineTo(x+width*.37,cy-7);
      ctx.lineTo(x+width*.59,cy+4);
      ctx.lineTo(x+width*.83,cy-6);
      ctx.strokeStyle=colorWithAlpha(249,255,253,.58*energy);
      ctx.lineWidth=1.5;ctx.stroke();
      return true;
    } finally {ctx.restore();}
  }

  /**
   * Actual source-receipted correct path: points are copied from the engine's
   * outbound travel at LANDING_CONFIRMED, never inferred from a guessed jump.
   * Drawn before the platform bodies so the network seems bonded underneath.
   */
  function paintConductor(ctx, worldPoints, project, sourceTick,
    viewportWidth, viewportHeight) {
    if (!enabled || !worldPoints || worldPoints.length<2 || values.trail===0)
      return false;
    if (typeof project!=='function')return false;
    const points=worldPoints.map(p=>project(p.x,p.y));
    if (points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))
      return false;
    if(points.every(p=>p.y < -45 || p.y>viewportHeight+45))return false;
    const strength=values.trail/100;
    const phase=activePhase(sourceTick);
    const start=points[0],end=points[points.length-1];
    const gradient=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
    gradient.addColorStop(0,colorWithAlpha(71,140,208,.72*strength));
    gradient.addColorStop(.50,colorWithAlpha(82,225,225,.88*strength));
    gradient.addColorStop(1,colorWithAlpha(251,255,252,.91*strength));
    ctx.save();
    try {
      ctx.lineJoin='round';ctx.lineCap='round';
      const follow=()=>{
        ctx.beginPath();
        ctx.moveTo(points[0].x,points[0].y);
        for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
      };
      // Three strokes only: subdued atmosphere, visible current, white-hot
      // crystalline spine. Keep long-distance broad glow behind platforms.
      for(const [width,ink] of [
        [16,colorWithAlpha(64,158,220,.12*strength)],
        [7,colorWithAlpha(47,186,222,.40*strength)],
        [2.7,gradient],
      ]){
        follow();ctx.lineWidth=width;ctx.strokeStyle=ink;ctx.stroke();
      }
      if(!motionReduced&&values.flow>0){
        // Slow migrating electrical glints; NO random or excessive sparks.
        follow();
        ctx.setLineDash([3.5,28]);
        ctx.lineDashOffset=-phase*12;
        ctx.strokeStyle=colorWithAlpha(255,255,255,.72*strength);
        ctx.lineWidth=1.6;ctx.stroke();
        ctx.setLineDash([]);
      }
      return true;
    }finally{ctx.restore();}
  }

  function bindDeveloperControls(){
    const form=document.getElementById('cc246-plasma-laboratory');
    if (!form) return;
    form.hidden=!enabled;
    for(const key of Object.keys(defaults)){
      const input=document.getElementById('cc246-'+key);
      if(!input)continue;
      input.addEventListener('input',()=>setControl(key,Number(input.value)));
      setControl(key,defaults[key]);
    }
    const reset=document.getElementById('cc246-reset');
    reset?.addEventListener('click',()=>{
      for(const key of Object.keys(defaults))setControl(key,defaults[key]);
    });
  }
  document.addEventListener('DOMContentLoaded',bindDeveloperControls,{once:true});
  window.__CC2_46__=Object.freeze({
    version:'cc2-liquid-crystal-conduction/v1',
    enabled,settings,setControl,paintClaimedCore,paintConductor,
  });
})();
