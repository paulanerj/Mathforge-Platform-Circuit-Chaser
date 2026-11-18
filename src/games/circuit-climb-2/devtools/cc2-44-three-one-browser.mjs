/**
 * CC2-44 — real packaged Circuit Climb browser acceptance.
 *
 * Tests the visible Heritage painter and the real DOM answer buttons,
 * not the hidden worldCanvas preview or a disconnected demonstration.
 *
 * Screenshots: cc2-44-evidence/three-up-one-down-*.png
 * This test deliberately leaves source gameplay/math untouched.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
if(!html.includes('cc244RowPitch')||!html.includes('cc243-locked-geometry-contract'))
  throw Error('CC244_EXPECTED_UI_MISSING_IN_PACKAGE');
const server=createServer((_req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/cc2-30.html';
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-44-evidence',{recursive:true});
const checks=[];
function assert(ok,label,details={}){
  checks.push({ok:Boolean(ok),label,details});
  if(!ok)throw Error('CC244_BROWSER_REGRESSION '+JSON.stringify(checks.at(-1)));
  console.log('PASS CC244 '+label);
}
const metrics=page=>page.evaluate(()=>{
  const api=window.__CC2_02A__;
  const source=api.snapshot();
  const renderer=api.rendererStats();
  const board=document.getElementById('board');
  const canvas=document.getElementById('worldCanvas');
  const width=canvas.clientWidth;
  const height=canvas.clientHeight;
  const gap=source.world.geometry.rowGap;
  const rowY=row=>(-row*gap-renderer.cameraY)*
    renderer.effectiveZoom*width/600;
  const future=window.__CC2_09B__?.summary?.()?.futureTiers?.centers??[];
  const rows=[...new Set(future.map(p=>p.row))].sort((a,b)=>a-b);
  const first=document.querySelector('button.choice');
  const optionHit=(()=>{
    if(!first)return false;
    const r=first.getBoundingClientRect(),el=document.elementFromPoint(
      r.left+r.width/2,r.top+r.height/2);
    return el===first||first.contains(el);
  })();
  const dormantPixels=(()=>{
    const c=document.getElementById('cc209b-heritage-canvas');
    const ctx=c.getContext('2d'),scale=c.width/c.getBoundingClientRect().width;
    return future.filter(p=>p.row===-1).map(p=>{
      const sample=(x,y)=>{
        const X=Math.max(0,Math.min(c.width-1,Math.round(x*scale)));
        const Y=Math.max(0,Math.min(c.height-1,Math.round(y*scale)));
        return [...ctx.getImageData(X,Y,1,1).data].slice(0,3);
      };
      const inside=sample(p.x,p.y+p.height*.15);
      const background=sample(p.x,p.y-p.height*.9-8);
      return inside.reduce((sum,v,i)=>sum+Math.abs(v-background[i]),0);
    });
  })();
  return {
    cssPitch:parseFloat(getComputedStyle(board).getPropertyValue('--cc243-row-pitch')),
    boardWidth:board.clientWidth,boardHeight:board.clientHeight,
    visibleWidth:width,visibleHeight:height,
    lockedClass:document.body.classList.contains('cc243-locked-spacing'),
    rendered:renderer,rows,firstRow:source.currentProblem.rowIndex,
    row0Y:rowY(0),rowAhead3:rowY(3),rowBehind1:rowY(-1),
    belowPhysicalRowCount:source.world.rows.filter(r=>r.index<source.spark.row).length,
    sourceTick:source.tick,sourceDigest:api.sessionReport().stateDigest,
    physicalGap:gap,options:document.querySelectorAll('button.choice').length,
    optionHit,dormantPixels,errors:window.__CC2_09B__.summary().errors,
    paintFailures:window.__CC2_09B__.summary().paintFailures,
  };
});

try{
  for(const [width,height,pitch] of [
    [320,700,96],[390,844,96],[428,926,96],[768,1024,108],[988,874,108]
  ]){
    const page=await browser.newPage({viewport:{width,height}});
    const jsErrors=[];
    page.on('pageerror',err=>jsErrors.push(String(err)));
    try{
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.locator('#cc209c-enter').click();
      await page.waitForFunction(()=>
        window.__CC2_02A__?.rendererStats?.()?.flowRowsBelow===1 &&
        window.__CC2_09B__?.summary?.()?.futureTiers?.centers?.some(
          p=>p.row===-1),
        null,{timeout:25000});
      await page.waitForTimeout(90);
      const m=await metrics(page);
      assert(m.lockedClass&&m.cssPitch===pitch,
        'flow pitch selects correct phone/tablet default '+width,m);
      assert(m.rendered.flowRowsAbove===3&&m.rendered.flowRowsBelow===1,
        'three above / one below source-camera presentation '+width,m.rendered);
      assert(m.rows.includes(-1)&&!m.rows.some(r=>r<-1)&&
        m.rows.includes(2)&&m.rows.includes(3)&&
        !m.rows.some(r=>r>3),
        'exact visible structural row bounds '+width,{rows:m.rows});
      const visualTop=m.rowAhead3;
      const visualBottom=m.rowBehind1;
      assert(visualTop>=41&&visualTop<=59 &&
        visualBottom<m.visibleHeight-100 &&
        visualBottom>m.visibleHeight-140,
        'top tier and single lower tier preserve breathing room '+width,{
          top:visualTop,bottom:visualBottom,height:m.visibleHeight});
      assert(Math.abs((m.row0Y-m.rowAhead3)-3*pitch)<.5 &&
        Math.abs((m.rowBehind1-m.row0Y)-pitch)<.5,
        'screen-space tier distances not canceled by camera '+width,m);
      assert(m.options===3&&m.optionHit,
        'all three legitimate answer buttons remain clickable '+width,
        {options:m.options,hit:m.optionHit});
      assert(m.dormantPixels.length===3&&m.dormantPixels.every(x=>x>=15),
        'one dormant lower tier genuinely visible on Heritage canvas '+width,
        {pixels:m.dormantPixels});
      assert(m.errors===0&&m.paintFailures===0&&jsErrors.length===0,
        'no browser or visible renderer exceptions '+width,{
          jsErrors,errors:m.errors,paintFailures:m.paintFailures});

      // Open actual player Settings > Developer tools > Camera, then press
      // the keyboard arrow key on the input; not an unmounted DOM test.
      await page.locator('#cc209-settings-btn').click();
      await page.locator('#cc209-settings > .cc209-dialog > details').last()
        .locator('summary').first().click();
      await page.locator('#tuningPanel > summary').click();
      const slider=page.locator('#cc244RowPitch');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      const changed=await metrics(page);
      assert(changed.cssPitch===pitch+2 &&
        Math.abs(changed.boardHeight-m.boardHeight-8)<=1,
        'live slider grows stage and visibly changes pitch '+width,{
          originalPitch:pitch,updatedPitch:changed.cssPitch,
          originalHeight:m.boardHeight,changedHeight:changed.boardHeight});
      assert(Math.abs((changed.rowBehind1-changed.row0Y)-(pitch+2))<.5 &&
        Math.abs((changed.row0Y-changed.rowAhead3)-3*(pitch+2))<.5,
        'canvas projection follows slider, no camera compensation '+width);
      assert(changed.sourceDigest===m.sourceDigest &&
        changed.physicalGap===m.physicalGap &&
        changed.sourceTick===m.sourceTick,
        'slider never mutates source mathematical run, tick or physical gap '+width);
      await page.locator('#cc209-settings [data-close="cc209-settings"]').click();
      await page.screenshot({path:'cc2-44-evidence/three-up-one-down-'+width+'.png',
        animations:'disabled',fullPage:true});
    }finally{await page.close();}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto(base+'?cc2Flow=0&cc230=0',
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__CC2_02A__?.rendererStats?.(),
      null,{timeout:15000});
    const m=await page.evaluate(()=>({
      className:document.body.classList.contains('cc243-locked-spacing'),
      below:window.__CC2_02A__.rendererStats().flowRowsBelow,
      disabled:document.getElementById('cc244RowPitch').disabled,
    }));
    assert(!m.className&&m.below===2&&m.disabled,
      'historic non-flow camera and slider behavior unchanged',m);
  }finally{await page.close();}
  console.log('CC2-44 qualified browser assertions',checks.length);
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
  writeFileSync('cc2-44-evidence/browser-results.json',
    JSON.stringify(checks,null,2));
}
