/**
 * CC2 UI Studio 100 — Browser qualification, zero-gameplay mutation.
 *
 * This runs the real independent design-page HTML in Chromium.
 * It verifies each of 100 design IDs across six responsive viewport sizes,
 * nonoverlap of major UI geometry, deterministic simulation states, material
 * sliders, feature proposal contracts and JSON round trips. These checks do
 * NOT replace human image review or tests of authoritative game mechanics.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3285});
const browser=await chromium.launch({
  executablePath:findChromium(),args:LAUNCH_ARGS,headless:true,
});
const dir='cc2-ui-studio-100-evidence';
mkdirSync(dir,{recursive:true});
const checks=[];
function assert(condition,label,context={}){
  checks.push({label,passed:Boolean(condition),context});
  if(!condition)throw Error('CC2_UI_100_FAIL '+label+' '+
    JSON.stringify(context));
  console.log('PASS '+label);
}

const file='public/cc2-ui-studio/index.html';
const html=readFileSync(file,'utf8');
const url=new URL('/cc2-ui-studio/index.html',server.url).toString();
try{
  assert(html.startsWith('<!doctype html>'),'one-file HTML artifact');
  assert(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import /i.test(html),
    'no third-party scripts or fonts required');

  for(const [width,height] of [
    [320,700],[360,780],[390,844],[428,926],[768,1024],[1280,900]
  ]){
    const page=await browser.newPage({viewport:{width,height},
      reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.CC2Studio?.conceptCount?.()===100);
      assert(await page.locator('.preset').count()===100,
        '100 concept selectors at '+width);
      const review=await page.evaluate(()=>{
        let errors=[],themes=new Set(),layouts=new Set();
        for(let i=0;i<100;i++){
          window.CC2Studio.selectConcept(i);
          const d=document.querySelector('.device');
          const rect=e=>e.getBoundingClientRect();
          const s=rect(d.querySelector('.spark'));
          const platforms=d.querySelectorAll('.platform');
          const upper=rect(platforms[0]),current=rect(platforms[3]);
          const option=rect(d.querySelector('.math-option'));
          if(s.top-upper.bottom<22)errors.push([i+1,'Spark-upper contact']);
          if(current.top-s.bottom<-5||current.top-s.bottom>18)
            errors.push([i+1,'Spark not on current platform']);
          if(upper.top-option.bottom<12)
            errors.push([i+1,'Choices overlap ledges']);
          const b=d.querySelector('.board');
          if(rect(b).width<268)errors.push([i+1,'Board width below 268']);
          if(d.querySelectorAll('.math-option').length!==3)
            errors.push([i+1,'Missing math choice']);
          if(d.querySelector('.math-option.correct'))
            errors.push([i+1,'Answer leaked through styling']);
          if(document.documentElement.scrollWidth>innerWidth+2)
            errors.push([i+1,'Horizontal page overflow']);
          layouts.add(d.dataset.layout);
          themes.add(document.querySelector('#conceptName').textContent
            .replace(/^\d+\s*·\s*/,'').split(' / ')[0]);
        }
        return {errors,layouts:[...layouts],themeCount:themes.size,
          count:window.CC2Studio.conceptCount()};
      });
      assert(review.count===100&&review.layouts.length===5&&
        review.themeCount===20&&review.errors.length===0,
        'all 100 genuine layout geometry at '+width,
        {themeCount:review.themeCount,errors:review.errors.slice(0,10)});
      await page.locator('#toggleCompare').click();
      assert(await page.locator('.device').count()===2,
        'A/B contains two real preview canvases '+width);
      await page.locator('#toggleCompare').click();
      await page.evaluate(()=>window.CC2Studio.selectConcept(99));
      const selected=JSON.parse(await page.locator('#configJson').inputValue());
      assert(selected.conceptId===100&&
        selected.schema==='mathforge-cc2-ui-studio/v2'&&
        selected.special.kind==='scout'&&selected.character.sparkSize===40,
        'versioned v2 export for concept 100 '+width);
      await page.locator('#specialKind').selectOption('sentry');
      assert((await page.locator('#specialMachine').innerText()).includes(
        'SWEEP'),'feature state-machine visible '+width);
      await page.locator('#sparkSize').fill('48');
      assert((await page.locator('#sparkSizeValue').innerText()).includes(
        '48'),'live Spark material geometry control '+width);
      await page.locator('#timeline').fill('100');
      assert(await page.evaluate(()=>window.CC2Studio.report().stage)==='SETTLED',
        'deterministic final eye-in-shell phase '+width);
      await page.locator('#timeline').fill('0');
      assert(await page.evaluate(()=>window.CC2Studio.report().stage)==='READY',
        'deterministic reversible scene '+width);
      if(width===390||width===768){
        await page.evaluate(()=>window.CC2Studio.selectConcept(0));
        await page.screenshot({path:dir+'/concept-001-'+width+'.png'});
        await page.evaluate(()=>window.CC2Studio.selectConcept(99));
        await page.screenshot({path:dir+'/concept-100-'+width+'.png'});
      }
      assert(errors.length===0,'no browser script exceptions '+width,errors);
    }finally{await page.close();}
  }

  writeFileSync(dir+'/QA.json',JSON.stringify({
    schema:'cc2-ui-studio-100-browser-qa/v1',
    concepts:100,viewports:[320,360,390,428,768,1280],
    checks,passed:checks.every(x=>x.passed),
    gameplayAffected:false,
  },null,2));
  console.log('CC2_UI_STUDIO_100_PASS '+checks.length+'/'+checks.length);
}finally{
  await browser.close();await server.stop();
}
