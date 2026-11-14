/**
 * Circuit Climb CC2-16B -- real player input qualification.
 *
 * This test uses genuine Playwright pointer clicks (not HTMLElement.click),
 * the real source-owned core, the real timer and real platform geometry.
 * The critical acceptance condition is visible Spark motion after clicking
 * a platform on BOTH the ordinary preview and the scenario-lab URL.
 *
 * This file is isolated qualification; it does not modify the game.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-16b-evidence';
mkdirSync(dir,{recursive:true});
const results=[];
const assert=(value,label,details={})=>{
  results.push({ok:Boolean(value),label,details});
  if(!value)throw Error('CC2_16B_INPUT_REGRESSION: '+label+' '+JSON.stringify(details));
  console.log('PASS '+label);
};
const server=await startDevServer({port:3248});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
});
try{
  for(const [width,height] of [[320,568],[390,844],[768,1024]]){
    for(const manual of [false,true]){
      const page=await browser.newPage({
        viewport:{width,height},acceptDownloads:true,
        reducedMotion:width===320?'reduce':'no-preference',
      });
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      const suffix=manual?'?manual=1':'';
      try{
        const url=new URL('src/games/circuit-climb-2/devtools/cc2-16a.html'+suffix,server.url);
        await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
        await page.waitForFunction(
          ()=>window.__CC2_02A__?.snapshot&&window.__CC2_16A__?.summary,
          null,{timeout:20000},
        );
        await page.locator('#cc209c-enter').click();
        const initial=await page.evaluate(()=>{
          const s=window.__CC2_02A__.snapshot();
          return{
            phase:s.phase,tick:s.tick,row:s.completedRows,
            spark:{x:s.spark.x,y:s.spark.y},
            platform:s.currentProblem.correctPlatformId,
            labClock:Boolean(window.__cc2ManualScenarioActive),
          };
        });
        assert(initial.phase==='ready'&&initial.tick===0,
          'initially ready and static '+width+' '+suffix,initial);
        assert(!initial.labClock,
          'manual clock not active outside scripted scenario '+width+' '+suffix,initial);
        const choice=page.locator('button.choice[data-platform-id="'+initial.platform+'"]');
        await choice.waitFor({state:'visible',timeout:7000});
        assert(await choice.isEnabled(),
          'correct platform pointer-enabled '+width+' '+suffix);
        const hit=await choice.evaluate(element=>{
          const r=element.getBoundingClientRect();
          const middle=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
          return{
            targetTag:middle?.tagName,
            targetId:middle?.id,
            targetClass:middle?.className,
            targetIsChoice:middle===element||Boolean(element.contains(middle)),
          };
        });
        assert(hit.targetIsChoice,
          'real pointer can reach platform center '+width+' '+suffix,hit);
        await choice.click();
        const afterClick=await page.evaluate(()=>{
          const a=window.__CC2_02A__,s=a.snapshot();
          return{
            phase:s.phase,tick:s.tick,row:s.completedRows,
            attempts:s.attempts,
            evaluated:a.events().filter(e=>e.type==='ATTEMPT_EVALUATED').length,
          };
        });
        assert(afterClick.evaluated>=1&&afterClick.attempts>=1,
          'real click evaluates mathematical answer '+width+' '+suffix,afterClick);
        await page.waitForFunction(before=>{
          const s=window.__CC2_02A__?.snapshot?.();
          return Boolean(s&&s.tick>3&&
            Math.hypot(s.spark.x-before.x,s.spark.y-before.y)>1);
        },initial.spark,{timeout:12000});
        const advanced=await page.evaluate(()=>{
          const s=window.__CC2_02A__.snapshot();
          return{tick:s.tick,row:s.completedRows,
            spark:{x:s.spark.x,y:s.spark.y},phase:s.phase};
        });
        assert(advanced.tick>3 &&
          Math.hypot(advanced.spark.x-initial.spark.x,
            advanced.spark.y-initial.spark.y)>1,
          'Spark visibly moves in real simulation '+width+' '+suffix,advanced);
        await page.waitForFunction(
          ()=>window.__CC2_02A__?.snapshot?.()?.completedRows>=1,
          null,{timeout:30000},
        );
        assert(await page.evaluate(
          ()=>window.__CC2_02A__.snapshot().completedRows>=1),
          'correct first landing completes '+width+' '+suffix);
        if(width===390){
          await page.screenshot({
            path:dir+'/cc2-16b-real-click-'+width+(manual?'-manual':'-normal')+'.png',
            fullPage:true,
          });
        }
        if(manual&&width===390){
          // The formerly unplayable QA URL must also retain reproducible scenarios.
          await page.evaluate(()=>window.__CC2_16A__.runScenario('idle'));
          await page.waitForFunction(
            ()=>window.__CC2_16A__.summary().runCount>=1,
            null,{timeout:120000},
          );
          const lab=await page.evaluate(()=>({
            summary:window.__CC2_16A__.summary(),
            exclusive:window.__cc2ManualScenarioActive,
          }));
          assert(!lab.summary.latest.failed&&!lab.exclusive,
            'manual-clock ownership returns after scripted scenario',lab);
        }
        assert(errors.length===0,'no browser errors '+width+' '+suffix,{errors});
        console.log('CC2-16B player input PASS: '+width+'x'+height+' '+(manual?'manual':'normal'));
      }catch(error){
        await page.screenshot({
          path:dir+'/FAIL-'+width+(manual?'-manual':'-normal')+'.png',
          fullPage:true,
        }).catch(()=>{});
        throw error;
      }finally{
        await page.close();
      }
    }
  }
  const pass=results.filter(r=>r.ok).length;
  console.log('CC2-16B INPUT QUALIFICATION PASS '+pass+'/'+results.length);
}finally{
  writeFileSync(dir+'/cc2-16b-input-results.json',
    JSON.stringify({schema:'cc2-16b-real-pointer/v1',results},null,2));
  await browser.close();
  await server.stop();
}
