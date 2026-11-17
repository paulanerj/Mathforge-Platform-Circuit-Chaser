/**
 * CC2-MAINT-31 — actual standalone startup, controls, and session integrity.
 *
 * Purpose: catch recurring owner blocker "I press Play/Start and nothing
 * happens." All browser checks use the exact published dist/cc2-30.html,
 * not Vite modules or synthetic source-controller calls. A passing splash
 * dismissal alone is NOT considered a working game.
 *
 * Coverage:
 *  - 320px phone, 390px phone, 768px tablet and renamed local HTML
 *  - intro button -> visible board -> genuine choice pointer -> source
 *    receipt -> continuous Spark + Pursuer ticks -> correct landing
 *  - Help and Settings are usable; pause stops the actual clock; resume
 *    restarts it; new run resets the authoritative accounting
 *  - creature unlock -> micro-math -> source-owned 0.50 blanket
 *  - visible Heritage future tiers and no HTML source leakage
 *  - failure screenshots and structured evidence for all assertions
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store'});res.end(html);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
});
const folder='cc2-maint-31-evidence';
mkdirSync(folder,{recursive:true});
const assertions=[],fatal=[];
function check(ok,name,detail={}){
  assertions.push({ok:!!ok,name,detail});
  if(!ok)throw Error('CC2_MAINT_31_FAIL '+name+' '+JSON.stringify(detail));
  console.log('PASS CC2_MAINT_31 '+name);
}
const state=async page=>page.evaluate(()=>{
  const a=window.__CC2_02A__,s=a?.snapshot?.();
  return {phase:s?.phase,tick:s?.tick,attempts:s?.attempts,
    rows:s?.completedRows,score:s?.score,spark:s?.spark,
    correct:s?.currentProblem?.correctPlatformId,
    digest:a?.sessionReport?.()?.stateDigest,
    source:a?.creature?.(),future:window.__CC2_09B__?.summary?.()?.futureTiers,
    started:window.__cc2ChaseStarted,
    hiddenIntro:document.getElementById('cc209c-intro')?.hidden,
    boardVisibility:getComputedStyle(document.getElementById('board')).visibility,
    pauseDisabled:document.getElementById('pause')?.disabled,
    pauseLabel:document.getElementById('pause')?.textContent,
    params:Object.fromEntries(new URLSearchParams(location.search)),
    visibleChoices:[...document.querySelectorAll('button.choice')]
      .filter(el=>getComputedStyle(el).visibility!=='hidden').length,
    spill:/(?:vfxIntensity|Math\.sin\(t\.tick|\.beginPath\(\))/
      .test(document.body.innerText),
  };
});
async function capture(page,name){
  await page.screenshot({path:folder+'/'+name+'.png',
    animations:'disabled',fullPage:true}).catch(()=>{});
}
async function launch(page){
  const issues=[];
  page.on('pageerror',e=>issues.push(String(e)));
  page.on('console',m=>{
    if(m.type()==='error')issues.push('console: '+m.text());
  });
  return issues;
}
try{
  for(const [width,height] of [[320,700],[390,844],[768,1024]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=await launch(page);
    try{
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
        window.__CC2_09B__?.summary?.()?.frames>3,null,{timeout:16000});
      const intro=await state(page);
      check(intro.hiddenIntro===false&&intro.tick===0 &&
        intro.visibleChoices===3,
        'intro loads real three-choice source '+width,intro);
      const help=page.locator('#cc209c-intro-help');
      check(await help.isVisible()&&await help.isEnabled(),
        'help is reachable on intro '+width);
      await help.click();
      check(await page.locator('#cc209-help').isVisible()&&
        await page.locator('#cc209c-intro').isHidden(),
        'Help works before first choice '+width);
      await page.locator('#cc209-help [data-close]').click();
      await page.waitForFunction(()=>
        document.getElementById('cc209-help').hidden);
      const entered=await state(page);
      check(entered.hiddenIntro===true&&entered.boardVisibility==='visible',
        'intro exit exposes visible active board '+width,entered);
      // Opening Help is one entry route. The normal "View tower" click
      // remains tested separately below on a fresh page.
      await page.locator('#cc209-settings-btn').click();
      check(await page.locator('#cc209-settings').isVisible(),
        'Settings opens on active board '+width);
      await page.locator('#cc209-settings [data-close]').click();
      check(await page.locator('#cc209-settings').isHidden(),
        'Settings closes without a frozen overlay '+width);
      const s0=await state(page);
      check(s0.started===false&&s0.rows===0&&
        s0.params.cc230==='1'&&s0.params.cc2Flow==='1',
        'no false gameplay start or missing preview flags '+width,s0);
      const choice=page.locator('button.choice[data-platform-id="'+s0.correct+'"]');
      await choice.waitFor({state:'visible',timeout:7000});
      const hit=await choice.evaluate(el=>{
        const b=el.getBoundingClientRect();
        const t=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
        return t===el||el.contains(t);
      });
      check(hit,'actual pointer reaches mathematical choice '+width);
      await choice.click();
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>8&&
        window.__CC2_02A__.snapshot().attempts>=1,
        null,{timeout:8000});
      const running=await state(page);
      check(running.started===true&&running.tick>8&&
        running.attempts===1&&running.pauseDisabled===false,
        'first actual choice STARTS moving chase '+width,running);
      check(Math.hypot(running.spark.x-s0.spark.x,
        running.spark.y-s0.spark.y)>1,
        'Spark makes nonzero movement after player tap '+width,running);
      // Pausing must freeze source tick, not merely grey out a button.
      await page.locator('#pause').click();
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().paused,
        null,{timeout:3000});
      const pausing=await state(page);
      await page.waitForTimeout(350);
      const paused=await state(page);
      check(paused.tick===pausing.tick,
        'Pause stops simulation clock '+width,{pausing,paused});
      const resume=page.locator('#cc209c-resume');
      if(await resume.isVisible())await resume.click();
      else await page.locator('#pause').click();
      await page.waitForFunction(()=>
        !window.__CC2_02A__.snapshot().paused&&
        window.__CC2_02A__.snapshot().tick>paused.tick+3,
        null,{timeout:6500});
      check((await state(page)).tick>paused.tick+3,
        'Resume restarts simulation clock '+width);
      await page.waitForFunction(()=>
        window.__CC2_02A__.snapshot().completedRows>=1,
        null,{timeout:17000});
      const landed=await state(page);
      check(landed.rows===1&&landed.score>0,
        'source math success reaches actual next row '+width,landed);
      await page.waitForFunction(()=>
        window.__CC2_30__?.presentation?.creatureVisible,
        null,{timeout:9000});
      check(await page.locator('.cc230-creature').isVisible(),
        'Green Guardian is physically visible after first climb '+width);
      await page.locator('.cc230-creature').click();
      await page.waitForFunction(()=>
        window.__CC2_02A__.creature()?.question,
        null,{timeout:5000});
      const q=await page.evaluate(()=>window.__CC2_02A__.creature().question);
      const result=q.sequence[2]+q.sequence[1]-q.sequence[0];
      await page.locator('.cc230-answer').filter({hasText:String(result)}).click();
      const charged=await state(page);
      check(charged.source.activeField?.coverage==='BELOW_PLATFORM'&&
        charged.source.fieldMultiplier===.5&&charged.rows===1,
        'real gate earns bot-only molasses with no fake row credit '+width,charged);
      check(charged.future?.cells>=6,
        'visible Heritage future structures survive gameplay '+width,
        charged.future);
      await capture(page,'width-'+width+'-molasses');
      await page.locator('#restart').click();
      await page.waitForFunction(()=>
        window.__CC2_02A__.snapshot().completedRows===0&&
        window.__CC2_02A__.snapshot().tick===0,
        null,{timeout:6000});
      const restarted=await state(page);
      check(restarted.rows===0&&restarted.tick===0&&
        restarted.source.activeField===null&&
        restarted.started===false,
        'New Run completely resets board, chase and Guardian field '+width,
        restarted);
      check(errors.length===0&&!restarted.spill,
        'no errors or visible script spill during full lifecycle '+width,
        {errors,spill:restarted.spill});
    }catch(error){
      fatal.push({width,error:String(error)});
      await capture(page,'FAIL-width-'+width);
      throw error;
    }finally{await page.close();}
  }
  // Normal intro button, not only the alternative Help route.
  const first=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await first.goto(base,{waitUntil:'domcontentloaded'});
    const button=first.locator('#cc209c-enter');
    check(await button.isVisible()&&await button.isEnabled(),
      'View tower/Start button physically present and enabled');
    const before=await state(first);
    await button.click();
    const after=await state(first);
    check(before.hiddenIntro===false&&after.hiddenIntro===true&&
      after.boardVisibility==='visible'&&after.visibleChoices===3,
      'actual intro button reveals interactive numbered board',
      {before,after});
  }finally{await first.close();}
  // Direct file:// smoke. Browser file URLs can load self-contained HTML,
  // but iOS ChatGPT/Files previews may block JS; hosted HTTPS remains required.
  const offline=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await offline.goto(pathToFileURL(resolve('dist/cc2-30.html')).href,
      {waitUntil:'domcontentloaded'});
    await offline.waitForFunction(()=>window.__CC2_02A__?.snapshot?.(),
      null,{timeout:12000});
    await offline.locator('#cc209c-enter').click();
    check(await offline.locator('button.choice').count()===3,
      'direct local HTML loads standalone source in Chromium');
  }finally{await offline.close();}
}finally{
  writeFileSync(folder+'/maintenance-report.json',
    JSON.stringify({schema:'cc2-maint-31/v1',assertions,fatal},null,2));
  await browser.close();
  await new Promise(done=>server.close(done));
}
