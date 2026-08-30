/**
 * Circuit Climb — browser harness plumbing.
 *
 * The parts of a browser run that are not about the game: finding a Chromium,
 * owning a dev server, and deciding what "the page actually rendered" means.
 * Kept apart from the scenarios so the next coder can read either half alone.
 *
 * Nothing here imports game code, and nothing in the game imports this.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* ------------------------------------------------------------------ *
 * Chromium discovery
 * ------------------------------------------------------------------ */

/**
 * playwright-core ships no browser of its own and pins a build number that a
 * pre-provisioned image will not usually match, so `chromium.launch()` with no
 * executablePath fails on exactly the machines most likely to run this. Look
 * for a real binary instead, and say plainly what to do when there is none.
 *
 * Order: an explicit CHROME, then whatever PLAYWRIGHT_BROWSERS_PATH holds,
 * then the usual system locations.
 */
export function findChromium() {
  if (process.env.CHROME) {
    if (!existsSync(process.env.CHROME)) {
      throw new Error(`CHROME is set to "${process.env.CHROME}" but nothing is there.`);
    }
    return process.env.CHROME;
  }

  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries;
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    // Prefer a full chromium over a headless shell: the shell cannot paint the
    // canvas the way a viewer would, and this smoke reads real pixels.
    const ranked = entries
      .filter((name) => name.startsWith('chromium'))
      .sort((a, b) => (a.includes('headless') ? 1 : 0) - (b.includes('headless') ? 1 : 0));
    for (const entry of ranked) {
      for (const relative of [
        'chrome-linux/chrome',
        'chrome-linux/headless_shell',
        'chrome-headless-shell-linux64/chrome-headless-shell',
        'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
        'chrome-win/chrome.exe',
      ]) {
        const candidate = join(root, entry, relative);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  for (const candidate of [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ]) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    'No Chromium found.\n' +
      '  Install one:            npx playwright install chromium\n' +
      '  Or point at your own:   CHROME=/path/to/chrome npm run test:circuit-climb:browser\n' +
      '  Or set the search root: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers',
  );
}

export const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  // The canvas must actually paint, headless included, or the render assertion
  // below reports a white screen that only the test harness ever saw.
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
];

/* ------------------------------------------------------------------ *
 * Dev server
 * ------------------------------------------------------------------ */

/**
 * Own the server for the length of the run. A smoke that expects the operator
 * to have started one by hand is a smoke that gets skipped.
 *
 * Set BASE_URL to point at a server you are already running; then nothing is
 * spawned and nothing is killed.
 */
export async function startDevServer({ port = 3111, timeoutMs = 60_000 } = {}) {
  if (process.env.BASE_URL) {
    return { url: process.env.BASE_URL, external: true, stop: async () => {} };
  }

  const url = `http://127.0.0.1:${port}/`;
  const child = spawn(
    process.execPath,
    [join('node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
    { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const log = [];
  child.stdout.on('data', (d) => log.push(String(d)));
  child.stderr.on('data', (d) => log.push(String(d)));

  let exited = null;
  child.on('exit', (code) => { exited = code; });

  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (exited !== null) {
      throw new Error(`Dev server exited with code ${exited}:\n${log.join('')}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      child.kill('SIGKILL');
      throw new Error(`Dev server did not answer on ${url} within ${timeoutMs}ms:\n${log.join('')}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    // Give it a moment, then insist. A leaked vite holds the port and the next
    // run fails for a reason that has nothing to do with the product.
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 4000);
      child.on('exit', () => { clearTimeout(timer); resolve(); });
    });
  };

  return { url, external: false, stop };
}

/* ------------------------------------------------------------------ *
 * Render assertion
 * ------------------------------------------------------------------ */

/**
 * "The page loaded" is not the same as "the game is on screen". A build can
 * serve a perfectly healthy document and paint nothing — that is exactly how a
 * white screen shipped through a green build once already.
 *
 * So read the canvas back. A drawn Circuit Climb board carries hundreds of
 * distinct colours across its platforms, numerals, spark and pursuer; a blank
 * one carries the background and almost nothing else.
 */
export async function inspectRender(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#gameCanvas');
    if (!canvas) return { ok: false, reason: 'no #gameCanvas in the document' };

    const { width, height } = canvas;
    if (!width || !height) return { ok: false, reason: `canvas has no size (${width}x${height})` };

    const context = canvas.getContext('2d');
    if (!context) return { ok: false, reason: 'canvas has no 2d context' };

    const { data } = context.getImageData(0, 0, width, height);
    const colours = new Set();
    let painted = 0;
    let samples = 0;
    // Stride over the buffer rather than every pixel: a full read of a large
    // canvas is slow enough to matter across a viewport matrix.
    for (let i = 0; i < data.length; i += 4 * 97) {
      samples += 1;
      colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      // Anything that is not the pale background counts as ink.
      if (!(data[i] > 235 && data[i + 1] > 240 && data[i + 2] > 245)) painted += 1;
    }

    return {
      ok: colours.size >= 20 && painted >= 25,
      reason:
        colours.size < 20 || painted < 25
          ? `blank render: ${colours.size} distinct colours, ${painted}/${samples} painted samples`
          : '',
      distinctColours: colours.size,
      paintedSamples: painted,
      samples,
      canvasPx: `${width}x${height}`,
    };
  });
}

/**
 * Where the pursuer is, read off the pixels. Used to prove that Pause really
 * stops the world rather than merely dimming it: a paused frame and a frame
 * taken later must be identical, and a resumed one must not be.
 */
export async function readMotionSignature(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#gameCanvas');
    if (!canvas) return null;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const { data } = context.getImageData(0, 0, width, height);
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let checksum = 0;
    for (let i = 0; i < data.length; i += 4 * 13) {
      const pixel = i / 4;
      checksum = (checksum + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7) % 2147483647;
      // The pursuer is the only strongly red thing on the board.
      if (data[i] > 190 && data[i + 1] < 90 && data[i + 2] < 90) {
        sumX += pixel % width;
        sumY += Math.floor(pixel / width);
        count += 1;
      }
    }
    return {
      checksum,
      pursuer: count ? { x: sumX / count, y: sumY / count, pixels: count } : null,
    };
  });
}
