/**
 * CC2-MAINT-31B — result integrity, truthful review, clean session restart.
 * Only tests the exact assembled standalone HTML. Never seeds scores or
 * fabricates source engine receipts. One real correct choice is required.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
import {findChromium,LAUNCH_ARGS}
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const content=readFileSync('dist/cc2-30.html','utf8');
const server=createServer((req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
 res.end(content);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 executablePath:findChromium(),args:LAUNCH_ARGS});
mkdirSync('cc2-maint-31-evidence',{recursive:true});
const notes=[];
const check=(ok,label,details={})=>{
 notes.push({ok:Boolean(ok),label,details});
 if(!ok)throw Error('CC2_MAINT_31B_FAIL '+label+' '+JSON.stringify(details));
 console.log('PASS CC2_MAINT_31B '+label);
};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+
    '/cc2-30.html',{waitUntil:'domcontentloaded'});
  await page.locator('#cc209c-enter').click();
  const firstId=await page.evaluate(()=>window.__CC2_02A__
    .snapshot().currentProblem.correctPlatformId);
  await page.locator('button.choice[data-platform-id="'+firstId+'"]').click();
  await page.waitForFunction(()=>
    window.__CC2_02A__?.snapshot?.()?.completedRows>=1,
    null,{timeout:18000});
  const before=await page.evaluate(()=>{
   const a=window.__CC2_02A__,s=a.snapshot();
   return {runId:s.runId,rows:s.completedRows,solved:s.solved.length,
     attempts:s.attempts,score:s.score,phase:s.phase};
  });
  check(before.rows===1&&before.solved===1&&before.attempts===1,
    'one genuine solved equation precedes termination',before);
  // The explicit end-run control is in Developer Settings, not in gameplay.
  // Trigger its real DOM click handler to verify end and summary wiring.
  await page.evaluate(()=>document.querySelector('#endRun').click());
  await page.waitForFunction(()=>window.__CC2_02A__
    .snapshot().phase==='ended'&&!document.querySelector('#summaryPanel').hidden,
    null,{timeout:7000});
  const ending=await page.evaluate(()=>{
   const a=window.__CC2_02A__,s=a.snapshot(),report=a.summary();
   const summary=document.querySelector('#summaryPanel');
   return {phase:s.phase,runId:s.runId,solved:s.solved.length,
     source:report,receipt:a.events().filter(e=>e.type==='RUN_ENDED').length,
     shownEquations:[...summary.querySelectorAll('#summaryEquations li')]
       .map(e=>e.textContent),
     summaryOpen:!summary.hidden,
     stats:[...summary.querySelectorAll('#summaryStats .summary-metric')]
       .map(e=>e.textContent.trim())};
  });
  check(ending.phase==='ended'&&ending.summaryOpen&&ending.receipt===1,
    'one authoritative RUN_ENDED displays result',ending);
  check(ending.source?.rowsSolved===1 &&
    ending.source?.equations.length===1 &&
    ending.shownEquations.length===1 &&
    ending.shownEquations[0].includes('Row 1'),
    'final review contains only genuinely solved equation',ending);
  check(ending.source?.score===before.score&&
    ending.source?.attempts===before.attempts &&
    ending.source?.correctAttempts===1&&
    ending.source?.wrongAttempts===0,
    'summary score and attempts reconcile to source',ending);
  const digest=await page.evaluate(()=>window.__CC2_02A__
    .sessionReport().stateDigest);
  const frozen=await page.evaluate(()=>{
   const api=window.__CC2_02A__,s=api.snapshot();
   return {id:s.currentProblem.correctPlatformId,
     before:s.attempts,tick:s.tick,phase:s.phase};
  });
  await page.evaluate(id=>{
   document.querySelector('button.choice[data-platform-id="'+id+'"]')?.click();
  },frozen.id);
  const after=await page.evaluate(()=>{
   const api=window.__CC2_02A__,s=api.snapshot();
   return {attempts:s.attempts,tick:s.tick,phase:s.phase,
     digest:api.sessionReport().stateDigest};
  });
  check(after.phase==='ended'&&after.attempts===frozen.before &&
    after.digest===digest,
    'terminated session rejects stray answer clicks',after);
  await page.screenshot({path:'cc2-maint-31-evidence/31b-end-summary.png',
    animations:'disabled',fullPage:true});
  await page.locator('#summaryRestart').click();
  await page.waitForFunction(()=>{
   const s=window.__CC2_02A__.snapshot();
   return s.phase==='ready'&&s.completedRows===0&&s.tick===0;
  },null,{timeout:7000});
  const started=await page.evaluate(()=>{
   const a=window.__CC2_02A__,s=a.snapshot();
   return {runId:s.runId,rows:s.completedRows,attempts:s.attempts,
     score:s.score,solved:s.solved.length,phase:s.phase,
     guardian:a.creature(),summaryHidden:document.querySelector('#summaryPanel').hidden,
     events:a.events().map(e=>e.type),
     featureEvents:a.featureEvents().map(e=>e.type),
     recorded:a.sessionReport().metrics,
   };
  });
  // Run ID is intentionally deterministic from seed + run ordinal on a
  // newly constructed engine. Do NOT alter math RNG or replay just to force
  // uniqueness. Require actual event and state isolation instead.
  check(started.rows===0&&started.attempts===0&&
    started.score===0&&started.solved===0&&
    started.guardian?.activeField===null&&started.summaryHidden&&
    started.events.filter(x=>x==='RUN_STARTED').length===1&&
    !started.events.includes('RUN_ENDED')&&
    started.featureEvents.every(x=>x!=='ABILITY_ACTIVATED'),
    'summary restart creates isolated state and clean source ledgers',started);
  check(errors.length===0,'no runtime exception during end/replay',{errors});
 }finally{await page.close();}
}finally{
 writeFileSync('cc2-maint-31-evidence/maintenance-end-summary.json',
  JSON.stringify(notes,null,2));
 await browser.close();
 await new Promise(done=>server.close(done));
}
