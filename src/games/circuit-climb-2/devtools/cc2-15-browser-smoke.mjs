/**
 * CC2-13–15 browser qualification: genuine source events, WebAudio unlock,
 * musical transport, special-case status, wrong-answer learning, and full
 * retained developer/Pursuer tuning at five real screen sizes.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const dir='cc2-15-evidence';mkdirSync(dir,{recursive:true});
const server=await startDevServer({port:3235});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const results=[],errors=[];let count=0;
const check=(valid,label,detail='')=>{
 count++;results.push({label,pass:Boolean(valid),detail});
 if(!valid)throw Error('CC2_15_BROWSER_FAIL '+label+' '+detail);
 console.log('PASS '+label+(detail?' '+detail:''));
};
const sizes=[[320,568],[390,844],[428,926],[768,1024],[826,680]];
try{
 for(const [w,h] of sizes){
  const page=await browser.newPage({viewport:{width:w,height:h},
    reducedMotion:w===320?'reduce':'no-preference'});
  const failures=[];page.on('pageerror',e=>failures.push(String(e)));
  await page.goto(new URL(
    'src/games/circuit-climb-2/devtools/cc2-15.html?manual=1',
    server.url).toString(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_15__?.music&&
    window.__CC2_02A__?.snapshot&&
    document.getElementById('cc213-music-controls'),
    null,{timeout:20000});
  const startup=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot();
    return{tick:s.tick,gap:s.world.geometry.rowGap,
      score:window.__CC2_15__.director(),
      sound:window.__CC2_15__.music(),
      bot:a.replay().pursuerPreset,
      motion:a.replay().config.routeStyleVersion};
  });
  check(startup.tick===0&&startup.gap===576.5625,'original geometry '+w);
  check(startup.motion==='cc2-motion-styles/v1'&&
    startup.bot.speedSearch===4.8&&startup.bot.speedPursuit===6,
    'protected motion and AI values '+w);
  check(startup.sound.bpm===112&&startup.sound.bars===16&&
    startup.sound.roles.length===9,'aligned score transport '+w);
  check(!startup.sound.started,'audio waits for user gesture '+w);
  check(startup.score.stage===1,'seven-stage score starts quietly '+w);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
    'no horizontal overflow '+w);
  check(await page.locator('#cc209-equation').count()===1,
    'one in-board equation only '+w);
  if(w===390)await page.screenshot({path:dir+'/CC2-15-menu-390.png',fullPage:true});
  await page.locator('#cc209c-enter').click();
  check(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick===0),
    'tower view does not start Pursuer '+w);
  const correct=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
  check(await page.evaluate(()=>window.__cc2ChaseStarted===true),
    'selection actually starts game '+w);
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(170));
  await page.waitForTimeout(210);
  const after=await page.evaluate(()=>{
    const a=window.__CC2_02A__,s=a.snapshot(),p=window.__CC2_15__;
    return{rows:s.completedRows,solved:s.solved.length,
      music:p.music(),director:p.director(),
      learn:p.learning(),ability:p.ability(),
      scriptErrors:p.errors(),routes:a.pursuer().routeFailures};
  });
  check(after.rows>=1&&after.solved>=1,
    'real correct landing '+w);
  check(after.learn.confirmedSolved>=1&&after.learn.attempts>=1,
    'learning uses landing receipt '+w);
  check(after.director.streak>=1&&after.director.receipts>=1,
    'musical performance uses source event '+w);
  check(after.ability.chargedRows>=1&&after.ability.errors.length===0,
    'feature ledger audited '+w);
  check(after.routes===0,'Pursuer navigation intact '+w);
  check(after.scriptErrors.length===0&&failures.length===0,
    'renderers and browser errors clean '+w);
  check(after.music.activeVoices<=after.music.voiceLimit,'music voice cap '+w);
  if(w===390){
    await page.screenshot({path:dir+'/CC2-15-playing-390.png',fullPage:true});
    const wrong=await page.evaluate(()=>{
      const s=window.__CC2_02A__.snapshot();
      return s.currentProblem.options.find(x=>
        x.platformId!==s.currentProblem.correctPlatformId).platformId;
    });
    await page.locator('button.choice[data-platform-id="'+wrong+'"]').click();
    await page.evaluate(()=>window.__CC2_02A__.advanceForQA(170));
    await page.waitForTimeout(180);
    const feedback=await page.evaluate(()=>({
      hint:document.getElementById('cc215-hint')?.textContent||'',
      wrong:window.__CC2_15__.learning().incorrectSelections,
      confirmed:window.__CC2_15__.learning().confirmedSolved,
    }));
    check(feedback.wrong>=1,'wrong answer has assessment receipt');
    check(feedback.confirmed===after.learn.confirmedSolved,
      'wrong answer never counted as solved');
    check(/too small|too large|count by twos/i.test(feedback.hint),
      'post-error hint is short and truthful');
    await page.screenshot({path:dir+'/CC2-15-wrong-hint-390.png',fullPage:true});
  }
  await page.locator('#cc209-settings-btn').click();
  await page.locator('#cc209-settings').waitFor({state:'visible',timeout:4000});
  check(await page.locator('#cc213-music-on').count()===1&&
    await page.locator('#cc213-music-volume').count()===1,
    'independent music controls in Settings '+w);
  check(await page.locator('#cc215-learning-settings').count()===1,
    'optional learning explanation settings '+w);
  check(await page.locator('#speedSearch').count()===1&&
    await page.locator('#speedPursuit').count()===1&&
    await page.locator('#nearSenseRadius').count()===1,
    'all Pursuer tuning controls retained '+w);
  if(w===390){
    await page.screenshot({path:dir+'/CC2-15-audio-settings-390.png',fullPage:true});
    const ratios=await page.evaluate(()=>{
      const e=document.querySelector('#cc213-music-controls');
      const c=getComputedStyle(e);
      const parse=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum=rgb=>rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
        .reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
      const a=lum(parse(c.color)),b=lum(parse(c.backgroundColor));
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    check(ratios>=4.5,'music settings text contrast >=4.5:1',ratios.toFixed(2));
  }
  await page.locator('#cc213-music-on').uncheck();
  check(await page.evaluate(()=>window.__CC2_15__.music().musicEnabled===false),
    'music switch mutes independently '+w);
  await page.locator('#cc213-low-sensory').check();
  check(await page.evaluate(()=>window.__CC2_15__.mix().lowSensory===true),
    'gentle audio mix enabled '+w);
  check((await page.evaluate(()=>window.__CC2_15__.music().errors)).length===0,
    'no audio runtime errors '+w);
  await page.close();
 }
 writeFileSync(dir+'/qualification.json',JSON.stringify({
  schema:'cc2-15-audio-ability-learning-browser/v1',count,results,errors},null,2));
 console.log('CC2-13–15 browser PASS '+count+'/'+count);
}finally{await browser.close();await server.stop();}
