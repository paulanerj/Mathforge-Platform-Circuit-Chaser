/**
 * CC2-34 — opt-in Relay hologram browser smoke against EXACT packaged HTML.
 *
 * Assertions: legacy remains unchanged; developer preview uses authentic
 * engine forecast, source snapshot remains the same, and the overlay cannot
 * intercept mathematical choices.
 */
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc234-relay-preview-controller')||
   !html.includes('cc234-relay-preview-style'))
 throw Error('CC234_STANDALONE_ASSET_NOT_PACKAGED');
const server=createServer((_req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
 res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({
 executablePath:findChromium(),args:LAUNCH_ARGS,headless:true,
});
const report=[];
const check=(value,label)=>{
 if(!value)throw Error('CC234_BROWSER_FAIL:'+label);
 report.push(label);console.log('PASS',label);
};
try{
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:width===768?1024:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto(base+'?cc234=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
     window.__CC2_34__?.status?.(),null,{timeout:12000});
   check(await page.locator('#cc234Activate').count()===1,
    'dev studio preview exists at '+width);
   await page.locator('#cc209c-enter').click();
   const snapshot=await page.evaluate(()=>window.__CC2_02A__.snapshot());
   const before=JSON.stringify(snapshot);
   await page.evaluate(()=>document.getElementById('cc234Activate').click());
   const status=await page.evaluate(()=>window.__CC2_34__.status());
   check(status.active===true,'forecast activated on actual source '+width);
   check(status.projectedRows.length>=1,'future source rows generated '+width);
   check(await page.evaluate(()=>JSON.stringify(window.__CC2_02A__.snapshot())===
     JSON.stringify(window.__CC2_02A__.snapshot())),'snapshot access '+width);
   const after=await page.evaluate(()=>JSON.stringify(window.__CC2_02A__.snapshot()));
   check(before===after,'preview cannot mutate mathematical source '+width);
   await page.waitForTimeout(150);
   check(await page.locator('svg.cc234-path').isVisible(),
     'weaver energy path visible '+width);
   const hit=await page.evaluate(()=>{
    const button=document.querySelector('button.choice');
    if(!button)return false;
    const r=button.getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return hit===button||button.contains(hit);
   });
   check(hit,'math platform receives pointer despite overlay '+width);
   check(errors.length===0,'no JS exceptions at '+width+': '+errors.join(','));
  }finally{await page.close();}
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.(),null,{timeout:12000});
  const absent=await page.evaluate(()=>!window.__CC2_34__&&
    document.querySelector('#cc234Activate')===null);
  check(absent,'ordinary gameplay hides Weaver developer controls');
 }finally{await page.close();}
 console.log('CC2-34 browser checks:',report.length);
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
