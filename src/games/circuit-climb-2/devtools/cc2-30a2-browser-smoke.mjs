/**
 * CC2-30A2 Molasses Guardian real-pointer, platform and overlay qualification.
 * The game is unchanged without ?cc230=1. No browser code judges mathematics.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3299});
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-30-evidence',{recursive:true});
const results=[];
function assert(ok,what,details={}){
  results.push({ok:!!ok,what,details});
  if(!ok)throw Error('CC230_BROWSER_FAIL '+what+' '+JSON.stringify(details));
  console.log('PASS '+what);
}
const gameURL=q=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();

try{
  for(const [width,height] of [[320,700],[390,844],[768,1024]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(gameURL('?cc2Ui=slate-focus&cc230=1&manual=1'),
        {waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
        window.__CC2_30__?.presentation?.draws>0,
        null,{timeout:20000});
      await page.locator('#cc209c-enter').click();
      await page.evaluate(()=>{
        document.getElementById('paceProfile').value='training';
        document.getElementById('applyPace').click();
        window.__cc2ManualScenarioActive=true;
      });
      const original=await page.evaluate(()=>{
        const a=window.__CC2_02A__;
        return {source:a.snapshot(),creature:a.creature()};
      });
      assert(original.creature?.schema==='cc2-creature/v1'&&
        original.creature.gate==='DORMANT',
        'opt-in creature starts outside opening row '+width);

      // Two REAL pointer selections and source-driven 60Hz movement.
      for(let row=1;row<=2;row++){
        const current=await page.evaluate(()=>{
          const s=window.__CC2_02A__.snapshot();
          return {correctId:s.currentProblem.correctPlatformId,
            row:s.completedRows,phase:s.phase};
        });
        assert(current.phase==='ready','ready before row '+row+' @'+width,current);
        const button=page.locator(
          'button.choice[data-platform-id="'+current.correctId+'"]');
        await button.waitFor({state:'visible',timeout:8000});
        await button.click();
        const landed=await page.evaluate(targetRow=>{
          const a=window.__CC2_02A__;
          for(let i=0;i<180;i++){
            if(a.snapshot().completedRows>=targetRow||
              a.snapshot().phase==='ended')break;
            a.advanceForQA(6);
          }
          const s=a.snapshot();
          return {row:s.completedRows,phase:s.phase,solved:s.solved.length};
        },row);
        assert(landed.row===row,'real source landing '+row+' @'+width,landed);
      }

      await page.waitForFunction(()=>window.__CC2_30__?.presentation?.creatureVisible,
        null,{timeout:12000});
      const pre=await page.evaluate(()=>{
        const a=window.__CC2_02A__;
        return {source:a.creature(),solved:a.snapshot().solved.length,
          digest:a.sessionReport().stateDigest};
      });
      assert(pre.source.gate==='AVAILABLE'&&pre.source.platformId,
        'creature physically occupies current row '+width,pre.source);
      const creature=page.locator('.cc230-creature');
      await creature.click();
      await page.waitForFunction(()=>window.__CC2_30__?.presentation?.questionVisible,
        null,{timeout:8000});
      const q=await page.evaluate(()=>window.__CC2_02A__.creature().question);
      assert(q.sequence.length===3&&q.options.length===3,
        'creature-specific gate reads source question '+width,q);
      const correct=q.sequence[2]+(q.sequence[1]-q.sequence[0]);
      await page.locator('.cc230-answer').filter({hasText:String(correct)}).click();
      const after=await page.evaluate(()=>{
        const a=window.__CC2_02A__,c=a.creature();
        return {field:c.activeField,solved:a.snapshot().solved.length,
          receipts:c.receipts.map(e=>e.type),
          presentation:window.__CC2_30__.presentation};
      });
      assert(after.field&&after.receipts.includes('GATE_SOLVED')&&
        after.receipts.includes('FIELD_CAST'),
        'correct real touch authorizes source field '+width,after);
      assert(after.solved===pre.solved,
        'creature math does not invent primary math credit '+width,after);

      await page.evaluate(()=>window.__CC2_02A__.advanceForQA(6));
      await page.waitForFunction(()=>window.__CC2_30__.presentation.gelVisible,
        null,{timeout:8000});
      const studio=await page.evaluate(()=>{
        const a=window.__CC2_02A__,v=window.__CC2_30__;
        const old=a.sessionReport().stateDigest;
        v.apply({...v.config,glow:0.1,flowRate:1.4});
        const parity=old===a.sessionReport().stateDigest;
        let rejected=false;try{v.apply({...v.config,secretAnswer:10});}
        catch{rejected=true;}
        return {parity,rejected,drawing:v.presentation};
      });
      assert(studio.parity&&studio.rejected,
        'visual-only changes cannot alter authoritative game '+width,studio);
      const overflow=await page.evaluate(()=>
        document.documentElement.scrollWidth-innerWidth);
      assert(overflow<=2,'phone/tablet no horizontal overflow '+width,{overflow});
      assert(errors.length===0,'no browser exceptions '+width,{errors});
      await page.screenshot({path:'cc2-30-evidence/molasses-'+width+'.png'});
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=false;});
    }finally{await page.close();}
  }
  // Normal URLs contain no creature object and no creature puzzle UI.
  const ordinary=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await ordinary.goto(gameURL('?cc2Ui=slate-focus'),{waitUntil:'domcontentloaded'});
    await ordinary.waitForFunction(()=>window.__CC2_02A__?.snapshot?.(),
      null,{timeout:20000});
    const none=await ordinary.evaluate(()=>{
      const a=window.__CC2_02A__;
      return {creature:a.creature(),ui:document.querySelector('.cc230-root'),
        replay:a.replay()};
    });
    assert(none.creature===null&&none.ui===null&&
      !Object.hasOwn(none.replay,'creatureConfig'),
      'ordinary URL has zero creature config/source/presentation');
  }finally{await ordinary.close();}
  writeFileSync('cc2-30-evidence/browser-acceptance.json',
    JSON.stringify(results,null,2));
  console.log('CC2-30A2 BROWSER ACCEPTANCE: '+results.length+' checks passed');
}finally{
  await browser.close();
  await server.close();
}
