/**
 * CC2-46B — actual packaged Circuit Climb, physical Molasses visuals.
 *
 * Proves these screenshots come from the VISIBLE Heritage canvas, not the
 * hidden source preview or a fake hand-painted test scene.
 *
 * - 20%-speed source mechanic only AFTER real skip-count gate success
 * - source contact (true), bow wave/wake drawn UNDER red Pursuer
 * - no green screen-covering overlay, no lost math tap targets
 * - source-preserving visual sliders + restart-required slowdown slider
 * - 3-up/1-down camera, 46px platforms, real future numbers all unchanged
 * - legacy ?cc246b=0 restores CC2-46's original 50% blanket
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc246b-syrup-controller')||
   !html.includes('cc246b-syrup-style'))
  throw Error('CC246B_STANDALONE_ASSET_MISSING');
const server=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-46b-evidence',{recursive:true});
const checks=[];
function assert(ok,label,detail={}){
  checks.push({ok:Boolean(ok),label,detail});
  if(!ok)throw Error('CC246B_BROWSER_FAIL '+JSON.stringify(checks.at(-1)));
  console.log('PASS CC246B '+label);
}
const inspect=page=>page.evaluate(()=>{
  const api=window.__CC2_02A__,s=api.snapshot(),
    director=api.creature(),diag=window.__CC2_46B__,
    heritage=window.__CC2_09B__.summary();
  const gel=document.querySelector('.cc230-gel');
  const sprite=document.querySelector('.cc230-creature');
  const bodyStyle=getComputedStyle(sprite,'::after');
  return {
    source:{phase:s.phase,runId:s.runId,tick:s.tick,solved:s.solved.length,
      rows:s.completedRows,score:s.score,
      options:s.currentProblem.options.length},
    digest:api.sessionReport().stateDigest,
    director:{gate:director?.gate,contact:director?.contactActive,
      multiplier:director?.fieldMultiplier,
      configMultiplier:director?.config?.slowMultiplier,
      coverage:director?.activeField?.coverage??null,
      question:director?.question??null},
    presentation:{
      enabled:diag?.enabled,settings:diag?.settings(),
      locomotion:diag?.diagnostics.locomotion,
      awakeField:heritage.molasses46B,
      overlayDisplay:getComputedStyle(gel).display,
      pseudoImage:bodyStyle.backgroundImage,
      pseudoWidth:bodyStyle.width,
      buttonWidth:sprite.getBoundingClientRect().width,
      underlay:heritage.molasses46B?.layer,
    },
    camera:api.rendererStats(),
    future:api.futureNumberedRows()?.rows.length,
    errors:heritage.errors,failures:heritage.paintFailures,
  };
});
async function completeOneRow(page){
  await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot();
    const correct=s.currentProblem.correctPlatformId;
    const button=[...document.querySelectorAll('button.choice')]
      .find(b=>b.dataset.platformId===correct);
    if(!button)throw Error('CC246B_REAL_CORRECT_BUTTON_NOT_FOUND');
    button.click();
    for(let n=0;n<150;n++){
      if(a.snapshot().completedRows>s.completedRows||
         a.snapshot().phase==='ended')break;
      a.advanceForQA(20);
    }
    if(a.snapshot().completedRows!==s.completedRows+1)
      throw Error('CC246B_FIRST_REAL_ROW_NOT_SOLVED');
  });
}
try{
  for(const [width,height] of [
    [320,700],[390,844],[428,926],[768,1024],[988,874],
  ]){
    const page=await browser.newPage({viewport:{width,height}});
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));
    try{
      await page.goto(base+'?manual=1',{waitUntil:'domcontentloaded'});
      await page.locator('#cc209c-enter').click();
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=true;});
      await page.waitForFunction(()=>
        window.__CC2_46B__?.enabled&&
        window.__CC2_30__?.sourcePreset?.slowMultiplier===.2&&
        window.__CC2_09B__?.summary?.()?.molasses46B?.enabled,
        null,{timeout:18000});
      const initial=await inspect(page);
      assert(initial.director.configMultiplier===.2 &&
        initial.presentation.enabled,
        'exact 20% physical Pursuer speed is configured '+width,
        initial.director);
      // The Guardian is legitimately hidden before its first earned row.
      // Check its authored 51px pseudo-body now; assert the actual 44px
      // touch target AFTER source makes the Guardian available below.
      assert(initial.presentation.overlayDisplay==='none' &&
        initial.presentation.pseudoImage!=='none' &&
        initial.presentation.pseudoWidth==='51px',
        'no full green overlay; authored snail-smear material is installed '+width,
        initial.presentation);
      assert(initial.camera.flowRowsAbove===3 &&
        initial.camera.flowRowsBelow===1 &&
        initial.future===3&&initial.source.options===3,
        'accepted 3+1 sightline, three future rows and math buttons '+width);

      await completeOneRow(page);
      await page.waitForFunction(()=>
        window.__CC2_02A__?.creature?.()?.gate==='AVAILABLE',
        null,{timeout:12000});
      const visibleGuardian=await inspect(page);
      assert(visibleGuardian.presentation.buttonWidth>=44 &&
        visibleGuardian.presentation.overlayDisplay==='none',
        'Guardian is visible and thumb-sized after genuine row progress '+width,
        {width:visibleGuardian.presentation.buttonWidth});
      await page.screenshot({
        path:'cc2-46b-evidence/smear-guardian-'+width+'.png',
        fullPage:true,animations:'disabled',
      });
      const gate=await page.evaluate(()=>{
        const a=window.__CC2_02A__;
        const offered=a.offerCreature();
        if(!offered.ok)throw Error('CC246B_CREATURE_OFFER_FAILED:'+offered.reason);
        const q=a.creature().question;
        const step=q.sequence[1]-q.sequence[0];
        const correct=q.sequence[2]+step;
        if(!q.options.includes(correct))throw Error('CC246B_GATE_BAD_MATH');
        const solved=a.answerCreature(correct);
        if(!solved.ok||!solved.correct)throw Error('CC246B_GATE_NOT_SOLVED');
        a.advanceForQA(1);
        return {correct,offered,solved};
      });
      await page.waitForFunction(()=>
        window.__CC2_09B__?.summary?.()?.molasses46B?.contact===true,
        null,{timeout:15000});
      const stuck=await inspect(page);
      assert(stuck.director.coverage==='BELOW_PLATFORM'&&
        stuck.director.contact&&stuck.director.multiplier===.2,
        'genuine independently solved gate creates source-contact 80% drag '+width,
        {gate,contact:stuck.director});
      assert(stuck.presentation.underlay==='under-actors' &&
        stuck.presentation.awakeField.contact &&
        stuck.presentation.awakeField.bowWave &&
        stuck.presentation.awakeField.sourceMultiplier===.2 &&
        stuck.presentation.overlayDisplay==='none',
        '2D bow-wave and syrup are under the real red Pursuer '+width,
        stuck.presentation);
      assert(stuck.source.solved===1&&stuck.source.rows===1&&
        stuck.source.options===3 &&
        stuck.errors===0&&stuck.failures===0&&pageErrors.length===0,
        'molasses never falsifies math, render, or browser state '+width,
        {source:stuck.source,pageErrors});
      await page.screenshot({
        path:'cc2-46b-evidence/honey-bot-stuck-'+width+'.png',
        fullPage:true,animations:'disabled',
      });

      // Settings open legitimately pauses the source. Compare the exact
      // before/after slider state inside that pause, not against live play.
      await page.locator('#cc209-settings-btn').click();
      await page.locator('#cc209-settings > .cc209-dialog > details').last()
        .locator('summary').first().click();
      const sourceBefore=await inspect(page);
      const studio=page.locator('.cc246b-developer');
      assert(await studio.isVisible(),
        'five knobs are in Development Center, not game board '+width);
      await page.evaluate(()=>{
        const input=document.querySelector('#cc246b-bowWaveSize');
        input.value='20';input.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const after=await inspect(page);
      assert(after.presentation.settings.bowWaveSize===20 &&
        sourceBefore.digest===after.digest &&
        sourceBefore.source.tick===after.source.tick &&
        sourceBefore.source.score===after.source.score,
        'live bow-wave slider does not mutate source gameplay '+width,
        {before:sourceBefore.presentation.settings,
         after:after.presentation.settings});
      await page.evaluate(()=>{
        const input=document.querySelector('#cc246b-slow');
        input.value='85';input.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const pending=await page.evaluate(()=>({
        draft:window.__CC2_30__.sourcePreset.slowMultiplier,
        current:window.__CC2_02A__.creature().config.slowMultiplier,
      }));
      assert(pending.draft===.15&&pending.current===.2,
        'stronger slow setting requires actual source-run restart '+width,
        pending);
      await page.locator('.cc246b-reset').click();
      const reset=await inspect(page);
      assert(reset.presentation.settings.bowWaveSize===72,
        'Molasses visual reset restores authored 2D defaults '+width);
    } finally {await page.close();}
  }
  const legacy=await browser.newPage({viewport:{width:390,height:844}});
  try {
    await legacy.goto(base+'?cc246b=0',{waitUntil:'domcontentloaded'});
    await legacy.waitForFunction(()=>
      window.__CC2_02A__?.creature?.()?.config,
      null,{timeout:16000});
    const old=await inspect(legacy);
    assert(!old.presentation.enabled &&
      old.director.configMultiplier===.5 &&
      old.presentation.overlayDisplay!=='none',
      'explicit opt-out restores unchanged CC2-46 50%-speed legacy experience',
      {config:old.director,display:old.presentation.overlayDisplay});
  }finally{await legacy.close();}
  console.log('CC2-46B browser assertions passed:',checks.length);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  writeFileSync('cc2-46b-evidence/browser-results.json',
    JSON.stringify(checks,null,2));
}
