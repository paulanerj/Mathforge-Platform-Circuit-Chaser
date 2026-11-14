/**
 * CC2-09E: package EXACT source-owned game + original-fidelity presentation
 * as one offline file. Every added asset comes from this checked-in branch.
 */
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const dir=resolve('src/games/circuit-climb-2/devtools');
const source=await readFile(resolve(dir,'cc2-09e.html'),'utf8');
const [css,fx,glow]=await Promise.all([
 readFile(resolve(dir,'cc2-09d-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.js'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.css'),'utf8'),
]);
const entry='<script type="module" src="./cc2-02a.ts"></script>';
const cssTag='<link rel="stylesheet" href="./cc2-09d-presentation.css">';
const fxTag='<script defer src="./cc2-09e-presentation.js"></script>';
const glowTag='<link rel="stylesheet" href="./cc2-09e-presentation.css">';
for(const m of [entry,cssTag,fxTag,glowTag])
 if(source.split(m).length!==2)throw Error('CC2_09E_MARKER_MISSING_OR_DUPLICATED: '+m);
const result=await build({entryPoints:[resolve(dir,'cc2-02a.ts')],bundle:true,
 write:false,format:'iife',target:['es2022'],platform:'browser',
 minify:true,logLevel:'silent'});
const bundled=result.outputFiles?.[0]?.text;
if(!bundled||bundled.length<10000)throw Error('CC2_09E_GAME_BUNDLE_INVALID');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
const html=source.replace(entry,'<script>\n/* source-authoritative CC2 engine */\n'+escapeScript(bundled)+'</script>')
 .replace(cssTag,'<style id="cc209d-source-style">\n'+css+'\n</style>')
 .replace(glowTag,'<style id="cc209e-target-style">\n'+glow+'\n</style>')
 .replace(fxTag,'<script id="cc209d-source-presentation">\n'+escapeScript(fx)+'</script>');
if(html.includes(entry)||html.includes(cssTag)||html.includes(fxTag)||html.includes(glowTag)||
 html.length<100000||html.length>4000000||!html.includes('cc209d-source-presentation')||!html.includes('cc209e-target-style'))
 throw Error('CC2_09E_OFFLINE_ASSEMBLY_INVALID');
const file=resolve('cc2-standalone/CC2-09E-Subtle-Target-Playable.html');
await mkdir(dirname(file),{recursive:true});
await writeFile(file,html,'utf8');
console.log(JSON.stringify({file,bytes:Buffer.byteLength(html),
 sha256:createHash('sha256').update(html).digest('hex'),
 engine:'CC2-07E + source-integrated presentation only',
 offline:true}));
