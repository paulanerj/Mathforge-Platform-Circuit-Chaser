/**
 * CC2-18A — actual browser acceptance for experimental Circuit Eclipse.
 *
 * 1. The immediate visual preview never manufactures gameplay events.
 * 2. Ordinary pointer clicks, Spark movement and landings still work.
 * 3. A physical capture from the original deterministic source causes one
 *    staged cinematic and then the REAL, solver-backed debrief.
 * 4. Replay and skip do not change core digest, state or equation receipts.
 * 5. Reduced motion, small/mobile/tablet viewports and non-capture quits
 *    remain safe. Screenshots provide owner-review evidence.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3251});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS
});
const dir='cc2-18-evidence';
mkdirSync(dir,{recursive:true});
let assertions=0;
const cases=[];
const check=(cond,label,details={})=>{
  assertions++;
  if(!cond)throw Error('CC2_18_BROWSER_FAIL: '+label+' '+JSON.stringify(details));
  cases.push({label,ok:true});
  console.log('PASS '+label);
};
const locate=(suffix='')=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+suffix,server.url
).toString();

try{
  // On-demand visual demo: no simulation, scoring, or fake capture.
  for(const [width,height,reduced] of [[320,568,true],[390,844,false],
    [768,1024,false]]){
    const page=await browser.newPage({
      viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'
    });
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(locate('?eclipseDemo=1'),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_18__?.summary?.()?.visible,
        null,{timeout:20000});
      const starting=await page.evaluate(()=>{
        const a=window.__CC2_02A__,s=a.snapshot(),t=window.__CC2_18__.summary();
        return{tick:s.tick,phase:s.phase,attempts:s.attempts,
          endReason:s.endReason,digest:a.sessionReport().stateDigest,
          activeDemo:t.isDemo,overlayVisible:t.visible,
          evidence:t.captureEvidence,
          label:document.querySelector('#cc218-mode').textContent};
      });
      check(starting.activeDemo&&starting.overlayVisible&&
        starting.label.includes('NOT A CAPTURE'),
        'clearly marked non-authoritative visual preview '+width,starting);
      check(starting.tick===0&&starting.phase==='ready'&&
        starting.attempts===0&&starting.endReason===null&&
        starting.evidence===null,
        'no fabricated math, pursuit or capture '+width,starting);
      check(await page.evaluate(
        ()=>document.querySelectorAll('#cc218-eclipse').length===1),
        'unique presentation layer '+width);
      if(width===390){
        await page.waitForFunction(
          ()=>window.__CC2_18__?.summary?.()?.phase==='containment',
          null,{timeout:4000});
        await page.screenshot({path:dir+'/cc2-18-containment-390.png'});
        await page.waitForFunction(
          ()=>window.__CC2_18__?.summary?.()?.phase==='eclipse',
          null,{timeout:4000});
        await page.screenshot({path:dir+'/cc2-18-eclipse-390.png'});
      }
      await page.waitForFunction(
        ()=>window.__CC2_18__?.summary?.()?.phase==='hold',
        null,{timeout:5500});
      const finished=await page.evaluate(()=>({
        digest:window.__CC2_02A__.sessionReport().stateDigest,
        tick:window.__CC2_02A__.snapshot().tick,
        terminal:window.__CC2_02A__.snapshot().endReason,
        phase:window.__CC2_18__.summary().phase
      }));
      check(finished.digest===starting.digest&&finished.tick===0&&
        finished.terminal===null,
        'visual-only animation is state-digest identical '+width,finished);
      if(width===320){
        const buttons=await page.evaluate(()=>{
          const selectors=['#cc218-skip','#cc218-replay'];
          return selectors.map(selector=>{
            const e=document.querySelector(selector);
            const box=e.getBoundingClientRect();
            return{selector,visible:box.width>0&&box.height>=44,
              inViewport:box.top>=0&&box.bottom<=innerHeight,
              left:box.left,right:box.right,bottom:box.bottom};
          });
        });
        check(buttons.every(b=>b.visible&&b.inViewport),
          'both preview actions visible above the fold on 320x568',buttons);
      }
      await page.screenshot({path:dir+'/cc2-18-preview-'+width+'.png'});
      if(width===390){
        await page.locator('#cc218-replay').click();
        await page.waitForFunction(
          ()=>window.__CC2_18__.summary().phase==='containment',
          null,{timeout:4000});
        check(await page.evaluate(
          ()=>window.__CC2_18__.summary().visible),
          'preview replay restarts only the animation');
      }
      await page.locator('#cc218-skip').click();
      check(await page.evaluate(()=>!window.__CC2_18__.summary().visible&&
        document.querySelector('#summaryPanel').hidden),
        'preview returns to game without opening a results dialog '+width);
      await page.locator('#cc209c-enter').click();
      const p=await page.evaluate(
        ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      await page.locator('button.choice[data-platform-id="'+p+'"]').click();
      await page.waitForFunction(()=>{
        const s=window.__CC2_02A__.snapshot();
        return s.tick>3&&s.attempts===1;
      },null,{timeout:10000});
      await page.waitForFunction(
        ()=>window.__CC2_02A__.snapshot().completedRows>=1,
        null,{timeout:28000});
      check(await page.evaluate(()=>window.__CC2_02A__.snapshot().completedRows>=1),
        'real input and solved landing survive presentation '+width);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
        'no horizontal overflow '+width);
      check(!errors.length,'no browser errors '+width,{errors});
    }finally{await page.close();}
  }

  // Capture uses the REAL deterministic idle pursuit scenario. It is not
  // triggered by a developer-only setCaptured or synthetic terminal event.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await page.goto(locate('?manual=1'),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(
      ()=>window.__CC2_18__?.summary&&window.__CC2_16A__?.runScenario,
      null,{timeout:20000});
    await page.locator('#cc209c-enter').click();
    await page.evaluate(()=>window.__CC2_16A__.runScenario('idle'));
    await page.waitForFunction(
      ()=>window.__CC2_16A__.summary().runCount>=1,
      null,{timeout:120000});
    const outcome=await page.evaluate(()=>{
      const a=window.__CC2_02A__,s=a.snapshot(),
        report=a.summary(),v=window.__CC2_18__.summary();
      return{phase:s.phase,reason:s.endReason,rows:s.completedRows,
        reportRows:report.rowsSolved,terminalEvents:a.events().filter(
          e=>e.type==='RUN_ENDED'&&e.detail?.reason==='CAPTURED').length,
        visible:v.visible,realCaptureSeen:v.realCaptureSeen,
        evidence:v.captureEvidence,digest:a.sessionReport().stateDigest,
        presentations:window.__CC2_18__.report().history.filter(
          e=>e.event==='CAPTURE_RECEIPT').length};
    });
    check(outcome.reason==='CAPTURED'&&outcome.phase==='ended',
      'source-owned physical capture actually happened',outcome);
    check(outcome.terminalEvents===1&&outcome.realCaptureSeen&&
      outcome.evidence?.solvedRows===outcome.reportRows&&
      outcome.evidence.endReason==='CAPTURED'&&outcome.presentations===1,
      'exactly one capture receipt; truthful progress',outcome);

    // The app must autonomously transition to the actual results screen.
    await page.waitForFunction(
      ()=>!window.__CC2_18__.summary().visible&&
        !document.querySelector('#summaryPanel').hidden,
      null,{timeout:8000});
    check(await page.locator('#cc218-summary-replay').isVisible(),
      'actual capture offers optional replay inside existing debrief');
    const result=await page.evaluate(()=>{
      const a=window.__CC2_02A__,r=a.summary();
      return{rows:r.rowsSolved,solved:r.equations.length,
        rendered:document.querySelector('#summaryEquations').children.length,
        digest:a.sessionReport().stateDigest,
        stage:window.__CC2_18__.summary().phase};
    });
    check(result.rows===result.solved&&result.rendered===
      Math.max(1,result.solved),
      'debrief shows only source-owned solved equation records',result);
    await page.screenshot({path:dir+'/cc2-18-source-results-390.png'});

    await page.locator('#cc218-summary-replay').click();
    check(await page.evaluate(()=>window.__CC2_18__.summary().visible),
      'capture replay opens from source-backed results');
    await page.screenshot({path:dir+'/cc2-18-capture-replay-390.png'});
    await page.locator('#cc218-skip').click();
    check(await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest)
      ===outcome.digest,'replaying and skipping never alter source digest');
    await page.locator('#summaryRestart').click();
    await page.waitForFunction(
      ()=>!window.__CC2_18__.summary().realCaptureSeen,
      null,{timeout:5000});
    check(await page.evaluate(()=>document.querySelector('#cc218-summary-replay').hidden),
      'new run clears stale capture replay');
    check(!errors.length,'capture path has no browser errors',{errors});
  }finally{await page.close();}

  // Quit is a separate terminal reason and must never trigger Eclipse.
  const quit=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await quit.goto(locate(),{waitUntil:'domcontentloaded'});
    await quit.waitForFunction(()=>window.__CC2_18__?.summary&&
      window.__CC2_02A__?.snapshot,null,{timeout:20000});
    await quit.locator('#cc209c-enter').click();
    await quit.evaluate(()=>document.querySelector('#endRun').click());
    await quit.waitForFunction(
      ()=>window.__CC2_02A__.snapshot().phase==='ended',
      null,{timeout:5000});
    check(await quit.evaluate(()=>window.__CC2_02A__.snapshot().endReason==='QUIT'&&
      !window.__CC2_18__.summary().visible&&
      !window.__CC2_18__.summary().realCaptureSeen),
      'ordinary quit is not misreported as physical capture');
  }finally{await quit.close();}

  console.log('CC2-18A CAPTURE EXPERIENCE PASS '+assertions+'/'+assertions);
  writeFileSync(dir+'/cc2-18-acceptance.json',
    JSON.stringify({schema:'cc2-18a-acceptance/v1',assertions,cases},null,2));
}finally{await browser.close();await server.stop();}
