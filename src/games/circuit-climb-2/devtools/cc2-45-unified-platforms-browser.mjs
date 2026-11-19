/**
 * CC2-45B: test ACTUAL self-contained game rendered on the visible Heritage
 * painter, not the hidden source canvas or a detached DOM mockup.
 * All three mathematical answer buttons must have exactly the same physical
 * projection/footprint as pre-numbered future platforms.
 *
 * Output screenshots: cc2-45-evidence/platform-unity-*.png
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc245-unified-platforms-style'))
  throw Error('CC245_VISIBLE_MATERIAL_NOT_PACKAGED');
const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-45-evidence',{recursive:true});
const checks=[];
function assert(ok,label,details={}){
  checks.push({ok:!!ok,label,details});
  if(!ok)throw Error('CC245_BROWSER_FAIL '+JSON.stringify(checks.at(-1)));
  console.log('PASS CC245 '+label);
}
async function inspect(page){
  return page.evaluate(()=>{
    const api=window.__CC2_02A__,state=api.snapshot();
    const forecast=api.futureNumberedRows?.();
    const visible=window.__CC2_09B__.summary().futureTiers;
    const buttons=[...document.querySelectorAll('button.choice')];
    const css=buttons.map(button=>{
      const box=button.getBoundingClientRect(),style=getComputedStyle(button);
      return {id:button.dataset.platformId,label:button.textContent,
        width:box.width,height:box.height,opacity:style.opacity,
        background:style.backgroundColor,color:style.color,
        hit:document.elementFromPoint(box.x+box.width/2,
          box.y+box.height/2)===button};
    });
    return {
      runId:state.runId,problemId:state.currentProblem.problemId,
      problem:state.currentProblem,spark:state.spark,score:state.score,
      solved:state.solved.length,sourceTick:state.tick,
      digest:api.sessionReport().stateDigest,
      projected:forecast,visible,buttons:css,
      render:api.rendererStats(),
      errors:window.__CC2_09B__.summary().errors,
      paints:window.__CC2_09B__.summary().paintFailures,
      active:document.body.classList.contains('cc245-unified-platforms'),
    };
  });
}
try{
  for(const [width,height] of [[320,700],[390,844],[428,926],[768,1024],[988,874]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(base+'?manual=1',{waitUntil:'domcontentloaded'});
      await page.locator('#cc209c-enter').click();
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=true;});
      await page.waitForFunction(()=>{
        const a=window.__CC2_02A__,s=window.__CC2_09B__?.summary?.();
        return a?.futureNumberedRows?.()?.rows?.length===3 &&
          s?.futureTiers?.centers?.some(x=>x.row===3&&x.sourceBacked);
      },null,{timeout:20000});
      const before=await inspect(page);
      assert(before.active&&before.render.unifiedPlatforms,
        'CC2-45 unified preview gated on actual game '+width);
      assert(before.projected.rows.length===3 &&
        before.projected.rows.map(x=>x.row).join(',')==='1,2,3',
        'three genuine pre-generated source mathematical rows '+width,
        {rows:before.projected.rows.map(x=>({row:x.row,options:x.platforms.map(y=>y.value)}))});
      assert(before.visible.centers.filter(x=>x.sourceBacked).length===6 &&
        before.visible.centers.filter(x=>x.sourceBacked)
          .every(x=>Number.isFinite(x.value)&&x.value>=0),
        'six future numbered platforms painted before choice '+width,
        {values:before.visible.centers.filter(x=>x.sourceBacked).map(x=>x.value)});
      assert(before.buttons.length===3 &&
        before.buttons.every(x=>x.hit && x.width>=68&&
          Math.abs(x.height-46)<.7),
        'three real visible tap target footprints remain valid '+width,
        {buttons:before.buttons});
      const future=before.visible.centers.filter(x=>x.sourceBacked);
      assert(future.every(x=>
        Math.abs(x.width-before.buttons[0].width)<.7&&
        Math.abs(x.height-before.buttons[0].height)<.7),
        'current and future same height/width without 70% shrink '+width);
      assert(before.buttons.every(x=>
        x.color==='rgba(0, 0, 0, 0)'||x.color==='transparent') &&
        before.errors===0&&before.paints===0&&errors.length===0,
        'only visible Heritage painter draws platform numerals '+width,{
          buttons:before.buttons,errors});
      // A REAL correct math selection: source must generate the next row
      // identically to the existing forecast, without any fabricated receipt.
      const preRow2=before.projected.rows[1];
      await page.evaluate(correctId=>{
        const api=window.__CC2_02A__;
        const result=api.selectPlatformForQA?.(correctId)??null;
        if(result===null)
          document.querySelector('button.choice[data-platform-id="'+correctId+'"]').click();
        for(let i=0;i<150;i++){
          if(api.snapshot().completedRows>=1||api.snapshot().phase==='ended')break;
          api.advanceForQA(20);
        }
      },before.problem.correctPlatformId);
      await page.waitForFunction(()=>
        window.__CC2_02A__?.snapshot?.()?.completedRows>=1,
        null,{timeout:12000});
      const landed=await inspect(page);
      assert(landed.solved===1&&landed.spark.row===1 &&
        landed.projected.rows[0].problemId===preRow2.problemId &&
        JSON.stringify(landed.projected.rows[0].platforms.map(p=>p.value))===
          JSON.stringify(preRow2.platforms.map(p=>p.value)),
        'real landing reveals exact previously predicted next math '+width,{
          row:landed.spark.row,solved:landed.solved,
          preNext:preRow2.platforms.map(x=>x.value),
          nowNext:landed.projected.rows[0].platforms.map(x=>x.value)});
      assert(errors.length===0&&landed.paints===0,
        'real landing and future refresh produce no painter error '+width,{errors});
      // Explicit device canvas-loss simulation: user must still be able to
      // read and click all source-owned current answers if 2D backing dies.
      const fallback=await page.evaluate(()=>{
        const board=document.getElementById('board');
        board.setAttribute('data-cc223-renderer-fallback','context-lost');
        const button=document.querySelector('button.choice');
        const st=getComputedStyle(button);
        const color=st.color,bg=st.backgroundColor;
        const image=st.backgroundImage,border=st.borderColor;
        board.removeAttribute('data-cc223-renderer-fallback');
        return {color,bg,image,border};
      });
      assert(fallback.color!=='rgba(0, 0, 0, 0)'&&
        fallback.color!=='transparent' &&
        (fallback.bg!=='rgba(0, 0, 0, 0)'||
         fallback.image.startsWith('linear-gradient(')) &&
        fallback.border!=='rgba(0, 0, 0, 0)',
        'canvas-loss fallback restores visible mathematical button '+width,
        fallback);
      await page.screenshot({path:'cc2-45-evidence/platform-unity-'+width+'.png',
        animations:'disabled',fullPage:true});
    }finally{await page.close();}
  }
  const historical=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await historical.goto(base+'?cc245=0&cc230=0',{waitUntil:'domcontentloaded'});
    await historical.waitForFunction(()=>window.__CC2_02A__?.snapshot?.());
    const v=await historical.evaluate(()=>({
      active:document.body.classList.contains('cc245-unified-platforms'),
      projection:window.__CC2_02A__.futureNumberedRows(),
    }));
    assert(!v.active&&v.projection===null,
      'explicit opt-out preserves CC2-44 visual baseline',v);
  }finally{await historical.close();}
  console.log('CC245 browser assertions:',checks.length);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  writeFileSync('cc2-45-evidence/browser-results.json',
    JSON.stringify(checks,null,2));
}
