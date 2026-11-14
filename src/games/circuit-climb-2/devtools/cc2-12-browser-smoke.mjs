/**
 * CC2-10–12 real source-built browser qualification.
 * The game and bot are never mocked. Source/renderer replay digest is observed
 * at actual engine tick boundaries; all artificial QA ticks go through the
 * read-only legacy manual harness and source-owned advance method.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3224});
const browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
const dir='cc2-12-evidence';mkdirSync(dir,{recursive:true});
const samples=[],failures=[];let assertions=0;
const check=(ok,why)=>{
 assertions++;
 if(!ok){failures.push(why);throw Error('CC2-12_VISUAL '+why);}
};
try{
 for(const [w,h,reduced] of [[320,568,true],[390,844,false],
   [428,926,false],[768,1024,false],[826,680,false]]){
  const page=await browser.newPage({viewport:{width:w,height:h},
    reducedMotion:reduced?'reduce':'no-preference',acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(new URL('src/games/circuit-climb-2/devtools/cc2-12.html?manual=1',server.url).toString(),
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_12__?.summary &&
    window.__CC2_09D__?.summary && window.__CC2_02A__?.snapshot,
    null,{timeout:20000});
  const before=await page.evaluate(()=>{
   const a=window.__CC2_02A__,s=a.snapshot(),p=a.replay();
   return {tick:s.tick,gap:s.world.geometry.rowGap,
    style:p.config.routeStyleVersion,
    bot:p.pursuerPreset,learner:p.learnerMotion,
    digest:a.sessionReport().stateDigest,
    visual:window.__CC2_12__.summary(),
    largeTargetScript:document.documentElement.innerHTML.includes('ctx.fillText(String(state.currentProblem.targetValue)')};
  });
  check(before.tick===0,'first click gate '+w);
  check(before.style==='cc2-motion-styles/v1','source-backed motion opt-in '+w);
  check(before.gap===576.5625,'physical spacing retained '+w);
  check(before.bot.speedSearch===4.8&&before.bot.speedPursuit===6,
    'bot profile unchanged '+w);
  check(!before.largeTargetScript,'oversized target never reintroduced '+w);
  check(!before.visual.errors,'presenter clean startup '+w);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'no horizontal overflow '+w);
  await page.locator('#cc209c-enter').click();
  check(await page.locator('#cc209-equation').isVisible(),'math stays legible '+w);
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick===0),
    'intro alone never starts bot '+w);
  if(w===390)await page.screenshot({path:dir+'/CC2-12-before-selection-390.png',fullPage:true});
  const correct=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
  await page.waitForTimeout(90);
  check(await page.evaluate(()=>window.__cc2ChaseStarted===true),
    'first valid choice starts Pursuer '+w);
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(170));
  await page.waitForTimeout(130);
  const after=await page.evaluate(()=>{
   const a=window.__CC2_02A__,s=a.snapshot(),b=a.pursuer(),v=window.__CC2_12__.summary();
   return{rows:s.completedRows,solved:s.solved.length,botFailures:b.routeFailures,
    phase:v.phase,visual:v,digest:a.sessionReport().stateDigest,
    eventCount:a.events().length,routeStyle:a.events().filter(e=>e.type==='TRAVEL_STARTED').at(-1)?.detail.routeStyle,
    focus:document.activeElement?.id,
    indicator:{text:document.getElementById('cc212-chase-indicator')?.textContent,
      display:getComputedStyle(document.getElementById('cc212-chase-indicator')).display},
    pointer:getComputedStyle(document.getElementById('cc209d-effects')).pointerEvents,
    renderErrors:window.__CC2_09D__.summary().errors};
  });
  check(after.solved>=1&&after.rows>=1,'real source math landing '+w);
  check(after.botFailures===0,'bot graph integrity '+w);
  check(after.routeStyle!==undefined,'route style receipt '+w);
  check(['SEARCH','ACQUIRE','PRESSURE','RECOVER'].includes(after.phase),
    'phase derived from real finite sensor '+w);
  check(after.indicator.text.length>0,'small bot state indicator '+w);
  check(after.pointer==='none','visual canvas cannot steal clicks '+w);
  check(after.visual.errors===0&&after.renderErrors===0&&errors.length===0,
    'all visual adapters and browser error-free '+w);
  samples.push({width:w,height:h,phase:after.phase,routeStyle:after.routeStyle,
   rows:after.rows,events:after.eventCount,digest:after.digest});
  if(w===390)await page.screenshot({path:dir+'/CC2-12-active-390.png',fullPage:true});
  if(w===320)await page.screenshot({path:dir+'/CC2-12-mobile-320.png',fullPage:true});
  await page.close();
 }
 writeFileSync(dir+'/qualification.json',JSON.stringify({
  schema:'cc2-12-browser/v1',assertions,failures,samples},null,2));
 console.log('CC2-10-12 browser matrix PASS '+assertions+' assertions');
}finally{await browser.close();await server.stop();}
