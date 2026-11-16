/**
 * CC2-24/25 — Actual browser music and authoritative debrief qualification.
 *
 * No mocked answer or fabricated results: click an actual correct platform,
 * play the engine, then end the run via the normal source-owned Quit control.
 * Compare recorded source IDs, summary, read-only debrief, and media context.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3289});
const browser=await chromium.launch({
  executablePath:findChromium(),args:LAUNCH_ARGS,headless:true
});
const folder='cc2-24-25-evidence';mkdirSync(folder,{recursive:true});
const records=[];
const check=(truth,title,details={})=>{
  records.push({title,passed:Boolean(truth),details});
  if(!truth)throw Error('CC22425_FAIL '+title+' '+JSON.stringify(details));
  console.log('PASS '+title);
};
function url(music='speedgrid'){
  const q=music==='legacy'?'?cc2Ui=slate-focus&cc2Music=legacy':
    '?cc2Ui=slate-focus';
  return new URL('src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
    server.url).toString();
}
async function visit(width,height,music){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url(music),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
    window.__CC2_15__?.music?.()&&window.__CC2_25__?.report?.(),
    null,{timeout:20000});
  const enter=page.locator('#cc209c-enter');
  if(await enter.isVisible())await enter.click();
  const choice=await page.evaluate(
    ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+choice+'"]').click();
  await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>12,
    null,{timeout:20000});
  return{page,errors};
}
try{
  for(const [w,h] of [[320,700],[390,844],[768,1024],[1008,894]]){
    const {page,errors}=await visit(w,h,'speedgrid');
    try{
      const status=await page.evaluate(()=>{
        const c=window.__CC2_02A__,m=window.__CC2_15__;
        return{
          music:m.music(),game:c.snapshot(),summary:c.summary(),
          shader:document.documentElement.dataset.cc2Ui,
          rawEvents:c.events(),pressure:!!c.pursuer()?.sensed
        };
      });
      check(status.shader==='slate-focus','owner Slate Focus skin '+w);
      check(status.game.tick>12&&status.game.currentProblem,
        'real math input and live run '+w);
      check(status.music.activeEngine==='speedgrid-reference',
        'SpeedGrid authentic reference selected '+w,status.music);
      check(status.music.speedGridReference?.decodedStemCount===5,
        'all five original 112 BPM stem buffers decoded '+w,status.music);
      check(status.music.speedGridReference.bpm===112&&
        status.music.speedGridReference.bars===16&&
        status.music.speedGridReference.createdContexts===0,
        'single shared 112 BPM transport without extra contexts '+w);
      check(status.rawEvents.some(e=>e.type==='ATTEMPT_EVALUATED'),
        'musical events have real arithmetic source '+w);
      await page.locator('#endRun').evaluate(el=>el.click());
      await page.waitForFunction(()=>{
        const s=window.__CC2_02A__?.summary?.();
        return s?.ended&&s.endReason==='QUIT';
      },null,{timeout:10000});
      await page.waitForFunction(
        ()=>window.__CC2_25__?.report?.()?.renderCount>0 &&
          !document.querySelector('#summaryPanel')?.hidden,
        null,{timeout:14000});
      const finale=await page.evaluate(()=>{
        const a=window.__CC2_02A__,report=a.summary();
        const ui=window.__CC2_25__.report();
        return {
          result:report,run:a.snapshot().runId,
          ui,hero:document.querySelector('.cc225-hero-head')?.textContent,
          route:document.querySelectorAll('.cc225-route-step').length,
          equations:document.querySelectorAll('#summaryEquations li').length,
          metrics:document.querySelectorAll('.cc225-verified-metric').length,
          dialogVisible:!document.querySelector('#summaryPanel').hidden,
          restartText:document.querySelector('#summaryRestart').textContent,
          overflow:document.documentElement.scrollWidth-innerWidth,
          album:window.__CC2_15__.music().activeEngine,
        };
      });
      check(finale.dialogVisible&&finale.metrics===4,
        'real source-driven debrief appears '+w,finale.ui);
      check(finale.result.endReason==='QUIT' &&
        finale.route===Math.min(24,finale.result.rowsSolved),
        'route lights only completed rows '+w,finale);
      check(finale.equations===Math.max(1,finale.result.equations.length),
        'completed equations only '+w,finale);
      check(finale.ui.sourceRunId===finale.run&&
        finale.ui.errors.length===0,
        'one correct run id and no debrief exceptions '+w,finale.ui);
      check(finale.restartText==='Climb again'&&finale.overflow<=2,
        'visible replay CTA and no horizontal overflow '+w);
      if(w===390||w===768){
        await page.screenshot({path:folder+'/CC2-'+w+
          '-Slate-Focus-Debrief.png',fullPage:true});
      }
      await page.locator('#summaryRestart').click();
      await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()?.phase!=='ended',
        null,{timeout:6000});
      check(await page.evaluate(()=>document.querySelector('#summaryPanel').hidden),
        'restart reopens fresh game '+w);
      check(errors.length===0,'no browser errors '+w,{errors});
    }finally{await page.close();}
  }
  const {page,errors}=await visit(390,844,'legacy');
  try{
    const status=await page.evaluate(()=>window.__CC2_15__.music());
    check(status.activeEngine==='circuit-ascending-legacy'&&
      status.speedGridReference===null,
      'legacy scoreboard/music comparison fully isolated',status);
    check(errors.length===0,'legacy audio no runtime errors',{errors});
  }finally{await page.close();}
  writeFileSync(folder+'/QA.json',JSON.stringify({
    schema:'cc2-24-25-browser-qa/v1',
    passed:records.every(x=>x.passed),checks:records.length,records,
  },null,2));
  console.log('CC2_24_25_BROWSER_PASS '+records.length+'/'+records.length);
}finally{await browser.close();await server.stop();}
