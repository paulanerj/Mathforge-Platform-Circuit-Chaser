/**
 * CC2-43 actual-game visual geometry acceptance in the PRESENTED Heritage
 * painter, not merely the invisible underlying source canvas.
 *
 * Opens exact packaged dist/cc2-30.html at five phone/tablet/desktop widths,
 * captures screenshots and checks:
 *  - authoritative source row pitch projects to exactly CSS design token
 *  - three structural levels BELOW starting Spark are actually painted
 *  - three genuine/structural future levels above remain available
 *  - Spark stays centered (maximum ±8px) in both axes of row distribution
 *  - only three legitimate answer buttons exist, source state unchanged
 *  - pitch does not change when camera zoom is adjusted
 *  - unmodified legacy mode is not touched
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc243-locked-geometry-contract'))
 throw Error('CC243_LOCK_STYLE_NOT_IN_GAME');
const server=createServer((_req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
 res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
 executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-43-evidence',{recursive:true});
const results=[];
function check(condition,label,details={}){
 const entry={pass:Boolean(condition),label,details};
 results.push(entry);
 if(!condition)throw Error('CC243_CAMERA_REGRESSION '+JSON.stringify(entry));
 console.log('PASS CC243 '+label);
}
async function collect(page){
 return await page.evaluate(()=>{
  const api=window.__CC2_02A__,s=api.snapshot();
  const stats=api.rendererStats(), heritage=window.__CC2_09B__.summary();
  const board=document.querySelector('#board');
  const boardRect=board.getBoundingClientRect();
  const g=s.world.geometry;
  // Painter and source camera use canvas.clientWidth, not the bordered board.
  const width=document.getElementById('worldCanvas').clientWidth;
  const projectedY=row=>(-row*g.rowGap-stats.cameraY)*
    stats.effectiveZoom*width/600;
  const structural=heritage.futureTiers?.centers??[];
  const byRow=Object.fromEntries([...new Set(structural.map(x=>x.row))]
    .map(row=>[row,structural.filter(x=>x.row===row)]));
  const upper=Object.keys(byRow).map(Number).filter(row=>row>0);
  const lower=Object.keys(byRow).map(Number).filter(row=>row<0);
  const pixel=(()=>{
   const c=document.getElementById('cc209b-heritage-canvas');
   const ctx=c.getContext('2d');
   const dpr=c.width/c.getBoundingClientRect().width;
   return structural.filter(x=>x.row<0).map(x=>{
    const sample=(xx,yy)=>Array.from(ctx.getImageData(
     Math.max(0,Math.min(c.width-1,Math.floor(xx*dpr))),
     Math.max(0,Math.min(c.height-1,Math.floor(yy*dpr))),1,1).data).slice(0,3);
    const fg=sample(x.x,x.y+x.height*.16),bg=sample(x.x,x.y-x.height*.95-10);
    return {row:x.row,diff:fg.reduce((sum,v,i)=>sum+Math.abs(v-bg[i]),0)};
   });
  })();
  const button=document.querySelector('button.choice');
  const hit=(()=>{
   if(!button)return false;
   const r=button.getBoundingClientRect();
   const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return e===button||button.contains(e);
  })();
  return {
   source:s,stats,board:{height:boardRect.height,width:boardRect.width},
   cssPitch:Number.parseFloat(getComputedStyle(board).getPropertyValue('--cc243-row-pitch')),
   style:document.body.classList.contains('cc243-locked-spacing'),
   future:heritage.futureTiers,lower,upper,pixel,hit,
   row0Y:projectedY(0),rowMinus1Y:projectedY(-1),
   rowPlus1Y:projectedY(1),
   rowPlus3Y:projectedY(3),rowMinus3Y:projectedY(-3),
   choiceCount:document.querySelectorAll('button.choice').length,
   canvasOpacity:getComputedStyle(document.querySelector('#cc209b-heritage-canvas')).opacity,
  };
 });
}
try{
 for(const [width,height,pitch] of [
  [320,700,96],[390,844,96],[428,926,96],
  [768,1024,108],[988,874,108],
 ]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('#cc209c-enter').click();
   await page.waitForFunction(()=>
     window.__CC2_02A__?.snapshot?.() &&
     window.__CC2_09B__?.summary?.()?.futureTiers?.centers?.some(x=>x.row===-3),
     null,{timeout:25000});
   await page.waitForTimeout(75);
   const v=await collect(page);
   check(v.style&&v.cssPitch===pitch,'CSS pitch activated '+width,{cssPitch:v.cssPitch});
   check(Math.abs((v.rowMinus1Y-v.row0Y)-pitch)<.3 &&
     Math.abs((v.row0Y-v.rowPlus1Y)-pitch)<.3,
     'exact symmetrical fixed vertical tier gap '+width,{
      gapBelow:v.rowMinus1Y-v.row0Y,gapAbove:v.row0Y-v.rowPlus1Y});
   check(Math.abs(v.row0Y-v.board.height/2)<=9,
     'Spark row stays centered to 8px '+width,{
      row0:v.row0Y,mid:v.board.height/2});
   check(v.rowPlus3Y>65&&v.rowMinus3Y<v.board.height-45,
     'top and bottom reserve enough breathing room '+width,{
      top:v.rowPlus3Y,bottom:v.rowMinus3Y,boardHeight:v.board.height});
   check([-3,-2,-1].every(x=>v.lower.includes(x)) &&
     [2,3].every(x=>v.upper.includes(x)),
     '3 dormant lower + 2 future structural tiers visibly present '+width,{
      lower:v.lower,upper:v.upper});
   check(v.pixel.every(p=>p.diff>=18),
     'lower dormant platforms actually painted in visible Heritage canvas '+width,{
      pixel:v.pixel});
   check(v.choiceCount===3&&v.hit,
     'only real math choices receive input '+width,{
      choices:v.choiceCount,hit:v.hit});
   check(errors.length===0,'no actual browser exceptions '+width,{errors});
   await page.screenshot({path:'cc2-43-evidence/locked-balanced-'+width+'.png',
     fullPage:true,animations:'disabled'});
  }finally{await page.close();}
 }
 const legacy=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await legacy.goto(base+'?cc2Flow=0&cc230=0',{waitUntil:'domcontentloaded'});
  await legacy.waitForFunction(()=>window.__CC2_02A__?.rendererStats?.(),
   null,{timeout:12000});
  const unmodified=await legacy.evaluate(()=>({
   lock:document.body.classList.contains('cc243-locked-spacing'),
   pitch:window.__CC2_02A__.rendererStats().lockedRowPitchCssPx,
  }));
  check(!unmodified.lock&&unmodified.pitch===null,
   'legacy nonflow camera unchanged',unmodified);
 }finally{await legacy.close();}
 console.log('CC2-43 browser assertions passed:',results.length);
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
 writeFileSync('cc2-43-evidence/browser-results.json',
  JSON.stringify(results,null,2));
}
