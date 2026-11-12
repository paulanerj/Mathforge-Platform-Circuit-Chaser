/**
 * CC2-02A-Q1 visual and interaction qualification.
 *
 * Uses the actual standalone CC2 learner surface in headless Chromium.
 * Collects rendered screenshots as CI artifacts. Assertions check physical
 * target sizes, viewport fit, mathematical feedback, wrong-return visibility,
 * four-row recharge, and canvas backing-store behavior.
 *
 * The Pursuer is intentionally absent; this test cannot qualify its AI.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  findChromium, LAUNCH_ARGS, startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const screenshotsDir = 'cc2-q1-screenshots';
mkdirSync(screenshotsDir, { recursive: true });
const server = await startDevServer({ port: 3134 });
let browser;
let checks = 0;
const assert = (condition, message) => {
  if (!condition) throw new Error('Q1 FAIL: ' + message);
  checks += 1;
  console.log('Q1 PASS ' + message);
};
const url = new URL('src/games/circuit-climb-2/devtools/cc2-02a.html', server.url).toString();

async function snapshot(page) {
  return page.evaluate(() => window.__CC2_02A__.snapshot());
}
async function saveShot(page, name) {
  const file = join(screenshotsDir, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('Q1 SCREENSHOT ' + file);
}
async function choose(page, platformId) {
  await page.locator('button[data-platform-id="' + platformId + '"]').click();
}
async function solve(page) {
  const before = await snapshot(page);
  await choose(page, before.currentProblem.correctPlatformId);
  await page.waitForFunction(previous =>
    window.__CC2_02A__.snapshot().completedRows > previous,
    before.completedRows, { timeout: 11000 });
  return snapshot(page);
}
async function ready(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__CC2_02A__));
  await page.waitForTimeout(250);
}
async function checkMobile(page, spec) {
  const data = await page.evaluate(() => {
    const board = document.querySelector('#board').getBoundingClientRect();
    const pause = document.querySelector('#pause').getBoundingClientRect();
    const heading = document.querySelector('#equation').getBoundingClientRect();
    const working = document.querySelector('#mathWorking').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.choice')].map(element => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width, height: rect.height,
        left: rect.left, right: rect.right,
        top: rect.top, bottom: rect.bottom,
        visible: !element.hidden,
      };
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      pauseBottom: pause.bottom,
      board: { left: board.left, right: board.right, top: board.top, bottom: board.bottom },
      equation: { left: heading.left, right: heading.right },
      overlay: { top: working.top, bottom: working.bottom },
      buttons,
    };
  });
  console.log('Q1 LAYOUT ' + spec.name + ' ' + JSON.stringify(data));
  assert(data.scrollWidth <= data.viewport.width + 1,
    spec.name + ': no horizontal page overflow');
  assert(data.pauseBottom <= data.viewport.height + 1,
    spec.name + ': Pause action is inside the first viewport');
  assert(data.buttons.length === 3 && data.buttons.every(b => b.visible),
    spec.name + ': all three numbered buttons displayed');
  assert(data.buttons.every(b => b.height >= 43.9 && b.width >= 51.9),
    spec.name + ': all choice targets at least 44px high and 52px wide');
  assert(data.buttons.every(b =>
    b.left >= data.board.left - 1 && b.right <= data.board.right + 1 &&
    b.top >= data.board.top - 1 && b.bottom <= data.board.bottom + 1),
    spec.name + ': every option stays fully within the board');
  assert(data.buttons.every(b => b.top >= data.board.top + 44),
    spec.name + ': options clear the equation-working banner');
}

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: findChromium(),
    args: LAUNCH_ARGS,
  });
  const matrix = [
    { name: '320x568', width: 320, height: 568 },
    { name: '360x640', width: 360, height: 640 },
    { name: '390x844', width: 390, height: 844 },
    { name: '428x926', width: 428, height: 926 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '1200x800', width: 1200, height: 800 },
  ];
  for (const size of matrix) {
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.width <= 428 ? 2 : 1,
    });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await ready(page);
    await checkMobile(page, size);
    await saveShot(page, 'ready-' + size.name);
    const before = await page.evaluate(() => window.__CC2_02A__.rendererStats().canvasResizes);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__CC2_02A__.rendererStats().canvasResizes);
    assert(before === after, size.name + ': no repeated backing-store reallocation');
    assert(errors.length === 0, size.name + ': no uncaught browser error (' + errors.join(' ') + ')');
    await page.close();
  }

  // Scenario-based rendered proof and mathematical integrity with visible
  // screenshots at representative iPhone Safari dimensions (Chromium
  // emulation only; this is NOT actual iPhone Safari qualification).
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await ready(page);
  const original = await snapshot(page);
  const wrong = original.currentProblem.options.find(
    o => o.platformId !== original.currentProblem.correctPlatformId);
  assert(Boolean(wrong), 'scenario: generator provides an incorrect choice');
  await choose(page, wrong.platformId);
  await page.waitForFunction(() =>
    document.querySelector('#mathWorking').textContent.includes('target'));
  assert((await page.locator('#mathWorking').innerText()).includes('target'),
    'wrong outbound shows the selected operand and its target');
  await saveShot(page, 'choice-wrong-outbound-390');
  await page.waitForFunction(() =>
    window.__CC2_02A__.snapshot().phase === 'return', null, { timeout: 11000 });
  assert((await page.locator('#mathWorking').innerText()).includes('≠'),
    'wrong landing shows real arithmetic inequality');
  assert((await snapshot(page)).spark.value === original.spark.value,
    'wrong landing never changes carried Spark value');
  await saveShot(page, 'choice-wrong-shorted-390');
  await page.waitForFunction(() =>
    window.__CC2_02A__.snapshot().phase === 'ready', null, { timeout: 11000 });
  assert((await snapshot(page)).currentProblem.problemId === original.currentProblem.problemId,
    'wrong return leaves frozen problem intact');
  const disabled = page.locator('button[data-platform-id="' + wrong.platformId + '"]');
  assert(await disabled.isDisabled(), 'shorted option disabled after return');
  await saveShot(page, 'choice-wrong-returned-390');

  let current = await solve(page);
  assert(current.completedRows === 1 && current.solved.length === 1,
    'correct landing commits exactly one equation');
  assert((await page.locator('#mathWorking').innerText()).includes('✓'),
    'correct landing shows arithmetic equation and checkmark');
  assert(current.currentProblem.incomingValue === original.currentProblem.targetValue,
    'new problem begins with the actual prior sum');
  await saveShot(page, 'correct-landing-next-math-390');

  for (let row = 2; row <= 4; row += 1) {
    const prior = current.currentProblem;
    current = await solve(page);
    if (row < 4) {
      assert(current.currentProblem.incomingValue === prior.targetValue,
        'row ' + row + ': number continuity after correct landing');
    }
  }
  const rebases = await page.evaluate(() =>
    window.__CC2_02A__.events().filter(e => e.type === 'VOLTAGE_REBASE'));
  assert(rebases.length === 1, 'four completed rows produce one voltage rebase');
  const rebase = rebases[0].detail;
  const banner = await page.locator('#cellNotice').innerText();
  assert(banner.includes(String(rebase.oldValue)) && banner.includes(String(rebase.newValue)),
    'checkpoint clearly labels old-to-new voltage');
  assert(await page.locator('#cellNotice').isVisible(),
    'voltage-rebase banner is actually painted');
  await saveShot(page, 'power-cell-recharged-390');

  await page.locator('#restart').click();
  await page.keyboard.press('1');
  assert((await snapshot(page)).attempts === 1,
    'number keyboard shortcut dispatches exactly one core attempt');
  assert(pageErrors.length === 0, 'scenario runs without uncaught browser errors');
  await page.close();
  console.log('CC2-02A-Q1 VISUAL AND INTERACTION PASS: ' + checks + ' assertions.');
} finally {
  if (browser) await browser.close();
  await server.stop();
}
