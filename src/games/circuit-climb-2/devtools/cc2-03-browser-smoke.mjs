/**
 * CC2-03 real Chromium gameplay qualification.
 * Tests an actual source-owned CC2-03 world, never a mock Charge/Pulse UI.
 *
 * Manual QA mode suppresses only wall-clock tick scheduling; the same
 * deterministic core, pursuer, event ledger and movement run in the browser.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  findChromium, LAUNCH_ARGS, startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-03-screenshots';mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3153});
let browser;let assertions=0;
const check=(value,message)=>{
  if(!value)throw Error('CC2-03 BROWSER FAIL: '+message);
  assertions++;console.log('PASS '+message);
};
const url=new URL(
  'src/games/circuit-climb-2/devtools/cc2-03.html?manual=1',
  server.url,
).toString();
async function shot(page,label){
  await page.screenshot({path:join(dir,label+'.png'),fullPage:true});
}
async function read(page){
  return page.evaluate(()=>({
    state:window.__CC2_02A__.snapshot(),
    bot:window.__CC2_02A__.pursuer(),
    features:window.__CC2_02A__.features(),
  }));
}
async function ready(page){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.features?.()));
  await page.waitForTimeout(300);
}
async function solveOne(page,expectedRow){
  const r=await page.evaluate(row=>{
    const ui=window.__CC2_02A__;
    const start=ui.snapshot();
    const id=start.currentProblem.correctPlatformId;
    const element=document.querySelector('button[data-platform-id="'+id+'"]');
    if(!element)throw Error('QA_MISSING_CORRECT_DOM_CHOICE');
    element.click();
    let steps=0;
    while(ui.snapshot().completedRows<row&&steps++<240){
      ui.advanceForQA(1);
      if(ui.snapshot().endReason)break;
    }
    return {completed:ui.snapshot().completedRows,
      endReason:ui.snapshot().endReason,
      ticks:steps,features:ui.features()};
  },expectedRow);
  check(r.completed===expectedRow,
    'landed row '+expectedRow+' (no capture, actual core ticks '+r.ticks+')');
  await page.waitForTimeout(170); // camera catches up, not game simulation
  return r;
}
try{
  browser=await chromium.launch({
    headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
  });
  for(const spec of [
    {width:320,height:568},
    {width:390,height:844},
    {width:768,height:1024},
  ]){
    const page=await browser.newPage({viewport:spec});
    const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
    await ready(page);
    const start=await read(page);
    check(start.features.charge===0 && start.features.nextModifier==='NORMAL',
      spec.width+'px: initial row has no charge and neutral modifier');
    check(await page.locator('#pulse').isDisabled(),
      spec.width+'px: Pulse is unavailable without earned energy');
    check(await page.locator('.choice[data-modifier="NORMAL"]').count()===3,
      spec.width+'px: all three choices share the same modifier');
    check((await page.locator('#energy').innerText()).includes('0/4'),
      spec.width+'px: source-owned charge displayed');
    check((await page.locator('#cellProgress').innerText()).includes('0/4 powered'),
      spec.width+'px: visible four-row progress indicator');
    check(await page.locator('#rowKind').innerText()==='STAGE 1 · NORMAL ROW',
      spec.width+'px: initial stage and modifier clearly labelled');
    const size=await page.locator('#pulse').boundingBox();
    check(Boolean(size&&size.height>=43.9&&size.width>=70),
      spec.width+'px: pulse touch control is finger-sized');
    const width=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    check(width<=1,spec.width+'px: no horizontal overflow');
    const controls=await page.locator('#pause').boundingBox();
    console.log('CC2-03 LAYOUT',JSON.stringify({
      viewport:spec,controlBottom:controls?controls.y+controls.height:null,
    }));
    check(Boolean(controls&&controls.y+controls.height<=spec.height+1),
      spec.width+'px: game actions inside first viewport');
    await shot(page,'start-'+spec.width);
    check(pageErrors.length===0,spec.width+'px: no uncaught exceptions');
    await page.close();
  }

  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await ready(page);
  for(let row=1;row<=4;row++){
    await solveOne(page,row);
    const features=(await read(page)).features;
    check(features.charge===row,
      'row '+row+' gained exactly one real charge');
  }
  check(await page.locator('#pulse').isEnabled(),
    'Pulse becomes available at exactly four correct landings');
  const cell=await page.locator('#cellProgress').innerText();
  check(cell.includes('CELL 2')&&cell.includes('0/4 powered'),
    'four landed rows advance to next cell and reset its visible indicators');
  await shot(page,'four-landings-pulse-ready-390');
  const prior=await read(page);
  const rangeLabel=prior.features.targetInRange?'IN RANGE':'OUT OF RANGE';
  check((await page.locator('#pulse').innerText()).includes(rangeLabel),
    'Pulse button previews physical target range before spending charge');
  check((await page.locator('#energy').innerText()).includes('BOT '+rangeLabel),
    'energy HUD shows whether the pursuer is within configured Pulse radius');
  const pulse=await page.locator('#pulse').click();
  const after=await read(page);
  check(after.features.charge===0,'Pulse spends all four earned units');
  const activated=after.features.events.findLast(e=>e.type==='ABILITY_ACTIVATED');
  check(Boolean(activated &&
      activated.detail.affected===prior.features.targetInRange),
    'activation truth exactly matches the pre-spend physical range indicator');
  check((await page.locator('#pulse').innerText()).includes('active'),
    'Pulse control exposes effect duration after activation');
  check(after.features.events.some(x=>x.type==='ABILITY_ACTIVATED'),
    'source-owned Pulse activation event emitted');
  check(after.state.attempts===prior.state.attempts,
    'Pulse never creates a math attempt');
  check(await page.locator('#pulse').isDisabled(),
    'a spent Pulse cannot fire again without recharge');
  await shot(page,'pulse-activated-390');

  await solveOne(page,5);
  check((await read(page)).features.nextModifier==='CAPACITOR',
    'row six is authored as a Capacitor row');
  const row6Styles=await page.locator('.choice').evaluateAll(els=>
    els.map(el=>el.dataset.modifier));
  check(row6Styles.length===3&&row6Styles.every(x=>x==='CAPACITOR'),
    'Capacitor motif is identical on all three options');
  await shot(page,'capacitor-all-options-390');
  await solveOne(page,6);
  check((await read(page)).features.charge===3,
    'Capacitor correct landing gives +2 rather than +1');
  await solveOne(page,7);
  const row8=await read(page);
  check(row8.features.nextModifier==='RELAY','row eight is authored as Relay');
  check((await page.locator('.choice[data-modifier="RELAY"]').count())===3,
    'all three choices show equal Relay markings');
  await shot(page,'relay-all-options-390');
  await solveOne(page,8);
  const relay=await read(page);
  check(relay.features.events.some(e=>e.type==='RELAY_CHAIN'&&e.detail.row===8),
    'Relay emits an explicit visual-only milestone');
  check((await page.locator('#cellProgress').innerText()).includes('CELL 3'),
    'two completed four-row cells visibly advance cell number');
  await shot(page,'relay-solved-wave-390');

  for(let row=9;row<=12;row++)await solveOne(page,row);
  const stageTwo=await read(page);
  check(stageTwo.features.stage===2,
    'stage progresses only after exactly twelve completed rows');
  check(stageTwo.features.events.filter(e=>e.type==='STAGE_REACHED').length===1,
    'stage milestone is emitted exactly once');
  check((await page.locator('#rowKind').innerText()).includes('STAGE 2'),
    'stage two is visible to player');
  check((await page.locator('#cellProgress').innerText()).includes('CELL 4'),
    'fourth power cell becomes visibly active after three completed cells');
  await shot(page,'stage-two-390');
  check(errors.length===0,'real gameplay rendered without browser exception');
  console.log('CC2-03 BROWSER PASS — '+assertions+' assertions');
  await page.close();
}finally{
  if(browser)await browser.close();
  await server.stop();
}
