/**
 * CC2-02A — real-browser smoke of the NEW standalone development surface.
 *
 * This tests visible, clickable DOM options and a painted Canvas, not a
 * synthetic fake core. It starts/stops its own Vite server and fails on any
 * assertion. It explicitly does NOT test a pursuer (that is CC2-02B).
 */
import { chromium } from 'playwright-core';
import {
  findChromium, LAUNCH_ARGS, startDevServer,
} from '../../circuit-climb/tools/circuitClimbBrowserHarness.mjs';

const server = await startDevServer({ port: 3122 });
const browser = await chromium.launch({
  headless: true, executablePath: findChromium(), args: LAUNCH_ARGS,
});
const scenarioUrl = new URL(
  'src/games/circuit-climb-2/devtools/cc2-02a.html',
  server.url,
).toString();
let count = 0;
const check = (ok, message) => {
  if (!ok) throw new Error(message);
  count += 1;
  console.log('  PASS ' + message);
};

async function snapshot(page) {
  return page.evaluate(() => window.__CC2_02A__.snapshot());
}

async function select(page, platformId) {
  await page.locator(`button[data-platform-id="${platformId}"]`).click();
}

async function solveCorrect(page) {
  const before = await snapshot(page);
  await select(page, before.currentProblem.correctPlatformId);
  await page.waitForFunction(
    completed => window.__CC2_02A__.snapshot().completedRows > completed,
    before.completedRows, { timeout: 9000 },
  );
  return snapshot(page);
}

async function open(page, width, framing = '100') {
  await page.setViewportSize({ width, height: 840 });
  await page.goto(scenarioUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__CC2_02A__, { timeout: 12000 });
  // Q1 moves developer configuration out of the learner's first viewport.
  // Explicitly open/close the settings section before changing framing.
  await page.locator('.dev-controls summary').click();
  await page.locator('#framing').selectOption(framing);
  await page.locator('.dev-controls summary').click();
  await page.waitForTimeout(400);
}

try {
  console.log('CC2-02A browser qualification, no Pursuer');
  for (const width of [320, 390, 428, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 840 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await open(page, width);
    const initial = await snapshot(page);
    check(initial.currentProblem.options.length === 3, `${width}px: three mathematical choices`);
    check(await page.locator('.choice').count() === 3, `${width}px: three DOM buttons visible`);
    const painted = await page.locator('canvas').evaluate(canvas => {
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4 * 317) {
        colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
      }
      return colors.size;
    });
    check(painted >= 15, `${width}px: game canvas actually painted (${painted} colors)`);
    const wrong = initial.currentProblem.options.find(o => o.platformId !== initial.currentProblem.correctPlatformId);
    await select(page, wrong.platformId);
    await page.waitForFunction(() =>
      window.__CC2_02A__.snapshot().phase === 'ready' &&
      window.__CC2_02A__.snapshot().wrongAttempts === 1, { timeout: 9000 });
    const afterWrong = await snapshot(page);
    check(afterWrong.spark.value === initial.spark.value &&
      afterWrong.currentProblem.problemId === initial.currentProblem.problemId,
      `${width}px: wrong choice shorts and returns without changing the math`);
    const afterRight = await solveCorrect(page);
    check(afterRight.completedRows === 1 && afterRight.solved.length === 1,
      `${width}px: correct landing commits one row`);
    await page.locator('#pause').click();
    const hold = (await snapshot(page)).tick;
    await page.waitForTimeout(320);
    check((await snapshot(page)).tick === hold, `${width}px: pause freezes simulation`);
    await page.locator('#pause').click();
    await page.locator('#restart').click();
    check((await snapshot(page)).completedRows === 0, `${width}px: restart returns to clean row`);
    check(errors.length === 0, `${width}px: no browser page exceptions`);
    await page.close();
  }

  // Route viability at the largest accepted world framing is a high-value
  // mutation lock from the original SOT-20 incident.
  const page = await browser.newPage({ viewport: { width: 428, height: 840 } });
  await open(page, 428, '120');
  for (let lane = 0; lane < 3; lane += 1) {
    const before = await snapshot(page);
    await select(page, before.currentProblem.options[lane].platformId);
    await page.waitForFunction(
      () => window.__CC2_02A__.snapshot().attempts === 1,
      { timeout: 3000 },
    );
    check((await snapshot(page)).phase === 'outbound' ||
      (await snapshot(page)).phase === 'ready',
      `120% framing: column ${lane} physically accepts selection`);
    await page.locator('#restart').click();
  }

  // Check four successive actual DOM selections, not merely generated math.
  for (let row = 0; row < 4; row += 1) {
    const next = await solveCorrect(page);
    check(next.completedRows === row + 1, `cell continuity: landed row ${row + 1}`);
  }
  const final = await snapshot(page);
  const events = await page.evaluate(() => window.__CC2_02A__.events());
  check(events.filter(e => e.type === 'VOLTAGE_REBASE').length === 1,
    'four-row cell emits exactly one explicit voltage rebase');
  check(final.currentProblem.incomingValue === final.spark.value,
    'new cell starts from the visible rebased Spark number');
  await page.close();
  console.log(`CC2-02A BROWSER PASS — ${count} assertions`);
} finally {
  await browser.close();
  await server.stop();
}
