/**
 * CC2-16A: package EXACT source-owned game + original-fidelity presentation
 * as one offline file. Every added asset comes from this checked-in branch.
 */
import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const dir=resolve('src/games/circuit-climb-2/devtools');
const source=await readFile(resolve(dir,'cc2-16a.html'),'utf8');
const [css,fx,glow,phaseCss,phaseJs,learnCss,integrityCss,integrityJs,eclipseCss,eclipseJs,visCss,physicsJs,visJs,oxideCss,oxideJs,secondaryCss,secondaryJs,roleCss,roleJs,specialCss,specialJs,creatureCss,creatureJs,slateFocusCss,finaleCss,finaleJs]=await Promise.all([
 readFile(resolve(dir,'cc2-09d-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.js'),'utf8'),
 readFile(resolve(dir,'cc2-09e-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-12-presentation.css'),'utf8'),
 readFile(resolve(dir,'cc2-12-presentation.js'),'utf8'),
 readFile(resolve(dir,'cc2-13-15.css'),'utf8'),
 readFile(resolve(dir,'cc2-16a-integrity.css'),'utf8'),
 readFile(resolve(dir,'cc2-16a-integrity.js'),'utf8'),
 readFile(resolve(dir,'cc2-19-red-shell.css'),'utf8'),
 readFile(resolve(dir,'cc2-19-red-shell.js'),'utf8'),
 readFile(resolve(dir,'cc2-20-living-pursuer.css'),'utf8'),
 readFile(resolve(dir,'cc2-20-plasma-physics.js'),'utf8'),
 readFile(resolve(dir,'cc2-20-living-pursuer.js'),'utf8'),
 readFile(resolve(dir,'cc2-26-oxide-material.css'),'utf8'),
 readFile(resolve(dir,'cc2-26-oxide-material.js'),'utf8'),
 readFile(resolve(dir,'cc2-23-secondary-enemies.css'),'utf8'),
 readFile(resolve(dir,'cc2-23-secondary-enemies.js'),'utf8'),
 readFile(resolve(dir,'cc2-27-role-readability.css'),'utf8'),
 readFile(resolve(dir,'cc2-27-role-readability.js'),'utf8'),
 readFile(resolve(dir,'cc2-28-special-visuals.css'),'utf8'),
 readFile(resolve(dir,'cc2-28-special-visuals.js'),'utf8'),
 readFile(resolve(dir,'cc2-30-creature.css'),'utf8'),
 readFile(resolve(dir,'cc2-30-creature.js'),'utf8'),
 readFile(resolve(dir,'cc2-ui-slate-focus-43.css'),'utf8'),
 readFile(resolve(dir,'cc2-25-run-debrief.css'),'utf8'),
 readFile(resolve(dir,'cc2-25-run-debrief.js'),'utf8'),
]);
const entry='<script type="module" src="./cc2-02a.ts"></script>';
const cssTag='<link rel="stylesheet" href="./cc2-09d-presentation.css">';
const fxTag='<script defer src="./cc2-09e-presentation.js"></script>';
const glowTag='<link rel="stylesheet" href="./cc2-09e-presentation.css">';
const phaseCssTag='<link rel="stylesheet" href="./cc2-12-presentation.css">';
const phaseJsTag='<script defer src="./cc2-12-presentation.js"></script>';
const learnCssTag='<link rel="stylesheet" href="./cc2-13-15.css">';
const learnJsTag='<script type="module" src="./cc2-13-15.ts"></script>';
const integrityCssTag='<link rel="stylesheet" href="./cc2-16a-integrity.css">';
const integrityJsTag='<script defer src="./cc2-16a-integrity.js"></script>';
const eclipseCssTag='<link rel="stylesheet" href="./cc2-19-red-shell.css">';
const eclipseJsTag='<script defer src="./cc2-19-red-shell.js"></script>';
const visCssTag='<link rel="stylesheet" href="./cc2-20-living-pursuer.css">';
const physicsJsTag='<script defer src="./cc2-20-plasma-physics.js"></script>';
const visJsTag='<script defer src="./cc2-20-living-pursuer.js"></script>';
const oxideCssTag='<link rel="stylesheet" href="./cc2-26-oxide-material.css">';
const oxideJsTag='<script defer src="./cc2-26-oxide-material.js"></script>';
const secondaryCssTag='<link rel="stylesheet" href="./cc2-23-secondary-enemies.css">';
const secondaryJsTag='<script defer src="./cc2-23-secondary-enemies.js"></script>';
const roleCssTag='<link rel="stylesheet" href="./cc2-27-role-readability.css">';
const roleJsTag='<script defer src="./cc2-27-role-readability.js"></script>';
const specialCssTag='<link rel="stylesheet" href="./cc2-28-special-visuals.css">';
const specialJsTag='<script defer src="./cc2-28-special-visuals.js"></script>';
const creatureCssTag='<link rel="stylesheet" href="./cc2-30-creature.css">';
const creatureJsTag='<script defer src="./cc2-30-creature.js"></script>';
const slateFocusCssTag='<link rel="stylesheet" href="./cc2-ui-slate-focus-43.css">';
const finaleCssTag='<link rel="stylesheet" href="./cc2-25-run-debrief.css">';
const finaleJsTag='<script defer src="./cc2-25-run-debrief.js"></script>';
for(const m of [entry,cssTag,fxTag,glowTag,phaseCssTag,phaseJsTag,learnCssTag,learnJsTag,integrityCssTag,integrityJsTag,eclipseCssTag,eclipseJsTag,visCssTag,physicsJsTag,visJsTag,oxideCssTag,oxideJsTag,secondaryCssTag,secondaryJsTag,roleCssTag,roleJsTag,specialCssTag,specialJsTag,creatureCssTag,creatureJsTag,slateFocusCssTag,finaleCssTag,finaleJsTag])
 if(source.split(m).length!==2)throw Error('CC2_16A_MARKER_MISSING_OR_DUPLICATED: '+m);
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
// Literal callback replacement avoids interpreting replacement tokens in
// bundled, minified source. Never interpolate assets as replacement strings.
let html=source.replace(entry,()=>'<script>\n/* source-authoritative CC2 engine */\n'+escapeScript(bundled)+'</script>')
 .replace(cssTag,()=>'<style id="cc209d-source-style">\n'+css+'\n</style>')
 .replace(glowTag,()=>'<style id="cc209e-target-style">\n'+glow+'\n</style>')
 .replace(phaseCssTag,()=>'<style id="cc212-source-style">\n'+phaseCss+'\n</style>')
 .replace(phaseJsTag,()=>'<script id="cc212-source-presentation">\n'+escapeScript(phaseJs)+'\n</script>')
 .replace(learnCssTag,()=>'<style id="cc215-source-style">\n'+learnCss+'\n</style>')
 .replace(learnJsTag,()=>'<script id="cc215-source-app">\n'+escapeScript(extraBundle)+'\n</script>')
 .replace(integrityCssTag,()=>'<style id="cc216a-integrity-style">\n'+integrityCss+'\n</style>')
 .replace(integrityJsTag,()=>'<script id="cc216a-integrity-lab">\n'+escapeScript(integrityJs)+'\n</script>')
 .replace(eclipseCssTag,()=>'<style id="cc218a-eclipse-style">\n'+eclipseCss+'\n</style>')
 .replace(eclipseJsTag,()=>'<script id="cc218a-eclipse-controller">\n'+escapeScript(eclipseJs)+'\n</script>')
 .replace(visCssTag,()=>'<style id="cc220-living-material">\n'+visCss+'\n</style>')
 .replace(physicsJsTag,()=>'<script id="cc220-plasma-dynamics">\n'+escapeScript(physicsJs)+'\n</script>')
 .replace(visJsTag,()=>'<script id="cc220-living-controller">\n'+escapeScript(visJs)+'\n</script>')
 .replace(oxideCssTag,()=>'<style id="cc226-oxide-material">\n'+oxideCss+'\n</style>')
 .replace(oxideJsTag,()=>'<script id="cc226-oxide-controller">\n'+escapeScript(oxideJs)+'\n</script>')
 .replace(secondaryCssTag,()=>'<style id="cc223-secondary-style">\n'+secondaryCss+'\n</style>')
 .replace(secondaryJsTag,()=>'<script id="cc223-secondary-presentation">\n'+escapeScript(secondaryJs)+'\n</script>')
 .replace(roleCssTag,()=>'<style id="cc227-role-style">\n'+roleCss+'\n</style>')
 .replace(roleJsTag,()=>'<script id="cc227-role-controller">\n'+escapeScript(roleJs)+'\n</script>')
 .replace(specialCssTag,()=>'<style id="cc228-special-visuals">\n'+specialCss+'\n</style>')
 .replace(specialJsTag,()=>'<script id="cc228-special-controller">\n'+escapeScript(specialJs)+'\n</script>')
 .replace(creatureCssTag,()=>'<style id="cc230-creature-style">\n'+creatureCss+'\n</style>')
 .replace(creatureJsTag,()=>'<script id="cc230-creature-controller">\n'+escapeScript(creatureJs)+'\n</script>')
 .replace(slateFocusCssTag,()=>'<style id="cc2-ui-slate-focus-43">\n'+slateFocusCss+'\n</style>')
 .replace(finaleCssTag,()=>'<style id="cc225-debrief-style">\n'+finaleCss+'\n</style>')
 .replace(finaleJsTag,()=>'<script id="cc225-debrief-controller">\n'+escapeScript(finaleJs)+'\n</script>')
 .replace(fxTag,()=>'<script id="cc209d-source-presentation">\n'+escapeScript(fx)+'</script>');
// Dedicated CC2-30 preview self-activation. A user opening /cc2-30.html
// without a query must not silently fall back to old gameplay. Do not touch
// /cc2-28.html, ordinary host routes or any explicitly disabled flags.
// This runs in <head> BEFORE the inlined engine and creature controllers.
const standalonePreviewBootstrap=String.raw`
<script id="cc230g-preview-defaults">
(()=>{'use strict';
  // This standalone output is also delivered through ChatGPT as a renamed
  // HTML attachment. No route-dependent silent disabling is allowed.
  // The same assembly is copied to historical /cc2-28.html and /index.html,
  // so explicitly preserve those known legacy route behaviors.
  const isStandaloneHtml=/\.html$/i.test(location.pathname);
  const isLegacyRoute=/(?:^|\/)(?:cc2-28|cc2-26-27|index)\.html$/i
    .test(location.pathname);
  const isPreview=isStandaloneHtml&&!isLegacyRoute;
  const isOffline=location.protocol==='file:'&&isStandaloneHtml;
  if(!isPreview&&!isOffline)return;
  const url=new URL(location.href),p=url.searchParams;
  const explicitCreature=p.has('cc230');
  const defaults={
    cc2Ui:'slate-focus',cc230:'1',cc230Blanket:'1',cc2Flow:'1',
  };
  for(const [key,value] of Object.entries(defaults)){
    if(!p.has(key))p.set(key,value);
  }
  // Early arrival belongs to the zero-config owner-review experience only.
  // The historical ?cc230=1 test/replay contract remains unchanged.
  if(!explicitCreature&&!p.has('cc230Early'))p.set('cc230Early','1');
  if(url.href!==location.href){
    try{history.replaceState(history.state,'',url.href);}
    catch{window.__CC230G_PREVIEW_PARAMS__=p.toString();}
  }
})();
</script>`;
if(!html.includes('<head>'))throw Error('CC230G_PREVIEW_HEAD_MISSING');
// Head FIRST: slate-focus owner theme and other early scripts must observe the
// resolved preview flags; inserting only before </head> would be too late.
html=html.replace('<head>',()=>'<head>\n'+standalonePreviewBootstrap);

// Source-preserving diagnostic: never weaken the packaging guards.
const remainingMarkers=[cssTag,fxTag,glowTag,phaseCssTag,phaseJsTag,
  learnCssTag,learnJsTag,integrityCssTag,integrityJsTag,eclipseCssTag,
  eclipseJsTag,visCssTag,physicsJsTag,visJsTag,oxideCssTag,oxideJsTag,
  secondaryCssTag,secondaryJsTag,roleCssTag,roleJsTag,specialCssTag,
  specialJsTag,slateFocusCssTag,finaleCssTag,finaleJsTag]
  .filter(marker=>html.includes(marker));
const requiredTags=['cc209d-source-presentation','cc209e-target-style',
  'cc212-source-presentation','cc215-source-app','cc216a-integrity-lab',
  'cc218a-eclipse-controller','cc218a-eclipse-style',
  'cc220-living-controller','cc220-plasma-dynamics','cc220-living-material',
  'cc226-oxide-material','cc226-oxide-controller','cc223-secondary-style',
  'cc223-secondary-presentation','cc227-role-style','cc227-role-controller',
  'cc228-special-visuals','cc228-special-controller','cc2-ui-slate-focus-43',
  'cc225-debrief-style','cc225-debrief-controller']
  .filter(tag=>!html.includes(tag));
if(remainingMarkers.length||requiredTags.length||
  html.length<100000||html.length>4000000)
  console.error('CC2_OFFLINE_ASSEMBLY_DIAGNOSTIC',
    JSON.stringify({htmlBytes:Buffer.byteLength(html),
      remainingMarkers,missingRequiredTags:requiredTags}));
// A source module tag surviving assembly is ALWAYS an invalid artifact.
// It previously split the inlined engine and exposed JavaScript in the UI.
if(html.includes(entry)||!html.includes('source-authoritative CC2 engine')||
   html.includes(cssTag)||html.includes(fxTag)||html.includes(glowTag)||html.includes(phaseCssTag)||html.includes(phaseJsTag)||html.includes(learnCssTag)||html.includes(learnJsTag)||html.includes(integrityCssTag)||html.includes(integrityJsTag)||html.includes(eclipseCssTag)||html.includes(eclipseJsTag)||html.includes(visCssTag)||html.includes(physicsJsTag)||html.includes(visJsTag)||html.includes(oxideCssTag)||html.includes(oxideJsTag)||html.includes(secondaryCssTag)||html.includes(secondaryJsTag)||html.includes(roleCssTag)||html.includes(roleJsTag)||html.includes(specialCssTag)||html.includes(specialJsTag)||html.includes(slateFocusCssTag)||html.includes(finaleCssTag)||html.includes(finaleJsTag)||
 html.length<100000||html.length>4000000||!html.includes('cc209d-source-presentation')||!html.includes('cc209e-target-style')||!html.includes('cc212-source-presentation')||!html.includes('cc215-source-app')||!html.includes('cc216a-integrity-lab')||!html.includes('cc218a-eclipse-controller')||!html.includes('cc218a-eclipse-style')||!html.includes('cc220-living-controller')||!html.includes('cc220-plasma-dynamics')||!html.includes('cc220-living-material')||!html.includes('cc226-oxide-material')||!html.includes('cc226-oxide-controller')||!html.includes('cc223-secondary-style')||!html.includes('cc223-secondary-presentation')||!html.includes('cc227-role-style')||!html.includes('cc227-role-controller')||!html.includes('cc228-special-visuals')||!html.includes('cc228-special-controller')||!html.includes('cc2-ui-slate-focus-43')||!html.includes('cc225-debrief-style')||!html.includes('cc225-debrief-controller'))
 throw Error('CC2_15_OFFLINE_ASSEMBLY_INVALID');
// CC2-34/39A: opt-in, in-game Relay hologram/Studio surface. Never load
// external files into the standalone page, and preserve legacy URLs exactly.
const cc234Style=await readFile(resolve(dir,'cc2-34-relay-preview.css'),'utf8');
const cc234Script=await readFile(resolve(dir,'cc2-34-relay-preview.js'),'utf8');
if(html.split('</head>').length!==2||html.split('</body>').length!==2)
 throw Error('CC234_STANDALONE_INJECTION_ANCHOR_INVALID');
html=html.replace('</head>',()=>
 '<style id="cc234-relay-preview-style">\n'+cc234Style+'\n</style>\n</head>');
html=html.replace('</body>',()=>
 '<script id="cc234-relay-preview-controller">\n'+escapeScript(cc234Script)+
 '\n</script>\n</body>');
if(!html.includes('cc234-relay-preview-style')||
  !html.includes('cc234-relay-preview-controller'))
 throw Error('CC234_PREVIEW_ASSET_MISSING');
const file=resolve('cc2-standalone/CC2-16A-Pursuer-Integrity-Playable.html');
await mkdir(dirname(file),{recursive:true});
await writeFile(file,html,'utf8');
console.log(JSON.stringify({file,bytes:Buffer.byteLength(html),
 sha256:createHash('sha256').update(html).digest('hex'),
 engine:'CC2-10–15 source-authoritative core + adaptive score/learning observer',
 offline:true}));
