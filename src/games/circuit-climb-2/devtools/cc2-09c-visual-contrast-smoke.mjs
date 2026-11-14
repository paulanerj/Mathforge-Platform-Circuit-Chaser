/**
 * CC2-09C original-vs-modern surface screenshot and accessibility audit.
 *
 * Uses the real checked-in original React runtime and the source-integrated
 * CC2-09C entry. All source math and Pursuer logic stay unchanged.
 * The screenshots are visual evidence; no synthetic game results are claimed.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
import {modifierForRow,defaultFeatureConfig}
  from '../features/progression.ts';

const dir='cc2-09c-artifacts';
mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3203});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
});
let checks=0;
const failures=[];
const check=(good,name,detail='')=>{
  checks+=1;
  if(!good)failures.push(name+(detail?': '+detail:''));
  console.log((good?'PASS ':'FAIL ')+name+(detail?' '+detail:''));
};
const viewports=[
  {width:320,height:568},
  {width:390,height:844},
  {width:428,height:926},
  {width:768,height:1024},
  {width:826,height:680},
];
const contrastRecords=[];
const contrast=async(page,label,selector,bg,threshold=4.5)=>{
  const data=await page.evaluate(({selector,bg})=>{
    const el=document.querySelector(selector);
    if(!el)return {error:'selector missing '+selector};
    const s=getComputedStyle(el);
    const color=s.color;
    const parse=value=>{
      const m=value.match(/^#?([0-9a-f]{6})$/i);
      if(m){return [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16));}
      const a=value.match(/rgba?\(([^)]+)\)/);
      if(!a)return null;
      return a[1].split(',').slice(0,3).map(s=>Number(s.trim()));
    };
    const lum=rgb=>{
      const arr=rgb.map(c=>{
        const v=c/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
      });
      return arr[0]*.2126+arr[1]*.7152+arr[2]*.0722;
    };
    const a=parse(color),b=parse(bg);
    if(!a||!b)return {error:'cannot parse color '+color+' '+bg};
    const l1=lum(a),l2=lum(b);
    return {color,bg,ratio:Number(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2)),
      fontSize:s.fontSize,fontWeight:s.fontWeight};
  },{selector,bg});
  const record={label,selector,threshold,...data};
  contrastRecords.push(record);
  check(!data.error&&data.ratio>=threshold,'contrast '+label,
    (data.error||data.ratio+' : 1 '+data.color+' / '+bg));
  return data;
};
async function oldScreens(){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(server.url,{waitUntil:'networkidle'});
  const enter=page.locator('button:has-text("Circuit Climb")').first();
  await enter.waitFor({timeout:20000});await enter.click();
  await page.locator('#introOverlay').waitFor({timeout:20000});
  await page.screenshot({path:join(dir,'ORIGINAL-intro-390.png'),fullPage:true});
  check(await page.locator('#introOverlay').isVisible(),'original has real intro');
  check((await page.locator('#introOverlay .rule').count())===3,
    'original tutorial has three steps');
  await page.locator('#startButton').click();
  await page.locator('#gameCanvas').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({path:join(dir,'ORIGINAL-gameplay-390.png'),fullPage:true});
  check(await page.locator('#gameCanvas').isVisible(),'original canvas exists');
  await page.locator('#bottomBar button:has-text("PAUSE")').click();
  await page.locator('#pauseOverlay').waitFor({timeout:6000});
  await page.screenshot({path:join(dir,'ORIGINAL-pause-390.png'),fullPage:true});
  check(await page.locator('#pauseOverlay').isVisible(),'original has pause menu');
  check((await page.locator('#pauseOverlay button').count())===2,
    'original pause offers resume and exit');
  check(errs.length===0,'original screenshot no page errors',errs[0]||'');
  await page.close();
}
async function modernScenes({width,height}){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,
    acceptDownloads:true,reducedMotion:'reduce'});
  const errs=[];const consoles=[];
  page.on('pageerror',e=>errs.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')consoles.push(m.text())});
  page.on('response',r=>{if(r.status()===404&&!r.url().endsWith('/favicon.ico'))consoles.push('HTTP404 '+r.url())});
  const url=new URL('src/games/circuit-climb-2/devtools/cc2-09c.html?manual=1',server.url);
  await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_09C__?.summary&&window.__CC2_09B__?.summary
     &&window.__CC2_02A__?.snapshot,null,{timeout:20000});
  await page.waitForTimeout(180);
  const initial=await page.evaluate(()=>{
    const a=window.__CC2_02A__,state=a.snapshot(),replay=a.replay();
    return {tick:state.tick,gap:state.world.geometry.rowGap,
      routeFailures:a.pursuer().routeFailures,started:window.__cc2ChaseStarted,
      spark:replay.learnerMotion.circuitSpeedPerTick,
      search:replay.pursuerPreset.speedSearch,
      chase:replay.pursuerPreset.speedPursuit,
      errors:window.__CC2_09C__.summary().errors,
      painter:window.__CC2_09B__.summary().paintFailures,
      digest:a.sessionReport().stateDigest};
  });
  check(initial.tick===0&&!initial.started,'first-choice freeze '+width);
  check(initial.gap===576.5625,'same physically expanded tower '+width);
  check(initial.spark===24&&initial.search===4.8&&initial.chase===6,
    'preserved AI/Spark tuning '+width);
  check(initial.routeFailures===0,'no Pursuer route failure '+width);
  check(initial.errors===0&&initial.painter===0,'visual adapters error-free '+width);
  check(await page.locator('#cc209c-intro').isVisible(),'original-style intro '+width);
  const noStateChange=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
  check(noStateChange===initial.digest,'intro does not change gameplay state '+width);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'no horizontal scrolling '+width);
  if(width===390||width===320){
    await page.screenshot({path:join(dir,'09C-intro-'+width+'.png'),fullPage:true});
  }
  if(width===390){
    await contrast(page,'intro title','#cc209c-intro-title','#ffffff');
    await contrast(page,'intro explanation','#cc209c-intro p','#ffffff');
    await contrast(page,'original three-rule description','.cc209c-rule span','#ffffff');
    await contrast(page,'primary CTA','#cc209c-enter','#155cbd');
    await contrast(page,'intro secondary CTA','#cc209c-intro-help','#ffffff');
  }
  await page.locator('#cc209c-enter').click();
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick===0),
    'enter tower does not start AI '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-gameplay-390.png'),fullPage:true});
    await contrast(page,'math question','#cc209-equation','#ffffff');
    await contrast(page,'numbered platform','.choice','#ffffff');
    await contrast(page,'pause button','#pause','#f3faff');
    await contrast(page,'pulse disabled','#pulse','#e2eee9');
    await contrast(page,'threat readout','.threat-radar .threat-head','#fbfdff');
    await contrast(page,'help button','#cc209-help-btn','#ffffff');
    await contrast(page,'restart button','#restart','#f3faff');
    await contrast(page,'start prompt','#cc209-start','#ffffff');
  }
  await page.locator('#cc209-help-btn').click();
  check(await page.locator('#cc209-help').isVisible(),'help opens '+width);
  check((await page.locator('#cc209c-special-guide').innerText()).includes('Capacitor'),
    'power-up documentation available '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-help-390.png'),fullPage:true});
    await contrast(page,'help title','#cc209-help-title','#ffffff');
    await contrast(page,'help body','#cc209-help .cc209-dialog p','#ffffff');
    await contrast(page,'ability guide','#cc209c-special-guide','#ffffff');
    await contrast(page,'help close button','#cc209-help .cc209-close','#eef7fc');
  }
  await page.locator('[data-close="cc209-help"]').click();
  const coreDigest=await page.evaluate(()=>window.__CC2_02A__.sessionReport().stateDigest);
  check(coreDigest===initial.digest,'help is read only '+width);
  const choice=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+choice+'"]').click();
  check(await page.evaluate(()=>window.__cc2ChaseStarted),'first platform starts chase '+width);
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(10));
  await page.locator('#pause').click();
  await page.locator('#cc209c-pause').waitFor({timeout:5000,state:'visible'});
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().paused),
    'pause freezes engine '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-pause-390.png'),fullPage:true});
    await contrast(page,'pause heading','#cc209c-pause-title','#ffffff');
    await contrast(page,'pause message','#cc209c-pause p','#ffffff');
    await contrast(page,'resume button','#cc209c-resume','#155cbd');
  }
  await page.locator('#cc209c-pause-settings').click();
  check(await page.locator('#cc209-settings').isVisible(),
    'pause menu leads to settings '+width);
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().paused),
    'settings from pause remains paused '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-settings-390.png'),fullPage:true});
    await contrast(page,'settings heading','#cc209-settings-title','#ffffff');
    await contrast(page,'progress status','#cc209c-progress-card','#ffffff');
    await contrast(page,'settings details','#cc209-settings summary','#ffffff');
    await contrast(page,'settings audio label','#cc209b-audio-ui span','#ffffff');
    await contrast(page,'settings close button','#cc209-settings .cc209-close','#eef7fc');
    await contrast(page,'pace panel headline','#cc209-settings .pace-heading strong','#f0f7fc');
    await contrast(page,'pace panel subtitle','#cc209-settings .pace-heading span','#f0f7fc');
    await contrast(page,'pace profile label','#cc209-settings .pace-label','#f0f7fc');
    await contrast(page,'pace selector','#paceProfile','#ffffff');
    await contrast(page,'pace apply action','#applyPace','#155a49');
    await contrast(page,'pace report download','#downloadPlaytest','#e7f3fb');
    await contrast(page,'pace status detail','#paceDescription','#f0f7fc');
    await page.locator('#cc209-settings details:has(> summary:has-text("Developer tools")) > summary').click();
    await page.screenshot({path:join(dir,'09C-developer-tools-390.png'),fullPage:true});
    await contrast(page,'developer mode label','#cc209-developer-slot .dev-controls label','#ffffff');

  }
  await page.locator('[data-close="cc209-settings"]').click();
  await page.locator('#cc209c-pause').waitFor({state:'visible',timeout:5000});
  await page.locator('#cc209c-resume').click();
  check(!(await page.evaluate(()=>window.__CC2_02A__.snapshot().paused)),
    'pause resume works '+width);
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(150));
  const state=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot();
    return {tick:s.tick,solved:s.solved.length,rows:s.completedRows,routeFailures:a.pursuer().routeFailures,
      errors:window.__CC2_09C__.summary().errors,painterErrors:window.__CC2_09B__.summary().paintFailures,
      schema:a.sessionReport().schemaVersion};
  });
  check(state.tick>=160&&state.solved>=1&&state.rows>=1,
    'mathematical landing persisted '+width,JSON.stringify(state));
  check(state.routeFailures===0,'Pursuer navigates correctly '+width);
  check(state.errors===0&&state.painterErrors===0,'no new visual errors '+width);
  check(state.schema==='cc2-playtest-report/v1','complete source report '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-moving-390.png'),fullPage:true});
    const classes=await page.evaluate(()=>{
      const a=document.createElement('button');a.className='choice';a.textContent='8';
      a.dataset.modifier='CAPACITOR';document.body.append(a);
      const c=getComputedStyle(a),cap={color:c.color,border:c.borderColor,background:c.backgroundImage};
      a.dataset.modifier='RELAY';const r=getComputedStyle(a),
        relay={color:r.color,border:r.borderColor,background:r.backgroundImage};
      a.remove();return {cap,relay};
    });
    check(classes.cap.border!==classes.relay.border&&
      classes.cap.background!==classes.relay.background,
      'Capacitor and Relay have distinct accessible styling');
  }
  // Force the existing, source-authoritative quit action; no fabricated
  // capture or completion. The output must label it RUN ENDED.
  await page.evaluate(()=>document.getElementById('endRun').click());
  await page.locator('#cc209-preend').waitFor({state:'visible',timeout:6000});
  if(width===390)await page.screenshot({path:join(dir,'09C-preend-390.png'),fullPage:true});
  await page.waitForFunction(()=>document.querySelector('#cc209-end-head')?.textContent==='RUN ENDED',null,{timeout:5000});
  check((await page.locator('#cc209-end-head').textContent())==='RUN ENDED',
    'quit is not falsely called victory '+width);
  await page.locator('#summaryPanel').waitFor({state:'visible',timeout:7000});
  check((await page.locator('#cc209c-highlights>div').count())===4,
    'source-derived four power-up summary metrics '+width);
  const solved=await page.evaluate(()=>window.__CC2_02A__.summary().equations.length);
  const lis=await page.locator('#summaryEquations li').count();
  check(solved===lis||(solved===0&&lis===1),
    'summary correct-solved-only parity '+width);
  if(width===390){
    await page.screenshot({path:join(dir,'09C-ending-390.png'),fullPage:true});
    await contrast(page,'summary heading','#summaryTitle','#ffffff');
    await contrast(page,'summary status','#summaryOutcome','#ffffff');
    await contrast(page,'summary metric','#summaryStats .summary-metric span','#ffffff');
    await contrast(page,'achievement empty text','#summaryBadges','#ffffff');
    await contrast(page,'summary explanatory footnote','.summary-footnote','#ffffff');
    await contrast(page,'power-up recap','#cc209c-highlights>div','#ffffff');
  }
  check(errs.length===0&&consoles.length===0,'browser script and console clean '+width,
    JSON.stringify([...errs,...consoles].slice(0,3)));
  await page.close();
}
try{
  // Baseline screenshot first so new CSS never contaminates original UI.
  await oldScreens();
  // Verify actual feature schedule rather than accidentally decorating one
  // mathematical answer with privileged knowledge.
  const f=defaultFeatureConfig();
  check(modifierForRow(1,f)==='NORMAL','original early rows unmodified');
  check(modifierForRow(6,f)==='CAPACITOR','every row-6 tile is capacitor');
  check(modifierForRow(8,f)==='RELAY','every row-8 tile is relay');
  check(modifierForRow(12,f)==='RELAY','relay precedence on overlap');
  for(const size of viewports)await modernScenes(size);
  writeFileSync(join(dir,'contrast-audit.json'),JSON.stringify({schema:'cc2-09c-contrast/v1',
    cases:contrastRecords,failures,checkCount:checks},null,2));
  writeFileSync(join(dir,'qualification.json'),JSON.stringify({schema:'cc2-09c-qualification/v1',
    checks,failures,viewports,legacyScreens:['ORIGINAL-intro-390.png',
      'ORIGINAL-gameplay-390.png','ORIGINAL-pause-390.png']},null,2));
  if(failures.length)throw Error('CC2_09C_QUALIFICATION_FAILED '+failures.length+' checks: '+failures.join(' | '));
  console.log('CC2-09C ORIGINAL / POWERUPS / CONTRAST PASS '+checks+' assertions');
}finally{await browser.close();await server.stop()}
