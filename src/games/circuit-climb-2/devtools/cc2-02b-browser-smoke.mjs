/**
 * CC2-02B playable real-browser chase and screenshot proof. Uses the SAME
 * source-owned autonomous bot as the seeded headless tests. No fake pursuit.
 */
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {
  findChromium,LAUNCH_ARGS,startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-02b-screenshots';
mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3142});
let browser,checks=0;
const check=(condition,name)=>{
  if(!condition)throw Error('CC2-02B BROWSER FAIL: '+name);
  console.log('PASS '+name);checks++;
};
const url=new URL('src/games/circuit-climb-2/devtools/cc2-02b.html',server.url).toString();
async function shot(page,name){
  await page.screenshot({path:join(dir,name+'.png'),fullPage:true});
}
async function state(page){
  return page.evaluate(()=>({learner:window.__CC2_02A__.snapshot(),
    bot:window.__CC2_02A__.pursuer()}));
}
try{
  browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
  for(const width of [320,390,428,768]){
    const page=await browser.newPage({viewport:{width,height:width===320?568:844}});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.pursuer?.()));
    await page.waitForTimeout(350);
    const initial=await state(page);
    check(Boolean(initial.bot),width+'px: actual PursuerController mounted');
    check(initial.bot.radius>0 && initial.bot.graphNodeCount>8,
      width+'px: collision graph and physical actor exist');
    check(await page.locator('.choice').count()===3,
      width+'px: the same source-owned three math options');
    check(await page.locator('canvas').isVisible(),width+'px: canvas renders');
    await shot(page,'ready-'+width);
    check(errors.length===0,width+'px: no runtime exceptions '+errors.join(';'));
    await page.close();
  }

  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.pursuer?.()));
  await page.waitForFunction(()=>window.__CC2_02A__.pursuer()?.sensed===true,
    null,{timeout:15000});
  let x=await state(page);
  check(x.bot.sensed && x.bot.belief.acquisitions>=1,
    'live sensing is admitted before the bot switches into pursuit');
  await shot(page,'legitimate-acquisition-390');

  await page.waitForFunction(()=>window.__CC2_02A__.snapshot().endReason==='CAPTURED',
    null,{timeout:25000});
  x=await state(page);
  check(x.learner.phase==='ended' && x.learner.endReason==='CAPTURED',
    'bot physically catches stationary grounded Spark');
  check(x.bot.routeFailures===0,'capture had no path planning failure');
  check(x.learner.attempts===0,'pursuer cannot invent math attempts');
  await shot(page,'physical-capture-390');
  await page.locator('#restart').click();
  x=await state(page);
  check(x.learner.phase==='ready' && x.bot.belief.acquisitions===0,
    'restart clears all pursuer belief and terminal state');
  await page.locator('#pause').click();
  const paused=await state(page);
  await page.waitForTimeout(400);
  const held=await state(page);
  check(held.learner.tick===paused.learner.tick &&
    held.bot.ticks===paused.bot.ticks,'pause freezes both systems');
  await shot(page,'paused-390');
  check(errors.length===0,'capture/restart/pause has no page exception');
  await page.close();

  const base=await browser.newPage({viewport:{width:390,height:844}});
  await base.goto(new URL('src/games/circuit-climb-2/devtools/cc2-02a.html',server.url));
  await base.waitForFunction(()=>Boolean(window.__CC2_02A__));
  check(await base.evaluate(()=>window.__CC2_02A__.pursuer()===null),
    'non-chase 02A/Q1 board retains NO pursuer');
  await base.close();

  console.log('CC2-02B PLAYABLE CHASE BROWSER PASS — '+checks+' assertions');
}finally{
  if(browser)await browser.close();
  await server.stop();
}
