/**
 * CC2-30B browser qualification: designer source settings truly roundtrip
 * and cannot mutate existing game/score without an explicit full restart.
 */
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3301});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
function check(condition,label){if(!condition)throw Error('CC230B_FAIL '+label);
  console.log('PASS '+label);}
try{
  for(const [width,height] of [[390,844],[768,1024]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      const url=new URL('src/games/circuit-climb-2/devtools/cc2-16a.html',
        server.url);
      url.searchParams.set('cc2Ui','slate-focus');
      url.searchParams.set('cc230','1');
      await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_30__?.sourcePreset&&
        window.__CC2_02A__?.creature?.(),null,{timeout:25000});
      const before=await page.evaluate(()=>{
        const a=window.__CC2_02A__,studio=window.__CC2_30__;
        const digest=a.sessionReport().stateDigest;
        const next={...studio.sourcePreset,fieldTicks:210,
          slowMultiplier:.63,offerTicks:82,gateStep:4};
        studio.loadSourcePreset(next);
        return {digestStable:digest===a.sessionReport().stateDigest,
          loaded:studio.sourcePreset,source:a.creature().config};
      });
      check(before.digestStable,'live game digest unaffected by editor '+width);
      check(before.loaded.fieldTicks===210&&before.source.fieldTicks===150,
        'settings draft distinct from live authoritative config '+width);

      // The source sliders live in two user-controlled <details> panels.
      // Open the real studio before asking Playwright to tap a hidden button.
      await page.evaluate(()=>{
        document.querySelector('.cc230-studio').open=true;
        document.querySelector('.cc230-authority').open=true;
      });
      await page.locator('.cc230-apply-gameplay').click();
      await page.waitForFunction(()=>
        window.__CC2_02A__?.creature?.()?.config?.fieldTicks===210,
        null,{timeout:25000});
      const changed=await page.evaluate(()=>{
        const a=window.__CC2_02A__,v=window.__CC2_30__;
        const c=a.creature().config;
        const params=new URLSearchParams(location.search);
        const parsed=JSON.parse(params.get('cc230Cfg'));
        const replay=a.replay();
        return {c,parsed,replay};
      });
      check(changed.c.slowMultiplier===.63&&changed.c.gateStep===4&&
        changed.parsed.fieldTicks===210&&
        changed.replay.creatureConfig.fieldTicks===210,
        'source settings apply only on restart and persist in replay '+width);
      const rejecting=await page.evaluate(()=>{
        const a=window.__CC2_02A__,v=window.__CC2_30__;
        const digest=a.sessionReport().stateDigest;
        let rejected=false;
        try{v.loadSourcePreset({...v.sourcePreset,slowMultiplier:.1});}
        catch{rejected=true;}
        return {rejected,stable:digest===a.sessionReport().stateDigest};
      });
      check(rejecting.rejected&&rejecting.stable,
        'invalid speed setting rejected, no hidden game mutation '+width);
      check(errors.length===0,'no browser runtime exception '+width);
      console.log('CC2-30B DEVICE '+width+' PASS');
    }finally{await page.close();}
  }
}finally{await browser.close();await server.stop();}
