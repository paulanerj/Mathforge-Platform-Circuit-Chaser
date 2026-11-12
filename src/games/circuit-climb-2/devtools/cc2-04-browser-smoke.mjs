/**
 * CC2-04 real Chromium proof: badges and end-of-run review from the exact
 * source-owned game engine (not a mock list of equations).
 */
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {
  findChromium,LAUNCH_ARGS,startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-04-screenshots';mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3166});
let browser,passes=0;
const check=(value,label)=>{
  if(!value)throw Error('CC2-04 BROWSER FAIL: '+label);
  passes++;console.log('PASS '+label);
};
const url=new URL(
  'src/games/circuit-climb-2/devtools/cc2-04.html?manual=1',
  server.url,
).toString();
async function shot(page,name){
  await page.screenshot({path:join(dir,name+'.png'),fullPage:true});
}
async function begin(page,mode='practice'){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.summary));
  await page.locator('.dev-controls summary').click();
  await page.locator('#mode').selectOption(mode);
  await page.waitForFunction(expected=>
    window.__CC2_02A__?.snapshot()?.phase==='ready',null,{timeout:8000});
}
async function act(page,platformId){
  return page.evaluate(id=>{
    const api=window.__CC2_02A__;
    const el=document.querySelector('button[data-platform-id="'+id+'"]');
    if(!el)throw Error('NO_ACTUAL_CHOICE_BUTTON');
    el.click();
    return api.snapshot();
  },platformId);
}
async function travelToReady(page){
  return page.evaluate(()=>{
    const api=window.__CC2_02A__;
    for(let i=0;i<300;i++){
      const s=api.snapshot();
      if(s.phase==='ready'||s.phase==='ended')return s;
      api.advanceForQA(1);
    }
    throw Error('CC2_04_TRAVEL_STALLED');
  });
}
async function solve(page,row){
  const before=await page.evaluate(()=>window.__CC2_02A__.snapshot());
  await act(page,before.currentProblem.correctPlatformId);
  await travelToReady(page);
  const result=await page.evaluate(()=>window.__CC2_02A__.snapshot());
  check(result.completedRows===row,'source core landed row '+row);
  return result;
}
async function modeSwitch(page,mode){
  await page.locator('.dev-controls summary').click();
  await page.locator('#mode').selectOption(mode);
}
try{
  browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
  for(const screen of [
    {width:320,height:568},{width:390,height:844},{width:768,height:1024},
  ]){
    const page=await browser.newPage({viewport:screen});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await begin(page,'practice');
    check(await page.locator('#summaryPanel').isHidden(),
      screen.width+'px: summary hidden during play');
    check((await page.locator('#modeBadge').innerText())==='PRACTICE',
      screen.width+'px: mode badge visible');
    const c=await page.locator('#pause').boundingBox();
    check(Boolean(c&&c.y+c.height<=screen.height+1),
      screen.width+'px: Pause control visible without scrolling');
    check((await page.locator('.choice').count())===3,
      screen.width+'px: real source-owned options present');
    await shot(page,'practice-start-'+screen.width);
    check(errors.length===0,screen.width+'px: no browser errors');
    await page.close();
  }

  const perfect=await browser.newPage({viewport:{width:390,height:844}});
  await begin(perfect,'practice');
  for(let row=1;row<=4;row++)await solve(perfect,row);
  const done=await perfect.evaluate(()=>window.__CC2_02A__.summary());
  check(done.ended&&done.endReason==='PRACTICE_GOAL',
    'practice ends at source-owned four-row goal');
  check(done.equations.length===4 && done.attempts===4,
    'review has four landed equations and four accepted choices');
  check(done.achievements.some(a=>a.id==='FIRST_CELL')&&
    done.achievements.some(a=>a.id==='PERFECT_CELL'),
    'first and perfect power cell have verified badges');
  check(await perfect.locator('#summaryPanel').isVisible(),
    'terminal state automatically opens accessible summary dialog');
  check(await perfect.locator('#summaryEquations li').count()===4,
    'visible equation list contains only four landed correct equations');
  check((await perfect.locator('#summaryOutcome').innerText()).includes('Practice'),
    'practice outcome visibly labelled');
  await shot(perfect,'practice-four-perfect-390');
  await perfect.locator('#summaryClose').click();
  check(await perfect.locator('#summaryPanel').isHidden(),
    'summary can close without restarting');
  await perfect.locator('#reviewSummary').click();
  check(await perfect.locator('#summaryPanel').isVisible(),
    'summary can reopen from developer controls');
  await perfect.locator('#summaryRestart').click();
  check((await perfect.evaluate(()=>window.__CC2_02A__.summary())).rowsSolved===0,
    'restart has independent empty current-run ledger');
  check(await perfect.locator('#summaryPanel').isHidden(),
    'restart closes previous result');
  await perfect.close();

  const imperfect=await browser.newPage({viewport:{width:390,height:844}});
  await begin(imperfect,'practice');
  const first=await imperfect.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem);
  const wrong=first.options.find(option=>option.platformId!==first.correctPlatformId);
  await act(imperfect,wrong.platformId);
  await travelToReady(imperfect);
  for(let row=1;row<=4;row++)await solve(imperfect,row);
  const report=await imperfect.evaluate(()=>window.__CC2_02A__.summary());
  check(report.equations.length===4&&report.wrongAttempts===1,
    'wrong choice increases attempts but not solved equation list');
  check(report.accuracyPercent===80,
    'choice accuracy is based on five real accepted decisions');
  check(!report.achievements.some(a=>a.id==='PERFECT_CELL'),
    'wrong accepted answer prevents Clean Current badge');
  check(await imperfect.locator('#summaryEquations li').count()===4,
    'no incorrect answer leaked into visible solved review');
  await shot(imperfect,'practice-imperfect-390');
  await imperfect.close();

  const challenge=await browser.newPage({viewport:{width:428,height:926}});
  await begin(challenge,'challenge');
  for(let row=1;row<=12;row++)await solve(challenge,row);
  const report2=await challenge.evaluate(()=>window.__CC2_02A__.summary());
  check(report2.ended&&report2.endReason==='CHALLENGE_GOAL',
    'challenge completes only at actual 12-row terminal goal');
  check(report2.achievements.some(a=>a.id==='THREE_CELLS')&&
    report2.achievements.some(a=>a.id==='BEAT_CHALLENGE'),
    'twelve-row completion unlocks both authored milestone badges');
  check(await challenge.locator('#summaryEquations li').count()===12,
    'twelve source-landed equations are visible for review');
  await shot(challenge,'challenge-twelve-428');
  await challenge.close();

  const quit=await browser.newPage({viewport:{width:390,height:844}});
  await begin(quit,'climb');
  const p=await quit.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem);
  await act(quit,p.correctPlatformId);
  await quit.evaluate(()=>window.__CC2_02A__.advanceForQA(1));
  await quit.locator('#endRun').click();
  const aborted=await quit.evaluate(()=>window.__CC2_02A__.summary());
  check(aborted.endReason==='QUIT'&&aborted.correctAttempts===1,
    'accepted answer remains counted when the run is quit during travel');
  check(aborted.equations.length===0&&aborted.rowsSolved===0,
    'unfinished correct travel never appears as a solved equation');
  check((await quit.locator('#summaryEquations').innerText()).includes('No completed'),
    'empty solved list is explained clearly');
  await shot(quit,'quit-in-transit-390');
  await quit.close();

  console.log('CC2-04 BROWSER PASS — '+passes+' assertions');
}finally{
  if(browser)await browser.close();
  await server.stop();
}
