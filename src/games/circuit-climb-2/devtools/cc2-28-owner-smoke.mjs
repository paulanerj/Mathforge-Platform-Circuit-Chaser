/**
 * CC2-28 physical game/browser qualification.
 *
 * Real Playwright pointer taps (not simulated button onclick), source-owned
 * platform traversal, authoritative correct-landed receipts, 60 Hz QA clock
 * and separate source-vs-preview digests. The conditional special policy
 * never becomes the default and all three choices share identical markings.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3298});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const folder='cc2-28-evidence';
mkdirSync(folder,{recursive:true});
const outcomes=[];
function assert(ok,name,extra={}){
  const result={ok:Boolean(ok),name,extra};
  outcomes.push(result);
  if(!ok)throw Error('CC228_BROWSER_FAIL '+name+' '+JSON.stringify(extra));
  console.log('PASS '+name);
}
const gameURL=q=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();

try{
  for(const [width,height,reduce] of [
    [320,700,'reduce'],[390,844,'no-preference'],[768,1024,'no-preference']
  ]){
    const page=await browser.newPage({
      viewport:{width,height},reducedMotion:reduce,
    });
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(gameURL('?cc2Ui=slate-focus&cc228=1'),{
        waitUntil:'domcontentloaded'});
      await page.waitForFunction(
        ()=>window.__CC2_02A__?.snapshot?.()&&
          window.__CC2_28__?.report?.().paintCount>0,
        null,{timeout:25000});
      const before=await page.evaluate(()=>{
        const g=window.__CC2_02A__;
        return {state:g.snapshot(),special:g.specials(),
          vfx:window.__CC2_28__.report(),digest:g.sessionReport().stateDigest};
      });
      assert(before.special?.nextRow===1&&
        before.special?.phase==='IDLE',
        'source-only special policy starts safely '+width);
      assert(before.vfx.allChoicesSameTag&&
        before.vfx.currentTag==='NORMAL',
        'normal first row same tag across options '+width);
      assert(before.vfx.extraCanvasCount===0,
        'no additional full-board compositor '+width);
      const preview=await page.evaluate(()=>{
        const g=window.__CC2_02A__,v=window.__CC2_28__;
        const digest=g.sessionReport().stateDigest;
        const beforeFeature=g.featureEvents().length;
        const beforeSpecial=g.specialEvents().length;
        for(const kind of ['capacitor','relay','surge','discharge'])
          v.preview(kind);
        let rejected=false;
        try{v.applyConfig({...v.config(),secretCorrectAnswer:10})}
        catch(e){rejected=true;}
        return{rejected,digestUnchanged:digest===g.sessionReport().stateDigest,
          featuresUnchanged:beforeFeature===g.featureEvents().length,
          specialsUnchanged:beforeSpecial===g.specialEvents().length,
          count:v.report().materialPreviewCount};
      });
      assert(preview.rejected&&preview.digestUnchanged&&
        preview.featuresUnchanged&&preview.specialsUnchanged&&
        preview.count===4,
        'four preview interactions never issue game commands '+width,preview);
      await page.locator('#cc209c-enter').click();
      const platform=await page.evaluate(()=>
        window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
      const choice=page.locator('button.choice[data-platform-id="'+platform+'"]');
      await choice.waitFor({state:'visible',timeout:7000});
      const pointed=await choice.evaluate(el=>{
        const r=el.getBoundingClientRect();
        const found=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return el===found||el.contains(found);
      });
      assert(pointed,'original pointer hitbox remains reachable '+width);
      await choice.click();
      await page.waitForFunction(()=>window.__CC2_02A__.snapshot().tick>7,
        null,{timeout:20000});
      const live=await page.evaluate(()=>{
        const g=window.__CC2_02A__,v=window.__CC2_28__;
        const s=g.snapshot(),x=v.report();
        return {
          tick:s.tick,attempts:s.attempts,phase:s.phase,
          annotated:x.choices.length,kind:x.currentTag,
          same:x.allChoicesSameTag,
          blackCanvas:document.querySelectorAll(
            '#cc223-secondary-canvas,#cc228-canvas').length,
          overflow:document.documentElement.scrollWidth-innerWidth
        };
      });
      assert(live.tick>7&&live.attempts>=1,
        'genuine mathematical tap advances engine '+width,live);
      assert(live.blackCanvas===0&&live.overflow<=2,
        'no black overlay or horizontal overflow '+width,live);
      assert(errors.length===0,'no browser exceptions '+width,{errors});
      if(width!==768)await page.screenshot({
        path:folder+'/CC2-28-'+width+'-first-real-click.png'});
    }finally{await page.close();}
  }

  // One longer verified source run crosses genuine Capacitor row 6, public
  // Surge row 7 and source Relay row 8. Training slows only the actual bot;
  // each mathematical choice remains a normal physical platform tap.
  const page=await browser.newPage({
    viewport:{width:390,height:844},reducedMotion:'no-preference'
  });
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await page.goto(gameURL('?cc2Ui=slate-focus&cc228=1&manual=1'),
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_28__?.report?.().paintCount>0,
      null,{timeout:22000});
    await page.locator('#cc209c-enter').click();
    // The accepted mobile UI deliberately hides Developer pace controls.
    // Configure only the official existing selector for this QA scenario;
    // every mathematical platform choice below is still a real pointer tap.
    await page.evaluate(()=>{
      document.getElementById('paceProfile').value='training';
      document.getElementById('applyPace').click();
    });
    await page.evaluate(()=>{window.__cc2ManualScenarioActive=true;});
    for(let row=1;row<=8;row++){
      const source=await page.evaluate(()=>{
        const s=window.__CC2_02A__.snapshot();
        return {id:s.currentProblem.correctPlatformId,
          row:s.completedRows,phase:s.phase};
      });
      assert(source.phase==='ready'&&source.row===row-1,
        'ready state before genuine row '+row,source);
      const button=page.locator('button.choice[data-platform-id="'+source.id+'"]');
      await button.waitFor({state:'visible',timeout:10000});
      await button.click();
      const done=await page.evaluate(targetRow=>{
        const g=window.__CC2_02A__;
        // Advance in small real 60-Hz source chunks. Stop immediately on
        // physical landing instead of giving the Pursuer 300 idle ticks
        // after each success (which made training artificially lethal).
        for(let t=0;t<100;t++){
          const current=g.snapshot();
          if(current.completedRows>=targetRow||current.phase==='ended')break;
          g.advanceForQA(6);
        }
        const s=g.snapshot();
        return {row:s.completedRows,phase:s.phase,endReason:s.endReason,
          tick:s.tick,
          events:g.events().filter(e=>e.type==='ROW_COMPLETED').length,
          special:g.specials(),features:g.features()};
      },row);
      assert(done.row===row&&done.events===row,
        'real source ROW_COMPLETED '+row,done);
      if(row===5){
        await page.waitForFunction(()=>window.__CC2_28__.report()
          .currentTag==='CAPACITOR',null,{timeout:10000});
        const visual=await page.evaluate(()=>window.__CC2_28__.report());
        assert(visual.choices.length===3&&visual.allChoicesSameTag,
          'row 6 three Capacitor sigils before mathematical decision',visual);
        await page.screenshot({path:folder+'/CC2-28-row6-capacitor.png'});
      }
      if(row===6){
        await page.waitForFunction(()=>window.__CC2_28__.report()
          .currentTag==='SURGE',null,{timeout:10000});
        const visual=await page.evaluate(()=>window.__CC2_28__.report());
        assert(visual.choices.length===3&&visual.allChoicesSameTag,
          'row 7 fair shared Surge marking before answer',visual);
        await page.screenshot({path:folder+'/CC2-28-row7-surge.png'});
      }
    }
    const end=await page.evaluate(()=>{
      const g=window.__CC2_02A__;
      const v=window.__CC2_28__.report();
      const s=g.snapshot(),special=g.specials();
      window.__cc2ManualScenarioActive=false;
      return{row:s.completedRows,solved:s.solved.length,
        charge:g.featureEvents().filter(e=>e.type==='CHARGE_GAINED').length,
        capacitor:special.events.filter(e=>e.type==='CAPACITOR_BONUS').length,
        surge:special.events.filter(e=>e.type==='SURGE_WARNING').length,
        relays:special.events.filter(e=>e.type==='RELAY_GUARD_EARNED').length,
        calls:v.shown,errors:v.errors,sourceDigest:g.sessionReport().stateDigest};
    });
    assert(end.row===8&&end.solved===8&&end.charge===8,
      'eight physically solved equations and no fake credit',end);
    assert(end.capacitor===1&&end.surge===1&&end.relays===1,
      'Capacitor, Surge, Relay each source-receipted once',end);
    assert(errors.length===0&&end.errors.length===0,
      'long-session visual controller no errors',{errors,visual:end.errors});
    await page.screenshot({path:folder+'/CC2-28-row8-relay-complete.png'});
  }finally{await page.close();}

  const off=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await off.goto(gameURL('?cc2Ui=slate-focus'),
      {waitUntil:'domcontentloaded'});
    await off.waitForFunction(()=>window.__CC2_28__?.report?.(),
      null,{timeout:20000});
    const state=await off.evaluate(()=>{
      const g=window.__CC2_02A__;
      return {special:g.specials(),events:g.specialEvents(),
        vfx:window.__CC2_28__.report(),
        icons:document.querySelectorAll('.cc228-sigil').length};
    });
    assert(state.special===null&&state.events.length===0&&
      !state.vfx.enabled&&state.icons===0,
      'ordinary accepted URL retains exact zero-special experiment',state);
  }finally{await off.close();}

  writeFileSync(folder+'/CC2-28-QUALIFICATION.json',
    JSON.stringify({schema:'cc2-28-browser-qa/v1',outcomes},null,2));
  console.log('CC2-28 BROWSER PASS '+outcomes.length+'/'+outcomes.length);
}finally{
  await browser.close();await server.stop();
}
