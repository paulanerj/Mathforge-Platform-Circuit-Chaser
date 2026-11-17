/**
 * CC2-26/27 — build a genuinely playable public preview *page*.
 *
 * A production Vite build of this repository otherwise exports the older
 * React entrypoint, not the independent CC2 surface. This post-build step
 * copies a source-authentic, single-file CC2 game into the preview output.
 *
 * SAFETY: this does not change index.html, legacy routes, game mechanics,
 * host authority, or production assignment. The output is only a static
 * document on this experimental branch's preview deployment.
 */
import {execFileSync} from 'node:child_process';
import {copyFileSync,readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const src=resolve('cc2-standalone/CC2-16A-Pursuer-Integrity-Playable.html');
const destination=resolve('dist/cc2-26-27.html');

// Always reconstruct from EXACT repository source, never from stale local
// test outputs. This is deterministic and uses no remote scripts/assets.
execFileSync(process.execPath,[
  'src/games/circuit-climb-2/devtools/buildPortable16A.mjs'
],{stdio:'inherit'});
const html=readFileSync(src,'utf8');
const mustHave=[
  'cc226-oxide-controller',
  'cc226-oxide-material',
  'cc227-role-controller',
  'cc227-role-style',
  'cc225-debrief-controller',
  'cc223-secondary-presentation',
  'cc220-plasma-dynamics',
  'cc2-ui-slate-focus-43'
];
for(const element of mustHave)
  if(!html.includes(element))
    throw Error('CC227_PUBLIC_PREVIEW_MISSING_'+element);
if(html.length<100000||html.length>4000000)
  throw Error('CC227_PUBLIC_PREVIEW_BAD_BYTE_LENGTH');
// Sanity check: portable builder should have inlined the game and all CSS.
// A relative script would break as soon as it was copied under /dist.
if(/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*["']stylesheet["']/i.test(html))
  throw Error('CC227_PUBLIC_PREVIEW_NOT_FULLY_STANDALONE');
copyFileSync(src,destination);
const digest=createHash('sha256').update(html).digest('hex');
console.log(JSON.stringify({
  schema:'cc2-public-preview/v1',
  uri:'/cc2-26-27.html',
  bytes:statSync(destination).size,
  sha256:digest,
  flags:'?cc2Ui=slate-focus&cc226=1&cc223=both&cc223Demo=1&cc227=1',
  standalone:true
}));
