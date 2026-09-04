/**
 * PURSUER INTEGRATION 04A — ACTUAL SURFACE VERIFICATION.
 *
 *   node src/games/circuit-climb/tools/circuitClimbPursuerV2Verify.mjs
 *
 * Drives the REAL Circuit Climb application in a real Chromium, on the
 * integration branch, and reports what the accepted pursuer actually does
 * once it is in the game rather than in a lab harness.
 *
 * It runs the session twice on purpose:
 *
 *   PRODUCT RUN     normal armed capture, exactly as a player would meet it.
 *                   However far it gets is the finding — the pursuer is NOT
 *                   weakened to make the script reach a target.
 *
 *   ENGINEERING RUN capture disarmed (developer-only), so the long-run
 *                   strategic behaviour can be measured without the run
 *                   ending early.
 *
 * Whether the accepted bot is TOO EFFECTIVE in the real game is a product
 * decision for PM review. This script's job is to produce the evidence.
 */
import { chromium } from 'playwright-core';
import { findChromium, LAUNCH_ARGS, startDevServer } from './circuitClimbBrowserHarness.mjs';

const PORT = Number(process.env.PORT || 3117);
const results = [];
const record = (step, label, detail) => {
  results.push({ step, label, detail });
  console.log(`  [${String(step).padStart(2)}] ${label.padEnd(38)} ${detail}`);
};

async function surfaceFor(page) {
  const canvas = page.locator('#gameCanvas');
  await canvas.waitFor({ timeout: 30000 });
  const box = await canvas.boundingBox();
  // The board at the default 100% framing, computed the same way the existing
  // browser smoke does rather than read out of the page.
  const BASE = { logicalWidth: 600, rowGap: 205, platformWidth: 104, platformHeight: 62, playerRadius: 32, routePlatformPadding: 8 };
  const zoom = 1;
  const platformWidth = BASE.platformWidth * (0.98 + 0.02 * zoom);
  const playerRadius = BASE.playerRadius * zoom;
  const spacing = Math.max(190, platformWidth + 2 * (BASE.routePlatformPadding + playerRadius) + 6);
  const centre = BASE.logicalWidth / 2;
  const world = {
    logicalWidth: BASE.logicalWidth,
    rowGap: BASE.rowGap * zoom,
    platformHeight: BASE.platformHeight * Math.pow(zoom, 0.48),
    playerRadius,
    cameraAnchor: 0.585 + (0.615 - 0.585) * ((100 - 80) / 40),
    columns: [centre - spacing, centre, centre + spacing],
  };
  const scale = box.width / world.logicalWidth;
  const logicalHeight = box.height / scale;
  const rowTop = logicalHeight * world.cameraAnchor + world.playerRadius + 3 - world.rowGap;

  const message = async () => ({
    text: (await page.locator('#message').innerText().catch(() => '')).trim(),
    tone: (await page.locator('#message').getAttribute('class').catch(() => '')) || '',
  });

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
      } catch { /* try the next offset */ }
    }
    return { reacted: false, ...(await message()) };
  };

  const clickButton = async (text) => {
    const button = page.locator(`button:has-text("${text}")`).first();
    await button.waitFor({ timeout: 15000 });
    await button.click();
  };

  const settle = async () => {
    let last = null;
    for (let i = 0; i < 24; i += 1) {
      const now = (await message()).text;
      if (now === last) return now;
      last = now;
      await page.waitForTimeout(120);
    }
    return last;
  };

  /**
   * Climb one row for real: try destinations until one is accepted. A refused
   * destination is a genuine WRONG ANSWER, which is exactly the return
   * behaviour the pursuer has to cope with, so those are counted rather than
   * avoided.
   */
  const climbOneRow = async (startColumn) => {
    let wrong = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const column = (startColumn + attempt) % 3;
      const selection = await select(column);
      await settle();
      if (!selection.reacted) continue;
      if (/success/.test(selection.tone)) return { climbed: true, wrong, column };
      if (/error/.test(selection.tone)) wrong += 1;
    }
    return { climbed: false, wrong, column: null };
  };

  const diag = () => page.evaluate(() => (window.__CIRCUIT_CLIMB_PURSUER__ ? window.__CIRCUIT_CLIMB_PURSUER__() : null));

  return { select, climbOneRow, clickButton, settle, message, diag };
}

/**
 * Into the actual game, the way a player gets there: the app's menu, then the
 * Circuit Climb tile, then START PROTOTYPE. Same path the existing production
 * browser smoke uses.
 */
async function enterCircuitClimb(page) {
  const open = async (text) => {
    const button = page.locator(`button:has-text("${text}")`).first();
    await button.waitFor({ timeout: 20000 });
    await button.click();
  };
  await open('Circuit Climb');
  await open('START PROTOTYPE');
  await page.locator('#gameCanvas').waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
}

async function runSession(browser, baseUrl, { armed }) {
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_CONNECTION|favicon/i.test(t)) return;
    errors.push(t);
  });

  const url = armed ? baseUrl : `${baseUrl}/?capture=disarmed`;
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await enterCircuitClimb(page);

  const s = await surfaceFor(page);
  return { page, errors, s };
}

const chrome = findChromium();
const server = await startDevServer({ port: PORT });
const baseUrl = server.url;
const browser = await chromium.launch({ executablePath: chrome, args: LAUNCH_ARGS });

let failure = null;
try {
  // ══════════════ PRODUCT RUN — normal armed capture ══════════════
  console.log('\n── PRODUCT RUN (normal armed capture) ──');
  const product = await runSession(browser, baseUrl, { armed: true });

  // 1. the normal launch identifies the candidate
  const launch = await product.s.diag();
  if (!launch) throw new Error('no diagnostic hook — cannot identify the candidate');
  record(1, 'normal launch candidate', `${launch.kind} (captureArmed=${launch.captureArmed})`);
  if (launch.kind !== 'GRAPH_PURSUER_V2') throw new Error(`normal launch ran ${launch.kind}`);
  if (launch.captureArmed !== true) throw new Error('normal launch was not armed');

  // 2-4. ordinary climb, LEFT/CENTER/RIGHT, cross-board moves, as far as
  // armed capture allows. The count is the product finding.
  let accepted = 0;
  let wrongAnswers = 0;
  const columnsUsed = new Set();
  let crossBoard = 0;
  let lastColumn = 1;
  let capturedAfter = null;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const before = await product.s.diag();
    if (before?.captured) { capturedAfter = accepted; break; }
    const step = await product.s.climbOneRow(attempt % 3);
    wrongAnswers += step.wrong;
    if (step.climbed) {
      accepted += 1;
      columnsUsed.add(step.column);
      if (Math.abs(step.column - lastColumn) === 2) crossBoard += 1;
      lastColumn = step.column;
    }
    const after = await product.s.diag();
    if (after?.captured) { capturedAfter = accepted; break; }
  }
  record(2, 'ordinary climb', `${accepted} accepted selections`);
  record(3, 'LEFT / CENTER / RIGHT used', `columns ${[...columnsUsed].sort().join(',') || 'none'}`);
  record(4, 'large cross-board moves', `${crossBoard}`);

  const afterPlay = await product.s.diag();
  record(5, 'wrong-answer / return behaviour', `${wrongAnswers} refused destinations survived`);
  record(6, 'accepted selections vs target of 10', capturedAfter === null
    ? `${accepted}, not captured`
    : `${accepted} then CAPTURED`);

  // 6. pause
  await product.s.clickButton('PAUSE');
  await product.page.waitForTimeout(400);
  const pausedA = await product.s.diag();
  await product.page.waitForTimeout(900);
  const pausedB = await product.s.diag();
  const frozen = pausedA && pausedB
    && pausedA.pursuer && pausedB.pursuer
    && pausedA.pursuer.x === pausedB.pursuer.x
    && pausedA.pursuer.y === pausedB.pursuer.y
    && pausedA.graph?.frames === pausedB.graph?.frames;
  record(7, 'PAUSE freezes the pursuer', frozen ? 'position and frame count identical' : 'NOT FROZEN');
  if (!frozen) throw new Error('pause did not freeze Graph V2');

  // 7. resume
  const resume = product.page.locator('#resumeButton');
  if (await resume.count()) await resume.click();
  else await product.s.clickButton('RESUME');
  await product.page.waitForTimeout(900);
  const resumed = await product.s.diag();
  const moving = resumed && pausedB && resumed.graph?.frames > pausedB.graph?.frames;
  record(8, 'RESUME advances again', moving ? `frames ${pausedB.graph?.frames} -> ${resumed.graph?.frames}` : 'NOT MOVING');
  if (!moving) throw new Error('resume did not restart Graph V2');

  // 8. capture behaviour under normal arming
  record(9, 'normal armed capture', afterPlay?.captured ? 'captured during play' : 'not captured in this session');

  // 9. restart (and restart after capture, when one happened)
  await product.s.clickButton('RESTART');
  await product.page.waitForTimeout(1200);
  const restarted = await product.s.diag();
  const clean = restarted && restarted.graph
    && restarted.graph.modeChanges === 0
    && restarted.graph.commitmentEnds === 0
    && restarted.graph.trailFragmentsDetected === 0
    && restarted.captured === false;
  record(10, 'RESTART clears Brain state', clean
    ? 'modeChanges/commitmentEnds/trail all 0, captured=false'
    : `NOT CLEAN ${JSON.stringify(restarted?.graph)}`);
  if (!clean) throw new Error('restart left Graph V2 state behind');

  const playable = await product.s.select(1);
  record(11, 'playable after restart', playable.reacted ? 'accepted a selection' : 'NOT PLAYABLE');
  if (!playable.reacted) throw new Error('board not playable after restart');

  record(12, 'no page errors (product run)', product.errors.length ? product.errors.join(' | ') : 'none');
  if (product.errors.length) throw new Error(`product run console errors: ${product.errors.join(' | ')}`);
  const productDiag = await product.s.diag();
  await product.page.close();

  // ══════════════ ENGINEERING RUN — capture disarmed ══════════════
  console.log('\n── ENGINEERING RUN (diagnostic capture-disarmed) ──');
  const eng = await runSession(browser, baseUrl, { armed: false });
  const engLaunch = await eng.s.diag();
  record(13, 'diagnostic mode identifies itself', `${engLaunch?.kind} captureArmed=${engLaunch?.captureArmed}`);
  if (engLaunch?.captureArmed !== false) throw new Error('capture-disarmed mode did not engage');

  // 12-13. a long session: many selections, wrong answers, sight loss,
  // trail pursuit, reacquisition, and a stationary period.
  let engAccepted = 0;
  let engWrong = 0;
  for (let attempt = 0; attempt < 18 && engAccepted < 12; attempt += 1) {
    const step = await eng.s.climbOneRow(attempt % 3);
    engWrong += step.wrong;
    if (step.climbed) engAccepted += 1;
  }
  record(14, 'long-run accepted selections', `${engAccepted} accepted, ${engWrong} wrong answers survived`);

  // A stationary learner period — the 03A-R1 rejection condition, live.
  const soakStart = await eng.s.diag();
  await eng.page.waitForTimeout(16000);
  const soakEnd = await eng.s.diag();
  const soakModeChanges = (soakEnd?.graph?.modeChanges ?? 0) - (soakStart?.graph?.modeChanges ?? 0);
  const soakFrames = (soakEnd?.graph?.frames ?? 0) - (soakStart?.graph?.frames ?? 0);
  record(15, '16s stationary soak', `${soakFrames} frames, ${soakModeChanges} strategic mode changes, `
    + `raw sense +${(soakEnd?.graph?.rawSenseAcquired ?? 0) - (soakStart?.graph?.rawSenseAcquired ?? 0)}`);

  // Does it actually CLOSE on a learner that has stopped? This is the datum
  // for "is the accepted bot too effective, or not effective enough, in the
  // real game" — reported, never tuned here.
  record(16, 'closing on a stationary learner',
    `distance ${(soakStart?.graph?.finalDistance ?? 0).toFixed(0)} -> ${(soakEnd?.graph?.finalDistance ?? 0).toFixed(0)}`
    + `, capture-range contacts ${soakEnd?.captureRangeContacts ?? 0}`);

  // A HUMAN-PACED probe. The loops above click as fast as the UI allows,
  // which is nothing like a person solving arithmetic — the accepted human
  // session averaged roughly six seconds per selection. This measures whether
  // the pursuer closes when the learner behaves at that pace and then stops,
  // which is the only fair way to ask "is it effective in the real game".
  await eng.s.clickButton('RESTART');
  await eng.page.waitForTimeout(1200);
  let pacedAccepted = 0;
  for (let attempt = 0; attempt < 8 && pacedAccepted < 4; attempt += 1) {
    const step = await eng.s.climbOneRow(attempt % 3);
    if (step.climbed) pacedAccepted += 1;
    await eng.page.waitForTimeout(4500);   // think time, as a person would take
  }
  const pacedStart = await eng.s.diag();
  await eng.page.waitForTimeout(12000);    // then the learner stops entirely
  const pacedEnd = await eng.s.diag();
  record(17, 'human-paced close on a stopped learner',
    `${pacedAccepted} selections, distance ${(pacedStart?.graph?.finalDistance ?? 0).toFixed(0)}`
    + ` -> ${(pacedEnd?.graph?.finalDistance ?? 0).toFixed(0)}`
    + `, contacts ${pacedEnd?.captureRangeContacts ?? 0}`
    + `, mode ${pacedEnd?.graph?.mode}`);

  const engDiag = await eng.s.diag();
  if (eng.errors.length) throw new Error(`engineering run console errors: ${eng.errors.join(' | ')}`);

  console.log('\n── DIAGNOSTIC SUMMARY ──');
  console.log('PRODUCT RUN     ', JSON.stringify(productDiag, null, 1));
  console.log('ENGINEERING RUN ', JSON.stringify(engDiag, null, 1));
  await eng.page.close();

  console.log('\n================================================================');
  console.log(`PURSUER V2 ACTUAL-SURFACE VERIFICATION PASS — ${results.length} steps`);
  console.log('================================================================');
} catch (error) {
  failure = error;
  console.error('\nVERIFICATION FAILED:', error.message);
} finally {
  await browser.close();
  await server.stop();
}

if (failure) process.exit(1);
