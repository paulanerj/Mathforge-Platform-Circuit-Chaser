/**
 * CC2-VIS-21 screenshot-led attachment and engulfment QA.
 *
 * A regression gate specifically for the owner-reported screenshot failure:
 * plasma was rendered as an independent pink cloud far from the red bot.
 *
 * VISUAL ACCEPTANCE IS NOT AUTOMATIC. These tests prove geometry and source
 * invariants; only the owner can accept actual appearance.
 *
 * All scene controls are presentation-only. The original CC2-20 browser
 * suite separately tests real gameplay, physical capture, and summary parity.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const port=3266;
const server=await startDevServer({port});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS
});
const evidence='cc2-21-evidence';
mkdirSync(evidence,{recursive:true});
const outcomes=[];
const assert=(truth,label,detail={})=>{
  const record={pass:Boolean(truth),label,detail};
  outcomes.push(record);
  if(!truth)throw Error('CC221_COHESION_FAIL '+label+' '+JSON.stringify(detail));
  console.log('PASS '+label);
};
const url=suffix=>new URL(
  'src/games/circuit-climb-2/devtools/cc2-16a.html'+suffix,
  server.url).toString();
const screenshot=(page,name)=>page.screenshot({path:evidence+'/'+name+'.png'});

try {
  for(const [width,height,motion]of [
    [320,568,'reduce'],
    [390,844,'no-preference'],
    [768,1024,'no-preference'],
    [1280,800,'no-preference']
  ]){
    const page=await browser.newPage({
      viewport:{width,height},reducedMotion:motion
    });
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url('?vis20Lab=turn90'),{
        waitUntil:'domcontentloaded'
      });
      await page.waitForFunction(
        ()=>window.__CC2_VIS20__?.summary?.()?.lab?.scenario==='turn90',
        null,{timeout:20000}
      );
      const original=await page.evaluate(()=>({
        digest:window.__CC2_02A__.sessionReport().stateDigest,
        tick:window.__CC2_02A__.snapshot().tick
      }));
      for(const scenario of ['turn90','reverse180','stop','rapidTurns']){
        const sample=await page.evaluate(name=>{
          const v=window.__CC2_VIS20__;
          if(v.summary().lab.scenario!==name)v.startLab(name);
          v.labSetTime(1150);
          const state=v.summary(),attached=state.visualAttachment;
          const shell=document.querySelector('#cc219-shell');
          const board=document.querySelector('#board');
          const sr=shell.getBoundingClientRect();
          const br=board.getBoundingClientRect();
          return{scenario:name,tick:window.__CC2_02A__.snapshot().tick,
            digest:window.__CC2_02A__.sessionReport().stateDigest,
            attached,
            shellCenterX:sr.left+sr.width/2-br.left,
            shellCenterY:sr.top+sr.height/2-br.top,
            sourceGhostSuppressed:getComputedStyle(
              document.querySelector('#cc209b-heritage-canvas')).visibility,
            fluidVisible:getComputedStyle(
              document.querySelector('#cc220-fluid')).visibility,
            sourceActorCanvasOpacity:getComputedStyle(
              document.querySelector('#worldCanvas')).opacity
          };
        },scenario);
        assert(sample.attached?.tethered===true&&
          sample.attached.centerDistancePx<=sample.attached.maxAllowedPx+.15,
          'material envelope attached to bot '+width+' '+scenario,sample);
        assert(sample.attached?.maxAllowedPx<=
          sample.attached?.bodyDiameterPx*.131,
          'visual lag capped at 13% of diameter '+width+' '+scenario,
          sample.attached);
        assert(Math.hypot(sample.shellCenterX-sample.attached.source.x,
          sample.shellCenterY-sample.attached.source.y)<3,
          'solid core and material share same source center '+width+' '+scenario,
          sample);
        assert(sample.tick===original.tick&&sample.digest===original.digest,
          'lab never edits actual source '+width+' '+scenario);
        if(scenario==='turn90'||scenario==='reverse180'){
          assert(sample.attached.virtualLagPx>=
            sample.attached.centerDistancePx,
            'simulated inertia kept while visual center is clamped '+width+
            ' '+scenario,sample.attached);
          await screenshot(page,'CC2-21-'+width+'-'+scenario+'-attached');
        }
      }
      assert(errors.length===0,
        'no visual-lab runtime exceptions '+width,{errors});
    }finally{await page.close();}
  }

  // Immediate preview is not a run result; it must convey a membrane engulf,
  // visibly pass red material over external blue Spark, then finish with one
  // continuous red shell and one internal blue eye.
  for(const width of [320,390,768]){
    const page=await browser.newPage({viewport:{
      width,height:width===768?1024:width===320?568:844
    }});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(url('?eclipseDemo=1'),{
        waitUntil:'domcontentloaded'
      });
      await page.waitForFunction(
        ()=>window.__CC2_19__?.summary?.()?.visible,
        null,{timeout:20000});
      const before=await page.evaluate(()=>({
        tick:window.__CC2_02A__.snapshot().tick,
        digest:window.__CC2_02A__.sessionReport().stateDigest,
        reason:window.__CC2_02A__.snapshot().endReason
      }));
      assert(before.tick===0&&before.reason===null,
        'visual preview is not a fabricated capture '+width,before);
      const contact=await page.evaluate(
        ()=>window.__CC2_19__.visualSeekForQA(180));
      const overlay=await page.evaluate(()=>{
        const canvas=document.querySelector('#cc220-fluid');
        const stage=document.querySelector('#cc219-stage');
        return{phase:stage.dataset.phase,
          canvasZ:getComputedStyle(canvas).zIndex,
          outsideBlue:!document.querySelector('#cc219-shell')
            .contains(document.querySelector('#cc219-spark'))};
      });
      assert(contact.phase==='aperture'&&overlay.canvasZ==='6'&&
        overlay.outsideBlue,
        'red engulfing membrane overlays original external Spark '+width,
        overlay);
      await screenshot(page,'CC2-21-'+width+'-red-membrane-engulf');
      const swallow=await page.evaluate(
        ()=>window.__CC2_19__.visualSeekForQA(315));
      assert(swallow.eyeNested===true,
        'same blue Spark enclosed by 315ms '+width,swallow);
      await screenshot(page,'CC2-21-'+width+'-spark-in-shell');
      const held=await page.evaluate(()=>{
        window.__CC2_19__.visualSeekForQA(1510);
        return{
          snap:window.__CC2_19__.summary(),
          g:window.__CC2_19__.geometry()
        };
      });
      assert(held.g.shellCount===1&&held.g.blueSparkCount===1&&
        held.g.nested&&held.g.whollyEnclosed&&
        held.g.outerAspect<=1.06&&held.g.outerAspect>=1/1.06,
        'one circular red shell and enclosed blue eye '+width,held.g);
      assert(held.g.centerDistance<=held.g.shell.radius*.06,
        'blue eye is central and not a second exterior lobe '+width,held.g);
      await screenshot(page,'CC2-21-'+width+'-quiet-final-form');
      const after=await page.evaluate(()=>({
        tick:window.__CC2_02A__.snapshot().tick,
        digest:window.__CC2_02A__.sessionReport().stateDigest,
        reason:window.__CC2_02A__.snapshot().endReason
      }));
      assert(before.digest===after.digest&&before.tick===after.tick&&
        after.reason===null,
        'swallow preview retains original exact source digest '+width,
        after);
      await page.locator('#cc219-skip').click();
      assert(await page.evaluate(
        ()=>!document.body.classList.contains('cc219-active')),
        'capture skip clears presentation '+width);
      assert(errors.length===0,
        'no capture-preview exceptions '+width,{errors});
    }finally{await page.close();}
  }
  const report={schema:'cc2-vis21-cohesion-qa/v1',
    source:'b70f3ed4e149136bfc2b431cde977a0f31856ef5',
    assertionCount:outcomes.length,allPassed:outcomes.every(x=>x.pass),
    outcomes};
  writeFileSync(evidence+'/CC2-21-COHESION-QA.json',
    JSON.stringify(report,null,2));
  console.log('CC2-VIS21 COHESION PASS '+outcomes.length+'/'+outcomes.length);
}finally{
  await browser.close();
  await server.stop();
}
