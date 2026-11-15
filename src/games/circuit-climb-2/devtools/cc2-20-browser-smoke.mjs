/**
 * CC2-VIS-20 QA — inertial living plasma and decisive red-shell capture,
 * live gameplay, source-digest identity, responsive modes, and phase captures.
 *
 * All source/gameplay mutation is forbidden in this test. Uses:
 * - real Playwright pointer input for ordinary MathForge climbing
 * - established scenario lab's genuine source-owned pursuit ticks
 * - CC2-20 ONLY VISUAL seek to capture phase screenshots, not engine ticks.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3264});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const dir='cc2-20-evidence';
mkdirSync(dir,{recursive:true});
let count=0;
const cases=[];
const assert=(test,label,info={})=>{
  count++;
  cases.push({pass:Boolean(test),label,info});
  if(!test)throw Error('CC220_QA_FAIL '+label+' '+JSON.stringify(info));
  console.log('PASS '+label);
};
const url=(suffix='')=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+suffix,server.url).toString();
const collect=()=>({
  source:window.__CC2_02A__.snapshot(),
  session:window.__CC2_02A__.sessionReport(),
  present:window.__CC2_19__.summary(),
  geometry:window.__CC2_19__.geometry()
});
const screenshot=async(page,name)=>page.screenshot({path:dir+'/'+name+'.png'});

try {
  for(const [w,h,reduced] of [[320,568,true],[360,640,false],
    [390,844,false],[428,926,false],[768,1024,false],
    [1280,800,false]]){
    const page=await browser.newPage({viewport:{width:w,height:h},
      reducedMotion:reduced?'reduce':'no-preference'});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try {
      await page.goto(url('?eclipseDemo=1'),{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_19__?.summary?.()?.visible,
        null,{timeout:20000});
      await page.waitForFunction(()=>window.__CC2_VIS20__?.summary?.()?.initialized,
        null,{timeout:15000});
      const first=await page.evaluate(collect);
      assert(first.source.tick===0&&first.source.attempts===0&&
        first.source.endReason===null&&first.present.isDemo,
        'preview non-authoritative start '+w,first.present);
      assert(first.present.schema==='cc2-red-shell-vfx/v1'&&
        first.present.artPresetHash.length===8,
        'schema and preset provenance '+w);

      const initial=first.session.stateDigest;
      const phases=[['contact',50],['aperture',190],['swallow',390],
        ['pop',620],['reform',1010],['hold',1510]];
      if(w===390||w===1280){
        for(const [name,ms]of phases){
          const s=await page.evaluate(ms=>window.__CC2_19__.visualSeekForQA(ms),ms);
          assert(s.phase===name,'source-free phase seek '+name,s);
          await screenshot(page,'CC2-VIS20-'+name+'-'+w);
        }
      }else{
        await page.evaluate(()=>window.__CC2_19__.visualSeekForQA(1510));
      }
      const end=await page.evaluate(collect);
      const g=end.geometry;
      assert(g.nested&&g.shellCount===1&&g.blueSparkCount===1,
        'single red shell / single nested blue Spark '+w,g);
      assert(g.outerAspect>=1/1.06&&g.outerAspect<=1.06&&
        g.whollyEnclosed,'round outer body encloses whole eye '+w,g);
      assert(g.eyeToShellDiameter>=.35&&g.eyeToShellDiameter<=.42,
        'eye diameter contract '+w,g);
      assert(g.centerDistance<=g.shell.radius*.06,
        'central blue iris within 6% of red radius '+w,g);
      assert(end.session.stateDigest===initial&&
        end.source.attempts===0&&end.source.endReason===null,
        'phase animation never creates game result '+w);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
        'no viewport horizontal overflow '+w);
      await screenshot(page,'CC2-VIS20-final-nested-eye-'+w);

      // Escape or explicit dismiss releases presentation lock.
      await page.evaluate(()=>window.__CC2_19__.dismiss());
      assert(await page.evaluate(()=>!document.body.classList.contains('cc219-active')&&
        document.querySelector('#cc219-shield').hidden&&
        document.querySelector('#summaryPanel').hidden),
        'preview cleanup and unchanged summary '+w);
      if(await page.locator('#cc209c-enter').isVisible())
        await page.locator('#cc209c-enter').click();
      const pid=await page.evaluate(()=>
        window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      const button=page.locator('button.choice[data-platform-id="'+pid+'"]');
      await button.click();
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>=3,
        null,{timeout:10000});
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().completedRows>=1,
        null,{timeout:30000});
      assert(await page.evaluate(()=>
        window.__CC2_02A__.snapshot().completedRows>=1),
        'real touch/click and Spark landing unchanged '+w);
      await page.waitForFunction(()=>window.__CC2_VIS20__.summary().liveFrames>0,
        null,{timeout:3000});
      assert(await page.evaluate(()=>window.__CC2_VIS20__.summary().liveFrames>0),
        'living plasma observer runs during real play '+w);
      if(w===390||w===1280)await screenshot(page,'CC2-VIS20-live-pursuer-'+w);
      assert(errors.length===0,'no browser exceptions '+w,{errors});
    }finally{await page.close();}
  }

  // Ten non-authoritative visual lab fixtures, no game input or invented
  // capture events. The real source must remain at tick zero throughout.
  const labPage=await browser.newPage({viewport:{width:390,height:844}});
  const labErrors=[];labPage.on('pageerror',e=>labErrors.push(String(e)));
  try{
    await labPage.goto(url('?vis20Lab=turn90'),{waitUntil:'domcontentloaded'});
    await labPage.waitForFunction(()=>
      window.__CC2_VIS20__?.summary?.()?.lab?.scenario==='turn90',
      null,{timeout:16000});
    const a=await labPage.evaluate(()=>({
      tick:window.__CC2_02A__.snapshot().tick,
      digest:window.__CC2_02A__.sessionReport().stateDigest,
      lab:window.__CC2_VIS20__.summary().lab,
      available:window.__CC2_VIS20__.labScenarios()
    }));
    assert(a.tick===0&&a.available.length===10,
      'ten deterministic visual scenarios with zero source ticks',a);
    const mid=await labPage.evaluate(()=>window.__CC2_VIS20__.labSetTime(1150));
    assert(mid.sample.lagDistance>1&&mid.sample.trailCount>0,
      'envelope retains momentum after a 90-degree turn',mid.sample);
    await screenshot(labPage,'CC2-VIS20-turn90-lag-390');
    const reverse=await labPage.evaluate(()=>{
      const v=window.__CC2_VIS20__;
      v.startLab('reverse180');
      return v.labSetTime(1150);
    });
    assert(reverse.sample.lagDistance>1,
      'full reversal retains momentum after the core turns',reverse.sample);
    await screenshot(labPage,'CC2-VIS20-reversal-lag-390');
    const halt=await labPage.evaluate(()=>{
      const v=window.__CC2_VIS20__;
      v.startLab('stop');
      return v.labSetTime(1300);
    });
    assert(halt.sample.lagDistance>0,
      'plasma overshoots after the authoritative-looking core stops',halt.sample);
    const repeat=await labPage.evaluate(()=>{
      const v=window.__CC2_VIS20__;
      return{
        first:v.labScenario('rapidTurns',60),
        second:v.labScenario('rapidTurns',60),
        thirty:v.labScenario('rapidTurns',30),
        sixty:v.labScenario('rapidTurns',60)
      };
    });
    assert(repeat.first.digest===repeat.second.digest,
      'identical seeded movement has identical digest',repeat);
    assert(repeat.thirty.peakLag>0&&repeat.sixty.peakLag>0&&
      Math.abs(repeat.thirty.peakLag-repeat.sixty.peakLag)<20,
      'plasma remains stable across 30 and 60 fps sample frequencies',
      {a:repeat.thirty.peakLag,b:repeat.sixty.peakLag});
    await labPage.evaluate(()=>window.__CC2_VIS20__.stopLab());
    assert(await labPage.evaluate(()=>
      !window.__CC2_VIS20__.summary().lab&&
      !document.body.classList.contains('cc220-lab-active')&&
      document.querySelector('#cc220-lab-ui').hidden&&
      window.__CC2_02A__.snapshot().tick===0),
      'lab cleanup and no authored game motion');
    assert(await labPage.evaluate(()=>
      window.__CC2_02A__.sessionReport().stateDigest)===a.digest,
      'lab modes preserve source state digest exactly');
    assert(labErrors.length===0,'no lab JavaScript exceptions',{labErrors});
  }finally{await labPage.close();}

  // Genuine physical capture from the accepted deterministic lab scenario.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try {
    await page.goto(url('?manual=1'),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_19__?.summary&&
      window.__CC2_16A__?.runScenario,
      null,{timeout:25000});
    await page.locator('#cc209c-enter').click();
    await page.evaluate(()=>window.__CC2_16A__.runScenario('idle'));
    await page.waitForFunction(()=>window.__CC2_16A__.summary().runCount>=1,
      null,{timeout:120000});
    await page.waitForFunction(()=>
      window.__CC2_02A__.snapshot().endReason==='CAPTURED'&&
      window.__CC2_19__.summary().realCaptureSeen,
      null,{timeout:15000});
    const exact=await page.evaluate(collect);
    const receipts=await page.evaluate(()=>window.__CC2_02A__.events()
      .filter(e=>e.type==='RUN_ENDED'&&e.detail?.reason==='CAPTURED'));
    assert(exact.source.endReason==='CAPTURED'&&receipts.length===1,
      'authoritative physical capture and unique terminal receipt',exact.present);
    assert(exact.present.captureEvidence?.endReason==='CAPTURED'&&
      exact.present.captureEventId===receipts[0].id&&
      exact.present.captureEvidence.solvedRows===exact.source.completedRows,
      'capture receipt belongs to this run and actual solved rows');
    const allPhases=()=>window.__CC2_19__.report().history.filter(e=>e.type==='PHASE').map(e=>e.phase);
    const phases=await page.evaluate(allPhases);
    assert(phases.includes('contact')||phases.includes('aperture')||
      phases.includes('hold'),
      'verified real capture launches the in-board sequence',{phases});

    // Result screen must be source-owned, not a replacement:
    await page.waitForFunction(()=>!window.__CC2_19__.summary().visible&&
      !document.querySelector('#summaryPanel').hidden,
      null,{timeout:10000});
    const terminal=await page.evaluate(collect);
    assert(terminal.session.stateDigest===exact.session.stateDigest,
      'cinematic completes without changing authoritative digest');
    assert(await page.evaluate(()=>{
      const r=window.__CC2_02A__.summary();
      return r.equations.length===r.rowsSolved&&
        document.querySelector('#summaryEquations').children.length===
          Math.max(1,r.equations.length);
    }),'original source-backed run summary and equations');
    assert(await page.locator('#cc219-summary-replay').isVisible(),
      'actual capture offers replay in the original summary');

    await page.locator('#cc219-summary-replay').click();
    await page.waitForFunction(()=>window.__CC2_19__.summary().visible,
      null,{timeout:2000});
    await page.evaluate(()=>window.__CC2_19__.visualSeekForQA(315));
    assert(await page.evaluate(()=>window.__CC2_19__.geometry().nested),
      'Spark is already enclosed by 315 ms after actual capture replay');
    await page.evaluate(()=>window.__CC2_19__.visualSeekForQA(1510));
    const g=await page.evaluate(()=>window.__CC2_19__.geometry());
    assert(g.whollyEnclosed&&g.nested&&g.shellCount===1&&g.blueSparkCount===1,
      'REAL CAPTURE hold meets one-shell/one-eye geometry',g);
    await screenshot(page,'CC2-VIS20-AUTHORITATIVE-CAPTURE-final-390');
    assert(await page.evaluate(()=>getComputedStyle(
      document.querySelector('#summaryPanel')).visibility==='hidden'),
      'existing results hidden during capture, with no screen flash');
    await page.locator('#cc219-skip').click();
    assert(await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest)===
      exact.session.stateDigest,
      'replay and skip never change source digest');
    assert(await page.evaluate(()=>!document.querySelector('#summaryPanel').hidden&&
      !document.body.classList.contains('cc219-active')),
      'skip reveals exact original summary once and releases lock');
    await page.locator('#summaryRestart').click();
    await page.waitForFunction(()=>!window.__CC2_19__.summary().realCaptureSeen,
      null,{timeout:5000});
    assert(await page.evaluate(()=>
      document.querySelector('#cc219-summary-replay').hidden&&
      window.__CC2_02A__.snapshot().phase!=='ended'),
      'consecutive run clears previous terminal presentation');

    // Designer import/export/reset and negative schema validation.
    await page.evaluate(()=>{
      const v=window.__CC2_19__,copy=v.preset();
      copy.look.shellMid='#a72a64';
      v.loadPreset(copy);
    });
    assert(await page.evaluate(()=>window.__CC2_19__.preset().look.shellMid==='#a72a64'),
      'editable external VFX preset applies without changing game config');
    const invalid=await page.evaluate(()=>{
      const v=window.__CC2_19__,c=v.preset();
      c.geometry.externalSecondSparkInFinal=true;
      try{v.loadPreset(c);return false}catch{return true}
    });
    assert(invalid,'geometry contract rejects external blue second lobe');
    await page.evaluate(()=>window.__CC2_19__.resetPreset());
    const living=await page.evaluate(()=>{
      const a=window.__CC2_VIS20__,next=a.config();
      const sourceBefore=window.__CC2_02A__.sessionReport().stateDigest;
      next.physics.envelopeMass=3.4;
      const changed=a.loadConfig(next);
      const invalid=a.config();invalid.capture.engulf=5000;
      let rejected=false;
      try{a.loadConfig(invalid)}catch{rejected=true}
      a.reset();
      return{changed,rejected,restored:a.config().physics.envelopeMass===2.2,
        sourceUnchanged:
          window.__CC2_02A__.sessionReport().stateDigest===sourceBefore};
    });
    assert(living.rejected&&living.restored&&living.sourceUnchanged,
      'editable visual presets validate and reset without game changes',living);
    assert(await page.evaluate(()=>window.__CC2_19__.preset().look.shellMid==='#B92B62'),
      'reset restores original visual preset');
    assert(errors.length===0,'capture and replay have no browser errors',{errors});
  }finally{await page.close();}

  // Genuine PRACTICE_GOAL is an ordinary source-owned success. The
  // settings control uses its existing change event; no engine injection.
  const practice=await browser.newPage({viewport:{width:390,height:844}});
  try {
    await practice.goto(url(),{waitUntil:'domcontentloaded'});
    await practice.waitForFunction(()=>window.__CC2_19__?.summary&&
      window.__CC2_02A__?.snapshot,null,{timeout:20000});
    await practice.locator('#cc209c-enter').click();
    await practice.evaluate(()=>{
      const mode=document.querySelector('#mode');
      mode.value='practice';
      mode.dispatchEvent(new Event('change',{bubbles:true}));
    });
    for(let row=1;row<=4;row++){
      const target=await practice.evaluate(
        ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      await practice.locator('button.choice[data-platform-id="'+target+'"]').click();
      await practice.waitForFunction(expected=>{
        const s=window.__CC2_02A__.snapshot();
        return s.completedRows>=expected || s.phase==='ended';
      },row,{timeout:30000});
    }
    await practice.waitForFunction(
      ()=>window.__CC2_02A__.snapshot().endReason==='PRACTICE_GOAL',
      null,{timeout:5000});
    assert(await practice.evaluate(()=>{
      const a=window.__CC2_02A__,p=window.__CC2_19__.summary();
      return a.snapshot().completedRows===4&&
        a.summary().equations.length===4&&
        a.snapshot().endReason==='PRACTICE_GOAL'&&
        !p.realCaptureSeen&&!p.visible;
    }),'four correct practice rows end without false capture');
  }finally{await practice.close();}

  // Noncapture QUIT: no fake terminal assimilation.
  const quit=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await quit.goto(url(),{waitUntil:'domcontentloaded'});
    await quit.waitForFunction(()=>window.__CC2_19__?.summary&&
      window.__CC2_02A__?.snapshot,null,{timeout:20000});
    await quit.locator('#cc209c-enter').click();
    await quit.evaluate(()=>document.querySelector('#endRun').click());
    await quit.waitForFunction(()=>window.__CC2_02A__.snapshot().phase==='ended',
      null,{timeout:5000});
    assert(await quit.evaluate(()=>window.__CC2_02A__.snapshot().endReason==='QUIT'&&
      !window.__CC2_19__.summary().realCaptureSeen&&
      !window.__CC2_19__.summary().visible),
      'QUIT remains ordinary termination, not capture');
  }finally{await quit.close();}

  writeFileSync(dir+'/CC2-VIS20-QA-RESULTS.json',
    JSON.stringify({schema:'cc2-vis20-qa/v1',assertions:count,
      cases,source:'2f0926001ffafd19e562acb70f7e5e6955bb1a02'},null,2));
  console.log('CC2-VIS20 PASS '+count+'/'+count);
}finally{await browser.close();await server.stop();}
