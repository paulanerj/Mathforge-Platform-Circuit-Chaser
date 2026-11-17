/**
 * CC2-30H owner screenshot regression: test actual visible renderer.
 *
 * The previous 3+3 checks passed on a HIDDEN world canvas (opacity:0).
 * This test loads exact dist/cc2-30.html, inspects the topmost visible
 * Heritage canvas and checks visible platform pixels against background.
 * Do not substitute rendererStats.previewRowsRendered for these assertions.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
const server=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store'});res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-30-evidence',{recursive:true});
const report=[];
function assert(ok,label,details={}){
  report.push({ok:!!ok,label,details});
  if(!ok)throw Error('CC230H_VISIBLE_RENDER_FAIL '+label+' '+JSON.stringify(details));
  console.log('PASS CC230H '+label);
}
async function evidence(page,width,stage){
  await page.screenshot({path:'cc2-30-evidence/cc2-30h-'+width+'-'+stage+'.png',
    animations:'disabled',fullPage:true});
}
try{
 for(const [width,height] of [[320,700],[390,844],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
     window.__CC2_09B__?.summary?.()?.futureTiers?.cells>=6 &&
     window.__CC2_02A__?.rendererStats?.()?.flowRowsEachSide===3,
     null,{timeout:18000});
   // Heritage is the visible painter in the owner-accepted slate-focus
   // composition; worldCanvas remains hidden for visual parity.
   const r=await page.evaluate(()=>{
     const summary=window.__CC2_09B__.summary();
     const api=window.__CC2_02A__;
     const frame=api.rendererStats();
     const visible=document.querySelector('#cc209b-heritage-canvas');
     const source=document.querySelector('#worldCanvas');
     const style=getComputedStyle(visible);
     const visibleRect=visible.getBoundingClientRect();
     const p=visible.getContext('2d');
     const dpr=visible.width/visibleRect.width;
     const centers=summary.futureTiers.centers;
     const comparison=centers.map(c=>{
       // Sample inside the filled ceramic platform and above its edge at
       // same x, where parallax may vary but cannot simulate the platform.
       const sample=(x,y)=>{
         const pixel=p.getImageData(
           Math.max(0,Math.min(visible.width-1,Math.round(x*dpr))),
           Math.max(0,Math.min(visible.height-1,Math.round(y*dpr))),
           1,1).data;
         return [...pixel].slice(0,3);
       };
       const center=sample(c.x,c.y+c.height*.20);
       const background=sample(c.x,c.y-c.height*.85-8);
       const difference=center.reduce((sum,ch,i)=>
         sum+Math.abs(ch-background[i]),0);
       return {row:c.row,x:c.x,y:c.y,center,background,difference};
     });
     const spark=api.snapshot().spark;
     const projectedY=(spark.y-frame.cameraY)*frame.effectiveZoom*
       visibleRect.width/600;
     return {
       css:{display:style.display,visibility:style.visibility,
         opacity:style.opacity,width:visibleRect.width,height:visibleRect.height},
       sourceOpacity:getComputedStyle(source).opacity,
       sourcePreviewCount:frame.previewRowsRendered,
       visibleTiers:summary.futureTiers,
       projectedSparkY:projectedY,
       comparison,
       errors:summary.errors,
       paintFailures:summary.paintFailures,
       options:document.querySelectorAll('button.choice').length,
     };
   });
   assert(r.css.opacity!=='0'&&r.css.display!=='none'&&
     r.css.visibility==='visible'&&r.css.width>=width*.75,
     'paint actually targets visible Heritage canvas '+width,r.css);
   assert(r.sourceOpacity==='0'&&r.sourcePreviewCount>=2,
     'hidden source alone cannot count as platform visibility '+width,r);
   assert(r.visibleTiers.rows>=2&&r.visibleTiers.cells>=6,
     'at least two additional preexisting future platform tiers '+width,r.visibleTiers);
   assert(r.comparison.every(c=>c.difference>=20),
     'all visible future tiers have rendered contrast against background '+width,
     r.comparison);
   assert(r.visibleTiers.centers.some(p=>p.y<r.projectedSparkY-15),
     'new tiers are visibly AHEAD of Spark '+width,r);
   assert(r.errors===0&&r.paintFailures===0&&errors.length===0,
     'no hidden painter exception '+width,{r,errors});
   await evidence(page,width,'opening');
   await page.locator('#cc209c-enter').click();
   await page.waitForFunction(()=>
     document.querySelectorAll('button.choice').length===3);
   await evidence(page,width,'ready');
  }finally{await page.close();}
 }
 // Explicit no-flow mode preserves existing two-row Heritage behavior.
 const legacy=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await legacy.goto(base+'?cc2Flow=0&cc230=0',{waitUntil:'domcontentloaded'});
  await legacy.waitForFunction(()=>window.__CC2_09B__?.summary?.()?.frames>3);
  const r=await legacy.evaluate(()=>({
    source:window.__CC2_02A__.rendererStats().flowRowsEachSide,
    visible:window.__CC2_09B__.summary().futureTiers.cells,
  }));
  assert(r.source===2&&r.visible===0,
    'explicit legacy mode unchanged',r);
 }finally{await legacy.close();}
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
writeFileSync('cc2-30-evidence/cc2-30h-visible-tiers.json',
 JSON.stringify(report,null,2));
