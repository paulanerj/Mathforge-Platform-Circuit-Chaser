/**
 * Circuit Climb — supported browser smoke.
 *
 *   npm run test:circuit-climb:browser
 *
 * Starts a dev server, drives the real application in a real Chromium, and
 * exits non-zero if the accepted runtime contract is broken. It owns the
 * server and the browser, so there is nothing to set up first.
 *
 * It exists because the vitest suite cannot reach the runtime hook. Every
 * defect that has actually shipped in this game — a white screen behind a
 * green build, a board that rendered perfectly and could not be clicked — was
 * invisible to unit tests and obvious in a browser within seconds.
 *
 * WHAT IT COVERS
 *   Viewport matrix   320 / 390 / 430 / 590 / 768, default framing.
 *                     Render, no white screen, a playable first move,
 *                     no route failures.
 *   Framing matrix    80% / 100% / 120% at 430.
 *                     LEFT, CENTER and RIGHT all selectable, a correct
 *                     travel, a wrong travel that shorts, Restart, and
 *                     Pause actually stopping the world.
 *
 * The framing matrix is the guard on WORLD-FRAMING-03: before that repair,
 * every destination above 100% returned NO_LEGAL_ROUTE and the board was
 * unplayable while still looking perfect. The 120% case fails if it regresses.
 *
 * OPTIONS
 *   BASE_URL=http://…   use a server you already have; none is spawned
 *   CHROME=/path/chrome pick the browser explicitly
 *   PORT=3111           port for the spawned dev server
 *   ONLY=framing        run just one matrix (framing | viewport)
 *
 * See docs/CIRCUIT_CLIMB_BROWSER_SMOKE.md.
 */
import { chromium } from 'playwright-core';
import {
  findChromium,
  LAUNCH_ARGS,
  startDevServer,
  inspectRender,
  readMotionSignature,
} from './circuitClimbBrowserHarness.mjs';

const PORT = Number(process.env.PORT || 3111);
const ONLY = (process.env.ONLY || '').toLowerCase();

const VIEWPORTS = [320, 390, 430, 590, 768];
const FRAMINGS = [80, 100, 120];
const FRAMING_VIEWPORT = 430;

/* ------------------------------------------------------------------ *
 * Result bookkeeping
 * ------------------------------------------------------------------ */

const results = [];
let currentScope = '';

function check(name, pass, note = '') {
  results.push({ scope: currentScope, name, pass, note });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`  ${mark}  ${name.padEnd(30)} ${note}`);
  return pass;
}

/* ------------------------------------------------------------------ *
 * Where the destinations are
 * ------------------------------------------------------------------ *
 *
 * Clicks are driven from computed world coordinates, not pixel detection.
 * With the camera settled the active row always sits at a fixed screen height,
 * because the camera anchors on the player and the active row is always
 * exactly one rowGap above them. Reading the row's underline back off the
 * canvas was tried and fails at 320, and again whenever a platform shorts out
 * and loses its underline.
 *
 * These mirror applyViewScale() and computeColumnCentres() in the product. If
 * a framing formula changes there and not here, the smoke misses the row and
 * goes red — which is the correct outcome for a harness that has drifted from
 * the world it is meant to be testing.
 */
const BASE = {
  logicalWidth: 600,
  platformWidth: 104,
  platformHeight: 62,
  playerRadius: 32,
  rowGap: 205,
  routePlatformPadding: 8,
  acceptedColumnSpacing: 190,
  minInteriorCorridor: 6,
};

function worldAtFraming(percent) {
  const zoom = percent / 100;
  const platformWidth = BASE.platformWidth * (0.98 + 0.02 * zoom);
  const playerRadius = BASE.playerRadius * zoom;
  const spacing = Math.max(
    BASE.acceptedColumnSpacing,
    platformWidth + 2 * (BASE.routePlatformPadding + playerRadius) + BASE.minInteriorCorridor,
  );
  const centre = BASE.logicalWidth / 2;
  return {
    rowGap: BASE.rowGap * zoom,
    platformHeight: BASE.platformHeight * Math.pow(zoom, 0.48),
    playerRadius,
    platformWidth,
    cameraAnchor: 0.585 + (0.615 - 0.585) * ((percent - 80) / 40),
    columns: { LEFT: centre - spacing, CENTER: centre, RIGHT: centre + spacing },
  };
}

/* ------------------------------------------------------------------ *
 * Driving the surface
 * ------------------------------------------------------------------ */

function makeSurface(page, box, world) {
  const scale = box.width / BASE.logicalWidth;
  const logicalHeight = box.height / scale;
  // Screen y of the active row's top, with the camera settled.
  const rowTop =
    logicalHeight * world.cameraAnchor + world.playerRadius + 3 - world.rowGap;

  const message = async () => ({
    text: (await page.locator('#message').innerText().catch(() => '')).trim(),
    tone: (await page.locator('#message').getAttribute('class').catch(() => '')) || '',
  });

  /**
   * Click a destination and wait for the runtime to answer, rather than
   * sleeping a guessed interval. Offsets walk the platform band so a small
   * disagreement about the row's exact height cannot silently miss it; the
   * first one that changes the message wins, and the set is fixed, so a run
   * replays identically.
   */
  const select = async (column) => {
    const before = (await message()).text;
    for (const offset of [0.5, 0.2, 0.8, 1.15, -0.15]) {
      const x = box.x + world.columns[column] * scale;
      const y = box.y + (rowTop + world.platformHeight * offset) * scale;
      if (y < box.y || y > box.y + box.height) continue;
      await page.mouse.click(x, y);
      try {
        await page.waitForFunction(
          (previous) => {
            const el = document.querySelector('#message');
            return el && el.innerText.trim() !== previous;
          },
          before,
          { timeout: 700 },
        );
        return { reacted: true, ...(await message()) };
      } catch {
        /* that offset missed the band; try the next */
      }
    }
    return { reacted: false, ...(await message()) };
  };

  const clickButton = async (text) => {
    const button = page.locator(`button:has-text("${text}")`).first();
    await button.waitFor({ timeout: 15000 });
    await button.click();
  };

  const settle = async () => {
    // Travel is time-based in the runtime; wait for the message to come to rest
    // rather than for a fixed duration.
    let last = null;
    for (let i = 0; i < 24; i += 1) {
      const now = (await message()).text;
      if (now === last) return now;
      last = now;
      await page.waitForTimeout(120);
    }
    return last;
  };

  return { message, select, clickButton, settle, scale, rowTop };
}

async function enterGame(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  // The framing slider persists to localStorage, so a previous run would
  // otherwise decide this one's world.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const open = async (text) => {
    const button = page.locator(`button:has-text("${text}")`).first();
    await button.waitFor({ timeout: 20000 });
    await button.click();
  };
  await open('Circuit Climb');
  await open('START PROTOTYPE');
  await page.locator('#gameCanvas').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
}

async function setFraming(page, percent) {
  if (await page.locator('#viewScaleSlider').count() === 0) {
    await page.locator('button.mathforge-icon-btn').first().click();
    await page.locator('#viewScaleSlider').waitFor({ timeout: 10000 });
  }
  await page.locator('#viewScaleSlider').evaluate((element, value) => {
    // React listens for the native input event, so set through the prototype
    // descriptor rather than assigning .value directly.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value',
    ).set;
    setter.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, percent);
  await page.waitForFunction(
    (expected) => {
      const output = document.querySelector('#viewScaleValue');
      return output && output.textContent.trim() === `${expected}%`;
    },
    percent,
    { timeout: 5000 },
  );
  const close = page.locator('#closeSettingsButton');
  if (await close.count()) await close.click();
  await page.waitForTimeout(400);
}

/* ------------------------------------------------------------------ *
 * Console capture
 * ------------------------------------------------------------------ */

function watchConsole(page) {
  const errors = [];
  const routeFailures = [];
  const informational = [];

  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message)}`));
  page.on('console', (m) => {
    const text = m.text();
    if (text.includes('CIRCUIT_CLIMB_LEARNER_ROUTE_FAILED')) {
      routeFailures.push(text.slice(0, 200));
      return;
    }
    // NOT_CLOSING and STALLED are documented pursuer diagnostics, not product
    // breakage: NOT_CLOSING fires in normal play when the learner climbs away
    // from a pursuer that is legitimately behind. Recorded, never fatal, per
    // the SOT's known-limitation 7.
    if (text.includes('CIRCUIT_CLIMB_PURSUER_NOT_CLOSING') || text.includes('CIRCUIT_CLIMB_PURSUER_STALLED')) {
      informational.push(text.slice(0, 160));
      return;
    }
    // A missing favicon is not a product failure.
    if (m.type() === 'error' && !/404|Failed to load resource/.test(text)) {
      errors.push(text.slice(0, 200));
    }
  });

  return { errors, routeFailures, informational };
}

/* ------------------------------------------------------------------ *
 * Scenarios
 * ------------------------------------------------------------------ */

/** Every viewport must render and take a first move. */
async function viewportScenario(browser, url, width) {
  currentScope = `viewport ${width}`;
  console.log(`\n── viewport ${width} @ 100% framing ──`);
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const log = watchConsole(page);
  try {
    await enterGame(page, url);
    check('surface exists', (await page.locator('#gameCanvas').count()) === 1);

    const render = await inspectRender(page);
    check('renders, not blank', render.ok,
      render.ok ? `${render.distinctColours} colours, ${render.paintedSamples} painted` : render.reason);

    const world = worldAtFraming(100);
    const box = await page.locator('#gameCanvas').boundingBox();
    const surface = makeSurface(page, box, world);

    const first = await surface.select('CENTER');
    check('first move is playable', first.reacted, first.reacted ? `"${first.text}"` : 'no reaction');
    await surface.settle();

    check('no route failures', log.routeFailures.length === 0, log.routeFailures[0] || 'none');
    check('no console errors', log.errors.length === 0, log.errors[0] || 'none');
  } finally {
    await page.close();
  }
}

/** The full accepted contract, at one framing. */
async function framingScenario(browser, url, percent) {
  currentScope = `framing ${percent}%`;
  console.log(`\n── ${percent}% world framing @ ${FRAMING_VIEWPORT}px ──`);
  const page = await browser.newPage({
    viewport: { width: FRAMING_VIEWPORT, height: 900 }, deviceScaleFactor: 1,
  });
  const log = watchConsole(page);
  try {
    await enterGame(page, url);
    await setFraming(page, percent);

    const render = await inspectRender(page);
    check('renders, not blank', render.ok,
      render.ok ? `${render.distinctColours} colours, ${render.paintedSamples} painted` : render.reason);

    const world = worldAtFraming(percent);
    const box = await page.locator('#gameCanvas').boundingBox();
    const surface = makeSurface(page, box, world);

    // The player is on the board before anything is clicked.
    const motion = await readMotionSignature(page);
    check('actors are on the board', !!motion && !!motion.pursuer,
      motion && motion.pursuer ? `pursuer at ${Math.round(motion.pursuer.x)},${Math.round(motion.pursuer.y)}` : 'no pursuer pixels');

    // Each destination class, each from a fresh run so a shorted platform from
    // the previous selection cannot mask the next.
    for (const column of ['LEFT', 'CENTER', 'RIGHT']) {
      const selection = await surface.select(column);
      check(`${column} selectable`, selection.reacted,
        selection.reacted ? `"${selection.text}"` : 'no reaction');
      await surface.settle();
      await surface.clickButton('RESTART');
      await page.waitForTimeout(700);
    }

    // A correct travel and a wrong one. Which is which is generated content, so
    // keep choosing until both have been seen.
    let correct = null;
    let wrong = null;
    for (let attempt = 0; attempt < 18 && (!correct || !wrong); attempt += 1) {
      if (/Caught by the surge/i.test((await surface.message()).text)) {
        await surface.clickButton('RESTART');
        await page.waitForTimeout(700);
        continue;
      }
      const selection = await surface.select(['LEFT', 'CENTER', 'RIGHT'][attempt % 3]);
      if (!selection.reacted) continue;
      if (/success/.test(selection.tone) && !correct) correct = selection.text;
      if (/error/.test(selection.tone) && !wrong) wrong = selection.text;
      await surface.settle();
    }
    check('correct destination resolves', !!correct, correct || 'not observed');
    check('wrong destination shorts', !!wrong, wrong || 'not observed');

    // Restart returns a clean, playable run.
    await surface.clickButton('RESTART');
    await page.waitForTimeout(900);
    const afterRestart = await surface.select('CENTER');
    check('restart is playable', afterRestart.reacted,
      afterRestart.reacted ? `"${afterRestart.text}"` : 'no reaction after restart');
    await surface.settle();

    // Pause must stop the world, not merely dim it. Compare the pursuer, which
    // is the one thing always moving.
    await surface.clickButton('RESTART');
    await page.waitForTimeout(900);
    await surface.clickButton('PAUSE');
    await page.waitForTimeout(400);
    const paused = await readMotionSignature(page);
    await page.waitForTimeout(1200);
    const stillPaused = await readMotionSignature(page);
    check('pause stops motion', paused.checksum === stillPaused.checksum,
      paused.checksum === stillPaused.checksum ? 'frame identical after 1.2s' : 'frame changed while paused');

    await page.locator('#resumeButton').click();
    await page.waitForTimeout(1200);
    const resumed = await readMotionSignature(page);
    check('resume restarts motion', resumed.checksum !== stillPaused.checksum,
      resumed.checksum !== stillPaused.checksum ? 'frame advanced' : 'frame frozen after resume');

    check('no route failures', log.routeFailures.length === 0, log.routeFailures[0] || 'none');
    check('no console errors', log.errors.length === 0, log.errors[0] || 'none');
    if (log.informational.length) {
      console.log(`  note  ${log.informational.length} documented pursuer diagnostic(s), not fatal`);
    }
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const started = Date.now();
let server = null;
let browser = null;

try {
  const executablePath = findChromium();
  console.log(`Circuit Climb browser smoke`);
  console.log(`  chromium: ${executablePath}`);

  server = await startDevServer({ port: PORT });
  console.log(`  server:   ${server.url}${server.external ? ' (external)' : ''}`);

  browser = await chromium.launch({ executablePath, args: LAUNCH_ARGS });

  if (ONLY !== 'framing') {
    for (const width of VIEWPORTS) await viewportScenario(browser, server.url, width);
  }
  if (ONLY !== 'viewport') {
    for (const percent of FRAMINGS) await framingScenario(browser, server.url, percent);
  }
} catch (error) {
  currentScope = 'harness';
  check('harness completed', false, String(error && error.message ? error.message : error));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.stop().catch(() => {});
}

const failed = results.filter((r) => !r.pass);
const seconds = ((Date.now() - started) / 1000).toFixed(1);

console.log('\n' + '='.repeat(64));
if (failed.length) {
  console.log(`BROWSER SMOKE FAIL — ${failed.length} of ${results.length} checks failed in ${seconds}s`);
  for (const failure of failed) {
    console.log(`  ✗ [${failure.scope}] ${failure.name}: ${failure.note}`);
  }
} else {
  console.log(`BROWSER SMOKE PASS — ${results.length}/${results.length} checks in ${seconds}s`);
}
console.log('='.repeat(64));

process.exit(failed.length ? 1 : 0);
