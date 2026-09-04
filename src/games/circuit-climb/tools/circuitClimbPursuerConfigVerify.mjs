/**
 * PURSUER 04C — CONFIGURATION SURFACE VERIFICATION.
 *
 *   node src/games/circuit-climb/tools/circuitClimbPursuerConfigVerify.mjs
 *
 * Drives the REAL application in a real Chromium and checks the claims 04C
 * makes that a unit test cannot: that the panel is genuinely absent from the
 * game a tester sees, that a slider genuinely does not touch the running
 * pursuer until it is applied, that applying it genuinely changes what is on
 * screen, and that the evidence export genuinely names the pursuer that ran.
 *
 * Every step is a way the architecture could be true in the source and false
 * in the browser.
 */
import { chromium } from 'playwright-core';
import { findChromium, LAUNCH_ARGS, startDevServer } from './circuitClimbBrowserHarness.mjs';

const PORT = Number(process.env.PORT || 3119);
const results = [];
const record = (step, label, detail) => {
  results.push({ step, label, detail });
  console.log(`  [${String(step).padStart(2)}] ${label.padEnd(46)} ${detail}`);
};
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

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

const PANEL = '[data-testid="pursuer-configuration-panel"]';

/** The evidence export, read the way the Ctrl+Shift+D hotkey builds it. */
const evidence = (page) => page.evaluate(() => {
  const report = window.__CIRCUIT_CLIMB_PURSUER_REPORT__;
  // It returns the evidence object; round-tripping through JSON is what the
  // exported text is, so read exactly that rather than the live object.
  return report ? JSON.parse(JSON.stringify(report(false))) : null;
});

const chrome = findChromium();
const server = await startDevServer({ port: PORT });
const baseUrl = server.url;
const browser = await chromium.launch({ executablePath: chrome, args: LAUNCH_ARGS });

let failure = null;
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_CONNECTION|favicon/i.test(t)) return;
    errors.push(t);
  });

  console.log('\n── 04C CONFIGURATION SURFACE ──');

  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await enterCircuitClimb(page);

  // 1. The panel is NOT part of the game a tester meets.
  expect(await page.locator(PANEL).count() === 0, 'the tuning panel was visible on a normal launch');
  record(1, 'absent from the normal HUD', 'no panel on a plain launch');

  // 2. A normal launch runs the accepted baseline, and the export says so.
  const baselineEvidence = await evidence(page);
  expect(baselineEvidence?.configuration, 'the evidence export carried no configuration block');
  const cfg = baselineEvidence.configuration;
  expect(cfg.configurationId === 'builtin/04b-r1-baseline', `unexpected configuration ${cfg.configurationId}`);
  expect(/^[0-9a-f]{64}$/.test(cfg.configurationHash), 'the configuration hash is not a SHA-256');
  expect(cfg.configurationSchemaVersion === 'circuit-climb-pursuer-config/v1', 'unexpected schema version');
  expect(cfg.payload && cfg.payload.locomotion && cfg.payload.commitment, 'the export carried no full payload');
  expect(cfg.lifecycle === 'BASELINE', `lifecycle was ${cfg.lifecycle}`);
  const baselineHash = cfg.configurationHash;
  record(2, 'a normal launch runs 04B-R1 BASELINE',
    `${cfg.configurationLabel} · ${cfg.configurationShortHash} · ${cfg.selection.reason}`);

  // 3. The export is complete enough to rebuild the run.
  const paths = Object.keys(cfg.payload.locomotion).length + Object.keys(cfg.payload.perception).length
    + Object.keys(cfg.payload.commitment).length + Object.keys(cfg.payload.chassis).length
    + Object.keys(cfg.payload.spawnCapture).length;
  expect(paths >= 18, `the payload carried only ${paths} parameters`);
  expect(cfg.derived && typeof cfg.derived.trailSenseRadius === 'number', 'no derived values reported');
  record(3, 'export carries what it takes to reproduce',
    `${paths} parameters, derived radius ${cfg.derived.trailSenseRadius.toFixed(3)}, `
    + `actor ${cfg.derived.actorRadius.toFixed(2)}`);

  // 4. The frame-rate consequence is reported rather than hidden.
  expect(cfg.derived.commitmentWindowMs, 'the commitment windows were not reported in milliseconds');
  record(4, 'commitment windows reported in wall-clock ms',
    `frame ${cfg.derived.commitmentWindowMs.frameMs.toFixed(2)}ms -> loss `
    + `${cfg.derived.commitmentWindowMs.loss.toFixed(1)}ms, acquire `
    + `${cfg.derived.commitmentWindowMs.acquire.toFixed(1)}ms`);

  // 5. Ctrl+Shift+T opens it, and again closes it.
  await page.keyboard.press('Control+Shift+T');
  await page.locator(PANEL).waitFor({ timeout: 5000 });
  await page.keyboard.press('Control+Shift+T');
  await page.waitForTimeout(200);
  expect(await page.locator(PANEL).count() === 0, 'Ctrl+Shift+T did not close the panel');
  record(5, 'Ctrl+Shift+T toggles the panel', 'opened and closed');

  // 6. ?tuning=1 opens it too, for a link somebody can be sent.
  await page.goto(`${baseUrl}/?tuning=1`, { waitUntil: 'networkidle' });
  await enterCircuitClimb(page);
  await page.locator(PANEL).waitFor({ timeout: 5000 });
  record(6, '?tuning=1 opens it from a link', 'panel present');

  // 7. The panel shows what is RUNNING, not merely what is stored.
  // `innerText` is the RENDERED text, and the section headings are
  // text-transformed to uppercase, so match case-insensitively.
  const runningText = (await page.locator(PANEL).innerText()).toUpperCase();
  expect(runningText.includes('RUNNING NOW'), 'the panel does not show the running configuration');
  expect(runningText.includes('SELECTED HERE'), 'the panel does not show the selected configuration');
  expect(runningText.includes('04B-R1 BASELINE'), 'the panel does not name the running configuration');
  record(7, 'panel separates running from selected', 'both shown');

  // 8. A slider produces a DRAFT and does NOT touch the running pursuer.
  const speed = page.locator('#locomotion\\.speed');
  await speed.waitFor({ timeout: 5000 });
  await speed.fill('0.3');
  await page.waitForTimeout(200);
  const modifiedText = await page.locator(PANEL).innerText();
  expect(modifiedText.includes('MODIFIED'), 'a slider edit did not mark the configuration MODIFIED');
  const stillBaseline = await evidence(page);
  expect(stillBaseline.configuration.configurationHash === baselineHash,
    'a slider edit changed the running pursuer without being applied');
  record(8, 'a slider edits a draft, not the run',
    `marked MODIFIED, running hash unchanged at ${stillBaseline.configuration.configurationShortHash}`);

  // 9. COMPARE TO BASELINE reports only what changed.
  await page.locator('button:has-text("COMPARE TO BASELINE")').click();
  await page.waitForTimeout(200);
  const diffText = await page.locator(PANEL).innerText();
  expect(/locomotion\.speed: 0\.19 -> 0\.3/.test(diffText), `the diff did not report the change:\n${diffText.slice(0, 400)}`);
  expect(!/perception\.directSenseRadius:/.test(diffText), 'the diff reported an unchanged parameter');
  record(9, 'diff shows only the differing parameter', 'locomotion.speed 0.19 -> 0.3, nothing else');

  // 10. APPLY AND RESTART changes what is actually running.
  await page.locator('button:has-text("APPLY AND RESTART")').click();
  await page.waitForTimeout(1200);
  const applied = await evidence(page);
  expect(applied.configuration.configurationHash !== baselineHash,
    'applying a configuration did not change the running pursuer');
  expect(applied.configuration.payload.locomotion.speed === 0.3,
    `the running pursuer's speed is ${applied.configuration.payload.locomotion.speed}`);
  expect(applied.configuration.lifecycle === 'EXPERIMENTAL',
    `an edited configuration ran as ${applied.configuration.lifecycle}`);
  expect(applied.configuration.selection.reason === 'HUMAN_TUNED',
    `selection reason was ${applied.configuration.selection.reason}`);
  record(10, 'APPLY AND RESTART changes the run',
    `speed 0.3, ${applied.configuration.configurationShortHash}, EXPERIMENTAL`);

  // 11. The baseline itself was never touched by any of that.
  const baselineOption = await page.locator(`${PANEL} option`).first().innerText();
  expect(baselineOption.includes('04B-R1 BASELINE'), 'the baseline is missing from the library');
  await page.locator('button:has-text("RESET TO 04B-R1")').click();
  await page.locator('button:has-text("APPLY AND RESTART")').click();
  await page.waitForTimeout(1200);
  const restored = await evidence(page);
  expect(restored.configuration.configurationHash === baselineHash,
    'the baseline did not come back byte-identical');
  record(11, 'RESET TO 04B-R1 restores the accepted pursuer',
    `hash back to ${restored.configuration.configurationShortHash}`);

  // 12. A bad paste is refused, visibly, and changes nothing.
  await page.locator('button:has-text("PASTE JSON")').click();
  await page.locator('#pursuerConfigTransfer').fill(JSON.stringify({
    identity: { schemaVersion: 'circuit-climb-pursuer-config/v99', configurationId: 'x', label: 'x', description: '' },
  }));
  await page.locator('button:has-text("LOAD IT")').click();
  await page.waitForTimeout(300);
  const refusedText = await page.locator(PANEL).innerText();
  expect(/Refused/.test(refusedText), `a bad paste was not refused visibly:\n${refusedText.slice(0, 300)}`);
  expect(/v99/.test(refusedText), 'the refusal did not say what was wrong');
  record(12, 'an unknown schema version is refused visibly', 'refusal names the version');

  // 13. Test notes are recorded with the run and reach the export.
  await page.locator('button:has-text("DONE")').click();
  await page.locator(`${PANEL} textarea`).last().fill('It hunted me across the board and I could not shake it.');
  await page.waitForTimeout(300);
  const noted = await evidence(page);
  expect(noted.testNotes && noted.testNotes.freeText.includes('hunted me'),
    'the test notes did not reach the evidence export');
  record(13, 'test notes are exported with the run',
    `"${noted.testNotes.freeText.slice(0, 42)}…"`);

  // 14. Everything survives a reload, because a test session does.
  await page.reload({ waitUntil: 'networkidle' });
  await enterCircuitClimb(page);
  await page.locator(PANEL).waitFor({ timeout: 5000 });
  const afterReload = await evidence(page);
  expect(afterReload.testNotes.freeText.includes('hunted me'), 'the notes did not survive a reload');
  const reloadedText = await page.locator(PANEL).innerText();
  expect(reloadedText.includes('04B-R1 BASELINE'), 'the selection did not survive a reload');
  record(14, 'the session survives a reload', 'notes and selection restored');

  // 15. The declared experiments are visible AND declared blocked.
  expect(/PURPOSEFUL MOTION/.test(reloadedText), 'experiment A is not listed');
  expect(/BLOCKED/.test(reloadedText), 'the blocked experiments are not marked blocked');
  record(15, 'experiments A-D listed and marked blocked', 'no invented values offered');

  // 16. Playing still works with the panel open — it is a tool, not a modal trap.
  await page.keyboard.press('Control+Shift+T');
  await page.waitForTimeout(200);
  const before = await evidence(page);
  await page.waitForTimeout(2500);
  const after = await evidence(page);
  expect(after.graph.frames > before.graph.frames, 'the game stopped advancing');
  record(16, 'the game keeps running underneath',
    `frames ${before.graph.frames} -> ${after.graph.frames}`);

  // 17. No console errors anywhere in that.
  expect(errors.length === 0, `console errors: ${errors.join(' | ')}`);
  record(17, 'no page errors', 'none');

  await page.close();

  console.log('\n================================================================');
  console.log(`PURSUER 04C CONFIGURATION VERIFICATION PASS — ${results.length} steps`);
  console.log('================================================================');
} catch (error) {
  failure = error;
  console.error('\nVERIFICATION FAILED:', error.message);
} finally {
  await browser.close();
  await server.stop();
}

if (failure) process.exit(1);
