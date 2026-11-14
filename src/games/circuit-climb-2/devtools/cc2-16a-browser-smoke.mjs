/**
 * CC2-16A: actual browser integration of owner Pursuer integrity scenarios.
 *
 * No fake enemy placement or hidden answer injection. The test lab drives
 * clicks on live source-owned choices and advances the real deterministic
 * engine through its manual tick adapter. Photos are captured for QA.
 */
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3246});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const dir='cc2-16a-evidence';mkdirSync(dir,{recursive:true});
let assertions=0;const results=[];
const check=(ok,label,detail='')=>{
  assertions++;results.push({label,ok:Boolean(ok),detail});
  if(!ok)throw Error('CC2_16A_BROWSER: '+label+' '+detail);
  console.log('PASS '+label+(detail?' '+detail:''));
};
try{
 for(const [w,h] of [[320,568],[390,844],[428,926],[768,1024],[826,680]]){
  const page=await browser.newPage({viewport:{width:w,height:h},
    acceptDownloads:true,reducedMotion:w===320?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(new URL('src/games/circuit-climb-2/devtools/cc2-16a.html?manual=1',
    server.url).toString(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_16A__?.report&&
    window.__CC2_02A__?.pursuerTrace&&document.querySelector('#cc216-pursuer-lab'),
    null,{timeout:20000});
  const source=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot(),r=a.replay();
    return{tick:s.tick,gap:s.world.geometry.rowGap,
      speed:r.pursuerPreset.speedSearch,
      pursuit:r.pursuerPreset.speedPursuit,
      strategy:r.pursuerPreset.searchStrategy,
      digest:a.sessionReport().stateDigest,
      math:s.currentProblem.correctPlatformId,
      audio:window.__CC2_15__.music().bpm};
  });
  check(source.tick===0&&source.gap===576.5625,'original world '+w);
  check(source.strategy==='ascending'&&source.speed===4.8&&
    source.pursuit===6,'all existing AI parameters unchanged '+w);
  check(source.audio===112,'adaptive music preserved '+w);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'no responsive horizontal overflow '+w);
  check(await page.locator('#cc209-equation').count()===1,
    'no enlarged center target '+w);
  // The original intro deliberately hides the Settings header until the
  // learner chooses View tower. Dismiss it without starting simulation.
  await page.locator('#cc209c-enter').click();
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick===0),
    'intro exit does not start Pursuer '+w);
  await page.locator('#cc209-settings-btn').click();
  await page.locator('#cc209-settings').waitFor({state:'visible',timeout:4000});
  await page.locator('#cc216-pursuer-lab > summary').click();
  check(await page.locator('#cc216-download').isVisible(),
    'full diagnostic download inside Developer Settings '+w);
  check(await page.locator('.cc216-qa-button').count()===3,
    'manual QA provides three deterministic scenarios '+w);
  check(await page.locator('#speedSearch').count()===1&&
    await page.locator('#speedPursuit').count()===1&&
    await page.locator('#trailSenseRadius').count()===1,
    'owner AI tuning knobs retained '+w);
  const promise=page.waitForEvent('download');
  await page.locator('#cc216-download').click();
  const file=await promise;
  const path=await file.path(),body=JSON.parse(readFileSync(path,'utf8'));
  check(body.schema==='cc2-16a-complete-session/v1'&&
    body.source.replay&&body.source.stateDigest===source.digest,
    'full-session has exact deterministic replay '+w);
  check(Array.isArray(body.pursuer.sourceDecisionTrace)&&
    body.pursuer.graph?.nodes?.length>0,
    'full-session includes real bot decisions and graph '+w);
  check(body.integrity.mathOnlySolved===0,
    'diagnostic export never rewards solver '+w);
  const after=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
  check(after===source.digest,'export is strictly read-only '+w);
  if(w===390)await page.screenshot({path:dir+'/CC2-16A-settings-390.png',fullPage:true});
  if(w===390){
    // Test a real physically near Pursuer followed by four source-backed
    // rapid selections. This may legitimately terminate on physical contact.
    await page.locator('.cc216-qa-button[data-kind="close-four"]').click();
    await page.waitForFunction(()=>window.__CC2_16A__?.summary().runCount>=1,
      null,{timeout:120000});
    const first=await page.evaluate(()=>window.__CC2_16A__.summary());
    check(!first.latest.error,'close-then-four scenario completes '+JSON.stringify(first.latest));
    check(first.latest.completedRapid>=3,
      'close Pursuer observed then >=3 rapid real landings '+JSON.stringify(first.latest));
    check(first.latest.routeFailures===0,'zero graph route failures after sprint');
    check(first.latest.downhill<=576.5625*1.12,
      'lost-contact Pursuer does not fall multiple tiers',String(first.latest.downhill));
    check(first.latest.evaluated,
      'reacquisition, real capture or <=1-floor physical separation');
    check(first.peakWake>0,'Spark left real finite-lifetime wake samples');
    await page.screenshot({path:dir+'/CC2-16A-close-four-390.png',fullPage:true});
    const next=await page.evaluate(()=>window.__CC2_16A__.runScenario('owner-replay'));
    await page.waitForFunction(()=>window.__CC2_16A__?.summary().runCount>=2,
      null,{timeout:120000});
    const reproduced=await page.evaluate(()=>window.__CC2_16A__.summary().latest);
    check(!reproduced.error,'owner 8-row timing scenario executes '+JSON.stringify(reproduced));
    check(reproduced.routeFailures===0,'reported scenario legal routing');
    check(reproduced.downhill<=576.5625*1.12,
      'no reported-basement regression '+JSON.stringify(reproduced));
    check(reproduced.fixed===true,'no downward integrity alarms in source play');
    await page.screenshot({path:dir+'/CC2-16A-owner-replay-390.png',fullPage:true});
    const full=await page.evaluate(()=>window.__CC2_16A__.report());
    check(full.integrity.replayIncluded&&
      full.pursuer.sourceDecisionTrace.length>0,
      'diagnostic package includes source truth after report replay');
    writeFileSync(dir+'/owner-scenario-summary.json',JSON.stringify({
      closeFour:first.latest,reproduction:reproduced,
      schema:full.schema,sourceHash:full.integrity.deterministicSourceDigest,
    },null,2));
  }
  check(errors.length===0,'no browser page errors '+w,errors.join('; '));
  await page.close();
 }
 console.log('CC2-16A BROWSER PASS '+assertions+'/'+assertions);
 writeFileSync(dir+'/browser-qualification.json',
   JSON.stringify({schema:'cc2-16a-browser/v1',assertions,results},null,2));
}finally{await browser.close();await server.stop();}
