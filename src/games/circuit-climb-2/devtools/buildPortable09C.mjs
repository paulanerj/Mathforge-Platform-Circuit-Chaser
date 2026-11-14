/**
 * CC2-09C: Build the exact authoritatively compiled CC2 game into one HTML.
 * HTML, presentation and game entry are source-controlled (not an alternate
 * handwritten engine). No CDN, remote fonts, runtime loader or network.
 */
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const directory=resolve('src/games/circuit-climb-2/devtools');
const original=await readFile(resolve(directory,'cc2-09c.html'),'utf8');
const marker='<script type="module" src="./cc2-02a.ts"></script>';
if(original.split(marker).length!==2)throw Error('CC2_09C_BUNDLE_ENTRY_NOT_UNIQUE');
const result=await build({entryPoints:[resolve(directory,'cc2-02a.ts')],
  bundle:true,write:false,format:'iife',target:['es2022'],platform:'browser',
  minify:true,logLevel:'silent'});
const script=result.outputFiles?.[0]?.text;
if(!script||script.length<10000)throw Error('CC2_09C_BUNDLE_MISSING');
const safe=script.replace(/<\/script/gi,'<\\/script');
const html=original.replace(marker,()=>'<script>\n/* CC2-09C source-integrated game */\n'+safe+'\n</script>');
if(html.includes(marker)||html.length<100000||html.length>4000000||
  !html.includes('cc209c-restoration-controller'))throw Error('CC2_09C_PORTABLE_INVALID');
const path=resolve('cc2-standalone/CC2-09C-Original-Menu-Powerups-Playable.html');
await mkdir(dirname(path),{recursive:true});await writeFile(path,html,'utf8');
console.log(JSON.stringify({file:path,bytes:Buffer.byteLength(html),
  sha256:createHash('sha256').update(html).digest('hex'),sourceIntegrated:true}));
