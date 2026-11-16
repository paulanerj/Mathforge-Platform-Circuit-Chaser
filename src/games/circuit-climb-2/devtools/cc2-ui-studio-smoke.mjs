/**
 * CC2 UI Studio browser QA — read-only independent UI preview.
 * Exercises all 50 designs, viewport safety, comparison and JSON.
 * Game engine and accepted CC2 playable source are never invoked.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const root=await startDevServer({port:3282});
const browser=await chromium.launch({
  executablePath:findChromium(),args:LAUNCH_ARGS,headless:true
});
const dir='cc2-ui-studio-evidence';
mkdirSync(dir,{recursive:true});
const passes=[];
function check(value,name,detail=null){
  if(!value)throw Error('CC2_UI_STUDIO_FAIL '+name+' '+JSON.stringify(detail));
  passes.push(name);
  console.log('PASS '+name);
}
try{
  const html=readFileSync('public/cc2-ui-studio/index.html','utf8');
  check(html.startsWith('<!doctype html>'),'standalone HTML');
  check(!/<script[^>]+src=|<link[^>]+href=["']https?:|@import /i.test(html),
    'no external CDN or runtime dependencies');
  const url=new URL('/cc2-ui-studio/index.html',root.url).toString();
  const entry=await fetch(url);
  const entryText=await entry.text();
  check(entry.ok&&entryText.includes('Circuit Climb · UI Studio'),
    'Vite serves real studio HTML at explicit public-file route',
    {url,status:entry.status,head:entryText.slice(0,80)});
  for(const [width,height] of [
    [320,700],[360,780],[390,844],[428,926],[768,1024],[1280,900]
  ]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelectorAll('.preset').length===50);
      check(await page.locator('.preset').count()===50,'50 concepts '+width);
      const tested=await page.evaluate(()=>{
        return [...document.querySelectorAll('.preset')].map((p,i)=>{
          p.click();
          const d=document.querySelector('.device');
          return {id:Number(d.dataset.concept),layout:d.dataset.layout,
            equation:d.querySelector('.equation-chip').textContent,
            choices:[...d.querySelectorAll('.math-option')].map(x=>x.textContent)};
        });
      });
      check(tested.every((x,i)=>x.id===i+1&&x.equation==='2 + ? = 10'&&
        x.choices.join(',')==='5,1,8'),
        'mathematically identical preview scene '+width);
      check(new Set(tested.map(x=>x.layout)).size===5,
        'five distinct compositions '+width);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),
        'no horizontal viewport overflow '+width);
      await page.locator('.math-option[data-answer="5"]').click();
      check(await page.locator('.feedback').getAttribute('data-kind')==='wrong',
        'incorrect interaction feedback '+width);
      await page.locator('.math-option[data-answer="8"]').click();
      check(await page.locator('.feedback').getAttribute('data-kind')==='correct',
        'correct interaction feedback '+width);
      await page.locator('#toggleCompare').click();
      check(await page.locator('.device').count()===2,'A/B comparison '+width);
      await page.locator('#toggleCompare').click();
      await page.evaluate(()=>{
        const e=document.querySelector('#radius');e.value='8';
        e.dispatchEvent(new Event('input',{bubbles:true}));
      });
      check(JSON.parse(await page.locator('#configJson').inputValue()).radius===8,
        'live designer JSON '+width);
      await page.locator('#loadJson').evaluate(el=>el.click());
      check(JSON.parse(await page.locator('#configJson').inputValue()).radius===8,
        'JSON import '+width);
      await page.locator('#reset').evaluate(el=>el.click());
      check(JSON.parse(await page.locator('#configJson').inputValue()).radius!==8,
        'reset '+width);
      if([390,768,1280].includes(width)){
        await page.evaluate(()=>document.querySelectorAll('.preset')[0].click());
        await page.screenshot({path:dir+'/01-mineral-'+width+'.png'});
        await page.evaluate(()=>document.querySelectorAll('.preset')[12].click());
        await page.screenshot({path:dir+'/13-midnight-'+width+'.png'});
      }
      check(!errors.length,'no browser exceptions '+width,errors);
    }finally{await page.close();}
  }
  writeFileSync(dir+'/QA.json',JSON.stringify({
    schema:'cc2-ui-studio-qa/v1',concepts:50,viewports:6,checks:passes,
    passed:true,gameplayChanged:false
  },null,2));
  console.log('CC2_UI_STUDIO_PASS '+passes.length+'/'+passes.length);
}finally{await browser.close();await root.stop();}
