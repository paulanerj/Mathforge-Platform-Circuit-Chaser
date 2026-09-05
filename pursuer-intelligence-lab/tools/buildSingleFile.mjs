/**
 * A ONE-FILE PLAYABLE BUILD.
 *
 *   node tools/buildSingleFile.mjs
 *
 * The whole lab inlined into a single HTML file, so a tester can open one link
 * and play without npm, a checkout or a toolchain. Packaging only: it runs the
 * ordinary build and inlines what it emits.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(LAB, 'dist-single');
const BUILD = join(OUT, 'build');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const config = join(OUT, 'vite.single.config.ts');
writeFileSync(config, `
import base from '../vite.config';
import { defineConfig } from 'vite';
export default defineConfig(async (env) => {
  const resolved = await (typeof base === 'function' ? base(env) : base);
  return {
    ...resolved,
    base: './',
    build: {
      outDir: '${BUILD}',
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100 * 1024 * 1024,
      rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } },
    },
  };
});
`);

execFileSync('npx', ['vite', 'build', '--config', config], { cwd: LAB, stdio: 'inherit' });

let html = readFileSync(join(BUILD, 'index.html'), 'utf8');
for (const file of readdirSync(BUILD).filter((name) => name !== 'index.html')) {
  const contents = readFileSync(join(BUILD, file), 'utf8');
  if (file.endsWith('.js')) {
    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`),
      () => `<script type="module">\n${contents}\n</script>`);
  } else if (file.endsWith('.css')) {
    html = html.replace(new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*>`),
      () => `<style>\n${contents}\n</style>`);
  }
}
const leftovers = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((match) => match[1]);
if (leftovers.length) throw new Error(`not self-contained — still references: ${leftovers.join(', ')}`);

const outFile = join(OUT, 'circuit-climb-pursuer-lab.html');
writeFileSync(outFile, html);
rmSync(BUILD, { recursive: true, force: true });
rmSync(config, { force: true });
console.log(`\nself-contained lab: ${outFile}`);
console.log(`size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
