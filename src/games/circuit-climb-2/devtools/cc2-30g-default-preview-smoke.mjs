/**
 * CC2-30G owner's zero-config release gate.
 * Tests the EXACT published standalone game, not a modular Vite/dev page.
 *
 * Regression being protected: an HTML can render the core board while its
 * six-row camera and creature are silently OFF, simply because the player
 * opened a URL or file without the special query flags.
 */
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
const server=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
let failures=0;
const assert=(v,msg,details={})=>{
  if(!v){failures++;throw Error('CC230G '+msg+' '+JSON.stringify(details));}
  console.log('PASS CC230G '+msg);
};
try{
 for(const [width,height] of [[390,844],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  try{
   // Bare URL: NO flags. This is exactly how the owner's file was opened.
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
     window.__CC2_02A__?.rendererStats?.()&&
     window.__CC2_30__?.presentation?.draws>0,null,{timeout:16000});
   const init=await page.evaluate(()=>{
     const api=window.__CC2_02A__,params=new URLSearchParams(location.search);
     const camera=api.rendererStats();
     const visual=window.__CC2_30__;
     return {camera,creature:api.creature(),params:Object.fromEntries(params),
       overlay:visual?.presentation,notice:document.querySelector('.cc230-status')?.textContent,
       bodyText:document.body.innerText};
   });
   assert(init.params.cc230==='1'&&init.params.cc2Flow==='1'&&
     init.params.cc230Blanket==='1'&&init.params.cc230Early==='1',
     'bare URL bootstraps all candidate features '+width,init.params);
   assert(init.camera.flowRowsEachSide===3&&init.camera.previewRowsRendered>=2,
     'bare URL visibly paints 3 ahead and reserves 3 behind '+width,
     init.camera);
   assert(init.creature.config.firstEligibleRow===1&&
     init.creature.config.fieldMode==='BELOW_PLATFORM'&&
     init.creature.config.slowMultiplier===.5,
     'real creature source uses early encounter and 50% blanket '+width,
     init.creature?.config);
   assert(/Guardian arrives after your first climb/i.test(init.notice),
     'owner sees discoverability message before first climb '+width,
     {notice:init.notice});
   assert(!/vfxIntensity|\.beginPath\(/.test(init.bodyText),
     'published HTML contains no minified engine text spill '+width);
   await page.locator('#cc209c-enter').click();
   const id=await page.evaluate(()=>
     window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
   const target=page.locator('button.choice[data-platform-id="'+id+'"]');
   await target.waitFor({state:'visible',timeout:6000});
   await target.click();
   // Bare-link acceptance must run genuine real-time gameplay. The
   // QA-only advanceForQA method intentionally requires ?manual=1 and is
   // forbidden here: it would invalidate the zero-config test itself.
   await page.waitForFunction(()=>
     window.__CC2_02A__.snapshot().completedRows>=1,
     null,{timeout:14000});
   const traveled=await page.evaluate(()=>({
     rows:window.__CC2_02A__.snapshot().completedRows,
     source:window.__CC2_02A__.creature(),
   }));
   assert(traveled.rows>=1,'first genuine climb completed '+width,traveled);
   await page.waitForFunction(()=>window.__CC2_30__?.presentation?.creatureVisible,
     null,{timeout:9000});
   const creature=page.locator('.cc230-creature');
   assert(await creature.isVisible(),
     'Guardian is visible and tappable after first row '+width);
   await creature.click();
   await page.waitForFunction(()=>window.__CC2_02A__?.creature?.()?.question,
     null,{timeout:7000});
   const question=await page.evaluate(()=>window.__CC2_02A__.creature().question);
   const correct=question.sequence[2]+question.sequence[1]-question.sequence[0];
   await page.locator('.cc230-answer').filter({hasText:String(correct)}).click();
   const after=await page.evaluate(()=>{
     const a=window.__CC2_02A__,source=a.creature();
     return {field:source.activeField,
       factor:source.fieldMultiplier,
       types:source.receipts.map(e=>e.type),
       solved:a.snapshot().solved.length,
       note:document.querySelector('.cc230-status')?.textContent};
   });
   assert(after.field?.coverage==='BELOW_PLATFORM'&&after.factor===.5&&
     after.types.includes('FIELD_CAST')&&after.solved===1,
     'Guardian challenge casts actual bot-only 50% blanket '+width,after);
   assert(errors.length===0,'no browser exceptions '+width,{errors});
  }finally{await page.close();}
 }
 // ChatGPT exports and iOS downloads may change the HTML basename.
 // The exact same standalone bytes must still enable the whole experience.
 const renamed=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await renamed.goto('http://127.0.0.1:'+server.address().port+
    '/CircuitClimb-CC2-30G-Playable.html',{waitUntil:'domcontentloaded'});
  await renamed.waitForFunction(()=>window.__CC2_02A__?.rendererStats?.()&&
    window.__CC2_30__?.presentation?.draws>0,null,{timeout:15000});
  const result=await renamed.evaluate(()=>({
    flow:window.__CC2_02A__.rendererStats().flowRowsEachSide,
    first:window.__CC2_02A__.creature()?.config?.firstEligibleRow,
    flag:new URLSearchParams(location.search).get('cc230'),
  }));
  assert(result.flow===3&&result.first===1&&result.flag==='1',
    'renamed downloaded HTML has full game and early Guardian by default',result);
 }finally{await renamed.close();}
 // A historical CC2-28 preview alias must NEVER silently inherit CC230G.
 const oldRoute=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await oldRoute.goto('http://127.0.0.1:'+server.address().port+
    '/cc2-28.html',{waitUntil:'domcontentloaded'});
  await oldRoute.waitForFunction(()=>window.__CC2_02A__?.rendererStats?.());
  const result=await oldRoute.evaluate(()=>({
    flow:window.__CC2_02A__.rendererStats().flowRowsEachSide,
    creature:window.__CC2_02A__.creature(),
  }));
  assert(result.flow===2&&!result.creature,
    'historical cc2-28 alias never auto-enables experimental creatures',result);
 }finally{await oldRoute.close();}
 // A caller explicitly requesting cc230=0, cc2Flow=0 must NOT be forced
 // back into creature mode merely because it uses the CC2-30 route.
 const legacy=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await legacy.goto(base+'?cc230=0&cc2Flow=0',{waitUntil:'domcontentloaded'});
  await legacy.waitForFunction(()=>window.__CC2_02A__?.rendererStats?.());
  const plain=await legacy.evaluate(()=>({
    flow:window.__CC2_02A__.rendererStats().flowRowsEachSide,
    creature:window.__CC2_02A__.creature(),
  }));
  assert(plain.flow===2&&!plain.creature,
    'explicit legacy preview mode remains untouched',plain);
 }finally{await legacy.close();}
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures)process.exitCode=1;
