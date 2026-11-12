/**
 * CC2-05A — actual Chromium camera and tuning lab qualification.
 * The test uses source-owned engine and physical buttons; zoom may not
 * influence any mathematical/physical snapshot, pursuer command or replay.
 */
import { chromium } from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-05a-screenshots';
mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3190});
const url=new URL(
  'src/games/circuit-climb-2/devtools/cc2-04.html?manual=1',
  server.url,
).toString();
const browser=await chromium.launch({
  executablePath:findChromium(),headless:true,args:LAUNCH_ARGS,
});
let checks=0;
const check=(okay,label)=>{
  if(!okay)throw Error('CC2_05A_BROWSER_FAIL: '+label);
  checks++;console.log('PASS '+label);
};
try{
  for(const viewport of [
    {width:320,height:568},{width:390,height:844},{width:768,height:1024},
  ]){
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.snapshot));
    const initial=await page.evaluate(()=>({
      snapshot:window.__CC2_02A__.snapshot(),
      stats:window.__CC2_02A__.rendererStats(),
    }));
    check(Math.abs(initial.stats.zoom-0.70)<0.001,
      viewport.width+'px: default camera zoom is 70%');
    check(initial.stats.previewRowsRendered>=1,
      viewport.width+'px: future unnumbered scaffolding visible');
    check(initial.snapshot.world.rows.length===2,
      viewport.width+'px: preview has not generated fake future math');
    check((await page.locator('.choice').count())===3,
      viewport.width+'px: original three real math choices');
    const before=JSON.stringify(initial.snapshot);
    const buttonsBefore=await page.locator('.choice').first().boundingBox();
    // Range input modification is visual ONLY. Never ask the engine to tick.
    await page.locator('#tuningPanel summary').click();
    await page.locator('#cameraZoom').evaluate(input=>{
      input.value='0.60';
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const after=await page.evaluate(()=>({
      snapshot:window.__CC2_02A__.snapshot(),
      stats:window.__CC2_02A__.rendererStats(),
    }));
    check(JSON.stringify(after.snapshot)===before,
      viewport.width+'px: zoom leaves state/physics/math unchanged');
    check(Math.abs(after.stats.zoom-0.60)<0.001,
      viewport.width+'px: live 60% camera zoom registered');
    const buttonsAfter=await page.locator('.choice').first().boundingBox();
    check(Boolean(buttonsBefore&&buttonsAfter&&
      Math.abs(buttonsAfter.x-buttonsBefore.x)>3),
      viewport.width+'px: real DOM buttons follow camera projection');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px: no horizontal overflow');
    check(errors.length===0,
      viewport.width+'px: no JS errors');

    await page.screenshot({
      path:join(dir,'camera-zoom-'+viewport.width+'.png'),
      fullPage:true,
    });
    await page.close();
  }

  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.snapshot));
  await page.locator('#tuningPanel summary').click();
  await page.locator('.dev-controls summary').click();
  await page.locator('#mode').selectOption('practice');
  await page.locator('#circuitSpeedPerTick').fill('32');
  await page.locator('#hopTicks').fill('24');
  await page.locator('#returnTicks').fill('22');
  await page.locator('#speedPursuit').fill('6.5');
  await page.locator('#nearSenseRadius').fill('410');
  await page.locator('#speedSearch').fill('4.8');
  await page.locator('#landingGraceTicks').fill('20');
  await page.locator('#routeTurns').selectOption('10');
  await page.locator('#applyTuning').click();
  const exported=await page.evaluate(()=>window.__CC2_02A__.replay());
  check(exported.learnerMotion.circuitSpeedPerTick===32 &&
    exported.learnerMotion.returnTicks===22,
    'applied Spark speed and return duration are inside authoritative replay');
  check(exported.pursuerPreset.speedPursuit===6.5 &&
    exported.pursuerPreset.nearSenseRadius===410 &&
    exported.pursuerPreset.speedSearch===4.8,
    'applied bot sensing, search and chase speeds use true engine presets');
  check(exported.config.routeTurns===10 &&
    exported.config.landingGraceTicks===20,
    'existing geometry and protection controls applied to run config');
  check((await page.locator('#labStatus').innerText()).includes('New run started'),
    'user receives explicit new-run confirmation');

  const start=await page.evaluate(()=>window.__CC2_02A__.snapshot());
  const actual=await page.evaluate(()=>{
    const api=window.__CC2_02A__;
    const first=api.snapshot().currentProblem;
    document.querySelector('button[data-platform-id="'+first.correctPlatformId+'"]').click();
    for(let n=0;n<500;n++){
      const state=api.snapshot();
      if(state.phase==='ready'||state.phase==='ended')return state;
      api.advanceForQA(1);
    }
    throw Error('TUNED_SPARK_TRAVEL_STALLED');
  });
  check(actual.completedRows===1,
    'real mathematical travel completes under customized learner motion');
  check(actual.solved[0].result===start.currentProblem.targetValue,
    'tuning cannot change mathematical correctness');

  await page.locator('#exportPreset').click();
  const json=await page.locator('#presetData').inputValue();
  const preset=JSON.parse(json);
  check(preset.schemaVersion==='cc2-dev-lab/v1' &&
    preset.pursuer.speedPursuit===6.5 && preset.learner.circuitSpeedPerTick===32,
    'exported JSON contains the versioned tunable fields');
  await page.locator('#speedPursuit').fill('2');
  await page.locator('#importPreset').click();
  const restored=await page.evaluate(()=>window.__CC2_02A__.replay());
  check(restored.pursuerPreset.speedPursuit===6.5,
    'preset import restores bot tuning and starts fresh run');

  const beforeInvalid=JSON.stringify(restored);
  await page.locator('#presetData').fill('{"schemaVersion":"wrong"}');
  await page.locator('#importPreset').click();
  const afterInvalid=JSON.stringify(await page.evaluate(()=>window.__CC2_02A__.replay()));
  check(afterInvalid===beforeInvalid,
    'malformed preset rejected without mutating current source run');
  check((await page.locator('#labStatus').getAttribute('data-error'))==='yes',
    'invalid preset visibly rejected');
  await page.locator('#resetTuning').click();
  const reset=await page.evaluate(()=>window.__CC2_02A__.replay());
  check(reset.pursuerPreset.speedPursuit===3.7 &&
    reset.learnerMotion.circuitSpeedPerTick===16,
    'reset restores original AI and learner baseline speed');
  await page.close();
  console.log('CC2-05A BROWSER PASS — '+checks+' assertions');
}finally{
  await browser.close();
  await server.stop();
}
