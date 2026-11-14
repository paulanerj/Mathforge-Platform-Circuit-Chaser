/**
 * CC2-09D browser matrix. Tests exact source-fed game and read-only animation.
 * No event fabrication, no AI knobs, no mathematical shortcuts.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-09d-evidence';mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3209});
const browser=await chromium.launch({executablePath:findChromium(),args:LAUNCH_ARGS,headless:true});
const sizes=[[320,568],[390,844],[428,926],[768,1024],[826,680]];
const checks=[],failures=[];
const check=(name,ok,detail='')=>{
 checks.push({name,ok,detail});
 if(!ok)failures.push({name,detail});
 console.log((ok?'PASS ':'FAIL ')+name+' '+detail);
};
const base=new URL('src/games/circuit-climb-2/devtools/cc2-09d.html?manual=1',server.url).toString();
const run=async(width,height,{reduced=false}={})=>{
 const page=await browser.newPage({viewport:{width,height},acceptDownloads:true,
  reducedMotion:reduced?'reduce':'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__CC2_09D__?.summary&&
  window.__CC2_09C__?.summary&&window.__CC2_02A__?.snapshot,
  null,{timeout:18000});
 await page.waitForTimeout(140);
 const initial=await page.evaluate(()=>{
  const a=window.__CC2_02A__,s=a.snapshot(),v=window.__CC2_09D__.summary();
  const r=a.replay();
  return{tick:s.tick,gap:s.world.geometry.rowGap,
   chase:r.pursuerPreset.speedPursuit,search:r.pursuerPreset.speedSearch,
   spark:r.learnerMotion.circuitSpeedPerTick,
   digest:a.sessionReport().stateDigest,
   visuals:v,sourceErrors:window.__CC2_09B__.summary().errors,
   sourceRouteFailures:a.pursuer().routeFailures,
   intro:!document.querySelector('#cc209c-intro').hidden};
 });
 check(width+' preselection sim frozen',initial.tick===0&&initial.intro);
 check(width+' physical 2.8125x spacing',initial.gap===576.5625);
 check(width+' immutable experimental speeds',
  initial.spark===24&&initial.search===4.8&&initial.chase===6);
 check(width+' finite bot route initially safe',initial.sourceRouteFailures===0);
 check(width+' read-only effects/errors',initial.visuals.errors===0&&initial.sourceErrors===0);
 check(width+' new visual canvas mounted',
  await page.locator('#cc209d-effects').count()===1);
 check(width+' no horizontal overflow',
  await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width===390)await page.screenshot({path:join(dir,'09D-intro-390.png'),fullPage:true});
 await page.locator('#cc209c-enter').click();
 await page.waitForTimeout(220);
 const afterEnter=await page.evaluate(()=>({
  tick:window.__CC2_02A__.snapshot().tick,
  digest:window.__CC2_02A__.sessionReport().stateDigest,
  frame:window.__CC2_09D__.summary(),
 }));
 check(width+' intro does not advance AI',afterEnter.tick===0&&afterEnter.digest===initial.digest);
 check(width+' one authentic target reveal',afterEnter.frame.styles.targetReveal===1);
 check(width+' target reveal phase observed',
  ['dominant-enter','dominant-hold','receding','resting'].includes(afterEnter.frame.phase));
 if(width===390){
  await page.screenshot({path:join(dir,'09D-target-reveal-390.png'),fullPage:true});
  await page.waitForTimeout(1480);
  const phase=await page.evaluate(()=>window.__CC2_09D__.summary().phase);
  check('390 target choreography resolves to resting',phase==='resting');
  await page.screenshot({path:join(dir,'09D-target-rest-390.png'),fullPage:true});
 }
 const correct=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
 await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
 check(width+' actual first platform starts chase',
  await page.evaluate(()=>window.__cc2ChaseStarted===true));
 await page.evaluate(()=>window.__CC2_02A__.advanceForQA(170));
 await page.waitForTimeout(130);
 const after=await page.evaluate(()=>{
  const a=window.__CC2_02A__,s=a.snapshot(),v=window.__CC2_09D__.summary();
  return{tick:s.tick,rows:s.completedRows,solved:s.solved.length,
   core:a.events().filter(e=>e.type==='ROW_COMPLETED').length,
   effects:v,routeFailures:a.pursuer().routeFailures,
   legacyError:window.__CC2_09B__.summary().errors,
   visualError:window.__CC2_09C__.summary().errors};
 });
 check(width+' correct landing source-authoritative',
  after.rows>=1&&after.solved>=1&&after.core>=1);
 check(width+' event-driven correct effect counted',
  after.effects.styles.correct>=1);
 check(width+' no Pursuer route failures',after.routeFailures===0);
 check(width+' all three visual observers error free',
  after.effects.errors===0&&after.legacyError===0&&after.visualError===0);
 const nowDigest=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
 await page.waitForTimeout(125);
 const againDigest=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
 check(width+' animation has no source ledger effect',nowDigest===againDigest);
 if(width===390){
  await page.screenshot({path:join(dir,'09D-landing-390.png'),fullPage:true});
 }
 // The only supported synthetic test end is a real user action. The adapter
 // must NOT call an ending helper, fake a capture, or unlock an achievement.
 await page.evaluate(()=>document.getElementById('endRun').click());
 await page.waitForFunction(()=>window.__CC2_09D__.summary().outcome==='quit',
  null,{timeout:6000});
 check(width+' legitimate quit is not a victory',
  await page.evaluate(()=>window.__CC2_09D__.summary().outcome==='quit'));
 check(width+' true end reason persisted',
  await page.evaluate(()=>window.__CC2_02A__.snapshot().endReason!=='CAPTURED'));
 if(width===390){
  await page.screenshot({path:join(dir,'09D-final-transition-390.png'),fullPage:true});
  const legible=await page.evaluate(()=>{
   const text=document.querySelector('#cc209-end-head');
   const card=document.querySelector('.cc209-preend-inner');
   const pill=document.querySelector('#cc209d-final-meta span');
   return Boolean(text&&card&&pill&&getComputedStyle(text).color!=='rgb(255, 255, 255)' &&
    getComputedStyle(card).opacity==='1' &&
    getComputedStyle(card).animationName==='none' &&
    getComputedStyle(card).backgroundColor==='rgb(255, 255, 255)');
  });
  check('390 finale has visible outcome-specific stats',legible);
 }
 await page.locator('#summaryPanel').waitFor({state:'visible',timeout:7000});
 check(width+' actual summary remains available',
  await page.locator('#summaryEquations').count()===1);
 check(width+' no script errors',errors.length===0,errors.slice(0,2).join(' | '));
 if(width===390)await page.screenshot({path:join(dir,'09D-summary-390.png'),fullPage:true});
 await page.close();
};
try{
 for(const [width,height]of sizes)
  await run(width,height,{reduced:width===320});
 const reduced=checks.find(c=>c.name==='320 one authentic target reveal');
 check('reduced-motion case exercised',Boolean(reduced?.ok));
 writeFileSync(join(dir,'qualification.json'),JSON.stringify({
  schema:'cc2-09d-visual-qualification/v1',checks,failures,
  testedViewports:sizes,source:'real game and event ledger',
 },null,2));
 if(failures.length)throw Error('CC2_09D_VISUAL_QUALIFICATION_FAILED: '+JSON.stringify(failures));
 console.log('CC2-09D visual/chase/finale matrix PASS '+checks.length+' assertions');
}finally{
 await browser.close();await server.stop();
}
