/**
 * CC2-09D long-run source ledger qualification.
 * Drives twelve actual correct answer selections, an earned Pulse and a
 * genuine physical capture. Never fabricates events or changes enemy logic.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

mkdirSync('cc2-09d-evidence',{recursive:true});
const server=await startDevServer({port:3211});
const browser=await chromium.launch({executablePath:findChromium(),args:LAUNCH_ARGS,headless:true});
const url=new URL('src/games/circuit-climb-2/devtools/cc2-09d.html?manual=1',server.url).toString();
const checks=[],trace=[];
function assert(condition,label,detail=''){
 checks.push({label,passed:Boolean(condition),detail});
 if(!condition)throw Error('CC2_09D_SPECIAL: '+label+' '+detail);
 console.log('PASS '+label+(detail?' '+detail:''));
}
async function page(){
 const p=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>Boolean(window.__CC2_09D__?.summary&&window.__CC2_02A__?.snapshot));
 await p.locator('#cc209c-enter').click();
 return {p,errors};
}
try{
 const {p,errors}=await page();
 for(let row=1;row<=12;row++){
  const start=await p.evaluate(()=>window.__CC2_02A__.snapshot());
  assert(start.phase==='ready','row '+row+' ready');
  assert(start.completedRows===row-1,'row '+row+' no fabricated solve');
  await p.locator('button.choice[data-platform-id="'+start.currentProblem.correctPlatformId+'"]').click();
  let done=false;
  for(let chunk=0;chunk<18;chunk++){
   const state=await p.evaluate(()=>window.__CC2_02A__.advanceForQA(16));
   if(state.phase==='ended')throw Error('UNEXPECTED_CAPTURE_BEFORE_ROW_'+row);
   if(state.completedRows===row){done=true;break;}
  }
  assert(done,'row '+row+' actually solved');
  await p.waitForTimeout(40);
  const snap=await p.evaluate(()=>({
   state:window.__CC2_02A__.snapshot(),
   features:window.__CC2_02A__.features(),
  }));
  trace.push({row,tick:snap.state.tick,stage:snap.features.stage,
   charge:snap.features.charge,nextModifier:snap.features.nextModifier});
  if(row===4){
   assert(snap.features.charge===4,'four earned rows charge Pulse');
   assert(snap.features.pulseAvailable,'grounded earned Pulse available');
   await p.locator('#pulse').click();
   await p.waitForTimeout(50);
   const events=await p.evaluate(()=>window.__CC2_02A__.featureEvents());
   assert(events.some(e=>e.type==='ABILITY_ACTIVATED'),'Pulse recorded in source event ledger');
  }
  if(row===6)assert(snap.features.charge>=2,'Capacitor grants genuine additional charge');
  if(row===12)assert(snap.features.stage===2,'stage 2 requires twelve real rows');
 }
 const evidence=await p.evaluate(()=>({
  core:window.__CC2_02A__.events(),
  feature:window.__CC2_02A__.featureEvents(),
  effects:window.__CC2_09D__.summary(),
  bot:window.__CC2_02A__.pursuer(),
  state:window.__CC2_02A__.snapshot(),
 }));
 assert(evidence.core.filter(e=>e.type==='ROW_COMPLETED').length===12,'12 source row completion events');
 assert(evidence.feature.some(e=>e.type==='CHARGE_GAINED'&&e.detail?.modifier==='CAPACITOR'),
  'real capacitor bonus at row six');
 assert(evidence.feature.filter(e=>e.type==='RELAY_CHAIN').length>=2,'real relay chain at rows eight and twelve');
 assert(evidence.feature.some(e=>e.type==='STAGE_REACHED'&&e.detail?.stage===2),'real stage milestone');
 assert(evidence.effects.styles.capacitor>=1,'VFX observes capacitor');
 assert(evidence.effects.styles.relay>=2,'VFX observes both relays');
 assert(evidence.effects.styles.stage>=1,'VFX observes stage');
 assert(evidence.effects.styles.pulse+evidence.effects.styles.pulseMiss>=1,'VFX observes earned Pulse');
 assert(evidence.bot.routeFailures===0,'Pursuer navigation intact over twelve-row run');
 assert(errors.length===0&&evidence.effects.errors===0,'no render or script errors');
 await p.screenshot({path:'cc2-09d-evidence/09D-twelve-rows-special-events-390.png',fullPage:true});
 await p.close();

 const {p:capturedPage,errors:captureErrors}=await page();
 const correct=await capturedPage.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
 await capturedPage.locator('button.choice[data-platform-id="'+correct+'"]').click();
 await capturedPage.evaluate(()=>window.__CC2_02A__.advanceForQA(80));
 let captured=null;
 for(const ticks of [100,200,400,600,800,1600]){
  const state=await capturedPage.evaluate((n)=>window.__CC2_02A__.advanceForQA(n),ticks);
  await capturedPage.waitForTimeout(40);
  if(state.phase==='ended'){captured=state;break;}
 }
 assert(captured?.endReason==='CAPTURED','actual finite-sensing Pursuer catches idle Spark');
 const finale=await capturedPage.evaluate(()=>window.__CC2_09D__.summary());
 assert(finale.outcome==='capture'&&finale.styles.capture>=1,
  'real capture receives capture-only finale');
 assert(captureErrors.length===0&&finale.errors===0,'capture has no renderer errors');
 await capturedPage.screenshot({path:'cc2-09d-evidence/09D-real-capture-390.png',fullPage:true});
 await capturedPage.close();
 writeFileSync('cc2-09d-evidence/special-events-qualification.json',
  JSON.stringify({schema:'cc2-09d-real-event-qa/v1',checks,
   twelveRowTrace:trace,actualCaptureTick:captured.tick,
   visualCounts:evidence.effects.styles,sourceEventCounts:{
    core:evidence.core.length,feature:evidence.feature.length}},null,2));
 console.log('CC2-09D real special events and capture PASS '+checks.length+' assertions');
}finally{await browser.close();await server.stop();}
