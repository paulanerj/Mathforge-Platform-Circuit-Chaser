/**
 * Proves the finished, self-contained HTML opens from file:// with ALL HTTP
 * requests blocked, at phone/tablet widths, and plays a four-row Practice
 * game through the real core and local event summaries.
 */
import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {findChromium,LAUNCH_ARGS} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const url=pathToFileURL(resolve('cc2-standalone/CC2-04-Playable.html')).toString()+'?manual=1';
const browser=await chromium.launch({
  executablePath:findChromium(),headless:true,args:LAUNCH_ARGS,
});
let checks=0;
const assert=(value,name)=>{
  if(!value)throw Error('CC2_OFFLINE_FAIL: '+name);
  checks++;console.log('PASS '+name);
};
try{
  for(const viewport of [
    {width:320,height:568},{width:390,height:844},{width:768,height:1024},
  ]){
    const page=await browser.newPage({viewport});
    const external=[],errors=[];
    page.on('request',request=>{
      if(/^https?:/.test(request.url()))external.push(request.url());
    });
    page.on('pageerror',e=>errors.push(String(e)));
    await page.route('http://**/*',route=>route.abort());
    await page.route('https://**/*',route=>route.abort());
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(300);
    const diagnostics=await page.evaluate(()=>({
      loaded:document.readyState,
      title:document.title,
      bundled:document.querySelector('meta[name="cc2-bundle-version"]')?.getAttribute('content'),
      hasRuntime:Boolean(window.__CC2_02A__),
      scripts:document.querySelectorAll('script').length,
      inlineScriptBytes:document.querySelector('script')?.textContent?.length??0,
    }));
    console.log('CC2 OFFLINE STARTUP DIAGNOSTICS',JSON.stringify({diagnostics,errors,external}));
    if(errors.length)throw Error('CC2_OFFLINE_SCRIPT_ERROR: '+errors.join('; '));
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.results?.()),null,{timeout:8000});
    assert(await page.locator('.choice').count()===3,
      viewport.width+'px file://: real mathematical choices');
    assert(await page.locator('#pulse').count()===1,
      viewport.width+'px file://: source-owned Pulse control');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px file://: no horizontal layout overflow');
    assert(external.length===0,viewport.width+'px file://: zero HTTP requests');
    assert(errors.length===0,viewport.width+'px file://: zero JavaScript exceptions');
    if(viewport.width===390){
      await page.locator('.dev-controls summary').click();
      await page.locator('#gameMode').selectOption('practice');
      await page.locator('.dev-controls summary').click();
      const product=await page.evaluate(()=>{
        const ui=window.__CC2_02A__;
        for(let row=1;row<=4;row++){
          const id=ui.snapshot().currentProblem.correctPlatformId;
          const button=document.querySelector('button[data-platform-id="'+id+'"]');
          if(!button)throw Error('CC2_PORTABLE_NO_MATH_CHOICE');
          button.click();
          let ticks=0;
          while(ui.snapshot().completedRows<row && ticks++<220)
            ui.advanceForQA(1);
        }
        return ui.results();
      });
      assert(product.rowsCompleted===4 && product.solvedEquations.length===4,
        'file:// Practice completes four actual equations');
      assert(product.endReason==='PRACTICE_GOAL',
        'file:// Practice has deterministic authored end reason');
      assert(await page.locator('#summaryDialog').isVisible(),
        'file:// source-grounded run summary opens');
      assert(await page.locator('#equationReview li').count()===4,
        'file:// result contains precisely four solved equations');
    }
    await page.close();
  }
  console.log('CC2-04 SINGLE-FILE OFFLINE PASS — '+checks+' assertions');
}finally{
  await browser.close();
}
