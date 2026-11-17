/**
 * CC2-27 — genuine first-choice on-board encounter and 320–768px QA.
 * No synthetic scoring, duplicate terminal screens or canvas overlays.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3297});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const folder='cc2-27-evidence';
mkdirSync(folder,{recursive:true});
const checks=[];
const check=(ok,name,extra={})=>{
  checks.push({ok:!!ok,name,extra});
  if(!ok)throw Error('CC2_27_BROWSER_FAIL '+name+' '+JSON.stringify(extra));
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
      await page.goto(url('?cc2Ui=slate-focus&cc226=1&cc223=both'+
        '&cc223Demo=1&cc227=1'),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_26__?.report?.().ready&&
        window.__CC2_27__?.report?.().enabled,
        null,{timeout:20000});
      const before=await page.evaluate(()=>({
        source:window.__CC2_02A__.snapshot(),
        policy:window.__CC2_02A__.secondaryConfig()?.encounterPolicy
      }));
      check(before.source.tick===0&&
        before.policy==='cc2-27-distinct/v1',
        'role mode opt-in only, no simulation autoplay '+width);
      const enter=page.locator('#cc209c-enter');
      if(await enter.isVisible())await enter.click();
      const answer=await page.evaluate(()=>
        window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      await page.locator('button.choice[data-platform-id="'+answer+'"]').click();
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>15&&
        window.__CC2_27__.report().painted>0,null,{timeout:22000});
      const now=await page.evaluate(()=>{
        const g=window.__CC2_02A__;
        const s=g.secondary(),r=window.__CC2_27__.report();
        return{g:g.snapshot(),s,r,canvas:
          document.querySelectorAll('#cc223-secondary-canvas,#cc227-canvas').length,
          overflow:document.documentElement.scrollWidth-innerWidth,
          count:document.querySelectorAll(
            '#cc223-secondary-layer .cc223-actor').length,
          digest:g.sessionReport().stateDigest,
          vfx:window.__CC2_26__.report()
        };
      });
      check(now.g.currentProblem.options.length===3&&
        now.s.policy==='cc2-27-distinct/v1',
        'real math and role policy together '+width);
      check(now.s.actors.length===2&&now.count===2,
        'two physically positioned opt-in actors '+width,now.r);
      check(now.s.actors.some(a=>a.role==='MOBILE_RECON')&&
        now.s.actors.some(a=>a.role==='DIRECTIONAL_LOCK'),
        'distinct role projections, not decorative duplicates '+width);
      check(now.s.speedMultiplier<=1.1&&now.s.speedMultiplier>=1,
        'source pressure capped without stacking '+width);
      check(now.canvas===0&&now.r.blackOverlayCanvases===0&&
        now.overflow<=2,
        'no black compositor and no side-scroll '+width);
      check(now.vfx.attached===null||now.vfx.attached.tethered===true,
        'new roles preserve parent Pursuer material attachment '+width);
      check(errors.length===0,'no new runtime exceptions '+width,{errors});
      await page.screenshot({path:folder+'/CC2-27-'+width+'-roles.png'});
    }finally{await page.close();}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(url('?cc2Ui=slate-focus'),{
      waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_27__?.report?.(),
      null,{timeout:20000});
    const plain=await page.evaluate(()=>({
      secondary:window.__CC2_02A__.secondary(),
      mode:window.__CC2_27__.report(),
      extra:document.querySelectorAll('#cc227-canvas').length
    }));
    check(plain.secondary===null&&!plain.mode.enabled&&
      plain.extra===0,'no CC2-27 enemy by default');
  }finally{await page.close();}
  writeFileSync(folder+'/CC2-27-QUALIFICATION.json',
    JSON.stringify({schema:'cc2-27-qa/v1',checks},null,2));
  console.log('CC2-27 BROWSER PASS '+checks.length+'/'+checks.length);
}finally{await browser.close();await server.stop();}
