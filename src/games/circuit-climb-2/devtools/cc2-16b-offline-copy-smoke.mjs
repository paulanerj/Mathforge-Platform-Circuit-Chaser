/**
 * CC2-16B owner playtest copy verification.
 *
 * Exercises the complete self-contained HTML over file:// with all network
 * requests forbidden. Every check uses the actual game and a real pointer
 * click; no internal selection or fake movement is injected.
 */
import {chromium} from 'playwright-core';
import {resolve} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const path=resolve('cc2-standalone/Circuit-Climb-CC2-16B-Playable-Offline.html');
if(!existsSync(path))throw Error('CC2_16B_OFFLINE_COPY_MISSING');
const html=readFileSync(path,'utf8');
if(html.length<100000||/<script[^>]*src=/.test(html)||/<link[^>]+stylesheet[^>]+href=/.test(html)){
  throw Error('CC2_16B_OFFLINE_ASSEMBLY_NOT_SELF_CONTAINED');
}
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
let passes=0;
try{
  for(const manual of [false,true]){
    for(const [width,height] of [[390,844],[768,1024]]){
      const page=await browser.newPage({viewport:{width,height}});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.route('**/*',r=>{
        if(/^https?:/i.test(r.request().url())){
          throw Error('CC2_16B_OFFLINE_NETWORK_ACCESS_ATTEMPTED');
        }
        return r.continue();
      });
      try{
        await page.goto(pathToFileURL(path).href+(manual?'?manual=1':''),
          {waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.__CC2_02A__?.snapshot&&
          window.__CC2_16A__?.report,null,{timeout:20000});
        await page.locator('#cc209c-enter').click();
        const before=await page.evaluate(()=>{
          const s=window.__CC2_02A__.snapshot();
          return{tick:s.tick,phase:s.phase,spark:s.spark,
            platform:s.currentProblem.correctPlatformId};
        });
        if(before.tick!==0||before.phase!=='ready')throw Error('BAD_START');
        await page.locator('button.choice[data-platform-id="'+before.platform+'"]').click();
        await page.waitForFunction(start=>{
          const s=window.__CC2_02A__.snapshot();
          return s.tick>5 &&
            Math.hypot(s.spark.x-start.x,s.spark.y-start.y)>1;
        },{x:before.spark.x,y:before.spark.y},{timeout:12000});
        await page.waitForFunction(
          ()=>window.__CC2_02A__.snapshot().completedRows>=1,
          null,{timeout:25000});
        if(errors.length)throw Error('PAGE_ERRORS '+errors.join('; '));
        passes++;
        console.log('PASS standalone '+width+'x'+height+' '+
          (manual?'manual-clock-available':'normal')+' real landing');
      }finally{await page.close();}
    }
  }
}finally{await browser.close();}
if(passes!==4)throw Error('OFFLINE_COPY_COVERAGE_INCOMPLETE');
console.log('CC2-16B OFFLINE COPY PASS '+passes+'/4');
