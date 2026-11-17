/**
 * CC2-30F release gate: browser-parse the EXACT file copied to Vercel.
 *
 * Regression: earlier checks merely searched for component tokens in the
 * produced file. They missed source text leaking into the visible document
 * and an empty board on a real iPhone. Never replace this test with an
 * unbundled dev-server smoke: the artifact is the product.
 */
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const html=readFileSync('dist/cc2-30.html','utf8');
const server=createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store'});
  res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,
  executablePath:findChromium(),args:LAUNCH_ARGS});
const url='http://127.0.0.1:'+server.address().port+
  '/cc2-30.html?cc2Ui=slate-focus&cc230=1&cc230Blanket=1&cc2Flow=1';
let fail=false;
try {
 for(const [width,height] of [[390,844],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(900);
   const details=await page.evaluate(()=>{
     const canvas=document.querySelector('#worldCanvas');
     const root=document.querySelector('#board');
     const api=window.__CC2_02A__;
     const text=document.body.innerText||'';
     const spill=/(?:vfxEnabled|vfxIntensity|Math\.sin\(t\.tick|\.beginPath\(\)|\.strokeStyle\s*=)/.test(text);
     const scriptChildren=Array.from(document.scripts).map(s=>
       ({id:s.id,src:s.src,kind:s.type,chars:s.textContent?.length||0}));
     const context=canvas?.getContext('2d');
     let painted=0;
     if(context&&canvas.width&&canvas.height){
       const p=context.getImageData(0,0,canvas.width,canvas.height).data;
       for(let i=0;i<p.length;i+=Math.max(4,Math.floor(p.length/512/4)*4))
         if(p[i]||p[i+1]||p[i+2])painted++;
     }
     return {
       api:Boolean(api),drawCount:api?.rendererStats?.()?.previewRowsRendered,
       canvas:{width:canvas?.width,height:canvas?.height,painted},
       choices:document.querySelectorAll('button.choice').length,
       spill,spillSample:spill?text.slice(-1000):'',
       bodyLength:text.length,scripts:scriptChildren,
       boardWidth:root?.getBoundingClientRect().width,
     };
   });
   console.log('CC2-30F_STANDALONE_DIAGNOSTIC',width,JSON.stringify(details));
   if(!details.api||details.spill||!details.canvas.width||
     !details.canvas.height||details.canvas.painted<15||
     details.boardWidth<220||errors.length){
     throw Error('CC2_STANDALONE_RENDER_INVALID '+width+
       ' '+JSON.stringify({details,errors}));
   }
   await page.locator('#cc209c-enter').click();
   await page.waitForFunction(()=>
     window.__CC2_02A__?.snapshot?.()&&
     document.querySelectorAll('button.choice').length===3,
     null,{timeout:6000});
   const playable=await page.evaluate(()=>({
     rows:window.__CC2_02A__.rendererStats().flowRowsEachSide,
     buttons:document.querySelectorAll('button.choice').length,
   }));
   if(playable.rows!==3||playable.buttons!==3)
     throw Error('CC2_STANDALONE_GAMEPLAY_NOT_READY '+JSON.stringify(playable));
  }finally{await page.close();}
 }
} catch(error){fail=true;console.error(String(error));}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(fail)process.exitCode=1;
