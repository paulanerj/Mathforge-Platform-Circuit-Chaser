/**
 * Explicitly enable the optional Molasses candidate in a standalone review
 * file WITHOUT relying on file:// query-string redirects or download preview
 * navigation. Produces a distinct opt-in review artifact, not the default.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const input=resolve('cc2-standalone/CC2-16A-Pursuer-Integrity-Playable.html');
const output=resolve('cc2-standalone/CC2-30A-Molasses-Offline-Enabled.html');
let html=readFileSync(input,'utf8');
function exact(from,to){
  if(html.split(from).length!==2)
    throw Error('CC230_OFFLINE_SOURCE_MARKER_COUNT: '+from.slice(0,60));
  html=html.replace(from,to);
}
// Vite/esbuild minifies CC2-02A in the portable HTML.
// This marker comes from the exact source and must be checked each build.
exact('Je.get("cc230")==="1"?mr():void 0','mr()');
exact("if(new URLSearchParams(location.search).get('cc230')!=='1')return;",
  '/* Explicit offline review opt-in. */');
exact("if(new URLSearchParams(location.search).get('cc2Ui')==='slate-focus'){",
  'if(true){ /* Accepted slate-focus UI for offline owner review */');
if(html.includes('window.location.replace('))
  throw Error('CC230_OFFLINE_UNSAFE_FILE_REDIRECT');
if(!html.includes('cc230-creature-controller')||
  !html.includes('source-authoritative CC2 engine'))
  throw Error('CC230_OFFLINE_SOURCE_MISSING');
mkdirSync(resolve('cc2-standalone'),{recursive:true});
writeFileSync(output,html);
console.log('Standalone review file:',output,Buffer.byteLength(html));
