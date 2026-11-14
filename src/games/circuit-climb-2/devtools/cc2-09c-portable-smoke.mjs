/** Offline exact-bundle CC2-09C with HTTP requests forbidden. */
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {findChromium,LAUNCH_ARGS} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';
const html=readFileSync(resolve('cc2-standalone/CC2-09C-Source-Integrated-Playable.html'),'utf8');
if(/type="module" src=/.test(html))throw Error('OFFLINE_ENTRY_NOT_EMBEDDED');
const browser=await chromium.launch({headless:true,executablePath:findChromium(),args:LAUNCH_ARGS});
let n=0;
try{
 for(const [width,height] of [[320,568],[390,844],[826,680]]){
  const page=await browser.newPage({viewport:{width,height},acceptDownloads:true});
  const failures=[];page.on('pageerror',e=>failures.push(String(e)));
  await page.route('**/*',route=>{if(/^https?:/i.test(route.request().url()))throw Error('OFFLINE_HTTP_BLOCKED');return route.continue()});
  await page.setContent(html,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__CC2_09C__?.summary&&window.__CC2_02A__?.snapshot,{timeout:15000});
  const s=await page.evaluate(()=>({gap:window.__CC2_02A__.snapshot().world.geometry.rowGap,
   tick:window.__CC2_02A__.snapshot().tick,errors:window.__CC2_09C__.summary().errors}));
  if(s.gap!==576.5625||s.tick!==0||s.errors||failures.length)throw Error('OFFLINE_SMOKE_FAIL '+JSON.stringify({s,failures}));
  const correct=await page.evaluate(()=>window.__CC2_02A__.snapshot().currentProblem.correctPlatformId);
  await page.locator('#cc209c-enter').click();
  await page.locator('button.choice[data-platform-id="'+correct+'"]').click();
  await page.waitForTimeout(400);
  if(!(await page.evaluate(()=>window.__CC2_02A__.snapshot().tick>0)))throw Error('OFFLINE_GAME_NOT_RUNNING');
  n++;
  await page.close();
 }
}finally{await browser.close()}
console.log('CC2-09C offline bundled gameplay PASS '+n);
