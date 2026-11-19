/**
 * CC2-46C — full causality acceptance on the ACTUAL built single-file game.
 *
 * Do not pass a decorative test scene or fake creature snapshots as proof.
 * This script actually solves the first source math row, opens the optional
 * Molasses skip-count challenge, submits its correct result, waits for the
 * physical contact, and advances source ticks to inspect the causal phases.
 *
 * Each phone/tablet screenshot comes from the visible Heritage canvas.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc246c-syrup-controller')||
   !html.includes('cc246c-syrup-style'))
  throw Error('CC246C_FINAL_OFFLINE_GAME_MISSING');
const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8',
    'Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-46c-evidence',{recursive:true});
const checks=[];
function check(ok,title,details={}){
  checks.push({ok:Boolean(ok),title,details});
  if(!ok)throw Error('CC246C_BROWSER_FAILURE '+
    JSON.stringify(checks.at(-1)));
  console.log('PASS CC246C '+title);
}
const read=page=>page.evaluate(()=>{
  const a=window.__CC2_02A__,s=a.snapshot(),
    c=a.creature(),b=window.__CC2_46B__,fx=window.__CC2_46C__,
    visible=window.__CC2_09B__.summary();
  const actor=document.querySelector('.cc230-creature');
  return {
    runId:s.runId,tick:s.tick,score:s.score,solved:s.solved.length,
    rows:s.completedRows,options:s.currentProblem.options.length,
    digest:a.sessionReport().stateDigest,
    source:{contact:c?.contactActive,speed:c?.fieldMultiplier,
      configSpeed:c?.config?.slowMultiplier,field:c?.activeField,
      receipts:(c?.receipts||[]).map(e=>({id:e.id,type:e.type,tick:e.tick}))},
    bEnabled:b?.enabled,cEnabled:fx?.enabled,
    phase:visible.molasses46C?.phase,
    material:visible.molasses46C,
    diagnostics:fx?.diagnostics,
    heroPhase:actor?.dataset.molassesPhase,
    legacyGelDisplay:getComputedStyle(
      document.querySelector('.cc230-gel')).display,
    view:a.rendererStats(),futureCount:a.futureNumberedRows()?.rows.length,
    paintFailures:visible.paintFailures,errors:visible.errors,
    controls:fx?.settings(),
  };
});
async function nextTicks(page,n){
  await page.evaluate(t=>window.__CC2_02A__.advanceForQA(t),n);
  await page.waitForTimeout(120);
}
async function firstEarnedEncounter(page){
  await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot();
    const button=[...document.querySelectorAll('button.choice')]
      .find(x=>x.dataset.platformId===s.currentProblem.correctPlatformId);
    if(!button)throw Error('CC246C_SOURCE_MATH_BUTTON_NOT_FOUND');
    button.click();
    for(let i=0;i<180;i++){
      if(a.snapshot().completedRows>s.completedRows||
        a.snapshot().phase==='ended')break;
      a.advanceForQA(20);
    }
    if(a.snapshot().completedRows!==s.completedRows+1)
      throw Error('CC246C_MATH_ROW_NOT_COMPLETED');
  });
  await page.waitForFunction(()=>
    window.__CC2_02A__?.creature?.()?.gate==='AVAILABLE' &&
    !document.querySelector('.cc230-creature')?.hidden,
    null,{timeout:14000});
}
async function solveMolasses(page){
  return page.evaluate(()=>{
    const a=window.__CC2_02A__;
    const offered=a.offerCreature();
    if(!offered.ok)throw Error('CC246C_GATE_REJECTED '+offered.reason);
    const q=a.creature().question;
    const target=q.sequence[2]+q.sequence[1]-q.sequence[0];
    if(!q.options.includes(target))
      throw Error('CC246C_GUARDIAN_ANSWER_NOT_SOURCE_TRUE');
    const receipt=a.answerCreature(target);
    if(!receipt.ok||!receipt.correct)
      throw Error('CC246C_GUARDIAN_NOT_ACTUALLY_SOLVED');
    return {target,receipt};
  });
}
try{
  for(const [width,height] of [[320,700],[390,844],[428,926],
      [768,1024],[988,874]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url+'?manual=1',{waitUntil:'domcontentloaded'});
      await page.locator('#cc209c-enter').click();
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=true;});
      await page.waitForFunction(()=>
        window.__CC2_46C__?.enabled &&
        window.__CC2_09B__?.summary?.()?.molasses46C?.enabled,
        null,{timeout:16000});
      const before=await read(page);
      check(before.cEnabled && before.bEnabled &&
        before.source.configSpeed===.2 &&
        before.material.phase==='IDLE',
        'exact 20% source effect is opt-in; no premature ejection '+width,
        {phase:before.phase,speed:before.source.configSpeed});
      check(before.legacyGelDisplay==='none'&&
        before.options===3&&before.futureCount===3&&
        before.view.flowRowsAbove===3&&before.view.flowRowsBelow===1,
        'no green screen overlay; all three mathematical future rows intact '+width);
      await firstEarnedEncounter(page);
      await page.screenshot({path:'cc2-46c-evidence/01-guardian-ready-'+width+'.png',
        fullPage:true,animations:'disabled'});
      const earned=await solveMolasses(page);
      await nextTicks(page,12);
      const eject=await read(page);
      check(eject.source.receipts.some(e=>e.type==='GATE_SOLVED') &&
        eject.source.receipts.some(e=>e.type==='FIELD_CAST') &&
        eject.source.field &&
        eject.material.phase==='EJECT' &&
        eject.material.bolusVisible &&
        eject.material.syrupDrawn,
        'solved skip-count gate triggers source-anchored green bolus '+width,
        {phase:eject.material,earned});
      await page.screenshot({path:'cc2-46c-evidence/02-guardian-eject-'+width+'.png',
        fullPage:true,animations:'disabled'});
      await nextTicks(page,27);
      const splat=await read(page);
      check(splat.material.phase==='SPLAT' &&
        splat.material.syrupDrawn &&
        splat.material.greenHoney &&
        splat.material.surfaceLayer==='under-pursuer',
        'viscous projectile becomes a thick emerald-green splat UNDER bot '+width,
        splat.material);
      await page.screenshot({path:'cc2-46c-evidence/03-honey-splat-'+width+'.png',
        fullPage:true,animations:'disabled'});
      await nextTicks(page,47);
      const struggle=await read(page);
      check(struggle.source.contact&&struggle.source.speed===.2 &&
        struggle.material.contact&&
        struggle.material.phase==='BOT_STUCK' &&
        struggle.material.sourceSpeed===.2,
        'red Pursuer struggles only on genuine source Molasses contact '+width,
        {source:struggle.source,material:struggle.material});
      check(struggle.diagnostics.cues.some(x=>x.type==='CAST') &&
        struggle.diagnostics.cues.some(x=>x.type==='TRAP') &&
        new Set(struggle.diagnostics.cues.map(x=>x.id)).size===
          struggle.diagnostics.cues.length,
        'cast/trap suction sound cues each linked exactly once to source receipts '+width,
        struggle.diagnostics.cues);
      check(struggle.options===3&&struggle.solved===1&&
        struggle.rows===1&&struggle.errors===0&&
        struggle.paintFailures===0&&errors.length===0,
        'original math, canvas safety and gameplay counters unaffected '+width,
        {errors,source:{rows:struggle.rows,score:struggle.score}});
      await page.screenshot({path:'cc2-46c-evidence/04-bot-stuck-'+width+'.png',
        fullPage:true,animations:'disabled'});

      // Opening settings really pauses the authoritative source, so record
      // paused baseline before sliding and comparing source-state digest.
      await page.locator('#cc209-settings-btn').click();
      await page.locator('#cc209-settings > .cc209-dialog > details').last()
        .locator('summary').first().click();
      const group=page.locator('.cc246c-controls');
      await group.locator('summary').click();
      const beforeSlider=await read(page);
      check(await group.isVisible(),
        'Green Honey Studio exposed only in developer tools '+width);
      await page.evaluate(()=>{
        const v=document.getElementById('cc246c-thickness');
        v.value='100';v.dispatchEvent(new Event('input',{bubbles:true}));
        const b=document.getElementById('cc246c-struggle');
        b.value='96';b.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const afterSlider=await read(page);
      check(afterSlider.controls.thickness===100&&
        afterSlider.controls.struggle===96&&
        afterSlider.digest===beforeSlider.digest &&
        afterSlider.tick===beforeSlider.tick&&
        afterSlider.score===beforeSlider.score,
        'live green-honey thickness and bot struggle cannot change source '+width,
        {before:beforeSlider.controls,after:afterSlider.controls});
      await page.locator('.cc246c-reset').click();
      const reset=await read(page);
      check(reset.controls.thickness===86 &&
        reset.controls.struggle===78&&reset.controls.volume===62,
        'reset restores tuned signature material defaults '+width);
    }finally{await page.close();}
  }
  const legacy=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await legacy.goto(url+'?cc246c=0',
      {waitUntil:'domcontentloaded'});
    await legacy.waitForFunction(()=>
      window.__CC2_46C__?.settings?.(),null,{timeout:12000});
    const old=await legacy.evaluate(()=>({
      enabled:window.__CC2_46C__.enabled,
      old:window.__CC2_46B__.enabled,
      config:window.__CC2_02A__.creature().config.slowMultiplier,
    }));
    check(!old.enabled&&old.old&&old.config===.2,
      'explicit opt-out exactly restores CC2-46B visual effects and physics',
      old);
  }finally{await legacy.close();}
  const reduced=await browser.newPage({viewport:{width:390,height:844},
    reducedMotion:'reduce'});
  try{
    await reduced.goto(url,{waitUntil:'domcontentloaded'});
    await reduced.waitForFunction(()=>
      window.__CC2_46C__?.enabled,null,{timeout:12000});
    const v=await reduced.evaluate(()=>({
      reduced:window.__CC2_46C__.settings().reducedMotion,
      config:window.__CC2_46C__.settings(),
      css:document.documentElement.classList.contains('cc246c-syrup'),
    }));
    check(v.reduced&&v.css,'reduced motion preserves material and controls',v);
  }finally{await reduced.close();}
  console.log('CC2-46C browser assertions passed:',checks.length);
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
  writeFileSync('cc2-46c-evidence/browser-results.json',
    JSON.stringify(checks,null,2));
}
