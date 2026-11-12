/**
 * CC2-05B real Chromium: seven-row visibility at three device sizes,
 * entirely source-backed math, authored personality and visual/audio controls.
 */
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
const captures='cc2-05b-screenshots';mkdirSync(captures,{recursive:true});
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3196});
const browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
const url=new URL('src/games/circuit-climb-2/devtools/cc2-04.html?manual=1',server.url).toString();
let n=0;
const check=(ok,label)=>{if(!ok)throw Error('CC2_05B_BROWSER_FAIL: '+label);n++;console.log('PASS '+label)};
try{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.snapshot),null,{timeout:10000});
    let data=await page.evaluate(()=>({
      state:window.__CC2_02A__.snapshot(),
      view:window.__CC2_02A__.rendererStats(),
      replay:window.__CC2_02A__.replay(),
      settings:window.__CC2_02A__.feedbackSettings(),
    }));
    check(data.state.world.rows.length===2,viewport.width+'px: no prematurely generated future math');
    check(data.view.viewportCoverage.above>=3.0 && data.view.viewportCoverage.below>=3.0,
      viewport.width+'px: three real row heights above AND below Spark');
    check(data.view.previewRowsRendered>=5,
      viewport.width+'px: source-neutral future and previous scaffolding exists');
    check(data.view.effectiveZoom<=data.view.zoom,
      viewport.width+'px: responsive fit never exceeds user maximum zoom');
    check(data.replay.pursuerPreset.speedPursuit===2.28 &&
      data.replay.pursuerPreset.speedSearch===1.44,
      viewport.width+'px: owner intermediate bot 20% faster baseline');
    check(data.replay.learnerMotion.circuitSpeedPerTick===26,
      viewport.width+'px: Spark stays at previously approved 26');
    check(data.replay.personality.style==='curious',
      viewport.width+'px: curious personality active in real Pursuer');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px: no horizontal overflow');
    check(errors.length===0,viewport.width+'px: no browser script errors');
    const boxes=await page.locator('.choice').evaluateAll(nodes=>
      nodes.filter(node=>!node.hidden).map(node=>{
        const r=node.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width};
      }).sort((a,b)=>a.left-b.left));
    check(boxes.length===3 &&
      boxes.every((box,i)=>box.width>=51 &&
        (i===0||box.left>=boxes[i-1].right+2)),
      viewport.width+'px: all three accessible options remain non-overlapping');
    if(viewport.width===320)
      check(await page.locator('.choice[data-magnified="true"]').count()===3,
        '320px: all three hit zones spread when physical lanes compress');

    await page.screenshot({path:join(captures,'seven-row-start-'+viewport.width+'.png'),fullPage:true});
    if(viewport.width===390){
      const before=JSON.stringify(data.state);
      await page.locator('#tuningPanel summary').click();
      await page.locator('#cameraZoom').evaluate(el=>{
        el.value='0.25';
        el.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const after=await page.evaluate(()=>({
        state:window.__CC2_02A__.snapshot(),
        view:window.__CC2_02A__.rendererStats(),
      }));
      check(JSON.stringify(after.state)===before,'camera zoom leaves authoritative game state unchanged');
      check(after.view.viewportCoverage.above>=3.0 && after.view.viewportCoverage.below>=3.0,
        'extreme zoom retains six surrounding row bands');
      await page.locator('#testSound').click();
      check((await page.evaluate(()=>window.__CC2_02A__.feedbackHistory())).includes('achievement'),
        'sample sound/electric cue gets dispatched by a real gesture');
      await page.locator('#soundToggle').click();
      check((await page.evaluate(()=>window.__CC2_02A__.feedbackSettings())).enabled===false,
        'Sound toggle mutes presentation engine');
      await page.locator('#soundToggle').click();
      await page.locator('#speedPursuit').fill('2.28');
      await page.locator('#hesitationChance').fill('0.50');
      await page.locator('#applyTuning').click();
      const replay=await page.evaluate(()=>window.__CC2_02A__.replay());
      check(replay.personality.hesitationChance===0.5,
        'developer personality tuning persists in deterministic replay');
      await page.locator('.dev-controls summary').click();
      await page.locator('#mode').selectOption('practice');
      const first=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem);
      await page.evaluate((id)=>{
        document.querySelector('button[data-platform-id="'+id+'"]').click();
        const api=window.__CC2_02A__;
        for(let i=0;i<400;i++){
          const state=api.snapshot();
          if(state.phase==='ready'||state.phase==='ended')break;
          api.advanceForQA(1);
        }
      },first.correctPlatformId);
      const report=await page.evaluate(()=>({
        state:window.__CC2_02A__.snapshot(),feedback:window.__CC2_02A__.feedbackHistory(),
      }));
      check(report.state.completedRows===1,'real correct Spark landing works after tuning');
      check(report.feedback.includes('solve'),'source-landed equation emits success cue');
      check(report.state.solved[0].result===first.targetValue,'math correctness unaffected');
      const text=await page.locator('#viewReadout').innerText();
      check(text.includes('3 rows ABOVE + 3 BELOW'),'visible viewport coverage label');
    }
    await page.close();
  }
  console.log('CC2-05B BROWSER PASS — '+n+' assertions');
}finally{await browser.close();await server.stop();}
