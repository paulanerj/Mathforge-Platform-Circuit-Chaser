/**
 * CC2-06D real Chromium: production camera and readable platforms at four device sizes,
 * entirely source-backed math, authored personality and visual/audio controls.
 */
import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
const captures='cc2-06d-screenshots';mkdirSync(captures,{recursive:true});
import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3196});
const browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
const url=new URL('src/games/circuit-climb-2/devtools/cc2-04.html?manual=1',server.url).toString();
let n=0;
const check=(ok,label)=>{if(!ok)throw Error('CC2_06D_BROWSER_FAIL: '+label);n++;console.log('PASS '+label)};
try{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:826,height:680}]){
    const page=await browser.newPage({viewport});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.__CC2_02A__?.snapshot),null,{timeout:10000});
    let data=await page.evaluate(()=>({
      state:window.__CC2_02A__.snapshot(),
      view:window.__CC2_02A__.rendererStats(),
      replay:window.__CC2_02A__.replay(),
      settings:window.__CC2_02A__.feedbackSettings(),
    }));
    check(data.state.world.rows.length===2,viewport.width+'px: no prematurely generated future math');
    check(data.state.world.geometry.rowGap===307.5,
      viewport.width+'px: 1.5× actual source-owned row gap (307.5)');
    check(data.replay.config.rowGapScale===1.5,
      viewport.width+'px: expanded physical geometry serialized in replay');
    check(data.view.viewportCoverage.above>=2.0 && data.view.viewportCoverage.below>=2.0,
      viewport.width+'px: two real row heights above AND below Spark');
    check(data.view.previewRowsRendered>=2,
      viewport.width+'px: quiet two-tier architecture without generated false math');
    check(data.view.effectiveZoom<=data.view.zoom,
      viewport.width+'px: responsive fit never exceeds user maximum zoom');
    check(data.replay.pursuerPreset.speedPursuit===3.10 &&
      data.replay.pursuerPreset.speedSearch===2.20,
      viewport.width+'px: R2 direct-chase Pursuer remains 2.20 / 3.10');
    check(data.replay.learnerMotion.circuitSpeedPerTick===19.5,
      viewport.width+'px: Spark exactly 25% slower than R2 26');
    check(data.replay.personality.detourChance===0 &&
      data.replay.personality.hesitationChance===0,
      viewport.width+'px: R2 direct chase distractions remain disabled');
    check(data.replay.personality.style==='curious',
      viewport.width+'px: curious personality active in real Pursuer');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),
      viewport.width+'px: no horizontal overflow');
    check(errors.length===0,viewport.width+'px: no browser script errors');
    const boxes=await page.locator('.choice').evaluateAll(nodes=>
      nodes.filter(node=>!node.hidden).map(node=>{
        const r=node.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width};
      }).sort((a,b)=>a.left-b.left));
    check(boxes.length===3 &&
      boxes.every((box,i)=>box.width>=51 &&
        (i===0||box.left>=boxes[i-1].right+2)),
      viewport.width+'px: all three accessible options remain non-overlapping');
    check(await page.locator('.choice[data-magnified="false"]').count()===3,
      viewport.width+'px: no detached hit-zone spreading');
    const alignment=await page.evaluate(()=>{
      const api=window.__CC2_02A__;
      const state=api.snapshot(),cam=api.rendererStats();
      const world=state.world, width=document.querySelector('#worldCanvas').clientWidth;
      return state.currentProblem.options.map(option=>{
        const card=world.rows.flatMap(row=>row.platforms)
          .find(p=>p.id===option.platformId);
        const button=document.querySelector('button[data-platform-id="'+
          option.platformId+'"]');
        if(!card||!button)throw Error('PRODUCTION_MATCHING_SOURCE_CARD_MISSING');
        const box=button.getBoundingClientRect();
        const board=document.querySelector('#worldCanvas').getBoundingClientRect();
        const expectedX=board.left+width/2+
          (card.x-300)*cam.horizontalCameraScale*width/600;
        const expectedY=board.top+(card.y+card.height/2-
          cam.cameraY)*cam.effectiveZoom*width/600;
        return {xError:Math.abs(expectedX-(box.left+box.width/2)),
          yError:Math.abs(expectedY-(box.top+box.height/2))};
      });
    });
    check(alignment.every(x=>x.xError<2 && x.yError<3),
      viewport.width+'px: visible card center and real selectable hit target agree in X and Y');
    check((await page.locator('.phase').innerText()).includes('CC2-06D'),
      viewport.width+'px: production concept unmistakably identified');
    const botAwareness=await page.evaluate(()=>{
      const api=window.__CC2_02A__,camera=api.rendererStats();
      const pursuer=api.pursuer(),canvas=document.querySelector('#worldCanvas');
      if(!pursuer) return false;
      const y=(pursuer.body.y-camera.cameraY)*camera.effectiveZoom*
        canvas.clientWidth/600;
      const physicallyOnScreen=y>=20&&y<=canvas.clientHeight-20;
      const warning=document.querySelector('#threatIndicator');
      return physicallyOnScreen || (!warning.hidden &&
        document.querySelector('#threatText').textContent.includes('PURSUER'));
    });
    check(botAwareness,
      viewport.width+'px: enemy is physically visible OR truthfully marked outside camera');

    await page.screenshot({path:join(captures,'expanded-start-'+viewport.width+'.png'),fullPage:true});
    if(viewport.width===390){
      const before=JSON.stringify(data.state);
      await page.locator('#tuningPanel summary').click();
      await page.locator('#cameraZoom').evaluate(el=>{
        el.value='0.25';
        el.dispatchEvent(new Event('input',{bubbles:true}));
      });
      const after=await page.evaluate(()=>({
        state:window.__CC2_02A__.snapshot(),
        view:window.__CC2_02A__.rendererStats(),
      }));
      check(JSON.stringify(after.state)===before,'camera zoom leaves authoritative game state unchanged');
      check(after.view.viewportCoverage.above>=2.0 && after.view.viewportCoverage.below>=2.0,
        'extreme zoom retains four surrounding row bands');
      await page.locator('#testSound').click();
      check((await page.evaluate(()=>window.__CC2_02A__.feedbackHistory())).includes('achievement'),
        'sample sound/electric cue gets dispatched by a real gesture');
      await page.locator('#soundToggle').click();
      check((await page.evaluate(()=>window.__CC2_02A__.feedbackSettings())).enabled===false,
        'Sound toggle mutes presentation engine');
      await page.locator('#soundToggle').click();
      await page.locator('#speedPursuit').fill('3.10');
      await page.locator('#hesitationChance').fill('0.50');
      await page.locator('#applyTuning').click();
      const replay=await page.evaluate(()=>window.__CC2_02A__.replay());
      check(replay.personality.hesitationChance===0.5,
        'developer personality tuning persists in deterministic replay');
      await page.locator('.dev-controls summary').click();
      await page.locator('#mode').selectOption('practice');
      const first=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem);
      // Qualify the actual intermediate travel frames, not just the landing.
      const travelEvidence=await page.evaluate((id)=>{
        const api=window.__CC2_02A__;
        const before=api.snapshot();
        const initialCam=api.rendererStats();
        const canvas=document.querySelector('#worldCanvas');
        const initialY=(before.spark.y-initialCam.cameraY)*
          initialCam.effectiveZoom*canvas.clientWidth/600;
        document.querySelector('button[data-platform-id="'+id+'"]').click();
        let maxTickMovement=0;
        for(let i=0;i<10;i++){
          const a=api.snapshot();
          api.advanceForQA(1);
          const b=api.snapshot();
          maxTickMovement=Math.max(maxTickMovement,
            Math.hypot(b.spark.x-a.spark.x,b.spark.y-a.spark.y));
        }
        const state=api.snapshot(),camera=api.rendererStats();
        const currentY=(state.spark.y-camera.cameraY)*
          camera.effectiveZoom*canvas.clientWidth/600;
        return {phase:state.phase,maxTickMovement,displayShift:Math.abs(currentY-initialY),
          camera,sourceY:state.spark.y};
      },first.correctPlatformId);
      check(travelEvidence.phase==='outbound' &&
        travelEvidence.maxTickMovement<=19.500001,
        'Spark follows actual circuit route at <=19.5 units/tick; no teleport');
      check(travelEvidence.displayShift>1,
        'visible Spark moves vertically inside camera instead of being screen-pinned');
      check(travelEvidence.camera.viewportCoverage.above>=2 &&
        travelEvidence.camera.viewportCoverage.below>=2,
        'follow headroom retains 2+2 visible tiers during live climb');
      await page.screenshot({path:join(captures,'expanded-midtravel-390.png'),fullPage:true});
      await page.evaluate(()=>{
        const api=window.__CC2_02A__;
        for(let i=0;i<400;i++){
          const state=api.snapshot();
          if(state.phase==='ready'||state.phase==='ended')break;
          api.advanceForQA(1);
        }
      });
      const report=await page.evaluate(()=>({
        state:window.__CC2_02A__.snapshot(),feedback:window.__CC2_02A__.feedbackHistory(),
      }));
      check(report.state.completedRows===1,'real correct Spark landing works after tuning');
      check(report.feedback.includes('solve'),'source-landed equation emits success cue');
      check(report.state.solved[0].result===first.targetValue,'math correctness unaffected');
      const text=await page.locator('#viewReadout').innerText();
      check(text.includes('1.50× REAL GAP'),
        'visual readout identifies genuinely expanded world');
      check(text.includes('2 ROWS ABOVE / 2 BELOW'),'visible viewport coverage label');
    }
    await page.close();
  }
  console.log('CC2-06D BROWSER PASS — '+n+' assertions');
}finally{await browser.close();await server.stop();}
