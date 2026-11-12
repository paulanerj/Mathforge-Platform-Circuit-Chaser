/**
 * CC2-05A: build ONE offline playable HTML from the exact reviewed source.
 * No CDN, server, external font, separate runtime, or host SDK required.
 * Source TS is bundled unchanged; HTML is not rewritten as a second game.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const directory = resolve('src/games/circuit-climb-2/devtools');
const originalHtml = await readFile(resolve(directory, 'cc2-04.html'), 'utf8');
const entry = resolve(directory, 'cc2-02a.ts');
const output = resolve('cc2-standalone/CC2-05A-TuningLab-Playable.html');
const sourceTag = '<script type="module" src="./cc2-02a.ts"></script>';
if (originalHtml.split(sourceTag).length !== 2)
  throw Error('CC2_05A_PORTABLE_ENTRY_NOT_UNIQUE');
const result = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  target: ['es2022'],
  format: 'iife',
  platform: 'browser',
  minify: true,
  logLevel: 'silent',
});
const script = result.outputFiles?.[0]?.text;
if (!script || script.length < 1000)
  throw Error('CC2_05A_PORTABLE_JS_MISSING');
// Always use String.replace callback. A replacement string would interpret
// "$&", "$'", and "$`" in bundled JS and silently damage the program.
const safeScript = script.replace(/<\/script/gi, '<\\/script');
const html = originalHtml
  .replace(sourceTag, () => '<script>\n/* CC2-05A offline game */\n' +
    safeScript + '\n</script>')
  .replace('<head>', '<head>\n<meta name="cc2-offline" content="05a-camera-and-behavior-tuning">');
await mkdir(dirname(output), {recursive:true});
await writeFile(output, html, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
if (bytes < 10000 || bytes > 4000000 || !html.includes('cc2-offline'))
  throw Error('CC2_05A_PORTABLE_INVALID_FILE');
console.log(JSON.stringify({file:output,bytes,scriptBytes:Buffer.byteLength(script),standalone:true}));
