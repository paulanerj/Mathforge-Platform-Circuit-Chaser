/**
 * CC2-23 owner test: actual browser touches and source-driven secondary
 * enemy sprites in the accepted CC2-VIS-21 board; no fake engine state.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3273});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const folder='cc2-23-evidence';
mkdirSync(folder,{recursive:true});
const results=[],ok=(truth,name,details={})=>{
  const record={ok:!!truth,name,details};
  results.push(record);
  if(!truth)throw Error('CC2_23_BROWSER_FAIL '+name+' '+
    JSON.stringify(details));
  console.log('PASS '+name);
};
const pageURL=q=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();
try{
  for(const [w,h] of [[320,568],[390,844],[768,1024],[1280,800]]){
    for(const mode of ['off','scout','sentry','both']){
      const page=await browser.newPage({viewport:{width:w,height:h}});
      const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      try{
        const suffix=mode==='off'?'':'?cc223='+mode+'&cc223Demo=1';
        await page.goto(pageURL(suffix),{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
          window.__CC2_23__?.report?.(),null,{timeout:20000});
        const prior=await page.evaluate(()=>({
          core:window.__CC2_02A__.snapshot(),
          secondary:window.__CC2_02A__.secondary(),
          overlay:window.__CC2_23__.report(),
          config:window.__CC2_02A__.secondaryConfig()
        }));
        ok(prior.core.tick===0&&prior.core.completedRows===0,
          mode+' fresh mathematical run at '+w);
        ok(mode==='off'?
          prior.secondary===null&&prior.overlay.active===false:
          prior.secondary?.mode===mode&&prior.overlay.active===true,
          mode+' has matching opt-in mode at '+w,prior.overlay);
        if(await page.locator('#cc209c-enter').isVisible())
          await page.locator('#cc209c-enter').click();
        const id=await page.evaluate(
          ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
        await page.locator('button.choice[data-platform-id="'+id+'"]').click();
        await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>9,
          null,{timeout:15000});
        const observed=await page.evaluate(()=>({
          state:window.__CC2_02A__.snapshot(),
          secondary:window.__CC2_02A__.secondary(),
          visual:window.__CC2_23__.report(),
          panel:!!document.querySelector('#cc223-panel'),
          canvas:!!document.querySelector('#cc223-secondary-canvas'),
          banner:document.querySelector('#cc223-mode-banner')?.textContent,
          width:document.documentElement.scrollWidth,
          viewport:innerWidth,
        }));
        ok(observed.panel===true,'Developer Settings always includes mode chooser '+mode+' '+w);
        ok(observed.state.currentProblem.options.length===3,
          'normal mathematical options preserved '+mode+' '+w);
        if(mode!=='off'){
          ok(observed.secondary.actors.length===(mode==='both'?2:1),
            'live deterministic secondary actors present '+mode+' '+w,
            observed.secondary);
          ok(observed.canvas&&observed.banner?.includes(mode.toUpperCase())&&
            observed.visual.frames>0,
            'source-projected visible enemies '+mode+' '+w,observed.visual);
          ok(observed.secondary.speedMultiplier<=1.12,
            'support pressure never stacks '+mode+' '+w);
        }else{
          ok(!observed.canvas&&observed.secondary===null,
            'zero-secondary mode still matches baseline '+w);
        }
        ok(observed.width<=observed.viewport+2,
          'no horizontal overflow '+mode+' '+w);
        if(w===390||w===768){
          await page.screenshot({path:folder+'/CC2-23-'+w+'-'+mode+'-play.png'});
        }
        ok(errors.length===0,
          'no runtime exceptions '+mode+' '+w,{errors});
      }finally{await page.close();}
    }
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(pageURL('?cc223=both&cc223Demo=1'),
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.(),
      null,{timeout:18000});
    await page.locator('#cc209c-enter').click();
    const id=await page.evaluate(
      ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
    await page.locator('button.choice[data-platform-id="'+id+'"]').click();
    await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>4,
      null,{timeout:10000});
    await page.locator('#restart').click();
    await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick===0,
      null,{timeout:5000});
    ok(await page.evaluate(()=>{
      const a=window.__CC2_02A__,s=a.secondary();
      return s?.runId===a.snapshot().runId&&s.events.length===0&&
        s.summary.alerts===0&&s.actors.length===0;
    }),'real restart isolates secondary enemy session');
  }finally{await page.close();}
  writeFileSync(folder+'/CC2-23-BROWSER-QUALIFICATION.json',
    JSON.stringify({schema:'cc2-23-browser-qa/v1',
      checks:results.length,passed:results.every(x=>x.ok),
      results},null,2));
  console.log('CC2-23 BROWSER PASS '+results.length+'/'+results.length);
}finally{await browser.close();await server.stop();}
