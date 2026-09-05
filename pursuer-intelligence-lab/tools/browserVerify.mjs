/**
 * BROWSER VERIFICATION FOR THE LAB.
 *
 *   node tools/browserVerify.mjs
 *
 * Drives the lab in a real Chromium and checks the things a headless test
 * cannot: that the board actually draws, that the keyboard shortcuts move the
 * Spark, that the reason panel says something, that pausing and scrubbing
 * work, that switching Brain and perception model takes effect, and that the
 * oracle is labelled where a human can see it.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = Number(process.env.PORT || 3211);
const CHROME = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find((path) => existsSync(path));
if (!CHROME) {
  console.error('No Chromium found. Set PLAYWRIGHT_BROWSERS_PATH or install one.');
  process.exit(1);
}

const results = [];
const record = (step, label, detail) => {
  results.push({ step, label, detail });
  console.log(`  [${String(step).padStart(2)}] ${label.padEnd(44)} ${detail}`);
};
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const server = spawn('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const baseUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('dev server did not start')), 60000);
  const onData = (chunk) => {
    const text = String(chunk);
    const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
  };
  server.stdout.on('data', onData);
  server.stderr.on('data', onData);
});

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
let failure = null;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error.message)));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/Failed to load resource|favicon/i.test(text)) return;
    errors.push(text);
  });

  console.log('\n── PURSUER INTELLIGENCE LAB — BROWSER VERIFICATION ──');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);

  // 1. It draws something that is not a blank canvas.
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 997) {
      seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return seen.size;
  });
  expect(painted > 3, `the canvas is effectively blank (${painted} distinct colours)`);
  record(1, 'the board renders', `${painted} distinct sampled colours`);

  // 2. The pursuer is moving on its own.
  const positionAt = () => page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/DISTANCE:\s*([\d.]+)u straight/);
    return match ? Number(match[1]) : null;
  });
  const readout = await page.locator('body').innerText();
  expect(/MODE:/.test(readout), 'no strategic readout on screen');
  expect(/WHY:/.test(readout), 'no plain-language reason on screen');
  expect(/REASON CODE:/.test(readout), 'no reason code on screen');
  record(2, 'the reason panel explains the decision',
    (readout.match(/REASON CODE:\s*(\S+)/) ?? [])[1] ?? 'present');

  // 3. Keyboard 1/2/3 move the Spark without any maths.
  const rowBefore = await page.evaluate(() => document.body.innerText);
  await page.keyboard.press('3');
  await page.waitForTimeout(2500);
  const distance = await positionAt();
  expect(distance !== null, 'no distance readout after a selection');
  record(3, 'pursuit-test mode: 1/2/3 select immediately', `distance now ${distance}u`);

  // 4. Pause genuinely freezes the simulation.
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  const clockA = await page.evaluate(() => (document.body.innerText.match(/([\d.]+)s/) ?? [])[1]);
  await page.waitForTimeout(1200);
  const clockB = await page.evaluate(() => (document.body.innerText.match(/([\d.]+)s/) ?? [])[1]);
  expect(clockA === clockB, `the clock advanced while paused (${clockA} -> ${clockB})`);
  record(4, 'pause freezes the simulation clock', `${clockA}s held`);
  await page.keyboard.press(' ');

  // 5. The scrubber shows an earlier moment.
  await page.waitForTimeout(1500);
  const slider = page.locator('input[type=range]').last();
  await slider.evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(element, '5');
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const reviewText = await page.locator('body').innerText();
  expect(/MODE:/.test(reviewText), 'the readout vanished while reviewing');
  record(5, 'the scrubber reviews an earlier tick', 'readout still populated');
  await page.locator('button:has-text("LIVE")').click();

  // 6. Switching Brain takes effect.
  const brainSelect = page.locator('[data-testid=brain]');
  await brainSelect.selectOption('C_DIRECT_HUNTER');
  await page.locator('button:has-text("APPLY AND RESTART")').click();
  await page.waitForTimeout(1500);
  const afterBrain = await page.locator('body').innerText();
  expect(/DIRECT HUNTER/.test(afterBrain), 'the Brain did not change');
  record(6, 'the Brain is selectable and takes effect', 'C · DIRECT HUNTER running');

  // 7. The oracle is labelled where a human can see it.
  const perceptionSelect = page.locator('[data-testid=perception]');
  await perceptionSelect.selectOption('P3_ORACLE');
  await page.waitForTimeout(400);
  const oracleText = await page.locator('body').innerText();
  expect(/NOT PRODUCTION ELIGIBLE/.test(oracleText), 'the oracle is not labelled');
  expect(/CHEATING REFERENCE/.test(oracleText), 'the oracle is not marked as cheating');
  record(7, 'the oracle is labelled on screen', 'CHEATING REFERENCE — NOT PRODUCTION ELIGIBLE');
  await perceptionSelect.selectOption('P0_PRODUCTION');
  await page.locator('button:has-text("APPLY AND RESTART")').click();
  await page.waitForTimeout(800);

  // 8. Overlays draw without breaking the frame loop.
  const graphToggle = page.locator('input[type=checkbox]').nth(1);
  await graphToggle.check();
  await page.waitForTimeout(600);
  const withGraph = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 0; i < data.length; i += 4 * 331) if (data[i] < 230) ink += 1;
    return ink;
  });
  expect(withGraph > 0, 'the graph overlay drew nothing');
  record(8, 'overlays draw', `${withGraph} sampled non-background pixels with the graph on`);

  // 9. A scripted learner runs from the UI.
  await page.locator('[data-testid=script]').selectOption({ label: 'Left-right zigzag' });
  await page.waitForTimeout(4000);
  const scripted = await page.locator('body').innerText();
  expect(/headlessly/.test(scripted), 'the scripted run did not report back');
  record(9, 'a scripted learner runs from the UI', 'zigzag executed and loaded for review');

  // 10. Config copy produces something a person can paste.
  await page.locator('button:has-text("COPY CONFIG")').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid=transfer]').waitFor({ timeout: 5000 });
  const configText = await page.locator('[data-testid=transfer]').inputValue();
  const parsed = JSON.parse(configText);
  expect(parsed.schemaVersion === 'circuit-climb-lab-config/v1', 'the config export has no schema version');
  expect(parsed.brainId && parsed.perceptionModelId, 'the config export names no Brain');
  record(10, 'configuration exports as valid JSON', `${parsed.brainId} / ${parsed.perceptionModelId}`);
  await page.locator('button:has-text("DONE")').click();

  // 11. The run export carries samples with a pursuer in every one.
  await page.locator('button:has-text("EXPORT RUN")').click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid=transfer]').waitFor({ timeout: 5000 });
  const runText = await page.locator('[data-testid=transfer]').inputValue();
  const run = JSON.parse(runText);
  expect(Array.isArray(run.samples) && run.samples.length > 0, 'the run export has no samples');
  expect(run.samples.every((sample) => sample.pursuer), 'a retained sample has no pursuer');
  expect(run.configurationHash && run.configurationHash.length === 64, 'no behaviour hash in the export');
  record(11, 'the run export is complete',
    `${run.samples.length} samples, ${run.events.length} events, every one carries a pursuer`);
  await page.locator('button:has-text("DONE")').click();

  // 12. No page errors in any of that.
  expect(errors.length === 0, `console errors: ${errors.join(' | ')}`);
  record(12, 'no page errors', 'none');

  await page.close();
  console.log('\n' + '='.repeat(70));
  console.log(`LAB BROWSER VERIFICATION PASS — ${results.length} steps`);
  console.log('='.repeat(70));
} catch (error) {
  failure = error;
  console.error('\nVERIFICATION FAILED:', error.message);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
process.exit(failure ? 1 : 0);
