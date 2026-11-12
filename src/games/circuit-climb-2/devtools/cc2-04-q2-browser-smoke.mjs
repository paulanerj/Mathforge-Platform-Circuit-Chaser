/**
 * CC2-04-Q2: real browser qualification of the ACTUAL game page and actual
 * mathematical engine. Do not substitute synthetic arrays for platform UI.
 */
import { chromium } from 'playwright-core';
import { findChromium, LAUNCH_ARGS, startDevServer }
  from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server = await startDevServer({ port: 3172 });
let browser;
let assertions = 0;
const check = (yes, label) => {
  if (!yes) throw Error('CC2_Q2_BROWSER_FAIL: ' + label);
  assertions++;
  console.log('PASS ' + label);
};
const url = new URL(
  'src/games/circuit-climb-2/devtools/cc2-04.html?manual=1', server.url,
).toString();

async function landCorrect(page) {
  return await page.evaluate(() => {
    const api = window.__CC2_02A__;
    const before = api.snapshot();
    const button = document.querySelector(
      'button[data-platform-id="' + before.currentProblem.correctPlatformId + '"]',
    );
    if (!button) throw Error('Q2_MISSING_REAL_PLATFORM');
    button.click();
    for (let i = 0; i < 350; i++) {
      const after = api.snapshot();
      if (after.phase === 'ready' || after.phase === 'ended') return after;
      api.advanceForQA(1);
    }
    throw Error('Q2_TRAVEL_STALLED');
  });
}

try {
  browser = await chromium.launch({
    executablePath: findChromium(), headless: true, args: LAUNCH_ARGS,
  });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    const page = await browser.newPage({viewport});
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(url, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => Boolean(window.__CC2_02A__?.snapshot));
    const first = await page.evaluate(() => window.__CC2_02A__.snapshot());
    check(first.currentProblem.targetValue === 10,
      viewport.width+'px: demo defaults to original first-row target 10');
    check(first.currentProblem.options.filter(o =>
      first.spark.value + o.value === 10).length === 1,
      viewport.width+'px: exactly one physically selectable complement');
    check(first.currentProblem.options.some(o =>
      o.value === 10-first.spark.value),
      viewport.width+'px: required target-10 complement visible');
    check((await page.locator('#equation').innerText()) ===
      first.spark.value+' + ? = 10',
      viewport.width+'px: target equation communicates Spark relation');
    check((await page.locator('#curriculumBadge').innerText()).includes('MAKE TARGET'),
      viewport.width+'px: mathematical curriculum identified on screen');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),
      viewport.width+'px: no horizontal overflow');
    check(errors.length === 0, viewport.width+'px: no script errors');
    await page.close();
  }

  const skip = await browser.newPage({viewport:{width:390,height:844}});
  await skip.goto(url, {waitUntil:'domcontentloaded'});
  await skip.waitForFunction(() => Boolean(window.__CC2_02A__?.snapshot));
  await skip.locator('.dev-controls summary').click();
  await skip.locator('#mode').selectOption('practice');
  await skip.locator('#curriculum').selectOption('skip2to10');
  const init = await skip.evaluate(() => window.__CC2_02A__.snapshot());
  check(init.spark.value===2 && init.currentProblem.targetValue===4,
    'skip mode begins 2 -> 4');
  check(init.currentProblem.options.every(o => [2,4,6,8,10].includes(o.value)),
    'skip mode has only valid even sequence candidates');
  check((await skip.locator('#equation').innerText()).includes('Count by 2'),
    'UI shows counting operation rather than an addition lie');

  for (let row=1;row<=4;row++) {
    const before = await skip.evaluate(() => window.__CC2_02A__.snapshot());
    check(before.currentProblem.incomingValue===row*2 &&
      before.currentProblem.targetValue===row*2+2,
      'skip expected row '+row+' correctly shown');
    const after=await landCorrect(skip);
    check(after.completedRows===row, 'skip landed row '+row);
  }
  const end=await skip.evaluate(() => window.__CC2_02A__.summary());
  check(end.equations.length===4 &&
    end.equations.every(e=>e.equation.includes('count by 2')),
    'summary uses actual skip-count equations, not fake addition');

  await skip.locator('#summaryRestart').click();
  await skip.locator('#curriculum').selectOption('add20');
  const running=await skip.evaluate(() => window.__CC2_02A__.snapshot());
  check(running.currentProblem.operation==='add' &&
    running.currentProblem.targetValue===
      running.currentProblem.incomingValue+running.currentProblem.correctValue,
    'legacy running addition remains available and valid');
  await skip.close();
  console.log('CC2-04-Q2 BROWSER PASS — '+assertions+' assertions');
} finally {
  if (browser) await browser.close();
  await server.stop();
}
