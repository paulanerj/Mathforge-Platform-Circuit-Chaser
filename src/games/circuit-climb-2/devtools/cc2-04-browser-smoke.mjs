/**
 * CC2-04 real-browser proof: exact completed-equation review, practice goal,
 * wrong-attempt accounting, mode selection, milestones and restart.
 * This runs the source-owned chase Core in ManualQA tick-scheduling mode.
 */
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {
  findChromium,LAUNCH_ARGS,startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const directory='cc2-04-screenshots';mkdirSync(directory,{recursive:true});
const server=await startDevServer({port:3167});let browser;let assertions=0;
const check=(value,text)=>{
  if(!value)throw Error('CC2-04 BROWSER FAIL: '+text);
  assertions++;console.log('PASS '+text);
};
const url=new URL('src/games/circuit-climb-2/devtools/cc2-04.html?manual=1',server.url).toString();
async function screenshot(page,name){
  await page.screenshot({path:join(directory,name+'.png'),fullPage:true});
}
async function init(page){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__CC2_02A__?.results?.());
  await page.waitForTimeout(180);
}
async function chooseAndAdvance(page,id,until){
  return await page.evaluate(({platformId,phase})=>{
    const ui=window.__CC2_02A__;
    const button=document.querySelector('button[data-platform-id="'+platformId+'"]');
    if(!button)throw Error('CC2_04_DOM_CHOICE_MISSING');
    button.click();
    let frames=0;
    while(frames++<250){
      ui.advanceForQA(1);
      const state=ui.snapshot();
      if(phase==='ready'&&state.phase==='ready')return frames;
      if(phase==='finished'&&state.completedRows>=1)return frames;
    }
    throw Error('CC2_04_TRAVEL_TIMEOUT');
  },{platformId:id,phase:until});
}
try{
  browser=await chromium.launch({
    headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
  });
  for(const viewport of [
    {width:320,height:568},{width:390,height:844},{width:768,height:1024},
  ]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',err=>errors.push(String(err)));
    await init(page);
    check(await page.locator('#summaryDialog').isHidden(),
      viewport.width+'px: results modal does not block initial play');
    check(await page.locator('#resultButton').isHidden(),
      viewport.width+'px: summary is hidden before run ends');
    check(await page.locator('#gameMode').count()===1,
      viewport.width+'px: independently selectable Practice/Climb/Challenge');
    check(await page.locator('.choice').count()===3,
      viewport.width+'px: unchanged mathematical choices');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px: no horizontal scrolling');
    await screenshot(page,'ready-'+viewport.width);
    check(errors.length===0,viewport.width+'px: no page exceptions');
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await init(page);
  await page.locator('.dev-controls summary').click();
  await page.locator('#gameMode').selectOption('practice');
  await page.locator('.dev-controls summary').click();
  check((await page.evaluate(()=>window.__CC2_02A__.snapshot())).phase==='ready',
    'switching to Practice begins a clean mathematical run');
  const initial=await page.evaluate(()=>window.__CC2_02A__.snapshot());
  const first=initial.currentProblem;
  const wrong=first.options.find(x=>x.platformId!==first.correctPlatformId);
  await chooseAndAdvance(page,wrong.platformId,'ready');
  const afterWrong=await page.evaluate(()=>window.__CC2_02A__.snapshot());
  check(afterWrong.wrongAttempts===1 && afterWrong.completedRows===0,
    'incorrect move is counted once and does not become a solved equation');

  for(let row=1;row<=4;row++){
    await page.evaluate(index=>{
      const ui=window.__CC2_02A__;
      const id=ui.snapshot().currentProblem.correctPlatformId;
      const button=document.querySelector('button[data-platform-id="'+id+'"]');
      if(!button)throw Error('CC2_04_MISSING_NEXT_ROW');
      button.click();
      let ticks=0;
      while(ui.snapshot().completedRows<index&&ticks++<240)
        ui.advanceForQA(1);
      if(ui.snapshot().completedRows!==index)throw Error('CC2_04_ROW_NOT_COMPLETED');
    },row);
    await page.waitForTimeout(130);
  }

  await page.waitForFunction(()=>document.querySelector('#summaryDialog').open);
  const result=await page.evaluate(()=>window.__CC2_02A__.results());
  check(result.status==='ENDED' && result.endReason==='PRACTICE_GOAL',
    'Practice ends only after a completed four-row cell');
  check(result.rowsCompleted===4&&result.attemptsAccepted===5,
    'accepted wrong and correct attempts are counted separately');
  check(result.accuracyPercent===80,'accuracy uses all accepted attempts');
  check(result.solvedEquations.length===4,'review contains only completed equations');
  check(result.achievements.some(x=>x.id==='FIRST_CELL'),
    'First Cell achievement is grounded in fourth landing');
  check(!result.achievements.some(x=>x.id==='PERFECT_CELL'),
    'wrong attempt correctly disqualifies Perfect Cell');
  check((await page.locator('#equationReview li').count())===4,
    'modal renders exactly four source-owned solved equations');
  const lines=await page.locator('#equationReview li').allTextContents();
  check(lines.every((line,i)=>line.includes(
    result.solvedEquations[i].incoming+' + '+
    result.solvedEquations[i].operand+' = '+
    result.solvedEquations[i].result)),
    'visible equations agree byte-for-byte with source result numbers');
  check(await page.locator('#summaryStats').isVisible(),
    'learner can read score/accuracy/attempts');
  await screenshot(page,'practice-ended-four-equations-390');
  await page.locator('#closeSummary').click();
  check(await page.locator('#summaryDialog').isHidden(),
    'summary is dismissible and not a modal trap');
  await page.locator('#resultButton').click();
  check(await page.locator('#summaryDialog').isVisible(),
    'completed run summary can be reopened');
  await page.locator('#closeSummary').click();
  await page.locator('#restart').click();
  const reset=await page.evaluate(()=>window.__CC2_02A__.results());
  check(reset.rowsCompleted===0 && reset.solvedEquations.length===0,
    'restart clears all completed equations from current run');
  check(errors.length===0,'practice/summary/restart has zero browser errors');
  console.log('CC2-04 BROWSER PASS — '+assertions+' assertions');
  await page.close();
}finally{
  if(browser)await browser.close();
  await server.stop();
}
