/**
 * CC2-15: package EXACT source-owned game + original-fidelity presentation
 * as one offline file. Every added asset comes from this checked-in branch.
 */
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const dir=resolve('src/games/circuit-climb-2/devtools');
const source=await readFile(resolve(dir,'cc2-15.html'),'utf8');
const [css,fx,glow,phaseCss,phaseJs,learnCss]=await Promise.all([
 readFile(resolve(dir,'cc2-09d-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.js'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-12-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-12-presentation.js'),'utf8'),
 readFile(resolve(dir,'cc2-13-15.css'),'utf8'),
]);
const entry='<script type="module" src="./cc2-02a.ts"></script>';
const cssTag='<link rel="stylesheet" href="./cc2-09d-presentation.css">';
const fxTag='<script defer src="./cc2-09e-presentation.js"></script>';
const glowTag='<link rel="stylesheet" href="./cc2-09e-presentation.css">';
const phaseCssTag='<link rel="stylesheet" href="./cc2-12-presentation.css">';
const phaseJsTag='<script defer src="./cc2-12-presentation.js"></script>';
const learnCssTag='<link rel="stylesheet" href="./cc2-13-15.css">';
const learnJsTag='<script type="module" src="./cc2-13-15.ts"></script>';
for(const m of [entry,cssTag,fxTag,glowTag,phaseCssTag,phaseJsTag,learnCssTag,learnJsTag])
 if(source.split(m).length!==2)throw Error('CC2_15_MARKER_MISSING_OR_DUPLICATED: '+m);
const result=await build({entryPoints:[resolve(dir,'cc2-02a.ts')],bundle:true,
 write:false,format:'iife',target:['es2022'],platform:'browser',
 minify:true,logLevel:'silent'});
const bundled=result.outputFiles?.[0]?.text;
if(!bundled||bundled.length<10000)throw Error('CC2_15_GAME_BUNDLE_INVALID');
const extra=await build({entryPoints:[resolve(dir,'cc2-13-15.ts')],bundle:true,
 write:false,format:'iife',target:['es2022'],platform:'browser',
 minify:true,logLevel:'silent'});
const extraBundle=extra.outputFiles?.[0]?.text;
if(!extraBundle||extraBundle.length<4000)throw Error('CC2_15_MUSIC_BUNDLE_INVALID');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
const html=source.replace(entry,'<script>\n/* source-authoritative CC2 engine */\n'+escapeScript(bundled)+'</script>')
 .replace(cssTag,'<style id="cc209d-source-style">\n'+css+'\n</style>')
 .replace(glowTag,'<style id="cc209e-target-style">\n'+glow+'\n</style>')
 .replace(phaseCssTag,'<style id="cc212-source-style">\n'+phaseCss+'\n</style>')
 .replace(phaseJsTag,'<script id="cc212-source-presentation">\n'+escapeScript(phaseJs)+'\n</script>')
 .replace(learnCssTag,'<style id="cc215-source-style">\n'+learnCss+'\n</style>')
 .replace(learnJsTag,'<script id="cc215-source-app">\n'+escapeScript(extraBundle)+'\n</script>')
 .replace(fxTag,'<script id="cc209d-source-presentation">\n'+escapeScript(fx)+'</script>');
if(html.includes(entry)||html.includes(cssTag)||html.includes(fxTag)||html.includes(glowTag)||html.includes(phaseCssTag)||html.includes(phaseJsTag)||html.includes(learnCssTag)||html.includes(learnJsTag)||
 html.length<100000||html.length>4000000||!html.includes('cc209d-source-presentation')||!html.includes('cc209e-target-style')||!html.includes('cc212-source-presentation')||!html.includes('cc215-source-app'))
 throw Error('CC2_15_OFFLINE_ASSEMBLY_INVALID');
const file=resolve('cc2-standalone/CC2-15-Music-Learning-Playable.html');
await mkdir(dirname(file),{recursive:true});
await writeFile(file,html,'utf8');
console.log(JSON.stringify({file,bytes:Buffer.byteLength(html),
 sha256:createHash('sha256').update(html).digest('hex'),
 engine:'CC2-10–15 source-authoritative core + adaptive score/learning observer',
 offline:true}));
