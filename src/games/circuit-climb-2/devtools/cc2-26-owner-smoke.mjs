/**
 * CC2-26 — browser authority, first-choice and material cohesion tests.
 * Tests source-derived motion rather than predicting animation screenshots.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3296});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const folder='cc2-26-evidence';
mkdirSync(folder,{recursive:true});
const checks=[];
const check=(ok,name,details={})=>{
  checks.push({ok:!!ok,name,details});
  if(!ok)throw Error('CC2_26_FAIL '+name+' '+JSON.stringify(details));
  console.log('PASS '+name);
};
const url=q=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();
try{
  for(const [width,height] of [[320,700],[390,844],[768,1024]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url('?cc2Ui=slate-focus&cc226=1'),
        {waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_26__?.report?.().ready,
        null,{timeout:20000});
      const before=await page.evaluate(()=>{
        const r=window.__CC2_26__.report();
        const g=window.__CC2_02A__;
        return {r,game:g.snapshot(),canvas:
          document.querySelectorAll('#cc220-fluid').length};
      });
      check(before.r.beforeDigest===before.r.afterDigest&&
        before.r.existingCanvasCount===1&&
        before.r.additionalCanvasCount===0,
        'no new canvas or source write '+width,before.r);
      check(before.r.materialHash&&before.r.errors.length===0,
        'validated owner-review visual configuration '+width);
      if(await page.locator('#cc209c-enter').isVisible())
        await page.locator('#cc209c-enter').click();
      const choice=await page.evaluate(()=>
        window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      await page.locator(
        'button.choice[data-platform-id="'+choice+'"]').click();
      await page.waitForFunction(()=>
        window.__CC2_02A__.snapshot().tick>12&&
        window.__CC2_26__.report().frames>0&&
        window.__CC2_26__.report().sourceTick>=0,
        null,{timeout:20000});
      const play=await page.evaluate(()=>({
        r:window.__CC2_26__.report(),
        s:window.__CC2_02A__.snapshot(),
        viewportWidth:document.documentElement.scrollWidth
      }));
      check(play.s.currentProblem.options.length===3&&
        play.r.frames>0&&play.r.sourceTick>=0,
        'real arithmetic and live Pursuer visuals '+width);
      check(play.r.attached===null||
        play.r.attached.tethered===true&&
        play.r.attached.centerDistancePx<=play.r.attached.maxAllowedPx+.15,
        'physical membrane attached to real Pursuer '+width,play.r.attached);
      check(play.viewportWidth<=width+2,
        'no horizontal overflow '+width);
      check(errors.length===0,'no runtime exceptions '+width,{errors});
      await page.screenshot({path:folder+'/CC2-26-'+width+'-playing.png'});
    }finally{await page.close();}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(url('?cc2Ui=slate-focus'),
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_26__?.report?.(),
      null,{timeout:20000});
    const standard=await page.evaluate(()=>
      window.__CC2_26__.report());
    check(!standard.enabled&&!standard.ready&&
      standard.additionalCanvasCount===0,
      'default historical CC2-24/25 material unchanged');
  }finally{await page.close();}
  const pageReduce=await browser.newPage({viewport:{width:320,height:700},
    reducedMotion:'reduce'});
  try{
    await pageReduce.goto(url('?cc226=1&vis20Lab=turn90'),
      {waitUntil:'domcontentloaded'});
    await pageReduce.waitForFunction(()=>window.__CC2_26__?.report?.().ready&&
      window.__CC2_VIS20__?.summary?.().lab?.scenario==='turn90',
      null,{timeout:20000});
    const lab=await pageReduce.evaluate(()=>{
      window.__CC2_VIS20__.labSetTime(1150);
      return{r:window.__CC2_26__.report(),
        g:window.__CC2_02A__.snapshot()};
    });
    check(lab.r.reducedMotion&&lab.r.attached?.tethered===true,
      'reduced-motion deterministic attached laboratory');
    check(lab.g.tick===0,'lab cannot step authoritative game');
  }finally{await pageReduce.close();}
  writeFileSync(folder+'/CC2-26-QUALIFICATION.json',
    JSON.stringify({schema:'cc2-26-qa/v1',checks},null,2));
  console.log('CC2-26 BROWSER PASS '+checks.length+'/'+checks.length);
}finally{await browser.close();await server.stop();}
