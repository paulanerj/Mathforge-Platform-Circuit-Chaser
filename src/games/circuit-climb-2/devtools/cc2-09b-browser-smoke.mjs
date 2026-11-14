/** Browser gate: real source-integrated 09B, 07E math and finite Pursuer. */
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {findChromium,LAUNCH_ARGS,startDevServer} from
  '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3197});
const browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
const url=new URL('src/games/circuit-climb-2/devtools/cc2-09b.html?manual=1',server.url).toString();
let checks=0;const assert=(ok,msg)=>{if(!ok)throw Error('CC2_09B_BROWSER: '+msg);checks++};
mkdirSync('cc2-09b-screenshots',{recursive:true});
try {
 for(const size of [[320,568],[390,844],[768,1024],[826,680]]){
  const [width,height]=size;
  const page=await browser.newPage({viewport:{width,height},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__CC2_09B__?.summary&&window.__CC2_02A__?.snapshot));
  await page.waitForTimeout(120);
  const before=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot(),r=a.replay();
    return {tick:s.tick,gap:s.world.geometry.rowGap,selected:window.__cc2ChaseStarted,
      search:r.pursuerPreset.speedSearch,chase:r.pursuerPreset.speedPursuit,
      spark:r.learnerMotion.circuitSpeedPerTick,math:s.currentProblem,
      painter:window.__CC2_09B__.summary(),options:document.querySelectorAll('button.choice').length,
      hud:getComputedStyle(document.querySelector('.hud')).display,
      overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert(before.tick===0&&!before.selected,'first selection waits '+width);
  assert(before.gap===576.5625,'source 2.8125x gap '+width);
  assert(before.search===4.8&&before.chase===6&&before.spark===24,'AI and Spark speed preserved '+width);
  assert(before.options===3,'three math choices '+width);
  assert(before.hud==='none'&&before.overflow<=1,'minimal HUD/overflow '+width);
  assert(before.painter.paintFailures===0&&before.painter.errors===0,'no painter errors '+width);
  assert(await page.locator('#cc209b-canvas').isVisible(),'original view mounted '+width);
  await page.locator('#cc209-settings-btn').click();
  assert(await page.locator('#cc209-settings').isVisible(),'settings accessible '+width);
  await page.locator('[data-close="cc209-settings"]').click();
  await page.locator('#cc209-help-btn').click();
  assert(await page.locator('#cc209-help').isVisible(),'help accessible '+width);
  await page.locator('[data-close="cc209-help"]').click();
  const correct=before.math.correctPlatformId;
  await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
  assert(await page.evaluate(()=>window.__cc2ChaseStarted===true),'first choice starts '+width);
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(150));
  const after=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot(),b=a.pursuer();
    return {tick:s.tick,rows:s.completedRows,correct:s.correctAttempts,failed:b.routeFailures,
      replay:a.replay(),metrics:a.sessionReport().metrics,errors:window.__CC2_09B__.summary().errors};
  });
  assert(after.tick>0&&after.rows>=1&&after.correct>=1,'real math solved '+width);
  assert(after.failed===0,'no Pursuer route failures '+width);
  assert(after.errors===0&&errors.length===0,'no script errors '+width+' '+errors.join(', '));
  await page.screenshot({path:'cc2-09b-screenshots/source-'+width+'.png',fullPage:true});
  if(width===390){
    const first=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
    await page.locator('#restart').click();
    assert(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick===0&&!window.__cc2ChaseStarted),'restart re-arms');
    await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
    await page.evaluate(()=>window.__CC2_02A__.advanceForQA(150));
    const second=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
    assert(first===second,'deterministic source replay');
    const replay=await page.evaluate(()=>window.__CC2_02A__.replay());
    assert(replay.config.rowGapScale===2.8125&&replay.pursuerPreset.searchStrategy==='ascending','source replay provenance');
  }
  await page.close();
 }
} finally {await browser.close();await server.stop?.();}
console.log('CC2-09B source browser checks PASS '+checks);
