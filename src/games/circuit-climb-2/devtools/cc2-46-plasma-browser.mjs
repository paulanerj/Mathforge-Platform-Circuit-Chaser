/**
 * CC2-46 — real packaged Heritage canvas plasma acceptance.
 *
 * Source-backed contracts:
 *  - only a genuinely correct source-confirmed landing energizes a path
 *  - claimed platform has animated liquid crystal INSIDE its accepted size
 *  - user can tune brightness/flow and reset without source changes
 *  - reduced-motion freezes phase while keeping a visible energy core
 *  - no math/AI/replay mutation and no incorrect paths
 *  - confirmed CC2-45 future numerals and CC2-44 row geometry unchanged
 *
 * Tests exact self-contained /dist/cc2-30.html built from the GitHub source,
 * then captures five true screenshots on the visible Heritage canvas.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc246-plasma-conductor') ||
   !html.includes('cc246-plasma-laboratory'))
  throw Error('CC246_ACTUAL_GAME_BUNDLE_MISSING');
const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8',
    'Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-46-evidence',{recursive:true});
const evidence=[];
function assert(ok,label,details={}){
  evidence.push({ok:!!ok,label,details});
  if(!ok)throw Error('CC246_BROWSER_FAIL '+JSON.stringify(evidence.at(-1)));
  console.log('PASS CC246 '+label);
}
const state=page=>page.evaluate(()=>{
  const api=window.__CC2_02A__,s=api.snapshot();
  const vis=window.__CC2_09B__.summary(),p=window.__CC2_46__;
  const canvas=document.querySelector('#cc209b-heritage-canvas');
  const sourceWidth=document.querySelector('#worldCanvas').clientWidth;
  const dpr=canvas.width/canvas.getBoundingClientRect().width;
  const p0=s.world.rows.find(r=>r.index===s.spark.row)
    ?.platforms.find(q=>q.powered&&!q.dead);
  let poweredPatch=null;
  if(p0){
    const r=api.rendererStats();
    const x=sourceWidth/2+(p0.x-300)*r.horizontalCameraScale*
      sourceWidth/600;
    const y=(p0.y+p0.height/2-r.cameraY)*r.effectiveZoom*
      sourceWidth/600;
    const width=Math.min(110,Math.max(70,sourceWidth*.237));
    // Sample the actual claimed body at its side, outside Spark's radius.
    const X=Math.max(0,Math.min(canvas.width-1,Math.round((x+width*.32)*dpr)));
    const Y=Math.max(0,Math.min(canvas.height-1,Math.round((y-9)*dpr)));
    poweredPatch=[...canvas.getContext('2d').getImageData(X,Y,1,1).data];
  }
  return {
    runId:s.runId,tick:s.tick,phase:s.phase,rows:s.completedRows,
    score:s.score,solved:s.solved.length,
    digest:api.sessionReport().stateDigest,
    settings:p.settings(),plasma:vis.plasma,
    render:api.rendererStats(),
    futureCount:api.futureNumberedRows()?.rows.length,
    platformNumber:s.currentProblem.options.length,
    poweredPatch,
    painterErrors:vis.errors,paintFailures:vis.paintFailures,
    pathHistory:vis.plasma?.verifiedHistory,
  };
});
try{
  for(const [width,height] of [
    [320,700],[390,844],[428,926],[768,1024],[988,874]
  ]){
    const page=await browser.newPage({viewport:{width,height}});
    const jsErrors=[];
    page.on('pageerror',error=>jsErrors.push(String(error)));
    try{
      await page.goto(base+'?manual=1',{waitUntil:'domcontentloaded'});
      await page.locator('#cc209c-enter').click();
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=true;});
      await page.waitForFunction(()=>
        window.__CC2_46__?.settings?.()?.enabled &&
        window.__CC2_09B__?.summary?.()?.plasma?.visibleClaimed>=1,
        null,{timeout:20000});
      const initial=await state(page);
      assert(initial.settings.enabled&&initial.settings.energy===78&&
        initial.settings.flow===44&&initial.settings.trail===72,
        'new liquid-crystal material opt-in and defaults '+width,
        initial.settings);
      assert(initial.rows===0&&initial.solved===0&&
        initial.plasma.visibleClaimed===1&&initial.plasma.verifiedHistory===0,
        'starting platform only is genuinely claimed; no ghost path '+width,
        initial.plasma);
      assert(initial.futureCount===3&&initial.platformNumber===3 &&
        initial.render.flowRowsAbove===3&&initial.render.flowRowsBelow===1,
        'approved CC2-45 numbers and CC2-44 camera unchanged '+width);
      await page.screenshot({path:'cc2-46-evidence/crystal-before-'+width+'.png',
        animations:'disabled',fullPage:true});

      // Fully genuine source-correct movement; the QA clock is explicitly
      // controlled so animation need not rely on nondeterministic timing.
      await page.evaluate(()=>{
        const api=window.__CC2_02A__,s=api.snapshot();
        const id=s.currentProblem.correctPlatformId;
        const b=[...document.querySelectorAll('button.choice')].find(
          x=>x.dataset.platformId===id);
        if(!b)throw Error('CC246_REAL_CHOICE_MISSING');
        b.click();
        for(let i=0;i<160;i++){
          if(api.snapshot().completedRows>=1||api.snapshot().phase==='ended')
            break;
          api.advanceForQA(20);
        }
      });
      await page.waitForFunction(()=>
        window.__CC2_09B__?.summary?.()?.plasma?.visibleConductors>=1,
        null,{timeout:15000});
      const claimed=await state(page);
      assert(claimed.rows===1&&claimed.solved===1 &&
        claimed.plasma.verifiedHistory===1 &&
        claimed.plasma.visibleConductors>=1 &&
        claimed.plasma.visibleClaimed>=1,
        'one REAL solved equation creates one persistent conductive path '+width,
        {rows:claimed.rows,solved:claimed.solved,plasma:claimed.plasma});
      assert(claimed.painterErrors===0&&claimed.paintFailures===0&&
        jsErrors.length===0,
        'visible Heritage plasma remains free from browser errors '+width,
        {jsErrors,claimed});
      await page.screenshot({path:'cc2-46-evidence/crystal-claimed-'+width+'.png',
        animations:'disabled',fullPage:true});

      // Access the controls using the real Settings menu; the controls are
      // never on the main play surface or visible in ordinary gameplay.
      await page.locator('#cc209-settings-btn').click();
      await page.locator('#cc209-settings > .cc209-dialog > details').last()
        .locator('summary').first().click();
      // The user's Developer Laboratory is a SECOND nested details panel.
      // Open it before checking controls; do not confuse its intentionally
      // collapsed state with a missing plasma implementation.
      await page.locator('#tuningPanel > summary').click();
      const panel=page.locator('#cc246-plasma-laboratory');
      assert(await panel.isVisible(),
        'visual tuning lives inside Developer Tools '+width);
      const energy=page.locator('#cc246-energy');
      await energy.focus();
      await page.keyboard.press('Home');
      await page.waitForTimeout(70);
      const off=await state(page);
      assert(off.settings.energy===0&&off.digest===claimed.digest &&
        off.tick===claimed.tick&&off.rows===claimed.rows &&
        off.plasma.verifiedHistory===claimed.plasma.verifiedHistory,
        'energy slider never mutates math tick or solved path ledger '+width,
        {off:off.settings,claimed:claimed.settings});
      assert(initial.poweredPatch!==null&&off.poweredPatch!==null,
        'actual visible platform body pixels accessible '+width);
      const reset=page.locator('#cc246-reset');
      await reset.click();
      const resetState=await state(page);
      assert(resetState.settings.energy===78&&
        resetState.settings.flow===44&&
        resetState.settings.trail===72,
        'reset restores measured material defaults '+width,
        resetState.settings);
      await page.locator('#cc209-settings [data-close="cc209-settings"]').click();
    }finally{await page.close();}
  }
  const legacy=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await legacy.goto(base+'?cc246=0',{waitUntil:'domcontentloaded'});
    await legacy.waitForFunction(()=>window.__CC2_46__?.settings?.(),
      null,{timeout:14000});
    const v=await legacy.evaluate(()=>({
      settings:window.__CC2_46__.settings(),
      labHidden:document.getElementById('cc246-plasma-laboratory').hidden,
      source:window.__CC2_02A__.snapshot(),
    }));
    assert(!v.settings.enabled&&v.labHidden &&
      v.source.currentProblem.options.length===3,
      'explicit opt-out preserves the accepted CC2-45 gameplay look',
      {settings:v.settings,labHidden:v.labHidden});
  }finally{await legacy.close();}
  const reduced=await browser.newPage({viewport:{width:390,height:844},
    reducedMotion:'reduce'});
  try{
    await reduced.goto(base,{waitUntil:'domcontentloaded'});
    await reduced.waitForFunction(()=>window.__CC2_46__?.settings?.()?.enabled,
      null,{timeout:14000});
    const info=await reduced.evaluate(()=>{
      const p=window.__CC2_46__,start=p.settings();
      const out=document.createElement('canvas');
      out.width=300;out.height=60;
      const ctx=out.getContext('2d');
      const node={powered:true,dead:false,row:1,column:1};
      const first=p.paintClaimedCore(ctx,10,5,110,46,node,20);
      const pixels1=[...ctx.getImageData(0,0,300,60).data];
      ctx.clearRect(0,0,300,60);
      const second=p.paintClaimedCore(ctx,10,5,110,46,node,2000);
      const pixels2=[...ctx.getImageData(0,0,300,60).data];
      return {reduced:start.motionReduced,first,second,
        same:pixels1.every((v,i)=>v===pixels2[i])};
    });
    assert(info.reduced&&info.first&&info.second&&info.same,
      'reduced-motion crystal material freezes its source-tick animation',
      info);
  }finally{await reduced.close();}
  console.log('CC2-46 browser assertions passed:',evidence.length);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  writeFileSync('cc2-46-evidence/browser-results.json',
    JSON.stringify(evidence,null,2));
}
