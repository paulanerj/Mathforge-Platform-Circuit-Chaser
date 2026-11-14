/**
 * CC2-09E regression: no duplicate giant target, subtle chip-only feedback.
 * The original and intelligent Pursuer are not modified.
 */
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
 from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const dir='cc2-09e-evidence';mkdirSync(dir,{recursive:true});
const html=readFileSync('src/games/circuit-climb-2/devtools/cc2-09e.html','utf8');
const js=readFileSync('src/games/circuit-climb-2/devtools/cc2-09e-presentation.js','utf8');
if(html.includes('ctx.fillText(String(state.currentProblem.targetValue)') ||
   js.includes('ctx.fillText(String(p.targetValue)') ||
   !js.includes('cc209e-target-glow')) throw Error('LARGE_TARGET_DRAW_REMAINING');
const server=await startDevServer({port:3218});
const browser=await chromium.launch({executablePath:findChromium(),args:LAUNCH_ARGS,headless:true});
let count=0;
const assert=(condition,message)=>{if(!condition)throw Error('CC2_09E: '+message);count++;};
try{
 for(const [w,h,reduced] of [[320,568,true],[390,844,false],[428,926,false],[826,680,false]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:reduced?'reduce':'no-preference'});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(new URL('src/games/circuit-climb-2/devtools/cc2-09e.html?manual=1',server.url).toString(),
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CC2_09D__?.summary && window.__CC2_02A__?.snapshot,null,{timeout:18000});
  const s=await page.evaluate(()=>({
    tick:window.__CC2_02A__.snapshot().tick,
    gap:window.__CC2_02A__.snapshot().world.geometry.rowGap,
    replay:window.__CC2_02A__.replay(),
    digest:window.__CC2_02A__.sessionReport().stateDigest,
    errs:window.__CC2_09D__.summary().errors,
  }));
  assert(s.tick===0 && s.gap===576.5625,'initial math and geometry '+w);
  assert(s.replay.pursuerPreset.speedSearch===4.8 &&
   s.replay.pursuerPreset.speedPursuit===6 &&
   s.replay.learnerMotion.circuitSpeedPerTick===24,'AI and Spark unchanged '+w);
  assert(await page.locator('#cc209d-effects').count()===1,'VFX layer retained '+w);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+w);
  await page.locator('#cc209c-enter').click();
  await page.waitForTimeout(100);
  const before=await page.evaluate(()=>({
    tick:window.__CC2_02A__.snapshot().tick,
    digest:window.__CC2_02A__.sessionReport().stateDigest,
    num:window.__CC2_09D__.summary().styles.targetReveal,
    className:document.querySelector('#cc209-equation').className,
    scale:getComputedStyle(document.querySelector('#cc209-equation')).transform,
  }));
  assert(before.tick===0&&before.digest===s.digest,'opening transition never starts AI '+w);
  assert(before.num===1,'one subtle target change detected '+w);
  const chip=page.locator('#cc209-equation');
  assert(await chip.isVisible(),'equation stays visible '+w);
  if(!reduced){
    assert((await chip.getAttribute('class')).includes('cc209e-target-glow'),'subtle class active '+w);
    const anim=await chip.evaluate(e=>getComputedStyle(e).animationName);
    assert(anim.includes('cc209e-target-acknowledge'),'short glow animation '+w);
    let maxScale=1;
    for(let t=0;t<6;t++){
     const scale=await chip.evaluate(e=>{
       const m=getComputedStyle(e).transform;
       return m==='none'?1:Number((m.match(/^matrix\(([^,]+)/)||[])[1]||1);
     });
     maxScale=Math.max(maxScale,scale);await page.waitForTimeout(70);
    }
    assert(maxScale<=1.031 && maxScale>=1,'no more than 3 percent enlargement '+w);
  }else{
    assert(await chip.evaluate(e=>getComputedStyle(e).animationName)==='none',
      'reduced-motion skips animation '+w);
  }
  const correct=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
  await page.evaluate(()=>window.__CC2_02A__.advanceForQA(175));
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({
    s:window.__CC2_02A__.snapshot(),
    fx:window.__CC2_09D__.summary(),
    bot:window.__CC2_02A__.pursuer(),
  }));
  assert(after.s.completedRows>=1&&after.s.solved.length>=1,'real correct landing '+w);
  assert(after.fx.styles.targetReveal>=2,'next equation subtle glow registered '+w);
  assert(after.bot.routeFailures===0,'Pursuer navigation unaffected '+w);
  assert(after.fx.errors===0&&errs.length===0,'no renderer errors '+w);
  assert(await page.evaluate(()=>getComputedStyle(document.querySelector('#cc209d-effects')).pointerEvents==='none'),
   'visual layer cannot intercept tap '+w);
  if(w===390)await page.screenshot({path:dir+'/CC2-09E-390.png',fullPage:true});
  await page.close();
 }
}finally{
 await browser.close();await server.stop();
}
console.log('CC2-09E SUBTLE TARGET '+count+'/'+count+' PASS');
