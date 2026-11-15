/**
 * CC2-23 user-reported first-click dark-screen reproduction.
 * Pixel and DOM evidence, not gameplay result assertions alone.
 *
 * Two seeds, four modes, 390px and desktop, from first valid tap through
 * actual capture, recording composite screenshots at fixed wall-clock times.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3276});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
});
const folder='cc2-23-blackout-evidence';mkdirSync(folder,{recursive:true});
const observations=[];
const url=q=>new URL('src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();
try{
  for(const mode of ['both','off','scout','sentry']){
    for(const width of [390,768]){
      const page=await browser.newPage({viewport:{
        width,height:width===390?844:1024,
      }});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      try{
        await page.goto(url((mode==='off'?'':'?cc223='+mode+'&cc223Demo=1')),
          {waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
          window.__CC2_23__?.report?.(),null,{timeout:20000});
        const intro=page.locator('#cc209c-enter');
        if(await intro.isVisible())await intro.click();
        const choice=await page.evaluate(
          ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
        await page.locator('button.choice[data-platform-id="'+choice+'"]').click();
        let previous=0;
        for(const elapsed of [0,150,350,600,900,1300,1900,2500,3200,4500]){
          await page.waitForTimeout(Math.max(0,elapsed-previous));
          previous=elapsed;
          const record=await page.evaluate(()=>{
            const api=window.__CC2_02A__;
            const css=id=>{
              const e=document.querySelector(id);
              if(!e)return null;
              const s=getComputedStyle(e),r=e.getBoundingClientRect();
              return{display:s.display,hidden:e.hidden,visibility:s.visibility,
                opacity:s.opacity,background:s.backgroundColor,zIndex:s.zIndex,
                rect:[r.x,r.y,r.width,r.height]};
            };
            const pixel=id=>{
              const e=document.querySelector(id);
              if(!e)return null;
              try{
                const c=e.getContext('2d',{willReadFrequently:true});
                return Array.from(c.getImageData(
                  Math.min(e.width-1,Math.max(0,Math.round(e.width*.07))),
                  Math.min(e.height-1,Math.max(0,Math.round(e.height*.26))),
                  1,1).data);
              }catch(err){return String(err);}
            };
            return{tick:api.snapshot().tick,phase:api.snapshot().phase,
              endReason:api.snapshot().endReason,started:window.__cc2ChaseStarted,
              runId:api.snapshot().runId,
              sourceDigest:api.sessionReport()?.stateDigest,
              bodyClass:document.body.className,
              heritage:css('#cc209b-heritage-canvas'),
              heritagePixel:pixel('#cc209b-heritage-canvas'),
              secondary:css('#cc223-secondary-canvas'),
              secondaryPixel:pixel('#cc223-secondary-canvas'),
              board:css('#board'),captureStage:css('#cc219-stage'),
              captureShield:css('#cc219-shield'),
              preend:css('#cc209-preend'),intro:css('#cc209c-intro'),
              pause:css('#cc209c-pause'),summary:css('#summaryPanel'),
              end:css('#cc209c-end'),overlay:css('#cc218-eclipse'),
              secondarySource:api.secondary?.()?.summary||null};
          });
          record.mode=mode;record.width=width;record.elapsed=elapsed;
          record.errors=errors.slice();
          observations.push(record);
          const name='CC2-23-'+width+'-'+mode+'-'+elapsed+'ms';
          await page.screenshot({path:folder+'/'+name+'.png',
            animations:'disabled'});
          console.log(JSON.stringify({name,tick:record.tick,
            phase:record.phase,reason:record.endReason,
            heritagePixel:record.heritagePixel,
            secondaryPixel:record.secondaryPixel,
            errors:record.errors.length,
            visibleOverlays:Object.fromEntries(
              ['captureStage','captureShield','preend','intro','pause','summary','overlay']
                .filter(k=>record[k]&&record[k].display!=='none'&&
                  record[k].visibility!=='hidden'&&
                  Number(record[k].opacity)>0)
                .map(k=>[k,record[k].zIndex]))}));
        }
      }finally{await page.close();}
    }
  }
  writeFileSync(folder+'/CC2-23-FIRST-CLICK-OBSERVATIONS.json',
    JSON.stringify(observations,null,2));
}finally{await browser.close();await server.stop();}
