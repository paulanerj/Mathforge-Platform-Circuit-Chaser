/**
 * Circuit Climb — learner routing smoke test.
 *
 * The critical path only: launch, first selection in each column, a correct
 * travel, a wrong travel, and several consecutive decisions. It exists because
 * the vitest suite cannot reach the runtime hook, so nothing else proves the
 * game is actually clickable in a browser.
 *
 * This is the FAST single-viewport loop. For the supported gate — which starts
 * its own server, sweeps the viewport and world-framing matrices, and asserts
 * the canvas actually painted — use:
 *
 *   npm run test:circuit-climb:browser
 *
 * This one still expects you to bring your own dev server, because that is what
 * makes it quick to re-run while iterating on a single width:
 *
 *   npx vite --port=3000 &              # a dev server on :3000
 *   npm run test:circuit-climb:smoke
 *
 * Options:  VW=390 CHROME=/path/to/chrome node ...<script>
 * Exits non-zero on failure, so it can gate a release by hand.
 *
 * Clicks are driven from COMPUTED WORLD COORDINATES. With the camera settled the
 * active row always sits at a fixed screen height, because the camera anchors on
 * the player and the active row is always exactly one rowGap above them. Pixel
 * detection of the row underlines was tried and fails at 320 and whenever a
 * platform shorts out and loses its underline.
 */
import { chromium } from 'playwright-core';

const VW = Number(process.env.VW || 430);
const URL = process.env.URL || 'http://127.0.0.1:3000/';
const EXECUTABLE = process.env.CHROME || undefined;

// Accepted geometry at the default 100% view scale.
const CAMERA_ANCHOR = 0.6, PLAYER_RADIUS = 32, ROW_GAP = 205, PLATFORM_H = 62;
const COLS = { LEFT: 110, CENTER: 300, RIGHT: 490 };

const results = [];
const check = (name, pass, note = '') => {
  results.push({ name, pass, note });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(26)} ${note}`);
};

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: VW, height: 900 }, deviceScaleFactor: 1 });

const errors = [], routeFailures = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => {
  const t = m.text();
  if (t.includes('CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED')) routeFailures.push(t.slice(0, 200));
  else if (m.type() === 'error' && !/404/.test(t)) errors.push(t);
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

const clickText = async (t) => {
  const el = page.locator(`button:has-text("${t}")`).first();
  await el.waitFor({ timeout: 15000 });
  await el.click();
};
await page.waitForTimeout(1100);
await clickText('Circuit Climb');
await page.waitForTimeout(1400);
await clickText('START PROTOTYPE');
await page.waitForTimeout(700);
check('launch', true, `viewport ${VW}`);

const box = await page.locator('#gameCanvas').boundingBox();
const ws = box.width / 600;
const logicalHeight = box.height / ws;
const rowScreenY = logicalHeight * CAMERA_ANCHOR + PLAYER_RADIUS + 3 - ROW_GAP;

const message = async () => ({
  text: (await page.locator('#message').innerText().catch(() => '')).trim(),
  tone: (await page.locator('#message').getAttribute('class').catch(() => '')) || '',
});
const clickColumn = (col) =>
  page.mouse.click(box.x + COLS[col] * ws, box.y + (rowScreenY + PLATFORM_H / 2) * ws);

// First selection in each column, each from a fresh run.
for (const col of ['LEFT', 'CENTER', 'RIGHT']) {
  const before = await message();
  await clickColumn(col);
  await page.waitForTimeout(450);
  const after = await message();
  check(`first ${col}`, after.text !== before.text && /=/.test(after.text), `"${after.text}"`);
  await page.waitForTimeout(1900);
  await clickText('RESTART');
  await page.waitForTimeout(900);
}

// A correct travel, a wrong travel, and several consecutive decisions.
let correct = null, wrong = null, decisions = 0;
for (let i = 0; i < 20 && (!correct || !wrong || decisions < 5); i += 1) {
  if (/Caught by the surge/i.test((await message()).text)) {
    await clickText('RESTART');
    await page.waitForTimeout(900);
    continue;
  }
  const before = await message();
  await clickColumn(['LEFT', 'CENTER', 'RIGHT'][i % 3]);
  await page.waitForTimeout(400);
  const during = await message();
  if (during.text === before.text) continue; // already-shorted platform
  decisions += 1;

  const seen = [];
  for (let t = 0; t < 20; t += 1) {
    await page.waitForTimeout(150);
    const now = (await message()).text;
    if (!seen.includes(now)) seen.push(now);
  }
  if (/success/.test(during.tone) && !correct) correct = during.text;
  if (/error/.test(during.tone) && !wrong && seen.some((t) => /Short circuit/i.test(t))) wrong = during.text;
}
check('correct travel', !!correct, correct || 'not observed');
check('wrong travel shorts', !!wrong, wrong || 'not observed');
check('consecutive decisions', decisions >= 5, `${decisions} accepted`);
check('no route failures', routeFailures.length === 0, routeFailures[0] || 'none logged');
check('no console errors', errors.length === 0, errors[0] || 'none');

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\nSMOKE ${failed.length ? 'FAIL' : 'PASS'} — ${results.length - failed.length}/${results.length} at viewport ${VW}`);
process.exit(failed.length ? 1 : 0);
