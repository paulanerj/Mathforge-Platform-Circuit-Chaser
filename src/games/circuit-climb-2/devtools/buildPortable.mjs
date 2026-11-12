/**
 * CC2-04 portable build: package the SAME reviewed CC2-04 gameplay into one
 * self-contained, offline-capable HTML page. No CDN, server, dynamic imports,
 * external fonts or MathForge SDK runtime required.
 *
 * We do NOT edit the source HTML or create a divergent second game. esbuild
 * resolves the actual TS imports and injects that one bundle inline.
 */
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve('src/games/circuit-climb-2/devtools');
const htmlPath=resolve(root,'cc2-04.html');
const tsPath=resolve(root,'cc2-02a.ts');
const out=resolve('cc2-standalone/CC2-04-Playable.html');
const template=await readFile(htmlPath,'utf8');
const bundle=await build({
  entryPoints:[tsPath],bundle:true,write:false,
  format:'iife',platform:'browser',target:['es2022'],
  minify:true,logLevel:'silent',
});
const script=bundle.outputFiles?.[0]?.text;
if(!script||script.length<1000)throw Error('CC2_PORTABLE_BUNDLE_EMPTY');
const target='<script type="module" src="./cc2-02a.ts"></script>';
if(!template.includes(target))throw Error('CC2_PORTABLE_SCRIPT_TAG_CHANGED');
const safe=script.replace(/<\/script/gi,'<\\/script');
const html=template.replace(target,
  '<script>\n/* CC2-04 offline game bundle */\n'+safe+'\n</script>');
if(html.includes('src="./cc2-02a.ts"')||
  !html.includes('cc2-bundle-version')) {
  // The version marker is inserted below, so this condition is tested only
  // for the unwanted external module URL.
  if(html.includes('src="./cc2-02a.ts"'))throw Error('CC2_PORTABLE_EXTERNAL_SCRIPT');
}
const complete=html.replace('<head>',
  '<head>\n  <meta name="cc2-bundle-version" content="cc2-04-offline-v1">');
await mkdir(dirname(out),{recursive:true});
await writeFile(out,complete,'utf8');
const bytes=Buffer.byteLength(complete,'utf8');
if(bytes<10000||bytes>4000000)throw Error('CC2_PORTABLE_UNEXPECTED_SIZE');
console.log(JSON.stringify({file:out,bytes,
  javascriptBytes:Buffer.byteLength(script),standalone:true}));
