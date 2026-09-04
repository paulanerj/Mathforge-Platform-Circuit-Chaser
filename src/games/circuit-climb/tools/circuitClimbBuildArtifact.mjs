/**
 * PURSUER INTEGRATION 04B — one-file build for human product acceptance.
 *
 *   node src/games/circuit-climb/tools/circuitClimbBuildArtifact.mjs
 *
 * Produces a single self-contained HTML file carrying the REAL application —
 * the same React app, the same Circuit Climb runtime, the same accepted
 * GRAPH_PURSUER_V2 candidate — so a human tester can open one link and play
 * without a dev server, a checkout, or a toolchain.
 *
 * PACKAGING ONLY. It runs the ordinary production build and then inlines the
 * emitted JS and CSS into the HTML shell. No source is modified, no config is
 * altered, and no gameplay or pursuit behaviour is touched: the bundle it
 * inlines is byte-for-byte what `npm run build` produces from the same tree.
 *
 * The output is written to `dist-artifact/` and left untracked.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT_DIR = join(ROOT, 'dist-artifact');
const BUILD_DIR = join(OUT_DIR, 'build');

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// A throwaway config: the production one, plus relative asset paths and a
// single chunk so there is nothing left to fetch at runtime.
const CONFIG = join(OUT_DIR, 'vite.artifact.config.ts');
writeFileSync(CONFIG, `
import base from '../vite.config';
import { defineConfig } from 'vite';

export default defineConfig(async (env) => {
  const resolved = await (typeof base === 'function' ? base(env) : base);
  return {
    ...resolved,
    base: './',
    build: {
      ...(resolved.build ?? {}),
      outDir: '${BUILD_DIR}',
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100 * 1024 * 1024,
      rollupOptions: {
        ...((resolved.build ?? {}).rollupOptions ?? {}),
        output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' },
      },
    },
  };
});
`);

console.log('building the real application…');
execFileSync('npx', ['vite', 'build', '--config', CONFIG], { cwd: ROOT, stdio: 'inherit' });

// --- inline everything the shell still references -------------------------
let html = readFileSync(join(BUILD_DIR, 'index.html'), 'utf8');
const emitted = readdirSync(BUILD_DIR).filter((f) => f !== 'index.html');

for (const file of emitted) {
  const contents = readFileSync(join(BUILD_DIR, file), 'utf8');
  if (file.endsWith('.js')) {
    html = html.replace(
      new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`),
      () => `<script type="module">\n${contents}\n</script>`,
    );
  } else if (file.endsWith('.css')) {
    html = html.replace(
      new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*>`),
      () => `<style>\n${contents}\n</style>`,
    );
  }
}

const leftovers = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
if (leftovers.length) {
  throw new Error(`not self-contained — still references: ${leftovers.join(', ')}`);
}

const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const branch = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
})();

html = html.replace('<title>MathForge</title>',
  `<title>Circuit Climb — Pursuer 04B-R1</title>\n`
  + `    <!-- PURSUER INTEGRATION 04B-R1 human acceptance build\n`
  + `         branch ${branch}\n`
  + `         commit ${commit}\n`
  + `         controller GRAPH_PURSUER_V2, capture ARMED -->`);

const outFile = join(OUT_DIR, 'circuit-climb-pursuer-04b-r1.html');
writeFileSync(outFile, html);
rmSync(BUILD_DIR, { recursive: true, force: true });
rmSync(CONFIG, { force: true });

console.log(`\nself-contained build: ${outFile}`);
console.log(`size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
console.log(`branch ${branch} · commit ${commit}`);
