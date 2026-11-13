/**
 * Real Chromium offline proof: no network requests and the actual Q2
 * mathematical engine still works when opened directly through file://.
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { findChromium, LAUNCH_ARGS }
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const url = pathToFileURL(resolve('cc2-standalone/CC2-06D-ExpandedTower-Playable.html'))
  .toString() + '?manual=1';
const browser = await chromium.launch({
  executablePath:findChromium(),headless:true,args:LAUNCH_ARGS,
});
let checks = 0;
const assert = (value, label) => {
  if(!value) throw Error('CC2_06D_OFFLINE_FAIL: '+label);
  checks++;
  console.log('PASS '+label);
};
try {
  for (const viewport of [
    {width:320,height:568},{width:390,height:844},{width:768,height:1024},
  ]) {
    const page = await browser.newPage({viewport});
    const requests=[],errors=[];
    page.on('request', request => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    page.on('pageerror',e=>errors.push(String(e)));
    await page.route('http://**/*',route=>route.abort());
    await page.route('https://**/*',route=>route.abort());
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.snapshot),null,{timeout:8000});
    const start=await page.evaluate(()=>window.__CC2_02A__.snapshot());
    assert(start.world.geometry.rowGap===307.5,
      viewport.width+'px: real expanded 1.5x row geometry');
    assert(start.currentProblem.targetValue===10,
      viewport.width+'px: first target exactly 10');
    assert(start.currentProblem.options.filter(o=>
      start.spark.value+o.value===10).length===1,
      viewport.width+'px: one correct complement to target 10');
    assert(requests.length===0,viewport.width+'px: no external requests');
    assert(errors.length===0,viewport.width+'px: zero script exceptions');
    const view=await page.evaluate(()=>window.__CC2_02A__.rendererStats());
    assert(view.viewportCoverage.above>=2 && view.viewportCoverage.below>=2,
      viewport.width+'px: 2 full row levels above and below');
    assert((await page.evaluate(()=>window.__CC2_02A__.replay())).pursuerPreset.speedPursuit===3.10,
      viewport.width+'px: Direct Chase default is active');
    assert((await page.evaluate(()=>window.__CC2_02A__.replay())).personality.style==='curious',
      viewport.width+'px: personality present and source-owned');
    assert(Number(await page.locator('#cameraZoom').inputValue())===0.70,
      viewport.width+'px: camera user maximum available');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px: no overflow');
    if(viewport.width===390){
      await page.locator('.dev-controls summary').click();
      await page.locator('#mode').selectOption('practice');
      await page.locator('#curriculum').selectOption('skip2to10');
      for(let row=1;row<=4;row++){
        const result=await page.evaluate(()=>{
          const api=window.__CC2_02A__,before=api.snapshot();
          const element=document.querySelector('button[data-platform-id="'+
            before.currentProblem.correctPlatformId+'"]');
          if(!element)throw Error('MISSING_REAL_OFFLINE_BUTTON');
          element.click();
          for(let i=0;i<350;i++){
            if(['ready','ended'].includes(api.snapshot().phase))return api.snapshot();
            api.advanceForQA(1);
          }
          throw Error('OFFLINE_TRAVEL_STALLED');
        });
        assert(result.completedRows===row,'offline skip landed row '+row);
      }
      const summary=await page.evaluate(()=>window.__CC2_02A__.summary());
      assert(summary.equations.length===4&&
        summary.equations.every(e=>e.equation.includes('count by 2')),
        'offline result lists only real skip-count completions');
    }
    await page.close();
  }
  console.log('CC2-06D OFFLINE PASS — '+checks+' assertions');
}finally{
  await browser.close();
}
