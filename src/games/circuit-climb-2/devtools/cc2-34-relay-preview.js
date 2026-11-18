/**
 * CC2-34B + CC2-39A — opt-in Relay hologram on the ACTUAL Circuit Climb board.
 *
 * Developer preview only (?cc234=1). Does not claim a Relay creature reward,
 * run a second gameplay controller, auto-solve, grant score, or intercept taps.
 * All platform locations come from the core's cloned replay forecast.
 */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('cc234')!=='1')return;
const game=()=>window.__CC2_02A__;
const board=document.getElementById('board');
const tuning=document.getElementById('tuningPanel');
if(!board||!tuning)return;
const section=document.createElement('section');
section.className='cc234-studio';
section.innerHTML='<div class="cc234-title">RELAY WEAVER · PATH PREVIEW</div>'+
  '<p class="cc234-note">Experimental visualization. Four genuine forecast platforms. No creature reward or math credit.</p>'+
  '<div class="cc234-actions"><button type="button" id="cc234Activate">Preview 4 source rows</button>'+
  '<button type="button" id="cc234Reset">Clear</button></div>'+
  '<label>Path energy <input type="range" id="cc234Energy" min="0" max="100" value="42"></label>'+
  '<label>Line movement <input type="range" id="cc234Motion" min="0" max="100" value="32"></label>'+
  '<div class="cc234-status" role="status" aria-live="polite">Developer-only. Ordinary gameplay unchanged.</div>';
tuning.appendChild(section);
const get=id=>section.querySelector('#'+id);
const status=get('cc234Activate')&&section.querySelector('.cc234-status');
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
svg.setAttribute('class','cc234-path');svg.setAttribute('aria-hidden','true');
svg.style.pointerEvents='none';
svg.hidden=true;
const glow=document.createElementNS(svg.namespaceURI,'path');
glow.setAttribute('class','cc234-glow');
const line=document.createElementNS(svg.namespaceURI,'path');
line.setAttribute('class','cc234-line');
svg.append(glow,line);
const points=[];
for(let i=0;i<4;i++){
 const p=document.createElementNS(svg.namespaceURI,'circle');
 p.setAttribute('class','cc234-target');
 p.setAttribute('r','16');svg.appendChild(p);points.push(p);
}
board.appendChild(svg);
let forecast=null,active=false,lastDraw=0,config={energy:42,motion:32};
const message=text=>{if(status)status.textContent=text};
get('cc234Energy').addEventListener('input',e=>{
 config.energy=Number(e.target.value);
 svg.style.setProperty('--cc234-energy',String(config.energy/100));
});
get('cc234Motion').addEventListener('input',e=>{
 config.motion=Number(e.target.value);
 svg.style.setProperty('--cc234-motion',String(config.motion/100));
});
function clear(messageText='Preview cleared'){
 forecast=null;active=false;svg.hidden=true;message(messageText);
}
get('cc234Reset').addEventListener('click',()=>clear());
get('cc234Activate').addEventListener('click',()=>{
 try{
  const a=game();
  if(!a?.relayForecast)throw Error('SOURCE_FORECAST_UNAVAILABLE');
  forecast=a.relayForecast();
  active=forecast.projected.length>0;
  svg.hidden=!active;
  if(!active){message('No accessible projected platform before end of run');return;}
  message(forecast.projected.length+' source-validated steps; '+
    (forecast.terminatedEarly?'projected run may end early':'follow the bright path'));
 }catch(error){clear('Preview unavailable: '+String(error.message||error));}
});
function render(timestamp){
 requestAnimationFrame(render);
 if(!active||!forecast||document.hidden||timestamp-lastDraw<80)return;
 lastDraw=timestamp;
 const a=game(),state=a?.snapshot?.();
 if(!state||state.runId!==forecast.runId||state.phase==='ended'){
  clear('Preview expired with the run');return;
 }
 const rows=forecast.projected;
 const first=rows[0];
 const origin=state.world.rows.flatMap(row=>row.platforms)
   .find(p=>p.id===first.platformId);
 const choiceButtons=[...board.querySelectorAll('button.choice')];
 const visiblePositions=choiceButtons.map(b=>{
  const p=state.world.rows.flatMap(row=>row.platforms)
    .find(item=>item.id===b.dataset.platformId);
  if(!p)return null;
  const bb=b.getBoundingClientRect(),br=board.getBoundingClientRect();
  return {world:p,x:bb.left+bb.width/2-br.left,
   y:bb.top+bb.height/2-br.top};
 }).filter(Boolean);
 // A single visible source row calibrates the browser-to-world X projection.
 // Never fake an answer/position when calibration is impossible.
 if(!origin||visiblePositions.length<2)return;
 const x0=visiblePositions[0],x1=visiblePositions.find(v=>v.world.x!==x0.world.x);
 if(!x1)return;
 const scale=(x1.x-x0.x)/(x1.world.x-x0.world.x);
 if(!Number.isFinite(scale)||scale<=0)return;
 const base=visiblePositions.find(v=>v.world.id===first.platformId)||x0;
 const worldBase=base.world;
 const coords=rows.map(p=>({
  x:base.x+(p.x-worldBase.x)*scale,
  y:base.y+(p.y-worldBase.y)*scale,
 }));
 const width=board.clientWidth,height=board.clientHeight;
 if(!width||!height)return;
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const d=coords.map((p,i)=>(i?'L':'M')+
   p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 glow.setAttribute('d',d);line.setAttribute('d',d);
 coords.forEach((p,i)=>{
  points[i].style.display='';points[i].setAttribute('cx',String(p.x));
  points[i].setAttribute('cy',String(p.y));
 });
 for(let i=coords.length;i<points.length;i++)points[i].style.display='none';
 const completed=state.completedRows;
 points.forEach((p,i)=>{p.dataset.passed=String(rows[i]?.row<=completed)});
}
svg.style.setProperty('--cc234-energy',String(config.energy/100));
svg.style.setProperty('--cc234-motion',String(config.motion/100));
requestAnimationFrame(render);
window.__CC2_34__={status:()=>({active,config:{...config},
  projectedRows:forecast?.projected.map(p=>p.row)||[]}),
  clear,};
})();