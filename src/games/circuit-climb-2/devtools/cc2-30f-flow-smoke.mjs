/**
 * CC2-30F six-row flowing world and bot-only blanket: browser acceptance.
 * The game is unchanged without ?cc230=1. No browser code judges mathematics.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server=await startDevServer({port:3307});
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
      await page.goto(gameURL('?cc2Ui=slate-focus&cc230=1&cc230Blanket=1&cc2Flow=1&manual=1'),
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
      const flow=await page.evaluate(()=>{
        const game=window.__CC2_02A__,renderer=game.rendererStats();
        return {coverage:renderer.viewportCoverage,
          future:renderer.previewRowsRendered,
          rows:renderer.flowRowsEachSide,
          sourceRows:game.snapshot().world.rows.length,
          actualNext:game.snapshot().currentProblem.rowIndex,
          sparkY:game.snapshot().spark.y};
      });
      assert(flow.rows===3&&flow.coverage.above>=2.95&&
        flow.coverage.below>=2.95&&flow.future>=2,
        '3+3 real camera viewport with persistent structural future '+width,flow);

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
      const fluid=await page.evaluate(()=>{
        const visual=window.__CC2_30__;
        const a=window.__CC2_02A__;
        const field=a.creature().activeField;
        const before=a.sessionReport().stateDigest;
        const changed=visual.apply({...visual.config,gelDensity:.31,
          slosh:.9,viscosity:.8,trailLength:.95});
        const el=document.querySelector('.cc230-gel');
        const style=getComputedStyle(el);
        const projection=visual.presentation.fieldProjection;
        return {before,after:a.sessionReport().stateDigest,field,changed,
          direction:el.dataset.direction,
          clip:style.clipPath,projection,
          layers:el.querySelectorAll('.cc230-fluid-core,.cc230-fluid-thread').length,
          visualCanvas:document.querySelectorAll('.cc230-root canvas').length,
          size:visual.presentation.fieldProjection?.width,
          body:document.querySelector('.cc230-creature').getBoundingClientRect().width};
      });
      assert(fluid.before===fluid.after&&fluid.layers===2&&
        fluid.visualCanvas===0&&
        fluid.field?.coverage==='BELOW_PLATFORM'&&
        fluid.projection?.coverage==='BELOW_PLATFORM'&&
        fluid.projection?.fullWidth&&fluid.projection?.extendsDown&&
        fluid.projection?.sourcePlatformId===fluid.field.sourcePlatformId&&
        fluid.projection?.boundaryWorldY===fluid.field.y&&
        fluid.direction==='down'&&fluid.clip==='none'&&
        fluid.projection.width>300,
        'full-width visual blanket anchored to actual source elevation '+width,fluid);
      assert(fluid.changed.gelDensity===.31&&
        fluid.changed.trailLength===.95,
        'thick fluid visual controls do not mutate math '+width,fluid);
      const slow=await page.evaluate(()=>{
        const a=window.__CC2_02A__,f=a.creature().activeField;
        const before=a.sessionReport().stateDigest;
        const state=a.creature();
        const result={
          multiplier:state.fieldMultiplier,mode:state.config.fieldMode,
          sourceRow:f.sourceRow,persistent:f.expiresTick===Number.MAX_SAFE_INTEGER,
          botY:a.snapshot().spark.y,
          before,after:a.sessionReport().stateDigest,
        };
        return result;
      });
      assert(slow.mode==='BELOW_PLATFORM'&&slow.multiplier===.5&&
        slow.persistent&&slow.before===slow.after,
        'blanket really produces 50% source multiplier for the whole run '+width,slow);
      const separation=await page.evaluate(()=>{
        const api=window.__CC2_02A__,stats=api.rendererStats();
        const src=api.snapshot().spark;
        const gel=document.querySelector('.cc230-gel');
        const projected=window.__CC2_30__.presentation.fieldProjection;
        return {spark:src,projection:projected,
          flowRows:stats.flowRowsEachSide,
          sourceSpeed:api.creature().fieldMultiplier,
          mask:getComputedStyle(gel).maskImage,
          pointer:getComputedStyle(gel).pointerEvents};
      });
      assert(separation.flowRows===3&&separation.sourceSpeed===.5&&
        separation.projection?.cameraAligned&&
        separation.projection?.playerExcluded&&
        separation.pointer==='none'&&
        separation.mask!=='none',
        'blanket only slows Pursuer and visually excludes playable Spark '+width,separation);
      const overflow=await page.evaluate(()=>
        document.documentElement.scrollWidth-innerWidth);
      assert(overflow<=2,'phone/tablet no horizontal overflow '+width,{overflow});
      assert(errors.length===0,'no browser exceptions '+width,{errors});
      await page.screenshot({path:'cc2-30-evidence/molasses-blanket-'+width+'.png'});
      await page.evaluate(()=>{window.__cc2ManualScenarioActive=false;});
    }finally{await page.close();}
  }
  // Reduced motion removes decorative animation but not the source-owned
  // creature's ability to offer a mathematical challenge.
  const reduced=await browser.newPage({viewport:{width:390,height:844},
    reducedMotion:'reduce'});
  try{
    await reduced.goto(gameURL('?cc2Ui=slate-focus&cc230=1&cc230Blanket=1&cc2Flow=1'),
      {waitUntil:'domcontentloaded'});
    await reduced.waitForFunction(()=>window.__CC2_30__?.presentation?.draws>0,
      null,{timeout:16000});
    const motion=await reduced.evaluate(()=>{
      const c=document.querySelector('.cc230-fluid-core');
      const t=document.querySelector('.cc230-fluid-thread');
      return {core:getComputedStyle(c).animationName,
        thread:getComputedStyle(t).animationName,
        source:Boolean(window.__CC2_02A__.creature())};
    });
    assert(motion.core==='none'&&motion.thread==='none'&&motion.source,
      'reduced motion removes fluid animations, not game source',motion);
  }finally{await reduced.close();}
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
  await server.stop();
}
