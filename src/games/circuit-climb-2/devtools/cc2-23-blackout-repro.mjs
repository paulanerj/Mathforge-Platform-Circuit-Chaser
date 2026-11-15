/**
 * CC2-23 user-reported first-click dark-screen reproduction.
 * Pixel and DOM evidence, not gameplay result assertions alone.
 *
 * Two seeds, four modes, 390px and desktop, from first valid tap through
 * actual capture, recording composite screenshots at fixed wall-clock times.
 */
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
/**
 * PNG decoder used solely to validate ACTUAL composited browser pixels.
 * No new dependencies. Supports Playwright's 8-bit RGB and RGBA screenshots.
 * A CSS computed style check alone cannot detect a GPU black compositing bug.
 */
function screenshotPixel(png,x,y){
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    throw Error('CC223_INVALID_SCREENSHOT_PNG');
  let offset=8,width=0,height=0,bpp=0,parts=[];
  while(offset<png.length){
    const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
    const part=png.subarray(offset+8,offset+8+size);
    if(type==='IHDR'){
      width=part.readUInt32BE(0);height=part.readUInt32BE(4);
      if(part[8]!==8||![2,6].includes(part[9]))
        throw Error('CC223_UNSUPPORTED_PNG_'+part[9]);
      bpp=part[9]===6?4:3;
    }
    if(type==='IDAT')parts.push(part);
    if(type==='IEND')break;
    offset+=size+12;
  }
  if(x<0||y<0||x>=width||y>=height)throw Error('CC223_BAD_PNG_SAMPLE');
  const raw=inflateSync(Buffer.concat(parts)),stride=width*bpp;
  let p=0,previous=Buffer.alloc(stride),current=Buffer.alloc(stride);
  const paeth=(a,b,c)=>{
    const q=a+b-c,aa=Math.abs(q-a),bb=Math.abs(q-b),cc=Math.abs(q-c);
    return aa<=bb&&aa<=cc?a:bb<=cc?b:c;
  };
  for(let row=0;row<=y;row++){
    const filter=raw[p++];
    for(let col=0;col<stride;col++){
      const value=raw[p++];
      const left=col>=bpp?current[col-bpp]:0;
      const up=previous[col]??0;
      const upperLeft=col>=bpp?previous[col-bpp]:0;
      let f=0;
      if(filter===1)f=left;
      else if(filter===2)f=up;
      else if(filter===3)f=Math.floor((left+up)/2);
      else if(filter===4)f=paeth(left,up,upperLeft);
      else if(filter!==0)throw Error('CC223_UNKNOWN_PNG_FILTER');
      current[col]=(value+f)&255;
    }
    if(row<y){[previous,current]=[current,previous];current.fill(0);}
  }
  return Array.from(current.subarray(x*bpp,x*bpp+3));
}

import {findChromium,LAUNCH_ARGS,startDevServer}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const server=await startDevServer({port:3276});
const browser=await chromium.launch({
  headless:true,executablePath:findChromium(),args:LAUNCH_ARGS,
});
const folder='cc2-23-blackout-evidence';mkdirSync(folder,{recursive:true});
const observations=[];
const documentHasFullBoardCanvas=record=>
  record.secondary!==null&&record.secondary.display!=='none';
const url=q=>new URL('src/games/circuit-climb-2/devtools/cc2-16a.html'+q,
  server.url).toString();
try{
  for(const mode of ['both','off','scout','sentry']){
    for(const width of [390,768]){
      const page=await browser.newPage({viewport:{
        width,height:width===390?844:1024,
      }});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      try{
        await page.goto(url((mode==='off'?'':'?cc223='+mode+'&cc223Demo=1')),
          {waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.__CC2_02A__?.snapshot?.()&&
          window.__CC2_23__?.report?.(),null,{timeout:20000});
        const intro=page.locator('#cc209c-enter');
        if(await intro.isVisible())await intro.click();
        const choice=await page.evaluate(
          ()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
        await page.locator('button.choice[data-platform-id="'+choice+'"]').click();
        let previous=0;
        for(const elapsed of [0,150,350,600,900,1300,1900,2500,3200,4500]){
          await page.waitForTimeout(Math.max(0,elapsed-previous));
          previous=elapsed;
          const record=await page.evaluate(()=>{
            const api=window.__CC2_02A__;
            const css=id=>{
              const e=document.querySelector(id);
              if(!e)return null;
              const s=getComputedStyle(e),r=e.getBoundingClientRect();
              return{display:s.display,hidden:e.hidden,visibility:s.visibility,
                opacity:s.opacity,background:s.backgroundColor,zIndex:s.zIndex,
                rect:[r.x,r.y,r.width,r.height]};
            };
            const pixel=id=>{
              const e=document.querySelector(id);
              if(!e)return null;
              try{
                const c=e.getContext('2d',{willReadFrequently:true});
                return Array.from(c.getImageData(
                  Math.min(e.width-1,Math.max(0,Math.round(e.width*.07))),
                  Math.min(e.height-1,Math.max(0,Math.round(e.height*.26))),
                  1,1).data);
              }catch(err){return String(err);}
            };
            return{tick:api.snapshot().tick,phase:api.snapshot().phase,
              endReason:api.snapshot().endReason,started:window.__cc2ChaseStarted,
              runId:api.snapshot().runId,
              sourceDigest:api.sessionReport()?.stateDigest,
              bodyClass:document.body.className,
              heritage:css('#cc209b-heritage-canvas'),
              heritagePixel:pixel('#cc209b-heritage-canvas'),
              secondary:css('#cc223-secondary-canvas'),
              secondaryPixel:pixel('#cc223-secondary-canvas'),
              board:css('#board'),captureStage:css('#cc219-stage'),
              captureShield:css('#cc219-shield'),
              preend:css('#cc209-preend'),intro:css('#cc209c-intro'),
              pause:css('#cc209c-pause'),summary:css('#summaryPanel'),
              end:css('#cc209c-end'),overlay:css('#cc218-eclipse'),
              secondarySource:api.secondary?.()?.summary||null};
          });
          record.mode=mode;record.width=width;record.elapsed=elapsed;
          record.errors=errors.slice();
          observations.push(record);
          const name='CC2-23-'+width+'-'+mode+'-'+elapsed+'ms';
          const png=await page.screenshot({path:folder+'/'+name+'.png',
            animations:'disabled'});
          const bounds=record.board.rect;
          // Two actual pixels in unobstructed grid space near its top corners.
          const samples=[
            screenshotPixel(png,Math.round(bounds[0]+21),Math.round(bounds[1]+120)),
            screenshotPixel(png,Math.round(bounds[0]+bounds[2]-21),Math.round(bounds[1]+120)),
          ];
          record.compositeGridPixels=samples;
          if(samples.some(rgb=>rgb[0]<130||rgb[1]<140||rgb[2]<150))
            throw Error('CC223_BLACKOUT_COMPOSITED_PIXELS '+name+' '+
              JSON.stringify(samples));
          if(mode!=='off'&&
            documentHasFullBoardCanvas(record))
            throw Error('CC223_FORBIDDEN_FULL_BOARD_CANVAS');
          console.log(JSON.stringify({name,tick:record.tick,
            phase:record.phase,reason:record.endReason,
            heritagePixel:record.heritagePixel,
            secondaryPixel:record.secondaryPixel,
            errors:record.errors.length,
            visibleOverlays:Object.fromEntries(
              ['captureStage','captureShield','preend','intro','pause','summary','overlay']
                .filter(k=>record[k]&&record[k].display!=='none'&&
                  record[k].visibility!=='hidden'&&
                  Number(record[k].opacity)>0)
                .map(k=>[k,record[k].zIndex]))}));
        }
      }finally{await page.close();}
    }
  }
  writeFileSync(folder+'/CC2-23-FIRST-CLICK-OBSERVATIONS.json',
    JSON.stringify(observations,null,2));
}finally{await browser.close();await server.stop();}
